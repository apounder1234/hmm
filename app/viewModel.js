// @ts-check
// SUNPATHS organised source. Each section has one named responsibility.
import { applyCommand } from "./engine.js";
import { chooseDispatchPlan } from "./ai.js";
import { conditionApplies, countInstalled, fuelPlantMaximumOutput, fossilChainSnapshot, getTechnology, hasTechnology, pathways, totalEnergy, getContinentGenerationModifiers, getEffectiveUpgradeCost, getKnowledgeRequirement, worldMarketBlocked, worldMarketRate } from "./rules.js";
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
    const capacity = pathwayCapacity(state, player, pathway);
    const table = state.config.weather[pathway]?.[state.weather.current] ?? [];
    let output = table[Math.min(table.length - 1, capacity)] ?? 0;
    const condition = activeCondition(state, player, ignoreCondition);
    if (pathway === "solar" && condition?.effect.kind === "solarDelta") output += condition.effect.amount;
    if (pathway === "wind" && condition?.effect.kind === "windDelta") output += condition.effect.amount;
    const signature = getContinentGenerationModifiers(state, player.id, pathway).generationBonus;
    output += signature;
    const pathwayMaximum = state.config.weather?.pathwayGenerationMaximum ?? 4;
    return Math.max(0, Math.min(pathwayMaximum, capacity, output));
}

function hydroSnapshot(state, player, ignoreCondition = false) {
    const hydroItems = installedTechnologies(state, player)
        .filter(item => item.technology.pathway === "hydro")
        .sort((a, b) => (b.technology.hydro?.totalMaximum ?? 0) - (a.technology.hydro?.totalMaximum ?? 0));
    const item = hydroItems[0] ?? null;
    if (!item)
        return { storageCapacity: 0, stored: 0, pending: 0, immediate: 0, releaseMaximum: 0, totalMaximum: 0, inflow: 0, acceptedInflow: 0, available: 0 };
    const technology = item.technology;
    const hydro = technology.hydro ?? { immediateOutput: 0, releaseMaximum: 0, totalMaximum: 0, inflowCaptureMaximum: 0 };
    const storageCapacity = technology.storage?.capacity ?? 0;
    const stored = totalEnergy(item.instance.storageInput);
    const pending = totalEnergy(item.instance.pendingStorageInput ?? Object.fromEntries(pathways.map(pathway => [pathway, 0])));
    let inflow = 0;
    if (storageCapacity > 0 && hydro.inflowCaptureMaximum > 0) {
        inflow = state.config.weather.hydro[state.weather.current]?.[Math.min(4, hydro.inflowCaptureMaximum)] ?? 0;
        const condition = activeCondition(state, player, ignoreCondition);
        if (condition?.effect.kind === "hydroDelta")
            inflow = Math.max(0, inflow + condition.effect.amount);
        if (!ignoreCondition)
            inflow += getContinentGenerationModifiers(state, player.id, "hydro").hydroDelta;
    }
    const acceptedInflow = Math.min(Math.max(0, storageCapacity - stored - pending), hydro.inflowCaptureMaximum, Math.max(0, inflow));
    const releaseAvailable = Math.min(hydro.releaseMaximum, stored);
    const available = Math.min(hydro.totalMaximum, hydro.immediateOutput + releaseAvailable);
    return {
        storageCapacity, stored, pending,
        immediate: hydro.immediateOutput,
        releaseMaximum: hydro.releaseMaximum,
        totalMaximum: hydro.totalMaximum,
        inflow: Math.max(0, inflow),
        acceptedInflow,
        available
    };
}

