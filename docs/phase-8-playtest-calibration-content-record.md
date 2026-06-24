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

- round commit: `138d670`
- push: `origin/main` PASS

Next round goal:

- Add a pure deterministic session/progression preview path that summarizes multi-enemy progression, upgrades, hazard exposure, failure/victory reason, and pressure for representative seeds.

## Round 2 - Deterministic Session Preview Tooling

Round goal:

- Add a pure debug/session preview path for representative seeds.
- Summarize levels reached, enemies defeated, upgrades offered/selected, hazard exposure, result reason, and approximate pressure.
- Add validation for determinism and JSON-safe output.

Changes:

- Added `src/core/session-preview.js`.
- Exposed `previewSessionProgression(...)` from `src/core/debug.js` and the browser debug API.
- Extended `scripts/validate-structure.mjs` so the new core file is included in architecture boundary scans.
- Added structure validation that direct preview calls and Debug API preview calls are deterministic, JSON-safe, and cover `3x3`, upgrade cadence, and active interference evidence.

Representative session preview command:

```powershell
cmd /c node -e "import('./src/core/debug.js').then(m=>{ /* summarize previewSessionProgression cases */ })"
```

Representative preview evidence after adding the tool, before gameplay tuning:

| Case | Seed | Cadence | Levels cleared | Enemies defeated | Defeat levels | First upgrade | Hazard exposure | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| early-mid | `phase8-validate` | 850ms | 42 | 2 | E1 L18, E2 L41 | L18 | moving L19, interference L24, 19 active-hazard rounds | `max_levels_reached` |
| longer | `phase8-validate` | 850ms | 72 | 3 | E1 L18, E2 L41, E3 L67 | L18 | moving L19, interference L24, 49 active-hazard rounds | `max_levels_reached` |
| alt-a | `phase8-alt-a` | 850ms | 42 | 2 | E1 L18, E2 L41 | L18 | moving L19, interference L24, 19 active-hazard rounds | `max_levels_reached` |
| slower | `phase8-slower` | 1100ms | 42 | 2 | E1 L18, E2 L41 | L18 | moving L19, interference L24, 19 active-hazard rounds | `max_levels_reached` |

Selected upgrade evidence:

- `phase8-validate`, 42 levels: L18 `SLOW CLOCK`, L41 `CHAIN AMP`.
- `phase8-alt-a`, 42 levels: L18 `SLOW CLOCK`, L41 `HOTTER STRIKE`.
- `phase8-slower`, 42 levels: L18 `SLOW CLOCK`, L41 `HOTTER STRIKE`.

Pressure evidence:

- `phase8-validate`, 42 levels: max pressure score `27`, average `22`, high/critical rounds `0`.
- `phase8-validate`, 72 levels: max pressure score `27`, average `24`, high/critical rounds `0`.
- `phase8-slower`, 42 levels: max pressure score `42`, average `29`, high/critical rounds `0`.

Round 2 diagnosis:

- The current run is objectively longer than the first `3x3`; Level 6 is the first `3x3`, and a 42-level preview reaches enemy 3.
- The pacing gap is not raw length. Enemy 2 takes from Level 19 to Level 41 to defeat in representative previews, which can make the middle of the run feel flat or under-signposted.
- Pressure remains low under the current preview model, even when hazards are active. That supports tuning around session structure, enemy cadence, and content motivation before adding more hazards.
- The result reason is currently a preview limit, not an in-game victory milestone. A later round should decide whether to add a conservative run milestone or improve recap/progression messaging without claiming a new real ending prematurely.

Debug self-check:

- Smallest fixture for longer-session evidence is now `previewSessionProgression({ seed, maxLevels, maxEnemies })`.
- Failures can be localized to config/core session preview, combat/upgrades/hazards, or Debug API exposure because UI/host do not own the simulation.
- The new preview covers success progression, upgrade pending cadence, active hazards, combo-safe ideal cadence, timeout result shape, and JSON-safe output. Wrong-press survivability remains covered by existing `previewCombatBalance(...)`.
- No gameplay tuning was made in Round 2.

Architecture self-check:

- New session preview logic lives in `src/core/session-preview.js`.
- `src/ui/render.js`, host adapters, and app orchestration did not gain gameplay formulas.
- Debug API exposes facts only and does not own UI decisions.
- Validation now guards the new pure module and JSON-safe deterministic output.
- No non-scope systems were added.

