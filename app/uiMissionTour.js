// A5.54 — Action-aware in-world mission tour. The game engine remains the source of truth.
// All targeting uses existing real controls. No overlay prevents interacting with them.
import { uiShared } from './uiShared.js?v=a5.59.0';
import { gameText } from './gameText.js?v=a5.59.0';
const { React, h } = uiShared;

export const MISSION_STAGES = ['plant', 'goal', 'flow', 'pathways', 'resources', 'ready'];
export const MISSION_PROJECTS = [
    ['basicSolar','☀','Solar'], ['basicWind','≋','Wind'],
    ['basicReservoir','💧','Hydro'], ['basicBiomassPlant','🌿','Biomass'],
    ['combinedCycle','⛽','Fuel upgrade'],['gridUpgrade','⇢','Grid'],['efficientLighting','💡','LED']
];
export function missionStageFromHints(hints=[]) {
    return hints.find(id=>id.startsWith('beginner:mission:'))?.slice('beginner:mission:'.length) || null;
}
export function missionCue(stage, game, player, projectId='basicSolar') {
    if (!player || !stage) return null;
    const fuel = player.resources?.fossilFuel?.warehouse || 0;
    const installed = new Set(player.installed.map(item=>item.technologyId));
    const required = game.config.demand.reliabilityTargets[1];
    const project = MISSION_PROJECTS.find(p=>p[0]===projectId) || MISSION_PROJECTS[0];
    const words = gameText.beginner.missionTour;
    const stages = {
        plant:{ title:words.plantTitle, body:`${words.plantIntro} ${fuel ? words.fuelReady.replace('{fuel}',fuel).replace(' token(s)',fuel===1?' token':' tokens') : words.fuelNeeded} ${words.plantEnd.replace('{target}',required)}`, targetSelector:`.sp-map-geographic-asset[data-sunpaths-player="${player.id}"][data-sunpaths-asset="fossil"]`, label:words.plantLabel},
        goal:{title:words.goalTitle,body:words.goalBody,targetSelector:'.focus-goal',label:words.goalLabel},
        flow:{title:words.flowTitle,body:words.flowBody,targetSelector:'#sunpaths-player-energy',label:words.flowLabel},
        pathways:{title:words.pathsTitle,body:`${project[1]} ${project[2]} — ${words.projects[projectId]} ${installed.has(projectId)?words.pathsInstalled:words.pathsUnbuilt} ${words.pathsFreedom}`,targetSelector:`[data-sunpaths-tech="${projectId}"]`,label:words.pathsLabel},
        resources:{title:words.resourcesTitle,body:words.resourcesBody,targetSelector:'#sunpaths-resource-dock [data-sunpaths-resource="fossilFuel"][data-sunpaths-extract="available"]',label:words.resourcesLabel},
        ready:{title:words.readyTitle,body:words.readyBody,targetSelector:'.beginner-coach',label:words.readyLabel},
        review:{title:words.reviewTitle,body:words.reviewBody,targetSelector:'#sunpaths-review-panel .review-goal-summary',label:words.reviewLabel}
    };
    return stages[stage];
}

// One reliable spotlight mechanism for both the opening and chapter missions.
function useMissionTarget(selector, fallbackSelector = null) {
    React.useEffect(() => {
        if (!selector) return;
        let highlighted = null;
        let observer = null;
        let stopped = false;
        const find = () => {
            if (stopped) return;
            const node = document.querySelector(selector) || (fallbackSelector ? document.querySelector(fallbackSelector) : null);
            if (!node || !node.getClientRects().length || node === highlighted) return;
            highlighted?.classList.remove('sunpaths-mission-target');
            highlighted = node;
            node.classList.add('sunpaths-mission-target');
            node.scrollIntoView?.({ behavior: 'auto', block: 'center', inline: 'nearest' });
            observer?.disconnect(); observer = null;
        };
        find();
        if (!highlighted) {
            observer = new MutationObserver(find);
            observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
        }
        return () => { stopped = true; observer?.disconnect(); highlighted?.classList.remove('sunpaths-mission-target'); };
    }, [selector, fallbackSelector]);
}

