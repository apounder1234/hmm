import { applyCommand } from "../engine/stateMachine.js";
import { conditionApplies } from "../engine/conditions/conditions.js";
const resourceOrder = [
    "fossilFuel",
    "biomass",
    "constructionMaterials",
    "criticalMaterials"
];
export function developmentActionLegality(state, playerId, action) {
    try {
        const draft = structuredClone(state);
        applyCommand(draft, { type: "developmentAction", playerId, action });
        return { legal: true, reason: "Available" };
    }
    catch (error) {
        return {
            legal: false,
            reason: error instanceof Error ? error.message : String(error)
        };
    }
}
export function effectiveBuildCost(state, player, technology) {
    let constructionMaterials = technology.cost.constructionMaterials;
    let criticalMaterials = technology.cost.criticalMaterials;
    let effectiveKnowledge = player.knowledge + player.temporaryKnowledge + player.assistanceKnowledge;
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
    if (condition?.effect.kind === "firstBuildConstructionDelta" && !player.localCondition?.triggered)
        constructionMaterials += condition.effect.amount;
    return { constructionMaterials, criticalMaterials, effectiveKnowledge };
}
export function buildLegality(state, playerId, technology) {
    return developmentActionLegality(state, playerId, {
        kind: "build",
        technologyId: technology.id
    });
}
export function findImportPayment(player, receive, required) {
    let remaining = required;
    const payment = {};
    const candidates = resourceOrder
        .filter(resource => resource !== receive)
        .sort((a, b) => player.resources[b].warehouse - player.resources[a].warehouse);
    for (const resource of candidates) {
        if (remaining <= 0)
            break;
        const quantity = Math.min(remaining, player.resources[resource].warehouse);
        if (quantity > 0) {
            payment[resource] = quantity;
            remaining -= quantity;
        }
    }
    return remaining === 0 ? payment : null;
}
export function importLegality(state, player, receive) {
    let required = receive === "criticalMaterials"
        ? state.config.trade.criticalImportCost
        : state.config.trade.normalImportCost;
    if (player.prepared.capabilityId === "trade" && !player.prepared.capabilityUsed) {
        required = Math.max(1, required - 1);
    }
    const payment = findImportPayment(player, receive, required);
    if (!payment) {
        return {
            legality: { legal: false, reason: `You need ${required} other Warehouse resources to import this.` },
            payment: null,
            required
        };
    }
    return {
        legality: developmentActionLegality(state, player.id, {
            kind: "publicImport",
            receive,
            payment
        }),
        payment,
        required
    };
}
export function previewDispatch(state, playerId, plan) {
    try {
        const draft = structuredClone(state);
        applyCommand(draft, { type: "dispatch", playerId, plan });
        const metrics = draft.players[playerId].currentMetrics;
        const grossEnergy = Object.values(metrics.grossEnergy).reduce((sum, value) => sum + value, 0);
        const transported = Object.values(plan.transportByPathway ?? {}).reduce((sum, value) => sum + (value ?? 0), 0);
        const systemLoss = Object.values(metrics.systemLoss).reduce((sum, value) => sum + value, 0);
        return {
            legal: true,
            reason: "Available",
            light: metrics.deliveredLight,
            target: metrics.reliabilityTarget,
            reliable: metrics.reliabilityMet,
            grossEnergy,
            transported,
            stored: metrics.storedEnd,
            curtailed: metrics.curtailed,
            systemLoss
        };
    }
    catch (error) {
        return {
            legal: false,
            reason: error instanceof Error ? error.message : String(error),
            light: 0,
            target: state.config.demand.reliabilityTargets[state.generation] ?? 0,
            reliable: false,
            grossEnergy: 0,
            transported: 0,
            stored: 0,
            curtailed: 0,
            systemLoss: 0
        };
    }
}
//# sourceMappingURL=playability.js.map