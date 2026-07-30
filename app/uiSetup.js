// @ts-nocheck
import { uiShared } from "./uiShared.js";

const {
    React,
    useState,
    foundingProjectDefinition,
    canCompleteFoundingProject,
    getPathwayAffinity,
    getKnowledgeRequirement,
    h,
    continentIcons,
    weatherLabels,
    resourceLabels,
    pathwayLabels,
    capabilityLabels,
    affinityLabels,
    abilityDescriptions,
    penaltyDescriptions,
    strategyLabels,
    strategies,
    resourceKeys,
    resourceDescriptions,
    button,
    panel,
    InfoModal,
    meter
} = uiShared;

const continentIdentity = {
    africa: "Build a modern solar system while overcoming weak infrastructure.",
    europe: "Start technologically advanced, but depend on imported materials.",
    asia: "Use industrial scale while deciding whether to escape fossil lock-in.",
    northAmerica: "Use abundant Fuel and innovation, but overcome a weakly connected grid.",
    southAmerica: "Build around rivers and bioenergy while adapting to Rain and Drought.",
    australia: "Use excellent Sun and Wind across long transmission distances."
};

const pathwayIcons = {
    solar: "☀",
    wind: "≋",
    hydro: "💧",
    biomass: "🌿",
    fossil: "⛽"
};

const pathwayPlayStyles = {
    solar: "Build quickly when Sun is strong, then prepare for changing weather.",
    wind: "Use windy Generations well and strengthen the Grid for larger turbines.",
    hydro: "Store rainfall in reservoirs and release Energy when it is needed.",
    biomass: "Use renewable fuel carefully and plan around limited regrowth.",
    fossil: "Generate reliably now, but develop technology before finite Fuel runs out."
};

function qualitativeResource(value) {
    if (value <= 0)
        return "None";
    if (value === 1)
        return "Low";
    if (value === 2)
        return "Good";
    return "Excellent";
}

function setupModeFromParticipants(participants) {
    const humans = participants.filter(item => item.included && item.controller === "human").length;
    if (humans === 0)
        return "simulation";
    if (humans > 1)
        return "friends";
    return "solo";
}

function StartScreen({ onNew, onRecommended, onLoad, onRecover, hasRecovery, onCards, onRules, onSimulation }) {
    const [journeyOpen, setJourneyOpen] = useState(false);
    return h("main", { className: "start-screen player-first-start" },
        h("section", { className: "home-hero" },
            h("div", { className: "sun-mark home-sun", "aria-hidden": "true" }, h("span", null, "☀")),
            h("p", { className: "eyebrow" }, "Energy strategy game"),
            h("h1", null, "SUNPATHS"),
            h("h2", null, "Can you keep the lights on for eight generations?"),
            h("p", { className: "lead" }, "Build energy systems, survive changing weather and trade with other continents."),
            h("div", { className: "home-primary-actions" },
                button("PLAY", onNew, { kind: "primary large hero-play" }),
                button("Start recommended game", onRecommended, { kind: "secondary large" })
            ),
            h("div", { className: "home-secondary-actions" },
                hasRecovery ? button("Continue", onRecover, { kind: "ghost" }) : null,
                button("How to Play", onRules, { kind: "ghost" })
            )
        ),
        h("button", {
            type: "button",
            className: `energy-journey ${journeyOpen ? "open" : ""}`,
            onClick: () => setJourneyOpen(value => !value),
            "aria-expanded": journeyOpen
        },
            h("span", null, "☀️", h("small", null, "Sun")),
            h("b", null, "→"),
            h("span", null, "⚙️", h("small", null, "Energy system")),
            h("b", null, "→"),
            h("span", null, "⚡", h("small", null, "Grid")),
            h("b", null, "→"),
            h("span", null, "💡", h("small", null, "Light")),
            h("em", null, journeyOpen ? "Every step can lose Energy. Better technology reduces the loss." : "Every energy system loses something along the way. Tap to learn why.")
        ),
        h("details", { className: "home-more" },
            h("summary", null, "More"),
            h("div", { className: "home-more-grid" },
                h("label", { className: "button ghost file-button" }, "Load saved game", h("input", { type: "file", accept: ".json,application/json", onChange: onLoad })),
                button("Cards", onCards, { kind: "ghost" }),
                button("Rules and Data", onRules, { kind: "ghost" }),
                button("Simulation Lab", onSimulation, { kind: "ghost" })
            )
        )
    );
}

