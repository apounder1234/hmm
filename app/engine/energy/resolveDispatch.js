import { conditionApplies } from "../conditions/conditions.js";
import { addEnergy, effectivePathwayOpportunity, emptyEnergy, fuelPlantMaximumOutput, getPlayer, getTechnology, hasTechnology, log, pathways, totalEnergy } from "../helpers.js";
function operational(state, i) { return i.builtGeneration < state.generation || state.config.rules.buildAndOperateSameGeneration || i.builtGeneration === 0; }
function tableValue(table, input) { if (input < 0 || input >= table.length)
    throw new Error(`Input ${input} is outside conversion table.`); return table[input]; }
function withdraw(pool, amount) {
    if (amount > totalEnergy(pool))
        throw new Error("Insufficient Energy in pool.");
    const result = emptyEnergy();
    let remaining = amount;
    for (const pathway of pathways) {
        const take = Math.min(pool[pathway], remaining);
        pool[pathway] -= take;
        result[pathway] = take;
        remaining -= take;
        if (remaining === 0)
            break;
    }
    return result;
}
function withdrawSpecified(pool, request) {
    const out = emptyEnergy();
    for (const p of pathways) {
        const n = request[p] ?? 0;
        if (!Number.isInteger(n) || n < 0)
            throw new Error("Energy allocations must be non-negative integers.");
        if (pool[p] < n)
            throw new Error(`Insufficient ${p} Energy for allocation.`);
        pool[p] -= n;
        out[p] = n;
    }
    return out;
}
function selectRecoveryBreakthroughTarget(state, player, targetId) {
    const c = conditionApplies(state, player);
    if (c?.effect.kind !== "storageRecoveryBonus")
        return;
    if (targetId === null) {
        player.localCondition.selectedTechnologyInstanceId = null;
        return;
    }
    const instance = player.installed.find(i => i.instanceId === targetId);
    if (!instance || getTechnology(state, instance.technologyId).storage?.type !== "battery")
        throw new Error("Recovery Breakthrough target must be an installed Battery.");
    player.localCondition.selectedTechnologyInstanceId = targetId;
}
function storageCapacity(_state, _player, _instance, tech) {
    return Math.max(0, tech.storage?.capacity ?? 0);
}
function gridCapacity(state, player) {
    let capacity = 0;
    for (const i of player.installed) {
        if (!operational(state, i))
            continue;
        const t = getTechnology(state, i.technologyId);
        if (t.stage === "transport")
            capacity += t.capacity + i.temporaryCapacityBonus;
    }
    const c = conditionApplies(state, player);
    if (c?.effect.kind === "gridCapacityDelta")
        capacity += c.effect.amount;
    return Math.max(0, capacity);
}
function lightingConfig(state, player) {
    if (hasTechnology(player, "efficientLighting"))
        return getTechnology(state, "efficientLighting");
    return getTechnology(state, "standardLighting");
}
function localGenerationDelta(state, player, pathway) {
    const c = conditionApplies(state, player);
    if (pathway === "solar" && c?.effect.kind === "solarDelta")
        return c.effect.amount;
    if (pathway === "wind" && c?.effect.kind === "windDelta")
        return c.effect.amount;
    return 0;
}
function captureOutput(state, player, pathway) {
    const continent = state.config.continents.find(c => c.id === player.continentId);
    const cap = player.installed.filter(i => operational(state, i)).map(i => getTechnology(state, i.technologyId)).filter(t => t.pathway === pathway && t.stage === "capture").reduce((n, t) => n + t.capacity, 0);
    const ideal = Math.min(continent.opportunities[pathway], cap);
    const table = state.config.weather[pathway][state.weather.current];
    const base = tableValue(table, ideal);
    const resilience = pathway === "solar" && hasTechnology(player, "advancedSolar")
        ? 1
        : pathway === "wind" && hasTechnology(player, "advancedWind")
            ? 1
            : 0;
    return Math.max(0, Math.min(ideal, base + resilience + localGenerationDelta(state, player, pathway)));
}
function addHydroInflow(state, player) {
    const reservoirs = player.installed.filter(i => operational(state, i) && getTechnology(state, i.technologyId).storage?.type === "reservoir");
    if (reservoirs.length === 0)
        return;
    const continent = state.config.continents.find(c => c.id === player.continentId);
    let inflow = tableValue(state.config.weather.hydro[state.weather.current], continent.opportunities.hydro);
    if (hasTechnology(player, "advancedHydroTurbine"))
        inflow += 1;
    const c = conditionApplies(state, player);
    if (c?.effect.kind === "hydroDelta")
        inflow = Math.max(0, inflow + c.effect.amount);
    for (const r of reservoirs) {
        if (inflow <= 0)
            break;
        const tech = getTechnology(state, r.technologyId);
        const room = storageCapacity(state, player, r, tech) - totalEnergy(r.storageInput);
        const add = Math.max(0, Math.min(room, inflow));
        r.storageInput.hydro += add;
        inflow -= add;
    }
}
function dischargeHydro(state, player, requested) {
    const result = emptyEnergy();
    if (requested === 0)
        return result;
    const turbineCapacity = player.installed.filter(i => operational(state, i)).map(i => getTechnology(state, i.technologyId)).filter(t => t.pathway === "hydro" && t.stage === "transformation").reduce((n, t) => n + t.capacity, 0);
    const continent = state.config.continents.find(c => c.id === player.continentId);
    const max = Math.min(turbineCapacity, continent.opportunities.hydro);
    if (requested > max)
        throw new Error(`Hydro request exceeds dispatch limit ${max}.`);
    let remaining = requested;
    for (const r of player.installed.filter(i => operational(state, i) && getTechnology(state, i.technologyId).storage?.type === "reservoir")) {
        const take = Math.min(r.storageInput.hydro, remaining);
        r.storageInput.hydro -= take;
        result.hydro += take;
        remaining -= take;
        if (remaining === 0)
            break;
    }
    if (remaining > 0)
        throw new Error("Insufficient Reservoir Energy for Hydro dispatch.");
    return result;
}
function dischargeBatteries(state, player, requests) {
    const energy = emptyEnergy();
    let loss = 0;
    const discharged = new Set();
    for (const [instanceId, input] of Object.entries(requests)) {
        if (input === 0)
            continue;
        const i = player.installed.find(x => x.instanceId === instanceId);
        if (!i)
            throw new Error(`Unknown storage instance ${instanceId}.`);
        const t = getTechnology(state, i.technologyId);
        if (t.storage?.type !== "battery")
            throw new Error(`${t.name} is not a Battery.`);
        if (!operational(state, i))
            throw new Error(`${t.name} is not operational.`);
        if (input > totalEnergy(i.storageInput))
            throw new Error(`Battery ${instanceId} lacks stored Energy.`);
        let output = tableValue(t.storage.recovery.outputsByInput, input);
        const condition = conditionApplies(state, player);
        if (condition?.effect.kind === "storageRecoveryBonus" && !player.localCondition?.triggered && player.localCondition?.selectedTechnologyInstanceId === instanceId) {
            output = Math.min(input, output + condition.effect.amount);
            player.localCondition.triggered = true;
        }
        const origin = withdraw(i.storageInput, input);
        const recovered = emptyEnergy();
        let remaining = output;
        for (const p of pathways) {
            const share = input === 0 ? 0 : Math.floor(origin[p] * output / input);
            recovered[p] = Math.min(origin[p], share);
            remaining -= recovered[p];
        }
        for (const p of pathways) {
            if (remaining <= 0)
                break;
            const spare = origin[p] - recovered[p];
            const take = Math.min(spare, remaining);
            recovered[p] += take;
            remaining -= take;
        }
        addEnergy(energy, recovered);
        loss += input - output;
        discharged.add(instanceId);
    }
    return { energy, loss, discharged };
}
function operateFuelPlants(state, player, requests) {
    const energy = emptyEnergy();
    let loss = 0;
    const continent = state.config.continents.find(c => c.id === player.continentId);
    const usedByPathway = { biomass: 0, fossil: 0 };
    const opportunityByPathway = { biomass: effectivePathwayOpportunity(state, player, "biomass"), fossil: effectivePathwayOpportunity(state, player, "fossil") };
    let disruptionUsed = false;
    const c = conditionApplies(state, player);
    for (const i of player.installed) {
        const requested = requests[i.instanceId] ?? 0;
        if (requested === 0)
            continue;
        const t = getTechnology(state, i.technologyId);
        if (!t.fuel || !(t.pathway === "biomass" || t.pathway === "fossil"))
            throw new Error(`${t.name} is not a fuel plant.`);
        if (!operational(state, i))
            throw new Error(`${t.name} is not operational.`);
        if (i.usedThisGeneration)
            throw new Error(`${t.name} has already operated.`);
        let output = requested;
        if (c?.effect.kind === "firstFuelPlantOutputDelta" && !disruptionUsed) {
            output = Math.max(0, output + c.effect.amount);
            disruptionUsed = true;
            player.localCondition.triggered = true;
        }
        const maximumOutput = fuelPlantMaximumOutput(state, player, t);
        if (requested < 1 || requested > maximumOutput)
            throw new Error(`${t.name} requested output outside 1-${maximumOutput}.`);
        const pathway = t.pathway;
        const remainingOpportunity = opportunityByPathway[pathway] - usedByPathway[pathway];
        if (output > remainingOpportunity)
            throw new Error(`${pathway} output exceeds Opportunity.`);
        if (player.resources[t.fuel.resource].warehouse < t.fuel.units)
            throw new Error(`${player.name} lacks ${t.fuel.resource}.`);
        player.resources[t.fuel.resource].warehouse -= t.fuel.units;
        player.currentMetrics.fuelConsumed[t.fuel.resource] = (player.currentMetrics.fuelConsumed[t.fuel.resource] ?? 0) + t.fuel.units;
        energy[pathway] += output;
        usedByPathway[pathway] += output;
        i.usedThisGeneration = true;
        const base = t.loss?.fixedPerOperation ?? 0;
        const actual = Math.max(0, base - i.firstOperationLossReduction);
        loss += actual;
        i.firstOperationLossReduction = 0;
    }
    return { energy, loss };
}
function chargeBatteries(state, player, available, charges, discharged) {
    for (const [instanceId, allocation] of Object.entries(charges)) {
        const amount = totalEnergy(allocation);
        if (amount === 0)
            continue;
        const i = player.installed.find(x => x.instanceId === instanceId);
        if (!i)
            throw new Error(`Unknown storage instance ${instanceId}.`);
        const t = getTechnology(state, i.technologyId);
        if (t.storage?.type !== "battery")
            throw new Error(`${t.name} is not a Battery.`);
        if (discharged.has(instanceId) && !state.config.rules.batteryChargeAndDischargeSameGeneration)
            throw new Error("A Battery cannot charge and discharge in the same Generation.");
        const room = storageCapacity(state, player, i, t) - totalEnergy(i.storageInput);
        if (amount > room)
            throw new Error(`${t.name} storage capacity exceeded.`);
        const moved = withdrawSpecified(available, allocation);
        addEnergy(i.storageInput, moved);
    }
}
function biomassRegrowth(state, player) {
    if ((player.currentMetrics.fuelConsumed.biomass ?? 0) <= 0)
        return;
    const systems = player.installed
        .filter(i => operational(state, i.builtGeneration))
        .map(i => getTechnology(state, i.technologyId))
        .filter(t => t.pathway === "biomass" && (t.biomassRegrowth ?? 0) > 0);
    if (systems.length === 0)
        return;
    let amount = Math.max(...systems.map(t => t.biomassRegrowth ?? 0));
    const c = conditionApplies(state, player);
    if (c?.effect.kind === "biomassRegrowthDelta")
        amount = Math.max(0, amount + c.effect.amount);
    if (c?.effect.kind === "biomassRegrowthSet")
        amount = c.effect.value;
    if (c?.effect.kind === "hydroDelta" && !hasTechnology(player, "basicReservoir") && !hasTechnology(player, "advancedReservoir") && !hasTechnology(player, "advancedHydroTurbine") && c.effect.fallbackBiomassRegrowthDelta !== undefined)
        amount = Math.max(0, amount + c.effect.fallbackBiomassRegrowthDelta);
    const account = player.resources.biomass;
    const before = account.currentContinent;
    account.currentContinent = Math.min(account.printedStarting, account.currentContinent + amount);
    const restored = account.currentContinent - before;
    if (restored > 0 && systems.some(t => t.appliedLearning)) {
        const maximum = state.config.rules.appliedLearningTokenMaximum ?? 2;
        const gained = player.appliedLearningTokens < maximum ? 1 : 0;
        player.appliedLearningTokens = Math.min(maximum, player.appliedLearningTokens + gained);
        player.currentMetrics.appliedLearningGained += gained;
        if (gained > 0)
            log(state, "biomass.appliedLearning", `${player.name} gained 1 Applied Learning token by operating and replenishing Biomass.`, player.id);
    }
}
export function resolveDispatch(state, playerId, plan) {
    if (state.phase !== "generation.dispatch")
        throw new Error("Dispatch is not available in this phase.");
    const player = getPlayer(state, playerId);
    selectRecoveryBreakthroughTarget(state, player, plan.recoveryBreakthroughTargetInstanceId);
    const available = emptyEnergy();
    addHydroInflow(state, player);
    const solar = captureOutput(state, player, "solar"), wind = captureOutput(state, player, "wind");
    available.solar += solar;
    available.wind += wind;
    player.currentMetrics.grossEnergy.solar = solar;
    player.currentMetrics.grossEnergy.wind = wind;
    const hydro = dischargeHydro(state, player, plan.hydroOutputRequested);
    addEnergy(available, hydro);
    player.currentMetrics.grossEnergy.hydro = hydro.hydro;
    const battery = dischargeBatteries(state, player, plan.batteryDischargeInput);
    addEnergy(available, battery.energy);
    if (state.config.systemLoss.countBattery)
        player.currentMetrics.systemLoss.battery += battery.loss;
    const fuel = operateFuelPlants(state, player, plan.fuelPlantOutput);
    addEnergy(available, fuel.energy);
    player.currentMetrics.grossEnergy.biomass = fuel.energy.biomass;
    player.currentMetrics.grossEnergy.fossil = fuel.energy.fossil;
    if (state.config.systemLoss.countThermal)
        player.currentMetrics.systemLoss.thermal += fuel.loss;
    chargeBatteries(state, player, available, plan.batteryCharge, battery.discharged);
    const transported = withdrawSpecified(available, plan.transportByPathway);
    const transportedTotal = totalEnergy(transported);
    const capacity = gridCapacity(state, player);
    if (transportedTotal > capacity)
        throw new Error(`Transport request ${transportedTotal} exceeds Grid capacity ${capacity}.`);
    const lighting = lightingConfig(state, player);
    let input = Math.min(transportedTotal, lighting.maximumInput);
    let light = tableValue(lighting.conversion.outputsByInput, input);
    let lightMax = state.config.demand.maximumLight;
    const c = conditionApplies(state, player);
    if (c?.effect.kind === "lightMaximumDelta")
        lightMax = Math.max(1, lightMax + c.effect.amount);
    light = Math.min(light, lightMax);
    if (state.config.systemLoss.countLighting)
        player.currentMetrics.systemLoss.lighting += Math.max(0, input - light);
    player.currentMetrics.deliveredLight = light;
    player.lightByGeneration[state.generation] = light;
    const target = state.config.demand.reliabilityTargets[state.generation];
    const met = light >= target;
    const pointMaximum = state.config.rules.reliabilityPointMaximum ?? 4;
    const surplus = light > target;
    const pointEarned = surplus && player.cumulative.reliableGenerations < pointMaximum;
    player.currentMetrics.reliabilityTarget = target;
    player.currentMetrics.reliabilityMet = met;
    player.currentMetrics.reliabilityPointEarned = pointEarned;
    player.currentMetrics.reliabilityPointCapped = surplus && !pointEarned;
    player.reliabilityByGeneration[state.generation] = pointEarned;
    player.currentMetrics.curtailed = totalEnergy(available) + Math.max(0, transportedTotal - input);
    player.currentMetrics.storedEnd = player.installed.reduce((n, i) => n + totalEnergy(i.storageInput), 0);
    player.cumulative.totalLight += light;
    if (met)
        player.cumulative.demandMetGenerations = (player.cumulative.demandMetGenerations ?? 0) + 1;
    if (pointEarned)
        player.cumulative.reliableGenerations++;
    player.cumulative.systemLoss.thermal += player.currentMetrics.systemLoss.thermal;
    player.cumulative.systemLoss.battery += player.currentMetrics.systemLoss.battery;
    player.cumulative.systemLoss.lighting += player.currentMetrics.systemLoss.lighting;
    player.cumulative.systemLoss.other += player.currentMetrics.systemLoss.other;
    player.cumulative.curtailment += player.currentMetrics.curtailed;
    biomassRegrowth(state, player);
    log(state, "dispatch.resolved", `${player.name} delivered ${light} Light${pointEarned ? " and earned 1 Reliability Point" : met ? " and met demand" : " but missed demand"}.`, player.id, { metrics: structuredClone(player.currentMetrics) });
}
//# sourceMappingURL=resolveDispatch.js.map