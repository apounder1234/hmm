import { conditionApplies, getCondition } from "../conditions/conditions.js";
import { countInstalled, emptyEnergy, getPlayer, getTechnology, log, resourceTypes } from "../helpers.js";
import { applyCompletedUpgradeConsequences, getEffectiveUpgradeCost, getKnowledgeRequirement } from "../continentRules.js";
function spendAction(player) { if (player.actionsRemaining <= 0)
    throw new Error(`${player.name} has no Development actions remaining.`); player.actionsRemaining--; }
function checkWarehouseRoom(state, player, r, amount = 1) { if (player.resources[r].warehouse + amount > state.config.rules.warehouseMaximum)
    throw new Error(`${player.name}'s ${r} Warehouse would exceed capacity.`); }
function consumePayment(player, payment) {
    let total = 0;
    for (const r of resourceTypes) {
        const n = payment[r] ?? 0;
        if (!Number.isInteger(n) || n < 0)
            throw new Error("Import payments must be non-negative integers.");
        if (player.resources[r].warehouse < n)
            throw new Error(`Insufficient ${r} for import.`);
        total += n;
    }
    for (const r of resourceTypes)
        player.resources[r].warehouse -= payment[r] ?? 0;
    return total;
}
function availableForBuild(state, technology) { return technology.alwaysAvailable || state.innovationMarket.visible.includes(technology.id); }
function refillMarket(state) { while (state.innovationMarket.visible.length < state.config.rules.innovationMarketSlots && state.innovationMarket.drawPile.length) {
    state.innovationMarket.visible.push(state.innovationMarket.drawPile.shift());
} }
function logContinentBuildEffects(state, player, tech, cost) {
    if (cost.usesInnovationBoost) {
        player.currentMetrics.continentAbilityActivations++;
        log(state, "continent.ability", `${player.name} used Innovation Boost to count Knowledge one level higher for ${tech.name}.`, player.id, { abilityId: "innovationBoost", technologyId: tech.id, value: 1 });
    }
    if (cost.usesAsiaSolarDiscount)
        log(state, "continent.ability", `${player.name} used Manufacturing Scale: ${tech.name} cost one fewer Other Material.`, player.id, { abilityId: "manufacturingScale", technologyId: tech.id, value: 1 });
    if (cost.usesAdvancedSystems)
        log(state, "continent.ability", `${player.name}'s Advanced Systems readiness lowered the Knowledge requirement for ${tech.name}.`, player.id, { abilityId: "advancedSystems", technologyId: tech.id, value: cost.standardKnowledgeRequired - cost.knowledgeRequired });
    const regionalPenalties = cost.modifiers.filter(item => ["europeImportedInputs", "northAmericaTransmissionPenalty", "australiaTransmissionPenalty"].includes(item.id));
    for (const modifier of regionalPenalties)
        log(state, "continent.penalty", `${player.name} paid ${modifier.label}: one additional ${modifier.resource === "criticalMaterials" ? "Critical Mineral" : "Other Material"}.`, player.id, { penaltyId: modifier.id, technologyId: tech.id, value: 1 });
    if (cost.consumesLockIn)
        log(state, "continent.penalty", `${player.name} paid the additional Other Material caused by Fossil Lock-In.`, player.id, { penaltyId: "fossilLockIn", technologyId: tech.id, value: 1 });
    if (player.lockInTokens === 1 && tech.pathway === "fossil" && tech.tier !== "basic")
        log(state, "continent.penalty", `${player.name} gained one Fossil Lock-In token. The next Level 2 or 3 non-fossil upgrade costs one additional Other Material.`, player.id, { penaltyId: "fossilLockIn", technologyId: tech.id, value: 1 });
}
function build(state, player, technologyId, options = {}) {
    const tech = getTechnology(state, technologyId);
    if (tech.starter && countInstalled(player, tech.id) > 0)
        throw new Error(`${tech.name} is starting infrastructure and cannot be built again.`);
    if (!availableForBuild(state, tech))
        throw new Error(`${tech.name} is not available.`);
    if (tech.copyLimit !== undefined && countInstalled(player, tech.id) >= tech.copyLimit)
        throw new Error(`${tech.name} copy limit reached.`);
    if (tech.prerequisiteTechnologyId && countInstalled(player, tech.prerequisiteTechnologyId) < 1) {
        const prerequisite = getTechnology(state, tech.prerequisiteTechnologyId);
        throw new Error(`${player.name} must build ${prerequisite.name} before ${tech.name}.`);
    }
    if (tech.minimumRegionalOpportunity !== undefined) {
        const continent = state.config.continents.find(item => item.id === player.continentId);
        const regionalOpportunity = continent?.opportunities?.[tech.pathway] ?? 0;
        if (regionalOpportunity < tech.minimumRegionalOpportunity)
            throw new Error(`${tech.name} provides no additional usable ${tech.pathway} output in ${continent?.name ?? "this region"}. Choose another pathway.`);
    }
    const cost = getEffectiveUpgradeCost(state, player.id, tech, { allowPreparedPathway: options.allowPreparedPathway, useContinentAbility: Boolean(options.useContinentAbility) });
    if (cost.invalidAbilityReason)
        throw new Error(cost.invalidAbilityReason);
    if (cost.effectiveKnowledge < cost.knowledgeRequired)
        throw new Error(`${player.name} needs Knowledge ${cost.knowledgeRequired} to build ${tech.name}.`);
    if (player.resources.constructionMaterials.warehouse < cost.final.constructionMaterials || player.resources.criticalMaterials.warehouse < cost.final.criticalMaterials)
        throw new Error(`${player.name} needs ${cost.final.constructionMaterials} Other Materials and ${cost.final.criticalMaterials} Critical Minerals for ${tech.name}.`);
    player.resources.constructionMaterials.warehouse -= cost.final.constructionMaterials;
    player.resources.criticalMaterials.warehouse -= cost.final.criticalMaterials;
    const prerequisiteInstance = tech.prerequisiteTechnologyId ? player.installed.find(item => item.technologyId === tech.prerequisiteTechnologyId) : null;
    const instance = { instanceId: `${player.id}-${tech.id}-${player.installed.length + 1}`, technologyId: tech.id, builtGeneration: state.generation, storageInput: prerequisiteInstance ? structuredClone(prerequisiteInstance.storageInput) : emptyEnergy(), usedThisGeneration: false, firstOperationLossReduction: 0, temporaryCapacityBonus: 0 };
    let useCapability = cost.usesPreparedCapability;
    if (player.prepared.capabilityId === "transformation" && !player.prepared.capabilityUsed && tech.stage === "transformation") {
        instance.firstOperationLossReduction = 1;
        useCapability = true;
    }
    if (player.prepared.capabilityId === "transport" && !player.prepared.capabilityUsed && tech.special === "gridUpgrade") {
        instance.temporaryCapacityBonus = 1;
        useCapability = true;
    }
    if (prerequisiteInstance)
        player.installed = player.installed.filter(item => item.instanceId !== prerequisiteInstance.instanceId);
    player.installed.push(instance);
    player.currentMetrics.technologiesBuilt.push(tech.id);
    player.assistanceKnowledge = 0;
    if (cost.modifiers.some(item => item.id === "materialsShortage"))
        player.localCondition.triggered = true;
    if (cost.usesPreparedPathway) {
        player.prepared.pathwayUsed = true;
        if (tech.id === "combinedCycle")
            player.prepared.fossilBlueprintAvailable = false;
    }
    if (useCapability)
        player.prepared.capabilityUsed = true;
    applyCompletedUpgradeConsequences(state, player.id, tech, cost);
    logContinentBuildEffects(state, player, tech, cost);
    if (!tech.alwaysAvailable) {
        state.innovationMarket.visible = state.innovationMarket.visible.filter(id => id !== tech.id);
        refillMarket(state);
    }
    log(state, "action.build", `${player.name} ${prerequisiteInstance ? "upgraded to" : "built"} ${tech.name} for ${cost.final.constructionMaterials} Other Materials and ${cost.final.criticalMaterials} Critical Minerals.`, player.id, { technologyId: tech.id, replacedTechnologyId: prerequisiteInstance?.technologyId ?? null, knowledgeRequired: cost.knowledgeRequired, cost: cost.final, modifiers: cost.modifiers });
}

