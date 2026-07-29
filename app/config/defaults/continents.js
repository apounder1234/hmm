export const AFFINITY_THRESHOLDS = {
    strong: [1, 2, 4],
    standard: [1, 3, 5],
    difficult: [2, 4, 5]
};

export const continents = [
    {
        id: "africa", name: "Africa",
        printedResources: { fossilFuel: 4, biomass: 8, constructionMaterials: 11, criticalMaterials: 12 },
        startingWarehouse: { fossilFuel: 1, biomass: 0, constructionMaterials: 2, criticalMaterials: 3 },
        opportunities: { solar: 5, wind: 3, hydro: 4, biomass: 4, fossil: 2 },
        startingKnowledge: 2, startingTransmissionLevel: 1, startingLightingLevel: 1, startingFossilLevel: 1,
        pathwayAffinity: { solar: "strong", hydro: "standard", biomass: "standard", wind: "difficult", fossil: "difficult" },
        systemAffinity: { transmission: "standard", storage: "standard", lighting: "standard" },
        strengths: ["Highest Critical Mineral reserve", "Excellent Solar Opportunity", "Solar can leapfrog weak delivery infrastructure"],
        weaknesses: ["Weak starting Transmission", "Its four-unit Fuel bridge is short and Fossil upgrades remain difficult"],
        tradeNeed: "Other Materials and specialised Wind or Fossil support",
        abilityId: "resourceFrontierSolarLeapfrog", penaltyId: null
    },
    {
        id: "europe", name: "Europe",
        printedResources: { fossilFuel: 5, biomass: 10, constructionMaterials: 17, criticalMaterials: 3 },
        startingWarehouse: { fossilFuel: 3, biomass: 2, constructionMaterials: 1, criticalMaterials: 0 },
        opportunities: { solar: 2, wind: 5, hydro: 2, biomass: 1, fossil: 1 },
        startingKnowledge: 3, startingTransmissionLevel: 2, startingLightingLevel: 2, startingFossilLevel: 0,
        pathwayAffinity: { wind: "strong", solar: "standard", hydro: "standard", fossil: "standard", biomass: "difficult" },
        systemAffinity: { transmission: "strong", storage: "standard", lighting: "standard" },
        strengths: ["Knowledge 3", "Advanced starting Grid and Lighting", "Strong Wind and Transmission readiness"],
        weaknesses: ["Lowest Critical Mineral reserve and none ready in the opening Warehouse", "Advanced renewable and storage equipment needs imported minerals"],
        tradeNeed: "Critical Minerals for Level 3 and Level 5 systems",
        abilityId: "advancedSystems", penaltyId: "importedInputs"
    },
    {
        id: "asia", name: "Asia",
        printedResources: { fossilFuel: 7, biomass: 9, constructionMaterials: 12, criticalMaterials: 7 },
        startingWarehouse: { fossilFuel: 3, biomass: 1, constructionMaterials: 1, criticalMaterials: 1 },
        opportunities: { solar: 5, wind: 4, hydro: 4, biomass: 3, fossil: 5 },
        startingKnowledge: 2, startingTransmissionLevel: 2, startingLightingLevel: 1, startingFossilLevel: 1,
        pathwayAffinity: { solar: "strong", fossil: "strong", wind: "standard", hydro: "standard", biomass: "difficult" },
        systemAffinity: { transmission: "standard", storage: "standard", lighting: "standard" },
        strengths: ["Strong Solar and Fossil industrial readiness", "Large manufacturing-material base", "First Solar upgrade uses fewer Other Materials"],
        weaknesses: ["Fossil upgrades create temporary Lock-In", "Biomass systems are institutionally difficult"],
        tradeNeed: "Critical Minerals or Biomass depending on the hidden strategy",
        abilityId: "manufacturingScale", penaltyId: "fossilLockIn"
    },
    {
        id: "northAmerica", name: "North America",
        printedResources: { fossilFuel: 8, biomass: 9, constructionMaterials: 13, criticalMaterials: 5 },
        startingWarehouse: { fossilFuel: 2, biomass: 1, constructionMaterials: 2, criticalMaterials: 1 },
        opportunities: { solar: 4, wind: 5, hydro: 4, biomass: 3, fossil: 5 },
        startingKnowledge: 3, startingTransmissionLevel: 1, startingLightingLevel: 2, startingFossilLevel: 1,
        pathwayAffinity: { fossil: "strong", solar: "standard", wind: "standard", hydro: "standard", biomass: "difficult" },
        systemAffinity: { transmission: "standard", storage: "standard", lighting: "standard" },
        strengths: ["Only region with eight total Fossil Fuel", "Knowledge 3", "One explicit Innovation Boost"],
        weaknesses: ["Weak starting interconnection", "Grid upgrades need extra Other Materials"],
        tradeNeed: "Critical Minerals and Grid construction inputs",
        abilityId: "innovationBoost", penaltyId: "weakInterconnection"
    },
    {
        id: "southAmerica", name: "South America",
        printedResources: { fossilFuel: 3, biomass: 13, constructionMaterials: 9, criticalMaterials: 10 },
        startingWarehouse: { fossilFuel: 0, biomass: 3, constructionMaterials: 1, criticalMaterials: 2 },
        opportunities: { solar: 4, wind: 4, hydro: 5, biomass: 5, fossil: 2 },
        startingKnowledge: 2, startingTransmissionLevel: 2, startingLightingLevel: 1, startingFossilLevel: 0,
        pathwayAffinity: { hydro: "strong", biomass: "strong", solar: "standard", wind: "standard", fossil: "difficult" },
        systemAffinity: { transmission: "standard", storage: "standard", lighting: "standard" },
        strengths: ["Strong Hydro and Biomass readiness", "Second-highest Critical Mineral reserve", "Rain strengthens the first Hydro generator"],
        weaknesses: ["Very small Fossil reserve", "Drought reduces Hydro more sharply"],
        tradeNeed: "Other Materials and backup generation for dry conditions",
        abilityId: "riverBioenergySystems", penaltyId: "droughtExposure"
    },
    {
        id: "australia", name: "Australia",
        printedResources: { fossilFuel: 6, biomass: 7, constructionMaterials: 13, criticalMaterials: 9 },
        startingWarehouse: { fossilFuel: 2, biomass: 0, constructionMaterials: 1, criticalMaterials: 3 },
        opportunities: { solar: 5, wind: 5, hydro: 2, biomass: 2, fossil: 4 },
        startingKnowledge: 2, startingTransmissionLevel: 1, startingLightingLevel: 2, startingFossilLevel: 1,
        pathwayAffinity: { solar: "strong", wind: "strong", fossil: "standard", hydro: "difficult", biomass: "difficult" },
        systemAffinity: { transmission: "standard", storage: "standard", lighting: "standard" },
        strengths: ["Strong Solar and Wind readiness", "High Critical Mineral reserve", "Matching weather increases the first renewable generator"],
        weaknesses: ["Long-distance Grid upgrades cost more", "Hydro and Biomass are difficult pathways"],
        tradeNeed: "Other Materials for Transmission and renewable expansion",
        abilityId: "renewableAbundance", penaltyId: "longDistance"
    }
];
//# sourceMappingURL=continents.js.map
