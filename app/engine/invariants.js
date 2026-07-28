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
        const appliedMaximum = state.config.rules.appliedLearningTokenMaximum ?? 2;
        if (!Number.isInteger(p.appliedLearningTokens ?? 0) || (p.appliedLearningTokens ?? 0) < 0 || (p.appliedLearningTokens ?? 0) > appliedMaximum)
            errors.push(`${p.id}.appliedLearningTokens invalid`);
        if (typeof (p.knowledgeLinkUsed ?? false) !== "boolean")
            errors.push(`${p.id}.knowledgeLinkUsed invalid`);
        const reliabilityMaximum = state.config.rules.reliabilityPointMaximum ?? 4;
        if (!Number.isInteger(p.cumulative.reliableGenerations) || p.cumulative.reliableGenerations < 0 || p.cumulative.reliableGenerations > reliabilityMaximum)
            errors.push(`${p.id}.reliabilityPoints invalid`);
        const freeTrades = state.config.trade.freeDirectTradesPerGeneration ?? 0;
        if (!Number.isInteger(p.initiatedTrades ?? 0) || (p.initiatedTrades ?? 0) < 0 || (p.initiatedTrades ?? 0) > state.config.rules.actionsPerGeneration + freeTrades)
            errors.push(`${p.id}.initiatedTrades invalid`);
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