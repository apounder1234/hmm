// A5.40 — Original SUNPATHS Beginner Mode review animation.
// Uses confirmed dispatch data from getGenerationExplanation. Presentation only.
// No simulation actions, new physics assumptions or third-party game code.
import { uiShared } from "./uiShared.js?v=a5.62.0";
import { gameText } from "./gameText.js?v=a5.62.0";
const { h, React } = uiShared;
const { useState, useEffect, useRef } = React;

function safeNumber(value) { return Math.max(0, Number(value) || 0); }

export function getBeginnerFlowSteps(story, ledInstalled = false) {
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
            heatHint: safeNumber(story.deliveredEnergy) > 0
                ? (ledInstalled ? "♨ Less waste heat with LEDs" : "♨ More waste heat with Basic Lighting") : null,
            footnote: words.lightNote
        }
    ];
}

// Display-only buckets. Counted losses are separate from unused Electricity.
// The order matches the existing four energy-flow steps; no new scoring rules.
export const BEGINNER_LOSS_BUCKETS = [
    { id: "fuelSupply", icon: "⛽", step: 0 },
    { id: "generationHeat", icon: "♨", step: 1 },
    { id: "storageHeat", icon: "▣", step: 1 },
    { id: "other", icon: "◌", step: 1 },
    { id: "lightingHeat", icon: "💡", step: 3 },
    { id: "curtailed", icon: "↩", step: 2, unused: true }
];

export function beginnerLossDisplay(storyLedger = {}, cumulativeLedger = {}, revealed = 4) {
    // The engine's cumulative ledger already includes this confirmed Generation.
    // Subtract it to reconstruct the ledger before the animation starts.
    const buckets = BEGINNER_LOSS_BUCKETS.map(bucket => {
        const current = safeNumber(storyLedger[bucket.id]);
        const prior = Math.max(0, safeNumber(cumulativeLedger[bucket.id]) - current);
        const shown = bucket.step < revealed ? current : 0;
        return { ...bucket, current, shown, prior, total: prior + shown };
    });
    const counted = buckets.filter(bucket => !bucket.unused);
    return {
        buckets,
        generation: counted.reduce((sum, bucket) => sum + bucket.shown, 0),
        running: counted.reduce((sum, bucket) => sum + bucket.total, 0),
        unused: buckets.find(bucket => bucket.unused)
    };
}

function LossLedger({ledger, currentLedger, generation, revealed}) {
    const words = gameText.beginner.lossAnimation;
    const values = beginnerLossDisplay(currentLedger, ledger, revealed);
    const counted = values.buckets.filter(bucket => !bucket.unused && bucket.id !== "lightingHeat");
    const unused = values.unused;
    return h("section", {className:"beginner-loss-ledger", "aria-label":words.aria},
        h("div", {className:"beginner-loss-ledger__head"},
            h("div", null,
                h("small",null,words.eyebrow),
                h("h5",null,words.heading)),
            h("div",{className:"beginner-loss-ledger__score", "aria-live":"polite", "aria-atomic":"true"},
                h("span",null,words.thisGeneration, " ", h("b",null, values.generation)),
                h("strong",null, "⚖ ",words.gameTotal," ", values.running))
        ),
        h("div",{className:"beginner-loss-ledger__buckets"},
            ...counted.map(bucket => h("div", {key:bucket.id, "data-loss-bucket":bucket.id,
                    className:`beginner-loss-ledger__bucket ${bucket.shown ? "has-arrived" : ""}`},
                h("span",{className:"beginner-loss-ledger__icon", "aria-hidden":"true"}, bucket.icon),
                h("span",{className:"beginner-loss-ledger__label"},words.categories[bucket.id]),
                h("strong",{className:"beginner-loss-ledger__count"},bucket.total)
            ))
        ),
        h("div",{className:"beginner-loss-ledger__unused", "data-loss-bucket":"curtailed"},
            h("span",{className:"beginner-loss-ledger__icon", "aria-hidden":"true"},unused.icon),
            h("span",null,words.unusedLabel),
            h("b",null,unused.total),
            h("small",null,words.unusedNote)
        ),
        h("p",{className:"beginner-loss-ledger__rule"},
            generation === 1 ? words.firstGeneration : words.laterGenerations),
        h("small",{className:"beginner-loss-ledger__science"},words.unitNote)
    );
}

