// A5.56 — Optional, state-based Beginner coach. Pure model, presentation below.
// Unlike the opening tour, it remains available after a player skips the tour.
import { uiShared } from './uiShared.js?v=a5.62.0';
import { gameText } from './gameText.js?v=a5.62.0';

const { React, h, button, getRequiredLight, getCurrentMaximumLight, getPrimaryBottleneck,
    getGenerationExplanation, developmentActionLegality, technologyReadiness,
    modeAllowsTechnology, resourceKeys, systemSnapshot } = uiShared;
const BEGINNER_PROJECTS = ['basicSolar','basicWind','basicReservoir','basicBiomassPlant','combinedCycle','gridUpgrade','efficientLighting'];
const LOSS_KEYS = ['fuelSupply','generationHeat','storageHeat','lightingHeat','other'];

function previousLesson(game, player, generation) {
    if (generation <= 1) return null;
    const supplied = player.lightByGeneration?.[generation - 1];
    if (supplied === undefined) return null;
    const previousTarget = getRequiredLight(game, player.id, generation - 1);
    const met = supplied >= previousTarget;
    const story = getGenerationExplanation(game, player.id, generation - 1);
    return {
        supplied, target:previousTarget, met,
        // The recorded result is an observation, not a forecast of the new weather.
        lesson: met ? 'That target was met. Now check whether your system can handle the higher demand.'
            : `Last time the review identified ${story.primaryBottleneckLabel.toLowerCase()} as a limitation. Use today's potential and resources to plan your next move.`
    };
}

function recentMove(game, player) {
    const event = [...(game.log || [])].reverse().find(entry => entry.generation === game.generation &&
        entry.actorId === player.id && (entry.type === 'action.build' || entry.type === 'action.extract'));
    if (!event) return null;
    if (event.type === 'action.build') {
        const name = game.config.technologies.find(t => t.id === event.data?.technologyId)?.name;
        return name ? `Built ${name} this Generation. The Light potential above has been recalculated; delivery is not confirmed until the Energy Plan.` : null;
    }
    const labels = { fossilFuel:'Fuel', biomass:'Biomass', constructionMaterials:'Other Materials', criticalMaterials:'Critical Minerals' };
    const resource = labels[event.data?.resource] || 'materials';
    return `Gathered ${event.data?.amount || 1} ${resource}. Your Warehouse and available Fuel have updated.`;
}

