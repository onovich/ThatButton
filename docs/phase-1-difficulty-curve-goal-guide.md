# Phase 1 - Difficulty Curve And Level Structure Goal Guide

Created: 2026-06-23T02:13:47.7732226+08:00
Owner role: executor
Planner thread: 019eefc3-8126-7271-b4b4-7dd9742c8545
Executor thread: 019ef06d-eb89-75c2-beb2-c695f9bcbedd
Round budget: 16 conversation rounds

## Direct Goal Prompt

Execute Phase 1 for `D:\WebProjects\ThatButton`: make the early game easier to enter, extend the playable level curve, and turn difficulty into a data-driven multi-axis model instead of mostly increasing pressure through time. Preserve the current web prototype, seed/debug tools, and GitHub Pages deployment.

Use the existing implementation style in `index.html` unless a small extraction clearly reduces risk. Do not start Phase 2 copy rewrite, boss/combo/roguelite systems, moving buttons, Unity/3D work, or offline packaging in this phase.

## Required Reading

- `TODO.md`
- `README.md`
- `docs/README.md`
- `docs/phase-0-baseline-playtest-goal-guide.md`
- `docs/phase-0-playtest-record.md`
- `docs/phase-0-final-report.md`
- `index.html`
- `package.json`
- `scripts/validate-structure.mjs`
- `StartLocalTest.ps1`
- `OpenOnlineTest.ps1`

## Phase Outcome

By the end of Phase 1, the game should support a clearer difficulty ladder:

- Early levels begin with fewer visible buttons than the current 3x3 board.
- Later levels can expand toward 3x3 and beyond only when the player has already learned the loop.
- Difficulty is controlled by multiple parameters, not just a faster timer.
- The first 5 levels should be learnable, the first 10 should feel winnable, and later levels should ramp through understandable pressure.
- Deterministic seed/debug reproduction from Phase 0 remains available and includes the new difficulty parameters.
- Mobile layout remains stable for every board size introduced in this phase.

## Scope

Implement and validate these items:

- Add a data-driven difficulty configuration by level or level band.
- Include at least these axes in the model: board rows/columns, total button count, fatal-button count, rule complexity, clue length/readability, time limit, time reward, and feedback intensity.
- Start with smaller boards such as 2x2 or 2x3, then step up toward the current 3x3 board.
- Make rule generation respect each level band's available button attributes and target complexity.
- Extend playable progression so the curve has meaningful steps after level 10 instead of spiking early.
- Update rendering, layout, and touch targets so variable board sizes do not break mobile play.
- Keep or extend Phase 0 debug APIs, especially seeded previews and structured round logs.
- Update validation scripts or add lightweight checks that cover the new difficulty model.
- Update docs with the implemented curve, evidence, and remaining playtest questions.

## Non-Scope

Do not implement these during Phase 1:

- Full visible copy rewrite or tone unification. Only change text that must change for variable board sizes or clear difficulty feedback.
- Bosses, enemies, health bars, combo rewards, streak systems, special attacks, or roguelite modifiers.
- Moving buttons, occlusion, camera constraints, or spatial 3D interaction.
- Unity or other engine embedding.
- CDN removal, PWA packaging, or distribution work.
- Rewriting the app into a new framework or splitting files unless the change is small and directly lowers Phase 1 risk.

## Architecture Guardrails

- Keep difficulty data separate from rendering decisions where practical.
- Keep rule semantics in one source of truth; do not duplicate fatal-condition logic across UI, logging, and validation.
- Treat `window.__THAT_BUTTON_DEBUG__` as a compatibility surface. Extend it only in ways that keep existing Phase 0 seed reproduction usable.
- Keep seed behavior deterministic: the same seed and level should produce the same preview after the Phase 1 changes.
- Keep the HTML prototype as the design-speed target; any future Unity/3D preparation should be a light data-contract consideration, not implementation.
- Prefer focused functions and data tables over broad abstractions. This project is still a prototype, so clarity beats premature architecture.

