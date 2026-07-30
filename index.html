// @ts-nocheck
const React = globalThis.React;
const { useEffect, useMemo, useRef, useState } = React || {};
const createRoot = globalThis.ReactDOM?.createRoot;
if (globalThis.__sunpathsStartupError)
    throw globalThis.__sunpathsStartupError;
if (!React || !createRoot)
    throw new Error("SUNPATHS local interface runtime failed to load.");
import { defaultConfig, validateConfig } from "./config.js";
import { createGame, applyCommand, currentOrder, currentPlayerId, canCompleteFoundingProject, foundingProjectDefinition, deserializeGame, serializeGame } from "./engine.js";
import { describeCostModifiers, getContinentProfile, getKnowledgeRequirement, getLightingLevel, getPathwayAffinity, getTransmissionLevel, invariantErrors, gatherAmount, getTechnology, pathways, totalEnergy, totalLoss, warehouseTotal, hasRelevantSystem } from "./rules.js";
import { aiPrepared, chooseDevelopmentDecision, chooseDispatchPlan, pumpAi } from "./ai.js";
import { defaultSimulationScenario, technologyDataSets, aggregateReportToCsv, balanceFlagsToCsv, playerResultsToCsv, simulationReportToJson } from "./simulation.js";
import { buildLegality, conditionImpactPreview, developmentActionLegality, effectiveBuildCost, importLegality, previewDispatch, systemGuidance, systemSnapshot, technologyImpactPreview } from "./viewModel.js";
const h = React.createElement;
const continentIcons = { africa: "◒", asia: "◐", europe: "◓", northAmerica: "◔", southAmerica: "◕", australia: "◉" };
const weatherLabels = { brightSun: "Bright Sun", rain: "Rain", strongWind: "Strong Wind", storm: "Storm", calmOvercast: "Calm Overcast" };
const resourceLabels = { fossilFuel: "Fossil Fuel", biomass: "Biomass", constructionMaterials: "Other Materials", criticalMaterials: "Critical Minerals" };
const pathwayLabels = { solar: "Solar", wind: "Wind", hydro: "Hydro", biomass: "Biomass", fossil: "Fossil" };
const capabilityLabels = { storage: "Storage", transformation: "Transformation", transport: "Transport", efficiency: "Efficiency", research: "Research" };
const affinityLabels = { strong: "Strong", standard: "Standard", difficult: "Difficult" };
const abilityDescriptions = {
    criticalMaterialsExtraction: { name: "Critical Materials Specialty", text: "Extracting Critical Materials yields 2 instead of the normal 1." },
    circularRecovery: { name: "Circular Recovery", text: "Once per Generation, Europe may recover one Other or Critical Material actually spent on a Build. Recovery occurs at Generation end." },
    otherMaterialsExtraction: { name: "Other Materials Specialty", text: "Extracting Other Materials yields 2 instead of the normal 1." },
    fuelExtraction: { name: "Fuel Extraction Specialty", text: "Extracting Fossil Fuel yields 2 instead of the normal 1." },
    biomassExtraction: { name: "Biomass Extraction Specialty", text: "Extracting Biomass yields 2 instead of the normal 1." }
};
const penaltyDescriptions = {
    importedInputs: { name: "Imported Advanced Inputs", text: "Europe pays one additional Critical Mineral for Advanced Solar, Advanced Wind and Long-Duration Storage." },
    fossilLockIn: { name: "Fossil Lock-In", text: "After Asia builds an intermediate or advanced fossil technology, its next advanced non-fossil generation technology costs one additional Other Material." },
    weakInterconnection: { name: "Grid Construction Burden", text: "North America's Grid Upgrade and Smart Grid each cost one additional Other Material." },
    longDistance: { name: "Long-Distance Grid", text: "Australia's Grid Upgrade and Smart Grid each cost one additional Other Material." }
};
const strategyLabels = { solarStorage: "Solar + Storage", windGrid: "Wind + Grid", hydroReliability: "Hydro Reliability", biomassRenewal: "Biomass Renewal", fossilTempo: "Fuel Bridge", diversifiedAdapter: "Diversified Adapter" };
const strategies = Object.keys(strategyLabels);
const resourceKeys = Object.keys(resourceLabels);
const resourceDescriptions = {
    fossilFuel: "Finite transition fuel. Plant output stays stable while fuel remains, but every operation consumes one cube. When local stock ends, the player must trade, import or rely on another pathway.",
    biomass: "Renewable but rate-limited fuel. Managed Biomass systems can replenish what they use and create Applied Learning.",
    constructionMaterials: "Everything needed for construction apart from Critical Minerals: steel, cement, glass, timber, machinery and conventional components.",
    criticalMaterials: "Critical mineral inputs such as lithium, cobalt, nickel, graphite, copper and rare-earth elements. They are especially important for advanced generation, storage and grids."
};
const stageDescriptions = {
    Capture: "Makes usable Energy available from Solar or Wind conditions, or collects Hydro inflow into a Reservoir. Regional potential describes identity; it never blocks construction or applies a permanent negative output modifier.",
    Store: "Keeps Energy between Generations. Batteries lose some Energy on recovery; Reservoirs store Hydro inflow.",
    Transform: "Turns Hydro, Biomass or Fossil inputs into usable Energy. Biomass uses its listed output. Fossil output is calculated through gross Fuel Energy, Fuel-storage loss and transformation loss.",
    Transport: "Moves Energy through the Grid. Grid capacity limits how much Energy can reach Lighting.",
    Light: "Meets the Generation need. Producing one Light above the need can earn a Reliability Point, up to four points per player."
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
    const impactPreview = conditionImpactPreview(game, player.id, condition);
    const descriptions = {
        hydroDelta: effect.amount >= 0 ? `Hydro inflow increases by ${effect.amount}.` : `Hydro inflow decreases by ${Math.abs(effect.amount)}.`,
        windDelta: `Wind generation changes by ${effect.amount}.`,
        solarDelta: `Solar generation changes by ${effect.amount}.`,
        biomassRegrowthDelta: `Biomass regrowth changes by ${effect.amount}.`,
        biomassRegrowthSet: `Biomass regrowth is set to ${effect.value}.`,
        gridCapacityDelta: `Grid transport capacity changes by ${effect.amount}.`,
        firstFuelPlantOutputDelta: `The first Biomass or Fossil plant operated this Generation produces ${Math.abs(effect.amount)} less Energy.`,
        firstBuildConstructionDelta: `Your first Build this Generation costs ${effect.amount} additional Other Material.`,
        storageRecoveryBonus: `A selected Battery can recover ${effect.amount} additional Energy that would otherwise be lost.`,
        temporaryKnowledge: `You gain ${effect.amount} temporary Knowledge for construction this Generation.`,
        demandTargetDelta: `The Light requirement increases by ${effect.amount} this Generation.`,
        lightMaximumDelta: `Maximum Light this Generation changes by ${effect.amount}.`
    };
    const relevant = impactPreview.relevant;
    const adapted = Boolean(player.localCondition?.adapted);
    return {
        eyebrow: "Local Condition",
        title: condition.name,
        summary: adapted ? "The condition was cancelled by Adapt." : impactPreview.impact || descriptions[effect.kind] || "A temporary effect for the current Generation.",
        details: [
            `Visible chain: ${impactPreview.values.join(" → ")}.`,
            impactPreview.prompt,
            "It lasts only for the current Generation and never destroys permanent infrastructure or removes scored Light.",
            effect.adaptable ? "You may spend one Development action to Adapt and cancel its penalty." : "This condition has no Adapt response."
        ],
        status: adapted ? "Adapted" : relevant ? "Active now" : "No relevant target",
        impactPreview
    };
}
function weatherExplanation(game, player, face, label) {
    if (!face)
        return { eyebrow: label, title: "No forecast", summary: "There is no later weather result to plan around.", details: [] };
    const weatherState = structuredClone(game);
    weatherState.weather.current = face;
    const snapshot = systemSnapshot(weatherState, player.id, { ignoreCondition: true });
    return {
        eyebrow: label,
        title: weatherLabels[face],
        summary: weatherDescriptions[face],
        details: [
            `${player.name}'s installed Solar system would produce ${snapshot.solar.output} Energy before Local Conditions.`,
            `${player.name}'s installed Wind system would produce ${snapshot.wind.output} Energy before Local Conditions.`,
            `With the current Hydro system, ${snapshot.hydro.inflow} Energy would arrive as inflow and up to ${snapshot.hydro.available} could be dispatched.`,
            `With the complete current system, the visible Light ceiling would be ${snapshot.lightCeiling}.`
        ],
        status: label
    };
}
function technologyExplanation(game, player, tech) {
    const impact = technologyImpactPreview(game, player.id, tech);
    const cost = effectiveBuildCost(game, player, tech);
    const affinity = getPathwayAffinity(game, player, tech);
    const details = [
        `Pathway: ${tech.pathway === "shared" ? "Shared system" : pathwayLabels[tech.pathway]}. Stage: ${titleCase(tech.stage)}.`,
        `Regional readiness: ${affinityLabels[affinity]}. This tier requires Knowledge ${cost.knowledgeRequired} here.`,
        `Base cost: ${cost.base.constructionMaterials} Other Materials and ${cost.base.criticalMaterials} Critical Minerals.`,
        ...describeCostModifiers(cost).map(line => line),
        `Final cost: ${cost.constructionMaterials} Other Materials and ${cost.criticalMaterials} Critical Minerals.`,
        ...impact.metrics.map(metric => `${metric.label}: ${metric.before}${metric.unit} → ${metric.after}${metric.unit}.`),
        `Timing: ${impact.timing}.${impact.comparisonMode === "tier" ? " The numbers compare this tier with its required previous tier, because you cannot build it yet." : ""}`,
        `Current Generation: ${impact.now}`,
        `Next/Future Generation: ${impact.future}`,
        impact.prompt
    ];
    if (tech.prerequisiteTechnologyId)
        details.push(`Upgrade requirement: build ${getTechnology(game, tech.prerequisiteTechnologyId).name} first. The old tier is replaced, not stacked.`);
    if (tech.knowledgeRationale)
        details.push(`Technical rationale: ${tech.knowledgeRationale}`);
    if (tech.fuel)
        details.push(`Consumes ${tech.fuel.units} ${resourceLabels[tech.fuel.resource]} whenever it operates.`);
    if (tech.appliedLearning)
        details.push("If this Biomass system operates and replenishes Biomass, gain one Applied Learning token, up to the player limit.");
    return { eyebrow: `${affinityLabels[affinity]} readiness · Knowledge ${cost.knowledgeRequired}`, title: tech.name, summary: impact.headline, details };
}
function resourceExplanation(game, player, key) {
    const account = player.resources[key];
    return {
        eyebrow: "Warehouse resource",
        title: resourceLabels[key],
        summary: resourceDescriptions[key],
        details: [`This resource in Warehouse: ${account.warehouse}. Total Warehouse: ${warehouseTotal(player)}/${game.config.rules.warehouseMaximum}.`, `Remaining in continent: ${account.currentContinent}.`, `Printed starting stock: ${account.printedStarting}. Only Warehouse resources may be spent, consumed or traded.`, ...(key === "fossilFuel" ? ["Fuel-plant output is limited by the installed technology and available Fuel—not by a regional potential score. Fuel can be gathered locally, traded or imported."] : [])]
    };
}
function scoringExplanation(game, generation, value, target) {
    return {
        eyebrow: `Generation ${generation}`,
        title: "Light and Reliability",
        summary: "Meet the Light need first. Produce one more than the need to earn a Reliability Point.",
        details: [`Recorded Light: ${value ?? "not resolved yet"}.`, `Light needed: ${target}. Exactly ${target} meets demand; ${Math.min(4, target + 1)} or more can earn one Reliability Point.`, `Each player can earn at most ${game.config.rules.reliabilityPointMaximum ?? 4} Reliability Points.`, "Final ranking uses Reliability Points first, then total Light, then least System Loss, then recoverable stored Energy."]
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
        const key = event => {
            if (event.key === "Escape")
                onClose();
        };
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    }, [onClose]);
    if (!info)
        return null;
    return h("div", { className: "info-overlay", role: "presentation", onMouseDown: event => {
            if (event.target === event.currentTarget)
                onClose();
        } }, h("section", { className: "info-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "sunpaths-info-title" }, h("div", { className: "info-modal-heading" }, h("div", null, h("p", { className: "eyebrow" }, info.eyebrow || "Explanation"), h("h2", { id: "sunpaths-info-title" }, info.title)), button("Close", onClose, { kind: "ghost" })), info.status ? badge(info.status, "info-status") : null, h("p", { className: "info-summary" }, info.summary), info.details?.length ? h("ul", { className: "info-details" }, ...info.details.map((detail, index) => h("li", { key: index }, detail))) : null));
}
function ConfirmationModal({ confirmation, onConfirm, onCancel }) {
    useEffect(() => {
        const key = event => {
            if (event.key === "Escape")
                onCancel();
        };
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
    const impact = explanation.impactPreview;
    const icon = condition.effect.kind.includes("wind") ? "≋" : condition.effect.kind.includes("solar") ? "☁" : condition.effect.kind.includes("hydro") ? "☂" : condition.effect.kind.includes("storage") ? "▣" : condition.effect.kind.includes("Knowledge") || condition.effect.kind.includes("knowledge") ? "✦" : "!";
    return h("div", { className: "condition-reveal-overlay" }, h("section", { className: `condition-reveal-card ${explanation.status === "Active now" ? "active" : "quiet"}`, role: "dialog", "aria-modal": "true" }, h("div", { className: "condition-reveal-icon" }, icon), h("p", { className: "eyebrow" }, `Generation ${game.generation} · Local Condition`), h("h2", null, condition.name), h("p", { className: "condition-big-effect" }, explanation.summary), h("div", { className: "condition-chain", "aria-label": impact.values.join(" to ") }, ...impact.values.flatMap((value, index) => [h("div", { key: `condition-${index}`, className: `condition-chain-node ${index === 2 ? "result" : ""}` }, h("small", null, impact.chain[index]), h("strong", null, value)), index < 2 ? h("span", { key: `condition-arrow-${index}`, className: "condition-chain-arrow" }, "→") : null].filter(Boolean))), h("div", { className: "condition-impact" }, h("strong", null, explanation.status === "Active now" ? "What this changes" : "What this means"), h("p", null, impact.impact)), h("div", { className: "condition-prompt" }, h("strong", null, "What can you do?"), h("p", null, impact.prompt)), h("div", { className: "form-row" }, button("Read full explanation", () => onInfo(explanation), { kind: "secondary" }), button(impact.relevant ? "Continue" : "Continue · no action needed", onContinue, { kind: "primary" }))));
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
        return `World Market: receive ${resourceLabels[action.receive]}`;
    return titleCase(action.kind);
}
function learningCostPreview(game, player) {
    const nextLevel = player.knowledge + 1;
    const printed = game.config.knowledge?.advancementCosts?.[nextLevel] || { constructionMaterials: 0, criticalMaterials: 0 };
    let general = printed.constructionMaterials;
    let critical = printed.criticalMaterials;
    let usesAppliedLearning = false;
    if (player.prepared.capabilityId === "research" && !player.prepared.capabilityUsed)
        general = Math.max(0, general - 1);
    if (player.appliedLearningTokens > 0 && general > 0) {
        general -= 1;
        usesAppliedLearning = true;
    }
    return { nextLevel, general, critical, usesAppliedLearning };
}
function actionConfirmation(game, player, action) {
    if (action.kind === "extract" || action.kind === "harvestBiomass") {
        const resource = action.kind === "harvestBiomass" ? "biomass" : action.resource;
        const account = player.resources[resource];
        const amount = action.kind === "extract" ? gatherAmount(game, player, resource) : 1;
        return {
            title: friendlyActionName(action, game),
            summary: `Move ${amount} ${resourceLabels[resource]} from your land into your Warehouse.`,
            details: [`Warehouse: ${account.warehouse} → ${account.warehouse + amount}.`, `Resources remaining in your land: ${account.currentContinent} → ${account.currentContinent - amount}.`],
            confirmLabel: "Gather resource"
        };
    }
    if (action.kind === "research") {
        const cost = learningCostPreview(game, player);
        const payment = [`${cost.general} Other Materials`, `${cost.critical} Critical Minerals`];
        return {
            title: "Learn and gain Knowledge",
            summary: `Increase Knowledge from ${player.knowledge} to ${cost.nextLevel}.`,
            details: [
                `Cost: ${payment.join(" + ")}.`,
                cost.usesAppliedLearning ? "One Applied Learning token replaces 1 Other Material." : "Knowledge becomes more expensive at higher levels.",
                "Knowledge is permanent and is not spent when you build. Each player must unlock their own higher technology tiers."
            ],
            confirmLabel: "Learn"
        };
    }
    if (action.kind === "adapt") {
        const condition = conditionDefinition(game, player);
        return { title: `Adapt to ${condition?.name || "the condition"}`, summary: "Cancel the adaptable penalty for this Generation.", details: ["This uses one of your three actions."], confirmLabel: "Adapt" };
    }
    if (action.kind === "pass")
        return { title: "Pass this action?", summary: "You will use one action without changing your system.", details: ["Choose this only when you do not want—or cannot afford—another action."], confirmLabel: "Pass" };
    if (action.kind === "build") {
        const tech = getTechnology(game, action.technologyId);
        const impact = technologyImpactPreview(game, player.id, tech);
        const cost = effectiveBuildCost(game, player, tech, { useContinentAbility: Boolean(action.useContinentAbility) });
        return {
            title: `Build ${tech.name}?`,
            summary: impact.headline,
            details: [
                `Actual cost now: ${cost.constructionMaterials} Other Materials + ${cost.criticalMaterials} Critical Minerals.`,
                `Requires Knowledge ${cost.knowledgeRequired}; your effective Knowledge is ${cost.effectiveKnowledge}.`,
                `Base cost: ${cost.base.constructionMaterials} Other Materials + ${cost.base.criticalMaterials} Critical Materials.`,
                ...describeCostModifiers(cost),
                ...impact.metrics.slice(0, 3).map(metric => `${metric.label}: ${metric.before}${metric.unit} → ${metric.after}${metric.unit}.`),
                `This Generation: ${impact.now}`,
                `Next: ${impact.prompt}`
            ],
            confirmLabel: "Build and improve system"
        };
    }
    if (action.kind === "publicImport") {
        const paymentText = Object.entries(action.payment).filter(([, value]) => value).map(([key, value]) => `${value} ${resourceLabels[key]}`).join(" + ");
        return { title: `World Market exchange for ${resourceLabels[action.receive]}?`, summary: `Pay ${paymentText} to receive 1 ${resourceLabels[action.receive]}.`, details: ["This exchange costs no Development action.", "The two payment resources enter the World Market; the received stock decreases by one."], confirmLabel: "Exchange" };
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
export const uiShared = {
    React,
    useEffect,
    useMemo,
    useRef,
    useState,
    createRoot,
    defaultConfig,
    validateConfig,
    createGame,
    applyCommand,
    currentOrder,
    currentPlayerId,
    canCompleteFoundingProject,
    foundingProjectDefinition,
    describeCostModifiers,
    getContinentProfile,
    getKnowledgeRequirement,
    getLightingLevel,
    getPathwayAffinity,
    getTransmissionLevel,
    invariantErrors,
    gatherAmount,
    getTechnology,
    pathways,
    totalEnergy,
    totalLoss,
    warehouseTotal,
    hasRelevantSystem,
    aiPrepared,
    chooseDevelopmentDecision,
    chooseDispatchPlan,
    pumpAi,
    deserializeGame,
    serializeGame,
    defaultSimulationScenario,
    technologyDataSets,
    aggregateReportToCsv,
    balanceFlagsToCsv,
    playerResultsToCsv,
    simulationReportToJson,
    buildLegality,
    conditionImpactPreview,
    developmentActionLegality,
    effectiveBuildCost,
    importLegality,
    previewDispatch,
    systemGuidance,
    systemSnapshot,
    technologyImpactPreview,
    h,
    continentIcons,
    weatherLabels,
    resourceLabels,
    pathwayLabels,
    capabilityLabels,
    affinityLabels,
    abilityDescriptions,
    penaltyDescriptions,
    strategyLabels,
    strategies,
    resourceKeys,
    resourceDescriptions,
    stageDescriptions,
    weatherDescriptions,
    newRandomSeed,
    localConditionExplanation,
    weatherExplanation,
    technologyExplanation,
    resourceExplanation,
    scoringExplanation,
    clone,
    number,
    titleCase,
    sumLoss,
    phaseLabel,
    currentPlayer,
    conditionDefinition,
    button,
    panel,
    infoButton,
    InfoModal,
    ConfirmationModal,
    ConditionReveal,
    friendlyActionName,
    learningCostPreview,
    actionConfirmation,
    stat,
    badge,
    meter,
    energyCubes,
    download,
    makeParticipants
};

