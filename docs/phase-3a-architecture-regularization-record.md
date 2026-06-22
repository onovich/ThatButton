# Phase 3A Architecture Regularization Record

## Scope

Phase 3A keeps the Phase 1 difficulty curve, Phase 2 terminology, Phase 3 best-run/failure-recap behavior, scoring, timers, and UI appearance unchanged. The work is limited to architecture regularization, ES module boundaries, and validation guardrails.

## Round 1 Baseline

Current responsibility map before extraction:

- `index.html`: markup, CSS, Tailwind/font imports, runtime state, difficulty config, RNG, rule generation, level generation, storage, recap model, debug API, rendering, audio, game loop.
- `scripts/validate-static-site.mjs`: static HTML markers and inline-script syntax validation.
- `scripts/validate-structure.mjs`: VM-based runtime smoke for the inline script, difficulty fixtures, best-record states, and failure recap states.
- `scripts/build-static-site.mjs`: copies `index.html` and `.nojekyll` into `dist/`.
- `scripts/serve-static.mjs`: local static HTTP server.
- `StartLocalTest.ps1` / `OpenOnlineTest.ps1`: manual local/online launchers with dry-run support.

Target module map:

- `src/config/difficulty.js`: colors, shapes, difficulty bands, `getDifficultyForLevel`.
- `src/core/rng.js`: seed hashing, seeded RNG, random helpers.
- `src/core/rules.js`: rule templates, fatal rule text formatting, rule selection.
- `src/core/level.js`: board data generation and round snapshots.
- `src/core/storage.js`: pure best-record schema, normalization, comparison, serialization, and storage-adapter helpers.
- `src/core/recap.js`: pure failure recap data model.
- `src/core/debug.js`: pure debug API builder and seeded preview helpers.
- `src/ui/render.js`: DOM rendering and UI state updates.
- `src/ui/audio.js`: Web Audio feedback.
- `src/main.js`: orchestration, browser adapters, event binding, game loop, debug API assignment.

Architecture guardrails:

- Core modules must not reference DOM APIs, `window`, `document`, `localStorage`, `AudioContext`, CSS classes, URL query parsing, or global `gameState`.
- UI modules may touch DOM/audio but must consume rule, difficulty, and recap facts instead of duplicating semantics.
- `src/main.js` may coordinate state and browser adapters but must not regain core rule/difficulty/storage logic.
- `window.__THAT_BUTTON_DEBUG__` helper names and result semantics must stay compatible.

## Fixed Seed Fixture

Seed: `phase3a-baseline`

