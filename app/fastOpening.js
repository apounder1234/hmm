// A5.32: presentation-only skip of redundant direct-opening confirmations.
// Run through the existing authoritative commands; never mutate player resources directly.
import { applyCommand, canCompleteFoundingProject } from "./engine.js?v=a5.37.0";

export function advanceDirectOpening(state) {
    if (!state?.opening || state.opening.mode !== "startingPlan" || !state.opening.autoFounding)
        return state;
    let guard = 0;
    while (state.phase === "setup.foundingProjects") {
        if (++guard > state.turnOrder.length) throw new Error("Unexpected Founding Project loop.");
        const playerId = state.opening.foundingOrder[state.opening.foundingIndex];
        applyCommand(state, { type: "resolveFoundingProject", playerId, complete: false });
    }
    if (state.phase === "generation.start" && state.generation === 0)
        applyCommand(state, { type: "beginGeneration" });
    return state;
}
