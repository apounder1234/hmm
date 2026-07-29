function escapeCsv(value) {
    if (value === null || value === undefined)
        return "";
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function rowsToCsv(rows) {
    if (rows.length === 0)
        return "";
    const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
    return [headers.join(","), ...rows.map(row => headers.map(header => escapeCsv(row[header])).join(","))].join("\n");
}
export function playerResultsToCsv(results) {
    return rowsToCsv(results.map(row => ({
        ...row,
        purchasedTechnologyIds: row.purchasedTechnologyIds.join("|"),
        installedPathways: row.installedPathways.join("|")
    })));
}
function aggregateFlat(row) {
    return {
        id: row.id,
        games: row.games,
        lightMean: row.light.mean,
        lightMedian: row.light.median,
        lightP10: row.light.p10,
        lightP90: row.light.p90,
        lightMinimum: row.light.minimum,
        lightMaximum: row.light.maximum,
        winRate: row.winRate,
        reliabilityMean: row.reliabilityMean,
        demandMetMean: row.demandMetMean,
        finalDemandMetRate: row.finalDemandMetRate,
        systemLossMean: row.systemLossMean,
        curtailmentMean: row.curtailmentMean,
        storedEnergyMean: row.storedEnergyMean,
        tradeMean: row.tradeMean,
        importMean: row.importMean,
        knowledgeGainMean: row.knowledgeGainMean,
        knowledgeLinkReceivedMean: row.knowledgeLinkReceivedMean,
        knowledgeLinkProvidedMean: row.knowledgeLinkProvidedMean,
        appliedLearningGainMean: row.appliedLearningGainMean
    };
}
export function aggregateReportToCsv(report) {
    const rows = [
        ...report.byContinent.map(row => ({ group: "continent", ...aggregateFlat(row) })),
        ...report.byStrategy.map(row => ({ group: "strategy", ...aggregateFlat(row) }))
    ];
    return rowsToCsv(rows);
}
export function balanceFlagsToCsv(report) {
    return rowsToCsv(report.flags.map(item => ({
        id: item.id,
        severity: item.severity,
        title: item.title,
        message: item.message,
        measuredValue: item.measuredValue,
        threshold: item.threshold,
        evidence: item.evidence
    })));
}
//# sourceMappingURL=csv.js.map