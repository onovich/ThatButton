# Phase 6A - Combat Feel And Balance Calibration Goal Guide

Date: 2026-06-24
Status: execution guide for the implementation executor
Round budget: 8 total rounds, with rounds 1-5 for main calibration work, rounds 6-7 for buffer fixes, and round 8 for final validation.

## 0. Direct Goal Prompt For The Executor

Execute Phase 6A for `D:\WebProjects\ThatButton`: calibrate and polish the Phase 6 RPG combat loop before adding new hazards, spatial mechanics, or engine integration.

The goal is to make the existing loop feel readable, satisfying, and worth replaying:

`read rule -> press safe buttons -> build combo -> damage enemy -> survive mistakes -> choose upgrade -> continue`

This phase must use the Phase 6 implementation as the source of truth. Do not add new mechanics such as moving buttons, occlusion, 3D, roguelite meta systems, shops, maps, currencies, loadouts, Unity/WebView integration, or new dependencies. Tune and polish only what already exists: combo feedback, wrong-press feedback, player/enemy HP pressure, upgrade cadence, layout fit, copy clarity for new combat surfaces, and validation/playtest evidence.

## 1. Required Reading

- `TODO.md`
- `docs/README.md`
- `README.md`
- `docs/phase-6-rpg-combat-loop-goal-guide.md`
- `docs/phase-6-rpg-combat-loop-record.md`
- `docs/phase-6-final-report.md`
- `src/config/battle.js`
- `src/config/upgrades.js`
- `src/core/battle.js`
- `src/core/combat.js`
- `src/core/combo.js`
- `src/core/enemy.js`
- `src/core/player.js`
- `src/core/upgrades.js`
- `src/core/encounter.js`
- `src/core/host-events.js`
- `src/app/create-app.js`
- `src/ui/audio.js`
- `src/ui/render.js`
- `scripts/validate-structure.mjs`

## 2. What This Phase Must Complete

- Create `docs/phase-6a-combat-feel-balance-record.md` before implementation.
- Audit the current Phase 6 first-run experience with fixed seeds.
  - Track first enemy time-to-defeat.
  - Track how often upgrade choices appear.
  - Track wrong-press survivability.
  - Track combo window readability and whether combo expiry feels fair.
- Tune only existing numeric surfaces when evidence supports it.
  - player HP
  - enemy HP and attack progression
  - base attack
  - combo window duration
  - combo reward amount
  - upgrade values
  - round decision time modifier
- Improve feel for existing feedback.
  - combo stages should escalate clearly in floating text, particles, audio, and impact.
  - no-combo success should feel acknowledged but calmer.
  - wrong press should feel damaging and readable without visually muddying the next decision.
  - upgrade selection should feel like a reward moment, not just a modal interruption.
- Improve combat UI readability without redesigning the game.
  - player HUD remains separate from enemy identity.
  - enemy stage remains enemy-owned.
  - combo timer overlay remains readable but secondary to the main pressure timer.
  - upgrade cards fit short desktop and mobile viewports.
- Add or refine deterministic validation smokes.
  - fixed-seed early-run balance preview
  - combo feedback tier markers
  - wrong-press feedback markers
  - upgrade cadence and choice diversity
  - player/enemy survivability checkpoints
  - desktop/mobile layout geometry
- Add a compact playtest checklist inside the Phase 6A record.
  - iOS Safari real-device touch/audio/vibration
  - Android Chrome touch/layout/vibration
  - human playtest questions for HP pressure, combo-window feel, upgrade cadence, and retry desire
  - If real-device or human evidence is unavailable, record it as pending; do not claim it passed.
- Create `docs/phase-6a-final-report.md`.

## 3. What This Phase Must Not Do

- Do not add moving buttons, occlusion, spatial grouping, camera constraints, or new hazard mechanics.
- Do not add Unity, WebView SDKs, native bridge code, custom URL schemes, 3D rendering, or engine build pipelines.
- Do not add roguelite meta-progression, shops, maps, currencies, loadouts, inventories, or persistent builds.
- Do not rewrite the project into a framework.
- Do not add runtime dependencies.
- Do not change Phase 1 board-size/rule-tier/fatal-count difficulty bands unless the planner explicitly approves a separate difficulty phase.
- Do not put tuning formulas in UI, host adapters, or `create-app.js`.
- Do not weaken Phase 3B Host Bridge compatibility.

## 4. Architecture Constraints

- `src/config/` owns tunable numbers.
- `src/core/` owns formulas and deterministic summaries.
- `src/app/create-app.js` owns orchestration only.
- `src/ui/` owns presentation only and must render facts from app/core.
- `src/host/` owns transport and JSON-safe cloning only.
- `scripts/validate-structure.mjs` must protect any new invariants added by this phase.
- Any tuning must be justified by fixed-seed previews, runtime smoke, visual evidence, or clearly recorded designer judgment.
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