export function getBeginnerCoachModel(game, player) {
    if (!game || !player || game.gameMode !== 'beginner' || game.config.rules.generations !== 4 || game.generation < 1 || game.generation > 4) return null;
    if (!['generation.development', 'generation.dispatch', 'generation.review'].includes(game.phase)) return null;
    const g = game.generation;
    const t = gameText.beginner.coach;
    const target = getRequiredLight(game, player.id);
    const installed = new Set(player.installed.map(item => item.technologyId));
    const previous = previousLesson(game, player, g);
    const result = player.lightByGeneration?.[g];
    const step = game.phase.split('.')[1];
    const lesson = t.chapters[g - 1];
    if (step === 'review') {
        const story = getGenerationExplanation(game, player.id, g);
        const loss = LOSS_KEYS.reduce((n,key) => n + (story.lossLedger?.[key] || 0), 0);
        const lessonText = story.demandMet
            ? (loss ? `Demand met. Your energy flow also recorded ${loss} counted System Loss this Generation. Watch where those losses occurred.` : 'Demand met. Look at the energy flow to see which parts of your system supplied the Lights.')
            : `Demand missed. ${story.takeaway}`;
        return { g, target, step,
            title: story.demandMet ? 'Review what worked' : 'Find out what held you back',
            summary: lessonText,
            detail: g === 4 ? 'Your four Generation results are now ready. Final standings first compare how often demand was met, then lower total counted System Loss for ties.'
                : 'The next Generation brings a higher Light target. Use this result to decide what to develop next.',
            previous, result, status:story.demandMet ? 'met' : 'missed', actions:[] };
    }
    if (step === 'dispatch') return { g, target, step, title: t.dispatchTitle,
        summary: t.dispatchSummary, detail: t.dispatchDetail, previous, status:'ready', actions:[] };

    const maximum = getCurrentMaximumLight(game, player.id);
    const bottleneck = getPrimaryBottleneck(game, player.id, { target });
    const snapshot = systemSnapshot(game, player.id);
    const buildable = BEGINNER_PROJECTS.some(id => {
        const tech = game.config.technologies.find(item => item.id === id);
        return tech && modeAllowsTechnology(game, tech) && !installed.has(id) && technologyReadiness(game, player.id, tech).legal;
    });
    const gatherable = player.actionsRemaining > 0 && resourceKeys.some(resource =>
        developmentActionLegality(game, player.id, { kind:'extract', resource }).legal);
    // Fuel can be the useful first action even if some solar/wind is already contributing.
    const fossilNeedsFuel = snapshot.fossil.maximum > 0 && !snapshot.fossil.hasFuel;
    const biomassNeedsFuel = snapshot.biomass.maximum > 0 && !snapshot.biomass.hasFuel;
    let detail, focus;
    if (maximum >= target) {
        focus = 'ready';
        detail = t.potentialReady;
        if (g === 3 && !installed.has('efficientLighting')) detail += ' You can still inspect LED Lighting to explore efficiency, but you do not have to build it.';
    } else if (bottleneck.type === 'fuelSupply' || (fossilNeedsFuel && g === 1)) {
        focus = 'fuel';
        detail = 'Your inherited Fuel Plant is installed, but its Fuel supply is empty. Gather Fuel on the Resources map to operate it, or build another generation pathway instead.';
    } else if (bottleneck.type === 'biomassSupply') {
        focus = 'biomass';
        detail = t.biomassShortage;
    } else if (bottleneck.type === 'grid') {
        focus = 'grid';
        detail = installed.has('gridUpgrade') ? t.gridAlready : t.gridNow;
    } else if (bottleneck.type === 'lighting') {
        focus = 'lighting';
        detail = installed.has('efficientLighting') ? t.ledAlready : t.ledOption;
    } else {
        focus = 'generation';
        detail = `${t.potentialShort} ${bottleneck.label}: ${bottleneck.explanation}`;
        if (fossilNeedsFuel) detail += ' Gathering Fuel may also bring your existing fuel plant back online.';
        else if (biomassNeedsFuel) detail += ' Your Biomass plant also needs stored Biomass to run.';
    }
    // Teach the chapter concept only when it is relevant to the current constraint.
    // Do not prescribe LED while Fuel or generation is the actual problem.
    if (g === 3 && focus === 'generation' && !installed.has('efficientLighting'))
        detail += ' Later, inspect LED Lighting to see how efficiency changes Light and heat losses.';
    if (g === 4 && focus === 'generation')
        detail += ' Also check Grid and Lighting once you have enough usable electricity; a Grid Upgrade alone does not generate electricity.';

    const actions = [];
    const canAct = player.actionsRemaining > 0;
    if (canAct && buildable) actions.push({id:'build',label:t.exploreBuild});
    if (gatherable) actions.push({id:'gather',label:t.exploreGather});
    // Action priority follows the constraint, not a scripted chapter number.
    const gatherFirst = focus === 'fuel' || focus === 'biomass' || (!buildable && gatherable);
    if (gatherFirst && actions.length === 2) actions.reverse();
    const move = recentMove(game,player);
    return { g, target, step, title:lesson.title,
        summary: maximum >= target ? 'The current system has enough potential to reach the Light target.'
            : 'The current energy chain cannot yet reach the Light target.',
        detail, previous, maximum, focus, move,
        status:maximum >= target ? 'ready' : 'limited', actions, actionsLeft:player.actionsRemaining };
}

export function BeginnerChapterCoach({ game, player, onGather, onBuild }) {
    const model = getBeginnerCoachModel(game, player);
    const [collapsed, setCollapsed] = React.useState(false);
    React.useEffect(() => setCollapsed(false), [game?.generation]);
    if (!model) return null;
    const t = gameText.beginner.coach;
    return h('section', {className:`beginner-coach is-${model.status}`, 'aria-label':t.aria, 'data-coach-generation':model.g, 'data-coach-phase':model.step, 'data-coach-focus':model.focus || model.step},
        h('header', {className:'beginner-coach__heading'},
            h('div', null, h('small', {className:'beginner-coach__chapter'}, `${t.chapter} ${model.g} / 4 · ${model.step === 'development' ? t.develop : model.step === 'dispatch' ? t.plan : t.review}`),
                h('h3', null, model.title)),
            h('button', {type:'button',className:'beginner-coach__toggle','aria-expanded':!collapsed,onClick:()=>setCollapsed(value=>!value)},collapsed?t.expand:t.collapse)),
        !collapsed ? h(React.Fragment, null,
            model.previous && model.step === 'development' ? h('p',{className:'beginner-coach__previous'},
                `Last Generation: ${model.previous.supplied}/${model.previous.target} Lights. ${model.previous.lesson}`) : null,
            h('p', {className:'beginner-coach__summary'},model.summary),
            h('p', {className:'beginner-coach__detail'},model.detail),
            model.move && model.step === 'development' ? h('p',{className:'beginner-coach__move',role:'status'},`✓ ${model.move}`) : null,
            model.step === 'development' ? h('div',{className:'beginner-coach__footer'},
                model.actionsLeft === 0 ? h('span',{className:'beginner-coach__capacity'},'Development is complete. Your Energy Plan is next.') : null,
                model.actions.length ? h('div',{className:'beginner-coach__buttons'},...model.actions.map((a,i) => button(a.label, a.id==='gather'?onGather:onBuild,{kind:i===0?'primary compact':'ghost compact'})))
                    : model.actionsLeft > 0 ? h('span',{className:'beginner-coach__capacity'}, t.noActionHint) : null) :
                h('span',{className:'beginner-coach__capacity'},model.step==='dispatch'?t.predictionCaveat:t.confirmedResult))
            : null);
}
