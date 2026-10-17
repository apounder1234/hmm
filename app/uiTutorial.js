// A5.36: content-only onboarding. Never choose a technology or mutate game rules.
// Cues are triggered by phases, not a forced sequence of button clicks.
export function getOnboardingCue(game) {
    if (game.uiMode === "strategy" || !game.generation || game.phase === "game.complete")
        return null;
    const intro = game.gameMode === "beginner" && game.config.rules.generations === 4;
    const g = game.generation;
    const phase = game.phase;
    const cues = intro ? {
        "1:development": ["A community needs its first Light", "Your existing fuel plant can provide electricity. You have three Development actions: Gather resources or Build an improvement before choosing your Energy plan.", "Development controls", "#sunpaths-development-actions"],
        "1:dispatch": ["From Energy to Light", "Electricity must pass through the Grid and Lighting before it supplies useful Light. This plan is only a projection; you decide when to confirm it.", "Energy plan", "#sunpaths-dispatch-panel"],
        "1:review": ["Did the lights come on?", "Compare the Light actually delivered with the demand. If you missed it, you can keep learning and try a different approach next Generation.", "Generation Review", "#sunpaths-review-panel"],
        "2:development": ["Your community grows", "This time the community needs 2 Light. Only seven projects are available: five ways to produce Electricity, Grid Upgrade and LED Lighting. These are your choices; no technology is recommended.", "Gather / Build", "#sunpaths-development-actions"],
        "3:development": ["Small changes add up", "Demand is now 3 Light. Generation, Grid capacity and Lighting all affect Light. Grid Upgrade raises the limit to four Electricity; LED Lighting lets four Electricity provide four Light. You still choose the generation pathway.", "Energy system", ".player-board"],
        "4:development": ["The final challenge", "The community now needs 4 Light. You have three Development actions to prepare before Dispatch. Remember: enough Electricity, Grid transport and efficient Lighting are all needed. You decide what to build.", "Development controls", "#sunpaths-development-actions"],
        "4:review": ["Your first system is complete", "You have tested four Light targets. Your final introduction result is how many demands you met, not Reliability Points. After the review, discover what Intermediate adds.", "Generation Review", "#sunpaths-review-panel"]
    } : game.gameMode === "intermediate" ? {
        "1:development": ["New concepts: Knowledge and Local Conditions", "You now need Knowledge for some technologies. Local Conditions can alter operations for one Generation, and the World Market can help obtain materials. Your Build choices remain yours.", "Development controls", "#sunpaths-development-actions"]
    } : game.gameMode === "master" ? {
        "1:development": ["New concepts: global strategy", "Master adds advanced technologies, direct trade and the Energy Summit to Knowledge and Local Conditions. These tools offer choices, not a recommended pathway.", "Development controls", "#sunpaths-development-actions"],
        "3:development": ["New concept: Global Events", "Events can disrupt multiple regions, including domestic fuel infrastructure. Check the current event before deciding how to respond.", "Current conditions", ".focus-strip"]
    } : {};
    const cue = cues[`${g}:${phase.split(".").pop()}`];
    if (!cue) return null;
    const id = `${intro ? "story" : "concept"}:${g}:${phase}`;
    if ((game.uiHintsSeen ?? []).includes(id)) return null;
    return { id, title: cue[0], body: cue[1], targetLabel: cue[2], targetSelector: cue[3], category: intro ? `CHAPTER ${g} OF 4` : "NEW GAME CONCEPT" };
}
