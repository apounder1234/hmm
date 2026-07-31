// @ts-check
// SUNPATHS organised source. Each section has one named responsibility.
// Canonical domain types for the static JavaScript build.
/** @typedef {'africa'|'europe'|'asia'|'northAmerica'|'southAmerica'|'australia'} RegionId */
/** @typedef {'fossilFuel'|'biomass'|'constructionMaterials'|'criticalMaterials'} ResourceType */
/** @typedef {'solar'|'wind'|'hydro'|'biomass'|'fossil'|'shared'} PathwayId */
/** @typedef {'basicSolar'|'utilitySolar'|'advancedSolar'|'basicWind'|'onshoreWindFarm'|'advancedWind'|'basicReservoir'|'advancedReservoir'|'advancedHydroTurbine'|'basicBiomassPlant'|'advancedBiomassPlant'|'integratedBiorefinery'|'basicFossilPlant'|'enhancedOilRecovery'|'combinedCycle'|'carbonCapturePlant'|'basicBattery'|'gridBattery'|'advancedBattery'|'basicGrid'|'gridUpgrade'|'smartGrid'|'standardLighting'|'efficientLighting'|'researchCentre'} TechnologyId */
/** @typedef {'basic'|'intermediate'|'advanced'} TechnologyTier */
/** @typedef {'capture'|'storage'|'transformation'|'transport'|'lighting'|'efficiency'|'research'|'environment'} EnergyStage */
/** @typedef {'brightSun'|'rain'|'strongWind'|'storm'|'calmOvercast'} WeatherType */
/** @typedef {'globalShippingShutdown'|'criticalMineralExportControls'|'mineralProcessingOutage'|'steelCementShortage'|'industrialProductionSlowdown'|'oilTransitDisruption'|'globalFuelPriceShock'|'globalHarvestFailure'|'feedstockContamination'|'strategicReserveRelease'} GlobalEventId */
/** @typedef {{kind:'extraction',resource:ResourceType,yield:2,maximumUsesPerGeneration:1}|{kind:'circularRecovery',recoverableResources:readonly ['constructionMaterials','criticalMaterials'],maximumPerGeneration:1}} RegionalAbility */
// -----------------------------------------------------------------------------
// Layered learning modes
// -----------------------------------------------------------------------------
export const gameModes = Object.freeze({
    beginner: Object.freeze({
        id: "beginner",
        label: "Power the Lights",
        level: "Beginner",
        learningGoal: "Learn how resources and technologies become usable Light.",
        description: "Build pathways, follow the Energy chain and meet rising Light demand without trade, events or Knowledge gates.",
        recommendedFor: "First game or younger students",
        openingMode: "startingPlan",
        features: Object.freeze({
            localConditions: false,
            globalEvents: false,
            forecastVisible: false,
            knowledgeRequirements: false,
            preparedCapabilityChoice: false,
            fullRegionalRules: false
        }),
        allowedTechnologyTiers: Object.freeze(["basic", "intermediate"]),
        includes: Object.freeze(["Current weather", "Energy pathways", "Energy losses", "Light and Reliability"]),
        addsNext: "Reliable Systems adds forecasts, Knowledge, Local Conditions and the World Market."
    }),
    intermediate: Object.freeze({
        id: "intermediate",
        label: "Reliable Energy Systems",
        level: "Intermediate",
        learningGoal: "Plan for changing weather, limited resources and system reliability.",
        description: "Add forecasts, Knowledge, Local Conditions, regional rules and a simple public World Market.",
        recommendedFor: "Players who know the Energy chain",
        openingMode: "startingPlan",
        features: Object.freeze({
            localConditions: true,
            globalEvents: false,
            forecastVisible: true,
            knowledgeRequirements: true,
            preparedCapabilityChoice: true,
            fullRegionalRules: true
        }),
        allowedTechnologyTiers: Object.freeze(["basic", "intermediate"]),
        includes: Object.freeze(["Everything in Beginner", "Forecasts", "Knowledge", "Local Conditions", "World Market"]),
        addsNext: "Global Transition adds advanced technology, direct trade, the Energy Summit and Global Events."
    }),
    master: Object.freeze({
        id: "master",
        label: "Global Energy Transition",
        level: "Master",
        learningGoal: "Manage an unequal, interconnected global Energy transition.",
        description: "Play the complete game with full regional asymmetry, advanced technology, direct trade, the Energy Summit and Global Events.",
        recommendedFor: "Experienced players and full classroom debriefs",
        openingMode: "energySummit",
        features: Object.freeze({
            localConditions: true,
            globalEvents: true,
            forecastVisible: true,
            knowledgeRequirements: true,
            preparedCapabilityChoice: true,
            fullRegionalRules: true
        }),
        allowedTechnologyTiers: Object.freeze(["basic", "intermediate", "advanced"]),
        includes: Object.freeze(["All game systems", "Advanced technology", "Direct trade", "Energy Summit", "Global Events"]),
        addsNext: null
    })
});

export function normalizeGameMode(mode) {
    return Object.hasOwn(gameModes, mode) ? mode : "master";
}

