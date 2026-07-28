import { assertInvariants } from "../engine/invariants.js";
import { hashText } from "../config/hash.js";
export function serializeGame(state) {
    const core = {
        saveFormat: "sunpaths-save",
        saveSchemaVersion: state.schemaVersion,
        engineVersion: state.engineVersion,
        gameId: state.gameId,
        savedAtIso: new Date().toISOString(),
        configHash: state.configHash,
        gameState: state
    };
    const raw = JSON.stringify(core);
    return JSON.stringify({ ...core, checksum: hashText(raw) });
}
function migratePhase3State(input) {
    const state = structuredClone(input);
    state.debugMode ??= false;
    state.executionMode ??= "interactive";
    if (!state.engineVersion || state.engineVersion === "0.3.0")
        state.engineVersion = "0.4.0";
    state.config.localConditions = state.config.localConditions.map(condition => condition.id === "storageBreakthrough"
        ? { ...condition, id: "recoveryBreakthrough", name: "Recovery Breakthrough" }
        : condition);
    for (const player of Object.values(state.players)) {
        if (player.localCondition?.definitionId === "storageBreakthrough") {
            player.localCondition.definitionId = "recoveryBreakthrough";
            player.localCondition.cardId = player.localCondition.cardId.replace("storageBreakthrough", "recoveryBreakthrough");
        }
    }
    for (const pile of [state.localConditions.drawPile, state.localConditions.discardPile]) {
        for (const card of pile) {
            if (card.definitionId === "storageBreakthrough")
                card.definitionId = "recoveryBreakthrough";
            card.cardId = card.cardId.replace("storageBreakthrough", "recoveryBreakthrough");
        }
    }
    return state;
}
export function deserializeGame(json) {
    const envelope = JSON.parse(json);
    if (envelope.saveFormat !== "sunpaths-save")
        throw new Error("Not a SUNPATHS save file.");
    if (envelope.saveSchemaVersion !== "1.0.0")
        throw new Error(`Unsupported save schema ${envelope.saveSchemaVersion}.`);
    const { checksum: stored, ...core } = envelope;
    if (hashText(JSON.stringify(core)) !== stored)
        throw new Error("Save checksum mismatch.");
    const migrated = migratePhase3State(envelope.gameState);
    assertInvariants(migrated);
    return migrated;
}
//# sourceMappingURL=save.js.map