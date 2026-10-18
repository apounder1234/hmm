// A5.40 — Original SUNPATHS Beginner Mode review animation.
// Uses confirmed dispatch data from getGenerationExplanation. Presentation only.
// No simulation actions, new physics assumptions or third-party game code.
import { uiShared } from "./uiShared.js?v=a5.44.0";
import { gameText } from "./gameText.js?v=a5.44.0";
const { h, React } = uiShared;
const { useState, useEffect } = React;

function safeNumber(value) { return Math.max(0, Number(value) || 0); }

export function getBeginnerFlowSteps(story) {
    const words = gameText.beginner.flow;
    const ledger = story.lossLedger ?? {};
    const fuel = safeNumber(ledger.fuelSupply);
    const heat = safeNumber(ledger.generationHeat);
    const storage = safeNumber(ledger.storageHeat);
    const other = safeNumber(ledger.other);
    const unused = safeNumber(ledger.curtailed);
    const lighting = safeNumber(ledger.lightingHeat);
    const sources = Object.entries(story.metrics?.grossEnergy ?? {})
        .filter(([,value]) => Number(value) > 0)
        .map(([id,value]) => `${words.pathways[id] || id}: ${value}`);
    return [
        {
            id: "source", icon: "◉", label: words.stages.source, value: safeNumber(story.generated), unit: words.energyUnit,
            explanation: sources.length ? `${words.sourceIntro} ${sources.join(" · ")}.` : words.sourceEmpty,
            chips: fuel ? [{value:fuel, label:words.losses.fuelSupply}] : [],
            footnote: words.sourceNote
        },
        {
            id: "electricity", icon: "⚡", label: words.stages.electricity, value: safeNumber(story.afterLosses), unit: words.electricityUnit,
            explanation: words.electricityExplanation,
            chips: [heat ? {value:heat,label:words.losses.generationHeat}:null, storage ? {value:storage,label:words.losses.storageHeat}:null, other ? {value:other,label:words.losses.other}:null].filter(Boolean),
            footnote: words.electricityNote
        },
        {
            id: "grid", icon: "⇢", label: words.stages.grid, value: safeNumber(story.deliveredEnergy), unit: words.electricityUnit,
            explanation: words.gridIntro,
            chips: unused ? [{value:unused,label:words.losses.curtailed}] : [],
            footnote: words.gridNote
        },
        {
            id: "lighting", icon: "💡", label: words.stages.lighting, value: safeNumber(story.lightProduced), unit: words.lightUnit,
            explanation: `${safeNumber(story.lightProduced)} ${words.lightsOf} ${safeNumber(story.requiredLight)} ${words.lightsNeeded}.`,
            chips: lighting ? [{value:lighting,label:words.losses.lightingHeat}] : [],
            footnote: words.lightNote
        }
    ];
}

function StagePips({ count, id, revealed }) {
    // Each dot is a game bar / Light point. Cap drawn dots but never cap printed values.
    const visible = Math.min(14, Math.floor(safeNumber(count)));
    return h("span", {className:`beginner-flow-pips type-${id} ${revealed ? "is-visible" : ""}`, "aria-hidden":"true"},
        ...Array.from({length:visible},(_,i)=>h("i",{key:i,style:{"--pip-index":i}}))
    );
}

/**
 * A replayable visualisation of *actual confirmed* Generation data.
 * No projected values are substituted; no automatic progression across Generations.
 */