function fuelSnapshot(state, player, pathway, ignoreCondition = false) {
    const technologies = installedTechnologies(state, player).filter(item => {
        if (pathway === "fossil") return item.technology.fossilRole === "legacyPlant";
        return item.technology.pathway === "biomass" && item.technology.fuel?.resource === "biomass";
    });
    const resource = pathway === "fossil" ? "fossilFuel" : "biomass";
    let resourceRemaining = player.resources[resource].warehouse;
    let output = 0;
    let maximum = 0;
    let loss = 0;
    let first = true;
    const condition = activeCondition(state, player, ignoreCondition);
    const chain = pathway === "fossil" ? fossilChainSnapshot(state, player) : null;
    for (const item of technologies) {
        const technology = item.technology;
        const plantMaximum = fuelPlantMaximumOutput(state, player, technology);
        maximum += plantMaximum;
        if (resourceRemaining < 1) continue;
        let actual = plantMaximum;
        if (first && condition?.effect.kind === "firstFuelPlantOutputDelta") actual = Math.max(0, actual + condition.effect.amount);
        first = false;
        output += actual;
        loss += pathway === "fossil" ? chain.storageLoss + chain.transformationLoss : (technology.loss?.fixedPerOperation ?? 0);
        resourceRemaining--;
    }
    return { output, maximum, loss, hasFuel: player.resources[resource].warehouse > 0, ...(chain ? { chain } : {}) };
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
    const pending = batteries.reduce((sum, item) => sum + totalEnergy(item.instance.pendingStorageInput ?? Object.fromEntries(pathways.map(pathway => [pathway, 0]))), 0);
    const fullRecovery = batteries.reduce((sum, item) => {
        const technology = item.technology;
        const input = technology.storage?.capacity ?? 0;
        return sum + (technology.storage?.recovery.outputsByInput[input] ?? 0);
    }, 0);
    return { capacity, stored, pending, fullRecovery };
}
export function systemSnapshot(state, playerId, options = {}) {
    const player = typeof playerId === "string" ? state.players[playerId] : playerId;
    if (!player) throw new Error(`Unknown player ${playerId}.`);
    const ignoreCondition = Boolean(options.ignoreCondition);
    const solarCapacity = pathwayCapacity(state, player, "solar");
    const windCapacity = pathwayCapacity(state, player, "wind");
    const solar = captureOutput(state, player, "solar", ignoreCondition);
    const wind = captureOutput(state, player, "wind", ignoreCondition);
    const hydro = hydroSnapshot(state, player, ignoreCondition);
    const biomass = fuelSnapshot(state, player, "biomass", ignoreCondition);
    const fossil = fuelSnapshot(state, player, "fossil", ignoreCondition);
    const battery = batterySnapshot(state, player);
    const grid = gridCapacity(state, player, ignoreCondition);
    const lighting = lightingTechnology(state, player);
    const target = demandTarget(state, player, ignoreCondition);
    const generationAvailable = solar + wind + hydro.available + biomass.output + fossil.output;
    const storageAvailable = Math.min(battery.stored, battery.fullRecovery);
    const availableNow = generationAvailable + storageAvailable;
    const lightingMaximum = lighting.maximumOutput;
    const transportedPotential = Math.min(availableNow, grid);
    const lightCeiling = Math.min(state.config.demand.maximumLight, transportedPotential, lightingMaximum);
    return {
        target, pointTarget: state.generation >= (state.config.rules.reliabilityStartsGeneration ?? 5) ? target : null,
        solar: { capacity: solarCapacity, output: solar }, wind: { capacity: windCapacity, output: wind },
        hydro, biomass, fossil, battery, gridCapacity: grid, transmissionLoss: 0,
        lightingMaximum, generationAvailable, availableNow, lightCeiling
    };
}