function SetupStepIndicator({ step }) {
    const labels = ["Players", "Continent", "Opening", "Ready"];
    return h("ol", { className: "setup-stepper", "aria-label": "Game setup progress" },
        ...labels.map((label, index) => h("li", {
            key: label,
            className: `${index === step ? "current" : ""} ${index < step ? "complete" : ""}`,
            "aria-current": index === step ? "step" : undefined
        }, h("span", null, index < step ? "✓" : index + 1), h("strong", null, label)))
    );
}

function configurePlayerMode(mode, participants, selectedContinentId) {
    const activeIds = participants.filter(item => item.included).map(item => item.continentId);
    const selectedId = activeIds.includes(selectedContinentId) ? selectedContinentId : participants[0]?.continentId;
    if (mode === "simulation") {
        return participants.map(item => ({
            ...item,
            included: true,
            controller: "ai",
            name: item.name === "Player" || /^Player \d+$/.test(item.name) ? item.continentId : item.name
        }));
    }
    if (mode === "friends") {
        let humanIndex = 0;
        return participants.map((item, index) => {
            const human = index < 2;
            if (human)
                humanIndex += 1;
            return {
                ...item,
                included: true,
                controller: human ? "human" : "ai",
                name: human ? `Player ${humanIndex}` : item.name === "Player" ? item.continentId : item.name
            };
        });
    }
    return participants.map(item => ({
        ...item,
        included: true,
        controller: item.continentId === selectedId ? "human" : "ai",
        name: item.continentId === selectedId ? "Player" : item.name === "Player" || /^Player \d+$/.test(item.name) ? item.continentId : item.name
    }));
}

function PlayerModeCard({ id, selected, icon, title, text, onSelect }) {
    return h("button", {
        type: "button",
        className: `setup-choice-card ${selected ? "selected" : ""}`,
        onClick: () => onSelect(id)
    }, h("span", { className: "setup-choice-icon", "aria-hidden": "true" }, icon), h("strong", null, title), h("small", null, text));
}

function AdvancedSetup({ participants, update, seed, setSeed, onNewSeed, debugMode, setDebugMode }) {
    return h("details", { className: "advanced-setup" },
        h("summary", null, "Advanced setup"),
        h("p", { className: "muted" }, "These controls are useful for testing, custom AI matches and reproducible bug reports. Most players can ignore them."),
        h("div", { className: "advanced-roster" },
            ...participants.map((entry, index) => h("article", { key: entry.continentId, className: "advanced-player-row" },
                h("strong", null, entry.continentId),
                h("label", { className: "toggle-row" }, h("input", { type: "checkbox", checked: entry.included, onChange: event => update(index, { included: event.target.checked }) }), "Active"),
                h("label", null, "Controller", h("select", { value: entry.controller, disabled: !entry.included, onChange: event => update(index, { controller: event.target.value }) }, h("option", { value: "human" }, "Human"), h("option", { value: "ai" }, "AI"))),
                h("label", null, "Name", h("input", { value: entry.name, disabled: !entry.included, onChange: event => update(index, { name: event.target.value }) })),
                entry.controller === "ai" ? h(React.Fragment, null,
                    h("label", null, "AI strategy", h("select", { value: entry.strategy, disabled: !entry.included, onChange: event => update(index, { strategy: event.target.value }) }, ...strategies.map(strategy => h("option", { key: strategy, value: strategy }, strategyLabels[strategy])))),
                    h("label", null, "AI difficulty", h("select", { value: entry.difficulty, disabled: !entry.included, onChange: event => update(index, { difficulty: event.target.value }) }, h("option", { value: "basic" }, "Basic"), h("option", { value: "standard" }, "Standard"), h("option", { value: "advanced" }, "Advanced")))
                ) : null
            ))
        ),
        h("div", { className: "advanced-tools" },
            h("label", null, "Seed", h("input", { value: seed, onChange: event => setSeed(event.target.value), placeholder: "Generated automatically" })),
            button("New seed", onNewSeed, { kind: "secondary" }),
            h("label", { className: "toggle-row" }, h("input", { type: "checkbox", checked: debugMode, onChange: event => setDebugMode(event.target.checked) }), "Show AI decision debugging")
        )
    );
}

