# Phase 1 Difficulty Curve Record

Date started: 2026-06-23
Phase: Phase 1 - Difficulty Curve And Level Structure
Guide: `docs/phase-1-difficulty-curve-goal-guide.md`

This record documents the implemented curve and evidence for Phase 1. It is not a full copywriting pass and does not introduce boss, combo, roguelite, moving button, Unity, 3D, occlusion, or spatial interaction work.

## Implementation Targets

- Replace the fixed 3x3 level shape with a data-driven difficulty lookup.
- Start the first levels below the old 9-button baseline, then expand only after the core loop is readable.
- Keep rule generation as the source of truth for fatal conditions.
- Keep Phase 0 `?seed=` and `?debug=1` behavior deterministic and useful.
- Add structure validation because the Phase 1 guide references `scripts/validate-structure.mjs`, which does not exist yet.

## Planned Difficulty Bands

| Band | Levels | Board | Buttons | Fatal Target | Rule Tiers | Timer Intent | Reward Intent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| training | 1-2 | 2x2 | 4 | 1 | single visual | generous onboarding | high recovery |
| orientation | 3-5 | 2x3 | 6 | 1 | single visual, single number | still breathable | high recovery |
| baseline | 6-10 | 3x3 | 9 | 1-2 | single, simple AND | old board size without harsh timer spike | moderate recovery |
| pressure | 11-15 | 3x3 | 9 | 2-3 | AND, NOT, color OR | pressure through mixed axes | lower recovery |
| extended | 16+ | 3x3 | 9 | 2-4 | full current rule set | long-tail ramp without new mechanics | low recovery |

## Validation Plan

- `npm run validate` should cover static markers and the new structure checks.
- `npm run build` must keep Pages output unchanged in shape.
- Seeded preview smoke should inspect at least levels 1, 4, 8, 12, and 18.
- Local HTTP smoke should request a seeded debug URL.
- Mobile viewport evidence remains script/manual unless browser automation is added; do not claim real-device PASS without real devices.

## Pending Evidence Log

| Date | Surface | Result | Evidence |
| --- | --- | --- | --- |
| 2026-06-23 | Phase 1 audit | Pass | Current code is fixed 3x3/9 buttons with timer-dominant progression; `scripts/validate-structure.mjs` is missing and should be added. |
