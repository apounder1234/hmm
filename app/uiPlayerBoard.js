// @ts-nocheck
import { uiShared } from "./uiShared.js?v=a5.22.27";
import { EnergyChain } from "./uiEnergyChain.js?v=a5.22.27";
import { interfaceCopy } from "./uiCopy.js?v=a5.22.27";

const {
    h,
    conditionDefinition,
    getContinentProfile,
    getTechnology,
    pathways,
    totalEnergy,
    technologyImpactPreview,
    titleCase,
    pathwayLabels,
    abilityDescriptions,
    penaltyDescriptions,
    localConditionExplanation,
    technologyExplanation,
    scoringExplanation,
    panel,
    stat,
    badge,
    infoButton,
    featureEnabled
} = uiShared;

function TechnologyList({ game, player, onInfo }) {
    return h("div", { className: "technology-list" }, ...player.installed.map(instance => {
        const tech = getTechnology(game, instance.technologyId);
        const stored = totalEnergy(instance.storageInput);
        const pending = totalEnergy(instance.pendingStorageInput ?? Object.fromEntries(pathways.map(pathway => [pathway, 0])));
        const impact = technologyImpactPreview(game, player.id, tech);
        const primaryMetric = impact.metrics.find(metric => metric.after > metric.before);
        return h("article", { key: instance.instanceId, className: "technology-card" },
            h("div", null,
                h("strong", null, tech.name),
                h("small", null, `${titleCase(tech.stage)} · ${tech.pathway === "shared" ? "Shared" : pathwayLabels[tech.pathway]}`),
                h("em", { className: "technology-visible-benefit" }, primaryMetric ? `${primaryMetric.label}: ${primaryMetric.after}${primaryMetric.unit}` : impact.now)
            ),
            h("div", { className: "technology-meta" },
                tech.storage ? badge(`${stored} now${pending ? ` · ${pending} later` : ""}/${tech.storage.capacity}`, "energy") : badge(`Capacity ${tech.capacity}`),
                infoButton(() => onInfo(technologyExplanation(game, player, tech)), `Explain ${tech.name}`)
            )
        );
    }));
}

function LightTrack({ game, player, onInfo }) {
    return h("div", { className: "light-track" }, ...Array.from({ length: 8 }, (_, i) => {
        const generation = i + 1;
        const value = player.lightByGeneration[generation];
        const target = game.config.demand.reliabilityTargets[generation];
        const point = player.reliabilityByGeneration[generation] === true;
        const met = value !== undefined && value >= target;
        const reliabilityActive = generation >= (game.config.rules.reliabilityStartsGeneration ?? 5);
        return h("button", {
            type: "button",
            key: generation,
            className: `light-window ${point ? "reliable" : met ? "demand-met" : ""}`,
            onClick: () => onInfo(scoringExplanation(game, generation, value, target))
        },
            h("small", null, `G${generation}`),
            h("strong", null, value ?? "·"),
            h("span", null, point ? "+1 point" : reliabilityActive ? `need ${target} · point active` : `need ${target}`)
        );
    }));
}

export function PlayerBoard({ game, player, onInfo }) {
    const condition = conditionDefinition(game, player);
    const effectiveKnowledge = player.knowledge + player.temporaryKnowledge;
    const profile = getContinentProfile(game, player);
    const ability = abilityDescriptions[profile.abilityId];
    const copy = interfaceCopy.playerBoard;

    return h("section", { className: "player-board compact-player-board" },
        h("div", { className: "board-heading" },
            h("div", null,
                h("p", { className: "eyebrow" }, copy.eyebrow),
                h("h2", null, player.name),
                h("small", null, profile.name)
            ),
            h("div", { className: "board-core-badges" },
                featureEnabled(game, "knowledgeRequirements") ? h("button", {
                    type: "button",
                    className: "badge explain-badge",
                    onClick: () => onInfo({
                        eyebrow: "Knowledge",
                        title: `Knowledge ${effectiveKnowledge}`,
                        summary: player.temporaryKnowledge
                            ? `${player.knowledge} permanent + ${player.temporaryKnowledge} temporary this Generation.`
                            : "Permanent technical Knowledge."
                    })
                }, `K ${effectiveKnowledge}`) : null,
                condition ? h("button", {
                    type: "button",
                    className: "badge condition explain-badge",
                    onClick: () => onInfo(localConditionExplanation(game, player, condition))
                }, condition.name) : null
            )
        ),
        h("div", { className: "player-board-core simplified" },
            h("section", { className: "board-system-section" },
                h("div", { className: "compact-section-heading" },
                    h("strong", null, copy.energyFlow),
                    h("small", null, `${player.installed.length} technologies`)
                ),
                h(EnergyChain, { game, player, onInfo, context: "playerBoard" })
            )
        ),
        h("div", { className: "compact-score-row simplified" },
            stat(copy.totalLight, player.cumulative.totalLight),
            stat(copy.reliability, `${player.cumulative.reliableGenerations}/${game.config.rules.reliabilityPointMaximum ?? 4}`),
            stat(copy.demandMet, `${player.cumulative.demandMetGenerations ?? 0}/8`)
        ),
        h("details", { className: "player-board-details" },
            h("summary", null, copy.details),
            h("div", { className: "two-column board-expanded-grid" },
                panel(copy.installed, h(TechnologyList, { game, player, onInfo }), "nested"),
                panel(copy.history, h(LightTrack, { game, player, onInfo }), "nested")
            ),
            h("div", { className: "continent-status-row" },
                featureEnabled(game, "fullRegionalRules") ? h("button", {
                    type: "button",
                    className: "badge explain-badge",
                    onClick: () => onInfo({ eyebrow: profile.name, title: ability.name, summary: ability.text, details: profile.strengths })
                }, ability.name) : h("button", {
                    type: "button",
                    className: "badge explain-badge",
                    onClick: () => onInfo({ eyebrow: "Beginner regional layer", title: `${pathwayLabels[profile.signatureRenewable]} signature`, summary: `${profile.name} keeps its ${pathwayLabels[profile.signatureRenewable]} weather strength. Extraction specialties and structural penalties begin in Intermediate mode.`, details: [] })
                }, `${pathwayLabels[profile.signatureRenewable]} signature`),
                featureEnabled(game, "fullRegionalRules") && profile.penaltyId ? h("button", {
                    type: "button",
                    className: "badge explain-badge",
                    onClick: () => onInfo({
                        eyebrow: copy.regionalLimitation,
                        title: penaltyDescriptions[profile.penaltyId].name,
                        summary: penaltyDescriptions[profile.penaltyId].text,
                        details: profile.weaknesses
                    })
                }, penaltyDescriptions[profile.penaltyId].name) : null
            )
        )
    );
}
