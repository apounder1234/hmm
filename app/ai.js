// @ts-check
// SUNPATHS organised source. Each section has one named responsibility.
import { applyCommand, applyCommandFast, canCompleteFoundingProject, currentPlayerId } from "./engine.js";
import { randomInt } from "./random.js";
import { activeGlobalEvent, conditionApplies, hasRelevantSystem, emptyEnergy, fuelPlantMaximumOutput, fossilChainSnapshot, getTechnology, hasTechnology, log, pathways, resourceTypes, totalEnergy, getContinentGenerationModifiers, getContinentProfile, getEffectiveUpgradeCost, getKnowledgeRequirement, getPathwayAffinity, getTransmissionLevel, gatherAmount, worldMarketBlocked, worldMarketRate } from "./rules.js";
import { featureEnabled, modeAllowsTechnology, defaultCapabilityForPathway } from "./modes.js";
// -----------------------------------------------------------------------------
// AI strategy profiles
// -----------------------------------------------------------------------------
const sharedStages = {
    capture: 1,
    storage: 1,
    transformation: 1,
    transport: 1,
    lighting: 1,
    efficiency: 1.25,
    research: 0.8,
    environment: 0.25
};
const sharedResources = {
    fossilFuel: 0.7,
    biomass: 0.8,
    constructionMaterials: 1.3,
    criticalMaterials: 1.5
};
export const aiStrategyProfiles = {
    solarStorage: {
        id: "solarStorage", name: "Solar and Storage", preparedPathway: "solar", preparedCapability: "storage",
        pathwayWeights: { solar: 2.4, wind: 0.9, hydro: 0.8, biomass: 0.65, fossil: 0.55 },
        stageWeights: { ...sharedStages, capture: 1.35, storage: 1.7, transport: 1.1, efficiency: 1.35 },
        resourceWeights: { ...sharedResources, criticalMaterials: 1.8 }, reliabilityWeight: 1.25, forecastWeight: 1.5,
        lossAversion: 1.2, depletionAversion: 1.1, diversificationWeight: 0.3, storageReserveTarget: 3
    },
    windGrid: {
        id: "windGrid", name: "Wind and Grid", preparedPathway: "wind", preparedCapability: "transport",
        pathwayWeights: { solar: 0.8, wind: 2.45, hydro: 0.85, biomass: 0.65, fossil: 0.55 },
        stageWeights: { ...sharedStages, capture: 1.35, storage: 1.15, transport: 1.8, efficiency: 1.25 },
        resourceWeights: { ...sharedResources }, reliabilityWeight: 1.2, forecastWeight: 1.55,
        lossAversion: 1.05, depletionAversion: 1.05, diversificationWeight: 0.35, storageReserveTarget: 2
    },
    hydroReliability: {
        id: "hydroReliability", name: "Hydro Reliability", preparedPathway: "hydro", preparedCapability: "storage",
        pathwayWeights: { solar: 0.7, wind: 0.75, hydro: 2.6, biomass: 0.7, fossil: 0.65 },
        stageWeights: { ...sharedStages, storage: 1.75, transformation: 1.45, transport: 1.15, efficiency: 1.35 },
        resourceWeights: { ...sharedResources }, reliabilityWeight: 1.65, forecastWeight: 1.35,
        lossAversion: 1.1, depletionAversion: 1.2, diversificationWeight: 0.3, storageReserveTarget: 4
    },
    biomassRenewal: {
        id: "biomassRenewal", name: "Biomass Renewal", preparedPathway: "biomass", preparedCapability: "research",
        pathwayWeights: { solar: 0.75, wind: 0.75, hydro: 0.8, biomass: 2.55, fossil: 0.45 },
        stageWeights: { ...sharedStages, capture: 1.4, transformation: 1.4, research: 1.3, efficiency: 1.3 },
        resourceWeights: { ...sharedResources, biomass: 1.55 }, reliabilityWeight: 1.4, forecastWeight: 0.7,
        lossAversion: 0.9, depletionAversion: 1.65, diversificationWeight: 0.35, storageReserveTarget: 1
    },
    fossilTempo: {
        id: "fossilTempo", name: "Fuel Bridge", preparedPathway: "fossil", preparedCapability: "transformation",
        pathwayWeights: { solar: 1.2, wind: 1.2, hydro: 0.95, biomass: 0.8, fossil: 2.2 },
        stageWeights: { ...sharedStages, capture: 1.15, transformation: 1.4, transport: 1.2, efficiency: 1.3 },
        resourceWeights: { ...sharedResources, fossilFuel: 1.3 }, reliabilityWeight: 1.55, forecastWeight: 0.8,
        lossAversion: 0.75, depletionAversion: 1.15, diversificationWeight: 0.75, storageReserveTarget: 1
    },
    diversifiedAdapter: {
        id: "diversifiedAdapter", name: "Diversified Adapter", preparedPathway: "solar", preparedCapability: "efficiency",
        pathwayWeights: { solar: 1.15, wind: 1.15, hydro: 1.15, biomass: 1.05, fossil: 0.95 },
        stageWeights: { ...sharedStages, storage: 1.25, transport: 1.25, efficiency: 1.35, research: 1.1 },
        resourceWeights: { ...sharedResources }, reliabilityWeight: 1.4, forecastWeight: 1.0,
        lossAversion: 1.15, depletionAversion: 1.3, diversificationWeight: 1.6, storageReserveTarget: 2
    }
};
// -----------------------------------------------------------------------------
// AI candidate generation and evaluation
// -----------------------------------------------------------------------------
const strategyCapability = {
    solarStorage: "storage",
    windGrid: "transport",
    hydroReliability: "storage",
    biomassRenewal: "research",
    fossilTempo: "transformation",
    diversifiedAdapter: "efficiency"
};
function openingForecastAffinity(face, pathway) {
    if (!face)
        return 0;
    if (pathway === "solar")
        return face === "brightSun" ? 1.25 : face === "storm" ? -0.8 : -0.15;
    if (pathway === "wind")
        return face === "strongWind" ? 1.25 : face === "storm" ? 0.7 : -0.1;
    if (pathway === "hydro")
        return face === "rain" ? 1.1 : face === "storm" ? 1.25 : 0;
    if (pathway === "biomass")
        return face === "rain" ? 0.45 : face === "storm" ? 0.25 : 0.15;
    return 0.2;
}
function openingProjectReadiness(state, player, pathway) {
    const prepared = state.config.preparedPathways.find(item => item.id === pathway);
    if (!prepared)
        return 0;
    const technology = getTechnology(state, prepared.foundingTechnologyId);
    const cost = getEffectiveUpgradeCost(state, player.id, technology, { allowPreparedPathway: false }).final;
    let score = 0;
    for (const resource of ["constructionMaterials", "criticalMaterials"]) {
        const deficit = Math.max(0, (cost[resource] ?? 0) - player.resources[resource].warehouse);
        if (!deficit) {
            score += 0.45;
            continue;
        }
        const publicSupply = Object.values(state.players)
            .filter(other => other.id !== player.id)
            .reduce((sum, other) => sum + other.resources[resource].warehouse, 0);
        score += publicSupply >= deficit ? -0.15 : -2.5;
    }
    if (pathway === "fossil")
        score += Math.min(1.2, player.resources.fossilFuel.warehouse * 0.35);
    if (pathway === "biomass")
        score += Math.min(1.2, player.resources.biomass.warehouse * 0.35);
    return score;
}
export function aiPrepared(strategy, state = null, player = null) {
    const profile = aiStrategyProfiles[strategy];
    if (!state || !player)
        return { pathwayId: profile.preparedPathway, capabilityId: strategyCapability[strategy] };
    const continent = getContinentProfile(state, player);
    const affinityScore = { strong: 1.35, standard: 0.55, difficult: -1.8 };
    const choices = pathways.map(pathway => {
        const strategic = profile.pathwayWeights[pathway] ?? 1;
        const regionalFit = pathway === "fossil" ? Math.min(5, continent.printedResources.fossilFuel) : (continent.renewablePotential?.[pathway] ?? 1);
        const affinity = getPathwayAffinity(state, player, { pathway, stage: "capture", tier: "basic", name: pathway });
        const forecast = featureEnabled(state, "forecastVisible") ? openingForecastAffinity(state.weather.forecast, pathway) : 0;
        const readiness = openingProjectReadiness(state, player, pathway);
        const noise = randomInt(state.rng.streams.ai, 11) / 10;
        return { pathway, score: strategic * 2 + regionalFit * 0.5 + affinityScore[affinity] + forecast * 1.4 + readiness + noise };
    }).sort((a, b) => b.score - a.score || a.pathway.localeCompare(b.pathway));
    const near = choices.filter(item => item.score >= choices[0].score - 1.8).slice(0, 3);
    const selected = near[randomInt(state.rng.streams.ai, near.length)] ?? choices[0];
    return { pathwayId: selected.pathway, capabilityId: featureEnabled(state, "preparedCapabilityChoice") ? strategyCapability[strategy] : defaultCapabilityForPathway(selected.pathway) };
}
function operational(state, builtGeneration) {
    return builtGeneration < state.generation || state.config.rules.buildAndOperateSameGeneration || builtGeneration === 0;
}
function continentFor(state, player) {
    const continent = state.config.continents.find(item => item.id === player.continentId);
    if (!continent)
        throw new Error(`Unknown continent ${player.continentId}.`);
    return continent;
}
function technologyAvailable(state, technology) {
    return !technology.starter && modeAllowsTechnology(state, technology) && (technology.alwaysAvailable || state.innovationMarket.visible.includes(technology.id));
}
function estimateBuild(state, player, technology, options = {}) {
    const result = getEffectiveUpgradeCost(state, player.id, technology, options);
    return {
        constructionMaterials: result.final.constructionMaterials,
        criticalMaterials: result.final.criticalMaterials,
        effectiveKnowledge: result.effectiveKnowledge,
        knowledgeRequired: result.knowledgeRequired,
        modifiers: result.modifiers
    };
}
function canBuild(state, player, technology, options = {}) {
    if (!technologyAvailable(state, technology))
        return false;
    if (technology.copyLimit !== undefined && player.installed.filter(item => item.technologyId === technology.id).length >= technology.copyLimit)
        return false;
    if (technology.prerequisiteTechnologyId && !hasTechnology(player, technology.prerequisiteTechnologyId))
        return false;
    const estimate = estimateBuild(state, player, technology, options);
    return estimate.effectiveKnowledge >= estimate.knowledgeRequired
        && player.resources.constructionMaterials.warehouse >= estimate.constructionMaterials
        && player.resources.criticalMaterials.warehouse >= estimate.criticalMaterials;
}
function forecastAffinity(state, pathway) {
    const current = state.weather.current;
    const forecast = featureEnabled(state, "forecastVisible") ? state.weather.forecast : null;
    const scoreFace = (face) => {
        if (!face)
            return 0;
        if (pathway === "solar")
            return face === "brightSun" ? 1 : face === "storm" ? -0.7 : -0.2;
        if (pathway === "wind")
            return face === "strongWind" ? 1 : face === "storm" ? 0.65 : -0.15;
        if (pathway === "hydro")
            return face === "storm" ? 1 : face === "rain" ? 0.7 : 0.1;
        return 0.25;
    };
    return featureEnabled(state, "forecastVisible") ? scoreFace(current) * 0.65 + scoreFace(forecast) * 0.35 : scoreFace(current);
}
function pathwayDiversity(state, player) {
    const represented = new Set();
    for (const instance of player.installed) {
        const technology = getTechnology(state, instance.technologyId);
        if (technology.pathway !== "shared")
            represented.add(technology.pathway);
    }
    return represented.size;
}
function operationalTechnologyConfigs(state, player) {
    return player.installed
        .filter(instance => operational(state, instance.builtGeneration))
        .map(instance => getTechnology(state, instance.technologyId));
}
function marginalTechnologyCapacity(state, player, technology) {
    const installed = operationalTechnologyConfigs(state, player);
    const continent = continentFor(state, player);
    const prerequisite = technology.prerequisiteTechnologyId ? getTechnology(state, technology.prerequisiteTechnologyId) : null;
    const replacedCapacity = prerequisite?.capacity ?? 0;
    const replacedOutput = prerequisite?.maximumOutput ?? 0;
    const replacedStorage = prerequisite?.storage?.capacity ?? 0;
    if (technology.special === "researchCentre")
        return hasTechnology(player, "researchCentre") ? 0 : 1;
    if (technology.special === "efficientLighting")
        return hasTechnology(player, "efficientLighting") ? 0 : 4;
    if (technology.stage === "transport") {
        const capacityGain = Math.max(0, technology.capacity - replacedCapacity);
        return Math.max(capacityGain, technology.special === "smartGrid" ? 1 : 0);
    }
    if (technology.storage?.type === "battery") {
        const capacityGain = Math.max(0, technology.storage.capacity - replacedStorage);
        const previousRecovery = prerequisite?.storage?.recovery?.outputsByInput?.at(-1) ?? 0;
        const upgradedRecovery = technology.storage.recovery.outputsByInput.at(-1) ?? 0;
        return Math.max(capacityGain, upgradedRecovery - previousRecovery);
    }
    if (technology.pathway === "hydro" && technology.stage === "transformation") {
        const outputGain = Math.max(0, technology.capacity - replacedCapacity);
        const storageGain = Math.max(0, (technology.storage?.capacity ?? 0) - replacedStorage) / 2;
        return Math.max(outputGain, storageGain);
    }
    if (technology.pathway === "solar" || technology.pathway === "wind") {
        const capacityGain = Math.max(0, technology.capacity - replacedCapacity);
        return capacityGain;
    }
    if (technology.pathway === "biomass" && technology.stage === "transformation")
        return Math.max(0, technology.maximumOutput - replacedOutput);
    if (technology.id === "enhancedOilRecovery" || technology.id === "combinedCycle")
        return 1;
    if (technology.id === "carbonCapturePlant")
        return 0;
    return Math.max(1, technology.capacity);
}
function desiredTechnologyDeficits(state, player) {
    const strategy = player.controller.kind === "ai" ? player.controller.strategy : "diversifiedAdapter";
    const profile = aiStrategyProfiles[strategy];
    const candidates = state.config.technologies
        .filter(technologyAvailable.bind(null, state))
        .filter(technology => technology.pathway === profile.preparedPathway || technology.stage === "transport" || technology.stage === "efficiency" || technology.stage === "storage")
        .sort((a, b) => {
        const aValue = (a.pathway === "shared" ? 1 : profile.pathwayWeights[a.pathway]) * profile.stageWeights[a.stage] * Math.max(1, a.capacity);
        const bValue = (b.pathway === "shared" ? 1 : profile.pathwayWeights[b.pathway]) * profile.stageWeights[b.stage] * Math.max(1, b.capacity);
        return bValue - aValue;
    });
    const target = candidates[0];
    if (!target)
        return {};
    const estimate = estimateBuild(state, player, target);
    return {
        constructionMaterials: Math.max(0, estimate.constructionMaterials - player.resources.constructionMaterials.warehouse),
        criticalMaterials: Math.max(0, estimate.criticalMaterials - player.resources.criticalMaterials.warehouse)
    };
}
export function aiResourceValue(state, player, resource) {
    const strategy = player.controller.kind === "ai" ? player.controller.strategy : "diversifiedAdapter";
    const profile = aiStrategyProfiles[strategy];
    const account = player.resources[resource];
    const deficits = desiredTechnologyDeficits(state, player);
    let value = profile.resourceWeights[resource];
    if ((deficits[resource] ?? 0) > 0)
        value += 3.5;
    if (account.warehouse <= 1)
        value += 1.5;
    if (account.warehouse >= 6)
        value -= 0.8;
    if (resource === "fossilFuel" && strategy === "fossilTempo") {
        const hasCompleteFuelChain = hasTechnology(player, "enhancedOilRecovery") && hasTechnology(player, "combinedCycle");
        value += state.generation <= 5 ? 2.0 : hasCompleteFuelChain ? 1.5 : 0.5;
        if (account.warehouse === 0 && account.currentContinent > 0)
            value += 1.5;
    }
    if (resource === "biomass" && strategy === "biomassRenewal")
        value += 2;
    const gridUpgrade = state.config.technologies.find(item => item.id === "gridUpgrade");
    if (gridUpgrade && getTransmissionLevel(state, player.id) === 1) {
        const gridCost = estimateBuild(state, player, gridUpgrade);
        if (resource === "constructionMaterials" && account.warehouse < gridCost.constructionMaterials)
            value += 3.5;
        if (resource === "criticalMaterials" && account.warehouse < gridCost.criticalMaterials)
            value += 2.5;
    }
    return value;
}
function chooseImportPayment(state, player, receive, required) {
    const payment = {};
    let remaining = required;
    const ranked = resourceTypes
        .filter(resource => resource !== receive)
        .sort((a, b) => aiResourceValue(state, player, a) - aiResourceValue(state, player, b));
    for (const resource of ranked) {
        const keep = aiResourceValue(state, player, resource) >= 3 ? 1 : 0;
        const available = Math.max(0, player.resources[resource].warehouse - keep);
        const take = Math.min(available, remaining);
        if (take > 0)
            payment[resource] = take;
        remaining -= take;
        if (remaining === 0)
            return payment;
    }
    return null;
}
function researchCost(state, player) {
    const nextLevel = player.knowledge + 1;
    const printed = state.config.knowledge?.advancementCosts?.[nextLevel];
    if (!printed)
        return null;
    let constructionMaterials = printed.constructionMaterials;
    const criticalMaterials = printed.criticalMaterials;
    const preparedDiscount = player.prepared.capabilityId === "research" && !player.prepared.capabilityUsed && constructionMaterials > 0;
    if (preparedDiscount)
        constructionMaterials--;
    const appliedLearningUsed = (player.appliedLearningTokens ?? 0) > 0 && constructionMaterials > 0;
    if (appliedLearningUsed)
        constructionMaterials--;
    return { nextLevel, constructionMaterials, criticalMaterials, preparedDiscount, appliedLearningUsed };
}
function canResearch(state, player) {
    if (!featureEnabled(state, "knowledgeRequirements"))
        return false;
    if (player.knowledge >= state.config.rules.knowledgeMaximum)
        return false;
    const cost = researchCost(state, player);
    return Boolean(cost && player.resources.constructionMaterials.warehouse >= cost.constructionMaterials && player.resources.criticalMaterials.warehouse >= cost.criticalMaterials);
}
export function generateLegalDevelopmentActions(state, player) {
    const actions = [];
    for (const resource of resourceTypes) {
        if (gatherAmount(state, player, resource) > 0)
            actions.push({ kind: "extract", resource });
    }
    if (canResearch(state, player))
        actions.push({ kind: "research" });
    for (const technology of state.config.technologies)
        if (canBuild(state, player, technology))
            actions.push({ kind: "build", technologyId: technology.id });
    const activeCondition = conditionApplies(state, player);
    if (activeCondition && "adaptable" in activeCondition.effect && activeCondition.effect.adaptable && !player.localCondition?.adapted)
        actions.push({ kind: "adapt" });
    if (state.config.trade.publicImportEnabled) {
        for (const receive of resourceTypes) {
            if (worldMarketBlocked(state, receive) || (state.worldMarket?.[receive] ?? 0) <= 0)
                continue;
            const required = worldMarketRate(state, player, receive);
            const payment = chooseImportPayment(state, player, receive, required);
            if (payment)
                actions.push({ kind: "publicImport", receive, payment });
        }
    }
    actions.push({ kind: "pass" });
    return actions;
}

