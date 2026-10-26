import { advanceDirectOpening } from "./fastOpening.js?v=a5.62.0";
// @ts-nocheck
import { uiShared } from "./uiShared.js?v=a5.62.0";
import { SetupProgress, WeatherCard } from "./uiSetup.js?v=a5.62.0";
import { buildDebugSnapshot, formatBugReport } from "./debug.js?v=a5.62.0";
import { EnergyChain } from "./uiEnergyChain.js?v=a5.62.0";
import { WorldMap } from "./uiWorldMap.js?v=a5.62.0";
import { PlayerBoard } from "./uiPlayerBoard.js?v=a5.62.0";
import { OtherRegionSummary } from "./uiReviewSummary.js?v=a5.62.0";
import { describeDevelopmentEffect, describeDispatchEffect } from "./uiEffects.js?v=a5.62.0";
import { getOnboardingCue, getBeginnerFirstBuildCue } from "./uiTutorial.js?v=a5.62.0";
import { BeginnerWelcome } from "./uiBeginnerWelcome.js?v=a5.62.0";
import { MissionTour, ChapterMissionTour, missionStageFromHints, MISSION_STAGES } from "./uiMissionTour.js?v=a5.62.0";
import { IntermediateTour, INTERMEDIATE_STEPS } from "./uiIntermediateTour.js?v=a5.62.0";
import { TutorialSpotlight } from "./uiSpotlight.js?v=a5.62.0";
import { gameText } from "./gameText.js?v=a5.62.0";
import { BeginnerFlowStory } from "./uiBeginnerFlow.js?v=a5.62.0";
import { BeginnerChapterCoach } from "./uiChapterCoach.js?v=a5.62.0";

