import { getPlayer, log, resourceTypes } from "../helpers.js";
import { pushUndo } from "../history/undo.js";
function sum(v) { return resourceTypes.reduce((n, r) => n + (v[r] ?? 0), 0); }
export function executeDirectTrade(state, aId, bId, aGives, bGives) {
    if (state.phase !== "generation.development")
        throw new Error("Direct trade is only available during Development.");
    if (!state.config.trade.directEnabled)
        throw new Error("Direct trade is disabled.");
    const a = getPlayer(state, aId), b = getPlayer(state, bId);
    if (aId === bId)
        throw new Error("A player cannot trade with itself.");
    const aLimit = state.config.trade.directTradesPerGeneration + ((a.prepared.capabilityId === "trade" && !a.prepared.capabilityUsed) ? 1 : 0);
    const bLimit = state.config.trade.directTradesPerGeneration + ((b.prepared.capabilityId === "trade" && !b.prepared.capabilityUsed) ? 1 : 0);
    if (a.completedTrades >= aLimit || b.completedTrades >= bLimit)
        throw new Error("A player has no direct-trade quota remaining.");
    if (sum(aGives) <= 0 || sum(bGives) <= 0)
        throw new Error("Both sides must provide at least one resource.");
    for (const r of resourceTypes) {
        const ag = aGives[r] ?? 0, bg = bGives[r] ?? 0;
        if (!Number.isInteger(ag) || !Number.isInteger(bg) || ag < 0 || bg < 0)
            throw new Error("Trade values must be non-negative integers.");
        if (a.resources[r].warehouse < ag || b.resources[r].warehouse < bg)
            throw new Error("Insufficient Warehouse resources for trade.");
        if (a.resources[r].warehouse - ag + bg > state.config.rules.warehouseMaximum || b.resources[r].warehouse - bg + ag > state.config.rules.warehouseMaximum)
            throw new Error("Trade would exceed Warehouse capacity.");
    }
    if (state.executionMode !== "simulation")
        pushUndo(state);
    for (const r of resourceTypes) {
        const ag = aGives[r] ?? 0, bg = bGives[r] ?? 0;
        a.resources[r].warehouse = a.resources[r].warehouse - ag + bg;
        b.resources[r].warehouse = b.resources[r].warehouse - bg + ag;
    }
    a.completedTrades++;
    b.completedTrades++;
    a.currentMetrics.tradesCompleted++;
    b.currentMetrics.tradesCompleted++;
    if (a.completedTrades > state.config.trade.directTradesPerGeneration && a.prepared.capabilityId === "trade")
        a.prepared.capabilityUsed = true;
    if (b.completedTrades > state.config.trade.directTradesPerGeneration && b.prepared.capabilityId === "trade")
        b.prepared.capabilityUsed = true;
    log(state, "trade.completed", `${a.name} and ${b.name} completed a direct trade.`, a.id, { aId, bId, aGives, bGives });
}
export function lendTechnicalAssistance(state, lenderId, receiverId, payment) {
    const lender = getPlayer(state, lenderId), receiver = getPlayer(state, receiverId);
    if (state.phase !== "generation.development")
        throw new Error("Technical Assistance is only available during Development.");
    if (lender.assistanceLent)
        throw new Error(`${lender.name} already lent Technical Assistance this Generation.`);
    if (payment && sum(payment) > 0) {
        const lenderLimit = state.config.trade.directTradesPerGeneration + ((lender.prepared.capabilityId === "trade" && !lender.prepared.capabilityUsed) ? 1 : 0);
        const receiverLimit = state.config.trade.directTradesPerGeneration + ((receiver.prepared.capabilityId === "trade" && !receiver.prepared.capabilityUsed) ? 1 : 0);
        if (lender.completedTrades >= lenderLimit || receiver.completedTrades >= receiverLimit)
            throw new Error("A player has no trade quota for paid Technical Assistance.");
        for (const r of resourceTypes) {
            const n = payment[r] ?? 0;
            if (!Number.isInteger(n) || n < 0)
                throw new Error("Assistance payment must be non-negative integers.");
            if (receiver.resources[r].warehouse < n)
                throw new Error(`Receiver lacks ${r}.`);
            if (lender.resources[r].warehouse + n > state.config.rules.warehouseMaximum)
                throw new Error(`Lender's ${r} Warehouse would exceed capacity.`);
        }
        if (state.executionMode !== "simulation")
            pushUndo(state);
        for (const r of resourceTypes) {
            const n = payment[r] ?? 0;
            receiver.resources[r].warehouse -= n;
            lender.resources[r].warehouse += n;
        }
        lender.completedTrades++;
        receiver.completedTrades++;
        lender.currentMetrics.tradesCompleted++;
        receiver.currentMetrics.tradesCompleted++;
        if (lender.completedTrades > state.config.trade.directTradesPerGeneration && lender.prepared.capabilityId === "trade")
            lender.prepared.capabilityUsed = true;
        if (receiver.completedTrades > state.config.trade.directTradesPerGeneration && receiver.prepared.capabilityId === "trade")
            receiver.prepared.capabilityUsed = true;
    }
    else if (state.executionMode !== "simulation")
        pushUndo(state);
    lender.assistanceLent = true;
    receiver.assistanceKnowledge += 1;
    log(state, "assistance.lent", `${lender.name} lent Technical Assistance to ${receiver.name}.`, lender.id, { lenderId, receiverId, payment: payment ?? {} });
}
//# sourceMappingURL=trade.js.map