function ContinentFocus({ config, participants, selectedContinentId, setSelectedContinentId, playerMode, setParticipants, setProfileInfo }) {
    const continent = config.continents.find(item => item.id === selectedContinentId) || config.continents[0];
    const selectedEntry = participants.find(item => item.continentId === continent.id);
    const strongPaths = Object.entries(continent.pathwayAffinity).filter(([, affinity]) => affinity === "strong").map(([path]) => path);
    const difficultPaths = Object.entries(continent.pathwayAffinity).filter(([, affinity]) => affinity === "difficult").map(([path]) => path);
    const ability = abilityDescriptions[continent.abilityId];
    const penalty = continent.penaltyId ? penaltyDescriptions[continent.penaltyId] : null;
    const setSoloContinent = () => setParticipants(items => items.map(item => ({
        ...item,
        included: true,
        controller: item.continentId === continent.id ? "human" : "ai",
        name: item.continentId === continent.id ? "Player" : item.name === "Player" ? item.continentId : item.name
    })));
    const toggleFriendControl = () => setParticipants(items => items.map(item => item.continentId === continent.id ? {
        ...item,
        included: true,
        controller: item.controller === "human" ? "ai" : "human",
        name: item.controller === "human" ? continent.name : `Player ${items.filter(candidate => candidate.controller === "human").length + 1}`
    } : item));
    return h("div", { className: "continent-selection-layout" },
        h("nav", { className: "continent-selector", "aria-label": "Choose a continent" },
            ...config.continents.map(item => h("button", {
                key: item.id,
                type: "button",
                className: item.id === continent.id ? "selected" : "",
                onClick: () => setSelectedContinentId(item.id)
            }, h("span", null, continentIcons[item.id]), h("strong", null, item.name), participants.find(entry => entry.continentId === item.id)?.controller === "human" ? h("small", null, "Human") : null))
        ),
        h("article", { className: "continent-focus-card" },
            h("div", { className: "continent-focus-heading" },
                h("span", { className: "continent-focus-icon", "aria-hidden": "true" }, continentIcons[continent.id]),
                h("div", null, h("p", { className: "eyebrow" }, "Choose your region"), h("h2", null, continent.name), h("p", { className: "continent-identity" }, continentIdentity[continent.id]))
            ),
            h("div", { className: "continent-essentials" },
                h("div", null, h("small", null, "Strength"), h("strong", null, continent.strengths[0])),
                h("div", null, h("small", null, "Challenge"), h("strong", null, continent.weaknesses[0])),
                h("div", null, h("small", null, "Likely trade need"), h("strong", null, continent.tradeNeed)),
                h("div", null, h("small", null, "Strong pathway"), h("strong", null, pathwayLabels[continent.strongPathway])),
                h("div", null, h("small", null, "Renewable signature"), h("strong", null, pathwayLabels[continent.signatureRenewable]))
            ),
            h("div", { className: "affinity-summary" },
                h("div", null, h("small", null, "Strong pathways"), h("p", null, ...strongPaths.map(path => h("span", { key: path, className: "pathway-chip strong" }, pathwayIcons[path], " ", pathwayLabels[path])))),
                h("div", null, h("small", null, "Difficult pathways"), h("p", null, ...difficultPaths.map(path => h("span", { key: path, className: "pathway-chip difficult" }, pathwayIcons[path], " ", pathwayLabels[path]))))
            ),
            h("div", { className: "qualitative-resources" },
                ...resourceKeys.map(key => h("div", { key }, h("span", null, resourceLabels[key]), h("strong", null, qualitativeResource(continent.startingWarehouse[key])), h("i", { style: { "--resource-level": continent.startingWarehouse[key] } })))
            ),
            h("details", { className: "continent-details" },
                h("summary", null, "See exact resources and full details"),
                h("div", { className: "exact-resource-grid" }, ...resourceKeys.map(key => h("div", { key }, h("small", null, resourceLabels[key]), h("strong", null, continent.startingWarehouse[key]), h("span", null, `${continent.printedResources[key]} total reserve`)))),
                h("div", { className: "system-readiness-row" },
                    h("span", null, h("small", null, "Technical readiness"), h("strong", null, `Knowledge ${continent.startingKnowledge}`)),
                    h("span", null, h("small", null, "Grid"), h("strong", null, `Transmission ${continent.startingTransmissionLevel}`)),
                    h("span", null, h("small", null, "Efficient lights"), h("strong", null, `Lighting ${continent.startingLightingLevel}`))
                ),
                h("button", { type: "button", className: "profile-explain compact-profile-link", onClick: () => setProfileInfo({ eyebrow: continent.name, title: ability.name, summary: ability.text, details: continent.strengths }) }, h("b", null, "Unique ability: "), ability.name, h("span", null, " ?")),
                penalty ? h("button", { type: "button", className: "profile-explain compact-profile-link", onClick: () => setProfileInfo({ eyebrow: continent.name, title: penalty.name, summary: penalty.text, details: continent.weaknesses }) }, h("b", null, "Structural weakness: "), penalty.name, h("span", null, " ?")) : null,
                h("p", { className: "muted" }, "Regional potential describes regional identity. It never reduces base output or prevents a technology from being built; only the matching renewable signature adds a regional output bonus."),
                h("div", { className: "opportunity-list compact-opportunities" }, ...Object.entries(continent.renewablePotential).map(([path, value]) => h("div", { key: path }, h("span", null, `${pathwayLabels[path]} potential`), meter(value))))
            ),
            playerMode === "solo" ? button(selectedEntry?.controller === "human" ? `✓ Playing as ${continent.name}` : `Play as ${continent.name}`, setSoloContinent, { kind: selectedEntry?.controller === "human" ? "secondary large" : "primary large" }) : null,
            playerMode === "friends" ? button(selectedEntry?.controller === "human" ? "Set as AI faction" : "Assign to a human player", toggleFriendControl, { kind: selectedEntry?.controller === "human" ? "secondary" : "primary" }) : null,
            playerMode === "simulation" ? h("p", { className: "muted" }, "All continents are computer-controlled. Browse each profile before continuing.") : null
        )
    );
}