export function BeginnerFlowStory({story, generation, hasLed = false, gridCapacity = null}) {
    const words = gameText.beginner.flow;
    const steps = getBeginnerFlowSteps(story);
    const [revealed, setRevealed] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [selected, setSelected] = useState(null);
    useEffect(() => {
        const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        setRevealed(reduceMotion ? 4 : 0);
        setPlaying(!reduceMotion);
        setSelected(null);
    }, [generation]);
    useEffect(() => {
        if (!playing || revealed >= 4) return undefined;
        const delay = revealed === 0 ? 750 : 1650;
        const timer = globalThis.setTimeout(() => setRevealed(step => Math.min(4, step + 1)), delay);
        return () => globalThis.clearTimeout(timer);
    }, [revealed, playing]);
    // Generation-specific learning sits AFTER the confirmed result, not over gameplay.
    const lesson = gameText.beginner.lessons;
    const format = (copy, values) => copy.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
    const lightingLoss = safeNumber(story.lossLedger?.lightingHeat);
    const gridUsed = safeNumber(story.deliveredEnergy);
    const gridLimit = Number.isFinite(gridCapacity) ? gridCapacity : null;
    const gridLimited = gridLimit !== null && story.afterLosses > gridLimit && gridUsed >= gridLimit;
    const complete = revealed === 4;
    const highlightedIndex = selected === null ? Math.max(0, revealed - 1) : selected;
    const current = steps[highlightedIndex];
    const replay = () => { setSelected(null); setRevealed(0); setPlaying(true); };
    const inspect = index => { setSelected(index); setRevealed(prev => Math.max(prev, index + 1)); setPlaying(false); };
    return h("section", { className:"beginner-flow", "aria-label":words.aria },
        h("header", {className:"beginner-flow__heading"},
            h("div", null, h("small",null,words.eyebrow),h("h4",null,words.title),h("p",null,words.intro)),
            h("div", {className:"beginner-flow__controls"},
                h("button", {type:"button",onClick:replay, className:"beginner-flow__control", "aria-label":words.replay}, "↻ ", words.replay),
                !complete ? h("button", {type:"button",className:"beginner-flow__control",onClick:()=>setPlaying(p=>!p)}, playing ? words.pause : words.play) : null,
                !complete ? h("button",{type:"button",className:"beginner-flow__control",onClick:()=>{setRevealed(4);setPlaying(false);setSelected(null)}},words.showAll) : null
            )
        ),
        h("div", {className:"beginner-flow__track",role:"group","aria-label":words.trackAria},
            ...steps.flatMap((step, index) => [
                h("button", {type:"button",key:step.id,
                    className:`beginner-flow__step step-${step.id} ${index < revealed ? "is-revealed" : "is-pending"} ${index === highlightedIndex && index < revealed ? "is-current" : ""}`,
                    onClick:()=>inspect(index),
                    "aria-label":`${step.label}: ${step.value} ${step.unit}. ${words.inspect}`,
                    "aria-pressed":selected===index,
                },
                    h("span", {className:"beginner-flow__step-icon","aria-hidden":"true"},step.icon),
                    h("span",{className:"beginner-flow__step-label"},step.label),
                    h("span", {className:"beginner-flow__step-value"},h("b",null,step.value),h("small",null,step.unit)),
                    h(StagePips,{count:step.value,id:step.id,revealed:index<revealed})
                ),
                ...(index < steps.length-1 ? [h("span",{key:`arrow-${step.id}`,className:`beginner-flow__arrow ${index+1<revealed?"is-active":""}`, "aria-hidden":"true"},"→")]:[])
            ])
        ),
        revealed > 0 ? h("div", {className:"beginner-flow__explanation","aria-live":"polite","aria-atomic":"true"},
            h("div", {className:"beginner-flow__explanation-head"},
                h("span",null,`${words.step} ${highlightedIndex+1} ${words.of} 4`),
                h("strong",null,current.label)),
            h("p",null,current.explanation),
            current.chips.length ? h("div",{className:"beginner-flow__chips"},...current.chips.map(chip=>
                h("span",{key:chip.label,className:"beginner-flow__loss-chip"},`↘ ${chip.value} ${chip.label}`))) : null,
            h("small",{className:"beginner-flow__footnote"},current.footnote),
            !complete ? h("button",{type:"button",className:"beginner-flow__next",onClick:()=>{setSelected(null);setPlaying(false);setRevealed(v=>Math.min(4,v+1));}},words.next) : null
        ) : h("p",{className:"beginner-flow__loading",role:"status"},words.starting),
        complete && generation === 3 ? h("aside",{className:"beginner-chapter-lesson", "aria-label":lesson.lightingTitle},
            h("strong",null,lesson.lightingTitle),
            h("p",null,format(lesson.lightingResult,{electricity:gridUsed, lights:story.lightProduced,heat:lightingLoss})),
            h("p",null,hasLed ? lesson.ledAlready : lesson.ledPossible),
            h("small",null,lesson.lightingExample),
            h("div",{className:"beginner-lighting-compare"},
                ...[[lesson.basic,"1 💡","1 ♨"],[lesson.led,"2 💡","0 ♨"]].map(([name,lights,heat])=>
                    h("div",{key:name},h("strong",null,name),h("span",null,lights),h("small",null,`${heat} ${lesson.heat}`)))),
            h("p",null,lesson.extra),h("small",null,lesson.physicalNote)
        ):null,
        complete && generation === 4 ? h("aside",{className:"beginner-chapter-lesson", "aria-label":lesson.gridTitle},
            h("strong",null,lesson.gridTitle),
            h("p",null,format(lesson.gridResult,{capacity:gridLimit ?? "?",used:gridUsed})),
            h("p",null,gridLimited?lesson.gridLimited:lesson.gridNotLimited),
            h("small",null,lesson.gridTakeaway)
        ):null,
        complete ? h("div", {className:`beginner-flow__outcome ${story.demandMet?"is-met":"is-missed"}`},
            h("span",{className:"beginner-flow__outcome-icon","aria-hidden":"true"},story.demandMet?"✦":"◌"),
            h("strong",null,story.demandMet?words.met:words.missed),
            h("span",null,`${story.lightProduced} / ${story.requiredLight} ${words.lightUnit}`),
            h("p",null,story.demandMet?words.metPrompt:words.missedPrompt)
        ):null
    );
}
