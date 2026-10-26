// @ts-nocheck
// Illustrative Beginner-only map artwork. All counts come from installed game technologies.
// These symbols describe regional ownership; they are not real power-plant locations.
import { uiShared } from "./uiShared.js?v=a5.62.0";
const { h } = uiShared;

function symbol(type) {
    const line = (x1, y1, x2, y2, props={}) => h("line", { x1, y1, x2, y2, ...props });
    const path = (d, props={}) => h("path", { d, ...props });
    switch (type) {
        case "solar": return h("g", { className: "sp-art-solar" },
            path("M5 45 L45 36 53 53 13 62Z", { fill: "#23495f", stroke: "#8fced8", strokeWidth: 1.5 }),
            path("M15 43 L23 60 M26 41 L34 57 M37 39 L45 55 M9 51 L49 44 M12 57 L52 50", { fill: "none", stroke: "#8bbdcc", strokeWidth: .7 }),
            line(18,60,17,66,{stroke:"#a4b8a6",strokeWidth:2}), line(46,54,46,65,{stroke:"#a4b8a6",strokeWidth:2}));
        case "wind": return h("g", { className: "sp-art-wind" },
            path("M26 23 L30 23 L34 66 L22 66Z", { fill: "#d8e4d7", stroke: "#6d9395", strokeWidth:1 }),
            h("g", { transform:"translate(28 22)" },
                h("g", { className:"sp-art-wind__rotor" },
                h("circle", { r:3.8,fill:"#ecf3e7" }),
                path("M-1 -4 Q-5 -24 -1 -33 Q4 -25 3 -4Z M4 0 Q24 7 28 16 Q17 16 0 5Z M-3 3 Q-21 18 -30 15 Q-26 5 -1 -4Z",{fill:"#dcebe8",stroke:"#729fa2",strokeWidth:.8})
                )
            ));
        case "hydro": return h("g", null,
            path("M3 48 Q18 39 31 49 T59 48 L59 65 L3 65Z",{fill:"#317d91"}),
            path("M9 48 L42 34 L49 60 L20 65Z",{fill:"#a7aca4",stroke:"#738c89",strokeWidth:1}),
            path("M4 58 Q14 53 24 58 T45 58 T62 58",{fill:"none",stroke:"#a6e4e4",strokeWidth:2}),
            path("M2 66 Q14 61 27 67 T56 66",{fill:"none",stroke:"#65bed2",strokeWidth:2}));
        case "biomass": return h("g",null,
            path("M7 59 V43 Q31 18 55 43 V59Z",{fill:"#9eae79",stroke:"#647e65",strokeWidth:1.4}),
            path("M12 43 Q32 25 50 43",{fill:"none",stroke:"#d2d4a1",strokeWidth:1}),
            h("rect",{x:23,y:50,width:15,height:13,fill:"#455f50"}),
            path("M40 26 Q44 12 56 16 Q56 28 40 26Z",{fill:"#78bb7c"}),
            path("M39 27 L51 20",{stroke:"#d3efd1",strokeWidth:1.5}));
        case "fossil": return h("g",null,
            path("M6 45 L18 38 L30 46 L42 38 L55 46 V64 H6Z",{fill:"#718d86",stroke:"#aac0b8",strokeWidth:1.1}),
            h("rect",{x:13,y:18,width:9,height:31,fill:"#98a49e",stroke:"#c2d1c7",strokeWidth:.8}),
            h("rect",{x:41,y:28,width:8,height:19,fill:"#9ba7a4"}),
            path("M17 14 Q11 7 19 2 M44 25 Q54 18 47 12",{fill:"none",stroke:"#bdc7bf",strokeWidth:3,strokeLinecap:"round",opacity:.56}));
        case "grid": return h("g",null,
            path("M15 20 L45 20 L52 67 L8 67Z M13 34 H47 M11 48 H49 M17 20 L49 67 M43 20 L11 67",{fill:"none",stroke:"#bad6d0",strokeWidth:2}),
            path("M0 28 H62",{fill:"none",stroke:"#e1c780",strokeWidth:1}));
        case "lighting": return h("g",null,
            h("circle",{cx:31,cy:34,r:15,fill:"#e2c66d",opacity:.2}),
            path("M23 37 A12 12 0 1 1 39 37 Q34 43 34 51 H28 Q28 43 23 37Z",{fill:"#f0d991",stroke:"#ffefbb",strokeWidth:1}),
            h("rect",{x:27,y:51,width:9,height:8,rx:2,fill:"#c7bbb0"}),
            line(31,9,31,4,{stroke:"#e8d78a",strokeWidth:2}),line(10,33,5,33,{stroke:"#e8d78a",strokeWidth:2}));
        default: return null;
    }
}

