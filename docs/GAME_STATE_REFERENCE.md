# SUNPATHS Game-State Reference

The current game is one JavaScript object. These are its most important fields.

| Field | Meaning | Main writer | Public or secret |
|---|---|---|---|
| `game.seed` | Reproduction seed | `createGame()` | Public |
| `game.phase` | Current stage of play | `applyCommand()` | Public |
| `game.generation` | Current Generation, 0–8 | `engine.js` | Public |
| `game.players` | Resources, Knowledge, systems and scores | Engine actions | Mixed |
| `game.turnOrder` | Player order | `createGame()` | Public |
| `game.activeTurnIndex` | Current player position | `engine.js` | Public |
| `game.weather.current` | Weather affecting this Generation | `rules.js` | Public |
| `game.weather.forecast` | Future die result | `rules.js` | Public before Summit |
| `game.opening.preparedSelections` | Secret pathway/capability choices | Opening commands | Secret until reveal |
| `game.opening.summit` | Sweep, active index, offers and trade counts | `trade.js` | Public except hidden plans |
| `game.innovationMarket` | Visible technologies | Engine setup/advance | Public |
| `game.worldMarket` | Remaining global resource stock | Trade/import actions | Public |
| `game.log` | Ordered engine events | `log()` | Public; must avoid secret leaks |
| `game.undo` | Development snapshots | `engine.js` | Internal |
| `game.rng` | Deterministic random streams | `random.js` | Internal |

## Player fields

| Field | Meaning |
|---|---|
| `player.continentId` | Selected continent profile |
| `player.resources` | Warehouse and reserve quantities |
| `player.knowledge` | Installed readiness, from 1 to 5 |
| `player.installed` | Technology instances |
| `player.actionsRemaining` | Development actions left |
| `player.prepared` | Starting Pathway and Capability state |
| `player.continentAbility` | One-time ability and token status |
| `player.generationMetrics` | Current Energy, losses and Light |
| `player.cumulative` | Full-game totals |

## Important phase names

```text
setup.preparedSelection
setup.summit
setup.revealPrepared
setup.foundingProjects
generation.start
generation.localConditions
generation.development
generation.dispatch
generation.review
generation.advanceWeather
game.complete
```

When the game appears stuck, `game.phase`, the active player and any `pendingOffer` are the first three things to inspect.
