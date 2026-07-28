import { getTechnology, totalEnergy, totalLoss } from "../helpers.js";
export function usableStoredEnergy(state, playerId) {
    const p = state.players[playerId];
    let total = 0;
    for (const i of p.installed) {
        const t = getTechnology(state, i.technologyId);
        if (!t.storage)
            continue;
        const input = totalEnergy(i.storageInput);
        const table = t.storage.recovery.outputsByInput;
        total += table[Math.min(input, table.length - 1)] ?? 0;
    }
    return total;
}
export function finalRanking(state) {
    const rows = Object.values(state.players).map(p => ({ playerId: p.id, totalLight: p.cumulative.totalLight, reliableGenerations: p.cumulative.reliableGenerations, systemLoss: totalLoss(p), usableStoredEnergy: usableStoredEnergy(state, p.id) }));
    rows.sort((a, b) => b.reliableGenerations - a.reliableGenerations || b.totalLight - a.totalLight || a.systemLoss - b.systemLoss || b.usableStoredEnergy - a.usableStoredEnergy || a.playerId.localeCompare(b.playerId));
    const result = [];
    let rank = 1;
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const prev = rows[i - 1];
        if (i > 0 && prev && (r.reliableGenerations !== prev.reliableGenerations || r.totalLight !== prev.totalLight || r.systemLoss !== prev.systemLoss || r.usableStoredEnergy !== prev.usableStoredEnergy))
            rank = i + 1;
        result.push({ ...r, rank, sharedRank: false });
    }
    const counts = new Map();
    for (const r of result)
        counts.set(r.rank, (counts.get(r.rank) ?? 0) + 1);
    for (const r of result)
        r.sharedRank = (counts.get(r.rank) ?? 0) > 1;
    return result;
}
//# sourceMappingURL=scoring.js.map