// @ts-nocheck
import { uiShared } from "./uiShared.js";

const { getTechnology, getGenerationExplanation, conditionDefinition, resourceLabels, warehouseTotal, h } = uiShared;

export function otherRegionDecisionSummary(game, player) {
    const built = [];
    const extracted = {};
    const imported = {};
    const tradePartners = new Set();
    let finalKnowledge = null;
    let adapted = null;
    let passes = 0;
    for (const entry of game.log) {
        if (entry.generation !== game.generation)
            continue;
        const involvedInTrade = entry.type === "trade.completed" && [entry.data?.aId, entry.data?.bId].includes(player.id);
        if (entry.actorId !== player.id && !involvedInTrade)
            continue;
        if (entry.type === "action.build" && entry.data?.technologyId)
            built.push(getTechnology(game, entry.data.technologyId).name);
        else if (entry.type === "action.extract" && entry.data?.resource)
            extracted[entry.data.resource] = (extracted[entry.data.resource] ?? 0) + (entry.data.amount ?? 1);
        else if (entry.type === "action.research")
            finalKnowledge = entry.data?.nextLevel ?? player.knowledge;
        else if (entry.type === "action.worldMarket" && entry.data?.receive)
            imported[entry.data.receive] = (imported[entry.data.receive] ?? 0) + 1;
        else if (entry.type === "trade.completed") {
            const otherId = entry.data?.aId === player.id ? entry.data?.bId : entry.data?.aId;
            if (otherId && game.players[otherId])
                tradePartners.add(game.players[otherId].name);
        }
        else if (entry.type === "action.adapt")
            adapted = conditionDefinition(game, player)?.name ?? "the Local Condition";
        else if (entry.type === "action.pass")
            passes++;
    }
    const resourceText = values => Object.entries(values)
        .filter(([, amount]) => amount > 0)
        .map(([resource, amount]) => `${amount} ${resourceLabels[resource]}`)
        .join(", ");
    const decisions = [];
    if (built.length)
        decisions.push({ icon: "⚙", label: `Built ${built.join(", ")}` });
    if (finalKnowledge !== null)
        decisions.push({ icon: "✦", label: `Raised Knowledge to ${finalKnowledge}` });
    if (Object.keys(extracted).length)
        decisions.push({ icon: "⛏", label: `Extracted ${resourceText(extracted)}` });
    if (tradePartners.size)
        decisions.push({ icon: "⇄", label: `Traded with ${[...tradePartners].join(", ")}` });
    if (Object.keys(imported).length)
        decisions.push({ icon: "◎", label: `World Market: +${resourceText(imported)}` });
    if (adapted)
        decisions.push({ icon: "↻", label: `Adapted to ${adapted}` });
    if (passes)
        decisions.push({ icon: "—", label: `Passed ${passes} action${passes === 1 ? "" : "s"}` });
    return decisions.length ? decisions : [{ icon: "—", label: "No recorded Development decisions" }];
}

export function OtherRegionSummary({ game, player }) {
    const story = getGenerationExplanation(game, player.id, game.generation);
    const profile = game.config.continents.find(continent => continent.id === player.continentId);
    const decisions = otherRegionDecisionSummary(game, player);
    const developedTechnologies = player.installed
        .map(instance => getTechnology(game, instance.technologyId))
        .filter(technology => !technology.starter);
    const storedEnergy = player.installed.reduce((sum, instance) => sum
        + Object.values(instance.storageInput ?? {}).reduce((total, value) => total + value, 0)
        + Object.values(instance.pendingStorageInput ?? {}).reduce((total, value) => total + value, 0), 0);
    return h("article", { className: `other-region-summary-card ${story.demandMet ? "goal-met" : "goal-missed"}` },
        h("header", { className: "other-region-summary-heading" },
            h("div", null,
                h("small", null, player.name),
                h("h3", null, profile?.name ?? player.continentId)
            ),
            h("span", { className: story.demandMet ? "review-status success" : "review-status warning" }, `${story.lightProduced}/${story.requiredLight} Light`)
        ),
        h("div", { className: "other-region-summary-section" },
            h("strong", null, "This Generation"),
            h("div", { className: "other-region-decision-list" }, ...decisions.map((decision, index) => h("span", { key: `${player.id}-decision-${index}` }, h("b", { "aria-hidden": "true" }, decision.icon), h("em", null, decision.label))))
        ),
        h("div", { className: "other-region-summary-section" },
            h("strong", null, "System so far"),
            developedTechnologies.length
                ? h("div", { className: "other-region-tech-list" }, ...developedTechnologies.map(technology => h("span", { key: technology.id }, technology.name)))
                : h("p", { className: "muted other-region-empty" }, "No added technology yet.")
        ),
        h("footer", { className: "other-region-summary-stats" },
            h("span", null, h("small", null, "Knowledge"), h("strong", null, player.knowledge + player.temporaryKnowledge)),
            h("span", null, h("small", null, "Warehouse"), h("strong", null, `${warehouseTotal(player)}/${game.config.rules.warehouseMaximum}`)),
            h("span", null, h("small", null, "Stored"), h("strong", null, storedEnergy)),
            h("span", null, h("small", null, "Total Light"), h("strong", null, player.cumulative.totalLight))
        )
    );
}