Validation:

- `node --check src\core\session-preview.js`: PASS
- `node --check src\core\debug.js`: PASS
- `node --check scripts\validate-structure.mjs`: PASS
- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `cmd /c npm.cmd run smoke:hazards`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit/push:

- round commit: `401d588`
- push: `origin/main` PASS

Next round goal:

- Use the new session preview evidence to add data-driven progression/content structure so the long middle game reads as an intentional arc, not only numeric `REACTOR WARDEN N` repetition.

## Round 3 - Progression And Encounter Identity Structure

Round goal:

- Add lightweight, data-driven encounter/stage identity so the long middle game reads as a progression arc.
- Preserve gameplay formulas and use the new session preview as evidence.
- Avoid broad visual redesign.

Changes:

- Added `src/config/encounters.js` with data-driven encounter identity facts:
  - enemy 1: `REACTOR WARDEN`, `S01 CORE LOCK`, `ONBOARDING`
  - enemy 2: `SIGNAL WARDEN`, `S02 DRIFT ARRAY`, `MOVEMENT`
  - enemy 3: `CIPHER WARDEN`, `S03 NOISE GATE`, `INTERFERENCE`
  - enemy 4+: `NULL WARDEN` / deep-loop stage labels
- Extended `src/core/enemy.js` and `src/core/combat.js` so enemy/combat summaries carry `stageLabel`, `tierLabel`, `avatarGlyph`, `sequenceLabel`, and `identityKey`.
- Kept stable enemy IDs such as `reactor-warden-1` for compatibility.
- Updated `src/ui/render.js` to render the existing enemy label with compact stage facts only.
- Extended `src/core/session-preview.js` so defeated enemy evidence includes stage/tier labels.
- Extended `scripts/validate-structure.mjs` to cover the new config module, JSON-safe identity facts, and stage labels in enemy/combat/session preview summaries.
- Extended `scripts/smoke-hazards-browser.mjs` to verify a later-stage `CIPHER WARDEN // S03 NOISE GATE` label fits desktop, mobile, and short-mobile combat status geometry.

Progression/content evidence:

```json
{
  "defeated": [
    { "enemyIndex": 1, "enemyName": "REACTOR WARDEN", "stageLabel": "S01 CORE LOCK", "tierLabel": "ONBOARDING", "defeatedAtLevel": 18 },
    { "enemyIndex": 2, "enemyName": "SIGNAL WARDEN", "stageLabel": "S02 DRIFT ARRAY", "tierLabel": "MOVEMENT", "defeatedAtLevel": 41 }
  ],
  "final": { "enemyName": "CIPHER WARDEN", "stage": "S03 NOISE GATE", "tier": "INTERFERENCE", "hp": 714 }
}
```

Browser layout evidence:

- `docs/phase-7a-browser-smoke-results.json` now records `encounterLabel.text = "CIPHER WARDEN // S03 NOISE GATE: 714/740"` in desktop `1280x720`, mobile `390x844`, and short-mobile `360x740`.
- The smoke verifies the label remains inside `#combat-status` and inside the viewport in all three viewports.

Round 3 diagnosis:

- The new structure improves progression readability without changing board rules, damage, HP, combo, upgrade values, or hazard schedules.
- The preview still shows enemy 2 lasting from Level 19 to Level 41, so the next round should tune combat/difficulty cadence from evidence rather than assuming content labels are enough.

Debug self-check:

- Smallest fixture: `previewSessionProgression({ seed: 'phase8-validate', maxLevels: 42, maxEnemies: 4 })`.
- The change localizes to config/core facts plus UI rendering of already-computed facts.
- Host/debug payloads remain JSON-safe because combat facts are plain cloned objects.
- No balance changes were made in Round 3.

Architecture self-check:

- Encounter identity data lives in `src/config/encounters.js`.
- Core enemy/combat/session preview modules own derived enemy facts.
- UI renders `stageLabel` and `tierLabel` but does not decide stage progression or combat formulas.
- Host Bridge semantics remain compatible; IDs and event shapes are not replaced.
- No non-scope systems were added.

Validation:

