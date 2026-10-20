// @ts-nocheck
import { uiShared } from "./uiShared.js?v=a5.52.0";
import { interfaceCopy, resourceVisuals } from "./uiCopy.js?v=a5.52.0";
import { gameText } from "./gameText.js?v=a5.52.0";
import { worldCoastline } from "./worldCoastline.js?v=a5.52.0";
import { MapInfrastructure, MapAssetSymbol } from "./uiMapArtwork.js?v=a5.52.0";
import { continentAssetSites, europeAsiaDivide } from "./continentSites.js?v=a5.52.0";

const {
    React,
    h,
    panel,
    featureEnabled,
    currentOrder,
    currentPlayerId,
    conditionDefinition,
    developmentActionLegality,
    gatherAmount,
    getContinentProfile,
    getTechnology,
    getTransmissionLevel,
    warehouseTotal,
    resourceKeys,
    resourceLabels,
    pathwayLabels,
    continentIcons
} = uiShared;

export const worldMapPositions = Object.freeze({
    northAmerica: Object.freeze({ left: "19%", top: "28%" }),
    southAmerica: Object.freeze({ left: "31%", top: "65%" }),
    europe: Object.freeze({ left: "50%", top: "24%" }),
    africa: Object.freeze({ left: "52%", top: "52%" }),
    asia: Object.freeze({ left: "72%", top: "31%" }),
    australia: Object.freeze({ left: "84%", top: "68%" })
});

