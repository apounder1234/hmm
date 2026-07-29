// @ts-nocheck
// SUNPATHS organised source. Each section has one named responsibility.
import { getPlayer, log, resourceTypes } from "./rules.js";
// -----------------------------------------------------------------------------
// Summit and direct-resource trading
// -----------------------------------------------------------------------------
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
function summitOrder(state, direction) {
    const order = [...state.turnOrder];
    return direction === "rightToLeft" ? order.reverse() : order;
}
export function getPublicSummitState(state, viewerId = null) {
    const players = Object.fromEntries(Object.values(state.players).map(player => [player.id, {
            id: player.id,
            name: player.name,
            continentId: player.continentId,
            resources: Object.fromEntries(resourceTypes.map(resource => [resource, player.resources[resource].warehouse])),
            summitTrades: player.summitTrades ?? 0,
            isViewer: player.id === viewerId
        }]));
    return {
        phase: state.phase,
        forecast: state.weather.forecast,
        summit: state.opening?.summit ? structuredClone(state.opening.summit) : null,
        players
    };
}
export function currentSummitPlayerId(state) {
    if (state.phase !== "setup.summit")
        return null;
    return state.opening.summit.order[state.opening.summit.activeIndex] ?? null;
}
export function beginEnergySummit(state) {
    const directions = state.config.opening?.summitDirections ?? ["rightToLeft", "leftToRight"];
    state.phase = "setup.summit";
    state.opening.summit = { round: 1, direction: directions[0], order: summitOrder(state, directions[0]), activeIndex: 0, pendingOffer: null, lastResolution: null, completed: false };
    log(state, "summit.started", "The Energy Summit began. Round 1 moves from right to left.");
}
function advanceSummitTurn(state) {
    const summit = state.opening.summit;
    summit.activeIndex++;
    if (summit.activeIndex < summit.order.length)
        return;
    const directions = state.config.opening?.summitDirections ?? ["rightToLeft", "leftToRight"];
    if (summit.round < directions.length) {
        summit.round++;
        summit.direction = directions[summit.round - 1];
        summit.order = summitOrder(state, summit.direction);
        summit.activeIndex = 0;
        log(state, "summit.round", `Energy Summit round ${summit.round} began: ${summit.direction === "rightToLeft" ? "right to left" : "left to right"}.`);
    }
    else {
        summit.completed = true;
        state.phase = "setup.revealPrepared";
        log(state, "summit.completed", "The Energy Summit closed after two trading sweeps.");
    }
}
function validateSummitBundle(state, proposer, recipient, proposerGives, recipientGives) {
    const maxBundle = state.config.opening?.summitMaximumBundlePerSide ?? 2;
    const maxTrades = state.config.opening?.summitMaximumTradesPerPlayer ?? 2;
    if ((proposer.summitTrades ?? 0) >= maxTrades || (recipient.summitTrades ?? 0) >= maxTrades)
        throw new Error("Both players must have a Summit trade available.");
    if (sum(proposerGives) < 1 || sum(recipientGives) < 1 || sum(proposerGives) > maxBundle || sum(recipientGives) > maxBundle)
        throw new Error(`Each side must offer between 1 and ${maxBundle} resources.`);
    if (resourceTypes.some(r => (proposerGives[r] ?? 0) > 0 && (recipientGives[r] ?? 0) > 0))
        throw new Error("The same resource cannot move in both directions.");
    for (const r of resourceTypes) {
        const pg = proposerGives[r] ?? 0, rg = recipientGives[r] ?? 0;
        if (!Number.isInteger(pg) || !Number.isInteger(rg) || pg < 0 || rg < 0)
            throw new Error("Summit trade quantities must be non-negative integers.");
        if (proposer.resources[r].warehouse < pg || recipient.resources[r].warehouse < rg)
            throw new Error("A player no longer has the offered resources.");
        if (proposer.resources[r].warehouse - pg + rg > state.config.rules.warehouseMaximum || recipient.resources[r].warehouse - rg + pg > state.config.rules.warehouseMaximum)
            throw new Error("The trade would exceed Warehouse capacity.");
    }
}
export function proposeSummitTrade(state, proposerId, recipientId, proposerGives, recipientGives) {
    if (state.phase !== "setup.summit")
        throw new Error("The Energy Summit is not active.");
    if (state.opening.summit.pendingOffer)
        throw new Error("Another Summit offer is waiting for a response.");
    if (currentSummitPlayerId(state) !== proposerId)
        throw new Error("Only the active Summit player may make an offer.");
    if (proposerId === recipientId)
        throw new Error("A player cannot trade with itself.");
    const proposer = getPlayer(state, proposerId), recipient = getPlayer(state, recipientId);
    validateSummitBundle(state, proposer, recipient, proposerGives, recipientGives);
    state.opening.summit.lastResolution = null;
    state.opening.summit.pendingOffer = { proposerId, recipientId, proposerGives: structuredClone(proposerGives), recipientGives: structuredClone(recipientGives) };
    log(state, "summit.offer", `${proposer.name} offered a pre-game barter to ${recipient.name}.`, proposer.id, { proposerGives, recipientGives });
}
export function respondSummitTrade(state, recipientId, accept) {
    if (state.phase !== "setup.summit")
        throw new Error("The Energy Summit is not active.");
    const offer = state.opening.summit.pendingOffer;
    if (!offer || offer.recipientId !== recipientId)
        throw new Error("This player has no Summit offer to answer.");
    const proposer = getPlayer(state, offer.proposerId), recipient = getPlayer(state, recipientId);
    if (accept) {
        validateSummitBundle(state, proposer, recipient, offer.proposerGives, offer.recipientGives);
        for (const r of resourceTypes) {
            const pg = offer.proposerGives[r] ?? 0, rg = offer.recipientGives[r] ?? 0;
            proposer.resources[r].warehouse = proposer.resources[r].warehouse - pg + rg;
            recipient.resources[r].warehouse = recipient.resources[r].warehouse - rg + pg;
        }
        proposer.summitTrades = (proposer.summitTrades ?? 0) + 1;
        recipient.summitTrades = (recipient.summitTrades ?? 0) + 1;
        proposer.summitImports = proposer.summitImports ?? {};
        proposer.summitExports = proposer.summitExports ?? {};
        recipient.summitImports = recipient.summitImports ?? {};
        recipient.summitExports = recipient.summitExports ?? {};
        for (const r of resourceTypes) {
            const pg = offer.proposerGives[r] ?? 0, rg = offer.recipientGives[r] ?? 0;
            proposer.summitExports[r] = (proposer.summitExports[r] ?? 0) + pg;
            proposer.summitImports[r] = (proposer.summitImports[r] ?? 0) + rg;
            recipient.summitExports[r] = (recipient.summitExports[r] ?? 0) + rg;
            recipient.summitImports[r] = (recipient.summitImports[r] ?? 0) + pg;
        }
        log(state, "summit.accepted", `${recipient.name} accepted ${proposer.name}'s Summit barter.`, recipient.id, offer);
    }
    else {
        log(state, "summit.declined", `${recipient.name} declined ${proposer.name}'s Summit barter.`, recipient.id);
    }
    state.opening.summit.lastResolution = {
        accepted: Boolean(accept),
        proposerId: proposer.id,
        recipientId: recipient.id,
        message: accept
            ? `${recipient.name} accepted ${proposer.name}'s Summit barter.`
            : `${recipient.name} declined ${proposer.name}'s Summit barter.`
    };
    state.opening.summit.pendingOffer = null;
    advanceSummitTurn(state);
}
export function passSummitTurn(state, playerId) {
    if (state.phase !== "setup.summit" || currentSummitPlayerId(state) !== playerId)
        throw new Error("Only the active Summit player may pass.");
    if (state.opening.summit.pendingOffer)
        throw new Error("Answer the pending offer before passing.");
    log(state, "summit.pass", `${getPlayer(state, playerId).name} passed during the Energy Summit.`, playerId);
    advanceSummitTurn(state);
}

