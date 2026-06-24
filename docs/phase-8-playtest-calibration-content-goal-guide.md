# Phase 8 - Playtest Calibration And Content Expansion Goal Guide

Date: 2026-06-24
Status: goal-mode execution guide for the executor

## 0. Direct Goal Prompt For Executor

You are the executor for `D:\WebProjects\ThatButton`.

Execute **Phase 8 - Playtest Calibration And Content Expansion** using this guide. The goal is to make the current HTML RPG/button loop last longer, read better as a game session, and become easier to tune from evidence before adding any major new mechanic or engine integration.

Use `$donextgoal` discipline: work in rounds, run Debug and architecture self-checks every round, validate before each commit, push after each successful commit, and stop if validation or push fails.

Round budget: **12 rounds total**.

- Rounds 1-8: main implementation.
- Rounds 9-11: buffer fixes and tuning only.
- Round 12: final validation, final report, and READY_FOR_CHECK routing.

## 1. Required Reading

Read these first:

- `TODO.md`
- `Role.md`
- `docs/README.md`
- `docs/phase-7a-final-report.md`
- `docs/phase-7a-hazard-feel-mobile-validation-record.md`
- `docs/phase-7a-browser-smoke-results.json`
- `docs/phase-6-final-report.md`
- `docs/phase-6a-final-report.md`
- `docs/phase-7-final-report.md`
- `src/config/difficulty.js`
- `src/config/battle.js`
- `src/config/upgrades.js`
- `src/config/hazards.js`
- `src/core/level.js`
- `src/core/enemy.js`
- `src/core/combo.js`
- `src/core/upgrades.js`
- `src/core/hazards.js`
- `src/core/debug.js`
- `src/app/create-app.js`
- `src/ui/render.js`
- `scripts/validate-structure.mjs`
- `scripts/smoke-hazards-browser.mjs`

If a listed file has moved, find the current equivalent with `rg` and record that in the phase record.

## 2. Phase Goal

Phase 8 should turn the current good-feeling prototype into a longer, testable session.

Complete the following:

- Establish a deterministic baseline for current progression length, enemy cadence, upgrade cadence, common failure points, hazard unlock timing, and VFX/layout health.
- Extend playable content/progression so reaching `3x3` is not treated like the end of the run. The `3x3` board should feel like the real game has begun.
- Tune existing multi-dimensional difficulty knobs with evidence: board progression, enemy HP/attack scaling, player survivability, round time, combo window/reward, upgrade values, hazard unlock timing, and hazard intensity only where justified.
- Add lightweight content variety using existing architecture, such as enemy identity/stage labels/avatar variants or encounter tiers, without adding a shop, map, inventory, currencies, or meta-progression.
- Add or refine deterministic debug/session preview tooling so future tuning can compare seeds and sessions without relying on gut feel.
- Preserve the Phase 7A VFX style and hazard validation. Do not regress button-to-enemy origin, low-fi terminal particle style, bottom player HUD, or mobile layout.
- Create `docs/phase-8-playtest-calibration-content-record.md` and `docs/phase-8-final-report.md`.

## 3. Non-Scope

Do not do these in Phase 8:

- Do not add Unity, WebView SDK, native bridge, C# bridge, custom URL scheme, engine build pipeline, real 3D, WebGL, Three.js, camera, or spatial-world work.
- Do not add roguelite meta-progression, persistent builds, shops, maps, currencies, inventories, loadouts, relics, or unlock trees.
- Do not add new hazard categories beyond existing moving-button and interference hazards.
- Do not add a new framework, runtime dependency, CDN resource, service worker, or PWA.
- Do not rewrite the whole UI or replace the current RPG battle layout.
- Do not rewrite rule semantics or reintroduce long/ambiguous rule text.
- Do not duplicate combat, combo, upgrade, difficulty, hazard, or rule formulas inside UI code.
- Do not claim iOS Safari, Android Chrome, or human playtest evidence unless it actually happened.

## 4. Planner Assumptions

- The user wants the game to feel longer and more playable before engine embedding.
- The current Phase 7/7A moving-button and interference hazards are still experimental; Phase 8 may tune their timing/intensity with evidence but should not expand their scope.
- Automated deterministic session previews are useful evidence, but they do not replace real-player testing.
- If a current victory condition ends too early, extend it to a longer milestone rather than removing victory feedback entirely.
- Keep the game independently playable as a static HTML/GitHub Pages app.

## 5. Architecture Boundaries And Code Standards

Treat architecture self-check as part of the work, not paperwork.

