# Phase 6 - RPG Combat Loop V1 Goal Guide

Date: 2026-06-24
Status: execution guide for the implementation executor
Round budget: 16 total rounds, with rounds 1-12 for main implementation, rounds 13-15 for buffer fixes, and round 16 for final validation.

## 0. Direct Goal Prompt For The Executor

Execute Phase 6 for `D:\WebProjects\ThatButton`: evolve the current boss/combo prototype into a first playable RPG combat loop while preserving the established static web delivery, Host Bridge boundary, deterministic debug tooling, and architecture guardrails.

The core loop for this phase is:

`read rule -> press safe buttons -> maintain combo window -> clear round -> damage enemy -> defeat enemy -> choose one of three upgrades -> face a stronger enemy`

This phase must also change wrong presses from instant run failure into player damage. A wrong press should damage the player, break combo, and only end the run when player HP reaches zero.

The current combo display is misleading and must be fixed first:

- Do not show combo text or combo reward for the first safe press.
- Show `COMBO x2` only from the second valid chained safe press.
- `COMBO xN` is the chain count, not the damage multiplier label.
- Damage bonus should be shown separately, such as `DMG +4`, `CHAIN BONUS`, or similar short feedback.
- A combo expires when the player misses the combo time window. The next safe press after expiry starts a new chain and should not show combo text yet.

## 1. Required Reading

- `TODO.md`
- `docs/README.md`
- `README.md`
- `docs/phase-3a-architecture-regularization-goal-guide.md`
- `docs/phase-3a-architecture-regularization-record.md`
- `docs/phase-3b-host-bridge-preparation-record.md`
- `docs/phase-4-boss-combo-prototype-goal-guide.md`
- `docs/phase-4-boss-combo-prototype-record.md`
- `docs/phase-4-final-report.md`
- `docs/phase-5-final-report.md`
- `src/config/difficulty.js`
- `src/config/combat.js`
- `src/core/combat.js`
- `src/core/combo.js`
- `src/core/encounter.js`
- `src/core/host-events.js`
- `src/app/create-app.js`
- `src/ui/render.js`
- `scripts/validate-structure.mjs`

## 2. What This Phase Must Complete

- Correct combo semantics and display.
  - First safe press starts a chain silently.
  - Second safe press shows `COMBO x2`.
  - Each later chained safe press increases the displayed count by 1.
  - Existing x1.1/x1.2/x1.3 labels should no longer be the primary visible combo text.
- Add a player HP model.
  - Player starts each run with a configured max HP.
  - Wrong safe/fatal decision damages the player instead of immediately ending the run.
  - Player death ends the run only when HP reaches zero.
  - Wrong press breaks combo and resets combo reward.
- Add enemy scaling.
  - Treat the current boss as an enemy encounter, not the only permanent combat object.
  - Each enemy has a stable attack value while alive.
  - The next enemy is stronger: more HP and higher attack damage.
  - Enemy attack value determines player HP loss on wrong press.
- Add combo time window.
  - A safe press can extend or refresh a short combo window.
  - If the window expires, combo resets before the next safe press.
  - Represent the combo window on the existing pressure/timer bar with a small contrasting segment or overlay.
- Add upgrade selection after defeating an enemy.
  - Defeating an enemy pauses the round flow and presents three upgrade choices.
  - The player selects exactly one upgrade before the next enemy/round begins.
  - The initial upgrade pool must include:
    - longer combo window
    - more max/player HP
    - longer round decision time
    - higher base attack
    - higher combo reward
  - Upgrade choices must be generated deterministically from the existing seeded RNG path.
- Strengthen combo feedback.
  - Combo particles should feel more noticeable than Phase 5 without becoming noisy.
  - Use compact dynamic feedback: floating text, stronger particle burst, subtle screen/body impact, and optional vibration when supported.
  - Respect mobile readability and avoid layout shift.
- Update Host Bridge events and snapshots.
  - Preserve existing host input methods: `start`, `reset`, `press(buttonId)`, `getSnapshot()`, `getDebugApi()`.
  - Preserve existing event compatibility where reasonable.
  - Add new JSON-safe event facts for player damage, enemy spawn, enemy damage/defeat, upgrade offered, and upgrade selected.
- Update validation and debug previews.
  - Add fixed-seed smokes for player damage, combo expiry, enemy scaling, upgrade generation/application, player death, and host payload safety.
  - Keep architecture boundary checks strict.
- Create:
  - `docs/phase-6-rpg-combat-loop-record.md`
  - `docs/phase-6-final-report.md`

## 3. What This Phase Must Not Do

