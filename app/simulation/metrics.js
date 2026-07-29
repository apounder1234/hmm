import { getTechnology, resourceTypes, totalLoss } from "../engine/helpers.js";
import { usableStoredEnergy } from "../engine/scoring/scoring.js";
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
            if (event.data?.aId === playerId) { addBundle(exported, event.data.aGives); addBundle(imported, event.data.bGives); }
            if (event.data?.bId === playerId) { addBundle(exported, event.data.bGives); addBundle(imported, event.data.aGives); }
        }
        if (event.type === "knowledgeLink.used") {
            const bundle = { [event.data?.paymentResource]: 1 };
            if (event.data?.borrowerId === playerId) addBundle(exported, bundle);
            if (event.data?.lenderId === playerId) addBundle(imported, bundle);
        }
        if (event.type === "action.import" && event.actorId === playerId)
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
    const allBuildInputsExhausted = Object.values(state.players).every(player =>
        player.resources.constructionMaterials.currentContinent + player.resources.constructionMaterials.warehouse === 0
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
            if (event.type !== "action.build") return false;
            const technology = state.config.technologies.find(item => item.id === event.data?.technologyId);
            return technology && technology.tier !== "basic";
        });
        const firstLightGeneration = Object.entries(player.lightByGeneration).filter(([, value]) => value > 0).map(([generation]) => Number(generation)).sort((a,b) => a-b)[0] ?? null;
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
            importsCompleted: eventCount(state, player.id, "action.import"),
            summitTrades: player.summitTrades ?? 0,
            resourcesImported: flows.imported,
            resourcesExported: flows.exported,
            knowledgeLinksReceived: state.log.filter(event => event.type === "knowledgeLink.used" && event.data?.borrowerId === player.id).length,
            knowledgeLinksProvided: state.log.filter(event => event.type === "knowledgeLink.used" && event.data?.lenderId === player.id).length,
            knowledgeLinkIncome: metrics.reduce((sum, metric) => sum + (metric.knowledgeLinkIncome ?? 0), 0),
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
        knowledgeLinkReceivedMean: rows.length ? rows.reduce((sum, row) => sum + row.knowledgeLinksReceived, 0) / rows.length : 0,
        knowledgeLinkProvidedMean: rows.length ? rows.reduce((sum, row) => sum + row.knowledgeLinksProvided, 0) / rows.length : 0,
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
//# sourceMappingURL=metrics.js.map