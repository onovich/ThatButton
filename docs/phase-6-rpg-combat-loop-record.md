# Phase 6 RPG Combat Loop V1 Record

Phase: Phase 6 - RPG Combat Loop V1  
Guide: `docs/phase-6-rpg-combat-loop-goal-guide.md`  
Baseline head: `64828f3f27cc61e87ee5cc2161c77126728ac8e4`  
Executor thread: `019ef06d-eb89-75c2-beb2-c695f9bcbedd`  
Planner thread: `019eefc3-8126-7271-b4b4-7dd9742c8545`

## Scope Lock

- Preserve the base puzzle loop: read the rule, avoid forbidden buttons, press safe buttons, clear rounds.
- Turn the Phase 4 boss/combo prototype into a first playable RPG combat loop.
- Keep all formulas in config/core modules, not UI, host adapters, or `main.js`.
- Preserve static browser delivery, GitHub Pages, `window.__THAT_BUTTON_HOST__`, `window.__THAT_BUTTON_DEBUG__`, DOM clicks, and host-driven `press(buttonId)`.
- Do not add Unity/WebView/native engine integration, 3D/spatial work, roguelite meta-progression, framework migration, dependencies, moving buttons, occlusion, shops, currencies, maps, or loadouts.

## Current Baseline

Recent commits before execution:

- `81d7ddb` - RPG battle layout prototype.
- `b69bf4e` - stronger combo feedback effects.
- `78e505f` - longer Phase 4 boss encounter.
- `cd11979` - Phase 6 guide.
- `64828f3` - Phase 6 dispatch.

Current runtime state:

- `src/config/combat.js` owns the Phase 4 boss config and combo tiers.
- `src/core/combat.js` owns single-boss HP, round-clear damage, and defeat summary.
- `src/core/combo.js` owns streak, multiplier label, damage bonus, cap, and reset.
- `src/core/encounter.js` composes combat/combo facts and delegates safe-press combo and round-clear damage.
- `src/app/create-app.js` still treats a forbidden press as immediate run failure.
- `src/ui/render.js` already has RPG-style battle-stage visuals, boss avatar, boss hit effects, combo reward particles, and compact mobile layout markers.
- `src/host/app-host-api.js` snapshots `combat` and `combo`, but not player, enemy, upgrade, or combo-window facts.

## Current Combo Bug

Phase 4 combo state exposes `multiplierLabel` values such as `x1.0`, `x1.1`, `x1.2`, and `x1.3`.

Current visible behavior:

- Initial combo text is `COMBO x1.0`.
- First safe press can show combo reward feedback.
- `COMBO x1.1 / 3` style text uses damage multiplier semantics as the visible combo label.

Required Phase 6 behavior:

- Initial and first-safe-press state should not show visible combo reward text.
- Second chained safe press should show `COMBO x2`.
- Later chained presses increment the visible chain count by one.
- Damage bonus should be shown separately from visible chain count.
- Combo expiry should reset the chain before the next safe press, and that next single safe press should again be silent.

## Current Combat Shape

Current combat summary fields:

- `bossId`
- `bossName`
- `hp`
- `maxHp`
- `status`
- `totalDamage`
- `roundsCleared`
- `lastDamage`
- `defeatedAtLevel`
- `hpPercent`

Phase 6 target shape:

- Keep compatibility with existing `combat` and boss event facts where reasonable.
- Add explicit enemy facts: enemy index, enemy id/name, stable attack, scaled HP, status, total damage, and defeat level.
- Add player facts: hp, max HP, damage taken, last damage, alive/dead status.
- Add upgrade facts: offered choices, selected choice, applied modifiers, pending-selection state.
- Add combo-window facts: expires-at time, remaining time, visible chain text, reward text, expiry reason.

## Host Event Compatibility Requirements

Keep existing event types usable:

- `host_bridge_ready`
- `run_started`
- `run_reset`
- `round_started`
- `button_pressed`
- `safe_button_cleared`
- `score_changed`
- `round_cleared`
- `combat_started`
- `combo_changed`
- `boss_damaged`
- `boss_defeated`
- `run_finished`
- `best_record_changed`

Add Phase 6 event facts centrally in `src/core/host-events.js`:

- player damage
- enemy spawned
- enemy damaged
- enemy defeated
- upgrades offered
- upgrade selected

Snapshots must remain JSON-safe and include existing round/run facts plus player, enemy/combat, combo, and upgrade facts.

## Proposed Module Map

