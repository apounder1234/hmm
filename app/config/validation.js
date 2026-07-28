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
        if (t.knowledgeRequired < 0 || t.knowledgeRequired > 5)
            errors.push(`${t.name} has invalid Knowledge requirement.`);
    }
    return errors;
}
//# sourceMappingURL=validation.js.map