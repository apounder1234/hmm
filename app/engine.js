// @ts-check
// SUNPATHS organised source. Each section has one named responsibility.
import { configHash, validateConfig, hashText, defaultConfig } from "./config.js";
import { createRandomState, shuffle } from "./random.js";
import { activeGlobalEvent, conditionApplies, directTradeBlocked, getCondition, getGlobalEvent, globalEventDrawsThisGeneration, countInstalled, emptyEnergy, getPlayer, getTechnology, log, resourceTypes, applyCompletedUpgradeConsequences, getEffectiveUpgradeCost, getKnowledgeRequirement, emptyMetrics, getStartingTechnologyIds, setOpeningWeather, activateOpeningWeather, revealPreparedAndBeginFounding, addEnergy, fuelPlantMaximumOutput, fossilChainSnapshot, hasRelevantSystem, hasTechnology, pathways, totalEnergy, getContinentGenerationModifiers, gatherAmount, discardCurrentConditions, drawLocalConditions, finalRanking, advanceWeather, setInitialCurrent, setInitialForecast, assertInvariants, getContinentProfile, warehouseTotal, worldMarketBlocked, worldMarketRate } from "./rules.js";
import { beginEnergySummit, currentSummitPlayerId, executeDirectTrade, passSummitTurn, proposeSummitTrade, respondSummitTrade } from "./trade.js";
// -----------------------------------------------------------------------------
// Undo and Generation reset
// -----------------------------------------------------------------------------
export function snapshotState(state) { const copy = structuredClone(state); copy.undo = { stack: [], generationStart: null, lockReason: null }; return JSON.stringify(copy); }
export function pushUndo(state) {
    state.undo.stack.push(snapshotState(state));
    if (state.undo.stack.length > 40)
        state.undo.stack.shift();
}
export function setGenerationStartSnapshot(state) { state.undo.generationStart = snapshotState(state); state.undo.stack = []; state.undo.lockReason = null; }
function restore(state, json, stack, generationStart) { const restored = JSON.parse(json); restored.undo = { stack, generationStart, lockReason: null }; Object.assign(state, restored); }
export function undoLast(state) {
    if (state.phase !== "generation.development")
        throw new Error("Undo is only available during Development.");
    const json = state.undo.stack.at(-1);
    if (!json)
        throw new Error("Nothing is available to undo.");
    restore(state, json, state.undo.stack.slice(0, -1), state.undo.generationStart);
}
export function resetGeneration(state) {
    if (state.phase !== "generation.development")
        throw new Error("Generation reset is only available during Development.");
    if (!state.undo.generationStart)
        throw new Error("No Generation-start snapshot is available.");
    restore(state, state.undo.generationStart, [], state.undo.generationStart);
}
export function lockUndo(state, reason) { state.undo.stack = []; state.undo.lockReason = reason; }
// -----------------------------------------------------------------------------
// Development actions and Founding Projects
// -----------------------------------------------------------------------------
function spendAction(player) {
    if (player.actionsRemaining <= 0)
        throw new Error(`${player.name} has no Development actions remaining.`);
    player.actionsRemaining--;
}
function checkWarehouseRoom(state, player, _resource, amount = 1) {
    if (warehouseTotal(player) + amount > state.config.rules.warehouseMaximum)
        throw new Error(`${player.name}'s Warehouse would exceed its total capacity of ${state.config.rules.warehouseMaximum}.`);
}
function consumePayment(player, payment) {
    let total = 0;
    for (const r of resourceTypes) {
        const n = payment[r] ?? 0;
        if (!Number.isInteger(n) || n < 0)
            throw new Error("Import payments must be non-negative integers.");
        if (player.resources[r].warehouse < n)
            throw new Error(`Insufficient ${r} for import.`);
        total += n;
    }
    for (const r of resourceTypes)
        player.resources[r].warehouse -= payment[r] ?? 0;
    return total;
}
function availableForBuild(state, technology) { return technology.alwaysAvailable || state.innovationMarket.visible.includes(technology.id); }
function refillMarket(state) {
    while (state.innovationMarket.visible.length < state.config.rules.innovationMarketSlots && state.innovationMarket.drawPile.length) {
        state.innovationMarket.visible.push(state.innovationMarket.drawPile.shift());
    }
}
function logContinentBuildEffects(state, player, tech, cost) {
    const regionalPenalties = cost.modifiers.filter(item => ["europeImportedInputs", "northAmericaTransmissionPenalty", "australiaTransmissionPenalty"].includes(item.id));
    for (const modifier of regionalPenalties)
        log(state, "continent.penalty", `${player.name} paid ${modifier.label}: one additional ${modifier.resource === "criticalMaterials" ? "Critical Mineral" : "Other Material"}.`, player.id, { penaltyId: modifier.id, technologyId: tech.id, value: 1 });
    if (cost.consumesLockIn)
        log(state, "continent.penalty", `${player.name} paid the additional Other Material caused by Fossil Lock-In.`, player.id, { penaltyId: "fossilLockIn", technologyId: tech.id, value: 1 });
    if (player.lockInTokens === 1 && tech.pathway === "fossil" && tech.tier !== "basic")
        log(state, "continent.penalty", `${player.name} gained one Fossil Lock-In token. The next advanced non-fossil generation technology costs one additional Other Material.`, player.id, { penaltyId: "fossilLockIn", technologyId: tech.id, value: 1 });
}