function replaceForPreview(state, player, technology) {
    const prerequisite = technology.prerequisiteTechnologyId
        ? player.installed.find(item => item.technologyId === technology.prerequisiteTechnologyId)
        : null;
    const storageInput = prerequisite ? structuredClone(prerequisite.storageInput) : Object.fromEntries(pathways.map(pathway => [pathway, 0]));
    if (prerequisite && technology.replacesPrerequisite !== false)
        player.installed = player.installed.filter(item => item.instanceId !== prerequisite.instanceId);
    player.installed.push({
        instanceId: `preview-${technology.id}`, technologyId: technology.id, builtGeneration: 0,
        storageInput, pendingStorageInput: prerequisite ? structuredClone(prerequisite.pendingStorageInput ?? Object.fromEntries(pathways.map(pathway => [pathway, 0]))) : Object.fromEntries(pathways.map(pathway => [pathway, 0])), usedThisGeneration: false, firstOperationLossReduction: 0, temporaryCapacityBonus: 0
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
                pendingStorageInput: structuredClone(owned.pendingStorageInput ?? Object.fromEntries(pathways.map(pathway => [pathway, 0]))),
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
            : `Today's weather keeps Solar output at ${after.solar.output}; regional potential never blocks this technology, and stronger sun can use the extra capacity.`;
        future = beforeForecast && afterForecast
            ? `In the ${forecastFace} forecast, Solar output changes from ${beforeForecast.solar.output} to ${afterForecast.solar.output} Energy.`
            : "More installed Solar capacity can convert stronger future sun into Energy; no permanent regional penalty is applied.";
    }
    else if (technology.pathway === "wind") {
        push(changedMetric("Wind capacity", before.wind.capacity, after.wind.capacity, " Energy"));
        push(changedMetric("Wind output now", before.wind.output, after.wind.output, " Energy"));
        now = after.wind.output > before.wind.output
            ? `In today's ${state.weather.current} weather, Wind output rises from ${before.wind.output} to ${after.wind.output}.`
            : `Today's weather keeps Wind output at ${after.wind.output}; regional potential never blocks this technology, and stronger wind can use the extra capacity.`;
        future = beforeForecast && afterForecast
            ? `In the ${forecastFace} forecast, Wind output changes from ${beforeForecast.wind.output} to ${afterForecast.wind.output} Energy.`
            : "More installed Wind capacity can convert stronger future wind into Energy; no permanent regional penalty is applied.";
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
            : "More Reservoir room carries wet-weather Energy into later Generations; Hydro potential never imposes a permanent output penalty.";
    }
    else if (technology.pathway === "biomass") {
        push(changedMetric("Biomass output", before.biomass.maximum, after.biomass.maximum, " Energy per fuel"));
        push(changedMetric("Thermal loss", before.biomass.loss, after.biomass.loss, " loss"));
        now = `One Biomass can make up to ${after.biomass.maximum} Energy${after.biomass.loss < before.biomass.loss ? ` with loss reduced from ${before.biomass.loss} to ${after.biomass.loss}` : ""}.`;
        future = "Operating and replenishing Biomass can still generate Applied Learning for cheaper Knowledge growth.";
    }
    else if (technology.pathway === "fossil") {
        const beforeChain = before.fossil.chain;
        const afterChain = after.fossil.chain;
        push(changedMetric("Gross Fuel Energy", beforeChain?.grossEnergy ?? 0, afterChain?.grossEnergy ?? 0, " Energy"));
        push(changedMetric("Fuel-storage loss", beforeChain?.storageLoss ?? 0, afterChain?.storageLoss ?? 0, " Energy"));
        push(changedMetric("Transformation loss", beforeChain?.transformationLoss ?? 0, afterChain?.transformationLoss ?? 0, " Energy"));
        push(changedMetric("Energy before Grid", beforeChain?.afterTransformation ?? 0, afterChain?.afterTransformation ?? 0, " Energy"));
        if (technology.id === "enhancedOilRecovery") {
            now = `Enhanced Oil Recovery raises gross Energy from ${beforeChain.grossEnergy} to ${afterChain.grossEnergy} for the same one Fuel consumed.`;
            future = "It does not create Fuel, change extraction yield, remove the Fuel-storage loss, or improve the Grid or Lighting.";
        }
        else if (technology.id === "combinedCycle") {
            now = `Combined Cycle changes the fossil transformation loss from ${beforeChain.transformationLoss} to ${afterChain.transformationLoss}.`;
            future = "It does not increase gross Fuel Energy or remove the separate Fuel-storage loss.";
        }
        else if (technology.id === "carbonCapturePlant") {
            now = "Carbon Capture reduces fossil impact. It does not create more Energy.";
            future = "It is an optional environmental protection upgrade and is not required for four Light.";
        }
        else {
            now = `One Fuel begins with ${afterChain.grossEnergy} gross Energy, loses ${afterChain.storageLoss} in Fuel storage and ${afterChain.transformationLoss} in legacy transformation.`;
            future = "The full four-Light chain also needs Enhanced Oil Recovery, Combined Cycle, Grid Upgrade and Efficient LED Lighting.";
        }
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
            ? `Expected Light this Generation rises from ${before.lightCeiling} to ${after.lightCeiling}.`
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
    const desired = playerId && state.players[playerId].cumulative.reliableGenerations < (state.config.rules.reliabilityPointMaximum ?? 4)
        ? after.pointTarget
        : after.target;
    const prompt = nextBottleneck(after, desired);
    const immediate = after.lightCeiling - before.lightCeiling;
    const forecastLightChange = beforeForecast && afterForecast ? afterForecast.lightCeiling - beforeForecast.lightCeiling : 0;
    const forecastEnergyChange = beforeForecast && afterForecast ? afterForecast.availableNow - beforeForecast.availableNow : 0;
    const currentEnergyChange = after.availableNow - before.availableNow;
    const timing = comparisonMode === "tier"
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
        headline: immediate > 0
                ? `Expected Light this Generation +${immediate}`
                : currentEnergyChange > 0
                    ? `Usable Energy now +${currentEnergyChange}`
                    : forecastLightChange > 0
                        ? `Forecast maximum Light +${forecastLightChange}`
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
            values = ["Normal Build", `+${effect.amount} Other`, "First Build costs more"];
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
            values = [`Knowledge ${permanent}`, `+${effect.amount}`, `Effective ${effective}`];
            const changed = temporaryKnowledgeUnlocks(state, playerId);
            const buildable = changed.filter(item => item.after.legal);
            const stillBlocked = changed.filter(item => !item.after.legal);
            impact = `Permanent Knowledge remains ${permanent}; effective construction Knowledge is ${effective} for this Generation.`;
            if (buildable.length) {
                prompt = `Buildable now: ${buildable.slice(0, 3).map(item => item.technology.name).join(", ")}${buildable.length > 3 ? "…" : ""}.`;
            }
            else if (stillBlocked.length) {
                const first = stillBlocked[0];
                const remaining = first.after.blockers.map(blocker => blocker.label).join(" ");
                prompt = `Knowledge is now sufficient for ${first.technology.name}. Still blocked: ${remaining}`;
            }
            else {
                prompt = "No complete technology requirement changes this Generation, but all Build previews use the temporary Knowledge automatically.";
            }
            break;
        }
        case "demandTargetDelta":
            values = [`Need ${before.target}`, `${effect.amount >= 0 ? "+" : ""}${effect.amount}`, `Need ${after.target}`];
            impact = `The Light requirement changes from ${before.target} to ${after.target}. Your maximum Light possible right now is ${after.lightCeiling}.`;
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
            headline: `At Risk: maximum Light ${snapshot.lightCeiling}, target ${desired}.`,
            detail: best.now,
            action
        };
    }
    return {
        headline: `At Risk: maximum Light ${snapshot.lightCeiling}, target ${desired}.`,
        detail: "No single available upgrade fixes the whole gap.",
        action: "Gather resources, increase Knowledge, or combine a second pathway."
    };
}

