// @ts-nocheck
import { uiShared } from "./uiShared.js?v=a5.25.0";
import { WeatherCard } from "./uiSetup.js?v=a5.25.0";
const { React, useEffect, useMemo, useRef, useState, createRoot, defaultConfig, validateConfig, createGame, applyCommand, currentOrder, currentPlayerId, canCompleteFoundingProject, foundingProjectDefinition, describeCostModifiers, getContinentProfile, getKnowledgeRequirement, getLightingLevel, getPathwayAffinity, getTransmissionLevel, invariantErrors, getTechnology, pathways, totalEnergy, totalLoss, warehouseTotal, hasRelevantSystem, aiPrepared, chooseDevelopmentDecision, chooseDispatchPlan, pumpAi, deserializeGame, serializeGame, defaultSimulationScenario, technologyDataSets, aggregateReportToCsv, balanceFlagsToCsv, playerResultsToCsv, simulationReportToJson, buildLegality, conditionImpactPreview, developmentActionLegality, effectiveBuildCost, importLegality, previewDispatch, systemGuidance, systemSnapshot, technologyImpactPreview, h, continentIcons, weatherLabels, resourceLabels, pathwayLabels, capabilityLabels, affinityLabels, abilityDescriptions, penaltyDescriptions, strategyLabels, strategies, resourceKeys, resourceDescriptions, stageDescriptions, weatherDescriptions, newRandomSeed, localConditionExplanation, weatherExplanation, technologyExplanation, resourceExplanation, scoringExplanation, gameModes, clone, number, titleCase, sumLoss, phaseLabel, currentPlayer, conditionDefinition, button, panel, infoButton, InfoModal, ConfirmationModal, ConditionReveal, friendlyActionName, learningCostPreview, actionConfirmation, stat, badge, meter, energyCubes, download, makeParticipants } = uiShared;
function CardsScreen({ config, game, onBack }) {
    const sourceConfig = game?.config ?? config;
    const uniqueConditions = Array.from(new Map(sourceConfig.localConditions.map(card => [card.id, card])).values());
    const globalEvents = sourceConfig.globalEvents ?? [];
    const activeByPlayer = game ? Object.values(game.players).map(player => {
        const definition = player.localCondition ? sourceConfig.localConditions.find(card => card.id === player.localCondition.definitionId) : null;
        return definition ? `${player.name}: ${definition.name}` : null;
    }).filter(Boolean) : [];
    const activeGlobal = game?.globalEvents?.activeDefinitionId ? globalEvents.find(event => event.id === game.globalEvents.activeDefinitionId) : null;
    return h("main", { className: "page cards-page" }, h("header", { className: "page-header" }, h("div", null, h("p", { className: "eyebrow" }, "Cards"), h("h1", null, "Weather, Local Conditions and Global Events")), button("Back", onBack, { kind: "ghost" })), h("div", { className: "current-card-strip" }, h(WeatherCard, { label: "Current weather", face: game?.weather.current }), h(WeatherCard, { label: "Public forecast", face: game?.weather.forecast }), activeGlobal ? panel("Current Global Event", h("strong", null, activeGlobal.name), "nested") : panel("Current Global Event", h("p", { className: "muted" }, "None this Generation."), "nested"), activeByPlayer.length ? panel("Current Local Conditions", h("div", { className: "prose" }, ...activeByPlayer.map(text => h("p", { key: text }, text))), "nested") : panel("Current Local Conditions", h("p", { className: "muted" }, "No Local Conditions have been revealed yet."), "nested")), h("p", { className: "cards-note" }, "Local Conditions affect one region. One Global Event is revealed for everyone before Development in Generations 3, 5 and 7."), h("h2", null, "Local Conditions"), h("div", { className: "condition-card-grid" }, ...uniqueConditions.map(card => {
        const effect = card.effect;
        const effectText = effect.kind === "hydroDelta" ? `Hydro ${effect.amount >= 0 ? "+" : ""}${effect.amount}` : effect.kind === "windDelta" ? `Wind ${effect.amount >= 0 ? "+" : ""}${effect.amount}` : effect.kind === "solarDelta" ? `Solar ${effect.amount >= 0 ? "+" : ""}${effect.amount}` : effect.kind === "biomassRegrowthDelta" ? `Biomass regrowth ${effect.amount >= 0 ? "+" : ""}${effect.amount}` : effect.kind === "biomassRegrowthSet" ? `Biomass regrowth becomes ${effect.value}` : effect.kind === "gridCapacityDelta" ? `Transmission capacity ${effect.amount}` : effect.kind === "firstFuelPlantOutputDelta" ? `First fuel plant ${effect.amount} Energy` : effect.kind === "firstBuildConstructionDelta" ? `First Build +${effect.amount} Other Material` : effect.kind === "storageRecoveryBonus" ? `Battery recovery +${effect.amount}` : effect.kind === "temporaryKnowledge" ? `Temporary Knowledge +${effect.amount}` : effect.kind === "demandTargetDelta" ? `Light need +${effect.amount}` : "Temporary system effect";
        return h("article", { key: card.id, className: "condition-library-card" }, h("p", { className: "eyebrow" }, effect.adaptable ? "Adaptable" : "Automatic"), h("h3", null, card.name), h("strong", null, effectText), h("p", null, "Applies for one Generation."));
    })), h("h2", null, "Global Events"), h("div", { className: "condition-card-grid" }, ...globalEvents.map(event => {
        const effect = event.effect;
        const effectText = effect.kind === "tradeShutdown" ? "Trade and World Market paused" : effect.kind === "worldMarketResourceBlocked" ? `${resourceLabels[effect.resource]} unavailable on World Market` : effect.kind === "extractionYieldCap" ? `${resourceLabels[effect.resource]} extraction capped at ${effect.maximumYield}` : effect.kind === "firstBuildResourceDelta" ? `First Build +${effect.amount} Other Material` : effect.kind === "worldMarketRateOverride" ? `${resourceLabels[effect.resource]} market rate ${effect.rate}:1` : effect.kind === "harvestFailure" ? "No Biomass market imports or regrowth" : effect.kind === "firstBiomassOutputDelta" ? `First Biomass operation ${effect.amount} Energy` : effect.kind === "firstWorldMarketRate" ? `First market exchange ${effect.rate}:1` : "Temporary worldwide effect";
        return h("article", { key: event.id, className: "condition-library-card global" }, h("p", { className: "eyebrow" }, "All players"), h("h3", null, event.name), h("strong", null, effectText), h("p", null, "Active for one Generation only."));
    })));
}
function RulesScreen({ config, setConfig, onBack }) {
    const [draft, setDraft] = useState(JSON.stringify(config, null, 2));
    const [message, setMessage] = useState("");
    const apply = () => {
        try {
            const parsed = JSON.parse(draft);
            const errors = validateConfig(parsed);
            if (errors.length)
                throw new Error(errors.join("\n"));
            setConfig(parsed);
            setMessage("Configuration validated. It will apply to new games only.");
        }
        catch (e) {
            setMessage(e.message);
        }
    };
    const demands = [1, 1, 2, 2, 3, 3, 4, 4];
    const pathwayGuide = [
        ["☀", "Solar", "Capture sunlight"],
        ["≋", "Wind", "Use moving air"],
        ["💧", "Hydro", "Harness and store water"],
        ["🌿", "Biomass", "Manage renewable fuel"],
        ["⛽", "Fossil", "Use finite fuel reliably"]
    ];
    const modes = [gameModes.beginner, gameModes.intermediate, gameModes.master];
    return h("main", { className: "page rules-page how-to-page" },
        h("header", { className: "page-header how-to-header" },
            h("div", null,
                h("p", { className: "eyebrow" }, "SUNPATHS rulebook"),
                h("h1", null, "How to Play"),
                h("p", { className: "lead compact" }, "Build an energy system that keeps the lights on across eight Generations.")),
            button("← Back", onBack, { kind: "ghost" })
        ),
        h("nav", { className: "rulebook-nav", "aria-label": "How to Play sections" },
            h("a", { href: "#mission" }, "Mission"),
            h("a", { href: "#develop" }, "Develop"),
            h("a", { href: "#deliver" }, "Deliver Light"),
            h("a", { href: "#score" }, "Score"),
            h("a", { href: "#modes" }, "Game modes")
        ),
        h("section", { id: "mission", className: "rulebook-hero" },
            h("div", { className: "rulebook-hero-copy" },
                h("p", { className: "eyebrow" }, "Your mission"),
                h("h2", null, "Keep the lights on"),
                h("p", null, "Choose a continent, build its energy system and deliver enough usable Light to meet rising demand. Each continent has different opportunities, resources and constraints."),
                h("p", null, "A blackout does not eliminate you. You earn no Reliability Points for that Generation, then continue developing your system for the next one.")
            ),
            h("div", { className: "demand-journey", "aria-label": "Light demand across eight Generations" },
                h("div", { className: "demand-journey-title" }, h("strong", null, "Demand rises over time"), h("span", null, "Required Light")),
                h("ol", null, ...demands.map((demand, index) => h("li", { key: index, className: index >= 4 ? "bonus-era" : "" },
                    h("small", null, `GEN ${index + 1}`),
                    h("strong", null, demand),
                    h("span", { "aria-label": `${demand} Light` }, "💡".repeat(demand))
                )))
            )
        ),
        h("section", { className: "rulebook-section" },
            h("div", { className: "rulebook-section-heading" }, h("span", null, "1"), h("div", null, h("p", { className: "eyebrow" }, "Choose"), h("h2", null, "Select a continent and starting pathway"))),
            h("p", { className: "rulebook-intro" }, "Your continent changes the conditions you work within; it does not lock you into one technology. Begin with one pathway, then specialize deeply or diversify your portfolio as the game develops."),
            h("div", { className: "pathway-guide", "aria-label": "Five energy pathways" }, ...pathwayGuide.map(([icon, title, text]) => h("article", { key: title }, h("span", { "aria-hidden": "true" }, icon), h("strong", null, title), h("small", null, text))))
        ),
        h("section", { id: "develop", className: "rulebook-section" },
            h("div", { className: "rulebook-section-heading" }, h("span", null, "2"), h("div", null, h("p", { className: "eyebrow" }, "Develop"), h("h2", null, "Spend three Development Actions"))),
            h("p", { className: "rulebook-intro" }, "Every Generation gives you three actions. Use them to obtain resources, develop Knowledge and build or upgrade your energy system. You choose the order—and every action spent preparing is an action you cannot spend elsewhere."),
            h("div", { className: "action-cards" },
                h("article", null, h("span", null, "⛏"), h("div", null, h("h3", null, "Extract or access resources"), h("p", null, "Obtain the materials or fuel your plans require. Trade and the World Market become available in later modes."))),
                h("article", null, h("span", null, "✦"), h("div", null, h("h3", null, "Learn"), h("p", null, "Knowledge is permanent. It unlocks higher technology tiers for that player."))),
                h("article", null, h("span", null, "⚙"), h("div", null, h("h3", null, "Build or upgrade"), h("p", null, "Install generation, storage, Grid and Lighting technologies when you can meet their requirements.")))
            ),
            h("div", { className: "knowledge-layout" },
                h("div", { className: "technology-ladder" },
                    h("h3", null, "Technology ladder"),
                    h("div", null, h("span", null, "1"), h("p", null, h("strong", null, "Basic"), h("small", null, "Knowledge 1"))),
                    h("b", null, "→"),
                    h("div", null, h("span", null, "3"), h("p", null, h("strong", null, "Upgrade"), h("small", null, "Knowledge 3"))),
                    h("b", null, "→"),
                    h("div", null, h("span", null, "5"), h("p", null, h("strong", null, "Advanced"), h("small", null, "Knowledge 5")))
                ),
                h("aside", null, h("strong", null, "Remember"), h("p", null, "Resources are spent when used. Knowledge remains unlocked for the rest of the game. Beginner removes Knowledge requirements. Most Advanced technologies appear only in Master; Smart Grid Expansion is the universal exception so five Lights remain possible in every mode."))
            )
        ),
        h("section", { id: "deliver", className: "rulebook-section infographic-section" },
            h("div", { className: "rulebook-section-heading" }, h("span", null, "3"), h("div", null, h("p", { className: "eyebrow" }, "Operate"), h("h2", null, "Turn development into reliable Light"))),
            h("p", { className: "rulebook-intro" }, "After Development, operate the system you built. Follow the icons: Source Energy becomes Electricity, and Electricity used by Lighting supplies Lights."),
            h("figure", { className: "system-flow" },
                h("div", { className: "flow-node main" }, h("span", null, "◉"), h("strong", null, "Source Energy"), h("small", null, "Normalised input")),
                h("b", { className: "flow-arrow", "aria-hidden": "true" }, "→"),
                h("div", { className: "flow-node" }, h("span", null, "⚡"), h("strong", null, "Electricity"), h("small", null, "After generation losses")),
                h("b", { className: "flow-arrow", "aria-hidden": "true" }, "→"),
                h("div", { className: "flow-node" }, h("span", null, "⚡"), h("strong", null, "Grid"), h("small", null, "Electricity transported")),
                h("b", { className: "flow-arrow", "aria-hidden": "true" }, "→"),
                h("div", { className: "flow-node light" }, h("span", null, "💡"), h("strong", null, "Lights supplied"), h("small", null, "Compare with demand")),
                h("figcaption", null, h("span", null, "♨  ◌"), h("p", null, h("strong", null, "Losses branch away from the flow."), " ♨ is Energy lost as heat. ◌ is Fuel-supply or other counted loss; unused Electricity is tracked separately."))
            ),
            h("div", { className: "loss-legend", "aria-label": "Energy flow icon legend" },
                h("article", null, h("span", null, "◉"), h("strong", null, "Source Energy"), h("small", null, "A normalised game input; for fuels this is chemical energy.")),
                h("article", null, h("span", null, "⚡"), h("strong", null, "Electricity"), h("small", null, "What generation, storage and the Grid make available.")),
                h("article", null, h("span", null, "💡"), h("strong", null, "Lights supplied"), h("small", null, "The useful service scored against demand.")),
                h("article", null, h("span", null, "♨"), h("strong", null, "Heat loss"), h("small", null, "Energy that does not become useful Electricity or Light."))
            ),
            h("div", { className: "starting-balance-infographic" },
                h("div", { className: "winner-flow-title" }, h("p", { className: "eyebrow" }, "Equal starting ceiling"), h("h3", null, "Every Basic pathway ends at 1 Light")),
                h("p", null, "A Basic pathway may make different amounts of Electricity, but Basic Lighting supplies no more than 1 Light from the 1 or 2 Electricity a single starting pathway can provide."),
                h("div", { className: "pathway-guide", "aria-label": "Basic pathway starting outputs" },
                    h("article", null, h("span", null, "☀"), h("strong", null, "Solar"), h("small", null, "up to 2 ⚡ → 1 💡")),
                    h("article", null, h("span", null, "≋"), h("strong", null, "Wind"), h("small", null, "up to 2 ⚡ → 1 💡")),
                    h("article", null, h("span", null, "💧"), h("strong", null, "Hydro"), h("small", null, "1 ⚡ normally; 2 when wet → 1 💡")),
                    h("article", null, h("span", null, "🌿"), h("strong", null, "Biomass"), h("small", null, "4 ◉ → 2 ⚡ + 2 ♨ → 1 💡")),
                    h("article", null, h("span", null, "⛽"), h("strong", null, "Fossil"), h("small", null, "4 ◉ → 2 ⚡ + 2 losses → 1 💡"))
                )
            ),
            h("div", { className: "five-light-infographic" },
                h("div", { className: "winner-flow-title" }, h("p", { className: "eyebrow" }, "Available in every game mode"), h("h3", null, "The route to 5 Lights")),
                h("div", { className: "technology-ladder" },
                    h("div", null, h("span", null, "5⚡"), h("p", null, h("strong", null, "5 Electricity"), h("small", null, "Combine or upgrade pathways"))),
                    h("b", null, "→"),
                    h("div", null, h("span", null, "⌁"), h("p", null, h("strong", null, "Smart Grid Expansion"), h("small", null, "Knowledge 5 · capacity 5"))),
                    h("b", null, "→"),
                    h("div", null, h("span", null, "LED"), h("p", null, h("strong", null, "LED Lighting"), h("small", null, "1 Electricity → 1 Light"))),
                    h("b", null, "→"),
                    h("div", null, h("span", null, "5💡"), h("p", null, h("strong", null, "5 Lights supplied"), h("small", null, "No energy bonus is invented")))
                ),
                h("p", { className: "muted" }, "Smart Grid Expansion requires Knowledge 5 in Intermediate and Master. Beginner has no Learn action, so it uses the same physical technology chain without a Knowledge gate. LED Lighting is capped at 4 Lights until the expansion is installed.")
            ),
            h("div", { className: "starting-balance-infographic loss-ledger-infographic" },
                h("div", { className: "winner-flow-title" }, h("p", { className: "eyebrow" }, "Visible throughout the game"), h("h3", null, "The Loss Ledger always adds up")),
                h("p", null, "System Loss is the sum of Fuel-supply loss, generation heat, storage heat, lighting heat and other counted loss. Unused or curtailed Electricity has its own total and is not part of the least-loss tiebreaker."),
                h("div", { className: "technology-ladder" },
                    h("div", null, h("span", null, "◌"), h("p", null, h("strong", null, "Fuel supply"), h("small", null, "Before generation"))),
                    h("b", null, "+"),
                    h("div", null, h("span", null, "♨"), h("p", null, h("strong", null, "Heat losses"), h("small", null, "Generation + storage + lighting"))),
                    h("b", null, "+"),
                    h("div", null, h("span", null, "◌"), h("p", null, h("strong", null, "Other loss"), h("small", null, "Counted disruptions"))),
                    h("b", null, "="),
                    h("div", null, h("span", null, "Σ"), h("p", null, h("strong", null, "System Loss"), h("small", null, "Cumulative tiebreaker")))
                )
            )
        ),
        h("section", { id: "score", className: "rulebook-section scoring-section" },
            h("div", { className: "rulebook-section-heading" }, h("span", null, "4"), h("div", null, h("p", { className: "eyebrow" }, "Score"), h("h2", null, "Earn Reliability Points"))),
            h("p", { className: "rulebook-intro" }, "Reliability Points are the main score in every Generation. Later Generations reward systems that can do more than merely meet demand."),
            h("div", { className: "reliability-scorecard" },
                h("article", null,
                    h("header", null, h("small", null, "GENERATIONS"), h("strong", null, "1–4")),
                    h("div", { className: "score-outcomes two" },
                        h("div", { className: "miss" }, h("span", null, "Below demand"), h("b", null, "0"), h("small", null, "points")),
                        h("div", { className: "meet" }, h("span", null, "Meet or exceed"), h("b", null, "1"), h("small", null, "point"))
                    )
                ),
                h("article", { className: "late-generations" },
                    h("header", null, h("small", null, "GENERATIONS"), h("strong", null, "5–8")),
                    h("div", { className: "score-outcomes" },
                        h("div", { className: "miss" }, h("span", null, "Below demand"), h("b", null, "0"), h("small", null, "points")),
                        h("div", { className: "meet" }, h("span", null, "Meet demand"), h("b", null, "1"), h("small", null, "point")),
                        h("div", { className: "exceed" }, h("span", null, "Exceed demand"), h("b", null, "2"), h("small", null, "points"))
                    )
                )
            ),
            h("div", { className: "winner-flow" },
                h("div", { className: "winner-flow-title" }, h("p", { className: "eyebrow" }, "How the winner is decided"), h("h3", null, "Reliability first. Efficiency breaks close ties.")),
                h("ol", null,
                    h("li", { className: "primary" }, h("span", null, "1"), h("div", null, h("strong", null, "Most Reliability Points"), h("small", null, "Primary winning condition"))),
                    h("li", null, h("span", null, "2"), h("div", null, h("strong", null, "Most Total Light"), h("small", null, "First tiebreaker"))),
                    h("li", { className: "efficiency" }, h("span", null, "3"), h("div", null, h("strong", null, "Least absolute System Loss"), h("small", null, "Rewards the system that wasted the least Energy"))),
                    h("li", null, h("span", null, "4"), h("div", null, h("strong", null, "Most recoverable stored Energy"), h("small", null, "Final tiebreaker")))
                )
            )
        ),
        h("section", { id: "modes", className: "rulebook-section" },
            h("div", { className: "rulebook-section-heading" }, h("span", null, "5"), h("div", null, h("p", { className: "eyebrow" }, "Choose your challenge"), h("h2", null, "Three ways to play"))),
            h("p", { className: "rulebook-intro" }, "All three modes use the same eight-Generation mission and scoring. Each new mode keeps what you learned and adds another layer of the energy transition."),
            h("div", { className: "rulebook-mode-grid" }, ...modes.map((mode, index) => h("article", { key: mode.id, className: `rulebook-mode mode-${mode.id}` },
                h("header", null, h("span", null, index + 1), h("div", null, h("p", { className: "eyebrow" }, mode.level), h("h3", null, mode.label))),
                h("strong", null, mode.learningGoal),
                h("p", null, mode.description),
                h("small", null, "IN THIS MODE"),
                h("ul", null, ...mode.includes.map(item => h("li", { key: item }, item))),
                h("em", null, mode.recommendedFor)
            )))
        ),
        h("section", { className: "sunpaths-principle" }, h("span", null, "☀"), h("div", null, h("p", { className: "eyebrow" }, "The SUNPATHS principle"), h("h2", null, "Resources create opportunities. Knowledge unlocks technology. Development builds the system. Reliability determines its success."))),
        h("details", { className: "advanced-rules" },
            h("summary", null, "Advanced rules and data"),
            h("div", { className: "advanced-rules-content" },
                panel("Weather faces", h("div", { className: "weather-list" }, ...config.weather.faces.map((face, i) => h(WeatherCard, { key: `${face}-${i}`, label: `Face ${i + 1}`, face })))),
                panel("Developer configuration editor", h("div", null,
                    h("p", null, "Edits apply to new games. Active games retain their configuration snapshot."),
                    h("textarea", { className: "json-editor", value: draft, onChange: e => setDraft(e.target.value), spellCheck: false }),
                    message ? h("p", { className: message.startsWith("Configuration") ? "success" : "error" }, message) : null,
                    h("div", { className: "form-row compact" },
                        button("Validate and use", apply, { kind: "primary" }),
                        button("Restore defaults", () => { setDraft(JSON.stringify(defaultConfig, null, 2)); setMessage(""); }, { kind: "ghost" }),
                        button("Export JSON", () => download("sunpaths-config.json", draft), { kind: "secondary" })
                    )
                ))
            )
        ),
        h("div", { className: "rulebook-footer" }, button("← Back to SUNPATHS", onBack, { kind: "primary large" }))
    );
}
function SimulationBar({ value, maximum = 1 }) {
    const width = maximum > 0 ? Math.max(2, Math.min(100, value / maximum * 100)) : 0;
    return h("div", { className: "simulation-bar" }, h("i", { style: { width: `${width}%` } }));
}
function SimulationAggregateTable({ title, rows }) {
    const maximum = Math.max(1, ...rows.map(row => row.light.mean));
    return panel(title, h("div", { className: "simulation-table" }, h("div", { className: "simulation-row header" }, h("span", null, "Entity"), h("span", null, "Mean Light"), h("span", null, "Win rate"), h("span", null, "Reliability points"), h("span", null, "Loss")), ...rows.map(row => h("div", { key: row.id, className: "simulation-row" }, h("strong", null, titleCase(row.id)), h("span", null, row.light.mean.toFixed(2), h(SimulationBar, { value: row.light.mean, maximum })), h("span", null, `${(row.winRate * 100).toFixed(1)}%`), h("span", null, row.reliabilityMean.toFixed(2)), h("span", null, row.systemLossMean.toFixed(2))))));
}
function SimulationLab({ config, onBack }) {
    const [scenario, setScenario] = useState(() => defaultSimulationScenario(config));
    const [report, setReport] = useState(null);
    const [comparison, setComparison] = useState(null);
    const [progress, setProgress] = useState({ completed: 0, total: scenario.games, fraction: 0 });
    const [running, setRunning] = useState(false);
    const [message, setMessage] = useState("");
    const workerRef = useRef(null);
    useEffect(() => () => workerRef.current?.terminate(), []);
    const update = patch => setScenario(current => ({ ...current, ...patch }));
    const updateAssignment = (index, strategyId) => update({ assignments: scenario.assignments.map((item, i) => i === index ? { ...item, strategyId } : item) });
    const run = (mode = "run") => {
        workerRef.current?.terminate();
        setRunning(true);
        setReport(null);
        setComparison(null);
        setMessage("");
        setProgress({ completed: 0, total: mode === "tradeComparison" ? scenario.games * 3 : scenario.games, fraction: 0 });
        const worker = new Worker(new URL("./simulationWorker.js", import.meta.url), { type: "module" });
        workerRef.current = worker;
        worker.onmessage = event => {
            if (event.data.type === "progress")
                setProgress(event.data.progress);
            if (event.data.type === "complete") {
                setReport(event.data.report);
                setRunning(false);
                worker.terminate();
                workerRef.current = null;
            }
            if (event.data.type === "comparisonComplete") {
                setComparison(event.data.comparison);
                setRunning(false);
                worker.terminate();
                workerRef.current = null;
            }
            if (event.data.type === "error") {
                setMessage(event.data.message);
                setRunning(false);
                worker.terminate();
                workerRef.current = null;
            }
        };
        worker.onerror = event => { setMessage(event.message || "Simulation Worker failed."); setRunning(false); };
        worker.postMessage({ type: mode, config, scenario });
    };
    const cancel = () => { workerRef.current?.terminate(); workerRef.current = null; setRunning(false); setMessage("Simulation cancelled."); };
    return h("main", { className: "page simulation-page" }, h("header", { className: "page-header" }, h("div", null, h("p", { className: "eyebrow" }, "Phase 3 economy audit"), h("h1", null, "Simulation Lab"), h("p", { className: "lead compact" }, "Run the same rules engine without a UI and separate continent effects from AI strategy effects.")), button("Back", onBack, { kind: "ghost" })), h("div", { className: "simulation-layout" }, h("section", { className: "panel simulation-controls" }, h("div", { className: "panel-title" }, "Batch controls"), h("div", { className: "control-grid" }, h("label", null, "Games", h("select", { value: scenario.games, onChange: e => update({ games: Number(e.target.value) }) }, ...[100, 1000, 10000].map(value => h("option", { key: value, value }, value.toLocaleString())))), h("label", null, "Base seed", h("input", { value: scenario.baseSeed, onChange: e => update({ baseSeed: e.target.value }) })), h("label", null, "Assignment", h("select", { value: scenario.assignmentMode, onChange: e => update({ assignmentMode: e.target.value }) }, h("option", { value: "rotateStrategies" }, "Rotate strategies fairly"), h("option", { value: "fixed" }, "Fixed pairings"))), h("label", null, "Seat assignment", h("select", { value: scenario.seatAssignmentMode, onChange: e => update({ seatAssignmentMode: e.target.value }) }, h("option", { value: "rotate" }, "Rotate seats fairly"), h("option", { value: "fixed" }, "Fixed player seats"))), h("label", null, "AI difficulty", h("select", { value: scenario.aiDifficulty, onChange: e => update({ aiDifficulty: e.target.value }) }, h("option", { value: "basic" }, "Basic"), h("option", { value: "standard" }, "Standard"), h("option", { value: "advanced" }, "Advanced"))), h("label", null, "Trade", h("select", { value: scenario.tradeMode, onChange: e => update({ tradeMode: e.target.value }) }, h("option", { value: "directAndImport" }, "Direct + public import"), h("option", { value: "publicImportOnly" }, "Public import only"), h("option", { value: "disabled" }, "Disabled"))), h("label", null, "Opening", h("select", { value: scenario.openingMode, onChange: e => update({ openingMode: e.target.value }) }, h("option", { value: "energySummit" }, "Secret Energy Summit"), h("option", { value: "startingPlan" }, "Starting Plan — no Summit"))), h("label", null, "Technology data", h("select", { value: scenario.technologyDataSetId, onChange: e => update({ technologyDataSetId: e.target.value }) }, ...technologyDataSets.map(item => h("option", { key: item.id, value: item.id }, item.label)))), h("label", null, "Weather distribution", h("select", { value: scenario.weatherPresetId, onChange: e => update({ weatherPresetId: e.target.value }) }, ...["default", "sunny", "windy", "wet", "balanced"].map(id => h("option", { key: id, value: id }, titleCase(id))))), h("label", null, "Local Condition severity", h("input", { type: "number", min: 0, max: 2, step: 0.25, value: scenario.localConditionSeverity, onChange: e => update({ localConditionSeverity: Number(e.target.value) }) })), h("label", null, "Continental reserves", h("input", { value: "Fixed at 35 per continent", disabled: true, readOnly: true })), h("label", null, "Actions per Generation", h("input", { type: "number", min: 1, max: 4, step: 1, value: scenario.actionsPerGeneration, onChange: e => update({ actionsPerGeneration: Number(e.target.value) }) })), h("label", null, "AI trade utility threshold", h("input", { type: "number", min: 0, max: 5, step: 0.05, value: scenario.aiTradeUtilityThreshold, onChange: e => update({ aiTradeUtilityThreshold: Number(e.target.value) }) })), h("label", null, "AI direct-trade cadence", h("input", { type: "number", min: 1, max: 8, step: 1, value: scenario.aiDirectTradeCadence, onChange: e => update({ aiDirectTradeCadence: Number(e.target.value) }) })), h("label", { className: "checkbox" }, h("input", { type: "checkbox", checked: scenario.randomizeInitialFirstPlayer, onChange: e => update({ randomizeInitialFirstPlayer: e.target.checked }) }), " Randomise initial first player")), h("div", { className: "toggle-grid" }, h("label", { className: "toggle-row" }, h("input", { type: "checkbox", checked: scenario.buildAndOperateSameGeneration, onChange: e => update({ buildAndOperateSameGeneration: e.target.checked }) }), "Build and operate in same Generation"), ...["thermal", "battery", "lighting"].map(key => h("label", { key, className: "toggle-row" }, h("input", { type: "checkbox", checked: scenario.lossRules[key], onChange: e => update({ lossRules: { ...scenario.lossRules, [key]: e.target.checked } }) }), `Count ${titleCase(key)} loss`))), h("h3", null, "Starting strategy assignments"), h("div", { className: "assignment-grid" }, ...scenario.assignments.map((assignment, index) => {
        const continent = config.continents.find(item => item.id === assignment.continentId);
        return h("label", { key: assignment.continentId }, continent.name, h("select", { value: assignment.strategyId, onChange: e => updateAssignment(index, e.target.value) }, ...strategies.map(id => h("option", { key: id, value: id }, strategyLabels[id]))));
    })), h("p", { className: "muted" }, scenario.assignmentMode === "rotateStrategies" && scenario.seatAssignmentMode === "rotate" ? "Each continent receives every AI strategy and every player seat across a 36-game cycle." : scenario.assignmentMode === "rotateStrategies" ? "Strategies rotate, but fixed seats may still confound geography with turn order and market access." : "Continent and strategy remain paired; results cannot cleanly separate geography from strategy."), h("div", { className: "form-row" }, button(running ? "Running…" : "Run batch", () => run("run"), { kind: "primary", disabled: running }), button("Compare trade modes", () => run("tradeComparison"), { kind: "secondary", disabled: running }), running ? button("Cancel", cancel, { kind: "ghost" }) : null), running || progress.completed ? h("div", { className: "progress-block" }, h("div", { className: "progress-track" }, h("i", { style: { width: `${progress.fraction * 100}%` } })), h("small", null, `${progress.completed.toLocaleString()} / ${progress.total.toLocaleString()} games`)) : null, message ? h("p", { className: "error" }, message) : null), h("div", { className: "simulation-results" }, !report && !comparison ? panel("Results", h("p", { className: "muted" }, "Run a batch to calculate continental means, strategy effects, percentiles, technology frequency and automatic balance warnings.")) : comparison ? h(React.Fragment, null, panel("Trade-mode comparison", h("div", { className: "simulation-table" }, h("div", { className: "simulation-row header" }, h("span", null, "Mode"), h("span", null, "Mean Light"), h("span", null, "Reliability points"), h("span", null, "Trades/game"), h("span", null, "Imports/game")), ...comparison.rows.map(row => h("div", { key: row.tradeMode, className: "simulation-row" }, h("strong", null, titleCase(row.tradeMode)), h("span", null, row.meanLight.toFixed(2)), h("span", null, row.meanReliability.toFixed(2)), h("span", null, row.tradesPerGame.toFixed(2)), h("span", null, row.importsPerGame.toFixed(2)))))), panel("Comparison export", h("div", { className: "form-row compact" }, button("Full comparison JSON", () => download("sunpaths-trade-comparison.json", JSON.stringify(comparison, null, 2)), { kind: "secondary" })))) : h(React.Fragment, null, h("div", { className: "score-row" }, stat("Games", report.gamesCompleted.toLocaleString()), stat("Config hash", report.effectiveConfigHash), stat("Trades", report.totals.trades), stat("Imports", report.totals.imports)), h(SimulationAggregateTable, { title: "By continent", rows: report.byContinent }), h(SimulationAggregateTable, { title: "By AI strategy", rows: report.byStrategy }), panel("Automatic balance flags", h("div", { className: "flag-list" }, ...report.flags.map(item => h("article", { key: item.id, className: `balance-flag ${item.severity}` }, h("div", null, badge(item.severity, item.severity), h("strong", null, item.title)), h("p", null, item.message))))), panel("Technology purchase frequency", h("div", { className: "frequency-list" }, ...report.technologyPurchases.slice(0, 12).map(item => h("div", { key: item.id }, h("span", null, titleCase(item.id)), h("strong", null, `${(item.share * 100).toFixed(1)}%`), h(SimulationBar, { value: item.share, maximum: 1 }))))), panel("Exports", h("div", { className: "form-row compact" }, button("Full JSON", () => download("sunpaths-simulation-report.json", simulationReportToJson(report)), { kind: "secondary" }), button("Player CSV", () => download("sunpaths-player-results.csv", playerResultsToCsv(report.playerResults), "text/csv"), { kind: "secondary" }), button("Aggregate CSV", () => download("sunpaths-aggregates.csv", aggregateReportToCsv(report), "text/csv"), { kind: "secondary" }), button("Flags CSV", () => download("sunpaths-balance-flags.csv", balanceFlagsToCsv(report), "text/csv"), { kind: "secondary" })))))));
}
export { CardsScreen, RulesScreen, SimulationLab };

