# Phase 7 - Advanced Hazards And Spatial Interaction Goal Guide

Date: 2026-06-24
Status: execution guide for the implementation executor
Round budget: 16 total rounds, with rounds 1-12 for main implementation, rounds 13-15 for buffer fixes, and round 16 for final validation.

## 0. Direct Goal Prompt For The Executor

Execute Phase 7 for `D:\WebProjects\ThatButton`: add an HTML-first Hazard Director V1 that introduces advanced hazards after the Phase 6A combat loop has become readable and stable.

This phase should answer a narrow design question:

Can movement, temporary visual interference, and simple spatial grouping make the existing "read rule -> avoid forbidden buttons -> press safe buttons -> fight enemy -> choose upgrade" loop more interesting without turning the game into an unfair reaction test?

The answer must be tested inside the current browser game first. Do not integrate Unity, WebView plugins, native code, 3D rendering, or roguelite meta-progression. Keep ThatButton independently playable on the static HTML/GitHub Pages path.

The first enemy and first upgrade cadence from Phase 6A must remain readable. Hazards should unlock only after the player has had a fair introduction to the RPG loop. Treat hazards as a separate difficulty axis, not as an excuse to shorten timers, make rules longer, or combine every stressor at once.

## 1. Required Reading

- `TODO.md`
- `README.md`
- `docs/README.md`
- `docs/phase-3a-architecture-regularization-goal-guide.md`
- `docs/phase-3a-architecture-regularization-record.md`
- `docs/phase-3b-host-bridge-preparation-record.md`
- `docs/phase-6-rpg-combat-loop-goal-guide.md`
- `docs/phase-6-rpg-combat-loop-record.md`
- `docs/phase-6-final-report.md`
- `docs/phase-6a-combat-feel-balance-goal-guide.md`
- `docs/phase-6a-combat-feel-balance-record.md`
- `docs/phase-6a-final-report.md`
- `src/config/difficulty.js`
- `src/config/battle.js`
- `src/config/upgrades.js`
- `src/core/level.js`
- `src/core/debug.js`
- `src/core/combo.js`
- `src/core/battle.js`
- `src/core/enemy.js`
- `src/core/player.js`
- `src/core/upgrades.js`
- `src/core/host-events.js`
- `src/app/create-app.js`
- `src/host/app-host-api.js`
- `src/ui/render.js`
- `src/ui/audio.js`
- `scripts/validate-structure.mjs`

## 2. What This Phase Must Complete

- Create `docs/phase-7-advanced-hazards-spatial-interaction-record.md` before implementation.
- Design a small, data-driven Hazard Director.
  - Hazard state and schedules must be deterministic for fixed seeds.
  - Hazards must be configurable by level/enemy band without rewriting Phase 1 difficulty bands.
  - Hazards must be easy to disable in debug/preview paths.
  - Hazards must not appear before the player has reached the post-tutorial combat rhythm. The first enemy should stay hazard-free unless evidence strongly justifies otherwise.
- Add the first moving-button hazard.
  - Movement should be gentle and readable: drift, slide, or pulse within safe bounds.
  - The button's visual position and clickable target must move together.
  - Buttons must not overlap, leave the board, cover rule text, or make text unreadable.
  - Movement speed, amplitude, cooldown, and unlock timing must be independent tuning values.
  - Movement must not change which buttons are forbidden; rule semantics remain core-owned.
- Add one temporary visual-interference hazard.
  - Use low-fi CRT/signal concepts such as scanline noise, signal dropout, or terminal interference.
  - Interference may affect the board or selected buttons, but must not fully hide the rule text or create accidental ambiguity about the fatal condition.
  - Interference must be brief, telegraphed when useful, and bounded by cooldown.
  - It must be readable on mobile and must not fight Phase 6A attack/combo particles.
