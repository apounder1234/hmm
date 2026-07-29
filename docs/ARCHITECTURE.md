# SUNPATHS Architecture

## The five layers

```text
app/config.js
    ↓
app/rules.js + app/trade.js
    ↓
app/engine.js
    ↓
app/ai.js + app/simulation.js
    ↓
app/ui*.js
```

### 1. Configuration

`config.js` contains declarative game content: continents, resources, affinities, technologies, weather, cards, demand and rule limits. Changing a number here changes the content, not the method used to apply it.

### 2. Shared rules

`rules.js` contains deterministic calculations. It does not decide what a human clicked. It answers questions such as:

- What Knowledge does this continent need for this technology?
- What is the final cost after continent modifiers?
- How much generation bonus applies?
- Is the state internally valid?

`trade.js` is separate because the Summit has its own sequence, pending-offer state and secret-information boundary.

### 3. Game engine

`engine.js` creates and mutates game state. The central entry point is:

```js
applyCommand(game, command)
```

A normal command flow is:

```text
UI or AI creates command
→ engine validates
→ engine records undo state when appropriate
→ engine applies one transaction
→ invariants run
→ event is added to game.log
→ UI renders the returned state
```

An invalid command throws before the action is spent.

### 4. AI and simulation

`ai.js` generates legal candidates, scores them, chooses one and submits the same commands used by human players.

`simulation.js` repeatedly runs the normal engine. It does not contain a simplified alternative game.

### 5. Interface

- `ui.js`: application shell, loading, save recovery and screen routing.
- `uiShared.js`: labels, small reusable controls and explanations.
- `uiSetup.js`: setup, secret selection and Summit screens.
- `uiGame.js`: board, Development, Dispatch, review and results.
- `uiReference.js`: Cards, Rules and Simulation Lab.
- `viewModel.js`: structured previews and button legality used by the interface.

## Summit flow

```text
Secret pathways selected
→ future forecast becomes public
→ right-to-left Summit sweep
→ left-to-right Summit sweep
→ secret plans revealed
→ Founding Projects resolved
→ Generation 1
```

A pending offer is resolved before the automatic loop checks whether the current proposer is human or AI. This prevents the former human-to-AI deadlock.

## One source of truth

| Rule | Authoritative function |
|---|---|
| Knowledge requirement | `getKnowledgeRequirement()` in `rules.js` |
| Upgrade cost | `getEffectiveUpgradeCost()` in `rules.js` |
| Continent generation effect | `getContinentGenerationModifiers()` in `rules.js` |
| Summit transfer | `respondSummitTrade()` in `trade.js` |
| Build mutation | `performDevelopmentAction()` in `engine.js` |
| Dispatch | `resolveDispatch()` in `engine.js` |
| Button legality | `buildLegality()` / `developmentActionLegality()` in `viewModel.js`, backed by engine rules |
| Final ranking | `finalRanking()` in `rules.js` |

## Adding content

### Add a technology

1. Add one object to `technologies` in `config.js`.
2. Reuse an existing stage and pathway where possible.
3. Add a special rule only when configuration cannot express it.
4. Run `selftest.html` and a seeded simulation.

### Add a Local Condition

Add the card to `localConditions` in `config.js`. If it introduces a new `effect.kind`, update the condition rule in `rules.js`, preview in `viewModel.js`, and explanation in `uiShared.js`.

### Change a continent ability

Update the profile in `config.js`, then the central calculation in `rules.js`. Do not add a continent check independently to the UI or AI.

## Seeded randomness

`random.js` holds separate deterministic streams for weather, cards, market, AI and simulation. Reusing the same seed and command sequence should reproduce the same state.
