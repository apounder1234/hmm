const sharedStages = {
    capture: 1,
    storage: 1,
    transformation: 1,
    transport: 1,
    lighting: 1,
    efficiency: 1.25,
    research: 0.8
};
const sharedResources = {
    fossilFuel: 0.7,
    biomass: 0.8,
    constructionMaterials: 1.3,
    criticalMaterials: 1.5
};
export const aiStrategyProfiles = {
    solarStorage: {
        id: "solarStorage", name: "Solar and Storage", preparedPathway: "solar", preparedCapability: "storage",
        pathwayWeights: { solar: 2.4, wind: 0.9, hydro: 0.8, biomass: 0.65, fossil: 0.55 },
        stageWeights: { ...sharedStages, capture: 1.35, storage: 1.7, transport: 1.1, efficiency: 1.35 },
        resourceWeights: { ...sharedResources, criticalMaterials: 1.8 }, reliabilityWeight: 1.25, forecastWeight: 1.5,
        lossAversion: 1.2, depletionAversion: 1.1, diversificationWeight: 0.3, storageReserveTarget: 3
    },
    windGrid: {
        id: "windGrid", name: "Wind and Grid", preparedPathway: "wind", preparedCapability: "transport",
        pathwayWeights: { solar: 0.8, wind: 2.45, hydro: 0.85, biomass: 0.65, fossil: 0.55 },
        stageWeights: { ...sharedStages, capture: 1.35, storage: 1.15, transport: 1.8, efficiency: 1.25 },
        resourceWeights: { ...sharedResources }, reliabilityWeight: 1.2, forecastWeight: 1.55,
        lossAversion: 1.05, depletionAversion: 1.05, diversificationWeight: 0.35, storageReserveTarget: 2
    },
    hydroReliability: {
        id: "hydroReliability", name: "Hydro Reliability", preparedPathway: "hydro", preparedCapability: "storage",
        pathwayWeights: { solar: 0.7, wind: 0.75, hydro: 2.6, biomass: 0.7, fossil: 0.65 },
        stageWeights: { ...sharedStages, storage: 1.75, transformation: 1.45, transport: 1.15, efficiency: 1.35 },
        resourceWeights: { ...sharedResources }, reliabilityWeight: 1.65, forecastWeight: 1.35,
        lossAversion: 1.1, depletionAversion: 1.2, diversificationWeight: 0.3, storageReserveTarget: 4
    },
    biomassRenewal: {
        id: "biomassRenewal", name: "Biomass Renewal", preparedPathway: "biomass", preparedCapability: "research",
        pathwayWeights: { solar: 0.75, wind: 0.75, hydro: 0.8, biomass: 2.55, fossil: 0.45 },
        stageWeights: { ...sharedStages, capture: 1.4, transformation: 1.4, research: 1.3, efficiency: 1.3 },
        resourceWeights: { ...sharedResources, biomass: 1.55 }, reliabilityWeight: 1.4, forecastWeight: 0.7,
        lossAversion: 0.9, depletionAversion: 1.65, diversificationWeight: 0.35, storageReserveTarget: 1
    },
    fossilTempo: {
        id: "fossilTempo", name: "Fuel Bridge", preparedPathway: "fossil", preparedCapability: "transformation",
        pathwayWeights: { solar: 1.2, wind: 1.2, hydro: 0.95, biomass: 0.8, fossil: 2.2 },
        stageWeights: { ...sharedStages, capture: 1.15, transformation: 1.4, transport: 1.2, efficiency: 1.3 },
        resourceWeights: { ...sharedResources, fossilFuel: 1.3 }, reliabilityWeight: 1.55, forecastWeight: 0.8,
        lossAversion: 0.75, depletionAversion: 1.15, diversificationWeight: 0.75, storageReserveTarget: 1
    },
    diversifiedAdapter: {
        id: "diversifiedAdapter", name: "Diversified Adapter", preparedPathway: "solar", preparedCapability: "trade",
        pathwayWeights: { solar: 1.15, wind: 1.15, hydro: 1.15, biomass: 1.05, fossil: 0.95 },
        stageWeights: { ...sharedStages, storage: 1.25, transport: 1.25, efficiency: 1.35, research: 1.1 },
        resourceWeights: { ...sharedResources }, reliabilityWeight: 1.4, forecastWeight: 1.0,
        lossAversion: 1.15, depletionAversion: 1.3, diversificationWeight: 1.6, storageReserveTarget: 2
    }
};
//# sourceMappingURL=profiles.js.map