function factor(id, label, score, detail) {
    return { id, label, score, detail };
}
function scoreDevelopmentAction(state, player, action) {
    const strategy = player.controller.kind === "ai" ? player.controller.strategy : "diversifiedAdapter";
    const profile = aiStrategyProfiles[strategy];
    const factors = [];
    const remainingGenerations = state.config.rules.generations - state.generation + 1;
    const target = state.config.demand.reliabilityTargets[state.generation] ?? 4;
    const reliabilityGap = Math.max(0, target - player.currentMetrics.deliveredLight);
    if (action.kind === "pass")
        factors.push(factor("pass", "No development", -18, "Passing preserves no future value."));
    if (action.kind === "extract" || action.kind === "harvestBiomass") {
        const resource = action.kind === "extract" ? action.resource : "biomass";
        const quantity = action.kind === "extract" ? gatherAmount(state, player, resource) : 1;
        const value = aiResourceValue(state, player, resource) * 2.2 * quantity;
        factors.push(factor("resource", "Resource need", value, `${resource} is valued at ${aiResourceValue(state, player, resource).toFixed(1)} per unit; this action gathers ${quantity}.`));
        if (player.resources[resource].warehouse >= 7)
            factors.push(factor("overflow", "Warehouse pressure", -5, "The Warehouse is already close to capacity."));
        if (strategy === "fossilTempo" && resource === "fossilFuel") {
            if (player.resources.fossilFuel.warehouse === 0 && state.generation <= 3)
                factors.push(factor("fuelCoverage", "Keep the bridge operating", 4, "The installed fuel plant cannot operate this Generation unless one fuel cube is moved into the Warehouse."));
            if (state.generation >= 6)
                factors.push(factor("transition", "Fuel reserve decision", -(state.generation - 5) * 1.5, "Late fuel extraction is still useful, but it competes with building the system needed after local reserves run out."));
        }
    }
    if (action.kind === "research") {
        const nextMilestone = player.knowledge < 3 ? 3 : 5;
        const distance = nextMilestone - player.knowledge;
        const locked = state.config.technologies.filter(technology => getKnowledgeRequirement(state, player, technology) === nextMilestone).length;
        const cost = researchCost(state, player);
        factors.push(factor("unlock", "Progress to Knowledge milestone", locked * 1.5 / Math.max(1, distance), `Knowledge ${nextMilestone} unlocks ${locked} configured technologies; ${distance} learning step${distance === 1 ? "" : "s"} remain.`));
        factors.push(factor("time", "Remaining time", remainingGenerations * 0.75, `${remainingGenerations} Generations remain to benefit from permanent Knowledge.`));
        if (cost)
            factors.push(factor("learningCost", "Learning materials", -(cost.constructionMaterials * 1.1 + cost.criticalMaterials * 1.6), `This step costs ${cost.constructionMaterials} Other Materials and ${cost.criticalMaterials} Critical Minerals.`));
        if (cost?.appliedLearningUsed)
            factors.push(factor("appliedLearning", "Biomass Applied Learning", 4.5, "An Applied Learning token replaces one Other Material."));
        if (strategy === "biomassRenewal")
            factors.push(factor("knowledgeEconomy", "Biomass knowledge strategy", 4, "Biomass uses accessible early technology so saved resources can develop Knowledge and diversify."));
        const gridUpgrade = state.config.technologies.find(item => item.id === "gridUpgrade");
        if (gridUpgrade && getTransmissionLevel(state, player.id) === 1 && player.knowledge < getKnowledgeRequirement(state, player, gridUpgrade))
            factors.push(factor("gridKnowledge", "Unlock Transmission upgrade", 15, "The current Level 1 Transmission cannot reliably deliver the four-Light late-game target; Knowledge is needed to unlock the Grid Upgrade."));
    }
    if (action.kind === "build") {
        const technology = getTechnology(state, action.technologyId);
        const affinity = getPathwayAffinity(state, player, technology);
        const affinityValue = affinity === "strong" ? 3 : affinity === "difficult" ? -2 : 0.5;
        const continentProfile = getContinentProfile(state, player);
        factors.push(factor("affinity", `${affinity} pathway readiness`, affinityValue, `${continentProfile.name} uses Knowledge ${getKnowledgeRequirement(state, player, technology)} for this tier.`));
        const pathwayWeight = technology.pathway === "shared" ? 1 : profile.pathwayWeights[technology.pathway];
        const stageWeight = profile.stageWeights[technology.stage];
        const marginalCapacity = marginalTechnologyCapacity(state, player, technology);
        const effectiveMarginalCapacity = marginalCapacity;
        const capacityValue = effectiveMarginalCapacity * pathwayWeight * stageWeight * 2;
        factors.push(factor("capacity", "Marginal strategic capacity", capacityValue, `${technology.name} adds ${effectiveMarginalCapacity.toFixed(1)} currently useful capacity in a weighted ${technology.stage} role.`));
        if (marginalCapacity === 0)
            factors.push(factor("redundancy", "Redundant capacity", -14, "Existing infrastructure already covers the useful capacity of this technology."));
        if (technology.pathway !== "shared") {
            const weather = forecastAffinity(state, technology.pathway) * profile.forecastWeight * 4;
            factors.push(factor("forecast", "Weather alignment", weather, `Current and forecast conditions produce an affinity of ${forecastAffinity(state, technology.pathway).toFixed(2)}.`));
            const continent = continentFor(state, player);
            if (technology.pathway === "fossil") {
                const fuelStock = continent.printedResources.fossilFuel;
                factors.push(factor("fuelStock", "Regional Fuel stock", fuelStock * pathwayWeight * 0.35, `${continent.name} begins with ${fuelStock} total local Fossil Fuel; additional Fuel can be traded or imported.`));
            }
            else {
                const potential = continent.renewablePotential?.[technology.pathway] ?? 1;
                factors.push(factor("regionalPotential", "Regional potential", potential * pathwayWeight * 0.75, `${technology.pathway} regional potential is ${potential}. It guides strategy and display; only the signature weather bonus changes output.`));
            }
        }
        if (technology.prerequisiteTechnologyId)
            factors.push(factor("upgrade", "Pathway upgrade", 5 + getKnowledgeRequirement(state, player, technology), `${technology.name} upgrades an existing technology rather than opening an isolated chain.`));
        if (getKnowledgeRequirement(state, player, technology) >= 5 && technology.id !== "carbonCapturePlant")
            factors.push(factor("knowledgeFive", "Knowledge-5 payoff", 25, "This advanced technology is a major payoff for reaching maximum Knowledge."));
        if (technology.id === "carbonCapturePlant")
            factors.push(factor("environmentalProtection", "Environmental protection", 1, "Carbon Capture reduces fossil impact but adds no Energy, so it is optional rather than part of the four-Light chain."));
        if (technology.special === "smartGrid")
            factors.push(factor("resilience", "Grid-condition protection", 6, "Smart Grid prevents Grid Bottleneck from removing the four-Energy late-game capability."));
        if (technology.id === "advancedBattery")
            factors.push(factor("recovery", "Long-duration recovery", 6, "The advanced Battery returns more of a full stored charge and carries a larger reserve."));
        if (strategy === "biomassRenewal" && player.knowledge >= 3 && technology.pathway !== "biomass" && technology.pathway !== "shared") {
            const newPathway = !player.installed.some(instance => getTechnology(state, instance.technologyId).pathway === technology.pathway);
            factors.push(factor("knowledgeDiversification", "Knowledge-funded diversification", newPathway ? 12 : 6, "Biomass Applied Learning is intended to help finance a second energy pathway."));
        }
        if (technology.pathway === "biomass" && technology.appliedLearning)
            factors.push(factor("appliedLearning", "Applied Learning engine", strategy === "biomassRenewal" ? 9 : 3, "Operating and replenishing Biomass can reduce future Knowledge costs."));
        if (technology.stage === "storage") {
            const variableCapacity = player.installed
                .map(instance => getTechnology(state, instance.technologyId))
                .filter(item => item.stage === "capture" && (item.pathway === "solar" || item.pathway === "wind"))
                .reduce((sum, item) => sum + item.capacity, 0);
            factors.push(factor("storage", "Storage support", Math.min(6, variableCapacity * 1.4), `Existing variable capture capacity is ${variableCapacity}.`));
        }
        if (technology.stage === "transport") {
            factors.push(factor("grid", "Transport headroom", 4 + reliabilityGap * 1.2, "Grid capacity protects generated Energy from curtailment."));
            if (technology.id === "gridUpgrade" && getTransmissionLevel(state, player.id) === 1)
                factors.push(factor("requiredGrid", "Raise Grid capacity", 20 + Math.max(0, state.generation - 2) * 2, "The Basic Grid transports only 3 Energy; Grid Upgrade is required for four Light."));
        }
        if (technology.stage === "efficiency")
            factors.push(factor("lighting", "Light conversion", 9, "Efficient Lighting removes the standard 4-to-3 Light loss."));
        if (technology.stage === "research")
            factors.push(factor("research", "Research acceleration", remainingGenerations * 0.9, "The Research Centre can add temporary Knowledge in future Generations."));
        if (technology.fuel) {
            const fuel = player.resources[technology.fuel.resource].warehouse;
            factors.push(factor("fuel", "Available fuel", fuel * 0.8, `${fuel} ${technology.fuel.resource} is currently in the Warehouse.`));
            factors.push(factor("loss", "Thermal loss", -(technology.loss?.fixedPerOperation ?? 0) * profile.lossAversion * 2, "Fuel plants add fixed System Loss when operated."));
        }
        if (strategy === "fossilTempo" && state.generation >= 5) {
            const transitionStrength = state.generation - 4;
            if (technology.pathway === "fossil")
                factors.push(factor("transition", "Finite fuel calculation", -transitionStrength * 1.5, "A further fuel upgrade can still be rational, but the remaining reserve must cover the Generations left."));
            else if (technology.pathway !== "shared") {
                const alreadyRepresented = player.installed.some(instance => getTechnology(state, instance.technologyId).pathway === technology.pathway);
                factors.push(factor("transition", "Replacement pathway", (alreadyRepresented ? 2 : 4) * transitionStrength, "A second pathway protects the player when local fuel is exhausted or too expensive to import."));
            }
        }
        const diversityBefore = pathwayDiversity(state, player);
        if (technology.pathway !== "shared" && !player.installed.some(instance => getTechnology(state, instance.technologyId).pathway === technology.pathway)) {
            factors.push(factor("diversity", "Pathway diversification", profile.diversificationWeight * (6 - diversityBefore), "This construction adds a new developed pathway."));
        }
        const estimate = estimateBuild(state, player, technology);
        const costPenalty = (estimate.constructionMaterials * 1.1 + estimate.criticalMaterials * 1.5) * 0.7;
        factors.push(factor("cost", "Construction cost", -costPenalty, `Estimated cost is ${estimate.constructionMaterials} Other Materials and ${estimate.criticalMaterials} Critical Minerals.`));
        if (state.config.rules.buildAndOperateSameGeneration)
            factors.push(factor("tempo", "Same-Generation operation", 2.5, "The technology can operate immediately under the active rule."));
    }
    if (action.kind === "adapt") {
        const condition = conditionApplies(state, player);
        let avoided = 2;
        if (condition?.effect.kind === "gridCapacityDelta" || condition?.effect.kind === "lightMaximumDelta")
            avoided = 8 + reliabilityGap * profile.reliabilityWeight;
        else if (condition?.effect.kind === "solarDelta" || condition?.effect.kind === "windDelta" || condition?.effect.kind === "hydroDelta")
            avoided = hasRelevantSystem(state, player, condition.effect.kind) ? 6 : 0;
        else if (condition?.effect.kind === "firstFuelPlantOutputDelta")
            avoided = 5;
        factors.push(factor("adapt", "Avoided condition impact", avoided, `Adapting prevents the active ${condition?.name ?? "Local Condition"} effect.`));
        factors.push(factor("actionCost", "Action opportunity cost", -3.5, "Adapt consumes one of the three Development actions."));
    }
    if (action.kind === "publicImport") {
        const receivedValue = aiResourceValue(state, player, action.receive) * 2.4;
        let paymentValue = 0;
        for (const resource of resourceTypes)
            paymentValue += (action.payment[resource] ?? 0) * aiResourceValue(state, player, resource);
        factors.push(factor("received", "World Market resource", receivedValue, `${action.receive} directly addresses a current resource valuation.`));
        factors.push(factor("exchange", "World Market payment", -paymentValue, "The World Market exchange destroys more Warehouse resources than it creates."));
        factors.push(factor("marketEfficiency", "No action, but inefficient", 0.5, "World Market use costs no Development action, but the fixed 2-for-1 exchange destroys one net resource."));
    }
    const score = factors.reduce((sum, item) => sum + item.score, 0);
    return { action, score, factors: factors.sort((a, b) => Math.abs(b.score) - Math.abs(a.score)) };
}
function actionLabel(state, action) {
    switch (action.kind) {
        case "build": return `Build ${getTechnology(state, action.technologyId).name}`;
        case "extract": return `Extract ${action.resource}`;
        case "harvestBiomass": return "Harvest Biomass";
        case "research": return "Research";
        case "publicImport": return `World Market: receive ${action.receive}`;
        case "adapt": return "Adapt";
        case "pass": return "Pass";
    }
}
export function chooseDevelopmentDecision(state, player) {
    const strategy = player.controller.kind === "ai" ? player.controller.strategy : "diversifiedAdapter";
    const scored = generateLegalDevelopmentActions(state, player).map(action => scoreDevelopmentAction(state, player, action));
    scored.sort((a, b) => b.score - a.score || actionLabel(state, a.action).localeCompare(actionLabel(state, b.action)));
    const difficulty = player.controller.kind === "ai" ? player.controller.difficulty ?? "standard" : "standard";
    let best = scored[0] ?? { action: { kind: "pass" }, score: -18, factors: [] };
    if (difficulty === "basic" && scored.length > 1) {
        const nearBest = scored.filter(item => item.score >= best.score - 4).slice(0, 3);
        best = nearBest[randomInt(state.rng.streams.ai, nearBest.length)] ?? best;
        best = { ...best, factors: [...best.factors, factor("difficulty", "Basic AI uncertainty", -0.5, "Basic difficulty chooses among near-equivalent actions rather than always selecting the exact maximum.")] };
    }
    if (difficulty === "advanced" && best.action.kind === "build") {
        best = { ...best, score: best.score + 0.5, factors: [...best.factors, factor("difficulty", "Advanced planning", 0.5, "Advanced difficulty retains the highest-scoring deterministic construction plan.")] };
    }
    return {
        kind: "development",
        playerId: player.id,
        strategy,
        action: best.action,
        score: best.score,
        summary: `${aiStrategyProfiles[strategy].name} chose ${actionLabel(state, best.action)} (${best.score.toFixed(1)} utility).`,
        factors: best.factors.slice(0, 5),
        alternatives: scored.slice(1, 4).map(item => ({ choice: item.action, score: item.score, label: actionLabel(state, item.action) }))
    };
}
export function chooseDevelopmentAction(state, player) {
    return chooseDevelopmentDecision(state, player).action;
}
export function considerAiTrade(state, proposer, utilityThreshold = 0.35) {
    if (state.phase !== "generation.development" || !state.config.trade.directEnabled || proposer.controller.kind !== "ai")
        return null;
    if (state.turnOrder[state.activeTurnIndex] !== proposer.id || proposer.actionsRemaining <= 0)
        return null;
    // Spending an action on trade is worthwhile only for a real shortage.
    const threshold = utilityThreshold + 1.25;
    let best = null;
    for (const recipient of Object.values(state.players)) {
        if (recipient.id === proposer.id || recipient.controller.kind !== "ai") continue;
        for (const offeredResource of resourceTypes) {
            if (proposer.resources[offeredResource].warehouse < 3) continue;
            for (const requestedResource of resourceTypes) {
                if (requestedResource === offeredResource || recipient.resources[requestedResource].warehouse < 2) continue;
                const requestedAccount = proposer.resources[requestedResource];
                const severeScarcity = requestedAccount.currentContinent === 0 && requestedAccount.warehouse <= 1;
                if (!severeScarcity) continue;
                const proposerScore = aiResourceValue(state, proposer, requestedResource) - aiResourceValue(state, proposer, offeredResource);
                const recipientScore = aiResourceValue(state, recipient, offeredResource) - aiResourceValue(state, recipient, requestedResource);
                if (proposerScore <= threshold || recipientScore <= threshold) continue;
                const decision = {
                    kind: "trade", proposerId: proposer.id, recipientId: recipient.id,
                    offeredResource, requestedResource, proposerScore, recipientScore, accepted: true, actionSpent: true,
                    summary: `${proposer.name} and ${recipient.name} accepted a one-for-one resource exchange using one ${proposer.name} action.`,
                    factors: [
                        factor("proposerUtility", "Proposer utility", proposerScore, `${proposer.name} gains ${proposerScore.toFixed(2)} estimated resource utility.`),
                        factor("recipientUtility", "Recipient utility", recipientScore, `${recipient.name} gains ${recipientScore.toFixed(2)} estimated resource utility.`),
                        factor("tradeCost", "Trade action cost", -1, "Every direct trade uses one initiator Development action.")
                    ]
                };
                if (!best || proposerScore + recipientScore > best.proposerScore + best.recipientScore)
                    best = decision;
            }
        }
    }
    return best;
}

