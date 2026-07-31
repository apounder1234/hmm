// @ts-nocheck
// SUNPATHS organised source. Each section has one named responsibility.
import { runSimulationBatch, runTradeModeComparison } from "./simulation.js?v=a5.22.27";
// -----------------------------------------------------------------------------
// Background simulation Worker
// -----------------------------------------------------------------------------
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

