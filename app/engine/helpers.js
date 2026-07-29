export const resourceTypes = ["fossilFuel", "biomass", "constructionMaterials", "criticalMaterials"];
export const pathways = ["solar", "wind", "hydro", "biomass", "fossil"];
export function emptyResources() { return { fossilFuel: 0, biomass: 0, constructionMaterials: 0, criticalMaterials: 0 }; }
export function emptyEnergy() { return { solar: 0, wind: 0, hydro: 0, biomass: 0, fossil: 0 }; }
export function emptyMetrics(target) { return { grossEnergy: emptyEnergy(), deliveredLight: 0, reliabilityTarget: target, reliabilityMet: false, reliabilityPointEarned: false, reliabilityPointCapped: false, systemLoss: { thermal: 0, battery: 0, lighting: 0, other: 0 }, curtailed: 0, storedEnd: 0, fuelConsumed: {}, resourcesExtracted: {}, tradesCompleted: 0, importsCompleted: 0, resourcesImported: {}, resourcesExported: {}, knowledgeGained: 0, appliedLearningGained: 0, appliedLearningSpent: 0, knowledgeLinksUsed: 0, knowledgeLinkIncome: 0, continentAbilityValue: 0, continentAbilityActivations: 0, continentPenaltyActivations: 0, technologiesBuilt: [] }; }
export function getTechnology(state, id) { const t = state.config.technologies.find(x => x.id === id); if (!t)
    throw new Error(`Unknown technology ${id}`); return t; }
export function getPlayer(state, id) { const p = state.players[id]; if (!p)
    throw new Error(`Unknown player ${id}`); return p; }
export function totalLoss(p) { return p.cumulative.systemLoss.thermal + p.cumulative.systemLoss.battery + p.cumulative.systemLoss.lighting + p.cumulative.systemLoss.other; }
export function totalEnergy(e) { return pathways.reduce((n, p) => n + (e[p] ?? 0), 0); }
export function addEnergy(target, source, multiplier = 1) { for (const p of pathways)
    target[p] += (source[p] ?? 0) * multiplier; }
export function clone(v) { return structuredClone(v); }
export function log(state, type, message, actorId = null, data) {
    state.log.push({ sequence: state.log.length + 1, generation: state.generation, phase: state.phase, actorId, type, message, ...(data ? { data } : {}) });
}
export function countInstalled(player, technologyId) { return player.installed.filter(x => x.technologyId === technologyId).length; }
export function hasTechnology(player, technologyId) { return countInstalled(player, technologyId) > 0; }
export function installedConfigs(state, player) { return player.installed.map(i => getTechnology(state, i.technologyId)); }
export function fuelPlantMaximumOutput(state, player, technology) {
    let maximum = technology.maximumOutput;
    if (technology.special === "legacyFuelBridge" && state.generation <= 1) {
        const continent = state.config.continents.find(item => item.id === player.continentId);
        maximum += continent?.legacyFuelBonus ?? 0;
    }
    return maximum;
}
export function effectivePathwayOpportunity(state, player, pathway) {
    const continent = state.config.continents.find(item => item.id === player.continentId);
    if (!continent)
        throw new Error(`Unknown continent ${player.continentId}`);
    let opportunity = continent.opportunities[pathway] ?? 0;
    if (pathway !== "fossil")
        return opportunity;
    // Fossil output no longer declines automatically as reserves shrink.
    // Scarcity is represented by the finite fuel cubes themselves, extraction actions,
    // and the need to trade or import after local stock is exhausted.
    return Math.max(0, opportunity);
}
export function assertIntegerNonnegative(value, label) { if (!Number.isInteger(value) || value < 0)
    throw new Error(`${label} must be a non-negative integer.`); }
//# sourceMappingURL=helpers.js.map