- Configuration owns tunable numbers and content tables:
  - difficulty and level pacing in `src/config/difficulty.js`
  - battle/enemy tuning in `src/config/battle.js` or a clearly named config module
  - upgrades in `src/config/upgrades.js`
  - hazards in `src/config/hazards.js`
- Pure core modules own decisions:
  - level/rule/enemy/combo/upgrade/hazard/session preview logic stays in `src/core`
  - core modules must not touch DOM, `window`, `document`, `localStorage`, CSS class names, audio, vibration, URL query parsing, or live element geometry
- UI modules render facts only:
  - `src/ui/render.js` may render labels, bars, particles, layout, and measured VFX origins
  - UI must not decide damage, reward, hazard schedule, upgrade math, rule truth, or victory/failure outcome
- App orchestration should stay explicit:
  - `src/app/create-app.js` coordinates flows but should not become the source of formulas or content tables
  - if orchestration grows, extract small modules instead of letting `create-app.js` become a monolith
- Host/debug contracts must stay JSON-safe:
  - new session/progression facts should be serializable
  - host payloads should expose useful summaries without high-frequency VFX spam
- Validation must guard any new invariant:
  - if a new preview helper is added, validate determinism
  - if progression length changes, validate representative seeds
  - if UI layout changes, extend browser smoke or marker checks

## 6. Per-Round Workflow

Each round must include:

- Round goal
- Completed work
- Debug self-check
- Architecture self-check
- Validation commands and results
- Commit hash and push result
- Next round goal
- Whether a buffer round was consumed

Progression rules:

- If validation fails: do not commit, do not push, do not proceed to the next round.
- If validation passes but commit fails: do not proceed to the next round.
- If commit succeeds but push fails: do not proceed to the next round.
- Only after push succeeds may the executor start the next round.
- Do not stage unrelated untracked files or unrelated user changes.

## 7. Debug Self-Check

Every round must answer:

- Can the current change be explained by the smallest relevant seeded session, level, enemy, upgrade, or hazard fixture?
- Can failures be localized to config, core progression/session simulation, app orchestration, UI render, audio/VFX, browser smoke tooling, host payloads, or docs?
- Are success, failure, empty, stale/corrupt local storage, timeout, wrong press, upgrade pending, victory, and mobile layout states covered where relevant?
- If balance changed, is there before/after evidence from deterministic seeds?
- If UI changed, was a repeatable browser smoke or marker validation added?
- If VFX changed, did Phase 7A's retro-futurist style and button-origin invariant remain intact?
- If hazards changed, did early onboarding remain hazard-free and did active hazards remain readable?

## 8. Architecture Self-Check

Every round must answer:

- Did the existing source-of-truth layer remain the source of truth?
- Did UI avoid duplicating core formulas, rule semantics, hazard schedules, combo math, upgrade math, enemy scaling, or victory/failure decisions?
- Did host/debug code expose facts without owning gameplay decisions?
- Did new content remain data-driven rather than hard-coded into event handlers or render branches?
- Did the phase avoid deferred scope: Unity/WebView/native/3D, roguelite meta, new hazards, dependencies, CDN, PWA, and broad visual redesign?
- Are unrelated files, generated outputs, and user changes left alone?
- Did validation guard the architecture boundary touched in this round?

## 9. Round Plan

1. Baseline and record.
   - Create `docs/phase-8-playtest-calibration-content-record.md`.
   - Record current fixed-seed session/progression observations.
   - Identify where the run currently feels too short, too spiky, or under-explained.
   - Commit and push the baseline record before changing gameplay.

2. Deterministic session preview tooling.
   - Add or refine a pure debug/session preview path for representative seeds.
   - It should summarize levels reached, enemies defeated, upgrades offered/selected, hazard exposure, failure/victory reason, and approximate session pressure.
   - Add validation for determinism and JSON-safe output.

3. Progression/content structure.
   - Extend the session arc so `3x3` is an early/mid-game state rather than the end.
   - Add lightweight enemy/stage identity variety if it improves readability and motivation.
   - Keep content data-driven and presentational unless formulas need explicit tuning.

4. Difficulty and combat tuning pass.
   - Tune existing values only with before/after evidence.
   - Focus on early retention, first upgrade timing, survivability after wrong presses, enemy defeat cadence, and later tension.
   - Preserve the intended challenge from reading rules, not from accidental ambiguity or cramped UI.

5. Upgrade and combo cadence pass.
   - Tune existing upgrade values/availability if evidence says choices are too weak, too obvious, or too late.
   - Preserve combo semantics: first safe press may be a non-combo success/chain start, visible `COMBO x2` starts at the second chained safe press.
   - Preserve Phase 7A differentiated feedback tiers.

