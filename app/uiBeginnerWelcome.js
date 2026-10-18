// A5.44 — A welcome before the first game control, Beginner guided mode only.
import { uiShared } from "./uiShared.js?v=a5.44.0";
import { gameText } from "./gameText.js?v=a5.44.0";
const { h } = uiShared;

export function BeginnerWelcome({onStart, onSkip}) {
    const words = gameText.beginner.welcome;
    return h("div", {className:"beginner-welcome-scrim"},
        h("section", {className:"beginner-welcome",role:"dialog","aria-modal":"true","aria-labelledby":"beginner-welcome-title"},
            h("small", {className:"eyebrow"}, words.eyebrow),
            h("h2", {id:"beginner-welcome-title"},words.title),
            h("p", {className:"beginner-welcome-lead"},words.intro),
            h("p",null,words.how),
            h("div", {className:"beginner-welcome-targets","aria-label":words.target},
                ...[1,2,3,4].map(n=>h("div",{key:n,className:"beginner-welcome-target"},
                    h("small",null,`GEN ${n}`),
                    h("span", {"aria-label":`${n} Light${n===1?"":"s"}`},
                        ...Array.from({length:n},(_,i)=>h("span",{key:i,"aria-hidden":"true"},"💡")))))) ,
            h("small", {className:"beginner-welcome-footnote"},words.after),
            h("div",{className:"beginner-welcome-actions"},
                h("button",{type:"button",className:"primary",onClick:onStart,autoFocus:true},words.start),
                h("button",{type:"button",className:"ghost",onClick:onSkip},words.skip)
            )
        )
    );
}