- Do not integrate Unity, WebView SDKs, native bridge code, or 3D engine code.
- Do not add roguelite inventory, shops, loadouts, map nodes, currencies, or meta-progression.
- Do not add moving buttons, occlusion, camera puzzles, or spatial interaction.
- Do not rewrite the app into a framework.
- Do not remove GitHub Pages or local static-server delivery.
- Do not weaken Phase 3B Host Bridge input compatibility.
- Do not put gameplay formulas in DOM/UI code.
- Do not broaden copywriting beyond text needed for player HP, upgrades, combo, and enemy feedback.

## 4. Architecture Plan And Constraints

Add or refactor toward these modules. Keep names close to these unless the executor finds a smaller local fit.

- `src/config/battle.js`
  - player base HP
  - enemy HP/attack scaling
  - base attack
  - combo base window
  - upgrade numeric defaults
- `src/config/upgrades.js`
  - upgrade definitions
  - upgrade rarity/weight if needed
  - short player-facing labels
- `src/core/player.js`
  - create/clone player state
  - apply damage
  - apply max HP changes
  - expose summary facts
- `src/core/enemy.js`
  - create enemy state for enemy index
  - calculate enemy HP and attack
  - apply damage and defeat checks
- `src/core/combo.js`
  - chain count
  - combo window expiry
  - combo reward calculation
  - reset reasons
- `src/core/upgrades.js`
  - deterministic three-choice generation
  - apply selected upgrade to run modifiers
- `src/core/battle.js`
  - player attack calculation
  - wrong-press damage calculation
  - round-clear enemy damage calculation
  - no DOM, no UI classes, no host bridge side effects
- `src/core/encounter.js`
  - compose player/enemy/combo facts for app and host

Architecture constraints are mandatory:

- `src/config/` owns tunable data only.
- `src/core/` owns gameplay rules and formulas only. It must not read DOM, `window`, `document`, `localStorage`, URL query, CSS class names, or AudioContext.
- `src/ui/` owns presentation only. It may render HP, combo, upgrades, particles, and timer overlays, but it must not duplicate damage, enemy attack, combo expiry, upgrade application, or difficulty formulas.
- `src/app/create-app.js` owns orchestration only: input flow, calling pure core functions, updating renderers, and emitting host events.
- `src/host/` owns adapter/event transport only. It must not calculate gameplay outcomes.
- New host event payloads must be JSON-safe and versioned through `src/core/host-events.js`.
- Debug previews must come from pure core/config helpers where possible.
- Keep `scripts/validate-structure.mjs` as an architectural gate, not just a smoke script.

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

- If validation fails, do not commit, do not push, and do not proceed to the next round.
- If validation passes but commit fails, do not proceed.
- If commit succeeds but push fails, do not proceed.
- Only after push succeeds may the executor start the next round.
- Do not stage unrelated untracked files.
- Work with any user changes that appear; do not revert unrelated user work.