function SetupScreen({ config, participants, setParticipants, seed, setSeed, debugMode, setDebugMode, playMode, setPlayMode, openingMode, setOpeningMode, onNewSeed, onStart, onBack }) {
    const initialHuman = participants.find(item => item.controller === "human")?.continentId || participants[0]?.continentId || config.continents[0].id;
    const [step, setStep] = useState(0);
    const [playerMode, setPlayerMode] = useState(() => setupModeFromParticipants(participants));
    const [selectedContinentId, setSelectedContinentId] = useState(initialHuman);
    const [profileInfo, setProfileInfo] = useState(null);
    const included = participants.filter(player => player.included);
    const humans = included.filter(player => player.controller === "human");
    const update = (index, patch) => setParticipants(items => items.map((player, itemIndex) => itemIndex === index ? { ...player, ...patch } : player));
    const chooseMode = mode => {
        setPlayerMode(mode);
        setParticipants(items => configurePlayerMode(mode, items, selectedContinentId));
    };
    const currentContinent = config.continents.find(item => item.id === selectedContinentId) || config.continents[0];
    const primaryHuman = participants.find(item => item.included && item.controller === "human");
    const summaryContinent = config.continents.find(item => item.id === primaryHuman?.continentId) || currentContinent;
    const openingName = openingMode === "startingPlan" ? "Quick Start" : "Energy Summit";
    const canContinue = included.length >= 1 && included.length <= 6;

    let content = null;
    if (step === 0) {
        content = h("section", { className: "setup-stage" },
            h("div", { className: "setup-stage-heading" }, h("p", { className: "eyebrow" }, "Step 1"), h("h1", null, "How are you playing?"), h("p", null, "Choose the experience. Detailed player and AI controls stay available under Advanced setup.")),
            h("div", { className: "setup-choice-grid" },
                h(PlayerModeCard, { id: "solo", selected: playerMode === "solo", icon: "●", title: "Solo", text: "You control one continent. The computer controls the others.", onSelect: chooseMode }),
                h(PlayerModeCard, { id: "friends", selected: playerMode === "friends", icon: "●●", title: "With friends", text: "Two to six people share this device.", onSelect: chooseMode }),
                h(PlayerModeCard, { id: "simulation", selected: playerMode === "simulation", icon: "▶", title: "Watch a simulation", text: "All continents are computer-controlled.", onSelect: chooseMode })
            ),
            h("div", { className: "guided-help-setting" },
                h("div", null, h("strong", null, "Guided Help"), h("small", null, "Recommendations and plain-language explanations. It never changes the rules.")),
                h("label", { className: "help-switch" }, h("input", { type: "checkbox", checked: playMode === "guided", onChange: event => setPlayMode(event.target.checked ? "guided" : "strategy") }), h("span", null, playMode === "guided" ? "On" : "Off"))
            ),
            h(AdvancedSetup, { participants, update, seed, setSeed, onNewSeed, debugMode, setDebugMode })
        );
    }
    else if (step === 1) {
        content = h("section", { className: "setup-stage" },
            h("div", { className: "setup-stage-heading" }, h("p", { className: "eyebrow" }, "Step 2"), h("h1", null, playerMode === "simulation" ? "Explore the continents" : "Choose your continent"), h("p", null, "Start with the strategic identity. Exact numbers remain one click away.")),
            h(ContinentFocus, { config, participants, selectedContinentId, setSelectedContinentId, playerMode, setParticipants, setProfileInfo })
        );
    }
    else if (step === 2) {
        content = h("section", { className: "setup-stage" },
            h("div", { className: "setup-stage-heading" }, h("p", { className: "eyebrow" }, "Step 3"), h("h1", null, "Choose your opening"), h("p", null, "Both modes use the same energy systems. The Summit adds negotiation before building begins.")),
            h("div", { className: "opening-choice-grid" },
                h("button", { type: "button", className: `opening-choice-card ${openingMode === "startingPlan" ? "selected" : ""}`, onClick: () => setOpeningMode("startingPlan") },
                    h("span", { className: "opening-icon" }, "⚡"), h("p", { className: "eyebrow" }, "Starting Plan"), h("h2", null, "Quick Start"), h("p", null, "Choose a plan and begin building immediately."), h("ul", null, h("li", null, "Best for a first game"), h("li", null, "No pre-game bargaining"), h("li", null, "Faster opening"))
                ),
                h("button", { type: "button", className: `opening-choice-card ${openingMode === "energySummit" ? "selected" : ""}`, onClick: () => setOpeningMode("energySummit") },
                    h("span", { className: "opening-icon" }, "⇄"), h("p", { className: "eyebrow" }, "Secret Energy Summit"), h("h2", null, "Energy Summit"), h("p", null, "Choose a secret plan, trade for resources, then reveal your strategy."), h("ul", null, h("li", null, "More negotiation"), h("li", null, "Two trades per player"), h("li", null, "Forecast visible before trading"))
                )
            ),
            openingMode === "energySummit" ? h("details", { className: "summit-explainer" }, h("summary", null, "How the Summit works"), h("ol", null, h("li", null, "Everyone locks a secret Starting Pathway and Capability."), h("li", null, "The public future forecast is rolled."), h("li", null, "Trade proceeds right-to-left, then left-to-right."), h("li", null, "Each player may complete at most two Summit trades."), h("li", null, "Plans are revealed and Founding Projects are resolved."))) : null
        );
    }
    else {
        content = h("section", { className: "setup-stage ready-stage" },
            h("div", { className: "setup-stage-heading" }, h("p", { className: "eyebrow" }, "Step 4"), h("h1", null, "Your challenge is ready"), h("p", null, "Review the essentials. Everything else will be introduced when it becomes useful.")),
            h("div", { className: "ready-summary" },
                h("div", { className: "ready-continent" }, h("span", null, continentIcons[summaryContinent.id]), h("div", null, h("small", null, playerMode === "simulation" ? "Featured continent" : "Your continent"), h("h2", null, summaryContinent.name), h("p", null, continentIdentity[summaryContinent.id]))),
                h("dl", null,
                    h("div", null, h("dt", null, "Strength"), h("dd", null, summaryContinent.strengths[0])),
                    h("div", null, h("dt", null, "Main challenge"), h("dd", null, summaryContinent.weaknesses[0])),
                    h("div", null, h("dt", null, "Opening"), h("dd", null, openingName)),
                    h("div", null, h("dt", null, "Players"), h("dd", null, `${included.length} continents · ${humans.length} human${humans.length === 1 ? "" : "s"}`)),
                    h("div", null, h("dt", null, "Guided Help"), h("dd", null, playMode === "guided" ? "On" : "Off"))
                )
            ),
            h("p", { className: "ready-promise" }, "Your first goal and legal actions will appear automatically. Technical details remain available whenever you need them."),
            button("BEGIN", onStart, { kind: "primary large hero-play", disabled: !canContinue })
        );
    }

    return h("main", { className: "page setup-wizard" },
        h("header", { className: "setup-wizard-header" }, button("← Home", onBack, { kind: "ghost" }), h(SetupStepIndicator, { step })),
        content,
        h("nav", { className: "setup-navigation" },
            step > 0 ? button("Back", () => setStep(value => value - 1), { kind: "ghost" }) : h("span", null),
            step < 3 ? button("Continue", () => setStep(value => Math.min(3, value + 1)), { kind: "primary", disabled: !canContinue }) : null
        ),
        profileInfo ? h(InfoModal, { info: profileInfo, onClose: () => setProfileInfo(null) }) : null
    );
}