// One scalable scene for a fully developed continent. Generation pathways occupy
// fixed visual sites; support upgrades sit in the town, never in geographic space.
// No asset is discarded by a four-symbol display limit.
export function MapInfrastructure({ assets, detail = false, generation = 0, result = null, inheritedLabel = "starting equipment" }) {
    const sources = assets.filter(group => group.count > 0 && !["grid", "lighting"].includes(group.id));
    const upgrades = assets.filter(group => group.count > 0 && ["grid", "lighting"].includes(group.id));
    if (!sources.length && !upgrades.length) return null;
    const positions = { fossil: 72, solar: 225, wind: 382, hydro: 541, biomass: 675 };
    const selected = detail ? sources : sources.slice(0, 3);
    const lights = Math.max(0, Math.min(4, Number(result?.lights) || 0));
    const demand = Math.max(0, Math.min(4, Number(result?.demand) || 0));
    const label = assets.map(g => `${g.label} ${g.count}`).join(", ");
    if (!detail) return h("div", { className: "sp-map-art sp-map-art--marker", role: "img", "aria-label": label },
        h("div", { className: "sp-map-art__mini" },
            ...selected.map(g => h("span", { key: g.id, title: `${g.label} ×${g.count}`, className: "sp-map-art__mini-item" },g.icon, g.count > 1 ? `×${g.count}` : "")),
            sources.length > 3 ? h("span", { className:"sp-map-art__mini-more" }, `+${sources.length - 3}`) : null
        )
    );
    return h("div", { className:"sp-continent-landscape", role:"img", "aria-label": `Illustrative regional energy landscape: ${label}. These are not real locations.` },
        h("svg", { viewBox:"0 0 760 244", preserveAspectRatio:"xMidYMid meet", "aria-hidden":"true", focusable:"false" },
            h("defs", null,
                h("linearGradient", { id:"sp-scene-sky",x1:"0",y1:"0",x2:"0",y2:"1" },
                    h("stop",{offset:"0%",stopColor:"#0b2940"}),h("stop",{offset:"100%",stopColor:"#427d7b"})
                ),
                h("linearGradient", { id:"sp-scene-ground",x1:"0",y1:"0",x2:"0",y2:"1" },
                    h("stop",{offset:"0%",stopColor:"#5a8d6c"}),h("stop",{offset:"100%",stopColor:"#184637"})
                ),
                h("radialGradient", { id:"sp-scene-sun-glow" },
                    h("stop",{offset:"0%",stopColor:"#f5dda0",stopOpacity:".45"}),
                    h("stop",{offset:"100%",stopColor:"#f5dda0",stopOpacity:"0"})
                )
            ),
            h("rect",{width:760,height:244,fill:"url(#sp-scene-sky)"}),
            h("circle",{cx:602,cy:35,r:103,fill:"url(#sp-scene-sun-glow)"}),
            h("circle",{cx:602,cy:35,r:21,fill:"#f1d99b",opacity:.73}),
            h("path",{d:"M0 125 Q55 76 114 112 T239 95 T376 106 T537 88 T760 100 V244 H0Z",fill:"#295d62",opacity:.7}),
            h("path",{d:"M0 166 Q79 107 171 159 T367 149 T570 157 T760 139 V244 H0Z",fill:"#407c6b",opacity:.75}),
            h("path",{d:"M0 186 Q115 150 255 184 T513 175 T760 168 V244 H0Z",fill:"url(#sp-scene-ground)"}),
            h("path",{d:"M478 163 Q508 178 515 184 T577 195 T631 244 H580 Q555 207 510 199 T466 179Z",fill:"#83c3bd",opacity:.62}),
            h("path",{d:"M0 219 Q180 204 350 226 T760 211 V244 H0Z",fill:"#173f37",opacity:.72}),
            // Distinct fixed sites remain stable as each pathway is constructed.
            ...selected.map(g => h("g", { key:g.id, transform:`translate(${positions[g.id] - 38} 112) scale(1.2)`,
                    className: g.technologies.some(t=>t.builtGeneration===generation && generation>0) ? "sp-scene__new" : "" },
                    symbol(g.id),
                    g.count>1 ? h("g",{transform:"translate(44 4)"},
                        h("rect",{x:0,y:0,rx:7,width:26,height:17,fill:"#0a252a",stroke:"#d1edd0",strokeWidth:1}),
                        h("text",{x:13,y:12,fontSize:12,fontWeight:700,textAnchor:"middle",fill:"#fff4d1"},`×${g.count}`)
                    ):null,
                    h("title",null,`${g.label} ×${g.count}`)
                )),
            // The town represents the use of Light; it does not imply a real city location.
            h("g",{transform:"translate(315 184)"},
                h("rect",{x:0,y:6,width:27,height:30,rx:2,fill:"#254b50",stroke:"#a5c4b3"}),
                h("rect",{x:30,y:-5,width:27,height:41,rx:2,fill:"#294c4d",stroke:"#a5c4b3"}),
                h("rect",{x:60,y:8,width:26,height:28,rx:2,fill:"#254b50",stroke:"#a5c4b3"}),
                ...Array.from({length:4},(_,i)=>h("rect",{key:i,x:8+(i%2)*43,y:16+Math.floor(i/2)*15,width:8,height:9,rx:1,
                    fill: i<lights ? "#ffe69a" : "#34595c",className:i<lights ? "sp-scene__lit" : ""}))
            ),
            h("text",{x:20,y:27,fill:"#eef6e5",fontSize:12,letterSpacing:1.2,fontWeight:700},"YOUR ENERGY LANDSCAPE"),
            demand ? h("text",{x:744,y:26,textAnchor:"end",fill:"#fff0b9",fontSize:13,fontWeight:700},`${lights}/${demand} LIGHTS`) : null,
            h("text",{x:744,y:232,textAnchor:"end",fill:"#d2e3d4",fontSize:11},"Illustrative · not real plant locations")
        ),
        h("div",{className:"sp-continent-landscape__legend", "aria-label":"Installed technologies — select a pathway to inspect"},
            ...[...sources,...upgrades].map(g=>h("details",{key:g.id,className:upgrades.includes(g)?"is-upgrade":""},
                h("summary",null,h("b",null,g.icon),` ${g.label}`,h("strong",null,upgrades.includes(g)&&g.count===1?"✓":`×${g.count}`)),
                ...g.technologies.map((tech,i)=>h("small",{key:i},tech.name,tech.inherited?` · ${inheritedLabel}`:""))
            ))
        )
    );
}

// Render as SVG inside the geographic canvas. The parent supplies verified x/y sites
// and a coastline clip; map zoom and coastlines therefore always transform together.
export function MapAssetSymbol({ type, count = 1, x, y, isNew = false, playerId = null }) {
    return h("g", { className: `sp-map-geographic-asset ${isNew ? "sp-scene__new" : ""}`,
        transform: `translate(${x - 15} ${y - 22}) scale(.48)`,
        "aria-label": `${count} ${type} installation${count === 1 ? "" : "s"}`,
        "data-sunpaths-player":playerId, "data-sunpaths-asset":type },
        h("title", null, `${type} ×${count}`),
        h("circle", { cx: 31, cy: 44, r: 26, fill: "#153b37", stroke: "#b8d9b7", strokeWidth: 1.4, opacity: .93 }),
        symbol(type),
        count > 1 ? h("g", { transform: "translate(47 5)" },
            h("rect", { x: -5, y: -6, width: 26, height: 18, rx: 5, fill: "#0b2928", stroke: "#cbe6cf" }),
            h("text", { x: 8, y: 7, fontSize: 12, textAnchor: "middle", fontWeight: 700, fill: "#fff7d6" }, `×${count}`)
        ) : null
    );
}
