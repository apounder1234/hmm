# Candidate A.5.2 → A.5.3 Function Map

## Configuration

| Former location | New location |
|---|---|
| `config/defaults/continents.js` | `app/config.js` — continent section |
| `config/defaults/technologies.js` | `app/config.js` — technology section |
| `config/defaults/weather.js` | `app/config.js` — weather section |
| `config/defaults/localConditions.js` | `app/config.js` — card section |
| `config/defaults/index.js` | `app/config.js` — default configuration |
| `config/hash.js` | `app/config.js` — hashing section |
| `config/validation.js` | `app/config.js` — validation section |

## Rules

| Former location | New location |
|---|---|
| `engine/helpers.js` | `app/rules.js` |
| `engine/conditions/conditions.js` | `app/rules.js` |
| `engine/continentRules.js` | `app/rules.js` |
| `engine/weather/weather.js` | `app/rules.js` |
| `engine/scoring/scoring.js` | `app/rules.js` |
| `engine/invariants.js` | `app/rules.js` |

Important functions retained unchanged include `getKnowledgeRequirement`, `getEffectiveUpgradeCost`, `getContinentGenerationModifiers`, `advanceWeather`, `finalRanking` and `invariantErrors`.

## Engine

| Former location | New location |
|---|---|
| `engine/history/undo.js` | `app/engine.js` |
| `engine/actions/actions.js` | `app/engine.js` |
| `engine/createGame.js` | `app/engine.js` |
| `engine/energy/resolveDispatch.js` | `app/engine.js` |
| `engine/stateMachine.js` | `app/engine.js` |
| `persistence/save.js` | `app/engine.js` |

The command entry point remains `applyCommand(game, command)`.

## Trading and AI

- `engine/trade/trade.js` → `app/trade.js`.
- `ai/profiles.js`, `ai/ai.js` and `ui/aiLoop.js` → `app/ai.js`.
- `pumpAi` remains the automatic browser-turn entry point.

## Simulation

The former scenario, game runner, metrics, balance flags, batch, comparison, CSV and JSON modules are now ordered sections of `app/simulation.js`.

## Interface

| New file | Main contents |
|---|---|
| `app/ui.js` | App shell, screen routing, recovery and startup boundary |
| `app/uiShared.js` | reusable controls, labels and explanations |
| `app/uiSetup.js` | setup, secret selection, Summit and Founding Projects |
| `app/uiGame.js` | board, actions, Dispatch, review, results and Debug drawer |
| `app/uiReference.js` | Cards, Rules and Simulation Lab |
| `app/viewModel.js` | system snapshots, previews and interface legality |