// -----------------------------------------------------------------------------
// Educational derived selectors — presentation reads engine-backed calculations
// -----------------------------------------------------------------------------
export function getRequiredLight(state, playerId, generation = state.generation) {
    const player = state.players[playerId];
    if (!player)
        throw new Error(`Unknown player ${playerId}.`);
    if (generation !== state.generation)
        return state.config.demand.reliabilityTargets[generation] ?? 0;
    return demandTarget(state, player);
}
export function getReliabilityTarget(state, playerId, generation = state.generation) {
    const starts = state.config.rules.reliabilityStartsGeneration ?? 5;
    return generation >= starts ? getRequiredLight(state, playerId, generation) : null;
}
export function getCurrentMaximumLight(state, playerId) {
    return systemSnapshot(state, playerId).lightCeiling;
}
function safeDispatchPreview(state, playerId) {
    try {
        const draft = structuredClone(state);
        draft.phase = "generation.dispatch";
        draft.activeTurnIndex = draft.turnOrder.indexOf(playerId);
        const plan = chooseDispatchPlan(draft, draft.players[playerId]);
        return previewDispatch(draft, playerId, plan);
    }
    catch {
        return null;
    }
}
export function getEnergyChainBreakdown(state, playerId) {
    const player = state.players[playerId];
    if (!player)
        throw new Error(`Unknown player ${playerId}.`);
    const snapshot = systemSnapshot(state, playerId);
    const preview = safeDispatchPreview(state, playerId);
    const directByPathway = preview?.energyFlow?.directByPathway ?? {
        solar: snapshot.solar.output,
        wind: snapshot.wind.output,
        hydro: snapshot.hydro.immediate,
        biomass: snapshot.biomass.output,
        fossil: snapshot.fossil.output
    };
    const storageReleasedByPathway = preview?.energyFlow?.storageReleasedByPathway ?? Object.fromEntries(pathways.map(pathway => [pathway, 0]));
    const directGeneration = totalEnergy(directByPathway);
    const storageReleased = totalEnergy(storageReleasedByPathway);
    const usableEnergy = directGeneration + storageReleased;
    const fossilStorageLoss = snapshot.fossil.hasFuel ? (snapshot.fossil.chain?.storageLoss ?? 0) : 0;
    const fossilTransformationLoss = snapshot.fossil.hasFuel ? (snapshot.fossil.chain?.transformationLoss ?? 0) : 0;
    const biomassTransformationLoss = snapshot.biomass.hasFuel ? snapshot.biomass.loss : 0;
    const storageLoss = (preview?.lossBreakdown?.battery ?? 0) + fossilStorageLoss;
    const transformationLoss = Math.max(0, (preview?.lossBreakdown?.thermal ?? (fossilStorageLoss + fossilTransformationLoss + biomassTransformationLoss)) - fossilStorageLoss);
    const deliveredEnergy = preview?.transported ?? Math.min(usableEnergy, snapshot.gridCapacity);
    const lightingLoss = preview?.lossBreakdown?.lighting ?? Math.max(0, deliveredEnergy - snapshot.lightCeiling);
    const lightProduced = preview?.light ?? snapshot.lightCeiling;
    const unusedEnergy = preview?.curtailed ?? Math.max(0, usableEnergy - deliveredEnergy);
    const chargedForNextGeneration = preview?.energyFlow?.chargedForNextGeneration ?? 0;
    const reservoirCapturedForNextGeneration = preview?.energyFlow?.reservoirCapturedForNextGeneration ?? snapshot.hydro.acceptedInflow;
    return {
        generated: directGeneration,
        grossGenerated: directGeneration + fossilStorageLoss + transformationLoss,
        directGeneration,
        storageReleased,
        usableEnergy,
        weatherBonus: getContinentGenerationModifiers(state, playerId, "solar").generationBonus + getContinentGenerationModifiers(state, playerId, "wind").generationBonus,
        storageLoss,
        transformationLoss,
        beforeGrid: usableEnergy,
        gridCapacity: snapshot.gridCapacity,
        deliveredEnergy,
        lightingInput: deliveredEnergy,
        lightingLoss,
        lightProduced,
        maximumLight: snapshot.lightCeiling,
        unusedEnergy,
        chargedForNextGeneration,
        reservoirCapturedForNextGeneration,
        fuelConsumed: preview?.fuelConsumed?.fossilFuel ?? (snapshot.fossil.output > 0 && snapshot.fossil.hasFuel ? 1 : 0),
        biomassConsumed: preview?.fuelConsumed?.biomass ?? (snapshot.biomass.output > 0 && snapshot.biomass.hasFuel ? 1 : 0),
        availableStoredEnergy: snapshot.battery.stored + snapshot.hydro.stored,
        pendingStoredEnergy: preview?.storedPending ?? (snapshot.battery.pending + snapshot.hydro.pending + snapshot.hydro.acceptedInflow),
        sourceByPathway: directByPathway,
        storageReleasedByPathway,
        fossilChain: preview?.fossilChain ?? snapshot.fossil.chain ?? null
    };
}