- Add a minimal spatial-grouping preparation layer.
  - Define 2D board zones, lanes, or sectors as data facts that future 3D/engine work can consume.
  - Use those facts only if they help hazard placement or validation.
  - Do not create a real 3D scene, camera puzzle, Unity prefab, or engine renderer.
- Extend debug previews and validation.
  - Fixed-seed hazard schedule preview.
  - Hazard-free early run preview.
  - Moving-button geometry smoke.
  - Interference readability marker smoke.
  - Host snapshot/event JSON-safety smoke for hazard state.
  - Desktop/mobile layout and overlap checks.
- Extend Host Bridge facts without binding to any plugin.
  - Preserve `start`, `reset`, `press(buttonId)`, `getSnapshot()`, and `getDebugApi()`.
  - Add JSON-safe hazard facts and events centrally if needed, such as `hazard_started`, `hazard_updated`, and `hazard_ended`.
  - DOM clicks and host-driven `press(buttonId)` must still converge through one gameplay decision path.
- Preserve Phase 6A combat feel.
  - Player HUD stays in the bottom command/control area.
  - Attack and combo tracers still originate from the current pressed button rect and travel toward the enemy.
  - Combo, wrong-press, upgrade, and enemy feedback remain visible when hazards are active.
- Create `docs/phase-7-final-report.md`.

## 3. What This Phase Must Not Do

- Do not integrate Unity, WebView SDKs, native bridge code, custom URL schemes, C# code, or engine build pipelines.
- Do not add 3D rendering, Three.js, WebGL scenes, camera controls, or spatial movement in a 3D world.
- Do not add roguelite meta-progression, shops, maps, currencies, inventories, loadouts, or persistent builds.
- Do not retune Phase 1 board-size/rule-tier/fatal-count/timer bands unless the planner explicitly approves a separate difficulty phase.
- Do not shorten timers to compensate for hazards.
- Do not make early levels harder before the player reaches the first RPG reward loop.
- Do not duplicate rule, fatal-button, damage, combo, upgrade, or difficulty semantics in UI or host code.
- Do not add runtime dependencies or framework migration.
- Do not reintroduce CDN or external runtime resources.

## 4. Architecture Plan And Constraints

Prefer the smallest module map that matches the current codebase, but keep these ownership boundaries strict:

- `src/config/hazards.js`
  - hazard unlock thresholds
  - hazard weights
  - movement speed/amplitude/cooldown
  - interference duration/cooldown/intensity
  - debug disable defaults
- `src/core/hazards.js`
  - deterministic hazard state
  - hazard schedule generation
  - hazard tick/update helpers
  - board-zone facts
  - no DOM, no `window`, no `document`, no CSS classes, no AudioContext
- `src/core/debug.js`
  - fixed-seed hazard previews that reuse `src/core/hazards.js`
  - no second implementation of hazard rules
- `src/core/host-events.js`
  - versioned JSON-safe hazard payload builders if host events are added
- `src/app/create-app.js`
  - orchestration only: call pure hazard helpers, update UI facts, and emit host events
  - do not calculate hazard difficulty or geometry rules here
- `src/ui/render.js`
  - render hazard facts as CSS classes, transforms, overlays, and markers
  - measure browser geometry only for presentation and smoke evidence
  - do not decide which hazard should happen or whether a button is forbidden
- `scripts/validate-structure.mjs`
  - enforce core purity
  - enforce hazard ownership boundaries
  - validate deterministic hazard previews
  - guard geometry/style markers for movement and interference

Hard constraints:

- Core/config remain browser-free and deterministic.
- UI consumes facts and applies presentation only.
- Host bridge transports JSON-safe facts only.
- Rule semantics remain owned by core level/rule generation.
- Combat formulas remain owned by battle/player/enemy/combo/upgrades core modules.
- Hazard tuning must be explainable by fixed-seed previews, viewport smoke, or recorded designer judgment.
- Every round must include Debug and architecture self-checks before commit/push.

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
- Work with user changes that appear; do not revert unrelated user work.

