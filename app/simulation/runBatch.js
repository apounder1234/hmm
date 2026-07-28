import { createRandomState, randomInt } from "../random/rng.js";
import { configHash } from "../config/hash.js";
import { runAutomatedGame } from "./runGame.js";
import { applySimulationScenario, seatOrderForGame, strategyForGame } from "./scenario.js";
import { aggregateByContinent, aggregateByStrategy, dominantCombinationFrequencies, extractPlayerResults, firstBuildFrequencies, technologyFrequencies, weatherWinnerRows } from "./metrics.js";
import { detectBalanceFlags } from "./balanceFlags.js";
function playersForGame(config, scenario, gameIndex) {
    const strategyAssignments = strategyForGame(scenario.assignments, gameIndex, scenario.assignmentMode);
    const assignments = seatOrderForGame(strategyAssignments, gameIndex, scenario.seatAssignmentMode);
    return assignments.map((assignment, index) => {
        const continent = config.continents.find(item => item.id === assignment.continentId);
        if (!continent)
            throw new Error(`Unknown simulation continent ${assignment.continentId}.`);
        return {
            id: `p${index + 1}`,
            name: `${continent.name} · ${assignment.strategyId}`,
            continentId: assignment.continentId,
            controller: { kind: "ai", strategy: assignment.strategyId, difficulty: scenario.aiDifficulty }
        };
    });
}
export function validateSimulationScenario(config, scenario) {
    const errors = [];
    if (!Number.isInteger(scenario.games) || scenario.games < 1 || scenario.games > 10000)
        errors.push("Simulation games must be an integer from 1 to 10,000.");
    if (!scenario.baseSeed.trim())
        errors.push("Simulation seed cannot be empty.");
    if (scenario.assignments.length < 1 || scenario.assignments.length > 6)
        errors.push("Simulation requires one to six assignments.");
    if (new Set(scenario.assignments.map(item => item.continentId)).size !== scenario.assignments.length)
        errors.push("Simulation continents must be unique.");
    if (scenario.localConditionSeverity < 0 || scenario.localConditionSeverity > 2)
        errors.push("Local Condition severity must be between 0 and 2.");
    if (scenario.startingResourceMultiplier < 0.5 || scenario.startingResourceMultiplier > 2)
        errors.push("Starting resource multiplier must be between 0.5 and 2.");
    if (!Number.isInteger(scenario.actionsPerGeneration) || scenario.actionsPerGeneration < 1 || scenario.actionsPerGeneration > 4)
        errors.push("Actions per Generation must be an integer from 1 to 4.");
    if (!Number.isFinite(scenario.aiTradeUtilityThreshold) || scenario.aiTradeUtilityThreshold < 0 || scenario.aiTradeUtilityThreshold > 5)
        errors.push("AI trade utility threshold must be between 0 and 5.");
    if (!Number.isInteger(scenario.aiDirectTradeCadence) || scenario.aiDirectTradeCadence < 1 || scenario.aiDirectTradeCadence > 8)
        errors.push("AI direct-trade cadence must be an integer from 1 to 8.");
    for (const assignment of scenario.assignments)
        if (!config.continents.some(item => item.id === assignment.continentId))
            errors.push(`Unknown continent ${assignment.continentId}.`);
    return errors;
}
export function runSimulationBatch(baseConfig, scenario, onProgress) {
    const errors = validateSimulationScenario(baseConfig, scenario);
    if (errors.length)
        throw new Error(`Invalid simulation scenario:\n${errors.join("\n")}`);
    const effectiveConfig = applySimulationScenario(baseConfig, scenario);
    const results = [];
    const progressInterval = Math.max(1, Math.floor(scenario.games / 100));
    for (let gameIndex = 0; gameIndex < scenario.games; gameIndex++) {
        const seed = `${scenario.baseSeed}::${gameIndex}`;
        const playerSetups = playersForGame(effectiveConfig, scenario, gameIndex);
        const initialFirstPlayerIndex = scenario.randomizeInitialFirstPlayer
            ? randomInt(createRandomState(`${seed}::initial-first-player`).streams.simulation, playerSetups.length)
            : 0;
        const state = runAutomatedGame(effectiveConfig, seed, playerSetups, false, {
            aiTradeUtilityThreshold: scenario.aiTradeUtilityThreshold,
            aiDirectTradeCadence: scenario.aiDirectTradeCadence
        }, initialFirstPlayerIndex);
        results.push(...extractPlayerResults(state, gameIndex));
        if (onProgress && ((gameIndex + 1) % progressInterval === 0 || gameIndex + 1 === scenario.games)) {
            onProgress({ completed: gameIndex + 1, total: scenario.games, fraction: (gameIndex + 1) / scenario.games });
        }
    }
    const byContinent = aggregateByContinent(results);
    const byStrategy = aggregateByStrategy(results);
    const technologyPurchases = technologyFrequencies(results);
    const firstBuildChoices = firstBuildFrequencies(results);
    const dominantStrategyCombinations = dominantCombinationFrequencies(results);
    const weatherRows = weatherWinnerRows(results);
    const flags = detectBalanceFlags(results, byContinent, technologyPurchases, weatherRows, byStrategy);
    return {
        reportVersion: "1.0.0",
        generatedAtIso: new Date().toISOString(),
        scenario: structuredClone(scenario),
        effectiveConfig,
        effectiveConfigHash: configHash(effectiveConfig),
        gamesCompleted: scenario.games,
        playerResults: results,
        byContinent,
        byStrategy,
        technologyPurchases,
        firstBuildChoices,
        dominantStrategyCombinations,
        weatherWinnerRows: weatherRows,
        flags,
        totals: {
            trades: results.reduce((sum, row) => sum + row.tradesCompleted, 0) / 2,
            imports: results.reduce((sum, row) => sum + row.importsCompleted, 0),
            technicalAssistance: results.reduce((sum, row) => sum + row.technicalAssistanceReceived, 0),
            fossilFuelConsumed: results.reduce((sum, row) => sum + row.fossilFuelConsumed, 0),
            biomassRegrown: results.reduce((sum, row) => sum + row.biomassRegrown, 0)
        }
    };
}
//# sourceMappingURL=runBatch.js.map