- `src/config/battle.js`: player base HP, enemy HP/attack scaling, base attack, combo window, and numeric upgrade defaults.
- `src/config/upgrades.js`: deterministic upgrade definitions and short labels.
- `src/core/player.js`: player state, damage, healing/max-HP changes, summaries.
- `src/core/enemy.js`: enemy state by enemy index, HP/attack scaling, damage, defeat checks.
- `src/core/combo.js`: chain count, visible combo text, damage bonus, time window, expiry, reset reasons.
- `src/core/upgrades.js`: deterministic three-choice generation and upgrade application.
- `src/core/battle.js`: player attack, wrong-press damage, round-clear enemy damage, and upgrade-aware formulas.
- `src/core/encounter.js`: app-facing composition for player/enemy/combo/upgrade facts.
- `src/app/create-app.js`: orchestration only: input flow, time updates, upgrade pause/resume, render calls, host event emission.
- `src/ui/render.js`: presentation only: player HP, enemy HP/attack, combo window overlay, combo feedback, damage feedback, upgrade overlay.
- `src/core/host-events.js` and `src/host/app-host-api.js`: JSON-safe event and snapshot surfaces only.

## Initial Validation Expectations

Validation must eventually cover:

- Initial combo has no visible combo reward.
- First safe press starts a chain silently.
- Second chained safe press shows `COMBO x2`.
- Later chained safe presses increment by one.
- Combo expiry resets the chain and suppresses reward on the next single safe press.
- Wrong press deals current enemy attack damage to the player.
- Wrong press breaks combo.
- Player death happens only at zero HP for wrong-press damage.
- Player can survive a wrong press and keep playing.
- Enemy HP and attack scale by enemy index.
- Enemy attack remains stable while an enemy is alive.
- Defeating an enemy offers exactly three deterministic upgrades.
- Upgrade application affects the correct modifiers.
- Host snapshots include player, enemy, combo, upgrades, and existing round facts.
- Host events are JSON-safe and DOM/host inputs share one decision path.
- GitHub Pages build output includes new modules and no runtime external URL regressions.

## Round 1 Self-Check

Debug self-check:

- Current behavior can be localized to Phase 4 combo, combat, app orchestration, host payload, and UI render layers.
- Current combo bug is concrete and reproducible: initial/first press expose visible combo semantics too early.
- No new state or nondeterminism was introduced in this round.

Architecture self-check:

- No runtime code changed.
- Proposed Phase 6 boundaries keep config/core as the source of truth.
- UI and host remain planned consumers of facts only.
- Deferred Unity/WebView/native, 3D, roguelite meta-progression, moving-button, dependency, and framework scope stayed out.

## Rounds 2-3 Combo Semantics And Feedback Evidence

Rounds 2 and 3 were combined because combo core facts and visible status text need to change together.

Implemented:

- `src/core/combo.js` now treats `streak`/`chainCount` as the visible combo chain count.
- Initial combo state reports `CHAIN --`, no `comboText`, no reward text, and zero damage bonus.
- First safe press reports `CHAIN READY`, no `comboText`, no visible reward text, and zero damage bonus.
- Second chained safe press reports `COMBO x2` plus a separate `DMG +1` reward fact.
- Later chained safe presses increment visible chain count by one and increase the separate damage reward up to the configured cap.
- `src/app/create-app.js` suppresses combo reward effects until `combo.hasVisibleCombo` is true.
- `src/ui/render.js` renders `combo.statusText` as the primary combat strip text and uses `combo.rewardText` for floating damage feedback.
- `index.html` starts from `CHAIN --` instead of `COMBO x1.0`.
- `scripts/validate-structure.mjs` now protects initial, first-safe, second-safe, later-chain, cap, reset, host-driven press, and debug preview combo semantics.

Validation run:

- `node --check src\core\combo.js`: PASS
- `npm run validate`: PASS
- `npm run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS with one-time execution-policy bypass
- `OpenOnlineTest.ps1 -DryRun`: PASS with one-time execution-policy bypass
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS, no matches
- Local HTTP smoke on `http://127.0.0.1:5181/`: PASS; `CHAIN --`, `CHAIN BONUS`, battle-stage, and combo module markers served; old `COMBO x1.0` marker absent
- `git diff --check`: PASS with expected Windows line-ending warnings only

Debug self-check:

- Minimal fixture explains the change: initial -> first safe -> second safe -> third safe -> cap -> reset.
- Host-driven input smoke covers first safe as silent and second safe as `COMBO x2`.
- Failures localize to combo config, combo core, app reward gating, render text, host payload, or validation.
- No combo-window expiry, player HP, enemy scaling, or upgrade state was introduced yet.

Architecture self-check:

- Combo calculations remain in config/core modules.
- UI renders combo facts and does not calculate chain count or damage bonus.
- Host snapshots/events receive JSON-safe combo facts from the app/core path.
- DOM clicks and host presses still share `pressButton(...)`.
- Deferred Unity/WebView/native, 3D, roguelite meta-progression, moving-button, dependency, and framework scope stayed out.

## Round 4 Player State Core Evidence

Implemented:

- Added `src/config/battle.js` for Phase 6 battle tunables:
  - player max HP,
  - wrong-press damage default,
  - base attack damage,
  - combo window and future upgrade amounts.
- Added `src/core/player.js` for player HP state, damage application, max-HP changes, and summaries.
- Added `src/core/battle.js` for wrong-press damage calculation and player attack damage calculation.
- Added player state to `src/core/app-state.js` and `src/core/encounter.js`.
- Extended round, recap, host event, and host snapshot payloads so they can carry JSON-safe player facts.
- Added `previewPlayerDamage(...)` to the debug API.
- Extended `scripts/validate-structure.mjs` to import and guard the new modules, player damage fixtures, debug helper, and host snapshot player facts.

Validation run:

- `node --check src\core\player.js`: PASS
- `node --check src\core\battle.js`: PASS
- `npm run validate`: PASS
- `npm run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS with one-time execution-policy bypass
- `OpenOnlineTest.ps1 -DryRun`: PASS with one-time execution-policy bypass
- `git diff --check`: PASS with expected Windows line-ending warnings only

Debug self-check:

- Minimal fixtures cover initial player HP, non-lethal wrong-press damage, lethal wrong-press damage, max-HP increase, player attack damage, debug preview, and JSON-safe host payload.
- Runtime forbidden-press behavior is intentionally unchanged until Round 5, so failures still localize to app orchestration if old instant-failure behavior appears.
- No combo expiry, enemy scaling, or upgrade nondeterminism was introduced in this round.

Architecture self-check:

- Player and battle formulas live in pure config/core modules.
- UI does not calculate HP, damage, or player status.
- Host payloads only clone JSON-safe facts.
- `create-app.js` was not changed in this round; DOM and host input remain on the existing shared path.
- Deferred Unity/WebView/native, 3D, roguelite meta-progression, moving-button, dependency, and framework scope stayed out.

## Round 5 Wrong-Press Damage Flow Evidence

Implemented:

- Added `player_damaged` to the centralized host event vocabulary.
- Added `createPlayerDamagePayload(...)` in `src/core/host-events.js`.
- Added `emitPlayerDamaged(...)` in `src/host/app-host-api.js`.
- Updated `src/app/create-app.js` so forbidden-button presses:
  - keep the compatible `button_pressed` result value `fatal`,
  - apply pure wrong-press player damage,
  - break combo,
  - emit `player_damaged`,
  - continue the run when player HP remains above zero,
  - call the existing failure path only when player HP reaches zero.
- Updated failure recap rendering to include player HP and player damage facts.
- Extended validation for survivor wrong-press flow and lethal wrong-press flow.

Validation run:

- `node --check src\app\create-app.js`: PASS
- `node --check src\core\host-events.js`: PASS
- `npm run validate`: PASS
- `npm run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS with one-time execution-policy bypass
- `OpenOnlineTest.ps1 -DryRun`: PASS with one-time execution-policy bypass
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS, no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Debug self-check:

- Fixed host smoke proves a wrong press at full HP applies 18 damage, breaks combo, emits `player_damaged`, and remains `playing`.
- Fixed host smoke proves a wrong press at low HP reaches `0`, finishes the run, and includes player damage facts in the failure recap.
- Failures now localize to pure battle/player helpers, app orchestration, host payloads, or recap rendering.
- No enemy scaling, combo-window expiry, or upgrade nondeterminism was introduced in this round.

Architecture self-check:

- Damage amount comes from pure battle/player helpers.
- UI renders recap facts only and does not calculate damage or death.
- Host event vocabulary and payload builders remain centralized in `src/core/host-events.js`.
- DOM clicks and host presses still share `pressButton(...)`.
- Deferred Unity/WebView/native, 3D, roguelite meta-progression, moving-button, dependency, and framework scope stayed out.
