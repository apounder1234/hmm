# SUNPATHS File Map

Start with the **symptom**, not the entire repository.

| Feature or problem | First file | Main functions or section |
|---|---|---|
| Game stays on Loading | `index.html`, `app/ui.js` | startup guard, `App`, `AppErrorBoundary` |
| Start or setup screen is wrong | `app/uiSetup.js` | `StartScreen`, `SetupScreen` |
| Continent numbers, cards or technologies are wrong | `app/config.js` | `continents`, `technologies`, `localConditions` |
| Knowledge or modified costs are wrong | `app/rules.js` | `getKnowledgeRequirement`, `getEffectiveUpgradeCost` |
| A button is enabled or disabled incorrectly | `app/viewModel.js` | `developmentActionLegality`, `buildLegality` |
| Clicking an invalid action changes the game | `app/engine.js` | `applyCommand`, `performDevelopmentAction` |
| Summit gets stuck | `app/trade.js`, `app/ai.js` | `respondSummitTrade`, `aiStep`, `pumpAi` |
| Summit interface is wrong | `app/uiSetup.js` | `EnergySummit`, `SummitTradeForm` |
| Resource trade is wrong | `app/trade.js` | `executeDirectTrade`, `proposeSummitTrade` |
| Secret pathway is exposed | `app/trade.js` | `getPublicSummitState` |
| Gathering, Learn or Build is wrong | `app/engine.js` | `performDevelopmentAction` |
| Continent ability does not work | `app/rules.js` | `getContinentGenerationModifiers`, `applyCompletedUpgradeConsequences` |
| Energy, losses or Light are wrong | `app/engine.js`, `app/viewModel.js` | `resolveDispatch`, `systemSnapshot` |
| Weather does not advance correctly | `app/rules.js` | `setSummitForecast`, `advanceWeather` |
| AI makes a poor choice | `app/ai.js` | `chooseDevelopmentDecision`, `chooseDispatchDecision` |
| Full game gets stuck | `app/engine.js`, `app/ai.js` | `applyCommand`, `pumpAi` |
| Save does not load | `app/engine.js` | `serializeGame`, `deserializeGame` |
| Undo or reset is wrong | `app/engine.js` | `undoLast`, `resetGeneration` |
| Simulation result is wrong | `app/simulation.js` | `runAutomatedGame`, `runSimulationBatch` |
| Simulation browser freezes | `app/simulationWorker.js` | Worker message handler |
| Cards or Rules page is wrong | `app/uiReference.js` | `CardsScreen`, `RulesScreen` |
| Main board display is wrong | `app/uiGame.js` | `GameScreen`, `PlayerBoard` |
| Need a reproducible bug report | `app/debug.js` | `buildDebugSnapshot`, `formatBugReport` |
| Check whether the package is healthy | `selftest.html` | `tests/selfTest.js` |

## Files you normally should not edit

`app/vendor/` contains the local React runtime. It is third-party code, not SUNPATHS game logic.
