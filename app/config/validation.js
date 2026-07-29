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
    if (config.trade.knowledgeLinkEnabled && config.trade.freeDirectTradesPerGeneration !== 0)
        errors.push("Knowledge Link mode requires ordinary direct trades to cost an action.");
    for (const resource of ["fossilFuel", "biomass", "constructionMaterials", "criticalMaterials"])
        if (config.trade.worldMarketStarting?.[resource] !== 6)
            errors.push(`Global ${resource} stock must begin at six.`);
    return errors;
}
//# sourceMappingURL=validation.js.map
