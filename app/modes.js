// @ts-check
// Central game-mode layer. Modes configure the existing engine; they do not fork it.

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