## Suggested Round Plan

1. Audit current generation, timer, grid layout, and Phase 0 debug surfaces. Define the difficulty config shape and update this guide only if a discovered constraint changes the implementation route.
2. Implement the difficulty data model and deterministic lookup for level bands.
3. Make board generation support variable rows/columns and button counts while preserving seed determinism.
4. Make rendering and mobile CSS handle the introduced board sizes without layout shifts or clipped controls.
5. Tune rule templates and fatal-button selection by level band.
6. Rework timer and reward progression so early levels breathe and later levels ramp through multiple axes.
7. Extend debug preview/log output with level, seed, board size, timer, fatal count, rule tier, and other active difficulty parameters.
8. Add or update validation checks for difficulty config coverage, debug API markers, and required docs.
9. Run representative seeded previews for early, mid, and late levels; record whether the curve matches the Phase 1 target.
10. Do a local browser or HTTP smoke pass and a mobile viewport smoke pass.
11. Update docs with implemented parameters, evidence, and remaining manual playtest items.
12. Run full validation, build, launcher dry-runs, and Pages-safe checks.
13. Buffer for implementation repair.
14. Buffer for balancing repair.
15. Buffer for validation or docs repair.
16. Final pass: produce Phase 1 report, commit, push, and report back to the planner thread.

The executor may combine adjacent rounds when the implementation is straightforward, but should not skip validation and reporting.

## Debug Self-Check

Run these checks before each commit:

- Confirm the first 5 levels are easier than the previous 3x3 baseline.
- Confirm level 10 is still readable and not mainly difficult because of a short timer.
- Confirm at least three representative seeds are reproducible.
- Confirm the debug preview reports the active difficulty parameters.
- Confirm mobile viewport layout does not overflow horizontally.
- Confirm no Phase 2 or Phase 4 feature work has slipped into the diff.

## Required Validation

Run and record the results:

- `npm run validate`
- `npm run build`
- `.\StartLocalTest.ps1 -DryRun`
- `.\OpenOnlineTest.ps1 -DryRun`
- `git diff --check`
- Local HTTP or browser smoke for at least one seeded run.
- Seeded debug preview smoke for early, mid, and late levels.

If a command is not applicable because the project changes, update the command first rather than dropping the check silently.

## Acceptance Criteria

Phase 1 is PASS-ready only when all are true:

- The game has a data-driven difficulty curve with variable board size and at least three meaningful level bands.
- Early levels use fewer buttons than the old 3x3 baseline.
- The first 10 levels are intentionally paced and documented.
- Timer pressure is no longer the only or dominant difficulty axis.
- Seeded preview and debug logs still work and expose the new difficulty parameters.
- Mobile layout remains usable for every introduced board size.
- `TODO.md` and docs describe the implemented curve and remaining playtest questions.
- All required validation commands pass, or any remaining gap is explicitly recorded as pending evidence rather than claimed as passed.
- The final implementation is committed and pushed before reporting READY_FOR_CHECK.

## Final Report Requirements

Create a Phase 1 final report in `docs/` with:

- Summary of the implemented difficulty model.
- Table or bullet list of level bands and their parameters.
- Evidence for early, mid, and late seeded previews.
- Validation command results.
- Mobile and browser smoke evidence.
- Remaining balancing risks and Phase 2/3 handoff notes.
- Final commit hash and push status.

## Return Message

When complete, send the planner thread a routing message with:

- `from: executor`
- `to: planner`
- `workspace: D:\WebProjects\ThatButton`
- `phase: Phase 1 - Difficulty Curve And Level Structure`
- `action: recheck`
- `guide: docs/phase-1-difficulty-curve-goal-guide.md`
- `status: READY_FOR_CHECK`
- final commit, push result, final report path, validation evidence, and explicit pending evidence.