- `node --check src\config\encounters.js`: PASS
- `node --check src\core\enemy.js`: PASS
- `node --check src\core\combat.js`: PASS
- `node --check src\core\session-preview.js`: PASS
- `node --check src\ui\render.js`: PASS
- `node --check scripts\smoke-hazards-browser.mjs`: PASS
- `node --check scripts\validate-structure.mjs`: PASS
- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `cmd /c npm.cmd run smoke:hazards`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches after rerun; first parallel attempt raced with `dist` rebuild and produced missing-path errors only
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit/push:

- round commit: `1341ab2`
- push: `origin/main` PASS

Next round goal:

- Tune existing combat/difficulty cadence with before/after session preview evidence, focusing on enemy 2/3 pacing and keeping first `3x3`, first upgrade, and hazard onboarding readable.

## Round 4 - Difficulty And Combat Cadence Tuning

Round goal:

- Tune existing combat cadence with before/after evidence.
- Keep first enemy pacing, first upgrade timing, combo semantics, hazard unlocks, and Phase 1 board/rule bands intact.

Change:

- Tuned `BASE_BATTLE_CONFIG.enemyHpPerIndex` from `120` to `80`.
- This keeps enemy 1 at `500 HP`, but changes later max HP:
  - enemy 2: `620 -> 580`
  - enemy 3: `740 -> 660`
  - enemy 4: `860 -> 740`

Before evidence from Round 2/3:

| Case | Before defeated enemies |
| --- | --- |
| 42-level `phase8-validate` | E1 L18, E2 L41 |
| 72-level `phase8-validate` | E1 L18, E2 L41, E3 L67 |
| 42-level `phase8-slower` at 1100ms | E1 L18, E2 L41 |

After evidence:

| Case | After defeated enemies | First upgrade | Final preview state |
| --- | --- | --- | --- |
| 42-level `phase8-validate` | E1 L18, E2 L39 | L18 | E3 `CIPHER WARDEN`, 576/660 HP |
| 72-level `phase8-validate` | E1 L18, E2 L39, E3 L62 | L18 | E4 `NULL WARDEN`, 454/740 HP |
| 42-level `phase8-slower` at 1100ms | E1 L18, E2 L39 | L18 | E3 `CIPHER WARDEN`, 576/660 HP |

Tuning decision:

- Kept the change because it shortens the flat middle without moving first enemy defeat or first upgrade timing.
- Did not change player HP, enemy attack, base attack, combo window, combo reward, upgrade values, difficulty bands, rule tiers, timers, or hazard timings in this round.
- Pressure scores remain low/medium in previews, so later tuning should focus on upgrade/combo cadence or hazard readability only if evidence supports it.

Debug self-check:

- Smallest fixture: `previewSessionProgression(...)` with 42-level and 72-level representative seeds.
- Failure localization is config/core combat scaling only.
- Wrong-press survivability should remain unchanged because enemy attack scaling was not changed.
- No UI/VFX/hazard semantics changed.

Architecture self-check:

- Tuning stayed in `src/config/battle.js`.
- Core combat/enemy/session preview consumed config facts.
- UI and host code did not receive formulas.
- No non-scope systems were added.

Validation:

- `node --check src\config\battle.js`: PASS
- `node --check scripts\validate-structure.mjs`: PASS
- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `cmd /c npm.cmd run smoke:hazards`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit/push:

- round commit: `eb99105`
- push: `origin/main` PASS

Next round goal:

- Review upgrade and combo cadence with the tuned session previews. Tune only if evidence shows choices are too weak, too obvious, or too late.

## Round 5 - Upgrade And Combo Cadence Review

Round goal:

- Review upgrade and combo cadence after Round 4 enemy HP tuning.
- Tune existing upgrade/combo values only if evidence shows choices are weak, too obvious, or too late.

Evidence command:

```powershell
cmd /c node -e "import('./src/core/debug.js').then(m=>{ /* compare previewSessionProgression upgradeStrategy values */ })"
```

Strategy comparison at `seed=phase8-validate`, `maxLevels=60`:

| Strategy | Defeated enemies | Selected upgrades | Final state |
| --- | --- | --- | --- |
| `balanced` | E1 L18, E2 L39 | L18 `SLOW CLOCK`, L39 `SLOW CLOCK` | E3 at 54/660 HP |
| `first` | E1 L18, E2 L39, E3 L60 | L18 `WIDER CHAIN`, L39 `HOTTER STRIKE`, L60 `ARMOR PATCH` | E4 spawned |
| `damage` | E1 L18, E2 L39, E3 L60 | L18 `WIDER CHAIN`, L39 `HOTTER STRIKE`, L60 `CHAIN AMP` | E4 spawned |
| `survival` | E1 L18, E2 L39, E3 L60 | L18 `ARMOR PATCH`, L39 `HOTTER STRIKE`, L60 `ARMOR PATCH` | E4 spawned |

Decision:

- No upgrade/combo tuning applied in Round 5.
- Evidence shows upgrade choices are meaningfully differentiated:
  - damage/first/survival paths reach E4 by Level 60,
  - conservative `SLOW CLOCK` paths trade damage cadence for survivability/time comfort,
  - first upgrade still arrives at Level 18 after enough `3x3` runway.
- Combo semantics remain unchanged: first chained safe press can show chain readiness, visible `COMBO x2` begins on the second chained safe press, and capped combo behavior remains guarded by validation.

Debug self-check:

- Smallest fixture: `previewSessionProgression({ seed: 'phase8-validate', maxLevels: 60, upgradeStrategy })`.
- Existing `previewCombatBalance(...)` still guards combo boundary at `2400ms`/`2500ms`.
- No code changed in this round; docs record the no-tune decision.

Architecture self-check:

- No formula ownership moved.
- No UI/host/gameplay changes were made.
- No non-scope systems were added.

Validation:

- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `cmd /c npm.cmd run smoke:hazards`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit/push:

- round commit: `fdce297`
- push: `origin/main` PASS

Next round goal:

- Review hazard schedule readability with tuned progression and existing browser smoke. Tune only if evidence supports changing timing/intensity.

## Round 6 - Hazard Schedule Readability Review

Round goal:

- Review existing moving-button/interference timing after Round 4 enemy cadence tuning.
- Tune hazard timing/intensity only if deterministic/browser evidence supports it.

Hazard preview evidence:

| Level | Enemy | Unlocked | Hazard types | Active types | Reason |
| --- | --- | --- | --- | --- | --- |
| 18 | E1 | no | none | none | `onboarding_safe` |
| 19 | E2 | yes | moving | moving | `scheduled` |
| 22 | E2 | yes | moving | moving | `scheduled` |
| 24 | E2 | yes | moving + interference | moving + interference | `scheduled` |
| 39 | E2 | yes | moving + interference | moving + interference | `scheduled` |
| 40 | E3 | yes | moving + interference | moving + interference | `scheduled` |
| 42 | E3 | yes | moving + interference | moving + interference | `scheduled` |

Browser evidence:

- `cmd /c npm.cmd run smoke:hazards`: PASS.
- Phase 7A smoke continues to cover desktop, mobile, short-mobile, active moving-button, active interference, VFX marker, button-origin tracer, and later-stage encounter label geometry.

Decision:

- No hazard tuning applied in Round 6.
- The first enemy and first upgrade remain hazard-free.
- Movement begins at the second enemy's opening level after the first upgrade.
- Interference remains delayed until Level 24, after several movement-only rounds.
- Tuned enemy HP still leaves enough E2 runway for movement-only exposure before interference.

Debug self-check:

- Smallest fixture: `previewHazardSchedule({ levels: [18, 19, 22, 24, 39, 40, 42] })`.
- Browser fixture: `npm run smoke:hazards`.
- No hazard failure was observed; no timing/intensity change is justified.

Architecture self-check:

- No code changed in this round.
- Hazard config/core remains the source of truth.
- UI/browser smoke renders hazard facts only.
- No non-scope systems were added.

Validation:

- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `cmd /c npm.cmd run smoke:hazards`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit/push:

- round commit: `3129070`
- push: `origin/main` PASS

Next round goal:

- Review UI/progression feedback for longer sessions and decide whether a compact run-progress summary is needed before final reporting.

## Round 7 - UI Progression Feedback For Longer Sessions

Round goal:

- Add compact progression feedback for longer sessions if needed.
- Preserve bottom player HUD, enemy-only identity, mobile layout, and Phase 7A VFX/hazard presentation.

Change:

- Updated `src/ui/render.js` so `#command-level-tag` renders compact encounter depth/tier facts such as `E03 INTERFERENCE`.
- The tag uses core combat facts (`sequenceLabel`, `tierLabel`, and `enemyIndex` fallback) and does not own progression or gameplay formulas.
- Extended `scripts/smoke-hazards-browser.mjs` to verify the command run-depth tag text and geometry in desktop, mobile, and short-mobile viewports.
- Extended `scripts/validate-structure.mjs` with `command-level-tag` / `commandLevelTag` guards.

Browser evidence:

- `docs/phase-7a-browser-smoke-results.json` records `commandTagText = "E03 INTERFERENCE"` in desktop `1280x720`, mobile `390x844`, and short-mobile `360x740`.
- The smoke verifies the tag fits inside the command panel and viewport.

Debug note:

- The first browser smoke attempt in this round caught a fallback bug where a synthetic combat fact lacked `sequenceLabel`, causing the UI to render `E01 INTERFERENCE`.
- Fixed by deriving a display fallback from `combat.enemyIndex`; rerun smoke passed.

Debug self-check:

- Smallest browser fixture: `npm run smoke:hazards`.
- UI renders existing core facts only.
- No combat, combo, upgrade, hazard, or difficulty values changed in Round 7.

Architecture self-check:

- Progression facts remain in config/core.
- UI renders compact labels and geometry only.
- Host/debug JSON facts are unchanged except for already-added combat identity fields.
- No non-scope systems were added.

Validation:

- `node --check src\ui\render.js`: PASS
- `node --check scripts\smoke-hazards-browser.mjs`: PASS
- `node --check scripts\validate-structure.mjs`: PASS
- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `cmd /c npm.cmd run smoke:hazards`: PASS after fallback fix
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit/push:

- round commit: `b607a29`
- push: `origin/main` PASS

Next round goal:

- Run final browser/host/debug coverage review and fill any remaining validation/report gaps before final reporting.

## Round 8 - Browser, Host, And Debug Coverage Review

Round goal:

- Confirm longer progression, upgrade cadence, active hazards, VFX/mobile layout, and host/debug JSON-safety are covered before final reporting.
- Add only small coverage fixes if gaps are found.

Coverage command:

```powershell
cmd /c node -e "import('./src/core/debug.js').then(async m=>{ /* previewSessionProgression + previewHostEventPayloads JSON safety */ })"
```

Coverage evidence:

```json
{
  "sessionJsonSafe": true,
  "hostJsonSafe": true,
  "summary": {
    "levels": 72,
    "enemies": 3,
    "first3x3": 6,
    "firstUpgrade": 18,
    "hazard": {
      "firstMovingLevel": 19,
      "firstInterferenceLevel": 24,
      "roundsWithMoving": 54,
      "roundsWithInterference": 49,
      "roundsWithActiveHazards": 49
    }
  },
  "hostEventTypes": [
    "enemy_damaged",
    "enemy_defeated",
    "enemy_spawned",
    "player_damaged",
    "upgrade_selected",
    "upgrades_offered"
  ]
}
```

Coverage review:

- Longer progression: guarded by `previewSessionProgression(...)` and structure validation.
- Upgrade cadence: documented in Rounds 2, 4, and 5.
- Active hazards: covered by `previewHazardSchedule(...)`, structure validation, and `npm run smoke:hazards`.
- VFX markers and button-origin tracers: covered by `npm run smoke:hazards`.
- Desktop/mobile/short-mobile layout: covered by `npm run smoke:hazards`.
- Later-stage encounter label and command run-depth tag: covered by `npm run smoke:hazards`.
- Host/debug JSON-safety: covered by `previewHostEventPayloads()`, `previewSessionProgression(...)`, and structure validation.

Decision:

- No additional code change in Round 8. Existing validation covers the Phase 8 PASS criteria added so far.

Debug self-check:

- Smallest fixtures are available for session progression, combat balance, hazard schedule, host payloads, and browser layout/VFX.
- No validation gap was found that required another tool or dependency.

Architecture self-check:

- No new code in this round.
- Validation stays zero-dependency.
- No non-scope systems were added.

Validation:

- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `cmd /c npm.cmd run smoke:hazards`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit/push:

- pending.

Next round goal:

- Use remaining buffer for final evidence pass and documentation updates, then prepare the final report.