/** @param {any} modeOrState */
export function getGameMode(modeOrState = "master") {
    const raw = typeof modeOrState === "string"
        ? modeOrState
        : typeof modeOrState?.gameMode === "string"
            ? modeOrState.gameMode
            : modeOrState?.config?.gameMode?.id ?? modeOrState?.gameMode?.id;
    return gameModes[normalizeGameMode(raw)];
}

/** @param {any} baseConfig @param {string} mode */
export function createModeConfig(baseConfig, mode = "master") {
    const definition = getGameMode(mode);
    const config = structuredClone(baseConfig);
    config.gameMode = structuredClone(definition);
    config.opening.defaultMode = definition.openingMode;
    if (definition.id === "beginner") {
        config.trade.directEnabled = false;
        config.trade.publicImportEnabled = false;
    }
    else if (definition.id === "intermediate") {
        config.trade.directEnabled = false;
        config.trade.publicImportEnabled = true;
    }
    return config;
}

/** @param {any} stateOrConfig @param {string} feature */
export function featureEnabled(stateOrConfig, feature) {
    const definition = getGameMode(stateOrConfig);
    return definition.features?.[feature] !== false;
}

/** @param {any} stateOrConfig @param {any} technology */
export function modeAllowsTechnology(stateOrConfig, technology) {
    if (!technology || technology.starter)
        return true;
    return getGameMode(stateOrConfig).allowedTechnologyTiers.includes(technology.tier);
}

/** @param {any} modeOrState @param {string|null} requested */
export function modeOpeningMode(modeOrState, requested = null) {
    const definition = getGameMode(modeOrState);
    return definition.id === "master" && requested ? requested : definition.openingMode;
}

/** @param {string} pathway */
export function defaultCapabilityForPathway(pathway) {
    return ({ solar: "storage", wind: "transport", hydro: "storage", biomass: "research", fossil: "transformation" })[pathway] ?? "efficiency";
}

