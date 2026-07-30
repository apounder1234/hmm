// @ts-check
// SUNPATHS organised source. Each section has one named responsibility.
import { shuffle, pick } from "./random.js";
// -----------------------------------------------------------------------------
// Shared resources, Energy and lookup helpers
// -----------------------------------------------------------------------------
export const resourceTypes = ["fossilFuel", "biomass", "constructionMaterials", "criticalMaterials"];
export const pathways = ["solar", "wind", "hydro", "biomass", "fossil"];
export function emptyResources() { return { fossilFuel: 0, biomass: 0, constructionMaterials: 0, criticalMaterials: 0 }; }
export function emptyEnergy() { return { solar: 0, wind: 0, hydro: 0, biomass: 0, fossil: 0 }; }
export function emptyMetrics(target) { return { grossEnergy: emptyEnergy(), deliveredLight: 0, reliabilityTarget: target, reliabilityMet: false, reliabilityPointEarned: false, reliabilityPointCapped: false, systemLoss: { thermal: 0, battery: 0, lighting: 0, other: 0 }, curtailed: 0, storedEnd: 0, fuelConsumed: {}, resourcesExtracted: {}, tradesCompleted: 0, importsCompleted: 0, resourcesImported: {}, resourcesExported: {}, knowledgeGained: 0, appliedLearningGained: 0, appliedLearningSpent: 0, continentAbilityValue: 0, continentAbilityActivations: 0, continentPenaltyActivations: 0, biomassRegrown: 0, circularRecovery: null, fossilChain: null, technologiesBuilt: [] }; }
export function getTechnology(state, id) {
    const t = state.config.technologies.find(x => x.id === id);
    if (!t)
        throw new Error(`Unknown technology ${id}`);
    return t;
}
export function getPlayer(state, id) {
    const p = state.players[id];
    if (!p)
        throw new Error(`Unknown player ${id}`);
    return p;
}
export function totalLoss(p) { return p.cumulative.systemLoss.thermal + p.cumulative.systemLoss.battery + p.cumulative.systemLoss.lighting + p.cumulative.systemLoss.other; }
export function totalEnergy(e) { return pathways.reduce((n, p) => n + (e[p] ?? 0), 0); }
export function warehouseTotal(player) { return resourceTypes.reduce((sum, resource) => sum + (player.resources[resource]?.warehouse ?? 0), 0); }
export function addEnergy(target, source, multiplier = 1) {
    for (const p of pathways)
        target[p] += (source[p] ?? 0) * multiplier;
}
export function clone(v) { return structuredClone(v); }
export function log(state, type, message, actorId = null, data) {
    state.log.push({ sequence: state.log.length + 1, generation: state.generation, phase: state.phase, actorId, type, message, ...(data ? { data } : {}) });
}
export function countInstalled(player, technologyId) { return player.installed.filter(x => x.technologyId === technologyId).length; }
export function hasTechnology(player, technologyId) { return countInstalled(player, technologyId) > 0; }
export function installedConfigs(state, player) { return player.installed.map(i => getTechnology(state, i.technologyId)); }
export function fossilChainSnapshot(state, player) {
    const rules = state.config.fossilEnergyChain;
    const enhancedRecovery = hasTechnology(player, "enhancedOilRecovery");
    const combinedCycle = hasTechnology(player, "combinedCycle");
    const carbonCapture = hasTechnology(player, "carbonCapturePlant");
    const grossEnergy = enhancedRecovery ? rules.enhancedRecoveryGrossEnergy : rules.baseGrossEnergy;
    const storageLoss = rules.storageLoss;
    const transformationLoss = combinedCycle ? rules.combinedCycleTransformationLoss : rules.legacyTransformationLoss;
    const afterStorage = Math.max(0, grossEnergy - storageLoss);
    const afterTransformation = Math.max(0, afterStorage - transformationLoss);
    return { grossEnergy, storageLoss, afterStorage, transformationLoss, afterTransformation, enhancedRecovery, combinedCycle, carbonCapture };
}
export function fuelPlantMaximumOutput(state, player, technology) {
    if (technology.pathway === "fossil" && technology.fossilRole === "legacyPlant")
        return fossilChainSnapshot(state, player).afterTransformation;
    return technology.maximumOutput ?? 0;
}
export function regionalExtractionYield(state, player, resource) {
    const profile = getContinentProfile(state, player);
    const normalYield = state.config.resources?.normalExtractionYield ?? 1;
    return profile.resourceRule?.kind === "extraction" && profile.resourceRule.resource === resource
        ? profile.resourceRule.yield
        : normalYield;
}
export function gatherAmount(state, player, resource) {
    const account = player.resources[resource];
    if (!account)
        throw new Error(`Unknown resource ${resource}.`);
    const yieldAmount = regionalExtractionYield(state, player, resource);
    const warehouseRoom = Math.max(0, state.config.rules.warehouseMaximum - warehouseTotal(player));
    return Math.max(0, Math.min(yieldAmount, account.currentContinent, warehouseRoom));
}
export function assertIntegerNonnegative(value, label) {
    if (!Number.isInteger(value) || value < 0)
        throw new Error(`${label} must be a non-negative integer.`);
}
// -----------------------------------------------------------------------------
// Local Condition rules
// -----------------------------------------------------------------------------
export function getCondition(state, id) {
    const c = state.config.localConditions.find(x => x.id === id);
    if (!c)
        throw new Error(`Unknown Local Condition ${id}`);
    return c;
}
function rebuildDeck(state) {
    const cards = state.config.localConditions.flatMap(def => Array.from({ length: def.copies }, (_, i) => ({ cardId: `${def.id}-${i + 1}`, definitionId: def.id })));
    state.localConditions.drawPile = shuffle(cards, state.rng.streams.conditions);
    state.localConditions.discardPile = [];
    state.localConditions.resetAtGenerationFive = true;
    log(state, "conditions.reset", "The complete Local Condition deck was rebuilt and reshuffled for Generation 5.");
}
export function drawLocalConditions(state) {
    if (state.phase !== "generation.localConditions")
        throw new Error("Local Conditions cannot be drawn in this phase.");
    if (state.generation === 5 && !state.localConditions.resetAtGenerationFive)
        rebuildDeck(state);
    const order = [...state.turnOrder.slice(state.firstPlayerIndex), ...state.turnOrder.slice(0, state.firstPlayerIndex)];
    for (const playerId of order) {
        const card = state.localConditions.drawPile.shift();
        if (!card)
            throw new Error("Local Condition deck unexpectedly empty.");
        const p = state.players[playerId];
        const def = getCondition(state, card.definitionId);
        p.localCondition = { cardId: card.cardId, definitionId: card.definitionId, adapted: false, triggered: false, selectedTechnologyInstanceId: null };
        if (def.effect.kind === "temporaryKnowledge")
            p.temporaryKnowledge += def.effect.amount;
        log(state, "condition.drawn", `${p.name} received ${def.name}.`, p.id, { condition: def.id });
    }
    state.phase = "generation.development";
    state.actionRound = 1;
    state.activeTurnIndex = state.firstPlayerIndex;
}
export function discardCurrentConditions(state) {
    for (const p of Object.values(state.players)) {
        if (p.localCondition) {
            const definition = getCondition(state, p.localCondition.definitionId);
            if (definition.effect.kind === "temporaryKnowledge")
                p.temporaryKnowledge = Math.max(0, p.temporaryKnowledge - definition.effect.amount);
            state.localConditions.discardPile.push({ cardId: p.localCondition.cardId, definitionId: p.localCondition.definitionId });
            p.localCondition = null;
        }
    }
}
export function conditionApplies(state, player) {
    if (!player.localCondition || player.localCondition.adapted)
        return null;
    return getCondition(state, player.localCondition.definitionId);
}
export function hasRelevantSystem(state, player, kind) {
    switch (kind) {
        case "hydroDelta": return hasTechnology(player, "basicReservoir") || hasTechnology(player, "advancedReservoir") || hasTechnology(player, "advancedHydroTurbine");
        case "windDelta": return player.installed.some(i => getTechnology(state, i.technologyId).pathway === "wind");
        case "solarDelta": return player.installed.some(i => getTechnology(state, i.technologyId).pathway === "solar");
        case "biomassRegrowthDelta":
        case "biomassRegrowthSet": return player.installed.some(i => (getTechnology(state, i.technologyId).biomassRegrowth ?? 0) > 0);
        case "gridCapacityDelta": return true;
        case "firstFuelPlantOutputDelta": return player.installed.some(i => Boolean(getTechnology(state, i.technologyId).fuel));
        case "firstBuildConstructionDelta": return true;
        case "storageRecoveryBonus": return player.installed.some(i => getTechnology(state, i.technologyId).storage?.type === "battery");
        case "temporaryKnowledge": return true;
        case "demandTargetDelta":
        case "lightMaximumDelta": return true;
    }
}
// -----------------------------------------------------------------------------
// Continent affinities, costs and abilities
// -----------------------------------------------------------------------------
const tierIndex = { basic: 0, intermediate: 1, advanced: 2 };
const resourceLabels = { constructionMaterials: "Other Material", criticalMaterials: "Critical Mineral" };
export function getContinentProfile(state, playerOrContinentId) {
    const continentId = typeof playerOrContinentId === "string" && state.players?.[playerOrContinentId]
        ? state.players[playerOrContinentId].continentId
        : typeof playerOrContinentId === "string"
            ? playerOrContinentId
            : playerOrContinentId.continentId;
    const profile = state.config.continents.find(item => item.id === continentId);
    if (!profile)
        throw new Error(`Unknown continent ${continentId}.`);
    return profile;
}
export function getTechnologyTierIndex(technology) {
    const index = tierIndex[technology.tier];
    if (index === undefined)
        throw new Error(`${technology.name} has an unknown technology tier.`);
    return index;
}
export function getTechnologyLevel(technology) {
    return getTechnologyTierIndex(technology) + 1;
}
export function getPathwayAffinity(state, playerOrContinentId, technology) {
    const profile = getContinentProfile(state, playerOrContinentId);
    if (technology.pathway !== "shared")
        return profile.pathwayAffinity?.[technology.pathway] ?? "standard";
    if (technology.stage === "transport")
        return profile.systemAffinity?.transmission ?? "standard";
    if (technology.stage === "storage")
        return profile.systemAffinity?.storage ?? "standard";
    if (technology.stage === "lighting" || technology.stage === "efficiency")
        return profile.systemAffinity?.lighting ?? "standard";
    return "standard";
}
export function getKnowledgeRequirement(state, playerOrContinentId, technologyOrId) {
    const technology = typeof technologyOrId === "string" ? getTechnology(state, technologyOrId) : technologyOrId;
    const thresholds = state.config.affinityThresholds;
    if (!thresholds)
        return technology.knowledgeRequired;
    const affinity = getPathwayAffinity(state, playerOrContinentId, technology);
    const values = thresholds[affinity];
    return values?.[getTechnologyTierIndex(technology)] ?? technology.knowledgeRequired;
}
function addModifier(result, resource, amount, label, id) {
    if (!amount)
        return;
    result.final[resource] = Math.max(0, result.final[resource] + amount);
    result.modifiers.push({ id, label, resource, amount });
}
export function getEffectiveUpgradeCost(state, playerId, technologyOrId, options = {}) {
    const player = getPlayer(state, playerId);
    const technology = typeof technologyOrId === "string" ? getTechnology(state, technologyOrId) : technologyOrId;
    const profile = getContinentProfile(state, player);
    const result = {
        base: { constructionMaterials: technology.cost.constructionMaterials, criticalMaterials: technology.cost.criticalMaterials },
        final: { constructionMaterials: technology.cost.constructionMaterials, criticalMaterials: technology.cost.criticalMaterials },
        modifiers: [],
        knowledgeRequired: getKnowledgeRequirement(state, player, technology),
        effectiveKnowledge: player.knowledge + player.temporaryKnowledge,
        usesPreparedPathway: false,
        usesPreparedCapability: false,
        consumesLockIn: false,
        affinity: getPathwayAffinity(state, player, technology)
    };
    const allowPrepared = options.allowPreparedPathway !== false;
    const deferredBlueprint = allowPrepared && player.prepared.pathwayId && !player.prepared.pathwayUsed && player.prepared.foundingProjectDeferred && technology.pathway === player.prepared.pathwayId;
    const fossilBlueprint = allowPrepared && technology.id === "combinedCycle" && player.prepared.fossilBlueprintAvailable;
    if (deferredBlueprint || fossilBlueprint) {
        addModifier(result, "constructionMaterials", -1, "Starting Pathway Blueprint", "preparedPathway");
        result.effectiveKnowledge += 1;
        result.usesPreparedPathway = true;
    }
    if (player.prepared.capabilityId && !player.prepared.capabilityUsed) {
        if (player.prepared.capabilityId === "storage" && technology.stage === "storage") {
            addModifier(result, "criticalMaterials", -1, "Prepared Storage", "preparedStorage");
            result.usesPreparedCapability = true;
        }
        if (player.prepared.capabilityId === "efficiency" && technology.stage === "efficiency") {
            addModifier(result, "criticalMaterials", -1, "Prepared Efficiency", "preparedEfficiency");
            result.usesPreparedCapability = true;
        }
    }
    const condition = conditionApplies(state, player);
    if (condition?.effect.kind === "firstBuildConstructionDelta" && !player.localCondition?.triggered)
        addModifier(result, "constructionMaterials", condition.effect.amount, condition.name, "materialsShortage");
    if (profile.id === "europe" && ["advancedSolar", "advancedWind", "advancedBattery"].includes(technology.id))
        addModifier(result, "criticalMaterials", 1, "Europe advanced-system import dependency", "europeImportedInputs");
    if (["northAmerica", "australia"].includes(profile.id) && ["gridUpgrade", "smartGrid"].includes(technology.id))
        addModifier(result, "constructionMaterials", 1, profile.id === "northAmerica" ? "North America Grid construction" : "Australia long-distance Grid", `${profile.id}TransmissionPenalty`);
    const isAdvancedGeneration = technology.tier === "advanced" && ["solar", "wind", "hydro", "biomass"].includes(technology.pathway);
    if ((player.lockInTokens ?? 0) > 0 && isAdvancedGeneration) {
        addModifier(result, "constructionMaterials", 1, "Asia Fossil Lock-In", "asiaLockIn");
        result.consumesLockIn = true;
    }
    return result;
}
export function applyCompletedUpgradeConsequences(state, playerId, technologyOrId, costResult) {
    const player = getPlayer(state, playerId);
    const technology = typeof technologyOrId === "string" ? getTechnology(state, technologyOrId) : technologyOrId;
    const profile = getContinentProfile(state, player);
    if (costResult.consumesLockIn)
        player.lockInTokens = 0;
    if (profile.id === "asia" && technology.pathway === "fossil" && technology.tier !== "basic")
        player.lockInTokens = 1;
}
export function signatureWeatherMatches(state, playerOrId, pathway) {
    const profile = getContinentProfile(state, playerOrId);
    if (profile.signatureRenewable !== pathway)
        return false;
    return (state.config.renewableSignatureWeather?.[pathway] ?? []).includes(state.weather.current);
}
export function getContinentGenerationModifiers(state, playerId, pathway) {
    const player = getPlayer(state, playerId);
    const profile = getContinentProfile(state, player);
    const matched = ["solar", "wind", "hydro"].includes(pathway) && signatureWeatherMatches(state, player, pathway);
    return { generationBonus: matched ? 1 : 0, hydroDelta: matched && pathway === "hydro" ? 1 : 0, abilityId: matched ? `${profile.signatureRenewable}Signature` : null };
}
export function getTransmissionLevel(state, playerId) {
    const player = getPlayer(state, playerId);
    if (hasTechnology(player, "smartGrid"))
        return 3;
    if (hasTechnology(player, "gridUpgrade"))
        return 2;
    return 1;
}
export function getLightingLevel(state, playerId) {
    return hasTechnology(getPlayer(state, playerId), "efficientLighting") ? 2 : 1;
}
export function getStartingTechnologyIds(state, continent) {
    const ids = [];
    ids.push(continent.startingTransmissionLevel >= 2 ? "gridUpgrade" : "basicGrid");
    ids.push(continent.startingLightingLevel >= 2 ? "efficientLighting" : "standardLighting");
    if ((continent.startingFossilLevel ?? 0) >= 1)
        ids.push("basicFossilPlant");
    return ids;
}
export function validateStartingResourceTotals(config) {
    const errors = [];
    for (const continent of config.continents) {
        const warehouse = Object.values(continent.startingWarehouse).reduce((sum, value) => sum + value, 0);
        const total = Object.values(continent.printedResources).reduce((sum, value) => sum + value, 0);
        if (warehouse !== config.rules.openingWarehouseSize)
            errors.push(`${continent.name} Warehouse total is ${warehouse}, expected ${config.rules.openingWarehouseSize}.`);
        if (total !== 35)
            errors.push(`${continent.name} total regional stock is ${total}, expected 35.`);
    }
    return errors;
}
export function describeCostModifiers(cost) {
    return cost.modifiers.map(modifier => `${modifier.label}: ${modifier.amount > 0 ? "+" : ""}${modifier.amount} ${resourceLabels[modifier.resource]}${Math.abs(modifier.amount) === 1 ? "" : "s"}`);
}
// -----------------------------------------------------------------------------
// Weather progression
// -----------------------------------------------------------------------------
export function rollWeather(state) { return pick(state.config.weather.faces, state.rng.streams.weather); }
export function setSummitForecast(state) {
    if (state.phase !== "setup.preparedSelection")
        throw new Error("The Summit forecast can only be rolled during hidden-plan setup.");
    if (state.weather.forecast)
        return state.weather.forecast;
    state.weather.forecast = rollWeather(state);
    state.weather.forecastDie = "B";
    state.weather.currentDie = "A";
    log(state, "weather.summitForecast", `The public pre-Summit Forecast is ${state.weather.forecast}.`);
    return state.weather.forecast;
}
export function setInitialCurrent(state) {
    if (state.phase !== "setup.rollCurrent")
        throw new Error("Current Condition can only be rolled after the opening plans are resolved.");
    state.weather.current = rollWeather(state);
    state.weather.currentDie = "A";
    state.weather.forecastDie = "B";
    state.phase = state.weather.forecast ? "generation.start" : "setup.rollForecast";
    log(state, "weather.current", `Initial Current Condition is ${state.weather.current}.`);
}
export function setInitialForecast(state) {
    if (state.phase !== "setup.rollForecast")
        throw new Error("Forecast can only be rolled after the Current Condition.");
    state.weather.forecast = rollWeather(state);
    state.phase = "generation.start";
    log(state, "weather.forecast", `Generation 1 Forecast is ${state.weather.forecast}.`);
}
export function advanceWeather(state) {
    if (state.phase !== "generation.advanceWeather")
        throw new Error("Weather cannot advance in this phase.");
    if (state.generation >= 8)
        throw new Error("There is no weather after Generation 8.");
    const oldCurrentDie = state.weather.currentDie;
    state.weather.current = state.weather.forecast;
    state.weather.currentDie = state.weather.forecastDie;
    state.weather.history[state.generation + 1] = state.weather.current;
    if (state.generation === 7) {
        state.weather.forecast = null;
        state.weather.forecastDie = oldCurrentDie;
    }
    else {
        state.weather.forecastDie = oldCurrentDie;
        state.weather.forecast = rollWeather(state);
    }
    state.generation += 1;
    state.phase = "generation.start";
    log(state, "weather.advanced", `Forecast became Current for Generation ${state.generation}.`, null, { current: state.weather.current, forecast: state.weather.forecast });
}
// -----------------------------------------------------------------------------
// Scoring and ranking
// -----------------------------------------------------------------------------
export function usableStoredEnergy(state, playerId) {
    const p = state.players[playerId];
    let total = 0;
    for (const i of p.installed) {
        const t = getTechnology(state, i.technologyId);
        if (!t.storage)
            continue;
        const input = totalEnergy(i.storageInput);
        const table = t.storage.recovery.outputsByInput;
        total += table[Math.min(input, table.length - 1)] ?? 0;
    }
    return total;
}
export function finalRanking(state) {
    const finalGeneration = state.config.rules.generations;
    const finalWindow = [Math.max(1, finalGeneration - 1), finalGeneration];
    const finalDemandMet = player => finalWindow.some(generation => (player.lightByGeneration[generation] ?? 0) >= (state.config.demand.reliabilityTargets[generation] ?? state.config.demand.maximumLight));
    const rows = Object.values(state.players).map(p => ({ playerId: p.id, totalLight: p.cumulative.totalLight, reliableGenerations: p.cumulative.reliableGenerations, demandMetGenerations: p.cumulative.demandMetGenerations ?? 0, finalDemandMet: finalDemandMet(p), systemLoss: totalLoss(p), usableStoredEnergy: usableStoredEnergy(state, p.id) }));
    rows.sort((a, b) => Number(b.finalDemandMet) - Number(a.finalDemandMet) || b.reliableGenerations - a.reliableGenerations || b.demandMetGenerations - a.demandMetGenerations || b.totalLight - a.totalLight || a.systemLoss - b.systemLoss || b.usableStoredEnergy - a.usableStoredEnergy || a.playerId.localeCompare(b.playerId));
    const result = [];
    let rank = 1;
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const prev = rows[i - 1];
        if (i > 0 && prev && (r.finalDemandMet !== prev.finalDemandMet || r.reliableGenerations !== prev.reliableGenerations || r.demandMetGenerations !== prev.demandMetGenerations || r.totalLight !== prev.totalLight || r.systemLoss !== prev.systemLoss || r.usableStoredEnergy !== prev.usableStoredEnergy))
            rank = i + 1;
        result.push({ ...r, rank, sharedRank: false });
    }
    const counts = new Map();
    for (const r of result)
        counts.set(r.rank, (counts.get(r.rank) ?? 0) + 1);
    for (const r of result)
        r.sharedRank = (counts.get(r.rank) ?? 0) > 1;
    return result;
}
// -----------------------------------------------------------------------------
// Runtime state invariants
// -----------------------------------------------------------------------------
export function invariantErrors(state) {
    const errors = [];
    for (const p of Object.values(state.players)) {
        for (const r of resourceTypes) {
            const a = p.resources[r];
            if (!Number.isInteger(a.warehouse) || a.warehouse < 0)
                errors.push(`${p.id}.${r}.warehouse invalid`);
            if (!Number.isInteger(a.currentContinent) || a.currentContinent < 0)
                errors.push(`${p.id}.${r}.currentContinent invalid`);
            const recoveryAllowance = a.recoveredToStock ?? 0;
            if (a.currentContinent > a.printedStarting + recoveryAllowance)
                errors.push(`${p.id}.${r} exceeds printed regional stock plus recorded recovery`);
        }
        if (warehouseTotal(p) > state.config.rules.warehouseMaximum)
            errors.push(`${p.id}.warehouse total exceeds ${state.config.rules.warehouseMaximum}`);
        if (!Number.isInteger(p.knowledge) || p.knowledge < 1 || p.knowledge > state.config.rules.knowledgeMaximum)
            errors.push(`${p.id}.knowledge invalid`);
        if (p.actionsRemaining < 0 || p.actionsRemaining > state.config.rules.actionsPerGeneration)
            errors.push(`${p.id}.actions invalid`);
        const summitMaximum = state.config.opening?.summitMaximumTradesPerPlayer ?? 2;
        if (!Number.isInteger(p.summitTrades ?? 0) || (p.summitTrades ?? 0) < 0 || (p.summitTrades ?? 0) > summitMaximum)
            errors.push(`${p.id}.summitTrades invalid`);
        const appliedMaximum = state.config.rules.appliedLearningTokenMaximum ?? 2;
        if (!Number.isInteger(p.appliedLearningTokens ?? 0) || (p.appliedLearningTokens ?? 0) < 0 || (p.appliedLearningTokens ?? 0) > appliedMaximum)
            errors.push(`${p.id}.appliedLearningTokens invalid`);
        if (!Number.isInteger(p.lockInTokens ?? 0) || (p.lockInTokens ?? 0) < 0 || (p.lockInTokens ?? 0) > 1)
            errors.push(`${p.id}.lockInTokens invalid`);
        if (p.circularRecovery && ![null, "constructionMaterials", "criticalMaterials"].includes(p.circularRecovery.pendingResource ?? null))
            errors.push(`${p.id}.circularRecovery invalid`);
        const reliabilityMaximum = state.config.rules.reliabilityPointMaximum ?? 4;
        if (!Number.isInteger(p.cumulative.reliableGenerations) || p.cumulative.reliableGenerations < 0 || p.cumulative.reliableGenerations > reliabilityMaximum)
            errors.push(`${p.id}.reliabilityPoints invalid`);
        for (const [g, l] of Object.entries(p.lightByGeneration))
            if (!Number.isInteger(l) || l < 0 || l > state.config.demand.maximumLight)
                errors.push(`${p.id}.light.${g} invalid`);
        for (const i of p.installed) {
            const t = state.config.technologies.find(x => x.id === i.technologyId);
            if (!t) {
                errors.push(`${p.id}.${i.instanceId} unknown technology`);
                continue;
            }
            if (t.storage && totalEnergy(i.storageInput) > t.storage.capacity)
                errors.push(`${p.id}.${i.instanceId} exceeds storage capacity`);
        }
    }
    if (new Set(Object.values(state.players).map(p => p.continentId)).size !== Object.keys(state.players).length)
        errors.push("Duplicate continent assignment");
    if (state.weather.current && state.weather.forecast && state.weather.currentDie === state.weather.forecastDie)
        errors.push("Current and Forecast use same die");
    if (state.generation < 0 || state.generation > state.config.rules.generations)
        errors.push("Generation outside valid range");
    for (const [resource, value] of Object.entries(state.worldMarket ?? {}))
        if (!Number.isInteger(value) || value < 0)
            errors.push(`worldMarket.${resource} invalid`);
    return errors;
}
export function assertInvariants(state) {
    const errors = invariantErrors(state);
    if (errors.length)
        throw new Error(`Invariant failure:\n${errors.join("\n")}`);
}

