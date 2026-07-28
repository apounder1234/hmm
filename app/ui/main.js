// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { defaultConfig } from "../config/defaults/index.js";
import { validateConfig } from "../config/validation.js";
import { createGame } from "../engine/createGame.js";
import { applyCommand, currentOrder, currentPlayerId } from "../engine/stateMachine.js";
import { executeDirectTrade } from "../engine/trade/trade.js";
import { invariantErrors } from "../engine/invariants.js";
import { effectivePathwayOpportunity, getTechnology, pathways, totalEnergy, totalLoss } from "../engine/helpers.js";
import { hasRelevantSystem } from "../engine/conditions/conditions.js";
import { aiPrepared, attemptAiTechnicalAssistance, attemptAiTrade, chooseDevelopmentDecision, chooseDispatchDecision, chooseDispatchPlan, recordAiDecision } from "../ai/ai.js";
import { deserializeGame, serializeGame } from "../persistence/save.js";
import { defaultSimulationScenario, technologyDataSets } from "../simulation/scenario.js";
import { aggregateReportToCsv, balanceFlagsToCsv, playerResultsToCsv } from "../simulation/exporters/csv.js";
import { simulationReportToJson } from "../simulation/exporters/json.js";
import { buildLegality, developmentActionLegality, effectiveBuildCost, importLegality, previewDispatch } from "./playability.js";
const h = React.createElement;
const continentIcons = { africa: "◒", asia: "◐", europe: "◓", northAmerica: "◔", southAmerica: "◕", australia: "◉" };
const weatherLabels = { brightSun: "Bright Sun", rain: "Rain", strongWind: "Strong Wind", storm: "Storm", calmOvercast: "Calm Overcast" };
const resourceLabels = { fossilFuel: "Fossil Fuel", biomass: "Biomass", constructionMaterials: "Building Materials", criticalMaterials: "Special Materials" };
const pathwayLabels = { solar: "Solar", wind: "Wind", hydro: "Hydro", biomass: "Biomass", fossil: "Fossil" };
const capabilityLabels = { storage: "Storage", transformation: "Transformation", transport: "Transport", efficiency: "Efficiency", research: "Research", trade: "Trade" };
const strategyLabels = { solarStorage: "Solar + Storage", windGrid: "Wind + Grid", hydroReliability: "Hydro Reliability", biomassRenewal: "Biomass Renewal", fossilTempo: "Fuel Bridge", diversifiedAdapter: "Diversified Adapter" };
const strategies = Object.keys(strategyLabels);
const resourceKeys = Object.keys(resourceLabels);
const resourceDescriptions = {
    fossilFuel: "Finite transition fuel. Every faction begins with a Legacy Fuel Plant, but fossil productivity falls after one quarter and one half of the original stock has been used.",
    biomass: "Renewable but rate-limited fuel. Harvest it into your Warehouse; an installed Managed Forest can regrow continental Biomass at the end of a Generation.",
    constructionMaterials: "The main structural resource used to build technologies. It must be in your Warehouse before construction.",
    criticalMaterials: "Specialised materials used especially by storage, advanced and efficiency technologies. Public import normally costs three resources."
};
const stageDescriptions = {
    Capture: "Makes usable Energy available from Solar or Wind opportunity, or collects Hydro inflow into a Reservoir.",
    Store: "Keeps Energy between Generations. Batteries lose some Energy on recovery; Reservoirs store Hydro inflow.",
    Transform: "Turns Hydro, Biomass or Fossil inputs into usable Energy. Thermal plants also create System Loss.",
    Transport: "Moves Energy through the Grid. Grid capacity limits how much Energy can reach Lighting.",
    Light: "The score. Transported Energy is converted by Lighting, up to four Light in each Generation."
};
const weatherDescriptions = {
    brightSun: "Solar operates at full potential. Wind is weak and Hydro receives only base inflow.",
    rain: "Solar and Wind are reduced. Hydro receives increased inflow.",
    strongWind: "Wind operates at full potential. Solar is reduced and Hydro receives base inflow.",
    storm: "Wind remains strong but below its ideal maximum; Solar is heavily reduced; Hydro receives its strongest inflow.",
    calmOvercast: "Solar and Wind are both reduced. Hydro receives base inflow."
};
function newRandomSeed() {
    const values = new Uint32Array(2);
    if (globalThis.crypto?.getRandomValues)
        globalThis.crypto.getRandomValues(values);
    else {
        values[0] = Date.now() >>> 0;
        values[1] = Math.floor(Math.random() * 0xffffffff);
    }
    return `SUNPATHS-${Date.now().toString(36).toUpperCase()}-${Array.from(values).map(value => value.toString(36).toUpperCase()).join("-")}`;
}
function localConditionExplanation(game, player, condition) {
    const effect = condition.effect;
    const descriptions = {
        hydroDelta: effect.amount >= 0 ? `Hydro inflow increases by ${effect.amount}.` : `Hydro inflow decreases by ${Math.abs(effect.amount)}.`,
        windDelta: `Wind gross generation increases by ${effect.amount}, but never above installed capacity and continental Wind Opportunity.`,
        solarDelta: `Solar gross generation changes by ${effect.amount}.`,
        biomassRegrowthDelta: `Biomass regrowth changes by ${effect.amount}.`,
        biomassRegrowthSet: `Biomass regrowth is set to ${effect.value}.`,
        gridCapacityDelta: `Grid transport capacity changes by ${effect.amount}.`,
        firstFuelPlantOutputDelta: `The first Biomass or Fossil plant operated this Generation produces ${Math.abs(effect.amount)} less Energy.`,
        firstBuildConstructionDelta: `Your first Build this Generation costs ${effect.amount} additional Construction Material.`,
        storageRecoveryBonus: `Choose an installed Battery. Its next discharge this Generation recovers ${effect.amount} additional Energy that would otherwise be lost.`,
        temporaryKnowledge: `You gain ${effect.amount} temporary Knowledge for construction this Generation.`,
        lightMaximumDelta: `Maximum Light this Generation changes by ${effect.amount}.`
    };
    const relevant = hasRelevantSystem(game, player, effect.kind);
    const adapted = Boolean(player.localCondition?.adapted);
    return {
        eyebrow: "Local Condition",
        title: condition.name,
        summary: descriptions[effect.kind] || "A temporary effect for the current Generation.",
        details: [
            adapted ? "You have already adapted, so the negative effect is cancelled." : relevant ? "This condition currently has a relevant target in your system." : "You do not currently have the relevant developed system, so it has no applicable effect unless its fallback rule applies.",
            "It lasts only for the current Generation and never destroys permanent infrastructure or removes scored Light.",
            effect.adaptable ? "You may spend one Development action to Adapt and cancel its penalty." : "This condition has no Adapt response."
        ],
        status: adapted ? "Adapted" : relevant ? "Active now" : "No relevant target"
    };
}
function weatherExplanation(game, player, face, label) {
    if (!face)
        return { eyebrow: label, title: "No forecast", summary: "There is no later weather result to plan around.", details: [] };
    const continent = game.config.continents.find(item => item.id === player.continentId);
    const capacity = path => player.installed.filter(instance => { const tech = getTechnology(game, instance.technologyId); return tech.pathway === path && tech.stage === "capture"; }).reduce((sum, instance) => sum + getTechnology(game, instance.technologyId).capacity, 0);
    const solarIdeal = Math.min(continent.opportunities.solar, capacity("solar"));
    const windIdeal = Math.min(continent.opportunities.wind, capacity("wind"));
    const solar = game.config.weather.solar[face][solarIdeal] ?? 0;
    const wind = game.config.weather.wind[face][windIdeal] ?? 0;
    const hydro = game.config.weather.hydro[face][continent.opportunities.hydro] ?? 0;
    return {
        eyebrow: label,
        title: weatherLabels[face],
        summary: weatherDescriptions[face],
        details: [
            `${player.name}'s currently installed Solar capacity would produce ${solar} Energy before Local Conditions.`,
            `${player.name}'s currently installed Wind capacity would produce ${wind} Energy before Local Conditions.`,
            `With a Reservoir, continental Hydro Opportunity would provide ${hydro} inflow before Local Conditions.`
        ],
        status: label
    };
}
function technologyExplanation(tech) {
    const details = [
        `Pathway: ${tech.pathway === "shared" ? "Shared system" : pathwayLabels[tech.pathway]}. Stage: ${titleCase(tech.stage)}.`,
        `Cost: ${tech.cost.constructionMaterials} Construction Material and ${tech.cost.criticalMaterials} Critical Material. Requires Knowledge ${tech.knowledgeRequired}.`,
        `Capacity ${tech.capacity}; maximum output ${tech.maximumOutput}.`
    ];
    if (tech.fuel) {
        details.push(`Consumes ${tech.fuel.units} ${resourceLabels[tech.fuel.resource]} when operated.`);
        if (tech.pathway === "fossil")
            details.push("Fossil Opportunity falls by one after only three quarters of the original stock remains and by two after half remains. This makes fuel a bridge rather than a permanent engine.");
    }
    if (tech.storage)
        details.push(`Stores up to ${tech.storage.capacity} Energy. Recovery is determined by its integer conversion table.`);
    if (tech.loss?.fixedPerOperation)
        details.push(`Creates ${tech.loss.fixedPerOperation} ${titleCase(tech.loss.category)} System Loss per operation.`);
    return { eyebrow: "Technology", title: tech.name, summary: `A ${tech.tier} ${titleCase(tech.stage)} technology.`, details };
}
function resourceExplanation(game, player, key) {
    const account = player.resources[key];
    return {
        eyebrow: "Warehouse resource",
        title: resourceLabels[key],
        summary: resourceDescriptions[key],
        details: [`Warehouse: ${account.warehouse}/9.`, `Remaining in continent: ${account.currentContinent}.`, `Printed starting stock: ${account.printedStarting}. Only Warehouse resources may be spent, consumed or traded.`, ...(key === "fossilFuel" ? [`Current effective Fossil Opportunity: ${effectivePathwayOpportunity(game, player, "fossil")}. It declines as the finite stock is consumed.`] : [])]
    };
}
function scoringExplanation(game, generation, value, target) {
    return {
        eyebrow: `Generation ${generation}`,
        title: "Light and Reliability",
        summary: "Light is the only score. Each Generation can record zero to four Light.",
        details: [`Recorded Light: ${value ?? "not resolved yet"}.`, `Reliability target: ${target}. Meeting or exceeding it adds one Reliable Generation.`, "Final ranking uses total Light, then Reliability, then least System Loss, then recoverable stored Energy."]
    };
}
function clone(value) { return structuredClone(value); }
function number(value) { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; }
function titleCase(value) { return String(value).replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()); }
function sumLoss(loss) { return loss.thermal + loss.battery + loss.lighting + loss.other; }
function phaseLabel(phase) { return phase.split(".").map(titleCase).join(" · "); }
function currentPlayer(game) { const id = currentPlayerId(game); return id ? game.players[id] : null; }
function conditionDefinition(game, player) { return player?.localCondition ? game.config.localConditions.find(c => c.id === player.localCondition.definitionId) : null; }
function button(label, onClick, options = {}) {
    return h("button", { type: "button", className: `button ${options.kind || ""}`, onClick, disabled: Boolean(options.disabled), title: options.title }, label);
}
function panel(title, content, className = "") {
    return h("section", { className: `panel ${className}` }, h("div", { className: "panel-title" }, title), content);
}
function infoButton(onClick, label = "Explain") {
    return h("button", { type: "button", className: "info-button", onClick: event => { event.stopPropagation(); onClick(); }, title: label, "aria-label": label }, "?");
}
function InfoModal({ info, onClose }) {
    useEffect(() => {
        const key = event => { if (event.key === "Escape")
            onClose(); };
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    }, [onClose]);
    if (!info)
        return null;
    return h("div", { className: "info-overlay", role: "presentation", onMouseDown: event => { if (event.target === event.currentTarget)
            onClose(); } }, h("section", { className: "info-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "sunpaths-info-title" }, h("div", { className: "info-modal-heading" }, h("div", null, h("p", { className: "eyebrow" }, info.eyebrow || "Explanation"), h("h2", { id: "sunpaths-info-title" }, info.title)), button("Close", onClose, { kind: "ghost" })), info.status ? badge(info.status, "info-status") : null, h("p", { className: "info-summary" }, info.summary), info.details?.length ? h("ul", { className: "info-details" }, ...info.details.map((detail, index) => h("li", { key: index }, detail))) : null));
}
function ConfirmationModal({ confirmation, onConfirm, onCancel }) {
    useEffect(() => {
        const key = event => { if (event.key === "Escape")
            onCancel(); };
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    }, [onCancel]);
    if (!confirmation)
        return null;
    return h("div", { className: "info-overlay confirmation-overlay", role: "presentation" }, h("section", { className: "info-modal confirmation-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "confirm-title" }, h("p", { className: "eyebrow" }, "Confirm your action"), h("h2", { id: "confirm-title" }, confirmation.title), h("p", { className: "info-summary" }, confirmation.summary), confirmation.details?.length ? h("ul", { className: "info-details" }, ...confirmation.details.map((detail, index) => h("li", { key: index }, detail))) : null, h("div", { className: "turn-cost" }, h("span", null, "This uses"), h("strong", null, confirmation.turnCost ?? "1 action")), h("div", { className: "form-row confirmation-actions" }, button("Go back", onCancel, { kind: "ghost" }), button(confirmation.confirmLabel || "Confirm", onConfirm, { kind: "primary" }))));
}
function ConditionReveal({ game, player, onContinue, onInfo }) {
    const condition = conditionDefinition(game, player);
    if (!condition)
        return null;
    const explanation = localConditionExplanation(game, player, condition);
    const icon = condition.effect.kind.includes("wind") ? "≋" : condition.effect.kind.includes("solar") ? "☁" : condition.effect.kind.includes("hydro") ? "☂" : condition.effect.kind.includes("storage") ? "▣" : condition.effect.kind.includes("Knowledge") || condition.effect.kind.includes("knowledge") ? "✦" : "!";
    return h("div", { className: "condition-reveal-overlay" }, h("section", { className: `condition-reveal-card ${explanation.status === "Active now" ? "active" : "quiet"}`, role: "dialog", "aria-modal": "true" }, h("div", { className: "condition-reveal-icon" }, icon), h("p", { className: "eyebrow" }, `Generation ${game.generation} · Local Condition`), h("h2", null, condition.name), h("p", { className: "condition-big-effect" }, explanation.summary), h("div", { className: "condition-impact" }, h("strong", null, explanation.status === "Active now" ? "This affects you now" : explanation.status === "Adapted" ? "You adapted to this" : "No effect on your current system"), h("p", null, explanation.details[0])), h("div", { className: "form-row" }, button("Read full explanation", () => onInfo(explanation), { kind: "secondary" }), button("Continue", onContinue, { kind: "primary" }))));
}
function friendlyActionName(action, game) {
    if (!action)
        return "Action";
    if (action.kind === "extract")
        return `Gather ${resourceLabels[action.resource]}`;
    if (action.kind === "harvestBiomass")
        return "Gather Biomass";
    if (action.kind === "research")
        return "Learn and gain Knowledge";
    if (action.kind === "adapt")
        return "Adapt to the Local Condition";
    if (action.kind === "pass")
        return "Finish this action without doing anything";
    if (action.kind === "build")
        return `Build ${getTechnology(game, action.technologyId).name}`;
    if (action.kind === "publicImport")
        return `Import ${resourceLabels[action.receive]}`;
    return titleCase(action.kind);
}
function actionConfirmation(game, player, action) {
    if (action.kind === "extract" || action.kind === "harvestBiomass") {
        const resource = action.kind === "harvestBiomass" ? "biomass" : action.resource;
        const account = player.resources[resource];
        return {
            title: friendlyActionName(action, game),
            summary: `Move 1 ${resourceLabels[resource]} from your land into your Warehouse.`,
            details: [`Warehouse: ${account.warehouse} → ${account.warehouse + 1}.`, `Resources remaining in your land: ${account.currentContinent} → ${account.currentContinent - 1}.`],
            confirmLabel: "Gather resource"
        };
    }
    if (action.kind === "research")
        return { title: "Learn and gain Knowledge", summary: `Increase Knowledge from ${player.knowledge} to ${player.knowledge + 1}.`, details: ["Knowledge is permanent and is not spent when you build."], confirmLabel: "Learn" };
    if (action.kind === "adapt") {
        const condition = conditionDefinition(game, player);
        return { title: `Adapt to ${condition?.name || "the condition"}`, summary: "Cancel the adaptable penalty for this Generation.", details: ["This uses one of your two actions."], confirmLabel: "Adapt" };
    }
    if (action.kind === "pass")
        return { title: "Pass this action?", summary: "You will use one action without changing your system.", details: ["Choose this only when you do not want—or cannot afford—another action."], confirmLabel: "Pass" };
    if (action.kind === "build") {
        const tech = getTechnology(game, action.technologyId);
        return { title: `Build ${tech.name}?`, summary: `Add this ${titleCase(tech.stage)} technology to your energy pathway.`, details: [`Printed cost: ${tech.cost.constructionMaterials} Building Materials + ${tech.cost.criticalMaterials} Special Materials.`, `Requires Knowledge ${tech.knowledgeRequired}; you have ${player.knowledge + player.temporaryKnowledge + player.assistanceKnowledge}.`, `Capacity: ${tech.capacity}. It may operate this Generation under the current prototype rule.`], confirmLabel: "Build it" };
    }
    if (action.kind === "publicImport") {
        const paymentText = Object.entries(action.payment).filter(([, value]) => value).map(([key, value]) => `${value} ${resourceLabels[key]}`).join(" + ");
        return { title: `Import ${resourceLabels[action.receive]}?`, summary: `Trade ${paymentText} with the public supply for 1 ${resourceLabels[action.receive]}.`, details: ["This is not a direct trade with another player.", "The payment leaves your Warehouse immediately."], confirmLabel: "Import" };
    }
    return { title: friendlyActionName(action, game), summary: "Confirm this action.", details: [] };
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
        if (player.completedTrades === 0 && !(game.uiMode !== "strategy" && game.generation === 1))
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
function StartScreen({ onNew, onLoad, onRecover, hasRecovery, onRules, onSimulation }) {
    return h("main", { className: "start-screen" }, h("div", { className: "sun-mark" }, h("span", null, "☀")), h("p", { className: "eyebrow" }, "Educational strategy prototype"), h("h1", null, "SUNPATHS"), h("p", { className: "lead" }, "Build a pathway from natural opportunity to reliable Light across eight Generations."), h("div", { className: "start-actions" }, button("New Game", onNew, { kind: "primary large" }), hasRecovery ? button("Recover last game", onRecover, { kind: "secondary large" }) : null, h("label", { className: "button large file-button" }, "Load Game", h("input", { type: "file", accept: ".json,application/json", onChange: onLoad })), button("Simulation Lab", onSimulation, { kind: "secondary large" }), button("Rules and Data", onRules, { kind: "ghost large" })), h("div", { className: "chain-preview" }, ...["Capture", "Store", "Transform", "Transport", "Light"].flatMap((stage, i) => [h("span", { key: stage }, stage), i < 4 ? h("b", { key: `${stage}-arrow` }, "→") : null].filter(Boolean))));
}
function SetupScreen({ config, participants, setParticipants, seed, setSeed, debugMode, setDebugMode, playMode, setPlayMode, onNewSeed, onStart, onBack }) {
    const included = participants.filter(p => p.included);
    const update = (index, patch) => setParticipants(items => items.map((p, i) => i === index ? { ...p, ...patch } : p));
    return h("main", { className: "page" }, h("header", { className: "page-header" }, h("div", null, h("p", { className: "eyebrow" }, "Game setup"), h("h1", null, "Choose the continental factions")), button("Back", onBack, { kind: "ghost" })), h("div", { className: "setup-grid" }, ...participants.map((entry, index) => {
        const continent = config.continents.find(c => c.id === entry.continentId);
        return h("article", { key: entry.continentId, className: `setup-card ${entry.included ? "selected" : ""}` }, h("div", { className: "continent-heading" }, h("span", { className: "continent-icon" }, continentIcons[continent.id]), h("div", null, h("h3", null, continent.name), h("small", null, `Knowledge ${continent.startingKnowledge}${continent.legacyFuelBonus ? " · Legacy fuel +1 in G1" : ""}`))), h("label", { className: "toggle-row" }, h("input", { type: "checkbox", checked: entry.included, onChange: e => update(index, { included: e.target.checked }) }), "Active faction"), h("label", null, "Controller", h("select", { value: entry.controller, disabled: !entry.included, onChange: e => update(index, { controller: e.target.value }) }, h("option", { value: "human" }, "Human"), h("option", { value: "ai" }, "AI"))), h("label", null, "Name", h("input", { value: entry.name, disabled: !entry.included, onChange: e => update(index, { name: e.target.value }) })), entry.controller === "ai" ? h(React.Fragment, null, h("label", null, "AI strategy", h("select", { value: entry.strategy, disabled: !entry.included, onChange: e => update(index, { strategy: e.target.value }) }, ...strategies.map(id => h("option", { key: id, value: id }, strategyLabels[id])))), h("label", null, "AI difficulty", h("select", { value: entry.difficulty, disabled: !entry.included, onChange: e => update(index, { difficulty: e.target.value }) }, h("option", { value: "basic" }, "Basic"), h("option", { value: "standard" }, "Standard"), h("option", { value: "advanced" }, "Advanced")))) : null, h("div", { className: "opportunity-list" }, ...Object.entries(continent.opportunities).map(([path, value]) => h("div", { key: path }, h("span", null, pathwayLabels[path]), meter(value)))));
    })), panel("Session", h("div", null, h("div", { className: "mode-picker" }, h("button", { type: "button", className: `mode-card ${playMode === "guided" ? "selected" : ""}`, onClick: () => setPlayMode("guided") }, h("strong", null, "Guided game"), h("span", null, "Recommended for first play and younger players"), h("small", null, "One decision at a time · locked actions explained · automatic Energy plan")), h("button", { type: "button", className: `mode-card ${playMode === "strategy" ? "selected" : ""}`, onClick: () => setPlayMode("strategy") }, h("strong", null, "Full strategy"), h("span", null, "More information and all legal options"), h("small", null, "Still prevents illegal actions and asks for confirmation"))), h("div", { className: "form-row" }, h("label", null, "Random seed", h("input", { value: seed, onChange: e => setSeed(e.target.value), placeholder: "Generated automatically" })), button("Generate new seed", onNewSeed, { kind: "secondary" }), stat("Active players", included.length), stat("Human players", included.filter(p => p.controller === "human").length), h("label", { className: "toggle-row" }, h("input", { type: "checkbox", checked: debugMode, onChange: e => setDebugMode(e.target.checked) }), "Show AI decision debugging"), button("Create Game", onStart, { kind: "primary", disabled: included.length < 1 || included.length > 6 })), h("p", { className: "seed-note" }, "A new seed is generated each time you open New Game. Reusing the same seed intentionally reproduces the same weather, Local Condition deck, market and AI tie-breaks."))));
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
function WeatherCard({ label, face, forecast = false, onInfo }) {
    const icon = face === "brightSun" ? "☀" : face === "rain" ? "☂" : face === "strongWind" ? "≋" : face === "storm" ? "ϟ" : "☁";
    const tag = onInfo ? "button" : "div";
    return h(tag, { type: onInfo ? "button" : undefined, className: `weather-card ${forecast ? "forecast" : ""} ${onInfo ? "explainable" : ""}`, onClick: onInfo }, h("small", null, label), h("span", null, icon), h("strong", null, face ? weatherLabels[face] : "—"), onInfo ? h("i", { className: "micro-help" }, "?") : null);
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
function ContinentMarker({ game, player, selected, active, onSelect, position }) {
    const continent = game.config.continents.find(c => c.id === player.continentId);
    const condition = conditionDefinition(game, player);
    return h("button", {
        type: "button",
        className: `map-marker ${selected ? "selected" : ""} ${active ? "active-turn" : ""}`,
        style: { left: position.left, top: position.top },
        onClick: () => onSelect(player.id),
        "aria-label": `${continent.name}, ${player.name}, ${player.cumulative.totalLight} Light`
    }, h("span", { className: "marker-dot" }, continentIcons[continent.id]), h("span", { className: "marker-copy" }, h("strong", null, continent.name), h("small", null, `${player.name} · ${player.cumulative.totalLight} Light`)), condition ? h("span", { className: "marker-condition", title: condition.name }, "!") : null);
}
function WorldArea({ game, selectedId, setSelectedId }) {
    const positions = {
        northAmerica: { left: "19%", top: "30%" },
        southAmerica: { left: "32%", top: "66%" },
        europe: { left: "51%", top: "27%" },
        africa: { left: "53%", top: "53%" },
        asia: { left: "72%", top: "34%" },
        australia: { left: "84%", top: "72%" }
    };
    const activeId = currentPlayerId(game);
    return panel("World board", h("div", { className: "world-map", role: "group", "aria-label": "Six-continent game map" }, h("svg", { className: "world-silhouette", viewBox: "0 0 1000 500", role: "img", "aria-label": "Stylised world map" }, h("path", { d: "M70 110 C130 55 230 55 310 105 L280 170 220 190 180 245 110 215 55 160 Z" }), h("path", { d: "M245 245 C305 230 350 260 365 320 L340 430 292 470 265 385 220 320 Z" }), h("path", { d: "M420 115 C500 70 650 75 760 110 L885 170 830 235 720 220 650 185 590 210 500 180 430 195 390 155 Z" }), h("path", { d: "M460 205 C535 185 610 220 620 300 L570 405 505 380 455 300 425 235 Z" }), h("path", { d: "M760 310 C820 280 900 305 940 365 L900 430 815 420 755 370 Z" })), ...currentOrder(game).map(id => h(ContinentMarker, { key: id, game, player: game.players[id], selected: id === selectedId, active: id === activeId, onSelect: setSelectedId, position: positions[game.players[id].continentId] }))));
}
function Warehouse({ game, player, onInfo }) {
    return h("div", { className: "warehouse-grid" }, ...resourceKeys.map(key => {
        const account = player.resources[key];
        return h("button", { type: "button", key, className: "resource-cell", onClick: () => onInfo(resourceExplanation(game, player, key)) }, h("span", null, resourceLabels[key], h("i", { className: "micro-help" }, "?")), h("strong", null, account.warehouse), h("small", null, `${account.currentContinent} in continent · printed ${account.printedStarting}`));
    }));
}
function TechnologyList({ game, player, onInfo }) {
    return h("div", { className: "technology-list" }, ...player.installed.map(instance => {
        const tech = getTechnology(game, instance.technologyId);
        const stored = totalEnergy(instance.storageInput);
        return h("article", { key: instance.instanceId, className: "technology-card" }, h("div", null, h("strong", null, tech.name), h("small", null, `${titleCase(tech.stage)} · ${tech.pathway === "shared" ? "Shared" : pathwayLabels[tech.pathway]}`)), h("div", { className: "technology-meta" }, tech.storage ? badge(`${stored}/${tech.storage.capacity} stored`, "energy") : badge(`Capacity ${tech.capacity}`), infoButton(() => onInfo(technologyExplanation(tech)), `Explain ${tech.name}`)));
    }));
}
function EnergyChain({ player, onInfo }) {
    const gross = Object.values(player.currentMetrics.grossEnergy).reduce((a, b) => a + b, 0);
    const stored = player.currentMetrics.storedEnd;
    const transformed = player.currentMetrics.grossEnergy.biomass + player.currentMetrics.grossEnergy.fossil + player.currentMetrics.grossEnergy.hydro;
    const transported = Math.min(4, Math.max(player.currentMetrics.deliveredLight, player.currentMetrics.deliveredLight + player.currentMetrics.systemLoss.lighting));
    const stages = [["Capture", gross], ["Store", stored], ["Transform", transformed], ["Transport", transported], ["Light", player.currentMetrics.deliveredLight]];
    return h("div", { className: "energy-chain" }, ...stages.flatMap(([label, value], index) => [h("button", { type: "button", key: label, className: "energy-stage explainable", onClick: () => onInfo({ eyebrow: "Energy chain", title: label, summary: stageDescriptions[label], details: [`Current displayed amount: ${value}.`, "These stage displays explain the most recently resolved Generation; planning values appear in Dispatch."] }) }, h("strong", null, label), energyCubes(value), h("small", null, value), h("i", { className: "micro-help" }, "?")), index < stages.length - 1 ? h("span", { key: `${label}-arrow`, className: "chain-arrow" }, "→") : null].filter(Boolean)));
}
function LightTrack({ game, player, onInfo }) {
    return h("div", { className: "light-track" }, ...Array.from({ length: 8 }, (_, i) => {
        const generation = i + 1;
        const value = player.lightByGeneration[generation];
        const target = game.config.demand.reliabilityTargets[generation];
        return h("button", { type: "button", key: generation, className: `light-window ${value >= target ? "reliable" : ""}`, onClick: () => onInfo(scoringExplanation(game, generation, value, target)) }, h("small", null, `G${generation}`), h("strong", null, value ?? "·"), h("span", null, `target ${target}`));
    }));
}
function PlayerBoard({ game, player, onInfo }) {
    const condition = conditionDefinition(game, player);
    return h("div", { className: "player-board" }, h("div", { className: "board-heading" }, h("div", null, h("p", { className: "eyebrow" }, "Player board"), h("h2", null, player.name)), h("div", { className: "badge-stack" }, h("button", { type: "button", className: "badge explain-badge", onClick: () => onInfo({ eyebrow: "Permanent capability", title: `Knowledge ${player.knowledge}`, summary: "Knowledge unlocks technologies and is never spent when you build.", details: ["Research uses one Development action and permanently increases Knowledge by one, to a maximum of five.", "Technical Assistance and some cards can add temporary Knowledge for a construction."] }) }, `Knowledge ${player.knowledge}`, h("i", { className: "micro-help" }, "?")), condition ? h("button", { type: "button", className: "badge condition explain-badge", onClick: () => onInfo(localConditionExplanation(game, player, condition)) }, condition.name, h("i", { className: "micro-help" }, "?")) : null)), h(EnergyChain, { player, onInfo }), h("div", { className: "two-column" }, panel("Warehouse", h(Warehouse, { game, player, onInfo }), "nested"), panel("Installed technologies", h(TechnologyList, { game, player, onInfo }), "nested")), panel("Light and Reliability", h(LightTrack, { game, player, onInfo }), "nested"), h("div", { className: "score-row" }, stat("Total Light", player.cumulative.totalLight), stat("Reliable Generations", player.cumulative.reliableGenerations), stat("System Loss", totalLoss(player)), stat("Curtailment", player.cumulative.curtailment)));
}
function LockedReason({ reason }) {
    return h("div", { className: "locked-reason" }, h("span", null, "🔒"), h("small", null, reason));
}
function BuildShop({ game, player, guidedMode, onChoose, onInfo }) {
    const pathOptions = ["solar", "wind", "hydro", "biomass", "fossil", "system"];
    const weatherPath = game.weather.current === "brightSun" ? "solar" : game.weather.current === "strongWind" ? "wind" : game.weather.current === "rain" || game.weather.current === "storm" ? "hydro" : player.prepared.pathwayId || "solar";
    const [selectedPath, setSelectedPath] = useState(weatherPath);
    const available = game.config.technologies.filter(t => !t.starter && (t.alwaysAvailable || game.innovationMarket.visible.includes(t.id)));
    const filtered = available.filter(tech => selectedPath === "system" ? tech.pathway === "shared" : tech.pathway === selectedPath);
    const visible = guidedMode ? filtered.slice().sort((a, b) => Number(!buildLegality(game, player.id, a).legal) - Number(!buildLegality(game, player.id, b).legal)).slice(0, 6) : filtered;
    return h("div", { className: "guided-subpanel" }, h("div", { className: "pathway-tabs", role: "tablist", "aria-label": "Energy pathway" }, ...pathOptions.map(path => h("button", { key: path, type: "button", className: `pathway-tab ${selectedPath === path ? "selected" : ""}`, onClick: () => setSelectedPath(path) }, path === "system" ? "⚙ System" : `${path === "solar" ? "☀" : path === "wind" ? "≋" : path === "hydro" ? "💧" : path === "biomass" ? "🌿" : "⛽"} ${pathwayLabels[path]}`))), filtered.length === 0 ? h("p", { className: "empty-guidance" }, "No technology from this pathway is available in the market right now.") : null, h("div", { className: "clean-card-list" }, ...visible.map(tech => {
        const legality = buildLegality(game, player.id, tech);
        const effectiveCost = effectiveBuildCost(game, player, tech);
        const canAffordBuilding = player.resources.constructionMaterials.warehouse >= effectiveCost.constructionMaterials;
        const canAffordSpecial = player.resources.criticalMaterials.warehouse >= effectiveCost.criticalMaterials;
        return h("article", { key: tech.id, className: `clean-choice-card ${legality.legal ? "available" : "locked"}` }, h("div", { className: "clean-choice-main" }, h("div", { className: "choice-icon" }, tech.stage === "storage" ? "▣" : tech.stage === "transport" ? "⚡" : tech.stage === "research" ? "✦" : selectedPath === "solar" ? "☀" : selectedPath === "wind" ? "≋" : selectedPath === "hydro" ? "💧" : selectedPath === "biomass" ? "🌿" : selectedPath === "fossil" ? "⛽" : "⚙"), h("div", null, h("strong", null, tech.name), h("small", null, `${titleCase(tech.stage)} · Capacity ${tech.capacity}`))), h("div", { className: "cost-chips" }, badge(`${effectiveCost.constructionMaterials} Building`, canAffordBuilding ? "" : "warning"), badge(`${effectiveCost.criticalMaterials} Special`, canAffordSpecial ? "" : "warning"), badge(`Knowledge ${tech.knowledgeRequired}`)), legality.legal ? h("p", { className: "choice-benefit" }, tech.storage ? `Stores up to ${tech.storage.capacity} Energy.` : tech.fuel ? `Uses ${tech.fuel.units} ${resourceLabels[tech.fuel.resource]} to make up to ${tech.maximumOutput} Energy.` : `Can use up to ${tech.capacity} of this pathway's natural opportunity.`) : h(LockedReason, { reason: legality.reason }), h("div", { className: "choice-actions" }, infoButton(() => onInfo(technologyExplanation(tech)), `Explain ${tech.name}`), button(legality.legal ? "Choose" : "Locked", () => onChoose({ kind: "build", technologyId: tech.id }), { kind: legality.legal ? "primary compact" : "ghost compact", disabled: !legality.legal, title: legality.reason })));
    })));
}
function GatherPanel({ game, player, onChoose }) {
    const choices = [
        { action: { kind: "extract", resource: "constructionMaterials" }, icon: "▦", title: "Building Materials", note: "Used to construct almost every technology." },
        { action: { kind: "extract", resource: "criticalMaterials" }, icon: "◆", title: "Special Materials", note: "Used for Batteries and advanced technologies." },
        { action: { kind: "extract", resource: "fossilFuel" }, icon: "●", title: "Fossil Fuel", note: "Fuel for Fossil plants." },
        { action: { kind: "harvestBiomass" }, icon: "♣", title: "Biomass", note: "Renewable fuel for Biomass plants." }
    ];
    return h("div", { className: "clean-card-list" }, ...choices.map(choice => {
        const legality = developmentActionLegality(game, player.id, choice.action);
        const key = choice.action.kind === "harvestBiomass" ? "biomass" : choice.action.resource;
        const account = player.resources[key];
        return h("article", { key, className: `clean-choice-card ${legality.legal ? "available" : "locked"}` }, h("div", { className: "clean-choice-main" }, h("div", { className: "choice-icon" }, choice.icon), h("div", null, h("strong", null, choice.title), h("small", null, choice.note))), h("div", { className: "resource-preview" }, h("span", null, `Warehouse ${account.warehouse}/9`), h("span", null, `${account.currentContinent} left in your land`)), legality.legal ? h("p", { className: "choice-benefit" }, `After gathering: ${account.warehouse + 1} in your Warehouse.`) : h(LockedReason, { reason: legality.reason }), button(legality.legal ? "Gather 1" : "Unavailable", () => onChoose(choice.action), { kind: legality.legal ? "primary compact" : "ghost compact", disabled: !legality.legal, title: legality.reason }));
    }));
}
function ImportChoices({ game, player, onChoose }) {
    return h("div", { className: "clean-card-list" }, ...resourceKeys.map(receive => {
        const result = importLegality(game, player, receive);
        const paymentText = result.payment ? Object.entries(result.payment).filter(([, value]) => value).map(([key, value]) => `${value} ${resourceLabels[key]}`).join(" + ") : "";
        return h("article", { key: receive, className: `clean-choice-card ${result.legality.legal ? "available" : "locked"}` }, h("div", { className: "clean-choice-main" }, h("div", { className: "choice-icon" }, "⇄"), h("div", null, h("strong", null, `Import 1 ${resourceLabels[receive]}`), h("small", null, `Public supply · costs ${result.required} other resources`))), result.legality.legal ? h("p", { className: "choice-benefit" }, `Automatic payment: ${paymentText}.`) : h(LockedReason, { reason: result.legality.reason }), button(result.legality.legal ? "Choose import" : "Unavailable", () => onChoose({ kind: "publicImport", receive, payment: result.payment }), { kind: result.legality.legal ? "primary compact" : "ghost compact", disabled: !result.legality.legal, title: result.legality.reason }));
    }));
}
function TradePanel({ game, player, onTrade, message }) {
    const [recipientId, setRecipientId] = useState(Object.keys(game.players).find(id => id !== player.id) || "");
    const [offer, setOffer] = useState("constructionMaterials");
    const [request, setRequest] = useState("criticalMaterials");
    const recipients = Object.values(game.players).filter(p => p.id !== player.id);
    const ownOffer = player.resources[offer].warehouse;
    const recipient = game.players[recipientId];
    const recipientHas = recipient?.resources[request].warehouse ?? 0;
    const sameResource = offer === request;
    const canPropose = !sameResource && player.completedTrades < game.config.trade.directTradesPerGeneration && ownOffer >= 1 && recipientHas >= 1;
    const reason = sameResource ? "Choose two different resources." : player.completedTrades >= game.config.trade.directTradesPerGeneration ? "You already completed your direct trade this Generation." : ownOffer < 1 ? `You have no ${resourceLabels[offer]} to offer.` : recipientHas < 1 ? `${recipient?.name || "That player"} has no ${resourceLabels[request]} to give.` : "Available";
    return h("div", { className: "guided-subpanel trade-clean" }, h("p", null, "Direct trade does not use a Development action, but each player may complete only one per Generation."), h("div", { className: "trade-sentence" }, h("span", null, "Ask"), h("select", { value: recipientId, onChange: e => setRecipientId(e.target.value) }, ...recipients.map(p => h("option", { key: p.id, value: p.id }, p.name))), h("span", null, "to give"), h("select", { value: request, onChange: e => setRequest(e.target.value) }, ...resourceKeys.map(k => h("option", { key: k, value: k }, resourceLabels[k]))), h("span", null, "for your"), h("select", { value: offer, onChange: e => setOffer(e.target.value) }, ...resourceKeys.map(k => h("option", { key: k, value: k }, resourceLabels[k])))), canPropose ? h("p", { className: "choice-benefit" }, `You have ${ownOffer}; ${recipient?.name} has ${recipientHas}.`) : h(LockedReason, { reason }), button("Propose trade", () => onTrade(recipientId, offer, request), { kind: "secondary", disabled: !canPropose, title: reason }), message ? h("p", { className: "trade-message" }, message) : null);
}
function DevelopmentControls({ game, player, onAction, onUndo, onReset, onTrade, tradeMessage, onInfo }) {
    const guidedMode = game.uiMode !== "strategy";
    const [section, setSection] = useState(null);
    const [confirmation, setConfirmation] = useState(null);
    useEffect(() => setSection(null), [player.id, game.actionRound, game.generation]);
    const condition = conditionDefinition(game, player);
    const adaptable = condition && "adaptable" in condition.effect && condition.effect.adaptable && !player.localCondition.adapted;
    const researchStatus = developmentActionLegality(game, player.id, { kind: "research" });
    const adaptStatus = adaptable ? developmentActionLegality(game, player.id, { kind: "adapt" }) : null;
    const recommendation = useMemo(() => {
        try {
            return chooseDevelopmentDecision(game, player);
        }
        catch {
            return null;
        }
    }, [game, player.id]);
    const target = game.config.demand.reliabilityTargets[game.generation];
    const choose = action => {
        const legality = developmentActionLegality(game, player.id, action);
        if (!legality.legal)
            return;
        setConfirmation({ action, ...actionConfirmation(game, player, action) });
    };
    const confirm = () => {
        if (!confirmation)
            return;
        const success = onAction(confirmation.action);
        if (success !== false) {
            setConfirmation(null);
            setSection(null);
        }
    };
    const actionCards = [
        { id: "gather", icon: "▦", title: "Gather", text: "Move one resource into your Warehouse.", enabled: true },
        { id: "build", icon: "⚙", title: "Build", text: "Add a technology to your energy pathway.", enabled: true },
        { id: "learn", icon: "✦", title: "Learn", text: "Increase permanent Knowledge by one.", enabled: researchStatus.legal, reason: researchStatus.reason },
        { id: "trade", icon: "⇄", title: "Trade or Import", text: guidedMode && game.generation === 1 ? "Introduced from Generation 2 in Guided mode." : "Exchange Warehouse resources.", enabled: !(guidedMode && game.generation === 1), reason: "Trade unlocks in Generation 2 in Guided mode." }
    ];
    return h("div", { className: "action-panel clean-action-panel" }, h("div", { className: "turn-banner" }, h("div", null, h("p", { className: "eyebrow" }, `Generation ${game.generation} · Action round ${game.actionRound}`), h("h2", null, `${player.name}, choose one action`)), h("div", { className: "action-pips", "aria-label": `${player.actionsRemaining} actions remaining` }, ...Array.from({ length: game.config.rules.actionsPerGeneration }, (_, index) => h("i", { key: index, className: index < player.actionsRemaining ? "ready" : "spent" })), h("strong", null, `${player.actionsRemaining} left`))), h("div", { className: "turn-coach" }, h("div", null, h("span", null, "Your goal this Generation"), h("strong", null, `Deliver ${target} Light`)), recommendation ? h("p", null, h("b", null, "Suggested next step: "), friendlyActionName(recommendation.action, game), ".") : null), adaptable && !section ? h("button", { type: "button", className: "adapt-alert", onClick: () => choose({ kind: "adapt" }), disabled: !adaptStatus?.legal }, h("strong", null, `Respond to ${condition.name}`), h("span", null, "Spend one action to cancel its penalty.")) : null, !section ? h("div", { className: "big-action-grid" }, ...actionCards.map(card => h("button", { key: card.id, type: "button", className: `big-action-card ${card.enabled ? "" : "locked"}`, disabled: !card.enabled, title: card.reason, onClick: () => card.id === "learn" ? choose({ kind: "research" }) : setSection(card.id) }, h("span", { className: "big-action-icon" }, card.icon), h("strong", null, card.title), h("small", null, card.text), !card.enabled ? h("em", null, card.reason) : null))) : null, section ? h("div", { className: "section-step" }, h("div", { className: "section-step-heading" }, button("← Actions", () => setSection(null), { kind: "ghost" }), h("h3", null, section === "gather" ? "Choose a resource" : section === "build" ? "Choose a pathway and technology" : "Choose how to trade")), section === "gather" ? h(GatherPanel, { game, player, onChoose: choose }) : null, section === "build" ? h(BuildShop, { game, player, guidedMode, onChoose: choose, onInfo }) : null, section === "trade" ? h("div", { className: "trade-sections" }, h("h4", null, "Public import — uses 1 action"), h(ImportChoices, { game, player, onChoose: choose }), h("h4", null, "Direct trade — does not use an action"), h(TradePanel, { game, player, onTrade, message: tradeMessage })) : null) : null, h("div", { className: "safe-controls" }, button("Pass", () => choose({ kind: "pass" }), { kind: "ghost" }), button("Undo last confirmed action", onUndo, { kind: "ghost", disabled: game.undo.stack.length === 0 }), button("Reset Generation", onReset, { kind: "ghost", disabled: !game.undo.generationStart })), confirmation ? h(ConfirmationModal, { confirmation, onConfirm: confirm, onCancel: () => setConfirmation(null) }) : null);
}
function DispatchPanel({ game, player, onDispatch, onInfo }) {
    const recommended = useMemo(() => chooseDispatchPlan(game, player), [game, player.id]);
    const preview = useMemo(() => previewDispatch(game, player.id, recommended), [game, player.id]);
    const condition = conditionDefinition(game, player);
    const pathwayRows = Object.entries(recommended.transportByPathway).filter(([, value]) => value > 0);
    const fuelRows = Object.entries(recommended.fuelPlantOutput).filter(([, value]) => value > 0).map(([id, value]) => ({ tech: getTechnology(game, player.installed.find(item => item.instanceId === id).technologyId), value }));
    return h("div", { className: "action-panel dispatch-clean" }, h("div", { className: "turn-banner" }, h("div", null, h("p", { className: "eyebrow" }, "Use your Energy"), h("h2", null, `${player.name}'s Energy plan`)), badge(weatherLabels[game.weather.current], "weather")), h("p", { className: "dispatch-intro" }, "The game has prepared the strongest legal plan it can find. You only need to review what happens, then confirm it."), condition ? h("button", { type: "button", className: "dispatch-condition-note", onClick: () => onInfo(localConditionExplanation(game, player, condition)) }, h("strong", null, condition.name), h("span", null, "Click to see how it changes this plan.")) : null, h("div", { className: "visual-flow" }, h("div", { className: "flow-node" }, h("span", null, "1"), h("strong", null, "Energy made"), h("b", null, preview.grossEnergy), h("small", null, fuelRows.length ? `${fuelRows.map(row => `${row.tech.name}: ${row.value}`).join(" · ")}` : "From weather and installed technologies")), h("div", { className: "flow-arrow" }, "→"), h("div", { className: "flow-node" }, h("span", null, "2"), h("strong", null, "Sent through Grid"), h("b", null, preview.transported), h("small", null, pathwayRows.length ? pathwayRows.map(([path, value]) => `${value} ${pathwayLabels[path]}`).join(" · ") : "No Energy available to transport")), h("div", { className: "flow-arrow" }, "→"), h("div", { className: `flow-node light-result ${preview.reliable ? "reliable" : ""}` }, h("span", null, "3"), h("strong", null, "Light delivered"), h("b", null, preview.light), h("small", null, preview.reliable ? `Target ${preview.target} met!` : `Target is ${preview.target}`))), h("div", { className: "dispatch-metrics" }, stat("Stored after", preview.stored), stat("Energy lost", preview.systemLoss), stat("Unused Energy", preview.curtailed)), preview.legal ? button(`Confirm plan · deliver ${preview.light} Light`, () => onDispatch(recommended), { kind: "primary large full" }) : h("div", { className: "notice error" }, `The recommended plan is not legal: ${preview.reason}`), h("details", { className: "dispatch-details" }, h("summary", null, "See the plan details"), h("ul", null, h("li", null, `Hydro released: ${recommended.hydroOutputRequested}.`), h("li", null, `Battery Energy discharged: ${Object.values(recommended.batteryDischargeInput).reduce((a, b) => a + b, 0)}.`), h("li", null, `Energy sent to storage: ${Object.values(recommended.batteryCharge).reduce((sum, allocation) => sum + Object.values(allocation).reduce((a, b) => a + b, 0), 0)}.`), h("li", null, "You can use Debug Mode later for technical dispatch testing; normal play never requires JSON."))));
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
function GameHeader({ game, selectedPlayer, onInfo, onHome, onRules, onSave, onLoad }) {
    return h("header", { className: "game-header" }, h("button", { type: "button", className: "brand", onClick: onHome }, h("span", null, "☀"), "SUNPATHS"), h("div", { className: "generation-strip" }, h("strong", null, game.generation ? `Generation ${game.generation}/8` : "Pregame"), badge(phaseLabel(game.phase))), h("div", { className: "header-weather" }, h(WeatherCard, { label: "Current", face: game.weather.current, onInfo: () => onInfo(weatherExplanation(game, selectedPlayer, game.weather.current, "Current Condition")) }), h(WeatherCard, { label: "Forecast", face: game.weather.forecast, forecast: true, onInfo: () => onInfo(weatherExplanation(game, selectedPlayer, game.weather.forecast, "Next Forecast")) })), h("div", { className: "header-actions" }, button("Rules", onRules, { kind: "ghost" }), button("Save", onSave, { kind: "ghost" }), h("label", { className: "button ghost file-button" }, "Load", h("input", { type: "file", accept: ".json,application/json", onChange: onLoad }))));
}
function GameScreen({ game, setGame, onHome, onRules, onLoad }) {
    const firstHumanId = Object.values(game.players).find(player => player.controller.kind === "human")?.id || Object.keys(game.players)[0];
    const [selectedId, setSelectedId] = useState(firstHumanId);
    const [notice, setNotice] = useState("");
    const [tradeMessage, setTradeMessage] = useState("");
    const [info, setInfo] = useState(null);
    const [conditionQueue, setConditionQueue] = useState([]);
    const [lastConditionGeneration, setLastConditionGeneration] = useState(0);
    useEffect(() => { if (!game.players[selectedId])
        setSelectedId(firstHumanId); }, [game, selectedId, firstHumanId]);
    useEffect(() => {
        const active = currentPlayer(game);
        if (active?.controller.kind === "human")
            setSelectedId(active.id);
    }, [game.phase, game.activeTurnIndex, game.actionRound]);
    useEffect(() => {
        if (game.phase === "generation.development" && game.generation > lastConditionGeneration) {
            const humanIds = currentOrder(game).filter(id => game.players[id].controller.kind === "human" && game.players[id].localCondition);
            if (humanIds.length)
                setConditionQueue(humanIds);
            setLastConditionGeneration(game.generation);
        }
    }, [game.phase, game.generation, lastConditionGeneration]);
    const selected = game.players[selectedId] || Object.values(game.players)[0];
    const guidedMode = game.uiMode !== "strategy";
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
    const act = action => { const player = currentPlayer(game); return command({ type: "developmentAction", playerId: player.id, action }); };
    const dispatch = plan => { const player = currentPlayer(game); return command({ type: "dispatch", playerId: player.id, plan }); };
    const selectPrepared = (playerId, pathwayId, capabilityId) => command({ type: "selectPrepared", playerId, pathwayId, capabilityId });
    const save = () => download(`sunpaths-${game.seed}-g${game.generation}.json`, serializeGame(game));
    const trade = (recipientId, offer, request) => {
        const actor = currentPlayer(game);
        const recipient = game.players[recipientId];
        if (!actor || !recipient)
            return false;
        const recipientNeed = recipient.resources[offer].warehouse <= 2 ? 2 : recipient.resources[offer].warehouse <= 4 ? 1 : 0;
        const recipientCost = recipient.resources[request].warehouse <= 1 ? 2 : recipient.resources[request].warehouse <= 3 ? 1 : 0;
        if (recipient.controller.kind === "ai" && recipientNeed < recipientCost) {
            setTradeMessage(`${recipient.name} declined because ${resourceLabels[request]} is more valuable to them right now.`);
            return false;
        }
        const accepted = mutate(next => executeDirectTrade(next, actor.id, recipientId, { [offer]: 1 }, { [request]: 1 }), false);
        if (accepted)
            setTradeMessage(`${recipient.name} accepted. No Development action was used.`);
        return accepted;
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
        decision = panel("A new Generation begins", h("div", { className: "generation-start-card" }, h("p", null, `Today: ${weatherLabels[game.weather.current]}. Next forecast: ${game.weather.forecast ? weatherLabels[game.weather.forecast] : "none"}.`), h("strong", null, `Your Light target is ${game.config.demand.reliabilityTargets[game.generation || 1]}.`), button("Start Generation", () => command({ type: "beginGeneration" }), { kind: "primary large" })));
    else if (game.phase === "generation.localConditions")
        decision = panel("Reveal Local Conditions", h("div", { className: "generation-start-card" }, h("p", null, "Each continent receives one temporary condition. The game will pause and explain yours before your first action."), button("Reveal cards", () => command({ type: "drawLocalConditions" }), { kind: "primary large" })));
    else if (game.phase === "generation.development") {
        const active = currentPlayer(game);
        decision = active?.controller.kind === "human" ? h(DevelopmentControls, { game, player: active, onAction: act, onUndo: () => command({ type: "undo" }), onReset: () => command({ type: "resetGeneration" }), onTrade: trade, tradeMessage, onInfo: setInfo }) : panel("Computer players are thinking", h("p", null, "Their legal actions are being resolved. Your turn will appear automatically."));
    }
    else if (game.phase === "generation.dispatch") {
        const active = currentPlayer(game);
        decision = active?.controller.kind === "human" ? h(DispatchPanel, { game, player: active, onDispatch: dispatch, onInfo: setInfo }) : panel("Computer players are using their Energy", h("p", null, "Your Energy plan will appear when they finish."));
    }
    else if (game.phase === "generation.review")
        decision = h(ReviewScreen, { game, onContinue: continueReview });
    else if (game.phase === "game.complete")
        decision = h(ResultsScreen, { game, onRestart: onHome });
    const market = panel("Advanced technology market", h("div", { className: "market-list" }, ...game.innovationMarket.visible.map(id => {
        const tech = getTechnology(game, id);
        return h("button", { type: "button", key: id, className: "market-mini-card", onClick: () => setInfo(technologyExplanation(tech)) }, h("strong", null, tech.name), h("small", null, `${tech.cost.constructionMaterials} Building · ${tech.cost.criticalMaterials} Special · Knowledge ${tech.knowledgeRequired}`));
    })), "nested");
    const events = panel("Recent events", h("div", { className: "event-log" }, ...game.log.slice(-8).reverse().map(event => h("p", { key: event.sequence }, h("small", null, `#${event.sequence}`), event.message))), "nested");
    const body = game.phase === "game.complete"
        ? decision
        : h("main", { className: `game-main phase6 ${guidedMode ? "guided" : "strategy"}` }, h("div", { className: "game-left" }, h(WorldArea, { game, selectedId, setSelectedId }), guidedMode ? h("details", { className: "board-details" }, h("summary", null, `View ${selected.name}'s full player board`), h(PlayerBoard, { game, player: selected, onInfo: setInfo })) : h(PlayerBoard, { game, player: selected, onInfo: setInfo })), h("aside", { className: "game-right" }, decision, guidedMode ? h("details", { className: "more-game-info" }, h("summary", null, "More game information"), market, events) : h(React.Fragment, null, market, game.debugMode ? h(AiDebugPanel, { game }) : null, events)));
    const revealPlayer = conditionQueue.length ? game.players[conditionQueue[0]] : null;
    return h("div", { className: "game-shell phase6-shell" }, h(GameHeader, { game, selectedPlayer: selected, onInfo: setInfo, onHome, onRules, onSave: save, onLoad }), notice ? h("div", { className: "notice error" }, h("strong", null, "That action was not taken."), h("span", null, notice), button("Dismiss", () => setNotice(""), { kind: "ghost" })) : null, body, revealPlayer ? h(ConditionReveal, { game, player: revealPlayer, onInfo: setInfo, onContinue: () => setConditionQueue(queue => queue.slice(1)) }) : null, info ? h(InfoModal, { info, onClose: () => setInfo(null) }) : null);
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
    return h("main", { className: "page simulation-page" }, h("header", { className: "page-header" }, h("div", null, h("p", { className: "eyebrow" }, "Phase 2 audit"), h("h1", null, "Simulation Lab"), h("p", { className: "lead compact" }, "Run the same rules engine without a UI and separate continent effects from AI strategy effects.")), button("Back", onBack, { kind: "ghost" })), h("div", { className: "simulation-layout" }, h("section", { className: "panel simulation-controls" }, h("div", { className: "panel-title" }, "Batch controls"), h("div", { className: "control-grid" }, h("label", null, "Games", h("select", { value: scenario.games, onChange: e => update({ games: Number(e.target.value) }) }, ...[100, 1000, 10000].map(value => h("option", { key: value, value }, value.toLocaleString())))), h("label", null, "Base seed", h("input", { value: scenario.baseSeed, onChange: e => update({ baseSeed: e.target.value }) })), h("label", null, "Assignment", h("select", { value: scenario.assignmentMode, onChange: e => update({ assignmentMode: e.target.value }) }, h("option", { value: "rotateStrategies" }, "Rotate strategies fairly"), h("option", { value: "fixed" }, "Fixed pairings"))), h("label", null, "Seat assignment", h("select", { value: scenario.seatAssignmentMode, onChange: e => update({ seatAssignmentMode: e.target.value }) }, h("option", { value: "rotate" }, "Rotate seats fairly"), h("option", { value: "fixed" }, "Fixed player seats"))), h("label", null, "AI difficulty", h("select", { value: scenario.aiDifficulty, onChange: e => update({ aiDifficulty: e.target.value }) }, h("option", { value: "basic" }, "Basic"), h("option", { value: "standard" }, "Standard"), h("option", { value: "advanced" }, "Advanced"))), h("label", null, "Trade", h("select", { value: scenario.tradeMode, onChange: e => update({ tradeMode: e.target.value }) }, h("option", { value: "directAndImport" }, "Direct + public import"), h("option", { value: "publicImportOnly" }, "Public import only"), h("option", { value: "disabled" }, "Disabled"))), h("label", null, "Technology data", h("select", { value: scenario.technologyDataSetId, onChange: e => update({ technologyDataSetId: e.target.value }) }, ...technologyDataSets.map(item => h("option", { key: item.id, value: item.id }, item.label)))), h("label", null, "Weather distribution", h("select", { value: scenario.weatherPresetId, onChange: e => update({ weatherPresetId: e.target.value }) }, ...["default", "sunny", "windy", "wet", "balanced"].map(id => h("option", { key: id, value: id }, titleCase(id))))), h("label", null, "Local Condition severity", h("input", { type: "number", min: 0, max: 2, step: 0.25, value: scenario.localConditionSeverity, onChange: e => update({ localConditionSeverity: Number(e.target.value) }) })), h("label", null, "Starting-resource multiplier", h("input", { type: "number", min: 0.5, max: 2, step: 0.1, value: scenario.startingResourceMultiplier, onChange: e => update({ startingResourceMultiplier: Number(e.target.value) }) })), h("label", null, "Actions per Generation", h("input", { type: "number", min: 1, max: 4, step: 1, value: scenario.actionsPerGeneration, onChange: e => update({ actionsPerGeneration: Number(e.target.value) }) })), h("label", null, "AI trade utility threshold", h("input", { type: "number", min: 0, max: 5, step: 0.05, value: scenario.aiTradeUtilityThreshold, onChange: e => update({ aiTradeUtilityThreshold: Number(e.target.value) }) })), h("label", null, "AI direct-trade cadence", h("input", { type: "number", min: 1, max: 8, step: 1, value: scenario.aiDirectTradeCadence, onChange: e => update({ aiDirectTradeCadence: Number(e.target.value) }) })), h("label", { className: "checkbox" }, h("input", { type: "checkbox", checked: scenario.randomizeInitialFirstPlayer, onChange: e => update({ randomizeInitialFirstPlayer: e.target.checked }) }), " Randomise initial first player")), h("div", { className: "toggle-grid" }, h("label", { className: "toggle-row" }, h("input", { type: "checkbox", checked: scenario.buildAndOperateSameGeneration, onChange: e => update({ buildAndOperateSameGeneration: e.target.checked }) }), "Build and operate in same Generation"), ...["thermal", "battery", "lighting"].map(key => h("label", { key, className: "toggle-row" }, h("input", { type: "checkbox", checked: scenario.lossRules[key], onChange: e => update({ lossRules: { ...scenario.lossRules, [key]: e.target.checked } }) }), `Count ${titleCase(key)} loss`))), h("h3", null, "Starting strategy assignments"), h("div", { className: "assignment-grid" }, ...scenario.assignments.map((assignment, index) => {
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
class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error) { return { error }; }
    componentDidCatch(error, info) { console.error("SUNPATHS browser error", error, info); }
    render() {
        if (!this.state.error)
            return this.props.children;
        return h("main", { className: "crash-screen" }, h("p", { className: "eyebrow" }, "The interface hit an unexpected state"), h("h1", null, "SUNPATHS did not go blank"), h("p", null, "The error is shown here so it can be reported and repaired. Reloading returns to the start screen, where Recover last game restores the latest valid autosave when browser storage is available."), h("pre", null, String(this.state.error?.stack || this.state.error?.message || this.state.error)), h("div", { className: "form-row" }, button("Reload game", () => window.location.reload(), { kind: "primary" })));
    }
}
function App() {
    const [screen, setScreen] = useState("start");
    const [config, setConfig] = useState(() => clone(defaultConfig));
    const [participants, setParticipants] = useState(() => makeParticipants(defaultConfig));
    const [seed, setSeed] = useState(() => newRandomSeed());
    const [game, setGame] = useState(null);
    const [debugMode, setDebugMode] = useState(false);
    const [playMode, setPlayMode] = useState("guided");
    const [fatal, setFatal] = useState("");
    const recoveryKey = "sunpaths-phase2-recovery";
    const [hasRecovery, setHasRecovery] = useState(() => {
        try { return Boolean(globalThis.localStorage?.getItem(recoveryKey)); }
        catch { return false; }
    });
    useEffect(() => {
        if (!game)
            return;
        try {
            globalThis.localStorage?.setItem(recoveryKey, serializeGame(game));
            setHasRecovery(true);
        }
        catch { /* Browser storage is optional; manual save still works. */ }
    }, [game]);
    const recoverGame = () => {
        try {
            const raw = globalThis.localStorage?.getItem(recoveryKey);
            if (!raw)
                throw new Error("No recoverable game was found.");
            const state = deserializeGame(raw);
            if (!state.uiMode)
                state.uiMode = "guided";
            setGame(state);
            setScreen("game");
            setFatal("");
        }
        catch (error) {
            try { globalThis.localStorage?.removeItem(recoveryKey); } catch {}
            setHasRecovery(false);
            setFatal(error.message);
        }
    };
    const startGame = () => {
        try {
            const active = participants.filter(p => p.included);
            const setups = active.map((entry, index) => ({ id: `p${index + 1}`, name: entry.name || config.continents.find(c => c.id === entry.continentId).name, continentId: entry.continentId, controller: entry.controller === "human" ? { kind: "human" } : { kind: "ai", strategy: entry.strategy, difficulty: entry.difficulty } }));
            const actualSeed = seed.trim() || newRandomSeed();
            setSeed(actualSeed);
            const state = createGame(config, setups, actualSeed, { debugMode });
            state.uiMode = playMode;
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
            if (!state.uiMode)
                state.uiMode = "guided";
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
    return h(React.Fragment, null, fatal ? h("div", { className: "fatal-banner" }, fatal, button("Dismiss", () => setFatal(""), { kind: "ghost" })) : null, screen === "start" ? h(StartScreen, { onNew: () => { setParticipants(makeParticipants(config)); setSeed(newRandomSeed()); setScreen("setup"); }, onLoad: loadFile, onRecover: recoverGame, hasRecovery, onRules: () => setScreen("rules"), onSimulation: () => setScreen("simulation") }) : null, screen === "setup" ? h(SetupScreen, { config, participants, setParticipants, seed, setSeed, debugMode, setDebugMode, playMode, setPlayMode, onNewSeed: () => setSeed(newRandomSeed()), onStart: startGame, onBack: () => setScreen("start") }) : null, screen === "simulation" ? h(SimulationLab, { config, onBack: () => setScreen("start") }) : null, screen === "rules" ? h(RulesScreen, { config, setConfig, onBack: () => setScreen(game ? "game" : "start") }) : null, screen === "game" && game ? h(GameScreen, { game, setGame, onHome: home, onRules: () => setScreen("rules"), onLoad: loadFile }) : null);
}
createRoot(document.getElementById("root")).render(h(AppErrorBoundary, null, h(App)));
//# sourceMappingURL=main.js.map