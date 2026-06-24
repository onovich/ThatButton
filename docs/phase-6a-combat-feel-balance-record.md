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
