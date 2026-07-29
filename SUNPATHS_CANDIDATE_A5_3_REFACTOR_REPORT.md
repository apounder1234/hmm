# SUNPATHS Candidate A.5.3 Refactor Report

## Result

Candidate A.5.2 was reorganised in place without redesigning or rebalancing the game. The active repository now has a compact, intentional architecture with configuration, shared rules, mutation, trading, AI, simulation and interface responsibilities separated by name.

## Final source structure

- 16 application JavaScript files, including the public API facade and Worker.
- 1 browser-compatible test module.
- 3 local vendor/runtime files.
- 4 beginner-facing documentation files inside the package.
- 2 HTML entry pages: game and self-test.
- 35 total repository files.

## Custom source sizes

| File | Size |
|---|---:|
| `app/ai.js` | 67.2 KB |
| `app/config.js` | 32.8 KB |
| `app/debug.js` | 2.6 KB |
| `app/engine.js` | 60.7 KB |
| `app/index.js` | 0.2 KB |
| `app/random.js` | 2.0 KB |
| `app/rules.js` | 29.5 KB |
| `app/simulation.js` | 47.2 KB |
| `app/simulationWorker.js` | 1.2 KB |
| `app/styles.css` | 39.6 KB |
| `app/trade.js` | 10.5 KB |
| `app/ui.js` | 6.3 KB |
| `app/uiGame.js` | 51.9 KB |
| `app/uiReference.js` | 19.4 KB |
| `app/uiSetup.js` | 20.4 KB |
| `app/uiShared.js` | 27.2 KB |
| `app/viewModel.js` | 39.9 KB |
| `tests/selfTest.js` | 5.8 KB |

## Shared sources of truth

| Mechanic | Authoritative implementation |
|---|---|
| Knowledge thresholds | `getKnowledgeRequirement()` in `app/rules.js` |
| Upgrade costs and continent modifiers | `getEffectiveUpgradeCost()` in `app/rules.js` |
| Continent generation effects | `getContinentGenerationModifiers()` in `app/rules.js` |
| Summit legality and atomic transfers | `app/trade.js` |
| Development actions | `performDevelopmentAction()` in `app/engine.js` |
| Dispatch and Light | `resolveDispatch()` in `app/engine.js` |
| UI legality and previews | `app/viewModel.js`, calling shared rules and engine validation |
| Demand and ranking | configuration plus `finalRanking()` in `app/rules.js` |

## Verification

- 48 matched deterministic games: A.5.2 and A.5.3 final states identical.
- 14/14 browser-compatible self-tests passed.
- 100 additional complete games passed with zero invariant errors.
- Chromium click-through passed start, Cards, Rules, continent setup, secret plan, human-to-AI Summit offer, both Summit sweeps, Founding Projects, Generation 1 and Gather flow.
- Browser console and page errors: zero.
- JavaScript syntax failures: zero.
- Missing relative imports: zero.
- Active Knowledge Link references in `app/`: zero.

## Remaining complexity

`app/ai.js` is approximately 67 KB because candidate generation, trade valuation, development planning, Dispatch planning and automatic turn progression share many internal scoring helpers. Splitting it further would create a difficult circular dependency unless the scoring model is redesigned.

`app/engine.js` is approximately 61 KB because command validation, transactional mutation, undo, Dispatch and save migration all operate on the same state model. It is separated into clearly labelled internal sections. A future TypeScript/build-system version could split it more safely, but this edition preserves dependency-free GitHub hosting.

Neither file exceeds its previous combined logic volume; both are now ordered and documented rather than scattered across prototype folders.

## Hosting

The package contains only static HTML, CSS and browser ES modules. React remains local in `app/vendor/`. It requires no npm, build command or external CDN and is suitable for GitHub Pages.
