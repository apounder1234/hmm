// @ts-nocheck
import { uiShared } from "./uiShared.js";
const { React, useEffect, useMemo, useRef, useState, createRoot, defaultConfig, validateConfig, createGame, applyCommand, currentOrder, currentPlayerId, canCompleteFoundingProject, foundingProjectDefinition, describeCostModifiers, getAvailableContinentAbilityActions, getContinentProfile, getKnowledgeRequirement, getLightingLevel, getPathwayAffinity, getTransmissionLevel, invariantErrors, effectivePathwayOpportunity, getTechnology, pathways, totalEnergy, totalLoss, hasRelevantSystem, aiPrepared, chooseDevelopmentDecision, chooseDispatchPlan, pumpAi, deserializeGame, serializeGame, defaultSimulationScenario, technologyDataSets, aggregateReportToCsv, balanceFlagsToCsv, playerResultsToCsv, simulationReportToJson, buildLegality, conditionImpactPreview, developmentActionLegality, effectiveBuildCost, importLegality, previewDispatch, systemGuidance, systemSnapshot, technologyImpactPreview, h, continentIcons, weatherLabels, resourceLabels, pathwayLabels, capabilityLabels, affinityLabels, abilityDescriptions, penaltyDescriptions, strategyLabels, strategies, resourceKeys, resourceDescriptions, stageDescriptions, weatherDescriptions, newRandomSeed, localConditionExplanation, weatherExplanation, technologyExplanation, resourceExplanation, scoringExplanation, clone, number, titleCase, sumLoss, phaseLabel, currentPlayer, conditionDefinition, button, panel, infoButton, InfoModal, ConfirmationModal, ConditionReveal, friendlyActionName, learningCostPreview, actionConfirmation, stat, badge, meter, energyCubes, download, makeParticipants } = uiShared;
function StartScreen({ onNew, onLoad, onRecover, hasRecovery, onCards, onRules, onSimulation }) {
    return h("main", { className: "start-screen" }, h("div", { className: "sun-mark" }, h("span", null, "☀")), h("p", { className: "eyebrow" }, "Educational strategy prototype"), h("h1", null, "SUNPATHS"), h("p", { className: "lead" }, "Build a pathway from natural opportunity to reliable Light across eight Generations."), h("div", { className: "start-actions" }, button("New Game", onNew, { kind: "primary large" }), hasRecovery ? button("Recover last game", onRecover, { kind: "secondary large" }) : null, h("label", { className: "button large file-button" }, "Load Game", h("input", { type: "file", accept: ".json,application/json", onChange: onLoad })), button("Simulation Lab", onSimulation, { kind: "secondary large" }), button("Cards", onCards, { kind: "ghost large" }), button("Rules and Data", onRules, { kind: "ghost large" })), h("div", { className: "chain-preview" }, ...["Capture", "Store", "Transform", "Transport", "Light"].flatMap((stage, i) => [h("span", { key: stage }, stage), i < 4 ? h("b", { key: `${stage}-arrow` }, "→") : null].filter(Boolean))));
}
function SetupScreen({ config, participants, setParticipants, seed, setSeed, debugMode, setDebugMode, playMode, setPlayMode, openingMode, setOpeningMode, onNewSeed, onStart, onBack }) {
    const included = participants.filter(player => player.included);
    const update = (index, patch) => setParticipants(items => items.map((player, itemIndex) => itemIndex === index ? { ...player, ...patch } : player));
    const [profileInfo, setProfileInfo] = useState(null);
    const continentCards = participants.map((entry, index) => {
        const continent = config.continents.find(item => item.id === entry.continentId);
        const strong = Object.entries(continent.pathwayAffinity)
            .filter(([, value]) => value === "strong")
            .map(([path]) => pathwayLabels[path])
            .join(", ") || "None";
        const difficult = Object.entries(continent.pathwayAffinity)
            .filter(([, value]) => value === "difficult")
            .map(([path]) => pathwayLabels[path])
            .join(", ") || "None";
        const ability = abilityDescriptions[continent.abilityId];
        const penalty = continent.penaltyId ? penaltyDescriptions[continent.penaltyId] : null;
        return h("article", {
            key: entry.continentId,
            className: `setup-card continent-profile-card ${entry.included ? "selected" : ""}`
        }, h("div", { className: "continent-heading" }, h("span", { className: "continent-icon" }, continentIcons[continent.id]), h("div", null, h("h3", null, continent.name), h("small", null, `Knowledge ${continent.startingKnowledge} · Transmission ${continent.startingTransmissionLevel} · Lighting ${continent.startingLightingLevel} · Fuel system ${continent.startingFossilLevel ? `Level ${continent.startingFossilLevel}` : "none"}`))), h("div", { className: "starting-resource-row" }, ...resourceKeys.map(key => h("span", { key, title: resourceDescriptions[key] }, h("small", null, resourceLabels[key]), h("b", null, continent.startingWarehouse[key])))), h("div", { className: "profile-facts" }, h("button", {
            type: "button",
            className: "profile-explain",
            onClick: () => setProfileInfo({
                eyebrow: `${continent.name} readiness`,
                title: `Strong pathways: ${strong}`,
                summary: "Strong pathways use Knowledge thresholds 1, 2 and 4 for the three technology tiers.",
                details: ["This represents installed industrial experience and institutional readiness, not population intelligence."]
            })
        }, h("b", null, "Strong: "), strong, h("span", null, " ?")), h("button", {
            type: "button",
            className: "profile-explain",
            onClick: () => setProfileInfo({
                eyebrow: `${continent.name} readiness`,
                title: `Difficult pathways: ${difficult}`,
                summary: "Difficult pathways use Knowledge thresholds 2, 4 and 5 for the three technology tiers.",
                details: ["Difficult pathways require that player to invest more Learn actions before upgrading."]
            })
        }, h("b", null, "Difficult: "), difficult, h("span", null, " ?")), h("button", {
            type: "button",
            className: "profile-explain",
            onClick: () => setProfileInfo({ eyebrow: continent.name, title: ability.name, summary: ability.text, details: continent.strengths })
        }, h("b", null, "Ability: "), ability.name, h("span", null, " ?")), penalty
            ? h("button", {
                type: "button",
                className: "profile-explain",
                onClick: () => setProfileInfo({ eyebrow: continent.name, title: penalty.name, summary: penalty.text, details: continent.weaknesses })
            }, h("b", null, "Weakness: "), penalty.name, h("span", null, " ?"))
            : h("p", null, h("b", null, "Weakness: "), continent.weaknesses[0]), h("p", null, h("b", null, "Likely import: "), continent.tradeNeed)), h("label", { className: "toggle-row" }, h("input", { type: "checkbox", checked: entry.included, onChange: event => update(index, { included: event.target.checked }) }), "Active faction"), h("label", null, "Controller", h("select", { value: entry.controller, disabled: !entry.included, onChange: event => update(index, { controller: event.target.value }) }, h("option", { value: "human" }, "Human"), h("option", { value: "ai" }, "AI"))), h("label", null, "Name", h("input", { value: entry.name, disabled: !entry.included, onChange: event => update(index, { name: event.target.value }) })), entry.controller === "ai" ? h(React.Fragment, null, h("label", null, "AI strategy", h("select", { value: entry.strategy, disabled: !entry.included, onChange: event => update(index, { strategy: event.target.value }) }, ...strategies.map(id => h("option", { key: id, value: id }, strategyLabels[id])))), h("label", null, "AI difficulty", h("select", { value: entry.difficulty, disabled: !entry.included, onChange: event => update(index, { difficulty: event.target.value }) }, h("option", { value: "basic" }, "Basic"), h("option", { value: "standard" }, "Standard"), h("option", { value: "advanced" }, "Advanced")))) : null, h("div", { className: "opportunity-list" }, ...Object.entries(continent.opportunities).map(([path, value]) => h("div", { key: path }, h("span", null, pathwayLabels[path]), meter(value)))));
    });
    const sessionPanel = panel("Session", h("div", null, h("div", { className: "mode-picker" }, h("button", {
        type: "button",
        className: `mode-card ${playMode === "guided" ? "selected" : ""}`,
        onClick: () => setPlayMode("guided")
    }, h("strong", null, "Guided game"), h("span", null, "Recommended for first play and younger players"), h("small", null, "One decision at a time · locked actions explained · automatic Energy plan")), h("button", {
        type: "button",
        className: `mode-card ${playMode === "strategy" ? "selected" : ""}`,
        onClick: () => setPlayMode("strategy")
    }, h("strong", null, "Full strategy"), h("span", null, "More information and all legal options"), h("small", null, "Still prevents illegal actions and asks for confirmation"))), h("div", { className: "mode-picker" }, h("button", {
        type: "button",
        className: `mode-card ${openingMode === "startingPlan" ? "selected" : ""}`,
        onClick: () => setOpeningMode("startingPlan")
    }, h("strong", null, "Starting Plan"), h("span", null, "Reveal plans immediately"), h("small", null, "Simpler opening · no pre-game bargaining")), h("button", {
        type: "button",
        className: `mode-card ${openingMode === "energySummit" ? "selected" : ""}`,
        onClick: () => setOpeningMode("energySummit")
    }, h("strong", null, "Secret Energy Summit"), h("span", null, "Forecast first, then two trading sweeps"), h("small", null, "Six public resources · two trades maximum per player"))), h("div", { className: "form-row" }, h("label", null, "Random seed", h("input", { value: seed, onChange: event => setSeed(event.target.value), placeholder: "Generated automatically" })), button("Generate new seed", onNewSeed, { kind: "secondary" }), stat("Active players", included.length), stat("Human players", included.filter(player => player.controller === "human").length), h("label", { className: "toggle-row" }, h("input", { type: "checkbox", checked: debugMode, onChange: event => setDebugMode(event.target.checked) }), "Show AI decision debugging"), button("Create Game", onStart, { kind: "primary", disabled: included.length < 1 || included.length > 6 })), h("p", { className: "seed-note" }, "Reusing the same seed reproduces the forecast, weather, Local Condition deck, Summit AI choices and later tie-breaks.")));
    return h("main", { className: "page" }, h("header", { className: "page-header" }, h("div", null, h("p", { className: "eyebrow" }, "Game setup"), h("h1", null, "Choose the continental factions")), button("Back", onBack, { kind: "ghost" })), h("div", { className: "setup-grid asymmetric-setup" }, ...continentCards), sessionPanel, profileInfo ? h(InfoModal, { info: profileInfo, onClose: () => setProfileInfo(null) }) : null);
}
function PreparedSelection({ game, onSelect }) {
    const pending = Object.values(game.players).find(p => p.controller.kind === "human" && !p.prepared.pathwayId);
    if (!pending)
        return h("div", null, h("p", null, "All Prepared cards are selected."));
    return panel(`Prepared cards · ${pending.name}`, h("div", { className: "prepared-form" }, h("p", null, "Choose a secret Starting Pathway and Special Capability. In Summit mode, your plan stays hidden while everyone barters public resources."), h("div", { className: "choice-grid" }, ...pathways.map(id => h("article", { key: id, className: "choice-card" }, h("strong", null, pathwayLabels[id]), h("small", null, "Founding Project: install the Knowledge-1 technology before Generation 1 if you can pay its materials")))), h("p", { className: "muted" }, "Choose both cards in the confirmation panel."), h(PreparedCustomForm, { key: pending.id, player: pending, onSelect })));
}
function PreparedCustomForm({ player, onSelect }) {
    const [pathway, setPathway] = useState("solar");
    const [capability, setCapability] = useState("storage");
    return h("div", { className: "form-row" }, h("label", null, "Prepared Pathway", h("select", { value: pathway, onChange: e => setPathway(e.target.value) }, ...pathways.map(id => h("option", { key: id, value: id }, pathwayLabels[id])))), h("label", null, "Prepared Capability", h("select", { value: capability, onChange: e => setCapability(e.target.value) }, ...Object.keys(capabilityLabels).map(id => h("option", { key: id, value: id }, capabilityLabels[id])))), button("Lock secret plan", () => onSelect(player.id, pathway, capability), { kind: "primary" }));
}
function bundleText(bundle) {
    return resourceKeys.filter(key => (bundle?.[key] ?? 0) > 0).map(key => `${bundle[key]} ${resourceLabels[key]}`).join(" + ") || "nothing";
}
function SummitTradeForm({ game, player, command }) {
    const partners = Object.values(game.players).filter(other => other.id !== player.id && (other.summitTrades ?? 0) < (game.config.opening?.summitMaximumTradesPerPlayer ?? 2));
    const [recipientId, setRecipientId] = useState(partners[0]?.id ?? "");
    const [offerResource, setOfferResource] = useState(resourceKeys.find(key => player.resources[key].warehouse > 0) ?? "fossilFuel");
    const [offerQty, setOfferQty] = useState(1);
    const [requestResource, setRequestResource] = useState("constructionMaterials");
    const [requestQty, setRequestQty] = useState(1);
    return h("div", { className: "summit-form" }, h("p", { className: "secret-plan" }, h("b", null, "Your hidden plan: "), `${pathwayLabels[player.prepared.pathwayId]} + ${capabilityLabels[player.prepared.capabilityId]}`), h("div", { className: "form-row" }, h("label", null, "Trade with", h("select", { value: recipientId, onChange: e => setRecipientId(e.target.value) }, ...partners.map(other => h("option", { key: other.id, value: other.id }, `${other.name} (${2 - (other.summitTrades ?? 0)} trades left)`)))), h("label", null, "You offer", h("select", { value: offerResource, onChange: e => setOfferResource(e.target.value) }, ...resourceKeys.map(key => h("option", { key, value: key, disabled: player.resources[key].warehouse < 1 }, resourceLabels[key])))), h("label", null, "Amount", h("select", { value: offerQty, onChange: e => setOfferQty(Number(e.target.value)) }, h("option", { value: 1 }, "1"), h("option", { value: 2 }, "2"))), h("label", null, "You request", h("select", { value: requestResource, onChange: e => setRequestResource(e.target.value) }, ...resourceKeys.map(key => h("option", { key, value: key }, resourceLabels[key])))), h("label", null, "Amount", h("select", { value: requestQty, onChange: e => setRequestQty(Number(e.target.value)) }, h("option", { value: 1 }, "1"), h("option", { value: 2 }, "2")))), h("div", { className: "form-row" }, button("Make offer", () => command({ type: "proposeSummitTrade", proposerId: player.id, recipientId, proposerGives: { [offerResource]: offerQty }, recipientGives: { [requestResource]: requestQty } }), { kind: "primary", disabled: !recipientId || offerResource === requestResource || player.resources[offerResource].warehouse < offerQty }), button("Pass", () => command({ type: "passSummitTurn", playerId: player.id }), { kind: "ghost" })));
}
function EnergySummit({ game, command }) {
    const summit = game.opening.summit;
    const pending = summit.pendingOffer;
    const activeId = summit.order[summit.activeIndex];
    const active = game.players[activeId];
    const maxTrades = game.config.opening?.summitMaximumTradesPerPlayer ?? 2;
    if (pending) {
        const proposer = game.players[pending.proposerId], recipient = game.players[pending.recipientId];
        if (recipient.controller.kind === "human")
            return panel("Energy Summit offer", h("div", { className: "summit-offer" }, h("p", null, `Pass the device to ${recipient.name}.`), h("strong", null, `${proposer.name} offers ${bundleText(pending.proposerGives)}`), h("span", null, `for ${bundleText(pending.recipientGives)}`), h("div", { className: "form-row" }, button("Accept barter", () => command({ type: "respondSummitTrade", recipientId: recipient.id, accept: true }), { kind: "primary" }), button("Decline", () => command({ type: "respondSummitTrade", recipientId: recipient.id, accept: false }), { kind: "ghost" }))));
        return panel("Energy Summit offer", h("p", null, `${recipient.name} is considering ${proposer.name}'s offer.`));
    }
    return panel(`Energy Summit · Round ${summit.round}`, h("div", { className: "summit-board" }, h("p", null, summit.direction === "rightToLeft" ? "Trading moves from right to left." : "Trading moves from left to right."), h("p", { className: "choice-benefit" }, `Public future forecast: ${game.weather.forecast ? weatherLabels[game.weather.forecast] : "not rolled"}. Use it when judging resources, but hidden pathways stay secret.`), h("p", { className: "muted" }, "Resources are public. Starting Pathways and Capabilities remain secret until both sweeps finish."), summit.lastResolution ? h("p", { className: `notice ${summit.lastResolution.accepted ? "success" : "warning"}`, "aria-live": "polite" }, summit.lastResolution.message) : null, h("div", { className: "summit-resource-table" }, ...summit.order.map(id => { const p = game.players[id]; return h("article", { key: id, className: id === activeId ? "active" : "" }, h("strong", null, p.name), h("small", null, `${p.summitTrades ?? 0}/${maxTrades} trades`), h("span", null, resourceKeys.map(key => `${resourceLabels[key]} ${p.resources[key].warehouse}`).join(" · "))); })), active.controller.kind === "human" ? h(SummitTradeForm, { game, player: active, command }) : h("p", null, `${active.name} is considering a barter.`)));
}
function FoundingProjectPanel({ game, command }) {
    const id = game.opening.foundingOrder[game.opening.foundingIndex];
    const player = game.players[id];
    const pathway = game.config.preparedPathways.find(item => item.id === player.prepared.pathwayId);
    const project = foundingProjectDefinition(game, player.id);
    const affordable = canCompleteFoundingProject(game, player.id);
    return panel(`Founding Project · ${player.name}`, h("div", { className: "founding-project" }, h("p", null, `Revealed plan: ${pathwayLabels[player.prepared.pathwayId]} + ${capabilityLabels[player.prepared.capabilityId]}.`), h("strong", null, project.name), h("p", null, `Cost: ${project.cost.constructionMaterials} Other Materials + ${project.cost.criticalMaterials} Critical Minerals. No Generation 1 action is used.`), affordable ? button("Complete Founding Project", () => command({ type: "resolveFoundingProject", playerId: player.id, complete: true }), { kind: "primary large" }) : h("div", { className: "notice warning" }, "You cannot pay this project now. Defer it and keep a one-use pathway Blueprint for a later build."), button("Defer project", () => command({ type: "resolveFoundingProject", playerId: player.id, complete: false }), { kind: "ghost" })));
}
function WeatherCard({ label, face, forecast = false, onInfo }) {
    const icon = face === "brightSun" ? "☀" : face === "rain" ? "☂" : face === "strongWind" ? "≋" : face === "storm" ? "ϟ" : "☁";
    const tag = onInfo ? "button" : "div";
    return h(tag, { type: onInfo ? "button" : undefined, className: `weather-card ${forecast ? "forecast" : ""} ${onInfo ? "explainable" : ""}`, onClick: onInfo }, h("small", null, label), h("span", null, icon), h("strong", null, face ? weatherLabels[face] : "—"), onInfo ? h("i", { className: "micro-help" }, "?") : null);
}
function SetupProgress({ game, command }) {
    if (game.phase === "setup.preparedSelection")
        return h(PreparedSelection, { game, onSelect: (playerId, pathwayId, capabilityId) => command({ type: "selectPrepared", playerId, pathwayId, capabilityId }) });
    if (game.phase === "setup.summit")
        return h(EnergySummit, { game, command });
    if (game.phase === "setup.foundingProjects")
        return h(FoundingProjectPanel, { game, command });
    const actions = {
        "setup.revealPrepared": ["Reveal Starting Plans", { type: "revealPrepared" }],
        "setup.rollCurrent": ["Roll the first Current Condition", { type: "rollCurrent" }],
        "setup.rollForecast": ["Roll Generation 1 Forecast", { type: "rollForecast" }]
    };
    const item = actions[game.phase];
    if (!item)
        return null;
    return panel("Pregame", h("div", { className: "setup-progress" }, h(WeatherCard, { label: "Current Condition", face: game.weather.current }), h(WeatherCard, { label: "Next Forecast", face: game.weather.forecast, forecast: true }), button(item[0], () => command(item[1]), { kind: "primary" })));
}
export { StartScreen, SetupScreen, PreparedSelection, PreparedCustomForm, SummitTradeForm, EnergySummit, FoundingProjectPanel, WeatherCard, SetupProgress };

