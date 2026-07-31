// @ts-nocheck
// SUNPATHS organised source. Each section has one named responsibility.
import { aiAcceptsSummitOffer, aiPrepared, chooseAiSummitOffer, attemptAiTrade, chooseDevelopmentDecision, chooseDispatchDecision, recordAiDecision } from "./ai.js";
import { configHash } from "./config.js";
import { createGame, applyCommandFast, currentPlayerId, canCompleteFoundingProject } from "./engine.js";
import { createRandomState, randomInt } from "./random.js";
import { assertInvariants, getTechnology, resourceTypes, totalLoss, usableStoredEnergy } from "./rules.js";
// -----------------------------------------------------------------------------
// Simulation scenarios
// -----------------------------------------------------------------------------
export const allStrategies = [
    "solarStorage",
    "windGrid",
    "hydroReliability",
    "biomassRenewal",
    "fossilTempo",
    "diversifiedAdapter"
];
const weatherPresets = {
    default: ["brightSun", "brightSun", "rain", "strongWind", "storm", "calmOvercast"],
    sunny: ["brightSun", "brightSun", "brightSun", "strongWind", "rain", "calmOvercast"],
    windy: ["strongWind", "strongWind", "strongWind", "storm", "brightSun", "calmOvercast"],
    wet: ["rain", "rain", "storm", "storm", "brightSun", "strongWind"],
    balanced: ["brightSun", "rain", "strongWind", "storm", "calmOvercast", "calmOvercast"]
};
function scaleSigned(value, severity) {
    if (value === 0)
        return 0;
    return Math.sign(value) * Math.max(1, Math.round(Math.abs(value) * severity));
}
function scaleConditionEffect(effect, severity) {
    if (severity <= 0) {
        switch (effect.kind) {
            case "biomassRegrowthSet": return { ...effect, value: 1 };
            case "temporaryKnowledge": return { ...effect, amount: 0 };
            case "storageRecoveryBonus": return { ...effect, amount: 0 };
            case "hydroDelta": return { ...effect, amount: 0, fallbackBiomassRegrowthDelta: 0 };
            default: return "amount" in effect ? { ...effect, amount: 0 } : effect;
        }
    }
    switch (effect.kind) {
        case "hydroDelta": return {
            ...effect,
            amount: scaleSigned(effect.amount, severity),
            ...(effect.fallbackBiomassRegrowthDelta === undefined
                ? {}
                : { fallbackBiomassRegrowthDelta: scaleSigned(effect.fallbackBiomassRegrowthDelta, severity) })
        };
        case "biomassRegrowthSet": return effect;
        case "storageRecoveryBonus": return { ...effect, amount: Math.max(1, Math.round(effect.amount * severity)) };
        case "temporaryKnowledge": return { ...effect, amount: Math.max(1, Math.round(effect.amount * severity)) };
        default: return { ...effect, amount: scaleSigned(effect.amount, severity) };
    }
}
export const technologyDataSets = [
    {
        id: "activeConfig",
        label: "Active configuration",
        description: "Use the currently loaded technology catalogue without modification.",
        apply: config => structuredClone(config)
    },
    {
        id: "storageOptimistic",
        label: "Experimental: cheaper storage",
        description: "Reduce Battery Critical Material costs by one and improve the Basic Battery's 4-Energy recovery from 3 to 4.",
        apply: config => {
            const copy = structuredClone(config);
            copy.technologies = copy.technologies.map(technology => {
                if (technology.storage?.type !== "battery")
                    return technology;
                const recovery = [...technology.storage.recovery.outputsByInput];
                if (technology.id === "basicBattery" && recovery.length > 4)
                    recovery[4] = 4;
                return {
                    ...technology,
                    cost: { ...technology.cost, criticalMaterials: Math.max(0, technology.cost.criticalMaterials - 1) },
                    storage: { ...technology.storage, recovery: { outputsByInput: recovery } }
                };
            });
            return copy;
        }
    },
    {
        id: "thermalEfficient",
        label: "Experimental: efficient thermal",
        description: "Reduce every fixed thermal System Loss by one, with a minimum of zero.",
        apply: config => {
            const copy = structuredClone(config);
            copy.technologies = copy.technologies.map(technology => technology.loss?.category === "thermal"
                ? { ...technology, loss: { ...technology.loss, fixedPerOperation: Math.max(0, (technology.loss.fixedPerOperation ?? 0) - 1) } }
                : technology);
            return copy;
        }
    }
];
export function defaultAssignments(config) {
    return config.continents.map((continent, index) => ({
        continentId: continent.id,
        strategyId: allStrategies[index % allStrategies.length]
    }));
}
export function defaultSimulationScenario(config) {
    return {
        games: 100,
        baseSeed: "SUNPATHS-SIM-001",
        assignments: defaultAssignments(config),
        assignmentMode: "rotateStrategies",
        seatAssignmentMode: "rotate",
        aiDifficulty: "standard",
        tradeMode: "directAndImport",
        technologyDataSetId: "activeConfig",
        localConditionSeverity: 1,
        weatherPresetId: "default",
        actionsPerGeneration: config.rules.actionsPerGeneration,
        buildAndOperateSameGeneration: config.rules.buildAndOperateSameGeneration,
        lossRules: {
            thermal: config.systemLoss.countThermal,
            battery: config.systemLoss.countBattery,
            lighting: config.systemLoss.countLighting
        },
        aiTradeUtilityThreshold: 0.35,
        aiDirectTradeCadence: 1,
        randomizeInitialFirstPlayer: false,
        openingMode: config.opening?.defaultMode ?? "energySummit"
    };
}
export function strategyForGame(assignments, gameIndex, assignmentMode) {
    if (assignmentMode === "fixed")
        return assignments.map(item => ({ ...item }));
    return assignments.map((item, index) => ({
        continentId: item.continentId,
        strategyId: allStrategies[(allStrategies.indexOf(item.strategyId) + gameIndex + index * 0) % allStrategies.length]
    }));
}
export function seatOrderForGame(assignments, gameIndex, seatMode) {
    const copy = assignments.map(item => ({ ...item }));
    if (seatMode === "fixed" || copy.length <= 1)
        return copy;
    const strategyCycle = Math.max(1, allStrategies.length);
    const shift = Math.floor(gameIndex / strategyCycle) % copy.length;
    return [...copy.slice(shift), ...copy.slice(0, shift)];
}
export function applySimulationScenario(baseConfig, scenario) {
    const dataSet = technologyDataSets.find(item => item.id === scenario.technologyDataSetId) ?? technologyDataSets[0];
    const config = dataSet.apply(baseConfig);
    config.rules = {
        ...config.rules,
        actionsPerGeneration: Math.max(1, Math.min(4, Math.round(scenario.actionsPerGeneration))),
        buildAndOperateSameGeneration: scenario.buildAndOperateSameGeneration
    };
    config.trade = {
        ...config.trade,
        directEnabled: scenario.tradeMode === "directAndImport",
        publicImportEnabled: scenario.tradeMode !== "disabled"
    };
    config.systemLoss = {
        ...config.systemLoss,
        countThermal: scenario.lossRules.thermal,
        countBattery: scenario.lossRules.battery,
        countLighting: scenario.lossRules.lighting
    };
    config.weather = { ...config.weather, faces: [...weatherPresets[scenario.weatherPresetId]] };
    config.localConditions = config.localConditions.map(condition => ({
        ...condition,
        effect: scaleConditionEffect(condition.effect, scenario.localConditionSeverity)
    }));
    // Continental reserves are a fixed 35-resource asymmetric system. Simulation
    // scenarios may vary rules, but may not silently rescale the core geography.
    config.continents = config.continents.map(continent => structuredClone(continent));
    return config;
}
// -----------------------------------------------------------------------------
// Automated complete-game runner
// -----------------------------------------------------------------------------
export function defaultAiPlayers(config) {
    return config.continents.map((continent, index) => ({
        id: `p${index + 1}`,
        name: continent.name,
        continentId: continent.id,
        controller: { kind: "ai", strategy: allStrategies[index % allStrategies.length] }
    }));
}
export function initialiseAutomatedGame(config, seed, players = defaultAiPlayers(config), debugMode = false, initialFirstPlayerIndex, options = {}) {
    const state = createGame(config, players, seed, { debugMode, executionMode: "simulation", ...(initialFirstPlayerIndex === undefined ? {} : { initialFirstPlayerIndex }), ...(options.openingMode ? { openingMode: options.openingMode } : {}) });
    for (const player of Object.values(state.players)) {
        const prepared = aiPrepared(player.controller.kind === "ai" ? player.controller.strategy : "diversifiedAdapter", state, player);
        applyCommandFast(state, { type: "selectPrepared", playerId: player.id, ...prepared });
    }
    let guard = 0;
    while (state.phase.startsWith("setup.")) {
        if (state.phase === "setup.summit") {
            const pending = state.opening.summit.pendingOffer;
            if (pending) {
                const recipient = state.players[pending.recipientId];
                applyCommandFast(state, { type: "respondSummitTrade", recipientId: recipient.id, accept: aiAcceptsSummitOffer(state, recipient, pending) });
            }
            else {
                const activeId = state.opening.summit.order[state.opening.summit.activeIndex];
                const active = state.players[activeId];
                const offer = chooseAiSummitOffer(state, active);
                if (offer)
                    applyCommandFast(state, { type: "proposeSummitTrade", proposerId: active.id, ...offer });
                else
                    applyCommandFast(state, { type: "passSummitTurn", playerId: active.id });
            }
        }
        else if (state.phase === "setup.revealPrepared")
            applyCommandFast(state, { type: "revealPrepared" });
        else if (state.phase === "setup.foundingProjects") {
            const id = state.opening.foundingOrder[state.opening.foundingIndex];
            const player = state.players[id];
            const complete = canCompleteFoundingProject(state, player.id);
            applyCommandFast(state, { type: "resolveFoundingProject", playerId: id, complete });
        }
        else if (state.phase === "setup.rollCurrent")
            applyCommandFast(state, { type: "rollCurrent" });
        else if (state.phase === "setup.rollForecast")
            applyCommandFast(state, { type: "rollForecast" });
        else
            throw new Error(`Unhandled setup phase ${state.phase}`);
        if (++guard > 100)
            throw new Error("Automated opening exceeded safety limit.");
    }
    return state;
}
export const defaultAutomatedGamePolicy = {
    aiTradeUtilityThreshold: 0.35,
    aiDirectTradeCadence: 1
};
export function advanceAutomatedGame(state, policy = defaultAutomatedGamePolicy) {
    if (state.completed)
        return state;
    if (state.phase === "generation.start")
        applyCommandFast(state, { type: "beginGeneration" });
    else if (state.phase === "generation.localConditions")
        applyCommandFast(state, { type: "drawLocalConditions" });
    else if (state.phase === "generation.development") {
        const id = currentPlayerId(state);
        const player = state.players[id];
        if (player.controller.kind === "ai") {
            const cadence = Math.max(1, Math.round(policy.aiDirectTradeCadence));
            const tradeGeneration = (state.generation - 1) % cadence === 0;
            if (tradeGeneration) {
                const tradeDecision = attemptAiTrade(state, player, policy.aiTradeUtilityThreshold);
                if (tradeDecision?.actionSpent) {
                    assertInvariants(state);
                    return state;
                }
            }
        }
        const decision = chooseDevelopmentDecision(state, player);
        recordAiDecision(state, decision);
        applyCommandFast(state, { type: "developmentAction", playerId: id, action: decision.action });
    }
    else if (state.phase === "generation.dispatch") {
        const id = currentPlayerId(state);
        const player = state.players[id];
        const decision = chooseDispatchDecision(state, player);
        recordAiDecision(state, decision);
        applyCommandFast(state, { type: "dispatch", playerId: id, plan: decision.plan });
    }
    else if (state.phase === "generation.review")
        applyCommandFast(state, { type: "finishReview" });
    else if (state.phase === "generation.advanceWeather")
        applyCommandFast(state, { type: "advanceWeather" });
    else
        throw new Error(`Unhandled phase ${state.phase}`);
    assertInvariants(state);
    return state;
}
export function continueAutomatedGame(state, policy = defaultAutomatedGamePolicy) {
    let guard = 0;
    while (!state.completed) {
        advanceAutomatedGame(state, policy);
        guard += 1;
        if (guard > 1000)
            throw new Error("Automated game exceeded the safety command limit.");
    }
    return state;
}
export function runAutomatedGame(config, seed, players = defaultAiPlayers(config), debugMode = false, policy = defaultAutomatedGamePolicy, initialFirstPlayerIndex, options = {}) {
    return continueAutomatedGame(initialiseAutomatedGame(config, seed, players, debugMode, initialFirstPlayerIndex, options), policy);
}
// -----------------------------------------------------------------------------
// Simulation metrics
// -----------------------------------------------------------------------------
function quantile(sorted, probability) {
    if (sorted.length === 0)
        return 0;
    const position = (sorted.length - 1) * probability;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper)
        return sorted[lower];
    const weight = position - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