function animateLossToLedger(root, step, revealed, ledger) {
    if (!root || !globalThis.document || !globalThis.Element?.prototype?.animate
        || globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)
        return () => {};
    const source = root.querySelector(`.beginner-flow__step.step-${step}`);
    if (!source) return () => {};
    const sourceRect = source.getBoundingClientRect();
    const animations = [];
    for (const bucket of BEGINNER_LOSS_BUCKETS) {
        if (bucket.step !== revealed - 1 || safeNumber(ledger[bucket.id]) === 0) continue;
        const target = root.querySelector(`[data-loss-bucket="${bucket.id}"]`);
        if (!target) continue;
        const to = target.getBoundingClientRect();
        const flying = document.createElement("span");
        flying.className = `beginner-loss-flight ${bucket.unused ? "is-unused" : ""}`;
        flying.textContent = `${bucket.icon} +${safeNumber(ledger[bucket.id])}`;
        flying.setAttribute("aria-hidden", "true");
        flying.style.left = `${sourceRect.left + sourceRect.width / 2 - 13}px`;
        flying.style.top = `${sourceRect.top + sourceRect.height / 2 - 13}px`;
        document.body.appendChild(flying);
        const dx = to.left + to.width / 2 - (sourceRect.left + sourceRect.width / 2);
        const dy = to.top + to.height / 2 - (sourceRect.top + sourceRect.height / 2);
        const animation = flying.animate([
            {transform:"translate(0,0) scale(1)", opacity:1},
            {transform:`translate(${dx * .52}px,${dy * .52 - 18}px) scale(1.15)`, opacity:1,offset:.58},
            {transform:`translate(${dx}px,${dy}px) scale(.45)`, opacity:0}
        ], {duration:850,easing:"ease-in-out",fill:"forwards"});
        animation.addEventListener("finish",()=>flying.remove(),{once:true});
        animations.push({animation,flying});
    }
    return () => animations.forEach(({animation,flying}) => {animation.cancel();flying.remove();});
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
export function BeginnerFlowStory({story, generation, cumulativeLossLedger = {}, ledInstalled = false}) {
    const words = gameText.beginner.flow;
    const steps = getBeginnerFlowSteps(story, ledInstalled);
    const [revealed, setRevealed] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [selected, setSelected] = useState(null);
    const [credited, setCredited] = useState(0);
    const rootRef = useRef(null);
    useEffect(() => {
        const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        setRevealed(reduceMotion ? 4 : 0);
        setPlaying(!reduceMotion);
        setSelected(null);
        setCredited(reduceMotion ? 4 : 0);
    }, [generation]);
    useEffect(() => {
        if (!playing || revealed >= 4) return undefined;
        const delay = revealed === 0 ? 750 : 1650;
        const timer = globalThis.setTimeout(() => setRevealed(step => Math.min(4, step + 1)), delay);
        return () => globalThis.clearTimeout(timer);
    }, [revealed, playing]);
    useEffect(() => {
        if (revealed === 0) { setCredited(0); return undefined; }
        const cleanup = animateLossToLedger(rootRef.current, steps[revealed - 1].id, revealed, story.lossLedger ?? {});
        // The score updates when the loss symbols reach their buckets.
        const delay = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? 0 : 850;
        const timer = globalThis.setTimeout(() => setCredited(revealed), delay);
        return () => { globalThis.clearTimeout(timer); cleanup(); };
    }, [generation, revealed]);
    // Later chapter concepts are taught in the in-game mission, not in the turn controls,
    // while this Review shows the actual confirmed flow and losses.
    const complete = revealed === 4;
    const highlightedIndex = selected === null ? Math.max(0, revealed - 1) : selected;
    const current = steps[highlightedIndex];
    const replay = () => { setSelected(null); setCredited(0); setRevealed(0); setPlaying(true); };
    const inspect = index => { setSelected(index); setRevealed(prev => Math.max(prev, index + 1)); setPlaying(false); };
    return h("section", { ref:rootRef, className:"beginner-flow", "aria-label":words.aria },
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
                    h(StagePips,{count:step.value,id:step.id,revealed:index<revealed}),
                    index < revealed && BEGINNER_LOSS_BUCKETS.some(bucket => bucket.step === index && safeNumber(story.lossLedger?.[bucket.id]) > 0)
                        ? h("span",{className:"beginner-flow__loss-exit"},
                            "↘ ",BEGINNER_LOSS_BUCKETS.filter(bucket => bucket.step===index)
                                .reduce((sum,bucket)=>sum+safeNumber(story.lossLedger?.[bucket.id]),0),
                            index===2 ? ` ${gameText.beginner.lossAnimation.unusedShort}` : ` ${gameText.beginner.lossAnimation.lostShort}`)
                        : null
                ),
                ...(index < steps.length-1 ? [h("span",{key:`arrow-${step.id}`,className:`beginner-flow__arrow ${index+1<revealed?"is-active":""}`, "aria-hidden":"true"},"→")]:[])
            ])
        ),
        h(LossLedger,{ledger:cumulativeLossLedger,currentLedger:story.lossLedger ?? {},generation,revealed:credited}),
        revealed > 0 ? h("div", {className:"beginner-flow__explanation","aria-live":"polite","aria-atomic":"true"},
            h("div", {className:"beginner-flow__explanation-head"},
                h("span",null,`${words.step} ${highlightedIndex+1} ${words.of} 4`),
                h("strong",null,current.label)),
            h("p",null,current.explanation),
            current.heatHint ? h("p", {className:`beginner-flow__heat-hint ${ledInstalled ? "is-led" : "is-basic"}`}, current.heatHint, " · illustrative, not counted") : null,
            h("small",{className:"beginner-flow__footnote"},current.footnote),
            !complete ? h("button",{type:"button",className:"beginner-flow__next",onClick:()=>{setSelected(null);setPlaying(false);setRevealed(v=>Math.min(4,v+1));}},words.next) : null
        ) : h("p",{className:"beginner-flow__loading",role:"status"},words.starting),
        complete ? h("div", {className:`beginner-flow__outcome ${story.demandMet?"is-met":"is-missed"}`},
            h("span",{className:"beginner-flow__outcome-icon","aria-hidden":"true"},story.demandMet?"✦":"◌"),
            h("strong",null,story.demandMet?words.met:words.missed),
            h("span",null,`${story.lightProduced} / ${story.requiredLight} ${words.lightUnit}`),
            h("p",null,story.demandMet?words.metPrompt:words.missedPrompt)
        ):null
    );
}
