import { conditionApplies } from "./conditions/conditions.js";
import { getPlayer, getTechnology, hasTechnology } from "./helpers.js";

const tierIndex = { basic: 0, intermediate: 1, advanced: 2 };
const resourceLabels = { constructionMaterials: "Other Material", criticalMaterials: "Critical Mineral" };

export function isContinentAbilityEnabled(state, playerOrContinentId) {
    const profile = getContinentProfile(state, playerOrContinentId);
    return !(state.config.disabledContinentAbilityIds ?? []).includes(profile.abilityId);
}

export function getContinentProfile(state, playerOrContinentId) {
    const continentId = typeof playerOrContinentId === "string" && state.players?.[playerOrContinentId]
        ? state.players[playerOrContinentId].continentId
        : typeof playerOrContinentId === "string"
            ? playerOrContinentId
            : playerOrContinentId.continentId;
    const profile = state.config.continents.find(item => item.id === continentId);
    if (!profile)
        throw new Error(`Unknown continent ${continentId}.`);
    return profile;
}

export function getTechnologyTierIndex(technology) {
    const index = tierIndex[technology.tier];
    if (index === undefined)
        throw new Error(`${technology.name} has an unknown technology tier.`);
    return index;
}

export function getTechnologyLevel(technology) {
    return getTechnologyTierIndex(technology) + 1;
}

export function getPathwayAffinity(state, playerOrContinentId, technology) {
    const profile = getContinentProfile(state, playerOrContinentId);
    const abilityEnabled = isContinentAbilityEnabled(state, profile.id);
    if (technology.pathway !== "shared") {
        const configured = profile.pathwayAffinity[technology.pathway] ?? "standard";
        // Europe's Advanced Systems ability is the strong Wind readiness. Its mandated
        // starting Knowledge, Grid and Lighting remain part of the starting profile.
        if (!abilityEnabled && profile.abilityId === "advancedSystems" && technology.pathway === "wind")
            return "standard";
        return configured;
    }
    if (technology.stage === "transport") {
        if (!abilityEnabled && profile.abilityId === "advancedSystems")
            return "standard";
        return profile.systemAffinity?.transmission ?? "standard";
    }
    if (technology.stage === "storage")
        return profile.systemAffinity?.storage ?? "standard";
    if (technology.stage === "lighting" || technology.stage === "efficiency")
        return profile.systemAffinity?.lighting ?? "standard";
    return "standard";
}

export function getKnowledgeRequirement(state, playerOrContinentId, technologyOrId) {
    const technology = typeof technologyOrId === "string" ? getTechnology(state, technologyOrId) : technologyOrId;
    const thresholds = state.config.affinityThresholds;
    if (!thresholds)
        return technology.knowledgeRequired;
    const affinity = getPathwayAffinity(state, playerOrContinentId, technology);
    const values = thresholds[affinity];
    return values?.[getTechnologyTierIndex(technology)] ?? technology.knowledgeRequired;
}

function addModifier(result, resource, amount, label, id) {
    if (!amount)
        return;
    result.final[resource] = Math.max(0, result.final[resource] + amount);
    result.modifiers.push({ id, label, resource, amount });
}

