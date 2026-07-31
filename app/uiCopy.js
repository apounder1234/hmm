/**
 * Player-facing labels and visual tokens shared by the map and player board.
 * Keep compact labels here; explanatory rules remain in uiShared/viewModel.
 */
export const resourceVisuals = Object.freeze({
    fossilFuel: Object.freeze({ icon: "●", short: "Fuel" }),
    biomass: Object.freeze({ icon: "♣", short: "Biomass" }),
    constructionMaterials: Object.freeze({ icon: "▦", short: "Other" }),
    criticalMaterials: Object.freeze({ icon: "◆", short: "Critical" })
});

export const interfaceCopy = Object.freeze({
    map: Object.freeze({
        title: "World",
        ariaLabel: "World map with six playable regions",
        light: "Light",
        totalLight: "Total Light",
        signature: "Signature",
        knowledge: "Knowledge",
        grid: "Grid",
        latestLight: "Latest Light",
        warehouse: "Warehouse",
        extractionUnavailable: "Extraction is unavailable right now."
    }),
    playerBoard: Object.freeze({
        eyebrow: "Player",
        energyFlow: "Energy flow",
        totalLight: "Total Light",
        reliability: "Reliability",
        demandMet: "Demand met",
        details: "Technologies, Light history and regional details",
        installed: "Installed technologies",
        history: "Light and Reliability",
        regionalLimitation: "Regional limitation"
    })
});
