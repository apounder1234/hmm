// @ts-nocheck
import { uiShared } from "./uiShared.js";
import { interfaceCopy, resourceVisuals } from "./uiCopy.js";

const {
    React,
    h,
    panel,
    currentOrder,
    currentPlayerId,
    conditionDefinition,
    developmentActionLegality,
    gatherAmount,
    getContinentProfile,
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
        "aria-label": legal
            ? `Extract ${amount} ${resourceLabels[resource]} from ${getContinentProfile(game, player).name}`
            : `${resourceLabels[resource]}: ${legality?.reason || interfaceCopy.map.extractionUnavailable}`
    }, content);
}

function RegionMarker({ game, player, expanded, active, onToggle, onExtract, onBlocked, position }) {
    const continent = getContinentProfile(game, player);
    const condition = conditionDefinition(game, player);
    const interactive = player.id === currentPlayerId(game)
        && game.phase === "generation.development"
        && player.controller.kind === "human";
    const effectiveKnowledge = player.knowledge + player.temporaryKnowledge;
    const latestLight = player.lightByGeneration[game.generation - 1] ?? "—";

    return h("article", {
        className: `sp-world-region ${expanded ? "is-expanded" : ""} ${active ? "is-active" : ""}`,
        style: { left: position.left, top: position.top },
        "data-continent": continent.id,
        onClick: event => event.stopPropagation()
    },
        active ? h("span", { className: "sp-world-region__owner", "aria-label": "Your region" }, "YOU") : null,
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
        h("div", { className: `sp-world-region__resources ${expanded ? "is-expanded" : "is-compact"}` },
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
        ),
        expanded ? h("div", { className: "sp-world-region__meta" },
            h("span", null, h("small", null, interfaceCopy.map.signature), h("strong", null, pathwayLabels[continent.signatureRenewable])),
            h("span", null, h("small", null, interfaceCopy.map.knowledge), h("strong", null, effectiveKnowledge)),
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

export function WorldMap({ game, expandedId, onToggle, onExtract, onBlocked, transfer }) {
    const activeId = currentPlayerId(game);
    const activePlayer = activeId ? game.players[activeId] : null;
    const transferPlayer = transfer ? game.players[transfer.playerId] : null;
    const transferPosition = transferPlayer ? worldMapPositions[transferPlayer.continentId] : null;

    return panel(interfaceCopy.map.title,
        h("div", { className: "sp-world-map" },
            h("div", {
                className: `sp-world-map__surface ${expandedId ? "has-expanded-region" : ""}`,
                role: "group",
                "aria-label": interfaceCopy.map.ariaLabel,
                onClick: () => expandedId && onToggle(expandedId)
            },
                h("svg", { className: "sp-world-map__silhouette", viewBox: "0 0 1000 500", role: "img", "aria-label": "Stylised world map" },
                    h("path", { d: "M70 110 C130 55 230 55 310 105 L280 170 220 190 180 245 110 215 55 160 Z" }),
                    h("path", { d: "M245 245 C305 230 350 260 365 320 L340 430 292 470 265 385 220 320 Z" }),
                    h("path", { d: "M420 115 C500 70 650 75 760 110 L885 170 830 235 720 220 650 185 590 210 500 180 430 195 390 155 Z" }),
                    h("path", { d: "M460 205 C535 185 610 220 620 300 L570 405 505 380 455 300 425 235 Z" }),
                    h("path", { d: "M760 310 C820 280 900 305 940 365 L900 430 815 420 755 370 Z" })
                ),
                ...currentOrder(game).map(id => h(RegionMarker, {
                    key: id,
                    game,
                    player: game.players[id],
                    expanded: id === expandedId,
                    active: id === activeId,
                    onToggle,
                    onExtract,
                    onBlocked,
                    position: worldMapPositions[game.players[id].continentId]
                })),
                transfer && transferPosition ? h("div", {
                    key: transfer.id,
                    className: "sp-world-transfer",
                    style: { "--from-left": transferPosition.left, "--from-top": transferPosition.top }
                }, ...Array.from({ length: transfer.amount }, (_, index) => h("span", {
                    key: index,
                    style: { animationDelay: `${index * 80}ms` }
                }, resourceVisuals[transfer.resource].icon))) : null,
                h(MapWarehouse, { game, player: transferPlayer ?? activePlayer })
            )
        )
    );
}
