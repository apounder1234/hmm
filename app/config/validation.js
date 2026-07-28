export function validateConfig(config) {
    const errors = [];
    if (config.continents.length !== 6)
        errors.push("Exactly six continents are required.");
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
    for (const c of config.continents) {
        for (const [p, v] of Object.entries(c.opportunities))
            if (v < 1 || v > 5)
                errors.push(`${c.name} ${p} Opportunity outside 1-5.`);
        if (c.startingKnowledge < 0 || c.startingKnowledge > 2)
            errors.push(`${c.name} starting Knowledge outside 0-2.`);
    }
    for (const t of config.technologies) {
        if (t.cost.constructionMaterials < 0 || t.cost.criticalMaterials < 0)
            errors.push(`${t.name} has negative cost.`);
        if (![1, 3, 5].includes(t.knowledgeRequired))
            errors.push(`${t.name} must require Knowledge 1, 3 or 5.`);
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
    if (config.trade.knowledgeLinkEnabled && config.trade.freeDirectTradesPerGeneration !== 0)
        errors.push("Knowledge Link mode requires ordinary direct trades to cost an action.");
    return errors;
}
//# sourceMappingURL=validation.js.map