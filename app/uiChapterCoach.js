// A5.52 — One optional, state-based coach for the four Beginner chapters.
// Pure selection logic below; never changes game state or recommends an AI move.
import { uiShared } from './uiShared.js?v=a5.54.0';
import { gameText } from './gameText.js?v=a5.54.0';

const { React, h, button, getRequiredLight, getCurrentMaximumLight, getPrimaryBottleneck,
    getGenerationExplanation, developmentActionLegality,
    technologyReadiness, modeAllowsTechnology, resourceKeys } = uiShared;
const BEGINNER_PROJECTS = ['basicSolar','basicWind','basicReservoir','basicBiomassPlant','combinedCycle','gridUpgrade','efficientLighting'];

export function getBeginnerCoachModel(game, player) {
    if (!game || !player || game.gameMode !== 'beginner' || game.config.rules.generations !== 4 || game.generation < 1 || game.generation > 4) return null;
    if (!['generation.development', 'generation.dispatch', 'generation.review'].includes(game.phase)) return null;
    const g = game.generation;
    const t = gameText.beginner.coach;
    const target = getRequiredLight(game, player.id);
    const installed = new Set(player.installed.map(item => item.technologyId));
    const previous = g > 1 ? player.lightByGeneration?.[g - 1] : undefined;
    const result = player.lightByGeneration?.[g];
    const lesson = t.chapters[g - 1];
    const step = game.phase.split('.')[1];
    if (step === 'review') {
        const story = getGenerationExplanation(game, player.id, g);
        const ledger = story.lossLedger || {};
        const loss = ['fuelSupply','generationHeat','storageHeat','lightingHeat','other'].reduce((n,key) => n + (ledger[key] || 0), 0);
        return { g, target, step, title: (result ?? 0) >= target ? t.reviewMet : t.reviewMissed,
            summary: `${result ?? 0}/${target} ${t.lights}. ${loss} ${t.lossThisGeneration}.`,
            detail: story.demandMet ? t.reviewMetDetail : t.reviewMissedDetail,
            previous, result, status: (result ?? 0) >= target ? 'met' : 'missed', actions: [] };
    }
    if (step === 'dispatch') return { g, target, step, title: t.dispatchTitle,
        summary: t.dispatchSummary, detail: t.dispatchDetail, previous, status:'ready', actions:[] };
    const maximum = getCurrentMaximumLight(game, player.id);
    const bottleneck = getPrimaryBottleneck(game, player.id, { target });
    const buildable = BEGINNER_PROJECTS.some(id => {
        const tech = game.config.technologies.find(item => item.id === id);
        return tech && modeAllowsTechnology(game, tech) && !installed.has(id) && technologyReadiness(game, player.id, tech).legal;
    });
    const gatherable = player.actionsRemaining > 0 && resourceKeys.some(resource =>
        developmentActionLegality(game, player.id, { kind:'extract', resource }).legal);
    let detail;
    if (maximum >= target) detail = t.potentialReady;
    else if (bottleneck.type === 'fuelSupply') detail = t.fuelShortage;
    else if (bottleneck.type === 'biomassSupply') detail = t.biomassShortage;
    else detail = `${t.potentialShort} ${bottleneck.label}: ${bottleneck.explanation}`;
    if (g === 3) {
        detail += ' ' + (installed.has('efficientLighting') ? t.ledAlready : t.ledOption);
    }
    if (g === 4) {
        detail += ' ' + (installed.has('gridUpgrade') ? t.gridAlready : bottleneck.type === 'grid' ? t.gridNow : t.gridOption);
        // No statement that Grid *is* limiting unless verified by the bottleneck.
    }
    const actions = [];
    if (player.actionsRemaining > 0 && buildable) actions.push({id:'build',label:t.exploreBuild});
    if (gatherable) actions.push({id:'gather',label:t.exploreGather});
    const buildFirst = buildable && (g !== 1 || !gatherable);
    if (!buildFirst && actions.length > 1) actions.reverse();
    return { g, target, step, title:lesson.title, summary:lesson.intro,
        detail, previous, maximum, status:maximum >= target ? 'ready' : 'limited',
        actions, actionsLeft: player.actionsRemaining };
}

export function BeginnerChapterCoach({ game, player, onGather, onBuild }) {
    const model = getBeginnerCoachModel(game, player);
    const [collapsed, setCollapsed] = React.useState(false);
    React.useEffect(() => setCollapsed(false), [game?.generation]);
    if (!model) return null;
    const t = gameText.beginner.coach;
    return h('section', {className:`beginner-coach is-${model.status}`, 'aria-label':t.aria, 'data-coach-generation':model.g, 'data-coach-phase':model.step},
        h('header', {className:'beginner-coach__heading'},
            h('div', null, h('small', {className:'beginner-coach__chapter'}, `${t.chapter} ${model.g} / 4 · ${model.step === 'development' ? t.develop : model.step === 'dispatch' ? t.plan : t.review}`),
                h('h3', null, model.title)),
            h('button', {type:'button',className:'beginner-coach__toggle','aria-expanded':!collapsed,onClick:()=>setCollapsed(value=>!value)},collapsed?t.expand:t.collapse)),
        !collapsed ? h(React.Fragment, null,
            h('div', {className:'beginner-coach__lights','aria-label':`${model.target} ${t.lights} ${t.required}`},
                ...Array.from({length:model.target},(_,i)=>h('span',{key:i,className:`beginner-coach__light ${model.step === 'review' && i < (model.result ?? 0) ? 'lit' : ''}`}, '✦')),
                h('strong',null, `${model.target} ${t.lights} ${t.required}`)),
            h('p', {className:'beginner-coach__summary'},model.summary),
            model.previous !== undefined ? h('p',{className:'beginner-coach__previous'}, `${t.lastResult}: ${model.previous} ${t.lights} supplied`) : null,
            h('p', {className:'beginner-coach__detail'},model.detail),
            model.step === 'development' ? h('div',{className:'beginner-coach__footer'},
                h('span',{className:'beginner-coach__capacity'},`${t.potential}: ${model.maximum} ${t.lights} · ${model.actionsLeft} ${t.actionsLeft}`),
                model.actions.length ? h('div',{className:'beginner-coach__buttons'},...model.actions.map(a => button(a.label, a.id==='gather'?onGather:onBuild,{kind:a===model.actions[0]?'primary compact':'ghost compact'})))
                    : h('span',{className:'beginner-coach__capacity'}, t.noActionHint)) :
                h('span',{className:'beginner-coach__capacity'},model.step==='dispatch'?t.predictionCaveat:t.confirmedResult))
            : null);
}