function build(state, player, technologyId, options = {}) {
    const tech = getTechnology(state, technologyId);
    if (tech.starter && countInstalled(player, tech.id) > 0)
        throw new Error(`${tech.name} is starting infrastructure and cannot be built again.`);
    if (!availableForBuild(state, tech))
        throw new Error(`${tech.name} is not available.`);
    if (tech.copyLimit !== undefined && countInstalled(player, tech.id) >= tech.copyLimit)
        throw new Error(`${tech.name} copy limit reached.`);
    if (tech.prerequisiteTechnologyId && countInstalled(player, tech.prerequisiteTechnologyId) < 1) {
        const prerequisite = getTechnology(state, tech.prerequisiteTechnologyId);
        throw new Error(`${player.name} must build ${prerequisite.name} before ${tech.name}.`);
    }
    const cost = getEffectiveUpgradeCost(state, player.id, tech, { allowPreparedPathway: options.allowPreparedPathway });
    if (cost.effectiveKnowledge < cost.knowledgeRequired)
        throw new Error(`${player.name} needs Knowledge ${cost.knowledgeRequired} to build ${tech.name}.`);
    if (player.resources.constructionMaterials.warehouse < cost.final.constructionMaterials || player.resources.criticalMaterials.warehouse < cost.final.criticalMaterials)
        throw new Error(`${player.name} needs ${cost.final.constructionMaterials} Other Materials and ${cost.final.criticalMaterials} Critical Minerals for ${tech.name}.`);

    player.resources.constructionMaterials.warehouse -= cost.final.constructionMaterials;
    player.resources.criticalMaterials.warehouse -= cost.final.criticalMaterials;

    const prerequisiteInstance = tech.prerequisiteTechnologyId ? player.installed.find(item => item.technologyId === tech.prerequisiteTechnologyId) : null;
    const instance = {
        instanceId: `${player.id}-${tech.id}-${player.installed.length + 1}`,
        technologyId: tech.id,
        builtGeneration: state.generation,
        storageInput: prerequisiteInstance ? structuredClone(prerequisiteInstance.storageInput) : emptyEnergy(),
        pendingStorageInput: prerequisiteInstance ? structuredClone(prerequisiteInstance.pendingStorageInput ?? emptyEnergy()) : emptyEnergy(),
        usedThisGeneration: false,
        firstOperationLossReduction: 0,
        temporaryCapacityBonus: 0
    };
    let useCapability = cost.usesPreparedCapability;
    if (player.prepared.capabilityId === "transformation" && !player.prepared.capabilityUsed && tech.stage === "transformation" && tech.pathway !== "fossil") {
        instance.firstOperationLossReduction = 1;
        useCapability = true;
    }
    if (player.prepared.capabilityId === "transport" && !player.prepared.capabilityUsed && tech.special === "gridUpgrade") {
        instance.temporaryCapacityBonus = 1;
        useCapability = true;
    }
    if (prerequisiteInstance && tech.replacesPrerequisite !== false)
        player.installed = player.installed.filter(item => item.instanceId !== prerequisiteInstance.instanceId);
    player.installed.push(instance);
    player.currentMetrics.technologiesBuilt.push(tech.id);

    const profile = getContinentProfile(state, player);
    if (profile.resourceRule?.kind === "circularRecovery" && !player.circularRecovery.usedThisGeneration && !player.circularRecovery.pendingResource) {
        const spent = [];
        if (cost.final.constructionMaterials > 0) spent.push("constructionMaterials");
        if (cost.final.criticalMaterials > 0) spent.push("criticalMaterials");
        if (spent.length) {
            const requested = options.recoveryResource;
            player.circularRecovery.pendingResource = spent.includes(requested) ? requested : spent[0];
        }
    }
    if (cost.modifiers.some(item => item.id === "materialsShortage"))
        player.localCondition.triggered = true;
    if (cost.modifiers.some(item => item.id === "globalFirstBuild")) {
        player.globalEventUsage ??= { buildUsed: false, worldMarketUsed: false, biomassPenaltyUsed: false };
        player.globalEventUsage.buildUsed = true;
        player.currentMetrics.globalEventEffects.push("firstBuildResourceDelta");
    }
    if (cost.usesPreparedPathway)
        player.prepared.pathwayUsed = true;
    if (useCapability)
        player.prepared.capabilityUsed = true;
    applyCompletedUpgradeConsequences(state, player.id, tech, cost);
    logContinentBuildEffects(state, player, tech, cost);
    if (!tech.alwaysAvailable) {
        state.innovationMarket.visible = state.innovationMarket.visible.filter(id => id !== tech.id);
        refillMarket(state);
    }
    const verb = prerequisiteInstance && tech.replacesPrerequisite !== false ? "upgraded to" : "built";
    log(state, "action.build", `${player.name} ${verb} ${tech.name} for ${cost.final.constructionMaterials} Other Materials and ${cost.final.criticalMaterials} Critical Minerals.`, player.id, { technologyId: tech.id, replacedTechnologyId: prerequisiteInstance && tech.replacesPrerequisite !== false ? prerequisiteInstance.technologyId : null, knowledgeRequired: cost.knowledgeRequired, cost: cost.final, modifiers: cost.modifiers, circularRecoveryPending: player.circularRecovery.pendingResource });
}

