// SUNPATHS A5.44 — BEGINNER WORDING WORKSPACE
// Edit the quoted text here to change what Beginner players see.
// Gameplay rules, technology IDs and costs live elsewhere; do not change them here.
// Intermediate and Master text below is preserved from A5.38.
export const gameText = {
    shared: {
        build: "Build",
        actionCost: "1 action",
        dismissTip: "Hide guide",
        closeTip: "Got it",
        replayTip: "Show first Build guide"
    },
    beginner: {
        map: {
            controls: "Map views", chooseLayer: "What the map shows", chooseStyle: "Map presentation",
            layers: { built: "Built", resources: "Resources", results: "Results" },
            layouts: { markers: "On map", focus: "Continent view" },
            focusEyebrow: "CONTINENT ENERGY SYSTEM", inherited: "starting equipment",
            notPhysical: "Symbols show technology in this region, not real-world plant locations.",
            regionalStock: "Regional stock", lights: "Lights", met: "Demand met", notMet: "Demand missed",
            latestGeneration: "Generation", countedLoss: "Counted System Loss",
            metGenerations: "Generations meeting demand", awaitingResult: "Results appear after a Generation is evaluated.",
            awaitingShort: "Awaiting result",
            focusMapButton: "Focus map", resetMapButton: "World view",
            geographyAria: "World map with geographic coastlines and clickable continent regions",
            explore: "Explore", selectContinent: "Select a continent to explore", swipeMap: "Swipe to explore other continents"
        },
        // Four chapters; all four keep the same approved game rules.
        chapters: [
            { title: "One Light", build: "One Light needed. What could help your town power it?", cue: "One Light to power. You already have a fuel plant — try gathering materials, building or checking your system." },
            { title: "Two Lights", build: "Demand has grown to two Lights. What will you change?", cue: "Two Lights now. Look at last Generation's result, then decide where your system needs help." },
            { title: "Three Lights", build: "Three Lights now. Could better lighting make more of the Electricity you have?", cue: "Three Lights. See how LED Lighting changes the amount of Light your Electricity can provide." },
            { title: "Four Lights", build: "Final challenge: four Lights. Can your Grid carry enough Electricity?", cue: "Four Lights to power. Your Grid can limit what reaches Lighting, even when generation is high." }
        ],
        welcome: {
            eyebrow: "BEGINNER · FOUR GENERATIONS",
            title: "Can you keep the lights on?",
            intro: "Your town needs more Light every Generation. Build an energy system that can meet its growing needs.",
            how: "You get three Development actions each Generation. Gather resources, build projects, then run an Energy Plan to find out how many Lights come on.",
            start: "Explore your town",
            skip: "Play without the guide",
            target: "Your growing Light targets",
            after: "You can make your own choices. The guide explains what changes; it won't choose for you."
        },
        tutorial: {
            objectiveTitle: "This is your Light target",
            objective: "Generation 1 needs one Light. Each new Generation needs one more. Can you meet all four targets?",
            systemTitle: "You already have a power plant",
            system: "Your Legacy Fuel Plant, basic Grid and basic Lighting are ready. Different technologies change different parts of the energy chain.",
            growthTitle: "Now the town needs two Lights",
            growth: "Look at the Lights you supplied last time and the new target. Decide what your system needs next.",
            lightingTitle: "Less heat, more Light",
            lighting: "Basic Lighting loses useful energy as heat in this game. With two Electricity, it provides one Light. LED Lighting can provide two Lights with that same electricity. See the Lighting stage, then choose what to do.",
            lightingInstalled: "You have LED Lighting already. Look at how much Electricity reaches it: improved lighting only helps when the energy is available.",
            gridTitle: "Can your Grid carry enough?",
            grid: "Your basic Grid can carry up to three Electricity. A Grid Upgrade can raise it to four. That can make a fourth Light possible with LED Lighting and enough generation—but the Grid cannot generate Electricity itself.",
            gridInstalled: "Your Grid is upgraded. Check how much Electricity actually travels through it; another stage may still be limiting your Lights."
        },
        lessons: {
            lightingTitle: "GENERATION 3 · LIGHTING EFFICIENCY",
            lightingExample: "Same 2 Electricity; different lighting",
            basic: "Basic Lighting", led: "LED Lighting", heat: "counted heat loss",
            extra: "An extra Light is possible only if at least two Electricity reach Lighting and no other limit prevents it.",
            lightingResult: "Your Lighting received {electricity} Electricity and supplied {lights} Lights, with {heat} counted lighting-heat loss.",
            ledAlready: "LED Lighting is already installed in your system. Compare its output with Basic Lighting below.",
            ledPossible: "You can explore LED Lighting in Build. It uses less Electricity for the same lighting service in this model.",
            physicalNote: "Lights are game lighting-service points, not units of energy. Real LED lamps still give off heat; zero here is a simplified game assumption.",
            gridTitle: "GENERATION 4 · GRID CAPACITY",
            gridResult: "Your Grid capacity was {capacity} Electricity; Lighting used {used} Electricity.",
            gridLimited: "Your available Electricity exceeded the Grid capacity, and the plan used its full capacity. The Grid restricted this result.",
            gridNotLimited: "This result does not prove that the Grid was the limiting stage. Compare generation and Lighting too.",
            gridTakeaway: "A Grid Upgrade raises transport from three to four Electricity. To power four Lights, you also need sufficient generation and efficient Lighting. Unused Electricity isn't automatically heat loss."
        },
        setup: {
            title: "Choose your starting region and project",
            description: "Every region begins with a fuel plant, a basic Grid and basic Lighting. Your Founding Project makes one future Build cheaper; it is not built yet.",
            foundingHint: "Choose which project gets a one-time material discount. Building still takes one action.",
            discountExplanation: "Your Founding Project gives a one-time material discount. Build the technology later using one Development action.",
            guideName: "In-game guide",
            guideDescription: "Highlights the controls when you first need them. You choose what to build.",
            autoCapability: "Your starting support is assigned automatically.",
            foundingReminder: "The project is not built yet. Its discounted material cost applies when you build it, using one Development action. No materials are spent now."
        },
        buildIntro: "Each build uses one Development action. Costs appear on the cards.",
        historyLabel: "Lights through the Generations",
        buildGuideHeading: "The next Light is your goal",
        buildGuideBody: "Explore the technologies. Building a project changes your system; Lights are counted only after you run your Energy Plan.",
        buildMenuTitle: "Explore what you can build",
        buildMenuBody: "Select any project. The cards show costs and what part of your system each project changes. Your Founding discount is included.",
        firstBuildTitle: "What will you build?",
        firstBuildBody: "Open Build to explore the projects. You can also Gather materials first.",
        builtTitle: "See what changed",
        builtBody: "One Development action was used. Look at your energy system; the result in Lights comes when you run your Energy Plan.",
        buildStageLabel: "CHANGES",
        buildStatusReady: "Ready to build",
        buildStatusBlocked: "Not available yet",
        buildCostAction: "1 action",
        warehouseLabel: "Your materials",
        warehouseOther: "Other",
        warehouseCritical: "Critical",
        foundingDiscount: "Founding discount applied",
        cardDetails: "How it works and what you need",
        scientificBackground: "Scientific background",
        builtListLabel: "Already built",
        noProjectsRemaining: "You've built every project available in Beginner Mode.",
        introBadge: "FIRST BUILD",
        development: {
            actionsLeft: "actions left",
            required: "Need",
            potential: "Potential (not delivered)",
            statusReady: "Within reach",
            statusLimited: "Check the system",
            finish: "Go to Energy Plan",
            finishHint: "Done building or gathering? Move on to see how much Light your system can supply.",
            changesTitle: "What you've done",
            changesEmpty: "Your gathering and building will appear here.",
            limitingStage: "What's limiting the system?",
            replayTutorial: "Show first Build guide"
        },
        dispatch: {
            projected: "POSSIBLE RESULT · NOT YET DELIVERED",
            heading: "Your Energy Plan",
            explanation: "Here's what your system could supply in today's conditions. See the energy flow, then decide when to run it.",
            confirm: "Run Energy Plan",
            projectedLight: "Potential Lights",
            moreDetails: "How Electricity reaches your Lights"
        },
        review: {
            title: "How many Lights came on?",
            met: "You powered the Lights your town needed.",
            missed: "Not enough Lights this time. Which stage limited your system?",
            continue: "Next Generation",
            finish: "See your four-Generation story"
        },
        projects: {
            basicSolar: { stage: "Electricity", short: "Adds solar Electricity. Output changes with the weather.", after: "Solar is installed. Its output depends on the weather when you run the Energy Plan." },
            basicWind: { stage: "Electricity", short: "Adds wind Electricity. Output changes with the weather.", after: "Wind is installed. Its output depends on the weather when you run the Energy Plan." },
            basicReservoir: { stage: "Electricity", short: "Adds hydro Electricity from available water.", after: "Hydro is installed. See how much water-powered Electricity your next plan can use." },
            basicBiomassPlant: { stage: "Electricity", short: "Generates Electricity by using stored Biomass fuel.", after: "Biomass generation is installed. It needs Biomass fuel when operated." },
            combinedCycle: { stage: "Conversion", short: "Gets more Electricity from fuel by recovering some generation heat.", after: "Your fuel system can now recover more useful Electricity from its fuel." },
            gridUpgrade: { stage: "Grid", short: "Lets more Electricity travel through your Grid.", after: "Your Grid can carry more Electricity, but it doesn't generate any on its own." },
            efficientLighting: { stage: "Lighting", short: "Provides more lighting service from the same Electricity.", after: "Your Lighting can provide more Light for the Electricity it receives." }
        },
        // A5.45: Edit every Loss Ledger label here. The totals come from the engine.
        lossAnimation: {
            aria: "Animated System Loss Ledger",
            eyebrow: "WHERE THE LOST ENERGY GOES",
            heading: "Your Loss Ledger",
            thisGeneration: "This Generation",
            gameTotal: "Game total",
            categories: {
                fuelSupply: "Fuel supply", generationHeat: "Generation heat",
                storageHeat: "Storage heat", lightingHeat: "Lighting heat", other: "Other loss"
            },
            lostShort: "loss", unusedShort: "unused",
            unusedLabel: "Unused Electricity",
            unusedNote: "Tracked separately · not counted in the tiebreaker",
            firstGeneration: "The challenge: meet demand in as many Generations as you can. If players tie, the one with the fewest total System Loss points wins that tiebreaker. These losses carry forward to Generation 4.",
            laterGenerations: "These losses add to your score from earlier Generations. If demand records tie, fewer total System Loss points ranks higher.",
            unitNote: "Counts are simplified Sunpaths game-loss units, not measured heat or electricity. Unused electricity does not enter System Loss.",
            finalTitle: "Final standings · four Generations",
            finalRule: "Meet more Light targets to rank higher. When demand records tie, the player with less total System Loss ranks higher.",
            finalFootnote: "Columns: rank · player · targets met · counted System Loss. Further ties use Total Light, then usable stored energy."
        },
        // A5.40: Edit every visible sentence in the interactive review below.
        flow: {
            aria: "Your confirmed energy journey",
            eyebrow: "FOLLOW THE ENERGY · ACTUAL RESULT",
            title: "Where did the energy go?",
            intro: "Watch your system deliver electricity to the lights. Select any stage to look closer.",
            replay: "Replay", pause: "Pause", play: "Play", showAll: "Show result", next: "Next step →",
            step: "Step", of: "of", inspect: "Explore this stage", starting: "Following your energy…",
            trackAria: "Four steps from source energy to lighting",
            energyUnit: "source energy", electricityUnit: "electricity", lightUnit: "Lights",
            stages: {source:"Source",electricity:"Electricity",grid:"Grid & use",lighting:"Lighting"},
            pathways: {solar:"Solar",wind:"Wind",hydro:"Hydro",biomass:"Biomass",fossil:"Fuel"},
            sourceIntro: "Your sources supplied this much normalised game energy:",
            sourceEmpty: "No source energy was recorded in this plan.",
            sourceNote: "Solar, wind and hydro begin at captured output. Sunlight, wind and water not captured are not recorded as losses.",
            electricityExplanation: "This is the electricity available after generation and any recovered storage. Fuel and biomass can lose energy as heat during conversion.",
            electricityNote: "These are recorded game losses, not an exact physical power-station efficiency model.",
            gridIntro: "This is the Electricity recorded as reaching Lighting. The Grid has a capacity limit, so not everything produced necessarily reaches this stage.",
            gridNote: "The Grid limits how much can pass; it does not remove a whole bar as heat. Unused electricity can also reflect limits elsewhere.",
            lightsOf: "Lights supplied out of", lightsNeeded: "needed",
            lightNote: "Lights measure lighting service, not energy. Lighting heat is a simplified inefficiency penalty, not electricity subtracted from Light points.",
            losses: {fuelSupply:"fuel-supply loss",generationHeat:"generation heat",storageHeat:"storage heat",other:"other counted loss",curtailed:"unused/curtailed electricity",lightingHeat:"lighting heat"},
            met: "The town's Light target was met!", missed: "Some Lights are still out.",
            metPrompt: "What would help you supply more Lights as the town grows?",
            missedPrompt: "Explore the stages above to see where you might improve the system next."
        },
        flowPreview: {
            hint: "Follow a step", message: "Explore the energy stages above. Choose one to discover how it works.",
            pending: "This is a preview. Your actual result is confirmed when you run the Energy Plan.",
            fullDetails: "See detailed numbers",
            close: "Close", source: "Your sources capture electricity or convert fuel into it. The amount depends on installed plants and current conditions.",
            electricity: "Fuel and biomass conversion may lose some source energy as heat before electricity is available.",
            grid: "Your grid sets a maximum throughput. Extra electricity might be unused; unused electricity is not automatically a heat loss.",
            lighting: "Electricity reaching Lighting becomes a number of Lights. Basic and efficient lighting provide different service for the same electricity."
        },
        // Introductory story prompts shown at the phase boundary, not every click.
        beginning: ["One Light to power", "Your inherited fuel plant is ready. What will you do before running your first plan?"],
        development2: ["The town is growing", "Two Lights now. Check last Generation's result and choose your next moves."],
        development3: ["Lighting can waste Electricity", "See how the Lighting stage can produce more Lights from the same Electricity."],
        development4: ["The Grid has a limit", "Check whether enough Electricity can pass through your Grid to supply four Lights."],
        dispatch1: ["Run your first Energy Plan", "Follow Electricity from your sources, through the Grid, and into Lighting."],
        dispatch2: ["Check your new plan", "Look at the possible Lights before you run it. What has changed since Generation 1?"],
        dispatch3: ["Follow the chain", "How much Electricity does your Grid carry, and how much Light can it become?"],
        dispatch4: ["One final plan", "Follow the whole energy chain before you run your last plan."],
        review1: ["Your first result", "Did your system supply one Light? Open the energy-flow details to see why."],
        review2: ["Two-Light result", "Compare the Lights delivered with the two your town needed."],
        review3: ["Three-Light result", "See how your Lighting used Electricity—and how much was counted as heat."],
        review4: ["Your four-Generation story", "Was the Grid able to carry enough Electricity for your final Light target?"]
    },
    intermediate: {
        buildIntro: "Choose an energy pathway or system upgrade. Costs and requirements appear on each card."
    },
    master: {
        buildIntro: "Choose an energy pathway or system upgrade. Costs and requirements appear on each card."
    }
};
