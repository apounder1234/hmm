export function snapshotState(state) { const copy = structuredClone(state); copy.undo = { stack: [], generationStart: null, lockReason: null }; return JSON.stringify(copy); }
export function pushUndo(state) { state.undo.stack.push(snapshotState(state)); if (state.undo.stack.length > 40)
    state.undo.stack.shift(); }
export function setGenerationStartSnapshot(state) { state.undo.generationStart = snapshotState(state); state.undo.stack = []; state.undo.lockReason = null; }
function restore(state, json, stack, generationStart) { const restored = JSON.parse(json); restored.undo = { stack, generationStart, lockReason: null }; Object.assign(state, restored); }
export function undoLast(state) { if (state.phase !== "generation.development")
    throw new Error("Undo is only available during Development."); const json = state.undo.stack.at(-1); if (!json)
    throw new Error("Nothing is available to undo."); restore(state, json, state.undo.stack.slice(0, -1), state.undo.generationStart); }
export function resetGeneration(state) { if (state.phase !== "generation.development")
    throw new Error("Generation reset is only available during Development."); if (!state.undo.generationStart)
    throw new Error("No Generation-start snapshot is available."); restore(state, state.undo.generationStart, [], state.undo.generationStart); }
export function lockUndo(state, reason) { state.undo.stack = []; state.undo.lockReason = reason; }
//# sourceMappingURL=undo.js.map