const { React, useEffect, useMemo, useState, applyCommand, humanUndoTarget, currentOrder, activeGlobalEvent, directTradeBlocked, getPathwayAffinity, invariantErrors, gatherAmount, getTechnology, pathways, totalLoss, warehouseTotal, hasRelevantSystem, chooseDispatchPlan, pumpAi, serializeGame, conditionImpactPreview, developmentActionLegality, effectiveBuildCost, getConditionRelevance, getCurrentMaximumLight, getDevelopmentConstraint, getEndGameDebrief, getGenerationExplanation, getPrimaryBottleneck, getRequiredLight, importLegality, previewDispatch, technologyImpactPreview, technologyReadiness, temporaryKnowledgeUnlocks, getEnergyChainBreakdown, h, weatherLabels, resourceLabels, pathwayLabels, affinityLabels, resourceKeys, localConditionExplanation, weatherExplanation, technologyExplanation, technologyBenefitExplanation, globalEventExplanation, clone, sumLoss, phaseLabel, currentPlayer, conditionDefinition, featureEnabled, modeAllowsTechnology, getGameMode, button, panel, InfoModal, ConfirmationModal, ConditionReveal, friendlyActionName, learningCostPreview, actionConfirmation, stat, badge, download } = uiShared;
function LockedReason({ reason }) {
    return h("div", { className: "locked-reason" }, h("span", null, "🔒"), h("small", null, reason));
}
// A5.35: Build is a neutral catalogue, not a strategy recommender.
// Technology order is the published tier order, never a score or predicted Light gain.
const BUILD_CATEGORIES = [
    { id: "solar", label: "Solar", icon: "☀", description: "Electricity from sunlight" },
    { id: "wind", label: "Wind", icon: "≋", description: "Electricity from wind" },
    { id: "hydro", label: "Hydro", icon: "💧", description: "Electricity from flowing water" },
    { id: "biomass", label: "Biomass", icon: "🌿", description: "Electricity using biomass fuel" },
    { id: "fossil", label: "Fossil", icon: "⛽", description: "Electricity using fossil fuel" },
    { id: "shared", label: "Grid, Storage & Light", icon: "💡", description: "Move, store and use Electricity" }
];
const BUILD_PURPOSES = {
    basicSolar: "Generates solar Electricity.",
    utilitySolar: "Expands solar generation capacity.",
    advancedSolar: "Further expands solar generation capacity.",
    basicWind: "Generates wind Electricity.",
    onshoreWindFarm: "Expands wind generation capacity.",
    advancedWind: "Further expands wind generation capacity.",
    basicReservoir: "Generates hydro Electricity from water inflow.",
    advancedReservoir: "Expands hydro generation and reservoir capability.",
    advancedHydroTurbine: "Further expands hydro generation capability.",
    basicBiomassPlant: "Generates Electricity using stored Biomass fuel.",
    advancedBiomassPlant: "Improves Biomass conversion and output.",
    integratedBiorefinery: "Further expands Biomass conversion capability.",
    basicFossilPlant: "Generates Electricity from Fuel; inherited at the start.",
    enhancedOilRecovery: "Increases modelled Energy from one Fuel token; the physical simplification is under review.",
    combinedCycle: "Recovers generation heat to produce more Electricity from Fuel.",
    carbonCapturePlant: "Reduces modelled fossil impact; does not increase Electricity.",
    basicBattery: "Stores Electricity for a later Generation with recovery losses.",
    gridBattery: "Expands storage and recovery capability.",
    advancedBattery: "Further expands storage duration and capacity.",
    basicGrid: "Transports Electricity to Lighting; inherited at the start.",
    gridUpgrade: "Increases the amount of Electricity the Grid can carry.",
    smartGrid: "Further expands Grid transport capacity.",
    standardLighting: "Converts Electricity to Light; inherited at the start.",
    efficientLighting: "Supplies more Light service from the same Electricity.",
    researchCentre: "Supports Knowledge development in modes that use Knowledge."
};
// One useful change per card: omit labels that merely repeat the title.
const BEGINNER_EFFECTS = Object.freeze({
    basicSolar: "Adds solar Electricity.",
    basicWind: "Adds wind Electricity.",
    basicReservoir: "Electricity from flowing water.",
    basicBiomassPlant: "Uses stored Biomass for electricity.",
    combinedCycle: "More electricity from each Fuel token.",
    gridUpgrade: "Carry 4 Electricity instead of 3.",
    efficientLighting: "More Light from the same electricity."
});
function missingBuildMaterial(cost, player) {
    return ["constructionMaterials", "criticalMaterials"].find(key =>
        (cost[key] || 0) > (player.resources[key]?.warehouse || 0)) || null;
}
function BuildShop({ game, player, onChoose, onInfo, onFindResource }) {
    const [category, setCategory] = useState(null);
    const [europeRecoveryResource, setEuropeRecoveryResource] = useState("constructionMaterials");
    const installed = new Set(player.installed.map(item => item.technologyId));
    const available = game.config.technologies.filter(tech =>
        (!tech.starter || installed.has(tech.id)) && modeAllowsTechnology(game, tech)
        && (installed.has(tech.id) || tech.alwaysAvailable || game.innovationMarket.visible.includes(tech.id))
    );
    const tierIndex = { basic: 0, intermediate: 1, advanced: 2 };
    const categoryFor = tech => tech.pathway === "shared" ? "shared" : tech.pathway;
    const technologiesFor = id => available.filter(tech => categoryFor(tech) === id)
        .sort((a, b) => tierIndex[a.tier] - tierIndex[b.tier]
            || game.config.technologies.indexOf(a) - game.config.technologies.indexOf(b));
    const beginnerIntro = game.gameMode === "beginner" && game.config.rules.generations === 4;
    const streamlined = beginnerIntro || game.gameMode === "intermediate";
    const b = gameText.beginner;
    const categories = BUILD_CATEGORIES;
    // A four-round introduction has seven meaningful projects: show all of
    // them at once, with no additional category-selection click.
    const beginnerProjects = beginnerIntro ? ["basicSolar", "basicWind", "basicReservoir", "basicBiomassPlant", "combinedCycle", "gridUpgrade", "efficientLighting"]
        .map(id => available.find(tech => tech.id === id)).filter(Boolean) : [];
    const beginnerUnbuilt = beginnerProjects.filter(tech => !installed.has(tech.id));
    const selected = categories.find(item => item.id === category);
    const categoryTechnologies = selected ? technologiesFor(category) : [];
    const alreadyInstalled = categoryTechnologies.filter(tech => installed.has(tech.id));
    const buildOptions = categoryTechnologies.filter(tech => !installed.has(tech.id));
    const usesKnowledge = featureEnabled(game, "knowledgeRequirements");
    const card = tech => {
        const readiness = technologyReadiness(game, player.id, tech);
        const cost = readiness.cost;
        const other = cost.constructionMaterials;
        const critical = cost.criticalMaterials;
        const hasDiscount = Boolean(cost.modifiers?.some(modifier => modifier.id === "preparedPathway"));
        const needs = readiness.blockers;
        const missingResource = streamlined ? missingBuildMaterial(cost, player) : null;
        const missingCount = missingResource ? cost[missingResource] - player.resources[missingResource].warehouse : 0;
        const recoveryOptions = [
            other > 0 ? "constructionMaterials" : null,
            critical > 0 ? "criticalMaterials" : null
        ].filter(Boolean);
        const recovery = recoveryOptions.includes(europeRecoveryResource) ? europeRecoveryResource : recoveryOptions[0];
        return h("article", { key: tech.id, "data-sunpaths-tech": tech.id, className: `neutral-build-card ${readiness.legal ? "is-ready" : "is-locked"}` },
            h("div", { className: "neutral-build-card__main" },
                h("div", { className: "neutral-build-card__text" },
                    !streamlined || (game.gameMode === "intermediate" && tech.tier !== "basic") ? h("small", null, tech.tier === "basic" ? "Basic" : tech.tier === "intermediate" ? "Intermediate" : "Advanced") : null,
                    h("h4", null, tech.name),
                    h("p", null, beginnerIntro ? (BEGINNER_EFFECTS[tech.id] || BUILD_PURPOSES[tech.id]) : (BUILD_PURPOSES[tech.id] || tech.gameBenefit || `Develops ${tech.pathway} infrastructure.`))
                ),
                h("div", { className: "neutral-build-card__action" },
                    !streamlined ? h("span", { className: `neutral-build-status ${readiness.legal ? "ready" : "blocked"}` }, readiness.legal ? "Buildable" : "Not yet buildable") : null,
                    readiness.legal ? button(game.gameMode === "intermediate" ? "Build" : "Build · 1 action", () => onChoose({ kind: "build", technologyId: tech.id, ...(player.continentId === "europe" && featureEnabled(game, "fullRegionalRules") && recovery ? { recoveryResource: recovery } : {}) }), { kind: "primary compact" }) : null
                )
            ),
            h("div", { className: "neutral-build-cost" },
                h("span", { className: missingResource === "constructionMaterials" ? "build-resource-short" : "", title: missingResource === "constructionMaterials" ? `${missingCount} more Other needed` : undefined }, `${other} Other`),
                h("span", { className: missingResource === "criticalMaterials" ? "build-resource-short" : "", title: missingResource === "criticalMaterials" ? `${missingCount} more Critical needed` : undefined }, `${critical} Critical`),
                usesKnowledge ? h("span", null, `Knowledge ${cost.knowledgeRequired}`) : null,
                !streamlined ? h("span", null, "1 action") : null,
                hasDiscount && !beginnerIntro ? h("strong", { className: "founding-discount-label" }, beginnerIntro ? b.foundingDiscount : "Founding discount applied") : null
            ),
            !readiness.legal && !streamlined ? h("p", { className: "neutral-build-blocker" }, needs[0]?.label || readiness.reason || "Unavailable") : null,
            streamlined && !readiness.legal ? h("div", { className: "beginner-build-shortage" },
                (() => { const blocker = needs.find(item => !["constructionMaterials", "criticalMaterials"].includes(item.kind));
                    return blocker ? h("span", null, blocker.label) : null; })(),
                missingResource && player.actionsRemaining > 0 && onFindResource && needs.every(blocker => ["constructionMaterials", "criticalMaterials"].includes(blocker.kind)) ? h("button", { type: "button", className: "build-find-resource", onClick: () => onFindResource(missingResource), "aria-label": `Find ${missingResource === "constructionMaterials" ? "Other Materials" : "Critical Minerals"} on the Resources map` }, "↗ Resources") : null
            ) : null,
            !beginnerIntro && featureEnabled(game, "fullRegionalRules") && player.continentId === "europe" && readiness.legal && recoveryOptions.length > 0 ? h("label", { className: "neutral-build-recovery" },
                "Circular Recovery — choose one material to recover after Build",
                h("select", { value: recovery, onChange: event => setEuropeRecoveryResource(event.target.value) },
                    ...recoveryOptions.map(key => h("option", { key, value: key }, key === "constructionMaterials" ? "Recover 1 Other" : "Recover 1 Critical"))
                )
            ) : null,
            h("details", { className: "neutral-build-details" },
                h("summary", null, streamlined ? "Details" : "Details and requirements"),
                tech.prerequisiteTechnologyId ? h("p", null, `Prerequisite: ${getTechnology(game, tech.prerequisiteTechnologyId).name}.`) : null,
                !tech.prerequisiteTechnologyId && !streamlined ? h("p", null, "No prior technology required.") : null,
                usesKnowledge && game.gameMode !== "intermediate" ? h("p", null, `Your effective Knowledge: ${cost.effectiveKnowledge}; required: ${cost.knowledgeRequired}.`) : null,
                !streamlined ? h("p", null, `Your Warehouse: ${player.resources.constructionMaterials.warehouse} Other, ${player.resources.criticalMaterials.warehouse} Critical.`) : null,
                !streamlined ? (needs.length ? h("ul", null, ...needs.map((blocker, i) => h("li", { key: `${tech.id}-${i}` }, blocker.label))) : h("p", null, "All construction requirements met.")) : null,
                hasDiscount && !streamlined ? h("p", null, "This one-time Founding discount will be used when you build this technology.") : null,
                button(beginnerIntro ? b.scientificBackground : "Scientific background", () => onInfo({
                    eyebrow: "Technology reference", title: tech.name,
                    summary: BUILD_PURPOSES[tech.id] || tech.gameBenefit || "Technology development",
                    details: [
                        tech.knowledgeRationale || "This technology is part of the simplified Sunpaths model.",
                        tech.fuel ? `Consumes ${tech.fuel.units} ${resourceLabels[tech.fuel.resource]} when operated.` : "",
                        tech.gameBenefit && tech.id !== "enhancedOilRecovery" && !(beginnerIntro && ["gridUpgrade", "efficientLighting"].includes(tech.id)) ? tech.gameBenefit : "",
                        tech.id === "enhancedOilRecovery" ? "Current model assumption: enhanced recovery raises energy per token. In reality it increases recoverable fuel supply; this scientific abstraction is under review." : ""
                    ].filter(Boolean)
                }), { kind: "ghost compact" })
            )
        );
    };
    return h("div", { className: "neutral-build-shop", "aria-label": "Build technologies" },
        !streamlined ? h("p", { id: "sunpaths-build-intro", className: "neutral-build-intro" }, gameText[game.gameMode]?.buildIntro || gameText.intermediate.buildIntro) : null,
        beginnerIntro ? h("section", { id: "sunpaths-build-catalogue", className: "beginner-build-catalogue", "aria-label": "All seven Beginner construction choices" },
            h("div", { id: "sunpaths-build-intro", className: "beginner-build-wallet", "aria-label": b.warehouseLabel },
                h("strong", null, b.warehouseLabel),
                h("span", null, `${player.resources.constructionMaterials.warehouse} ${b.warehouseOther}`),
                h("span", null, `${player.resources.criticalMaterials.warehouse} ${b.warehouseCritical}`)),
            beginnerProjects.filter(tech => installed.has(tech.id)).length ? h("small", { className: "beginner-installed-count" }, `✓ ${beginnerProjects.filter(tech => installed.has(tech.id)).length} of 7 installed`) : null,
            h("div", { className: "neutral-build-list" }, ...beginnerUnbuilt.map(card)),
            !beginnerUnbuilt.length ? h("p", null, b.noProjectsRemaining) : null
        ) : null,
        !beginnerIntro ? h("div", { className: "neutral-build-categories", "aria-label": "Technology categories" },
            ...categories.map(item => h("button", { key: item.id, type: "button", className: `neutral-build-category ${category === item.id ? "selected" : ""}`, "aria-pressed": category === item.id, onClick: () => setCategory(item.id) },
                h("span", { className: "neutral-build-category__icon", "aria-hidden": "true" }, item.icon),
                h("strong", null, item.label),
                game.gameMode === "intermediate" ? null : h("small", null, item.description)
            ))
        ) : null,
        !beginnerIntro && selected ? h("section", { className: "neutral-build-results", "aria-label": `${selected.label} technologies` },
            h("header", { className: "neutral-build-results__head" }, h("h3", null, selected.label), game.gameMode === "intermediate" ? null : h("small", null, beginnerIntro ? "Available introductory technologies" : "Basic → Intermediate → Advanced")),
            alreadyInstalled.length ? h("p", { className: "neutral-build-installed" }, `✓ Installed: ${alreadyInstalled.map(tech => tech.name).join(" · ")}`) : null,
            buildOptions.length ? h("div", { className: "neutral-build-list" }, ...buildOptions.map(card)) : h("p", null, "No further technology is currently offered in this category.")
        ) : !beginnerIntro ? h("p", { className: "neutral-build-prompt" }, "Select any category to see its technologies and construction costs.") : null
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
        game.gameMode === "intermediate" ? null : h("p", null, "A player trade exchanges up to two Warehouse resources from each side. The initiator spends one Development action; the recipient spends none."),
        h("label", null, "Trade with", h("select", { value: recipientId, onChange: event => setRecipientId(event.target.value) }, ...recipients.map(other => h("option", { key: other.id, value: other.id }, other.name)))),
        h("div", { className: "trade-bundle-grid" },
            h("div", null, h("strong", null, "You offer"), selector(offer1, setOffer1), selector(offer2, setOffer2, true)),
            h("div", null, h("strong", null, `${recipient?.name ?? "They"} offers`), selector(request1, setRequest1), selector(request2, setRequest2, true))
        ),
        recipient && game.gameMode !== "intermediate" ? h("section", { className: "trade-consequence-preview before-action-after" },
            h("div", { className: "preview-column" }, h("small", null, "BEFORE"), h("strong", null, `${player.name}: ${warehouseTotal(player)}/${game.config.rules.warehouseMaximum}`), h("span", null, `${recipient.name}: ${warehouseTotal(recipient)}/${game.config.rules.warehouseMaximum}`)),
            h("div", { className: "preview-column action" }, h("small", null, "ACTION"), h("strong", null, `${describe(aGives)} ⇄ ${describe(bGives)}`), h("span", null, "Initiator: −1 Development action")),
            h("div", { className: "preview-column" }, h("small", null, "AFTER"), h("strong", null, `${player.name}: ${warehouseTotal(player) - Object.values(aGives).reduce((sum, value) => sum + value, 0) + Object.values(bGives).reduce((sum, value) => sum + value, 0)}/${game.config.rules.warehouseMaximum}`), h("span", null, `${recipient.name}: ${warehouseTotal(recipient) - Object.values(bGives).reduce((sum, value) => sum + value, 0) + Object.values(aGives).reduce((sum, value) => sum + value, 0)}/${game.config.rules.warehouseMaximum}`)),
            h("div", { className: "preview-why" }, h("small", null, "WHY IT MATTERS"), h("span", null, "Player trade can preserve more resource value than the World Market, but it uses one action."))
        ) : null,
        canPropose && game.gameMode !== "intermediate" ? h("p", { className: "choice-benefit" }, `${describe(aGives)} ⇄ ${describe(bGives)} · costs you 1 action`) : canPropose ? null : h(LockedReason, { reason }),
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

function developmentProgressEntries(game, player) {
    const entries = [];
    for (const event of game.log) {
        if (event.generation !== game.generation || event.actorId !== player.id)
            continue;
        if (event.type === "action.extract")
            entries.push({ icon: "⛏", label: `+${event.data?.amount ?? 1} ${resourceLabels[event.data?.resource] ?? "resource"}` });
        else if (event.type === "action.build")
            entries.push({ icon: "⚙", label: `Built ${getTechnology(game, event.data?.technologyId).name}` });
        else if (event.type === "action.research")
            entries.push({ icon: "✦", label: `Knowledge ${event.data?.nextLevel ?? player.knowledge}` });
        else if (event.type === "trade.completed")
            entries.push({ icon: "⇄", label: "Player trade completed" });
        else if (event.type === "action.worldMarket")
            entries.push({ icon: "◎", label: `Market +1 ${resourceLabels[event.data?.receive] ?? "resource"}`, free: true });
        else if (event.type === "action.adapt")
            entries.push({ icon: "↻", label: "Adapted to condition" });
        else if (event.type === "action.pass")
            entries.push({ icon: "—", label: "Passed" });
    }
    return entries.slice(-4);
}

function DevelopmentProgress({ game, player, bottleneck, constraint, required, onInfo }) {
    const entries = developmentProgressEntries(game, player);
    return h("section", { className: "turn-progress-panel", "aria-label": "Development progress this Generation" },
        h("div", { className: "turn-progress-heading" },
            h("strong", null, game.gameMode === "beginner" ? gameText.beginner.development.changesTitle : "This Generation"),
            h("small", null, entries.length ? `${entries.length} recorded change${entries.length === 1 ? "" : "s"}` : "No actions taken yet")
        ),
        entries.length ? h("div", { className: "turn-progress-events" }, ...entries.map((entry, index) => h("span", { key: `${entry.label}-${index}`, className: entry.free ? "is-free" : "" }, h("b", { "aria-hidden": "true" }, entry.icon), h("em", null, entry.label)))) : h("div", { className: "turn-progress-empty" }, h("span", null, game.gameMode === "beginner" && game.config.rules.generations === 4 ? gameText.beginner.development.changesEmpty : "Map extraction, Learn, Build and Trade changes appear here.")),
        h("div", { className: `compact-bottleneck-line ${bottleneck.type === "none" ? "ready" : "limited"}` },
            h("strong", null, bottleneck.type === "none" ? `✓ Can meet ${required} Light` : bottleneck.label),
            button("Why?", () => onInfo({ eyebrow: "Current system", title: bottleneck.type === "none" ? "Demand can be met" : bottleneck.label, summary: bottleneck.explanation, details: bottleneck.type === "none" ? [] : [constraint.explanation] }), { kind: "ghost compact" })
        )
    );
}

function ActionConsequence({ feedback, onDismiss }) {
    if (!feedback || feedback.kind !== "developmentEffect") return null;
    const changedStages = feedback.stages.some(stage => stage.changed);
    return h("section", { className: "action-consequence", role: "status", "aria-live": "polite", "aria-label": "What your action changed" },
        h("header", { className: "action-consequence__heading" },
            h("div", null, h("small", null, "YOUR ACTION → SYSTEM EFFECT"), h("h3", null, feedback.title)),
            onDismiss ? button("×", onDismiss, { kind: "ghost compact", title: "Dismiss explanation" }) : null
        ),
        h("div", { className: "action-consequence__chain", "aria-label": "Before and after Energy chain" },
            ...feedback.stages.flatMap((stage, i) => [
                h("div", { key: stage.id, className: `action-consequence__stage ${stage.changed ? "has-changed" : ""}` },
                    h("small", null, `${stage.icon} ${stage.label}`),
                    h("div", { className: "action-consequence__values" }, h("span", null, stage.before), h("b", { "aria-hidden": "true" }, "→"), h("strong", null, stage.after)),
                    h("span", { className: "action-consequence__difference" }, stage.changed ? `${stage.after - stage.before > 0 ? "+" : ""}${stage.after - stage.before} changed` : "Unchanged")
                ),
                i < feedback.stages.length - 1 ? h("span", { key: `arrow-${i}`, className: "action-consequence__arrow", "aria-hidden": "true" }, "›") : null
            ].filter(Boolean))
        ),
        h("p", { className: "action-consequence__takeaway" }, feedback.takeaway),
        h("div", { className: "action-consequence__changes" },
            ...feedback.resourceChanges.map((change, i) => h("span", { key: `resource-${i}` }, h("small", null, change.label), h("strong", null, `${change.before} → ${change.after}`))),
            h("span", null, h("small", null, "Development actions left"), h("strong", null, `${feedback.actions.before} → ${feedback.actions.after}`)),
            feedback.loss.before !== feedback.loss.after ? h("span", null, h("small", null, "Projected counted loss"), h("strong", null, `${feedback.loss.before} → ${feedback.loss.after}`)) : null
        ),
        h("p", { className: "action-consequence__bottleneck" }, h("strong", null, "Limiting stage: "), feedback.bottleneckChange ? `${feedback.previousBottleneck} → ${feedback.bottleneck}` : feedback.bottleneck,
            !changedStages && !feedback.resourceChanges.length ? " · This action produced no immediate chain change." : ""),
        h("small", { className: "action-consequence__note" }, "Light and losses are projected from the current recommended plan, not confirmed results. Source Energy and Grid capacity have different meanings.")
    );
}

function DevelopmentControls({ game, player, onAction, onFinishDevelopment, onUndo, canUndo, onReset, onTrade, tradeMessage, onInfo, onGather, effect, onDismissEffect, onBuildMenuOpened, onReplayBeginnerBuildPrompt, buildGuideOpenRequest = 0, guidedSectionRequest = null }) {
    const [section, setSection] = useState(null);
    const [confirmation, setConfirmation] = useState(null);
    useEffect(() => { setSection(null); onBuildMenuOpened?.(false); }, [player.id, game.actionRound, game.generation]);
    useEffect(() => { if (buildGuideOpenRequest) setSection("build"); }, [buildGuideOpenRequest]);
    useEffect(() => { if (guidedSectionRequest) setSection(guidedSectionRequest.section || null); }, [guidedSectionRequest]);
    const condition = conditionDefinition(game, player);
    const adaptable = condition && "adaptable" in condition.effect && condition.effect.adaptable && !player.localCondition.adapted;
    const adaptStatus = adaptable ? developmentActionLegality(game, player.id, { kind: "adapt" }) : null;
    const researchStatus = developmentActionLegality(game, player.id, { kind: "research" });
    const required = getRequiredLight(game, player.id);
    const maximum = getCurrentMaximumLight(game, player.id);
    const status = maximum >= required ? "Secure" : "At Risk";
    const globalEvent = activeGlobalEvent(game);
    const bottleneck = getPrimaryBottleneck(game, player.id, { target: required });
    const constraint = getDevelopmentConstraint(game, player.id);
    const usage = generationActionUsage(game, player);
    const soloBeginner = game.gameMode === "beginner" && game.config.rules.generations === 4
        && Object.values(game.players).filter(participant => participant.controller.kind === "human").length === 1;
    const usesKnowledge = featureEnabled(game, "knowledgeRequirements");
    const beginnerIntro = game.gameMode === "beginner" && game.config.rules.generations === 4;
    const streamlined = beginnerIntro || game.gameMode === "intermediate";
    const usesWorldMarket = Boolean(game.config.trade.publicImportEnabled);
    const usesDirectTrade = Boolean(game.config.trade.directEnabled);
    const usesTrade = usesWorldMarket || usesDirectTrade;
    const choose = action => {
        const legality = developmentActionLegality(game, player.id, action);
        if (!legality.legal) {
            onInfo({ eyebrow: "Action unavailable", title: friendlyActionName(action, game), summary: legality.reason, details: ["No resources or actions were consumed."] });
            return;
        }
        if (action.kind === "build") {
            const success = onAction(action);
            if (success !== false) setSection(null);
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
        { id: "gather", icon: "⛏", label: "Gather", count: usage.gather, available: player.actionsRemaining > 0 },
        usesKnowledge ? { id: "learn", icon: "✦", label: "Learn", count: usage.learn, available: researchStatus.legal } : null,
        { id: "build", icon: "⚙", label: "Build", count: usage.build, available: player.actionsRemaining > 0 },
        usesTrade ? { id: "trade", icon: "⇄", label: usesDirectTrade ? "Trade / Market" : "World Market", count: usage.trade, freeCount: usage.market, available: true } : null
    ].filter(Boolean);
    return h("div", { id: "sunpaths-development-actions", className: "action-panel clean-action-panel development-board simplified-development-board" },
        h("header", { className: "turn-banner simplified-turn-banner" },
            h("div", null, h("p", { className: "eyebrow" }, `Generation ${game.generation}`), h("h2", null, `${player.name}'s turn`)),
            h("div", { className: "development-token-rack", "aria-label": `${player.actionsRemaining} actions remaining` },
                ...Array.from({ length: game.config.rules.actionsPerGeneration }, (_, index) => h("span", { key: index, className: `development-token ${index < player.actionsRemaining ? "ready" : "spent"}` }, index < player.actionsRemaining ? "●" : "✓")),
                h("strong", null, `${player.actionsRemaining} left`)
            )
        ),
        !section ? h("nav", { className: "compact-development-actions", "aria-label": "Development actions" },
            ...tabs.map(tab => h("button", { key: tab.id, type: "button", disabled: !tab.available, className: `compact-action-button ${tab.available ? "" : "unavailable"}`, id: tab.id === "build" ? "sunpaths-build-tab" : undefined, onClick: () => tab.id === "gather" ? onGather() : (setSection(tab.id), tab.id === "build" && onBuildMenuOpened?.(true)) },
                h("span", { "aria-hidden": "true" }, tab.icon),
                h("strong", null, tab.label),
                tab.count ? h("small", null, `${tab.count} used`) : tab.freeCount ? h("small", null, `${tab.freeCount} market`) : null
            ))
        ) : null,
                // Beginner uses the single top Light strip and defers action explanation to Review.
        // Keep the original fuller Development metrics for Intermediate/Master.
        !streamlined ? h("section", { className: `compact-goal-strip status-${status.toLowerCase().replace(" ", "-")}` },
            h("span", null, h("small", null, "Required"), h("strong", null, `${required} Light`)),
            h("span", null, h("small", null, "System limit (not delivered)"), h("strong", null, `Up to ${maximum} Light`)),
            h("b", null, status)
        ) : null,
        !streamlined && effect?.playerId === player.id && effect?.generation === game.generation
            ? h(ActionConsequence, { feedback: effect, onDismiss: onDismissEffect }) : null,
        !streamlined ? h(DevelopmentProgress, { game, player, bottleneck, constraint, required, onInfo }) : null,
        game.gameMode === "intermediate" ? null : h(ActiveConditionStrip, { game, player, condition, onInfo }),
        adaptable ? h("button", { type: "button", className: "adapt-alert compact", onClick: () => choose({ kind: "adapt" }), disabled: !adaptStatus?.legal }, h("strong", null, `Adapt to ${condition.name}`), h("span", null, "1 action")) : null,
        section ? h("section", { className: "section-step development-section" },
            h("div", { className: "section-step-heading" }, button("← Back", () => { setSection(null); onBuildMenuOpened?.(false); }, { kind: "ghost" }), h("h3", null, section === "learn" ? "Learn" : section === "build" ? "Build" : usesDirectTrade ? "Trade and World Market" : "World Market")),
            section === "learn" ? h(LearnPanel, { game, player, onChoose: choose }) : null,
            section === "build" ? h(BuildShop, { game, player, onChoose: choose, onInfo, onFindResource: resource => { setSection(null); onBuildMenuOpened?.(false); onGather(resource); } }) : null,
            section === "trade" ? h("div", { className: "trade-sections" },
                usesWorldMarket ? h("section", { className: "trade-mode-card" }, h("h4", null, "World Market"), game.gameMode === "intermediate" ? null : h("p", null, "0 actions · current exchange rates shown below"), h(ImportChoices, { game, player, onChoose: choose })) : null,
                usesDirectTrade ? h("section", { className: "trade-mode-card" }, h("h4", null, "Player Trade"), game.gameMode === "intermediate" ? null : h("p", null, "1 action · negotiated bundles"), h(TradePanel, { game, player, onTrade, message: tradeMessage })) : null
            ) : null
        ) : null,
        h("details", { className: "turn-utility-controls" }, h("summary", null, "Turn controls · Undo / End early"), h("div", { className: "safe-controls" },
            beginnerIntro && game.generation === 1 && game.uiMode !== "strategy" ? button(gameText.beginner.development.replayTutorial, () => { setSection(null); onBuildMenuOpened?.(false); onReplayBeginnerBuildPrompt?.(); }, { kind: "ghost" }) : null,
            soloBeginner && player.actionsRemaining > 0 ? button(`End Development early · forfeit ${player.actionsRemaining} action${player.actionsRemaining === 1 ? "" : "s"}`, () => {
                if (globalThis.confirm?.(`End Development now? You will forfeit ${player.actionsRemaining} unused action${player.actionsRemaining === 1 ? "" : "s"}. You can instead use Gather or Build.`)) onFinishDevelopment();
            }, { kind: "ghost" }) : null,
            soloBeginner ? null : button("Pass", () => choose({ kind: "pass" }), { kind: "ghost" }),
            button("Undo my last decision", onUndo, { kind: "ghost", disabled: !canUndo, title: "Rewinds your last Development action and any AI turns that followed. Does not undo another human player's choice." }),
            button("Reset Generation", onReset, { kind: "ghost", disabled: !game.undo.generationStart }))),
        confirmation ? h(ConfirmationModal, { confirmation, onConfirm: confirm, onCancel: () => setConfirmation(null) }) : null
    );
}

function DispatchPanel({ game, player, onDispatch, onInfo }) {
    const recommended = useMemo(() => chooseDispatchPlan(game, player), [game, player.id]);
    const preview = useMemo(() => previewDispatch(game, player.id, recommended), [game, player.id]);
    const condition = conditionDefinition(game, player);
    const conditionImpact = condition ? conditionImpactPreview(game, player.id, condition) : null;
    const beginnerIntro = game.gameMode === "beginner" && game.config.rules.generations === 4;
    const streamlined = beginnerIntro || game.gameMode === "intermediate";
    const bottleneck = getPrimaryBottleneck(game, player.id, { target: preview.target });
    return h("div", { id: "sunpaths-dispatch-panel", className: "action-panel dispatch-clean" },
        h("div", { className: "turn-banner" }, h("div", null, h("p", { className: "eyebrow" }, beginnerIntro ? gameText.beginner.dispatch.projected : "Projected · not dispatched"), h("h2", null, beginnerIntro ? gameText.beginner.dispatch.heading : `${player.name}'s recommended Energy plan`)), streamlined ? null : badge(weatherLabels[game.weather.current], "weather")),
        !streamlined ? h("p", { className: "dispatch-projection-note" }, "These figures are estimates for the recommended plan, not actual results. Open 'See every command' to inspect what it will operate.") : null,
        condition && !streamlined ? h("button", { type: "button", className: "dispatch-condition-note", onClick: () => onInfo(localConditionExplanation(game, player, condition)) }, h("strong", null, condition.name), h("span", null, `${conditionImpact.values.join(" → ")} · ${conditionImpact.prompt}`)) : null,
        streamlined ? null : h(EnergyChain, { game, player, onInfo, context: "dispatchBoard" }),
        !beginnerIntro ? h("div", { className: "compact-bottleneck-line dispatch-bottleneck" },
            h("strong", null, bottleneck.type === "none" ? "✓" : bottleneck.label),
            button("Why?", () => onInfo({ eyebrow: "Energy flow", title: bottleneck.label, summary: bottleneck.explanation, details: [] }), { kind: "ghost compact" })
        ) : null,
        h("div", { className: "dispatch-metrics" },
            streamlined ? stat("Estimated Light", `${preview.light}`) : stat("Required Light", preview.target),
            game.gameMode === "beginner" && game.config.rules.generations === 4 ? null : stat("Projected Reliability Points", preview.legal ? `+${preview.pointsEarned ?? 0}` : "—"),
            streamlined ? null : stat("Available storage", preview.stored),
            streamlined ? null : stat("Stored for next", preview.storedPending ?? 0),
            !beginnerIntro ? stat("Projected System Loss", preview.legal ? sumLoss(preview.lossBreakdown) : "—") : null,
            !streamlined ? stat("Unused Electricity", preview.curtailed) : null
        ),
        preview.legal ? button(streamlined ? "Confirm Energy Plan" : `Confirm recommended plan · deliver ${preview.light} Light`, () => onDispatch(recommended), { kind: "primary large full" }) : h("div", { className: "notice error" }, `The planned Dispatch is not legal: ${preview.reason}`),
        h("details", { className: "dispatch-details" }, h("summary", null, streamlined ? "Plan details" : "See every command in the plan"),
            beginnerIntro ? h("p", null, `Projected System Loss: ${preview.legal ? sumLoss(preview.lossBreakdown) : "—"} · Unused Electricity: ${preview.curtailed}`) : game.gameMode === "intermediate" ? h("p", null, `Storage ${preview.stored} · Stored for next ${preview.storedPending ?? 0} · Unused Electricity ${preview.curtailed}`) : null,
            h("ul", null, beginnerIntro ? null : h("li", null, `Hydro released: ${recommended.hydroOutputRequested}.`), beginnerIntro ? null : h("li", null, `Battery Energy discharged: ${Object.values(recommended.batteryDischargeInput).reduce((a, b) => a + b, 0)}.`), beginnerIntro ? null : h("li", null, `Energy sent to storage: ${Object.values(recommended.batteryCharge).reduce((sum, allocation) => sum + Object.values(allocation).reduce((a, b) => a + b, 0), 0)}.`), h("li", null, `Transported by pathway: ${Object.entries(recommended.transportByPathway).filter(([, value]) => value > 0).map(([path, value]) => `${pathwayLabels[path]} ${value}`).join(", ") || "none"}.`)))
    );
}

function ReviewScreen({ game, onContinue, effect, developmentEffect }) {
    const humanIds = currentOrder(game).filter(id => game.players[id].controller.kind === "human");
    const otherIds = currentOrder(game).filter(id => !humanIds.includes(id));
    const renderHumanReview = id => {
        const player = game.players[id];
        const story = getGenerationExplanation(game, id, game.generation);
        const condition = conditionDefinition(game, player);
        const whatHelped = condition && getConditionRelevance(game, id, condition).level === "critical"
            ? `${condition.name} changed the result this Generation.`
            : game.gameMode === "beginner" ? `${weatherLabels[game.weather.current]} can increase renewable electricity without creating energy.` : game.weather.current ? `${weatherLabels[game.weather.current]} shaped the available renewable Energy.` : "The installed system provided the available Energy.";
        const ledger = story.lossLedger;
        const systemLoss = ledger.fuelSupply + ledger.generationHeat + ledger.storageHeat + ledger.lightingHeat + ledger.other;
        const unused = story.unused > 0 ? `${story.unused} Electricity was unused or curtailed; it is tracked separately from System Loss.` : systemLoss > 0 ? `${systemLoss} Source Energy or Electricity was recorded in the Loss Ledger.` : "No System Loss or unused Electricity was recorded.";
        const actionEffect = story.metrics.technologiesBuilt?.length ? `${story.metrics.technologiesBuilt.map(technologyId => getTechnology(game, technologyId).name).join(", ")} changed the system this Generation.` : "No newly built technology changed the Energy chain this Generation.";
        return h("article", { key: id, className: `review-story-card ${story.demandMet ? "goal-met" : "goal-missed"}` },
            h("div", { className: "review-story-heading" }, h("div", null, h("small", null, player.name), h("h3", null, game.config.continents.find(continent => continent.id === player.continentId).name)), h("span", { className: story.demandMet ? "review-status success" : "review-status warning" }, story.demandMet ? (game.gameMode === "beginner" && game.config.rules.generations === 4 ? "Demand met ✓" : `+${story.pointsEarned} Reliability Point${story.pointsEarned === 1 ? "" : "s"}`) : "Demand not fully met")),
            (game.gameMode === "beginner" && game.config.rules.generations === 4) || game.gameMode === "intermediate" ? null : h("div", { className: "review-goal-summary" }, stat("Required", `${story.requiredLight} Lights`), stat("Supplied", `${story.lightProduced} Lights`)),
            game.gameMode === "beginner" && game.config.rules.generations === 4
                ? h(BeginnerFlowStory, { story, generation: game.generation, cumulativeLossLedger: player.cumulative.lossLedger, ledInstalled: player.installed.some(item => item.technologyId === "efficientLighting") })
                : h("div", { className: "review-energy-story" },
                    h("div", null, h("small", null, "Source now"), h("strong", null, story.generated), h("span", null, "◉ Energy")), h("b", null, "→"),
                    h("div", null, h("small", null, "Available"), h("strong", null, story.afterLosses), h("span", null, "⚡ Electricity")), h("b", null, "→"),
                    h("div", null, h("small", null, "Lighting used"), h("strong", null, story.deliveredEnergy), h("span", null, "⚡ Electricity")), h("b", null, "→"),
                    h("div", null, h("small", null, "Supplied"), h("strong", null, story.lightProduced), h("span", null, "💡 Lights"))
                ),
            h("details", { className: "review-technical review-explanation" }, h("summary", null, "What affected this result"),
                h("div", { className: "review-causal-grid" },
                    h("p", null, h("strong", null, "Main bottleneck: "), story.primaryBottleneckLabel),
                    h("p", null, h("strong", null, "What helped: "), whatHelped),
                    h("p", null, h("strong", null, "Unused or lost: "), unused),
                    h("p", null, h("strong", null, "Effect of development: "), actionEffect)
                ),
                h("div", { className: "generation-takeaway" }, h("small", null, "TAKEAWAY"), h("p", null, story.takeaway))
            ),
            game.gameMode === "beginner" && game.config.rules.generations === 4 ? null : h("details", { className: "review-technical" }, h("summary", null, "Why? See the Loss Ledger"), h("div", { className: "mini-stats" }, stat("Fuel-supply loss", ledger.fuelSupply), stat("Generation heat", ledger.generationHeat), stat("Storage heat", ledger.storageHeat), stat("Lighting heat", ledger.lightingHeat), stat("Other loss", ledger.other), stat("System Loss", systemLoss), stat("Unused Electricity", ledger.curtailed), stat("Recovered storage", Object.values(story.metrics.energyFlow?.storageReleasedByPathway ?? {}).reduce((sum, value) => sum + value, 0)), (game.gameMode === "beginner" && game.config.rules.generations === 4 ? null : stat("Reliability points", story.pointsEarned ? `+${story.pointsEarned}` : "—"))), h("p", { className: "muted" }, `Normalised Source Energy by pathway: ${Object.entries(story.metrics.grossEnergy).filter(([, value]) => value > 0).map(([path, value]) => `${pathwayLabels[path]} ${value}`).join(" · ") || "none"}. Stored for later: ${story.stored}.`))
        );
    };
    return h("div", { id: "sunpaths-review-panel", className: "review redesigned-review" },
        h("div", { className: "action-heading" }, h("div", null, h("p", { className: "eyebrow" }, "Actual results · confirmed"), h("h2", null, game.gameMode === "beginner" && game.config.rules.generations === 4 ? gameText.beginner.review.title : `Generation ${game.generation} review`)), button(game.generation === game.config.rules.generations ? (game.gameMode === "beginner" && game.config.rules.generations === 4 ? gameText.beginner.review.finish : "Calculate final results") : (game.gameMode === "beginner" && game.config.rules.generations === 4 ? gameText.beginner.review.continue : "Continue"), onContinue, { kind: "primary" })),
        game.gameMode !== "beginner" && (game.gameMode !== "intermediate" || !effect?.matched) && effect?.kind === "dispatchEffect" && effect.generation === game.generation && humanIds.includes(effect.playerId) ? h("section", { className: `dispatch-outcome ${effect.demandMet ? "is-met" : "is-missed"}`, role: "status", "aria-label": "Projected versus delivered Energy plan" },
            h("div", null, h("small", null, "DISPATCH: PLAN → REAL RESULT"), h("h3", null, effect.matched ? "Your Energy plan worked as projected" : "Your Energy plan differed from the projection"), h("p", null, effect.takeaway)),
            h("div", { className: "dispatch-outcome__numbers" },
                h("span", null, h("small", null, "Projected Light"), h("strong", null, effect.plannedLight)),
                h("b", { "aria-hidden": "true" }, "→"),
                h("span", null, h("small", null, "Delivered Light"), h("strong", null, effect.actualLight)),
                h("span", null, h("small", null, "Demand"), h("strong", null, effect.demand)),
                game.gameMode === "beginner" && game.config.rules.generations === 4 ? null : h("span", null, h("small", null, "Reliability gained"), h("strong", null, `+${effect.actualPoints}`))
            ),
            h("small", null, `Counted System Loss: projected ${effect.projectedLoss}; actual ${effect.actualLoss}. Unused electricity is tracked separately.`)
        ) : null,
        game.gameMode === "beginner" && game.config.rules.generations === 4 && developmentEffect?.generation === game.generation
            ? h("details", {className:"review-development-effects"},
                h("summary",null,"Your Development action → system effect"),
                h(ActionConsequence,{feedback:developmentEffect})) : null,
        h("section", { className: "human-review-first" }, ...humanIds.map(renderHumanReview)),
        otherIds.length ? h("details", { className: "other-region-reviews" },
            h("summary", null, `Other regions (${otherIds.length})`),
            h("div", { className: "other-region-summary-grid" }, ...otherIds.map(id => h(OtherRegionSummary, { key: id, game, player: game.players[id] })))
        ) : null
    );
}

function BeginnerResults({ game, onRestart, onTryIntermediate }) {
    const human = Object.values(game.players).find(player => player.controller.kind === "human") ?? Object.values(game.players)[0];
    const record = human?.cumulative.demandMetGenerations ?? 0;
    const observations = [1, 2, 3, 4].map(generation => {
        const light = human?.lightByGeneration[generation] ?? 0;
        const met = light >= generation;
        return h("li", { key: generation, className: met ? "met" : "missed", "aria-label": `Generation ${generation}: ${light} of ${generation} Light, ${met ? "met" : "missed"}` },
            h("small", null, `G${generation}`),
            h("strong", null, met ? "✓" : "–"),
            h("span", null, `${light}/${generation}`));
    });
    return h("section", { className: "beginner-ending", "aria-label": "Beginner introduction complete" },
        h("p", { className: "eyebrow" }, "POWER THE LIGHTS · INTRODUCTION COMPLETE"),
        h("h1", null, "Your first energy system"),
        h("p", null, `${record} of 4 Light targets met. ${human?.reliabilityByGeneration?.[4] ? "You also earned the final reserve point by delivering 5 Light." : "Delivering 5 Light in Generation 4 would earn the optional reserve point."}`),
        h("ul", { className: "beginner-ending-rounds" }, ...observations),
        h("section", { className: "beginner-final-ranking", "aria-label":gameText.beginner.lossAnimation.finalTitle },
            h("h2", null, gameText.beginner.lossAnimation.finalTitle),
            h("p", null, "Demand met comes first. A fifth Light in Generation 4 earns one reserve point, used before System Loss to break ties."),
            h("div", { className: "beginner-final-ranking__rows" },
                ...game.results.map(result => h("div", {key:result.playerId, className:`beginner-final-ranking__row ${result.playerId === human?.id ? "is-you" : ""}`},
                    h("strong",null,`#${result.rank}`),
                    h("span",null,game.players[result.playerId]?.name || result.playerId),
                    h("span",null,`${result.demandMetGenerations}/4`),
                    h("span",null,`★ ${result.reliableGenerations} reserve`),
                    h("span",null,`↘ ${result.systemLoss}`)
                ))
            ),
            h("small",null,gameText.beginner.lossAnimation.finalFootnote)
        ),
        h("small", { className: "beginner-ending-note" }, "Counted loss is a simplified efficiency score, not a full environmental-impact measure."),
        h("h2", null, "What if weather could also reduce supply?"),
        h("p", null, "Intermediate adds adverse weather effects, local conditions, regional challenges and Knowledge."),
        h("div", { className: "form-row" },
            button("Explore Intermediate", onTryIntermediate, { kind: "primary large" }),
            button("Play again", onRestart, { kind: "secondary" }))
    );
}

function ResultsScreen({ game, onRestart, onTryIntermediate }) {
    if (game.gameMode === "beginner" && game.config.rules.generations === 4)
        return h(BeginnerResults, { game, onRestart, onTryIntermediate });
    const human = Object.values(game.players).find(player => player.controller.kind === "human") ?? game.players[game.results[0]?.playerId];
    const story = human ? getEndGameDebrief(game, human.id) : null;
    const humanResult = human ? game.results.find(result => result.playerId === human.id) : null;
    const winners = game.results.filter(result => result.rank === 1);
    const runnerUp = game.results.find(result => result.rank > 1) ?? null;
    const resultLabel = result => {
        const player = game.players[result.playerId];
        const continent = game.config.continents.find(item => item.id === player.continentId)?.name ?? player.continentId;
        return player.name === continent ? continent : `${player.name} · ${continent}`;
    };
    const winnerReason = winners.length > 1
        ? "They remain tied after every tiebreaker."
        : !runnerUp ? "Completed the eight-Generation challenge."
        : winners[0].perfectDemandRecord !== runnerUp.perfectDemandRecord ? "Met demand in all eight Generations."
        : winners[0].reliableGenerations !== runnerUp.reliableGenerations ? `Won with ${winners[0].reliableGenerations} Reliability Points.`
        : winners[0].systemLoss !== runnerUp.systemLoss ? `Reliability was tied; ${resultLabel(winners[0])} recorded less System Loss.`
        : winners[0].totalLight !== runnerUp.totalLight ? `System Loss was tied; ${resultLabel(winners[0])} supplied more Total Light.`
        : "All earlier measures were tied; recoverable stored Energy decided the result.";
    const winnerTitle = winners.length > 1
        ? `${winners.map(resultLabel).join(" and ")} share first place!`
        : `${resultLabel(winners[0])} wins!`;
    return h("div", { className: "results" },
        h("div", { className: "sun-mark small" }, h("span", null, "☀")), h("p", { className: "eyebrow" }, "Eight Generations complete"), h("h1", null, "Final Results"),
        h("section", { className: `winner-announcement ${winners.length > 1 ? "shared" : ""}`, "aria-live": "polite" }, h("span", { "aria-hidden": "true" }, "☀"), h("div", null, h("p", { className: "eyebrow" }, winners.length > 1 ? "Shared victory" : "Winner"), h("h2", null, winnerTitle), h("p", null, winnerReason))),
        h("div", { className: "results-table" }, ...game.results.map(result => { const player = game.players[result.playerId]; return h("div", { key: result.playerId, className: `result-row ${result.rank === 1 ? "winner" : ""}` }, h("strong", { className: "rank" }, result.rank), h("div", null, h("h3", null, player.name), h("small", null, game.config.continents.find(c => c.id === player.continentId).name)), stat("Demand record", result.perfectDemandRecord ? "8/8 ✓" : `${result.demandMetGenerations}/8`), stat("Reliability", `${result.reliableGenerations}/${game.config.rules.reliabilityPointMaximum ?? 12}`), stat("System Loss", result.systemLoss), stat("Total Light", result.totalLight), stat("Stored", result.usableStoredEnergy)); })),
        story ? h("section", { className: "system-story compact-system-story" }, h("p", { className: "eyebrow" }, "YOUR SYSTEM STORY"), h("h2", null, `${human.name}'s system at a glance`),
            h("div", { className: "system-story-grid system-story-summary" },
                h("article", null, h("small", null, "Final position"), h("strong", null, humanResult ? `#${humanResult.rank}` : "—")),
                h("article", null, h("small", null, "Reliability Points"), h("strong", null, humanResult?.reliableGenerations ?? story.demandMet)),
                h("article", null, h("small", null, "Total Light"), h("strong", null, humanResult?.totalLight ?? human.cumulative.totalLight)),
                h("article", null, h("small", null, "Main bottleneck"), h("strong", null, story.frequentBottleneckLabel)),
                h("article", null, h("small", null, "System Loss"), h("strong", null, totalLoss(human)))
            ),
            h("p", { className: "system-story-takeaway" }, h("strong", null, "Takeaway: "), story.usefulPreparation),
            h("details", { className: "full-system-story" },
                h("summary", null, "Full system story"),
                h("div", { className: "system-story-grid" },
                    h("article", null, h("small", null, "Main outside dependency"), h("strong", null, story.dependencyResource ? resourceLabels[story.dependencyResource] : "No major import dependency"), h("p", null, story.dependencyResource ? `${story.dependencyAmount} imported or traded resource units recorded.` : "No single imported resource dominated your history.")),
                    h("article", null, h("small", null, "Regional strength"), h("strong", null, game.config.continents.find(item => item.id === human.continentId).name), h("p", null, story.regionalStrength)),
                    h("article", null, h("small", null, "Loss Ledger"), h("strong", null, `${totalLoss(human)} System Loss`), h("p", null, `${human.cumulative.lossLedger?.fuelSupply ?? 0} Fuel supply · ${human.cumulative.lossLedger?.generationHeat ?? 0} generation heat · ${human.cumulative.lossLedger?.storageHeat ?? 0} storage heat · ${human.cumulative.lossLedger?.lightingHeat ?? 0} lighting heat · ${human.cumulative.lossLedger?.other ?? 0} other. Unused Electricity: ${human.cumulative.lossLedger?.curtailed ?? human.cumulative.curtailment ?? 0}.`)),
                    story.unusedOpportunity ? h("article", null, h("small", null, "Unused opportunity"), h("strong", null, "Available capacity"), h("p", null, story.unusedOpportunity)) : null
                ),
                h("div", { className: "reflection-question" }, h("small", null, "REFLECT"), h("p", null, story.reflection), h("span", null, "This question does not affect the result."))
            )
        ) : null,
        h("div", { className: "form-row" }, button("New Game", onRestart, { kind: "primary" }), button("Export results JSON", () => download(`sunpaths-results-${game.seed}.json`, JSON.stringify({ seed: game.seed, results: game.results, log: game.log }, null, 2)), { kind: "secondary" }))
    );
}

function FocusStrip({ game, player, onInfo }) {
    if (!game.generation || game.phase === "game.complete" || !player)
        return null;
    const required = getRequiredLight(game, player.id);
    const maximum = getCurrentMaximumLight(game, player.id);
    const actions = player.actionsRemaining ?? 0;
    const condition = conditionDefinition(game, player);
    const status = maximum >= required ? "Secure" : "At Risk";
    const globalEvent = activeGlobalEvent(game);
    return h("section", { className: `focus-strip status-${status.toLowerCase().replace(" ", "-")}`, "aria-label": "Current game focus" },
        h("div", { className: "focus-generation" }, h("small", null, "Generation"), h("strong", null, `${game.generation} of ${game.config.rules.generations}`)),
        h("div", { className: "focus-goal" }, h("small", null, "Required Light"), h("strong", null, `💡 ${required}`), h("span", null, game.gameMode === "beginner" && game.config.rules.generations === 4 ? "Meet this Light target" : game.generation >= 5 ? "Meet = 1 point · exceed = 2" : "Meet or exceed = 1 point")),
        h("div", { className: "focus-maximum" }, h("small", null, "Potential now"), h("strong", null, `${maximum} Light`), h("span", null, status)),
        h("button", { type: "button", className: "focus-weather current", onClick: () => onInfo(weatherExplanation(game, player, game.weather.current, "Current Condition")) }, h("small", null, "Now"), h("strong", null, weatherLabels[game.weather.current] || "—")),
        featureEnabled(game, "forecastVisible") ? h("button", { type: "button", className: "focus-weather forecast", onClick: () => onInfo(weatherExplanation(game, player, game.weather.forecast, "Next Forecast")) }, h("small", null, "Next"), h("strong", null, game.weather.forecast ? weatherLabels[game.weather.forecast] : "—")) : null,
        game.gameMode !== "master" ? null : h("div", { className: "focus-actions" }, h("small", null, "Actions"), h("span", { "aria-label": `${actions} actions remaining` }, ...Array.from({ length: game.config.rules.actionsPerGeneration }, (_, index) => h("i", { key: index, className: index < actions ? "ready" : "spent" })))),
        condition ? h("button", { type: "button", className: "focus-condition", onClick: () => onInfo(localConditionExplanation(game, player, condition)) }, h("small", null, "Local Condition"), h("strong", null, condition.name)) : null,
        globalEvent ? h("button", { type: "button", className: "focus-global-event", onClick: () => onInfo(globalEventExplanation(game)) }, h("small", null, "Global Event"), h("strong", null, globalEvent.name)) : null
    );
}

function GameHeader({ game, selectedPlayer, onInfo, onHome, onCards, onRules, onSave, onLoad, onToggleGuided }) {
    return h("header", { className: "game-header simplified-header" },
        h("button", { type: "button", className: "brand", onClick: onHome }, h("span", null, "☀"), "SUNPATHS"),
        h("div", { className: "generation-strip" }, h("strong", null, game.generation ? `Generation ${game.generation}/${game.config.rules.generations}` : "Pregame"), badge(getGameMode(game).level), badge(phaseLabel(game.phase))),
        h("nav", { className: "header-actions", "aria-label": "Game reference and save controls" },
            button("Cards", onCards, { kind: "ghost" }),
            button("Rules", onRules, { kind: "ghost" }),
            h("details", { className: "header-more" }, h("summary", null, "More"), h("div", null, button(`${game.gameMode === "beginner" && game.config.rules.generations === 4 ? gameText.beginner.setup.guideName : "New-concept tips"}: ${game.uiMode === "strategy" ? "Off" : "On"}`, onToggleGuided, { kind: "ghost" }), button("Save game", onSave, { kind: "ghost" }), h("label", { className: "button ghost file-button" }, "Load game", h("input", { type: "file", accept: ".json,application/json", onChange: onLoad }))))
        )
    );
}
function GameScreen({ game, setGame, onHome, onCards, onRules, onLoad, onTryIntermediate }) {
    const firstHumanId = Object.values(game.players).find(player => player.controller.kind === "human")?.id || Object.keys(game.players)[0];
    const [selectedId, setSelectedId] = useState(firstHumanId);
    const [expandedId, setExpandedId] = useState(null);
    const [resourceTransfer, setResourceTransfer] = useState(null);
    const [notice, setNotice] = useState("");
    const [feedback, setFeedback] = useState(null);
    const [lastDevelopmentEffect, setLastDevelopmentEffect] = useState(null);
    const [tradeMessage, setTradeMessage] = useState("");
    const [info, setInfo] = useState(null);
    const [gatherHelp, setGatherHelp] = useState(false);
    const [resourceFocus, setResourceFocus] = useState(null);
    const [gatherGuideStep, setGatherGuideStep] = useState(0);
    const [buildGuideOpenRequest, setBuildGuideOpenRequest] = useState(0);
    const [gatherMapRequest, setGatherMapRequest] = useState(0);
    const [beginnerBuildMenuOpen, setBeginnerBuildMenuOpen] = useState(false);
    const [firstBuiltTechnologyId, setFirstBuiltTechnologyId] = useState(null);
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
    const introFirstBuild = guidedMode && game.gameMode === "beginner"
        && game.config.rules.generations === 4 && game.generation === 1;
    const seen = game.uiHintsSeen ?? [];
    const welcomePending = introFirstBuild && game.phase === "generation.development"
        && !seen.includes("beginner:welcome") && !seen.includes("beginner:guide-skipped");
    const missionUsed = seen.includes("beginner:mission-used");
    const storedMission = missionStageFromHints(seen);
    const missionStage = game.gameMode === "beginner" && guidedMode && !seen.includes("beginner:guide-skipped")
        ? (game.phase === "generation.review" && game.generation === 1 && missionUsed && !seen.includes("beginner:mission-result-seen") ? "review" :
            game.phase === "generation.development" && game.generation === 1 ? storedMission : null)
        : null;
    const [tourProject, setTourProject] = useState("basicSolar");
    // Later Beginner chapters share the opening mission's in-world Next / Back / Skip
    // interaction. They never change the Generation 1 tour or energy simulation.
    const [chapterMissionStep, setChapterMissionStep] = useState(0);
    const [intermediateStep, setIntermediateStep] = useState(0);
    const [guidedSectionRequest, setGuidedSectionRequest] = useState(null);
    const sectionRequestId = React.useRef(0);
    useEffect(() => setChapterMissionStep(0), [game.generation]);
    // The Intermediate map and its Resources layer come before Local Conditions.
    // Once the real condition has been revealed, the mission resumes with its
    // remaining topics. Never stack a mission over the condition reveal modal.
    const intermediateTour = guidedMode && game.gameMode === "intermediate"
        && game.generation === 1
        && ((game.phase === "generation.localConditions" && intermediateStep < 2)
            || (game.phase === "generation.development" && lastConditionGeneration >= game.generation && conditionQueue.length === 0))
        && selected?.controller.kind === "human"
        && (game.phase !== "generation.development" || currentPlayer(game)?.id === selected.id)
        && !seen.includes("intermediate:tour-complete");
    const finishIntermediateTour = () => {
        const next = clone(game);
        next.uiHintsSeen = [...new Set([...(next.uiHintsSeen || []), "intermediate:tour-complete", "concept:1:generation.development"])];
        setGame(next);
        setGuidedSectionRequest({ section: null, nonce: ++sectionRequestId.current });
    };
    const goIntermediateStep = index => {
        if (index >= INTERMEDIATE_STEPS.length) { finishIntermediateTour(); return; }
        setIntermediateStep(index);
        if (index === 2 && game.phase === "generation.localConditions")
            command({ type: "drawLocalConditions" });
        setGuidedSectionRequest({ section: index === 4 ? "learn" : index === 5 ? "trade" : null, nonce: ++sectionRequestId.current });
    };
    const chapterMission = guidedMode && game.gameMode === "beginner"
        && game.config.rules.generations === 4 && game.phase === "generation.development"
        && (game.generation === 3 || game.generation === 4)
        && selected?.controller.kind === "human"
        && currentPlayer(game)?.id === selected.id
        && !seen.includes(`beginner:chapter-mission:${game.generation}`)
        && !missionStage && !welcomePending ? game.generation : null;
    const completeChapterMission = () => {
        const next = clone(game);
        next.uiHintsSeen = [...new Set([...(next.uiHintsSeen || []), `beginner:chapter-mission:${next.generation}`])];
        setGame(next);
    };
    const updateMission = (stage, extra=[]) => {
        const next = clone(game);
        next.uiHintsSeen = [...new Set([...(next.uiHintsSeen||[]).filter(id=>!id.startsWith("beginner:mission:")), ...extra, ...(stage ? [`beginner:mission:${stage}`] : [])])];
        setGame(next);
    };
    const onboarding = getOnboardingCue(game);
    const firstBuildCue = missionUsed || seen.includes("beginner:guide-skipped") ? null : getBeginnerFirstBuildCue(game, {menuOpen: beginnerBuildMenuOpen, builtId: firstBuiltTechnologyId});
    const introGather = guidedMode && !missionUsed && !seen.includes("beginner:guide-skipped") && game.gameMode === "beginner" && game.config.rules.generations === 4;
    const gatheringPlayer = currentPlayer(game);
    const gatherPossible = gatheringPlayer?.controller.kind === "human" && resourceKeys.some(resource => developmentActionLegality(game, gatheringPlayer.id, { kind: "extract", resource }).legal);
    const gathering = gameText.beginner.gatherGuide;
    const gatherCue = !missionStage && introGather && gatherGuideStep ? ({
        1: { id: "gather:map", title: gathering.mapTitle, body: gathering.mapBody, targetSelector: ".sp-map-controls__layers", stepLabel: gathering.step1 },
        2: { id: "gather:extract", title: gatherPossible ? gathering.extractTitle : gathering.noResourceTitle, body: gatherPossible ? gathering.extractBody : gathering.noResourceBody, targetSelector: gatherPossible ? '.sp-world-region.is-turn-active .sp-world-resource[data-sunpaths-extract="available"]' : ".sp-world-region.is-turn-active .sp-world-region__toggle", stepLabel: gathering.step2 },
        3: { id: "gather:received", title: gathering.receivedTitle, body: gathering.receivedBody, targetSelector: ".sp-world-warehouse", stepLabel: gathering.completed }
    })[gatherGuideStep] : null;
    // Once the in-world mission has taught the control, do not start the older
    // onboarding spotlight again. Its duplicate overlay could cover Turn Controls.
    const tutorialCue = welcomePending ? null : gatherCue || firstBuildCue
        || (guidedMode && game.gameMode === "beginner" && !missionUsed && !seen.includes("beginner:guide-skipped") ? onboarding : null);
    const nextTutorial = () => {
        if (gatherCue) {
            if (gatherGuideStep === 1) { setGatherGuideStep(2); return; }
            setGatherGuideStep(0);
            setGatherHelp(false);
            if (gatherGuideStep === 3 && game.phase === "generation.development" && currentPlayer(game)?.actionsRemaining > 0) {
                // Resource lesson completed: show the actual Build catalogue.
                const next = clone(game);
                next.uiHintsSeen = [...new Set([...(next.uiHintsSeen ?? []), "beginner:objective", "beginner:system", "beginner:open-build"])];
                setGame(next);
                setBuildGuideOpenRequest(value => value + 1);
                setBeginnerBuildMenuOpen(true);
            }
        } else if (firstBuildCue) {
            rememberTutorial(firstBuildCue.id);
            if (firstBuildCue.id === "beginner:open-build") {
                setBuildGuideOpenRequest(value => value + 1);
                setBeginnerBuildMenuOpen(true);
            }
        } else acknowledgeOnboarding();
    };
    const previousTutorial = () => {
        if (gatherGuideStep === 2) { setGatherGuideStep(1); return; }
        if (!firstBuildCue) return;
        const order = ["beginner:objective", "beginner:system", "beginner:open-build"];
        const previous = order[order.indexOf(firstBuildCue.id) - 1];
        if (!previous) return;
        const next = clone(game);
        next.uiHintsSeen = (next.uiHintsSeen ?? []).filter(id => id !== previous);
        setGame(next);
    };
    const tourNext = () => {
        if (missionStage === "review") { updateMission(null, ["beginner:mission-result-seen"]); return; }
        const index = MISSION_STAGES.indexOf(missionStage);
        const stage = MISSION_STAGES[index + 1] || null;
        updateMission(stage);
        if (stage === "pathways") guideToBuild();
        if (stage === "resources") { setExpandedId(currentPlayer(game)?.id); setBeginnerBuildMenuOpen(false); setGatherMapRequest(value=>value+1); }
    };
    const tourBack = () => {
        const stage = MISSION_STAGES[MISSION_STAGES.indexOf(missionStage)-1];
        if (!stage) return;
        updateMission(stage);
        if (stage === "pathways") guideToBuild();
    };
    const skipTutorial = () => {
        setGatherHelp(false);
        setGatherGuideStep(0);
        const next = clone(game);
        next.uiHintsSeen = [...new Set([...(next.uiHintsSeen || []).filter(id => !id.startsWith("beginner:mission:")), "beginner:guide-skipped"])];
        setGame(next);
    };
    const rememberTutorial = id => {
        const next = clone(game);
        next.uiHintsSeen = [...new Set([...(next.uiHintsSeen ?? []), id])];
        setGame(next);
    };
    const replayFirstBuildTutorial = () => {
        if (missionUsed) {
            const next = clone(game);
            next.uiHintsSeen = [...new Set([...(next.uiHintsSeen || []).filter(id => !id.startsWith("beginner:mission:") && id !== "beginner:guide-skipped"), "beginner:mission:plant"])];
            setTourProject("basicSolar");
            setGame(next);
            return;
        }
        const next = clone(game);
        const toClear = ["beginner:guide-skipped", "beginner:welcome", "beginner:objective", "beginner:system", "beginner:open-build", "beginner:build-catalogue", "beginner:build-completed"];
        next.uiHintsSeen = (next.uiHintsSeen ?? []).filter(id => !toClear.includes(id));
        setFirstBuiltTechnologyId(null);
        setBeginnerBuildMenuOpen(false);
        setGame(next);
    };
    const acknowledgeOnboarding = () => {
        if (!onboarding) return;
        const next = clone(game);
        next.uiHintsSeen = [...new Set([...(next.uiHintsSeen ?? []), onboarding.id])];
        setGame(next);
    };
    const pointToOnboardingTarget = () => {
        if (!onboarding) return;
        const target = globalThis.document?.querySelector(onboarding.targetSelector);
        if (target) {
            globalThis.document?.querySelectorAll(".sunpaths-tutorial-target").forEach(element => element.classList.remove("sunpaths-tutorial-target"));
            target.classList.add("sunpaths-tutorial-target");
            target.scrollIntoView?.({ behavior: "smooth", block: "center" });
        }
        acknowledgeOnboarding();
    };
    const guideToBuild = () => {
        setGatherHelp(false);
        setGatherGuideStep(0);
        setBuildGuideOpenRequest(value => value + 1);
        setBeginnerBuildMenuOpen(true);
        globalThis.setTimeout?.(() => globalThis.document?.querySelector('#sunpaths-build-intro')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 90);
    };
    const guideToGather = (resource = null) => {
        setResourceFocus(resource);
        if (chapterMission) completeChapterMission();
        const active = currentPlayer(game);
        if (!active || active.controller.kind !== "human") return;
        setExpandedId(active.id);
        setGatherMapRequest(value => value + 1);
        setGatherHelp(true);
        if (missionStage && missionStage !== "review") updateMission("resources");
        setGatherGuideStep(missionStage ? 0 : introGather ? 1 : 0);
        // Scroll after React has opened the Resources layer, not beforehand.
        globalThis.setTimeout?.(() => {
            const node = resource ? globalThis.document?.querySelector(`#sunpaths-resource-dock [data-sunpaths-resource="${resource}"]`) : null;
            (node || globalThis.document?.querySelector(".sp-world-map"))?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 110);
    };
    const mutate = (operation, runAi = true, successFeedback = null, feedbackAction = null) => {
        try {
            const next = clone(game);
            operation(next);
            advanceDirectOpening(next);
            if (runAi)
                pumpAi(next);
            const errors = invariantErrors(next);
            if (errors.length)
                throw new Error(errors.join("\n"));
            setGame(next);
            setNotice("");
            if (feedbackAction?.kind === "dispatch")
                setFeedback(describeDispatchEffect(game, next, feedbackAction.playerId, feedbackAction.plan));
            else if (feedbackAction) {
                const developmentEffect = describeDevelopmentEffect(game, next, feedbackAction.playerId, feedbackAction.action);
                setFeedback(developmentEffect);
                if (developmentEffect?.kind === 'developmentEffect') setLastDevelopmentEffect(developmentEffect);
            }
            else if (successFeedback)
                setFeedback(successFeedback);
            return true;
        }
        catch (e) {
            setNotice(e.message);
            return false;
        }
    };
    const command = (commandValue, successFeedback = null, feedbackAction = null) => mutate(next => applyCommand(next, commandValue), true, successFeedback, feedbackAction);
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
        const success = command({ type: "developmentAction", playerId: player.id, action }, null, { playerId: player.id, action });
        if (success && chapterMission) setGame(previous => ({...previous, uiHintsSeen:[...new Set([...(previous.uiHintsSeen||[]), `beginner:chapter-mission:${previous.generation}`])]}));
        if (success && action.kind === "build" && introFirstBuild && !seen.includes("beginner:build-completed") && !firstBuiltTechnologyId)
            setFirstBuiltTechnologyId(action.technologyId);
        if (success && missionStage && missionStage !== "ready" && missionStage !== "review") setGame(previous => ({...previous, uiHintsSeen:[...(previous.uiHintsSeen||[]).filter(id=>!id.startsWith("beginner:mission:")),"beginner:mission:ready"]}));
        return success;
    };
    // Convenience for the four-round introduction only. This uses the same
    // legal Pass command as the full game and does not mint extra actions.
    // AI moves are processed between passes, just as on the normal turn order.
    const finishDevelopment = () => {
        if (game.gameMode !== "beginner" || game.config.rules.generations !== 4) return false;
        const original = currentPlayer(game);
        if (!original || original.controller.kind !== "human" || game.phase !== "generation.development") return false;
        return mutate(next => {
            const remaining = original.actionsRemaining;
            for (let i = 0; i < remaining; i++) {
                const active = currentPlayer(next);
                if (next.phase !== "generation.development" || active?.id !== original.id || active.actionsRemaining <= 0)
                    throw new Error("Unable to finish the Development turn safely.");
                applyCommand(next, { type: "developmentAction", playerId: original.id, action: { kind: "pass" } });
                pumpAi(next);
            }
        }, false);
    };
    const extractFromMap = resource => {
        const player = currentPlayer(game);
        if (!player || player.controller.kind !== "human" || game.phase !== "generation.development") return false;
        const amount = gatherAmount(game, player, resource);
        const success = command({ type: "developmentAction", playerId: player.id, action: { kind: "extract", resource } }, null, { playerId: player.id, action: { kind: "extract", resource } });
        if (success) { if (chapterMission) setGame(previous => ({...previous, uiHintsSeen:[...new Set([...(previous.uiHintsSeen||[]), `beginner:chapter-mission:${previous.generation}`])]})); if (missionStage) setGame(previous => ({...previous, uiHintsSeen:[...(previous.uiHintsSeen||[]).filter(id=>!id.startsWith("beginner:mission:")),"beginner:mission:ready"]})); setGatherHelp(false); setGatherGuideStep(missionStage ? 0 : introGather && gatherGuideStep ? 3 : 0); setResourceTransfer({ id: `${Date.now()}-${resource}`, playerId: player.id, resource, amount }); }
        return success;
    };
    const toggleContinent = id => {
        setExpandedId(current => current === id ? null : id);
    };
    const dispatch = plan => { const player = currentPlayer(game); return command({ type: "dispatch", playerId: player.id, plan }, null, { kind: "dispatch", playerId: player.id, plan }); };
    const selectPrepared = (playerId, pathwayId, capabilityId) => command({ type: "selectPrepared", playerId, pathwayId, capabilityId });
    const save = () => download(`sunpaths-${game.seed}-g${game.generation}.json`, serializeGame(game));
    const toggleGuided = () => {
        const next = clone(game);
        next.uiMode = next.uiMode === "strategy" ? "guided" : "strategy";
        setGame(next);
    };
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
        const accepted = command({ type: "directTrade", aId: actor.id, bId: recipientId, aGives, bGives }, null, { playerId: actor.id, action: { kind: "directTrade" } });
        if (accepted) setTradeMessage(`${recipient.name} accepted. ${actor.name} used one Development action.`);
        return accepted;
    };
    const continueReview = () => mutate(next => {
        applyCommand(next, { type: "finishReview" });
        if (next.phase === "generation.advanceWeather")
            applyCommand(next, { type: "advanceWeather" });
        // The next four-round chapter starts with the Continue control in
        // Review, rather than a second redundant Start Generation click.
        const soloIntro = next.gameMode === "beginner" && next.config.rules.generations === 4
            && Object.values(next.players).filter(participant => participant.controller.kind === "human").length === 1;
        if (soloIntro && next.phase === "generation.start") {
            applyCommand(next, { type: "beginGeneration" });
            pumpAi(next);
        }
    }, false);
    let decision = null;
    if (game.phase.startsWith("setup."))
        decision = h(SetupProgress, { game, command: value => command(value), onSelect: selectPrepared });
    else if (game.phase === "generation.start") {
        const generation = game.generation || 1;
        const required = game.config.demand.reliabilityTargets[generation];
        const weatherLine = featureEnabled(game, "forecastVisible")
            ? `Current in Generation ${generation}: ${weatherLabels[game.weather.current]}. Forecast for Generation ${generation + 1}: ${game.weather.forecast ? weatherLabels[game.weather.forecast] : "none"}.`
            : `Current condition: ${weatherLabels[game.weather.current]}.`;
        decision = panel("A new Generation begins", h("div", { className: "generation-start-card" }, weatherLine ? h("p", null, weatherLine) : null, h("div", { className: "generation-start-goals" }, h("strong", null, `Required Light: ${required}.`)), button("Start Generation", () => command({ type: "beginGeneration" }), { kind: "primary large" })));
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
        decision = active?.controller.kind === "human" ? h(DevelopmentControls, { game, player: active, onAction: act, onFinishDevelopment: finishDevelopment, onUndo: () => { if (command({ type: "undo", playerId: active.id })) { setFeedback(null); setFirstBuiltTechnologyId(null); setBeginnerBuildMenuOpen(false); } }, canUndo: humanUndoTarget(game, active.id) !== null, onReset: () => { if (command({ type: "resetGeneration" })) { setFeedback(null); setFirstBuiltTechnologyId(null); setBeginnerBuildMenuOpen(false); } }, onTrade: trade, tradeMessage, onInfo: setInfo, onGather: guideToGather, effect: feedback, onDismissEffect: () => setFeedback(null), onBuildMenuOpened: value => {
            setBeginnerBuildMenuOpen(value);
            if (value && firstBuildCue?.id === "beginner:open-build") rememberTutorial("beginner:open-build");
        }, onReplayBeginnerBuildPrompt: replayFirstBuildTutorial, buildGuideOpenRequest, guidedSectionRequest }) : panel("Computer players are thinking", h("p", null, "Their legal actions are being resolved. Your turn will appear automatically."));
    }
    else if (game.phase === "generation.dispatch") {
        const active = currentPlayer(game);
        decision = active?.controller.kind === "human" ? h(DispatchPanel, { game, player: active, onDispatch: dispatch, onInfo: setInfo }) : panel("Computer players are using their Energy", h("p", null, "Your Energy plan will appear when they finish."));
    }
    else if (game.phase === "generation.review")
        decision = h(ReviewScreen, { game, effect: feedback, developmentEffect: lastDevelopmentEffect, onContinue: continueReview });
    else if (game.phase === "game.complete")
        decision = h(ResultsScreen, { game, onRestart: onHome, onTryIntermediate });
    const visibleMarket = game.innovationMarket.visible.filter(id => modeAllowsTechnology(game, getTechnology(game, id)));
    const market = visibleMarket.length
        ? panel("Advanced technology market", h("div", { className: "market-list" }, ...visibleMarket.map(id => {
            const tech = getTechnology(game, id);
            return h("button", { type: "button", key: id, className: "market-mini-card", onClick: () => setInfo(technologyExplanation(game, selected, tech)) }, h("strong", null, tech.name), h("small", null, (() => { const cost = effectiveBuildCost(game, selected, tech); return `${cost.constructionMaterials} Other · ${cost.criticalMaterials} Critical${featureEnabled(game, "knowledgeRequirements") ? ` · Knowledge ${cost.knowledgeRequired}` : ""}`; })()));
        })), "nested")
        : panel("Technology ladder", h("div", { className: "prose" }, h("p", null, featureEnabled(game, "knowledgeRequirements") ? (getGameMode(game).id === "master" ? "Knowledge 1 Basic → Knowledge 3 Upgrade → Knowledge 5 Advanced." : "This mode uses Basic and Intermediate technologies, with Smart Grid Expansion as its final Grid upgrade.") : "Build Basic and Intermediate technologies directly."), h("p", { className: "muted" }, "An upgrade replaces the previous tier instead of adding another copy.")), "nested");
    const events = panel("Recent events", h("div", { className: "event-log" }, ...game.log.slice(-8).reverse().map(event => h("p", { key: event.sequence }, h("small", null, `#${event.sequence}`), event.message))), "nested");
    const body = game.phase === "game.complete"
        ? decision
        : h("main", { className: `game-main phase6 ${guidedMode ? "guided" : "strategy"} ${game.phase === "generation.development" ? "phase-development" : ""} ${game.gameMode === "beginner" && game.config.rules.generations === 4 ? "beginner-intro" : ""}` },
            h("div", { className: "game-left" },
                game.gameMode === "master" && gatherHelp && (!introGather || !gatherCue) && game.phase === "generation.development" ? h("div", { className: "map-gather-guide", role: "status" }, h("div", null, h("strong", null, "Gather resources on your continent"), h("p", null, "Select a resource icon on the expanded map marker.")), button("Close", () => setGatherHelp(false), { kind: "ghost compact" })) : null,
                h(WorldMap, { game, expandedId, onToggle: toggleContinent, onExtract: extractFromMap, onBlocked: setNotice, transfer: resourceTransfer, viewerId: firstHumanId, warehousePlayerId: selected.id, gatherGuidePlayerId: gatherHelp ? currentPlayer(game)?.id : null, gatherMapRequest, resourceFocus, missionView: intermediateTour && intermediateStep <= 1 ? (intermediateStep === 1 ? "resources" : "built") : missionStage === "plant" ? "plant" : missionStage === "resources" ? "resources" : missionStage === "review" ? "results" : null }),
                h(PlayerBoard, { game, player: selected, onInfo: setInfo })
            ),
            h("aside", { className: "game-right" },
                guidedMode && game.gameMode === "beginner" && game.config.rules.generations === 4
                    && selected?.controller.kind === "human"
                    && !welcomePending && !missionStage
                    && game.generation === 1 ? h(BeginnerChapterCoach, { game, player: selected, onGather: guideToGather, onBuild: guideToBuild }) : null,
                game.gameMode === "master" && !tutorialCue && onboarding && (game.phase === "generation.review" || currentPlayer(game)?.controller.kind === "human") ? h("section", { className: "sunpaths-story-cue", role: "note", "aria-label": onboarding.category },
                    h("small", { className: "eyebrow" }, onboarding.category),
                    h("h3", null, onboarding.title),
                    h("p", null, onboarding.body),
                    h("div", { className: "form-row" },
                        button(`Show ${onboarding.targetLabel} →`, pointToOnboardingTarget, { kind: "secondary compact" }),
                        button("Got it", acknowledgeOnboarding, { kind: "ghost compact" })
                    )
                ) : null,
                decision,
                guidedMode ? h("details", { className: "more-game-info" }, h("summary", null, "More game information"), (game.gameMode === "beginner" && game.config.rules.generations === 4) ? null : market, events) : h(React.Fragment, null, market, events),
                game.debugMode ? h(React.Fragment, null, h(AiDebugPanel, { game }), h(DebugDrawer, { game })) : null
            )
        );
    const revealPlayer = conditionQueue.length ? game.players[conditionQueue[0]] : null;
    return h("div", { className: "game-shell phase6-shell" },
        h(GameHeader, { game, selectedPlayer: selected, onInfo: setInfo, onHome, onCards, onRules, onSave: save, onLoad, onToggleGuided: toggleGuided }),
        game.phase !== "game.complete" ? h(FocusStrip, { game, player: selected, onInfo: setInfo }) : null,
        notice ? h("div", { className: "notice error" }, h("strong", null, "That action was not taken."), h("span", null, notice), button("Dismiss", () => setNotice(""), { kind: "ghost" })) : null,
        game.gameMode === "master" && feedback?.kind === "developmentEffect" && game.phase !== "generation.development" ? h(ActionConsequence, { feedback, onDismiss: () => setFeedback(null) }) : null,
        feedback && feedback.kind !== "developmentEffect" && game.phase === "generation.development" ? h("section", { className: "system-feedback compact-feedback", "aria-live": "polite" },
            h("strong", null, feedback.title),
            feedback.metrics?.length ? h("div", { className: "feedback-metrics" }, ...feedback.metrics.slice(0, 2).map(metric => h("span", { key: metric.label }, h("small", null, metric.label), h("b", null, `${metric.before}${metric.unit} → ${metric.after}${metric.unit}`)))) : null,
            h("details", null, h("summary", null, "Why?"), h("p", null, feedback.summary), feedback.prompt ? h("p", null, feedback.prompt) : null),
            button("×", () => setFeedback(null), { kind: "ghost compact" })
        ) : null,
        body,
        intermediateTour ? h(IntermediateTour, { step: intermediateStep,
            onNext: () => goIntermediateStep(intermediateStep + 1),
            onBack: () => goIntermediateStep(Math.max(0, intermediateStep - 1)),
            onSkip: finishIntermediateTour }) : null,
        chapterMission ? h(ChapterMissionTour, { generation:chapterMission, step:chapterMissionStep, player:selected,
            onNext:() => { if (chapterMissionStep === 0) { setChapterMissionStep(1); guideToBuild(); } else completeChapterMission(); },
            onBack:() => setChapterMissionStep(0), onSkip:completeChapterMission }) : null,
        missionStage && !welcomePending ? h(MissionTour, { stage:missionStage, game, player:selected, selectedProject:tourProject,
            onSelectProject:setTourProject, onNext:tourNext, onBack:tourBack,
            onSkip:missionStage === "review" ? () => updateMission(null,["beginner:mission-result-seen"]) : skipTutorial,
            onExploreBuild:guideToBuild, onExploreGather:guideToGather }) : null,
        tutorialCue && !missionStage && !chapterMission ? h(TutorialSpotlight, { cue: tutorialCue, onNext: nextTutorial, onPrevious: previousTutorial, onSkip: skipTutorial, canGoBack: gatherGuideStep === 2 || ["beginner:system", "beginner:open-build"].includes(firstBuildCue?.id) }) : null,
        welcomePending ? h(BeginnerWelcome, { player: selected, onStart: () => {
            const next = clone(game);
            next.uiHintsSeen = [...new Set([...(next.uiHintsSeen ?? []), "beginner:welcome", "beginner:mission-used", "beginner:mission:plant"])];
            setGame(next);
        }, onSkip: () => rememberTutorial("beginner:guide-skipped") }) : null,
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
export { BuildShop, ActionConsequence, GameScreen, PlayerBoard, DevelopmentControls, DispatchPanel, ReviewScreen, ResultsScreen, AiDebugPanel, DebugDrawer };

