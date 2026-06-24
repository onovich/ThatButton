# Phase 8 Final Report - Playtest Calibration And Content Expansion

Phase: Phase 8 - Playtest Calibration And Content Expansion
Guide: `docs/phase-8-playtest-calibration-content-goal-guide.md`
Phase record: `docs/phase-8-playtest-calibration-content-record.md`
Browser smoke evidence: `docs/phase-7a-browser-smoke-results.json`
Final commit: reported in the READY_FOR_CHECK payload after final push
Push: `origin/main`, reported after final push
GitHub Pages workflow: checked after final push

## Summary

Phase 8 extended the playable HTML RPG/button loop by adding deterministic session preview evidence, data-driven encounter/stage identity, clearer longer-run HUD context, and one conservative combat cadence tune. The first `3x3` board now reads as an early state in a longer run rather than the practical end: representative previews reach enemy 3 and enemy 4 while preserving the Phase 6/7/7A combat, combo, hazard, VFX, host/debug, and mobile-layout constraints.

No Unity/WebView/native/3D work, roguelite meta-progression, shops, maps, inventories, currencies, loadouts, new hazard categories, new dependencies, framework rewrite, CDN resource, PWA/service worker, or broad visual redesign was added.

## Baseline

- First `3x3` board before Phase 8 tuning: Level 6.
- First enemy / first upgrade before Phase 8 tuning: Level 18 for representative `phase8-baseline-*` seeds, Level 19 at slower `1100ms` cadence.
- Enemy scaling before tuning: E1 `500 HP / 18 ATK`, E2 `620 HP / 24 ATK`, E3 `740 HP / 30 ATK`, E4 `860 HP / 36 ATK`.
- Hazard baseline: enemy 1 and first upgrade are hazard-free; moving buttons begin at Level 19 / enemy 2; interference begins at Level 24 / enemy 2.
- Phase 7A VFX/layout baseline remained PASS for desktop `1280x720`, mobile `390x844`, and short-mobile `360x740`, including button-origin tracer delta `0,0`.

## Implemented Changes

- Added pure deterministic session preview tooling in `src/core/session-preview.js` and exposed it through the debug API.
- Added data-driven encounter identity in `src/config/encounters.js`.
- Extended enemy/combat/session preview facts with `stageLabel`, `tierLabel`, `avatarGlyph`, `sequenceLabel`, and `identityKey`.
- Rendered compact stage identity in the enemy status and compact run-depth/tier text such as `E03 INTERFERENCE` in the bottom command HUD.
- Tuned `BASE_BATTLE_CONFIG.enemyHpPerIndex` from `120` to `80`, preserving enemy 1 while smoothing later enemy cadence.
- Extended validation/smoke coverage for deterministic session previews, JSON-safe host/debug facts, later-stage encounter labels, and command run-depth layout.

## Progression And Content Evidence

Representative tuned preview evidence:

| Case | Result |
| --- | --- |
| 42-level `phase8-validate` | E1 defeated L18, E2 defeated L39, final E3 `CIPHER WARDEN` at `576/660 HP` |
| 72-level `phase8-validate` | E1 defeated L18, E2 defeated L39, E3 defeated L62, final E4 `NULL WARDEN` at `454/740 HP` |
| 42-level `phase8-slower` at `1100ms` | E1 defeated L18, E2 defeated L39, final E3 `CIPHER WARDEN` at `576/660 HP` |

Encounter identity now communicates the arc:

- E1: `REACTOR WARDEN`, `S01 CORE LOCK`, `ONBOARDING`
- E2: `SIGNAL WARDEN`, `S02 DRIFT ARRAY`, `MOVEMENT`
- E3: `CIPHER WARDEN`, `S03 NOISE GATE`, `INTERFERENCE`
- E4+: `NULL WARDEN`, deep-loop stage labels

Browser smoke records `CIPHER WARDEN // S03 NOISE GATE` and `E03 INTERFERENCE` fitting in desktop, mobile, and short-mobile viewports.

