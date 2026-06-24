# Phase 8 Playtest Calibration And Content Expansion Record

Status: in progress
Guide: `docs/phase-8-playtest-calibration-content-goal-guide.md`
Planner thread: `019eefc3-8126-7271-b4b4-7dd9742c8545`
Executor thread: `019ef06d-eb89-75c2-beb2-c695f9bcbedd`
Workspace: `D:\WebProjects\ThatButton`

## Phase 8 Scope Lock

Phase 8 extends and calibrates the existing HTML RPG/button loop from evidence. It does not add Unity, WebView, native bridge work, real 3D, WebGL, new hazard categories, roguelite meta-progression, shops, maps, inventories, currencies, loadouts, new dependencies, framework rewrites, CDN resources, PWA/service worker work, or broad visual redesign.

Preserve:

- Phase 7A retro-futurist terminal VFX language
- bottom command/control player HUD
- button-to-enemy tracer origin from the pressed button
- Host Bridge JSON-safe snapshots and events
- first enemy / first upgrade hazard-free onboarding
- normal static browser and GitHub Pages delivery

## Required Reading Notes

- `TODO.md` lists Phase 8 as the current recommendation after Phase 7A acceptance.
- `docs/phase-7a-final-report.md` reports PASS browser smoke for desktop `1280x720`, mobile `390x844`, and short-mobile `360x740`, with combat VFX above active board interference and first tracer origin delta `0,0`.
- `docs/phase-7a-hazard-feel-mobile-validation-record.md` records no Phase 7A hazard tuning because evidence supported the existing values.
- `docs/phase-6a-final-report.md` records first-enemy tuning from `540 HP` to `500 HP`, moving first upgrade timing from Level 20 to Level 18/19 in fixed-seed previews.
- `docs/phase-7-final-report.md` records moving-button unlock at Level 19 / enemy 2 and interference unlock at Level 24 / enemy 2.
- Current source inspection confirms config owns difficulty, battle, upgrades, and hazards; core owns combat/session facts; UI renders facts and VFX only.

## Round 1 - Baseline And Record

Round goal:

- Create this Phase 8 record before gameplay tuning.
- Capture the current deterministic baseline using existing debug helpers.
- Identify where the current loop feels short, spiky, or under-explained.

Baseline command:

```powershell
cmd /c node -e "import('./src/core/debug.js').then(m=>{ /* summarized previewCombatBalance, previewHazardSchedule, previewSeededLevel, previewEnemyScaling */ })"
```

Baseline observations before Phase 8 gameplay changes:

| Area | Current evidence |
| --- | --- |
| First 3x3 board | Level 6, `baseline`, `3x3`, 9 buttons, 1-2 fatal targets. |
| First enemy / first upgrade | Seeds `phase8-baseline-a/b/c` defeat enemy 1 at Level 18 with 109/110/114 safe presses; slower `1100ms` cadence defeats at Level 19. |
| Existing post-3x3 runway | Level 6 through Level 18 already happens before the first upgrade, so `3x3` starts early, but the game has little explicit stage identity beyond `REACTOR WARDEN N`. |
| Enemy scaling | Enemy 1 `500 HP / 18 ATK`; enemy 2 `620 HP / 24 ATK`; enemy 3 `740 HP / 30 ATK`; enemy 4 `860 HP / 36 ATK`. |
| Wrong-press survivability | Enemy 1 allows 5 survived wrong presses, enemy 2 allows 4, enemy 3 allows 3 before lethal pressure. |
| Combo boundary | `2400ms` second press keeps `COMBO x2`; `2500ms` expires and restarts as `CHAIN READY`. |
| Upgrade cadence | First upgrade offer appears after enemy 1 defeat at Level 18/19. Existing choices are deterministic three-card offers. |
| Hazard unlock | Level 1/6/16/18 enemy 1 are hazard-free. Level 19 enemy 2 can expose moving buttons; Level 24 enemy 2 can expose moving + interference. |
| VFX/layout health | Phase 7A browser smoke PASS for desktop/mobile/short-mobile; tracer origin delta `0,0`; combat VFX z-index `80`; interference opacity `0.141` under `0.160` cap. |

Current sample level pressure:

| Level | Band | Grid | Fatal count | Rule tier | Time limit | Reward |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | training | 2x2 | 1 | singleVisual | 18000ms | 2200ms |
| 3 | orientation | 2x3 | 1 | singleVisual | 17000ms | 1800ms |
| 6 | baseline | 3x3 | 2 | singleVisual | 15500ms | 1300ms |
| 16 | extended | 3x3 | 4 | not | 12000ms | 700ms |
| 18 | extended | 3x3 | 3 | not | 11500ms | 700ms |
| 19 | extended | 3x3 | 4 | orMixed | 11250ms | 700ms |
| 22 | extended | 3x3 | 3 | not | 10500ms | 700ms |
| 24 | extended | 3x3 | 4 | orColor | 10000ms | 700ms |
| 28 | extended | 3x3 | 2 | orColor | 9500ms | 700ms |

Baseline diagnosis:

- The first 3x3 board is not literally the end; it begins at Level 6 and the first enemy falls at Level 18/19.
- The experience can still read as short because the first visible long-term milestone is just `REACTOR WARDEN`, followed by numeric suffixes. There is no data-driven stage/encounter identity that tells the player the run has opened up.
- Current automated evidence only previews first-enemy balance and point hazard schedules. It does not yet summarize multi-enemy sessions, upgrade selections across a run, later failure points, or a representative longer arc.
- Existing difficulty pressure reaches the `extended` band by Level 16 and stays there indefinitely with shrinking time until the `9500ms` floor. Any tuning should be based on new multi-enemy session preview evidence, not a guess.

Debug self-check:

- Smallest current fixtures: `previewCombatBalance(...)` for first enemy and wrong-press/combo boundaries; `previewHazardSchedule(...)` for Level 19/24 hazards; `previewSeededLevel(...)` for level pressure.
- Current evidence localizes the main gap to debug/session preview and content/progression communication rather than UI/VFX or hazard geometry.
- Success, wrong press, combo expiry, upgrade pending, first enemy defeat, hazards, and mobile layout are covered by existing validation/smoke; full longer-session preview is pending Round 2.
- No balance changes were made in Round 1, so no before/after tuning evidence is required yet.

Architecture self-check:

- No source code changed in Round 1.
- No gameplay decisions moved into UI, host adapters, or app orchestration.
- No non-scope systems were added.
- The next implementation should keep session preview logic in `src/core`/debug exports and keep UI/Host as render/transport layers.

Validation:

- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `cmd /c npm.cmd run smoke:hazards`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- `git diff --check`: PASS

Commit/push:

- pending.

Next round goal:

- Add a pure deterministic session/progression preview path that summarizes multi-enemy progression, upgrades, hazard exposure, failure/victory reason, and pressure for representative seeds.