// Beginner-only visual selectors. Installed technologies are read from the engine;
// this file never changes simulation state or invents geographic locations.
const assetTypes = [
    { id: "fossil", icon: "⛽", label: "Fuel", ids: ["basicFossilPlant", "enhancedOilRecovery", "combinedCycle", "carbonCapturePlant"] },
    { id: "solar", icon: "☀", label: "Solar", ids: ["basicSolar", "utilitySolar", "advancedSolar"] },
    { id: "wind", icon: "≋", label: "Wind", ids: ["basicWind", "onshoreWindFarm", "advancedWind"] },
    { id: "hydro", icon: "≈", label: "Hydro", ids: ["basicReservoir", "advancedReservoir", "advancedHydroTurbine"] },
    { id: "biomass", icon: "♣", label: "Biomass", ids: ["basicBiomassPlant", "advancedBiomassPlant", "integratedBiorefinery"] },
    { id: "grid", icon: "⚡", label: "Grid", ids: ["basicGrid", "gridUpgrade", "smartGrid"] },
    { id: "lighting", icon: "✦", label: "Lighting", ids: ["standardLighting", "efficientLighting"] }
];
function mapAssets(game, player) {
    return assetTypes.map(group => {
        const technologies = player.installed.filter(item => group.ids.includes(item.technologyId));
        return { ...group, count: technologies.length, technologies: technologies.map(item => ({
            name: getTechnology(game, item.technologyId).name,
            inherited: item.builtGeneration === 0,
            builtGeneration: item.builtGeneration
        })) };
    }).filter(item => item.count > 0);
}
function mapResult(player, game) {
    const generations = Object.keys(player.lightByGeneration || {}).map(Number).filter(Number.isFinite).sort((a,b) => b-a);
    const generation = generations[0];
    const ledger = player.cumulative?.lossLedger || {};
    const loss = ["fuelSupply", "generationHeat", "storageHeat", "lightingHeat", "other"]
        .reduce((total, kind) => total + (ledger[kind] || 0), 0);
    return { generation, lights: generation ? player.lightByGeneration[generation] : null,
        demand: generation ? game.config.demand.reliabilityTargets[generation] : null,
        met: generation ? player.lightByGeneration[generation] >= game.config.demand.reliabilityTargets[generation] : false,
        loss, metGenerations: player.cumulative?.demandMetGenerations ?? 0 };
}
function MapFocus({ game, player, layer }) {
    const t = gameText.beginner.map;
    const continent = getContinentProfile(game, player);
    const assets = mapAssets(game, player);
    const result = mapResult(player, game);
    return h("section", { className: "sp-map-focus", "aria-label": `${continent.name}: ${layer}` },
        h("div", { className: "sp-map-focus__header" },
            h("div", null, h("small", null, t.focusEyebrow), h("h3", null, continent.name), h("p", null, player.name)),
            h("span", { className: "sp-map-focus__label" }, t.layers[layer])
        ),
        layer === "built" ? h(React.Fragment, null,
            h(MapInfrastructure, { assets, detail: true, generation: game.generation, result, inheritedLabel: t.inherited }),
            h("p", { className: "sp-map-focus__foot" }, t.notPhysical)
        ) : layer === "resources" ? h("div", { className: "sp-map-focus__grid" },
            ...resourceKeys.map(key => h("div", { key, className: "sp-map-focus__asset" },
                h("span", { className: "sp-map-focus__asset-icon", "aria-hidden": "true" }, resourceVisuals[key].icon),
                h("div", null, h("strong", null, resourceLabels[key]),
                    h("small", null, `${t.regionalStock}: ${player.resources[key].currentContinent}`))
            ))
        ) : h("div", { className: "sp-map-focus__results" },
            result.generation ? h(React.Fragment, null,
                h("div", { className:"sp-map-result-show", key:`result-${result.generation}` },
                    h("div",{className:"sp-map-result-show__head"},
                        h("span",null,`${t.latestGeneration} ${result.generation}`),
                        h("strong",{className:result.met?"is-met":"is-missed"},result.met?t.met:t.notMet)
                    ),
                    h("div",{className:"sp-map-result-show__lights", "aria-label":`${result.lights} of ${result.demand} lights`},
                        ...Array.from({length:Math.max(0,Math.min(4,result.demand))},(_,i)=>h("span",{
                            key:i,className:i<result.lights?"is-lit":"is-dark",style:{"--light-order":i}
                        },"✦"))
                    ),
                    h("strong",{className:"sp-map-result-show__score"},`${result.lights} / ${result.demand} ${t.lights}`),
                    h("div",{className:"sp-map-result-show__foot"},
                        h("span",null,`${t.metGenerations}: ${result.metGenerations}`),
                        h("span",null,`${t.countedLoss}: ${result.loss}`)
                    )
                ),
                h("div",{className:"sp-map-loss-mini", "aria-label":"Counted loss by type"},
                    ...[["fuelSupply","⛽","Fuel"],["generationHeat","♨","Generation heat"],["storageHeat","▣","Storage heat"],["lightingHeat","✦","Lighting heat"],["other","◈","Other"]].map(([key,icon,label]) =>
                        h("div",{key,title:label},h("span",null,icon),h("strong",null,player.cumulative?.lossLedger?.[key]||0),h("small",null,label))
                    )
                )
            ) : h("p", null, t.awaitingResult)
        )
    );
}

