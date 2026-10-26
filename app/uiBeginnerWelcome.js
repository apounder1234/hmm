// A5.55 — A short mission launch. Objectives and scoring are taught in play.
import { uiShared } from "./uiShared.js?v=a5.62.0";
import { gameText } from "./gameText.js?v=a5.62.0";
const { React, h } = uiShared;

export function BeginnerWelcome({onStart, onSkip}) {
    const w = gameText.beginner.welcome;
    const m = gameText.beginner.missionOpening;
    return h('div',{className:'beginner-welcome-scrim'},
        h('section',{className:'beginner-welcome is-briefing is-mission-intro',role:'dialog','aria-modal':'true','aria-labelledby':'beginner-welcome-title'},
            h('header',{className:'beginner-briefing__progress'},h('small',{className:'eyebrow'},m.label),h('span',null,'LET THE GAME BEGIN')),
            h('div',{className:'beginner-briefing__hero-icon','aria-hidden':'true'},'✦'),
            h('h2',{id:'beginner-welcome-title'},m.firstTitle),
            h('p',{className:'beginner-welcome-lead'},m.firstLead),
            h('div',{className:'mission-intro-track','aria-label':'Four Generations with increasing Light demand'},
                ...[1,2,3,4].map(n=>h('div',{key:n},h('small',null,`GEN ${n}`),h('strong',null,'✦'.repeat(n)),h('span',null,`${n} Light${n===1?'':'s'}`)))),
            h('p',{className:'beginner-briefing__aside'},m.firstFootnote),
            h('div',{className:'beginner-welcome-actions beginner-briefing__actions'},
                h('button',{type:'button',className:'primary',onClick:onStart},m.launch),
                h('button',{type:'button',className:'ghost beginner-briefing__skip',onClick:onSkip},w.skip))));
}
