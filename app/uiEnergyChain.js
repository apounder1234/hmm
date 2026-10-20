// @ts-check
import { uiShared } from "./uiShared.js?v=a5.52.0";
import { gameText } from "./gameText.js?v=a5.52.0";

const {
    h,
    button,
    getEnergyChainBreakdown,
    pathwayLabels
} = uiShared;
const { useState } = uiShared.React;

const SOURCE_ICONS = Object.freeze({
    solar: "☀",
    wind: "≋",
    hydro: "💧",
    biomass: "🌿",
    fossil: "⛽"
});

/**
 * @typedef {"playerBoard"|"turnBoard"|"dispatchBoard"} EnergyChainContext
 */

/**
 * Build the single presentation model used by every Energy-chain display.
 * The engine/view-model owns all calculations; this function only arranges
 * those canonical values into five visible stages.
 *
 * @param {any} game
 * @param {string} playerId
 */
export function getEnergyChainPresentation(game, playerId) {
    const chain = getEnergyChainBreakdown(game, playerId);
    const ledger = chain.lossLedger;
    const cumulativeLedger = game.players[playerId]?.cumulative?.lossLedger ?? { fuelSupply: 0, generationHeat: 0, storageHeat: 0, lightingHeat: 0, other: 0, curtailed: 0 };
    const cumulativeSystemLoss = cumulativeLedger.fuelSupply + cumulativeLedger.generationHeat + cumulativeLedger.storageHeat + cumulativeLedger.lightingHeat + cumulativeLedger.other;
    const pendingBattery = chain.chargedForNextGeneration ?? 0;
    const pendingReservoir = chain.reservoirCapturedForNextGeneration ?? 0;
    const activeSources = Object.entries(chain.sourceByPathway)
        .filter(([, value]) => Number(value) > 0)
        .map(([pathway]) => ({
            pathway,
            icon: SOURCE_ICONS[pathway] ?? "⚡",
            label: pathwayLabels[pathway] ?? pathway
        }));
    const summary = `${chain.grossGenerated} normalized Source Energy, ${chain.usableEnergy} Electricity available, ${chain.deliveredEnergy} Electricity used and ${chain.lightProduced} Lights supplied.`;

    return {
        chain,
        summary,
        activeSources,
        pendingBattery,
        pendingReservoir,
        details: [
            `Normalized Source Energy: ${chain.grossGenerated}.`,
            "Solar, Wind and Hydro begin at captured electrical output in this game; uncaptured sunlight, wind and water are not scored as System Loss.",
            `Electricity generated or recovered now: ${chain.usableEnergy}.`,
            `Fuel-supply loss: ${ledger.fuelSupply}.`,
            `Generation heat: ${ledger.generationHeat}.`,
            game.gameMode === "beginner" && game.config.rules.generations === 4 ? null : `Storage heat: ${ledger.storageHeat}.`,
            `Lighting heat: ${ledger.lightingHeat}.`,
            `Other counted loss: ${ledger.other}.`,
            `Unused or curtailed Electricity: ${ledger.curtailed}.`,
            game.gameMode === "beginner" && game.config.rules.generations === 4 ? null : `Battery charging for next Generation: ${pendingBattery}.`,
            pendingReservoir ? `Reservoir capture for next Generation: ${pendingReservoir}.` : null,
            `Electricity used by Lighting: ${chain.deliveredEnergy}/${chain.gridCapacity} Grid capacity.`,
            "The Grid restricts how much Electricity can pass; it does not deduct a whole bar as transmission heat. Real grids have smaller physical losses.",
            "Lighting heat is a simplified game penalty, not a direct conversion from Light points to Energy. Zero counted LED loss does not mean LEDs are heat-free.",
            `Lights supplied: ${chain.lightProduced}.`,
            `Cumulative Loss Ledger: ${cumulativeSystemLoss} System Loss (${cumulativeLedger.fuelSupply} Fuel supply + ${cumulativeLedger.generationHeat} generation heat + ${cumulativeLedger.storageHeat} storage heat + ${cumulativeLedger.lightingHeat} lighting heat + ${cumulativeLedger.other} other); ${cumulativeLedger.curtailed} unused Electricity.`
        ].filter(Boolean),
        stages: [
            {
                id: "source",
                icon: "◉",
                label: "Source Energy now",
                value: chain.grossGenerated,
                kind: "source",
                losses: ledger.fuelSupply ? [{ icon: "◌", count: ledger.fuelSupply, label: "Fuel-supply loss", kind: "supply" }] : [],
                infoTitle: "Source Energy",
                infoSummary: `${chain.grossGenerated} normalised game-Energy enters from sources this Generation. Fuel and Biomass include a source-to-electricity step; Solar, Wind and Hydro start at their captured electrical output. Uncaptured sunlight, wind and water are not counted as System Loss.`
            },
            {
                id: "electricity",
                icon: "⚡",
                label: "Electricity",
                value: chain.usableEnergy,
                kind: "electricity",
                losses: [
                    ...(ledger.generationHeat ? [{ icon: "♨", count: ledger.generationHeat, label: "Generation heat", kind: "heat" }] : []),
                    ...(ledger.storageHeat ? [{ icon: "♨", count: ledger.storageHeat, label: "Storage heat", kind: "heat" }] : []),
                    ...(ledger.other ? [{ icon: "◌", count: ledger.other, label: "Other counted loss", kind: "other" }] : [])
                ],
                infoTitle: "Electricity available",
                infoSummary: `${chain.usableEnergy} Electricity is available now${chain.storageReleased ? `, including ${chain.storageReleased} recovered from earlier storage` : ""}.`
            },
            {
                id: "grid",
                icon: "⚡",
                label: "Grid",
                value: chain.deliveredEnergy,
                kind: "electricity",
                losses: ledger.curtailed ? [{ icon: "◌", count: ledger.curtailed, label: "Unused Electricity", kind: "curtailed" }] : [],
                infoTitle: "Grid",
                infoSummary: `${chain.deliveredEnergy} Electricity reaches Lighting through a Grid capacity of ${chain.gridCapacity}. The Grid limits throughput; it does not remove a whole Electricity bar as heat. Real grid losses are smaller than one game bar here. Unused or curtailed Electricity is tracked separately from System Loss.`
            },
            {
                id: "lighting",
                icon: "💡",
                label: "Lights supplied",
                value: chain.lightProduced,
                kind: "light",
                losses: ledger.lightingHeat ? [{ icon: "♨", count: ledger.lightingHeat, label: "Lighting heat", kind: "heat" }] : [],
                infoTitle: "Lighting",
                infoSummary: `${chain.deliveredEnergy} Electricity is used to supply ${chain.lightProduced} Lights. A Light is a lighting-service point, not an Energy unit. The heat indicator is a simplified counted penalty for lighting inefficiency: an LED's zero counted loss does not mean it produces no real heat.`
            }
        ]
    };
}