## Balance Evidence

Only one gameplay number changed in Phase 8:

- `enemyHpPerIndex`: `120 -> 80`

Before/after cadence:

| Preview | Before | After |
| --- | --- | --- |
| 42-level `phase8-validate` | E1 L18, E2 L41 | E1 L18, E2 L39 |
| 72-level `phase8-validate` | E1 L18, E2 L41, E3 L67 | E1 L18, E2 L39, E3 L62 |
| 42-level slower cadence | E1 L18, E2 L41 | E1 L18, E2 L39 |

No upgrade, combo, timer, board-size, rule-tier, player HP, enemy attack, hazard unlock, hazard intensity, or Phase 1 difficulty-band tuning was applied. Upgrade strategy previews showed differentiated choices, so no upgrade/combo retune was justified.

## VFX, Hazard, And Layout Preservation

- Phase 7A retro-futurist terminal VFX language is preserved.
- Safe press and combo tracers still originate from the pressed button and travel toward the enemy.
- Player HUD remains in the bottom command/control area.
- Enemy identity and HP remain enemy-only.
- First enemy and first upgrade remain hazard-free.
- Moving-button and interference schedules remain unchanged and covered by browser smoke.
- `docs/phase-7a-browser-smoke-results.json` records desktop, mobile, and short-mobile PASS evidence after the Phase 8 UI label additions.

## Host Bridge And Debug API

- `previewSessionProgression(...)` is deterministic and JSON-safe.
- Host/debug payload coverage remains JSON-safe for session summaries and host event payloads.
- Host event types still include `enemy_damaged`, `enemy_defeated`, `enemy_spawned`, `player_damaged`, `upgrade_selected`, and `upgrades_offered`.
- No UI/VFX-only high-frequency event stream was added.

## Architecture Self-Check

- Configuration owns tuning and content data: `src/config/battle.js` and `src/config/encounters.js`.
- Core owns decisions and derived facts: `src/core/session-preview.js`, `src/core/enemy.js`, `src/core/combat.js`, and `src/core/debug.js`.
- UI renders facts only in `src/ui/render.js`.
- Smoke/validation scripts guard the new invariants instead of moving gameplay formulas into presentation code.
- No non-scope system, dependency, external runtime resource, or framework migration was introduced.

## Validation

- `node --check` on changed JS/MJS files: PASS
- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `cmd /c npm.cmd run smoke:hazards`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only
- Representative deterministic session previews for early, mid, later, and hazard-active seeds: PASS
- Browser smoke for desktop `1280x720`, mobile `390x844`, and short-mobile `360x740`: PASS

## Pending Real-Device And Human Evidence

- iOS Safari real-device touch/audio/vibration review remains pending.
- Android Chrome real-device touch/layout/vibration review remains pending.
- Human playtest remains pending for longer-run pacing, upgrade choice feel, moving-button fairness, interference readability, and whether `3x3` now feels like the run has begun.

## Non-Scope Preserved

- No Unity, WebView SDK, native bridge, custom URL scheme, C# bridge, or engine build pipeline.
- No real 3D, WebGL, Three.js, camera, or spatial world.
- No roguelite meta-progression, persistent builds, shops, maps, currencies, inventories, loadouts, relics, or unlock trees.
- No new hazard category.
- No new dependency, framework rewrite, CDN/runtime external resource, PWA/service worker, or broad visual redesign.
- No rule semantics rewrite or UI-owned gameplay formulas.

## READY_FOR_CHECK Payload

- final head commit: reported after final push
- push: `origin/main`, reported after final push
- final report path: `docs/phase-8-final-report.md`
- phase record path: `docs/phase-8-playtest-calibration-content-record.md`
- browser smoke evidence: `docs/phase-7a-browser-smoke-results.json`
- validation command results: full matrix above
- pending evidence: real iOS/Android device checks and human playtest only
- non-scope confirmation: preserved
