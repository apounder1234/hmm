// @ts-nocheck
// SUNPATHS organised source. Each section has one named responsibility.
// -----------------------------------------------------------------------------
// Continent profiles and affinity thresholds
// -----------------------------------------------------------------------------
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
// -----------------------------------------------------------------------------
// Technology definitions
// -----------------------------------------------------------------------------
const c = (constructionMaterials, criticalMaterials) => ({ constructionMaterials, criticalMaterials });
const reservoirRecovery = capacity => ({ outputsByInput: Array.from({ length: capacity + 1 }, (_, value) => value) });
export const technologies = [
    // SOLAR — modular PV → utility-scale integration → high-performance tracked systems
    { id: "basicSolar", name: "Basic Solar Array", tier: "basic", pathway: "solar", stage: "capture", cost: c(1, 1), knowledgeRequired: 1, capacity: 2, maximumInput: 5, maximumOutput: 2, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Mature modular photovoltaic systems can be deployed at small scale with standard electrical and installation skills." },
    { id: "utilitySolar", name: "Utility Solar Farm", tier: "intermediate", pathway: "solar", stage: "capture", cost: c(2, 2), knowledgeRequired: 3, prerequisiteTechnologyId: "basicSolar", capacity: 4, maximumInput: 5, maximumOutput: 4, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Large solar farms require specialised design, inverters, protection, forecasting, land planning and grid connection." },
    { id: "advancedSolar", name: "High-Efficiency Solar System", tier: "advanced", pathway: "solar", stage: "capture", cost: c(3, 2), knowledgeRequired: 5, prerequisiteTechnologyId: "utilitySolar", capacity: 5, maximumInput: 5, maximumOutput: 5, alwaysAvailable: true, special: "advancedSolarResilience", copyLimit: 1, knowledgeRationale: "High-performance modules, tracking, advanced power electronics and system optimisation demand deep technical and operational capability." },
    // WIND — accessible land-based wind → large onshore fleets → offshore wind systems
    { id: "basicWind", name: "Community Wind Turbine", tier: "basic", pathway: "wind", stage: "capture", cost: c(2, 1), knowledgeRequired: 1, capacity: 2, maximumInput: 5, maximumOutput: 2, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "A mature land-based turbine still requires basic siting, mechanical, electrical and safety capability." },
    { id: "onshoreWindFarm", name: "Onshore Wind Farm", tier: "intermediate", pathway: "wind", stage: "capture", cost: c(3, 2), knowledgeRequired: 3, prerequisiteTechnologyId: "basicWind", capacity: 4, maximumInput: 5, maximumOutput: 4, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "A multi-turbine wind farm requires specialist resource assessment, foundations, controls, maintenance planning and grid integration." },
    { id: "advancedWind", name: "Offshore Wind Farm", tier: "advanced", pathway: "wind", stage: "capture", cost: c(4, 2), knowledgeRequired: 5, prerequisiteTechnologyId: "onshoreWindFarm", capacity: 5, maximumInput: 5, maximumOutput: 5, alwaysAvailable: true, special: "advancedWindResilience", copyLimit: 1, knowledgeRationale: "Marine foundations, specialised vessels, export cables, remote maintenance and harsh operating conditions make offshore wind highly demanding." },
    // HYDRO — each card is an integrated water-storage and turbine system
    { id: "basicReservoir", name: "Small Hydro System", tier: "basic", pathway: "hydro", stage: "transformation", cost: c(2, 1), knowledgeRequired: 1, capacity: 2, maximumInput: 2, maximumOutput: 2, storage: { type: "reservoir", capacity: 3, recovery: reservoirRecovery(3), acceptedPathways: ["hydro"] }, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Small hydropower is mature, but still needs water-control, turbine, electrical and safety knowledge." },
    { id: "advancedReservoir", name: "Reservoir Hydro System", tier: "intermediate", pathway: "hydro", stage: "transformation", cost: c(3, 1), knowledgeRequired: 3, prerequisiteTechnologyId: "basicReservoir", capacity: 4, maximumInput: 4, maximumOutput: 4, storage: { type: "reservoir", capacity: 6, recovery: reservoirRecovery(6), acceptedPathways: ["hydro"] }, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Reservoir hydropower requires integrated civil engineering, hydrology, operating rules, dam safety and environmental management." },
    { id: "advancedHydroTurbine", name: "Flexible Hydro Storage System", tier: "advanced", pathway: "hydro", stage: "transformation", cost: c(3, 2), knowledgeRequired: 5, prerequisiteTechnologyId: "advancedReservoir", capacity: 5, maximumInput: 5, maximumOutput: 5, storage: { type: "reservoir", capacity: 8, recovery: reservoirRecovery(8), acceptedPathways: ["hydro"] }, alwaysAvailable: true, special: "advancedHydroFlexibility", copyLimit: 1, knowledgeRationale: "Advanced flexible hydro combines large storage, sophisticated controls, forecasting, grid services and complex water-system operation." },
    // BIOMASS — accessible managed fuel → efficient CHP → integrated biorefinery
    { id: "basicBiomassPlant", name: "Managed Biomass Plant", tier: "basic", pathway: "biomass", stage: "transformation", cost: c(2, 0), knowledgeRequired: 1, capacity: 2, maximumInput: 1, maximumOutput: 2, fuel: { resource: "biomass", units: 1 }, loss: { category: "thermal", fixedPerOperation: 2 }, biomassRegrowth: 1, appliedLearning: true, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Direct biomass combustion and managed feedstock supply use established equipment and practices, although sustainable operation still needs planning." },
    { id: "advancedBiomassPlant", name: "Efficient Biomass CHP", tier: "intermediate", pathway: "biomass", stage: "transformation", cost: c(3, 1), knowledgeRequired: 3, prerequisiteTechnologyId: "basicBiomassPlant", capacity: 3, maximumInput: 1, maximumOutput: 3, fuel: { resource: "biomass", units: 1 }, loss: { category: "thermal", fixedPerOperation: 1 }, biomassRegrowth: 1, appliedLearning: true, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Combined heat and power needs better feedstock control, emissions treatment, heat recovery and coordinated operation." },
    { id: "integratedBiorefinery", name: "Integrated Biorefinery", tier: "advanced", pathway: "biomass", stage: "transformation", cost: c(3, 2), knowledgeRequired: 5, prerequisiteTechnologyId: "advancedBiomassPlant", capacity: 4, maximumInput: 1, maximumOutput: 4, fuel: { resource: "biomass", units: 1 }, loss: { category: "thermal", fixedPerOperation: 1 }, biomassRegrowth: 1, appliedLearning: true, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Integrated biorefineries combine feedstock preparation, multiple conversion processes, product recovery, controls and complex supply-chain management." },
    // FOSSIL — available bridge → efficient combined cycle → complex capture-equipped plant
    { id: "basicFossilPlant", name: "Legacy Fuel Plant", tier: "basic", pathway: "fossil", stage: "transformation", cost: c(1, 0), knowledgeRequired: 1, capacity: 2, maximumInput: 1, maximumOutput: 2, fuel: { resource: "fossilFuel", units: 1 }, loss: { category: "thermal", fixedPerOperation: 2 }, starter: false, copyLimit: 1, alwaysAvailable: true, special: "legacyFuelBridge", knowledgeRationale: "Conventional thermal generation is established, although trained operation, maintenance and safety remain essential." },
    { id: "combinedCycle", name: "Combined-Cycle Plant", tier: "intermediate", pathway: "fossil", stage: "transformation", cost: c(2, 1), knowledgeRequired: 3, prerequisiteTechnologyId: "basicFossilPlant", capacity: 3, minimumRegionalOpportunity: 3, maximumInput: 1, maximumOutput: 3, fuel: { resource: "fossilFuel", units: 1 }, loss: { category: "thermal", fixedPerOperation: 1 }, copyLimit: 1, alwaysAvailable: true, special: "efficientFuelBridge", knowledgeRationale: "Combined-cycle plants integrate gas turbines, heat-recovery steam systems, controls and skilled maintenance." },
    { id: "carbonCapturePlant", name: "Advanced Fuel Plant with Carbon Capture", tier: "advanced", pathway: "fossil", stage: "transformation", cost: c(3, 2), knowledgeRequired: 5, prerequisiteTechnologyId: "combinedCycle", capacity: 4, maximumInput: 1, maximumOutput: 4, fuel: { resource: "fossilFuel", units: 1 }, loss: { category: "thermal", fixedPerOperation: 1 }, copyLimit: 1, alwaysAvailable: true, special: "advancedFuelBridge", minimumRegionalOpportunity: 4, knowledgeRationale: "Capture, compression, transport and storage systems add major process integration, monitoring and infrastructure requirements." },
    // SHARED STORAGE — also follows the 1 / 3 / 5 ladder
    { id: "basicBattery", name: "Basic Battery", tier: "basic", pathway: "shared", stage: "storage", cost: c(1, 2), knowledgeRequired: 1, capacity: 5, maximumInput: 5, maximumOutput: 4, storage: { type: "battery", capacity: 5, recovery: { outputsByInput: [0, 1, 2, 3, 3, 4] }, acceptedPathways: ["solar", "wind", "hydro", "biomass", "fossil"] }, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Commercial battery systems are mature, but safe installation still requires power electronics and basic controls." },
    { id: "gridBattery", name: "Grid Battery", tier: "intermediate", pathway: "shared", stage: "storage", cost: c(2, 2), knowledgeRequired: 3, prerequisiteTechnologyId: "basicBattery", capacity: 6, maximumInput: 6, maximumOutput: 5, storage: { type: "battery", capacity: 6, recovery: { outputsByInput: [0, 1, 2, 3, 4, 4, 5] }, acceptedPathways: ["solar", "wind", "hydro", "biomass", "fossil"] }, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Grid batteries require larger power-conversion systems, protection, thermal management and coordinated dispatch." },
    { id: "advancedBattery", name: "Long-Duration Storage", tier: "advanced", pathway: "shared", stage: "storage", cost: c(3, 2), knowledgeRequired: 5, prerequisiteTechnologyId: "gridBattery", capacity: 8, maximumInput: 8, maximumOutput: 7, storage: { type: "battery", capacity: 8, recovery: { outputsByInput: [0, 1, 2, 3, 4, 5, 5, 6, 7] }, acceptedPathways: ["solar", "wind", "hydro", "biomass", "fossil"] }, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Long-duration storage remains less widely deployed and requires advanced system design, controls, safety validation and grid integration." },
    // SHARED TRANSPORT
    { id: "basicGrid", name: "Basic Grid", tier: "basic", pathway: "shared", stage: "transport", cost: c(0, 0), knowledgeRequired: 1, capacity: 3, maximumInput: 3, maximumOutput: 3, starter: true, alwaysAvailable: true, gameBenefit: "Moves up to 3 Energy to Lighting. It can meet early demand but cannot deliver the final four-Light requirement.", knowledgeRationale: "Basic electricity transport uses mature conductors, protection and operating practices." },
    { id: "gridUpgrade", name: "Grid Upgrade", tier: "intermediate", pathway: "shared", stage: "transport", cost: c(2, 1), knowledgeRequired: 3, prerequisiteTechnologyId: "basicGrid", capacity: 4, maximumInput: 4, maximumOutput: 4, alwaysAvailable: true, special: "gridUpgrade", copyLimit: 1, gameBenefit: "Raises transport from 3 to 4 Energy, unlocking the final four-Light target when generation and Lighting are ready.", knowledgeRationale: "Higher-capacity grids require system studies, protection coordination and specialised construction while the network remains live." },
    { id: "smartGrid", name: "Smart Grid", tier: "advanced", pathway: "shared", stage: "transport", cost: c(3, 2), knowledgeRequired: 5, prerequisiteTechnologyId: "gridUpgrade", capacity: 5, maximumInput: 5, maximumOutput: 5, alwaysAvailable: true, special: "smartGrid", copyLimit: 1, gameBenefit: "Moves 5 Energy and prevents a Grid Bottleneck card from reducing capacity below the four-Energy late-game requirement.", knowledgeRationale: "Digital monitoring, advanced power-flow control, communications and cyber-secure operation require deep system-level capability." },
    // LIGHTING AND RESEARCH SUPPORT
    { id: "standardLighting", name: "Standard Lighting", tier: "basic", pathway: "shared", stage: "lighting", cost: c(0, 0), knowledgeRequired: 1, capacity: 4, maximumInput: 4, maximumOutput: 3, conversion: { outputsByInput: [0, 1, 2, 3, 3] }, loss: { category: "lighting", inputMinusOutput: true }, starter: true, alwaysAvailable: true, knowledgeRationale: "Conventional lighting is mature and straightforward to install and operate." },
    { id: "efficientLighting", name: "Efficient LED Lighting", tier: "intermediate", pathway: "shared", stage: "efficiency", cost: c(1, 2), knowledgeRequired: 3, prerequisiteTechnologyId: "standardLighting", capacity: 4, maximumInput: 4, maximumOutput: 4, conversion: { outputsByInput: [0, 1, 2, 3, 4] }, loss: { category: "lighting", inputMinusOutput: true }, alwaysAvailable: true, special: "efficientLighting", copyLimit: 1, knowledgeRationale: "LED systems are mature but good drivers, controls and system design require trained technical capability." },
    { id: "researchCentre", name: "Research Centre", tier: "intermediate", pathway: "shared", stage: "research", cost: c(2, 1), knowledgeRequired: 3, capacity: 1, maximumInput: 0, maximumOutput: 0, alwaysAvailable: true, special: "researchCentre", copyLimit: 1, knowledgeRationale: "A functioning research centre needs trained personnel, laboratories, institutions and sustained technical management." }
];
// -----------------------------------------------------------------------------
// Weather tables
// -----------------------------------------------------------------------------
const faces = ["brightSun", "brightSun", "rain", "strongWind", "storm", "calmOvercast"];
export const weather = {
    faces,
    solar: {
        brightSun: [0, 1, 2, 3, 4, 5], rain: [0, 0, 1, 1, 2, 2], strongWind: [0, 0, 1, 1, 2, 2], storm: [0, 0, 0, 1, 1, 1], calmOvercast: [0, 0, 1, 1, 2, 2]
    },
    wind: {
        brightSun: [0, 0, 1, 1, 2, 2], rain: [0, 0, 1, 1, 2, 2], strongWind: [0, 1, 2, 3, 4, 5], storm: [0, 1, 2, 3, 3, 4], calmOvercast: [0, 0, 1, 1, 2, 2]
    },
    hydro: {
        brightSun: [0, 1, 2, 2, 2, 2], rain: [0, 1, 2, 2, 3, 3], strongWind: [0, 1, 2, 2, 2, 2], storm: [0, 1, 2, 3, 4, 5], calmOvercast: [0, 1, 2, 2, 2, 2]
    }
};
// -----------------------------------------------------------------------------
// Local Condition cards
// -----------------------------------------------------------------------------
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
// -----------------------------------------------------------------------------
// Default game configuration
// -----------------------------------------------------------------------------
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
        normalImportCost: 2,
        criticalImportCost: 4,
        warehouseMaximum: 9,
        worldMarketStarting: { fossilFuel: 6, biomass: 6, constructionMaterials: 6, criticalMaterials: 6 }
    },
    systemLoss: { countThermal: true, countBattery: true, countLighting: true, countCurtailment: false }
};
// -----------------------------------------------------------------------------
// Stable configuration hashing
// -----------------------------------------------------------------------------
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (value && typeof value === "object")
        return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
    return value;
}
export function hashText(text) {
    let h1 = 0x811c9dc5, h2 = 0x9e3779b9;
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
        h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
    }
    return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}
export function configHash(config) { return hashText(JSON.stringify(canonical(config))); }
// -----------------------------------------------------------------------------
// Configuration validation
// -----------------------------------------------------------------------------
const pathways = ["solar", "wind", "hydro", "biomass", "fossil"];
const affinities = ["strong", "standard", "difficult"];
export function validateConfig(config) {
    const errors = [];
    if (config.continents.length !== 6)
        errors.push("Exactly six continents are required.");
    if (config.localConditions.length !== 12 || new Set(config.localConditions.map(card => card.id)).size !== 12)
        errors.push("Exactly twelve unique Local Condition cards are required.");
    if (config.localConditions.reduce((n, c) => n + c.copies, 0) !== 24)
        errors.push("Local Condition deck must contain 24 cards.");
    if (config.rules.generations !== 8)
        errors.push("Prototype must contain eight Generations.");
    if (config.demand.maximumLight !== 4)
        errors.push("Maximum Light must be four.");
    if (!Number.isInteger(config.rules.actionsPerGeneration) || config.rules.actionsPerGeneration < 1 || config.rules.actionsPerGeneration > 4)
        errors.push("Actions per Generation must be an integer from one to four.");
    if (!Number.isInteger(config.rules.reliabilityPointMaximum) || config.rules.reliabilityPointMaximum < 1 || config.rules.reliabilityPointMaximum > config.rules.generations)
        errors.push("Reliability Point maximum must be between one and the number of Generations.");
    for (let generation = 1; generation <= config.rules.generations; generation++) {
        const target = config.demand.reliabilityTargets[generation];
        if (!Number.isInteger(target) || target < 0 || target > config.demand.maximumLight)
            errors.push(`Generation ${generation} Light target must be an integer from zero to ${config.demand.maximumLight}.`);
    }
    if (!Number.isInteger(config.trade.freeDirectTradesPerGeneration) || config.trade.freeDirectTradesPerGeneration < 0 || config.trade.freeDirectTradesPerGeneration > 1)
        errors.push("Free direct trades per Generation must be zero or one.");
    for (const [affinity, thresholds] of Object.entries(config.affinityThresholds ?? {})) {
        if (!affinities.includes(affinity) || !Array.isArray(thresholds) || thresholds.length !== 3 || thresholds.some(value => !Number.isInteger(value) || value < 1 || value > 5))
            errors.push(`${affinity} affinity thresholds must contain three Knowledge values from 1 to 5.`);
    }
    const criticalOrder = ["africa", "southAmerica", "australia", "asia", "northAmerica", "europe"];
    const byId = Object.fromEntries(config.continents.map(continent => [continent.id, continent]));
    for (let index = 1; index < criticalOrder.length; index++)
        if ((byId[criticalOrder[index - 1]]?.printedResources.criticalMaterials ?? 0) <= (byId[criticalOrder[index]]?.printedResources.criticalMaterials ?? 0))
            errors.push("Critical Mineral reserves must rank Africa, South America, Australia, Asia, North America, Europe.");
    for (const c of config.continents) {
        for (const [p, v] of Object.entries(c.opportunities))
            if (v < 1 || v > 5)
                errors.push(`${c.name} ${p} Opportunity outside 1-5.`);
        if (!Number.isInteger(c.startingKnowledge) || c.startingKnowledge < 1 || c.startingKnowledge > 5)
            errors.push(`${c.name} starting Knowledge outside 1-5.`);
        if (![1, 2, 3].includes(c.startingTransmissionLevel))
            errors.push(`${c.name} starting Transmission Level is invalid.`);
        if (![1, 2].includes(c.startingLightingLevel))
            errors.push(`${c.name} starting Lighting Level is invalid.`);
        const warehouseTotal = Object.values(c.startingWarehouse ?? {}).reduce((sum, value) => sum + value, 0);
        if (warehouseTotal !== (config.rules.openingWarehouseSize ?? 6))
            errors.push(`${c.name} must begin with exactly ${config.rules.openingWarehouseSize ?? 6} Warehouse resources.`);
        const reserveTotal = Object.values(c.printedResources ?? {}).reduce((sum, value) => sum + value, 0);
        if (reserveTotal !== 35)
            errors.push(`${c.name} must have exactly 35 total regional resources.`);
        for (const [resource, value] of Object.entries(c.startingWarehouse ?? {})) {
            if (!Number.isInteger(value) || value < 0 || value > c.printedResources[resource])
                errors.push(`${c.name} has an invalid starting Warehouse value for ${resource}.`);
        }
        if (!c.pathwayAffinity || pathways.some(pathway => !affinities.includes(c.pathwayAffinity[pathway])))
            errors.push(`${c.name} must define a valid affinity for all five pathways.`);
    }
    const eightFuel = config.continents.filter(continent => continent.printedResources.fossilFuel === 8);
    if (eightFuel.length !== 1 || eightFuel[0].id !== "northAmerica")
        errors.push("North America must be the only continent with eight total Fossil Fuel.");
    for (const t of config.technologies) {
        if (t.cost.constructionMaterials < 0 || t.cost.criticalMaterials < 0)
            errors.push(`${t.name} has negative cost.`);
        if (![1, 3, 5].includes(t.knowledgeRequired))
            errors.push(`${t.name} must use a universal base Knowledge value of 1, 3 or 5.`);
        if (t.prerequisiteTechnologyId && !config.technologies.some(candidate => candidate.id === t.prerequisiteTechnologyId))
            errors.push(`${t.name} has an unknown prerequisite.`);
    }
    const advancementCosts = config.knowledge?.advancementCosts ?? {};
    for (let level = 2; level <= config.rules.knowledgeMaximum; level++) {
        const cost = advancementCosts[level];
        if (!cost || !Number.isInteger(cost.constructionMaterials) || !Number.isInteger(cost.criticalMaterials) || cost.constructionMaterials < 0 || cost.criticalMaterials < 0)
            errors.push(`Knowledge ${level} requires a valid non-negative material cost.`);
    }
    if (!Number.isInteger(config.rules.appliedLearningTokenMaximum) || config.rules.appliedLearningTokenMaximum < 0 || config.rules.appliedLearningTokenMaximum > 4)
        errors.push("Applied Learning token maximum must be between zero and four.");
    if ((config.opening?.summitMaximumTradesPerPlayer ?? 2) !== 2)
        errors.push("Energy Summit currently requires exactly two trades per player.");
    for (const resource of ["fossilFuel", "biomass", "constructionMaterials", "criticalMaterials"])
        if (config.trade.worldMarketStarting?.[resource] !== 6)
            errors.push(`Global ${resource} stock must begin at six.`);
    return errors;
}