export function distribution(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : 0;
    return {
        count: sorted.length,
        mean,
        median: quantile(sorted, 0.5),
        p10: quantile(sorted, 0.1),
        p25: quantile(sorted, 0.25),
        p75: quantile(sorted, 0.75),
        p90: quantile(sorted, 0.9),
        minimum: sorted[0] ?? 0,
        maximum: sorted.at(-1) ?? 0
    };
}
function eventCount(state, actorId, type) {
    return state.log.filter(event => {
        if (event.type !== type)
            return false;
        if (event.actorId === actorId)
            return true;
        if (type === "trade.completed")
            return event.data?.bId === actorId;
        return false;
    }).length;
}
function addBundle(target, bundle = {}) {
    for (const resource of resourceTypes)
        target[resource] = (target[resource] ?? 0) + (bundle[resource] ?? 0);
}
function resourceFlows(state, playerId) {
    const imported = Object.fromEntries(resourceTypes.map(resource => [resource, 0]));
    const exported = Object.fromEntries(resourceTypes.map(resource => [resource, 0]));
    const player = state.players[playerId];
    addBundle(imported, player.summitImports);
    addBundle(exported, player.summitExports);
    for (const event of state.log) {
        if (event.type === "trade.completed") {
            if (event.data?.aId === playerId) {
                addBundle(exported, event.data.aGives);
                addBundle(imported, event.data.bGives);
            }
            if (event.data?.bId === playerId) {
                addBundle(exported, event.data.bGives);
                addBundle(imported, event.data.aGives);
            }
        }
        if (event.type === "action.worldMarket" && event.actorId === playerId)
            addBundle(imported, { [event.data?.receive]: 1 });
    }
    return { imported, exported };
}
function firstEventGeneration(state, playerId, predicate) {
    const event = state.log.find(item => item.actorId === playerId && predicate(item));
    return event ? event.generation : null;
}
function generationMetricEvents(state, actorId) {
    return state.log
        .filter(event => event.actorId === actorId && event.type === "dispatch.resolved")
        .map(event => (event.data?.metrics ?? {}));
}
function numericRecordValue(record, key) {
    if (!record || typeof record !== "object")
        return 0;
    const value = record[key];
    return typeof value === "number" ? value : 0;
}
function purchasedTechnologies(state, actorId) {
    return state.log
        .filter(event => event.actorId === actorId && event.type === "action.build")
        .map(event => String(event.data?.technologyId ?? ""))
        .filter(Boolean);
}
function installedPathways(state, actorId) {
    const player = state.players[actorId];
    const pathways = new Set();
    for (const instance of player.installed) {
        const technology = getTechnology(state, instance.technologyId);
        if (technology.pathway !== "shared")
            pathways.add(technology.pathway);
    }
    return [...pathways].sort();
}
export function extractPlayerResults(state, gameIndex) {
    if (!state.results)
        throw new Error("Cannot extract results before final scoring.");
    const firstWeather = state.weather.history[1];
    if (!firstWeather)
        throw new Error("Completed game has no Generation 1 weather history.");
    const noQualifiedWinner = !state.results.some(result => result.rank === 1 && result.finalDemandMet);
    const allBuildInputsExhausted = Object.values(state.players).every(player => player.resources.constructionMaterials.currentContinent + player.resources.constructionMaterials.warehouse === 0
        && player.resources.criticalMaterials.currentContinent + player.resources.criticalMaterials.warehouse === 0);
    const globalBuildInputsExhausted = (state.worldMarket?.constructionMaterials ?? 0) === 0 && (state.worldMarket?.criticalMaterials ?? 0) === 0;
    const resourceDeadlock = noQualifiedWinner && allBuildInputsExhausted && globalBuildInputsExhausted;
    return state.results.map(ranking => {
        const player = state.players[ranking.playerId];
        if (player.controller.kind !== "ai")
            throw new Error("Simulation result contains a non-AI player.");
        const continent = state.config.continents.find(item => item.id === player.continentId);
        const metrics = generationMetricEvents(state, player.id);
        const lightValues = Object.values(player.lightByGeneration);
        const fossilConsumed = metrics.reduce((sum, metric) => sum + numericRecordValue(metric.fuelConsumed, "fossilFuel"), 0);
        const biomassConsumed = metrics.reduce((sum, metric) => sum + numericRecordValue(metric.fuelConsumed, "biomass"), 0);
        const finalBiomassTotal = player.resources.biomass.currentContinent + player.resources.biomass.warehouse;
        const biomassRegrown = Math.max(0, finalBiomassTotal + biomassConsumed - continent.printedResources.biomass);
        const fossilRemaining = player.resources.fossilFuel.currentContinent + player.resources.fossilFuel.warehouse;
        const warehouseUnused = resourceTypes.reduce((sum, resource) => sum + player.resources[resource].warehouse, 0);
        const totalUnused = resourceTypes.reduce((sum, resource) => sum + player.resources[resource].warehouse + player.resources[resource].currentContinent, 0);
        const purchases = purchasedTechnologies(state, player.id);
        const batteryThroughput = metrics.some(metric => numericRecordValue(metric.systemLoss, "battery") > 0);
        const hydroThroughput = metrics.some(metric => numericRecordValue(metric.grossEnergy, "hydro") > 0);
        const storedUsable = usableStoredEnergy(state, player.id);
        const flows = resourceFlows(state, player.id);
        const firstUpgradeGeneration = firstEventGeneration(state, player.id, event => {
            if (event.type !== "action.build")
                return false;
            const technology = state.config.technologies.find(item => item.id === event.data?.technologyId);
            return technology && technology.tier !== "basic";
        });
        const firstLightGeneration = Object.entries(player.lightByGeneration).filter(([, value]) => value > 0).map(([generation]) => Number(generation)).sort((a, b) => a - b)[0] ?? null;
        const abilityEvents = state.log.filter(event => event.actorId === player.id && event.type === "continent.ability");
        const penaltyEvents = state.log.filter(event => event.actorId === player.id && event.type === "continent.penalty");
        return {
            gameIndex,
            seed: state.seed,
            playerId: player.id,
            continentId: player.continentId,
            strategyId: player.controller.strategy,
            selectedPathwayId: player.prepared.pathwayId,
            rank: ranking.rank,
            winner: ranking.rank === 1 && ranking.finalDemandMet,
            sharedWinner: ranking.rank === 1 && ranking.sharedRank && ranking.finalDemandMet,
            totalLight: ranking.totalLight,
            medianGenerationLight: distribution(lightValues).median,
            reliableGenerations: ranking.reliableGenerations,
            demandMetGenerations: ranking.demandMetGenerations,
            finalDemandMet: ranking.finalDemandMet,
            systemLoss: totalLoss(player),
            curtailment: player.cumulative.curtailment,
            usableStoredEnergy: storedUsable,
            storageUsed: batteryThroughput || hydroThroughput || storedUsable > 0,
            fossilFuelConsumed: fossilConsumed,
            fossilFuelRemaining: fossilRemaining,
            fossilPressureReached: fossilRemaining <= Math.floor(continent.printedResources.fossilFuel * 3 / 4),
            biomassConsumed,
            biomassRegrown,
            knowledgeGained: player.knowledge - continent.startingKnowledge,
            finalKnowledge: player.knowledge,
            tradesCompleted: eventCount(state, player.id, "trade.completed"),
            importsCompleted: eventCount(state, player.id, "action.worldMarket"),
            summitTrades: player.summitTrades ?? 0,
            resourcesImported: flows.imported,
            resourcesExported: flows.exported,
            appliedLearningGained: metrics.reduce((sum, metric) => sum + (metric.appliedLearningGained ?? 0), 0),
            appliedLearningSpent: metrics.reduce((sum, metric) => sum + (metric.appliedLearningSpent ?? 0), 0),
            unusedWarehouseResources: warehouseUnused,
            unusedTotalResources: totalUnused,
            firstBuildTechnologyId: purchases[0] ?? null,
            firstUpgradeGeneration,
            firstLightGeneration,
            purchasedTechnologyIds: purchases,
            installedPathways: installedPathways(state, player.id),
            firstWeather,
            preparedPathwayUsed: player.prepared.pathwayUsed,
            preparedCapabilityUsed: player.prepared.capabilityUsed,
            foundingProjectCompleted: player.prepared.foundingProjectCompleted,
            depletedResources: Object.fromEntries(resourceTypes.map(resource => [resource, player.resources[resource].currentContinent === 0])),
            abilityId: continent.abilityId,
            abilityActivations: abilityEvents.length,
            abilityValue: abilityEvents.reduce((sum, event) => sum + Number(event.data?.value ?? 0), 0),
            penaltyId: continent.penaltyId,
            penaltyActivations: penaltyEvents.length,
            fossilOnlyWinner: Boolean(ranking.rank === 1 && ranking.finalDemandMet && installedPathways(state, player.id).length === 1 && installedPathways(state, player.id)[0] === "fossil"),
            biomassSelectedWinner: Boolean(ranking.rank === 1 && ranking.finalDemandMet && player.prepared.pathwayId === "biomass"),
            resourceDeadlock,
            illegalActionAttempts: 0
        };
    });
}
function aggregateRows(id, rows) {
    return {
        id,
        games: rows.length,
        light: distribution(rows.map(row => row.totalLight)),
        winRate: rows.length ? rows.filter(row => row.winner).length / rows.length : 0,
        reliabilityMean: rows.length ? rows.reduce((sum, row) => sum + row.reliableGenerations, 0) / rows.length : 0,
        demandMetMean: rows.length ? rows.reduce((sum, row) => sum + row.demandMetGenerations, 0) / rows.length : 0,
        finalDemandMetRate: rows.length ? rows.filter(row => row.finalDemandMet).length / rows.length : 0,
        systemLossMean: rows.length ? rows.reduce((sum, row) => sum + row.systemLoss, 0) / rows.length : 0,
        curtailmentMean: rows.length ? rows.reduce((sum, row) => sum + row.curtailment, 0) / rows.length : 0,
        storedEnergyMean: rows.length ? rows.reduce((sum, row) => sum + row.usableStoredEnergy, 0) / rows.length : 0,
        tradeMean: rows.length ? rows.reduce((sum, row) => sum + row.tradesCompleted, 0) / rows.length : 0,
        importMean: rows.length ? rows.reduce((sum, row) => sum + row.importsCompleted, 0) / rows.length : 0,
        summitTradeMean: rows.length ? rows.reduce((sum, row) => sum + row.summitTrades, 0) / rows.length : 0,
        firstUpgradeGenerationMean: rows.filter(row => row.firstUpgradeGeneration !== null).length ? rows.filter(row => row.firstUpgradeGeneration !== null).reduce((sum, row) => sum + row.firstUpgradeGeneration, 0) / rows.filter(row => row.firstUpgradeGeneration !== null).length : null,
        firstLightGenerationMean: rows.filter(row => row.firstLightGeneration !== null).length ? rows.filter(row => row.firstLightGeneration !== null).reduce((sum, row) => sum + row.firstLightGeneration, 0) / rows.filter(row => row.firstLightGeneration !== null).length : null,
        knowledgeGainMean: rows.length ? rows.reduce((sum, row) => sum + row.knowledgeGained, 0) / rows.length : 0,
        appliedLearningGainMean: rows.length ? rows.reduce((sum, row) => sum + row.appliedLearningGained, 0) / rows.length : 0,
        abilityActivationMean: rows.length ? rows.reduce((sum, row) => sum + row.abilityActivations, 0) / rows.length : 0,
        abilityValueMean: rows.length ? rows.reduce((sum, row) => sum + row.abilityValue, 0) / rows.length : 0,
        penaltyActivationMean: rows.length ? rows.reduce((sum, row) => sum + row.penaltyActivations, 0) / rows.length : 0
    };
}
export function aggregateByContinent(rows) {
    const ids = [...new Set(rows.map(row => row.continentId))].sort();
    return ids.map(id => aggregateRows(id, rows.filter(row => row.continentId === id)));
}
export function aggregateByStrategy(rows) {
    const ids = [...new Set(rows.map(row => row.strategyId))].sort();
    return ids.map(id => aggregateRows(id, rows.filter(row => row.strategyId === id)));
}
export function aggregateByPathway(rows) {
    const ids = [...new Set(rows.map(row => row.selectedPathwayId))].filter(Boolean).sort();
    return ids.map(id => aggregateRows(id, rows.filter(row => row.selectedPathwayId === id)));
}
export function aggregateContinentPathway(rows) {
    const continents = [...new Set(rows.map(row => row.continentId))].sort();
    const selectedPathways = [...new Set(rows.map(row => row.selectedPathwayId))].filter(Boolean).sort();
    return continents.flatMap(continentId => selectedPathways.map(pathwayId => {
        const subset = rows.filter(row => row.continentId === continentId && row.selectedPathwayId === pathwayId);
        return { continentId, pathwayId, ...aggregateRows(`${continentId}:${pathwayId}`, subset) };
    }));
}
export function frequencyRows(values, winnerValues, denominator, winnerDenominator) {
    const ids = [...new Set(values)].filter(Boolean);
    return ids.map(id => {
        const count = values.filter(value => value === id).length;
        const winnerCount = winnerValues.filter(value => value === id).length;
        return {
            id,
            count,
            share: denominator ? count / denominator : 0,
            winnerCount,
            winnerShare: winnerDenominator ? winnerCount / winnerDenominator : 0
        };
    }).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}
