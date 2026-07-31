// @ts-nocheck
import { uiShared } from "./uiShared.js?v=a5.22.27";
import { StartScreen, ModeSelection, SetupScreen } from "./uiSetup.js?v=a5.22.27";
import { GameScreen } from "./uiGame.js?v=a5.22.27";
import { CardsScreen, RulesScreen, SimulationLab } from "./uiReference.js?v=a5.22.27";
const { React, useEffect, useState, createRoot, defaultConfig, createGame, applyCommand, aiPrepared, deserializeGame, serializeGame, clone, makeParticipants, newRandomSeed, createModeConfig, getGameMode, modeOpeningMode, defaultCapabilityForPathway, featureEnabled, h, button } = uiShared;
class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error) { return { error }; }
    componentDidCatch(error, info) { console.error("SUNPATHS browser error", error, info); }
    render() {
        if (!this.state.error)
            return this.props.children;
        return h("main", { className: "crash-screen" }, h("p", { className: "eyebrow" }, "The interface hit an unexpected state"), h("h1", null, "SUNPATHS did not go blank"), h("p", null, "The error is shown here so it can be reported and repaired. Reloading returns to the start screen, where Recover last game restores the latest valid autosave when browser storage is available."), h("pre", null, String(this.state.error?.stack || this.state.error?.message || this.state.error)), h("div", { className: "form-row" }, button("Reload game", () => window.location.reload(), { kind: "primary" })));
    }
}
function App() {
    const [screen, setScreen] = useState("start");
    const [config, setConfig] = useState(() => clone(defaultConfig));
    const [participants, setParticipants] = useState(() => makeParticipants(defaultConfig));
    const [seed, setSeed] = useState(() => newRandomSeed());
    const [game, setGame] = useState(null);
    const [debugMode, setDebugMode] = useState(false);
    const [playMode, setPlayMode] = useState("guided");
    const [openingMode, setOpeningMode] = useState("energySummit");
    const [gameMode, setGameMode] = useState("beginner");
    const [fatal, setFatal] = useState("");
    const recoveryKey = "sunpaths-phase2-recovery";
    const [hasRecovery, setHasRecovery] = useState(() => {
        try {
            return Boolean(globalThis.localStorage?.getItem(recoveryKey));
        }
        catch {
            return false;
        }
    });
    useEffect(() => {
        if (!game)
            return;
        try {
            globalThis.localStorage?.setItem(recoveryKey, serializeGame(game));
            setHasRecovery(true);
        }
        catch { /* Browser storage is optional; manual save still works. */ }
    }, [game]);
    const recoverGame = () => {
        try {
            const raw = globalThis.localStorage?.getItem(recoveryKey);
            if (!raw)
                throw new Error("No recoverable game was found.");
            const state = deserializeGame(raw);
            if (!state.uiMode)
                state.uiMode = "guided";
            setGameMode(state.gameMode ?? state.config?.gameMode?.id ?? "master");
            setGame(state);
            setScreen("game");
            setFatal("");
        }
        catch (error) {
            try {
                globalThis.localStorage?.removeItem(recoveryKey);
            }
            catch { }
            setHasRecovery(false);
            setFatal(error.message);
        }
    };
    const createPlayableState = ({ participantList = participants, selectedSeed = seed, selectedDebugMode = debugMode, selectedOpeningMode = openingMode, selectedPlayMode = playMode, selectedGameMode = gameMode } = {}) => {
        const modeConfig = createModeConfig(config, selectedGameMode);
        const active = participantList.filter(player => player.included);
        const setups = active.map((entry, index) => ({
            id: `p${index + 1}`,
            name: entry.name || modeConfig.continents.find(continent => continent.id === entry.continentId).name,
            continentId: entry.continentId,
            controller: entry.controller === "human"
                ? { kind: "human" }
                : { kind: "ai", strategy: entry.strategy, difficulty: entry.difficulty }
        }));
        const actualSeed = String(selectedSeed || "").trim() || newRandomSeed();
        const actualOpeningMode = modeOpeningMode(selectedGameMode, selectedOpeningMode);
        const state = createGame(modeConfig, setups, actualSeed, { debugMode: selectedDebugMode, openingMode: actualOpeningMode, gameMode: selectedGameMode });
        state.uiMode = selectedPlayMode;
        for (const player of Object.values(state.players)) {
            if (player.controller.kind === "ai") {
                const prepared = aiPrepared(player.controller.strategy, state, player);
                const capabilityId = featureEnabled(state, "preparedCapabilityChoice") ? prepared.capabilityId : defaultCapabilityForPathway(prepared.pathwayId);
                applyCommand(state, { type: "selectPrepared", playerId: player.id, pathwayId: prepared.pathwayId, capabilityId });
            }
        }
        return { state, actualSeed };
    };
    const startGame = () => {
        try {
            const { state, actualSeed } = createPlayableState();
            setSeed(actualSeed);
            setGame(state);
            setScreen("game");
            setFatal("");
        }
        catch (error) {
            setFatal(error.message);
        }
    };
    const startRecommendedGame = () => {
        try {
            const recommendedParticipants = makeParticipants(config).map(entry => ({
                ...entry,
                included: true,
                controller: entry.continentId === "europe" ? "human" : "ai",
                name: entry.continentId === "europe" ? "Player" : config.continents.find(continent => continent.id === entry.continentId).name
            }));
            const recommendedSeed = newRandomSeed();
            const { state } = createPlayableState({
                participantList: recommendedParticipants,
                selectedSeed: recommendedSeed,
                selectedDebugMode: false,
                selectedOpeningMode: "startingPlan",
                selectedPlayMode: "guided",
                selectedGameMode: "beginner"
            });
            setParticipants(recommendedParticipants);
            setSeed(recommendedSeed);
            setDebugMode(false);
            setGameMode("beginner");
            setOpeningMode("startingPlan");
            setPlayMode("guided");
            setGame(state);
            setScreen("game");
            setFatal("");
        }
        catch (error) {
            setFatal(error.message);
        }
    };
    const loadFile = event => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const state = deserializeGame(String(reader.result));
                if (!state.uiMode)
                    state.uiMode = "guided";
                setGameMode(state.gameMode ?? state.config?.gameMode?.id ?? "master");
                setGame(state);
                setScreen("game");
                setFatal("");
            }
            catch (e) {
                setFatal(e.message);
            }
        };
        reader.readAsText(file);
        event.target.value = "";
    };
    const home = () => { setScreen("start"); setGame(null); };
    const chooseGameMode = id => {
        const definition = getGameMode(id);
        setGameMode(definition.id);
        setOpeningMode(definition.openingMode);
        setParticipants(makeParticipants(config));
        setSeed(newRandomSeed());
        setScreen("setup");
    };
    const setupConfig = createModeConfig(config, gameMode);
    return h(React.Fragment, null,
        fatal ? h("div", { className: "fatal-banner" }, fatal, button("Dismiss", () => setFatal(""), { kind: "ghost" })) : null,
        screen === "start" ? h(StartScreen, { onNew: () => setScreen("mode"), onRecommended: startRecommendedGame, onLoad: loadFile, onRecover: recoverGame, hasRecovery, onCards: () => setScreen("cards"), onRules: () => setScreen("rules"), onSimulation: () => setScreen("simulation") }) : null,
        screen === "mode" ? h(ModeSelection, { onSelect: chooseGameMode, onBack: () => setScreen("start") }) : null,
        screen === "setup" ? h(SetupScreen, { config: setupConfig, gameMode, participants, setParticipants, seed, setSeed, debugMode, setDebugMode, playMode, setPlayMode, openingMode, setOpeningMode, onNewSeed: () => setSeed(newRandomSeed()), onStart: startGame, onBack: () => setScreen("mode") }) : null,
        screen === "simulation" ? h(SimulationLab, { config, onBack: () => setScreen("start") }) : null,
        screen === "cards" ? h(CardsScreen, { config: game?.config ?? config, game, onBack: () => setScreen(game ? "game" : "start") }) : null,
        screen === "rules" ? h(RulesScreen, { config: game?.config ?? config, setConfig, onBack: () => setScreen(game ? "game" : "start") }) : null,
        screen === "game" && game ? h(GameScreen, { game, setGame, onHome: home, onCards: () => setScreen("cards"), onRules: () => setScreen("rules"), onLoad: loadFile }) : null
    );
}
createRoot(document.getElementById("root")).render(h(AppErrorBoundary, null, h(App)));
globalThis.__sunpathsAppStarted = true;

