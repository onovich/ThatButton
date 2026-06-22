# Phase 2 Final Report - Copywriting And Tone Pass

Status: READY_FOR_CHECK

## Summary

Phase 2 unified player-facing copy around the core action model: the terminal states a `致命条件`, matching buttons are `禁止按键`, non-matching buttons are `安全键`, and the player clears the panel by pressing all safe buttons. The game keeps the Phase 1 level structure and logic difficulty intact.

## Completed Changes

- Added `docs/phase-2-copywriting-tone-record.md` with the visible-copy inventory, terminology guide, intentional-difficulty notes, and round evidence.
- Rewrote the start screen rules to define `致命条件`, `禁止按键`, `安全键`, and `清空面板` before play.
- Replaced uneven generated-rule copy with one shared format: `致命条件：...。匹配者是禁止按键；按其他安全键。`
- Applied the shared rule format to every generated rule tier and to the rare fallback exact-button path.
- Updated failure copy so timeout means the panel was not cleared in time, and wrong clicks identify the pressed button as a `禁止按键`.
- Adjusted the terminal clue container min-heights so the clearer two-line rule copy has stable space on desktop and mobile layouts.
- Extended `scripts/validate-structure.mjs` to fail if seeded generated rules omit `致命条件`, `禁止按键`, or `安全键`, or if stale ambiguous copy returns to `index.html`.
- Updated project documentation and roadmap entries for Phase 2 completion.

## Preserved Scope

- No difficulty bands, timers, reward values, board sizes, fatal-count ranges, or rule unlock levels were changed.
- No boss, enemy, combo, roguelite, high-score, recap, moving-button, occlusion, Unity, 3D, PWA, CDN removal, or i18n work was added.
- `origin/` and GitHub Pages workflow files were not edited.

## Seeded Preview Evidence

Seed `phase2-copy` was previewed through `window.__THAT_BUTTON_DEBUG__.previewSeededLevel`:

| Level | Band | Rule | Result |
| --- | --- | --- | --- |
| 1 | training | shape | Uses the shared fatal-condition/action sentence. |
| 4 | orientation | fallback exact-button | Uses the shared fatal-condition/action sentence. |
| 8 | baseline | compound AND | Uses the shared fatal-condition/action sentence. |
| 12 | pressure | OR color | Uses the shared fatal-condition/action sentence. |
| 18 | extended | OR color | Uses the shared fatal-condition/action sentence. |

## Validation Evidence

- `npm run validate` - PASS
- `npm run build` - PASS
- `StartLocalTest.ps1 -DryRun` - PASS, selected `http://127.0.0.1:5175/`
- `OpenOnlineTest.ps1 -DryRun` - PASS, reported `https://onovich.github.io/ThatButton/`
- `git diff --check` - PASS with only expected Windows line-ending warnings

## Remaining Risks

- Real mobile copy fit still needs a manual device pass, especially on very short screens and browser UI overlays.
- The `phase2-copy` seed demonstrates that fallback can still occur in rare generated boards; Phase 2 made that path clear but did not rebalance generator odds.
- Human playtest confirmation is still needed to verify that players no longer read the clue as an instruction to press matching buttons.