export function foundingProjectDefinition(state, playerId) {
    const player = getPlayer(state, playerId);
    const pathway = state.config.preparedPathways.find(item => item.id === player.prepared.pathwayId);
    if (!pathway)
        throw new Error(`${player.name} has no Starting Pathway.`);
    const technology = getTechnology(state, pathway.foundingTechnologyId);
    const costResult = getEffectiveUpgradeCost(state, player.id, technology, { allowPreparedPathway: false });
    return { kind: "technology", name: technology.name, technology, cost: costResult.final, costResult };
}
export function canCompleteFoundingProject(state, playerId) {
    const player = getPlayer(state, playerId);
    const project = foundingProjectDefinition(state, playerId);
    return player.resources.constructionMaterials.warehouse >= project.cost.constructionMaterials
        && player.resources.criticalMaterials.warehouse >= project.cost.criticalMaterials;
}
export function resolveFoundingProject(state, playerId, complete) {
    if (state.phase !== "setup.foundingProjects")
        throw new Error("Founding Projects are not active.");
    const player = getPlayer(state, playerId);
    if (player.prepared.foundingProjectResolved)
        throw new Error(`${player.name}'s Founding Project is already resolved.`);
    const project = foundingProjectDefinition(state, playerId);
    if (!complete) {
        player.prepared.foundingProjectResolved = true;
        player.prepared.foundingProjectDeferred = true;
        log(state, "founding.deferred", `${player.name} deferred ${project.name}; the Starting Pathway becomes a one-use Blueprint later.`, player.id);
        return;
    }
    if (!canCompleteFoundingProject(state, playerId))
        throw new Error(`${player.name} needs ${project.cost.constructionMaterials} Other Materials and ${project.cost.criticalMaterials} Critical Minerals for ${project.name}.`);
    player.resources.constructionMaterials.warehouse -= project.cost.constructionMaterials;
    player.resources.criticalMaterials.warehouse -= project.cost.criticalMaterials;
    const tech = project.technology;
    const instance = { instanceId: `${player.id}-${tech.id}-${player.installed.length + 1}`, technologyId: tech.id, builtGeneration: 0, storageInput: emptyEnergy(), pendingStorageInput: emptyEnergy(), usedThisGeneration: false, firstOperationLossReduction: 0, temporaryCapacityBonus: 0 };
    player.installed.push(instance);
    if (project.costResult) {
        applyCompletedUpgradeConsequences(state, player.id, tech, project.costResult);
        logContinentBuildEffects(state, player, tech, project.costResult);
    }
    player.prepared.pathwayUsed = true;
    log(state, "founding.completed", `${player.name} completed ${tech.name} before Generation 1 without using a Development action.`, player.id, { technologyId: tech.id });
    player.prepared.foundingProjectResolved = true;
    player.prepared.foundingProjectCompleted = true;
}
export function performDevelopmentAction(state, playerId, action) {
    if (state.phase !== "generation.development")
        throw new Error("Development actions are not allowed in this phase.");
    const player = getPlayer(state, playerId);
    switch (action.kind) {
        case "extract":
        case "harvestBiomass": { // retained command alias for older saves/UI; canonical rule is extraction
            const resource = action.kind === "harvestBiomass" ? "biomass" : action.resource;
            const account = player.resources[resource];
            const profile = getContinentProfile(state, player);
            const normalYield = state.config.resources?.normalExtractionYield ?? 1;
            const specialtyAvailable = profile.resourceRule?.kind === "extraction"
                && profile.resourceRule.resource === resource
                && (player.regionalExtractionUsesThisGeneration ?? 0) < (profile.resourceRule.maximumUsesPerGeneration ?? 1);
            const amount = gatherAmount(state, player, resource);
            if (account.currentContinent <= 0)
                throw new Error(`No ${resource} remains in regional stock.`);
            if (amount <= 0)
                throw new Error(`${player.name}'s Warehouse cannot receive ${resource}.`);
            spendAction(player);
            account.currentContinent -= amount;
            account.warehouse += amount;
            if (specialtyAvailable && profile.resourceRule?.yield > normalYield)
                player.regionalExtractionUsesThisGeneration = (player.regionalExtractionUsesThisGeneration ?? 0) + 1;
            player.currentMetrics.resourcesExtracted[resource] = (player.currentMetrics.resourcesExtracted[resource] ?? 0) + amount;
            log(state, "action.extract", `${player.name} extracted ${amount} ${resource}.`, player.id, { resource, amount });
            return true;
        }
        case "research": {
            if (player.knowledge >= state.config.rules.knowledgeMaximum)
                throw new Error("Knowledge is already at its maximum.");
            const nextLevel = player.knowledge + 1;
            const printedCost = state.config.knowledge?.advancementCosts?.[nextLevel];
            if (!printedCost)
                throw new Error(`Knowledge ${nextLevel} has no configured learning cost.`);
            let generalCost = printedCost.constructionMaterials;
            const criticalCost = printedCost.criticalMaterials;
            let preparedDiscount = false;
            if (player.prepared.capabilityId === "research" && !player.prepared.capabilityUsed && generalCost > 0) {
                generalCost--;
                preparedDiscount = true;
            }
            const useAppliedLearning = player.appliedLearningTokens > 0 && generalCost > 0;
            if (useAppliedLearning) generalCost--;
            if (player.resources.constructionMaterials.warehouse < generalCost || player.resources.criticalMaterials.warehouse < criticalCost)
                throw new Error(`${player.name} needs ${generalCost} Other Materials and ${criticalCost} Critical Minerals to reach Knowledge ${nextLevel}.`);
            spendAction(player);
            player.resources.constructionMaterials.warehouse -= generalCost;
            player.resources.criticalMaterials.warehouse -= criticalCost;
            if (useAppliedLearning) {
                player.appliedLearningTokens--;
                player.currentMetrics.appliedLearningSpent++;
            }
            if (preparedDiscount) player.prepared.capabilityUsed = true;
            player.knowledge = nextLevel;
            player.currentMetrics.knowledgeGained++;
            const centre = player.installed.find(i => getTechnology(state, i.technologyId).special === "researchCentre" && !i.usedThisGeneration);
            if (centre) {
                player.temporaryKnowledge++;
                centre.usedThisGeneration = true;
            }
            log(state, "action.research", `${player.name} increased permanent Knowledge to ${player.knowledge} for ${generalCost} Other Materials and ${criticalCost} Critical Minerals${useAppliedLearning ? ", using 1 Applied Learning token" : ""}.`, player.id, { nextLevel, generalCost, criticalCost, appliedLearningUsed: useAppliedLearning });
            return true;
        }
        case "build":
            spendAction(player);
            try {
                build(state, player, action.technologyId, { recoveryResource: action.recoveryResource });
            }
            catch (error) {
                player.actionsRemaining++;
                throw error;
            }
            return true;
        case "publicImport": { // World Market exchange: free action, fixed 2-for-1
            if (!state.config.trade.publicImportEnabled)
                throw new Error("World Market exchange is disabled.");
            if (!resourceTypes.includes(action.receive))
                throw new Error("Unknown World Market resource.");
            if (worldMarketBlocked(state, action.receive))
                throw new Error("The active Global Event blocks this World Market exchange.");
            const required = worldMarketRate(state, player, action.receive);
            if (!Number.isInteger(required) || required < 1)
                throw new Error("World Market exchange rate is invalid.");
            if ((state.worldMarket?.[action.receive] ?? 0) <= 0)
                throw new Error(`The World Market has no ${action.receive} remaining.`);
            if ((action.payment?.[action.receive] ?? 0) > 0)
                throw new Error("The received resource cannot pay for its own exchange.");
            const payment = action.payment ?? {};
            const paymentTotal = resourceTypes.reduce((n, resource) => n + (payment[resource] ?? 0), 0);
            if (paymentTotal !== required)
                throw new Error(`World Market exchange requires exactly ${required} resources.`);
            for (const resource of resourceTypes) {
                const amount = payment[resource] ?? 0;
                if (!Number.isInteger(amount) || amount < 0)
                    throw new Error("World Market payments must be non-negative integers.");
                if (player.resources[resource].warehouse < amount)
                    throw new Error(`Insufficient ${resource} for World Market payment.`);
            }
            const finalWarehouse = resourceTypes.reduce((n, resource) => n + player.resources[resource].warehouse - (payment[resource] ?? 0), 0) + 1;
            if (finalWarehouse > state.config.rules.warehouseMaximum)
                throw new Error(`${player.name}'s Warehouse would exceed capacity.`);
            // Apply only after every validation has succeeded.
            for (const resource of resourceTypes) {
                const amount = payment[resource] ?? 0;
                player.resources[resource].warehouse -= amount;
                state.worldMarket[resource] = (state.worldMarket[resource] ?? 0) + amount;
            }
            state.worldMarket[action.receive]--;
            player.resources[action.receive].warehouse++;
            player.currentMetrics.importsCompleted++;
            player.currentMetrics.resourcesImported[action.receive] = (player.currentMetrics.resourcesImported[action.receive] ?? 0) + 1;
            player.globalEventUsage ??= { buildUsed: false, worldMarketUsed: false, biomassPenaltyUsed: false };
            player.globalEventUsage.worldMarketUsed = true;
            log(state, "action.worldMarket", `${player.name} exchanged ${required} Warehouse resource${required === 1 ? "" : "s"} for 1 ${action.receive} without spending a Development action.`, player.id, { receive: action.receive, payment: structuredClone(payment), required });
            return false;
        }
        case "adapt": {
            const active = player.localCondition;
            if (!active)
                throw new Error("No Local Condition to adapt to.");
            const def = getCondition(state, active.definitionId);
            if (!("adaptable" in def.effect) || !def.effect.adaptable)
                throw new Error(`${def.name} has no Adapt response.`);
            if (active.adapted)
                throw new Error("Local Condition was already adapted to.");
            spendAction(player);
            active.adapted = true;
            log(state, "action.adapt", `${player.name} adapted to ${def.name}.`, player.id);
            return true;
        }
        case "pass":
            spendAction(player);
            log(state, "action.pass", `${player.name} passed.`, player.id);
            return true;
        default:
            throw new Error(`Unknown Development action ${action.kind}.`);
    }
}

// -----------------------------------------------------------------------------
// Game-state creation
// -----------------------------------------------------------------------------
function createLocalDeck(config, state) {
    const cards = config.localConditions.flatMap(def => Array.from({ length: def.copies }, (_, i) => ({ cardId: `${def.id}-${i + 1}`, definitionId: def.id })));
    return { drawPile: shuffle(cards, state.streams.conditions), discardPile: [], resetAtGenerationFive: false };
}
function createGlobalDeck(config, state) {
    const cards = (config.globalEvents ?? []).map(definition => ({ cardId: definition.id, definitionId: definition.id }));
    return { drawPile: shuffle(cards, state.streams.globalEvents ?? state.streams.conditions), discardPile: [], activeDefinitionId: null, activeCardId: null, history: {} };
}
function drawGlobalEvent(state) {
    state.globalEvents.activeDefinitionId = null;
    state.globalEvents.activeCardId = null;
    if (!globalEventDrawsThisGeneration(state))
        return null;
    const card = state.globalEvents.drawPile.shift();
    if (!card)
        throw new Error("Global Event deck unexpectedly empty.");
    state.globalEvents.activeDefinitionId = card.definitionId;
    state.globalEvents.activeCardId = card.cardId;
    state.globalEvents.history[state.generation] = card.definitionId;
    const event = getGlobalEvent(state, card.definitionId);
    log(state, "globalEvent.drawn", `${event.name} affects every player this Generation.`, null, { globalEvent: event.id });
    return event;
}
function clearGlobalEvent(state) {
    if (state.globalEvents?.activeDefinitionId)
        state.globalEvents.discardPile.push({ cardId: state.globalEvents.activeCardId, definitionId: state.globalEvents.activeDefinitionId });
    if (state.globalEvents) {
        state.globalEvents.activeDefinitionId = null;
        state.globalEvents.activeCardId = null;
    }
}