function PreparedSelection({ game, onSelect }) {
    const pending = Object.values(game.players).find(player => player.controller.kind === "human" && !player.prepared.pathwayId);
    const [pathway, setPathway] = useState("solar");
    const [capability, setCapability] = useState("storage");
    if (!pending)
        return h("div", null, h("p", null, "All secret plans are selected."));
    const profile = game.config.continents.find(item => item.id === pending.continentId);
    return panel(`Choose a secret plan · ${pending.name}`, h("div", { className: "prepared-form redesigned-prepared" },
        h("div", { className: "prepared-intro" }, h("p", { className: "eyebrow" }, "Starting Pathway"), h("h2", null, "How do you want to begin?"), h("p", null, game.opening.mode === "energySummit" ? "Your choice stays hidden while everyone trades public resources." : "Your plan will be revealed before the first Generation.")),
        h("div", { className: "pathway-choice-grid" }, ...game.config.preparedPathways.map(item => {
            const affinity = profile.pathwayAffinity[item.id];
            const technology = game.config.technologies.find(tech => tech.pathway === item.id && tech.tier === "basic" && !tech.starter);
            const knowledge = technology ? getKnowledgeRequirement(game, pending, technology) : null;
            const projectName = item.id === "fossil" ? "Fuel Supply Network" : technology?.name || "Founding Project";
            return h("button", { key: item.id, type: "button", className: `pathway-choice ${pathway === item.id ? "selected" : ""}`, onClick: () => setPathway(item.id) },
                h("span", { className: "pathway-choice-icon" }, pathwayIcons[item.id]),
                h("strong", null, pathwayLabels[item.id]),
                h("small", null, pathwayPlayStyles[item.id]),
                h("span", { className: `affinity-tag ${affinity}` }, `${affinityLabels[affinity]} readiness${knowledge ? ` · K${knowledge}` : ""}`),
                h("em", null, `Founding Project: ${projectName}`)
            );
        })),
        h("div", { className: "prepared-intro capability-intro" }, h("p", { className: "eyebrow" }, "Special Capability"), h("h3", null, "Choose one opening advantage")),
        h("div", { className: "capability-choice-grid" }, ...game.config.preparedCapabilities.map(item => h("button", { key: item.id, type: "button", className: `capability-choice ${capability === item.id ? "selected" : ""}`, onClick: () => setCapability(item.id) }, h("strong", null, capabilityLabels[item.id]), h("small", null, item.effect)))),
        h("div", { className: "secret-lock-row" },
            h("p", null, h("b", null, "Your secret plan: "), `${pathwayLabels[pathway]} + ${capabilityLabels[capability]}`),
            button("Lock secret plan", () => onSelect(pending.id, pathway, capability), { kind: "primary large" })
        )
    ));
}

