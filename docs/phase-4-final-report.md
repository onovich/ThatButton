# Phase 4 Final Report - Boss And Combo Gameplay Prototype

Status: READY_FOR_CHECK

## Summary

Phase 4 adds one focused boss-style objective and one conservative combo/streak layer on top of the existing rule loop. The player still wins moment-to-moment by reading the fatal condition, avoiding forbidden buttons, pressing safe buttons, and clearing rounds. Boss HP, combo, victory, and host events provide encounter framing without changing Phase 1 difficulty values or Phase 2 rule semantics.

## Gameplay Result

- Boss: `REACTOR WARDEN`, one encounter with `160` HP.
- Safe presses build combo but do not directly damage the boss.
- Clearing a round deals boss damage.
- Defeating the boss ends the current run with an encounter-clear/victory recap.
- Fatal clicks and timeouts still end the run through the existing failure path.
- Repeated presses remain rejected before score, combo, or combat state changes.

## Combat/Combo Architecture Map

- `src/config/combat.js`: boss values and combo tier constants.
- `src/core/combat.js`: pure combat state, damage calculation, HP mutation, and defeat summary.
- `src/core/combo.js`: pure combo state, tier/cap logic, increment, reset, and summary.
- `src/core/encounter.js`: pure encounter fact and transition helpers.
- `src/core/run-recaps.js`: failure/victory recap assembly from runtime facts.
- `src/core/host-events.js`: host event vocabulary and JSON-safe payload builders.
- `src/host/app-host-api.js`: host snapshot and event emission helpers.
- `src/app/create-app.js`: app orchestration and shared DOM/host input decision path.
- `src/main.js`: tiny browser entry point and `createApp` re-export.
- `src/ui/render.js`: presentation-only combat strip and result recap rendering.

## Damage And Combo Formulas

Damage happens only on round clear:

```text
timeBonus = clamp(floor(timeLeftMs / 3500), 0, 4)
comboBonus = currentComboTier.damageBonus
roundDamage = 18 + timeBonus + comboBonus
bossHpAfter = max(0, bossHpBefore - roundDamage)
```

Combo tiers:

| Streak | Label | Damage Bonus |
| --- | --- | --- |
| 0-2 | `x1.0` | 0 |
| 3-5 | `x1.1` | 2 |
| 6-8 | `x1.2` | 4 |
| 9-12 | `x1.3` | 6 |

Combo resets on fatal click, timeout, reset, or new run. Combo does not alter score, timers, board size, fatal ranges, rule tiers, or clue semantics.

## Host Event Additions

New event types:

- `combat_started`
- `combo_changed`
- `boss_damaged`
- `boss_defeated`

Existing `run_finished` now carries final result facts for both failure and victory. Payloads remain versioned and JSON-safe.

## UI/Mobile Layout Notes

The compact `#combat-status` strip sits below the best-run strip and above the timer. It renders boss name/HP, a fixed HP bar, and combo multiplier/streak. Static validation checks the required DOM ids, render marker, and mobile CSS markers. Real-device iOS/Android layout verification remains pending.

## Debug And Recap Support

Debug API additions:

- `previewCombatRoundClear`
- `getCombatState`
- `getComboState`
- `getLastVictoryRecap`
- `getLastRunResultRecap`

Failure and victory recaps include combat/combo facts and last damage details without exposing future rounds or duplicating rule semantics.

## Architecture Self-Check Summary

- Combat/combo formulas live in pure modules.
- UI renders facts only.
- Host event vocabulary and payload builders are centralized.
- DOM clicks and host `press(buttonId)` still converge through the same decision path.
- `src/main.js` remains a small entry point; app orchestration is explicit in `src/app/create-app.js`.
- Phase 1 difficulty values, Phase 2 rule wording semantics, Phase 3 best-run/failure recap behavior, and Phase 3B host API compatibility are preserved.

## Validation Guardrails Added

`scripts/validate-structure.mjs` now covers:

- combat/combo module imports and pure formula fixtures,
- combo cap/reset behavior,
- boss damage and boss defeat fixtures,
- host payload JSON-safety for combat/combo/boss/victory facts,
- host-driven safe/repeat/fatal input paths,
- fixed-seed boss defeat/victory path,
- host event capture for combo change, boss damage, boss defeat, and victory result,
- debug helper presence and combat preview,
- static/mobile markers for the boss/combo status UI,
- existing seeded previews, failure recaps, best-record helpers, host bridge behavior, and architecture boundary scans.

## Validation Results

- `npm run validate` - PASS via `cmd /c npm.cmd run validate`
- `npm run build` - PASS via `cmd /c npm.cmd run build`
- `StartLocalTest.ps1 -DryRun` - PASS via `powershell -ExecutionPolicy Bypass -File .\StartLocalTest.ps1 -DryRun`
- `OpenOnlineTest.ps1 -DryRun` - PASS via `powershell -ExecutionPolicy Bypass -File .\OpenOnlineTest.ps1 -DryRun`
- `git diff --check` - PASS with expected Windows line-ending warnings only
- Local HTTP smoke for seeded debug URL - PASS
- Module import smoke for combat, combo, host event contract, host bridge, and app entry - PASS through `npm run validate`
- Fixed-seed combat/combo smoke for safe press, round clear, boss damage, boss defeat/victory, fatal click, timeout, and repeat press - PASS through `npm run validate`
- Host event capture smoke for combo changed, boss damaged, boss defeated, and run finished/victory result - PASS through `npm run validate`
- Existing seeded preview smoke for levels `1`, `4`, `8`, `12`, and `18` - PASS through `npm run validate`
- Existing failure recap smoke for wrong-click and timeout - PASS through `npm run validate`
- Existing best-record helper smoke - PASS through `npm run validate`
- Mobile layout smoke - PASS by static marker guard; real-device mobile smoke remains pending

## Non-Scope Preserved

- No roguelite systems, shops, perks, loadouts, or meta-progression.
- No multiple bosses, boss roster, campaign, or stage map.
- No moving buttons, occlusion, spatial inspection, Unity, WebView plugin, native SDK, C# bridge, custom URL scheme, 3D rendering, PWA, i18n, dependency, or framework migration.
- No Phase 1 difficulty curve retuning.
- No Phase 2 copywriting tone pass beyond concise boss/combo labels.
- No edits to `origin/` or GitHub Pages workflow files.

## Remaining Pending Evidence

- Real-device iOS Safari and Android Chrome layout/touch/audio smoke.
- Manual browser visual review after GitHub Pages deploy completes.
- Future host integration proof when a specific Unity/WebView milestone chooses an adapter.

## Commits

- `5dfca21` - docs: define phase 4 combat combo baseline
- `9ecfa03` - feat: add pure combat combo models
- `d275bbb` - feat: wire boss combat runtime events
- `23e5d85` - feat: render boss combo status
- final report/docs commit - pending at report creation time
