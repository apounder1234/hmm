import { AFFINITY_THRESHOLDS, continents } from "./continents.js";
import { technologies } from "./technologies.js";
import { weather } from "./weather.js";
import { localConditions } from "./localConditions.js";

const preparedPathways = [
    { id: "solar", foundingTechnologyId: "basicSolar", foundingLabel: "Basic Solar Array" },
    { id: "wind", foundingTechnologyId: "basicWind", foundingLabel: "Community Wind Turbine" },
    { id: "hydro", foundingTechnologyId: "basicReservoir", foundingLabel: "Small Hydro System" },
    { id: "biomass", foundingTechnologyId: "basicBiomassPlant", foundingLabel: "Managed Biomass Plant" },
    { id: "fossil", foundingTechnologyId: null, foundingLabel: "Fuel Supply Network", foundingCost: { constructionMaterials: 2, criticalMaterials: 0 } }
];
const preparedCapabilities = [
    { id: "storage", effect: "First storage technology costs 1 fewer Critical Mineral." },
    { id: "transformation", effect: "First constructed transformation technology produces 1 less System Loss on its first operation." },
    { id: "transport", effect: "First Grid Upgrade gains +1 temporary capacity in its build Generation." },
    { id: "efficiency", effect: "First efficiency technology costs 1 fewer Critical Mineral." },
    { id: "research", effect: "First Learn action costs 1 fewer Other Material." },
    { id: "trade", effect: "Your first public import costs 1 fewer Warehouse resource." }
];

export const defaultConfig = {
    schemaVersion: "1.0.0",
    rules: {
        generations: 8,
        actionsPerGeneration: 3,
        knowledgeMaximum: 5,
        warehouseMaximum: 9,
        reliabilityPointMaximum: 4,
        appliedLearningTokenMaximum: 2,
        buildAndOperateSameGeneration: true,
        batteryChargeAndDischargeSameGeneration: false,
        innovationMarketSlots: 4,
        openingWarehouseSize: 6
    },
    affinityThresholds: AFFINITY_THRESHOLDS,
    disabledContinentAbilityIds: [],
    continents,
    technologies,
    weather,
    localConditions,
    preparedPathways,
    preparedCapabilities,
    opening: {
        defaultMode: "energySummit",
        summitMaximumTradesPerPlayer: 2,
        summitMaximumBundlePerSide: 2,
        summitDirections: ["rightToLeft", "leftToRight"]
    },
    knowledge: {
        advancementCosts: {
            2: { constructionMaterials: 1, criticalMaterials: 0 },
            3: { constructionMaterials: 1, criticalMaterials: 1 },
            4: { constructionMaterials: 1, criticalMaterials: 1 },
            5: { constructionMaterials: 1, criticalMaterials: 2 }
        }
    },
    demand: { maximumLight: 4, reliabilityTargets: { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4 } },
    trade: {
        directEnabled: true,
        publicImportEnabled: true,
        freeDirectTradesPerGeneration: 0,
        knowledgeLinkEnabled: true,
        knowledgeLinkPayment: 1,
        normalImportCost: 2,
        criticalImportCost: 4,
        warehouseMaximum: 9,
        worldMarketStarting: { fossilFuel: 6, biomass: 6, constructionMaterials: 6, criticalMaterials: 6 }
    },
    systemLoss: { countThermal: true, countBattery: true, countLighting: true, countCurtailment: false }
};
//# sourceMappingURL=index.js.map
