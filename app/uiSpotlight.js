// A5.53 — Local Beginner spotlight. No network requests or external tour engine.
// Game events own progression. The spotlight merely points to an existing control.
import { uiShared } from "./uiShared.js?v=a5.56.0";
const { React, h } = uiShared;

export function TutorialSpotlight({ cue, onNext, onPrevious, onSkip, canGoBack = false }) {
    React.useEffect(() => {
        if (!cue?.targetSelector) return;
        let target = null;
        let observer = null;
        let disposed = false;
        const findTarget = () => {
            if (disposed) return;
            const candidate = document.querySelector(cue.targetSelector);
            if (!candidate || !candidate.getClientRects().length) return;
            if (target !== candidate) {
                target?.classList.remove('sunpaths-guide-target');
                target = candidate;
                target.classList.add('sunpaths-guide-target');
                target.scrollIntoView?.({behavior:'auto',block:cue.targetSelector === '#sunpaths-build-catalogue' ? 'start' : 'center',inline:'nearest'});
            }
            observer?.disconnect();
            observer = null;
        };
        findTarget();
        if (!target) {
            observer = new MutationObserver(findTarget);
            observer.observe(document.getElementById('root') || document.body, {childList:true,subtree:true});
        }
        const refresh = () => {
            if (target && !target.isConnected) {
                target.classList.remove('sunpaths-guide-target');
                target = null;
                findTarget();
            }
        };
        document.addEventListener('scroll',refresh,true);
        return () => {
            disposed = true;
            observer?.disconnect();
            document.removeEventListener('scroll',refresh,true);
            target?.classList.remove('sunpaths-guide-target');
        };
    },[cue?.id, cue?.targetSelector]);
    if (!cue) return null;
    return h('aside', {className:'sunpaths-guide-card',role:'region','aria-label':'Interactive game guide','aria-live':'polite'},
        h('small',{className:'sunpaths-guide-card__step'},cue.stepLabel || 'YOUR GUIDE'),
        h('strong',{className:'sunpaths-guide-card__title'},cue.title),
        h('p',null,cue.body),
        h('div',{className:'sunpaths-guide-card__buttons'},
            canGoBack ? h('button',{type:'button',className:'sunpaths-guide-card__back',onClick:onPrevious},'← Back') : null,
            h('button',{type:'button',className:'sunpaths-guide-card__next',onClick:onNext},cue.id==='gather:extract'?'Got it':'Next →'),
            h('button',{type:'button',className:'sunpaths-guide-card__skip',onClick:onSkip},'Skip guide')));
}
