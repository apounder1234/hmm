// A5.41 — Short story cues for meaningful Beginner milestones, not every phase.
// Wording is editable in gameText.js. No game rules are mutated here.
import { gameText } from "./gameText.js?v=a5.50.0";
export function getOnboardingCue(game) {
    if (game.uiMode === "strategy" || !game.generation || game.phase === "game.complete") return null;
    const intro = game.gameMode === "beginner" && game.config.rules.generations === 4;
    const g = game.generation;
    const phase = game.phase;
    const b = gameText.beginner;
    // The first Development action has its own real spotlight in uiGame.js.
    const cues = intro ? {
        "1:dispatch": [...b.dispatch1, "Energy Plan", "#sunpaths-dispatch-panel"],
        "1:review": [...b.review1, "Generation Review", "#sunpaths-review-panel"],
        "2:development": [b.tutorial.growthTitle, b.tutorial.growth, "Light demand", ".focus-goal"],
        "3:development": [b.tutorial.lightingTitle, b.tutorial.lighting, "Lighting stage", ".sp-energy-chain__stage.stage-lighting"],
        "4:development": [b.tutorial.gridTitle, b.tutorial.grid, "Grid stage", ".sp-energy-chain__stage.stage-grid"]
    } : game.gameMode === "intermediate" ? {
        "1:development": ["New: Knowledge and Local Conditions", "Some projects require Knowledge. Local Conditions can affect this Generation; the World Market can provide materials.", "Development controls", "#sunpaths-development-actions"]
    } : game.gameMode === "master" ? {
        "1:development": ["New: global strategy", "Master adds advanced projects, trade and the Energy Summit.", "Development controls", "#sunpaths-development-actions"],
        "3:development": ["Global Events", "Events may affect several regions. Check the current event before choosing your actions.", "Current conditions", ".focus-strip"]
    } : {};
    const cue = cues[`${g}:${phase.split(".").pop()}`];
    if (!cue) return null;
    const id = `${intro ? "story" : "concept"}:${g}:${phase}`;
    if ((game.uiHintsSeen ?? []).includes(id) || (intro && (game.uiHintsSeen ?? []).includes("beginner:guide-skipped"))) return null;
    // Refer to the player's actual previous or current result. No strategy is recommended.
    let contextualBody = cue[1];
    if (intro) {
        const player = Object.values(game.players).find(item => item.controller.kind === "human") ?? Object.values(game.players)[0];
        const previous = phase === "generation.development" && g > 1 ? g - 1
            : phase === "generation.review" ? g : null;
        const light = previous === null ? null : player?.lightByGeneration?.[previous];
        if (g === 3 && phase === "generation.development" && player?.installed.some(item => item.technologyId === "efficientLighting"))
            contextualBody = b.tutorial.lightingInstalled;
        if (g === 4 && phase === "generation.development" && player?.installed.some(item => item.technologyId === "gridUpgrade"))
            contextualBody = b.tutorial.gridInstalled;
        if (typeof light === "number" && g === 2)
            contextualBody = `You supplied ${light} Light${light === 1 ? "" : "s"} in Generation ${previous}. ${contextualBody}`;
    }
    return { id, title: cue[0], body: contextualBody, targetLabel: cue[2], targetSelector: cue[3], category: intro ? `CHAPTER ${g} OF 4` : "NEW GAME CONCEPT" };
}

// One first-Generation journey. Spotlights track what the player has actually opened/built.
export function getBeginnerFirstBuildCue(game, {menuOpen = false, builtId = null} = {}) {
    if (game.gameMode !== "beginner" || game.config.rules.generations !== 4 || game.generation !== 1 || game.phase !== "generation.development") return null;
    const seen = new Set(game.uiHintsSeen ?? []);
    if (game.uiMode === "strategy" || seen.has("beginner:guide-skipped") || !seen.has("beginner:welcome")) return null;
    const b = gameText.beginner;
    if (builtId && !seen.has("beginner:build-completed"))
        return {id:"beginner:build-completed",title:b.builtTitle,body:`${b.projects[builtId]?.after || ""} ${b.builtBody}`.trim(),targetSelector:"#sunpaths-player-energy"};
    if (menuOpen && !seen.has("beginner:build-catalogue"))
        return {id:"beginner:build-catalogue",title:b.buildMenuTitle,body:b.buildMenuBody,targetSelector:"#sunpaths-build-intro"};
    if (!seen.has("beginner:objective"))
        return {id:"beginner:objective",title:b.tutorial.objectiveTitle,body:b.tutorial.objective,targetSelector:".focus-goal"};
    if (!seen.has("beginner:system"))
        return {id:"beginner:system",title:b.tutorial.systemTitle,body:b.tutorial.system,targetSelector:"#sunpaths-player-energy"};
    if (!menuOpen && !builtId && !seen.has("beginner:open-build"))
        return {id:"beginner:open-build",title:b.firstBuildTitle,body:b.firstBuildBody,targetSelector:"#sunpaths-build-tab"};
    return null;
}