export function attemptAiTrade(state, proposer, utilityThreshold = 0.35) {
    const decision = considerAiTrade(state, proposer, utilityThreshold);
    if (!decision || !decision.accepted)
        return decision;
    try {
        const command = { type: "directTrade", aId: decision.proposerId, bId: decision.recipientId, aGives: { [decision.offeredResource]: 1 }, bGives: { [decision.requestedResource]: 1 } };
        if (state.executionMode === "simulation")
            applyCommandFast(state, command);
        else
            applyCommand(state, command);
        recordAiDecision(state, decision);
        return decision;
    }
    catch {
        return null;
    }
}
function capture(state, player, pathway) {
    const capacity = player.installed
        .filter(instance => operational(state, instance.builtGeneration))
        .map(instance => getTechnology(state, instance.technologyId))
        .filter(technology => technology.pathway === pathway && technology.stage === "capture")
        .reduce((sum, technology) => sum + technology.capacity, 0);
    let output = state.config.weather[pathway][state.weather.current][Math.min(state.config.weather[pathway][state.weather.current].length - 1, capacity)] ?? 0;
    const condition = conditionApplies(state, player);
    if (pathway === "solar" && condition?.effect.kind === "solarDelta") output += condition.effect.amount;
    if (pathway === "wind" && condition?.effect.kind === "windDelta") output += condition.effect.amount;
    const signature = getContinentGenerationModifiers(state, player.id, pathway).generationBonus;
    output += signature;
    const pathwayMaximum = state.config.weather?.pathwayGenerationMaximum ?? 4;
    return Math.max(0, Math.min(pathwayMaximum, capacity, output));
}