function createMarket(config, state) {
    const advanced = shuffle(config.technologies.filter(t => !t.starter && !t.alwaysAvailable).map(t => t.id), state.streams.market);
    return { drawPile: advanced.slice(config.rules.innovationMarketSlots), visible: advanced.slice(0, config.rules.innovationMarketSlots) };
}
function createPlayer(config, setup) {
    const continent = config.continents.find(c => c.id === setup.continentId);
    if (!continent)
        throw new Error(`Unknown continent ${setup.continentId}`);
    const resources = {};
    for (const resource of resourceTypes) {
        const printed = continent.printedResources[resource];
        const warehouse = continent.startingWarehouse[resource];
        if (!Number.isInteger(warehouse) || warehouse < 0 || warehouse > printed)
            throw new Error(`${continent.name} has an invalid starting Warehouse value for ${resource}.`);
        resources[resource] = { printedStarting: printed, currentContinent: printed - warehouse, warehouse, recoveredToStock: 0 };
    }
    const warehouseTotal = resourceTypes.reduce((sum, resource) => sum + resources[resource].warehouse, 0);
    if (warehouseTotal !== config.rules.openingWarehouseSize)
        throw new Error(`${continent.name} must begin with exactly ${config.rules.openingWarehouseSize} ready resources; configured ${warehouseTotal}.`);
    const startingIds = getStartingTechnologyIds({ config }, continent);
    const installed = startingIds.map((technologyId, index) => ({ instanceId: `${setup.id}-${technologyId}-${index + 1}`, technologyId, builtGeneration: 0, storageInput: emptyEnergy(), pendingStorageInput: emptyEnergy(), usedThisGeneration: false, firstOperationLossReduction: 0, temporaryCapacityBonus: 0 }));
    return {
        id: setup.id, name: setup.name, continentId: setup.continentId, controller: setup.controller,
        resources, knowledge: continent.startingKnowledge, temporaryKnowledge: 0, appliedLearningTokens: 0,
        prepared: { pathwayId: null, capabilityId: null, pathwayUsed: false, capabilityUsed: false, foundingProjectResolved: false, foundingProjectCompleted: false, foundingProjectDeferred: false },
        summitTrades: 0, lockInTokens: 0,
        circularRecovery: { pendingResource: null, usedThisGeneration: false, lastRecovered: null },
        regionalExtractionUsesThisGeneration: 0,
        globalEventUsage: { buildUsed: false, worldMarketUsed: false, biomassPenaltyUsed: false },
        installed, localCondition: null, actionsRemaining: 0, completedTrades: 0,
        lightByGeneration: {}, reliabilityByGeneration: {},
        cumulative: { totalLight: 0, reliableGenerations: 0, demandMetGenerations: 0, systemLoss: { thermal: 0, battery: 0, lighting: 0, other: 0 }, curtailment: 0 },
        currentMetrics: emptyMetrics(config.demand.reliabilityTargets[1] ?? 2)
    };
}

export function createGame(config, players, seed, options = {}) {
    const errors = validateConfig(config);
    if (errors.length)
        throw new Error(`Invalid configuration:\n${errors.join("\n")}`);
    if (players.length < 1 || players.length > 6)
        throw new Error("Game requires one to six players.");
    if (new Set(players.map(p => p.continentId)).size !== players.length)
        throw new Error("Continents must be unique.");
    const rng = createRandomState(seed);
    const playerMap = Object.fromEntries(players.map(p => [p.id, createPlayer(config, p)]));
    const openingMode = options.openingMode ?? config.opening?.defaultMode ?? "startingPlan";
    const state = {
        schemaVersion: "1.6.0", engineVersion: "0.23.0-stable-viewer-opening-forecast",
        gameId: `game-${configHash(config)}-${seed}-${players.map(p => p.id).join("-")}`,
        config: structuredClone(config), configHash: configHash(config), seed,
        debugMode: options.debugMode ?? false, executionMode: options.executionMode ?? "interactive", rng,
        phase: "setup.preparedSelection", generation: 0, actionRound: 1,
        turnOrder: players.map(p => p.id),
        firstPlayerIndex: options.initialFirstPlayerIndex === undefined ? 0 : Math.max(0, Math.min(players.length - 1, Math.floor(options.initialFirstPlayerIndex))),
        activeTurnIndex: options.initialFirstPlayerIndex === undefined ? 0 : Math.max(0, Math.min(players.length - 1, Math.floor(options.initialFirstPlayerIndex))),
        players: playerMap,
        worldMarket: structuredClone(config.trade.worldMarketStarting ?? { fossilFuel: 5, biomass: 5, constructionMaterials: 5, criticalMaterials: 5 }),
        opening: {
            mode: openingMode,
            revealed: false,
            summit: { round: 0, direction: null, order: [], activeIndex: 0, pendingOffer: null, lastResolution: null, completed: openingMode !== "energySummit" },
            foundingOrder: players.map(p => p.id), foundingIndex: 0
        },
        weather: { currentDie: "A", current: null, forecastDie: "B", forecast: null, history: {} },
        localConditions: createLocalDeck(config, rng), globalEvents: createGlobalDeck(config, rng), innovationMarket: createMarket(config, rng), log: [], completed: false, results: null,
        undo: { stack: [], generationStart: null, lockReason: null }
    };
    log(state, "game.created", `Created SUNPATHS game with ${players.length} players and seed ${seed}.`, null, { openingMode });
    return state;
}
// -----------------------------------------------------------------------------
// Energy Dispatch and Light resolution
// -----------------------------------------------------------------------------
function operational(state, i) { return i.builtGeneration < state.generation || state.config.rules.buildAndOperateSameGeneration || i.builtGeneration === 0; }
function tableValue(table, input) {
    if (input < 0 || input >= table.length)
        throw new Error(`Input ${input} is outside conversion table.`);
    return table[input];
}
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
    if (c?.effect.kind === "gridCapacityDelta") {
        const protectedBySmartGrid = c.effect.amount < 0 && hasTechnology(player, "smartGrid");
        if (!protectedBySmartGrid)
            capacity += c.effect.amount;
    }
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
    const capacity = player.installed
        .filter(instance => operational(state, instance))
        .map(instance => getTechnology(state, instance.technologyId))
        .filter(technology => technology.pathway === pathway && technology.stage === "capture")
        .reduce((sum, technology) => sum + technology.capacity, 0);
    const table = state.config.weather[pathway][state.weather.current];
    const base = tableValue(table, Math.min(table.length - 1, capacity));
    const local = localGenerationDelta(state, player, pathway);
    const signature = getContinentGenerationModifiers(state, player.id, pathway).generationBonus;
    const pathwayMaximum = state.config.weather?.pathwayGenerationMaximum ?? 4;
    const outputLimit = Math.min(pathwayMaximum, capacity);
    const withoutSignature = Math.max(0, Math.min(outputLimit, base + local));
    const output = Math.max(0, Math.min(outputLimit, base + local + signature));
    const gained = Math.max(0, output - withoutSignature);
    if (gained > 0) {
        player.currentMetrics.continentAbilityValue += gained;
        player.currentMetrics.continentAbilityActivations++;
        log(state, "continent.signature", `${player.name}'s ${pathway} signature added ${gained} Energy.`, player.id, { pathway, value: gained });
    }
    return output;
}