Preferred push workflow:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "<message>" -Paths "<comma-separated phase files>"
```

## 6. Debug Self-Check Requirements

Every round must answer:

- Can the current change be explained by a fixed seed, a minimal input sequence, or a measured viewport?
- Can failures be localized to hazard config, hazard core, level generation, app orchestration, UI render, host payloads, or validation?
- Does the first enemy / first upgrade path remain hazard-free or clearly justified?
- Are hazard disabled, inactive, active, expired, and incompatible states covered where relevant?
- If UI changed, was a repeatable desktop/mobile geometry smoke added or run?
- If moving buttons changed geometry, do click targets, particle origins, and overlap checks still use the current rect?
- If interference changed readability, does it avoid covering rule text and the bottom player HUD?

## 7. Architecture Self-Check Requirements

Every round must answer:

- Did config/core remain the source of truth for hazard schedules and tuning?
- Did UI avoid deciding which hazard happens, which button is forbidden, or how combat damage works?
- Did host code avoid duplicating app/core decisions?
- Are difficulty, rules, combat, hazards, app orchestration, UI, host contracts, and validation still separated?
- Did this round avoid Unity/WebView/native/3D, roguelite meta-progression, new dependencies, CDN resources, and unrelated redesign?
- Are unrelated files, generated outputs, and user changes left alone?
- Did validation guard any new invariant introduced this round?

## 8. Round Plan

1. Baseline and hazard design record.
   - Create `docs/phase-7-advanced-hazards-spatial-interaction-record.md`.
   - Record current Phase 6A layout, first-upgrade timing, attack particle origin behavior, player HUD placement, host snapshot shape, and risk points.
   - Define unlock assumptions for early/mid/late hazard exposure.
2. Hazard config/core model.
   - Add `src/config/hazards.js` and `src/core/hazards.js` or the smallest equivalent.
   - Implement deterministic disabled/inactive/active/expired hazard state helpers.
   - Add pure fixed-seed previews.
3. App/debug/host integration without visible hazards.
   - Wire hazard facts through app state, debug snapshot, and host snapshot/events if needed.
   - Keep runtime presentation unchanged.
4. UI hazard marker foundation.
   - Add presentation hooks/classes/data attributes for hazard state.
   - Add validation markers before actual motion.
5. Moving-button hazard V1.
   - Add gentle movement for selected buttons after the safe unlock threshold.
   - Ensure click target and visual target remain unified.
   - Ensure Phase 6A attack/combo tracers use the moved button's current rect.
6. Moving-button validation and tuning.
   - Add deterministic movement preview and desktop/mobile geometry smoke.
   - Reject overlaps, out-of-board movement, rule-text collision, or button text unreadability.
7. Interference hazard V1.
   - Add a brief CRT/signal interference hazard with bounded intensity and cooldown.
   - Keep rule text, timer, player HUD, and upgrade cards readable.
8. Interference validation and tuning.
   - Add marker/style/readability smoke.
   - Ensure interference does not obscure combo/wrong-press/enemy feedback.
9. Spatial grouping facts.
   - Add board zone/lane/sector facts if useful for hazard placement and future engine consumption.
   - Keep it 2D data only; no real 3D, camera, or engine renderer.
10. Difficulty and encounter pacing pass.
   - Tune hazard unlocks by level/enemy band using Phase 6A evidence.
   - Keep first enemy and first upgrade readable.
   - Avoid stacking motion, interference, short timers, and complex clues too early.
11. Host Bridge and debug contract pass.
   - Finalize hazard snapshot/event vocabulary.
   - Validate JSON-safe payloads and host-driven `press(buttonId)` compatibility.
12. Docs and entry-point sync.
   - Update `TODO.md`, `docs/README.md`, and any relevant README/handoff notes.
   - Record playtest questions for hazards.
13. Buffer round 1.
   - Fix integration, geometry, input, or validation regressions.
14. Buffer round 2.
   - Tune UX clarity, motion speed, interference intensity, and mobile fit.
15. Buffer round 3.
   - Resolve remaining browser/host/debug issues.
16. Final validation and report.
   - Create `docs/phase-7-final-report.md`.
   - Run the full validation matrix.
   - Commit, push, check GitHub Pages, and report `READY_FOR_CHECK` to the planner.

## 9. Validation Matrix

Required commands:

```powershell
npm run validate
npm run build
node scripts\validate-static-site.mjs --include-dist
powershell -NoProfile -ExecutionPolicy Bypass -File .\StartLocalTest.ps1 -DryRun
powershell -NoProfile -ExecutionPolicy Bypass -File .\OpenOnlineTest.ps1 -DryRun
git diff --check
```

Required automated/structured smokes:

- Runtime external URL scan across `index.html`, `src`, and `dist`.
- Core purity scan proving hazard core/config do not reference DOM, browser globals, AudioContext, CSS classes, URL query, or live app state.
- Fixed-seed hazard schedule preview.
- Preview proving the first enemy / early onboarding path is hazard-free or explicitly justified.
- Moving-button preview covering inactive, telegraph, active movement, expiry, and disabled states.
- Moving-button geometry smoke proving no overlap, no board escape, no rule collision, and current clickable rect/visual rect alignment.
- Attack/combo tracer smoke proving projectiles still originate from the moved pressed button's current rect.
- Interference style/readability marker smoke.
- Interference timing smoke covering inactive, telegraph if used, active, expiry, and cooldown.
- Host snapshot/event JSON-safety smoke for hazard facts.
- Host-driven `press(buttonId)` smoke while hazards are active.
- Desktop 1280x720 playing layout smoke.
- Mobile 390x844 playing layout smoke.
- Short mobile or short desktop smoke if motion/interference risks vertical fit.
- Upgrade overlay smoke proving hazards pause, clear, or remain harmless while choosing upgrades.

## 10. PASS Criteria

Phase 7 is ready for planner check only when all are true:

- Hazard Director V1 exists as a data-driven, deterministic system.
- Hazards unlock later than the first learnable RPG loop unless strong evidence says otherwise.
- Moving-button V1 is readable, bounded, and does not break click targets, particle origins, or button text.
- Temporary interference V1 is brief, low-fi, readable, and does not cover rule text or player HUD.
- Spatial grouping facts, if added, remain 2D data preparation only.
- No rule semantics, fatal-button decisions, combat formulas, combo formulas, or upgrade formulas were duplicated in UI/host/app code.
- Phase 6A combat feel remains intact: bottom player HUD, button-to-enemy tracers, combo/wrong-press feedback, and upgrade overlay still work.
- Host Bridge compatibility is preserved and new hazard facts are JSON-safe.
- Validation matrix passes.
- GitHub Pages workflow passes after the final pushed commit.
- `docs/phase-7-advanced-hazards-spatial-interaction-record.md` and `docs/phase-7-final-report.md` exist.
- `TODO.md` and `docs/README.md` link to Phase 7 artifacts.
- Real-device and human-playtest evidence is recorded as passed or explicitly pending; do not claim evidence that was not gathered.

## 11. Final Report Template

Create `docs/phase-7-final-report.md` with:

```markdown
# Phase 7 Final Report - Advanced Hazards And Spatial Interaction

Phase: Phase 7 - Advanced Hazards And Spatial Interaction
Guide: `docs/phase-7-advanced-hazards-spatial-interaction-goal-guide.md`
Final commit:
Push:
GitHub Pages workflow:

## Summary

## Implemented Hazards

## Unlock And Difficulty Pacing

## Moving Button Behavior

## Interference Behavior

## Spatial Grouping / Future Engine Preparation

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
- browser/mobile smoke evidence
- GitHub Pages workflow result
- pending real-device or human-playtest evidence
- explicit non-scope preserved list

