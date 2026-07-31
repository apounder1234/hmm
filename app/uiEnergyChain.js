// @ts-check
import { uiShared } from "./uiShared.js?v=a5.22.27";

const {
    h,
    button,
    getEnergyChainBreakdown,
    pathwayLabels
} = uiShared;

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
    const fossilStorageLoss = chain.fossilChain?.storageLoss ?? 0;
    const recoveryLoss = Math.max(0, chain.storageLoss - fossilStorageLoss);
    const afterStorage = Math.max(0, chain.grossGenerated - fossilStorageLoss) + chain.storageReleased;
    const afterTransformation = chain.usableEnergy;
    const pendingBattery = chain.chargedForNextGeneration ?? 0;
    const pendingReservoir = chain.reservoirCapturedForNextGeneration ?? 0;
    const activeSources = Object.entries(chain.sourceByPathway)
        .filter(([, value]) => Number(value) > 0)
        .map(([pathway]) => ({
            pathway,
            icon: SOURCE_ICONS[pathway] ?? "⚡",
            label: pathwayLabels[pathway] ?? pathway
        }));
    const summary = `${chain.grossGenerated} Energy at Source, ${afterStorage} after Storage, ${afterTransformation} after Transformation, ${chain.deliveredEnergy} through the Grid and ${chain.lightProduced} Light.`;

    return {
        chain,
        summary,
        activeSources,
        pendingBattery,
        pendingReservoir,
        details: [
            `Source Energy: ${chain.grossGenerated}.`,
            `Storage loss: ${chain.storageLoss} (${fossilStorageLoss} Fuel storage; ${recoveryLoss} storage recovery).`,
            `Released from earlier storage: ${chain.storageReleased}.`,
            `Transformation loss: ${chain.transformationLoss}.`,
            `Battery charging for next Generation: ${pendingBattery}.`,
            `Reservoir capture for next Generation: ${pendingReservoir}.`,
            `Grid delivery: ${chain.deliveredEnergy}/${chain.gridCapacity}.`,
            `Light: ${chain.lightProduced}.`
        ],
        stages: [
            {
                id: "source",
                icon: "⚡",
                label: "Source",
                value: chain.grossGenerated,
                loss: 0,
                infoTitle: "Source Energy",
                infoSummary: `${chain.grossGenerated} Energy is available from current pathways before Storage and Transformation.`
            },
            {
                id: "storage",
                icon: "▣",
                label: "Storage",
                value: afterStorage,
                loss: chain.storageLoss,
                infoTitle: "Storage",
                infoSummary: chain.storageReleased
                    ? `${chain.storageReleased} Energy stored in an earlier Generation is released now.`
                    : fossilStorageLoss
                        ? `${fossilStorageLoss} Energy is lost in Fuel storage.`
                        : "Energy passes through this stage; no stored Energy is released now."
            },
            {
                id: "transformation",
                icon: "⚙",
                label: "Transformation",
                value: afterTransformation,
                loss: chain.transformationLoss,
                infoTitle: "Transformation",
                infoSummary: chain.transformationLoss
                    ? `${chain.transformationLoss} Energy is lost while Fuel or Biomass is transformed.`
                    : "Energy passes through Transformation without an additional loss in the current system."
            },
            {
                id: "grid",
                icon: "↔",
                label: "Grid",
                value: chain.deliveredEnergy,
                loss: chain.unusedEnergy,
                infoTitle: "Grid",
                infoSummary: `${chain.deliveredEnergy} of ${chain.gridCapacity} Grid capacity is used.`
            },
            {
                id: "lighting",
                icon: "💡",
                label: "Light",
                value: chain.lightProduced,
                loss: chain.lightingLoss,
                infoTitle: "Lighting",
                infoSummary: `${chain.deliveredEnergy} Energy reaches Lighting and produces ${chain.lightProduced} Light.`
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

/** @param {{count:number, label:string}} props */
function LossMarks({ count, label }) {
    if (count > 0) {
        return h("span", { className: "sp-energy-chain__loss", "aria-label": `${count} Energy lost at ${label}` },
            ...Array.from({ length: Math.min(12, count) }, (_, index) => h("i", { key: index, "aria-hidden": "true" }))
        );
    }
    return h("span", { className: "sp-energy-chain__pass", "aria-label": `No Energy lost at ${label}` }, "→");
}

/**
 * @param {{stage:any, model:any, onInfo:(content:any)=>void}} props
 */
function EnergyStage({ stage, model, onInfo }) {
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
    if (stage.id === "storage" && model.chain.storageReleased) {
        extras.push(h("span", {
            key: "released",
            className: "sp-energy-chain__note",
            "aria-label": `${model.chain.storageReleased} Energy released from earlier storage`
        }, "▣+", model.chain.storageReleased));
    }

    return h("button", {
        type: "button",
        className: `sp-energy-chain__stage stage-${stage.id}`,
        onClick: () => onInfo?.({
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
                    h(EnergyPips, { count: stage.value }),
                    h("b", { className: "sp-energy-chain__stage-total" }, stage.value)
                ),
                h(LossMarks, { count: stage.loss, label: stage.label }),
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
    const stageNodes = [];
    model.stages.forEach((stage, index) => {
        stageNodes.push(h(EnergyStage, { key: stage.id, stage, model, onInfo }));
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
        h("div", { className: "sp-energy-chain__row" }, ...stageNodes),
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
            ? button("Details", () => onInfo?.({
                eyebrow: "Energy flow",
                title: "Current system",
                summary: model.summary,
                details: model.details
            }), { kind: "ghost compact sp-energy-chain__details" })
            : null,
        h("p", { className: "sr-only" }, model.summary)
    );
}
