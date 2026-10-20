// @ts-nocheck
import { uiShared } from "./uiShared.js?v=a5.52.0";
import { gameText } from "./gameText.js?v=a5.52.0";

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
    meter,
    gameModes,
    getGameMode,
    featureEnabled,
    defaultCapabilityForPathway
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


const discoveryCards = [
    { icon: "💡", title: "Keep the lights on", text: "Balance today’s Light requirement with preparation for future Generations.", where: "Light demand (Beginner has no points)" },
    { icon: "↘", title: "Follow the Energy chain", text: "See how Energy moves from its source through technology, the Grid and Lighting—and where it is lost.", where: "Development previews and Energy resolution" },
    { icon: "🔎", title: "Find the real bottleneck", text: "Discover why building more generation is not always the solution.", where: "System overview and Generation Review" },
    { icon: "☀", title: "Compare Energy pathways", text: "Experience the difference between weather-dependent renewables and Fuel- or Biomass-based generation.", where: "Weather, generation and recurring resources" },
    { icon: "✦", title: "Combine Knowledge and resources", text: "Learn why technical Knowledge, materials and infrastructure must work together.", where: "Learn, Extract and Build actions" },
    { icon: "⇄", title: "Work across regions", text: "Use regional strengths, player trade and the World Market to overcome scarcity.", where: "Regional resources and trade" }
];

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
    const [discoverOpen, setDiscoverOpen] = useState(false);
    return h("main", { className: "start-screen player-first-start" },
        h("section", { className: "home-hero" },
            h("div", { className: "sun-mark home-sun", "aria-hidden": "true" }, h("span", null, "☀")),
            h("p", { className: "eyebrow" }, "Energy strategy game"),
            h("h1", null, "SUNPATHS"),
            h("h2", null, "Can you keep the lights on?"),
            h("p", { className: "lead" }, "Build energy systems, survive changing weather and trade with other continents."),
            h("div", { className: "home-primary-actions" },
                button("Choose game", onNew, { kind: "primary large hero-play" }),
                button("Quick Start", onRecommended, { kind: "secondary large" })
            ),
            h("div", { className: "home-secondary-actions" },
                hasRecovery ? button("Continue", onRecover, { kind: "ghost" }) : null,
                button("How to Play", onRules, { kind: "ghost" })
            )
        ),
        discoverOpen ? h("section", { className: "discover-panel", "aria-label": "What You’ll Discover" },
            h("div", { className: "discover-heading" }, h("div", null, h("p", { className: "eyebrow" }, "Play, notice, understand"), h("h2", null, "What You’ll Discover")), button("Close", () => setDiscoverOpen(false), { kind: "ghost" })),
            h("div", { className: "discover-grid" }, ...discoveryCards.map(card => h("article", { key: card.title, className: "discover-card" }, h("span", { "aria-hidden": "true" }, card.icon), h("h3", null, card.title), h("p", null, card.text), h("small", null, `You’ll see this in: ${card.where}.`)))),
            h("p", { className: "discover-note" }, "SUNPATHS uses simplified regional scenarios based on broad energy-system patterns."),
            h("p", { className: "discover-note muted" }, "Continents contain many different countries, climates, industries and communities. The game represents strategic patterns, not every place within a region.")
        ) : null,
        h("details", { className: "home-more" },
            h("summary", null, "More options"),
            h("div", { className: "home-more-grid" },
                h("label", { className: "button ghost file-button" }, "Load saved game", h("input", { type: "file", accept: ".json,application/json", onChange: onLoad })),
                button("Learning background", () => setDiscoverOpen(value => !value), { kind: "ghost" }),
                button("Cards", onCards, { kind: "ghost" }),
                button("Simulation Lab · developer", onSimulation, { kind: "ghost" })
            )
        )
    );
}

