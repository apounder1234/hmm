// @ts-nocheck
import { uiShared } from "./uiShared.js";
import { SetupProgress, WeatherCard } from "./uiSetup.js";
import { buildDebugSnapshot, formatBugReport } from "./debug.js";
const { React, useEffect, useMemo, useRef, useState, createRoot, defaultConfig, validateConfig, createGame, applyCommand, currentOrder, currentPlayerId, canCompleteFoundingProject, foundingProjectDefinition, describeCostModifiers, getAvailableContinentAbilityActions, getContinentProfile, getKnowledgeRequirement, getLightingLevel, getPathwayAffinity, getTransmissionLevel, invariantErrors, effectivePathwayOpportunity, getTechnology, pathways, totalEnergy, totalLoss, hasRelevantSystem, aiPrepared, chooseDevelopmentDecision, chooseDispatchPlan, pumpAi, deserializeGame, serializeGame, defaultSimulationScenario, technologyDataSets, aggregateReportToCsv, balanceFlagsToCsv, playerResultsToCsv, simulationReportToJson, buildLegality, conditionImpactPreview, developmentActionLegality, effectiveBuildCost, importLegality, previewDispatch, systemGuidance, systemSnapshot, technologyImpactPreview, h, continentIcons, weatherLabels, resourceLabels, pathwayLabels, capabilityLabels, affinityLabels, abilityDescriptions, penaltyDescriptions, strategyLabels, strategies, resourceKeys, resourceDescriptions, stageDescriptions, weatherDescriptions, newRandomSeed, localConditionExplanation, weatherExplanation, technologyExplanation, resourceExplanation, scoringExplanation, clone, number, titleCase, sumLoss, phaseLabel, currentPlayer, conditionDefinition, button, panel, infoButton, InfoModal, ConfirmationModal, ConditionReveal, friendlyActionName, learningCostPreview, actionConfirmation, stat, badge, meter, energyCubes, download, makeParticipants } = uiShared;
function ContinentMarker({ game, player, selected, active, onSelect, position }) {
    const continent = game.config.continents.find(c => c.id === player.continentId);
    const condition = conditionDefinition(game, player);
    return h("button", {
        type: "button",
        className: `map-marker ${selected ? "selected" : ""} ${active ? "active-turn" : ""}`,
        style: { left: position.left, top: position.top },
        onClick: () => onSelect(player.id),
        "aria-label": `${continent.name}, ${player.name}, ${player.cumulative.totalLight} Light`
    }, h("span", { className: "marker-dot" }, continentIcons[continent.id]), h("span", { className: "marker-copy" }, h("strong", null, continent.name), h("small", null, `${player.name} · ${player.cumulative.totalLight} Light`)), condition ? h("span", { className: "marker-condition", title: condition.name }, "!") : null);
}
function WorldArea({ game, selectedId, setSelectedId }) {
    const positions = {
        northAmerica: { left: "19%", top: "30%" },
        southAmerica: { left: "32%", top: "66%" },
        europe: { left: "51%", top: "27%" },
        africa: { left: "53%", top: "53%" },
        asia: { left: "72%", top: "34%" },
        australia: { left: "84%", top: "72%" }
    };
    const activeId = currentPlayerId(game);
    return panel("World board", h("div", { className: "world-map", role: "group", "aria-label": "Six-continent game map" }, h("svg", { className: "world-silhouette", viewBox: "0 0 1000 500", role: "img", "aria-label": "Stylised world map" }, h("path", { d: "M70 110 C130 55 230 55 310 105 L280 170 220 190 180 245 110 215 55 160 Z" }), h("path", { d: "M245 245 C305 230 350 260 365 320 L340 430 292 470 265 385 220 320 Z" }), h("path", { d: "M420 115 C500 70 650 75 760 110 L885 170 830 235 720 220 650 185 590 210 500 180 430 195 390 155 Z" }), h("path", { d: "M460 205 C535 185 610 220 620 300 L570 405 505 380 455 300 425 235 Z" }), h("path", { d: "M760 310 C820 280 900 305 940 365 L900 430 815 420 755 370 Z" })), ...currentOrder(game).map(id => h(ContinentMarker, { key: id, game, player: game.players[id], selected: id === selectedId, active: id === activeId, onSelect: setSelectedId, position: positions[game.players[id].continentId] }))));
}
function Warehouse({ game, player, onInfo }) {
    return h("div", { className: "warehouse-grid" }, ...resourceKeys.map(key => {
        const account = player.resources[key];
        return h("button", { type: "button", key, className: "resource-cell", onClick: () => onInfo(resourceExplanation(game, player, key)) }, h("span", null, resourceLabels[key], h("i", { className: "micro-help" }, "?")), h("strong", null, account.warehouse), h("small", null, `${account.currentContinent} in continent · printed ${account.printedStarting}`));
    }));
}
function TechnologyList({ game, player, onInfo }) {
    return h("div", { className: "technology-list" }, ...player.installed.map(instance => {
        const tech = getTechnology(game, instance.technologyId);
        const stored = totalEnergy(instance.storageInput);
        const impact = technologyImpactPreview(game, player.id, tech);
        const primaryMetric = impact.metrics.find(metric => metric.after > metric.before);
        return h("article", { key: instance.instanceId, className: "technology-card" }, h("div", null, h("strong", null, tech.name), h("small", null, `${titleCase(tech.stage)} · ${tech.pathway === "shared" ? "Shared" : pathwayLabels[tech.pathway]}`), h("em", { className: "technology-visible-benefit" }, primaryMetric ? `${primaryMetric.label}: ${primaryMetric.after}${primaryMetric.unit}` : impact.now)), h("div", { className: "technology-meta" }, tech.storage ? badge(`${stored}/${tech.storage.capacity} stored`, "energy") : badge(`Capacity ${tech.capacity}`), infoButton(() => onInfo(technologyExplanation(game, player, tech)), `Explain ${tech.name}`)));
    }));
}
function EnergyChain({ player, onInfo }) {
    const gross = Object.values(player.currentMetrics.grossEnergy).reduce((a, b) => a + b, 0);
    const stored = player.currentMetrics.storedEnd;
    const transformed = player.currentMetrics.grossEnergy.biomass + player.currentMetrics.grossEnergy.fossil + player.currentMetrics.grossEnergy.hydro;
    const transported = Math.min(4, Math.max(player.currentMetrics.deliveredLight, player.currentMetrics.deliveredLight + player.currentMetrics.systemLoss.lighting));
    const stages = [["Capture", gross], ["Store", stored], ["Transform", transformed], ["Transport", transported], ["Light", player.currentMetrics.deliveredLight]];
    return h("div", { className: "energy-chain" }, ...stages.flatMap(([label, value], index) => [h("button", { type: "button", key: label, className: "energy-stage explainable", onClick: () => onInfo({ eyebrow: "Energy chain", title: label, summary: stageDescriptions[label], details: [`Current displayed amount: ${value}.`, "These stage displays explain the most recently resolved Generation; planning values appear in Dispatch."] }) }, h("strong", null, label), energyCubes(value), h("small", null, value), h("i", { className: "micro-help" }, "?")), index < stages.length - 1 ? h("span", { key: `${label}-arrow`, className: "chain-arrow" }, "→") : null].filter(Boolean)));
}
function LightTrack({ game, player, onInfo }) {
    return h("div", { className: "light-track" }, ...Array.from({ length: 8 }, (_, i) => {
        const generation = i + 1;
        const value = player.lightByGeneration[generation];
        const target = game.config.demand.reliabilityTargets[generation];
        const point = player.reliabilityByGeneration[generation] === true;
        const met = value !== undefined && value >= target;
        return h("button", { type: "button", key: generation, className: `light-window ${point ? "reliable" : met ? "demand-met" : ""}`, onClick: () => onInfo(scoringExplanation(game, generation, value, target)) }, h("small", null, `G${generation}`), h("strong", null, value ?? "·"), h("span", null, point ? "+1 point" : `need ${target}`));
    }));
}
function PlayerBoard({ game, player, onInfo }) {
    const condition = conditionDefinition(game, player);
    const nextCost = player.knowledge < game.config.rules.knowledgeMaximum ? learningCostPreview(game, player) : null;
    const profile = getContinentProfile(game, player);
    const ability = abilityDescriptions[profile.abilityId];
    const penalty = profile.penaltyId ? penaltyDescriptions[profile.penaltyId] : null;
    const knowledgeButton = h("button", {
        type: "button",
        className: "badge explain-badge",
        onClick: () => onInfo({
            eyebrow: "Permanent capability",
            title: `Knowledge ${player.knowledge}`,
            summary: "Knowledge unlocks the technology ladder for this player.",
            details: [
                "Learn uses one Development action and materials to permanently increase Knowledge by one, to a maximum of five.",
                nextCost
                    ? `Next level currently costs ${nextCost.general} Other Materials and ${nextCost.critical} Critical Minerals${nextCost.usesAppliedLearning ? ", after using one Applied Learning token" : ""}.`
                    : "You have reached maximum Knowledge.",
                "Knowledge is never spent. Increase it through Learn actions to unlock your own advanced technologies."
            ]
        })
    }, `Knowledge ${player.knowledge}`, h("i", { className: "micro-help" }, "?"));
    const statusBadges = [
        knowledgeButton,
        player.appliedLearningTokens
            ? h("span", { key: "learning", className: "badge energy" }, `Applied Learning ${player.appliedLearningTokens}`)
            : null,
        condition
            ? h("button", {
                key: "condition",
                type: "button",
                className: "badge condition explain-badge",
                onClick: () => onInfo(localConditionExplanation(game, player, condition))
            }, condition.name, h("i", { className: "micro-help" }, "?"))
            : null
    ].filter(Boolean);
    const continentBadges = [
        h("button", {
            key: "ability",
            type: "button",
            className: "badge explain-badge",
            onClick: () => onInfo({ eyebrow: profile.name, title: ability.name, summary: ability.text, details: profile.strengths })
        }, `${ability.name}${player.continentAbilityUsed ? " · used" : ""}`),
        player.lockInTokens
            ? h("button", {
                key: "lock-in",
                type: "button",
                className: "badge warning explain-badge",
                onClick: () => onInfo({
                    eyebrow: "Regional penalty",
                    title: "Fossil Lock-In",
                    summary: penaltyDescriptions.fossilLockIn.text,
                    details: ["The token is removed after the additional resource is paid."]
                })
            }, `Lock-In ${player.lockInTokens}`)
            : null,
        penalty && !player.lockInTokens
            ? h("button", {
                key: "penalty",
                type: "button",
                className: "badge explain-badge",
                onClick: () => onInfo({ eyebrow: "Structural weakness", title: penalty.name, summary: penalty.text, details: profile.weaknesses })
            }, penalty.name)
            : null
    ].filter(Boolean);
    return h("div", { className: "player-board" }, h("div", { className: "board-heading" }, h("div", null, h("p", { className: "eyebrow" }, "Player board"), h("h2", null, player.name)), h("div", { className: "badge-stack" }, ...statusBadges)), h(EnergyChain, { player, onInfo }), h("div", { className: "two-column" }, panel("Warehouse", h(Warehouse, { game, player, onInfo }), "nested"), panel("Installed technologies", h(TechnologyList, { game, player, onInfo }), "nested")), panel("Light and Reliability", h(LightTrack, { game, player, onInfo }), "nested"), h("div", { className: "continent-status-row" }, ...continentBadges), h("div", { className: "score-row" }, stat("Total Light", player.cumulative.totalLight), stat("Reliability Points", `${player.cumulative.reliableGenerations}/${game.config.rules.reliabilityPointMaximum ?? 4}`), stat("Demand met", `${player.cumulative.demandMetGenerations ?? 0}/8`), stat("System Loss", totalLoss(player)), stat("Curtailment", player.cumulative.curtailment)));
}
function LockedReason({ reason }) {
    return h("div", { className: "locked-reason" }, h("span", null, "🔒"), h("small", null, reason));
}
function BuildShop({ game, player, guidedMode, onChoose, onInfo }) {
    const categories = [
        { id: "recommended", label: "★ Recommended" },
        { id: "energy", label: "⚡ Energy" },
        { id: "storage", label: "▣ Storage" },
        { id: "grid", label: "↔ Grid" },
        { id: "lighting", label: "💡 Lighting" },
        { id: "all", label: "All" }
    ];
    const [selectedCategory, setSelectedCategory] = useState("recommended");
    const available = game.config.technologies.filter(technology => !technology.starter && (technology.alwaysAvailable || game.innovationMarket.visible.includes(technology.id)));
    const scored = available.map(technology => {
        const legality = buildLegality(game, player.id, technology);
        const impact = technologyImpactPreview(game, player.id, technology);
        const lightGain = impact.metrics.find(metric => metric.label === "Light ceiling")?.after - (impact.metrics.find(metric => metric.label === "Light ceiling")?.before ?? 0);
        const timingScore = impact.timing === "Helps now" ? 4 : impact.timing === "Helps forecast" ? 2 : impact.timing === "Not useful here" ? -2 : 0;
        return { technology, legality, impact, score: Number(legality.legal) * 8 + timingScore + (Number.isFinite(lightGain) ? lightGain : 0) };
    });
    const filtered = selectedCategory === "recommended"
        ? scored.slice().sort((a, b) => b.score - a.score).slice(0, 6)
        : scored.filter(item => {
            const technology = item.technology;
            if (selectedCategory === "energy")
                return technology.pathway !== "shared";
            if (selectedCategory === "storage")
                return technology.stage === "storage";
            if (selectedCategory === "grid")
                return technology.stage === "transport";
            if (selectedCategory === "lighting")
                return technology.stage === "lighting" || technology.stage === "efficiency";
            return true;
        });
    const visible = guidedMode ? filtered.slice(0, 8) : filtered;
    const technologyIcon = technology => technology.stage === "storage" ? "▣" : technology.stage === "transport" ? "↔" : technology.stage === "lighting" || technology.stage === "efficiency" ? "💡" : technology.pathway === "solar" ? "☀" : technology.pathway === "wind" ? "≋" : technology.pathway === "hydro" ? "💧" : technology.pathway === "biomass" ? "🌿" : technology.pathway === "fossil" ? "⛽" : "⚙";
    return h("div", { className: "guided-subpanel redesigned-build-shop" },
        h("div", { className: "build-category-tabs", role: "tablist", "aria-label": "Technology category" },
            ...categories.map(category => h("button", { key: category.id, type: "button", className: selectedCategory === category.id ? "selected" : "", onClick: () => setSelectedCategory(category.id) }, category.label))
        ),
        selectedCategory === "recommended" ? h("p", { className: "build-filter-note" }, guidedMode ? "These legal and high-impact options best match your system right now. Every technology remains available under All." : "Recommendations are ranked from the same legality and impact calculations used by the engine.") : null,
        visible.length === 0 ? h("p", { className: "empty-guidance" }, "No technology in this category is available right now.") : null,
        h("div", { className: "technology-card-grid" }, ...visible.map(({ technology: tech, legality, impact }) => {
            const normalCost = effectiveBuildCost(game, player, tech);
            const abilityOptions = getAvailableContinentAbilityActions(game, player.id, tech);
            const boostLegality = abilityOptions.length ? buildLegality(game, player.id, tech, { useContinentAbility: true }) : { legal: false, reason: "Unavailable" };
            const cost = abilityOptions.length && boostLegality.legal ? effectiveBuildCost(game, player, tech, { useContinentAbility: true }) : normalCost;
            const reachable = legality.legal || boostLegality.legal;
            const affinity = getPathwayAffinity(game, player, tech);
            const tierLabel = tech.tier === "basic" ? "Basic" : tech.tier === "intermediate" ? "Upgrade" : "Advanced";
            const canAffordGeneral = player.resources.constructionMaterials.warehouse >= cost.constructionMaterials;
            const canAffordCritical = player.resources.criticalMaterials.warehouse >= cost.criticalMaterials;
            return h("article", { key: tech.id, className: `technology-choice-card ${reachable ? "available" : "locked"}` },
                h("div", { className: "technology-choice-heading" },
                    h("span", { className: "technology-choice-icon", "aria-hidden": "true" }, technologyIcon(tech)),
                    h("div", null, h("small", null, `${tierLabel} · ${affinityLabels[affinity]} readiness`), h("h3", null, tech.name)),
                    badge(impact.timing, impact.timing === "Helps now" ? "reliable" : impact.timing === "Not useful here" ? "warning" : "energy")
                ),
                h("p", { className: "technology-purpose" }, impact.headline),
                h("div", { className: "technology-final-cost" },
                    h("span", { className: canAffordGeneral ? "" : "missing" }, h("small", null, "Other Materials"), h("strong", null, cost.constructionMaterials)),
                    h("span", { className: canAffordCritical ? "" : "missing" }, h("small", null, "Critical Minerals"), h("strong", null, cost.criticalMaterials)),
                    h("span", { className: player.knowledge >= cost.knowledgeRequired || boostLegality.legal ? "" : "missing" }, h("small", null, "Readiness"), h("strong", null, `K${cost.knowledgeRequired}`))
                ),
                !legality.legal && boostLegality.legal ? h("p", { className: "choice-benefit" }, "Innovation Boost can make this upgrade legal if you activate it explicitly.") : !legality.legal ? h(LockedReason, { reason: legality.reason }) : h("p", { className: "choice-benefit" }, impact.now),
                h("details", { className: "technology-details" },
                    h("summary", null, "Cost and impact details"),
                    h("div", { className: "cost-breakdown" },
                        h("small", null, `Base cost: ${cost.base.constructionMaterials} Other + ${cost.base.criticalMaterials} Critical`),
                        ...cost.modifiers.map(modifier => h("small", { key: modifier.id, className: modifier.amount > 0 ? "cost-penalty" : "cost-benefit" }, `${modifier.label}: ${modifier.amount > 0 ? "+" : ""}${modifier.amount} ${modifier.resource === "constructionMaterials" ? "Other" : "Critical"}`)),
                        h("strong", null, `Final cost: ${cost.constructionMaterials} Other + ${cost.criticalMaterials} Critical`)
                    ),
                    impact.metrics.length ? h("div", { className: "impact-metrics" }, ...impact.metrics.slice(0, 4).map(metric => h("span", { key: metric.label }, h("small", null, metric.label), h("b", null, `${metric.before}${metric.unit} → ${metric.after}${metric.unit}`)))) : null,
                    h("p", null, impact.future),
                    h("p", { className: "muted" }, impact.prompt)
                ),
                h("div", { className: "technology-choice-actions" },
                    button("Details", () => onInfo(technologyExplanation(game, player, tech)), { kind: "ghost compact" }),
                    legality.legal ? button("Build", () => onChoose({ kind: "build", technologyId: tech.id }), { kind: "primary compact" }) : boostLegality.legal ? button("Use Innovation Boost", () => onChoose({ kind: "build", technologyId: tech.id, useContinentAbility: true }), { kind: "primary compact" }) : button("Locked", () => { }, { kind: "ghost compact", disabled: true, title: legality.reason })
                )
            );
        }))
    );
}
function GatherPanel({ game, player, onChoose }) {
    const choices = [
        { action: { kind: "extract", resource: "constructionMaterials" }, icon: "▦", title: "Other Materials", note: "Steel, cement, glass, timber, machinery and other construction inputs." },
        { action: { kind: "extract", resource: "criticalMaterials" }, icon: "◆", title: "Critical Minerals", note: "Mineral inputs used especially by advanced generation, storage and grids." },
        { action: { kind: "extract", resource: "fossilFuel" }, icon: "●", title: "Fossil Fuel", note: "Fuel for Fossil plants." },
        { action: { kind: "harvestBiomass" }, icon: "♣", title: "Biomass", note: "Renewable fuel for Biomass plants." }
    ];
    return h("div", { className: "clean-card-list" }, ...choices.map(choice => {
        const legality = developmentActionLegality(game, player.id, choice.action);
        const key = choice.action.kind === "harvestBiomass" ? "biomass" : choice.action.resource;
        const account = player.resources[key];
        return h("article", { key, className: `clean-choice-card ${legality.legal ? "available" : "locked"}` }, h("div", { className: "clean-choice-main" }, h("div", { className: "choice-icon" }, choice.icon), h("div", null, h("strong", null, choice.title), h("small", null, choice.note))), h("div", { className: "resource-preview" }, h("span", null, `Warehouse ${account.warehouse}/9`), h("span", null, `${account.currentContinent} left in your land`)), legality.legal ? h("p", { className: "choice-benefit" }, `After gathering: ${account.warehouse + 1} in your Warehouse.`) : h(LockedReason, { reason: legality.reason }), button(legality.legal ? "Gather 1" : "Unavailable", () => onChoose(choice.action), { kind: legality.legal ? "primary compact" : "ghost compact", disabled: !legality.legal, title: legality.reason }));
    }));
}
function ImportChoices({ game, player, onChoose }) {
    return h("div", { className: "clean-card-list" }, ...resourceKeys.map(receive => {
        const result = importLegality(game, player, receive);
        const paymentText = result.payment ? Object.entries(result.payment).filter(([, value]) => value).map(([key, value]) => `${value} ${resourceLabels[key]}`).join(" + ") : "";
        return h("article", { key: receive, className: `clean-choice-card ${result.legality.legal ? "available" : "locked"}` }, h("div", { className: "clean-choice-main" }, h("div", { className: "choice-icon" }, "⇄"), h("div", null, h("strong", null, `Import 1 ${resourceLabels[receive]}`), h("small", null, `Global stock ${game.worldMarket?.[receive] ?? 0}/6 · costs ${result.required} other resources`))), result.legality.legal ? h("p", { className: "choice-benefit" }, `Automatic payment: ${paymentText}.`) : h(LockedReason, { reason: result.legality.reason }), button(result.legality.legal ? "Choose import" : "Unavailable", () => onChoose({ kind: "publicImport", receive, payment: result.payment }), { kind: result.legality.legal ? "primary compact" : "ghost compact", disabled: !result.legality.legal, title: result.legality.reason }));
    }));
}
function TradePanel({ game, player, onTrade, message }) {
    const [recipientId, setRecipientId] = useState(Object.keys(game.players).find(id => id !== player.id) || "");
    const [offer, setOffer] = useState("constructionMaterials");
    const [request, setRequest] = useState("criticalMaterials");
    const recipients = Object.values(game.players).filter(p => p.id !== player.id);
    const ownOffer = player.resources[offer].warehouse;
    const recipient = game.players[recipientId];
    const recipientHas = recipient?.resources[request].warehouse ?? 0;
    const sameResource = offer === request;
    const canPropose = !sameResource && player.actionsRemaining > 0 && ownOffer >= 1 && recipientHas >= 1;
    const reason = sameResource ? "Choose two different resources." : player.actionsRemaining <= 0 ? "No Development action remains." : ownOffer < 1 ? `You have no ${resourceLabels[offer]} to offer.` : recipientHas < 1 ? `${recipient?.name || "That player"} has no ${resourceLabels[request]} to give.` : "Available";
    return h("div", { className: "guided-subpanel trade-clean" }, h("p", null, "Every direct trade uses one Development action. Knowledge cannot be borrowed or traded."), h("div", { className: "trade-sentence" }, h("span", null, "Ask"), h("select", { value: recipientId, onChange: e => setRecipientId(e.target.value) }, ...recipients.map(p => h("option", { key: p.id, value: p.id }, p.name))), h("span", null, "to give"), h("select", { value: request, onChange: e => setRequest(e.target.value) }, ...resourceKeys.map(k => h("option", { key: k, value: k }, resourceLabels[k]))), h("span", null, "for your"), h("select", { value: offer, onChange: e => setOffer(e.target.value) }, ...resourceKeys.map(k => h("option", { key: k, value: k }, resourceLabels[k])))), canPropose ? h("p", { className: "choice-benefit" }, `Costs 1 action · You have ${ownOffer}; ${recipient?.name} has ${recipientHas}.`) : h(LockedReason, { reason }), button("Trade for 1 action", () => onTrade(recipientId, offer, request), { kind: "primary", disabled: !canPropose, title: reason }), message ? h("p", { className: "trade-message" }, message) : null);
}
function DevelopmentControls({ game, player, onAction, onUndo, onReset, onTrade, tradeMessage, onInfo }) {
    const guidedMode = game.uiMode !== "strategy";
    const [section, setSection] = useState(null);
    const [confirmation, setConfirmation] = useState(null);
    useEffect(() => setSection(null), [player.id, game.actionRound, game.generation]);
    const condition = conditionDefinition(game, player);
    const adaptable = condition && "adaptable" in condition.effect && condition.effect.adaptable && !player.localCondition.adapted;
    const researchStatus = developmentActionLegality(game, player.id, { kind: "research" });
    const adaptStatus = adaptable ? developmentActionLegality(game, player.id, { kind: "adapt" }) : null;
    const recommendation = useMemo(() => {
        if (!guidedMode)
            return null;
        try {
            return chooseDevelopmentDecision(game, player);
        }
        catch {
            return null;
        }
    }, [game, player.id, guidedMode]);
    const conditionImpact = condition ? conditionImpactPreview(game, player.id, condition) : null;
    const target = conditionImpact?.after.target ?? game.config.demand.reliabilityTargets[game.generation];
    const guidance = useMemo(() => systemGuidance(game, player.id), [game, player.id]);
    const choose = action => {
        const legality = developmentActionLegality(game, player.id, action);
        if (!legality.legal)
            return;
        setConfirmation({ action, ...actionConfirmation(game, player, action) });
    };
    const confirm = () => {
        if (!confirmation)
            return;
        const success = onAction(confirmation.action);
        if (success !== false) {
            setConfirmation(null);
            setSection(null);
        }
    };
    const actionCards = [
        { id: "gather", icon: "▦", title: "Gather", text: "Move one regional resource into your Warehouse.", enabled: true },
        { id: "learn", icon: "✦", title: "Learn", text: "Increase your technical readiness by one level.", enabled: researchStatus.legal, reason: researchStatus.reason },
        { id: "build", icon: "⚙", title: "Build", text: "Add or upgrade part of your energy system.", enabled: true }
    ];
    const tradeLocked = guidedMode && game.generation === 1;
    return h("div", { className: "action-panel clean-action-panel player-focus-panel" },
        h("div", { className: "turn-banner simplified-turn-banner" },
            h("div", null, h("p", { className: "eyebrow" }, `Action round ${game.actionRound}`), h("h2", null, `${player.name}, what will you do?`)),
            h("div", { className: "action-pips", "aria-label": `${player.actionsRemaining} actions remaining` }, ...Array.from({ length: game.config.rules.actionsPerGeneration }, (_, index) => h("i", { key: index, className: index < player.actionsRemaining ? "ready" : "spent" })), h("strong", null, `${player.actionsRemaining} left`))
        ),
        h("section", { className: "goal-and-bottleneck" },
            h("div", { className: "goal-card" }, h("small", null, "Your goal"), h("strong", null, `Produce ${target} Light`), h("span", null, `${Math.min(4, target + 1)} Light can earn a Reliability Point.`)),
            h("div", { className: "bottleneck-card" }, h("small", null, "Biggest bottleneck"), h("strong", null, guidance.headline), h("p", null, guidedMode ? guidance.detail : guidance.action), h("button", { type: "button", onClick: () => onInfo({ eyebrow: "System guidance", title: guidance.headline, summary: guidance.detail, details: [guidance.action] }) }, "How to improve it"))
        ),
        guidedMode && recommendation ? h("p", { className: "gentle-suggestion" }, h("span", null, "Suggested next move"), h("strong", null, friendlyActionName(recommendation.action, game))) : null,
        adaptable && !section ? h("button", { type: "button", className: "adapt-alert", onClick: () => choose({ kind: "adapt" }), disabled: !adaptStatus?.legal }, h("strong", null, `Respond to ${condition.name}`), h("span", null, "Spend one action to cancel its penalty.")) : null,
        !section ? h("div", { className: "primary-game-actions" },
            ...actionCards.map(card => h("button", { key: card.id, type: "button", className: `primary-game-action ${card.enabled ? "" : "locked"}`, disabled: !card.enabled, title: card.reason, onClick: () => card.id === "learn" ? choose({ kind: "research" }) : setSection(card.id) }, h("span", null, card.icon), h("strong", null, card.title), h("small", null, card.text), !card.enabled ? h("em", null, card.reason) : null))
        ) : null,
        !section ? h("div", { className: "secondary-game-actions" },
            button("⇄ Trade or Import", () => setSection("trade"), { kind: "ghost", disabled: tradeLocked, title: tradeLocked ? "Trade is introduced in Generation 2 when Guided Help is on." : "Exchange Warehouse resources." }),
            tradeLocked ? h("small", null, "Trade is introduced in Generation 2 in Guided Help.") : null
        ) : null,
        section ? h("div", { className: "section-step" },
            h("div", { className: "section-step-heading" }, button("← Actions", () => setSection(null), { kind: "ghost" }), h("h3", null, section === "gather" ? "Choose a resource" : section === "build" ? "Choose a technology" : "Choose how to trade")),
            section === "gather" ? h(GatherPanel, { game, player, onChoose: choose }) : null,
            section === "build" ? h(BuildShop, { game, player, guidedMode, onChoose: choose, onInfo }) : null,
            section === "trade" ? h("div", { className: "trade-sections" }, h("h4", null, "Public import — uses 1 action"), h(ImportChoices, { game, player, onChoose: choose }), h("h4", null, "Direct trade — uses 1 action"), h(TradePanel, { game, player, onTrade, message: tradeMessage })) : null
        ) : null,
        h("details", { className: "turn-utility-controls" },
            h("summary", null, "Turn controls"),
            h("div", { className: "safe-controls" }, button("Pass", () => choose({ kind: "pass" }), { kind: "ghost" }), button("Undo last confirmed action", onUndo, { kind: "ghost", disabled: game.undo.stack.length === 0 }), button("Reset Generation", onReset, { kind: "ghost", disabled: !game.undo.generationStart }))
        ),
        confirmation ? h(ConfirmationModal, { confirmation, onConfirm: confirm, onCancel: () => setConfirmation(null) }) : null
    );
}
function DispatchPanel({ game, player, onDispatch, onInfo }) {
    const recommended = useMemo(() => chooseDispatchPlan(game, player), [game, player.id]);
    const preview = useMemo(() => previewDispatch(game, player.id, recommended), [game, player.id]);
    const condition = conditionDefinition(game, player);
    const conditionImpact = condition ? conditionImpactPreview(game, player.id, condition) : null;
    const pathwayRows = Object.entries(recommended.transportByPathway).filter(([, value]) => value > 0);
    const sourceRows = Object.entries(preview.grossByPathway || {}).filter(([, value]) => value > 0);
    const lossRows = Object.entries(preview.lossBreakdown || {}).filter(([, value]) => value > 0);
    const bottleneck = preview.curtailed > 0
        ? `${preview.curtailed} Energy remains unused. Open the details to see whether more storage, Grid capacity or Lighting would help.`
        : preview.lossBreakdown?.lighting > 0
            ? `Lighting converts ${preview.transported} transported Energy into ${preview.light} Light.`
            : preview.transported >= preview.gridCapacity && preview.grossEnergy > preview.transported
                ? `The Grid is full at ${preview.gridCapacity} Energy.`
                : "The planned chain has no unused Energy bottleneck.";
    return h("div", { className: "action-panel dispatch-clean" }, h("div", { className: "turn-banner" }, h("div", null, h("p", { className: "eyebrow" }, "Use your Energy"), h("h2", null, `${player.name}'s Energy plan`)), badge(weatherLabels[game.weather.current], "weather")), h("p", { className: "dispatch-intro" }, "Review the complete chain below. Every card and upgrade is already included in these numbers."), condition ? h("button", { type: "button", className: "dispatch-condition-note", onClick: () => onInfo(localConditionExplanation(game, player, condition)) }, h("strong", null, condition.name), h("span", null, `${conditionImpact.values.join(" → ")} · ${conditionImpact.prompt}`)) : null, h("div", { className: "source-breakdown" }, h("strong", null, "Where Energy comes from"), sourceRows.length ? h("div", { className: "source-chips" }, ...sourceRows.map(([pathway, value]) => badge(`${pathwayLabels[pathway]} ${value}`, "energy"))) : h("small", null, "No Energy source can operate in this plan.")), h("div", { className: "visual-flow four-step" }, h("div", { className: "flow-node" }, h("span", null, "1"), h("strong", null, "Energy available"), h("b", null, preview.grossEnergy), h("small", null, sourceRows.map(([path, value]) => `${value} ${pathwayLabels[path]}`).join(" · ") || "No generation")), h("div", { className: "flow-arrow" }, "→"), h("div", { className: "flow-node" }, h("span", null, "2"), h("strong", null, `Grid · capacity ${preview.gridCapacity}`), h("b", null, preview.transported), h("small", null, pathwayRows.length ? pathwayRows.map(([path, value]) => `${value} ${pathwayLabels[path]}`).join(" · ") : "Nothing transported")), h("div", { className: "flow-arrow" }, "→"), h("div", { className: "flow-node" }, h("span", null, "3"), h("strong", null, `Lighting · maximum ${preview.lightingMaximum}`), h("b", null, preview.transported - (preview.lossBreakdown?.lighting || 0)), h("small", null, preview.lossBreakdown?.lighting ? `${preview.lossBreakdown.lighting} Energy lost in Lighting` : "No Lighting loss in this plan")), h("div", { className: "flow-arrow" }, "→"), h("div", { className: `flow-node light-result ${preview.pointEarned ? "reliable" : preview.demandMet ? "demand-met" : ""}` }, h("span", null, "4"), h("strong", null, "Light delivered"), h("b", null, preview.light), h("small", null, preview.pointEarned ? "+1 Reliability Point" : preview.pointCapped ? "Demand met · point cap reached" : preview.demandMet ? `Demand ${preview.target} met` : `Need ${preview.target}`))), h("div", { className: "dispatch-explanation" }, h("strong", null, "What limits this plan?"), h("p", null, bottleneck)), h("div", { className: "dispatch-metrics" }, stat("Stored after", preview.stored), stat("Total Energy lost", preview.systemLoss, lossRows.length ? lossRows.map(([kind, value]) => `${titleCase(kind)} ${value}`).join(" · ") : "No counted loss"), stat("Unused Energy", preview.curtailed)), preview.legal ? button(`Confirm plan · deliver ${preview.light} Light`, () => onDispatch(recommended), { kind: "primary large full" }) : h("div", { className: "notice error" }, `The recommended plan is not legal: ${preview.reason}`), h("details", { className: "dispatch-details" }, h("summary", null, "See every command in the plan"), h("ul", null, h("li", null, `Hydro released: ${recommended.hydroOutputRequested}.`), h("li", null, `Battery Energy discharged: ${Object.values(recommended.batteryDischargeInput).reduce((a, b) => a + b, 0)}.`), h("li", null, `Energy sent to storage: ${Object.values(recommended.batteryCharge).reduce((sum, allocation) => sum + Object.values(allocation).reduce((a, b) => a + b, 0), 0)}.`), h("li", null, `Transported by pathway: ${pathwayRows.map(([path, value]) => `${pathwayLabels[path]} ${value}`).join(", ") || "none"}.`))));
}
function ReviewScreen({ game, onContinue }) {
    return h("div", { className: "review redesigned-review" },
        h("div", { className: "action-heading" },
            h("div", null, h("p", { className: "eyebrow" }, "What happened?"), h("h2", null, `Generation ${game.generation} review`), h("p", { className: "muted" }, "See the energy story first. Open the technical details only when you want them.")),
            button(game.generation === 8 ? "Calculate final results" : "Continue", onContinue, { kind: "primary" })
        ),
        h("div", { className: "review-grid" }, ...currentOrder(game).map(id => {
            const player = game.players[id];
            const metrics = player.currentMetrics;
            const generated = totalEnergy(metrics.grossEnergy);
            const lost = sumLoss(metrics.systemLoss);
            const transported = Math.max(0, generated - metrics.curtailed - (metrics.storedEnd ?? 0));
            const condition = conditionDefinition(game, player);
            const goalMet = metrics.reliabilityMet;
            const difference = metrics.deliveredLight - metrics.reliabilityTarget;
            const reasons = [];
            if (game.weather.current)
                reasons.push(`${weatherLabels[game.weather.current]} shaped generation.`);
            if (condition)
                reasons.push(`${condition.name}: ${conditionImpactPreview(game, player.id, condition).impact}`);
            if (metrics.curtailed > 0)
                reasons.push(`${metrics.curtailed} Energy could not be used because storage, Grid or Lighting capacity was full.`);
            if (metrics.systemLoss.lighting > 0)
                reasons.push(`${metrics.systemLoss.lighting} Energy was lost while converting transported Energy into Light.`);
            if (metrics.technologiesBuilt.length)
                reasons.push(`${metrics.technologiesBuilt.length} technology upgrade${metrics.technologiesBuilt.length === 1 ? "" : "s"} changed the system this Generation.`);
            if (!reasons.length)
                reasons.push("The installed system operated without a special event or new upgrade changing the result.");
            return h("article", { key: id, className: `review-story-card ${goalMet ? "goal-met" : "goal-missed"}` },
                h("div", { className: "review-story-heading" }, h("div", null, h("small", null, player.name), h("h3", null, game.config.continents.find(continent => continent.id === player.continentId).name)), h("span", { className: goalMet ? "review-status success" : "review-status warning" }, goalMet ? "Goal achieved" : "Goal missed")),
                h("div", { className: "review-energy-story" },
                    h("div", null, h("small", null, "Generated"), h("strong", null, generated), h("span", null, "Energy")),
                    h("b", null, "→"),
                    h("div", null, h("small", null, "Lost"), h("strong", null, lost), h("span", null, "Energy")),
                    h("b", null, "→"),
                    h("div", null, h("small", null, "Delivered"), h("strong", null, metrics.deliveredLight), h("span", null, "Light"))
                ),
                h("p", { className: "review-goal-line" }, goalMet ? difference > 0 ? `You delivered ${difference} more Light than the goal.` : "You delivered exactly the Light required." : `You needed ${Math.abs(difference)} more Light.`),
                h("div", { className: "review-why" }, h("strong", null, "What made the difference"), ...reasons.slice(0, 3).map((reason, index) => h("p", { key: index }, reason))),
                h("details", { className: "review-technical" },
                    h("summary", null, "See full energy calculation"),
                    h("div", { className: "mini-stats" }, stat("Need", metrics.reliabilityTarget), stat("Reliability point", metrics.reliabilityPointEarned ? "+1" : metrics.reliabilityPointCapped ? "Cap" : "—"), stat("Stored", metrics.storedEnd), stat("Unused", metrics.curtailed), stat("System loss", lost), stat("Demand", goalMet ? "Met" : "Missed")),
                    h("p", { className: "muted" }, `Gross by pathway: ${Object.entries(metrics.grossEnergy).filter(([, value]) => value > 0).map(([path, value]) => `${pathwayLabels[path]} ${value}`).join(" · ") || "none"}.`),
                    h("p", { className: "muted" }, `Loss breakdown: Thermal ${metrics.systemLoss.thermal} · Battery ${metrics.systemLoss.battery} · Lighting ${metrics.systemLoss.lighting} · Other ${metrics.systemLoss.other}.`)
                )
            );
        }))
    );
}
function ResultsScreen({ game, onRestart }) {
    const qualified = game.results.some(result => result.finalDemandMet);
    return h("div", { className: "results" }, h("div", { className: "sun-mark small" }, h("span", null, "☀")), h("p", { className: "eyebrow" }, "Eight Generations complete"), h("h1", null, qualified ? "Final Results" : "No qualified winner"), !qualified ? h("div", { className: "notice warning" }, "No player delivered the required four Light in either Generation 7 or 8. The table shows the closest result, but no region completed the final reliability test.") : null, h("div", { className: "results-table" }, ...game.results.map(result => {
        const player = game.players[result.playerId];
        return h("div", { key: result.playerId, className: `result-row ${result.rank === 1 && result.finalDemandMet ? "winner" : ""}` }, h("strong", { className: "rank" }, result.rank), h("div", null, h("h3", null, player.name), h("small", null, game.config.continents.find(c => c.id === player.continentId).name)), stat("Light", result.totalLight), stat("Reliability", `${result.reliableGenerations}/${game.config.rules.reliabilityPointMaximum ?? 4}`), stat("Final Light", result.finalDemandMet ? "Qualified" : "Missed"), stat("Demand met", `${result.demandMetGenerations}/8`), stat("System Loss", result.systemLoss), stat("Stored", result.usableStoredEnergy));
    })), h("div", { className: "form-row" }, button("New Game", onRestart, { kind: "primary" }), button("Export results JSON", () => download(`sunpaths-results-${game.seed}.json`, JSON.stringify({ seed: game.seed, results: game.results, log: game.log }, null, 2)), { kind: "secondary" })));
}
function FocusStrip({ game, player, onInfo }) {
    if (!game.generation || game.phase === "game.complete")
        return null;
    const target = game.config.demand.reliabilityTargets[game.generation] ?? 0;
    const actions = player?.actionsRemaining ?? 0;
    const condition = conditionDefinition(game, player);
    return h("section", { className: "focus-strip", "aria-label": "Current game focus" },
        h("div", { className: "focus-generation" }, h("small", null, "Generation"), h("strong", null, `${game.generation} of ${game.config.rules.generations}`)),
        h("div", { className: "focus-goal" }, h("small", null, "Your goal"), h("strong", null, `💡 ${target} Light`), h("span", null, `${Math.min(4, target + 1)} can earn a point`)),
        h("button", { type: "button", className: "focus-weather current", onClick: () => onInfo(weatherExplanation(game, player, game.weather.current, "Current Condition")) }, h("small", null, "Now"), h("strong", null, weatherLabels[game.weather.current] || "—")),
        h("button", { type: "button", className: "focus-weather forecast", onClick: () => onInfo(weatherExplanation(game, player, game.weather.forecast, "Next Forecast")) }, h("small", null, "Next"), h("strong", null, game.weather.forecast ? weatherLabels[game.weather.forecast] : "—")),
        h("div", { className: "focus-actions" }, h("small", null, "Moves"), h("span", { "aria-label": `${actions} actions remaining` }, ...Array.from({ length: game.config.rules.actionsPerGeneration }, (_, index) => h("i", { key: index, className: index < actions ? "ready" : "spent" })))),
        condition ? h("button", { type: "button", className: "focus-condition", onClick: () => onInfo(localConditionExplanation(game, player, condition)) }, h("small", null, "Local card"), h("strong", null, condition.name)) : null
    );
}