function RegionResource({ game, player, resource, interactive, onExtract, onBlocked, expanded }) {
    const visual = resourceVisuals[resource];
    const account = player.resources[resource];
    const action = { kind: "extract", resource };
    const legality = interactive ? developmentActionLegality(game, player.id, action) : null;
    const amount = gatherAmount(game, player, resource);
    const specialty = amount > (game.config.resources?.normalExtractionYield ?? 1);
    const stateClass = expanded ? "expanded" : "compact";
    const content = h(React.Fragment, null,
        h("span", { className: "sp-world-resource__icon", "aria-hidden": "true" }, visual.icon),
        expanded ? h("span", { className: "sp-world-resource__label" }, visual.short) : null,
        h("strong", { className: "sp-world-resource__value" }, account.currentContinent),
        specialty ? h("em", { className: "sp-world-resource__yield" }, `×${amount}`) : null
    );

    if (!interactive) {
        return h("span", {
            className: `sp-world-resource sp-world-resource--static sp-world-resource--${stateClass}`,
            "aria-label": `${resourceLabels[resource]} regional stock: ${account.currentContinent}`
        }, content);
    }

    const legal = Boolean(legality?.legal);
    return h("button", {
        type: "button",
        className: `sp-world-resource sp-world-resource--extractable sp-world-resource--${stateClass} ${legal ? "is-available" : "is-unavailable"}`,
        "aria-disabled": legal ? "false" : "true",
        onClick: event => {
            event.stopPropagation();
            if (legal) onExtract(resource);
            else onBlocked?.(legality?.reason || interfaceCopy.map.extractionUnavailable);
        },
        "data-sunpaths-extract": legal ? "available" : "unavailable",
        "aria-label": legal
            ? `Extract ${amount} ${resourceLabels[resource]} from ${getContinentProfile(game, player).name}`
            : `${resourceLabels[resource]}: ${legality?.reason || interfaceCopy.map.extractionUnavailable}`
    }, content);
}

function RegionMarker({ game, player, expanded, owned, turnActive, onToggle, onExtract, onBlocked, position, layer }) {
    const continent = getContinentProfile(game, player);
    const condition = conditionDefinition(game, player);
    const interactive = player.id === currentPlayerId(game)
        && game.phase === "generation.development"
        && player.controller.kind === "human";
    const effectiveKnowledge = player.knowledge + player.temporaryKnowledge;
    const latestLight = player.lightByGeneration[game.generation - 1] ?? "—";
    const beginnerMap = Boolean(layer);
    const assets = beginnerMap ? mapAssets(game, player) : [];
    const result = beginnerMap && layer === "results" ? mapResult(player, game) : null;

    return h("article", {
        className: `sp-world-region ${expanded ? "is-expanded" : ""} ${owned ? "is-owned" : ""} ${turnActive ? "is-turn-active" : ""}`,
        style: { left: position.left, top: position.top },
        "data-continent": continent.id,
        onClick: event => event.stopPropagation()
    },
        owned ? h("span", { className: "sp-world-region__owner", "aria-label": "Your region" }, "YOU") : null,
        h("button", {
            type: "button",
            className: "sp-world-region__toggle",
            onClick: () => onToggle(player.id),
            "aria-expanded": expanded,
            "aria-label": `${expanded ? "Collapse" : "Expand"} ${continent.name}`
        },
            h("span", { className: "sp-world-region__icon", "aria-hidden": "true" }, continentIcons[continent.id]),
            expanded ? h("span", { className: "sp-world-region__identity" },
                h("strong", null, continent.name),
                h("small", null, player.name)
            ) : null,
            condition ? h("span", { className: "sp-world-region__condition", "aria-label": "Local Condition active" }, "!") : null
        ),
        
        beginnerMap && layer === "results" ? h("div", { className: "sp-map-brief-results" },
            result.generation ? h(React.Fragment, null,
                h("strong", null, `✦ ${result.lights}/${result.demand}`),
                h("span", null, `♨ ${result.loss}`)
            ) : h("small", null, gameText.beginner.map.awaitingShort)
        ) : null,
        (!beginnerMap || layer === "resources") ? h("div", { className: `sp-world-region__resources ${expanded ? "is-expanded" : "is-compact"}` },
            ...resourceKeys.map(resource => h(RegionResource, {
                key: resource,
                game,
                player,
                resource,
                interactive,
                onExtract,
                onBlocked,
                expanded
            })),
            h("span", {
                className: `sp-world-light ${expanded ? "is-expanded" : "is-compact"}`,
                "aria-label": `${player.cumulative.totalLight} total Light`
            },
                h("span", { className: "sp-world-light__icon", "aria-hidden": "true" }, "✦"),
                expanded ? h("span", { className: "sp-world-light__label" }, interfaceCopy.map.light) : null,
                h("strong", null, player.cumulative.totalLight)
            )
        ) : null,
        expanded ? h("div", { className: "sp-world-region__meta" },
            h("span", null, h("small", null, interfaceCopy.map.signature), h("strong", null, pathwayLabels[continent.signatureRenewable])),
            featureEnabled(game, "knowledgeRequirements") ? h("span", null, h("small", null, interfaceCopy.map.knowledge), h("strong", null, effectiveKnowledge)) : null,
            h("span", null, h("small", null, interfaceCopy.map.grid), h("strong", null, getTransmissionLevel(game, player.id))),
            h("span", null, h("small", null, interfaceCopy.map.latestLight), h("strong", null, latestLight))
        ) : null
    );
}

