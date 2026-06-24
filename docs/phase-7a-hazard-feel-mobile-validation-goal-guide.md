# Phase 7A - Hazard Feel And Mobile Validation Goal Guide

Date: 2026-06-24
Status: execution guide for the implementation executor
Round budget: 8 total rounds, with rounds 1-5 for main validation and tuning work, rounds 6-7 for buffer fixes, and round 8 for final validation.

## 0. Direct Goal Prompt For The Executor

Execute Phase 7A for `D:\WebProjects\ThatButton`: validate and tune the Phase 7 Hazard Director V1 before any new mechanics, engine embedding, or 3D work.

This phase exists because Phase 7 intentionally shipped moving-button and interference hazards with strong structured validation, but true browser/mobile screenshot evidence and human readability evidence remain pending. Phase 7A should close that loop as much as the available environment allows.

The product question is:

Do moving buttons and board-scoped interference feel fair, readable, and worth keeping after the first RPG loop, especially on mobile?

Do not add new hazard types. Do not add Unity, WebView, native bridge, real 3D, roguelite meta-progression, new dependencies, framework migration, or Phase 1 difficulty retuning. Tune only the existing Phase 7 hazard parameters and presentation when evidence supports it.

## 1. Required Reading

- `TODO.md`
- `README.md`
- `docs/README.md`
- `docs/phase-7-advanced-hazards-spatial-interaction-goal-guide.md`
- `docs/phase-7-advanced-hazards-spatial-interaction-record.md`
- `docs/phase-7-final-report.md`
- `docs/phase-6a-combat-feel-balance-record.md`
- `docs/phase-6a-final-report.md`
- `src/config/hazards.js`
- `src/core/hazards.js`
- `src/core/debug.js`
- `src/app/create-app.js`
- `src/ui/render.js`
- `src/core/host-events.js`
- `src/host/app-host-api.js`
- `scripts/validate-structure.mjs`
- `scripts/serve-static.mjs`

## 2. What This Phase Must Complete

- Create `docs/phase-7a-hazard-feel-mobile-validation-record.md` before implementation.
- Record the Phase 7 acceptance baseline.
  - Current hazard unlock levels.
  - Current movement amplitude and timing.
  - Current interference opacity, timing, and scope.
  - Current pending evidence items from Phase 7.
- Add repeatable real-browser smoke coverage when feasible.
  - Desktop `1280x720` playing layout.
  - Mobile `390x844` playing layout.
  - Short mobile `360x740` or similar playing layout.
  - A later-level active moving-button hazard state.
  - A later-level active interference state.
  - Upgrade overlay while hazards are inactive, paused, or harmless.
  - Record screenshots or JSON geometry output under `docs/` only if useful and lightweight.
- If local browser automation is unavailable or flaky, document the exact limitation and preserve structured validation. Do not claim unrun browser evidence as passed.
- Tune existing hazard parameters only if evidence supports it.
  - movement amplitude
  - movement active duration
  - movement cooldown
  - interference unlock level
  - interference active duration
  - interference opacity cap
  - hazard status copy if it is awkward or too loud
- Keep the first enemy and first upgrade loop hazard-free unless the planner explicitly changes the direction.
- Verify Phase 6A combat feel still holds with hazards present.
  - bottom player HUD remains in the command/control area
  - button-to-enemy tracers originate from the current moved button rect
  - combo and wrong-press feedback remain visible above interference
  - upgrade cards remain readable and selectable
- Add a compact manual playtest checklist.
  - iOS Safari touch target accuracy while buttons move
  - Android Chrome touch/layout/vibration behavior
  - human fairness/readability questions for motion and interference
  - record missing real-device evidence as pending, not passed
- Create `docs/phase-7a-final-report.md`.

## 3. What This Phase Must Not Do

- Do not add new hazard types beyond Phase 7 moving-button and interference hazards.
- Do not add enemies, bosses, upgrades, shops, maps, inventories, or roguelite meta-progression.
- Do not integrate Unity, WebView SDKs, native code, custom URL schemes, C# bridges, or engine build pipelines.
- Do not add Three.js, WebGL, camera controls, or a 3D scene.
- Do not add runtime dependencies or framework migration.
- Do not retune Phase 1 board sizes, rule tiers, fatal counts, or base timers.
- Do not shorten timers to compensate for hazards.
- Do not duplicate hazard schedules, rule semantics, combat formulas, combo formulas, or upgrade formulas in UI or host code.
- Do not reintroduce runtime external URLs or CDN resources.

## 4. Architecture Constraints

- `src/config/hazards.js` owns tunable hazard values.
- `src/core/hazards.js` owns deterministic hazard schedules, phases, motion facts, and board-zone facts.
- `src/core/debug.js` must reuse hazard core helpers for previews.
- `src/app/create-app.js` owns orchestration only.
- `src/ui/render.js` may measure live DOM geometry and render facts, but must not decide hazard schedules or gameplay outcomes.
- `src/core/host-events.js` and `src/host/` transport JSON-safe facts only.
- Browser smoke scripts may live inside `scripts/` only if they are useful and zero-dependency; otherwise keep the smoke command documented in the phase record.
- `scripts/validate-structure.mjs` must guard any new invariant introduced by this phase.
- Every round must include Debug and architecture self-checks.

## 5. Every-Round Fixed Workflow

Each round must include:

- round goal
- completed work
- Debug self-check
- architecture self-check
- validation commands and results
- commit hash and push result
- next round goal
- whether a buffer round was consumed

Progression rules:

- If validation fails, do not commit, do not push, and do not proceed.
- If validation passes but commit fails, do not proceed.
- If commit succeeds but push fails, do not proceed.
- Only after push succeeds may the executor start the next round.
- Do not stage unrelated untracked files.

Preferred push workflow:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "<message>" -Paths "<comma-separated phase files>"
```

## 6. Debug Self-Check Requirements

Every round must answer:

- Can the change be explained by a fixed seed, a minimal input sequence, or measured viewport geometry?
- Can failures be localized to hazard config, hazard core, app orchestration, UI render, host payloads, browser smoke tooling, or validation?
- Did first enemy / first upgrade onboarding remain hazard-free?
- If a browser smoke was skipped or failed due to tooling, is that limitation recorded honestly?
- If hazards were tuned, is there before/after evidence?
- If UI changed, was desktop/mobile layout checked?

## 7. Architecture Self-Check Requirements

Every round must answer:

- Did tunable values stay in `src/config/hazards.js`?
- Did deterministic schedule and motion logic stay in `src/core/hazards.js`?
- Did UI avoid deciding which hazard happens or which button is forbidden?
- Did host code avoid duplicating gameplay decisions?
- Did the round avoid new mechanics, Unity/WebView/native/3D, roguelite scope, dependencies, CDN resources, and Phase 1 retuning?
- Are unrelated files, generated outputs, screenshots, and user changes left alone?
- Did validation guard any new invariant introduced this round?

## 8. Round Plan

1. Baseline and test plan.
   - Create `docs/phase-7a-hazard-feel-mobile-validation-record.md`.
   - Record Phase 7 accepted behavior, pending evidence, and the exact browser/mobile smoke target list.
2. Browser smoke harness.
   - Add or document a zero-dependency Chrome/CDP smoke path if feasible.
   - Capture desktop, mobile, and short-mobile playing geometry.
3. Active hazard visual smoke.
   - Exercise active moving-button and active interference states with fixed seeds or debug helpers.
   - Verify moved button rects, tracer origins, overlap, opacity, and feedback layering.
4. Tuning pass.
   - Tune only existing hazard parameters if evidence says motion/interference is too strong, too early, too weak, or visually noisy.
   - Record before/after metrics.
5. Mobile and manual playtest preparation.
   - Add a compact checklist for iOS Safari, Android Chrome, and human readability.
   - If real devices are unavailable, keep evidence pending and list exact follow-up questions.
6. Buffer round 1.
   - Fix browser smoke, layout, validation, or tuning regressions.
7. Buffer round 2.
   - Fix remaining hazard readability or documentation issues.
8. Final validation and report.
   - Create `docs/phase-7a-final-report.md`.
   - Run full validation, push, check GitHub Pages, and report `READY_FOR_CHECK`.

## 9. Validation Matrix

Required commands:

```powershell
cmd /c npm.cmd run validate
cmd /c npm.cmd run build
node scripts\validate-static-site.mjs --include-dist
powershell -NoProfile -ExecutionPolicy Bypass -File .\StartLocalTest.ps1 -DryRun
powershell -NoProfile -ExecutionPolicy Bypass -File .\OpenOnlineTest.ps1 -DryRun
git diff --check
```

Required checks:

- Runtime external URL scan across `index.html`, `src`, and `dist`.
- Fixed-seed hazard schedule preview.
- First enemy / first upgrade hazard-free preview.
- Active moving-button geometry smoke.
- Active interference opacity/scope smoke.
- Desktop `1280x720` browser or structured geometry smoke.
- Mobile `390x844` browser or structured geometry smoke.
- Short mobile/short desktop geometry smoke.
- Upgrade overlay compatibility smoke.
- Host snapshot/event JSON-safety smoke for hazard facts.
- Host-driven `press(buttonId)` smoke while hazards are active.
- Phase 6A combat feedback marker preservation.

## 10. PASS Criteria

Phase 7A is ready for planner check only when all are true:

- Phase 7 hazards remain deterministic, data-driven, and delayed until after the first learnable RPG loop.
- Browser or structured mobile/desktop evidence is recorded honestly, with limitations explicitly stated.
- Any tuning change is backed by before/after evidence.
- Moving-button hazards remain bounded and do not break click target alignment, button text readability, particle origins, or board bounds.
- Interference remains low-fi, brief, board-scoped, and does not obscure rule text, player HUD, combo feedback, wrong-press feedback, or upgrade choices.
- Phase 6A combat feel remains intact.
- Host Bridge compatibility and JSON-safe hazard facts remain intact.
- No new mechanics or deferred engine/3D/roguelite/dependency scope was added.
- Required validation commands pass.
- GitHub Pages workflow passes after the final pushed commit.
- `docs/phase-7a-hazard-feel-mobile-validation-record.md` and `docs/phase-7a-final-report.md` exist.
- `TODO.md` and `docs/README.md` link to Phase 7A artifacts.

## 11. Final Report Template

Create `docs/phase-7a-final-report.md` with:

```markdown
# Phase 7A Final Report - Hazard Feel And Mobile Validation

Phase: Phase 7A - Hazard Feel And Mobile Validation
Guide: `docs/phase-7a-hazard-feel-mobile-validation-goal-guide.md`
Final commit:
Push:
GitHub Pages workflow:

## Summary

## Baseline

## Browser And Mobile Evidence

## Hazard Tuning

## Combat Feel Preservation

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
- validation command results
- browser/mobile smoke evidence or exact limitation
- GitHub Pages workflow result
- pending real-device or human-playtest evidence
- explicit non-scope preserved list

