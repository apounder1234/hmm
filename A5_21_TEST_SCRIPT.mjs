import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.React = {
  createElement(type, props, ...children) { return { type, props: props ?? {}, children }; },
  Fragment: Symbol('Fragment'),
  useEffect() {},
  useMemo(fn) { return fn(); },
  useRef(value) { return { current: value }; },
  useState(value) { return [typeof value === 'function' ? value() : value, () => {}]; }
};
globalThis.ReactDOM = { createRoot() { return { render() {} }; } };

const { defaultConfig } = await import('./app/config.js');
const { createGame } = await import('./app/engine.js');
const { OtherRegionSummary, otherRegionDecisionSummary } = await import('./app/uiReviewSummary.js');

function renderNode(node) {
  if (node == null || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number') return node;
  if (Array.isArray(node)) return node.map(renderNode);
  if (typeof node.type === 'function') return renderNode(node.type({ ...(node.props ?? {}), children: node.children ?? [] }));
  return { ...node, children: (node.children ?? []).map(renderNode) };
}
function flatten(node, out = []) {
  if (node == null || typeof node === 'boolean') return out;
  if (Array.isArray(node)) { for (const item of node) flatten(item, out); return out; }
  if (typeof node !== 'object') return out;
  out.push(node);
  for (const child of node.children ?? []) flatten(child, out);
  return out;
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(text).join(' ');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return text(node.children ?? []);
}

const game = createGame(defaultConfig, [
  { id: 'p1', name: 'Human Africa', continentId: 'africa', controller: { kind: 'human' } },
  { id: 'p2', name: 'AI Europe', continentId: 'europe', controller: { kind: 'ai', strategy: 'windGrid', difficulty: 'standard' } }
], 'a521-review-summary', { openingMode: 'startingPlan' });

game.generation = 2;
game.phase = 'generation.review';
const ai = game.players.p2;
ai.knowledge = 3;
ai.resources.criticalMaterials.warehouse = 2;
ai.installed.push({
  instanceId: 'p2-basicSolar-test', technologyId: 'basicSolar', builtGeneration: 2,
  storageInput: { solar: 0, wind: 0, hydro: 0, biomass: 0, fossil: 0 },
  pendingStorageInput: { solar: 0, wind: 0, hydro: 0, biomass: 0, fossil: 0 },
  usedThisGeneration: false, firstOperationLossReduction: 0, temporaryCapacityBonus: 0
});
ai.currentMetrics.deliveredLight = 1;
ai.currentMetrics.reliabilityTarget = 1;
ai.currentMetrics.reliabilityMet = true;
ai.currentMetrics.grossEnergy.solar = 2;
ai.cumulative.totalLight = 3;

game.log.push(
  { sequence: 1, generation: 2, phase: 'generation.development', actorId: 'p2', type: 'action.extract', message: '', data: { resource: 'criticalMaterials', amount: 2 } },
  { sequence: 2, generation: 2, phase: 'generation.development', actorId: 'p2', type: 'action.research', message: '', data: { nextLevel: 3 } },
  { sequence: 3, generation: 2, phase: 'generation.development', actorId: 'p2', type: 'action.build', message: '', data: { technologyId: 'basicSolar' } },
  { sequence: 4, generation: 2, phase: 'generation.development', actorId: 'p1', type: 'trade.completed', message: '', data: { aId: 'p1', bId: 'p2', aGives: {}, bGives: {} } }
);

const decisions = otherRegionDecisionSummary(game, ai).map(item => item.label).join(' | ');
assert.match(decisions, /Built Basic Solar Array/);
assert.match(decisions, /Raised Knowledge to 3/);
assert.match(decisions, /Extracted 2 Critical/);
assert.match(decisions, /Traded with Human Africa/, 'Trade recipient should still show the trade decision');

const rendered = renderNode(OtherRegionSummary({ game, player: ai }));
const nodes = flatten(rendered);
const fullText = text(rendered);
assert.ok(nodes.some(node => node.props?.className?.includes('other-region-summary-card')));
assert.match(fullText, /This Generation/);
assert.match(fullText, /System so far/);
assert.match(fullText, /Basic Solar Array/);
assert.match(fullText, /Knowledge/);
assert.match(fullText, /Warehouse/);
assert.match(fullText, /Total Light/);
assert.doesNotMatch(fullText, /Why\? See the full calculation/);
assert.doesNotMatch(fullText, /View player card/);

const source = fs.readFileSync('./app/uiGame.js', 'utf8');
assert.ok(source.includes('other-region-summary-grid'));
assert.ok(source.includes('Their latest choices and current technology systems.'));
assert.ok(!source.includes('Region system comparison'));
assert.ok(!source.includes('View player card'));
assert.ok(!source.includes('ReviewPlayerCardModal'));

const css = fs.readFileSync('./app/styles.css', 'utf8');
assert.ok(css.includes('.other-region-summary-grid'));
assert.ok(css.includes('.other-region-tech-list'));
assert.ok(!css.includes('.review-player-card-modal'));

console.log('A5.21 targeted other-region decision-summary tests passed');