function activeHydroSystem(state, player) {
    const instances = player.installed
        .filter(instance => operational(state, instance))
        .filter(instance => getTechnology(state, instance.technologyId).pathway === "hydro")
        .sort((a, b) => (getTechnology(state, b.technologyId).hydro?.totalMaximum ?? 0) - (getTechnology(state, a.technologyId).hydro?.totalMaximum ?? 0));
    return instances[0] ?? null;
}
function addHydroInflow(state, player) {
    const instance = activeHydroSystem(state, player);
    if (!instance)
        return 0;
    const technology = getTechnology(state, instance.technologyId);
    const hydro = technology.hydro;
    if (!hydro || !technology.storage || hydro.inflowCaptureMaximum <= 0)
        return 0;
    instance.pendingStorageInput ??= emptyEnergy();
    let inflow = tableValue(state.config.weather.hydro[state.weather.current], Math.min(4, hydro.inflowCaptureMaximum));
    const condition = conditionApplies(state, player);
    if (condition?.effect.kind === "hydroDelta")
        inflow = Math.max(0, inflow + condition.effect.amount);
    const signature = getContinentGenerationModifiers(state, player.id, "hydro").hydroDelta;
    if (signature > 0) {
        inflow += signature;
        player.currentMetrics.continentAbilityValue += signature;
        player.currentMetrics.continentAbilityActivations++;
        log(state, "continent.signature", `${player.name}'s Hydro signature added ${signature} future Reservoir Energy.`, player.id, { pathway: "hydro", value: signature });
    }
    const room = Math.max(0, technology.storage.capacity - totalEnergy(instance.storageInput) - totalEnergy(instance.pendingStorageInput));
    const captured = Math.min(room, hydro.inflowCaptureMaximum, Math.max(0, inflow));
    instance.pendingStorageInput.hydro += captured;
    return captured;
}
function dischargeHydro(state, player, requested) {
    const result = emptyEnergy();
    const instance = activeHydroSystem(state, player);
    if (!instance) {
        if (requested !== 0)
            throw new Error("No Hydro system is installed.");
        return { energy: result, immediate: 0, released: 0 };
    }
    const technology = getTechnology(state, instance.technologyId);
    const hydro = technology.hydro ?? { immediateOutput: 0, releaseMaximum: 0, totalMaximum: 0 };
    if (!Number.isInteger(requested) || requested < 0 || requested > hydro.totalMaximum)
        throw new Error(`Hydro request exceeds dispatch limit ${hydro.totalMaximum}.`);
    const immediate = Math.min(requested, hydro.immediateOutput);
    result.hydro += immediate;
    const storedNeeded = Math.max(0, requested - immediate);
    if (storedNeeded > hydro.releaseMaximum)
        throw new Error(`Hydro release exceeds ${hydro.releaseMaximum}.`);
    if (storedNeeded > totalEnergy(instance.storageInput))
        throw new Error("Insufficient previously stored Reservoir Energy for Hydro dispatch.");
    let releasedAmount = 0;
    if (storedNeeded > 0) {
        const released = withdraw(instance.storageInput, storedNeeded);
        releasedAmount = released.hydro;
        result.hydro += releasedAmount;
    }
    return { energy: result, immediate, released: releasedAmount };
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
    let disruptionUsed = false;
    const condition = conditionApplies(state, player);
    const globalEvent = activeGlobalEvent(state);
    let fossilGross = 0;
    let fossilStorageLoss = 0;
    let fossilTransformationLoss = 0;
    for (const instance of player.installed) {
        const requested = requests[instance.instanceId] ?? 0;
        if (requested === 0) continue;
        const technology = getTechnology(state, instance.technologyId);
        const isBiomassPlant = technology.pathway === "biomass" && technology.fuel?.resource === "biomass";
        const isLegacyFossilPlant = technology.pathway === "fossil" && technology.fossilRole === "legacyPlant";
        if (!isBiomassPlant && !isLegacyFossilPlant)
            throw new Error(`${technology.name} is not an operable fuel plant.`);
        if (!operational(state, instance))
            throw new Error(`${technology.name} is not operational.`);
        if (instance.usedThisGeneration)
            throw new Error(`${technology.name} has already operated.`);
        const maximumOutput = fuelPlantMaximumOutput(state, player, technology);
        if (!Number.isInteger(requested) || requested < 1 || requested > maximumOutput)
            throw new Error(`${technology.name} requested output outside 1-${maximumOutput}.`);
        const resource = isLegacyFossilPlant ? "fossilFuel" : "biomass";
        if (player.resources[resource].warehouse < 1)
            throw new Error(`${player.name} lacks ${resource}.`);
        player.resources[resource].warehouse--;
        player.currentMetrics.fuelConsumed[resource] = (player.currentMetrics.fuelConsumed[resource] ?? 0) + 1;
        let delivered = requested;
        if (condition?.effect.kind === "firstFuelPlantOutputDelta" && !disruptionUsed) {
            delivered = Math.max(0, delivered + condition.effect.amount);
            disruptionUsed = true;
            player.localCondition.triggered = true;
        }
        if (technology.pathway === "biomass"
            && globalEvent?.effect.kind === "firstBiomassOutputDelta"
            && !player.globalEventUsage?.biomassPenaltyUsed) {
            delivered = Math.max(0, delivered + globalEvent.effect.amount);
            player.globalEventUsage ??= { buildUsed: false, worldMarketUsed: false, biomassPenaltyUsed: false };
            player.globalEventUsage.biomassPenaltyUsed = true;
            player.currentMetrics.globalEventEffects.push("firstBiomassOutputDelta");
        }
        energy[technology.pathway] += delivered;
        instance.usedThisGeneration = true;
        if (isLegacyFossilPlant) {
            const chain = fossilChainSnapshot(state, player);
            fossilGross += chain.grossEnergy;
            fossilStorageLoss += chain.storageLoss;
            fossilTransformationLoss += chain.transformationLoss;
            loss += chain.storageLoss + chain.transformationLoss + Math.max(0, requested - delivered);
        }
        else {
            const baseLoss = technology.loss?.fixedPerOperation ?? 0;
            const actualLoss = Math.max(0, baseLoss - instance.firstOperationLossReduction);
            loss += actualLoss + Math.max(0, requested - delivered);
            instance.firstOperationLossReduction = 0;
        }
    }
    return { energy, loss, fossilGross, fossilStorageLoss, fossilTransformationLoss };
}

function chargeBatteries(state, player, available, charges, discharged) {
    let charged = 0;
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
        i.pendingStorageInput ??= emptyEnergy();
        const room = storageCapacity(state, player, i, t) - totalEnergy(i.storageInput) - totalEnergy(i.pendingStorageInput);
        if (amount > room)
            throw new Error(`${t.name} storage capacity exceeded.`);
        const moved = withdrawSpecified(available, allocation);
        addEnergy(i.pendingStorageInput, moved);
        charged += amount;
    }
    return charged;
}
function biomassRegrowth(state, player) {
    if ((player.currentMetrics.fuelConsumed.biomass ?? 0) <= 0)
        return 0;
    let amount = Math.min(state.config.biomassRules?.baseRegrowth ?? 1, state.config.biomassRules?.maximumBaseRegrowthPerGeneration ?? 1);
    const condition = conditionApplies(state, player);
    if (condition?.effect.kind === "biomassRegrowthDelta")
        amount = Math.max(0, amount + condition.effect.amount);
    if (condition?.effect.kind === "biomassRegrowthSet")
        amount = Math.max(0, condition.effect.value);
    if (condition?.effect.kind === "hydroDelta"
        && condition.effect.fallbackBiomassRegrowthDelta !== undefined
        && !hasRelevantSystem(state, player, "hydroDelta"))
        amount = Math.max(0, amount + condition.effect.fallbackBiomassRegrowthDelta);
    const globalEvent = activeGlobalEvent(state);
    if (globalEvent?.effect.kind === "harvestFailure")
        amount = Math.max(0, globalEvent.effect.biomassRegrowth);
    const account = player.resources.biomass;
    const before = account.currentContinent;
    account.currentContinent = Math.min(account.printedStarting, account.currentContinent + amount);
    const restored = account.currentContinent - before;
    player.currentMetrics.biomassRegrown = restored;
    if (restored > 0)
        log(state, "biomass.regrowth", `${player.name} restored ${restored} Biomass to remaining regional stock.`, player.id, { restored });
    return restored;
}

