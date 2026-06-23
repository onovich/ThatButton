# Phase 4 Boss And Combo Gameplay Prototype Record

Date started: 2026-06-23
Phase: Phase 4 - Boss And Combo Gameplay Prototype
Guide: `docs/phase-4-boss-combo-prototype-goal-guide.md`

This record defines the narrow Phase 4 gameplay prototype before implementation. The boss and combo layers are motivational framing on top of the existing rule loop: read the fatal condition, avoid forbidden buttons, press every safe button, and clear the round.

## Prototype Scope

- One boss encounter only: `REACTOR WARDEN`.
- One conservative combo/streak layer only.
- Safe presses keep the player moving and build combo.
- Round clears deal boss damage.
- Fatal clicks and timeouts still end the run immediately.
- Boss defeat ends the current run with a victory/result recap.
- No roguelite, shop, perk, multi-boss, moving-button, Unity, WebView, 3D, PWA, dependency, i18n, or Phase 1 difficulty retuning work.

## Boss Configuration

The prototype boss config is owned by config/core code, not UI or `main.js`.

| Field | Value | Intent |
| --- | --- | --- |
| id | `reactor-warden` | Stable host/debug id. |
| name | `REACTOR WARDEN` | Short UI label. |
| max HP | `160` | Defeatable after several clean clears without extending the run into a campaign. |
| base round damage | `18` | Round clear is the primary attack. |
| max time bonus | `4` | Remaining time adds small reward without retuning timers. |
| max combo bonus | `6` | Clean streak matters but cannot dominate rule reading. |

## Damage Formula

Damage is calculated only on round clear:

```text
timeBonus = clamp(floor(timeLeftMs / 3500), 0, 4)
comboBonus = currentComboTier.damageBonus
roundDamage = 18 + timeBonus + comboBonus
bossHpAfter = max(0, bossHpBefore - roundDamage)
```

Safe presses do not damage the boss directly. They can only increase combo before the next round-clear damage calculation.

## Combo Formula

Combo is run-local and capped.

| Streak | Tier | Multiplier Label | Damage Bonus |
| --- | --- | --- | --- |
| 0-2 | 0 | `x1.0` | 0 |
| 3-5 | 1 | `x1.1` | 2 |
| 6-8 | 2 | `x1.2` | 4 |
| 9-12 | 3 | `x1.3` | 6 |

Rules:

- A safe press increments streak by one until the cap of `12`.
- A fatal press, timeout, reset, or new run resets combo to zero.
- Combo does not change score, timers, rewards, board size, fatal ranges, rule tiers, or clue semantics.
- Host/debug payloads include the current streak, tier, multiplier label, damage bonus, cap state, and last change reason.

## Runtime State Additions

Combat state:

- current HP and max HP,
- encounter status: `active` or `defeated`,
- total damage dealt,
- cleared-round count,
- last damage result,
- defeated-at-level data.

Combo state:

- current streak,
- tier,
- multiplier label,
- damage bonus,
- cap flag,
- last change reason.

Result recap additions:

- victory result when the boss is defeated,
- combat summary,
- combo summary,
- last damage details.

## Host Event Vocabulary

Phase 4 extends the Phase 3B host event vocabulary centrally in `src/core/host-events.js`:

- `combat_started`
- `combo_changed`
- `boss_damaged`
- `boss_defeated`
- existing `run_finished` remains the final result envelope for both failure and victory, with a result reason in the payload.

All payload builders must return JSON-safe plain data and avoid DOM nodes, event objects, timers, functions, class instances, storage handles, browser globals, and live runtime references.

## UI Placement

Add one compact combat strip below the best-run strip and above the timer:

- left side: boss name and HP value,
- middle: fixed-height HP bar,
- right side: combo streak and multiplier label.

The strip must remain one small status band on desktop and mobile. It must not overlap the clue, timer, board, best-run strip, or failure/result recap.

## Validation Fixtures

Deterministic validation should cover:

- pure combo safe-press increment and cap behavior,
- pure combo reset behavior for fatal/timeout/reset,
- pure combat round-clear damage calculation,
- pure boss defeat transition,
- host event JSON-safety for combat/combo payloads,
- app smoke with a fixed seed for safe press, repeated press, fatal press, timeout, round clear, boss damage, and boss defeat,
- host-driven input smoke proving `press(buttonId)` still uses the same gameplay decision path,
- static/mobile marker smoke for the combat strip.

## Round 1 Self-Check

Debug self-check:

- Fixed fixtures exist for damage and combo formulas.
- Failure localization is split into combo model, combat model, host event contract, app orchestration, UI rendering, and existing level/rule generation.
- Safe press, round clear, boss damage, boss defeat, fatal click, timeout, reset, repeated press, and host states are named for later validation.

Architecture self-check:

- Combat and combo source-of-truth will live in pure modules.
- UI will render combat/combo facts only.
- Host payload vocabulary will stay centralized.
- `main.js` will orchestrate state transitions but will not own formulas or payload schemas.
- Deferred roguelite, multi-boss, moving-button, Unity, WebView, 3D, dependency, and difficulty-retuning scope remains out of phase.

## Round 2 Pure-Module Evidence

Implemented pure ownership:

- `src/config/combat.js` owns boss and combo constants.
- `src/core/combo.js` owns combo creation, increment, reset, tier, cap, and summary logic.
- `src/core/combat.js` owns combat state, damage calculation, boss HP mutation, defeat transition, and summary logic.

Validation fixtures added to `scripts/validate-structure.mjs`:

- initial combo state is `0 / x1.0 / +0`;
- 13 safe-press increments cap at streak `12`, tier `3`, `x1.3`, `+6`;
- fatal reset returns combo to zero and records `fatal_press`;
- initial boss state is `reactor-warden`, `160 / 160`, `active`;
- `18000 ms` remaining with streak `3` deals `18 + 4 + 2 = 24`;
- six max-bonus round clears defeat the boss at level `6`.

Round 2 debug self-check:

- Current combat/combo changes are reproduced by direct pure-module fixtures.
- Failures can be localized to `src/config/combat.js`, `src/core/combo.js`, `src/core/combat.js`, or the validator import surface.
- Success, safe-press combo, reset, round damage, and boss defeat are covered here; runtime fatal, timeout, host events, and UI are deferred to later rounds.

Round 2 architecture self-check:

- New combat/combo modules do not access DOM, browser globals, storage, audio, CSS classes, URL query, or `gameState`.
- UI and host adapters are unchanged and still do not own formula decisions.
- `main.js` is unchanged in this round.
- No deferred boss roster, roguelite, moving-button, Unity, WebView, 3D, dependency, or Phase 1 retuning scope was added.