export function MissionTour({stage, game, player, selectedProject, onSelectProject, onNext, onBack, onSkip, onExploreBuild, onExploreGather}) {
    const cue = missionCue(stage,game,player,selectedProject);
    useMissionTarget(cue?.targetSelector, stage === 'resources' ? '#sunpaths-resource-dock' : null);
    if (!cue) return null;
    const index=MISSION_STAGES.indexOf(stage);
    const isReview=stage==='review';
    return h('aside',{className:'sunpaths-mission-tour',role:'region','aria-label':'Guided tour of the actual game','data-mission-stage':stage},
        h('header',null,h('small',null,isReview?'AFTER THE ENERGY PLAN':`IN-GAME MISSION · ${index+1} / ${MISSION_STAGES.length}`),h('span',null,'✦')),
        h('strong',{className:'sunpaths-mission-tour__title'},cue.title),
        h('p',null,cue.body),
        stage==='pathways' ? h('div',{className:'sunpaths-mission-tour__paths',role:'group','aria-label':'Highlight a real construction card'},
            ...MISSION_PROJECTS.map(([id,icon,label])=>h('button',{type:'button',key:id,className:id===selectedProject?'selected':'',onClick:()=>onSelectProject(id),'aria-pressed':id===selectedProject},h('span',{'aria-hidden':'true'},icon),label))) : null,
        stage==='resources'?h('p',{className:'sunpaths-mission-tour__hint'},'Every Gather collects 1 resource token and costs 1 action. Fuel powers your inherited plant; construction materials let you build. Any successful Gather advances the lesson.'):null,
        h('div',{className:'sunpaths-mission-tour__controls'},
            index>0 && !isReview ? h('button',{type:'button',onClick:onBack},'← Back'):null,
            stage==='pathways' ? h('button',{type:'button',onClick:onExploreBuild},'Open Build'):null,
            stage==='resources' ? h('button',{type:'button',onClick:onExploreGather},'Show resources'):null,
            h('button',{type:'button',className:'is-primary',onClick:onNext},isReview?'Got it ✓':stage==='ready'?'Play →':'Next →'),
            h('button',{type:'button',className:'is-skip',onClick:onSkip},isReview?'Dismiss tip':'Skip tour')));
}


/** Two short in-world lessons for Generations 3 and 4. Generation 1 is unchanged.
 *  Step 1 points at the actual system stage; Step 2 opens the real Build card.
 *  Neither lesson adds an explanatory panel beneath the player's actions.
 */
export function ChapterMissionTour({generation, step, player, onNext, onBack, onSkip}) {
    const isLighting = generation === 3;
    const techId = isLighting ? 'efficientLighting' : 'gridUpgrade';
    const installed = player.installed.some(item => item.technologyId === techId);
    const targetSelector = step === 0
        ? `#sunpaths-player-energy .stage-${isLighting ? 'lighting' : 'grid'}`
        : `[data-sunpaths-tech="${techId}"]`;
    useMissionTarget(installed && step === 1 ? '#sunpaths-player-energy' : targetSelector);
    const title = step === 0
        ? isLighting ? 'Same electricity. More Light.' : 'How much can your Grid carry?'
        : isLighting ? 'Explore LED Lighting' : 'Explore the Grid Upgrade';
    const body = step === 0
        ? isLighting
            ? 'Lighting determines how much useful Light each unit of electricity provides. Compare the two options below.'
            : 'The Grid limits how much electricity reaches Lighting. Compare the two capacities below; neither Grid produces energy.'
        : installed
            ? isLighting
                ? 'LEDs are already installed. Your next decision may be to generate or transport more electricity.'
                : 'Your Grid is already upgraded. Check whether generation or lighting now limits your system.'
            : isLighting
                ? 'Here is the real LED Lighting card. Build it if it fits your plan—or explore another pathway.'
                : 'Here is the real Grid Upgrade card. It helps when electricity cannot get through. You choose whether to build it.';
    return h('aside', {className:'sunpaths-mission-tour',role:'region',
        'aria-label':`Generation ${generation} in-game mission`,
        'data-chapter-mission':generation,'data-chapter-step':step},
        h('header',null,h('small',null,`GENERATION ${generation} · IN-GAME MISSION ${step+1} / 2`),h('span',null,'✦')),
        h('strong',{className:'sunpaths-mission-tour__title'},title),
        h('p',null,body),
        step===0 ? h('div',{className:'mission-flow-compare', 'aria-label':isLighting?'Basic versus LED Lighting':'Grid throughput example'},
            isLighting ? h(React.Fragment,null,
                h('span',null,'Basic',' · ','2 ⚡',' → ','1 💡',' + ','1 ♨'),
                h('span',null,'LED',' · ','2 ⚡',' → ','2 💡'))
            : h(React.Fragment,null,
                h('span',null,'Basic Grid',' · ','4 ⚡',' → ','3 ⚡'),
                h('span',null,'Upgraded',' · ','4 ⚡',' → ','4 ⚡'))
        ) : null,
        h('div',{className:'sunpaths-mission-tour__controls'},
            step>0 ? h('button',{type:'button',onClick:onBack},'← Back') : null,
            h('button',{type:'button',className:'is-primary',onClick:onNext},step===0?'Next →':'Play →'),
            h('button',{type:'button',className:'is-skip',onClick:onSkip},'Skip mission')));
}