function PreparedCustomForm({ player, onSelect }) {
    const [pathway, setPathway] = useState("solar");
    const [capability, setCapability] = useState("storage");
    return h("div", { className: "form-row" },
        h("label", null, "Starting Pathway", h("select", { value: pathway, onChange: event => setPathway(event.target.value) }, ...Object.keys(pathwayLabels).map(id => h("option", { key: id, value: id }, pathwayLabels[id])))),
        h("label", null, "Special Capability", h("select", { value: capability, onChange: event => setCapability(event.target.value) }, ...Object.keys(capabilityLabels).map(id => h("option", { key: id, value: id }, capabilityLabels[id])))),
        button("Lock secret plan", () => onSelect(player.id, pathway, capability), { kind: "primary" })
    );
}

function bundleText(bundle) {
    return resourceKeys.filter(key => (bundle?.[key] ?? 0) > 0).map(key => `${bundle[key]} ${resourceLabels[key]}`).join(" + ") || "nothing";
}

function SummitTradeForm({ game, player, command }) {
    const partners = Object.values(game.players).filter(other => other.id !== player.id && (other.summitTrades ?? 0) < (game.config.opening?.summitMaximumTradesPerPlayer ?? 2));
    const [recipientId, setRecipientId] = useState(partners[0]?.id ?? "");
    const [offerResource, setOfferResource] = useState(resourceKeys.find(key => player.resources[key].warehouse > 0) ?? "fossilFuel");
    const [offerQty, setOfferQty] = useState(1);
    const [requestResource, setRequestResource] = useState("constructionMaterials");
    const [requestQty, setRequestQty] = useState(1);
    const selectedPartner = game.players[recipientId];
    return h("div", { className: "summit-form redesigned-summit-form" },
        h("div", { className: "hidden-plan-reminder" }, h("small", null, "Only you can see this"), h("strong", null, `${pathwayLabels[player.prepared.pathwayId]} + ${capabilityLabels[player.prepared.capabilityId]}`)),
        h("div", { className: "summit-trade-builder" },
            h("label", null, "Trade with", h("select", { value: recipientId, onChange: event => setRecipientId(event.target.value) }, ...partners.map(other => h("option", { key: other.id, value: other.id }, `${other.name} · ${2 - (other.summitTrades ?? 0)} trades left`)))),
            h("div", { className: "summit-side" }, h("strong", null, "You offer"), h("select", { value: offerResource, onChange: event => setOfferResource(event.target.value) }, ...resourceKeys.map(key => h("option", { key, value: key, disabled: player.resources[key].warehouse < 1 }, `${resourceLabels[key]} · you have ${player.resources[key].warehouse}`))), h("select", { value: offerQty, onChange: event => setOfferQty(Number(event.target.value)) }, h("option", { value: 1 }, "1 cube"), h("option", { value: 2 }, "2 cubes"))),
            h("span", { className: "summit-swap" }, "⇄"),
            h("div", { className: "summit-side" }, h("strong", null, "You request"), h("select", { value: requestResource, onChange: event => setRequestResource(event.target.value) }, ...resourceKeys.map(key => h("option", { key, value: key }, `${resourceLabels[key]} · they have ${selectedPartner?.resources[key].warehouse ?? 0}`))), h("select", { value: requestQty, onChange: event => setRequestQty(Number(event.target.value)) }, h("option", { value: 1 }, "1 cube"), h("option", { value: 2 }, "2 cubes")))
        ),
        h("div", { className: "form-row" },
            button("Make offer", () => command({ type: "proposeSummitTrade", proposerId: player.id, recipientId, proposerGives: { [offerResource]: offerQty }, recipientGives: { [requestResource]: requestQty } }), { kind: "primary", disabled: !recipientId || offerResource === requestResource || player.resources[offerResource].warehouse < offerQty || (selectedPartner?.resources[requestResource].warehouse ?? 0) < requestQty }),
            button("Pass", () => command({ type: "passSummitTurn", playerId: player.id }), { kind: "ghost" })
        )
    );
}

