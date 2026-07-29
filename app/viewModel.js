// @ts-nocheck
// SUNPATHS organised source. Each section has one named responsibility.
import { applyCommand } from "./engine.js";
import { conditionApplies, effectivePathwayOpportunity, fuelPlantMaximumOutput, getTechnology, hasTechnology, pathways, totalEnergy, getContinentGenerationModifiers, getEffectiveUpgradeCost, getKnowledgeRequirement, getTransmissionLevel } from "./rules.js";
// -----------------------------------------------------------------------------
// Interface legality and system previews
// -----------------------------------------------------------------------------
const resourceOrder = [
    "fossilFuel",
    "biomass",
    "constructionMaterials",
    "criticalMaterials"
];
function operational(state, instance) {
    return instance.builtGeneration < state.generation || state.config.rules.buildAndOperateSameGeneration || instance.builtGeneration === 0;
}
function continentFor(state, player) {
    const continent = state.config.continents.find(item => item.id === player.continentId);
    if (!continent)
        throw new Error(`Unknown continent ${player.continentId}.`);
    return continent;
}
function activeCondition(state, player, ignoreCondition = false) {
    if (ignoreCondition)
        return null;
    return conditionApplies(state, player);
}
function installedTechnologies(state, player) {
    return player.installed
        .filter(instance => operational(state, instance))
        .map(instance => ({ instance, technology: getTechnology(state, instance.technologyId) }));
}
function pathwayCapacity(state, player, pathway) {
    return installedTechnologies(state, player)
        .filter(item => item.technology.pathway === pathway && item.technology.stage === "capture")
        .reduce((sum, item) => sum + item.technology.capacity, 0);
}
function captureOutput(state, player, pathway, ignoreCondition = false) {
    const continent = continentFor(state, player);
    const capacity = pathwayCapacity(state, player, pathway);
    const ideal = Math.min(continent.opportunities[pathway] ?? 0, capacity);
    const table = state.config.weather[pathway]?.[state.weather.current] ?? [];
    let output = table[ideal] ?? 0;
    const condition = activeCondition(state, player, ignoreCondition);
    if (pathway === "solar" && condition?.effect.kind === "solarDelta")
        output += condition.effect.amount;
    if (pathway === "wind" && condition?.effect.kind === "windDelta")
        output += condition.effect.amount;
    if (pathway === "solar" && hasTechnology(player, "advancedSolar"))
        output += 1;
    if (pathway === "wind" && hasTechnology(player, "advancedWind"))
        output += 1;
    const continentModifier = getContinentGenerationModifiers(state, player.id, pathway);
    output += continentModifier.generationBonus;
    const cap = continentModifier.generationBonus > 0 ? continent.opportunities[pathway] : ideal;
    return Math.max(0, Math.min(cap, output));
}
function hydroSnapshot(state, player, ignoreCondition = false) {
    const continent = continentFor(state, player);
    const technologies = installedTechnologies(state, player);
    const reservoirs = technologies.filter(item => item.technology.storage?.type === "reservoir");
    const storageCapacity = reservoirs.reduce((sum, item) => sum + (item.technology.storage?.capacity ?? 0), 0);
    const stored = reservoirs.reduce((sum, item) => sum + totalEnergy(item.instance.storageInput), 0);
    const turbineCapacity = technologies
        .filter(item => item.technology.pathway === "hydro" && item.technology.stage === "transformation")
        .reduce((sum, item) => sum + item.technology.capacity, 0);
    let inflow = state.config.weather.hydro[state.weather.current]?.[continent.opportunities.hydro] ?? 0;
    if (hasTechnology(player, "advancedHydroTurbine"))
        inflow += 1;
    const condition = activeCondition(state, player, ignoreCondition);
    if (condition?.effect.kind === "hydroDelta")
        inflow = Math.max(0, inflow + condition.effect.amount);
    if (!ignoreCondition || state.weather.current === "rain")
        inflow = Math.max(0, inflow + getContinentGenerationModifiers(state, player.id, "hydro").hydroDelta);
    const acceptedInflow = Math.min(Math.max(0, storageCapacity - stored), inflow);
    const available = Math.min(continent.opportunities.hydro, turbineCapacity, stored + acceptedInflow);
    return { storageCapacity, stored, turbineCapacity, inflow, acceptedInflow, available };
}
function fuelSnapshot(state, player, pathway, ignoreCondition = false) {
    const technologies = installedTechnologies(state, player)
        .filter(item => item.technology.pathway === pathway && item.technology.fuel);
    const opportunity = effectivePathwayOpportunity(state, player, pathway);
    const resource = pathway === "fossil" ? "fossilFuel" : "biomass";
    let resourceRemaining = player.resources[resource].warehouse;
    let output = 0;
    let maximum = 0;
    let loss = 0;
    let first = true;
    const condition = activeCondition(state, player, ignoreCondition);
    for (const item of technologies) {
        const technology = item.technology;
        const plantMaximum = fuelPlantMaximumOutput(state, player, technology);
        maximum += plantMaximum;
        if (resourceRemaining < (technology.fuel?.units ?? 1))
            continue;
        let actual = plantMaximum;
        if (first && condition?.effect.kind === "firstFuelPlantOutputDelta")
            actual = Math.max(0, actual + condition.effect.amount);
        first = false;
        const room = Math.max(0, opportunity - output);
        actual = Math.min(actual, room);
        if (actual <= 0)
            continue;
        output += actual;
        loss += technology.loss?.fixedPerOperation ?? 0;
        resourceRemaining -= technology.fuel?.units ?? 1;
    }
    return { output, maximum: Math.min(maximum, opportunity), loss, hasFuel: player.resources[resource].warehouse > 0 };
}
function gridCapacity(state, player, ignoreCondition = false) {
    let capacity = installedTechnologies(state, player)
        .filter(item => item.technology.stage === "transport")
        .reduce((sum, item) => sum + item.technology.capacity + (item.instance.temporaryCapacityBonus ?? 0), 0);
    const condition = activeCondition(state, player, ignoreCondition);
    if (condition?.effect.kind === "gridCapacityDelta") {
        const protectedBySmartGrid = condition.effect.amount < 0 && hasTechnology(player, "smartGrid");
        if (!protectedBySmartGrid)
            capacity += condition.effect.amount;
    }
    return Math.max(0, capacity);
}
function lightingTechnology(state, player) {
    return hasTechnology(player, "efficientLighting")
        ? getTechnology(state, "efficientLighting")
        : getTechnology(state, "standardLighting");
}
function demandTarget(state, player, ignoreCondition = false) {
    let target = state.config.demand.reliabilityTargets[state.generation] ?? 0;
    const condition = activeCondition(state, player, ignoreCondition);
    if (condition?.effect.kind === "demandTargetDelta")
        target = Math.max(0, Math.min(state.config.demand.maximumLight, target + condition.effect.amount));
    return target;
}
function batterySnapshot(state, player) {
    const batteries = installedTechnologies(state, player)
        .filter(item => item.technology.storage?.type === "battery");
    const capacity = batteries.reduce((sum, item) => sum + (item.technology.storage?.capacity ?? 0), 0);
    const stored = batteries.reduce((sum, item) => sum + totalEnergy(item.instance.storageInput), 0);
    const fullRecovery = batteries.reduce((sum, item) => {
        const technology = item.technology;
        const input = technology.storage?.capacity ?? 0;
        return sum + (technology.storage?.recovery.outputsByInput[input] ?? 0);
    }, 0);
    return { capacity, stored, fullRecovery };
}
export function systemSnapshot(state, playerId, options = {}) {
    const player = typeof playerId === "string" ? state.players[playerId] : playerId;
    if (!player)
        throw new Error(`Unknown player ${playerId}.`);
    const ignoreCondition = Boolean(options.ignoreCondition);
    const solarCapacity = pathwayCapacity(state, player, "solar");
    const windCapacity = pathwayCapacity(state, player, "wind");
    const solar = captureOutput(state, player, "solar", ignoreCondition);
    const wind = captureOutput(state, player, "wind", ignoreCondition);
    const hydro = hydroSnapshot(state, player, ignoreCondition);
    const biomass = fuelSnapshot(state, player, "biomass", ignoreCondition);
    const fossil = fuelSnapshot(state, player, "fossil", ignoreCondition);
    const battery = batterySnapshot(state, player);
    const physicalGrid = gridCapacity(state, player, ignoreCondition);
    const leapfrog = getContinentGenerationModifiers(state, player.id, "solar");
    const grid = physicalGrid + (leapfrog.transmissionLossIgnored > 0 && solar > 0 ? leapfrog.transmissionLossIgnored : 0);
    const lighting = lightingTechnology(state, player);
    const target = demandTarget(state, player, ignoreCondition);
    const generationAvailable = solar + wind + hydro.available + biomass.output + fossil.output;
    const storageAvailable = Math.min(battery.stored, battery.fullRecovery);
    const availableNow = generationAvailable + storageAvailable;
    const lightingMaximum = lighting.maximumOutput;
    const transportedPotential = Math.min(availableNow, grid);
    let transmissionLoss = getTransmissionLevel(state, player.id) === 1 && transportedPotential >= 3 ? 1 : 0;
    if (transmissionLoss > 0 && solar > 0 && getContinentGenerationModifiers(state, player.id, "solar").transmissionLossIgnored > 0)
        transmissionLoss = 0;
    const lightCeiling = Math.min(state.config.demand.maximumLight, Math.max(0, transportedPotential - transmissionLoss), lightingMaximum);
    return {
        target,
        pointTarget: Math.min(state.config.demand.maximumLight, target + 1),
        solar: { capacity: solarCapacity, output: solar },
        wind: { capacity: windCapacity, output: wind },
        hydro,
        biomass,
        fossil,
        battery,
        gridCapacity: grid,
        transmissionLoss,
        lightingMaximum,
        generationAvailable,
        availableNow,
        lightCeiling
    };
}
function replaceForPreview(state, player, technology) {
    const prerequisite = technology.prerequisiteTechnologyId
        ? player.installed.find(item => item.technologyId === technology.prerequisiteTechnologyId)
        : null;
    const storageInput = prerequisite ? structuredClone(prerequisite.storageInput) : Object.fromEntries(pathways.map(pathway => [pathway, 0]));
    if (prerequisite)
        player.installed = player.installed.filter(item => item.instanceId !== prerequisite.instanceId);
    player.installed.push({
        instanceId: `preview-${technology.id}`,
        technologyId: technology.id,
        builtGeneration: 0,
        storageInput,
        usedThisGeneration: false,
        firstOperationLossReduction: 0,
        temporaryCapacityBonus: 0
    });
}
function changedMetric(label, before, after, unit = "") {
    if (before === after)
        return null;
    return { label, before, after, unit };
}
function nextBottleneck(snapshot, desired) {
    if (snapshot.gridCapacity < Math.min(desired, snapshot.availableNow))
        return `Next bottleneck: the Grid can move only ${snapshot.gridCapacity} Energy.`;
    if (snapshot.lightingMaximum < Math.min(desired, snapshot.availableNow, snapshot.gridCapacity))
        return `Next bottleneck: Lighting can deliver only ${snapshot.lightingMaximum} Light.`;
    if (snapshot.availableNow < desired)
        return `You still need ${desired - snapshot.availableNow} more usable Energy in this weather.`;
    return `This system can now reach ${Math.min(desired, snapshot.lightCeiling)} of the ${desired} Light goal.`;
}
export function technologyImpactPreview(state, playerId, technologyOrId) {
    const technology = typeof technologyOrId === "string" ? getTechnology(state, technologyOrId) : technologyOrId;
    const ownsTechnology = state.players[playerId].installed.some(instance => instance.technologyId === technology.id);
    let before;
    let after;
    let beforeState;
    let afterState;
    if (ownsTechnology) {
        afterState = structuredClone(state);
        after = systemSnapshot(afterState, playerId);
        const baseline = structuredClone(state);
        const baselinePlayer = baseline.players[playerId];
        const owned = baselinePlayer.installed.find(instance => instance.technologyId === technology.id);
        baselinePlayer.installed = baselinePlayer.installed.filter(instance => instance.instanceId !== owned.instanceId);
        if (technology.prerequisiteTechnologyId) {
            baselinePlayer.installed.push({
                instanceId: `preview-${technology.prerequisiteTechnologyId}`,
                technologyId: technology.prerequisiteTechnologyId,
                builtGeneration: 0,
                storageInput: structuredClone(owned.storageInput),
                usedThisGeneration: false,
                firstOperationLossReduction: 0,
                temporaryCapacityBonus: 0
            });
        }
        beforeState = baseline;
        before = systemSnapshot(beforeState, playerId);
    }
    else {
        beforeState = structuredClone(state);
        const directPrerequisiteInstalled = !technology.prerequisiteTechnologyId || hasTechnology(beforeState.players[playerId], technology.prerequisiteTechnologyId);
        if (technology.prerequisiteTechnologyId && !directPrerequisiteInstalled) {
            const prerequisite = getTechnology(beforeState, technology.prerequisiteTechnologyId);
            replaceForPreview(beforeState, beforeState.players[playerId], prerequisite);
        }
        before = systemSnapshot(beforeState, playerId);
        const draft = structuredClone(beforeState);
        const draftPlayer = draft.players[playerId];
        replaceForPreview(draft, draftPlayer, technology);
        afterState = draft;
        after = systemSnapshot(afterState, playerId);
    }
    const prerequisiteReady = !technology.prerequisiteTechnologyId || hasTechnology(state.players[playerId], technology.prerequisiteTechnologyId);
    const comparisonMode = ownsTechnology ? "installed" : prerequisiteReady ? "current" : "tier";
    const continent = continentFor(state, state.players[playerId]);
    const regionalOpportunity = continent.opportunities[technology.pathway] ?? null;
    const notUsefulHere = technology.minimumRegionalOpportunity !== undefined && regionalOpportunity < technology.minimumRegionalOpportunity;
    const forecastFace = state.weather.forecast;
    let beforeForecast = null;
    let afterForecast = null;
    if (forecastFace) {
        const forecastBeforeState = structuredClone(beforeState);
        const forecastAfterState = structuredClone(afterState);
        forecastBeforeState.weather.current = forecastFace;
        forecastAfterState.weather.current = forecastFace;
        beforeForecast = systemSnapshot(forecastBeforeState, playerId, { ignoreCondition: true });
        afterForecast = systemSnapshot(forecastAfterState, playerId, { ignoreCondition: true });
    }
    const metrics = [];
    const push = item => { if (item)
        metrics.push(item); };
    let now = "";
    let future = "";
    if (technology.pathway === "solar") {
        push(changedMetric("Solar capacity", before.solar.capacity, after.solar.capacity, " Energy"));
        push(changedMetric("Solar output now", before.solar.output, after.solar.output, " Energy"));
        now = after.solar.output > before.solar.output
            ? `In today's ${state.weather.current} weather, Solar output rises from ${before.solar.output} to ${after.solar.output}.`
            : `Today's weather or regional Solar Opportunity keeps output at ${after.solar.output}; the extra capacity becomes useful in stronger sun.`;
        future = beforeForecast && afterForecast
            ? `In the ${forecastFace} forecast, Solar output changes from ${beforeForecast.solar.output} to ${afterForecast.solar.output} Energy${technology.id === "advancedSolar" ? ", including advanced weak-weather resilience" : ""}.`
            : technology.id === "advancedSolar" ? "The advanced system also adds 1 Energy of resilience in weak Solar weather." : "More installed Solar capacity can convert stronger future sun into Energy.";
    }
    else if (technology.pathway === "wind") {
        push(changedMetric("Wind capacity", before.wind.capacity, after.wind.capacity, " Energy"));
        push(changedMetric("Wind output now", before.wind.output, after.wind.output, " Energy"));
        now = after.wind.output > before.wind.output
            ? `In today's ${state.weather.current} weather, Wind output rises from ${before.wind.output} to ${after.wind.output}.`
            : `Today's weather or regional Wind Opportunity keeps output at ${after.wind.output}; the extra capacity becomes useful in stronger wind.`;
        future = beforeForecast && afterForecast
            ? `In the ${forecastFace} forecast, Wind output changes from ${beforeForecast.wind.output} to ${afterForecast.wind.output} Energy${technology.id === "advancedWind" ? ", including offshore weak-weather resilience" : ""}.`
            : technology.id === "advancedWind" ? "The offshore system also adds 1 Energy of resilience in weak Wind weather." : "More Wind capacity can convert stronger future wind into Energy.";
    }
    else if (technology.pathway === "hydro") {
        push(changedMetric("Hydro dispatch", before.hydro.available, after.hydro.available, " Energy"));
        push(changedMetric("Reservoir room", before.hydro.storageCapacity, after.hydro.storageCapacity, " Energy"));
        push(changedMetric("Hydro turbine capacity", before.hydro.turbineCapacity, after.hydro.turbineCapacity, " Energy"));
        now = after.hydro.available > before.hydro.available
            ? `Available Hydro rises from ${before.hydro.available} to ${after.hydro.available} Energy this Generation.`
            : `The larger Reservoir can hold ${after.hydro.storageCapacity} Energy, even if today's inflow does not raise immediate output.`;
        future = beforeForecast && afterForecast
            ? `In the ${forecastFace} forecast, Hydro inflow changes from ${beforeForecast.hydro.inflow} to ${afterForecast.hydro.inflow}, with up to ${afterForecast.hydro.available} Energy available after Reservoir limits.`
            : technology.id === "advancedHydroTurbine" ? "The advanced system receives +1 Hydro inflow every Generation before storage limits." : "More Reservoir room carries wet-weather Energy into later Generations.";
    }
    else if (technology.pathway === "biomass") {
        push(changedMetric("Biomass output", before.biomass.maximum, after.biomass.maximum, " Energy per fuel"));
        push(changedMetric("Thermal loss", before.biomass.loss, after.biomass.loss, " loss"));
        now = `One Biomass can make up to ${after.biomass.maximum} Energy${after.biomass.loss < before.biomass.loss ? ` with loss reduced from ${before.biomass.loss} to ${after.biomass.loss}` : ""}.`;
        future = "Operating and replenishing Biomass can still generate Applied Learning for cheaper Knowledge growth.";
    }
    else if (technology.pathway === "fossil") {
        push(changedMetric("Fuel output", before.fossil.maximum, after.fossil.maximum, " Energy per fuel"));
        push(changedMetric("Thermal loss", before.fossil.loss, after.fossil.loss, " loss"));
        now = `One Fossil Fuel can make up to ${after.fossil.maximum} Energy${after.fossil.loss < before.fossil.loss ? ` with loss reduced from ${before.fossil.loss} to ${after.fossil.loss}` : ""}.`;
        future = technology.knowledgeRequired === 5 ? "This is the only fuel-only tier capable of reaching the four-Light late-game requirement." : "Fuel remains finite; the upgrade buys time but does not refill reserves.";
    }
    else if (technology.stage === "storage") {
        push(changedMetric("Storage room", before.battery.capacity, after.battery.capacity, " Energy"));
        push(changedMetric("Full discharge recovery", before.battery.fullRecovery, after.battery.fullRecovery, " Energy"));
        now = before.generationAvailable > before.lightCeiling
            ? `You currently have surplus-generation potential; this storage can keep more of it for a later Generation.`
            : "This does not immediately add Light because there is no visible surplus to store right now.";
        future = `At full charge, the upgraded storage can return ${after.battery.fullRecovery} of ${after.battery.capacity} stored Energy.`;
    }
    else if (technology.stage === "transport") {
        push(changedMetric("Grid capacity", before.gridCapacity, after.gridCapacity, " Energy"));
        push(changedMetric("Current Light ceiling", before.lightCeiling, after.lightCeiling, " Light"));
        now = after.lightCeiling > before.lightCeiling
            ? `The Grid removes a bottleneck: current Light potential rises from ${before.lightCeiling} to ${after.lightCeiling}.`
            : `The Grid can move ${after.gridCapacity} Energy; another stage currently limits Light first.`;
        future = technology.id === "smartGrid" ? "Smart Grid keeps at least 4 transport capacity during a Grid Bottleneck condition." : "Four Grid capacity is needed to deliver the final four-Light target.";
    }
    else if (technology.stage === "efficiency" || technology.stage === "lighting") {
        push(changedMetric("Maximum Light", before.lightingMaximum, after.lightingMaximum, " Light"));
        push(changedMetric("Current Light ceiling", before.lightCeiling, after.lightCeiling, " Light"));
        now = after.lightCeiling > before.lightCeiling
            ? `Current Light potential rises from ${before.lightCeiling} to ${after.lightCeiling}.`
            : `Lighting can now deliver ${after.lightingMaximum} Light, but generation or the Grid is the current bottleneck.`;
        future = "Efficient LED Lighting is required to convert four transported Energy into four Light.";
    }
    else if (technology.special === "researchCentre") {
        push({ label: "Temporary Knowledge after Learn", before: 0, after: 1, unit: "" });
        now = "The next Learn action in a Generation grants +1 temporary Knowledge after the permanent increase.";
        future = "A player at Knowledge 3 can Learn to 4 and temporarily reach Knowledge 5 for a later Build in the same Generation.";
    }
    else {
        push(changedMetric("Capacity", technology.prerequisiteTechnologyId ? getTechnology(state, technology.prerequisiteTechnologyId).capacity : 0, technology.capacity, ""));
        now = technology.gameBenefit ?? "This technology improves the energy system.";
        future = technology.futureBenefit ?? "Its benefit appears when the relevant stage is used.";
    }
    if (notUsefulHere) {
        metrics.length = 0;
        metrics.push({ label: `Regional ${technology.pathway} limit`, before: regionalOpportunity, after: regionalOpportunity, unit: " Energy" });
        now = `${continent.name}'s ${technology.pathway} Opportunity is ${regionalOpportunity}, so this upgrade cannot raise usable output above the previous tier.`;
        future = `This technology requires regional ${technology.pathway} Opportunity ${technology.minimumRegionalOpportunity} or higher to create a game benefit.`;
    }
    const desired = playerId && state.players[playerId].cumulative.reliableGenerations < (state.config.rules.reliabilityPointMaximum ?? 4)
        ? after.pointTarget
        : after.target;
    const prompt = notUsefulHere ? "Do not build this card here. Use Knowledge 5 on another pathway or shared-system upgrade." : nextBottleneck(after, desired);
    const immediate = after.lightCeiling - before.lightCeiling;
    const forecastLightChange = beforeForecast && afterForecast ? afterForecast.lightCeiling - beforeForecast.lightCeiling : 0;
    const forecastEnergyChange = beforeForecast && afterForecast ? afterForecast.availableNow - beforeForecast.availableNow : 0;
    const currentEnergyChange = after.availableNow - before.availableNow;
    const timing = notUsefulHere
        ? "Not useful here"
        : comparisonMode === "tier"
            ? "Future upgrade"
            : immediate > 0 || currentEnergyChange > 0
                ? "Helps now"
                : forecastLightChange > 0 || forecastEnergyChange > 0
                    ? "Helps next forecast"
                    : "Prepares a later step";
    return {
        technology,
        before,
        after,
        beforeForecast,
        afterForecast,
        forecastFace,
        comparisonMode,
        metrics,
        now,
        future,
        prompt,
        timing,
        immediateLightChange: immediate,
        forecastLightChange,
        forecastEnergyChange,
        notUsefulHere,
        headline: notUsefulHere
            ? "No regional game benefit"
            : immediate > 0
                ? `Current Light potential +${immediate}`
                : currentEnergyChange > 0
                    ? `Usable Energy now +${currentEnergyChange}`
                    : forecastLightChange > 0
                        ? `Forecast Light potential +${forecastLightChange}`
                        : forecastEnergyChange > 0
                            ? `Forecast Energy +${forecastEnergyChange}`
                            : metrics.some(item => item.after > item.before)
                                ? "System capacity improves"
                                : "Future flexibility improves"
    };
}
export function conditionImpactPreview(state, playerId, condition) {
    const player = state.players[playerId];
    const before = systemSnapshot(state, playerId, { ignoreCondition: true });
    const after = systemSnapshot(state, playerId);
    const effect = condition.effect;
    let chain = ["Before", "Card", "After"];
    let values = ["—", condition.name, "—"];
    let impact = "This condition is active for the current Generation.";
    let prompt = effect.adaptable ? "On your turn, choose Adapt to cancel the penalty, or compensate elsewhere in the chain." : "No action is required; the game applies this automatically.";
    let relevant = true;
    switch (effect.kind) {
        case "solarDelta":
            values = [`${before.solar.output} Solar`, `${effect.amount >= 0 ? "+" : ""}${effect.amount}`, `${after.solar.output} Solar`];
            relevant = before.solar.capacity > 0;
            impact = relevant ? `Solar generation changes from ${before.solar.output} to ${after.solar.output} Energy.` : "You have no Solar technology, so this card changes nothing now.";
            break;
        case "windDelta":
            values = [`${before.wind.output} Wind`, `${effect.amount >= 0 ? "+" : ""}${effect.amount}`, `${after.wind.output} Wind`];
            relevant = before.wind.capacity > 0;
            impact = relevant ? `Wind generation changes from ${before.wind.output} to ${after.wind.output} Energy.` : "You have no Wind technology, so this card changes nothing now.";
            break;
        case "hydroDelta":
            values = [`${before.hydro.inflow} inflow`, `${effect.amount >= 0 ? "+" : ""}${effect.amount}`, `${after.hydro.inflow} inflow`];
            relevant = before.hydro.storageCapacity > 0;
            impact = relevant ? `Hydro inflow changes from ${before.hydro.inflow} to ${after.hydro.inflow} Energy before Reservoir limits.` : `You have no Hydro system. The fallback changes Biomass regrowth by ${effect.fallbackBiomassRegrowthDelta ?? 0}.`;
            break;
        case "biomassRegrowthDelta":
            values = ["1 regrowth", `${effect.amount >= 0 ? "+" : ""}${effect.amount}`, `${Math.max(0, 1 + effect.amount)} regrowth`];
            relevant = player.installed.some(instance => getTechnology(state, instance.technologyId).biomassRegrowth);
            impact = relevant ? `After Biomass operates, regrowth changes by ${effect.amount}.` : "You have no managed Biomass system, so the card has no current target.";
            break;
        case "biomassRegrowthSet":
            values = ["Normal regrowth", "Set", `${effect.value} regrowth`];
            relevant = player.installed.some(instance => getTechnology(state, instance.technologyId).biomassRegrowth);
            impact = relevant ? `Biomass regrowth is set to ${effect.value} this Generation.` : "You have no managed Biomass system, so the card has no current target.";
            break;
        case "gridCapacityDelta":
            values = [`Grid ${before.gridCapacity}`, `${effect.amount >= 0 ? "+" : ""}${effect.amount}`, `Grid ${after.gridCapacity}`];
            impact = hasTechnology(player, "smartGrid") && effect.amount < 0 ? "Smart Grid protects you: transport capacity does not fall below its normal four-Energy requirement." : `Grid transport changes from ${before.gridCapacity} to ${after.gridCapacity} Energy.`;
            break;
        case "firstFuelPlantOutputDelta":
            values = [`${before.biomass.output + before.fossil.output} fuel Energy`, `${effect.amount}`, `${after.biomass.output + after.fossil.output} fuel Energy`];
            relevant = before.biomass.maximum + before.fossil.maximum > 0;
            impact = relevant ? `The first Biomass or Fossil plant used produces ${Math.abs(effect.amount)} less Energy.` : "You have no fuel plant that can be affected.";
            break;
        case "firstBuildConstructionDelta":
            values = ["Normal Build", `+${effect.amount} General`, "First Build costs more"];
            impact = `The first technology you build this Generation costs ${effect.amount} extra Other Material.`;
            prompt = "Gather the extra material, use a discount, or delay the Build. This card has no Adapt response.";
            break;
        case "storageRecoveryBonus": {
            const batteries = installedTechnologies(state, player).filter(item => item.technology.storage?.type === "battery");
            relevant = batteries.length > 0;
            const best = batteries.sort((a, b) => totalEnergy(b.instance.storageInput) - totalEnergy(a.instance.storageInput))[0];
            const stored = best ? totalEnergy(best.instance.storageInput) : 0;
            const normal = best ? best.technology.storage.recovery.outputsByInput[stored] ?? 0 : 0;
            const improved = Math.min(stored, normal + effect.amount);
            values = [`Recover ${normal}`, `+${effect.amount}`, `Recover ${improved}`];
            impact = relevant ? `Choose a Battery at Dispatch. Its next discharge can recover ${improved} instead of ${normal} Energy at the current stored amount.` : "You have no Battery, so the breakthrough has no current target.";
            prompt = relevant ? "The recommended Dispatch plan selects the fullest Battery automatically." : "No action is needed. Build a Battery in a later Generation to benefit from future storage cards.";
            break;
        }
        case "temporaryKnowledge": {
            const permanent = player.knowledge;
            const effective = permanent + player.temporaryKnowledge;
            values = [`Knowledge ${permanent}`, `+${effect.amount}`, `Knowledge ${effective}`];
            const newlyReachable = state.config.technologies.filter(technology => technology.knowledgeRequired > permanent && technology.knowledgeRequired <= effective && !technology.starter).map(technology => technology.name);
            impact = `Your effective construction Knowledge is ${effective} for this Generation.`;
            prompt = newlyReachable.length ? `You can now build: ${newlyReachable.slice(0, 3).join(", ")}${newlyReachable.length > 3 ? "…" : ""}.` : "No new technology tier is unlocked, but the temporary Knowledge can combine with a Prepared Pathway bonus.";
            break;
        }
        case "demandTargetDelta":
            values = [`Need ${before.target}`, `${effect.amount >= 0 ? "+" : ""}${effect.amount}`, `Need ${after.target}`];
            impact = `The Light requirement changes from ${before.target} to ${after.target}. Your current system ceiling is ${after.lightCeiling}.`;
            prompt = after.lightCeiling >= after.target ? "Your current system can still meet demand." : `You are short by ${after.target - after.lightCeiling}. Improve generation, Grid or Lighting—or Adapt if available.`;
            break;
        case "lightMaximumDelta":
            values = [`Max ${state.config.demand.maximumLight}`, `${effect.amount}`, `Max ${Math.max(1, state.config.demand.maximumLight + effect.amount)}`];
            impact = `Maximum deliverable Light changes by ${effect.amount}.`;
            break;
        default:
            relevant = true;
    }
    if (!relevant)
        prompt = "No action is needed: this card does not affect your current system.";
    return { chain, values, impact, prompt, relevant, before, after };
}
export function systemGuidance(state, playerId) {
    const player = state.players[playerId];
    const snapshot = systemSnapshot(state, playerId);
    const pointAvailable = player.cumulative.reliableGenerations < (state.config.rules.reliabilityPointMaximum ?? 4);
    const desired = pointAvailable ? snapshot.pointTarget : snapshot.target;
    if (snapshot.lightCeiling >= desired) {
        return {
            headline: `Your system can reach ${snapshot.lightCeiling} Light now.`,
            detail: pointAvailable && snapshot.lightCeiling > snapshot.target ? "You have enough potential to earn a Reliability Point." : "You can meet this Generation's demand.",
            action: "Use the remaining actions to prepare for the forecast, save resources or improve Knowledge."
        };
    }
    if (snapshot.gridCapacity < Math.min(desired, snapshot.availableNow)) {
        return {
            headline: `Grid bottleneck: ${snapshot.gridCapacity} Energy can move.`,
            detail: `You have up to ${snapshot.availableNow} usable Energy, but need ${desired} Light potential.`,
            action: snapshot.gridCapacity < 4 ? "Build the next Grid tier." : "A Local Condition is restricting the Grid; Adapt or use Smart Grid protection."
        };
    }
    if (snapshot.lightingMaximum < Math.min(desired, snapshot.availableNow, snapshot.gridCapacity)) {
        return {
            headline: `Lighting bottleneck: maximum ${snapshot.lightingMaximum} Light.`,
            detail: `The Grid and generation can support more, but Lighting cannot convert it.`,
            action: "Build Efficient LED Lighting."
        };
    }
    const candidates = state.config.technologies
        .filter(technology => !technology.starter)
        .map(technology => technologyImpactPreview(state, playerId, technology))
        .filter(item => item.after.availableNow > snapshot.availableNow || item.after.lightCeiling > snapshot.lightCeiling)
        .sort((a, b) => (b.after.lightCeiling - snapshot.lightCeiling) - (a.after.lightCeiling - snapshot.lightCeiling) || (b.after.availableNow - snapshot.availableNow) - (a.after.availableNow - snapshot.availableNow));
    const best = candidates[0];
    if (best) {
        const legal = buildLegality(state, playerId, best.technology);
        const action = legal.legal
            ? `Build ${best.technology.name}.`
            : `Work toward ${best.technology.name}: ${legal.reason}`;
        return {
            headline: `Generation shortfall: ceiling ${snapshot.lightCeiling}, goal ${desired}.`,
            detail: best.now,
            action
        };
    }
    return {
        headline: `Generation shortfall: ceiling ${snapshot.lightCeiling}, goal ${desired}.`,
        detail: "No single available upgrade fixes the whole gap.",
        action: "Gather resources, increase Knowledge, or combine a second pathway."
    };
}
export function developmentActionLegality(state, playerId, action) {
    try {
        const draft = structuredClone(state);
        applyCommand(draft, { type: "developmentAction", playerId, action });
        return { legal: true, reason: "Available" };
    }
    catch (error) {
        return {
            legal: false,
            reason: error instanceof Error ? error.message : String(error)
        };
    }
}
export function effectiveBuildCost(state, player, technology, options = {}) {
    const result = getEffectiveUpgradeCost(state, player.id, technology, options);
    return {
        constructionMaterials: result.final.constructionMaterials,
        criticalMaterials: result.final.criticalMaterials,
        effectiveKnowledge: result.effectiveKnowledge,
        knowledgeRequired: result.knowledgeRequired,
        base: result.base,
        modifiers: result.modifiers,
        usesInnovationBoost: result.usesInnovationBoost
    };
}
export function buildLegality(state, playerId, technology, options = {}) {
    return developmentActionLegality(state, playerId, {
        kind: "build",
        technologyId: technology.id,
        useContinentAbility: Boolean(options.useContinentAbility)
    });
}
export function findImportPayment(player, receive, required) {
    let remaining = required;
    const payment = {};
    const candidates = resourceOrder
        .filter(resource => resource !== receive)
        .sort((a, b) => player.resources[b].warehouse - player.resources[a].warehouse);
    for (const resource of candidates) {
        if (remaining <= 0)
            break;
        const quantity = Math.min(remaining, player.resources[resource].warehouse);
        if (quantity > 0) {
            payment[resource] = quantity;
            remaining -= quantity;
        }
    }
    return remaining === 0 ? payment : null;
}
export function importLegality(state, player, receive) {
    let required = receive === "criticalMaterials"
        ? state.config.trade.criticalImportCost
        : state.config.trade.normalImportCost;
    if (player.prepared.capabilityId === "trade" && !player.prepared.capabilityUsed) {
        required = Math.max(1, required - 1);
    }
    const payment = findImportPayment(player, receive, required);
    if (!payment) {
        return {
            legality: { legal: false, reason: `You need ${required} other Warehouse resources to import this.` },
            payment: null,
            required
        };
    }
    return {
        legality: developmentActionLegality(state, player.id, {
            kind: "publicImport",
            receive,
            payment
        }),
        payment,
        required
    };
}
export function previewDispatch(state, playerId, plan) {
    try {
        const draft = structuredClone(state);
        applyCommand(draft, { type: "dispatch", playerId, plan });
        const metrics = draft.players[playerId].currentMetrics;
        const grossEnergy = Object.values(metrics.grossEnergy).reduce((sum, value) => sum + value, 0);
        const transported = Object.values(plan.transportByPathway ?? {}).reduce((sum, value) => sum + (value ?? 0), 0);
        const systemLoss = Object.values(metrics.systemLoss).reduce((sum, value) => sum + value, 0);
        const snapshot = systemSnapshot(state, playerId);
        return {
            legal: true,
            reason: "Available",
            light: metrics.deliveredLight,
            target: metrics.reliabilityTarget,
            reliable: metrics.reliabilityPointEarned,
            demandMet: metrics.reliabilityMet,
            pointEarned: metrics.reliabilityPointEarned,
            pointCapped: metrics.reliabilityPointCapped,
            grossEnergy,
            grossByPathway: structuredClone(metrics.grossEnergy),
            transported,
            stored: metrics.storedEnd,
            curtailed: metrics.curtailed,
            systemLoss,
            lossBreakdown: structuredClone(metrics.systemLoss),
            gridCapacity: snapshot.gridCapacity,
            lightingMaximum: snapshot.lightingMaximum
        };
    }
    catch (error) {
        return {
            legal: false,
            reason: error instanceof Error ? error.message : String(error),
            light: 0,
            target: state.config.demand.reliabilityTargets[state.generation] ?? 0,
            reliable: false,
            demandMet: false,
            pointEarned: false,
            pointCapped: false,
            grossEnergy: 0,
            grossByPathway: Object.fromEntries(pathways.map(pathway => [pathway, 0])),
            transported: 0,
            stored: 0,
            curtailed: 0,
            systemLoss: 0,
            lossBreakdown: { thermal: 0, battery: 0, lighting: 0, other: 0 },
            gridCapacity: 0,
            lightingMaximum: 0
        };
    }
}