function GameHeader({ game, selectedPlayer, onInfo, onHome, onCards, onRules, onSave, onLoad, onToggleGuided }) {
    return h("header", { className: "game-header simplified-header" },
        h("button", { type: "button", className: "brand", onClick: onHome }, h("span", null, "☀"), "SUNPATHS"),
        h("div", { className: "generation-strip" }, h("strong", null, game.generation ? `Generation ${game.generation}/8` : "Pregame"), badge(phaseLabel(game.phase))),
        h("nav", { className: "header-actions", "aria-label": "Game reference and save controls" },
            button("Cards", onCards, { kind: "ghost" }),
            button("Rules", onRules, { kind: "ghost" }),
            h("details", { className: "header-more" }, h("summary", null, "More"), h("div", null, button(`Guided Help: ${game.uiMode === "strategy" ? "Off" : "On"}`, onToggleGuided, { kind: "ghost" }), button("Save game", onSave, { kind: "ghost" }), h("label", { className: "button ghost file-button" }, "Load game", h("input", { type: "file", accept: ".json,application/json", onChange: onLoad }))))
        )
    );
}
function GameScreen({ game, setGame, onHome, onCards, onRules, onLoad }) {
    const firstHumanId = Object.values(game.players).find(player => player.controller.kind === "human")?.id || Object.keys(game.players)[0];
    const [selectedId, setSelectedId] = useState(firstHumanId);
    const [notice, setNotice] = useState("");
    const [feedback, setFeedback] = useState(null);
    const [tradeMessage, setTradeMessage] = useState("");
    const [info, setInfo] = useState(null);
    const [conditionQueue, setConditionQueue] = useState([]);
    const [lastConditionGeneration, setLastConditionGeneration] = useState(0);
    useEffect(() => {
        if (!game.players[selectedId])
            setSelectedId(firstHumanId);
    }, [game, selectedId, firstHumanId]);
    useEffect(() => {
        const active = currentPlayer(game);
        if (active?.controller.kind === "human")
            setSelectedId(active.id);
    }, [game.phase, game.activeTurnIndex, game.actionRound]);
    useEffect(() => {
        const pending = game.opening?.summit?.pendingOffer;
        const active = currentPlayer(game);
        const needsOpeningAi = (game.phase === "setup.summit" && ((pending && game.players[pending.recipientId]?.controller.kind === "ai") || (!pending && active?.controller.kind === "ai")))
            || (game.phase === "setup.foundingProjects" && active?.controller.kind === "ai");
        if (!needsOpeningAi)
            return;
        const next = clone(game);
        pumpAi(next);
        setGame(next);
    }, [game.phase, game.opening?.summit?.activeIndex, game.opening?.summit?.pendingOffer?.recipientId, game.opening?.foundingIndex]);
    useEffect(() => {
        if (game.phase === "generation.development" && game.generation > lastConditionGeneration) {
            const humanIds = currentOrder(game).filter(id => game.players[id].controller.kind === "human" && game.players[id].localCondition);
            if (humanIds.length)
                setConditionQueue(humanIds);
            setLastConditionGeneration(game.generation);
        }
    }, [game.phase, game.generation, lastConditionGeneration]);
    const selected = game.players[selectedId] || Object.values(game.players)[0];
    const guidedMode = game.uiMode !== "strategy";
    const mutate = (operation, runAi = true, successFeedback = null) => {
        try {
            const next = clone(game);
            operation(next);
            if (runAi)
                pumpAi(next);
            const errors = invariantErrors(next);
            if (errors.length)
                throw new Error(errors.join("\n"));
            setGame(next);
            setNotice("");
            if (successFeedback)
                setFeedback(successFeedback);
            return true;
        }
        catch (e) {
            setNotice(e.message);
            return false;
        }
    };
    const command = (commandValue, successFeedback = null) => mutate(next => applyCommand(next, commandValue), true, successFeedback);
    const buildFeedback = (player, technologyId, linkText = "") => {
        const technology = getTechnology(game, technologyId);
        const impact = technologyImpactPreview(game, player.id, technology);
        return {
            title: `${technology.name} is now connected`,
            summary: impact.now,
            metrics: impact.metrics.slice(0, 3),
            prompt: `${impact.future} ${impact.prompt}`,
            linkText
        };
    };
    const actionFeedback = (player, action) => {
        if (action.kind === "build")
            return buildFeedback(player, action.technologyId);
        if (action.kind === "research")
            return { title: "Technical readiness increased", summary: "Your institutions and workforce can now support more demanding technology.", metrics: [], prompt: "Open Build to see which upgrades are now closer or newly legal." };
        if (action.kind === "extract")
            return { title: `${resourceLabels[action.resource]} moved to your Warehouse`, summary: "You converted part of your regional reserve into a resource that can be spent this Generation.", metrics: [], prompt: "Use it for a complete technology cost, trade, or import payment." };
        if (action.kind === "harvestBiomass")
            return { title: "Biomass moved to your Warehouse", summary: "You prepared one renewable fuel unit for a Biomass plant.", metrics: [], prompt: "Biomass can regrow, but only at the rate supported by your installed system." };
        if (action.kind === "publicImport")
            return { title: `${resourceLabels[action.receive]} imported`, summary: "You exchanged other Warehouse resources for a scarce global input.", metrics: [], prompt: "Check Build again to see which complete costs are now affordable." };
        if (action.kind === "adapt")
            return { title: "Local condition adapted to", summary: "You spent one action to cancel this Generation's adaptable penalty.", metrics: [], prompt: "Your remaining actions can now focus on the energy system." };
        return null;
    };
    const act = action => {
        const player = currentPlayer(game);
        return command({ type: "developmentAction", playerId: player.id, action }, guidedMode ? actionFeedback(player, action) : null);
    };
    const dispatch = plan => { const player = currentPlayer(game); return command({ type: "dispatch", playerId: player.id, plan }); };
    const selectPrepared = (playerId, pathwayId, capabilityId) => command({ type: "selectPrepared", playerId, pathwayId, capabilityId });
    const save = () => download(`sunpaths-${game.seed}-g${game.generation}.json`, serializeGame(game));
    const toggleGuided = () => { const next = clone(game); next.uiMode = next.uiMode === "strategy" ? "guided" : "strategy"; setGame(next); };
    const trade = (recipientId, offer, request) => {
        const actor = currentPlayer(game);
        const recipient = game.players[recipientId];
        if (!actor || !recipient)
            return false;
        const recipientNeed = recipient.resources[offer].warehouse <= 2 ? 2 : recipient.resources[offer].warehouse <= 4 ? 1 : 0;
        const recipientCost = recipient.resources[request].warehouse <= 1 ? 2 : recipient.resources[request].warehouse <= 3 ? 1 : 0;
        if (recipient.controller.kind === "ai" && recipientNeed < recipientCost) {
            setTradeMessage(`${recipient.name} declined because ${resourceLabels[request]} is more valuable to them right now.`);
            return false;
        }
        const accepted = command({ type: "directTrade", aId: actor.id, bId: recipientId, aGives: { [offer]: 1 }, bGives: { [request]: 1 } });
        if (accepted)
            setTradeMessage(`${recipient.name} accepted. One Development action was used.`);
        return accepted;
    };
    const continueReview = () => mutate(next => {
        applyCommand(next, { type: "finishReview" });
        if (next.phase === "generation.advanceWeather")
            applyCommand(next, { type: "advanceWeather" });
    }, false);
    let decision = null;
    if (game.phase.startsWith("setup."))
        decision = h(SetupProgress, { game, command: value => command(value), onSelect: selectPrepared });
    else if (game.phase === "generation.start")
        decision = panel("A new Generation begins", h("div", { className: "generation-start-card" }, h("p", null, `Today: ${weatherLabels[game.weather.current]}. Next forecast: ${game.weather.forecast ? weatherLabels[game.weather.forecast] : "none"}.`), h("strong", null, `You need ${game.config.demand.reliabilityTargets[game.generation || 1]} Light. One extra earns a Reliability Point.`), button("Start Generation", () => command({ type: "beginGeneration" }), { kind: "primary large" })));
    else if (game.phase === "generation.localConditions")
        decision = panel("Reveal Local Conditions", h("div", { className: "generation-start-card" }, h("p", null, "Each continent receives one temporary condition. The game will pause and explain yours before your first action."), button("Reveal cards", () => command({ type: "drawLocalConditions" }), { kind: "primary large" })));
    else if (game.phase === "generation.development") {
        const active = currentPlayer(game);
        decision = active?.controller.kind === "human" ? h(DevelopmentControls, { game, player: active, onAction: act, onUndo: () => command({ type: "undo" }), onReset: () => command({ type: "resetGeneration" }), onTrade: trade, tradeMessage, onInfo: setInfo }) : panel("Computer players are thinking", h("p", null, "Their legal actions are being resolved. Your turn will appear automatically."));
    }
    else if (game.phase === "generation.dispatch") {
        const active = currentPlayer(game);
        decision = active?.controller.kind === "human" ? h(DispatchPanel, { game, player: active, onDispatch: dispatch, onInfo: setInfo }) : panel("Computer players are using their Energy", h("p", null, "Your Energy plan will appear when they finish."));
    }
    else if (game.phase === "generation.review")
        decision = h(ReviewScreen, { game, onContinue: continueReview });
    else if (game.phase === "game.complete")
        decision = h(ResultsScreen, { game, onRestart: onHome });
    const market = game.innovationMarket.visible.length
        ? panel("Advanced technology market", h("div", { className: "market-list" }, ...game.innovationMarket.visible.map(id => {
            const tech = getTechnology(game, id);
            return h("button", { type: "button", key: id, className: "market-mini-card", onClick: () => setInfo(technologyExplanation(game, selected, tech)) }, h("strong", null, tech.name), h("small", null, (() => { const cost = effectiveBuildCost(game, selected, tech); return `${cost.constructionMaterials} General · ${cost.criticalMaterials} Critical · Knowledge ${cost.knowledgeRequired}`; })()));
        })), "nested")
        : panel("Technology ladder", h("div", { className: "prose" }, h("p", null, "Every pathway is visible from the start: Knowledge 1 Basic → Knowledge 3 Upgrade → Knowledge 5 Advanced."), h("p", { className: "muted" }, "An upgrade replaces the previous tier instead of adding another copy.")), "nested");
    const events = panel("Recent events", h("div", { className: "event-log" }, ...game.log.slice(-8).reverse().map(event => h("p", { key: event.sequence }, h("small", null, `#${event.sequence}`), event.message))), "nested");
    const body = game.phase === "game.complete"
        ? decision
        : h("main", { className: `game-main phase6 ${guidedMode ? "guided" : "strategy"}` },
            h("div", { className: "game-left" },
                h(WorldArea, { game, selectedId, setSelectedId }),
                guidedMode ? h("details", { className: "board-details" }, h("summary", null, `View ${selected.name}'s full player board`), h(PlayerBoard, { game, player: selected, onInfo: setInfo })) : h(PlayerBoard, { game, player: selected, onInfo: setInfo })
            ),
            h("aside", { className: "game-right" },
                decision,
                guidedMode ? h("details", { className: "more-game-info" }, h("summary", null, "More game information"), market, events) : h(React.Fragment, null, market, events),
                game.debugMode ? h(React.Fragment, null, h(AiDebugPanel, { game }), h(DebugDrawer, { game })) : null
            )
        );
    const revealPlayer = conditionQueue.length ? game.players[conditionQueue[0]] : null;
    return h("div", { className: "game-shell phase6-shell" },
        h(GameHeader, { game, selectedPlayer: selected, onInfo: setInfo, onHome, onCards, onRules, onSave: save, onLoad, onToggleGuided: toggleGuided }),
        game.phase !== "game.complete" ? h(FocusStrip, { game, player: selected, onInfo: setInfo }) : null,
        notice ? h("div", { className: "notice error" }, h("strong", null, "That action was not taken."), h("span", null, notice), button("Dismiss", () => setNotice(""), { kind: "ghost" })) : null,
        feedback ? h("section", { className: "system-feedback contextual-feedback", "aria-live": "polite" },
            h("div", null, h("p", { className: "eyebrow" }, "Why this mattered"), h("strong", null, feedback.title), h("p", null, feedback.summary), feedback.linkText ? h("small", null, feedback.linkText) : null),
            feedback.metrics?.length ? h("div", { className: "feedback-metrics" }, ...feedback.metrics.map(metric => h("span", { key: metric.label }, h("small", null, metric.label), h("b", null, `${metric.before}${metric.unit} → ${metric.after}${metric.unit}`)))) : null,
            h("p", { className: "feedback-next" }, h("b", null, "Next: "), feedback.prompt),
            button("Continue", () => setFeedback(null), { kind: "ghost" })
        ) : null,
        body,
        revealPlayer ? h(ConditionReveal, { game, player: revealPlayer, onInfo: setInfo, onContinue: () => setConditionQueue(queue => queue.slice(1)) }) : null,
        info ? h(InfoModal, { info, onClose: () => setInfo(null) }) : null
    );
}
function AiDebugPanel({ game }) {
    const event = [...game.log].reverse().find(item => item.type === "ai.decision" || item.type === "ai.tradeDecision");
    if (!event)
        return panel("AI decision debugging", h("p", { className: "muted" }, "No AI decision has been recorded yet."), "nested");
    const factors = Array.isArray(event.data?.factors) ? event.data.factors : [];
    return panel("AI decision debugging", h("div", { className: "ai-debug" }, h("strong", null, event.message), ...factors.map((item, index) => h("div", { key: `${event.sequence}-${index}` }, h("span", null, item.label), h("b", null, Number(item.score).toFixed(1)), h("small", null, item.detail)))), "nested");
}
function DebugDrawer({ game }) {
    const snapshot = buildDebugSnapshot(game);
    const rows = [
        ["Phase", snapshot.phase],
        ["Generation", snapshot.generation],
        ["Active player", snapshot.activePlayerId || "none"],
        ["Actions", snapshot.actionsRemaining ?? "n/a"],
        ["Weather", snapshot.weather || "none"],
        ["Forecast", snapshot.forecast || "none"],
        ["Summit round", snapshot.summit?.round ?? "not active"],
        ["Pending offer", snapshot.summit?.pendingOffer ? `${snapshot.summit.pendingOffer.proposerId} → ${snapshot.summit.pendingOffer.recipientId}` : "none"],
        ["Seed", snapshot.seed]
    ];
    return h("details", { className: "debug-drawer" }, h("summary", null, "Debug drawer"), h("div", { className: "debug-grid" }, ...rows.map(([label, value]) => h("p", { key: label }, h("small", null, label), h("strong", null, String(value))))), h("div", { className: "form-row compact" }, button("Download bug report", () => download(`sunpaths-bug-${snapshot.seed}.txt`, formatBugReport(game), "text/plain"), { kind: "secondary" }), button("Download save", () => download(`sunpaths-debug-${snapshot.seed}.json`, serializeGame(game)), { kind: "secondary" })), h("pre", { className: "debug-events" }, snapshot.recentEvents.map(event => `#${event.sequence} ${event.type}: ${event.message}`).join("\n")));
}
export { GameScreen, PlayerBoard, DevelopmentControls, DispatchPanel, ReviewScreen, ResultsScreen, AiDebugPanel, DebugDrawer };

