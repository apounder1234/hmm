// @ts-nocheck
import { uiShared } from "./uiShared.js";
import { SetupProgress, WeatherCard } from "./uiSetup.js";
import { buildDebugSnapshot, formatBugReport } from "./debug.js";
const { React, useEffect, useMemo, useRef, useState, createRoot, defaultConfig, validateConfig, createGame, applyCommand, currentOrder, currentPlayerId, canCompleteFoundingProject, foundingProjectDefinition, activeGlobalEvent, directTradeBlocked, describeCostModifiers, getContinentProfile, getKnowledgeRequirement, getLightingLevel, getPathwayAffinity, getTransmissionLevel, invariantErrors, gatherAmount, getTechnology, pathways, totalEnergy, totalLoss, warehouseTotal, hasRelevantSystem, aiPrepared, chooseDevelopmentDecision, chooseDispatchPlan, pumpAi, deserializeGame, serializeGame, defaultSimulationScenario, technologyDataSets, aggregateReportToCsv, balanceFlagsToCsv, playerResultsToCsv, simulationReportToJson, buildLegality, conditionImpactPreview, developmentActionLegality, effectiveBuildCost, getActionPreview, getConditionRelevance, getCurrentMaximumLight, getDevelopmentConstraint, getEndGameDebrief, getEnergyChainBreakdown, getGenerationExplanation, getPrimaryBottleneck, getReliabilityTarget, getRequiredLight, importLegality, previewDispatch, systemGuidance, systemSnapshot, technologyImpactPreview, technologyReadiness, temporaryKnowledgeUnlocks, h, continentIcons, weatherLabels, resourceLabels, pathwayLabels, capabilityLabels, affinityLabels, abilityDescriptions, penaltyDescriptions, strategyLabels, strategies, resourceKeys, resourceDescriptions, stageDescriptions, weatherDescriptions, newRandomSeed, localConditionExplanation, weatherExplanation, technologyExplanation, resourceExplanation, scoringExplanation, globalEventExplanation, clone, number, titleCase, sumLoss, phaseLabel, currentPlayer, conditionDefinition, button, panel, infoButton, InfoModal, ConfirmationModal, ConditionReveal, friendlyActionName, learningCostPreview, actionConfirmation, stat, badge, meter, energyCubes, download, makeParticipants } = uiShared;
const mapResourceMeta = {
    fossilFuel: { icon: "●", short: "Fuel" },
    biomass: { icon: "♣", short: "Biomass" },
    constructionMaterials: { icon: "▦", short: "Other" },
    criticalMaterials: { icon: "◆", short: "Critical" }
};
function MapResource({ game, player, resource, interactive, onExtract, onBlocked, expanded }) {
    const meta = mapResourceMeta[resource];
    const account = player.resources[resource];
    const action = { kind: "extract", resource };
    const legality = interactive ? developmentActionLegality(game, player.id, action) : null;
    const amount = gatherAmount(game, player, resource);
    const specialty = amount > (game.config.resources?.normalExtractionYield ?? 1);
    const content = expanded
        ? h(React.Fragment, null,
            h("span", { className: "map-resource-symbol", "aria-hidden": "true" }, meta.icon),
            h("span", { className: "map-resource-name" }, meta.short),
            h("strong", null, account.currentContinent),
            specialty ? h("em", null, `×${amount}`) : null)
        : h(React.Fragment, null,
            h("span", { className: "map-resource-symbol", "aria-hidden": "true" }, meta.icon),
            h("strong", null, account.currentContinent),
            specialty ? h("em", null, `×${amount}`) : null);
    if (!interactive)
        return h("span", { className: `map-resource ${expanded ? "expanded" : "compact"}` }, content);
    return h("button", {
        type: "button",
        className: `map-resource extractable ${expanded ? "expanded" : "compact"} ${legality?.legal ? "" : "unavailable"}`,
        "aria-disabled": legality?.legal ? "false" : "true",
        onClick: event => {
            event.stopPropagation();
            if (legality?.legal) onExtract(resource);
            else onBlocked?.(legality?.reason || "That resource cannot be extracted right now.");
        },
        "aria-label": legality?.legal
            ? `Extract ${amount} ${resourceLabels[resource]} from ${getContinentProfile(game, player).name}`
            : `${resourceLabels[resource]} cannot be extracted right now: ${legality?.reason || "unavailable"}`
    }, content);
}
function ContinentMarker({ game, player, expanded, active, onToggle, onExtract, onBlocked, position }) {
    const continent = getContinentProfile(game, player);
    const condition = conditionDefinition(game, player);
    const interactive = player.id === currentPlayerId(game) && game.phase === "generation.development" && player.controller.kind === "human";
    return h("article", {
        className: `map-marker ${expanded ? "expanded" : ""} ${active ? "active-turn" : ""}`,
        style: { left: position.left, top: position.top },
        onClick: event => event.stopPropagation()
    },
        h("button", {
            type: "button",
            className: "continent-toggle",
            onClick: () => onToggle(player.id),
            "aria-expanded": expanded,
            "aria-label": `${expanded ? "Collapse" : "Expand"} ${continent.name}`
        },
            h("span", { className: "marker-dot", "aria-hidden": "true" }, continentIcons[continent.id]),
            expanded ? h("span", { className: "marker-copy" }, h("strong", null, continent.name), h("small", null, player.name)) : null,
            condition ? h("span", { className: "marker-condition", "aria-label": "Local Condition active" }, "!") : null
        ),
        h("div", { className: `map-resource-strip ${expanded ? "expanded" : "compact"}` },
            ...resourceKeys.map(resource => h(MapResource, { key: resource, game, player, resource, interactive, onExtract, onBlocked, expanded })),
            h("span", { className: `map-light-total ${expanded ? "expanded" : "compact"}`, "aria-label": `${player.cumulative.totalLight} total Light` },
                h("span", { "aria-hidden": "true" }, "✦"),
                expanded ? h("span", { className: "map-resource-name" }, "Light") : null,
                h("strong", null, player.cumulative.totalLight)
            )
        ),
        expanded ? h("div", { className: "continent-expanded-meta" },
            h("span", null, h("small", null, "Signature"), h("strong", null, pathwayLabels[continent.signatureRenewable])),
            h("span", null, h("small", null, "Knowledge"), h("strong", null, player.temporaryKnowledge ? `${player.knowledge}+${player.temporaryKnowledge}` : player.knowledge)),
            h("span", null, h("small", null, "Grid"), h("strong", null, getTransmissionLevel(game, player.id))),
            h("span", null, h("small", null, "Last Light"), h("strong", null, player.lightByGeneration[game.generation - 1] ?? "—"))
        ) : null
    );
}
function MapWarehouse({ game, player }) {
    if (!player) return null;
    return h("div", { className: "map-warehouse", "aria-label": `${player.name} Warehouse ${warehouseTotal(player)} of ${game.config.rules.warehouseMaximum}` },
        h("strong", null, `Warehouse ${warehouseTotal(player)}/${game.config.rules.warehouseMaximum}`),
        h("div", null, ...resourceKeys.map(resource => h("span", { key: resource }, h("b", { "aria-hidden": "true" }, mapResourceMeta[resource].icon), player.resources[resource].warehouse)))
    );
}
function WorldArea({ game, expandedId, onToggle, onExtract, onBlocked, transfer }) {
    const positions = {
        northAmerica: { left: "19%", top: "28%" },
        southAmerica: { left: "31%", top: "65%" },
        europe: { left: "50%", top: "24%" },
        africa: { left: "52%", top: "52%" },
        asia: { left: "72%", top: "31%" },
        australia: { left: "84%", top: "68%" }
    };
    const activeId = currentPlayerId(game);
    const activePlayer = activeId ? game.players[activeId] : null;
    const transferPlayer = transfer ? game.players[transfer.playerId] : null;
    const transferPosition = transferPlayer ? positions[transferPlayer.continentId] : null;
    return panel("World board", h("div", { className: "world-map-shell" },
        h("div", { className: `world-map ${expandedId ? "has-expanded-region" : ""}`, role: "group", "aria-label": "Six-continent game map", onClick: () => expandedId && onToggle(expandedId) },
            h("svg", { className: "world-silhouette", viewBox: "0 0 1000 500", role: "img", "aria-label": "Stylised world map" },
                h("path", { d: "M70 110 C130 55 230 55 310 105 L280 170 220 190 180 245 110 215 55 160 Z" }),
                h("path", { d: "M245 245 C305 230 350 260 365 320 L340 430 292 470 265 385 220 320 Z" }),
                h("path", { d: "M420 115 C500 70 650 75 760 110 L885 170 830 235 720 220 650 185 590 210 500 180 430 195 390 155 Z" }),
                h("path", { d: "M460 205 C535 185 610 220 620 300 L570 405 505 380 455 300 425 235 Z" }),
                h("path", { d: "M760 310 C820 280 900 305 940 365 L900 430 815 420 755 370 Z" })
            ),
            ...currentOrder(game).map(id => h(ContinentMarker, { key: id, game, player: game.players[id], expanded: id === expandedId, active: id === activeId, onToggle, onExtract, onBlocked, position: positions[game.players[id].continentId] })),
            transfer && transferPosition ? h("div", {
                key: transfer.id,
                className: "resource-transfer",
                style: { "--from-left": transferPosition.left, "--from-top": transferPosition.top }
            }, ...Array.from({ length: transfer.amount }, (_, index) => h("span", { key: index, style: { animationDelay: `${index * 80}ms` } }, mapResourceMeta[transfer.resource].icon))) : null,
            h(MapWarehouse, { game, player: transferPlayer ?? activePlayer })
        )
    ));
}
function Warehouse({ game, player, onInfo }) {
    return h("div", { className: "warehouse-grid compact-warehouse" }, ...resourceKeys.map(key => {
        const account = player.resources[key];
        return h("button", { type: "button", key, className: "resource-cell", onClick: () => onInfo(resourceExplanation(game, player, key)), "aria-label": `${resourceLabels[key]} in Warehouse: ${account.warehouse}` },
            h("span", { className: "warehouse-resource-icon", "aria-hidden": "true" }, mapResourceMeta[key].icon),
            h("small", null, mapResourceMeta[key].short),
            h("strong", null, account.warehouse)
        );
    }));
}
function TechnologyList({ game, player, onInfo }) {
    return h("div", { className: "technology-list" }, ...player.installed.map(instance => {
        const tech = getTechnology(game, instance.technologyId);
        const stored = totalEnergy(instance.storageInput);
        const pending = totalEnergy(instance.pendingStorageInput ?? Object.fromEntries(pathways.map(pathway => [pathway, 0])));
        const impact = technologyImpactPreview(game, player.id, tech);
        const primaryMetric = impact.metrics.find(metric => metric.after > metric.before);
        return h("article", { key: instance.instanceId, className: "technology-card" }, h("div", null, h("strong", null, tech.name), h("small", null, `${titleCase(tech.stage)} · ${tech.pathway === "shared" ? "Shared" : pathwayLabels[tech.pathway]}`), h("em", { className: "technology-visible-benefit" }, primaryMetric ? `${primaryMetric.label}: ${primaryMetric.after}${primaryMetric.unit}` : impact.now)), h("div", { className: "technology-meta" }, tech.storage ? badge(`${stored} now${pending ? ` · ${pending} later` : ""}/${tech.storage.capacity}`, "energy") : badge(`Capacity ${tech.capacity}`), infoButton(() => onInfo(technologyExplanation(game, player, tech)), `Explain ${tech.name}`)));
    }));
}
function FlowPips({ count, kind = "energy", maximum = 8 }) {
    const visible = Math.max(0, Math.min(maximum, Math.floor(count ?? 0)));
    return h("span", { className: `flow-pips ${kind}`, "aria-label": `${visible} ${kind}` },
        ...Array.from({ length: visible }, (_, index) => h("i", { key: index, "aria-hidden": "true" }))
    );
}
function EnergyChain({ game, player, onInfo, planning = true, compact = false }) {
    const chain = getEnergyChainBreakdown(game, player.id);
    const sourceIcons = { solar: "☀", wind: "≋", hydro: "💧", biomass: "🌿", fossil: "⛽" };
    const activeSources = Object.entries(chain.sourceByPathway)
        .filter(([, value]) => value > 0)
        .map(([pathway]) => h("span", { key: pathway, className: `flow-path-icon source-${pathway}`, "aria-label": pathwayLabels[pathway] }, sourceIcons[pathway]));
    const fossilStorageLoss = chain.fossilChain?.storageLoss ?? 0;
    const recoveryLoss = Math.max(0, chain.storageLoss - fossilStorageLoss);
    const afterStorage = Math.max(0, chain.grossGenerated - fossilStorageLoss) + chain.storageReleased;
    const afterTransformation = chain.usableEnergy;
    const pendingBattery = chain.chargedForNextGeneration ?? 0;
    const pendingReservoir = chain.reservoirCapturedForNextGeneration ?? 0;
    const summary = `${chain.grossGenerated} Energy at Source, ${afterStorage} after Storage, ${afterTransformation} after Transformation, ${chain.deliveredEnergy} through the Grid and ${chain.lightProduced} Light.`;
    const lossMarks = (count, label) => count > 0
        ? h("span", { className: "flow-loss", "aria-label": `${count} Energy lost at ${label}` }, ...Array.from({ length: Math.min(8, count) }, (_, index) => h("i", { key: index })))
        : h("span", { className: "flow-pass", "aria-label": `No Energy lost at ${label}` }, "→");
    const stage = ({ className, icon, label, value, loss = 0, infoTitle, infoSummary, children = [] }) => h("button", {
        type: "button",
        className: `graphic-flow-stage ${className}`,
        onClick: () => onInfo({ eyebrow: "Energy flow", title: infoTitle, summary: infoSummary, details: [summary] })
    },
        h("small", { className: "flow-stage-label" }, label),
        h("span", { className: "flow-stage-main" },
            h("span", { className: "flow-stage-icon", "aria-hidden": "true" }, icon),
            h("span", { className: "flow-stage-content" },
                h("span", { className: "flow-value-row" }, h(FlowPips, { count: value, maximum: 12 }), h("b", { className: "flow-stage-total" }, value)),
                lossMarks(loss, label),
                ...children
            )
        )
    );
    return h("div", { className: `energy-chain graphic-energy-chain complete-chain ${compact ? "compact" : ""}`, role: "group", "aria-label": summary },
        h("div", { className: "graphic-flow-row complete-flow-row" },
            stage({
                className: "stage-source",
                icon: "⚡",
                label: "Source",
                value: chain.grossGenerated,
                infoTitle: "Source Energy",
                infoSummary: `${chain.grossGenerated} Energy is available from current pathways before Storage and Transformation.`,
                children: [h("span", { key: "sources", className: "flow-path-icons", "aria-label": "Active pathways" }, ...(activeSources.length ? activeSources : [h("span", { key: "none", className: "flow-path-icon muted" }, "·")]))]
            }),
            h("span", { className: "graphic-flow-arrow", "aria-hidden": "true" }, "›"),
            stage({
                className: "stage-storage",
                icon: "▣",
                label: "Storage",
                value: afterStorage,
                loss: chain.storageLoss,
                infoTitle: "Storage",
                infoSummary: chain.storageReleased
                    ? `${chain.storageReleased} Energy stored in an earlier Generation is released now.`
                    : fossilStorageLoss
                        ? `${fossilStorageLoss} Energy is lost in Fuel storage.`
                        : "Energy passes through this stage; no stored Energy is released now.",
                children: chain.storageReleased
                    ? [h("span", { key: "released", className: "flow-stage-note", "aria-label": `${chain.storageReleased} Energy released from earlier storage` }, "▣+", chain.storageReleased)]
                    : []
            }),
            h("span", { className: "graphic-flow-arrow", "aria-hidden": "true" }, "›"),
            stage({
                className: "stage-transformation",
                icon: "⚙",
                label: "Transformation",
                value: afterTransformation,
                loss: chain.transformationLoss,
                infoTitle: "Transformation",
                infoSummary: chain.transformationLoss
                    ? `${chain.transformationLoss} Energy is lost while Fuel or Biomass is transformed.`
                    : "Energy passes through Transformation without an additional loss in the current system."
            }),
            h("span", { className: "graphic-flow-arrow", "aria-hidden": "true" }, "›"),
            stage({
                className: "stage-grid",
                icon: "↔",
                label: "Grid",
                value: chain.deliveredEnergy,
                loss: chain.unusedEnergy,
                infoTitle: "Grid",
                infoSummary: `${chain.deliveredEnergy} of ${chain.gridCapacity} Grid capacity is used.`
            }),
            h("span", { className: "graphic-flow-arrow", "aria-hidden": "true" }, "›"),
            stage({
                className: "stage-lighting",
                icon: "💡",
                label: "Light",
                value: chain.lightProduced,
                loss: chain.lightingLoss,
                infoTitle: "Lighting",
                infoSummary: `${chain.deliveredEnergy} Energy reaches Lighting and produces ${chain.lightProduced} Light.`
            })
        ),
        pendingBattery || pendingReservoir ? h("div", { className: "future-storage-branch", "aria-label": `${pendingBattery + pendingReservoir} Energy stored for next Generation` },
            h("span", { className: "future-storage-line", "aria-hidden": "true" }, "↘"),
            pendingBattery ? h("span", { className: "future-storage-node", "aria-label": `${pendingBattery} Battery Energy available next Generation` }, h("b", { "aria-hidden": "true" }, "▣"), h(FlowPips, { count: pendingBattery, kind: "pending" })) : null,
            pendingReservoir ? h("span", { className: "future-storage-node", "aria-label": `${pendingReservoir} Reservoir Energy available next Generation` }, h("b", { "aria-hidden": "true" }, "💧"), h(FlowPips, { count: pendingReservoir, kind: "pending" })) : null,
            h("span", { className: "future-generation-marker", "aria-hidden": "true" }, "G+1")
        ) : null,
        compact ? null : button("Details", () => onInfo({
            eyebrow: "Energy flow",
            title: "Current system",
            summary,
            details: [
                `Source Energy: ${chain.grossGenerated}.`,
                `Storage loss: ${chain.storageLoss} (${fossilStorageLoss} Fuel storage; ${recoveryLoss} storage recovery).`,
                `Released from earlier storage: ${chain.storageReleased}.`,
                `Transformation loss: ${chain.transformationLoss}.`,
                `Battery charging for next Generation: ${pendingBattery}.`,
                `Reservoir capture for next Generation: ${pendingReservoir}.`,
                `Grid delivery: ${chain.deliveredEnergy}/${chain.gridCapacity}.`,
                `Light: ${chain.lightProduced}.`
            ]
        }), { kind: "ghost compact energy-details-button" }),
        h("p", { className: "sr-only" }, summary)
    );
}