export function foundingProjectDefinition(state, playerId) {
    const player = getPlayer(state, playerId);
    const pathway = state.config.preparedPathways.find(item => item.id === player.prepared.pathwayId);
    if (!pathway)
        throw new Error(`${player.name} has no Starting Pathway.`);
    if (pathway.id === "fossil")
        return { kind: "fuelNetwork", name: pathway.foundingLabel, cost: pathway.foundingCost ?? { constructionMaterials: 2, criticalMaterials: 0 } };
    const technology = getTechnology(state, pathway.foundingTechnologyId);
    const costResult = getEffectiveUpgradeCost(state, player.id, technology, { allowPreparedPathway: false });
    return { kind: "technology", name: technology.name, technology, cost: costResult.final, costResult };
}
export function canCompleteFoundingProject(state, playerId) {
    const player = getPlayer(state, playerId);
    const project = foundingProjectDefinition(state, playerId);
    return player.resources.constructionMaterials.warehouse >= project.cost.constructionMaterials
        && player.resources.criticalMaterials.warehouse >= project.cost.criticalMaterials;
}
export function resolveFoundingProject(state, playerId, complete) {
    if (state.phase !== "setup.foundingProjects")
        throw new Error("Founding Projects are not active.");
    const player = getPlayer(state, playerId);
    if (player.prepared.foundingProjectResolved)
        throw new Error(`${player.name}'s Founding Project is already resolved.`);
    const project = foundingProjectDefinition(state, playerId);
    if (!complete) {
        player.prepared.foundingProjectResolved = true;
        player.prepared.foundingProjectDeferred = true;
        log(state, "founding.deferred", `${player.name} deferred ${project.name}; the Starting Pathway becomes a one-use Blueprint later.`, player.id);
        return;
    }
    if (!canCompleteFoundingProject(state, playerId))
        throw new Error(`${player.name} needs ${project.cost.constructionMaterials} Other Materials and ${project.cost.criticalMaterials} Critical Minerals for ${project.name}.`);
    if (project.kind === "fuelNetwork") {
        player.resources.constructionMaterials.warehouse -= project.cost.constructionMaterials;
        player.resources.criticalMaterials.warehouse -= project.cost.criticalMaterials;
        if (player.resources.fossilFuel.currentContinent > 0 && player.resources.fossilFuel.warehouse < state.config.rules.warehouseMaximum) {
            player.resources.fossilFuel.currentContinent--;
            player.resources.fossilFuel.warehouse++;
        }
        player.prepared.fossilBlueprintAvailable = true;
        player.prepared.pathwayUsed = true;
        log(state, "founding.completed", `${player.name} completed the Fuel Supply Network: 1 Fuel moved into the Warehouse and a Combined-Cycle Blueprint is ready.`, player.id);
    } else {
        player.resources.constructionMaterials.warehouse -= project.cost.constructionMaterials;
        player.resources.criticalMaterials.warehouse -= project.cost.criticalMaterials;
        const tech = project.technology;
        const instance = { instanceId: `${player.id}-${tech.id}-${player.installed.length + 1}`, technologyId: tech.id, builtGeneration: 0, storageInput: emptyEnergy(), usedThisGeneration: false, firstOperationLossReduction: 0, temporaryCapacityBonus: 0 };
        player.installed.push(instance);
        if (project.costResult) {
            applyCompletedUpgradeConsequences(state, player.id, tech, project.costResult);
            logContinentBuildEffects(state, player, tech, project.costResult);
        }
        player.prepared.pathwayUsed = true;
        log(state, "founding.completed", `${player.name} completed ${tech.name} before Generation 1 without using a Development action.`, player.id, { technologyId: tech.id });
    }
    player.prepared.foundingProjectResolved = true;
    player.prepared.foundingProjectCompleted = true;
}

