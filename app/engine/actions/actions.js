import { conditionApplies, getCondition } from "../conditions/conditions.js";
import { countInstalled, emptyEnergy, getPlayer, getTechnology, log, resourceTypes } from "../helpers.js";
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
function build(state, player, technologyId) {
    const tech = getTechnology(state, technologyId);
    if (tech.starter)
        throw new Error(`${tech.name} is starting infrastructure and cannot be built again.`);
    if (!availableForBuild(state, tech))
        throw new Error(`${tech.name} is not available.`);
    if (tech.copyLimit !== undefined && countInstalled(player, tech.id) >= tech.copyLimit)
        throw new Error(`${tech.name} copy limit reached.`);
    if (tech.prerequisiteTechnologyId && countInstalled(player, tech.prerequisiteTechnologyId) < 1) {
        const prerequisite = getTechnology(state, tech.prerequisiteTechnologyId);
        throw new Error(`${player.name} must build ${prerequisite.name} before ${tech.name}.`);
    }
    let cm = tech.cost.constructionMaterials, critical = tech.cost.criticalMaterials, effectiveKnowledge = player.knowledge + player.temporaryKnowledge + player.assistanceKnowledge;
    let usePathway = false, useCapability = false;
    if (player.prepared.pathwayId && !player.prepared.pathwayUsed && tech.pathway === player.prepared.pathwayId) {
        cm = Math.max(0, cm - 1);
        effectiveKnowledge += 1;
        usePathway = true;
    }
    if (player.prepared.capabilityId && !player.prepared.capabilityUsed) {
        if (player.prepared.capabilityId === "storage" && tech.stage === "storage") {
            critical = Math.max(0, critical - 1);
            useCapability = true;
        }
        if (player.prepared.capabilityId === "efficiency" && tech.stage === "efficiency") {
            critical = Math.max(0, critical - 1);
            useCapability = true;
        }
    }
    const condition = conditionApplies(state, player);
    const materialsShortageDelta = condition?.effect.kind === "firstBuildConstructionDelta" ? condition.effect.amount : 0;
    const triggerMaterialsShortage = materialsShortageDelta !== 0 && !player.localCondition.triggered;
    if (triggerMaterialsShortage)
        cm += materialsShortageDelta;
    if (effectiveKnowledge < tech.knowledgeRequired)
        throw new Error(`${player.name} needs Knowledge ${tech.knowledgeRequired} to build ${tech.name}.`);
    if (player.resources.constructionMaterials.warehouse < cm || player.resources.criticalMaterials.warehouse < critical)
        throw new Error(`${player.name} lacks materials for ${tech.name}.`);
    player.resources.constructionMaterials.warehouse -= cm;
    player.resources.criticalMaterials.warehouse -= critical;
    const prerequisiteInstance = tech.prerequisiteTechnologyId
        ? player.installed.find(item => item.technologyId === tech.prerequisiteTechnologyId)
        : null;
    const instance = { instanceId: `${player.id}-${tech.id}-${player.installed.length + 1}`, technologyId: tech.id, builtGeneration: state.generation, storageInput: prerequisiteInstance ? structuredClone(prerequisiteInstance.storageInput) : emptyEnergy(), usedThisGeneration: false, firstOperationLossReduction: 0, temporaryCapacityBonus: 0 };
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
    if (triggerMaterialsShortage)
        player.localCondition.triggered = true;
    if (usePathway)
        player.prepared.pathwayUsed = true;
    if (useCapability)
        player.prepared.capabilityUsed = true;
    if (!tech.alwaysAvailable) {
        state.innovationMarket.visible = state.innovationMarket.visible.filter(id => id !== tech.id);
        refillMarket(state);
    }
    log(state, "action.build", `${player.name} ${prerequisiteInstance ? "upgraded to" : "built"} ${tech.name} for ${cm} General Materials and ${critical} Critical Minerals.`, player.id, { technologyId: tech.id, replacedTechnologyId: prerequisiteInstance?.technologyId ?? null });
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
                throw new Error(`${player.name} needs ${generalCost} General Materials and ${criticalCost} Critical Minerals to reach Knowledge ${nextLevel}.`);
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
            log(state, "action.research", `${player.name} increased permanent Knowledge to ${player.knowledge} for ${generalCost} General Materials and ${criticalCost} Critical Minerals${useAppliedLearning ? ", using 1 Applied Learning token" : ""}.`, player.id, { nextLevel, generalCost, criticalCost, appliedLearningUsed: useAppliedLearning });
            break;
        }
        case "build":
            spendAction(player);
            try {
                build(state, player, action.technologyId);
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
            player.currentMetrics.importsCompleted++;
            log(state, "action.import", `${player.name} imported 1 ${action.receive} for ${required} resources.`, player.id);
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