function LightTrack({ game, player, onInfo }) {
    return h("div", { className: "light-track" }, ...Array.from({ length: 8 }, (_, i) => {
        const generation = i + 1;
        const value = player.lightByGeneration[generation];
        const target = game.config.demand.reliabilityTargets[generation];
        const point = player.reliabilityByGeneration[generation] === true;
        const met = value !== undefined && value >= target;
        const reliabilityActive = generation >= (game.config.rules.reliabilityStartsGeneration ?? 5);
        return h("button", { type: "button", key: generation, className: `light-window ${point ? "reliable" : met ? "demand-met" : ""}`, onClick: () => onInfo(scoringExplanation(game, generation, value, target)) },
            h("small", null, `G${generation}`),
            h("strong", null, value ?? "·"),
            h("span", null, point ? "+1 point" : reliabilityActive ? `need ${target} · point active` : `need ${target}`)
        );
    }));
}
function PlayerBoard({ game, player, onInfo }) {
    const condition = conditionDefinition(game, player);
    const effectiveKnowledge = player.knowledge + player.temporaryKnowledge;
    const profile = getContinentProfile(game, player);
    const ability = abilityDescriptions[profile.abilityId];
    return h("section", { className: "player-board compact-player-board" },
        h("div", { className: "board-heading" },
            h("div", null, h("p", { className: "eyebrow" }, "Player board"), h("h2", null, player.name), h("small", null, profile.name)),
            h("div", { className: "board-core-badges" },
                h("button", { type: "button", className: "badge explain-badge", onClick: () => onInfo({ eyebrow: "Knowledge", title: `Knowledge ${effectiveKnowledge}`, summary: player.temporaryKnowledge ? `${player.knowledge} permanent + ${player.temporaryKnowledge} temporary this Generation.` : "Permanent technical Knowledge." }) }, `K ${effectiveKnowledge}`),
                condition ? h("button", { type: "button", className: "badge condition explain-badge", onClick: () => onInfo(localConditionExplanation(game, player, condition)) }, condition.name) : null
            )
        ),
        h("div", { className: "player-board-core simplified" },
            h("section", { className: "board-system-section" },
                h("div", { className: "compact-section-heading" }, h("strong", null, "Energy system"), h("small", null, `${player.installed.length} technologies`)),
                h(EnergyChain, { game, player, onInfo })
            )
        ),
        h("div", { className: "compact-score-row simplified" },
            stat("Total Light", player.cumulative.totalLight),
            stat("Reliability", `${player.cumulative.reliableGenerations}/${game.config.rules.reliabilityPointMaximum ?? 4}`),
            stat("Demand met", `${player.cumulative.demandMetGenerations ?? 0}/8`)
        ),
        h("details", { className: "player-board-details" },
            h("summary", null, "Technologies, Light history and regional details"),
            h("div", { className: "two-column board-expanded-grid" }, panel("Installed technologies", h(TechnologyList, { game, player, onInfo }), "nested"), panel("Light and Reliability", h(LightTrack, { game, player, onInfo }), "nested")),
            h("div", { className: "continent-status-row" },
                h("button", { type: "button", className: "badge explain-badge", onClick: () => onInfo({ eyebrow: profile.name, title: ability.name, summary: ability.text, details: profile.strengths }) }, ability.name),
                profile.penaltyId ? h("button", { type: "button", className: "badge explain-badge", onClick: () => onInfo({ eyebrow: "Regional limitation", title: penaltyDescriptions[profile.penaltyId].name, summary: penaltyDescriptions[profile.penaltyId].text, details: profile.weaknesses }) }, penaltyDescriptions[profile.penaltyId].name) : null
            )
        )
    );
}
function LockedReason({ reason }) {
    return h("div", { className: "locked-reason" }, h("span", null, "🔒"), h("small", null, reason));
}
function BuildShop({ game, player, guidedMode, onChoose, onInfo }) {
    const [view, setView] = useState("pathways");
    const [europeRecoveryResource, setEuropeRecoveryResource] = useState("constructionMaterials");
    const installedTechnologyIds = new Set(player.installed.map(instance => instance.technologyId));
    const available = game.config.technologies.filter(technology => !technology.starter
        && !installedTechnologyIds.has(technology.id)
        && (technology.alwaysAvailable || game.innovationMarket.visible.includes(technology.id)));
    const temporaryUnlockIds = new Set(temporaryKnowledgeUnlocks(game, player.id).filter(item => item.after.legal).map(item => item.technology.id));
    const tierOrder = { basic: 0, intermediate: 1, advanced: 2 };
    const pathwayGroups = ["solar", "wind", "hydro", "biomass", "fossil"].map(pathway => ({
        id: pathway,
        label: pathwayLabels[pathway],
        technologies: available.filter(technology => technology.pathway === pathway).sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier])
    })).filter(group => group.technologies.length);
    const sharedGroups = [
        { id: "storage", label: "Storage", technologies: available.filter(technology => technology.pathway === "shared" && technology.stage === "storage") },
        { id: "grid", label: "Grid", technologies: available.filter(technology => technology.pathway === "shared" && technology.stage === "transport") },
        { id: "lighting", label: "Lighting and efficiency", technologies: available.filter(technology => technology.pathway === "shared" && ["lighting", "efficiency"].includes(technology.stage)) },
        { id: "research", label: "Research support", technologies: available.filter(technology => technology.pathway === "shared" && technology.stage === "research") }
    ].filter(group => group.technologies.length);
    const scored = available.map(technology => {
        const readiness = technologyReadiness(game, player.id, technology);
        const impact = technologyImpactPreview(game, player.id, technology);
        const lightMetric = impact.metrics.find(metric => metric.label === "Light ceiling");
        const lightGain = lightMetric ? lightMetric.after - lightMetric.before : 0;
        const timingScore = impact.timing === "Helps now" ? 5 : impact.timing === "Helps next forecast" ? 3 : 0;
        return { technology, readiness, impact, score: readiness.installed ? -100 : Number(readiness.legal) * 12 - readiness.blockerCount * 2 + timingScore + lightGain * 2 };
    }).filter(item => !item.readiness.installed).sort((a, b) => b.score - a.score).slice(0, guidedMode ? 6 : 10);
    const technologyIcon = technology => technology.stage === "storage" ? "▣" : technology.stage === "transport" ? "↔" : technology.stage === "lighting" || technology.stage === "efficiency" ? "💡" : technology.pathway === "solar" ? "☀" : technology.pathway === "wind" ? "≋" : technology.pathway === "hydro" ? "💧" : technology.pathway === "biomass" ? "🌿" : technology.pathway === "fossil" ? "⛽" : "⚙";
    const openRoute = (tech, readiness, impact) => onInfo({
        eyebrow: readiness.legal ? "Buildable now" : readiness.oneBlockerAway ? "One step away" : "Development route",
        title: tech.name,
        summary: readiness.legal ? impact.now : readiness.reason,
        details: [
            `Final cost: ${readiness.cost.constructionMaterials} Other Materials + ${readiness.cost.criticalMaterials} Critical Minerals.`,
            `Knowledge: effective ${readiness.effectiveKnowledge} / required ${readiness.knowledgeRequired}.`,
            ...(readiness.blockers.length ? readiness.blockers.map(blocker => blocker.label) : ["All construction requirements are satisfied."]),
            impact.future
        ]
    });
    const renderTechnology = tech => {
        const readiness = technologyReadiness(game, player.id, tech);
        const impact = technologyImpactPreview(game, player.id, tech);
        const cost = readiness.cost;
        const affinity = getPathwayAffinity(game, player, tech);
        const tierLabel = tech.tier === "basic" ? "Basic" : tech.tier === "intermediate" ? "Intermediate" : "Advanced";
        const temporaryUnlock = temporaryUnlockIds.has(tech.id);
        const stateClass = readiness.installed ? "installed" : readiness.legal ? "available" : readiness.oneBlockerAway ? "near" : "locked";
        const status = readiness.installed ? "Installed" : readiness.legal ? "Buildable now" : readiness.oneBlockerAway ? "One step away" : `${readiness.blockerCount} blockers`;
        const prerequisite = tech.prerequisiteTechnologyId ? getTechnology(game, tech.prerequisiteTechnologyId).name : "None";
        return h("article", { key: tech.id, className: `technology-choice-card pathway-node ${stateClass} ${temporaryUnlock ? "temporary-unlock" : ""}` },
            temporaryUnlock ? h("div", { className: "temporary-unlock-ribbon" }, "Unlocked by Engineering Exchange") : null,
            h("div", { className: "technology-choice-heading" },
                h("span", { className: "technology-choice-icon", "aria-hidden": "true" }, technologyIcon(tech)),
                h("div", null, h("small", null, `${tierLabel} · ${affinityLabels[affinity]} readiness`), h("h3", null, tech.name)),
                badge(status, readiness.installed || readiness.legal ? "reliable" : readiness.oneBlockerAway ? "energy" : "")
            ),
            h("p", { className: "technology-purpose" }, impact.headline),
            h("div", { className: "technology-final-cost" },
                h("span", { className: player.resources.constructionMaterials.warehouse >= cost.constructionMaterials ? "" : "missing" }, h("small", null, "Other"), h("strong", null, cost.constructionMaterials)),
                h("span", { className: player.resources.criticalMaterials.warehouse >= cost.criticalMaterials ? "" : "missing" }, h("small", null, "Critical"), h("strong", null, cost.criticalMaterials)),
                h("span", { className: cost.effectiveKnowledge >= cost.knowledgeRequired ? "" : "missing" }, h("small", null, "Knowledge"), h("strong", null, `${cost.effectiveKnowledge}/${cost.knowledgeRequired}`))
            ),
            h("div", { className: "technology-route-line" }, h("small", null, "Prerequisite"), h("strong", null, prerequisite)),
            readiness.installed ? h("p", { className: "choice-benefit" }, "Installed in your current system.") : readiness.legal ? h("p", { className: "choice-benefit" }, impact.now) : h("ul", { className: "blocker-list" }, ...readiness.blockers.slice(0, 3).map((blocker, index) => h("li", { key: `${tech.id}-${blocker.kind}-${index}` }, blocker.label))),
            h("div", { className: "technology-choice-actions" },
                button(readiness.installed || readiness.legal ? "Details" : "See route", () => readiness.installed ? onInfo(technologyExplanation(game, player, tech)) : openRoute(tech, readiness, impact), { kind: "ghost compact" }),
                readiness.legal ? button("Build", () => onChoose({ kind: "build", technologyId: tech.id, ...(player.continentId === "europe" ? { recoveryResource: europeRecoveryResource } : {}) }), { kind: "primary compact" }) : null
            ),
            player.continentId === "europe" && readiness.legal && (cost.constructionMaterials > 0 || cost.criticalMaterials > 0)
                ? h("label", { className: "europe-recovery-choice" }, "Circular Recovery choice", h("select", { value: europeRecoveryResource, onChange: event => setEuropeRecoveryResource(event.target.value) },
                    cost.constructionMaterials > 0 ? h("option", { value: "constructionMaterials" }, "Recover 1 spent Other") : null,
                    cost.criticalMaterials > 0 ? h("option", { value: "criticalMaterials" }, "Recover 1 spent Critical") : null))
                : null
        );
    };
    const renderGroup = group => h("section", { key: group.id, className: "technology-pathway-group" },
        h("div", { className: "pathway-group-heading" }, h("h3", null, group.label), h("small", null, `${group.technologies.length} development steps`)),
        h("div", { className: "technology-chain-row" }, ...group.technologies.flatMap((technology, index) => [renderTechnology(technology), index < group.technologies.length - 1 ? h("span", { key: `${group.id}-arrow-${index}`, className: "technology-chain-arrow" }, "→") : null].filter(Boolean)))
    );
    return h("div", { className: "guided-subpanel development-technology-board" },
        h("div", { className: "build-category-tabs", role: "tablist", "aria-label": "Technology board view" },
            h("button", { type: "button", className: view === "pathways" ? "selected" : "", onClick: () => setView("pathways") }, "Energy pathways"),
            h("button", { type: "button", className: view === "systems" ? "selected" : "", onClick: () => setView("systems") }, "Grid, storage and lighting"),
            h("button", { type: "button", className: view === "recommended" ? "selected" : "", onClick: () => setView("recommended") }, "Recommended now")
        ),
        player.temporaryKnowledge ? h("div", { className: "temporary-knowledge-banner" }, h("strong", null, `Engineering Exchange: effective Knowledge ${player.knowledge + player.temporaryKnowledge}`), h("span", null, "Technologies actually unlocked by the card are highlighted.")) : null,
        view === "recommended" ? h("div", { className: "technology-card-grid" }, ...scored.map(item => renderTechnology(item.technology))) : null,
        view === "pathways" ? h("div", { className: "technology-pathway-list" }, ...pathwayGroups.map(renderGroup)) : null,
        view === "systems" ? h("div", { className: "technology-pathway-list" }, ...sharedGroups.map(renderGroup)) : null
    );
}
function LearnPanel({ game, player, onChoose }) {
    const legality = developmentActionLegality(game, player.id, { kind: "research" });
    const nextCost = player.knowledge < game.config.rules.knowledgeMaximum ? learningCostPreview(game, player) : null;
    const currentEffective = player.knowledge + player.temporaryKnowledge;
    const nextPermanent = Math.min(game.config.rules.knowledgeMaximum, player.knowledge + 1);
    const nextEffective = nextPermanent + player.temporaryKnowledge;
    const reached = game.config.technologies.filter(technology => !technology.starter).filter(technology => {
        const currentCost = effectiveBuildCost(game, player, technology);
        const draftPlayer = { ...player, knowledge: nextPermanent };
        const draftGame = { ...game, players: { ...game.players, [player.id]: draftPlayer } };
        const nextTechnologyCost = effectiveBuildCost(draftGame, draftPlayer, technology);
        return currentCost.knowledgeRequired > currentEffective && nextTechnologyCost.knowledgeRequired <= nextEffective;
    }).map(technology => technology.name);
    return h("div", { className: "knowledge-board" },
        h("div", { className: "knowledge-track", role: "img", "aria-label": `Permanent Knowledge ${player.knowledge}; effective Knowledge ${currentEffective}` },
            ...Array.from({ length: game.config.rules.knowledgeMaximum }, (_, index) => {
                const level = index + 1;
                const permanent = level <= player.knowledge;
                const temporary = level > player.knowledge && level <= currentEffective;
                return h("div", { key: level, className: `knowledge-step ${permanent ? "permanent" : temporary ? "temporary" : "future"}` }, h("span", null, `K${level}`), h("small", null, permanent ? level === player.knowledge ? "Permanent" : "Reached" : temporary ? "Temporary" : "Locked"));
            })
        ),
        player.temporaryKnowledge ? h("div", { className: "temporary-knowledge-note" }, h("strong", null, `Effective Knowledge ${currentEffective}`), h("span", null, `Permanent ${player.knowledge} + temporary ${player.temporaryKnowledge}. Temporary Knowledge helps Build only and expires at Generation end.`)) : null,
        nextCost ? h("div", { className: "learn-cost-card" },
            h("div", null, h("small", null, "Next permanent step"), h("strong", null, `Knowledge ${player.knowledge} → ${nextPermanent}`)),
            h("div", null, h("small", null, "Cost"), h("strong", null, `${nextCost.general} Other + ${nextCost.critical} Critical`)),
            h("div", null, h("small", null, "Action"), h("strong", null, "1 token"))
        ) : h("p", { className: "choice-benefit" }, "Maximum permanent Knowledge reached."),
        reached.length ? h("div", { className: "knowledge-unlocks" }, h("strong", null, "Knowledge requirements reached after Learn"), h("p", null, reached.slice(0, 5).join(" · "))) : h("p", { className: "muted" }, "This step may still reduce the distance to advanced technologies even when it does not complete a tier requirement."),
        legality.legal ? button(`Learn · reach Knowledge ${nextPermanent}`, () => onChoose({ kind: "research" }), { kind: "primary full" }) : h(LockedReason, { reason: legality.reason })
    );
}
function ImportChoices({ game, player, onChoose }) {
    return h("div", { className: "clean-card-list" }, ...resourceKeys.map(receive => {
        const result = importLegality(game, player, receive);
        const paymentText = result.payment ? Object.entries(result.payment).filter(([, value]) => value).map(([key, value]) => `${value} ${resourceLabels[key]}`).join(" + ") : "";
        return h("article", { key: receive, className: `clean-choice-card ${result.legality.legal ? "available" : "locked"}` }, h("div", { className: "clean-choice-main" }, h("div", { className: "choice-icon" }, "⇄"), h("div", null, h("strong", null, `Receive 1 ${resourceLabels[receive]}`), h("small", null, `World Market stock ${game.worldMarket?.[receive] ?? 0} · pay exactly ${result.required} resources · no action`))), result.legality.legal ? h("p", { className: "choice-benefit" }, `Automatic payment: ${paymentText}.`) : h(LockedReason, { reason: result.legality.reason }), button(result.legality.legal ? "Exchange" : "Unavailable", () => onChoose({ kind: "publicImport", receive, payment: result.payment }), { kind: result.legality.legal ? "primary compact" : "ghost compact", disabled: !result.legality.legal, title: result.legality.reason }));
    }));
}
function TradePanel({ game, player, onTrade, message }) {
    const [recipientId, setRecipientId] = useState(Object.keys(game.players).find(id => id !== player.id) || "");
    const [offer1, setOffer1] = useState("constructionMaterials");
    const [offer2, setOffer2] = useState("");
    const [request1, setRequest1] = useState("criticalMaterials");
    const [request2, setRequest2] = useState("");
    const recipients = Object.values(game.players).filter(other => other.id !== player.id);
    const recipient = game.players[recipientId];
    const bundle = (first, second) => {
        const result = {};
        for (const resource of [first, second].filter(Boolean)) result[resource] = (result[resource] ?? 0) + 1;
        return result;
    };
    const aGives = bundle(offer1, offer2);
    const bGives = bundle(request1, request2);
    const sameDirectionResource = resourceKeys.some(resource => (aGives[resource] ?? 0) > 0 && (bGives[resource] ?? 0) > 0);
    const enough = resourceKeys.every(resource => player.resources[resource].warehouse >= (aGives[resource] ?? 0) && (recipient?.resources[resource].warehouse ?? 0) >= (bGives[resource] ?? 0));
    const tradeBlocked = directTradeBlocked(game);
    const canPropose = Boolean(recipient) && player.actionsRemaining > 0 && !tradeBlocked && !sameDirectionResource && enough;
    const reason = tradeBlocked ? "Direct trade is unavailable during the active Global Event." : player.actionsRemaining <= 0 ? "No Development action remains." : sameDirectionResource ? "The same resource cannot move in both directions." : !enough ? "One side lacks an offered resource." : "Available";
    const selector = (value, setValue, allowNone = false) => h("select", { value, onChange: event => setValue(event.target.value) }, allowNone ? h("option", { value: "" }, "No second resource") : null, ...resourceKeys.map(key => h("option", { key, value: key }, resourceLabels[key])));
    const describe = values => Object.entries(values).map(([resource, amount]) => `${amount} ${resourceLabels[resource]}`).join(" + ");
    return h("div", { className: "guided-subpanel trade-clean" },
        h("p", null, "A player trade exchanges up to two Warehouse resources from each side. The initiator spends one Development action; the recipient spends none."),
        h("label", null, "Trade with", h("select", { value: recipientId, onChange: event => setRecipientId(event.target.value) }, ...recipients.map(other => h("option", { key: other.id, value: other.id }, other.name)))),
        h("div", { className: "trade-bundle-grid" },
            h("div", null, h("strong", null, "You offer"), selector(offer1, setOffer1), selector(offer2, setOffer2, true)),
            h("div", null, h("strong", null, `${recipient?.name ?? "They"} offers`), selector(request1, setRequest1), selector(request2, setRequest2, true))
        ),
        recipient ? h("section", { className: "trade-consequence-preview before-action-after" },
            h("div", { className: "preview-column" }, h("small", null, "BEFORE"), h("strong", null, `${player.name}: ${warehouseTotal(player)}/${game.config.rules.warehouseMaximum}`), h("span", null, `${recipient.name}: ${warehouseTotal(recipient)}/${game.config.rules.warehouseMaximum}`)),
            h("div", { className: "preview-column action" }, h("small", null, "ACTION"), h("strong", null, `${describe(aGives)} ⇄ ${describe(bGives)}`), h("span", null, "Initiator: −1 Development action")),
            h("div", { className: "preview-column" }, h("small", null, "AFTER"), h("strong", null, `${player.name}: ${warehouseTotal(player) - Object.values(aGives).reduce((sum, value) => sum + value, 0) + Object.values(bGives).reduce((sum, value) => sum + value, 0)}/${game.config.rules.warehouseMaximum}`), h("span", null, `${recipient.name}: ${warehouseTotal(recipient) - Object.values(bGives).reduce((sum, value) => sum + value, 0) + Object.values(aGives).reduce((sum, value) => sum + value, 0)}/${game.config.rules.warehouseMaximum}`)),
            h("div", { className: "preview-why" }, h("small", null, "WHY IT MATTERS"), h("span", null, "Player trade can preserve more resource value than the World Market, but it uses one action."))
        ) : null,
        canPropose ? h("p", { className: "choice-benefit" }, `${describe(aGives)} ⇄ ${describe(bGives)} · costs you 1 action`) : h(LockedReason, { reason }),
        button("Request accepted trade", () => onTrade(recipientId, aGives, bGives), { kind: "primary", disabled: !canPropose, title: reason }),
        message ? h("p", { className: "trade-message" }, message) : null
    );
}
function ActiveConditionStrip({ game, player, condition, onInfo }) {
    if (!condition)
        return null;
    const relevance = getConditionRelevance(game, player.id, condition);
    const preview = relevance.preview;
    const targetLabels = {
        solarDelta: "Solar", windDelta: "Wind", hydroDelta: hasRelevantSystem(game, player, "hydroDelta") ? "Hydro" : "Biomass fallback",
        biomassRegrowthDelta: "Biomass", biomassRegrowthSet: "Biomass", gridCapacityDelta: "Grid",
        firstFuelPlantOutputDelta: "Fuel plants", firstBuildConstructionDelta: "Build cost", storageRecoveryBonus: "Battery",
        temporaryKnowledge: "Knowledge", demandTargetDelta: "Required Light", lightMaximumDelta: "Lighting"
    };
    const target = targetLabels[condition.effect.kind] ?? "System";
    return h("button", { type: "button", className: `active-condition-strip relevance-${relevance.level}`, onClick: () => onInfo(localConditionExplanation(game, player, condition)) },
        h("div", null, h("small", null, `${relevance.label} · ${target}`), h("strong", null, condition.name)),
        h("div", { className: "condition-values-inline" }, ...preview.values.map((value, index) => h("span", { key: `${value}-${index}` }, value))),
        h("p", null, relevance.level === "critical" ? preview.impact : relevance.level === "activeButNotLimiting" ? `${preview.impact} Final Light is not currently changed.` : preview.impact)
    );
}