function EnergySummit({ game, command }) {
    const summit = game.opening.summit;
    const pending = summit.pendingOffer;
    const activeId = summit.order[summit.activeIndex];
    const active = game.players[activeId];
    const maxTrades = game.config.opening?.summitMaximumTradesPerPlayer ?? 2;
    if (pending) {
        const proposer = game.players[pending.proposerId];
        const recipient = game.players[pending.recipientId];
        if (recipient.controller.kind === "human") {
            return panel("Energy Summit offer", h("div", { className: "summit-offer redesigned-offer" },
                h("p", { className: "eyebrow" }, `Pass the device to ${recipient.name}`),
                h("h2", null, `${proposer.name} proposes a barter`),
                h("div", { className: "offer-equation" }, h("strong", null, bundleText(pending.proposerGives)), h("span", null, "⇄"), h("strong", null, bundleText(pending.recipientGives))),
                h("div", { className: "form-row" }, button("Accept barter", () => command({ type: "respondSummitTrade", recipientId: recipient.id, accept: true }), { kind: "primary" }), button("Decline", () => command({ type: "respondSummitTrade", recipientId: recipient.id, accept: false }), { kind: "ghost" }))
            ));
        }
        return panel("Energy Summit offer", h("div", { className: "summit-thinking" }, h("span", null, "…"), h("p", null, `${recipient.name} is considering ${proposer.name}'s offer.`)));
    }
    return panel(`Energy Summit · Round ${summit.round}`, h("div", { className: "summit-board redesigned-summit" },
        h("div", { className: "summit-direction" }, h("span", null, summit.direction === "rightToLeft" ? "←" : "→"), h("div", null, h("strong", null, summit.direction === "rightToLeft" ? "Right-to-left sweep" : "Left-to-right sweep"), h("small", null, `Future forecast: ${game.weather.forecast ? weatherLabels[game.weather.forecast] : "not rolled"}`))),
        h("p", { className: "muted" }, "Resources are public. Starting Pathways and Capabilities remain secret until both sweeps finish."),
        summit.lastResolution ? h("p", { className: `notice ${summit.lastResolution.accepted ? "success" : "warning"}`, "aria-live": "polite" }, summit.lastResolution.message) : null,
        h("div", { className: "summit-resource-table" }, ...summit.order.map(id => {
            const player = game.players[id];
            return h("article", { key: id, className: id === activeId ? "active" : "" },
                h("div", null, h("strong", null, player.name), h("small", null, `${player.summitTrades ?? 0}/${maxTrades} trades`)),
                h("span", null, ...resourceKeys.map(key => h("i", { key }, `${resourceLabels[key]} ${player.resources[key].warehouse}`)))
            );
        })),
        active.controller.kind === "human" ? h(SummitTradeForm, { game, player: active, command }) : h("p", null, `${active.name} is considering a barter.`)
    ));
}

