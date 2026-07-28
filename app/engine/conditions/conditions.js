import { shuffle } from "../../random/rng.js";
import { getTechnology, hasTechnology, log } from "../helpers.js";
export function getCondition(state, id) { const c = state.config.localConditions.find(x => x.id === id); if (!c)
    throw new Error(`Unknown Local Condition ${id}`); return c; }
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
//# sourceMappingURL=conditions.js.map