export function performDevelopmentAction(state, playerId, action) {
    if (state.phase !== "generation.development")
        throw new Error("Development actions are not allowed in this phase.");
    const player = getPlayer(state, playerId);
    switch (action.kind) {
        case "extract": {
            const account = player.resources[action.resource];
            if (account.currentContinent <= 0)
                throw new Error(`No ${action.resource} remains in continent stock.`);
            checkWarehouseRoom(state, player, action.resource);
            spendAction(player);
            account.currentContinent--;
            account.warehouse++;
            player.currentMetrics.resourcesExtracted[action.resource] = (player.currentMetrics.resourcesExtracted[action.resource] ?? 0) + 1;
            log(state, "action.extract", `${player.name} extracted 1 ${action.resource}.`, player.id);
            break;
        }
        case "harvestBiomass": {
            const account = player.resources.biomass;
            if (account.currentContinent <= 0)
                throw new Error("No Biomass remains to harvest.");
            checkWarehouseRoom(state, player, "biomass");
            spendAction(player);
            account.currentContinent--;
            account.warehouse++;
            player.currentMetrics.resourcesExtracted.biomass = (player.currentMetrics.resourcesExtracted.biomass ?? 0) + 1;
            log(state, "action.harvest", `${player.name} harvested 1 Biomass.`, player.id);
            break;
        }
        case "research": {
            if (player.knowledge >= state.config.rules.knowledgeMaximum)
                throw new Error("Knowledge is already at its maximum.");
            const nextLevel = player.knowledge + 1;
            const printedCost = state.config.knowledge?.advancementCosts?.[nextLevel];
            if (!printedCost)
                throw new Error(`Knowledge ${nextLevel} has no configured learning cost.`);
            let generalCost = printedCost.constructionMaterials;
            const criticalCost = printedCost.criticalMaterials;
            let preparedDiscount = false;
            if (player.prepared.capabilityId === "research" && !player.prepared.capabilityUsed && generalCost > 0) {
                generalCost--;
                preparedDiscount = true;
            }
            const useAppliedLearning = player.appliedLearningTokens > 0 && generalCost > 0;
            if (useAppliedLearning)
                generalCost--;
            if (player.resources.constructionMaterials.warehouse < generalCost || player.resources.criticalMaterials.warehouse < criticalCost)
                throw new Error(`${player.name} needs ${generalCost} Other Materials and ${criticalCost} Critical Minerals to reach Knowledge ${nextLevel}.`);
            spendAction(player);
            player.resources.constructionMaterials.warehouse -= generalCost;
            player.resources.criticalMaterials.warehouse -= criticalCost;
            if (useAppliedLearning) {
                player.appliedLearningTokens--;
                player.currentMetrics.appliedLearningSpent++;
            }
            if (preparedDiscount)
                player.prepared.capabilityUsed = true;
            player.knowledge = nextLevel;
            player.currentMetrics.knowledgeGained++;
            const centre = player.installed.find(i => getTechnology(state, i.technologyId).special === "researchCentre" && !i.usedThisGeneration);
            if (centre) {
                player.temporaryKnowledge++;
                centre.usedThisGeneration = true;
            }
            log(state, "action.research", `${player.name} increased permanent Knowledge to ${player.knowledge} for ${generalCost} Other Materials and ${criticalCost} Critical Minerals${useAppliedLearning ? ", using 1 Applied Learning token" : ""}.`, player.id, { nextLevel, generalCost, criticalCost, appliedLearningUsed: useAppliedLearning });
            break;
        }
        case "build":
            spendAction(player);
            try {
                build(state, player, action.technologyId, { useContinentAbility: Boolean(action.useContinentAbility) });
            }
            catch (error) {
                player.actionsRemaining++;
                throw error;
            }
            break;
        case "publicImport": {
            if (!state.config.trade.publicImportEnabled)
                throw new Error("Public import is disabled.");
            checkWarehouseRoom(state, player, action.receive);
            if ((state.worldMarket?.[action.receive] ?? 0) <= 0)
                throw new Error(`The global ${action.receive} stock is empty.`);
            let required = action.receive === "criticalMaterials" ? state.config.trade.criticalImportCost : state.config.trade.normalImportCost;
            const usePreparedTrade = player.prepared.capabilityId === "trade" && !player.prepared.capabilityUsed;
            if (usePreparedTrade)
                required = Math.max(1, required - 1);
            if ((action.payment[action.receive] ?? 0) > 0)
                throw new Error("The imported resource cannot also be used as payment.");
            const paymentTotal = Object.values(action.payment).reduce((n, v) => n + (v ?? 0), 0);
            if (paymentTotal !== required)
                throw new Error(`Import requires exactly ${required} resources.`);
            spendAction(player);
            try {
                consumePayment(player, action.payment);
            }
            catch (error) {
                player.actionsRemaining++;
                throw error;
            }
            if (usePreparedTrade)
                player.prepared.capabilityUsed = true;
            player.resources[action.receive].warehouse++;
            state.worldMarket[action.receive]--;
            player.currentMetrics.importsCompleted++;
            player.currentMetrics.resourcesImported[action.receive] = (player.currentMetrics.resourcesImported[action.receive] ?? 0) + 1;
            log(state, "action.import", `${player.name} imported 1 ${action.receive} for ${required} resources.`, player.id, { receive: action.receive, payment: structuredClone(action.payment), required });
            break;
        }
        case "adapt": {
            const active = player.localCondition;
            if (!active)
                throw new Error("No Local Condition to adapt to.");
            const def = getCondition(state, active.definitionId);
            if (!("adaptable" in def.effect) || !def.effect.adaptable)
                throw new Error(`${def.name} has no Adapt response.`);
            if (active.adapted)
                throw new Error("Local Condition was already adapted to.");
            spendAction(player);
            active.adapted = true;
            log(state, "action.adapt", `${player.name} adapted to ${def.name}.`, player.id);
            break;
        }
        case "pass":
            spendAction(player);
            log(state, "action.pass", `${player.name} passed.`, player.id);
            break;
    }
}
//# sourceMappingURL=actions.js.map