function hydroRequest(state, player) {
    const hydroInstance = player.installed
        .filter(instance => operational(state, instance.builtGeneration))
        .filter(instance => getTechnology(state, instance.technologyId).pathway === "hydro")
        .sort((a, b) => (getTechnology(state, b.technologyId).hydro?.totalMaximum ?? 0) - (getTechnology(state, a.technologyId).hydro?.totalMaximum ?? 0))[0];
    if (!hydroInstance)
        return 0;
    const technology = getTechnology(state, hydroInstance.technologyId);
    const hydro = technology.hydro ?? { immediateOutput: 0, releaseMaximum: 0, totalMaximum: 0 };
    const stored = totalEnergy(hydroInstance.storageInput);
    return Math.min(hydro.totalMaximum, hydro.immediateOutput + Math.min(hydro.releaseMaximum, stored));
}

function fuelRequests(state, player) {
    const requests = {};
    const available = { biomass: player.resources.biomass.warehouse, fossilFuel: player.resources.fossilFuel.warehouse };
    for (const instance of player.installed) {
        const technology = getTechnology(state, instance.technologyId);
        const operable = technology.pathway === "biomass" || (technology.pathway === "fossil" && technology.fossilRole === "legacyPlant");
        if (!operational(state, instance.builtGeneration) || !operable || !technology.fuel)
            continue;
        if (available[technology.fuel.resource] < 1) continue;
        const maximum = fuelPlantMaximumOutput(state, player, technology);
        if (maximum <= 0) continue;
        requests[instance.instanceId] = maximum;
        available[technology.fuel.resource]--;
    }
    return requests;
}