export function getPrimaryBottleneck(state, playerId, options = {}) {
    const player = state.players[playerId];
    const snapshot = systemSnapshot(state, playerId);
    const target = options.target ?? snapshot.target;
    const chain = getEnergyChainBreakdown(state, playerId);
    if (snapshot.lightCeiling >= target)
        return { type: "none", label: "System ready", explanation: `Your current system can provide the required ${target} Light.` };
    const fossilInstalled = snapshot.fossil.maximum > 0;
    const biomassInstalled = snapshot.biomass.maximum > 0;
    if (snapshot.generationAvailable <= 0 && fossilInstalled && !snapshot.fossil.hasFuel)
        return { type: "fuelSupply", label: "Fuel supply", explanation: "The fossil plant is ready, but it cannot operate without stored Fuel." };
    if (snapshot.generationAvailable <= 0 && biomassInstalled && !snapshot.biomass.hasFuel)
        return { type: "biomassSupply", label: "Biomass supply", explanation: "The Biomass plant is ready, but it requires stored Biomass to run." };
    if (snapshot.gridCapacity < Math.min(target, snapshot.availableNow))
        return { type: "grid", label: "Grid capacity", explanation: `Your sources can provide up to ${snapshot.availableNow} Energy, but the Grid can transport only ${snapshot.gridCapacity}.` };
    if (snapshot.lightingMaximum < Math.min(target, snapshot.availableNow, snapshot.gridCapacity))
        return { type: "lighting", label: "Lighting efficiency", explanation: `${Math.min(snapshot.availableNow, snapshot.gridCapacity)} Energy can reach Lighting, but the current system can produce only ${snapshot.lightingMaximum} Light.` };
    if (chain.transformationLoss > 0 && chain.generated >= target && chain.beforeGrid < target)
        return { type: "transformation", label: "Transformation efficiency", explanation: `${chain.transformationLoss} Energy is lost while converting Fuel or Biomass before it reaches the Grid.` };
    if (chain.storageLoss > 0 && chain.generated >= target && chain.beforeGrid < target)
        return { type: "storage", label: "Storage loss", explanation: `${chain.storageLoss} Energy is lost during storage or recovery before it can be delivered.` };
    return { type: "generation", label: "Generation", explanation: `Your Grid and Lighting can support more, but current sources provide only ${snapshot.availableNow} usable Energy.` };
}
export function getDevelopmentConstraint(state, playerId) {
    const player = state.players[playerId];
    const candidates = state.config.technologies
        .filter(technology => !technology.starter)
        .map(technology => ({ technology, readiness: technologyReadiness(state, playerId, technology), impact: technologyImpactPreview(state, playerId, technology) }))
        .filter(item => !item.readiness.installed && (item.impact.immediateLightChange > 0 || item.impact.forecastLightChange > 0 || item.impact.after.availableNow > item.impact.before.availableNow))
        .sort((a, b) => b.impact.immediateLightChange - a.impact.immediateLightChange || a.readiness.blockerCount - b.readiness.blockerCount);
    const next = candidates[0];
    if (!next)
        return { type: "none", label: "No immediate construction constraint", explanation: "No single available technology changes the current result." };
    const blocker = next.readiness.blockers.find(item => ["knowledge", "constructionMaterials", "criticalMaterials", "prerequisite"].includes(item.kind));
    if (!blocker)
        return { type: "none", label: "Buildable option available", explanation: `${next.technology.name} can be built now.` };
    return { type: blocker.kind === "knowledge" ? "knowledge" : blocker.kind === "prerequisite" ? "prerequisite" : "materials", label: blocker.kind === "knowledge" ? "Knowledge" : blocker.kind === "prerequisite" ? "Prerequisite technology" : "Materials", explanation: blocker.label, technologyId: next.technology.id };
}
export function getActionPreview(state, playerId, action) {
    const player = state.players[playerId];
    const beforeSnapshot = systemSnapshot(state, playerId);
    const beforeResources = Object.fromEntries(resourceOrder.map(resource => [resource, player.resources[resource].warehouse]));
    const draft = structuredClone(state);
    try {
        applyCommand(draft, { type: "developmentAction", playerId, action });
        const afterPlayer = draft.players[playerId];
        const afterSnapshot = systemSnapshot(draft, playerId);
        const afterResources = Object.fromEntries(resourceOrder.map(resource => [resource, afterPlayer.resources[resource].warehouse]));
        return {
            legal: true,
            blockerReasons: [],
            actionsBefore: player.actionsRemaining,
            actionsAfter: afterPlayer.actionsRemaining,
            resourcesBefore: beforeResources,
            resourcesAfter: afterResources,
            maximumLightBefore: beforeSnapshot.lightCeiling,
            maximumLightAfter: afterSnapshot.lightCeiling,
            changedStages: [
                beforeSnapshot.generationAvailable !== afterSnapshot.generationAvailable ? "generation" : null,
                beforeSnapshot.gridCapacity !== afterSnapshot.gridCapacity ? "grid" : null,
                beforeSnapshot.lightingMaximum !== afterSnapshot.lightingMaximum ? "lighting" : null
            ].filter(Boolean),
            immediateEffect: beforeSnapshot.lightCeiling !== afterSnapshot.lightCeiling,
            beforeSnapshot,
            afterSnapshot
        };
    }
    catch (error) {
        return {
            legal: false,
            blockerReasons: [error instanceof Error ? error.message : String(error)],
            actionsBefore: player.actionsRemaining,
            actionsAfter: player.actionsRemaining,
            resourcesBefore: beforeResources,
            resourcesAfter: beforeResources,
            maximumLightBefore: beforeSnapshot.lightCeiling,
            maximumLightAfter: beforeSnapshot.lightCeiling,
            changedStages: [],
            immediateEffect: false,
            beforeSnapshot,
            afterSnapshot: beforeSnapshot
        };
    }
}
export function getConditionRelevance(state, playerId, condition) {
    const preview = conditionImpactPreview(state, playerId, condition);
    if (!preview.relevant)
        return { level: "noCurrentTarget", label: "No current effect", preview };
    const baselineState = structuredClone(state);
    if (baselineState.players[playerId]?.localCondition)
        baselineState.players[playerId].localCondition.adapted = true;
    const beforeBottleneck = getPrimaryBottleneck(baselineState, playerId, { target: preview.before.target });
    const afterBottleneck = getPrimaryBottleneck(state, playerId, { target: preview.after.target });
    const changesResult = preview.before.lightCeiling !== preview.after.lightCeiling || preview.before.target !== preview.after.target;
    const changesBottleneck = beforeBottleneck.type !== afterBottleneck.type;
    const unlocksBuild = condition.effect.kind === "temporaryKnowledge" && temporaryKnowledgeUnlocks(state, playerId).some(item => item.after.legal);
    const changesAction = condition.effect.kind === "firstBuildConstructionDelta";
    if (changesResult || changesBottleneck || unlocksBuild || changesAction)
        return { level: "critical", label: "Changes your result", preview };
    return { level: "activeButNotLimiting", label: "Active, but not your main bottleneck", preview };
}
function metricsForGeneration(state, playerId, generation) {
    return [...state.log].reverse().find(entry => entry.type === "dispatch.resolved" && entry.actorId === playerId && entry.generation === generation)?.data?.metrics ?? null;
}
export function getGenerationExplanation(state, playerId, generation = state.generation) {
    const player = state.players[playerId];
    const metrics = metricsForGeneration(state, playerId, generation) ?? player.currentMetrics;
    const generated = totalEnergy(metrics.grossEnergy);
    const losses = metrics.systemLoss ?? { thermal: 0, battery: 0, lighting: 0, other: 0 };
    const beforeGrid = Math.max(0, generated - losses.thermal - losses.battery - losses.other);
    const deliveredEnergy = metrics.deliveredLight + losses.lighting;
    let bottleneck = "none";
    let takeaway = "The system delivered the Energy available through its current chain.";
    if (!metrics.reliabilityMet) {
        if (losses.lighting > 0) {
            bottleneck = "lighting";
            takeaway = "Enough Energy reached the community, but Standard Lighting converted only part of it into useful Light.";
        }
        else if (metrics.curtailed > 0) {
            bottleneck = "grid";
            takeaway = "Your sources produced Energy that could not all be transported or stored.";
        }
        else if (losses.thermal > 0) {
            bottleneck = "transformation";
            takeaway = "Some source Energy was lost during Fuel or Biomass transformation before it reached the Grid.";
        }
        else if (losses.battery > 0) {
            bottleneck = "storage";
            takeaway = "Storage increased flexibility, but not all stored Energy was recovered.";
        }
        else {
            bottleneck = "generation";
            takeaway = "The system could transport more Energy than it generated; generation was the limiting stage.";
        }
    }
    else if (metrics.reliabilityPointEarned) {
        takeaway = "You built more capacity than required this Generation, creating a resilient margin.";
    }
    return {
        generated,
        afterLosses: beforeGrid,
        deliveredEnergy,
        lightProduced: metrics.deliveredLight,
        requiredLight: metrics.reliabilityTarget,
        reliabilityTarget: Math.min(state.config.demand.maximumLight, metrics.reliabilityTarget + 1),
        demandMet: metrics.reliabilityMet,
        pointEarned: metrics.reliabilityPointEarned,
        stored: metrics.storedEnd,
            storedPending: metrics.storedPendingEnd ?? 0,
        unused: metrics.curtailed,
        losses,
        primaryBottleneck: bottleneck,
        primaryBottleneckLabel: bottleneck === "none" ? "None — demand was met" : bottleneck === "grid" ? "Grid or storage capacity" : bottleneck === "lighting" ? "Lighting efficiency" : bottleneck === "transformation" ? "Transformation efficiency" : bottleneck === "storage" ? "Storage recovery" : "Generation",
        takeaway,
        metrics
    };
}
export function getEndGameDebrief(state, playerId) {
    const player = state.players[playerId];
    const explanations = Array.from({ length: state.config.rules.generations }, (_, index) => getGenerationExplanation(state, playerId, index + 1));
    const bottleneckCounts = {};
    for (const item of explanations)
        bottleneckCounts[item.primaryBottleneck] = (bottleneckCounts[item.primaryBottleneck] ?? 0) + 1;
    const frequent = Object.entries(bottleneckCounts).filter(([key]) => key !== "none").sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";
    const imports = {};
    for (const entry of state.log) {
        if (entry.type === "action.worldMarket" && entry.actorId === playerId) {
            const resource = entry.data?.receive;
            if (resource) imports[resource] = (imports[resource] ?? 0) + 1;
        }
        if (entry.type === "trade.completed" && [entry.data?.aId, entry.data?.bId].includes(playerId)) {
            const received = entry.data?.aId === playerId ? entry.data?.bGives : entry.data?.aGives;
            for (const [resource, amount] of Object.entries(received ?? {})) imports[resource] = (imports[resource] ?? 0) + amount;
        }
    }
    const dependency = Object.entries(imports).sort((a, b) => b[1] - a[1])[0];
    const profile = continentFor(state, player);
    const abilityUses = state.log.filter(entry => entry.actorId === playerId && (entry.type === "continent.recovery" || (entry.type === "action.extract" && (entry.data?.amount ?? 0) > 1))).length;
    const preferredStage = frequent === "grid" ? "transport" : frequent === "lighting" ? "lighting" : frequent === "storage" ? "storage" : frequent === "transformation" ? "transformation" : "capture";
    const preparationEntry = [...state.log].reverse().find(entry => entry.actorId === playerId && entry.type === "action.build" && getTechnology(state, entry.data?.technologyId).stage === preferredStage)
        ?? [...state.log].reverse().find(entry => entry.actorId === playerId && entry.type === "action.build");
    const preparationTechnology = preparationEntry ? getTechnology(state, preparationEntry.data.technologyId) : null;
    const unusedCapacityGenerations = explanations.filter(item => item.generated < item.metrics?.transmissionCapacity && item.metrics?.transmissionCapacity > 0).length;
    return {
        demandMet: player.cumulative.demandMetGenerations ?? 0,
        generations: state.config.rules.generations,
        frequentBottleneck: frequent,
        frequentBottleneckLabel: frequent === "none" ? "No repeated limiting stage" : frequent === "grid" ? "Grid capacity" : frequent === "lighting" ? "Lighting efficiency" : frequent === "transformation" ? "Transformation efficiency" : frequent === "storage" ? "Storage recovery" : "Generation",
        dependencyResource: dependency?.[0] ?? null,
        dependencyAmount: dependency?.[1] ?? 0,
        regionalStrength: abilityUses ? `${profile.name}'s regional ability affected ${abilityUses} recorded action${abilityUses === 1 ? "" : "s"}.` : `You did not need to rely heavily on ${profile.name}'s regional ability.`,
        usefulPreparation: preparationTechnology ? `Building ${preparationTechnology.name} addressed the ${preferredStage} stage identified in your game history.` : "No single construction action dominated your preparation story.",
        unusedOpportunity: unusedCapacityGenerations >= 2 ? `Your Grid could carry more Energy than you generated in ${unusedCapacityGenerations} Generations.` : null,
        reflection: explanations.find((item, index) => item.generated >= item.requiredLight && !item.demandMet)
            ? "You generated substantial Energy but still missed Light in at least one Generation. Which downstream stage would you improve first, and why?"
            : "Which preparation choice made your system most reliable, and why?"
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
        modifiers: result.modifiers
    };
}
export function buildLegality(state, playerId, technology, options = {}) {
    return developmentActionLegality(state, playerId, {
        kind: "build",
        technologyId: technology.id,
        ...(options.recoveryResource ? { recoveryResource: options.recoveryResource } : {})
    });
}
export function technologyReadiness(state, playerId, technologyOrId, options = {}) {
    const player = state.players[playerId];
    const technology = typeof technologyOrId === "string" ? getTechnology(state, technologyOrId) : technologyOrId;
    const cost = effectiveBuildCost(state, player, technology, options);
    const installed = countInstalled(player, technology.id) > 0;
    if (installed) {
        return {
            technology,
            cost,
            legal: false,
            installed: true,
            reason: `${technology.name} is already installed.`,
            blockers: [],
            blockerCount: 0,
            oneBlockerAway: false,
            effectiveKnowledge: cost.effectiveKnowledge,
            knowledgeRequired: cost.knowledgeRequired
        };
    }
    const blockers = [];
    if (state.phase !== "generation.development")
        blockers.push({ kind: "phase", label: "Development phase is not active." });
    if (player.actionsRemaining <= 0)
        blockers.push({ kind: "action", label: "No Development action remains." });
    if (technology.starter && countInstalled(player, technology.id) > 0)
        blockers.push({ kind: "copy", label: `${technology.name} is already included as starting infrastructure.` });
    if (!technology.alwaysAvailable && !state.innovationMarket.visible.includes(technology.id))
        blockers.push({ kind: "availability", label: `${technology.name} is not currently available.` });
    if (technology.copyLimit !== undefined && countInstalled(player, technology.id) >= technology.copyLimit)
        blockers.push({ kind: "copy", label: `${technology.name} is already installed.` });
    if (technology.prerequisiteTechnologyId && countInstalled(player, technology.prerequisiteTechnologyId) < 1) {
        const prerequisite = getTechnology(state, technology.prerequisiteTechnologyId);
        blockers.push({ kind: "prerequisite", label: `Build ${prerequisite.name} first.` });
    }
    if (cost.effectiveKnowledge < cost.knowledgeRequired)
        blockers.push({ kind: "knowledge", label: `Need Knowledge ${cost.knowledgeRequired}; effective Knowledge is ${cost.effectiveKnowledge}.`, missing: cost.knowledgeRequired - cost.effectiveKnowledge });
    const otherMissing = Math.max(0, cost.constructionMaterials - player.resources.constructionMaterials.warehouse);
    const criticalMissing = Math.max(0, cost.criticalMaterials - player.resources.criticalMaterials.warehouse);
    if (otherMissing > 0)
        blockers.push({ kind: "constructionMaterials", label: `Need ${otherMissing} more Other Material${otherMissing === 1 ? "" : "s"}.`, missing: otherMissing });
    if (criticalMissing > 0)
        blockers.push({ kind: "criticalMaterials", label: `Need ${criticalMissing} more Critical Mineral${criticalMissing === 1 ? "" : "s"}.`, missing: criticalMissing });
    const legality = buildLegality(state, playerId, technology, options);
    return {
        technology,
        cost,
        legal: legality.legal,
        installed: false,
        reason: legality.reason,
        blockers,
        blockerCount: blockers.length,
        oneBlockerAway: !legality.legal && blockers.length === 1,
        effectiveKnowledge: cost.effectiveKnowledge,
        knowledgeRequired: cost.knowledgeRequired
    };
}