function FoundingProjectPanel({ game, command }) {
    const id = game.opening.foundingOrder[game.opening.foundingIndex];
    const player = game.players[id];
    const project = foundingProjectDefinition(game, player.id);
    const affordable = canCompleteFoundingProject(game, player.id);
    return panel(`Founding Project · ${player.name}`, h("div", { className: "founding-project redesigned-founding" },
        h("p", { className: "eyebrow" }, "Plans revealed"),
        h("h2", null, project.name),
        h("p", null, `${pathwayLabels[player.prepared.pathwayId]} + ${capabilityLabels[player.prepared.capabilityId]}`),
        h("div", { className: "founding-cost" }, h("span", null, `${project.cost.constructionMaterials} Other Materials`), h("span", null, `${project.cost.criticalMaterials} Critical Minerals`), h("strong", null, "0 Generation 1 actions")),
        affordable ? button("Complete Founding Project", () => command({ type: "resolveFoundingProject", playerId: player.id, complete: true }), { kind: "primary large" }) : h("div", { className: "notice warning" }, "You cannot pay this project now. Defer it and keep a one-use pathway Blueprint for a later build."),
        button("Defer project", () => command({ type: "resolveFoundingProject", playerId: player.id, complete: false }), { kind: "ghost" })
    ));
}

function WeatherCard({ label, face, forecast = false, onInfo }) {
    const icon = face === "brightSun" ? "☀" : face === "rain" ? "☂" : face === "strongWind" ? "≋" : face === "storm" ? "ϟ" : "☁";
    const tag = onInfo ? "button" : "div";
    return h(tag, { type: onInfo ? "button" : undefined, className: `weather-card ${forecast ? "forecast" : ""} ${onInfo ? "explainable" : ""}`, onClick: onInfo }, h("small", null, label), h("span", null, icon), h("strong", null, face ? weatherLabels[face] : "—"), onInfo ? h("i", { className: "micro-help" }, "?") : null);
}

function SetupProgress({ game, command }) {
    if (game.phase === "setup.preparedSelection")
        return h(PreparedSelection, { game, onSelect: (playerId, pathwayId, capabilityId) => command({ type: "selectPrepared", playerId, pathwayId, capabilityId }) });
    if (game.phase === "setup.summit")
        return h(EnergySummit, { game, command });
    if (game.phase === "setup.foundingProjects")
        return h(FoundingProjectPanel, { game, command });
    const actions = {
        "setup.revealPrepared": ["Reveal Starting Plans", { type: "revealPrepared" }],
        "setup.rollCurrent": ["Roll the first Current Condition", { type: "rollCurrent" }],
        "setup.rollForecast": ["Roll Generation 1 Forecast", { type: "rollForecast" }]
    };
    const item = actions[game.phase];
    if (!item)
        return null;
    return panel("Pregame", h("div", { className: "setup-progress" }, h(WeatherCard, { label: "Current Condition", face: game.weather.current }), h(WeatherCard, { label: "Next Forecast", face: game.weather.forecast, forecast: true }), button(item[0], () => command(item[1]), { kind: "primary" })));
}

export { StartScreen, SetupScreen, PreparedSelection, PreparedCustomForm, SummitTradeForm, EnergySummit, FoundingProjectPanel, WeatherCard, SetupProgress };