Preferred push workflow:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "<message>" -Paths "<comma-separated phase files>"
```

## 6. Debug Self-Check Requirements

Every round must answer:

- Can the current change be explained with a fixed seed and a minimal button sequence?
- Can a failure be localized to config, core, app orchestration, host payload, UI render, or validation?
- Are success, failure, empty, stale, and incompatible states covered where relevant?
- If UI changed, was a repeatable local HTTP or headless browser smoke added or run?
- If state changed, are debug snapshot, host snapshot, recap, and validation boundaries covered?
- Did combo expiry, player damage, enemy scaling, or upgrade state introduce hidden nondeterminism?

## 7. Architecture Self-Check Requirements

Every round must answer:

- Does the source-of-truth layer remain the source of truth?
- Did UI avoid duplicating core gameplay formulas?
- Did host code avoid duplicating app/core decisions?
- Are config, core, app orchestration, UI, host contracts, and validation still separated?
- Did the round avoid pulling Unity, 3D, roguelite meta-progression, moving buttons, or unrelated scope into Phase 6?
- Are unrelated files, generated outputs, and user changes left alone?
- Does `scripts/validate-structure.mjs` protect the new boundary or behavior added this round?

## 8. Round Plan

1. Baseline and design record.
   - Create `docs/phase-6-rpg-combat-loop-record.md`.
   - Record current combo bug, current combat state shape, host event compatibility requirements, and proposed module map.
   - Add initial validation expectations without changing gameplay.
2. Combo semantics core pass.
   - Refactor combo state to use chain count and reward facts.
   - Ensure first safe press is silent and second safe press displays `COMBO x2`.
   - Keep old damage preview tests updated intentionally.
3. Combo UI and feedback pass.
   - Update combo status text, floating rewards, and stronger particles.
   - Add CSS/DOM markers to structure validation.
   - Smoke desktop and mobile layout.
4. Player state core.
   - Add player HP state and pure damage helpers.
   - Add debug summaries and validation smokes.
5. Wrong-press flow.
   - Wrong press damages player, breaks combo, records recap facts, and only ends when HP reaches zero.
   - Preserve timeout as a run-ending failure unless the planner later changes it.
6. Enemy scaling core.
   - Convert single boss config into enemy encounter data.
   - Add enemy index, HP scaling, attack scaling, and stable per-enemy attack.
7. Enemy UI.
   - Render player HP, enemy HP, enemy attack, damage-to-player feedback, and enemy transition states.
   - Keep the RPG battle layout responsive.
8. Combo time window core.
   - Add combo window start/refresh/expiry.
   - Add fixed-seed and fake-time tests/smokes.
9. Combo timer overlay UI.
   - Add a compact timer-bar overlay showing the combo window.
   - Ensure it does not obscure the main pressure timer or mobile readability.
10. Upgrade core.
   - Add deterministic three-choice generation and upgrade application.
   - Implement upgrades for combo window, max HP, decision time, base attack, and combo reward.
11. Upgrade UI.
   - Add selection overlay/cards after enemy defeat.
   - Pause gameplay input while choosing.
   - Resume with upgraded state and next enemy.
12. Host Bridge and debug expansion.
   - Add player/enemy/upgrade events and snapshot fields.
   - Preserve `press(buttonId)` and existing round/run events.
13. Buffer round 1.
   - Fix integration, state, or validation issues discovered in rounds 1-12.
14. Buffer round 2.
   - Tune numbers and UX clarity based on smoke evidence.
15. Buffer round 3.
   - Resolve remaining browser/mobile/host compatibility issues.
16. Final validation and report.
   - Create `docs/phase-6-final-report.md`.
   - Run the full validation matrix.
   - Commit, push, and report `READY_FOR_CHECK` to the planner.

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

- Initial combo state does not display a visible combo reward.
- First safe press does not show combo text.
- Second safe press shows `COMBO x2`.
- Later chained presses increment combo count by exactly one.
- Combo expiry resets chain and suppresses combo text on the next single safe press.
- Wrong press damages player by current enemy attack.
- Wrong press resets combo reward.
- Player HP reaching zero ends the run with a failure recap.
- Player surviving a wrong press can continue the run.
- Enemy HP and attack increase across enemy index.
- Enemy attack stays constant while the same enemy is alive.
- Defeating an enemy offers exactly three upgrades.
- Upgrade choices are deterministic for a fixed seed.
- Each upgrade type applies to the correct state/fact.
- Host snapshots include player, enemy, combo, upgrades, and existing round facts.
- Host events remain JSON-safe.
- Existing browser DOM clicks and host-driven `press(buttonId)` still share one decision path.
- GitHub Pages build output contains the new source modules and no runtime external URL regressions.

Required visual/manual or headless smokes when UI changes:

- Desktop 1280x720 layout does not overlap.
- Mobile 390x844 layout does not overlap.
- Combo particles and floating text are visible without covering the rule text.
- Player damage feedback is visible and brief.
- Upgrade overlay/cards fit mobile and can be selected by pointer/touch.

## 10. PASS Criteria

Phase 6 is ready for planner check only when all are true:

- Combo display semantics match the design in this guide.
- Player HP exists, wrong presses damage HP, and HP zero is the run failure condition for wrong-press damage.
- Wrong presses break combo.
- Combo has a time window and visible timer-bar representation.
- At least one enemy can be defeated, and defeating it offers deterministic three-choice upgrades.
- The next enemy is stronger and has a higher attack value than the previous enemy.
- Upgrade choices include combo window, max HP, decision time, base attack, and combo reward.
- Core/config modules stay browser-free.
- UI does not duplicate gameplay formulas.
- Host events and snapshots expose the new state as JSON-safe payloads.
- `docs/phase-6-rpg-combat-loop-record.md` and `docs/phase-6-final-report.md` exist.
- `TODO.md` and `docs/README.md` link to this guide and final outputs.
- Required validation commands pass.
- GitHub Pages workflow passes after the final pushed commit.

## 11. Final Report Template

Create `docs/phase-6-final-report.md` with:

```markdown
# Phase 6 Final Report - RPG Combat Loop V1

Phase: Phase 6 - RPG Combat Loop V1
Guide: `docs/phase-6-rpg-combat-loop-goal-guide.md`
Final commit:
Push:
GitHub Pages workflow:

## Summary

## Implemented

## Combo Semantics

## Player HP And Damage

## Enemy Scaling

## Upgrade Choices

## Host Bridge And Debug API

## Architecture Self-Check

## Validation

## Pending Evidence

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
