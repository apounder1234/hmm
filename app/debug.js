// @ts-nocheck
// Debug helpers are deliberately read-only: they never mutate the game.
/** Returns a compact, secret-safe snapshot for bug reports and the debug drawer. */
export function buildDebugSnapshot(game) {
    const order = Array.isArray(game?.turnOrder) ? game.turnOrder : [];
    const activePlayerId = order[game?.activeTurnIndex ?? -1] ?? null;
    const summit = game?.opening?.summit;
    const pending = summit?.pendingOffer;
    return {
        version: game?.config?.schemaVersion ?? "unknown",
        seed: game?.seed ?? "unknown",
        phase: game?.phase ?? "unknown",
        generation: game?.generation ?? 0,
        activePlayerId,
        actionsRemaining: activePlayerId ? game?.players?.[activePlayerId]?.actionsRemaining ?? null : null,
        weather: game?.weather?.current ?? null,
        forecast: game?.weather?.forecast ?? null,
        localCondition: activePlayerId ? game?.players?.[activePlayerId]?.localCondition?.definitionId ?? null : null,
        summit: summit ? {
            round: summit.round,
            direction: summit.direction,
            activeIndex: summit.activeIndex,
            pendingOffer: pending ? {
                proposerId: pending.proposerId,
                recipientId: pending.recipientId,
                proposerGives: pending.proposerGives,
                recipientGives: pending.recipientGives
            } : null
        } : null,
        lastEvent: game?.log?.at?.(-1) ?? null,
        recentEvents: (game?.log ?? []).slice(-20).map(event => ({
            sequence: event.sequence,
            type: event.type,
            message: event.message
        }))
    };
}
/** Formats a reproducible plain-text report that can be pasted into an issue. */
export function formatBugReport(game, browserError = "") {
    const snapshot = buildDebugSnapshot(game);
    return [
        "SUNPATHS BUG REPORT",
        `Version: ${snapshot.version}`,
        `Seed: ${snapshot.seed}`,
        `Phase: ${snapshot.phase}`,
        `Generation: ${snapshot.generation}`,
        `Active player: ${snapshot.activePlayerId ?? "none"}`,
        `Actions remaining: ${snapshot.actionsRemaining ?? "n/a"}`,
        `Weather: ${snapshot.weather ?? "none"}`,
        `Forecast: ${snapshot.forecast ?? "none"}`,
        `Summit: ${snapshot.summit ? JSON.stringify(snapshot.summit) : "not active"}`,
        browserError ? `Browser error: ${browserError}` : "Browser error: none recorded",
        "",
        "Recent events:",
        ...snapshot.recentEvents.map(event => `#${event.sequence} [${event.type}] ${event.message}`)
    ].join("\n");
}

