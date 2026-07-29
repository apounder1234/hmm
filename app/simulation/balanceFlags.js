function flag(id, severity, title, message, measuredValue, threshold, evidence = {}) {
    return { id, severity, title, message, measuredValue, threshold, evidence };
}
export function detectBalanceFlags(rows, byContinent, technologyPurchases, weatherRows, byStrategy = []) {
    const flags = [];
    const winners = rows.filter(row => row.winner);
    const overallMean = rows.length ? rows.reduce((sum, row) => sum + row.totalLight, 0) / rows.length : 0;
    const continentMeans = byContinent.map(row => row.light.mean);
    const lightSpread = overallMean > 0 && continentMeans.length ? (Math.max(...continentMeans) - Math.min(...continentMeans)) / overallMean : 0;
    if (lightSpread > 0.1)
        flags.push(flag("continent-light-spread", lightSpread > 0.2 ? "critical" : "warning", "Continental expected Light differs by more than 10%", `The gap between the highest and lowest continental mean Light is ${(lightSpread * 100).toFixed(1)}% of the overall mean.`, lightSpread, 0.1, { highestMean: continentMeans.length ? Math.max(...continentMeans) : 0, lowestMean: continentMeans.length ? Math.min(...continentMeans) : 0 }));
    const dominantTechnology = technologyPurchases.find(row => row.winnerShare > 0.7);
    if (dominantTechnology)
        flags.push(flag("winner-technology-dominance", "critical", "One technology appears in more than 70% of winning systems", `${dominantTechnology.id} appears in ${(dominantTechnology.winnerShare * 100).toFixed(1)}% of winner purchase histories.`, dominantTechnology.winnerShare, 0.7, { technologyId: dominantTechnology.id }));
    const winRates = byContinent.map(row => row.winRate);
    if (winRates.length) {
        const max = Math.max(...winRates);
        const min = Math.min(...winRates);
        const ratio = min === 0 ? (max > 0 ? Number.POSITIVE_INFINITY : 1) : max / min;
        if (ratio > 2)
            flags.push(flag("continent-win-rate-ratio", "critical", "One continent wins more than twice as often as another", min === 0 ? "At least one continent recorded no wins while another did." : `The highest win rate is ${ratio.toFixed(2)} times the lowest.`, Number.isFinite(ratio) ? ratio : 999, 2, { highestWinRate: max, lowestWinRate: min }));
    }
    if (byStrategy.length > 1) {
        const orderedStrategies = [...byStrategy].sort((a, b) => b.winRate - a.winRate);
        const strongest = orderedStrategies[0];
        const weakest = orderedStrategies.at(-1);
        const ratio = weakest.winRate === 0 ? (strongest.winRate > 0 ? Number.POSITIVE_INFINITY : 1) : strongest.winRate / weakest.winRate;
        if (ratio > 4)
            flags.push(flag("strategy-win-rate-ratio", ratio > 8 ? "critical" : "warning", "One AI strategy wins far more often than another", weakest.winRate === 0 ? `${weakest.id} recorded no wins while ${strongest.id} did.` : `${strongest.id} wins ${ratio.toFixed(2)} times as often as ${weakest.id}. This may reflect pathway balance, planning quality or both.`, Number.isFinite(ratio) ? ratio : 999, 4, { strongestStrategy: strongest.id, strongestWinRate: strongest.winRate, weakestStrategy: weakest.id, weakestWinRate: weakest.winRate }));
    }
    const knowledgeGain = rows.reduce((sum, row) => sum + row.knowledgeGained, 0);
    if (knowledgeGain === 0)
        flags.push(flag("knowledge-unused", "warning", "Knowledge is never researched", "No simulated player gained permanent Knowledge.", 0, 1));
    const knowledgeLinks = rows.reduce((sum, row) => sum + row.knowledgeLinksReceived, 0);
    const knowledgeLinkRate = rows.length ? knowledgeLinks / rows.length : 0;
    if (knowledgeLinkRate < 0.05)
        flags.push(flag("knowledge-link-rare", "warning", "Knowledge Links are rarely used", `Knowledge Links averaged ${knowledgeLinkRate.toFixed(3)} uses per player-game.`, knowledgeLinkRate, 0.05));
    if (knowledgeLinkRate > 1.25)
        flags.push(flag("knowledge-link-dominant", "warning", "Knowledge Links may be too routine", `Knowledge Links averaged ${knowledgeLinkRate.toFixed(3)} uses per player-game.`, knowledgeLinkRate, 1.25));
    const trades = rows.reduce((sum, row) => sum + row.tradesCompleted, 0);
    const tradeRate = rows.length ? trades / rows.length : 0;
    if (tradeRate < 0.05)
        flags.push(flag("trade-rare", "warning", "Direct trade is rarely used", `Direct trade averaged ${tradeRate.toFixed(3)} completed trades per player-game.`, tradeRate, 0.05));
    const imports = rows.reduce((sum, row) => sum + row.importsCompleted, 0);
    if (imports > Math.max(5, trades * 3))
        flags.push(flag("public-import-dominance", "warning", "Public import may dominate direct trade", `Simulations recorded ${imports} imports compared with ${trades} player-side direct trade records.`, trades === 0 ? imports : imports / trades, 3, { imports, trades }));
    const fossilPressureRate = rows.length ? rows.filter(row => row.fossilPressureReached).length / rows.length : 0;
    if (fossilPressureRate < 0.2)
        flags.push(flag("fossil-pressure-rare", "warning", "Fossil depletion pressure is rarely reached", `Only ${(fossilPressureRate * 100).toFixed(1)}% of player-games used at least one quarter of their printed local fuel reserve.`, fossilPressureRate, 0.2));
    const biomassRegrowthMean = rows.length ? rows.reduce((sum, row) => sum + row.biomassRegrown, 0) / rows.length : 0;
    if (biomassRegrowthMean < 0.1)
        flags.push(flag("biomass-regrowth-low", "warning", "Biomass regrowth has almost no effect", `Mean Biomass regrowth is ${biomassRegrowthMean.toFixed(3)} units per player-game.`, biomassRegrowthMean, 0.1));
    const winnersWithStorage = winners.filter(row => row.storageUsed).length;
    const storageWinnerShare = winners.length ? winnersWithStorage / winners.length : 0;
    if (storageWinnerShare > 0.9)
        flags.push(flag("storage-mandatory", "critical", "Storage appears mandatory", `${(storageWinnerShare * 100).toFixed(1)}% of winning systems demonstrably used or retained storage.`, storageWinnerShare, 0.9));
    let strongestWeatherPrediction = 0;
    let strongestWeather = "";
    for (const row of weatherRows) {
        const totalWinners = Object.values(row.winnerCountByContinent).reduce((sum, count) => sum + (count ?? 0), 0);
        if (totalWinners === 0)
            continue;
        const topShare = Math.max(...Object.values(row.winnerCountByContinent).map(value => value ?? 0)) / totalWinners;
        if (topShare > strongestWeatherPrediction) {
            strongestWeatherPrediction = topShare;
            strongestWeather = row.weather;
        }
    }
    if (strongestWeatherPrediction > 0.6)
        flags.push(flag("first-weather-predictive", "warning", "The first Weather roll strongly predicts the winner", `Under ${strongestWeather}, one continent accounts for ${(strongestWeatherPrediction * 100).toFixed(1)}% of winners.`, strongestWeatherPrediction, 0.6, { weather: strongestWeather }));
    if (flags.length === 0)
        flags.push(flag("no-threshold-flags", "info", "No configured balance threshold was crossed", "This batch did not trigger the initial automatic warnings. Larger samples may still reveal issues.", 0, null));
    return flags;
}
//# sourceMappingURL=balanceFlags.js.map