function MapWarehouse({ game, player }) {
    if (!player) return null;
    const used = warehouseTotal(player);
    const maximum = game.config.rules.warehouseMaximum;
    return h("div", {
        className: "sp-world-warehouse",
        "aria-label": `${player.name} Warehouse ${used} of ${maximum}`
    },
        h("strong", null, `${interfaceCopy.map.warehouse} ${used}/${maximum}`),
        h("div", { className: "sp-world-warehouse__resources" },
            ...resourceKeys.map(resource => h("span", { key: resource },
                h("b", { "aria-hidden": "true" }, resourceVisuals[resource].icon),
                h("span", null, player.resources[resource].warehouse)
            ))
        )
    );
}

export function WorldMap({ game, expandedId, onToggle, onExtract, onBlocked, transfer, viewerId, warehousePlayerId, gatherGuidePlayerId = null }) {
    const [layer, setLayer] = React.useState("built");
    const [layout, setLayout] = React.useState("markers");
    const [focusId, setFocusId] = React.useState(null);
    const [zoomId, setZoomId] = React.useState(null);
    const [zoomAmount, setZoomAmount] = React.useState(1.4);
    const mapScrollRef = React.useRef(null);
    // Gather opens the resource layer and the active continent, rather than
    // relying on the player to discover the layer switch manually.
    React.useEffect(() => {
        if (!gatherGuidePlayerId) return;
        setLayer("resources");
        setFocusId(gatherGuidePlayerId);
        setLayout("markers");
        setZoomId(null);
    }, [gatherGuidePlayerId]);
    const beginnerMap = game.gameMode === "beginner" && game.config.rules.generations === 4;
    const mapLayer = beginnerMap ? layer : null;
    const t = gameText.beginner.map;
    const focusPlayer = game.players[focusId] || game.players[viewerId] || game.players[currentOrder(game)[0]];
    const turnActiveId = currentPlayerId(game);
    const zoomPlayer = zoomId && game.players[zoomId];
    const zoomPosition = zoomPlayer ? worldMapPositions[zoomPlayer.continentId] : null;
    const selectContinent = clickedId => {
        setFocusId(clickedId);
        if (layer === "resources") onToggle(clickedId);
        setLayout("focus");
        setZoomId(clickedId);
        setZoomAmount(1.4);
    };
    const viewerPlayer = viewerId ? game.players[viewerId] : null;
    const warehousePlayer = warehousePlayerId ? game.players[warehousePlayerId] : viewerPlayer;
    const transferPlayer = transfer ? game.players[transfer.playerId] : null;
    const transferPosition = transferPlayer ? worldMapPositions[transferPlayer.continentId] : null;
    React.useEffect(() => {
        const surface = mapScrollRef.current;
        if (!beginnerMap || !surface || surface.scrollWidth <= surface.clientWidth) return;
        const player = game.players[zoomId] || game.players[viewerId] || game.players[currentOrder(game)[0]];
        const position = worldMapPositions[player?.continentId];
        if (position) surface.scrollLeft = (surface.scrollWidth * parseFloat(position.left) / 100) - surface.clientWidth / 2;
    }, [beginnerMap, viewerId, zoomId]);

    return panel(interfaceCopy.map.title,
        h("div", { className: `sp-world-map ${beginnerMap ? "sp-world-map--beginner" : ""}` },
            beginnerMap ? h("div", { className: "sp-map-controls", "aria-label": t.controls },
                h("div", { className: "sp-map-controls__layers", role: "group", "aria-label": t.chooseLayer },
                    ...["built", "resources", "results"].map(id => h("button", {
                        key: id, type: "button", "aria-pressed": layer === id,
                        className: layer === id ? "is-selected" : "",
                        onClick: () => setLayer(id)
                    }, t.layers[id]))
                ),
                h("div", { className: "sp-map-controls__layouts", role: "group", "aria-label": t.chooseStyle },
                    zoomId ? h(React.Fragment, null,
                        h("button", { type: "button", "aria-label": "Zoom out", disabled: zoomAmount <= 1.15, onClick: () => setZoomAmount(z => Math.max(1.15, +(z - .2).toFixed(2))) }, "−"),
                        h("button", { type: "button", "aria-label": "Zoom in", disabled: zoomAmount >= 2, onClick: () => setZoomAmount(z => Math.min(2, +(z + .2).toFixed(2))) }, "+"),
                        h("button", { type: "button", onClick: () => { setZoomId(null); setFocusId(null); setLayout("markers"); } }, t.resetMapButton)
                    ) : h("span", { className: "sp-map-controls__hint" }, t.selectContinent)
                )
            ) : null,
            h("div", {
                className: `sp-world-map__surface ${expandedId ? "has-expanded-region" : ""}`,
                ref: mapScrollRef,
                role: "group",
                "aria-label": interfaceCopy.map.ariaLabel,
                onClick: () => (!beginnerMap || layer === "resources") && expandedId && onToggle(expandedId)
            },
                h("div", {
                    className: `sp-world-map__world ${beginnerMap && zoomPosition ? "is-zoomed" : ""}`,
                    style: zoomPosition ? { "--map-zoom-x": zoomPosition.left, "--map-zoom-y": zoomPosition.top, "--map-zoom-scale": zoomAmount } : null
                },
                    h("svg", { className: `sp-world-map__silhouette ${beginnerMap ? "sp-world-map__natural" : ""}`,
                        viewBox: "0 0 1000 500", role: "img",
                        "aria-label": beginnerMap ? t.geographyAria : "Stylised world map" },
                        beginnerMap ? h(React.Fragment, null,
                            h("defs", null,
                                h("clipPath", { id: "sp-geographic-land", clipPathUnits: "userSpaceOnUse" },
                                    ...worldCoastline.map((d, i) => h("path", { key: i, d, fillRule: "evenodd" }))
                                ),
                                h("linearGradient", { id: "sp-land-fill", x1: "0", y1: "0", x2: ".55", y2: "1" },
                                    h("stop", { offset: "0%", stopColor: "#769e7b" }),
                                    h("stop", { offset: "44%", stopColor: "#436f63" }),
                                    h("stop", { offset: "100%", stopColor: "#254b47" })
                                )
                            ),
                            ...worldCoastline.map((d, index) => h("path", {
                                key: index, d, fillRule: "evenodd", className: "sp-map-land"
                            })),
                            // Geographical division: display it on land only, no country borders.
                            h("g", { clipPath: "url(#sp-geographic-land)" },
                                h("path", { d: europeAsiaDivide, className: "sp-map-europe-asia-boundary" },
                                    h("title", null, "Approximate Europe–Asia geographical boundary"))
                            ),
                            beginnerMap && layer === "built" ? h("g", {
                                className: "sp-map-geographic-assets", clipPath: "url(#sp-geographic-land)",
                                "aria-label": "Installed power plants anchored to the continent geography"
                            }, ...currentOrder(game).flatMap(id => {
                                const player = game.players[id];
                                const sites = continentAssetSites[player.continentId] || {};
                                const all = mapAssets(game, player).filter(asset => sites[asset.id]);
                                const prioritized = [...all].sort((a,b) =>
                                    Number(b.technologies.some(tech=>!tech.inherited && tech.builtGeneration===game.generation)) -
                                    Number(a.technologies.some(tech=>!tech.inherited && tech.builtGeneration===game.generation))
                                );
                                // World-scale summary: show at most three land-locked structures.
                                // The expanded landscape presents EVERY installed pathway.
                                return prioritized.slice(0,3).map(asset => h(MapAssetSymbol, {
                                    key: `${id}-${asset.id}`, type: asset.id, count: asset.count,
                                    x: sites[asset.id][0], y: sites[asset.id][1],
                                    isNew: asset.technologies.some(tech => !tech.inherited && tech.builtGeneration === game.generation)
                                }));
                            })) : null,
                            ...currentOrder(game).map(id => {
                                const player = game.players[id];
                                const continent = getContinentProfile(game, player);
                                const position = worldMapPositions[continent.id];
                                const x = parseFloat(position.left) * 10;
                                const y = parseFloat(position.top) * 5;
                                return h("circle", {
                                    key: `click-${id}`, cx: x, cy: y, r: 42,
                                    className: `sp-map-area ${id === focusId ? "is-selected" : ""}`,
                                    role: "button", tabIndex: 0, "aria-label": `${t.explore} ${continent.name}`,
                                    onClick: event => { event.stopPropagation(); selectContinent(id); },
                                    onKeyDown: event => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault(); event.stopPropagation(); selectContinent(id);
                                        }
                                    }
                                }, h("title", null, continent.name));
                            })
                        ) : h(React.Fragment, null,
                            h("path", { d: "M70 110 C130 55 230 55 310 105 L280 170 220 190 180 245 110 215 55 160 Z" }),
                            h("path", { d: "M245 245 C305 230 350 260 365 320 L340 430 292 470 265 385 220 320 Z" }),
                            h("path", { d: "M420 115 C500 70 650 75 760 110 L885 170 830 235 720 220 650 185 590 210 500 180 430 195 390 155 Z" }),
                            h("path", { d: "M460 205 C535 185 610 220 620 300 L570 405 505 380 455 300 425 235 Z" }),
                            h("path", { d: "M760 310 C820 280 900 305 940 365 L900 430 815 420 755 370 Z" })
                        )
                    ),
                    ...currentOrder(game).map(id => h(RegionMarker, {
                        key: id,
                        game,
                        player: game.players[id],
                        expanded: beginnerMap ? (layout === "markers" && layer !== "resources" ? id === focusId : layer === "resources" && id === expandedId) : id === expandedId,
                        owned: id === viewerId,
                        turnActive: id === turnActiveId,
                        onToggle: beginnerMap ? selectContinent : onToggle,
                        onExtract,
                        onBlocked,
                        layer: mapLayer,
                        position: worldMapPositions[game.players[id].continentId]
                    })),
                    transfer && transferPosition ? h("div", {
                        key: transfer.id,
                        className: "sp-world-transfer",
                        style: { "--from-left": transferPosition.left, "--from-top": transferPosition.top }
                    }, ...Array.from({ length: transfer.amount }, (_, index) => h("span", {
                        key: index,
                        style: { animationDelay: `${index * 80}ms` }
                    }, resourceVisuals[transfer.resource].icon))) : null
                ),
                !beginnerMap ? h(MapWarehouse, { game, player: transferPlayer ?? warehousePlayer }) : null
            ),
            beginnerMap ? h("div", { className: "sp-map-bottom-bar" },
                h(MapWarehouse, { game, player: transferPlayer ?? warehousePlayer }),
                h("small", { className: "sp-map-swipe-hint" }, t.swipeMap)
            ) : null,
            beginnerMap && layout === "focus" && focusPlayer ? h(MapFocus, { game, player: focusPlayer, layer }) : null
        )
    );
}