function recoveredByPathway(state, player, inputByBattery, recoveryTargetId) {
    const result = emptyEnergy();
    for (const [id, input] of Object.entries(inputByBattery)) {
        const instance = player.installed.find(item => item.instanceId === id);
        const technology = getTechnology(state, instance.technologyId);
        let recovered = technology.storage.recovery.outputsByInput[input] ?? 0;
        const active = conditionApplies(state, player);
        const bonus = active?.effect.kind === "storageRecoveryBonus" ? active.effect.amount : 0;
        if (id === recoveryTargetId)
            recovered = Math.min(input, recovered + bonus);
        let remaining = recovered;
        for (const pathway of pathways) {
            const take = Math.min(instance.storageInput[pathway], remaining);
            result[pathway] += take;
            remaining -= take;
            if (remaining === 0)
                break;
        }
    }
    return result;
}
function gridCapacity(state, player) {
    let capacity = player.installed
        .filter(instance => operational(state, instance.builtGeneration))
        .map(instance => getTechnology(state, instance.technologyId))
        .filter(technology => technology.stage === "transport")
        .reduce((sum, technology) => sum + technology.capacity, 0);
    const condition = conditionApplies(state, player);
    if (condition?.effect.kind === "gridCapacityDelta") {
        const protectedBySmartGrid = condition.effect.amount < 0 && hasTechnology(player, "smartGrid");
        if (!protectedBySmartGrid)
            capacity += condition.effect.amount;
    }
    return Math.max(0, capacity);
}
export function chooseDispatchDecision(state, player) {
    const strategy = player.controller.kind === "ai" ? player.controller.strategy : "diversifiedAdapter";
    const profile = aiStrategyProfiles[strategy];
    const available = emptyEnergy();
    available.solar = capture(state, player, "solar");
    available.wind = capture(state, player, "wind");
    const hydro = hydroRequest(state, player);
    available.hydro = hydro;
    const fuel = fuelRequests(state, player);
    let disruptionApplied = false;
    let biomassGlobalPenaltyApplied = false;
    const activeCondition = conditionApplies(state, player);
    const globalEvent = activeGlobalEvent(state);
    for (const [id, output] of Object.entries(fuel)) {
        const instance = player.installed.find(item => item.instanceId === id);
        const technology = getTechnology(state, instance.technologyId);
        let actual = output;
        if (activeCondition?.effect.kind === "firstFuelPlantOutputDelta" && !disruptionApplied) {
            actual = Math.max(0, actual + activeCondition.effect.amount);
            disruptionApplied = true;
        }
        if (technology.pathway === "biomass" && globalEvent?.effect.kind === "firstBiomassOutputDelta" && !biomassGlobalPenaltyApplied) {
            actual = Math.max(0, actual + globalEvent.effect.amount);
            biomassGlobalPenaltyApplied = true;
        }
        if (technology.pathway === "biomass" || technology.pathway === "fossil")
            available[technology.pathway] += actual;
    }
    const batteryDischargeInput = {};
    let availableTotal = totalEnergy(available);
    const desiredLightInput = 4;
    const desiredTransport = Math.min(desiredLightInput, gridCapacity(state, player));
    const batteryCandidates = player.installed
        .filter(instance => getTechnology(state, instance.technologyId).storage?.type === "battery" && totalEnergy(instance.storageInput) > 0)
        .sort((a, b) => totalEnergy(b.storageInput) - totalEnergy(a.storageInput));
    const recoveryTargetId = activeCondition?.effect.kind === "storageRecoveryBonus" ? batteryCandidates[0]?.instanceId ?? null : null;
    if (availableTotal < desiredTransport) {
        for (const instance of batteryCandidates) {
            const technology = getTechnology(state, instance.technologyId);
            const stored = totalEnergy(instance.storageInput);
            const need = Math.max(0, desiredTransport - availableTotal);
            let selectedInput = 0;
            for (let input = 1; input <= stored; input++) {
                let output = technology.storage.recovery.outputsByInput[input] ?? 0;
                if (instance.instanceId === recoveryTargetId)
                    output = Math.min(input, output + (activeCondition?.effect.kind === "storageRecoveryBonus" ? activeCondition.effect.amount : 0));
                if (output >= need) {
                    selectedInput = input;
                    break;
                }
            }
            if (selectedInput === 0)
                selectedInput = stored;
            batteryDischargeInput[instance.instanceId] = selectedInput;
            let output = technology.storage.recovery.outputsByInput[selectedInput] ?? 0;
            if (instance.instanceId === recoveryTargetId)
                output = Math.min(selectedInput, output + 1);
            availableTotal += output;
            if (availableTotal >= desiredTransport)
                break;
        }
    }
    const recovered = recoveredByPathway(state, player, batteryDischargeInput, recoveryTargetId);
    for (const pathway of pathways)
        available[pathway] += recovered[pathway];
    const transportByPathway = {};
    let toTransport = Math.min(totalEnergy(available), desiredTransport);
    const dispatchPriority = [...pathways].sort((a, b) => profile.pathwayWeights[b] - profile.pathwayWeights[a]);
    for (const pathway of dispatchPriority) {
        const take = Math.min(available[pathway], toTransport);
        if (take > 0)
            transportByPathway[pathway] = take;
        available[pathway] -= take;
        toTransport -= take;
    }
    const batteryCharge = {};
    if (totalEnergy(available) > 0 && Object.keys(batteryDischargeInput).length === 0) {
        const battery = player.installed.find(instance => {
            const technology = getTechnology(state, instance.technologyId);
            return technology.storage?.type === "battery"
                && totalEnergy(instance.storageInput) + totalEnergy(instance.pendingStorageInput ?? emptyEnergy()) < technology.storage.capacity;
        });
        if (battery) {
            const technology = getTechnology(state, battery.technologyId);
            let toStore = Math.min(technology.storage.capacity - totalEnergy(battery.storageInput) - totalEnergy(battery.pendingStorageInput ?? emptyEnergy()), totalEnergy(available));
            const allocation = {};
            for (const pathway of dispatchPriority) {
                const take = Math.min(available[pathway], toStore);
                if (take > 0)
                    allocation[pathway] = take;
                toStore -= take;
            }
            batteryCharge[battery.instanceId] = allocation;
        }
    }
    const plan = {
        recoveryBreakthroughTargetInstanceId: recoveryTargetId,
        hydroOutputRequested: hydro,
        fuelPlantOutput: fuel,
        batteryDischargeInput,
        batteryCharge,
        transportByPathway
    };
    const transported = totalEnergy(transportByPathway);
    const standardLight = transported >= 4 && !hasTechnology(player, "efficientLighting") ? 3 : transported;
    const expectedLight = Math.min(state.config.demand.maximumLight, standardLight);
    const expectedBatteryLoss = Object.entries(batteryDischargeInput).reduce((sum, [id, input]) => {
        const technology = getTechnology(state, player.installed.find(item => item.instanceId === id).technologyId);
        let output = technology.storage.recovery.outputsByInput[input] ?? 0;
        if (id === recoveryTargetId)
            output = Math.min(input, output + (activeCondition?.effect.kind === "storageRecoveryBonus" ? activeCondition.effect.amount : 0));
        return sum + input - output;
    }, 0);
    const thermalLoss = Object.keys(fuel).reduce((sum, id) => {
        const technology = getTechnology(state, player.installed.find(item => item.instanceId === id).technologyId);
        if (technology.pathway === "fossil") {
            const chain = fossilChainSnapshot(state, player);
            return sum + chain.storageLoss + chain.transformationLoss;
        }
        return sum + Math.max(0, technology.loss?.fixedPerOperation ?? 0);
    }, 0);
    const factors = [
        factor("light", "Expected Light", expectedLight * 5 * profile.reliabilityWeight, `${expectedLight} Light is expected from ${transported} transported Energy.`),
        factor("storage", "Stored reserve", totalEnergy(available) > 0 ? 2 : 0, "Surplus Energy is charged when a Battery has room."),
        factor("loss", "Expected System Loss", -(expectedBatteryLoss + thermalLoss) * profile.lossAversion, `${expectedBatteryLoss + thermalLoss} Battery and thermal loss is expected before Lighting.`)
    ];
    const score = factors.reduce((sum, item) => sum + item.score, 0);
    return {
        kind: "dispatch",
        playerId: player.id,
        strategy,
        plan,
        score,
        summary: `${aiStrategyProfiles[strategy].name} plans ${expectedLight} Light with ${transported} transported Energy.`,
        factors
    };
}
export function chooseDispatchPlan(state, player) {
    return chooseDispatchDecision(state, player).plan;
}
export function recordAiDecision(state, decision) {
    if (!state.debugMode)
        return;
    if (decision.kind === "development") {
        log(state, "ai.decision", decision.summary, decision.playerId, {
            decisionKind: decision.kind,
            strategy: decision.strategy,
            score: decision.score,
            factors: decision.factors,
            alternatives: decision.alternatives
        });
    }
    else if (decision.kind === "dispatch") {
        log(state, "ai.decision", decision.summary, decision.playerId, {
            decisionKind: decision.kind,
            strategy: decision.strategy,
            score: decision.score,
            factors: decision.factors
        });
    }
    else if (decision.kind === "trade") {
        log(state, "ai.tradeDecision", decision.summary, decision.proposerId, {
            decisionKind: decision.kind,
            recipientId: decision.recipientId,
            accepted: decision.accepted,
            factors: decision.factors
        });
    }
}
function foundingProjectCost(state, player) {
    const pathway = state.config.preparedPathways.find(item => item.id === player.prepared.pathwayId);
    if (!pathway)
        return { constructionMaterials: 0, criticalMaterials: 0 };
    const technology = getTechnology(state, pathway.foundingTechnologyId);
    return getEffectiveUpgradeCost(state, player.id, technology, { allowPreparedPathway: false }).final;
}
function openingReserveForResource(state, player, resource, includeSecretPlan = true) {
    let reserve = 0;
    const addTechnology = technologyId => {
        const technology = state.config.technologies.find(item => item.id === technologyId);
        if (!technology)
            return;
        const cost = getEffectiveUpgradeCost(state, player.id, technology, { allowPreparedPathway: false }).final;
        reserve += cost[resource] ?? 0;
    };
    if (getTransmissionLevel(state, player.id) === 1)
        addTechnology("gridUpgrade");
    if (!hasTechnology(player, "efficientLighting"))
        addTechnology("efficientLighting");
    if (includeSecretPlan && player.prepared.pathwayId) {
        const next = state.config.technologies.find(item => item.pathway === player.prepared.pathwayId && item.tier === "intermediate");
        if (next)
            addTechnology(next.id);
    }
    else {
        const profile = getContinentProfile(state, player);
        const likely = Object.entries(profile.pathwayAffinity)
            .filter(([, affinity]) => affinity === "strong")
            .map(([pathway]) => state.config.technologies.find(item => item.pathway === pathway && item.tier === "intermediate"))
            .filter(Boolean)
            .sort((a, b) => (a.cost[resource] ?? 0) - (b.cost[resource] ?? 0))[0];
        if (likely)
            reserve += Math.min(2, getEffectiveUpgradeCost(state, player.id, likely, { allowPreparedPathway: false }).final[resource] ?? 0);
    }
    return reserve;
}
function summitResourceValue(state, player, resource, includeSecretPlan = true) {
    const cost = includeSecretPlan ? foundingProjectCost(state, player) : { constructionMaterials: 2, criticalMaterials: 1 };
    const required = resource === "constructionMaterials" ? cost.constructionMaterials : resource === "criticalMaterials" ? cost.criticalMaterials : 0;
    const held = player.resources[resource].warehouse;
    const projectDeficit = Math.max(0, required - held);
    let value = aiResourceValue(state, player, resource);
    if (resource === "criticalMaterials")
        value += 1.5;
    if (projectDeficit > 0)
        value += 8;
    if (includeSecretPlan && resource === "fossilFuel" && player.prepared.pathwayId === "fossil")
        value += 2;
    if (includeSecretPlan && resource === "biomass" && player.prepared.pathwayId === "biomass")
        value += 2;
    if (held <= required)
        value += 2;
    const futureReserve = openingReserveForResource(state, player, resource, includeSecretPlan);
    if (futureReserve > 0 && held <= required + futureReserve)
        value += 2.75;
    if (held >= required + futureReserve + 2)
        value -= 1.5;
    return value;
}
function publicTradeEnablementRisk(state, opponent, resource) {
    const profile = getContinentProfile(state, opponent);
    let risk = 0;
    if (resource === "criticalMaterials") {
        const advancedNeed = Object.values(profile.pathwayAffinity).filter(value => value === "strong").length;
        risk += advancedNeed * 0.8;
        if (profile.penaltyId === "importedInputs" || profile.tradeNeed.toLowerCase().includes("critical"))
            risk += 3;
        if (opponent.resources.criticalMaterials.warehouse === 0)
            risk += 1.5;
    }
    if (resource === "constructionMaterials" && opponent.resources.constructionMaterials.warehouse <= 1)
        risk += 2;
    if (resource === "fossilFuel" && profile.pathwayAffinity.fossil === "strong")
        risk += 2;
    if (resource === "biomass" && profile.pathwayAffinity.biomass === "strong")
        risk += 2;
    return risk;
}
export function chooseAiSummitOffer(state, player) {
    if (state.phase !== "setup.summit" || state.opening.summit.pendingOffer)
        return null;
    const maxTrades = state.config.opening?.summitMaximumTradesPerPlayer ?? 2;
    const maxBundle = state.config.opening?.summitMaximumBundlePerSide ?? 2;
    if ((player.summitTrades ?? 0) >= maxTrades)
        return null;
    let best = null;
    for (const recipient of Object.values(state.players)) {
        if (recipient.id === player.id || (recipient.summitTrades ?? 0) >= maxTrades)
            continue;
        for (const requested of resourceTypes) {
            if ((player.summitExports?.[requested] ?? 0) > 0)
                continue;
            for (let requestedQuantity = 1; requestedQuantity <= Math.min(maxBundle, recipient.resources[requested].warehouse); requestedQuantity++) {
                const requestedValue = summitResourceValue(state, player, requested) * requestedQuantity;
                for (const offered of resourceTypes) {
                    if (offered === requested || (player.summitImports?.[offered] ?? 0) > 0)
                        continue;
                    for (let offeredQuantity = 1; offeredQuantity <= Math.min(maxBundle, player.resources[offered].warehouse); offeredQuantity++) {
                        const offeredCost = summitResourceValue(state, player, offered) * offeredQuantity;
                        const recipientGain = summitResourceValue(state, recipient, offered, false) * offeredQuantity;
                        const recipientCost = summitResourceValue(state, recipient, requested, false) * requestedQuantity;
                        const enablementRisk = publicTradeEnablementRisk(state, recipient, offered) * offeredQuantity;
                        const proposerUtility = requestedValue - offeredCost - enablementRisk;
                        const recipientUtility = recipientGain - recipientCost;
                        const score = proposerUtility + recipientUtility * 0.7;
                        if (proposerUtility > 0.4 && recipientUtility > -0.25 && score > 1.5 && (!best || score > best.score))
                            best = {
                                score,
                                recipientId: recipient.id,
                                proposerGives: { [offered]: offeredQuantity },
                                recipientGives: { [requested]: requestedQuantity }
                            };
                    }
                }
            }
        }
    }
    return best;
}
export function aiAcceptsSummitOffer(state, recipient, offer) {
    const received = resourceTypes.reduce((sum, r) => sum + (offer.proposerGives[r] ?? 0) * summitResourceValue(state, recipient, r), 0);
    const given = resourceTypes.reduce((sum, r) => sum + (offer.recipientGives[r] ?? 0) * summitResourceValue(state, recipient, r), 0);
    const proposer = state.players[offer.proposerId];
    const enablementRisk = resourceTypes.reduce((sum, resource) => sum + (offer.recipientGives[resource] ?? 0) * publicTradeEnablementRisk(state, proposer, resource), 0);
    return received + 0.25 >= given + enablementRisk;
}
// -----------------------------------------------------------------------------
// Automatic AI turn progression
// -----------------------------------------------------------------------------
function applyAiCommand(game, command) {
    return game.executionMode === "simulation" ? applyCommandFast(game, command) : applyCommand(game, command);
}
function currentPlayer(game) {
    const id = currentPlayerId(game);
    return id ? game.players[id] : null;
}
export function aiStep(game) {
    // A pending Summit offer belongs to its recipient, not to the active proposer.
    // Resolve this first so a human proposer can never leave an AI recipient waiting forever.
    if (game.phase === "setup.summit") {
        const pending = game.opening.summit.pendingOffer;
        if (pending) {
            const recipient = game.players[pending.recipientId];
            if (recipient.controller.kind !== "ai")
                return false;
            applyAiCommand(game, {
                type: "respondSummitTrade",
                recipientId: recipient.id,
                accept: aiAcceptsSummitOffer(game, recipient, pending)
            });
            return true;
        }
        const summitPlayer = currentPlayer(game);
        if (!summitPlayer || summitPlayer.controller.kind !== "ai")
            return false;
        const offer = chooseAiSummitOffer(game, summitPlayer);
        if (offer)
            applyAiCommand(game, { type: "proposeSummitTrade", proposerId: summitPlayer.id, ...offer });
        else
            applyAiCommand(game, { type: "passSummitTurn", playerId: summitPlayer.id });
        return true;
    }
    const player = currentPlayer(game);
    if (!player || player.controller.kind !== "ai")
        return false;
    if (game.phase === "setup.foundingProjects") {
        applyAiCommand(game, {
            type: "resolveFoundingProject",
            playerId: player.id,
            complete: canCompleteFoundingProject(game, player.id)
        });
        return true;
    }
    if (game.phase === "generation.development") {
        if (!(game.uiMode !== "strategy" && game.generation === 1)) {
            const tradeDecision = attemptAiTrade(game, player);
            if (tradeDecision?.actionSpent)
                return true;
        }
        const decision = chooseDevelopmentDecision(game, player);
        recordAiDecision(game, decision);
        applyAiCommand(game, { type: "developmentAction", playerId: player.id, action: decision.action });
        return true;
    }
    if (game.phase === "generation.dispatch") {
        const decision = chooseDispatchDecision(game, player);
        recordAiDecision(game, decision);
        applyAiCommand(game, { type: "dispatch", playerId: player.id, plan: decision.plan });
        return true;
    }
    return false;
}
export function pumpAi(game) {
    let guard = 0;
    while (aiStep(game)) {
        guard += 1;
        if (guard > 100)
            throw new Error("AI turn loop exceeded safety limit.");
    }
    return game;
}

