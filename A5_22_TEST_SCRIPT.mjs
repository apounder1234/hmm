import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { defaultConfig, validateConfig } from "./app/config.js";
import { createModeConfig, featureEnabled, gameModes, modeAllowsTechnology } from "./app/modes.js";
import { runAutomatedGame } from "./app/simulation.js";
import { serializeGame, deserializeGame } from "./app/engine.js";

const report = [];
const check = (name, fn) => {
    fn();
    report.push(`PASS  ${name}`);
};

check("All three central modes are defined", () => {
    assert.deepEqual(Object.keys(gameModes), ["beginner", "intermediate", "master"]);
});

for (const mode of Object.keys(gameModes)) {
    check(`${mode} configuration validates`, () => {
        const errors = validateConfig(createModeConfig(defaultConfig, mode));
        assert.deepEqual(errors, []);
    });
}

check("Beginner removes only later layers", () => {
    const config = createModeConfig(defaultConfig, "beginner");
    assert.equal(config.trade.directEnabled, false);
    assert.equal(config.trade.publicImportEnabled, false);
    assert.equal(featureEnabled(config, "knowledgeRequirements"), false);
    assert.equal(featureEnabled(config, "localConditions"), false);
    assert.equal(featureEnabled(config, "globalEvents"), false);
    assert.equal(featureEnabled(config, "forecastVisible"), false);
    assert.equal(featureEnabled(config, "fullRegionalRules"), false);
    assert.equal(modeAllowsTechnology(config, config.technologies.find(t => t.id === "gridUpgrade")), true);
    assert.equal(modeAllowsTechnology(config, config.technologies.find(t => t.id === "smartGrid")), false);
});

check("Intermediate adds reliability systems without Master-only layers", () => {
    const config = createModeConfig(defaultConfig, "intermediate");
    assert.equal(config.trade.directEnabled, false);
    assert.equal(config.trade.publicImportEnabled, true);
    assert.equal(featureEnabled(config, "knowledgeRequirements"), true);
    assert.equal(featureEnabled(config, "localConditions"), true);
    assert.equal(featureEnabled(config, "globalEvents"), false);
    assert.equal(featureEnabled(config, "forecastVisible"), true);
    assert.equal(modeAllowsTechnology(config, config.technologies.find(t => t.id === "gridUpgrade")), true);
    assert.equal(modeAllowsTechnology(config, config.technologies.find(t => t.id === "smartGrid")), false);
});

check("Master retains the complete Phase 3 layer", () => {
    const config = createModeConfig(defaultConfig, "master");
    assert.equal(config.trade.directEnabled, true);
    assert.equal(config.trade.publicImportEnabled, true);
    assert.equal(config.opening.defaultMode, "energySummit");
    assert.equal(featureEnabled(config, "globalEvents"), true);
    assert.equal(modeAllowsTechnology(config, config.technologies.find(t => t.id === "smartGrid")), true);
});

check("Master mode is deterministic against the unchanged default rules", () => {
    const seed = "A5.22-master-equivalence";
    const before = runAutomatedGame(structuredClone(defaultConfig), seed);
    const after = runAutomatedGame(createModeConfig(defaultConfig, "master"), seed);
    const simplify = game => ({
        weather: game.weather.history,
        results: game.results,
        players: Object.fromEntries(Object.entries(game.players).map(([id, player]) => [id, {
            light: player.lightByGeneration,
            reliability: player.reliabilityByGeneration,
            installed: player.installed.map(item => item.technologyId),
            knowledge: player.knowledge,
            resources: player.resources
        }]))
    });
    assert.deepEqual(simplify(after), simplify(before));
});

for (const mode of Object.keys(gameModes)) {
    check(`${mode} completes 20 full eight-Generation games`, () => {
        const config = createModeConfig(defaultConfig, mode);
        for (let index = 0; index < 20; index++) {
            const game = runAutomatedGame(config, `A5.22-${mode}-${index}`);
            assert.equal(game.completed, true);
            assert.equal(game.generation, 8);
            assert.equal(game.gameMode, mode);
            assert.ok(game.results?.length === 6);
            const built = Object.values(game.players).flatMap(player => player.installed.map(item => config.technologies.find(t => t.id === item.technologyId)));
            assert.ok(built.every(technology => modeAllowsTechnology(game, technology)));
            if (mode === "beginner") {
                assert.equal(game.log.some(event => event.type === "condition.drawn"), false);
                assert.equal(game.log.some(event => event.type === "globalEvent.drawn"), false);
                assert.equal(game.log.some(event => event.type === "action.research"), false);
                assert.equal(game.log.some(event => event.type === "trade.completed"), false);
                assert.equal(game.log.some(event => event.type === "action.worldMarket"), false);
            }
            if (mode === "intermediate") {
                assert.equal(game.log.some(event => event.type === "globalEvent.drawn"), false);
                assert.equal(game.log.some(event => event.type === "trade.completed"), false);
            }
            if (mode === "master")
                assert.equal(game.log.filter(event => event.type === "globalEvent.drawn").length, 3);
        }
    });
}

check("Save and load preserve each selected mode", () => {
    for (const mode of Object.keys(gameModes)) {
        const game = runAutomatedGame(createModeConfig(defaultConfig, mode), `A5.22-save-${mode}`);
        const loaded = deserializeGame(serializeGame(game));
        assert.equal(loaded.gameMode, mode);
        assert.equal(loaded.config.gameMode.id, mode);
        assert.equal(loaded.config.trade.directEnabled, game.config.trade.directEnabled);
        assert.equal(loaded.config.trade.publicImportEnabled, game.config.trade.publicImportEnabled);
    }
});

check("The interface exposes mode selection and does not duplicate engines", () => {
    const setup = fs.readFileSync("./app/uiSetup.js", "utf8");
    const ui = fs.readFileSync("./app/ui.js", "utf8");
    assert.match(setup, /function ModeSelection/);
    assert.match(ui, /screen === "mode"/);
    assert.equal(fs.existsSync("./app/beginnerEngine.js"), false);
    assert.equal(fs.existsSync("./app/intermediateEngine.js"), false);
    assert.equal(fs.existsSync("./app/masterEngine.js"), false);
});

check("Removed knowledge-borrowing mechanic is not reintroduced", () => {
    const forbidden = /borrowKnowledge|knowledgeBorrow|borrowedKnowledge|knowledgeLoan|freeKnowledge|lenderRegion/i;
    for (const file of fs.readdirSync("./app").filter(name => name.endsWith(".js"))) {
        const source = fs.readFileSync(path.join("./app", file), "utf8");
        assert.doesNotMatch(source, forbidden, file);
    }
});

console.log(report.join("\n"));
console.log(`TOTAL ${report.length}/${report.length} PASS`);