export function temporaryKnowledgeUnlocks(state, playerId) {
    const player = state.players[playerId];
    if (!player || player.temporaryKnowledge <= 0)
        return [];
    const condition = conditionApplies(state, player);
    const cardAmount = condition?.effect.kind === "temporaryKnowledge" ? condition.effect.amount : 0;
    if (cardAmount <= 0)
        return [];
    const baselinePlayer = { ...player, temporaryKnowledge: Math.max(0, player.temporaryKnowledge - cardAmount) };
    const baselineState = { ...state, players: { ...state.players, [playerId]: baselinePlayer } };
    return state.config.technologies
        .filter(technology => !technology.starter)
        .map(technology => {
            const before = technologyReadiness(baselineState, playerId, technology);
            const after = technologyReadiness(state, playerId, technology);
            const knowledgeWasBlocking = before.blockers.some(blocker => blocker.kind === "knowledge");
            const knowledgeNowSatisfied = !after.blockers.some(blocker => blocker.kind === "knowledge");
            return { technology, before, after, knowledgeWasBlocking, knowledgeNowSatisfied };
        })
        .filter(item => item.knowledgeWasBlocking && item.knowledgeNowSatisfied);
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
    const required = worldMarketRate(state, player, receive);
    if (worldMarketBlocked(state, receive))
        return { legality: { legal: false, reason: "The active Global Event blocks this World Market exchange." }, payment: null, required };
    if ((state.worldMarket?.[receive] ?? 0) <= 0)
        return { legality: { legal: false, reason: `The World Market has no ${receive} remaining.` }, payment: null, required };
    const payment = findImportPayment(player, receive, required);
    if (!payment)
        return { legality: { legal: false, reason: `You need exactly ${required} other Warehouse resources for this World Market exchange.` }, payment: null, required };
    return {
        legality: developmentActionLegality(state, player.id, { kind: "publicImport", receive, payment }),
        payment, required
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
            storedPending: metrics.storedPendingEnd ?? 0,
            curtailed: metrics.curtailed,
            systemLoss,
            lossBreakdown: structuredClone(metrics.systemLoss),
            energyFlow: structuredClone(metrics.energyFlow ?? { directByPathway: Object.fromEntries(pathways.map(pathway => [pathway, 0])), storageReleasedByPathway: Object.fromEntries(pathways.map(pathway => [pathway, 0])), chargedForNextGeneration: 0, reservoirCapturedForNextGeneration: 0 }),
            fossilChain: metrics.fossilChain ? structuredClone(metrics.fossilChain) : null,
            fuelConsumed: structuredClone(metrics.fuelConsumed ?? {}),
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
            storedPending: 0,
            curtailed: 0,
            systemLoss: 0,
            lossBreakdown: { thermal: 0, battery: 0, lighting: 0, other: 0 },
            energyFlow: { directByPathway: Object.fromEntries(pathways.map(pathway => [pathway, 0])), storageReleasedByPathway: Object.fromEntries(pathways.map(pathway => [pathway, 0])), chargedForNextGeneration: 0, reservoirCapturedForNextGeneration: 0 },
            fossilChain: null,
            fuelConsumed: {},
            gridCapacity: 0,
            lightingMaximum: 0
        };
    }
}