export function resolveDispatch(state, playerId, plan) {
    if (state.phase !== "generation.dispatch")
        throw new Error("Dispatch is not available in this phase.");
    const player = getPlayer(state, playerId);
    selectRecoveryBreakthroughTarget(state, player, plan.recoveryBreakthroughTargetInstanceId);
    const available = emptyEnergy();
    const reservoirCaptured = addHydroInflow(state, player);
    const solar = captureOutput(state, player, "solar"), wind = captureOutput(state, player, "wind");
    available.solar += solar;
    available.wind += wind;
    player.currentMetrics.grossEnergy.solar = solar;
    player.currentMetrics.grossEnergy.wind = wind;
    const hydro = dischargeHydro(state, player, plan.hydroOutputRequested);
    addEnergy(available, hydro.energy);
    player.currentMetrics.grossEnergy.hydro = hydro.energy.hydro;
    const battery = dischargeBatteries(state, player, plan.batteryDischargeInput);
    addEnergy(available, battery.energy);
    if (state.config.systemLoss.countBattery)
        player.currentMetrics.systemLoss.battery += battery.loss;
    const fuel = operateFuelPlants(state, player, plan.fuelPlantOutput);
    addEnergy(available, fuel.energy);
    player.currentMetrics.grossEnergy.biomass = fuel.energy.biomass;
    player.currentMetrics.grossEnergy.fossil = fuel.fossilGross;
    if (fuel.fossilGross > 0) {
        const chain = fossilChainSnapshot(state, player);
        player.currentMetrics.fossilChain = { ...chain, requestedOutput: fuel.energy.fossil, energyReachingGridPool: fuel.energy.fossil };
    }
    if (state.config.systemLoss.countThermal)
        player.currentMetrics.systemLoss.thermal += fuel.loss;
    const chargedForNextGeneration = chargeBatteries(state, player, available, plan.batteryCharge, battery.discharged);
    player.currentMetrics.energyFlow = {
        directByPathway: { solar, wind, hydro: hydro.immediate, biomass: fuel.energy.biomass, fossil: fuel.energy.fossil },
        storageReleasedByPathway: { ...battery.energy, hydro: (battery.energy.hydro ?? 0) + hydro.released },
        chargedForNextGeneration,
        reservoirCapturedForNextGeneration: reservoirCaptured
    };
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
    let target = state.config.demand.reliabilityTargets[state.generation];
    if (c?.effect.kind === "demandTargetDelta")
        target = Math.max(0, Math.min(state.config.demand.maximumLight, target + c.effect.amount));
    const met = light >= target;
    const pointMaximum = state.config.rules.reliabilityPointMaximum ?? 4;
    const reliabilityEligible = state.generation >= (state.config.rules.reliabilityStartsGeneration ?? 5);
    const pointEarned = reliabilityEligible && met && player.cumulative.reliableGenerations < pointMaximum;
    player.currentMetrics.reliabilityTarget = target;
    player.currentMetrics.reliabilityEligible = reliabilityEligible;
    player.currentMetrics.reliabilityMet = met;
    player.currentMetrics.reliabilityPointEarned = pointEarned;
    player.currentMetrics.reliabilityPointCapped = reliabilityEligible && met && !pointEarned;
    player.reliabilityByGeneration[state.generation] = pointEarned;
    player.currentMetrics.curtailed = totalEnergy(available) + Math.max(0, transportedTotal - input);
    player.currentMetrics.storedEnd = player.installed.reduce((n, i) => n + totalEnergy(i.storageInput), 0);
    player.currentMetrics.storedPendingEnd = player.installed.reduce((n, i) => n + totalEnergy(i.pendingStorageInput ?? emptyEnergy()), 0);
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
    log(state, "dispatch.resolved", `${player.name} delivered ${light} Light${pointEarned ? " and earned 1 Reliability Point" : met ? " and met demand" : " but missed demand"}.`, player.id, { metrics: structuredClone(player.currentMetrics) });
}
function resolveCircularRecovery(state, player) {
    const profile = getContinentProfile(state, player);
    const resource = player.circularRecovery?.pendingResource ?? null;
    if (profile.resourceRule?.kind !== "circularRecovery" || !resource || player.circularRecovery.usedThisGeneration)
        return null;
    const account = player.resources[resource];
    if (warehouseTotal(player) < state.config.rules.warehouseMaximum) {
        account.warehouse++;
    }
    else {
        account.currentContinent += 1;
        account.recoveredToStock = (account.recoveredToStock ?? 0) + 1;
    }
    player.circularRecovery.usedThisGeneration = true;
    player.circularRecovery.lastRecovered = resource;
    player.circularRecovery.pendingResource = null;
    player.currentMetrics.circularRecovery = resource;
    log(state, "continent.recovery", `${player.name} recovered 1 ${resource === "constructionMaterials" ? "Other Material" : "Critical Material"} at generation end.`, player.id, { resource });
    return resource;
}
function resolveEndOfGenerationRegionalEffects(state) {
    for (const player of Object.values(state.players)) {
        biomassRegrowth(state, player);
        resolveCircularRecovery(state, player);
    }
}
// -----------------------------------------------------------------------------
// Command state machine and phase progression
// -----------------------------------------------------------------------------
function orderedFromFirst(state) { return [...state.turnOrder.slice(state.firstPlayerIndex), ...state.turnOrder.slice(0, state.firstPlayerIndex)]; }
function activePlayerId(state) { return state.turnOrder[state.activeTurnIndex]; }
function resetPlayerForGeneration(state, player) {
    player.actionsRemaining = state.config.rules.actionsPerGeneration;
    player.completedTrades = 0;
    player.temporaryKnowledge = 0;
    player.currentMetrics = emptyMetrics(state.config.demand.reliabilityTargets[state.generation]);
    player.circularRecovery ??= { pendingResource: null, usedThisGeneration: false, lastRecovered: null };
    player.circularRecovery.pendingResource = null;
    player.circularRecovery.usedThisGeneration = false;
    player.regionalExtractionUsesThisGeneration = 0;
    player.globalEventUsage = { buildUsed: false, worldMarketUsed: false, biomassPenaltyUsed: false };
    for (const instance of player.installed) {
        instance.usedThisGeneration = false;
        instance.temporaryCapacityBonus = 0;
    }
}

function promotePendingStorage(state) {
    for (const player of Object.values(state.players)) {
        for (const instance of player.installed) {
            instance.pendingStorageInput ??= emptyEnergy();
            if (totalEnergy(instance.pendingStorageInput) <= 0)
                continue;
            addEnergy(instance.storageInput, instance.pendingStorageInput);
            instance.pendingStorageInput = emptyEnergy();
        }
    }
}
function beginGeneration(state) {
    if (state.phase !== "generation.start")
        throw new Error("Generation cannot begin in this phase.");
    if (state.generation === 0)
        state.generation = 1;
    promotePendingStorage(state);
    drawGlobalEvent(state);
    state.weather.history[state.generation] = state.weather.current;
    for (const p of Object.values(state.players))
        resetPlayerForGeneration(state, p);
    state.actionRound = 1;
    state.activeTurnIndex = state.firstPlayerIndex;
    state.phase = "generation.localConditions";
    log(state, "generation.started", `Generation ${state.generation} started.`, null, { current: state.weather.current, forecast: state.weather.forecast });
}
function advanceDevelopmentTurn(state) {
    state.activeTurnIndex = (state.activeTurnIndex + 1) % state.turnOrder.length;
    if (state.activeTurnIndex === state.firstPlayerIndex) {
        if (state.actionRound < state.config.rules.actionsPerGeneration) {
            state.actionRound += 1;
            log(state, "development.round", `Development action round ${state.actionRound} began.`);
        }
        else {
            state.phase = "generation.dispatch";
            state.activeTurnIndex = state.firstPlayerIndex;
            log(state, "development.complete", `Development completed for Generation ${state.generation}.`);
        }
    }
}
function advanceDispatchTurn(state) {
    state.activeTurnIndex = (state.activeTurnIndex + 1) % state.turnOrder.length;
    if (state.activeTurnIndex === state.firstPlayerIndex) {
        resolveEndOfGenerationRegionalEffects(state);
        state.phase = "generation.review";
        log(state, "generation.review", `Generation ${state.generation} review is ready.`);
    }
}

