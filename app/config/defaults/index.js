import { continents } from "./continents.js";
import { technologies } from "./technologies.js";
import { weather } from "./weather.js";
import { localConditions } from "./localConditions.js";
const preparedPathways = ["solar", "wind", "hydro", "biomass", "fossil"].map(id => ({ id, constructionMaterialDiscount: 1, temporaryKnowledge: 1 }));
const preparedCapabilities = [
    { id: "storage", effect: "First storage technology costs 1 fewer Critical Material." },
    { id: "transformation", effect: "First constructed transformation technology produces 1 less System Loss on its first operation." },
    { id: "transport", effect: "First Grid Upgrade gains +1 temporary capacity in its build Generation." },
    { id: "efficiency", effect: "First efficiency technology costs 1 fewer Critical Material." },
    { id: "research", effect: "First Research action grants +1 temporary Knowledge for this Generation." },
    { id: "trade", effect: "Choose one extra direct trade or a one-resource public-import discount once." }
];
export const defaultConfig = {
    schemaVersion: "1.0.0",
    rules: { generations: 8, actionsPerGeneration: 2, knowledgeMaximum: 5, warehouseMaximum: 9, buildAndOperateSameGeneration: true, batteryChargeAndDischargeSameGeneration: false, innovationMarketSlots: 4 },
    continents, technologies, weather, localConditions, preparedPathways, preparedCapabilities,
    demand: { maximumLight: 4, reliabilityTargets: { 1: 2, 2: 2, 3: 3, 4: 3, 5: 3, 6: 4, 7: 4, 8: 4 } },
    trade: { directEnabled: true, publicImportEnabled: true, directTradesPerGeneration: 1, normalImportCost: 2, criticalImportCost: 3, warehouseMaximum: 9 },
    systemLoss: { countThermal: true, countBattery: true, countLighting: true, countCurtailment: false }
};
//# sourceMappingURL=index.js.map