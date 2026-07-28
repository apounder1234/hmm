// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { defaultConfig } from "../config/defaults/index.js";
import { validateConfig } from "../config/validation.js";
import { createGame } from "../engine/createGame.js";
import { applyCommand, currentOrder, currentPlayerId } from "../engine/stateMachine.js";
import { executeDirectTrade } from "../engine/trade/trade.js";
import { invariantErrors } from "../engine/invariants.js";
import { getTechnology, pathways, totalEnergy, totalLoss } from "../engine/helpers.js";
import { aiPrepared, attemptAiTechnicalAssistance, attemptAiTrade, chooseDevelopmentDecision, chooseDispatchDecision, recordAiDecision } from "../ai/ai.js";
import { deserializeGame, serializeGame } from "../persistence/save.js";
import { defaultSimulationScenario, technologyDataSets } from "../simulation/scenario.js";
import { aggregateReportToCsv, balanceFlagsToCsv, playerResultsToCsv } from "../simulation/exporters/csv.js";
import { simulationReportToJson } from "../simulation/exporters/json.js";
const h = React.createElement;
const continentIcons = { africa: "◒", asia: "◐", europe: "◓", northAmerica: "◔", southAmerica: "◕", australia: "◉" };
const weatherLabels = { brightSun: "Bright Sun", rain: "Rain", strongWind: "Strong Wind", storm: "Storm", calmOvercast: "Calm Overcast" };
const resourceLabels = { fossilFuel: "Fossil", biomass: "Biomass", constructionMaterials: "Construction", criticalMaterials: "Critical" };
const pathwayLabels = { solar: "Solar", wind: "Wind", hydro: "Hydro", biomass: "Biomass", fossil: "Fossil" };
const capabilityLabels = { storage: "Storage", transformation: "Transformation", transport: "Transport", efficiency: "Efficiency", research: "Research", trade: "Trade" };
const strategyLabels = { solarStorage: "Solar + Storage", windGrid: "Wind + Grid", hydroReliability: "Hydro Reliability", biomassRenewal: "Biomass Renewal", fossilTempo: "Fossil Tempo", diversifiedAdapter: "Diversified Adapter" };
const strategies = Object.keys(strategyLabels);
const resourceKeys = Object.keys(resourceLabels);
function clone(value) { return structuredClone(value); }
function number(value) { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; }
function titleCase(value) { return String(value).replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()); }
function sumLoss(loss) { return loss.thermal + loss.battery + loss.lighting + loss.other; }
function phaseLabel(phase) { return phase.split(".").map(titleCase).join(" · "); }
function currentPlayer(game) { const id = currentPlayerId(game); return id ? game.players[id] : null; }
function conditionDefinition(game, player) { return player?.localCondition ? game.config.localConditions.find(c => c.id === player.localCondition.definitionId) : null; }
function button(label, onClick, options = {}) {
    return h("button", { className: `button ${options.kind || ""}`, onClick, disabled: Boolean(options.disabled), title: options.title }, label);
}
function panel(title, content, className = "") {
    return h("section", { className: `panel ${className}` }, h("div", { className: "panel-title" }, title), content);
}
function stat(label, value, detail) {
    return h("div", { className: "stat" }, h("span", null, label), h("strong", null, value), detail ? h("small", null, detail) : null);
}
function badge(text, kind = "") { return h("span", { className: `badge ${kind}` }, text); }
function meter(value, max = 5) {
    return h("div", { className: "meter", "aria-label": `${value} of ${max}` }, ...Array.from({ length: max }, (_, i) => h("i", { key: i, className: i < value ? "filled" : "" })));
}
function energyCubes(value) {
    return h("div", { className: "energy-cubes", "aria-label": `${value} Energy` }, ...Array.from({ length: Math.max(0, value) }, (_, i) => h("i", { key: i })));
}
function download(name, text, type = "application/json") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
}
function makeParticipants(config) {
    return config.continents.map((continent, index) => ({
        included: true,
        continentId: continent.id,
        name: index === 0 ? "Player" : continent.name,
        controller: index === 0 ? "human" : "ai",
        strategy: strategies[index % strategies.length],
        difficulty: "standard"
    }));
}
function aiStep(game) {
    const player = currentPlayer(game);
    if (!player || player.controller.kind !== "ai")
        return false;
    if (game.phase === "generation.development") {
        attemptAiTechnicalAssistance(game, player);
        if (player.completedTrades === 0)
            attemptAiTrade(game, player);
        const decision = chooseDevelopmentDecision(game, player);
        recordAiDecision(game, decision);
        applyCommand(game, { type: "developmentAction", playerId: player.id, action: decision.action });
        return true;
    }
    if (game.phase === "generation.dispatch") {
        const decision = chooseDispatchDecision(game, player);
        recordAiDecision(game, decision);
        applyCommand(game, { type: "dispatch", playerId: player.id, plan: decision.plan });
        return true;
    }
    return false;
}
function pumpAi(game) {
    let guard = 0;
    while (aiStep(game)) {
        guard += 1;
        if (guard > 100)
            throw new Error("AI turn loop exceeded safety limit.");
    }
    return game;
}
function StartScreen({ onNew, onLoad, onRules, onSimulation }) {
    return h("main", { className: "start-screen" }, h("div", { className: "sun-mark" }, h("span", null, "☀")), h("p", { className: "eyebrow" }, "Educational strategy prototype"), h("h1", null, "SUNPATHS"), h("p", { className: "lead" }, "Build a pathway from natural opportunity to reliable Light across eight Generations."), h("div", { className: "start-actions" }, button("New Game", onNew, { kind: "primary large" }), h("label", { className: "button large file-button" }, "Load Game", h("input", { type: "file", accept: ".json,application/json", onChange: onLoad })), button("Simulation Lab", onSimulation, { kind: "secondary large" }), button("Rules and Data", onRules, { kind: "ghost large" })), h("div", { className: "chain-preview" }, ...["Capture", "Store", "Transform", "Transport", "Light"].flatMap((stage, i) => [h("span", { key: stage }, stage), i < 4 ? h("b", { key: `${stage}-arrow` }, "→") : null].filter(Boolean))));
}
function SetupScreen({ config, participants, setParticipants, seed, setSeed, debugMode, setDebugMode, onStart, onBack }) {
    const included = participants.filter(p => p.included);
    const update = (index, patch) => setParticipants(items => items.map((p, i) => i === index ? { ...p, ...patch } : p));
    return h("main", { className: "page" }, h("header", { className: "page-header" }, h("div", null, h("p", { className: "eyebrow" }, "Game setup"), h("h1", null, "Choose the continental factions")), button("Back", onBack, { kind: "ghost" })), h("div", { className: "setup-grid" }, ...participants.map((entry, index) => {
        const continent = config.continents.find(c => c.id === entry.continentId);
        return h("article", { key: entry.continentId, className: `setup-card ${entry.included ? "selected" : ""}` }, h("div", { className: "continent-heading" }, h("span", { className: "continent-icon" }, continentIcons[continent.id]), h("div", null, h("h3", null, continent.name), h("small", null, `Knowledge ${continent.startingKnowledge}`))), h("label", { className: "toggle-row" }, h("input", { type: "checkbox", checked: entry.included, onChange: e => update(index, { included: e.target.checked }) }), "Active faction"), h("label", null, "Controller", h("select", { value: entry.controller, disabled: !entry.included, onChange: e => update(index, { controller: e.target.value }) }, h("option", { value: "human" }, "Human"), h("option", { value: "ai" }, "AI"))), h("label", null, "Name", h("input", { value: entry.name, disabled: !entry.included, onChange: e => update(index, { name: e.target.value }) })), entry.controller === "ai" ? h(React.Fragment, null, h("label", null, "AI strategy", h("select", { value: entry.strategy, disabled: !entry.included, onChange: e => update(index, { strategy: e.target.value }) }, ...strategies.map(id => h("option", { key: id, value: id }, strategyLabels[id])))), h("label", null, "AI difficulty", h("select", { value: entry.difficulty, disabled: !entry.included, onChange: e => update(index, { difficulty: e.target.value }) }, h("option", { value: "basic" }, "Basic"), h("option", { value: "standard" }, "Standard"), h("option", { value: "advanced" }, "Advanced")))) : null, h("div", { className: "opportunity-list" }, ...Object.entries(continent.opportunities).map(([path, value]) => h("div", { key: path }, h("span", null, pathwayLabels[path]), meter(value)))));
    })), panel("Session", h("div", { className: "form-row" }, h("label", null, "Random seed", h("input", { value: seed, onChange: e => setSeed(e.target.value), placeholder: "SUNPATHS-001" })), stat("Active players", included.length), stat("Human players", included.filter(p => p.controller === "human").length), h("label", { className: "toggle-row" }, h("input", { type: "checkbox", checked: debugMode, onChange: e => setDebugMode(e.target.checked) }), "Show AI decision debugging"), button("Create Game", onStart, { kind: "primary", disabled: included.length < 1 || included.length > 6 }))));
}
function PreparedSelection({ game, onSelect }) {
    const pending = Object.values(game.players).find(p => p.controller.kind === "human" && !p.prepared.pathwayId);
    if (!pending)
        return h("div", null, h("p", null, "All Prepared cards are selected."));
    return panel(`Prepared cards · ${pending.name}`, h("div", { className: "prepared-form" }, h("p", null, "Choose one pathway and one capability. They provide a one-time opening benefit and do not lock your strategy."), h("div", { className: "choice-grid" }, ...pathways.map(id => h("article", { key: id, className: "choice-card" }, h("strong", null, pathwayLabels[id]), h("small", null, "First matching technology: −1 Construction and +1 effective Knowledge")))), h("p", { className: "muted" }, "Choose both cards in the confirmation panel."), h(PreparedCustomForm, { key: pending.id, player: pending, onSelect })));
}
function PreparedCustomForm({ player, onSelect }) {
    const [pathway, setPathway] = useState("solar");
    const [capability, setCapability] = useState("storage");
    return h("div", { className: "form-row" }, h("label", null, "Prepared Pathway", h("select", { value: pathway, onChange: e => setPathway(e.target.value) }, ...pathways.map(id => h("option", { key: id, value: id }, pathwayLabels[id])))), h("label", null, "Prepared Capability", h("select", { value: capability, onChange: e => setCapability(e.target.value) }, ...Object.keys(capabilityLabels).map(id => h("option", { key: id, value: id }, capabilityLabels[id])))), button("Confirm hidden selection", () => onSelect(player.id, pathway, capability), { kind: "primary" }));
}
function WeatherCard({ label, face, forecast = false }) {
    const icon = face === "brightSun" ? "☀" : face === "rain" ? "☂" : face === "strongWind" ? "≋" : face === "storm" ? "ϟ" : "☁";
    return h("div", { className: `weather-card ${forecast ? "forecast" : ""}` }, h("small", null, label), h("span", null, icon), h("strong", null, face ? weatherLabels[face] : "—"));
}
function SetupProgress({ game, command }) {
    if (game.phase === "setup.preparedSelection")
        return h(PreparedSelection, { game, onSelect: (playerId, pathwayId, capabilityId) => command({ type: "selectPrepared", playerId, pathwayId, capabilityId }) });
    const actions = {
        "setup.rollCurrent": ["Roll the first Current Condition", { type: "rollCurrent" }],
        "setup.revealPrepared": ["Reveal Prepared cards", { type: "revealPrepared" }],
        "setup.rollForecast": ["Roll Generation 1 Forecast", { type: "rollForecast" }]
    };
    const item = actions[game.phase];
    if (!item)
        return null;
    return panel("Pregame", h("div", { className: "setup-progress" }, h(WeatherCard, { label: "Current Condition", face: game.weather.current }), h(WeatherCard, { label: "Next Forecast", face: game.weather.forecast, forecast: true }), button(item[0], () => command(item[1]), { kind: "primary" })));
}
function ContinentPanel({ game, player, selected, onSelect }) {
    const continent = game.config.continents.find(c => c.id === player.continentId);
    const condition = conditionDefinition(game, player);
    return h("button", { className: `continent-panel ${selected ? "active" : ""}`, onClick: () => onSelect(player.id) }, h("div", { className: "continent-heading" }, h("span", { className: "continent-icon" }, continentIcons[continent.id]), h("div", null, h("strong", null, player.name), h("small", null, continent.name))), h("div", { className: "continent-kpis" }, h("span", null, `Light ${player.cumulative.totalLight}`), h("span", null, `Reliable ${player.cumulative.reliableGenerations}`), h("span", null, `Knowledge ${player.knowledge}`)), condition ? badge(condition.name, "condition") : badge(player.controller.kind === "ai" ? strategyLabels[player.controller.strategy] : "Human", "controller"));
}
function WorldArea({ game, selectedId, setSelectedId }) {
    return panel("Continental overview", h("div", { className: "world-area" }, ...currentOrder(game).map(id => h(ContinentPanel, { key: id, game, player: game.players[id], selected: id === selectedId, onSelect: setSelectedId }))));
}
function Warehouse({ player }) {
    return h("div", { className: "warehouse-grid" }, ...resourceKeys.map(key => {
        const account = player.resources[key];
        return h("div", { key }, h("span", null, resourceLabels[key]), h("strong", null, account.warehouse), h("small", null, `${account.currentContinent} in continent · printed ${account.printedStarting}`));
    }));
}
function TechnologyList({ game, player }) {
    return h("div", { className: "technology-list" }, ...player.installed.map(instance => {
        const tech = getTechnology(game, instance.technologyId);
        const stored = totalEnergy(instance.storageInput);
        return h("article", { key: instance.instanceId, className: "technology-card" }, h("div", null, h("strong", null, tech.name), h("small", null, `${titleCase(tech.stage)} · ${tech.pathway === "shared" ? "Shared" : pathwayLabels[tech.pathway]}`)), tech.storage ? badge(`${stored}/${tech.storage.capacity} stored`, "energy") : badge(`Capacity ${tech.capacity}`));
    }));
}
function EnergyChain({ player }) {
    const gross = Object.values(player.currentMetrics.grossEnergy).reduce((a, b) => a + b, 0);
    const stored = player.currentMetrics.storedEnd;
    const transformed = player.currentMetrics.grossEnergy.biomass + player.currentMetrics.grossEnergy.fossil + player.currentMetrics.grossEnergy.hydro;
    const transported = Math.min(4, Math.max(player.currentMetrics.deliveredLight, player.currentMetrics.deliveredLight + player.currentMetrics.systemLoss.lighting));
    const stages = [["Capture", gross], ["Store", stored], ["Transform", transformed], ["Transport", transported], ["Light", player.currentMetrics.deliveredLight]];
    return h("div", { className: "energy-chain" }, ...stages.flatMap(([label, value], index) => [h("div", { key: label, className: "energy-stage" }, h("strong", null, label), energyCubes(value), h("small", null, value)), index < stages.length - 1 ? h("span", { key: `${label}-arrow`, className: "chain-arrow" }, "→") : null].filter(Boolean)));
}
function LightTrack({ game, player }) {
    return h("div", { className: "light-track" }, ...Array.from({ length: 8 }, (_, i) => {
        const generation = i + 1;
        const value = player.lightByGeneration[generation];
        const target = game.config.demand.reliabilityTargets[generation];
        return h("div", { key: generation, className: `light-window ${value >= target ? "reliable" : ""}` }, h("small", null, `G${generation}`), h("strong", null, value ?? "·"), h("span", null, `target ${target}`));
    }));
}
function PlayerBoard({ game, player }) {
    const condition = conditionDefinition(game, player);
    return h("div", { className: "player-board" }, h("div", { className: "board-heading" }, h("div", null, h("p", { className: "eyebrow" }, "Player board"), h("h2", null, player.name)), h("div", { className: "badge-stack" }, badge(`Knowledge ${player.knowledge}`), condition ? badge(condition.name, "condition") : null)), h(EnergyChain, { player }), h("div", { className: "two-column" }, panel("Warehouse", h(Warehouse, { player }), "nested"), panel("Installed technologies", h(TechnologyList, { game, player }), "nested")), panel("Light and Reliability", h(LightTrack, { game, player }), "nested"), h("div", { className: "score-row" }, stat("Total Light", player.cumulative.totalLight), stat("Reliable Generations", player.cumulative.reliableGenerations), stat("System Loss", totalLoss(player)), stat("Curtailment", player.cumulative.curtailment)));
}
function BuildShop({ game, onAction }) {
    const available = game.config.technologies.filter(t => !t.starter && (t.alwaysAvailable || game.innovationMarket.visible.includes(t.id)));
    return h("div", { className: "build-shop" }, ...available.map(tech => h("button", { key: tech.id, className: "shop-card", onClick: () => onAction({ kind: "build", technologyId: tech.id }) }, h("strong", null, tech.name), h("small", null, `${tech.tier} · ${titleCase(tech.stage)}`), h("span", null, `${tech.cost.constructionMaterials} Construction · ${tech.cost.criticalMaterials} Critical · K${tech.knowledgeRequired}`), h("em", null, `Capacity ${tech.capacity}`))));
}
function ImportForm({ game, onAction }) {
    const [receive, setReceive] = useState("constructionMaterials");
    const [payWith, setPayWith] = useState("fossilFuel");
    const cost = receive === "criticalMaterials" ? game.config.trade.criticalImportCost : game.config.trade.normalImportCost;
    return h("div", { className: "form-row compact" }, h("label", null, "Receive", h("select", { value: receive, onChange: e => setReceive(e.target.value) }, ...resourceKeys.map(k => h("option", { key: k, value: k }, resourceLabels[k])))), h("label", null, "Pay with", h("select", { value: payWith, onChange: e => setPayWith(e.target.value) }, ...resourceKeys.map(k => h("option", { key: k, value: k }, resourceLabels[k])))), button(`Import for ${cost}`, () => onAction({ kind: "publicImport", receive, payment: { [payWith]: cost } }), { kind: "secondary" }));
}
function TradePanel({ game, player, onTrade, message }) {
    const [recipientId, setRecipientId] = useState(Object.keys(game.players).find(id => id !== player.id) || "");
    const [offer, setOffer] = useState("constructionMaterials");
    const [request, setRequest] = useState("criticalMaterials");
    const recipients = Object.values(game.players).filter(p => p.id !== player.id);
    return panel("Direct trade", h("div", null, h("div", { className: "form-row compact" }, h("label", null, "With", h("select", { value: recipientId, onChange: e => setRecipientId(e.target.value) }, ...recipients.map(p => h("option", { key: p.id, value: p.id }, p.name)))), h("label", null, "Offer 1", h("select", { value: offer, onChange: e => setOffer(e.target.value) }, ...resourceKeys.map(k => h("option", { key: k, value: k }, resourceLabels[k])))), h("label", null, "Request 1", h("select", { value: request, onChange: e => setRequest(e.target.value) }, ...resourceKeys.map(k => h("option", { key: k, value: k }, resourceLabels[k])))), button("Propose", () => onTrade(recipientId, offer, request), { kind: "secondary" })), message ? h("p", { className: "trade-message" }, message) : null), "nested");
}
function DevelopmentControls({ game, player, onAction, onUndo, onReset, onTrade, tradeMessage }) {
    const condition = conditionDefinition(game, player);
    const adaptable = condition && "adaptable" in condition.effect && condition.effect.adaptable && !player.localCondition.adapted;
    const resourceButtons = [
        button("Extract Fossil", () => onAction({ kind: "extract", resource: "fossilFuel" })),
        button("Extract Construction", () => onAction({ kind: "extract", resource: "constructionMaterials" })),
        button("Extract Critical", () => onAction({ kind: "extract", resource: "criticalMaterials" })),
        button("Harvest Biomass", () => onAction({ kind: "harvestBiomass" })),
        button("Research", () => onAction({ kind: "research" })),
        adaptable ? button(`Adapt to ${condition.name}`, () => onAction({ kind: "adapt" }), { kind: "secondary" }) : null,
        button("Pass", () => onAction({ kind: "pass" }), { kind: "ghost" })
    ].filter(Boolean);
    return h("div", { className: "action-panel" }, h("div", { className: "action-heading" }, h("div", null, h("p", { className: "eyebrow" }, `Action round ${game.actionRound}`), h("h2", null, `${player.name}'s Development turn`)), badge(`${player.actionsRemaining} action${player.actionsRemaining === 1 ? "" : "s"} left`, "action")), panel("Resources and Knowledge", h("div", { className: "button-grid" }, ...resourceButtons), "nested"), panel("Build technology", h(BuildShop, { game, onAction }), "nested"), panel("Public import", h(ImportForm, { game, onAction }), "nested"), h(TradePanel, { game, player, onTrade, message: tradeMessage }), h("div", { className: "form-row compact" }, button("Undo last action", onUndo, { kind: "ghost", disabled: game.undo.stack.length === 0 }), button("Reset Generation", onReset, { kind: "ghost", disabled: !game.undo.generationStart })));
}
function DispatchPanel({ game, player, onDispatch }) {
    const recommended = useMemo(() => chooseDispatchPlan(game, player), [game, player.id]);
    const [draft, setDraft] = useState(JSON.stringify(recommended, null, 2));
    useEffect(() => setDraft(JSON.stringify(recommended, null, 2)), [player.id, game.generation]);
    const [error, setError] = useState("");
    const submit = () => {
        try {
            onDispatch(JSON.parse(draft));
            setError("");
        }
        catch (e) {
            setError(e.message);
        }
    };
    return h("div", { className: "action-panel" }, h("div", { className: "action-heading" }, h("div", null, h("p", { className: "eyebrow" }, "Operational planning"), h("h2", null, `${player.name}'s Dispatch`)), badge(weatherLabels[game.weather.current], "weather")), h("p", null, "The planner proposes a legal dispatch from the installed system. Edit the JSON to test different fuel output, storage discharge, charging and transport allocations."), panel("Recommended Dispatch Plan", h("div", null, h("textarea", { className: "json-editor dispatch-editor", value: draft, onChange: e => setDraft(e.target.value), spellCheck: false }), error ? h("p", { className: "error" }, error) : null, h("div", { className: "form-row compact" }, button("Restore recommendation", () => setDraft(JSON.stringify(recommended, null, 2)), { kind: "ghost" }), button("Confirm Dispatch", submit, { kind: "primary" }))), "nested"), panel("How the flow resolves", h("ol", { className: "resolution-list" }, h("li", null, "Weather and Local Condition determine capture and inflow."), h("li", null, "Reservoirs, Batteries and fuel plants release Energy."), h("li", null, "Unused Energy can charge a Battery."), h("li", null, "Grid capacity limits transported Energy."), h("li", null, "Lighting converts transported Energy into Light.")), "nested"));
}
function ReviewScreen({ game, onContinue }) {
    return h("div", { className: "review" }, h("div", { className: "action-heading" }, h("div", null, h("p", { className: "eyebrow" }, "End-of-Generation review"), h("h2", null, `Generation ${game.generation}`)), button(game.generation === 8 ? "Calculate final results" : "Continue", onContinue, { kind: "primary" })), h("div", { className: "review-grid" }, ...currentOrder(game).map(id => {
        const p = game.players[id];
        const m = p.currentMetrics;
        return h("article", { key: id, className: "review-card" }, h("h3", null, p.name), h("div", { className: "review-light" }, h("strong", null, m.deliveredLight), h("span", null, "Light")), h("div", { className: "mini-stats" }, stat("Target", m.reliabilityTarget), stat("Reliable", m.reliabilityMet ? "Yes" : "No"), stat("Loss", sumLoss(m.systemLoss)), stat("Curtailment", m.curtailed), stat("Stored", m.storedEnd)), m.technologiesBuilt.length ? h("small", null, `Built: ${m.technologiesBuilt.map(t => getTechnology(game, t).name).join(", ")}`) : h("small", null, "No construction this Generation"));
    })));
}
function ResultsScreen({ game, onRestart }) {
    return h("div", { className: "results" }, h("div", { className: "sun-mark small" }, h("span", null, "☀")), h("p", { className: "eyebrow" }, "Eight Generations complete"), h("h1", null, "Final Results"), h("div", { className: "results-table" }, ...game.results.map(result => {
        const player = game.players[result.playerId];
        return h("div", { key: result.playerId, className: `result-row ${result.rank === 1 ? "winner" : ""}` }, h("strong", { className: "rank" }, result.rank), h("div", null, h("h3", null, player.name), h("small", null, game.config.continents.find(c => c.id === player.continentId).name)), stat("Light", result.totalLight), stat("Reliability", result.reliableGenerations), stat("System Loss", result.systemLoss), stat("Stored", result.usableStoredEnergy));
    })), h("div", { className: "form-row" }, button("New Game", onRestart, { kind: "primary" }), button("Export results JSON", () => download(`sunpaths-results-${game.seed}.json`, JSON.stringify({ seed: game.seed, results: game.results, log: game.log }, null, 2)), { kind: "secondary" })));
}
function GameHeader({ game, onHome, onRules, onSave, onLoad }) {
    return h("header", { className: "game-header" }, h("button", { className: "brand", onClick: onHome }, h("span", null, "☀"), "SUNPATHS"), h("div", { className: "generation-strip" }, h("strong", null, game.generation ? `Generation ${game.generation}/8` : "Pregame"), badge(phaseLabel(game.phase))), h("div", { className: "header-weather" }, h(WeatherCard, { label: "Current", face: game.weather.current }), h(WeatherCard, { label: "Forecast", face: game.weather.forecast, forecast: true })), h("div", { className: "header-actions" }, button("Rules", onRules, { kind: "ghost" }), button("Save", onSave, { kind: "ghost" }), h("label", { className: "button ghost file-button" }, "Load", h("input", { type: "file", accept: ".json,application/json", onChange: onLoad }))));
}
function GameScreen({ game, setGame, onHome, onRules, onLoad }) {
    const [selectedId, setSelectedId] = useState(Object.keys(game.players)[0]);
    const [notice, setNotice] = useState("");
    const [tradeMessage, setTradeMessage] = useState("");
    useEffect(() => { if (!game.players[selectedId])
        setSelectedId(Object.keys(game.players)[0]); }, [game, selectedId]);
    const selected = game.players[selectedId] || Object.values(game.players)[0];
    const mutate = (operation, runAi = true) => {
        try {
            const next = clone(game);
            operation(next);
            if (runAi)
                pumpAi(next);
            const errors = invariantErrors(next);
            if (errors.length)
                throw new Error(errors.join("\n"));
            setGame(next);
            setNotice("");
            return true;
        }
        catch (e) {
            setNotice(e.message);
            return false;
        }
    };
    const command = commandValue => mutate(next => applyCommand(next, commandValue));
    const act = action => { const player = currentPlayer(game); command({ type: "developmentAction", playerId: player.id, action }); };
    const dispatch = plan => { const player = currentPlayer(game); command({ type: "dispatch", playerId: player.id, plan }); };
    const selectPrepared = (playerId, pathwayId, capabilityId) => command({ type: "selectPrepared", playerId, pathwayId, capabilityId });
    const save = () => download(`sunpaths-${game.seed}-g${game.generation}.json`, serializeGame(game));
    const trade = (recipientId, offer, request) => {
        const actor = currentPlayer(game);
        const recipient = game.players[recipientId];
        if (!actor || !recipient)
            return;
        const recipientNeed = recipient.resources[offer].warehouse <= 2 ? 2 : recipient.resources[offer].warehouse <= 4 ? 1 : 0;
        const recipientCost = recipient.resources[request].warehouse <= 1 ? 2 : recipient.resources[request].warehouse <= 3 ? 1 : 0;
        if (recipient.controller.kind === "ai" && recipientNeed < recipientCost) {
            setTradeMessage(`${recipient.name} rejected: ${resourceLabels[request]} is currently scarcer than ${resourceLabels[offer]}.`);
            return;
        }
        const accepted = mutate(next => executeDirectTrade(next, actor.id, recipientId, { [offer]: 1 }, { [request]: 1 }), false);
        if (accepted)
            setTradeMessage(`${recipient.name} accepted: the offered resource was at least as useful as the requested resource.`);
    };
    const continueReview = () => mutate(next => {
        applyCommand(next, { type: "finishReview" });
        if (next.phase === "generation.advanceWeather")
            applyCommand(next, { type: "advanceWeather" });
    }, false);
    let decision = null;
    if (game.phase.startsWith("setup."))
        decision = h(SetupProgress, { game, command: value => command(value), onSelect: selectPrepared });
    else if (game.phase === "generation.start")
        decision = panel("Generation ready", h("div", { className: "form-row" }, h("p", null, `Current: ${weatherLabels[game.weather.current]}. Forecast: ${game.weather.forecast ? weatherLabels[game.weather.forecast] : "none"}.`), button("Begin Generation", () => command({ type: "beginGeneration" }), { kind: "primary" })));
    else if (game.phase === "generation.localConditions")
        decision = panel("Local Conditions", h("div", { className: "form-row" }, h("p", null, "Draw one current-Generation condition for each active continent."), button("Draw Local Conditions", () => command({ type: "drawLocalConditions" }), { kind: "primary" })));
    else if (game.phase === "generation.development") {
        const active = currentPlayer(game);
        decision = active?.controller.kind === "human" ? h(DevelopmentControls, { game, player: active, onAction: act, onUndo: () => command({ type: "undo" }), onReset: () => command({ type: "resetGeneration" }), onTrade: trade, tradeMessage }) : panel("AI planning", h("p", null, "AI players are resolving their Development actions."));
    }
    else if (game.phase === "generation.dispatch") {
        const active = currentPlayer(game);
        decision = active?.controller.kind === "human" ? h(DispatchPanel, { game, player: active, onDispatch: dispatch }) : panel("AI dispatch", h("p", null, "AI players are resolving their systems."));
    }
    else if (game.phase === "generation.review")
        decision = h(ReviewScreen, { game, onContinue: continueReview });
    else if (game.phase === "game.complete")
        decision = h(ResultsScreen, { game, onRestart: onHome });
    const market = panel("Innovation Market", h("div", { className: "market-list" }, ...game.innovationMarket.visible.map(id => {
        const tech = getTechnology(game, id);
        return h("div", { key: id }, h("strong", null, tech.name), h("small", null, `${tech.cost.constructionMaterials}C · ${tech.cost.criticalMaterials}M · K${tech.knowledgeRequired}`));
    })), "nested");
    const events = panel("Recent events", h("div", { className: "event-log" }, ...game.log.slice(-10).reverse().map(event => h("p", { key: event.sequence }, h("small", null, `#${event.sequence}`), event.message))), "nested");
    const body = game.phase === "game.complete"
        ? decision
        : h("main", { className: "game-main" }, h("div", { className: "game-left" }, h(WorldArea, { game, selectedId, setSelectedId }), h(PlayerBoard, { game, player: selected })), h("aside", { className: "game-right" }, decision, market, game.debugMode ? h(AiDebugPanel, { game }) : null, events));
    return h("div", { className: "game-shell" }, h(GameHeader, { game, onHome, onRules, onSave: save, onLoad }), notice ? h("div", { className: "notice error" }, notice, button("Dismiss", () => setNotice(""), { kind: "ghost" })) : null, body);
}
function RulesScreen({ config, setConfig, onBack }) {
    const [draft, setDraft] = useState(JSON.stringify(config, null, 2));
    const [message, setMessage] = useState("");
    const apply = () => {
        try {
            const parsed = JSON.parse(draft);
            const errors = validateConfig(parsed);
            if (errors.length)
                throw new Error(errors.join("\n"));
            setConfig(parsed);
            setMessage("Configuration validated. It will apply to new games only.");
        }
        catch (e) {
            setMessage(e.message);
        }
    };
    return h("main", { className: "page rules-page" }, h("header", { className: "page-header" }, h("div", null, h("p", { className: "eyebrow" }, "Rules and Data"), h("h1", null, "Transparent, configurable rules")), button("Back", onBack, { kind: "ghost" })), h("div", { className: "rules-grid" }, panel("Core game", h("div", { className: "prose" }, h("p", null, "Six continental factions compete across eight Generations. Light is the score."), h("p", null, "Each Generation grants two Development actions, followed by an operational Dispatch."), h("p", null, "Victory: most Light, then Reliability, least System Loss, then recoverable stored Energy."))), panel("Energy chain", h("div", null, h("div", { className: "chain-preview compact" }, ...["Capture", "Store", "Transform", "Transport", "Light"].flatMap((stage, i) => [h("span", { key: stage }, stage), i < 4 ? h("b", { key: `${stage}-a` }, "→") : null].filter(Boolean))), h("p", { className: "muted" }, "Recovery Breakthrough now recovers one otherwise-lost Battery Energy on the selected Battery’s next discharge."))), panel("Weather faces", h("div", { className: "weather-list" }, ...config.weather.faces.map((face, i) => h(WeatherCard, { key: `${face}-${i}`, label: `Face ${i + 1}`, face }))))), panel("Developer configuration editor", h("div", null, h("p", null, "Edits apply to new games. Active games retain their configuration snapshot."), h("textarea", { className: "json-editor", value: draft, onChange: e => setDraft(e.target.value), spellCheck: false }), message ? h("p", { className: message.startsWith("Configuration") ? "success" : "error" }, message) : null, h("div", { className: "form-row compact" }, button("Validate and use", apply, { kind: "primary" }), button("Restore defaults", () => { setDraft(JSON.stringify(defaultConfig, null, 2)); setMessage(""); }, { kind: "ghost" }), button("Export JSON", () => download("sunpaths-config.json", draft), { kind: "secondary" })))));
}
function SimulationBar({ value, maximum = 1 }) {
    const width = maximum > 0 ? Math.max(2, Math.min(100, value / maximum * 100)) : 0;
    return h("div", { className: "simulation-bar" }, h("i", { style: { width: `${width}%` } }));
}
function SimulationAggregateTable({ title, rows }) {
    const maximum = Math.max(1, ...rows.map(row => row.light.mean));
    return panel(title, h("div", { className: "simulation-table" }, h("div", { className: "simulation-row header" }, h("span", null, "Entity"), h("span", null, "Mean Light"), h("span", null, "Win rate"), h("span", null, "Reliability"), h("span", null, "Loss")), ...rows.map(row => h("div", { key: row.id, className: "simulation-row" }, h("strong", null, titleCase(row.id)), h("span", null, row.light.mean.toFixed(2), h(SimulationBar, { value: row.light.mean, maximum })), h("span", null, `${(row.winRate * 100).toFixed(1)}%`), h("span", null, row.reliabilityMean.toFixed(2)), h("span", null, row.systemLossMean.toFixed(2))))));
}
function SimulationLab({ config, onBack }) {
    const [scenario, setScenario] = useState(() => defaultSimulationScenario(config));
    const [report, setReport] = useState(null);
    const [comparison, setComparison] = useState(null);
    const [progress, setProgress] = useState({ completed: 0, total: scenario.games, fraction: 0 });
    const [running, setRunning] = useState(false);
    const [message, setMessage] = useState("");
    const workerRef = useRef(null);
    useEffect(() => () => workerRef.current?.terminate(), []);
    const update = patch => setScenario(current => ({ ...current, ...patch }));
    const updateAssignment = (index, strategyId) => update({ assignments: scenario.assignments.map((item, i) => i === index ? { ...item, strategyId } : item) });
    const run = (mode = "run") => {
        workerRef.current?.terminate();
        setRunning(true);
        setReport(null);
        setComparison(null);
        setMessage("");
        setProgress({ completed: 0, total: mode === "tradeComparison" ? scenario.games * 3 : scenario.games, fraction: 0 });
        const worker = new Worker(new URL("./simulationWorker.js", import.meta.url), { type: "module" });
        workerRef.current = worker;
        worker.onmessage = event => {
            if (event.data.type === "progress")
                setProgress(event.data.progress);
            if (event.data.type === "complete") {
                setReport(event.data.report);
                setRunning(false);
                worker.terminate();
                workerRef.current = null;
            }
            if (event.data.type === "comparisonComplete") {
                setComparison(event.data.comparison);
                setRunning(false);
                worker.terminate();
                workerRef.current = null;
            }
            if (event.data.type === "error") {
                setMessage(event.data.message);
                setRunning(false);
                worker.terminate();
                workerRef.current = null;
            }
        };
        worker.onerror = event => { setMessage(event.message || "Simulation Worker failed."); setRunning(false); };
        worker.postMessage({ type: mode, config, scenario });
    };
    const cancel = () => { workerRef.current?.terminate(); workerRef.current = null; setRunning(false); setMessage("Simulation cancelled."); };
    return h("main", { className: "page simulation-page" }, h("header", { className: "page-header" }, h("div", null, h("p", { className: "eyebrow" }, "Phase 4"), h("h1", null, "Simulation Lab"), h("p", { className: "lead compact" }, "Run the same rules engine without a UI and separate continent effects from AI strategy effects.")), button("Back", onBack, { kind: "ghost" })), h("div", { className: "simulation-layout" }, h("section", { className: "panel simulation-controls" }, h("div", { className: "panel-title" }, "Batch controls"), h("div", { className: "control-grid" }, h("label", null, "Games", h("select", { value: scenario.games, onChange: e => update({ games: Number(e.target.value) }) }, ...[100, 1000, 10000].map(value => h("option", { key: value, value }, value.toLocaleString())))), h("label", null, "Base seed", h("input", { value: scenario.baseSeed, onChange: e => update({ baseSeed: e.target.value }) })), h("label", null, "Assignment", h("select", { value: scenario.assignmentMode, onChange: e => update({ assignmentMode: e.target.value }) }, h("option", { value: "rotateStrategies" }, "Rotate strategies fairly"), h("option", { value: "fixed" }, "Fixed pairings"))), h("label", null, "Seat assignment", h("select", { value: scenario.seatAssignmentMode, onChange: e => update({ seatAssignmentMode: e.target.value }) }, h("option", { value: "rotate" }, "Rotate seats fairly"), h("option", { value: "fixed" }, "Fixed player seats"))), h("label", null, "AI difficulty", h("select", { value: scenario.aiDifficulty, onChange: e => update({ aiDifficulty: e.target.value }) }, h("option", { value: "basic" }, "Basic"), h("option", { value: "standard" }, "Standard"), h("option", { value: "advanced" }, "Advanced"))), h("label", null, "Trade", h("select", { value: scenario.tradeMode, onChange: e => update({ tradeMode: e.target.value }) }, h("option", { value: "directAndImport" }, "Direct + public import"), h("option", { value: "publicImportOnly" }, "Public import only"), h("option", { value: "disabled" }, "Disabled"))), h("label", null, "Technology data", h("select", { value: scenario.technologyDataSetId, onChange: e => update({ technologyDataSetId: e.target.value }) }, ...technologyDataSets.map(item => h("option", { key: item.id, value: item.id }, item.label)))), h("label", null, "Weather distribution", h("select", { value: scenario.weatherPresetId, onChange: e => update({ weatherPresetId: e.target.value }) }, ...["default", "sunny", "windy", "wet", "balanced"].map(id => h("option", { key: id, value: id }, titleCase(id))))), h("label", null, "Local Condition severity", h("input", { type: "number", min: 0, max: 2, step: 0.25, value: scenario.localConditionSeverity, onChange: e => update({ localConditionSeverity: Number(e.target.value) }) })), h("label", null, "Starting-resource multiplier", h("input", { type: "number", min: 0.5, max: 2, step: 0.1, value: scenario.startingResourceMultiplier, onChange: e => update({ startingResourceMultiplier: Number(e.target.value) }) })), h("label", null, "Actions per Generation", h("input", { type: "number", min: 1, max: 4, step: 1, value: scenario.actionsPerGeneration, onChange: e => update({ actionsPerGeneration: Number(e.target.value) }) })), h("label", null, "AI trade utility threshold", h("input", { type: "number", min: 0, max: 5, step: 0.05, value: scenario.aiTradeUtilityThreshold, onChange: e => update({ aiTradeUtilityThreshold: Number(e.target.value) }) })), h("label", null, "AI direct-trade cadence", h("input", { type: "number", min: 1, max: 8, step: 1, value: scenario.aiDirectTradeCadence, onChange: e => update({ aiDirectTradeCadence: Number(e.target.value) }) })), h("label", { className: "checkbox" }, h("input", { type: "checkbox", checked: scenario.randomizeInitialFirstPlayer, onChange: e => update({ randomizeInitialFirstPlayer: e.target.checked }) }), " Randomise initial first player")), h("div", { className: "toggle-grid" }, h("label", { className: "toggle-row" }, h("input", { type: "checkbox", checked: scenario.buildAndOperateSameGeneration, onChange: e => update({ buildAndOperateSameGeneration: e.target.checked }) }), "Build and operate in same Generation"), ...["thermal", "battery", "lighting"].map(key => h("label", { key, className: "toggle-row" }, h("input", { type: "checkbox", checked: scenario.lossRules[key], onChange: e => update({ lossRules: { ...scenario.lossRules, [key]: e.target.checked } }) }), `Count ${titleCase(key)} loss`))), h("h3", null, "Starting strategy assignments"), h("div", { className: "assignment-grid" }, ...scenario.assignments.map((assignment, index) => {
        const continent = config.continents.find(item => item.id === assignment.continentId);
        return h("label", { key: assignment.continentId }, continent.name, h("select", { value: assignment.strategyId, onChange: e => updateAssignment(index, e.target.value) }, ...strategies.map(id => h("option", { key: id, value: id }, strategyLabels[id]))));
    })), h("p", { className: "muted" }, scenario.assignmentMode === "rotateStrategies" && scenario.seatAssignmentMode === "rotate" ? "Each continent receives every AI strategy and every player seat across a 36-game cycle." : scenario.assignmentMode === "rotateStrategies" ? "Strategies rotate, but fixed seats may still confound geography with turn order and market access." : "Continent and strategy remain paired; results cannot cleanly separate geography from strategy."), h("div", { className: "form-row" }, button(running ? "Running…" : "Run batch", () => run("run"), { kind: "primary", disabled: running }), button("Compare trade modes", () => run("tradeComparison"), { kind: "secondary", disabled: running }), running ? button("Cancel", cancel, { kind: "ghost" }) : null), running || progress.completed ? h("div", { className: "progress-block" }, h("div", { className: "progress-track" }, h("i", { style: { width: `${progress.fraction * 100}%` } })), h("small", null, `${progress.completed.toLocaleString()} / ${progress.total.toLocaleString()} games`)) : null, message ? h("p", { className: "error" }, message) : null), h("div", { className: "simulation-results" }, !report && !comparison ? panel("Results", h("p", { className: "muted" }, "Run a batch to calculate continental means, strategy effects, percentiles, technology frequency and automatic balance warnings.")) : comparison ? h(React.Fragment, null, panel("Trade-mode comparison", h("div", { className: "simulation-table" }, h("div", { className: "simulation-row header" }, h("span", null, "Mode"), h("span", null, "Mean Light"), h("span", null, "Reliability"), h("span", null, "Trades/game"), h("span", null, "Imports/game")), ...comparison.rows.map(row => h("div", { key: row.tradeMode, className: "simulation-row" }, h("strong", null, titleCase(row.tradeMode)), h("span", null, row.meanLight.toFixed(2)), h("span", null, row.meanReliability.toFixed(2)), h("span", null, row.tradesPerGame.toFixed(2)), h("span", null, row.importsPerGame.toFixed(2)))))), panel("Comparison export", h("div", { className: "form-row compact" }, button("Full comparison JSON", () => download("sunpaths-trade-comparison.json", JSON.stringify(comparison, null, 2)), { kind: "secondary" })))) : h(React.Fragment, null, h("div", { className: "score-row" }, stat("Games", report.gamesCompleted.toLocaleString()), stat("Config hash", report.effectiveConfigHash), stat("Trades", report.totals.trades), stat("Imports", report.totals.imports)), h(SimulationAggregateTable, { title: "By continent", rows: report.byContinent }), h(SimulationAggregateTable, { title: "By AI strategy", rows: report.byStrategy }), panel("Automatic balance flags", h("div", { className: "flag-list" }, ...report.flags.map(item => h("article", { key: item.id, className: `balance-flag ${item.severity}` }, h("div", null, badge(item.severity, item.severity), h("strong", null, item.title)), h("p", null, item.message))))), panel("Technology purchase frequency", h("div", { className: "frequency-list" }, ...report.technologyPurchases.slice(0, 12).map(item => h("div", { key: item.id }, h("span", null, titleCase(item.id)), h("strong", null, `${(item.share * 100).toFixed(1)}%`), h(SimulationBar, { value: item.share, maximum: 1 }))))), panel("Exports", h("div", { className: "form-row compact" }, button("Full JSON", () => download("sunpaths-simulation-report.json", simulationReportToJson(report)), { kind: "secondary" }), button("Player CSV", () => download("sunpaths-player-results.csv", playerResultsToCsv(report.playerResults), "text/csv"), { kind: "secondary" }), button("Aggregate CSV", () => download("sunpaths-aggregates.csv", aggregateReportToCsv(report), "text/csv"), { kind: "secondary" }), button("Flags CSV", () => download("sunpaths-balance-flags.csv", balanceFlagsToCsv(report), "text/csv"), { kind: "secondary" })))))));
}
function AiDebugPanel({ game }) {
    const event = [...game.log].reverse().find(item => item.type === "ai.decision" || item.type === "ai.tradeDecision" || item.type === "ai.assistanceDecision");
    if (!event)
        return panel("AI decision debugging", h("p", { className: "muted" }, "No AI decision has been recorded yet."), "nested");
    const factors = Array.isArray(event.data?.factors) ? event.data.factors : [];
    return panel("AI decision debugging", h("div", { className: "ai-debug" }, h("strong", null, event.message), ...factors.map((item, index) => h("div", { key: `${event.sequence}-${index}` }, h("span", null, item.label), h("b", null, Number(item.score).toFixed(1)), h("small", null, item.detail)))), "nested");
}
function App() {
    const [screen, setScreen] = useState("start");
    const [config, setConfig] = useState(() => clone(defaultConfig));
    const [participants, setParticipants] = useState(() => makeParticipants(defaultConfig));
    const [seed, setSeed] = useState("SUNPATHS-001");
    const [game, setGame] = useState(null);
    const [debugMode, setDebugMode] = useState(false);
    const [fatal, setFatal] = useState("");
    const startGame = () => {
        try {
            const active = participants.filter(p => p.included);
            const setups = active.map((entry, index) => ({ id: `p${index + 1}`, name: entry.name || config.continents.find(c => c.id === entry.continentId).name, continentId: entry.continentId, controller: entry.controller === "human" ? { kind: "human" } : { kind: "ai", strategy: entry.strategy, difficulty: entry.difficulty } }));
            const state = createGame(config, setups, seed || "SUNPATHS-001", { debugMode });
            for (const player of Object.values(state.players))
                if (player.controller.kind === "ai") {
                    const prepared = aiPrepared(player.controller.strategy);
                    applyCommand(state, { type: "selectPrepared", playerId: player.id, ...prepared });
                }
            setGame(state);
            setScreen("game");
            setFatal("");
        }
        catch (e) {
            setFatal(e.message);
        }
    };
    const loadFile = event => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => { try {
            const state = deserializeGame(String(reader.result));
            setGame(state);
            setScreen("game");
            setFatal("");
        }
        catch (e) {
            setFatal(e.message);
        } };
        reader.readAsText(file);
        event.target.value = "";
    };
    const home = () => { setScreen("start"); setGame(null); };
    return h(React.Fragment, null, fatal ? h("div", { className: "fatal-banner" }, fatal, button("Dismiss", () => setFatal(""), { kind: "ghost" })) : null, screen === "start" ? h(StartScreen, { onNew: () => { setParticipants(makeParticipants(config)); setScreen("setup"); }, onLoad: loadFile, onRules: () => setScreen("rules"), onSimulation: () => setScreen("simulation") }) : null, screen === "setup" ? h(SetupScreen, { config, participants, setParticipants, seed, setSeed, debugMode, setDebugMode, onStart: startGame, onBack: () => setScreen("start") }) : null, screen === "simulation" ? h(SimulationLab, { config, onBack: () => setScreen("start") }) : null, screen === "rules" ? h(RulesScreen, { config, setConfig, onBack: () => setScreen(game ? "game" : "start") }) : null, screen === "game" && game ? h(GameScreen, { game, setGame, onHome: home, onRules: () => setScreen("rules"), onLoad: loadFile }) : null);
}
createRoot(document.getElementById("root")).render(h(App));
//# sourceMappingURL=main.js.map