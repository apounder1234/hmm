import { aiAcceptsSummitOffer, aiPrepared, chooseAiSummitOffer, attemptAiTechnicalAssistance, attemptAiTrade, chooseDevelopmentDecision, chooseDispatchDecision, recordAiDecision } from "../ai/ai.js";
import { createGame } from "../engine/createGame.js";
import { applyCommandFast, currentPlayerId } from "../engine/stateMachine.js";
import { assertInvariants } from "../engine/invariants.js";
import { canCompleteFoundingProject } from "../engine/actions/actions.js";
import { allStrategies } from "./scenario.js";
export function defaultAiPlayers(config) {
    return config.continents.map((continent, index) => ({
        id: `p${index + 1}`,
        name: continent.name,
        continentId: continent.id,
        controller: { kind: "ai", strategy: allStrategies[index % allStrategies.length] }
    }));
}
export function initialiseAutomatedGame(config, seed, players = defaultAiPlayers(config), debugMode = false, initialFirstPlayerIndex, options = {}) {
    const state = createGame(config, players, seed, { debugMode, executionMode: "simulation", ...(initialFirstPlayerIndex === undefined ? {} : { initialFirstPlayerIndex }), ...(options.openingMode ? { openingMode: options.openingMode } : {}) });
    for (const player of Object.values(state.players)) {
        const prepared = aiPrepared(player.controller.kind === "ai" ? player.controller.strategy : "diversifiedAdapter", state, player);
        applyCommandFast(state, { type: "selectPrepared", playerId: player.id, ...prepared });
    }
    let guard = 0;
    while (state.phase.startsWith("setup.")) {
        if (state.phase === "setup.summit") {
            const pending = state.opening.summit.pendingOffer;
            if (pending) {
                const recipient = state.players[pending.recipientId];
                applyCommandFast(state, { type: "respondSummitTrade", recipientId: recipient.id, accept: aiAcceptsSummitOffer(state, recipient, pending) });
            } else {
                const activeId = state.opening.summit.order[state.opening.summit.activeIndex];
                const active = state.players[activeId];
                const offer = chooseAiSummitOffer(state, active);
                if (offer)
                    applyCommandFast(state, { type: "proposeSummitTrade", proposerId: active.id, ...offer });
                else
                    applyCommandFast(state, { type: "passSummitTurn", playerId: active.id });
            }
        } else if (state.phase === "setup.revealPrepared")
            applyCommandFast(state, { type: "revealPrepared" });
        else if (state.phase === "setup.foundingProjects") {
            const id = state.opening.foundingOrder[state.opening.foundingIndex];
            const player = state.players[id];
            const complete = canCompleteFoundingProject(state, player.id);
            applyCommandFast(state, { type: "resolveFoundingProject", playerId: id, complete });
        } else if (state.phase === "setup.rollCurrent")
            applyCommandFast(state, { type: "rollCurrent" });
        else if (state.phase === "setup.rollForecast")
            applyCommandFast(state, { type: "rollForecast" });
        else
            throw new Error(`Unhandled setup phase ${state.phase}`);
        if (++guard > 100)
            throw new Error("Automated opening exceeded safety limit.");
    }
    return state;
}
export const defaultAutomatedGamePolicy = {
    aiTradeUtilityThreshold: 0.35,
    aiDirectTradeCadence: 1
};
export function advanceAutomatedGame(state, policy = defaultAutomatedGamePolicy) {
    if (state.completed)
        return state;
    if (state.phase === "generation.start")
        applyCommandFast(state, { type: "beginGeneration" });
    else if (state.phase === "generation.localConditions")
        applyCommandFast(state, { type: "drawLocalConditions" });
    else if (state.phase === "generation.development") {
        const id = currentPlayerId(state);
        const player = state.players[id];
        if (player.controller.kind === "ai") {
            const knowledgeLinkDecision = attemptAiTechnicalAssistance(state, player);
            if (knowledgeLinkDecision?.actionSpent) {
                assertInvariants(state);
                return state;
            }
            const cadence = Math.max(1, Math.round(policy.aiDirectTradeCadence));
            const tradeGeneration = (state.generation - 1) % cadence === 0;
            if (tradeGeneration) {
                const tradeDecision = attemptAiTrade(state, player, policy.aiTradeUtilityThreshold);
                if (tradeDecision?.actionSpent) {
                    assertInvariants(state);
                    return state;
                }
            }
        }
        const decision = chooseDevelopmentDecision(state, player);
        recordAiDecision(state, decision);
        applyCommandFast(state, { type: "developmentAction", playerId: id, action: decision.action });
    }
    else if (state.phase === "generation.dispatch") {
        const id = currentPlayerId(state);
        const player = state.players[id];
        const decision = chooseDispatchDecision(state, player);
        recordAiDecision(state, decision);
        applyCommandFast(state, { type: "dispatch", playerId: id, plan: decision.plan });
    }
    else if (state.phase === "generation.review")
        applyCommandFast(state, { type: "finishReview" });
    else if (state.phase === "generation.advanceWeather")
        applyCommandFast(state, { type: "advanceWeather" });
    else
        throw new Error(`Unhandled phase ${state.phase}`);
    assertInvariants(state);
    return state;
}
export function continueAutomatedGame(state, policy = defaultAutomatedGamePolicy) {
    let guard = 0;
    while (!state.completed) {
        advanceAutomatedGame(state, policy);
        guard += 1;
        if (guard > 1000)
            throw new Error("Automated game exceeded the safety command limit.");
    }
    return state;
}
export function runAutomatedGame(config, seed, players = defaultAiPlayers(config), debugMode = false, policy = defaultAutomatedGamePolicy, initialFirstPlayerIndex, options = {}) {
    return continueAutomatedGame(initialiseAutomatedGame(config, seed, players, debugMode, initialFirstPlayerIndex, options), policy);
}
//# sourceMappingURL=runGame.js.map