```json
[
  {
    "level": 1,
    "difficultyId": "training",
    "gridSize": "2x2",
    "buttonCount": 4,
    "fatalCount": 1,
    "fatalRange": "1-1",
    "ruleTier": "singleVisual",
    "ruleId": "shape",
    "timeLimitMs": 18000,
    "timeRewardMs": 2200,
    "ruleText": "致命条件：形状为【正方形】。匹配者是禁止按键；按其他安全键。",
    "forbiddenIds": ["btn-1"],
    "buttons": [
      { "color": "red", "shape": "circle", "number": 4 },
      { "color": "yellow", "shape": "square", "number": 1 },
      { "color": "yellow", "shape": "circle", "number": 6 },
      { "color": "red", "shape": "circle", "number": 7 }
    ]
  },
  {
    "level": 4,
    "difficultyId": "orientation",
    "gridSize": "2x3",
    "buttonCount": 6,
    "fatalCount": 1,
    "fatalRange": "1-1",
    "ruleTier": "singleVisual",
    "ruleId": "color",
    "timeLimitMs": 16500,
    "timeRewardMs": 1800,
    "ruleText": "致命条件：颜色为【紫色】。匹配者是禁止按键；按其他安全键。",
    "forbiddenIds": ["btn-0"],
    "buttons": [
      { "color": "purple", "shape": "circle", "number": 2 },
      { "color": "red", "shape": "star", "number": 6 },
      { "color": "red", "shape": "circle", "number": 9 },
      { "color": "yellow", "shape": "star", "number": 8 },
      { "color": "red", "shape": "triangle", "number": 1 },
      { "color": "red", "shape": "circle", "number": 4 }
    ]
  },
  {
    "level": 8,
    "difficultyId": "baseline",
    "gridSize": "3x3",
    "buttonCount": 9,
    "fatalCount": 1,
    "fatalRange": "1-2",
    "ruleTier": "singleVisual",
    "ruleId": "color",
    "timeLimitMs": 14700,
    "timeRewardMs": 1300,
    "ruleText": "致命条件：颜色为【蓝色】。匹配者是禁止按键；按其他安全键。",
    "forbiddenIds": ["btn-3"],
    "buttons": [
      { "color": "purple", "shape": "square", "number": 1 },
      { "color": "yellow", "shape": "triangle", "number": 3 },
      { "color": "red", "shape": "square", "number": 9 },
      { "color": "blue", "shape": "triangle", "number": 6 },
      { "color": "purple", "shape": "triangle", "number": 4 },
      { "color": "yellow", "shape": "circle", "number": 2 },
      { "color": "yellow", "shape": "circle", "number": 7 },
      { "color": "red", "shape": "star", "number": 5 },
      { "color": "yellow", "shape": "star", "number": 8 }
    ]
  },
  {
    "level": 12,
    "difficultyId": "pressure",
    "gridSize": "3x3",
    "buttonCount": 9,
    "fatalCount": 2,
    "fatalRange": "2-3",
    "ruleTier": "not",
    "ruleId": "not-color-shape",
    "timeLimitMs": 13100,
    "timeRewardMs": 900,
    "ruleText": "致命条件：颜色不是【蓝色】且形状为【正方形】。匹配者是禁止按键；按其他安全键。",
    "forbiddenIds": ["btn-5", "btn-8"],
    "buttons": [
      { "color": "yellow", "shape": "triangle", "number": 7 },
      { "color": "purple", "shape": "triangle", "number": 8 },
      { "color": "blue", "shape": "square", "number": 2 },
      { "color": "red", "shape": "triangle", "number": 5 },
      { "color": "purple", "shape": "star", "number": 1 },
      { "color": "purple", "shape": "square", "number": 6 },
      { "color": "red", "shape": "circle", "number": 4 },
      { "color": "purple", "shape": "triangle", "number": 9 },
      { "color": "yellow", "shape": "square", "number": 3 }
    ]
  },
  {
    "level": 18,
    "difficultyId": "extended",
    "gridSize": "3x3",
    "buttonCount": 9,
    "fatalCount": 4,
    "fatalRange": "2-4",
    "ruleTier": "orColor",
    "ruleId": "two-colors-or",
    "timeLimitMs": 11500,
    "timeRewardMs": 700,
    "ruleText": "致命条件：颜色为【红色】或【黄色】。匹配者是禁止按键；按其他安全键。",
    "forbiddenIds": ["btn-0", "btn-4", "btn-5", "btn-6"],
    "buttons": [
      { "color": "yellow", "shape": "circle", "number": 2 },
      { "color": "purple", "shape": "square", "number": 4 },
      { "color": "blue", "shape": "square", "number": 3 },
      { "color": "blue", "shape": "circle", "number": 8 },
      { "color": "red", "shape": "circle", "number": 5 },
      { "color": "red", "shape": "circle", "number": 9 },
      { "color": "yellow", "shape": "star", "number": 1 },
      { "color": "blue", "shape": "circle", "number": 7 },
      { "color": "purple", "shape": "circle", "number": 6 }
    ]
  }
]
```

## Debug Helper Baseline

Current `window.__THAT_BUTTON_DEBUG__` helper names:

- `previewSeededLevel(seed, level)`
- `previewFailureRecap(seed, level, failureReason)`
- `getDifficultyForLevel(level)`
- `getLastFailureRecap()`
- `getBestRecord()`
- `loadBestRecord()`
- `saveBestRecord(level, score)`
- `resetBestRecord()`
- `compareRunToBest(runLevel, runScore, bestRecord)`
- `getLog()`
- `clearLog()`

Failure recap preview baseline for seed `phase3a-baseline`, level `8`:

- `wrong_click`: pressed button is `btn-3`, label `蓝色 三角形 06`; fatal count `1`; safe progress `0/8`, remaining `8`; comparison `new_best`; save status `preview`.
- `timeout`: pressed button is `null`; fatal count `1`; safe progress `0/8`, remaining `8`; comparison `new_best`; save status `preview`.

Best-record smoke baseline:

- Empty storage returns key `thatbutton.bestRun.v1`, version `1`, best level `1`, best score `0`, status `empty`.
- Corrupt JSON falls back to best level `1`, best score `0`, status `corrupt`.
- Saved record `6 / 100` reloads with status `loaded`.
- Comparisons remain `new_best`, `matched_best`, and `below_best` for higher, equal, and lower runs.
- Reset returns default best record with status `empty`.

## Round 1 Architecture Self-Check

- No runtime files changed in Round 1.
- Baseline fixtures were captured from the existing inline debug API before extraction.
- Planned module boundaries keep browser APIs outside core modules.
- Planned validation update will compare imported modules against the fixed seed and recap/storage fixtures above.