6. Hazard schedule readability pass.
   - Tune existing moving-button/interference timing only if deterministic/browser evidence supports it.
   - Keep first enemy and first upgrade hazard-free unless evidence strongly justifies otherwise.
   - Do not add new hazard types.

7. UI and feedback polish for longer sessions.
   - Add compact progression feedback if needed: enemy/stage/chapter/run depth labels, session summary, or clearer victory/defeat recap.
   - Keep player information in the bottom command/control area.
   - Keep enemy identity and HP enemy-only.
   - Preserve mobile/short-screen layout fit.

8. Browser smoke and host/debug coverage.
   - Extend `npm run smoke:hazards` or add an adjacent zero-dependency smoke if needed.
   - Cover longer progression, upgrade cadence, victory/defeat, active hazards, VFX markers, and mobile/short-mobile layout.
   - Ensure host/debug payloads remain JSON-safe.

9. Buffer round 1.
   - Use for balance fixes, smoke gaps, or architecture cleanup discovered in rounds 1-8.

10. Buffer round 2.
   - Use for mobile layout/copy/VFX regressions or test hardening.

11. Buffer round 3.
   - Use for final tuning only. Do not add a new system here.

12. Final validation and report.
   - Create `docs/phase-8-final-report.md`.
   - Update `TODO.md`, `docs/README.md`, and `Role.md`.
   - Run the full validation matrix.
   - Push final report and route READY_FOR_CHECK back to planner.

If a buffer round is not needed, use it for one more evidence pass or small tuning pass. Do not exceed the 12-round budget without planner approval.

## 10. Validation Matrix

Minimum validation before final READY_FOR_CHECK:

- `node --check` on every changed `.js` / `.mjs` file.
- `cmd /c npm.cmd run validate`
- `cmd /c npm.cmd run build`
- `node scripts\validate-static-site.mjs --include-dist`
- `cmd /c npm.cmd run smoke:hazards`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\StartLocalTest.ps1 -DryRun`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\OpenOnlineTest.ps1 -DryRun`
- Runtime external URL scan across `index.html`, `src`, and `dist`.
- `git diff --check`
- Representative deterministic session previews for early, mid, later, and hazard-active seeds.
- Browser smoke for desktop `1280x720`, mobile `390x844`, and short mobile `360x740` if UI/layout changes.

If a command is not available in the executor environment, record the exact reason and add the closest repeatable substitute. Do not claim unavailable checks as passed.

## 11. PASS Criteria

Phase 8 is ready for planner check only when all are true:

- The run no longer treats first arrival at `3x3` as the practical end of interesting play.
- A longer content/progression arc exists and is documented through data, deterministic preview evidence, or browser smoke.
- Current RPG battle loop remains intact: player HP, enemy HP/attack, combo window, upgrades, wrong-press damage, recap, and victory/failure behavior all still work.
- Combo display semantics from Phase 6 remain correct.
- Phase 7A VFX style remains coherent and visible.
- Existing hazards remain delayed, deterministic, bounded, and readable.
- Any tuning changes have before/after evidence in `docs/phase-8-playtest-calibration-content-record.md`.
- Debug/session preview output is deterministic and JSON-safe.
- UI remains readable on desktop, mobile, and short-mobile smoke viewports.
- Host Bridge compatibility is preserved.
- No non-scope systems were added.
- `docs/phase-8-playtest-calibration-content-record.md`, `docs/phase-8-final-report.md`, `TODO.md`, `docs/README.md`, and `Role.md` are updated.
- Final validation passes and the final commit is pushed to `origin/main`.
- Real-device and human playtest gaps are explicitly marked as pending unless actually completed.

## 12. Final Report Template

Create `docs/phase-8-final-report.md` with:

```markdown
# Phase 8 Final Report - Playtest Calibration And Content Expansion

Phase: Phase 8 - Playtest Calibration And Content Expansion
Guide: `docs/phase-8-playtest-calibration-content-goal-guide.md`
Phase record: `docs/phase-8-playtest-calibration-content-record.md`
Final commit: <hash>
Push: <origin/main result>
GitHub Pages workflow: <run id/status after final push>

## Summary

## Baseline

## Implemented Changes

## Progression And Content Evidence

## Balance Evidence

## VFX, Hazard, And Layout Preservation

## Host Bridge And Debug API

## Architecture Self-Check

## Validation

## Pending Real-Device And Human Evidence

## Non-Scope Preserved

## READY_FOR_CHECK Payload
```

The READY_FOR_CHECK payload must include:

- final head commit
- push result
- final report path
- phase record path
- key validation results
- browser smoke evidence path if generated
- pending evidence list
- explicit non-scope confirmation
