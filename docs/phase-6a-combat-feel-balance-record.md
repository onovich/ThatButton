# Phase 6A Combat Feel And Balance Calibration Record

Phase: Phase 6A - Combat Feel And Balance Calibration  
Guide: `docs/phase-6a-combat-feel-balance-goal-guide.md`  
Baseline head: `38c039523840482881d5bf35fcf822ac74e59501`  
Executor thread: `019ef06d-eb89-75c2-beb2-c695f9bcbedd`  
Planner thread: `019eefc3-8126-7271-b4b4-7dd9742c8545`

## Scope Lock

- Calibrate and polish the existing Phase 6 RPG combat loop.
- Preserve the core loop: read rule, avoid forbidden buttons, press safe buttons, build combo, damage enemy, survive mistakes, choose one upgrade, continue.
- Keep tunable numbers in `src/config/` and formulas in `src/core/`.
- Keep UI presentation fact-driven and keep player HUD separate from enemy identity.
- Move player information into the bottom combat/control area during the feedback/layout pass; player HUD must not remain in the enemy stage.
- Make safe-press attack and combo particles travel from the pressed button toward the enemy hit point, using low-fi CRT/vector/pixel styling.
- Do not add moving buttons, occlusion, spatial hazards, Unity/WebView/native integration, roguelite meta-progression, new dependencies, framework migration, or Phase 1 difficulty-band retuning.

## Round 1 Baseline Metrics

Measured with a fixed pure-module simulation that uses seeded level generation, current enemy/player/combo/upgrade formulas, and a conservative `700ms` safe-press cadence with `600ms` between cleared rounds.

| Seed | First enemy defeated | Safe presses | Simulated elapsed | First upgrade choices |
| --- | ---: | ---: | ---: | --- |
| `phase6a-baseline` | Level 20 | 121 | 96.1s | `WIDER CHAIN`, `CHAIN AMP`, `ARMOR PATCH` |
| `phase6a-alt-a` | Level 20 | 118 | 94.0s | `SLOW CLOCK`, `CHAIN AMP`, `ARMOR PATCH` |
| `phase6a-alt-b` | Level 20 | 122 | 96.8s | `WIDER CHAIN`, `HOTTER STRIKE`, `CHAIN AMP` |

Slower-cadence comparison:

- `phase6a-baseline` at `1100ms` safe-press cadence still defeats enemy 1 at Level 20.
- The slower run takes `144.5s` simulated elapsed time and still reaches capped combo before enemy defeat.
- Current first-upgrade timing is stable but late: the first reward moment appears after roughly 20 cleared rounds in the fixed preview.

Wrong-press survivability:

| Enemy | Attack | Hits to death | Survived wrong presses |
| --- | ---: | ---: | ---: |
| Enemy 1 | 18 | 6 | 5 |
| Enemy 2 | 24 | 5 | 4 |
| Enemy 3 | 30 | 4 | 3 |

Combo-window readability:

| Safe-press cadence | Second press result |
| ---: | --- |
| 600ms | `COMBO x2` |
| 900ms | `COMBO x2` |
| 1200ms | `COMBO x2` |
| 1800ms | `COMBO x2` |
| 2400ms | `COMBO x2` |
| 2500ms | chain expired, next press is `CHAIN READY` |

Current feedback markers:

- No-combo success: `SUCCESS` / `CHAIN READY` button float, `safe-success` / `chain-start` classes, `playSafeClick()` / `playChainReady()`.
- Combo x2: `COMBO x2 DMG +1`, `combo-stage-two`, stronger particles, `playComboCue({ streak: 2 })`.
- Combo x3+: `combo-stage-high`, richer particles and shake.
- Capped combo: `MAX COMBO x12`, `max-combo`, strongest current cue.
- Wrong press: `playError()`, vibration path, `wrong-press-flash`, pressed-button marker, `HIT -N` float, player HUD damage pop.
- Upgrade selection: overlay with three deterministic `upgrade-card` buttons and `playLevelUp()`.
- Safe-press enemy hit projectile: `boss-projectile` already receives a pressed-button source when round clear happens.
- Combo particles: current `combo-particle` burst is anchored around `combat-status`, while `button-combo-spark` is local to the pressed button. Phase 6A must redirect combo feedback toward the enemy instead of leaving it only around the status/button area.
- Player HUD placement: current `#player-hud` is separate from `#combat-status` but still lives in the battle-stage block. Phase 6A must move player information to the bottom combat/control area.