export function getEffectiveUpgradeCost(state, playerId, technologyOrId, options = {}) {
    const player = getPlayer(state, playerId);
    const technology = typeof technologyOrId === "string" ? getTechnology(state, technologyOrId) : technologyOrId;
    const profile = getContinentProfile(state, player);
    const result = {
        base: { constructionMaterials: technology.cost.constructionMaterials, criticalMaterials: technology.cost.criticalMaterials },
        final: { constructionMaterials: technology.cost.constructionMaterials, criticalMaterials: technology.cost.criticalMaterials },
        modifiers: [],
        knowledgeRequired: getKnowledgeRequirement(state, player, technology),
        effectiveKnowledge: player.knowledge + player.temporaryKnowledge + (options.includeAssistance === false ? 0 : player.assistanceKnowledge),
        usesPreparedPathway: false,
        usesPreparedCapability: false,
        usesAsiaSolarDiscount: false,
        consumesLockIn: false,
        usesInnovationBoost: Boolean(options.useContinentAbility),
        affinity: getPathwayAffinity(state, player, technology),
        standardKnowledgeRequired: state.config.affinityThresholds?.standard?.[getTechnologyTierIndex(technology)] ?? technology.knowledgeRequired,
        usesAdvancedSystems: false
    };
    result.usesAdvancedSystems = isContinentAbilityEnabled(state, player)
        && profile.abilityId === "advancedSystems"
        && (technology.pathway === "wind" || technology.stage === "transport")
        && result.knowledgeRequired < result.standardKnowledgeRequired
        && result.effectiveKnowledge < result.standardKnowledgeRequired;
    const allowPrepared = options.allowPreparedPathway !== false;
    const deferredBlueprint = allowPrepared && player.prepared.pathwayId && !player.prepared.pathwayUsed && player.prepared.foundingProjectDeferred && technology.pathway === player.prepared.pathwayId;
    const fossilBlueprint = allowPrepared && technology.id === "combinedCycle" && player.prepared.fossilBlueprintAvailable;
    if (deferredBlueprint || fossilBlueprint) {
        addModifier(result, "constructionMaterials", -1, "Starting Pathway Blueprint", "preparedPathway");
        result.effectiveKnowledge += 1;
        result.usesPreparedPathway = true;
    }
    if (player.prepared.capabilityId && !player.prepared.capabilityUsed) {
        if (player.prepared.capabilityId === "storage" && technology.stage === "storage") {
            addModifier(result, "criticalMaterials", -1, "Prepared Storage", "preparedStorage");
            result.usesPreparedCapability = true;
        }
        if (player.prepared.capabilityId === "efficiency" && technology.stage === "efficiency") {
            addModifier(result, "criticalMaterials", -1, "Prepared Efficiency", "preparedEfficiency");
            result.usesPreparedCapability = true;
        }
    }
    const condition = conditionApplies(state, player);
    if (condition?.effect.kind === "firstBuildConstructionDelta" && !player.localCondition?.triggered)
        addModifier(result, "constructionMaterials", condition.effect.amount, condition.name, "materialsShortage");

    const advancedTier = getTechnologyTierIndex(technology) >= 1;
    if (profile.penaltyId === "importedInputs" && advancedTier && (technology.pathway === "solar" || technology.pathway === "wind" || technology.stage === "storage"))
        addModifier(result, "criticalMaterials", 1, "Europe imported-input dependency", "europeImportedInputs");
    if ((profile.penaltyId === "weakInterconnection" || profile.penaltyId === "longDistance") && advancedTier && technology.stage === "transport")
        addModifier(result, "constructionMaterials", 1, profile.id === "northAmerica" ? "North America weak interconnection" : "Australia long-distance grid", `${profile.id}TransmissionPenalty`);
    if (isContinentAbilityEnabled(state, player) && profile.abilityId === "manufacturingScale" && technology.pathway === "solar" && !player.firstSolarDiscountUsed)
        addModifier(result, "constructionMaterials", -1, "Asia manufacturing scale", "asiaSolarDiscount"), result.usesAsiaSolarDiscount = true;
    if ((player.lockInTokens ?? 0) > 0 && advancedTier && technology.pathway !== "fossil")
        addModifier(result, "constructionMaterials", 1, "Asia Fossil Lock-In", "asiaLockIn"), result.consumesLockIn = true;
    if (options.useContinentAbility) {
        if (!isContinentAbilityEnabled(state, player) || profile.abilityId !== "innovationBoost" || player.continentAbilityUsed)
            result.invalidAbilityReason = "Innovation Boost is unavailable.";
        else
            result.effectiveKnowledge += 1;
    }
    return result;
}

export function getAvailableContinentAbilityActions(state, playerId, technologyOrId) {
    const player = getPlayer(state, playerId);
    const technology = typeof technologyOrId === "string" ? getTechnology(state, technologyOrId) : technologyOrId;
    const profile = getContinentProfile(state, player);
    if (!isContinentAbilityEnabled(state, player) || profile.abilityId !== "innovationBoost" || player.continentAbilityUsed)
        return [];
    const without = getEffectiveUpgradeCost(state, playerId, technology, { useContinentAbility: false });
    const withBoost = getEffectiveUpgradeCost(state, playerId, technology, { useContinentAbility: true });
    if (without.effectiveKnowledge < without.knowledgeRequired && withBoost.effectiveKnowledge >= withBoost.knowledgeRequired)
        return [{ id: "innovationBoost", label: "Use Innovation Boost", knowledgeBonus: 1 }];
    return [];
}

