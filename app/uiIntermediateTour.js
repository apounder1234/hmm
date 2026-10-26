// Intermediate teaches only what Beginner did not: map layers, regional supply,
// weather, conditions, Knowledge and the public market. No engine mutations.
import { uiShared } from "./uiShared.js?v=a5.62.0";
import { useMissionTarget } from "./uiMissionTour.js?v=a5.62.0";
const { h } = uiShared;
export const INTERMEDIATE_STEPS = [
    { title: "A bigger world", text: "The same continents, now with different strengths. Switch map layers to explore.", target: ".sp-map-controls__layers" },
    { title: "Resources are regional", text: "Check your continent's supplies. Gathering yields and stock can now differ.", target: "#sunpaths-resource-dock" },
    { title: "Plan around weather", text: "Current weather changes renewable output. The forecast helps you prepare for the next Generation.", target: ".focus-weather.forecast" },
    { title: "Local conditions matter", text: "A Local Condition may help or constrain your system. You can inspect its effect before acting.", target: ".focus-condition", fallback: ".focus-weather.current" },
    { title: "Knowledge unlocks technology", text: "Use Learn to reach higher technology requirements.", target: ".knowledge-board", fallback: "#sunpaths-development-actions" },
    { title: "The World Market", text: "Trade surplus materials for what your region lacks.", target: ".trade-mode-card", fallback: "#sunpaths-development-actions" }
];
export function IntermediateTour({ step, onNext, onBack, onSkip }) {
    const cue = INTERMEDIATE_STEPS[step];
    useMissionTarget(cue?.target, cue?.fallback);
    if (!cue) return null;
    return h("aside", { className: "sunpaths-mission-tour", role: "region", "aria-label": "Intermediate in-game mission", "data-intermediate-step": step },
        h("header", null, h("small", null, `INTERMEDIATE · ${step + 1} / ${INTERMEDIATE_STEPS.length}`), h("span", null, "✦")),
        h("strong", { className: "sunpaths-mission-tour__title" }, cue.title),
        h("p", null, cue.text),
        h("div", { className: "sunpaths-mission-tour__controls" },
            step ? h("button", {type:"button", onClick:onBack}, "← Back") : null,
            h("button", {type:"button", className:"is-primary", onClick:onNext}, step === INTERMEDIATE_STEPS.length - 1 ? "Play →" : "Next →"),
            h("button", {type:"button", className:"is-skip", onClick:onSkip}, "Skip tour")
        )
    );
}
