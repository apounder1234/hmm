export const allStrategies = [
    "solarStorage",
    "windGrid",
    "hydroReliability",
    "biomassRenewal",
    "fossilTempo",
    "diversifiedAdapter"
];
const weatherPresets = {
    default: ["brightSun", "brightSun", "rain", "strongWind", "storm", "calmOvercast"],
    sunny: ["brightSun", "brightSun", "brightSun", "strongWind", "rain", "calmOvercast"],
    windy: ["strongWind", "strongWind", "strongWind", "storm", "brightSun", "calmOvercast"],
    wet: ["rain", "rain", "storm", "storm", "brightSun", "strongWind"],
    balanced: ["brightSun", "rain", "strongWind", "storm", "calmOvercast", "calmOvercast"]
};
function scaleSigned(value, severity) {
    if (value === 0)
        return 0;
    return Math.sign(value) * Math.max(1, Math.round(Math.abs(value) * severity));
}
function scaleConditionEffect(effect, severity) {
    if (severity <= 0) {
        switch (effect.kind) {
            case "biomassRegrowthSet": return { ...effect, value: 1 };
            case "temporaryKnowledge": return { ...effect, amount: 0 };
            case "storageRecoveryBonus": return { ...effect, amount: 0 };
            case "hydroDelta": return { ...effect, amount: 0, fallbackBiomassRegrowthDelta: 0 };
            default: return "amount" in effect ? { ...effect, amount: 0 } : effect;
        }
    }
    switch (effect.kind) {
        case "hydroDelta": return {
            ...effect,
            amount: scaleSigned(effect.amount, severity),
            ...(effect.fallbackBiomassRegrowthDelta === undefined
                ? {}
                : { fallbackBiomassRegrowthDelta: scaleSigned(effect.fallbackBiomassRegrowthDelta, severity) })
        };
        case "biomassRegrowthSet": return effect;
        case "storageRecoveryBonus": return { ...effect, amount: Math.max(1, Math.round(effect.amount * severity)) };
        case "temporaryKnowledge": return { ...effect, amount: Math.max(1, Math.round(effect.amount * severity)) };
        default: return { ...effect, amount: scaleSigned(effect.amount, severity) };
    }
}
export const technologyDataSets = [
    {
        id: "activeConfig",
        label: "Active configuration",
        description: "Use the currently loaded technology catalogue without modification.",
        apply: config => structuredClone(config)
    },
    {
        id: "storageOptimistic",
        label: "Experimental: cheaper storage",
        description: "Reduce Battery Critical Material costs by one and improve the Basic Battery's 4-Energy recovery from 3 to 4.",
        apply: config => {
            const copy = structuredClone(config);
            copy.technologies = copy.technologies.map(technology => {
                if (technology.storage?.type !== "battery")
                    return technology;
                const recovery = [...technology.storage.recovery.outputsByInput];
                if (technology.id === "basicBattery" && recovery.length > 4)
                    recovery[4] = 4;
                return {
                    ...technology,
                    cost: { ...technology.cost, criticalMaterials: Math.max(0, technology.cost.criticalMaterials - 1) },
                    storage: { ...technology.storage, recovery: { outputsByInput: recovery } }
                };
            });
            return copy;
        }
    },
    {
        id: "thermalEfficient",
        label: "Experimental: efficient thermal",
        description: "Reduce every fixed thermal System Loss by one, with a minimum of zero.",
        apply: config => {
            const copy = structuredClone(config);
            copy.technologies = copy.technologies.map(technology => technology.loss?.category === "thermal"
                ? { ...technology, loss: { ...technology.loss, fixedPerOperation: Math.max(0, (technology.loss.fixedPerOperation ?? 0) - 1) } }
                : technology);
            return copy;
        }
    }
];
export function defaultAssignments(config) {
    return config.continents.map((continent, index) => ({
        continentId: continent.id,
        strategyId: allStrategies[index % allStrategies.length]
    }));
}
export function defaultSimulationScenario(config) {
    return {
        games: 100,
        baseSeed: "SUNPATHS-SIM-001",
        assignments: defaultAssignments(config),
        assignmentMode: "rotateStrategies",
        seatAssignmentMode: "rotate",
        aiDifficulty: "standard",
        tradeMode: "directAndImport",
        technologyDataSetId: "activeConfig",
        localConditionSeverity: 1,
        weatherPresetId: "default",
        startingResourceMultiplier: 1,
        actionsPerGeneration: config.rules.actionsPerGeneration,
        buildAndOperateSameGeneration: config.rules.buildAndOperateSameGeneration,
        lossRules: {
            thermal: config.systemLoss.countThermal,
            battery: config.systemLoss.countBattery,
            lighting: config.systemLoss.countLighting
        },
        aiTradeUtilityThreshold: 0.35,
        aiDirectTradeCadence: 1,
        randomizeInitialFirstPlayer: false
    };
}
export function strategyForGame(assignments, gameIndex, assignmentMode) {
    if (assignmentMode === "fixed")
        return assignments.map(item => ({ ...item }));
    return assignments.map((item, index) => ({
        continentId: item.continentId,
        strategyId: allStrategies[(allStrategies.indexOf(item.strategyId) + gameIndex + index * 0) % allStrategies.length]
    }));
}
export function seatOrderForGame(assignments, gameIndex, seatMode) {
    const copy = assignments.map(item => ({ ...item }));
    if (seatMode === "fixed" || copy.length <= 1)
        return copy;
    const strategyCycle = Math.max(1, allStrategies.length);
    const shift = Math.floor(gameIndex / strategyCycle) % copy.length;
    return [...copy.slice(shift), ...copy.slice(0, shift)];
}
export function applySimulationScenario(baseConfig, scenario) {
    const dataSet = technologyDataSets.find(item => item.id === scenario.technologyDataSetId) ?? technologyDataSets[0];
    const config = dataSet.apply(baseConfig);
    config.rules = {
        ...config.rules,
        actionsPerGeneration: Math.max(1, Math.min(4, Math.round(scenario.actionsPerGeneration))),
        buildAndOperateSameGeneration: scenario.buildAndOperateSameGeneration
    };
    config.trade = {
        ...config.trade,
        directEnabled: scenario.tradeMode === "directAndImport",
        publicImportEnabled: scenario.tradeMode !== "disabled"
    };
    config.systemLoss = {
        ...config.systemLoss,
        countThermal: scenario.lossRules.thermal,
        countBattery: scenario.lossRules.battery,
        countLighting: scenario.lossRules.lighting
    };
    config.weather = { ...config.weather, faces: [...weatherPresets[scenario.weatherPresetId]] };
    config.localConditions = config.localConditions.map(condition => ({
        ...condition,
        effect: scaleConditionEffect(condition.effect, scenario.localConditionSeverity)
    }));
    config.continents = config.continents.map(continent => ({
        ...continent,
        printedResources: Object.fromEntries(Object.entries(continent.printedResources).map(([resource, value]) => [resource, Math.max(1, Math.round(value * scenario.startingResourceMultiplier))]))
    }));
    return config;
}
//# sourceMappingURL=scenario.js.map