function generationActionUsage(game, player) {
    const counts = { gather: 0, learn: 0, build: 0, trade: 0, adapt: 0, pass: 0, market: 0 };
    for (const entry of game.log) {
        if (entry.generation !== game.generation || entry.actorId !== player.id)
            continue;
        if (entry.type === "action.extract") counts.gather++;
        if (entry.type === "action.research") counts.learn++;
        if (entry.type === "action.build") counts.build++;
        if (entry.type === "trade.completed") counts.trade++;
        if (entry.type === "action.adapt") counts.adapt++;
        if (entry.type === "action.pass") counts.pass++;
        if (entry.type === "action.worldMarket") counts.market++;
    }
    return counts;
}
function DevelopmentControls({ game, player, onAction, onUndo, onReset, onTrade, tradeMessage, onInfo }) {
    const [section, setSection] = useState(null);
    const [confirmation, setConfirmation] = useState(null);
    useEffect(() => { setSection(null); }, [player.id, game.actionRound, game.generation]);
    const condition = conditionDefinition(game, player);
    const adaptable = condition && "adaptable" in condition.effect && condition.effect.adaptable && !player.localCondition.adapted;
    const adaptStatus = adaptable ? developmentActionLegality(game, player.id, { kind: "adapt" }) : null;
    const researchStatus = developmentActionLegality(game, player.id, { kind: "research" });
    const required = getRequiredLight(game, player.id);
    const resilience = getReliabilityTarget(game, player.id);
    const maximum = getCurrentMaximumLight(game, player.id);
    const status = maximum >= required ? "Secure" : "At Risk";
    const globalEvent = activeGlobalEvent(game);
    const bottleneck = getPrimaryBottleneck(game, player.id, { target: required });
    const constraint = getDevelopmentConstraint(game, player.id);
    const usage = generationActionUsage(game, player);
    const choose = action => {
        const legality = developmentActionLegality(game, player.id, action);
        if (!legality.legal) {
            onInfo({ eyebrow: "Action unavailable", title: friendlyActionName(action, game), summary: legality.reason, details: ["No resources or actions were consumed."] });
            return;
        }
        setConfirmation({ action, ...actionConfirmation(game, player, action) });
    };
    const confirm = () => {
        if (!confirmation) return;
        const success = onAction(confirmation.action);
        if (success !== false) { setConfirmation(null); setSection(null); }
    };
    const tabs = [
        { id: "learn", icon: "✦", label: "Learn", count: usage.learn, available: researchStatus.legal },
        { id: "build", icon: "⚙", label: "Build", count: usage.build, available: player.actionsRemaining > 0 },
        { id: "trade", icon: "⇄", label: "Trade / Market", count: usage.trade, freeCount: usage.market, available: true }
    ];
    return h("div", { className: "action-panel clean-action-panel development-board simplified-development-board" },
        h("header", { className: "turn-banner simplified-turn-banner" },
            h("div", null, h("p", { className: "eyebrow" }, `Generation ${game.generation}`), h("h2", null, `${player.name}'s turn`)),
            h("div", { className: "development-token-rack", "aria-label": `${player.actionsRemaining} actions remaining` },
                ...Array.from({ length: game.config.rules.actionsPerGeneration }, (_, index) => h("span", { key: index, className: `development-token ${index < player.actionsRemaining ? "ready" : "spent"}` }, index < player.actionsRemaining ? "●" : "✓")),
                h("strong", null, `${player.actionsRemaining} left`)
            )
        ),
        h("section", { className: `compact-goal-strip status-${status.toLowerCase().replace(" ", "-")}` },
            h("span", null, h("small", null, "Required"), h("strong", null, `${required} Light`)),
            h("span", null, h("small", null, "Maximum now"), h("strong", null, `${maximum} Light`)),
            h("span", null, h("small", null, resilience === null ? "Reliability" : "Reliability Point"), h("strong", null, resilience === null ? "Starts G5" : `Meet ${resilience}`)),
            h("b", null, status)
        ),
        h("section", { className: "compact-system-panel" },
            h(EnergyChain, { game, player, onInfo }),
            h("div", { className: `compact-bottleneck-line ${bottleneck.type === "none" ? "ready" : "limited"}` },
                h("strong", null, bottleneck.type === "none" ? `✓ Can meet ${required} Light` : bottleneck.label),
                button("Why?", () => onInfo({ eyebrow: "Current system", title: bottleneck.type === "none" ? "Demand can be met" : bottleneck.label, summary: bottleneck.explanation, details: bottleneck.type === "none" ? [] : [constraint.explanation] }), { kind: "ghost compact" })
            )
        ),
        h(ActiveConditionStrip, { game, player, condition, onInfo }),
        adaptable ? h("button", { type: "button", className: "adapt-alert compact", onClick: () => choose({ kind: "adapt" }), disabled: !adaptStatus?.legal }, h("strong", null, `Adapt to ${condition.name}`), h("span", null, "1 action")) : null,
        !section ? h("nav", { className: "compact-development-actions", "aria-label": "Development actions" },
            ...tabs.map(tab => h("button", { key: tab.id, type: "button", className: `compact-action-button ${tab.available ? "" : "unavailable"}`, onClick: () => setSection(tab.id) },
                h("span", { "aria-hidden": "true" }, tab.icon),
                h("strong", null, tab.label),
                tab.count ? h("small", null, `${tab.count} used`) : tab.freeCount ? h("small", null, `${tab.freeCount} market`) : null
            ))
        ) : null,
        section ? h("section", { className: "section-step development-section" },
            h("div", { className: "section-step-heading" }, button("← Back", () => setSection(null), { kind: "ghost" }), h("h3", null, section === "learn" ? "Learn" : section === "build" ? "Build" : "Trade and World Market")),
            section === "learn" ? h(LearnPanel, { game, player, onChoose: choose }) : null,
            section === "build" ? h(BuildShop, { game, player, guidedMode: game.uiMode !== "strategy", onChoose: choose, onInfo }) : null,
            section === "trade" ? h("div", { className: "trade-sections" },
                h("section", { className: "trade-mode-card" }, h("h4", null, "World Market"), h("p", null, "0 actions · current exchange rates shown below"), h(ImportChoices, { game, player, onChoose: choose })),
                h("section", { className: "trade-mode-card" }, h("h4", null, "Player Trade"), h("p", null, "1 action · negotiated bundles"), h(TradePanel, { game, player, onTrade, message: tradeMessage }))
            ) : null
        ) : null,
        h("details", { className: "turn-utility-controls" }, h("summary", null, "Turn controls"), h("div", { className: "safe-controls" }, button("Pass", () => choose({ kind: "pass" }), { kind: "ghost" }), button("Undo", onUndo, { kind: "ghost", disabled: game.undo.stack.length === 0 }), button("Reset Generation", onReset, { kind: "ghost", disabled: !game.undo.generationStart }))),
        confirmation ? h(ConfirmationModal, { confirmation, onConfirm: confirm, onCancel: () => setConfirmation(null) }) : null
    );
}

