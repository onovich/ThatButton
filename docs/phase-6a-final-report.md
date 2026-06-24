# Phase 6A Final Report - Combat Feel And Balance Calibration

Status: READY_FOR_CHECK  
Phase: Phase 6A - Combat Feel And Balance Calibration  
Guide: `docs/phase-6a-combat-feel-balance-goal-guide.md`  
Phase record: `docs/phase-6a-combat-feel-balance-record.md`  
Final commit: reported in the executor READY_FOR_CHECK payload after the final report and route metadata commits are pushed.  
Push: pending final report commit push.  
GitHub Pages workflow: checked after the final pushed commit because the workflow is created by that push.

## Summary

Phase 6A calibrates the existing Phase 6 RPG loop without adding new hazards or engine scope.

The first-run loop remains:

`read rule -> press safe buttons -> build combo -> damage enemy -> survive mistakes -> choose one upgrade -> continue`

The phase reduced first-enemy pacing friction, moved player-owned HUD information into the bottom command area, redirected safe/combo attack feedback from the pressed button toward the enemy, and hardened validation around balance previews, geometry, particle style, and host/debug compatibility.

## Baseline Findings

- Fixed-seed baseline with a `700ms` safe-press cadence defeated the first enemy at Level 20.
- A slower `1100ms` cadence also defeated the first enemy at Level 20, which made the first upgrade feel late for a demo loop.
- Wrong-press survivability was already readable: enemy 1 allowed five survived wrong presses, enemy 2 allowed four, and enemy 3 allowed three before lethal pressure.
- The `2400ms` combo window was fair at the boundary and intentionally broke at `2500ms`.
- Phase 6 feedback already separated no-combo success, chain start, `COMBO x2`, high combo, and capped combo, but particle direction and player HUD placement needed the Phase 6A addendum work.

## Tuning Changes

- Tuned `BASE_BATTLE_CONFIG.enemyBaseHp` from `540` to `500`.
- Kept player HP, enemy attack, wrong-press damage, combo window length, combo reward amount, and upgrade values unchanged because baseline evidence did not justify extra pressure changes.
- Kept enemy scaling conservative: enemy 1 now starts at `500 HP / 18 ATK`, enemy 2 at `620 HP / 24 ATK`, and enemy 3 at `740 HP / 30 ATK`.
- Updated the compatibility boss config to derive from the shared battle config so Phase 4-compatible combat facts do not drift from Phase 6A tuning.
- Before/after preview evidence moved first upgrade timing from Level 20 to Level 18 on the fast cadence and Level 19 on the slower cadence.

## Feedback Polish

- Player HUD now lives in the bottom command/control area before the button grid, separate from enemy identity and outside the enemy stage.
- Safe-press attack tracers originate from the pressed button when a button element is available and travel toward the enemy hit point.
- Combo feedback uses the same button-to-enemy direction instead of playing only around status text.
- Particle style now uses low-fi CRT/vector markers: `button-to-enemy-tracer`, `combo-directional-tracer`, `retro-crt-tracer`, `pixel-spark`, `scanline-streak`, and `terminal-glyph-fragment`.
- Structure validation rejects the return of glossy/high-polish particle markers such as blur-heavy or radial-gradient particle styling inside the guarded particle block.

## Layout And Copy

- Desktop `1280x720`, mobile `390x844`, and short mobile `360x740` playing views fit without HUD/grid or clue/grid overlap.
- Desktop and mobile upgrade overlay smokes reached `upgrade_pending` at Level 18 with exactly three choices, in-viewport cards, and no card overlap.
- No broad copywriting pass was needed. Existing labels such as `PLAYER`, `HP`, `ATK`, `CHAIN READY`, `COMBO xN`, and `ENEMY DOWN / SELECT ONE` remained compact and readable.

## Host/Debug Compatibility

