// @ts-check
// A5.33 - Turn decisions explained using the same calculated snapshots as the game.
// This module reads state; it does not apply game actions or add any score/loss.
import { getEnergyChainBreakdown, getPrimaryBottleneck, systemSnapshot, previewDispatch } from "./viewModel.js?v=a5.42.0";
import { getTechnology } from "./rules.js?v=a5.42.0";

const resources = {
    fossilFuel: "Fossil fuel", biomass: "Biomass",
    constructionMaterials: "Other materials", criticalMaterials: "Critical minerals"
};

export function captureDevelopmentEvidence(state, playerId) {
    const player = state.players[playerId];
    const system = systemSnapshot(state, playerId);
    const flow = getEnergyChainBreakdown(state, playerId);
    const bottleneck = getPrimaryBottleneck(state, playerId, { target: system.target });
    return {
        playerId, generation: state.generation,
        actions: player.actionsRemaining, knowledge: player.knowledge,
        resources: Object.fromEntries(Object.entries(player.resources).map(([key, entry]) =>
            [key, { warehouse: entry.warehouse, regional: entry.currentContinent }])),
        stages: [
            { id: "source", label: "Source Energy", icon: "◉", value: flow.grossGenerated },
            { id: "electricity", label: "Electricity", icon: "⚡", value: flow.usableEnergy },
            { id: "grid", label: "Grid capacity", icon: "⇢", value: flow.gridCapacity },
            { id: "lighting", label: "Projected Light", icon: "💡", value: flow.lightProduced }
        ],
        countedLoss: Object.entries(flow.lossLedger).filter(([key]) => key !== "curtailed")
            .reduce((sum, [, value]) => sum + Number(value || 0), 0),
        bottleneck: { type: bottleneck.type, label: bottleneck.label }
    };
}

/** Compare actual pre/post states, including any AI turns between them. */
export function describeDevelopmentEffect(beforeState, afterState, playerId, action) {
    const before = captureDevelopmentEvidence(beforeState, playerId);
    const after = captureDevelopmentEvidence(afterState, playerId);
    const tech = action.kind === "build" ? getTechnology(afterState, action.technologyId) : null;
    const resource = action.kind === "extract" ? action.resource : action.kind === "harvestBiomass" ? "biomass" : null;
    const actionLabel = tech ? `Built ${tech.name}` : resource ? `Gathered ${resources[resource]}` :
        action.kind === "research" ? "Learned" : action.kind === "publicImport" ? "Exchanged at World Market" :
        action.kind === "directTrade" ? "Completed player trade" : action.kind === "adapt" ? "Adapted to local conditions" : "Development action completed";
    const resourceChanges = [];
    for (const [key, title] of Object.entries(resources)) {
        for (const [field, label] of [["regional", "Regional stock"], ["warehouse", "Warehouse"]]) {
            const oldVal = before.resources[key]?.[field] ?? 0;
            const newVal = after.resources[key]?.[field] ?? 0;
            if (oldVal !== newVal)
                resourceChanges.push({ label: `${title} · ${label}`, before: oldVal, after: newVal });
        }
    }
    if (before.knowledge !== after.knowledge)
        resourceChanges.push({ label: "Permanent Knowledge", before: before.knowledge, after: after.knowledge });
    const stages = after.stages.map((stage, index) => ({...stage, before: before.stages[index].value, after: stage.value, changed: before.stages[index].value !== stage.value}));
    const lightBefore = before.stages[3].value;
    const lightAfter = after.stages[3].value;
    let takeaway;
    if (lightAfter > lightBefore)
        takeaway = `The recommended Energy Plan now supplies ${lightAfter - lightBefore} more potential Light in today's conditions. Nothing is delivered until Dispatch.`;
    else if (lightAfter < lightBefore)
        takeaway = `The recommended Energy Plan now supplies ${lightBefore - lightAfter} less potential Light. Check fuel, weather and the limiting stage before Dispatch.`;
    else if (resource)
        takeaway = "Resources moved from the region to your Warehouse. Gathering does not automatically create Electricity or Light.";
    else if (action.kind === "research")
        takeaway = "Knowledge can unlock designs, but it does not generate Electricity or Light by itself.";
    else if (tech)
        takeaway = "The technology changed your system, but it has not increased projected Light yet. Check the limiting stage or prepare for later Generations.";
    else takeaway = "The system's current Light potential has not increased; check the resource and action changes below.";
    const bottleneckChange = before.bottleneck.type !== after.bottleneck.type;
    return {
        kind: "developmentEffect", playerId, title: actionLabel, stages,
        resourceChanges, actions: { before: before.actions, after: after.actions },
        loss: { before: before.countedLoss, after: after.countedLoss },
        bottleneck: after.bottleneck.label,
        bottleneckChange, previousBottleneck: before.bottleneck.label,
        takeaway,
        generation: after.generation
    };
}

/** Describe projected versus confirmed dispatch without recomputing any outcome. */
export function describeDispatchEffect(beforeState, afterState, playerId, plan) {
    const projection = previewDispatch(beforeState, playerId, plan);
    const metrics = afterState.players[playerId]?.currentMetrics;
    if (!projection.legal || !metrics) throw new Error("Unable to compare this Energy plan with the confirmed result.");
    const actualLight = metrics.deliveredLight;
    const actualTarget = metrics.reliabilityTarget;
    const actualPoints = metrics.reliabilityPointsEarned ?? (metrics.reliabilityPointEarned ? 1 : 0);
    const confirmedLoss = Object.values(metrics.lossLedger ?? {})
        .filter((_, i) => Object.keys(metrics.lossLedger ?? {})[i] !== "curtailed")
        .reduce((sum, value) => sum + Number(value ?? 0), 0);
    return {
        kind: "dispatchEffect", playerId, generation: afterState.generation,
        plannedLight: projection.light, actualLight,
        demand: actualTarget, demandMet: Boolean(metrics.reliabilityMet),
        projectedLoss: projection.systemLoss, actualLoss: confirmedLoss,
        projectedPoints: projection.pointsEarned, actualPoints,
        matched: actualLight === projection.light && actualPoints === projection.pointsEarned,
        takeaway: actualLight >= actualTarget
            ? `You delivered ${actualLight} Light against demand of ${actualTarget}. This Generation's demand was met.`
            : `You delivered ${actualLight} of the ${actualTarget} Light required. Inspect the bottleneck and losses below before the next Generation.`
    };
}
