import { runSimulationBatch } from "./runBatch.js";
const tradeModes = ["directAndImport", "publicImportOnly", "disabled"];
export function runTradeModeComparison(baseConfig, baseScenario, onProgress) {
    const reports = {};
    const total = baseScenario.games * tradeModes.length;
    let completedBeforeMode = 0;
    for (const tradeMode of tradeModes) {
        const scenario = { ...structuredClone(baseScenario), tradeMode };
        reports[tradeMode] = runSimulationBatch(baseConfig, scenario, progress => {
            onProgress?.({
                completed: completedBeforeMode + progress.completed,
                total,
                fraction: (completedBeforeMode + progress.completed) / total
            });
        });
        completedBeforeMode += baseScenario.games;
    }
    const rows = tradeModes.map(tradeMode => {
        const report = reports[tradeMode];
        const playerCount = report.playerResults.length;
        const gameCount = report.gamesCompleted;
        return {
            tradeMode,
            meanLight: playerCount ? report.playerResults.reduce((sum, row) => sum + row.totalLight, 0) / playerCount : 0,
            meanReliability: playerCount ? report.playerResults.reduce((sum, row) => sum + row.reliableGenerations, 0) / playerCount : 0,
            meanSystemLoss: playerCount ? report.playerResults.reduce((sum, row) => sum + row.systemLoss, 0) / playerCount : 0,
            meanCurtailment: playerCount ? report.playerResults.reduce((sum, row) => sum + row.curtailment, 0) / playerCount : 0,
            tradesPerGame: gameCount ? report.totals.trades / gameCount : 0,
            importsPerGame: gameCount ? report.totals.imports / gameCount : 0,
            criticalFlagCount: report.flags.filter(flag => flag.severity === "critical").length,
            warningFlagCount: report.flags.filter(flag => flag.severity === "warning").length
        };
    });
    return {
        reportVersion: "1.0.0",
        generatedAtIso: new Date().toISOString(),
        gamesPerMode: baseScenario.games,
        baseScenario: structuredClone(baseScenario),
        rows,
        reports
    };
}
//# sourceMappingURL=comparison.js.map