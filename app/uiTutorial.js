// A5.41 — Short story cues for meaningful Beginner milestones, not every phase.
// Wording is editable in gameText.js. No game rules are mutated here.
import { gameText } from "./gameText.js?v=a5.52.0";
export function getOnboardingCue(game) {
    if (game.uiMode === "strategy" || !game.generation || game.phase === "game.complete") return null;
    // Beginner uses one persistent chapter coach instead of five competing popups.
    if (game.gameMode === "beginner" && game.config.rules.generations === 4) return null;
    const cues = game.gameMode === "intermediate" ? {
        "1:development": ["New: Knowledge and Local Conditions", "Some projects require Knowledge. Local Conditions can affect this Generation; the World Market can provide materials.", "Development controls", "#sunpaths-development-actions"]
    } : game.gameMode === "master" ? {
        "1:development": ["New: global strategy", "Master adds advanced projects, trade and the Energy Summit.", "Development controls", "#sunpaths-development-actions"],
        "3:development": ["Global Events", "Events may affect several regions. Check the current event before choosing your actions.", "Current conditions", ".focus-strip"]
    } : {};
    const cue = cues[`${game.generation}:${game.phase.split(".").pop()}`];
    if (!cue) return null;
    const id = `concept:${game.generation}:${game.phase}`;
    if ((game.uiHintsSeen ?? []).includes(id)) return null;
    return {id, title:cue[0], body:cue[1], targetLabel:cue[2], targetSelector:cue[3], category:"NEW GAME CONCEPT"};
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