export function technologyFrequencies(rows) {
    const all = rows.flatMap(row => [...new Set(row.purchasedTechnologyIds)]);
    const winners = rows.filter(row => row.winner).flatMap(row => [...new Set(row.purchasedTechnologyIds)]);
    return frequencyRows(all, winners, rows.length, rows.filter(row => row.winner).length);
}
export function firstBuildFrequencies(rows) {
    const all = rows.map(row => row.firstBuildTechnologyId ?? "none");
    const winners = rows.filter(row => row.winner).map(row => row.firstBuildTechnologyId ?? "none");
    return frequencyRows(all, winners, rows.length, rows.filter(row => row.winner).length);
}
export function dominantCombinationFrequencies(rows) {
    const combination = (row) => `${row.strategyId} + ${row.installedPathways.join("/") || "no-pathway"}`;
    return frequencyRows(rows.map(combination), rows.filter(row => row.winner).map(combination), rows.length, rows.filter(row => row.winner).length);
}
export function weatherWinnerRows(rows) {
    const weather = [...new Set(rows.map(row => row.firstWeather))];
    return weather.map(face => {
        const gameIndexes = new Set(rows.filter(row => row.firstWeather === face).map(row => row.gameIndex));
        const winners = rows.filter(row => row.firstWeather === face && row.winner);
        const winnerCountByContinent = {};
        for (const winner of winners)
            winnerCountByContinent[winner.continentId] = (winnerCountByContinent[winner.continentId] ?? 0) + 1;
        return { weather: face, games: gameIndexes.size, winnerCountByContinent };
    });
}
export function strategyContinentCombination(row) {
    return `${row.continentId}:${row.strategyId}`;
}
// -----------------------------------------------------------------------------
// Automatic balance flags
// -----------------------------------------------------------------------------
function flag(id, severity, title, message, measuredValue, threshold, evidence = {}) {
    return { id, severity, title, message, measuredValue, threshold, evidence };
}
export function detectBalanceFlags(rows, byContinent, technologyPurchases, weatherRows, byStrategy = []) {
    const flags = [];
    const winners = rows.filter(row => row.winner);
    const overallMean = rows.length ? rows.reduce((sum, row) => sum + row.totalLight, 0) / rows.length : 0;
    const continentMeans = byContinent.map(row => row.light.mean);
    const lightSpread = overallMean > 0 && continentMeans.length ? (Math.max(...continentMeans) - Math.min(...continentMeans)) / overallMean : 0;
    if (lightSpread > 0.1)
        flags.push(flag("continent-light-spread", lightSpread > 0.2 ? "critical" : "warning", "Continental expected Light differs by more than 10%", `The gap between the highest and lowest continental mean Light is ${(lightSpread * 100).toFixed(1)}% of the overall mean.`, lightSpread, 0.1, { highestMean: continentMeans.length ? Math.max(...continentMeans) : 0, lowestMean: continentMeans.length ? Math.min(...continentMeans) : 0 }));
    const dominantTechnology = technologyPurchases.find(row => row.winnerShare > 0.7);
    if (dominantTechnology)
        flags.push(flag("winner-technology-dominance", "critical", "One technology appears in more than 70% of winning systems", `${dominantTechnology.id} appears in ${(dominantTechnology.winnerShare * 100).toFixed(1)}% of winner purchase histories.`, dominantTechnology.winnerShare, 0.7, { technologyId: dominantTechnology.id }));
    const winRates = byContinent.map(row => row.winRate);
    if (winRates.length) {
        const max = Math.max(...winRates);
        const min = Math.min(...winRates);
        const ratio = min === 0 ? (max > 0 ? Number.POSITIVE_INFINITY : 1) : max / min;
        if (ratio > 2)
            flags.push(flag("continent-win-rate-ratio", "critical", "One continent wins more than twice as often as another", min === 0 ? "At least one continent recorded no wins while another did." : `The highest win rate is ${ratio.toFixed(2)} times the lowest.`, Number.isFinite(ratio) ? ratio : 999, 2, { highestWinRate: max, lowestWinRate: min }));
    }
    if (byStrategy.length > 1) {
        const orderedStrategies = [...byStrategy].sort((a, b) => b.winRate - a.winRate);
        const strongest = orderedStrategies[0];
        const weakest = orderedStrategies.at(-1);
        const ratio = weakest.winRate === 0 ? (strongest.winRate > 0 ? Number.POSITIVE_INFINITY : 1) : strongest.winRate / weakest.winRate;
        if (ratio > 4)
            flags.push(flag("strategy-win-rate-ratio", ratio > 8 ? "critical" : "warning", "One AI strategy wins far more often than another", weakest.winRate === 0 ? `${weakest.id} recorded no wins while ${strongest.id} did.` : `${strongest.id} wins ${ratio.toFixed(2)} times as often as ${weakest.id}. This may reflect pathway balance, planning quality or both.`, Number.isFinite(ratio) ? ratio : 999, 4, { strongestStrategy: strongest.id, strongestWinRate: strongest.winRate, weakestStrategy: weakest.id, weakestWinRate: weakest.winRate }));
    }
    const knowledgeGain = rows.reduce((sum, row) => sum + row.knowledgeGained, 0);
    if (knowledgeGain === 0)
        flags.push(flag("knowledge-unused", "warning", "Knowledge is never researched", "No simulated player gained permanent Knowledge.", 0, 1));
    const trades = rows.reduce((sum, row) => sum + row.tradesCompleted, 0);
    const tradeRate = rows.length ? trades / rows.length : 0;
    if (tradeRate < 0.05)
        flags.push(flag("trade-rare", "warning", "Direct trade is rarely used", `Direct trade averaged ${tradeRate.toFixed(3)} completed trades per player-game.`, tradeRate, 0.05));
    const imports = rows.reduce((sum, row) => sum + row.importsCompleted, 0);
    if (imports > Math.max(5, trades * 3))
        flags.push(flag("public-import-dominance", "warning", "Public import may dominate direct trade", `Simulations recorded ${imports} imports compared with ${trades} player-side direct trade records.`, trades === 0 ? imports : imports / trades, 3, { imports, trades }));
    const fossilPressureRate = rows.length ? rows.filter(row => row.fossilPressureReached).length / rows.length : 0;
    if (fossilPressureRate < 0.2)
        flags.push(flag("fossil-pressure-rare", "warning", "Fossil depletion pressure is rarely reached", `Only ${(fossilPressureRate * 100).toFixed(1)}% of player-games used at least one quarter of their printed local fuel reserve.`, fossilPressureRate, 0.2));
    const biomassRegrowthMean = rows.length ? rows.reduce((sum, row) => sum + row.biomassRegrown, 0) / rows.length : 0;
    if (biomassRegrowthMean < 0.1)
        flags.push(flag("biomass-regrowth-low", "warning", "Biomass regrowth has almost no effect", `Mean Biomass regrowth is ${biomassRegrowthMean.toFixed(3)} units per player-game.`, biomassRegrowthMean, 0.1));
    const winnersWithStorage = winners.filter(row => row.storageUsed).length;
    const storageWinnerShare = winners.length ? winnersWithStorage / winners.length : 0;
    if (storageWinnerShare > 0.9)
        flags.push(flag("storage-mandatory", "critical", "Storage appears mandatory", `${(storageWinnerShare * 100).toFixed(1)}% of winning systems demonstrably used or retained storage.`, storageWinnerShare, 0.9));
    let strongestWeatherPrediction = 0;
    let strongestWeather = "";
    for (const row of weatherRows) {
        const totalWinners = Object.values(row.winnerCountByContinent).reduce((sum, count) => sum + (count ?? 0), 0);
        if (totalWinners === 0)
            continue;
        const topShare = Math.max(...Object.values(row.winnerCountByContinent).map(value => value ?? 0)) / totalWinners;
        if (topShare > strongestWeatherPrediction) {
            strongestWeatherPrediction = topShare;
            strongestWeather = row.weather;
        }
    }
    if (strongestWeatherPrediction > 0.6)
        flags.push(flag("first-weather-predictive", "warning", "The first Weather roll strongly predicts the winner", `Under ${strongestWeather}, one continent accounts for ${(strongestWeatherPrediction * 100).toFixed(1)}% of winners.`, strongestWeatherPrediction, 0.6, { weather: strongestWeather }));
    if (flags.length === 0)
        flags.push(flag("no-threshold-flags", "info", "No configured balance threshold was crossed", "This batch did not trigger the initial automatic warnings. Larger samples may still reveal issues.", 0, null));
    return flags;
}
// -----------------------------------------------------------------------------
// Batch simulation
// -----------------------------------------------------------------------------
function playersForGame(config, scenario, gameIndex) {
    const strategyAssignments = strategyForGame(scenario.assignments, gameIndex, scenario.assignmentMode);
    const assignments = seatOrderForGame(strategyAssignments, gameIndex, scenario.seatAssignmentMode);
    return assignments.map((assignment, index) => {
        const continent = config.continents.find(item => item.id === assignment.continentId);
        if (!continent)
            throw new Error(`Unknown simulation continent ${assignment.continentId}.`);
        return {
            id: `p${index + 1}`,
            name: `${continent.name} · ${assignment.strategyId}`,
            continentId: assignment.continentId,
            controller: { kind: "ai", strategy: assignment.strategyId, difficulty: scenario.aiDifficulty }
        };
    });
}
export function validateSimulationScenario(config, scenario) {
    const errors = [];
    if (!Number.isInteger(scenario.games) || scenario.games < 1 || scenario.games > 10000)
        errors.push("Simulation games must be an integer from 1 to 10,000.");
    if (!scenario.baseSeed.trim())
        errors.push("Simulation seed cannot be empty.");
    if (scenario.assignments.length < 1 || scenario.assignments.length > 6)
        errors.push("Simulation requires one to six assignments.");
    if (new Set(scenario.assignments.map(item => item.continentId)).size !== scenario.assignments.length)
        errors.push("Simulation continents must be unique.");
    if (scenario.localConditionSeverity < 0 || scenario.localConditionSeverity > 2)
        errors.push("Local Condition severity must be between 0 and 2.");
    if (!Number.isInteger(scenario.actionsPerGeneration) || scenario.actionsPerGeneration < 1 || scenario.actionsPerGeneration > 4)
        errors.push("Actions per Generation must be an integer from 1 to 4.");
    if (!Number.isFinite(scenario.aiTradeUtilityThreshold) || scenario.aiTradeUtilityThreshold < 0 || scenario.aiTradeUtilityThreshold > 5)
        errors.push("AI trade utility threshold must be between 0 and 5.");
    if (!Number.isInteger(scenario.aiDirectTradeCadence) || scenario.aiDirectTradeCadence < 1 || scenario.aiDirectTradeCadence > 8)
        errors.push("AI direct-trade cadence must be an integer from 1 to 8.");
    for (const assignment of scenario.assignments)
        if (!config.continents.some(item => item.id === assignment.continentId))
            errors.push(`Unknown continent ${assignment.continentId}.`);
    return errors;
}
export function runSimulationBatch(baseConfig, scenario, onProgress) {
    const errors = validateSimulationScenario(baseConfig, scenario);
    if (errors.length)
        throw new Error(`Invalid simulation scenario:\n${errors.join("\n")}`);
    const effectiveConfig = applySimulationScenario(baseConfig, scenario);
    const results = [];
    const progressInterval = Math.max(1, Math.floor(scenario.games / 100));
    for (let gameIndex = 0; gameIndex < scenario.games; gameIndex++) {
        const seed = `${scenario.baseSeed}::${gameIndex}`;
        const playerSetups = playersForGame(effectiveConfig, scenario, gameIndex);
        const initialFirstPlayerIndex = scenario.randomizeInitialFirstPlayer
            ? randomInt(createRandomState(`${seed}::initial-first-player`).streams.simulation, playerSetups.length)
            : 0;
        const state = runAutomatedGame(effectiveConfig, seed, playerSetups, false, {
            aiTradeUtilityThreshold: scenario.aiTradeUtilityThreshold,
            aiDirectTradeCadence: scenario.aiDirectTradeCadence
        }, initialFirstPlayerIndex, { openingMode: scenario.openingMode ?? effectiveConfig.opening?.defaultMode ?? "energySummit" });
        results.push(...extractPlayerResults(state, gameIndex));
        if (onProgress && ((gameIndex + 1) % progressInterval === 0 || gameIndex + 1 === scenario.games)) {
            onProgress({ completed: gameIndex + 1, total: scenario.games, fraction: (gameIndex + 1) / scenario.games });
        }
    }
    const byContinent = aggregateByContinent(results);
    const byStrategy = aggregateByStrategy(results);
    const byPathway = aggregateByPathway(results);
    const continentPathway = aggregateContinentPathway(results);
    const technologyPurchases = technologyFrequencies(results);
    const firstBuildChoices = firstBuildFrequencies(results);
    const dominantStrategyCombinations = dominantCombinationFrequencies(results);
    const weatherRows = weatherWinnerRows(results);
    const flags = detectBalanceFlags(results, byContinent, technologyPurchases, weatherRows, byStrategy);
    return {
        reportVersion: "1.0.0",
        generatedAtIso: new Date().toISOString(),
        scenario: structuredClone(scenario),
        effectiveConfig,
        effectiveConfigHash: configHash(effectiveConfig),
        gamesCompleted: scenario.games,
        playerResults: results,
        byContinent,
        byStrategy,
        byPathway,
        continentPathway,
        technologyPurchases,
        firstBuildChoices,
        dominantStrategyCombinations,
        weatherWinnerRows: weatherRows,
        flags,
        totals: {
            trades: results.reduce((sum, row) => sum + row.tradesCompleted, 0) / 2,
            imports: results.reduce((sum, row) => sum + row.importsCompleted, 0),
            appliedLearningGained: results.reduce((sum, row) => sum + row.appliedLearningGained, 0),
            fossilFuelConsumed: results.reduce((sum, row) => sum + row.fossilFuelConsumed, 0),
            biomassRegrown: results.reduce((sum, row) => sum + row.biomassRegrown, 0),
            fossilOnlyWins: results.filter(row => row.fossilOnlyWinner).length,
            biomassSelectedWins: results.filter(row => row.biomassSelectedWinner).length,
            illegalActionAttempts: results.reduce((sum, row) => sum + row.illegalActionAttempts, 0),
            resourceDeadlockGames: new Set(results.filter(row => row.resourceDeadlock).map(row => row.gameIndex)).size
        }
    };
}
// -----------------------------------------------------------------------------
// Matched trade-mode comparison
// -----------------------------------------------------------------------------
const tradeModes = ["directAndImport", "publicImportOnly", "disabled"];
export function runTradeModeComparison(baseConfig, baseScenario, onProgress) {
    const reports = {};
    const total = baseScenario.games * tradeModes.length;
    let completedBeforeMode = 0;
    for (const tradeMode of tradeModes) {
        const scenario = { ...structuredClone(baseScenario), tradeMode };
        reports[tradeMode] = runSimulationBatch(baseConfig, scenario, progress => {
            onProgress?.({
                completed: completedBeforeMode + progress.completed,
                total,
                fraction: (completedBeforeMode + progress.completed) / total
            });
        });
        completedBeforeMode += baseScenario.games;
    }
    const rows = tradeModes.map(tradeMode => {
        const report = reports[tradeMode];
        const playerCount = report.playerResults.length;
        const gameCount = report.gamesCompleted;
        return {
            tradeMode,
            meanLight: playerCount ? report.playerResults.reduce((sum, row) => sum + row.totalLight, 0) / playerCount : 0,
            meanReliability: playerCount ? report.playerResults.reduce((sum, row) => sum + row.reliableGenerations, 0) / playerCount : 0,
            meanSystemLoss: playerCount ? report.playerResults.reduce((sum, row) => sum + row.systemLoss, 0) / playerCount : 0,
            meanCurtailment: playerCount ? report.playerResults.reduce((sum, row) => sum + row.curtailment, 0) / playerCount : 0,
            tradesPerGame: gameCount ? report.totals.trades / gameCount : 0,
            importsPerGame: gameCount ? report.totals.imports / gameCount : 0,
            criticalFlagCount: report.flags.filter(flag => flag.severity === "critical").length,
            warningFlagCount: report.flags.filter(flag => flag.severity === "warning").length
        };
    });
    return {
        reportVersion: "1.0.0",
        generatedAtIso: new Date().toISOString(),
        gamesPerMode: baseScenario.games,
        baseScenario: structuredClone(baseScenario),
        rows,
        reports
    };
}
// -----------------------------------------------------------------------------
// CSV export
// -----------------------------------------------------------------------------
function escapeCsv(value) {
    if (value === null || value === undefined)
        return "";
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function rowsToCsv(rows) {
    if (rows.length === 0)
        return "";
    const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
    return [headers.join(","), ...rows.map(row => headers.map(header => escapeCsv(row[header])).join(","))].join("\n");
}
export function playerResultsToCsv(results) {
    return rowsToCsv(results.map(row => ({
        ...row,
        purchasedTechnologyIds: row.purchasedTechnologyIds.join("|"),
        installedPathways: row.installedPathways.join("|")
    })));
}
function aggregateFlat(row) {
    return {
        id: row.id,
        games: row.games,
        lightMean: row.light.mean,
        lightMedian: row.light.median,
        lightP10: row.light.p10,
        lightP90: row.light.p90,
        lightMinimum: row.light.minimum,
        lightMaximum: row.light.maximum,
        winRate: row.winRate,
        reliabilityMean: row.reliabilityMean,
        demandMetMean: row.demandMetMean,
        finalDemandMetRate: row.finalDemandMetRate,
        systemLossMean: row.systemLossMean,
        curtailmentMean: row.curtailmentMean,
        storedEnergyMean: row.storedEnergyMean,
        tradeMean: row.tradeMean,
        importMean: row.importMean,
        knowledgeGainMean: row.knowledgeGainMean,
        appliedLearningGainMean: row.appliedLearningGainMean
    };
}
export function aggregateReportToCsv(report) {
    const rows = [
        ...report.byContinent.map(row => ({ group: "continent", ...aggregateFlat(row) })),
        ...report.byStrategy.map(row => ({ group: "strategy", ...aggregateFlat(row) }))
    ];
    return rowsToCsv(rows);
}
export function balanceFlagsToCsv(report) {
    return rowsToCsv(report.flags.map(item => ({
        id: item.id,
        severity: item.severity,
        title: item.title,
        message: item.message,
        measuredValue: item.measuredValue,
        threshold: item.threshold,
        evidence: item.evidence
    })));
}
// -----------------------------------------------------------------------------
// JSON export
// -----------------------------------------------------------------------------
export function simulationReportToJson(report, pretty = true) {
    return JSON.stringify(report, null, pretty ? 2 : 0);
}