/** @param {{count:number, kind?:string, maximum?:number}} props */
function EnergyPips({ count, kind = "energy", maximum = 12 }) {
    const visible = Math.max(0, Math.min(maximum, Math.floor(count ?? 0)));
    return h("span", { className: `sp-energy-chain__pips is-${kind}`, "aria-label": `${visible} ${kind}` },
        ...Array.from({ length: visible }, (_, index) => h("i", { key: index, "aria-hidden": "true" }))
    );
}

/** @param {{losses:Array<{icon:string,count:number,label:string,kind:string}>, label:string}} props */
function LossMarks({ losses, label }) {
    if (losses?.length) {
        return h("span", { className: "sp-energy-chain__loss-list", "aria-label": `${label} losses` },
            ...losses.map(loss => h("span", { key: `${loss.kind}-${loss.label}`, className: `sp-energy-chain__loss is-${loss.kind}`, title: loss.label },
                h("b", { "aria-hidden": "true" }, loss.icon),
                h("span", null, loss.count),
                h("small", null, loss.label)
            ))
        );
    }
    return h("span", { className: "sp-energy-chain__pass", "aria-label": `No counted loss at ${label}` }, "No counted loss");
}

/**
 * @param {{stage:any, model:any, onInfo:(content:any)=>void}} props
 */
function EnergyStage({ stage, model, onInfo, onSelect, beginner }) {
    const extras = [];
    if (stage.id === "source") {
        extras.push(h("span", { key: "sources", className: "sp-energy-chain__sources", "aria-label": "Active pathways" },
            ...(model.activeSources.length
                ? model.activeSources.map(source => h("span", {
                    key: source.pathway,
                    className: `sp-energy-chain__source-icon source-${source.pathway}`,
                    "aria-label": source.label
                }, source.icon))
                : [h("span", { key: "none", className: "sp-energy-chain__source-icon is-muted", "aria-hidden": "true" }, "·")])
        ));
    }
    if (stage.id === "electricity" && model.chain.storageReleased) {
        extras.push(h("span", {
            key: "released",
            className: "sp-energy-chain__note",
            "aria-label": `${model.chain.storageReleased} Electricity recovered from earlier storage`
        }, "▣+", model.chain.storageReleased));
    }

    return h("button", {
        type: "button",
        className: `sp-energy-chain__stage stage-${stage.id}`,
        onClick: () => beginner ? onSelect?.(stage.id) : onInfo?.({
            eyebrow: "Energy flow",
            title: stage.infoTitle,
            summary: stage.infoSummary,
            details: [model.summary]
        })
    },
        h("small", { className: "sp-energy-chain__stage-label" }, stage.label),
        h("span", { className: "sp-energy-chain__stage-main" },
            h("span", { className: "sp-energy-chain__stage-icon", "aria-hidden": "true" }, stage.icon),
            h("span", { className: "sp-energy-chain__stage-content" },
                h("span", { className: "sp-energy-chain__value-row" },
                    h(EnergyPips, { count: stage.value, kind: stage.kind }),
                    h("b", { className: "sp-energy-chain__stage-total" }, stage.value)
                ),
                h(LossMarks, { losses: stage.losses, label: stage.label }),
                ...extras
            )
        )
    );
}

