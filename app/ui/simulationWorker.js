import { runSimulationBatch } from "../simulation/runBatch.js";
import { runTradeModeComparison } from "../simulation/comparison.js";
self.onmessage = (event) => {
    try {
        if (event.data.type === "run") {
            const report = runSimulationBatch(event.data.config, event.data.scenario, progress => {
                self.postMessage({ type: "progress", progress });
            });
            self.postMessage({ type: "complete", report });
            return;
        }
        if (event.data.type === "tradeComparison") {
            const comparison = runTradeModeComparison(event.data.config, event.data.scenario, progress => {
                self.postMessage({ type: "progress", progress });
            });
            self.postMessage({ type: "comparisonComplete", comparison });
        }
    }
    catch (error) {
        self.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
    }
};
//# sourceMappingURL=simulationWorker.js.map