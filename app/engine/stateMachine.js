import { performDevelopmentAction, resolveFoundingProject } from "./actions/actions.js";
import { discardCurrentConditions, drawLocalConditions } from "./conditions/conditions.js";
import { resolveDispatch } from "./energy/resolveDispatch.js";
import { beginEnergySummit, currentSummitPlayerId, executeDirectTrade, passSummitTurn, prepareKnowledgeLink, proposeSummitTrade, respondSummitTrade } from "./trade/trade.js";
import { emptyMetrics, getPlayer, log } from "./helpers.js";
import { finalRanking } from "./scoring/scoring.js";
import { lockUndo, pushUndo, resetGeneration, setGenerationStartSnapshot, undoLast } from "./history/undo.js";
import { advanceWeather, setInitialCurrent, setInitialForecast, setSummitForecast } from "./weather/weather.js";
function orderedFromFirst(state) { return [...state.turnOrder.slice(state.firstPlayerIndex), ...state.turnOrder.slice(0, state.firstPlayerIndex)]; }
function activePlayerId(state) { return state.turnOrder[state.activeTurnIndex]; }
function resetPlayerForGeneration(state, p) {
    p.actionsRemaining = state.config.rules.actionsPerGeneration;
    p.completedTrades = 0;
    p.initiatedTrades = 0;
    p.assistanceLent = false;
    p.knowledgeLinkUsed = false;
    p.temporaryKnowledge = 0;
    p.assistanceKnowledge = 0;
    p.currentMetrics = emptyMetrics(state.config.demand.reliabilityTargets[state.generation]);
    for (const i of p.installed) {
        i.usedThisGeneration = false;
        i.temporaryCapacityBonus = 0;
    }
}
function beginGeneration(state) {
    if (state.phase !== "generation.start")
        throw new Error("Generation cannot begin in this phase.");
    if (state.generation === 0)
        state.generation = 1;
    state.weather.history[state.generation] = state.weather.current;
    for (const p of Object.values(state.players))
        resetPlayerForGeneration(state, p);
    state.actionRound = 1;
    state.activeTurnIndex = state.firstPlayerIndex;
    state.phase = "generation.localConditions";
    log(state, "generation.started", `Generation ${state.generation} started.`, null, { current: state.weather.current, forecast: state.weather.forecast });
}
function advanceDevelopmentTurn(state) {
    state.activeTurnIndex = (state.activeTurnIndex + 1) % state.turnOrder.length;
    if (state.activeTurnIndex === state.firstPlayerIndex) {
        if (state.actionRound < state.config.rules.actionsPerGeneration) {
            state.actionRound += 1;
            log(state, "development.round", `Development action round ${state.actionRound} began.`);
        }
        else {
            state.phase = "generation.dispatch";
            state.activeTurnIndex = state.firstPlayerIndex;
            log(state, "development.complete", `Development completed for Generation ${state.generation}.`);
        }
    }
}
function advanceDispatchTurn(state) {
    state.activeTurnIndex = (state.activeTurnIndex + 1) % state.turnOrder.length;
    if (state.activeTurnIndex === state.firstPlayerIndex) {
        state.phase = "generation.review";
        log(state, "generation.review", `Generation ${state.generation} review is ready.`);
    }
}
function finishReview(state) {
    if (state.phase !== "generation.review")
        throw new Error("Review cannot finish in this phase.");
    discardCurrentConditions(state);
    if (state.generation === state.config.rules.generations) {
        state.results = finalRanking(state);
        state.completed = true;
        state.phase = "game.complete";
        log(state, "game.complete", "The game is complete.", null, { results: state.results });
        return;
    }
    state.firstPlayerIndex = (state.firstPlayerIndex + 1) % state.turnOrder.length;
    state.phase = "generation.advanceWeather";
}
function applyCommandMutable(state, command) {
    switch (command.type) {
        case "selectPrepared": {
            if (state.phase !== "setup.preparedSelection")
                throw new Error("Prepared selections are closed.");
            const p = getPlayer(state, command.playerId);
            p.prepared.pathwayId = command.pathwayId;
            p.prepared.capabilityId = command.capabilityId;
            log(state, "prepared.selected", `${p.name} selected hidden Prepared cards.`, p.id);
            if (Object.values(state.players).every(x => x.prepared.pathwayId && x.prepared.capabilityId)) {
                if (state.opening.mode === "energySummit") {
                    if (!state.weather.forecast)
                        setSummitForecast(state);
                    beginEnergySummit(state);
                }
                else
                    state.phase = "setup.revealPrepared";
            }
            break;
        }
        case "rollCurrent":
            setInitialCurrent(state);
            break;
        case "revealPrepared": {
            if (state.phase !== "setup.revealPrepared")
                throw new Error("Starting Plans cannot be revealed now.");
            state.opening.revealed = true;
            state.phase = "setup.foundingProjects";
            state.opening.foundingIndex = 0;
            for (const p of Object.values(state.players))
                log(state, "prepared.revealed", `${p.name}: ${p.prepared.pathwayId} / ${p.prepared.capabilityId}.`, p.id);
            break;
        }
        case "resolveFoundingProject": {
            if (state.phase !== "setup.foundingProjects")
                throw new Error("Founding Projects are not active.");
            const expectedId = state.opening.foundingOrder[state.opening.foundingIndex];
            if (command.playerId !== expectedId)
                throw new Error(`It is ${expectedId}'s Founding Project decision.`);
            resolveFoundingProject(state, command.playerId, command.complete);
            state.opening.foundingIndex++;
            if (state.opening.foundingIndex >= state.opening.foundingOrder.length)
                state.phase = "setup.rollCurrent";
            break;
        }
        case "proposeSummitTrade":
            proposeSummitTrade(state, command.proposerId, command.recipientId, command.proposerGives, command.recipientGives);
            break;
        case "respondSummitTrade":
            respondSummitTrade(state, command.recipientId, command.accept);
            break;
        case "passSummitTurn":
            passSummitTurn(state, command.playerId);
            break;
        case "rollForecast":
            setInitialForecast(state);
            break;
        case "beginGeneration":
            beginGeneration(state);
            break;
        case "drawLocalConditions":
            drawLocalConditions(state);
            break;
        case "developmentAction": {
            if (command.playerId !== activePlayerId(state))
                throw new Error(`It is ${activePlayerId(state)}'s Development turn.`);
            performDevelopmentAction(state, command.playerId, command.action);
            advanceDevelopmentTurn(state);
            break;
        }
        case "knowledgeLinkBuild": {
            if (command.borrowerId !== activePlayerId(state))
                throw new Error(`Only the active player may use a Knowledge Link.`);
            const linked = structuredClone(state);
            prepareKnowledgeLink(linked, command.borrowerId, command.lenderId, command.technologyId, command.paymentResource);
            performDevelopmentAction(linked, command.borrowerId, { kind: "build", technologyId: command.technologyId, useContinentAbility: Boolean(command.useContinentAbility) });
            Object.assign(state, linked);
            advanceDevelopmentTurn(state);
            break;
        }
        case "directTrade": {
            if (command.aId !== activePlayerId(state))
                throw new Error(`Only the active player may propose a direct trade.`);
            const result = executeDirectTrade(state, command.aId, command.bId, command.aGives, command.bGives);
            if (result.actionSpent)
                advanceDevelopmentTurn(state);
            break;
        }
        case "dispatch": {
            if (state.phase !== "generation.dispatch")
                throw new Error("Dispatch is not active.");
            if (command.playerId !== activePlayerId(state))
                throw new Error(`It is ${activePlayerId(state)}'s Dispatch turn.`);
            resolveDispatch(state, command.playerId, command.plan);
            advanceDispatchTurn(state);
            break;
        }
        case "finishReview":
            finishReview(state);
            break;
        case "advanceWeather":
            advanceWeather(state);
            break;
        case "undo":
        case "resetGeneration": throw new Error("History commands are handled transactionally.");
    }
}
export function applyCommand(state, command) {
    if (command.type === "undo") {
        undoLast(state);
        return state;
    }
    if (command.type === "resetGeneration") {
        resetGeneration(state);
        return state;
    }
    const draft = structuredClone(state);
    if (command.type === "developmentAction" || command.type === "directTrade" || command.type === "knowledgeLinkBuild")
        pushUndo(draft);
    applyCommandMutable(draft, command);
    if (command.type === "drawLocalConditions" && draft.phase === "generation.development")
        setGenerationStartSnapshot(draft);
    if (draft.phase === "generation.dispatch")
        lockUndo(draft, "Development completed and Dispatch began.");
    Object.assign(state, draft);
    return state;
}
export function applyCommandFast(state, command) {
    if (state.executionMode !== "simulation")
        throw new Error("Fast command execution is reserved for Simulation mode.");
    if (command.type === "undo" || command.type === "resetGeneration")
        throw new Error("History commands are unavailable in Simulation mode.");
    applyCommandMutable(state, command);
    return state;
}
export function currentPlayerId(state) { return state.phase === "generation.development" || state.phase === "generation.dispatch" ? activePlayerId(state) : state.phase === "setup.summit" ? currentSummitPlayerId(state) : state.phase === "setup.foundingProjects" ? state.opening.foundingOrder[state.opening.foundingIndex] ?? null : null; }
export function currentOrder(state) { return orderedFromFirst(state); }
//# sourceMappingURL=stateMachine.js.map