function DispatchPanel({ game, player, onDispatch, onInfo }) {
    const recommended = useMemo(() => chooseDispatchPlan(game, player), [game, player.id]);
    const preview = useMemo(() => previewDispatch(game, player.id, recommended), [game, player.id]);
    const condition = conditionDefinition(game, player);
    const conditionImpact = condition ? conditionImpactPreview(game, player.id, condition) : null;
    const bottleneck = getPrimaryBottleneck(game, player.id, { target: preview.target });
    return h("div", { className: "action-panel dispatch-clean" },
        h("div", { className: "turn-banner" }, h("div", null, h("p", { className: "eyebrow" }, "Use your Energy"), h("h2", null, `${player.name}'s Energy plan`)), badge(weatherLabels[game.weather.current], "weather")),
        condition ? h("button", { type: "button", className: "dispatch-condition-note", onClick: () => onInfo(localConditionExplanation(game, player, condition)) }, h("strong", null, condition.name), h("span", null, `${conditionImpact.values.join(" → ")} · ${conditionImpact.prompt}`)) : null,
        h(EnergyChain, { game, player, onInfo, planning: false }),
        h("div", { className: "compact-bottleneck-line dispatch-bottleneck" },
            h("strong", null, bottleneck.type === "none" ? "✓" : bottleneck.label),
            button("Why?", () => onInfo({ eyebrow: "Energy flow", title: bottleneck.label, summary: bottleneck.explanation, details: [] }), { kind: "ghost compact" })
        ),
        h("div", { className: "dispatch-metrics" },
            stat("Required Light", preview.target),
            stat(game.generation >= (game.config.rules.reliabilityStartsGeneration ?? 5) ? "Reliability Point" : "Reliability", game.generation >= (game.config.rules.reliabilityStartsGeneration ?? 5) ? "Active" : "Starts G5"),
            stat("Available storage", preview.stored),
            stat("Stored for next", preview.storedPending ?? 0),
            stat("Unused Energy", preview.curtailed)
        ),
        preview.legal ? button(`Confirm Energy plan · deliver ${preview.light} Light`, () => onDispatch(recommended), { kind: "primary large full" }) : h("div", { className: "notice error" }, `The planned Dispatch is not legal: ${preview.reason}`),
        h("details", { className: "dispatch-details" }, h("summary", null, "See every command in the plan"), h("ul", null, h("li", null, `Hydro released: ${recommended.hydroOutputRequested}.`), h("li", null, `Battery Energy discharged: ${Object.values(recommended.batteryDischargeInput).reduce((a, b) => a + b, 0)}.`), h("li", null, `Energy sent to storage: ${Object.values(recommended.batteryCharge).reduce((sum, allocation) => sum + Object.values(allocation).reduce((a, b) => a + b, 0), 0)}.`), h("li", null, `Transported by pathway: ${Object.entries(recommended.transportByPathway).filter(([, value]) => value > 0).map(([path, value]) => `${pathwayLabels[path]} ${value}`).join(", ") || "none"}.`)))
    );
}

