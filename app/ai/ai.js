import { conditionApplies, hasRelevantSystem } from "../engine/conditions/conditions.js";
import { applyCommand, applyCommandFast } from "../engine/stateMachine.js";
import { effectivePathwayOpportunity, emptyEnergy, fuelPlantMaximumOutput, getTechnology, hasTechnology, log, pathways, resourceTypes, totalEnergy } from "../engine/helpers.js";
import { aiStrategyProfiles } from "./profiles.js";
import { randomInt } from "../random/rng.js";
const strategyCapability = {
    solarStorage: "storage",
    windGrid: "transport",
    hydroReliability: "storage",
    biomassRenewal: "research",
    fossilTempo: "transformation",
    diversifiedAdapter: "trade"
};
export function aiPrepared(strategy) {
    const profile = aiStrategyProfiles[strategy];
    return { pathwayId: profile.preparedPathway, capabilityId: strategyCapability[strategy] };
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
    return !technology.starter && (technology.alwaysAvailable || state.innovationMarket.visible.includes(technology.id));
}
function estimateBuild(state, player, technology) {
    let constructionMaterials = technology.cost.constructionMaterials;
    let criticalMaterials = technology.cost.criticalMaterials;
    let effectiveKnowledge = player.knowledge + player.temporaryKnowledge;
    if (player.prepared.pathwayId && !player.prepared.pathwayUsed && technology.pathway === player.prepared.pathwayId) {
        constructionMaterials = Math.max(0, constructionMaterials - 1);
        effectiveKnowledge += 1;
    }
    if (player.prepared.capabilityId && !player.prepared.capabilityUsed) {
        if (player.prepared.capabilityId === "storage" && technology.stage === "storage")
            criticalMaterials = Math.max(0, criticalMaterials - 1);
        if (player.prepared.capabilityId === "efficiency" && technology.stage === "efficiency")
            criticalMaterials = Math.max(0, criticalMaterials - 1);
    }
    const condition = conditionApplies(state, player);
    if (condition?.effect.kind === "firstBuildConstructionDelta" && !player.localCondition?.triggered) {
        constructionMaterials += condition.effect.amount;
    }
    return { constructionMaterials, criticalMaterials, effectiveKnowledge };
}
function canBuild(state, player, technology) {
    if (!technologyAvailable(state, technology))
        return false;
    if (technology.copyLimit !== undefined && player.installed.filter(item => item.technologyId === technology.id).length >= technology.copyLimit)
        return false;
    if (technology.prerequisiteTechnologyId && !hasTechnology(player, technology.prerequisiteTechnologyId))
        return false;
    const estimate = estimateBuild(state, player, technology);
    return estimate.effectiveKnowledge >= technology.knowledgeRequired
        && player.resources.constructionMaterials.warehouse >= estimate.constructionMaterials
        && player.resources.criticalMaterials.warehouse >= estimate.criticalMaterials;
}
function forecastAffinity(state, pathway) {
    const current = state.weather.current;
    const forecast = state.weather.forecast;
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
    return scoreFace(current) * 0.65 + scoreFace(forecast) * 0.35;
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
        const existing = installed.filter(item => item.stage === "transport").reduce((sum, item) => sum + item.capacity, 0) - replacedCapacity;
        const conditionNeed = conditionApplies(state, player)?.effect.kind === "gridCapacityDelta" ? 1 : 0;
        return Math.max(0, Math.min(technology.capacity, 6 + conditionNeed - existing));
    }
    if (technology.storage?.type === "battery") {
        const variableCapture = installed.filter(item => item.stage === "capture" && (item.pathway === "solar" || item.pathway === "wind")).reduce((sum, item) => sum + item.capacity, 0);
        const existing = installed.filter(item => item.storage?.type === "battery").reduce((sum, item) => sum + (item.storage?.capacity ?? 0), 0) - replacedStorage;
        const desired = Math.min(8, Math.max(0, variableCapture));
        return Math.max(0, Math.min(technology.storage.capacity, desired - existing));
    }
    if (technology.pathway === "hydro" && technology.stage === "transformation") {
        const existing = installed.filter(item => item.pathway === "hydro" && item.stage === "transformation").reduce((sum, item) => sum + item.capacity, 0) - replacedCapacity;
        return Math.max(0, Math.min(technology.capacity, continent.opportunities.hydro - existing));
    }
    if (technology.storage?.type === "reservoir") {
        const existing = installed.filter(item => item.storage?.type === "reservoir").reduce((sum, item) => sum + (item.storage?.capacity ?? 0), 0) - replacedStorage;
        const desired = Math.max(3, continent.opportunities.hydro * 2);
        return Math.max(0, Math.min(technology.storage.capacity, desired - existing));
    }
    if (technology.pathway === "solar" || technology.pathway === "wind") {
        const existing = installed.filter(item => item.pathway === technology.pathway && item.stage === "capture").reduce((sum, item) => sum + item.capacity, 0) - replacedCapacity;
        return Math.max(0, Math.min(technology.capacity, continent.opportunities[technology.pathway] - existing));
    }
    if ((technology.pathway === "biomass" || technology.pathway === "fossil") && technology.stage === "transformation") {
        const existing = installed.filter(item => item.pathway === technology.pathway && item.stage === "transformation").reduce((sum, item) => sum + item.maximumOutput, 0) - replacedOutput;
        return Math.max(0, Math.min(technology.maximumOutput, effectivePathwayOpportunity(state, player, technology.pathway) - existing));
    }
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
        const hasAdvancedFuel = hasTechnology(player, "carbonCapturePlant");
        value += state.generation <= 5 ? 2.0 : hasAdvancedFuel ? 1.5 : 0.5;
        if (account.warehouse === 0 && account.currentContinent > 0)
            value += 1.5;
    }
    if (resource === "biomass" && strategy === "biomassRenewal")
        value += 2;
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
    if (player.knowledge >= state.config.rules.knowledgeMaximum)
        return false;
    const cost = researchCost(state, player);
    return Boolean(cost && player.resources.constructionMaterials.warehouse >= cost.constructionMaterials && player.resources.criticalMaterials.warehouse >= cost.criticalMaterials);
}
export function generateLegalDevelopmentActions(state, player) {
    const actions = [];
    const maximum = state.config.rules.warehouseMaximum;
    for (const resource of ["fossilFuel", "constructionMaterials", "criticalMaterials"]) {
        const account = player.resources[resource];
        if (account.currentContinent > 0 && account.warehouse < maximum)
            actions.push({ kind: "extract", resource });
    }
    if (player.resources.biomass.currentContinent > 0 && player.resources.biomass.warehouse < maximum)
        actions.push({ kind: "harvestBiomass" });
    if (canResearch(state, player))
        actions.push({ kind: "research" });
    for (const technology of state.config.technologies)
        if (canBuild(state, player, technology))
            actions.push({ kind: "build", technologyId: technology.id });
    const activeCondition = conditionApplies(state, player);
    if (activeCondition && "adaptable" in activeCondition.effect && activeCondition.effect.adaptable && !player.localCondition?.adapted) {
        actions.push({ kind: "adapt" });
    }
    if (state.config.trade.publicImportEnabled) {
        for (const receive of resourceTypes) {
            if (player.resources[receive].warehouse >= maximum)
                continue;
            let required = receive === "criticalMaterials" ? state.config.trade.criticalImportCost : state.config.trade.normalImportCost;
            if (player.prepared.capabilityId === "trade" && !player.prepared.capabilityUsed)
                required = Math.max(1, required - 1);
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
        const value = aiResourceValue(state, player, resource) * 2.2;
        factors.push(factor("resource", "Resource need", value, `${resource} is valued at ${aiResourceValue(state, player, resource).toFixed(1)} by this strategy.`));
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
        const locked = state.config.technologies.filter(technology => technology.knowledgeRequired === nextMilestone).length;
        const cost = researchCost(state, player);
        factors.push(factor("unlock", "Progress to Knowledge milestone", locked * 1.5 / Math.max(1, distance), `Knowledge ${nextMilestone} unlocks ${locked} configured technologies; ${distance} learning step${distance === 1 ? "" : "s"} remain.`));
        factors.push(factor("time", "Remaining time", remainingGenerations * 0.75, `${remainingGenerations} Generations remain to benefit from permanent Knowledge and Knowledge Link income.`));
        if (cost)
            factors.push(factor("learningCost", "Learning materials", -(cost.constructionMaterials * 1.1 + cost.criticalMaterials * 1.6), `This step costs ${cost.constructionMaterials} General Materials and ${cost.criticalMaterials} Critical Minerals.`));
        if (cost?.appliedLearningUsed)
            factors.push(factor("appliedLearning", "Biomass Applied Learning", 4.5, "An Applied Learning token replaces one General Material."));
        if (strategy === "biomassRenewal")
            factors.push(factor("knowledgeEconomy", "Biomass knowledge strategy", 4, "Biomass uses accessible early technology so saved resources can develop Knowledge and earn Knowledge Link payments."));
        if (strategy === "fossilTempo" && hasTechnology(player, "combinedCycle") && player.knowledge < 5) {
            const lateFuelPayoff = state.generation >= 4 ? 4 : 1;
            factors.push(factor("advancedFuelKnowledge", "Knowledge-5 fuel option", lateFuelPayoff, "Knowledge 5 is the only fuel-only upgrade that can supply the four-Light final target; reaching it is difficult but may justify extending the bridge."));
        }
    }
    if (action.kind === "build") {
        const technology = getTechnology(state, action.technologyId);
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
            const opportunity = continentFor(state, player).opportunities[technology.pathway];
            factors.push(factor("opportunity", "Continental Opportunity", opportunity * pathwayWeight * 0.75, `${technology.pathway} Opportunity is ${opportunity}.`));
        }
        if (technology.prerequisiteTechnologyId)
            factors.push(factor("upgrade", "Pathway upgrade", 5 + technology.knowledgeRequired, `${technology.name} upgrades an existing technology rather than opening an isolated chain.`));
        if (technology.knowledgeRequired === 5)
            factors.push(factor("knowledgeFive", "Knowledge-5 payoff", 25, "This advanced technology is the main payoff for reaching maximum Knowledge."));
        if (strategy === "biomassRenewal" && player.knowledge >= 3 && technology.pathway !== "biomass" && technology.pathway !== "shared") {
            const newPathway = !player.installed.some(instance => getTechnology(state, instance.technologyId).pathway === technology.pathway);
            factors.push(factor("knowledgeDiversification", "Knowledge-funded diversification", newPathway ? 12 : 6, "Biomass Applied Learning and Knowledge Link income are intended to finance a second energy pathway."));
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
        if (technology.stage === "transport")
            factors.push(factor("grid", "Transport headroom", 4 + reliabilityGap * 1.2, "Grid capacity protects generated Energy from curtailment."));
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
        factors.push(factor("cost", "Construction cost", -costPenalty, `Estimated cost is ${estimate.constructionMaterials} General Materials and ${estimate.criticalMaterials} Critical Minerals.`));
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
        factors.push(factor("received", "Imported resource", receivedValue, `${action.receive} directly addresses a current resource valuation.`));
        factors.push(factor("exchange", "Import payment", -paymentValue, "Public import destroys more Warehouse resources than it creates."));
        factors.push(factor("actionCost", "Action opportunity cost", -2.5, "Public import also consumes a Development action."));
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
        case "publicImport": return `Import ${action.receive}`;
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
export function considerAiTechnicalAssistance(state, receiver) {
    if (state.phase !== "generation.development" || receiver.controller.kind !== "ai" || receiver.knowledgeLinkUsed || receiver.actionsRemaining <= 0)
        return null;
    const profile = aiStrategyProfiles[receiver.controller.strategy];
    const ownKnowledge = receiver.knowledge + receiver.temporaryKnowledge;
    const candidates = state.config.technologies.filter(technology => {
        if (!technologyAvailable(state, technology) || technology.starter)
            return false;
        if (technology.knowledgeRequired <= ownKnowledge)
            return false;
        if (technology.prerequisiteTechnologyId && !hasTechnology(receiver, technology.prerequisiteTechnologyId))
            return false;
        if (technology.copyLimit !== undefined && receiver.installed.filter(item => item.technologyId === technology.id).length >= technology.copyLimit)
            return false;
        const estimate = estimateBuild(state, receiver, technology);
        return receiver.resources.constructionMaterials.warehouse >= estimate.constructionMaterials
            && receiver.resources.criticalMaterials.warehouse >= estimate.criticalMaterials;
    });
    let best = null;
    for (const technology of candidates) {
        const estimate = estimateBuild(state, receiver, technology);
        const pathwayWeight = technology.pathway === "shared" ? 1 : profile.pathwayWeights[technology.pathway];
        const receiverBase = marginalTechnologyCapacity(state, receiver, technology) * pathwayWeight * profile.stageWeights[technology.stage] * 2
            + (technology.prerequisiteTechnologyId ? 5 : 0)
            + (state.config.rules.generations - state.generation + 1) * 0.35;
        for (const lender of Object.values(state.players)) {
            if (lender.id === receiver.id || lender.knowledgeLinkUsed || lender.knowledge < technology.knowledgeRequired)
                continue;
            for (const paymentResource of resourceTypes) {
                const reservedForBuild = paymentResource === "constructionMaterials" ? estimate.constructionMaterials : paymentResource === "criticalMaterials" ? estimate.criticalMaterials : 0;
                if (receiver.resources[paymentResource].warehouse - reservedForBuild < 1 || lender.resources[paymentResource].warehouse >= state.config.rules.warehouseMaximum)
                    continue;
                const paymentCost = aiResourceValue(state, receiver, paymentResource);
                const lenderValue = aiResourceValue(state, lender, paymentResource);
                const receiverScore = receiverBase - paymentCost - Math.max(0, technology.knowledgeRequired - ownKnowledge) * 0.5;
                const lenderScore = lenderValue + (lender.controller.kind === "ai" && lender.controller.strategy === "biomassRenewal" ? 0.75 : 0);
                const accepted = receiverScore > 4 && lenderScore > 0.25;
                const decision = {
                    kind: "assistance",
                    lenderId: lender.id,
                    receiverId: receiver.id,
                    technologyId: technology.id,
                    paymentResource,
                    lenderScore,
                    receiverScore,
                    accepted,
                    actionSpent: accepted,
                    summary: accepted
                        ? `${lender.name} shares Knowledge ${technology.knowledgeRequired} so ${receiver.name} can build ${technology.name}.`
                        : `${lender.name} declines the Knowledge Link.`,
                    factors: [
                        factor("receiverUnlock", "Technology unlocked", receiverScore, `${technology.name} is built now without permanently increasing ${receiver.name}'s Knowledge.`),
                        factor("lenderPayment", "Knowledge income", lenderScore, `${lender.name} receives 1 ${paymentResource} outside its turn.`)
                    ]
                };
                if (accepted && (!best || lenderScore + receiverScore > best.lenderScore + best.receiverScore))
                    best = decision;
            }
        }
    }
    return best;
}
export function attemptAiTechnicalAssistance(state, receiver) {
    const decision = considerAiTechnicalAssistance(state, receiver);
    if (!decision || !decision.accepted)
        return decision;
    try {
        applyCommandFast(state, {
            type: "knowledgeLinkBuild",
            borrowerId: decision.receiverId,
            lenderId: decision.lenderId,
            technologyId: decision.technologyId,
            paymentResource: decision.paymentResource
        });
        recordAiDecision(state, decision);
        return decision;
    }
    catch {
        return null;
    }
}
export function considerAiTrade(state, proposer, utilityThreshold = 0.35) {
    if (state.phase !== "generation.development" || !state.config.trade.directEnabled)
        return null;
    if (proposer.controller.kind !== "ai")
        return null;
    const activeId = state.turnOrder[state.activeTurnIndex];
    if (activeId !== proposer.id)
        return null;
    const freeLimit = state.config.trade.freeDirectTradesPerGeneration ?? 0;
    const actionSpent = (proposer.initiatedTrades ?? 0) >= freeLimit;
    if (actionSpent && proposer.actionsRemaining <= 0)
        return null;
    if (actionSpent && state.generation < 6)
        return null;
    const threshold = actionSpent ? utilityThreshold + 1.25 : utilityThreshold + 0.45;
    let best = null;
    for (const recipient of Object.values(state.players)) {
        if (recipient.id === proposer.id || recipient.controller.kind !== "ai")
            continue;
        for (const offeredResource of resourceTypes) {
            const offeredAccount = proposer.resources[offeredResource];
            if (offeredAccount.warehouse < 3)
                continue;
            for (const requestedResource of resourceTypes) {
                const requestedAccount = proposer.resources[requestedResource];
                const severeScarcity = requestedAccount.currentContinent === 0 && requestedAccount.warehouse <= 1;
                const lateScarcity = state.generation >= 5 && requestedAccount.currentContinent <= 1 && requestedAccount.warehouse <= 1;
                if (!severeScarcity && !lateScarcity)
                    continue;
                if (actionSpent && !severeScarcity)
                    continue;
                if (requestedResource === offeredResource || recipient.resources[requestedResource].warehouse < 2)
                    continue;
                const proposerScore = aiResourceValue(state, proposer, requestedResource) - aiResourceValue(state, proposer, offeredResource);
                const recipientScore = aiResourceValue(state, recipient, offeredResource) - aiResourceValue(state, recipient, requestedResource);
                const accepted = proposerScore > threshold && recipientScore > threshold;
                const decision = {
                    kind: "trade",
                    proposerId: proposer.id,
                    recipientId: recipient.id,
                    offeredResource,
                    requestedResource,
                    proposerScore,
                    recipientScore,
                    accepted,
                    actionSpent,
                    summary: accepted
                        ? `${proposer.name} and ${recipient.name} value opposite sides of a ${offeredResource}-for-${requestedResource} exchange strongly enough to spend an action.`
                        : `${recipient.name} does not gain enough value from the proposed exchange.`,
                    factors: [
                        factor("proposerUtility", "Proposer utility", proposerScore, `${proposer.name} gains ${proposerScore.toFixed(2)} estimated resource utility.`),
                        factor("recipientUtility", "Recipient utility", recipientScore, `${recipient.name} gains ${recipientScore.toFixed(2)} estimated resource utility.`),
                        factor("tradeCost", "Trade action cost", -1, "Every direct trade uses one Development action.")
                    ]
                };
                if (accepted && (!best || proposerScore + recipientScore > best.proposerScore + best.recipientScore))
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
    const continent = continentFor(state, player);
    const capacity = player.installed
        .filter(instance => operational(state, instance.builtGeneration))
        .map(instance => getTechnology(state, instance.technologyId))
        .filter(technology => technology.pathway === pathway && technology.stage === "capture")
        .reduce((sum, technology) => sum + technology.capacity, 0);
    const ideal = Math.min(continent.opportunities[pathway], capacity);
    let output = state.config.weather[pathway][state.weather.current][ideal] ?? 0;
    const condition = conditionApplies(state, player);
    if (pathway === "solar" && condition?.effect.kind === "solarDelta")
        output += condition.effect.amount;
    if (pathway === "wind" && condition?.effect.kind === "windDelta")
        output += condition.effect.amount;
    return Math.max(0, Math.min(ideal, output));
}
function hydroRequest(state, player) {
    const continent = continentFor(state, player);
    let inflow = state.config.weather.hydro[state.weather.current][continent.opportunities.hydro] ?? 0;
    const condition = conditionApplies(state, player);
    if (condition?.effect.kind === "hydroDelta")
        inflow = Math.max(0, inflow + condition.effect.amount);
    const reservoirs = player.installed
        .filter(instance => operational(state, instance.builtGeneration) && getTechnology(state, instance.technologyId).storage?.type === "reservoir");
    const stored = reservoirs.reduce((sum, instance) => sum + totalEnergy(instance.storageInput), 0);
    const room = reservoirs.reduce((sum, instance) => {
        const technology = getTechnology(state, instance.technologyId);
        return sum + Math.max(0, (technology.storage?.capacity ?? 0) - totalEnergy(instance.storageInput));
    }, 0);
    const acceptedInflow = Math.min(inflow, room);
    const turbine = player.installed
        .filter(instance => operational(state, instance.builtGeneration))
        .map(instance => getTechnology(state, instance.technologyId))
        .filter(technology => technology.pathway === "hydro" && technology.stage === "transformation")
        .reduce((sum, technology) => sum + technology.capacity, 0);
    return Math.min(continent.opportunities.hydro, turbine, stored + acceptedInflow);
}
function fuelRequests(state, player) {
    const requests = {};
    const used = { biomass: 0, fossil: 0 };
    const fuelAvailable = { biomass: player.resources.biomass.warehouse, fossilFuel: player.resources.fossilFuel.warehouse };
    const continent = continentFor(state, player);
    for (const instance of player.installed) {
        const technology = getTechnology(state, instance.technologyId);
        if (!operational(state, instance.builtGeneration) || !technology.fuel || !(technology.pathway === "biomass" || technology.pathway === "fossil"))
            continue;
        if (fuelAvailable[technology.fuel.resource] < technology.fuel.units)
            continue;
        const remaining = effectivePathwayOpportunity(state, player, technology.pathway) - used[technology.pathway];
        if (remaining <= 0)
            continue;
        const output = Math.min(fuelPlantMaximumOutput(state, player, technology), remaining);
        requests[instance.instanceId] = output;
        used[technology.pathway] += output;
        fuelAvailable[technology.fuel.resource] -= technology.fuel.units;
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
    if (condition?.effect.kind === "gridCapacityDelta")
        capacity += condition.effect.amount;
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
    const activeCondition = conditionApplies(state, player);
    for (const [id, output] of Object.entries(fuel)) {
        const instance = player.installed.find(item => item.instanceId === id);
        const technology = getTechnology(state, instance.technologyId);
        let actual = output;
        if (activeCondition?.effect.kind === "firstFuelPlantOutputDelta" && !disruptionApplied) {
            actual = Math.max(0, actual + activeCondition.effect.amount);
            disruptionApplied = true;
        }
        if (technology.pathway === "biomass" || technology.pathway === "fossil")
            available[technology.pathway] += actual;
    }
    const batteryDischargeInput = {};
    let availableTotal = totalEnergy(available);
    const desiredTransport = Math.min(4, gridCapacity(state, player));
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
            return technology.storage?.type === "battery" && totalEnergy(instance.storageInput) < technology.storage.capacity;
        });
        if (battery) {
            const technology = getTechnology(state, battery.technologyId);
            let toStore = Math.min(technology.storage.capacity - totalEnergy(battery.storageInput), totalEnergy(available));
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
        return sum + Math.max(0, (technology.loss?.fixedPerOperation ?? 0));
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
    else {
        log(state, "ai.assistanceDecision", decision.summary, decision.receiverId, {
            decisionKind: decision.kind,
            lenderId: decision.lenderId,
            technologyId: decision.technologyId,
            accepted: decision.accepted,
            factors: decision.factors
        });
    }
}
//# sourceMappingURL=ai.js.map