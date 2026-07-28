import { getPlayer, getTechnology, log, resourceTypes } from "../helpers.js";

function sum(v) { return resourceTypes.reduce((n, r) => n + (v[r] ?? 0), 0); }

export function executeDirectTrade(state, aId, bId, aGives, bGives) {
    if (state.phase !== "generation.development")
        throw new Error("Direct trade is only available during Development.");
    if (!state.config.trade.directEnabled)
        throw new Error("Direct trade is disabled.");
    const activeId = state.turnOrder[state.activeTurnIndex];
    if (aId !== activeId)
        throw new Error("Only the active player may propose a direct trade.");
    const a = getPlayer(state, aId), b = getPlayer(state, bId);
    if (aId === bId)
        throw new Error("A player cannot trade with itself.");
    const freeLimit = state.config.trade.freeDirectTradesPerGeneration ?? 0;
    const actionSpent = (a.initiatedTrades ?? 0) >= freeLimit;
    if (actionSpent && a.actionsRemaining <= 0)
        throw new Error(`${a.name} has no Development action available for trade.`);
    if (sum(aGives) <= 0 || sum(bGives) <= 0)
        throw new Error("Both sides must provide at least one resource.");
    if (resourceTypes.some(resource => (aGives[resource] ?? 0) > 0 && (bGives[resource] ?? 0) > 0))
        throw new Error("The same resource cannot be exchanged in both directions.");
    for (const r of resourceTypes) {
        const ag = aGives[r] ?? 0, bg = bGives[r] ?? 0;
        if (!Number.isInteger(ag) || !Number.isInteger(bg) || ag < 0 || bg < 0)
            throw new Error("Trade values must be non-negative integers.");
        if (a.resources[r].warehouse < ag || b.resources[r].warehouse < bg)
            throw new Error("Insufficient Warehouse resources for trade.");
        if (a.resources[r].warehouse - ag + bg > state.config.rules.warehouseMaximum || b.resources[r].warehouse - bg + ag > state.config.rules.warehouseMaximum)
            throw new Error("Trade would exceed Warehouse capacity.");
    }
    for (const r of resourceTypes) {
        const ag = aGives[r] ?? 0, bg = bGives[r] ?? 0;
        a.resources[r].warehouse = a.resources[r].warehouse - ag + bg;
        b.resources[r].warehouse = b.resources[r].warehouse - bg + ag;
    }
    if (actionSpent)
        a.actionsRemaining--;
    a.initiatedTrades = (a.initiatedTrades ?? 0) + 1;
    a.completedTrades++;
    b.completedTrades++;
    a.currentMetrics.tradesCompleted++;
    b.currentMetrics.tradesCompleted++;
    log(state, "trade.completed", `${a.name} and ${b.name} completed a direct trade using one Development action.`, a.id, { aId, bId, aGives, bGives, actionSpent });
    return { actionSpent };
}

export function prepareKnowledgeLink(state, borrowerId, lenderId, technologyId, paymentResource) {
    if (state.phase !== "generation.development")
        throw new Error("Knowledge Link is only available during Development.");
    if (!state.config.trade.knowledgeLinkEnabled)
        throw new Error("Knowledge Link is disabled.");
    const activeId = state.turnOrder[state.activeTurnIndex];
    if (borrowerId !== activeId)
        throw new Error("Only the active player may request a Knowledge Link.");
    if (!resourceTypes.includes(paymentResource))
        throw new Error("Knowledge Link payment must be one valid raw resource.");
    const borrower = getPlayer(state, borrowerId);
    const lender = getPlayer(state, lenderId);
    const technology = getTechnology(state, technologyId);
    if (borrowerId === lenderId)
        throw new Error("A player cannot borrow its own Knowledge.");
    if (borrower.knowledgeLinkUsed)
        throw new Error(`${borrower.name} already used its Knowledge Link this Generation.`);
    if (lender.knowledgeLinkUsed)
        throw new Error(`${lender.name} already used its Knowledge Link this Generation.`);
    const borrowerOwnKnowledge = borrower.knowledge + borrower.temporaryKnowledge;
    if (borrowerOwnKnowledge >= technology.knowledgeRequired)
        throw new Error(`${borrower.name} already has enough Knowledge for ${technology.name}.`);
    if (lender.knowledge < technology.knowledgeRequired)
        throw new Error(`${lender.name} needs permanent Knowledge ${technology.knowledgeRequired} to help with ${technology.name}.`);
    const payment = state.config.trade.knowledgeLinkPayment ?? 1;
    if (payment !== 1)
        throw new Error("This prototype supports a one-resource Knowledge Link payment.");
    if (borrower.resources[paymentResource].warehouse < 1)
        throw new Error(`${borrower.name} lacks the offered ${paymentResource}.`);
    if (lender.resources[paymentResource].warehouse >= state.config.rules.warehouseMaximum)
        throw new Error(`${lender.name}'s ${paymentResource} Warehouse is full.`);
    borrower.resources[paymentResource].warehouse--;
    lender.resources[paymentResource].warehouse++;
    borrower.assistanceKnowledge = Math.max(0, technology.knowledgeRequired - borrowerOwnKnowledge);
    borrower.knowledgeLinkUsed = true;
    lender.knowledgeLinkUsed = true;
    borrower.currentMetrics.knowledgeLinksUsed++;
    lender.currentMetrics.knowledgeLinkIncome++;
    log(state, "knowledgeLink.used", `${lender.name} shared Knowledge ${technology.knowledgeRequired} so ${borrower.name} could build ${technology.name}; ${lender.name} received 1 ${paymentResource}.`, borrower.id, { borrowerId, lenderId, technologyId, paymentResource, knowledgeRequired: technology.knowledgeRequired });
}

// Backward-compatible helper retained for older callers. It now prepares a full Knowledge Link only when a technology is specified elsewhere.
export function lendTechnicalAssistance() {
    throw new Error("The legacy assistance helper was replaced by the Knowledge Link build command.");
}
//# sourceMappingURL=trade.js.map