function ReviewScreen({ game, onContinue }) {
    const humanIds = currentOrder(game).filter(id => game.players[id].controller.kind === "human");
    const otherIds = currentOrder(game).filter(id => !humanIds.includes(id));
    const renderReviewCard = (id, compact = false) => {
        const player = game.players[id];
        const story = getGenerationExplanation(game, id, game.generation);
        const condition = conditionDefinition(game, player);
        const whatHelped = condition && getConditionRelevance(game, id, condition).level === "critical"
            ? `${condition.name} changed the result this Generation.`
            : game.weather.current ? `${weatherLabels[game.weather.current]} shaped the available renewable Energy.` : "The installed system provided the available Energy.";
        const unused = story.unused > 0 ? `${story.unused} Energy was stored or could not be used.` : story.losses.lighting > 0 ? `${story.losses.lighting} delivered Energy did not become Light.` : story.losses.thermal + story.losses.battery > 0 ? `${story.losses.thermal + story.losses.battery} Energy was lost before the Grid.` : "No Energy was recorded as unused or lost.";
        const actionEffect = story.metrics.technologiesBuilt?.length ? `${story.metrics.technologiesBuilt.map(id => getTechnology(game, id).name).join(", ")} changed the system this Generation.` : "No newly built technology changed the Energy chain this Generation.";
        const content = h("article", { className: `review-story-card ${story.demandMet ? "goal-met" : "goal-missed"}` },
            h("div", { className: "review-story-heading" }, h("div", null, h("small", null, player.name), h("h3", null, game.config.continents.find(continent => continent.id === player.continentId).name)), h("span", { className: story.demandMet ? "review-status success" : "review-status warning" }, story.demandMet ? story.pointEarned ? "+1 Reliability Point" : "Demand met" : "Demand not fully met")),
            h("div", { className: "review-goal-summary" }, stat("Required", `${story.requiredLight} Light`), stat("Delivered", `${story.lightProduced} Light`)),
            h("div", { className: "review-energy-story" },
                h("div", null, h("small", null, "Generated"), h("strong", null, story.generated), h("span", null, "Energy")), h("b", null, "→"),
                h("div", null, h("small", null, "After losses"), h("strong", null, story.afterLosses), h("span", null, "Energy")), h("b", null, "→"),
                h("div", null, h("small", null, "Delivered"), h("strong", null, story.deliveredEnergy), h("span", null, "Energy")), h("b", null, "→"),
                h("div", null, h("small", null, "Light"), h("strong", null, story.lightProduced), h("span", null, "Light"))
            ),
            h("div", { className: "review-causal-grid" },
                h("p", null, h("strong", null, "Main bottleneck: "), story.primaryBottleneckLabel),
                h("p", null, h("strong", null, "What helped: "), whatHelped),
                h("p", null, h("strong", null, "Unused or lost: "), unused),
                h("p", null, h("strong", null, "Effect of development: "), actionEffect)
            ),
            h("div", { className: "generation-takeaway" }, h("small", null, "WHAT THIS GENERATION SHOWED"), h("p", null, story.takeaway)),
            h("details", { className: "review-technical" }, h("summary", null, "Why? See the full calculation"), h("div", { className: "mini-stats" }, stat("Storage loss", story.losses.battery), stat("Transformation loss", story.losses.thermal), stat("Lighting loss", story.losses.lighting), stat("Stored", story.stored), stat("Unused", story.unused), stat("Reliability point", story.pointEarned ? "+1" : "—")), h("p", { className: "muted" }, `Gross by pathway: ${Object.entries(story.metrics.grossEnergy).filter(([, value]) => value > 0).map(([path, value]) => `${pathwayLabels[path]} ${value}`).join(" · ") || "none"}.`))
        );
        return compact ? h("details", { key: id, className: "other-region-review" }, h("summary", null, `${player.name} · ${story.lightProduced}/${story.requiredLight} Light`), content) : h("div", { key: id }, content);
    };
    return h("div", { className: "review redesigned-review" },
        h("div", { className: "action-heading" }, h("div", null, h("p", { className: "eyebrow" }, "What happened?"), h("h2", null, `Generation ${game.generation} review`), h("p", { className: "muted" }, "Your result appears first. Other regions are collapsed unless you choose to compare them.")), button(game.generation === 8 ? "Calculate final results" : "Continue", onContinue, { kind: "primary" })),
        h("section", { className: "human-review-first" }, ...humanIds.map(id => renderReviewCard(id, false))),
        otherIds.length ? h("section", { className: "other-region-reviews" }, h("h3", null, "Other regions"), ...otherIds.map(id => renderReviewCard(id, true))) : null
    );
}

