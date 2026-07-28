import { configHash } from "../config/hash.js";
import { validateConfig } from "../config/validation.js";
import { createRandomState, shuffle } from "../random/rng.js";
import { emptyEnergy, emptyMetrics, log, resourceTypes } from "./helpers.js";
function createLocalDeck(config, state) {
    const cards = config.localConditions.flatMap(def => Array.from({ length: def.copies }, (_, i) => ({ cardId: `${def.id}-${i + 1}`, definitionId: def.id })));
    return { drawPile: shuffle(cards, state.streams.conditions), discardPile: [], resetAtGenerationFive: false };
}
function createMarket(config, state) {
    const advanced = shuffle(config.technologies.filter(t => t.tier === "advanced" && !t.alwaysAvailable).map(t => t.id), state.streams.market);
    return { drawPile: advanced.slice(config.rules.innovationMarketSlots), visible: advanced.slice(0, config.rules.innovationMarketSlots) };
}
function createPlayer(config, setup) {
    const continent = config.continents.find(c => c.id === setup.continentId);
    if (!continent)
        throw new Error(`Unknown continent ${setup.continentId}`);
    const resources = {};
    for (const r of resourceTypes) {
        const printed = continent.printedResources[r];
        const warehouse = Math.floor(printed / 4);
        resources[r] = { printedStarting: printed, currentContinent: printed - warehouse, warehouse };
    }
    const installed = config.technologies.filter(t => t.starter).map((t, i) => ({ instanceId: `${setup.id}-${t.id}-${i + 1}`, technologyId: t.id, builtGeneration: 0, storageInput: emptyEnergy(), usedThisGeneration: false, firstOperationLossReduction: 0, temporaryCapacityBonus: 0 }));
    return {
        id: setup.id, name: setup.name, continentId: setup.continentId, controller: setup.controller, resources, knowledge: continent.startingKnowledge, temporaryKnowledge: 0,
        assistanceKnowledge: 0, prepared: { pathwayId: null, capabilityId: null, pathwayUsed: false, capabilityUsed: false }, installed, localCondition: null, actionsRemaining: 0, completedTrades: 0, assistanceLent: false,
        lightByGeneration: {}, reliabilityByGeneration: {}, cumulative: { totalLight: 0, reliableGenerations: 0, systemLoss: { thermal: 0, battery: 0, lighting: 0, other: 0 }, curtailment: 0 }, currentMetrics: emptyMetrics(config.demand.reliabilityTargets[1] ?? 2)
    };
}
export function createGame(config, players, seed, options = {}) {
    const errors = validateConfig(config);
    if (errors.length)
        throw new Error(`Invalid configuration:\n${errors.join("\n")}`);
    if (players.length < 1 || players.length > 6)
        throw new Error("Game requires one to six players.");
    if (new Set(players.map(p => p.continentId)).size !== players.length)
        throw new Error("Continents must be unique.");
    const rng = createRandomState(seed);
    const playerMap = Object.fromEntries(players.map(p => [p.id, createPlayer(config, p)]));
    const state = { schemaVersion: "1.0.0", engineVersion: "0.7.0", gameId: `game-${configHash(config)}-${seed}-${players.map(p => p.id).join("-")}`, config: structuredClone(config), configHash: configHash(config), seed, debugMode: options.debugMode ?? false, executionMode: options.executionMode ?? "interactive", rng, phase: "setup.preparedSelection", generation: 0, actionRound: 1, turnOrder: players.map(p => p.id), firstPlayerIndex: options.initialFirstPlayerIndex === undefined ? 0 : Math.max(0, Math.min(players.length - 1, Math.floor(options.initialFirstPlayerIndex))), activeTurnIndex: options.initialFirstPlayerIndex === undefined ? 0 : Math.max(0, Math.min(players.length - 1, Math.floor(options.initialFirstPlayerIndex))), players: playerMap, weather: { currentDie: "A", current: null, forecastDie: "B", forecast: null, history: {} }, localConditions: createLocalDeck(config, rng), innovationMarket: createMarket(config, rng), log: [], completed: false, results: null, undo: { stack: [], generationStart: null, lockReason: null } };
    log(state, "game.created", `Created SUNPATHS game with ${players.length} players and seed ${seed}.`);
    return state;
}
//# sourceMappingURL=createGame.js.map