## Round 1 Interpretation

- First upgrade timing is reliable but delayed. A reward at Level 20 asks the player to survive a long first encounter before seeing the RPG layer pay off.
- Wrong-press survivability is forgiving for enemy 1 and still readable for enemy 2/3. Player HP does not need an immediate buff.
- The combo window is generous up to the exact `2400ms` boundary and breaks after `2500ms`; this is fair but could use stronger visible expiry/ready feedback rather than a larger window.
- Since the first enemy ends at Level 20 across sampled seeds, the strongest evidence-backed tuning candidate is enemy HP/base damage pacing, not player HP or wrong-press damage.
- Feedback/layout polishing must address two current baselines: player HUD placement is separate but not bottom-control anchored, and combo particle motion is not yet consistently button-to-enemy.

## Playtest Checklist

- iOS Safari real device: pending. Check touch accuracy, first-tap audio unlock, supported vibration behavior, bottom HUD readability, and projectile visibility.
- Android Chrome real device: pending. Check touch/layout fit, supported vibration behavior, bottom HUD readability, and projectile visibility.
- Human playtest: pending. Ask whether HP pressure feels fair, whether `2400ms` combo expiry feels understandable, whether first upgrade timing feels too late, and whether the run invites retry after a wrong press.

## Round 2 Balance Preview Helper And Tuning Plan

Implemented a repeatable pure debug preview, `previewCombatBalance()`, backed by existing core/config modules:

- Fixed-seed first-enemy run preview for `phase6a-baseline`, `phase6a-alt-a`, and `phase6a-alt-b`.
- Slower `1100ms` safe-press cadence comparison for `phase6a-baseline`.
- Wrong-press survivability preview for enemies 1-3.
- Combo-window cadence preview for `600ms`, `900ms`, `1200ms`, `1800ms`, `2400ms`, and `2500ms`.

Structure validation now locks the current baseline:

- The three default fixed-seed first-enemy previews defeat enemy 1 at Level 20 and offer exactly three upgrades.
- The slower comparison also defeats enemy 1 at Level 20.
- Enemy 1/2/3 survived wrong presses remain `5`, `4`, and `3`.
- `2500ms` between safe presses expires the current combo window and restarts as `CHAIN READY`.

Conservative tuning targets for Round 3:

- Move fast fixed-seed first-upgrade timing from Level 20 toward Level 18.
- Keep the slower `1100ms` cadence path around Level 19-20 so the reward comes earlier without collapsing the first encounter.
- Keep player HP, enemy attack, wrong-press damage, and combo window unchanged unless later smoke evidence says they became unclear.
- Prefer enemy base HP tuning over player HP or combo-window tuning because the baseline shows survivability and combo forgiveness are already readable.

Round 2 validation:

- `node --check src\core\debug.js`: PASS
- `node --check scripts\validate-structure.mjs`: PASS
- `npm run validate`: PASS

Debug self-check:

- The change is explained by fixed seeds, short input cadences, and wrong-press fixtures.
- Failures localize to debug preview composition, seeded level generation, core combat/combo/player/upgrades helpers, or structure validation.
- No tuning has been applied yet, so early failure, timeout, combo expiry, wrong press, upgrade offer, and enemy transition behavior are preserved.

Architecture self-check:

- The preview helper lives in `src/core/debug.js` and calls existing pure modules only.
- No UI, host adapter, or app orchestration formula was added.
- Host payload compatibility is unchanged.
- Deferred hazards, engine work, roguelite meta systems, dependencies, framework work, and Phase 1 difficulty retuning remain out of scope.

## Round 3 Numeric Tuning Pass

Changed only the first enemy HP pacing:

- `BASE_BATTLE_CONFIG.enemyBaseHp`: `540 -> 500`.
- `PROTOTYPE_BOSS_CONFIG.maxHp` now reads from `BASE_BATTLE_CONFIG.enemyBaseHp` instead of hard-coding its own value.
- `PROTOTYPE_BOSS_CONFIG.baseRoundDamage` now reads from `BASE_BATTLE_CONFIG.baseAttackDamage` to keep base attack tuning in one config source.

Unchanged:

- Player HP remains `100`.
- Enemy attack progression remains `18 / 24 / 30`.
- Wrong-press damage remains current enemy attack.
- Combo window remains `2400ms`.
- Combo reward and upgrade values remain unchanged.
- Phase 1 board sizes, rules, fatal ranges, and timers remain unchanged.

Before/after fixed-seed preview:

| Preview | Before | After |
| --- | ---: | ---: |
| `phase6a-baseline` fast first upgrade | Level 20 | Level 18 |
| `phase6a-alt-a` fast first upgrade | Level 20 | Level 18 |
| `phase6a-alt-b` fast first upgrade | Level 20 | Level 18 |
| `phase6a-baseline` slower `1100ms` first upgrade | Level 20 | Level 19 |
| Enemy 2 HP | 660 | 620 |
| Enemy 3 HP | 780 | 740 |
| Enemy 1 survived wrong presses | 5 | 5 |
| Enemy 2 survived wrong presses | 4 | 4 |
| Enemy 3 survived wrong presses | 3 | 3 |

Designer judgment:

- The first reward moment was too late at Level 20 for an RPG loop demonstration.
- Moving the fast fixed-seed path to Level 18 preserves the requirement that the first encounter has time to develop into the 3x3/extended rule bands.
- Keeping the slower path at Level 19 avoids making the first enemy feel disposable.
- HP tuning is preferable to player damage or combo-window tuning because wrong-press survivability and combo readability were already acceptable in Round 1.

Round 3 validation:

- `node --check src\config\battle.js`: PASS
- `node --check src\config\combat.js`: PASS
- `node --check scripts\validate-structure.mjs`: PASS
- `npm run validate`: PASS
- `npm run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS, no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Debug self-check:

- Fixed-seed preview proves the fast path now reaches the first upgrade at Level 18 while the slower comparison reaches it at Level 19.
- Wrong-press survivability and combo-window expiry checkpoints remain unchanged.
- Failure localization remains config/core/validation; no UI, audio, host payload, or app orchestration behavior changed.

Architecture self-check:

- Tuning stayed in config.
- The older boss config now references battle config for HP/base attack instead of duplicating tuning constants.
- UI, host, and app orchestration still consume facts and do not own formulas.
- Deferred hazards, engine work, roguelite meta systems, dependencies, framework work, and Phase 1 difficulty retuning remain out of scope.

## Round 1 Self-Checks

Debug self-check:

- Baseline can be explained by fixed seeds, a `700ms` safe-press cadence, a `1100ms` slower comparison, and wrong-press damage fixtures.
- Failures localize to config/core formulas, fixed-seed generation, combo expiry, or upgrade choice generation.
- Real-device iOS/Android and human playtest evidence remains pending and is not claimed.

Architecture self-check:

- No runtime code changed in this round.
- The record identifies config/core as the only planned tuning source.
- UI remains a fact renderer and player HUD separation remains a PASS criterion.
- Deferred hazards, engine work, roguelite meta systems, dependencies, framework work, and Phase 1 difficulty retuning remain out of scope.