function ResultsScreen({ game, onRestart }) {
    const qualified = game.results.some(result => result.finalDemandMet);
    const human = Object.values(game.players).find(player => player.controller.kind === "human") ?? game.players[game.results[0]?.playerId];
    const story = human ? getEndGameDebrief(game, human.id) : null;
    return h("div", { className: "results" },
        h("div", { className: "sun-mark small" }, h("span", null, "☀")), h("p", { className: "eyebrow" }, "Eight Generations complete"), h("h1", null, qualified ? "Final Results" : "No qualified winner"),
        !qualified ? h("div", { className: "notice warning" }, "No player delivered the required four Light in either Generation 7 or 8. The table shows the closest result, but no region completed the final reliability test.") : null,
        h("div", { className: "results-table" }, ...game.results.map(result => { const player = game.players[result.playerId]; return h("div", { key: result.playerId, className: `result-row ${result.rank === 1 && result.finalDemandMet ? "winner" : ""}` }, h("strong", { className: "rank" }, result.rank), h("div", null, h("h3", null, player.name), h("small", null, game.config.continents.find(c => c.id === player.continentId).name)), stat("Light", result.totalLight), stat("Reliability", `${result.reliableGenerations}/${game.config.rules.reliabilityPointMaximum ?? 4}`), stat("Final Light", result.finalDemandMet ? "Qualified" : "Missed"), stat("Demand met", `${result.demandMetGenerations}/8`), stat("System Loss", result.systemLoss), stat("Stored", result.usableStoredEnergy)); })),
        story ? h("section", { className: "system-story" }, h("p", { className: "eyebrow" }, "YOUR SYSTEM STORY"), h("h2", null, `${human.name}'s eight-Generation system`),
            h("div", { className: "system-story-grid" },
                h("article", null, h("small", null, "Reliability"), h("strong", null, `${story.demandMet} of ${story.generations}`), h("p", null, "Generations in which required demand was met.")),
                h("article", null, h("small", null, "Most frequent bottleneck"), h("strong", null, story.frequentBottleneckLabel), h("p", null, "Calculated from your actual Generation results.")),
                h("article", null, h("small", null, "Main outside dependency"), h("strong", null, story.dependencyResource ? resourceLabels[story.dependencyResource] : "No major import dependency"), h("p", null, story.dependencyResource ? `${story.dependencyAmount} imported or traded resource units recorded.` : "No single imported resource dominated your history.")),
                h("article", null, h("small", null, "Most useful preparation"), h("strong", null, "Preparation highlight"), h("p", null, story.usefulPreparation)),
                h("article", null, h("small", null, "Regional strength"), h("strong", null, game.config.continents.find(item => item.id === human.continentId).name), h("p", null, story.regionalStrength)),
                story.unusedOpportunity ? h("article", null, h("small", null, "Unused opportunity"), h("strong", null, "Available capacity"), h("p", null, story.unusedOpportunity)) : null
            ),
            h("div", { className: "reflection-question" }, h("small", null, "REFLECT"), h("p", null, story.reflection), h("span", null, "This question does not affect the result."))
        ) : null,
        h("div", { className: "form-row" }, button("New Game", onRestart, { kind: "primary" }), button("Export results JSON", () => download(`sunpaths-results-${game.seed}.json`, JSON.stringify({ seed: game.seed, results: game.results, log: game.log }, null, 2)), { kind: "secondary" }))
    );
}

