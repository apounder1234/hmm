import { resourceTypes, totalEnergy } from "./helpers.js";
export function invariantErrors(state) {
    const errors = [];
    for (const p of Object.values(state.players)) {
        for (const r of resourceTypes) {
            const a = p.resources[r];
            if (!Number.isInteger(a.warehouse) || a.warehouse < 0 || a.warehouse > state.config.rules.warehouseMaximum)
                errors.push(`${p.id}.${r}.warehouse invalid`);
            if (!Number.isInteger(a.currentContinent) || a.currentContinent < 0)
                errors.push(`${p.id}.${r}.currentContinent invalid`);
            if (r === "biomass" && a.currentContinent > a.printedStarting)
                errors.push(`${p.id}.biomass exceeds printed maximum`);
        }
        if (!Number.isInteger(p.knowledge) || p.knowledge < 0 || p.knowledge > state.config.rules.knowledgeMaximum)
            errors.push(`${p.id}.knowledge invalid`);
        if (p.actionsRemaining < 0 || p.actionsRemaining > state.config.rules.actionsPerGeneration)
            errors.push(`${p.id}.actions invalid`);
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
    return errors;
}
export function assertInvariants(state) { const errors = invariantErrors(state); if (errors.length)
    throw new Error(`Invariant failure:\n${errors.join("\n")}`); }
//# sourceMappingURL=invariants.js.map