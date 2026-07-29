# SUNPATHS Candidate A.5.3 — Organised Debug Edition

## Organisation

- Consolidated seven configuration modules into `app/config.js`.
- Consolidated shared helpers, continent rules, condition rules, weather, scoring and invariants into `app/rules.js`.
- Consolidated game creation, actions, Dispatch, state machine, undo and saves into `app/engine.js`.
- Kept Summit and direct trading isolated in `app/trade.js`.
- Consolidated AI profiles, decisions and automatic turn progression into `app/ai.js`.
- Consolidated simulation scenarios, automated games, metrics, balance flags and exports into `app/simulation.js`.
- Split the former 121 KB interface file into `ui.js`, `uiShared.js`, `uiSetup.js`, `uiGame.js` and `uiReference.js`.
- Renamed the former UI playability module to `app/viewModel.js` to clarify that it provides previews and legality data.

## Removed residue

- Removed three empty placeholder `types.js` files.
- Removed stale `sourceMappingURL` comments that referenced nonexistent files.
- Removed the old nested source layout after consolidating its active code.
- Removed duplicate barrel exports tied to obsolete paths.
- Confirmed zero active Knowledge Link references in application source.
- Kept no commented-out abandoned rules or backup files in the playable repository.

## Debugging additions

- Added a secret-safe Debug drawer available through setup Debug Mode.
- Added downloadable bug reports and current saves.
- Added `selftest.html` and a browser-compatible test module.
- Added beginner-facing architecture, file-map, state-reference and debugging documents.

## Behaviour

No game-rule, balance, AI-weight, resource, technology, card or continent value was intentionally changed.
Candidate A.5.2 and A.5.3 produced identical complete game states for 48 matched seeds across both opening modes.