function FocusStrip({ game, player, onInfo }) {
    if (!game.generation || game.phase === "game.complete" || !player)
        return null;
    const required = getRequiredLight(game, player.id);
    const resilience = getReliabilityTarget(game, player.id);
    const maximum = getCurrentMaximumLight(game, player.id);
    const actions = player.actionsRemaining ?? 0;
    const condition = conditionDefinition(game, player);
    const status = maximum >= required ? "Secure" : "At Risk";
    const globalEvent = activeGlobalEvent(game);
    return h("section", { className: `focus-strip status-${status.toLowerCase().replace(" ", "-")}`, "aria-label": "Current game focus" },
        h("div", { className: "focus-generation" }, h("small", null, "Generation"), h("strong", null, `${game.generation} of ${game.config.rules.generations}`)),
        h("div", { className: "focus-goal" }, h("small", null, "Required Light"), h("strong", null, `💡 ${required}`), h("span", null, resilience === null ? "Reliability starts in Generation 5" : "Meeting demand earns a Reliability Point")),
        h("div", { className: "focus-maximum" }, h("small", null, "Maximum now"), h("strong", null, `${maximum} Light`), h("span", null, status)),
        h("button", { type: "button", className: "focus-weather current", onClick: () => onInfo(weatherExplanation(game, player, game.weather.current, "Current Condition")) }, h("small", null, "Now"), h("strong", null, weatherLabels[game.weather.current] || "—")),
        h("button", { type: "button", className: "focus-weather forecast", onClick: () => onInfo(weatherExplanation(game, player, game.weather.forecast, "Next Forecast")) }, h("small", null, "Next"), h("strong", null, game.weather.forecast ? weatherLabels[game.weather.forecast] : "—")),
        h("div", { className: "focus-actions" }, h("small", null, "Actions"), h("span", { "aria-label": `${actions} actions remaining` }, ...Array.from({ length: game.config.rules.actionsPerGeneration }, (_, index) => h("i", { key: index, className: index < actions ? "ready" : "spent" })))),
        condition ? h("button", { type: "button", className: "focus-condition", onClick: () => onInfo(localConditionExplanation(game, player, condition)) }, h("small", null, "Local Condition"), h("strong", null, condition.name)) : null,
        globalEvent ? h("button", { type: "button", className: "focus-global-event", onClick: () => onInfo(globalEventExplanation(game)) }, h("small", null, "Global Event"), h("strong", null, globalEvent.name)) : null
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
    const [expandedId, setExpandedId] = useState(null);
    const [resourceTransfer, setResourceTransfer] = useState(null);
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
        if (!resourceTransfer) return;
        const timer = globalThis.setTimeout(() => setResourceTransfer(null), 900);
        return () => globalThis.clearTimeout(timer);
    }, [resourceTransfer]);
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
            return null;
        if (action.kind === "extract")
            return null;
        if (action.kind === "harvestBiomass")
            return { title: "Biomass moved to your Warehouse", summary: "You prepared one renewable fuel unit for a Biomass plant.", metrics: [], prompt: "Biomass can regrow, but only at the rate supported by your installed system." };
        if (action.kind === "publicImport")
            return null;
        if (action.kind === "adapt")
            return { title: "Local condition adapted to", summary: "You spent one action to cancel this Generation's adaptable penalty.", metrics: [], prompt: "Your remaining actions can now focus on the energy system." };
        return null;
    };
    const act = action => {
        const player = currentPlayer(game);
        return command({ type: "developmentAction", playerId: player.id, action }, guidedMode ? actionFeedback(player, action) : null);
    };
    const extractFromMap = resource => {
        const player = currentPlayer(game);
        if (!player || player.controller.kind !== "human" || game.phase !== "generation.development") return false;
        const amount = gatherAmount(game, player, resource);
        const success = command({ type: "developmentAction", playerId: player.id, action: { kind: "extract", resource } }, null);
        if (success) setResourceTransfer({ id: `${Date.now()}-${resource}`, playerId: player.id, resource, amount });
        return success;
    };
    const toggleContinent = id => {
        setSelectedId(id);
        setExpandedId(current => current === id ? null : id);
    };
    const dispatch = plan => { const player = currentPlayer(game); return command({ type: "dispatch", playerId: player.id, plan }); };
    const selectPrepared = (playerId, pathwayId, capabilityId) => command({ type: "selectPrepared", playerId, pathwayId, capabilityId });
    const save = () => download(`sunpaths-${game.seed}-g${game.generation}.json`, serializeGame(game));
    const toggleGuided = () => { const next = clone(game); next.uiMode = next.uiMode === "strategy" ? "guided" : "strategy"; setGame(next); };
    const trade = (recipientId, aGives, bGives) => {
        const actor = currentPlayer(game);
        const recipient = game.players[recipientId];
        if (!actor || !recipient) return false;
        const value = bundle => Object.entries(bundle).reduce((sum, [resource, amount]) => sum + amount * (recipient.resources[resource].warehouse <= 1 ? 2 : 1), 0);
        const recipientReceives = value(aGives);
        const recipientGives = value(bGives);
        if (recipient.controller.kind === "ai" && recipientReceives < recipientGives) {
            setTradeMessage(`${recipient.name} declined because the requested bundle is more valuable to them.`);
            return false;
        }
        if (recipient.controller.kind === "human" && !globalThis.confirm(`${recipient.name}: accept this trade?`)) {
            setTradeMessage(`${recipient.name} declined the trade.`);
            return false;
        }
        const accepted = command({ type: "directTrade", aId: actor.id, bId: recipientId, aGives, bGives });
        if (accepted) setTradeMessage(`${recipient.name} accepted. ${actor.name} used one Development action.`);
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
    else if (game.phase === "generation.start") {
        const generation = game.generation || 1;
        const required = game.config.demand.reliabilityTargets[generation];
        const reliabilityActive = generation >= (game.config.rules.reliabilityStartsGeneration ?? 5);
        decision = panel("A new Generation begins", h("div", { className: "generation-start-card" }, h("p", null, `Today: ${weatherLabels[game.weather.current]}. Next forecast: ${game.weather.forecast ? weatherLabels[game.weather.forecast] : "none"}.`), h("div", { className: "generation-start-goals" }, h("strong", null, `Required Light: ${required}.`), h("span", null, reliabilityActive ? `Meet ${required} Light to earn one Reliability Point.` : "Reliability Points begin in Generation 5.")), button("Start Generation", () => command({ type: "beginGeneration" }), { kind: "primary large" })));
    }
    else if (game.phase === "generation.localConditions") {
        const event = activeGlobalEvent(game);
        decision = panel("Generation conditions", h("div", { className: "generation-start-card" },
            event ? h("button", { type: "button", className: "global-event-card", onClick: () => setInfo(globalEventExplanation(game)) },
                h("small", null, "GLOBAL EVENT · ALL PLAYERS"),
                h("strong", null, event.name),
                h("span", null, globalEventExplanation(game)?.summary)
            ) : null,
            h("p", null, "Reveal each continent's Local Condition."),
            button("Reveal Local Conditions", () => command({ type: "drawLocalConditions" }), { kind: "primary large" })
        ));
    }
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
            return h("button", { type: "button", key: id, className: "market-mini-card", onClick: () => setInfo(technologyExplanation(game, selected, tech)) }, h("strong", null, tech.name), h("small", null, (() => { const cost = effectiveBuildCost(game, selected, tech); return `${cost.constructionMaterials} Other · ${cost.criticalMaterials} Critical · Knowledge ${cost.knowledgeRequired}`; })()));
        })), "nested")
        : panel("Technology ladder", h("div", { className: "prose" }, h("p", null, "Every pathway is visible from the start: Knowledge 1 Basic → Knowledge 3 Upgrade → Knowledge 5 Advanced."), h("p", { className: "muted" }, "An upgrade replaces the previous tier instead of adding another copy.")), "nested");
    const events = panel("Recent events", h("div", { className: "event-log" }, ...game.log.slice(-8).reverse().map(event => h("p", { key: event.sequence }, h("small", null, `#${event.sequence}`), event.message))), "nested");
    const body = game.phase === "game.complete"
        ? decision
        : h("main", { className: `game-main phase6 ${guidedMode ? "guided" : "strategy"} ${game.phase === "generation.development" ? "phase-development" : ""}` },
            h("div", { className: "game-left" },
                h(WorldArea, { game, expandedId, onToggle: toggleContinent, onExtract: extractFromMap, onBlocked: setNotice, transfer: resourceTransfer }),
                h(PlayerBoard, { game, player: selected, onInfo: setInfo })
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
        feedback ? h("section", { className: "system-feedback compact-feedback", "aria-live": "polite" },
            h("strong", null, feedback.title),
            feedback.metrics?.length ? h("div", { className: "feedback-metrics" }, ...feedback.metrics.slice(0, 2).map(metric => h("span", { key: metric.label }, h("small", null, metric.label), h("b", null, `${metric.before}${metric.unit} → ${metric.after}${metric.unit}`)))) : null,
            h("details", null, h("summary", null, "Why?"), h("p", null, feedback.summary), feedback.prompt ? h("p", null, feedback.prompt) : null),
            button("×", () => setFeedback(null), { kind: "ghost compact" })
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