function SetupStepIndicator({ step }) {
    const labels = ["Players", "Continent", "Opening"];
    return h("ol", { className: "setup-stepper", "aria-label": "Game setup progress" },
        ...labels.map((label, index) => h("li", {
            key: label,
            className: `${index === step ? "current" : ""} ${index < step ? "complete" : ""}`,
            "aria-current": index === step ? "step" : undefined
        }, h("span", null, index < step ? "✓" : index + 1), h("strong", null, label)))
    );
}

function ModeSelection({ onSelect, onBack }) {
    const modes = [gameModes.beginner, gameModes.intermediate, gameModes.master];
    return h("main", { className: "page mode-selection-page" },
        h("header", { className: "mode-selection-header" },
            button("← Home", onBack, { kind: "ghost" }),
            h("div", null, h("p", { className: "eyebrow" }, "Choose how much to manage"), h("h1", null, "Start simple. Add one layer at a time."), h("p", null, "Beginner has four Generations. Intermediate and Master add new systems over eight Generations."))
        ),
        h("section", { className: "mode-card-grid", "aria-label": "Game modes" }, ...modes.map((mode, index) => h("article", { key: mode.id, className: `mode-card mode-${mode.id}` },
            h("div", { className: "mode-card-top" }, h("span", { className: "mode-number" }, index + 1), h("div", null, h("p", { className: "eyebrow" }, mode.level), h("h2", null, mode.label))),
            h("p", null, mode.description),
            h("div", { className: "mode-includes" }, h("small", null, "KEY FEATURES"), h("ul", null, ...mode.includes.slice(0, 3).map(item => h("li", { key: item }, item)))),
            h("small", { className: "mode-recommended" }, mode.recommendedFor),
            button(index === 0 ? "Start Beginner" : index === 1 ? "Start Intermediate" : "Start Master", () => onSelect(mode.id), { kind: index === 0 ? "primary large" : "secondary large" })
        )))
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
    const fullRegionalRules = featureEnabled(config, "fullRegionalRules");
    const usesKnowledge = featureEnabled(config, "knowledgeRequirements");
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
                h("div", null, h("small", null, "Strong pathway"), h("strong", null, pathwayLabels[continent.strongPathway]))
            ),
            h("div", { className: "qualitative-resources" },
                ...resourceKeys.map(key => h("div", { key }, h("span", null, resourceLabels[key]), h("strong", null, qualitativeResource(continent.startingWarehouse[key])), h("i", { style: { "--resource-level": continent.startingWarehouse[key] } })))
            ),
            h("details", { className: "continent-details" },
                h("summary", null, "More regional details"),
                h("div", { className: "affinity-summary" },
                    h("div", null, h("small", null, "Strong pathways"), h("p", null, ...strongPaths.map(path => h("span", { key: path, className: "pathway-chip strong" }, pathwayIcons[path], " ", pathwayLabels[path])))),
                    h("div", null, h("small", null, "Difficult pathways"), h("p", null, ...difficultPaths.map(path => h("span", { key: path, className: "pathway-chip difficult" }, pathwayIcons[path], " ", pathwayLabels[path]))))
                ),
                config.trade.directEnabled || config.trade.publicImportEnabled ? h("p", null, h("strong", null, "Likely trade need: "), continent.tradeNeed) : null,
                h("p", null, h("strong", null, "Renewable signature: "), pathwayLabels[continent.signatureRenewable]),
                h("div", { className: "exact-resource-grid" }, ...resourceKeys.map(key => h("div", { key }, h("small", null, resourceLabels[key]), h("strong", null, continent.startingWarehouse[key]), h("span", null, `${continent.printedResources[key]} total reserve`)))),
                h("div", { className: "system-readiness-row" },
                    usesKnowledge ? h("span", null, h("small", null, "Technical readiness"), h("strong", null, `Knowledge ${continent.startingKnowledge}`)) : null,
                    h("span", null, h("small", null, "Starting Grid"), h("strong", null, "Basic Grid")),
                    h("span", null, h("small", null, "Starting Lighting"), h("strong", null, "Basic Lighting"))
                ),
                fullRegionalRules ? h("button", { type: "button", className: "profile-explain compact-profile-link", onClick: () => setProfileInfo({ eyebrow: continent.name, title: ability.name, summary: ability.text, details: continent.strengths }) }, h("b", null, "Unique ability: "), ability.name, h("span", null, " ?")) : h("p", { className: "muted" }, `Beginner regional layer: ${continent.name} keeps its ${pathwayLabels[continent.signatureRenewable]} weather signature. Extraction specialties and structural penalties begin in Intermediate mode.`),
                fullRegionalRules && penalty ? h("button", { type: "button", className: "profile-explain compact-profile-link", onClick: () => setProfileInfo({ eyebrow: continent.name, title: penalty.name, summary: penalty.text, details: continent.weaknesses }) }, h("b", null, "Structural weakness: "), penalty.name, h("span", null, " ?")) : null,
                h("p", { className: "muted" }, "Regional potential describes regional identity. It never reduces base output or prevents a technology from being built; only the matching renewable signature adds a regional output bonus."),
                h("div", { className: "opportunity-list compact-opportunities" }, ...Object.entries(continent.renewablePotential).map(([path, value]) => h("div", { key: path }, h("span", null, `${pathwayLabels[path]} potential`), meter(value))))
            ),
            playerMode === "solo" ? h("p", { className: "muted" }, `Selected: ${continent.name}`) : null,
            playerMode === "friends" ? button(selectedEntry?.controller === "human" ? "Set as AI faction" : "Assign to a human player", toggleFriendControl, { kind: selectedEntry?.controller === "human" ? "secondary" : "primary" }) : null,
            playerMode === "simulation" ? h("p", { className: "muted" }, "All continents are computer-controlled. Browse each profile before continuing.") : null
        )
    );
}

