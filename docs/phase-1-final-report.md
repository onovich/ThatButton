# Phase 1 Final Report

Date: 2026-06-23
Phase: Phase 1 - Difficulty Curve And Level Structure
Guide: `docs/phase-1-difficulty-curve-goal-guide.md`

## Summary

Phase 1 replaces the old fixed 3x3 opening and timer-heavy ramp with a data-driven difficulty model in `index.html`. The first levels now use smaller boards, later levels return to 3x3 after the loop is learned, and difficulty progresses through separate axes: board size, button count, fatal range, rule tier, clue readability, time limit, time reward, carryover, and feedback intensity.

No boss, enemy, combo, roguelite, Unity, 3D, moving button, occlusion, spatial interaction, CDN removal, or full Phase 2 copywriting work was added.

## Implemented Difficulty Bands

| Band | Levels | Grid | Buttons | Fatal Range | Rule Tiers | Timer Range | Reward |
| --- | --- | --- | --- | --- | --- | --- | --- |
| training | 1-2 | 2x2 | 4 | 1 | single visual | 18000-17500 ms | 2200 ms |
| orientation | 3-5 | 2x3 | 6 | 1 | single visual, single number | 17000-16000 ms | 1800 ms |
| baseline | 6-10 | 3x3 | 9 | 1-2 | single, parity, simple AND | 15500-13900 ms | 1300 ms |
| pressure | 11-15 | 3x3 | 9 | 2-3 | AND, exact, NOT, color OR | 13500-11900 ms | 900 ms |
| extended | 16+ | 3x3 | 9 | 2-4 | full current rule set | 12000 ms down to 9500 ms floor | 700 ms |

## Seeded Preview Evidence

Representative `phase1-smoke` previews:

| Level | Band | Grid | Buttons | Fatal Count | Rule Tier | Time Limit |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | training | 2x2 | 4 | 1 | singleVisual | 18000 ms |
| 4 | orientation | 2x3 | 6 | 1 | singleVisual | 16500 ms |
| 8 | baseline | 3x3 | 9 | 2 | compoundAnd | 14700 ms |
| 12 | pressure | 3x3 | 9 | 3 | orColor | 13100 ms |
| 18 | extended | 3x3 | 9 | 4 | orMixed | 11500 ms |

Additional stress evidence: six seeds across levels 1-20 stayed within configured button counts, fatal ranges, clue length limits, and expected band transitions.

## Validation

- `npm run validate`: PASS, now runs `validate-static-site.mjs` and `validate-structure.mjs`.
- `npm run build`: PASS.
- `powershell -ExecutionPolicy Bypass -File .\StartLocalTest.ps1 -DryRun`: PASS.
- `powershell -ExecutionPolicy Bypass -File .\OpenOnlineTest.ps1 -DryRun`: PASS.
- `git diff --check`: PASS.
- Local HTTP smoke at `http://127.0.0.1:5175/?seed=phase1-http&debug=1`: PASS.
- Seeded debug preview smoke for early, mid, and late levels: PASS.
- Mobile layout shape smoke for `2x2 -> 2x3 -> 3x3`: PASS by runtime preview and CSS marker check.
- `git status --short -- origin .github\workflows\deploy.yml`: PASS, no changes under `origin/` or the Pages workflow file.

## Mobile And Browser Evidence

- Dynamic grid rendering sets columns from the active difficulty band.
- Board max width is constrained for smaller and baseline boards.
- Existing small-screen media queries remain in place for 520px, 360px, and short-height screens.
- Local HTTP smoke passed for a seeded debug URL.
- Real iOS Safari and Android Chrome testing remains pending because no physical devices were available in this executor session.
- Desktop click smoke remains pending human/browser automation because Playwright is not installed in this workspace.

## Debug Self-Check

- First 5 levels are easier than the previous 3x3 baseline through 2x2 and 2x3 boards, one fatal target, generous timers, and higher rewards.
- Level 10 remains a 3x3 baseline level with 13900 ms, not a harsh timer spike.
- Representative seeds are reproducible through `window.__THAT_BUTTON_DEBUG__.previewSeededLevel(seed, level)`.
- Debug previews and round logs expose difficulty id, grid size, button count, fatal range, rule tier, timer, reward, readability, and feedback intensity.
- Phase 2 and Phase 4 features did not enter the implementation diff.

## Architecture Self-Check

- Difficulty data is separated into `DIFFICULTY_BANDS`.
- Rule semantics remain centralized in `generateRule`.
- Rendering consumes active difficulty dimensions without duplicating rule logic.
- Phase 0 seed/debug APIs remain compatible and are extended with difficulty parameters.
- `origin/` source notes were not modified.
- The project remains a single-file vanilla HTML prototype with zero new package dependencies.

## Remaining Risks

- Real-device iOS Safari and Android Chrome checks are still required for audio unlock, touch latency, safe-area fit, and restart flow.
- Human playtest evidence is still needed to confirm first 5-level learnability and first 10-level winnability.
- Phase 2 should still do a real copy/tone pass after playtest notes identify confusing clues.
- Phase 3 may use this curve data when adding retention or recap features.

## Commits

- `889ce71` - Phase 1 audit/record.
- `cd111c5` - data-driven difficulty bands, variable boards, timers, rewards, debug preview parameters.
- `a8190b6` - curve stress evidence.
- `b4ba53b` - structure validator and `npm run validate` integration.
- `753b2b0` - local HTTP/mobile-shape smoke evidence.
- `b160c39` - README/TODO curve documentation.

The final report/docs commit is recorded in the executor completion message after push.

## Recommendation

Phase 1 is ready for planner/checker validation. If accepted, Phase 2 should focus on rule and failure copy clarity using the structured debug/playtest fields already in the docs.