- Added `previewCombatBalance(...)` in pure debug/core code for fixed-seed combat balance previews.
- Existing Host Bridge input methods and JSON-safe snapshot/event shapes remain compatible.
- DOM clicks and host-driven `press(buttonId)` still share one gameplay decision path.
- Button-origin projectile behavior gracefully falls back to enemy/status anchors if a source element cannot be resolved.
- No host adapter, UI module, or app orchestration file owns combat formulas or tuning semantics.

## Architecture Self-Check

- `src/config/` owns tunable numbers.
- `src/core/` owns formulas, deterministic previews, combo expiry, battle math, enemy scaling, and upgrade behavior.
- `src/ui/` renders and animates facts only; it does not calculate safe-button, combat, combo, damage, upgrade, or difficulty semantics.
- `src/host/` remains a JSON-safe transport/output layer.
- `src/app/create-app.js` remains orchestration-focused.
- Validation now guards Phase 6A invariants for bottom player HUD placement, button-to-enemy projectile direction markers, combo directional markers, retro CRT particle style markers, fixed-seed balance previews, upgrade cadence, wrong-press survivability, combo expiry, host payload safety, and desktop/mobile geometry evidence.

## Validation

- `npm run validate`: PASS
- `npm run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS, no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only
- Fixed-seed balance preview: PASS, recorded in `docs/phase-6a-combat-feel-balance-record.md`
- Wrong-press survivability and player-death smoke: PASS through `npm run validate`
- Combo expiry and post-expiry first-safe behavior: PASS through `npm run validate`
- Upgrade choice diversity and deterministic repeatability: PASS through `npm run validate`
- Host snapshot/event JSON-safety smoke: PASS through `npm run validate`
- Projectile origin/target direction smoke: PASS on desktop and mobile Playwright runs
- Combo particle direction smoke: PASS on desktop and mobile Playwright runs
- Retro-futurist particle style marker scan: PASS through structure validation and runtime smoke
- Desktop/mobile playing and upgrade-overlay layout smoke: PASS

Browser smoke evidence:

- Desktop `1280x720`: `playerHudInCommandPanel=true`, `playerHudInBattleStage=false`, safe/combo tracer direction OK, all measured elements within viewport, no clue/grid or HUD/grid overlap.
- Mobile `390x844`: `playerHudInCommandPanel=true`, `playerHudInBattleStage=false`, safe/combo tracer direction OK, all measured elements within viewport, no clue/grid or HUD/grid overlap.
- Short mobile `360x740`: bottom command/player HUD layout remained in viewport with no HUD/grid or clue/grid overlap.
- Upgrade overlay `1280x720` and `390x844`: reached `upgrade_pending` at Level 18 with exactly three choices, cards in viewport, no card overlap.

## Pending Real-Device And Human Evidence

- iOS Safari real-device touch/audio/vibration review remains pending.
- Android Chrome real-device touch/layout/vibration review remains pending.
- Human playtest remains pending for HP pressure, combo-window readability, upgrade cadence, and retry desire.

## Non-Scope Preserved

- No moving buttons, occlusion, spatial grouping, camera constraints, or new hazard mechanics.
- No Unity, WebView SDK, native bridge, custom URL scheme, 3D rendering, or engine build pipeline.
- No roguelite meta-progression, shops, maps, currencies, loadouts, inventories, or persistent builds.
- No framework rewrite, runtime dependency, PWA/service worker, CDN reintroduction, or Phase 1 difficulty-band retuning.
- No formula ownership moved into UI, host adapters, or app orchestration.

## READY_FOR_CHECK Payload

- final head commit: reported after final push
- push: `origin/main`, reported after final push
- final report path: `docs/phase-6a-final-report.md`
- phase record path: `docs/phase-6a-combat-feel-balance-record.md`
- validation command results: full matrix above
- browser/mobile smoke evidence: recorded in `docs/phase-6a-combat-feel-balance-record.md` and summarized above
- GitHub Pages workflow result: checked after final push
- pending evidence: real-device iOS/Android and human playtest only
- non-scope preserved: hazards, engine/native/3D, roguelite/meta, new dependencies, framework rewrite, PWA/service worker, CDN reintroduction, and Phase 1 difficulty retuning