/**
 * Shared Energy-chain renderer for the Player Board, turn board and Dispatch.
 *
 * @param {{game:any, player:any, onInfo:(content:any)=>void, context?:EnergyChainContext, showDetails?:boolean}} props
 */
export function EnergyChain({ game, player, onInfo, context = "playerBoard", showDetails = true }) {
    const model = getEnergyChainPresentation(game, player.id);
    const beginner = game.gameMode === "beginner" && game.config.rules.generations === 4;
    const [selectedStage, setSelectedStage] = useState(null);
    const previewWords = gameText.beginner.flowPreview;
    const stageNodes = [];
    model.stages.forEach((stage, index) => {
        stageNodes.push(h(EnergyStage, { key: stage.id, stage, model, onInfo, onSelect: setSelectedStage, beginner }));
        if (index < model.stages.length - 1) {
            stageNodes.push(h("span", { key: `arrow-${stage.id}`, className: "sp-energy-chain__arrow", "aria-hidden": "true" }, "›"));
        }
    });

    return h("div", {
        className: "sp-energy-chain",
        "data-context": context,
        role: "group",
        "aria-label": model.summary
    },
        h("p", { className: "sp-energy-chain__projection" }, context === "dispatchBoard" ? "PROJECTED FLOW · not delivered until you confirm" : game.phase === "generation.review" ? "SYSTEM SNAPSHOT · see Generation Review for actual result" : "SYSTEM PREVIEW · under current conditions"),
        h("div", { className: "sp-energy-chain__row" }, ...stageNodes),
        beginner ? h("div", { className: "beginner-preview-guide" },
            selectedStage ? h("div", { className: "beginner-preview-guide__detail", role: "status" },
                h("strong", null, model.stages.find(stage => stage.id === selectedStage)?.infoTitle),
                h("p", null, previewWords[selectedStage]),
                h("small", null, context === "dispatchBoard" ? gameText.beginner.dispatch.projected : gameText.beginner.flowPreview.pending),
                h("button", { type: "button", onClick: () => setSelectedStage(null), "aria-label": previewWords.close }, previewWords.close)
            ) : h("p", { className:"beginner-preview-guide__prompt" }, h("span", { "aria-hidden": "true" }, "↖ "), previewWords.message)
        ) : null,
        model.pendingBattery || model.pendingReservoir
            ? h("div", {
                className: "sp-energy-chain__future-storage",
                "aria-label": `${model.pendingBattery + model.pendingReservoir} Energy stored for next Generation`
            },
                h("span", { className: "sp-energy-chain__future-line", "aria-hidden": "true" }, "↘"),
                model.pendingBattery
                    ? h("span", { className: "sp-energy-chain__future-node", "aria-label": `${model.pendingBattery} Battery Energy available next Generation` },
                        h("b", { "aria-hidden": "true" }, "▣"),
                        h(EnergyPips, { count: model.pendingBattery, kind: "pending" })
                    )
                    : null,
                model.pendingReservoir
                    ? h("span", { className: "sp-energy-chain__future-node", "aria-label": `${model.pendingReservoir} Reservoir Energy available next Generation` },
                        h("b", { "aria-hidden": "true" }, "💧"),
                        h(EnergyPips, { count: model.pendingReservoir, kind: "pending" })
                    )
                    : null,
                h("span", { className: "sp-energy-chain__future-generation", "aria-hidden": "true" }, "G+1")
            )
            : null,
        showDetails
            ? button(beginner ? gameText.beginner.flowPreview.fullDetails : "Details", () => onInfo?.({
                eyebrow: "Energy flow",
                title: "Current system",
                summary: model.summary,
                details: model.details
            }), { kind: "ghost compact sp-energy-chain__details" })
            : null,
        h("p", { className: "sr-only" }, model.summary)
    );
}
