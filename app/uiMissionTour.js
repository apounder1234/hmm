// A5.54 — Action-aware in-world mission tour. The game engine remains the source of truth.
// All targeting uses existing real controls. No overlay prevents interacting with them.
import { uiShared } from './uiShared.js?v=a5.54.0';
import { gameText } from './gameText.js?v=a5.54.0';
const { React, h } = uiShared;

export const MISSION_STAGES = ['plant', 'goal', 'pathways', 'resources', 'ready'];
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
        pathways:{title:words.pathsTitle,body:`${project[1]} ${project[2]} — ${words.projects[projectId]} ${installed.has(projectId)?words.pathsInstalled:words.pathsUnbuilt} ${words.pathsFreedom}`,targetSelector:`[data-sunpaths-tech="${projectId}"]`,label:words.pathsLabel},
        resources:{title:words.resourcesTitle,body:words.resourcesBody,targetSelector:'.sp-world-region.is-turn-active .sp-world-resource[data-sunpaths-extract="available"]',label:words.resourcesLabel},
        ready:{title:words.readyTitle,body:words.readyBody,targetSelector:'.beginner-coach',label:words.readyLabel},
        review:{title:words.reviewTitle,body:words.reviewBody,targetSelector:'#sunpaths-review-panel .review-goal-summary',label:words.reviewLabel}
    };
    return stages[stage];
}

export function MissionTour({stage, game, player, selectedProject, onSelectProject, onNext, onBack, onSkip, onExploreBuild, onExploreGather}) {
    const cue = missionCue(stage,game,player,selectedProject);
    React.useEffect(()=>{
        if (!cue) return;
        let highlighted;
        let observer;
        let disposed=false;
        const find=()=>{
            if(disposed) return;
            const node=document.querySelector(cue.targetSelector) || (stage==='resources' ? document.querySelector('.sp-map-controls__layers') : null);
            if (!node || !node.getClientRects().length) return;
            if(node===highlighted) return;
            highlighted?.classList.remove('sunpaths-mission-target');
            highlighted=node;
            node.classList.add('sunpaths-mission-target');
            node.scrollIntoView?.({behavior:'auto',block:'center',inline:'nearest'});
            observer?.disconnect();observer=null;
        };
        find();
        if(!highlighted){observer=new MutationObserver(find); observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});}
        return ()=>{disposed=true; observer?.disconnect();highlighted?.classList.remove('sunpaths-mission-target');};
    },[cue?.targetSelector,stage]);
    if (!cue) return null;
    const index=MISSION_STAGES.indexOf(stage);
    const isReview=stage==='review';
    return h('aside',{className:'sunpaths-mission-tour',role:'region','aria-label':'Guided tour of the actual game','data-mission-stage':stage},
        h('header',null,h('small',null,isReview?'AFTER THE ENERGY PLAN':`IN-GAME MISSION · ${index+1} / ${MISSION_STAGES.length}`),h('span',null,'✦')),
        h('strong',{className:'sunpaths-mission-tour__title'},cue.title),
        h('p',null,cue.body),
        stage==='pathways' ? h('div',{className:'sunpaths-mission-tour__paths',role:'group','aria-label':'Highlight a real construction card'},
            ...MISSION_PROJECTS.map(([id,icon,label])=>h('button',{type:'button',key:id,className:id===selectedProject?'selected':'',onClick:()=>onSelectProject(id),'aria-pressed':id===selectedProject},h('span',{'aria-hidden':'true'},icon),label))) : null,
        stage==='resources'?h('p',{className:'sunpaths-mission-tour__hint'},'Collecting a resource advances the lesson automatically.'):null,
        h('div',{className:'sunpaths-mission-tour__controls'},
            index>0 && !isReview ? h('button',{type:'button',onClick:onBack},'← Back'):null,
            stage==='pathways' ? h('button',{type:'button',onClick:onExploreBuild},'Open Build'):null,
            stage==='resources' ? h('button',{type:'button',onClick:onExploreGather},'Show resources'):null,
            h('button',{type:'button',className:'is-primary',onClick:onNext},isReview?'Got it ✓':stage==='ready'?'Play →':'Next →'),
            h('button',{type:'button',className:'is-skip',onClick:onSkip},isReview?'Dismiss tip':'Skip tour')));
}
