// A5.54 — Two-scene mission introduction. The rest is taught in the playable world.
import { uiShared } from "./uiShared.js?v=a5.54.0";
import { gameText } from "./gameText.js?v=a5.54.0";
const { React, h } = uiShared;

export function BeginnerWelcome({onStart, onSkip}) {
    const [page, setPage] = React.useState(0);
    const w = gameText.beginner.welcome;
    const m = gameText.beginner.missionOpening;
    const b = gameText.beginner.briefing;
    return h('div',{className:'beginner-welcome-scrim'},
        h('section',{className:'beginner-welcome is-briefing is-mission-intro',role:'dialog','aria-modal':'true','aria-labelledby':'beginner-welcome-title'},
            h('header',{className:'beginner-briefing__progress'},h('small',{className:'eyebrow'},m.label),h('span',null,`${page+1} / 2`)),
            h('div',{className:'beginner-briefing__pips','aria-hidden':'true'},...[0,1].map(i=>h('span',{key:i,className:i<=page?'is-on':''}))),
            page===0 ? h(React.Fragment,null,
                h('div',{className:'beginner-briefing__hero-icon','aria-hidden':'true'},'✦'),
                h('h2',{id:'beginner-welcome-title'},m.firstTitle),
                h('p',{className:'beginner-welcome-lead'},m.firstLead),
                h('div',{className:'mission-intro-track','aria-label':'Four Generations with increasing Light demand'},
                    ...[1,2,3,4].map(n=>h('div',{key:n},h('small',null,`GEN ${n}`),h('strong',null,'✦'.repeat(n)),h('span',null,`${n} Light${n===1?'':'s'}`)))),
                h('p',{className:'beginner-briefing__aside'},m.firstFootnote)) :
            h(React.Fragment,null,
                h('small',{className:'beginner-briefing__kicker'},b.winEyebrow),
                h('h2',{id:'beginner-welcome-title'},m.winTitle),
                h('p',{className:'beginner-welcome-lead'},m.winLead),
                h('div',{className:'beginner-briefing__rules'},
                    h('div',null,h('span',null,'01'),h('strong',null,m.winRuleOne),h('p',null,m.winRuleOneDetail)),
                    h('div',null,h('span',null,'02'),h('strong',null,m.winRuleTwo),h('p',null,m.winRuleTwoDetail))),
                h('p',{className:'beginner-briefing__aside'},m.sustainabilityNote)),
            h('div',{className:'beginner-welcome-actions beginner-briefing__actions'},
                page ? h('button',{type:'button',className:'ghost',onClick:()=>setPage(0)},m.back) : null,
                h('button',{type:'button',className:'primary',onClick:()=>page===0?setPage(1):onStart()},page===0?m.next:m.launch),
                h('button',{type:'button',className:'ghost beginner-briefing__skip',onClick:onSkip},w.skip)))
    );
}