function SetupScreen({ config, gameMode, participants, setParticipants, seed, setSeed, debugMode, setDebugMode, playMode, setPlayMode, openingMode, setOpeningMode, startingPathway, setStartingPathway, startingCapability, setStartingCapability, onNewSeed, onStart, onBack }) {
    const initialHuman = participants.find(item => item.controller === "human")?.continentId || config.continents[0].id;
    const modeDefinition = getGameMode(gameMode);
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
    // Choosing a continent also chooses the solo player: no extra "Play as" confirmation.
    const chooseContinent = id => {
        setSelectedContinentId(id);
        if (playerMode === "solo")
            setParticipants(items => configurePlayerMode("solo", items, id));
    };
    const currentContinent = config.continents.find(item => item.id === selectedContinentId) || config.continents[0];
    const canStart = included.length >= 1 && included.length <= 6 && (playerMode === "solo" ? humans.length === 1 : playerMode === "friends" ? humans.length >= 2 : humans.length === 0);
    const chooseCapability = featureEnabled(config, "preparedCapabilityChoice");
    const directOpening = modeDefinition.id !== "master" || openingMode === "startingPlan";
    const quickSolo = playerMode === "solo" && humans.length === 1;
    const affordablePreview = modeDefinition.id === "beginner" ? gameText.beginner.setup.discountExplanation : "Choosing a Founding Project gives one targeted material discount. It is NOT installed: build it during a Generation and spend one Development action. Knowledge requirements still apply.";
    return h("main", { className: "page setup-wizard setup-compact" },
        h("header", { className: "setup-wizard-header" },
            button("← Modes", onBack, { kind: "ghost" }),
            h("span", { className: `setup-mode-badge mode-${modeDefinition.id}` }, `${modeDefinition.level} · ${modeDefinition.label}`)
        ),
        h("section", { className: "setup-stage" },
            h("div", { className: "setup-stage-heading" },
                h("p", { className: "eyebrow" }, "One-page game setup"),
                h("h1", null, modeDefinition.id === "beginner" ? gameText.beginner.setup.title : "Choose your Founding development focus"),
                h("p", null, modeDefinition.id === "beginner" ? gameText.beginner.setup.description : "All regions inherit a Legacy Fuel Plant, Basic Grid and Basic Lighting. Your Founding choice discounts one future Build — it does not install it. Choose a continent and development focus, or keep the defaults.")
            ),
            h("div", { className: "setup-compact-columns" },
                h("div", { className: "setup-compact-main" },
                    h("div", { className: "setup-compact-heading" }, h("h2", null, "1 · Your continent"), h("small", null, "Selecting a region also assigns your solo player.")),
                    h(ContinentFocus, { config, participants, selectedContinentId, setSelectedContinentId: chooseContinent, playerMode, setParticipants, setProfileInfo }),
                    quickSolo ? h(React.Fragment, null,
                        h("div", { className: "setup-compact-heading" }, h("h2", null, "2 · Founding Project"), h("small", null, modeDefinition.id === "beginner" ? gameText.beginner.setup.foundingHint : "One material discount for a specific Build; one Development action and normal Knowledge still required.")),
                        h("div", { className: "setup-inline-pathways", role: "group", "aria-label": "Choose a starting energy pathway" },
                            ...config.preparedPathways.map(item => h("button", {
                                key: item.id, type: "button", "aria-pressed": startingPathway === item.id,
                                className: `pathway-choice setup-pathway-mini ${startingPathway === item.id ? "selected" : ""}`,
                                onClick: () => { setStartingPathway(item.id); if (!chooseCapability) setStartingCapability(defaultCapabilityForPathway(item.id)); }
                            }, h("span", { "aria-hidden": "true" }, pathwayIcons[item.id]), h("strong", null, pathwayLabels[item.id]),
                            h("small", null, pathwayPlayStyles[item.id]),
                            h("em", null, `Build ${item.foundingLabel}: −1 ${config.foundingDiscounts?.[item.id]?.material === "criticalMaterials" ? "Critical" : "Other"} Material`)))
                        ),
                        chooseCapability ? h("details", { className: "setup-capability-options" },
                            h("summary", null, `Starting capability · ${capabilityLabels[startingCapability]}`),
                            h("p", { className: "muted" }, "An opening advantage; choose another only if you want to customise."),
                            h("div", { className: "capability-choice-grid" }, ...config.preparedCapabilities.map(item => h("button", { key: item.id, type: "button", "aria-pressed": startingCapability === item.id, className: `capability-choice ${startingCapability === item.id ? "selected" : ""}`, onClick: () => setStartingCapability(item.id) }, h("strong", null, capabilityLabels[item.id]), h("small", null, item.effect))))
                        ) : h("p", { className: "muted setup-auto-note" }, gameText.beginner.setup.autoCapability)
                    ) : h("p", { className: "muted setup-auto-note" }, playerMode === "friends" ? "Each human chooses their secret Starting Plan in turn after starting the game." : "The computer chooses starting pathways for all continents.")
                ),
                h("aside", { className: "setup-compact-side" },
                    h("div", { className: "setup-compact-heading" }, h("h2", null, "Game options")),
                    h("label", { className: "setup-label" }, "Who is playing?"),
                    h("div", { className: "setup-compact-player-modes" },
                        h(PlayerModeCard, { id: "solo", selected: playerMode === "solo", icon: "●", title: "Solo", text: "You + computer opponents", onSelect: chooseMode }),
                        h(PlayerModeCard, { id: "friends", selected: playerMode === "friends", icon: "●●", title: "Friends", text: "2–6 humans on one device", onSelect: chooseMode }),
                        h(PlayerModeCard, { id: "simulation", selected: playerMode === "simulation", icon: "▶", title: "Simulation", text: "All computer players", onSelect: chooseMode })
                    ),
                    h("label", { className: "guided-help-setting" },
                        h("div", null, h("strong", null, modeDefinition.id === "beginner" ? gameText.beginner.setup.guideName : "New-concept tips"), h("small", null, modeDefinition.id === "beginner" ? gameText.beginner.setup.guideDescription : "Only introduces new rules, not recommended moves.")),
                        h("input", { type: "checkbox", checked: playMode === "guided", onChange: event => setPlayMode(event.target.checked ? "guided" : "strategy") })
                    ),
                    modeDefinition.id === "master" ? h("div", { className: "setup-opening-toggle" },
                        h("strong", null, "Opening"),
                        h("label", null, h("input", { type: "radio", name: "setupOpening", checked: openingMode === "startingPlan", onChange: () => setOpeningMode("startingPlan") }), "Direct · no negotiation"),
                        h("label", null, h("input", { type: "radio", name: "setupOpening", checked: openingMode === "energySummit", onChange: () => setOpeningMode("energySummit") }), "Energy Summit · negotiate first")
                    ) : h("p", { className: "muted" }, "Direct Opening: no pre-game negotiations."),
                    quickSolo && directOpening ? h("p", { className: "muted" }, affordablePreview) : null,
                    h(AdvancedSetup, { participants, update, seed, setSeed, onNewSeed, debugMode, setDebugMode }),
                    h("div", { className: "setup-compact-start" },
                        h("p", null, `${currentContinent.name} · ${modeDefinition.level} · ${quickSolo ? pathwayLabels[startingPathway] : playerMode === "friends" ? `${humans.length} humans` : "AI simulation"}`),
                        button(playerMode === "simulation" ? "Start simulation →" : "Start Generation 1 →", onStart, { kind: "primary large", disabled: !canStart }),
                        h("small", null, "Your Founding Project gives a one-use discount, not a free installation. Building still uses a Development action.")
                    )
                )
            )
        ),
        profileInfo ? h(InfoModal, { info: profileInfo, onClose: () => setProfileInfo(null) }) : null
    );
}
function PreparedSelection({ game, onSelect }) {
    const pending = Object.values(game.players).find(player => player.controller.kind === "human" && !player.prepared.pathwayId);
    const [pathway, setPathway] = useState("solar");
    const [capability, setCapability] = useState("storage");
    const chooseCapability = featureEnabled(game, "preparedCapabilityChoice");
    if (!pending)
        return h("div", null, h("p", null, "All secret plans are selected."));
    const profile = game.config.continents.find(item => item.id === pending.continentId);
    return panel(`Choose a secret plan · ${pending.name}`, h("div", { className: "prepared-form redesigned-prepared" },
        h("div", { className: "prepared-intro" }, h("p", { className: "eyebrow" }, "Starting Pathway"), h("h2", null, "How do you want to begin?"), h("p", null, game.opening.mode === "energySummit" ? "Your choice stays hidden while everyone trades public resources." : "Your plan will be revealed before the first Generation.")),
        h("div", { className: "pathway-choice-grid" }, ...game.config.preparedPathways.map(item => {
            const affinity = profile.pathwayAffinity[item.id];
            const technology = game.config.technologies.find(tech => tech.id === item.foundingTechnologyId);
            const knowledge = technology ? getKnowledgeRequirement(game, pending, technology) : null;
            const projectName = technology?.name || "Founding Project";
            return h("button", { key: item.id, type: "button", className: `pathway-choice ${pathway === item.id ? "selected" : ""}`, onClick: () => setPathway(item.id) },
                h("span", { className: "pathway-choice-icon" }, pathwayIcons[item.id]),
                h("strong", null, pathwayLabels[item.id]),
                h("small", null, pathwayPlayStyles[item.id]),
                h("span", { className: `affinity-tag ${affinity}` }, `${affinityLabels[affinity]} readiness${knowledge ? ` · K${knowledge}` : ""}`),
                h("em", null, `Discount for: ${projectName} (still must build)`)
            );
        })),
        chooseCapability ? h(React.Fragment, null,
            h("div", { className: "prepared-intro capability-intro" }, h("p", { className: "eyebrow" }, "Special Capability"), h("h3", null, "Choose one opening advantage")),
            h("div", { className: "capability-choice-grid" }, ...game.config.preparedCapabilities.map(item => h("button", { key: item.id, type: "button", className: `capability-choice ${capability === item.id ? "selected" : ""}`, onClick: () => setCapability(item.id) }, h("strong", null, capabilityLabels[item.id]), h("small", null, item.effect))))
        ) : h("div", { className: "automatic-capability-note" }, h("strong", null, "Beginner layer"), h("p", null, "Choose only the Energy pathway. The matching opening support is assigned automatically.")),
        h("div", { className: "secret-lock-row" },
            h("p", null, h("b", null, chooseCapability ? "Your secret plan: " : "Your starting pathway: "), chooseCapability ? `${pathwayLabels[pathway]} + ${capabilityLabels[capability]}` : pathwayLabels[pathway]),
            button(chooseCapability ? "Lock secret plan" : "Choose pathway", () => onSelect(pending.id, pathway, chooseCapability ? capability : defaultCapabilityForPathway(pathway)), { kind: "primary large" })
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

function OpeningForecastStrip({ game }) {
    return h("div", { className: "opening-weather-strip single-forecast", "aria-label": "Generation 1 forecast" },
        h(WeatherCard, { label: "Generation 1 · Forecast", face: game.weather.forecast, forecast: true })
    );
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
                h(OpeningForecastStrip, { game }),
                h("p", { className: "eyebrow" }, `Pass the device to ${recipient.name}`),
                h("h2", null, `${proposer.name} proposes a barter`),
                h("div", { className: "offer-equation" }, h("strong", null, bundleText(pending.proposerGives)), h("span", null, "⇄"), h("strong", null, bundleText(pending.recipientGives))),
                h("div", { className: "form-row" }, button("Accept barter", () => command({ type: "respondSummitTrade", recipientId: recipient.id, accept: true }), { kind: "primary" }), button("Decline", () => command({ type: "respondSummitTrade", recipientId: recipient.id, accept: false }), { kind: "ghost" }))
            ));
        }
        return panel("Energy Summit offer", h("div", { className: "summit-thinking" }, h(OpeningForecastStrip, { game }), h("span", null, "…"), h("p", null, `${recipient.name} is considering ${proposer.name}'s offer.`)));
    }
    return panel(`Energy Summit · Round ${summit.round}`, h("div", { className: "summit-board redesigned-summit" },
        h(OpeningForecastStrip, { game }),
        h("div", { className: "summit-direction" }, h("span", null, summit.direction === "rightToLeft" ? "←" : "→"), h("div", null, h("strong", null, summit.direction === "rightToLeft" ? "Right-to-left sweep" : "Left-to-right sweep"), h("small", null, "Trade with the Generation 1 forecast visible"))),
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
    const bonus = game.config.foundingDiscounts?.[player.prepared.pathwayId];
    const base = project.cost;
    const remaining = { ...base };
    if (bonus) remaining[bonus.material] = Math.max(0, remaining[bonus.material] - bonus.amount);
    return panel(`Founding advantage · ${player.name}`, h("div", { className: "founding-project streamlined-founding" },
        h("div", { className: "founding-project-summary" },
            h("h2", null, project.name),
            h("p", null, "Your chosen pathway grants preferential development terms — not a completed power plant.")),
        h("p", null, `Normal cost: ${base.constructionMaterials} Other, ${base.criticalMaterials} Critical.`),
        h("p", null, `Founding cost: ${remaining.constructionMaterials} Other, ${remaining.criticalMaterials} Critical.`),
        h("p", { className: "muted" }, game.gameMode === "beginner" ? gameText.beginner.setup.foundingReminder : "You must still meet Knowledge requirements and spend 1 Development action to Build. No materials are charged now."),
        button("Continue to Generation 1 →", () => command({ type: "resolveFoundingProject", playerId: player.id, complete: false }), { kind: "primary large founding-forward" })
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
    return null;
}

export { StartScreen, ModeSelection, SetupScreen, PreparedSelection, PreparedCustomForm, SummitTradeForm, EnergySummit, FoundingProjectPanel, WeatherCard, SetupProgress };