- Can the change be explained by a fixed seed, a short input sequence, or a measured viewport?
- Can failures be localized to config, core, app orchestration, UI render, audio, host payload, or validation?
- Did any tuning make early failure, timeout, combo expiry, wrong press, upgrade offer, or enemy transition worse?
- If UI changed, was a repeatable desktop/mobile smoke run?
- If audio/vibration changed, is unsupported-device behavior harmless?
- If real-device or human playtest evidence is missing, is it explicitly recorded as pending?

## 7. Architecture Self-Check Requirements

Every round must answer:

- Did tuning stay in config/core rather than UI/host/app orchestration?
- Did UI avoid duplicating combat, combo, upgrade, player, enemy, or timer formulas?
- Did host payloads remain JSON-safe and compatibility-preserving?
- Did this round avoid deferred hazards, 3D, Unity/WebView, roguelite meta-progression, new dependencies, and framework work?
- Are unrelated files and user changes left alone?
- Did validation guard any new invariant introduced this round?

## 8. Round Plan

1. Baseline calibration record.
   - Create `docs/phase-6a-combat-feel-balance-record.md`.
   - Record fixed-seed baseline metrics for early enemies, combo windows, upgrade cadence, wrong-press survivability, and current visual/audio feedback markers.
2. Balance simulation and tuning plan.
   - Add deterministic preview helpers or validation fixtures if needed.
   - Decide conservative tuning targets for first enemy defeat time, first upgrade timing, wrong-press survivability, and combo-window forgiveness.
3. Numeric tuning pass.
   - Tune existing config/core values only.
   - Keep changes small and record before/after evidence.
4. Feedback polish pass.
   - Refine existing combo, no-combo success, wrong-press, enemy-damage, and upgrade-choice feedback.
   - Add validation markers for feedback tier separation.
5. Layout and copy readability pass.
   - Tighten mobile/short desktop fit.
   - Polish only the new Phase 6 combat/upgrade copy if it is awkward, too long, or unclear.
6. Buffer round 1.
   - Fix validation, browser smoke, or balance regressions.
7. Buffer round 2.
   - Fix remaining UX/layout/audio issues.
8. Final validation and report.
   - Create `docs/phase-6a-final-report.md`.
   - Run full validation, push, check GitHub Pages, and report `READY_FOR_CHECK`.

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

Required checks or smokes:

- Runtime external URL scan across `index.html`, `src`, and `dist`.
- Fixed-seed early-run preview before/after any numeric tuning.
- First enemy defeat and first upgrade timing smoke.
- Wrong-press survivability and player-death smoke.
- Combo expiry and post-expiry first-safe behavior smoke.
- Combo tier feedback marker smoke for no-combo success, chain start, `COMBO x2`, higher combo, and capped combo.
- Upgrade choice diversity and deterministic repeatability smoke.
- Host snapshot/event JSON-safety smoke after any state or payload change.
- Desktop 1280x720 playing and upgrade-overlay layout smoke.
- Mobile 390x844 playing and upgrade-overlay layout smoke.

## 10. PASS Criteria

Phase 6A is ready for planner check only when all are true:

- Phase 6 RPG combat loop still works end to end.
- Tuning changes are backed by fixed-seed evidence, browser smoke, or recorded designer judgment.
- Combo, wrong-press, enemy-damage, and upgrade feedback are more legible and satisfying than Phase 6 baseline.
- Player HUD remains separate from enemy identity.
- Upgrade choices remain deterministic and exactly three choices are offered.
- No new mechanics or deferred scope were added.
- Core/config remain the source of truth for formulas and tuning.
- UI/host/app orchestration do not duplicate formulas.
- Validation matrix passes.
- GitHub Pages workflow passes after the final pushed commit.
- `docs/phase-6a-combat-feel-balance-record.md` and `docs/phase-6a-final-report.md` exist.
- `TODO.md` and `docs/README.md` link to Phase 6A artifacts.

## 11. Final Report Template

Create `docs/phase-6a-final-report.md` with:

```markdown
# Phase 6A Final Report - Combat Feel And Balance Calibration

Phase: Phase 6A - Combat Feel And Balance Calibration
Guide: `docs/phase-6a-combat-feel-balance-goal-guide.md`
Final commit:
Push:
GitHub Pages workflow:

## Summary

## Baseline Findings

## Tuning Changes

## Feedback Polish

## Layout And Copy

## Host/Debug Compatibility

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
