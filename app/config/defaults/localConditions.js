export const localConditions = [
    { id: "drought", name: "Drought", copies: 2, effect: { kind: "hydroDelta", amount: -2, fallbackBiomassRegrowthDelta: -1, adaptable: true } },
    { id: "rainstorm", name: "Rainstorm", copies: 2, effect: { kind: "hydroDelta", amount: 2, fallbackBiomassRegrowthDelta: 1 } },
    { id: "strongLocalWind", name: "Strong Local Wind", copies: 2, effect: { kind: "windDelta", amount: 2 } },
    { id: "cloudBank", name: "Cloud Bank", copies: 2, effect: { kind: "solarDelta", amount: -2, adaptable: true } },
    { id: "longGrowingSeason", name: "Long Growing Season", copies: 2, effect: { kind: "biomassRegrowthDelta", amount: 1 } },
    { id: "wildfireRisk", name: "Wildfire Risk", copies: 2, effect: { kind: "biomassRegrowthSet", value: 0, adaptable: true } },
    { id: "gridBottleneck", name: "Grid Bottleneck", copies: 2, effect: { kind: "gridCapacityDelta", amount: -1, adaptable: true } },
    { id: "fuelSupplyDisruption", name: "Fuel Supply Disruption", copies: 2, effect: { kind: "firstFuelPlantOutputDelta", amount: -1, adaptable: true } },
    { id: "materialsShortage", name: "Materials Shortage", copies: 2, effect: { kind: "firstBuildConstructionDelta", amount: 1 } },
    { id: "recoveryBreakthrough", name: "Recovery Breakthrough", copies: 2, effect: { kind: "storageRecoveryBonus", amount: 1 } },
    { id: "engineeringExchange", name: "Engineering Exchange", copies: 2, effect: { kind: "temporaryKnowledge", amount: 1 } },
    { id: "demandSurge", name: "Demand Surge", copies: 2, effect: { kind: "demandTargetDelta", amount: 1, adaptable: true } }
];
//# sourceMappingURL=localConditions.js.map