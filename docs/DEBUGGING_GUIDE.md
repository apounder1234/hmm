# SUNPATHS Debugging Guide

This guide assumes curiosity, not professional programming experience.

## First: make the bug reproducible

Record:

- game version;
- seed;
- continent;
- opening mode;
- current Generation;
- exact clicks in order;
- what you expected;
- what happened instead.

Example:

```text
Seed: SUMMIT-BUG-014
Opening: Energy Summit
Continent: Africa
1. Select Solar and Storage.
2. Offer one Critical Mineral to Europe.
3. Request one Other Material.
Expected: Europe accepts or declines and the Summit continues.
Actual: offer remains pending.
```

## Use the built-in Debug drawer

Enable **Debug Mode** on the setup page. During a game, open **More game information → Debug drawer**.

It shows:

- phase;
- Generation;
- active player;
- actions remaining;
- weather and forecast;
- Summit round and pending offer;
- seed;
- recent engine events.

Use **Download bug report** and attach the text file with the save.

## Browser Developer Tools

Press `F12` or `Ctrl+Shift+I`.

### Console

Red text usually means JavaScript stopped. Copy the first red error, including the file and line number.

### Network

Reload the page and look for red requests. A missing `ui.js`, vendor file or stylesheet can explain a Loading screen.

## Common cases

### Game stays on Loading

Check:

1. Are all files uploaded, including `app/vendor/`?
2. Is GitHub Pages opening `index.html`, rather than the GitHub source preview?
3. Does Console name a missing or malformed module?

First files: `index.html`, `app/ui.js`.

### Summit does not continue

Open the Debug drawer and inspect:

- phase should be `setup.summit`;
- pending offer proposer and recipient;
- Summit round;
- active player.

First files: `app/trade.js`, then `app/ai.js`.

### A disabled action is clickable

There are two possible bugs:

- interface bug: `app/viewModel.js` returned the wrong legality result;
- engine bug: `app/engine.js` accepted an invalid command.

The engine is the final authority. An invalid click must never spend an action.

### Light looks wrong

Write down the visible chain:

```text
Generation → Storage → Transformation → Grid → Lighting → Light
```

Compare the on-screen preview from `viewModel.js` with the completed result from `resolveDispatch()` in `engine.js`.

### Same seed gives a different game

Confirm that the same choices and commands were made. The seed controls random results; it does not force human decisions to be identical. Run `selftest.html` to check deterministic replay automatically.

## UI problem or engine problem?

A UI problem changes what you see but not the saved state. An engine problem changes resources, actions, installed technologies, Light or phase incorrectly.

A useful check is to save before clicking, click once, then compare the Debug drawer and recent events.

## Safe files for small edits

- labels and numbers: `config.js`;
- CSS appearance: `styles.css`;
- explanation wording: `uiShared.js`;
- rules or calculations: change only with tests.

Do not edit files in `app/vendor/`.