function finishReview(state) {
    if (state.phase !== "generation.review")
        throw new Error("Review cannot finish in this phase.");
    discardCurrentConditions(state);
    clearGlobalEvent(state);
    if (state.generation === state.config.rules.generations) {
        state.results = finalRanking(state);
        state.completed = true;
        state.phase = "game.complete";
        log(state, "game.complete", "The game is complete.", null, { results: state.results });
        return;
    }
    state.firstPlayerIndex = (state.firstPlayerIndex + 1) % state.turnOrder.length;
    state.phase = "generation.advanceWeather";
}
function applyCommandMutable(state, command) {
    switch (command.type) {
        case "selectPrepared": {
            if (state.phase !== "setup.preparedSelection")
                throw new Error("Prepared selections are closed.");
            const p = getPlayer(state, command.playerId);
            p.prepared.pathwayId = command.pathwayId;
            p.prepared.capabilityId = command.capabilityId;
            log(state, "prepared.selected", `${p.name} selected hidden Prepared cards.`, p.id);
            if (Object.values(state.players).every(x => x.prepared.pathwayId && x.prepared.capabilityId)) {
                setOpeningWeather(state);
                if (state.opening.mode === "energySummit")
                    beginEnergySummit(state);
                else
                    revealPreparedAndBeginFounding(state);
            }
            break;
        }
        case "rollCurrent":
            setInitialCurrent(state);
            break;
        case "revealPrepared": {
            if (state.phase !== "setup.revealPrepared")
                throw new Error("Starting Plans cannot be revealed now.");
            setOpeningWeather(state);
            revealPreparedAndBeginFounding(state);
            break;
        }
        case "resolveFoundingProject": {
            if (state.phase !== "setup.foundingProjects")
                throw new Error("Founding Projects are not active.");
            const expectedId = state.opening.foundingOrder[state.opening.foundingIndex];
            if (command.playerId !== expectedId)
                throw new Error(`It is ${expectedId}'s Founding Project decision.`);
            resolveFoundingProject(state, command.playerId, command.complete);
            state.opening.foundingIndex++;
            if (state.opening.foundingIndex >= state.opening.foundingOrder.length) {
                activateOpeningWeather(state);
                state.phase = "generation.start";
            }
            break;
        }
        case "proposeSummitTrade":
            proposeSummitTrade(state, command.proposerId, command.recipientId, command.proposerGives, command.recipientGives);
            break;
        case "respondSummitTrade":
            respondSummitTrade(state, command.recipientId, command.accept);
            break;
        case "passSummitTurn":
            passSummitTurn(state, command.playerId);
            break;
        case "rollForecast":
            setInitialForecast(state);
            break;
        case "beginGeneration":
            beginGeneration(state);
            break;
        case "drawLocalConditions":
            drawLocalConditions(state);
            break;
        case "developmentAction": {
            if (command.playerId !== activePlayerId(state))
                throw new Error(`It is ${activePlayerId(state)}'s Development turn.`);
            const actionSpent = performDevelopmentAction(state, command.playerId, command.action);
            if (actionSpent)
                advanceDevelopmentTurn(state);
            break;
        }
        case "directTrade": {
            if (command.aId !== activePlayerId(state))
                throw new Error(`Only the active player may propose a direct trade.`);
            const result = executeDirectTrade(state, command.aId, command.bId, command.aGives, command.bGives);
            if (result.actionSpent)
                advanceDevelopmentTurn(state);
            break;
        }
        case "dispatch": {
            if (state.phase !== "generation.dispatch")
                throw new Error("Dispatch is not active.");
            if (command.playerId !== activePlayerId(state))
                throw new Error(`It is ${activePlayerId(state)}'s Dispatch turn.`);
            resolveDispatch(state, command.playerId, command.plan);
            advanceDispatchTurn(state);
            break;
        }
        case "finishReview":
            finishReview(state);
            break;
        case "advanceWeather":
            advanceWeather(state);
            break;
        case "undo":
        case "resetGeneration": throw new Error("History commands are handled transactionally.");
        default: throw new Error(`Unknown command ${command.type}.`);
    }
}
export function applyCommand(state, command) {
    if (command.type === "undo") {
        undoLast(state);
        return state;
    }
    if (command.type === "resetGeneration") {
        resetGeneration(state);
        return state;
    }
    const draft = structuredClone(state);
    if (command.type === "developmentAction" || command.type === "directTrade")
        pushUndo(draft);
    applyCommandMutable(draft, command);
    if (command.type === "drawLocalConditions" && draft.phase === "generation.development")
        setGenerationStartSnapshot(draft);
    if (draft.phase === "generation.dispatch")
        lockUndo(draft, "Development completed and Dispatch began.");
    Object.assign(state, draft);
    return state;
}
export function applyCommandFast(state, command) {
    if (state.executionMode !== "simulation")
        throw new Error("Fast command execution is reserved for Simulation mode.");
    if (command.type === "undo" || command.type === "resetGeneration")
        throw new Error("History commands are unavailable in Simulation mode.");
    applyCommandMutable(state, command);
    return state;
}
export function currentPlayerId(state) { return state.phase === "generation.development" || state.phase === "generation.dispatch" ? activePlayerId(state) : state.phase === "setup.summit" ? currentSummitPlayerId(state) : state.phase === "setup.foundingProjects" ? state.opening.foundingOrder[state.opening.foundingIndex] ?? null : null; }
export function currentOrder(state) { return orderedFromFirst(state); }
// -----------------------------------------------------------------------------
// Save, load and migration
// -----------------------------------------------------------------------------
export function serializeGame(state) {
    const core = {
        saveFormat: "sunpaths-save",
        saveSchemaVersion: state.schemaVersion,
        engineVersion: state.engineVersion,
        gameId: state.gameId,
        savedAtIso: new Date().toISOString(),
        configHash: state.configHash,
        gameState: state
    };
    const raw = JSON.stringify(core);
    return JSON.stringify({ ...core, checksum: hashText(raw) });
}
function migratePhase3State(input) {
    const state = structuredClone(input);
    const sourceSchemaVersion = state.schemaVersion ?? "1.0.0";
    state.debugMode ??= false;
    state.executionMode ??= "interactive";
    // Canonical A.5.13 configuration replaces conflicting historic runtime values.
    state.config = structuredClone(defaultConfig);
    state.schemaVersion = "1.6.0";
    state.engineVersion = "0.23.0-stable-viewer-opening-forecast";
    state.configHash = configHash(state.config);
    state.worldMarket ??= structuredClone(state.config.trade.worldMarketStarting);
    for (const resource of resourceTypes)
        state.worldMarket[resource] = Math.max(0, Number.isInteger(state.worldMarket[resource]) ? state.worldMarket[resource] : state.config.trade.worldMarketStarting[resource]);

    for (const player of Object.values(state.players)) {
        const profile = state.config.continents.find(continent => continent.id === player.continentId);
        if (!profile)
            throw new Error(`Saved player ${player.name} references an unknown region.`);
        for (const resource of resourceTypes) {
            const account = player.resources[resource];
            const printedStarting = profile.printedResources[resource];
            const warehouse = Math.max(0, account?.warehouse ?? profile.startingWarehouse[resource]);
            const recoveredToStock = Math.max(0, account?.recoveredToStock ?? Math.max(0, (account?.currentContinent ?? 0) - printedStarting));
            const fallbackCountryStock = printedStarting - profile.startingWarehouse[resource];
            const currentContinent = Math.max(0, Math.min(printedStarting + recoveredToStock, account?.currentContinent ?? fallbackCountryStock));
            player.resources[resource] = { printedStarting, currentContinent, warehouse, recoveredToStock };
        }
        if (warehouseTotal(player) > state.config.rules.warehouseMaximum)
            throw new Error(`This older save gives ${player.name} more than ${state.config.rules.warehouseMaximum} total Warehouse resources and cannot be migrated safely.`);
        delete player.assistanceKnowledge;
        delete player.knowledgeLinkUsed;
        delete player.assistanceLent;
        delete player.initiatedTrades;
        delete player.continentAbilityUsed;
        delete player.firstSolarDiscountUsed;
        player.appliedLearningTokens ??= 0;
        player.lockInTokens = Math.max(0, Math.min(1, player.lockInTokens ?? 0));
        player.summitTrades ??= 0;
        player.circularRecovery ??= { pendingResource: null, usedThisGeneration: false, lastRecovered: null };
        player.currentMetrics ??= emptyMetrics(state.config.demand.reliabilityTargets[state.generation] ?? 1);
        const specialtyResource = profile.resourceRule?.kind === "extraction" ? profile.resourceRule.resource : null;
        const inferredSpecialtyUse = specialtyResource && (player.currentMetrics.resourcesExtracted?.[specialtyResource] ?? 0) >= 2 ? 1 : 0;
        player.regionalExtractionUsesThisGeneration = Math.max(0, Math.min(1, player.regionalExtractionUsesThisGeneration ?? inferredSpecialtyUse));
        player.globalEventUsage ??= { buildUsed: false, worldMarketUsed: false, biomassPenaltyUsed: false };
        if (!["1.5.0", "1.6.0"].includes(sourceSchemaVersion)) {
            const freeStartingIds = new Set(["gridUpgrade", "efficientLighting", "basicFossilPlant"]);
            player.installed = (player.installed ?? []).filter(instance => !(instance.builtGeneration === 0 && freeStartingIds.has(instance.technologyId)));
            const hasGrid = player.installed.some(instance => ["basicGrid", "gridUpgrade", "smartGrid"].includes(instance.technologyId));
            const hasLighting = player.installed.some(instance => ["standardLighting", "efficientLighting"].includes(instance.technologyId));
            if (!hasGrid)
                player.installed.push({ instanceId: `${player.id}-basicGrid-migrated`, technologyId: "basicGrid", builtGeneration: 0, storageInput: emptyEnergy(), pendingStorageInput: emptyEnergy(), usedThisGeneration: false, firstOperationLossReduction: 0, temporaryCapacityBonus: 0 });
            if (!hasLighting)
                player.installed.push({ instanceId: `${player.id}-standardLighting-migrated`, technologyId: "standardLighting", builtGeneration: 0, storageInput: emptyEnergy(), pendingStorageInput: emptyEnergy(), usedThisGeneration: false, firstOperationLossReduction: 0, temporaryCapacityBonus: 0 });
            const completedOldFossilProject = player.prepared?.pathwayId === "fossil" && player.prepared?.foundingProjectCompleted;
            if (completedOldFossilProject && !player.installed.some(instance => instance.technologyId === "basicFossilPlant"))
                player.installed.push({ instanceId: `${player.id}-basicFossilPlant-migrated`, technologyId: "basicFossilPlant", builtGeneration: 0, storageInput: emptyEnergy(), pendingStorageInput: emptyEnergy(), usedThisGeneration: false, firstOperationLossReduction: 0, temporaryCapacityBonus: 0 });
            delete player.prepared.fossilBlueprintAvailable;
        }
        for (const instance of player.installed ?? [])
            instance.pendingStorageInput ??= emptyEnergy();
        for (const obsolete of ["knowledgeLinksUsed", "knowledgeLinkIncome"])
            delete player.currentMetrics[obsolete];
        player.currentMetrics.resourcesImported ??= {};
        player.currentMetrics.resourcesExported ??= {};
        player.currentMetrics.biomassRegrown ??= 0;
        player.currentMetrics.circularRecovery ??= null;
        player.currentMetrics.fossilChain ??= null;
        player.currentMetrics.globalEventEffects ??= [];
        player.currentMetrics.energyFlow ??= { directByPathway: emptyEnergy(), storageReleasedByPathway: emptyEnergy(), chargedForNextGeneration: 0, reservoirCapturedForNextGeneration: 0 };
        player.currentMetrics.storedPendingEnd ??= player.installed.reduce((total, instance) => total + totalEnergy(instance.pendingStorageInput ?? emptyEnergy()), 0);
        const generationResults = Object.entries(player.lightByGeneration ?? {});
        player.cumulative.demandMetGenerations = generationResults.filter(([generation, light]) => light >= (state.config.demand.reliabilityTargets[Number(generation)] ?? 0)).length;
        const firstReliabilityGeneration = state.config.rules.reliabilityStartsGeneration ?? 5;
        player.reliabilityByGeneration = Object.fromEntries(generationResults.map(([generation, light]) => {
            const number = Number(generation);
            const eligible = number >= firstReliabilityGeneration;
            const demand = state.config.demand.reliabilityTargets[number] ?? 0;
            return [generation, eligible && light >= demand];
        }));
        player.cumulative.reliableGenerations = Math.min(
            Object.values(player.reliabilityByGeneration).filter(Boolean).length,
            state.config.rules.reliabilityPointMaximum
        );
        // Old Carbon Capture remains environmental protection and never implies EOR.
        for (const instance of player.installed ?? []) {
            if (instance.technologyId === "carbonCapturePlant")
                instance.technologyId = "carbonCapturePlant";
        }
        if (player.localCondition?.definitionId === "storageBreakthrough") {
            player.localCondition.definitionId = "recoveryBreakthrough";
            player.localCondition.cardId = player.localCondition.cardId.replace("storageBreakthrough", "recoveryBreakthrough");
        }
    }
    state.rng.streams.globalEvents ??= createRandomState(`${state.seed}::migrated-global-events`).streams.globalEvents;
    state.globalEvents ??= createGlobalDeck(state.config, state.rng);
    state.globalEvents.activeDefinitionId ??= null;
    state.globalEvents.activeCardId ??= null;
    state.globalEvents.history ??= {};
    for (const pile of [state.localConditions?.drawPile ?? [], state.localConditions?.discardPile ?? []]) {
        for (const card of pile) {
            if (card.definitionId === "storageBreakthrough") card.definitionId = "recoveryBreakthrough";
            card.cardId = card.cardId.replace("storageBreakthrough", "recoveryBreakthrough");
        }
    }
    // A.5.19 reveals only the Generation-1 forecast during setup. It becomes Current after
    // Founding Projects; only then is the Generation-2 forecast rolled and revealed.
    if (sourceSchemaVersion !== "1.6.0" && ["setup.summit", "setup.foundingProjects", "setup.revealPrepared"].includes(state.phase)) {
        const generationOneForecast = state.weather.current ?? state.weather.forecast ?? null;
        state.weather.current = null;
        state.weather.currentDie = null;
        state.weather.forecast = generationOneForecast;
        state.weather.forecastDie = "A";
    }
    if (state.phase === "setup.revealPrepared") {
        setOpeningWeather(state);
        revealPreparedAndBeginFounding(state);
    }
    else if (["setup.rollCurrent", "setup.rollForecast"].includes(state.phase)) {
        setOpeningWeather(state);
        activateOpeningWeather(state);
        state.phase = "generation.start";
    }
    else if (["setup.summit", "setup.foundingProjects"].includes(state.phase)) {
        setOpeningWeather(state);
    }
    return state;
}

export function deserializeGame(json) {
    const envelope = JSON.parse(json);
    if (envelope.saveFormat !== "sunpaths-save")
        throw new Error("Not a SUNPATHS save file.");
    if (!["1.0.0", "1.1.0", "1.2.0", "1.3.0", "1.4.0", "1.5.0", "1.6.0"].includes(envelope.saveSchemaVersion))
        throw new Error(`Unsupported save schema ${envelope.saveSchemaVersion}.`);
    const { checksum: stored, ...core } = envelope;
    if (hashText(JSON.stringify(core)) !== stored)
        throw new Error("Save checksum mismatch.");
    const migrated = migratePhase3State(envelope.gameState);
    assertInvariants(migrated);
    return migrated;
}