export function applyCompletedUpgradeConsequences(state, playerId, technologyOrId, costResult) {
    const player = getPlayer(state, playerId);
    const technology = typeof technologyOrId === "string" ? getTechnology(state, technologyOrId) : technologyOrId;
    const profile = getContinentProfile(state, player);
    if (costResult.usesInnovationBoost) {
        player.continentAbilityUsed = true;
        player.continentAbilityActivations = (player.continentAbilityActivations ?? 0) + 1;
    }
    if (costResult.usesAsiaSolarDiscount)
        player.firstSolarDiscountUsed = true;
    if (costResult.consumesLockIn)
        player.lockInTokens = Math.max(0, (player.lockInTokens ?? 0) - 1);
    if (isContinentAbilityEnabled(state, player) && profile.penaltyId === "fossilLockIn" && technology.pathway === "fossil" && getTechnologyTierIndex(technology) >= 1)
        player.lockInTokens = 1;
}

export function getContinentGenerationModifiers(state, playerId, pathway) {
    const player = getPlayer(state, playerId);
    const profile = getContinentProfile(state, player);
    const condition = conditionApplies(state, player);
    const result = { generationBonus: 0, hydroDelta: 0, transmissionLossIgnored: 0, abilityId: null, penaltyId: null };
    const abilityEnabled = isContinentAbilityEnabled(state, player);
    if (abilityEnabled && profile.abilityId === "renewableAbundance") {
        const matched = (pathway === "solar" && state.weather.current === "brightSun") || (pathway === "wind" && state.weather.current === "strongWind");
        if (matched)
            result.generationBonus = 1, result.abilityId = profile.abilityId;
    }
    if (abilityEnabled && profile.abilityId === "riverBioenergySystems" && pathway === "hydro" && state.weather.current === "rain")
        result.hydroDelta += 1, result.abilityId = profile.abilityId;
    if (profile.penaltyId === "droughtExposure" && pathway === "hydro" && condition?.id === "drought")
        result.hydroDelta -= 1, result.penaltyId = profile.penaltyId;
    if (abilityEnabled && profile.abilityId === "resourceFrontierSolarLeapfrog" && pathway === "solar" && hasTechnology(player, "basicGrid") && !hasTechnology(player, "gridUpgrade") && !hasTechnology(player, "smartGrid"))
        result.transmissionLossIgnored = 1, result.abilityId = profile.abilityId;
    return result;
}

export function getTransmissionLevel(state, playerId) {
    const player = getPlayer(state, playerId);
    if (hasTechnology(player, "smartGrid")) return 3;
    if (hasTechnology(player, "gridUpgrade")) return 2;
    return 1;
}

export function getLightingLevel(state, playerId) {
    return hasTechnology(getPlayer(state, playerId), "efficientLighting") ? 2 : 1;
}

export function getStartingTechnologyIds(state, continent) {
    const ids = [];
    ids.push(continent.startingTransmissionLevel >= 2 ? "gridUpgrade" : "basicGrid");
    ids.push(continent.startingLightingLevel >= 2 ? "efficientLighting" : "standardLighting");
    if ((continent.startingFossilLevel ?? 0) >= 1)
        ids.push("basicFossilPlant");
    return ids;
}

export function validateStartingResourceTotals(config) {
    const errors = [];
    for (const continent of config.continents) {
        const warehouse = Object.values(continent.startingWarehouse).reduce((sum, value) => sum + value, 0);
        const total = Object.values(continent.printedResources).reduce((sum, value) => sum + value, 0);
        if (warehouse !== config.rules.openingWarehouseSize)
            errors.push(`${continent.name} Warehouse total is ${warehouse}, expected ${config.rules.openingWarehouseSize}.`);
        if (total !== 35)
            errors.push(`${continent.name} total reserve is ${total}, expected 35.`);
    }
    const eightFuel = config.continents.filter(continent => continent.printedResources.fossilFuel === 8);
    if (eightFuel.length !== 1 || eightFuel[0].id !== "northAmerica")
        errors.push("North America must be the only continent with eight total Fossil Fuel.");
    return errors;
}

export function describeCostModifiers(cost) {
    return cost.modifiers.map(modifier => `${modifier.label}: ${modifier.amount > 0 ? "+" : ""}${modifier.amount} ${resourceLabels[modifier.resource]}${Math.abs(modifier.amount) === 1 ? "" : "s"}`);
}