// -----------------------------------------------------------------------------
// Continent profiles and affinity thresholds
// -----------------------------------------------------------------------------
export const REGIONAL_SIGNATURES = Object.freeze({ africa: "solar", europe: "wind", asia: "hydro", northAmerica: "wind", southAmerica: "hydro", australia: "solar" });
export const REGIONAL_RESOURCE_RULES = Object.freeze({
    africa: Object.freeze({ kind: "extraction", resource: "criticalMaterials", yield: 2, maximumUsesPerGeneration: 1 }),
    europe: Object.freeze({ kind: "circularRecovery", recoverableResources: Object.freeze(["constructionMaterials", "criticalMaterials"]), maximumPerGeneration: 1 }),
    asia: Object.freeze({ kind: "extraction", resource: "constructionMaterials", yield: 2, maximumUsesPerGeneration: 1 }),
    northAmerica: Object.freeze({ kind: "extraction", resource: "fossilFuel", yield: 2, maximumUsesPerGeneration: 1 }),
    southAmerica: Object.freeze({ kind: "extraction", resource: "biomass", yield: 2, maximumUsesPerGeneration: 1 }),
    australia: Object.freeze({ kind: "extraction", resource: "criticalMaterials", yield: 2, maximumUsesPerGeneration: 1 })
});
export const AFFINITY_THRESHOLDS = {
    strong: [1, 2, 4],
    standard: [1, 3, 5],
    difficult: [2, 4, 5]
};
export const continents = [
    {
        id: "africa", name: "Africa",
        printedResources: { fossilFuel: 4, biomass: 10, constructionMaterials: 8, criticalMaterials: 13 },
        startingWarehouse: { fossilFuel: 0, biomass: 1, constructionMaterials: 2, criticalMaterials: 3 },
        renewablePotential: { solar: 5, wind: 4, hydro: 4, biomass: 4 },
        signatureRenewable: REGIONAL_SIGNATURES.africa, strongPathway: "solar",
        resourceRule: REGIONAL_RESOURCE_RULES.africa,
        startingKnowledge: 2, startingTransmissionLevel: 1, startingLightingLevel: 1, startingFossilLevel: 0,
        pathwayAffinity: { solar: "strong", wind: "standard", hydro: "standard", biomass: "standard", fossil: "standard" },
        systemAffinity: { transmission: "standard", storage: "standard", lighting: "standard" },
        strengths: ["Once per Generation, Critical Materials extraction yields 2", "Excellent Solar potential", "Solar signature bonus in Bright Sun"],
        weaknesses: ["Basic starting Grid", "Basic starting Lighting", "Only eight total Other Materials"],
        tradeNeed: "Other Materials for larger infrastructure",
        abilityId: "criticalMaterialsExtraction", penaltyId: null
    },
    {
        id: "europe", name: "Europe",
        printedResources: { fossilFuel: 5, biomass: 9, constructionMaterials: 17, criticalMaterials: 4 },
        startingWarehouse: { fossilFuel: 1, biomass: 1, constructionMaterials: 3, criticalMaterials: 1 },
        renewablePotential: { solar: 3, wind: 5, hydro: 4, biomass: 3 },
        signatureRenewable: REGIONAL_SIGNATURES.europe, strongPathway: "wind",
        resourceRule: REGIONAL_RESOURCE_RULES.europe,
        startingKnowledge: 3, startingTransmissionLevel: 1, startingLightingLevel: 1, startingFossilLevel: 0,
        pathwayAffinity: { solar: "standard", wind: "strong", hydro: "standard", biomass: "standard", fossil: "standard" },
        systemAffinity: { transmission: "standard", storage: "standard", lighting: "standard" },
        strengths: ["Knowledge 3", "Recovers one spent material at generation end", "Large Other Materials stock"],
        weaknesses: ["Only four total Critical Materials", "Advanced Solar, Wind and Battery systems need one extra Critical Material"],
        tradeNeed: "Critical Materials for advanced systems",
        abilityId: "circularRecovery", penaltyId: "importedInputs"
    },
    {
        id: "asia", name: "Asia",
        printedResources: { fossilFuel: 7, biomass: 7, constructionMaterials: 14, criticalMaterials: 7 },
        startingWarehouse: { fossilFuel: 1, biomass: 1, constructionMaterials: 3, criticalMaterials: 1 },
        renewablePotential: { solar: 4, wind: 4, hydro: 5, biomass: 4 },
        signatureRenewable: REGIONAL_SIGNATURES.asia, strongPathway: "hydro",
        resourceRule: REGIONAL_RESOURCE_RULES.asia,
        startingKnowledge: 2, startingTransmissionLevel: 1, startingLightingLevel: 1, startingFossilLevel: 0,
        pathwayAffinity: { solar: "standard", wind: "standard", hydro: "strong", biomass: "standard", fossil: "standard" },
        systemAffinity: { transmission: "standard", storage: "standard", lighting: "standard" },
        strengths: ["Once per Generation, Other Materials extraction yields 2", "Large Other Materials stock", "Hydro signature bonus in Rain or Storm"],
        weaknesses: ["Fossil development creates one temporary Lock-In cost"],
        tradeNeed: "Critical Materials for advanced systems",
        abilityId: "otherMaterialsExtraction", penaltyId: "fossilLockIn"
    },
    {
        id: "northAmerica", name: "North America",
        printedResources: { fossilFuel: 10, biomass: 8, constructionMaterials: 11, criticalMaterials: 6 },
        startingWarehouse: { fossilFuel: 2, biomass: 1, constructionMaterials: 2, criticalMaterials: 1 },
        renewablePotential: { solar: 4, wind: 5, hydro: 4, biomass: 4 },
        signatureRenewable: REGIONAL_SIGNATURES.northAmerica, strongPathway: "fossil",
        resourceRule: REGIONAL_RESOURCE_RULES.northAmerica,
        startingKnowledge: 2, startingTransmissionLevel: 1, startingLightingLevel: 1, startingFossilLevel: 0,
        pathwayAffinity: { solar: "standard", wind: "standard", hydro: "standard", biomass: "standard", fossil: "strong" },
        systemAffinity: { transmission: "standard", storage: "standard", lighting: "standard" },
        strengths: ["Once per Generation, Fuel extraction yields 2", "Ten total Fuel", "Strong Wind signature"],
        weaknesses: ["Grid upgrades cost one additional Other Material"],
        tradeNeed: "Critical Materials and Grid construction inputs",
        abilityId: "fuelExtraction", penaltyId: "weakInterconnection"
    },
    {
        id: "southAmerica", name: "South America",
        printedResources: { fossilFuel: 4, biomass: 13, constructionMaterials: 7, criticalMaterials: 11 },
        startingWarehouse: { fossilFuel: 0, biomass: 2, constructionMaterials: 2, criticalMaterials: 2 },
        renewablePotential: { solar: 4, wind: 4, hydro: 5, biomass: 5 },
        signatureRenewable: REGIONAL_SIGNATURES.southAmerica, strongPathway: "biomass",
        resourceRule: REGIONAL_RESOURCE_RULES.southAmerica,
        startingKnowledge: 2, startingTransmissionLevel: 1, startingLightingLevel: 1, startingFossilLevel: 0,
        pathwayAffinity: { solar: "standard", wind: "standard", hydro: "standard", biomass: "strong", fossil: "standard" },
        systemAffinity: { transmission: "standard", storage: "standard", lighting: "standard" },
        strengths: ["Once per Generation, Biomass extraction yields 2", "Large Biomass and Critical Materials stocks", "Hydro signature bonus in Rain or Storm"],
        weaknesses: ["Only seven total Other Materials", "Only four total Fuel"],
        tradeNeed: "Other Materials and imported Fuel for a long fossil strategy",
        abilityId: "biomassExtraction", penaltyId: null
    },
    {
        id: "australia", name: "Australia",
        printedResources: { fossilFuel: 8, biomass: 5, constructionMaterials: 10, criticalMaterials: 12 },
        startingWarehouse: { fossilFuel: 2, biomass: 0, constructionMaterials: 2, criticalMaterials: 2 },
        renewablePotential: { solar: 5, wind: 4, hydro: 3, biomass: 3 },
        signatureRenewable: REGIONAL_SIGNATURES.australia, strongPathway: "wind",
        resourceRule: REGIONAL_RESOURCE_RULES.australia,
        startingKnowledge: 2, startingTransmissionLevel: 1, startingLightingLevel: 1, startingFossilLevel: 0,
        pathwayAffinity: { solar: "standard", wind: "strong", hydro: "standard", biomass: "standard", fossil: "standard" },
        systemAffinity: { transmission: "standard", storage: "standard", lighting: "standard" },
        strengths: ["Once per Generation, Critical Materials extraction yields 2", "Solar signature bonus in Bright Sun", "Large Critical Materials stock"],
        weaknesses: ["Grid upgrades cost one additional Other Material", "Only five total Biomass"],
        tradeNeed: "Other Materials for long-distance Grid development",
        abilityId: "criticalMaterialsExtraction", penaltyId: "longDistance"
    }
];
// -----------------------------------------------------------------------------
// Technology definitions
// -----------------------------------------------------------------------------
const c = (constructionMaterials, criticalMaterials) => ({ constructionMaterials, criticalMaterials });
const reservoirRecovery = capacity => ({ outputsByInput: Array.from({ length: capacity + 1 }, (_, value) => value) });
export const technologies = [
    // SOLAR — modular PV → utility-scale integration → high-performance tracked systems
    { id: "basicSolar", name: "Basic Solar Array", tier: "basic", pathway: "solar", stage: "capture", cost: c(1, 2), knowledgeRequired: 1, capacity: 2, maximumInput: 5, maximumOutput: 2, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Mature modular photovoltaic systems can be deployed at small scale with standard electrical and installation skills." },
    { id: "utilitySolar", name: "Utility Solar Farm", tier: "intermediate", pathway: "solar", stage: "capture", cost: c(2, 2), knowledgeRequired: 3, prerequisiteTechnologyId: "basicSolar", capacity: 3, maximumInput: 4, maximumOutput: 3, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Large solar farms require specialised design, inverters, protection, forecasting, land planning and grid connection." },
    { id: "advancedSolar", name: "High-Efficiency Solar System", tier: "advanced", pathway: "solar", stage: "capture", cost: c(2, 3), knowledgeRequired: 5, prerequisiteTechnologyId: "utilitySolar", capacity: 4, maximumInput: 4, maximumOutput: 4, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "High-performance modules, tracking, advanced power electronics and system optimisation demand deep technical and operational capability." },
    // WIND — accessible land-based wind → large onshore fleets → offshore wind systems
    { id: "basicWind", name: "Community Wind Turbine", tier: "basic", pathway: "wind", stage: "capture", cost: c(2, 1), knowledgeRequired: 1, capacity: 2, maximumInput: 5, maximumOutput: 2, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "A mature land-based turbine still requires basic siting, mechanical, electrical and safety capability." },
    { id: "onshoreWindFarm", name: "Onshore Wind Farm", tier: "intermediate", pathway: "wind", stage: "capture", cost: c(3, 2), knowledgeRequired: 3, prerequisiteTechnologyId: "basicWind", capacity: 3, maximumInput: 4, maximumOutput: 3, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "A multi-turbine wind farm requires specialist resource assessment, foundations, controls, maintenance planning and grid integration." },
    { id: "advancedWind", name: "Offshore Wind Farm", tier: "advanced", pathway: "wind", stage: "capture", cost: c(5, 2), knowledgeRequired: 5, prerequisiteTechnologyId: "onshoreWindFarm", capacity: 4, maximumInput: 4, maximumOutput: 4, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Marine foundations, specialised vessels, export cables, remote maintenance and harsh operating conditions make offshore wind highly demanding." },
    // HYDRO — immediate river flow plus intergenerational reservoir storage
    { id: "basicReservoir", name: "Small Hydro System", tier: "basic", pathway: "hydro", stage: "transformation", cost: c(2, 1), knowledgeRequired: 1, capacity: 1, maximumInput: 1, maximumOutput: 1, hydro: { immediateOutput: 1, releaseMaximum: 0, totalMaximum: 1, inflowCaptureMaximum: 0 }, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Small hydropower provides a modest immediate flow without large intergenerational water storage." },
    { id: "advancedReservoir", name: "Reservoir Hydro System", tier: "intermediate", pathway: "hydro", stage: "transformation", cost: c(4, 1), knowledgeRequired: 3, prerequisiteTechnologyId: "basicReservoir", capacity: 3, maximumInput: 3, maximumOutput: 3, hydro: { immediateOutput: 1, releaseMaximum: 2, totalMaximum: 3, inflowCaptureMaximum: 3 }, storage: { type: "reservoir", capacity: 6, recovery: reservoirRecovery(6), acceptedPathways: ["hydro"] }, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Reservoir hydropower stores wet-period inflow and releases it in a later Generation." },
    { id: "advancedHydroTurbine", name: "Flexible Hydro Storage System", tier: "advanced", pathway: "hydro", stage: "transformation", cost: c(4, 2), knowledgeRequired: 5, prerequisiteTechnologyId: "advancedReservoir", capacity: 4, maximumInput: 4, maximumOutput: 4, hydro: { immediateOutput: 1, releaseMaximum: 3, totalMaximum: 4, inflowCaptureMaximum: 4 }, storage: { type: "reservoir", capacity: 8, recovery: reservoirRecovery(8), acceptedPathways: ["hydro"] }, alwaysAvailable: true, special: "advancedHydroFlexibility", copyLimit: 1, knowledgeRationale: "Advanced flexible hydro combines larger intergenerational water storage with faster release." },
    // BIOMASS — accessible managed fuel → efficient CHP → integrated biorefinery
    { id: "basicBiomassPlant", name: "Managed Biomass Plant", tier: "basic", pathway: "biomass", stage: "transformation", cost: c(2, 0), knowledgeRequired: 1, capacity: 2, maximumInput: 1, maximumOutput: 2, fuel: { resource: "biomass", units: 1 }, loss: { category: "thermal", fixedPerOperation: 2 }, biomassRegrowth: 1, appliedLearning: true, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Direct biomass combustion and managed feedstock supply use established equipment and practices, although sustainable operation still needs planning." },
    { id: "advancedBiomassPlant", name: "Efficient Biomass CHP", tier: "intermediate", pathway: "biomass", stage: "transformation", cost: c(3, 1), knowledgeRequired: 3, prerequisiteTechnologyId: "basicBiomassPlant", capacity: 3, maximumInput: 1, maximumOutput: 3, fuel: { resource: "biomass", units: 1 }, loss: { category: "thermal", fixedPerOperation: 1 }, biomassRegrowth: 1, appliedLearning: true, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Combined heat and power needs better feedstock control, emissions treatment, heat recovery and coordinated operation." },
    { id: "integratedBiorefinery", name: "Integrated Biorefinery", tier: "advanced", pathway: "biomass", stage: "transformation", cost: c(4, 2), knowledgeRequired: 5, prerequisiteTechnologyId: "advancedBiomassPlant", capacity: 4, maximumInput: 1, maximumOutput: 4, fuel: { resource: "biomass", units: 1 }, loss: { category: "thermal", fixedPerOperation: 1 }, biomassRegrowth: 1, appliedLearning: true, alwaysAvailable: true, copyLimit: 1, knowledgeRationale: "Integrated biorefineries combine feedstock preparation, multiple conversion processes, product recovery, controls and complex supply-chain management." },
    // FOSSIL — one Fuel token passes through a five-stage Energy chain
    { id: "basicFossilPlant", name: "Legacy Fuel Plant", tier: "basic", pathway: "fossil", stage: "transformation", cost: c(1, 0), knowledgeRequired: 1, capacity: 1, maximumInput: 1, maximumOutput: 0, fuel: { resource: "fossilFuel", units: 1 }, fossilRole: "legacyPlant", starter: false, copyLimit: 1, alwaysAvailable: true, special: "legacyFuelPlant", gameBenefit: "Consumes 1 Fuel. The canonical fossil chain begins with 4 gross Energy, loses 1 in Fuel storage and 1 in legacy transformation, leaving 2 Energy before the Grid.", knowledgeRationale: "Conventional single-cycle generation is established, although trained operation, maintenance and safety remain essential." },
    { id: "enhancedOilRecovery", name: "Enhanced Oil Recovery", tier: "intermediate", pathway: "fossil", stage: "capture", cost: c(2, 1), knowledgeRequired: 3, prerequisiteTechnologyId: "basicFossilPlant", replacesPrerequisite: false, capacity: 0, maximumInput: 0, maximumOutput: 0, fossilRole: "sourceRecovery", copyLimit: 1, alwaysAvailable: true, special: "enhancedOilRecovery", gameBenefit: "Raises gross Energy accessed from one consumed Fuel from 4 to 5. It does not create another Fuel token or change extraction yield.", knowledgeRationale: "Enhanced recovery integrates reservoir characterisation, injection, monitoring and specialised operating practices." },
    { id: "combinedCycle", name: "Combined-Cycle Plant", tier: "intermediate", pathway: "fossil", stage: "transformation", cost: c(2, 1), knowledgeRequired: 3, prerequisiteTechnologyId: "basicFossilPlant", replacesPrerequisite: false, capacity: 0, maximumInput: 0, maximumOutput: 0, fossilRole: "efficientTransformation", copyLimit: 1, alwaysAvailable: true, special: "combinedCycle", gameBenefit: "Removes the Legacy Fuel Plant's 1-Energy transformation loss. It does not change gross Fuel Energy or Fuel-storage loss.", knowledgeRationale: "Combined-cycle plants integrate gas turbines, heat-recovery steam systems, controls and skilled maintenance." },
    { id: "carbonCapturePlant", name: "Fuel Plant with Carbon Capture", tier: "advanced", pathway: "fossil", stage: "environment", cost: c(4, 1), knowledgeRequired: 5, prerequisiteTechnologyId: "combinedCycle", replacesPrerequisite: false, capacity: 0, maximumInput: 0, maximumOutput: 0, fossilRole: "environmentalProtection", copyLimit: 1, alwaysAvailable: true, special: "carbonCapture", gameBenefit: "Carbon Capture reduces fossil impact. It does not create more Energy.", knowledgeRationale: "Capture, compression, transport and storage systems add major process integration, monitoring and infrastructure requirements." },
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
    pathwayGenerationMaximum: 4,
    solar: {
        brightSun: [0, 1, 2, 3, 4], rain: [0, 0, 1, 2, 3], strongWind: [0, 0, 1, 2, 3], storm: [0, 0, 0, 1, 2], calmOvercast: [0, 0, 1, 3, 4]
    },
    wind: {
        brightSun: [0, 0, 1, 2, 3], rain: [0, 0, 1, 2, 3], strongWind: [0, 1, 2, 3, 4], storm: [0, 1, 2, 3, 4], calmOvercast: [0, 0, 1, 2, 3]
    },
    // Hydro tables describe water captured for a later Generation, not same-Generation output.
    hydro: {
        brightSun: [0, 0, 1, 1, 1], rain: [0, 0, 2, 3, 4], strongWind: [0, 0, 1, 1, 1], storm: [0, 0, 2, 3, 4], calmOvercast: [0, 0, 1, 2, 2]
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
// Global Event cards — one is revealed before Development in Generations 3, 5 and 7.
// -----------------------------------------------------------------------------
export const globalEvents = [
    { id: "globalShippingShutdown", name: "Global Shipping Shutdown", effect: { kind: "tradeShutdown", directTradeDisabled: true, worldMarketDisabled: true } },
    { id: "criticalMineralExportControls", name: "Critical Mineral Export Controls", effect: { kind: "worldMarketResourceBlocked", resource: "criticalMaterials" } },
    { id: "mineralProcessingOutage", name: "Mineral Processing Outage", effect: { kind: "extractionYieldCap", resource: "criticalMaterials", maximumYield: 1 } },
    { id: "steelCementShortage", name: "Steel and Cement Shortage", effect: { kind: "firstBuildResourceDelta", resource: "constructionMaterials", amount: 1 } },
    { id: "industrialProductionSlowdown", name: "Industrial Production Slowdown", effect: { kind: "extractionYieldCap", resource: "constructionMaterials", maximumYield: 1 } },
    { id: "oilTransitDisruption", name: "Oil Transit Disruption", effect: { kind: "worldMarketResourceBlocked", resource: "fossilFuel" } },
    { id: "globalFuelPriceShock", name: "Global Fuel Price Shock", effect: { kind: "worldMarketRateOverride", resource: "fossilFuel", rate: 3 } },
    { id: "globalHarvestFailure", name: "Global Harvest Failure", effect: { kind: "harvestFailure", resource: "biomass", blocksWorldMarket: true, biomassRegrowth: 0 } },
    { id: "feedstockContamination", name: "Feedstock Contamination", effect: { kind: "firstBiomassOutputDelta", amount: -1 } },
    { id: "strategicReserveRelease", name: "Strategic Reserve Release", effect: { kind: "firstWorldMarketRate", rate: 1 } }
];

// -----------------------------------------------------------------------------
// Default game configuration
// -----------------------------------------------------------------------------
const preparedPathways = [
    { id: "solar", foundingTechnologyId: "basicSolar", foundingLabel: "Basic Solar Array" },
    { id: "wind", foundingTechnologyId: "basicWind", foundingLabel: "Community Wind Turbine" },
    { id: "hydro", foundingTechnologyId: "basicReservoir", foundingLabel: "Small Hydro System" },
    { id: "biomass", foundingTechnologyId: "basicBiomassPlant", foundingLabel: "Managed Biomass Plant" },
    { id: "fossil", foundingTechnologyId: "basicFossilPlant", foundingLabel: "Legacy Fuel Plant" }
];
const preparedCapabilities = [
    { id: "storage", effect: "First storage technology costs 1 fewer Critical Mineral." },
    { id: "transformation", effect: "First constructed transformation technology produces 1 less System Loss on its first operation." },
    { id: "transport", effect: "First Grid Upgrade gains +1 temporary capacity in its build Generation." },
    { id: "efficiency", effect: "First efficiency technology costs 1 fewer Critical Mineral." },
    { id: "research", effect: "First Learn action costs 1 fewer Other Material." }
];
export const defaultConfig = {
    schemaVersion: "1.5.0",
    rules: {
        generations: 8,
        actionsPerGeneration: 3,
        knowledgeMaximum: 5,
        warehouseMaximum: 9,
        reliabilityPointMaximum: 4,
        reliabilityStartsGeneration: 5,
        appliedLearningTokenMaximum: 2,
        buildAndOperateSameGeneration: true,
        batteryChargeAndDischargeSameGeneration: false,
        storedEnergyAvailableNextGeneration: true,
        innovationMarketSlots: 4,
        openingWarehouseSize: 6
    },
    affinityThresholds: AFFINITY_THRESHOLDS,
    resources: { normalExtractionYield: 1 },
    fossilEnergyChain: { baseGrossEnergy: 4, enhancedRecoveryGrossEnergy: 5, storageLoss: 1, legacyTransformationLoss: 1, combinedCycleTransformationLoss: 0 },
    biomassRules: { baseRegrowth: 1, maximumBaseRegrowthPerGeneration: 1 },
    renewableSignatureWeather: { solar: ["brightSun"], wind: ["strongWind", "storm"], hydro: ["rain", "storm"] },
    continents,
    technologies,
    weather,
    localConditions,
    globalEvents,
    globalEventRules: { drawGenerations: [3, 5, 7], drawWithoutReplacement: true },
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
        directTradeMaximumBundlePerSide: 2,
        worldMarketExchangeRate: 2,
        worldMarketStarting: { fossilFuel: 5, biomass: 5, constructionMaterials: 5, criticalMaterials: 5 }
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
const renewablePotentialPathways = ["solar", "wind", "hydro", "biomass"];
const affinities = ["strong", "standard", "difficult"];
const resourceTypesForValidation = ["fossilFuel", "biomass", "constructionMaterials", "criticalMaterials"];
export function validateConfig(config) {
    const errors = [];
    if (config.continents.length !== 6)
        errors.push("Exactly six continents are required.");
    if (config.localConditions.length !== 12 || new Set(config.localConditions.map(card => card.id)).size !== 12)
        errors.push("Exactly twelve unique Local Condition cards are required.");
    if (config.localConditions.reduce((n, card) => n + card.copies, 0) !== 24)
        errors.push("Local Condition deck must contain 24 cards.");
    if (!Array.isArray(config.globalEvents) || config.globalEvents.length !== 10 || new Set(config.globalEvents.map(card => card.id)).size !== 10)
        errors.push("Global Event deck must contain ten unique cards.");
    if (JSON.stringify(config.globalEventRules?.drawGenerations) !== JSON.stringify([3, 5, 7]))
        errors.push("Global Events must be drawn before Development in Generations 3, 5 and 7.");
    if (config.rules.generations !== 8 || config.rules.actionsPerGeneration !== 3)
        errors.push("SUNPATHS requires eight Generations and three Development actions per Generation.");
    if (config.rules.reliabilityStartsGeneration !== 5)
        errors.push("Reliability Points must begin in Generation 5.");
    const expectedDemand = [1, 1, 2, 2, 3, 3, 4, 4];
    expectedDemand.forEach((target, index) => {
        if (config.demand.reliabilityTargets[index + 1] !== target)
            errors.push(`Generation ${index + 1} Light demand must be ${target}.`);
    });
    if (config.rules.openingWarehouseSize !== 6 || config.rules.warehouseMaximum !== 9)
        errors.push("Starting Warehouse size must be six and capacity must be nine.");
    for (const [affinity, thresholds] of Object.entries(config.affinityThresholds ?? {})) {
        if (!affinities.includes(affinity) || !Array.isArray(thresholds) || thresholds.length !== 3 || thresholds.some(value => !Number.isInteger(value) || value < 1 || value > 5))
            errors.push(`${affinity} affinity thresholds must contain three Knowledge values from 1 to 5.`);
    }
    for (const continent of config.continents) {
        for (const pathway of renewablePotentialPathways) {
            const value = continent.renewablePotential?.[pathway];
            if (!Number.isInteger(value) || value < 1 || value > 5)
                errors.push(`${continent.name} ${pathway} renewable potential must be from 1 to 5.`);
        }
        if (!['solar', 'wind', 'hydro'].includes(continent.signatureRenewable))
            errors.push(`${continent.name} requires a Solar, Wind or Hydro signature.`);
        const rule = continent.resourceRule;
        if (!rule || !['extraction', 'circularRecovery'].includes(rule.kind))
            errors.push(`${continent.name} requires a regional extraction or recovery rule.`);
        if (rule?.kind === 'extraction' && (!resourceTypesForValidation.includes(rule.resource) || rule.yield !== 2 || rule.maximumUsesPerGeneration !== 1))
            errors.push(`${continent.name} extraction specialty must identify one valid resource, yield two and be usable once per Generation.`);
        if (rule?.kind === 'circularRecovery' && continent.id !== 'europe')
            errors.push(`${continent.name} cannot use Europe's Circular Recovery rule.`);
        const canonicalRule = REGIONAL_RESOURCE_RULES[continent.id];
        if (!canonicalRule || JSON.stringify(rule) !== JSON.stringify(canonicalRule))
            errors.push(`${continent.name} regional extraction or recovery rule does not match the canonical regional rule.`);
        if (continent.signatureRenewable !== REGIONAL_SIGNATURES[continent.id])
            errors.push(`${continent.name} renewable signature does not match the canonical regional signature.`);
        if (continent.startingTransmissionLevel !== 1 || continent.startingLightingLevel !== 1 || (continent.startingFossilLevel ?? 0) !== 0)
            errors.push(`${continent.name} must begin only with Basic Grid and Standard Lighting; no region may begin with a Fuel plant.`);
        const warehouseTotal = Object.values(continent.startingWarehouse ?? {}).reduce((sum, value) => sum + value, 0);
        const stockTotal = Object.values(continent.printedResources ?? {}).reduce((sum, value) => sum + value, 0);
        if (warehouseTotal !== 6)
            errors.push(`${continent.name} must begin with exactly six Warehouse resources.`);
        if (stockTotal !== 35)
            errors.push(`${continent.name} must have exactly 35 total regional resources.`);
        for (const resource of resourceTypesForValidation) {
            const total = continent.printedResources?.[resource];
            const warehouse = continent.startingWarehouse?.[resource];
            if (!Number.isInteger(total) || total < 0 || !Number.isInteger(warehouse) || warehouse < 0 || warehouse > total)
                errors.push(`${continent.name} has invalid ${resource} stock or starting Warehouse data.`);
        }
        if (!continent.pathwayAffinity || pathways.some(pathway => !affinities.includes(continent.pathwayAffinity[pathway])))
            errors.push(`${continent.name} must define Knowledge affinity for all pathways.`);
    }
    for (const technology of config.technologies) {
        if (!technology.cost || technology.cost.constructionMaterials < 0 || technology.cost.criticalMaterials < 0)
            errors.push(`${technology.name} has an invalid cost.`);
        if (![1, 3, 5].includes(technology.knowledgeRequired))
            errors.push(`${technology.name} must use a base Knowledge value of 1, 3 or 5.`);
        if (technology.prerequisiteTechnologyId && !config.technologies.some(candidate => candidate.id === technology.prerequisiteTechnologyId))
            errors.push(`${technology.name} has an unknown prerequisite.`);
    }
    const expectedGenerationLadders = {
        solar: { basicSolar: 2, utilitySolar: 3, advancedSolar: 4 },
        wind: { basicWind: 2, onshoreWindFarm: 3, advancedWind: 4 },
        biomass: { basicBiomassPlant: 2, advancedBiomassPlant: 3, integratedBiorefinery: 4 }
    };
    for (const ladder of Object.values(expectedGenerationLadders))
        for (const [technologyId, output] of Object.entries(ladder))
            if (config.technologies.find(technology => technology.id === technologyId)?.maximumOutput !== output)
                errors.push(`${technologyId} must use the canonical output ${output}.`);
    const hydroExpected = { basicReservoir: 1, advancedReservoir: 3, advancedHydroTurbine: 4 };
    for (const [technologyId, output] of Object.entries(hydroExpected))
        if (config.technologies.find(technology => technology.id === technologyId)?.hydro?.totalMaximum !== output)
            errors.push(`${technologyId} must use Hydro total maximum ${output}.`);
    if (config.weather?.pathwayGenerationMaximum !== 4)
        errors.push("A single pathway's direct generation must be capped at four Energy.");
    const fossilFounding = config.preparedPathways?.find(pathway => pathway.id === 'fossil');
    if (fossilFounding?.foundingTechnologyId !== 'basicFossilPlant' || 'foundingCost' in (fossilFounding ?? {}))
        errors.push("The Fossil Starting Pathway must purchase the canonical Legacy Fuel Plant as its Founding Project.");
    const advancedSolar = config.technologies.find(technology => technology.id === 'advancedSolar');
    if (advancedSolar?.cost.constructionMaterials !== 2 || advancedSolar?.cost.criticalMaterials !== 3)
        errors.push("Advanced Solar must cost 2 Other Materials and 3 Critical Materials.");
    const fossilIds = ['basicFossilPlant', 'enhancedOilRecovery', 'combinedCycle', 'carbonCapturePlant'];
    if (fossilIds.some(id => !config.technologies.some(technology => technology.id === id)))
        errors.push("The complete fossil Energy-chain technology set is required.");
    if (config.fossilEnergyChain?.baseGrossEnergy !== 4 || config.fossilEnergyChain?.enhancedRecoveryGrossEnergy !== 5 || config.fossilEnergyChain?.storageLoss !== 1 || config.fossilEnergyChain?.legacyTransformationLoss !== 1 || config.fossilEnergyChain?.combinedCycleTransformationLoss !== 0)
        errors.push("Fossil Energy-chain values do not match the canonical 4/5 gross, 1 storage-loss and 1/0 transformation-loss rules.");
    for (const technology of config.technologies.filter(item => item.pathway === 'fossil')) {
        if ('minimumRegionalOpportunity' in technology)
            errors.push(`${technology.name} must not use a regional Opportunity gate.`);
        if ((technology.maximumOutput ?? 0) !== 0)
            errors.push(`${technology.name} must not encode fossil Energy through the old technology-output ladder.`);
    }
    const carbonCapture = config.technologies.find(technology => technology.id === 'carbonCapturePlant');
    if (carbonCapture?.cost.constructionMaterials !== 4 || carbonCapture?.cost.criticalMaterials !== 1 || carbonCapture?.prerequisiteTechnologyId !== 'combinedCycle')
        errors.push("Carbon Capture must cost 4 Other / 1 Critical, require Combined Cycle and remain an environmental-only technology.");
    const faces = config.weather?.faces ?? [];
    const triggerCount = signature => faces.filter(face => config.renewableSignatureWeather?.[signature]?.includes(face)).length;
    if (triggerCount('solar') !== triggerCount('wind') || triggerCount('wind') !== triggerCount('hydro'))
        errors.push("Solar, Wind and Hydro signatures must have equal expected trigger frequency.");
    if (config.trade.worldMarketExchangeRate !== 2)
        errors.push("Every World Market exchange must cost exactly two Warehouse resources.");
    if (config.trade.directTradeMaximumBundlePerSide !== 2)
        errors.push("Direct trades must allow at most two resources from each side.");
    for (const obsolete of ['warehouseMaximum', 'normalImportCost', 'criticalImportCost', 'freeDirectTradesPerGeneration', 'importConsumesAction'])
        if (obsolete in config.trade)
            errors.push(`Obsolete trade rule ${obsolete} must not remain in canonical configuration.`);
    for (const resource of resourceTypesForValidation)
        if (config.trade.worldMarketStarting?.[resource] !== 5)
            errors.push(`World Market ${resource} stock must begin at five.`);
    return errors;
}
