# Phase 7 Advanced Hazards And Spatial Interaction Record

Phase: Phase 7 - Advanced Hazards And Spatial Interaction  
Guide: `docs/phase-7-advanced-hazards-spatial-interaction-goal-guide.md`  
Baseline head: `c62043cf9f34335e858182c46d9c54b0c97ebcaf`  
Executor thread: `019ef06d-eb89-75c2-beb2-c695f9bcbedd`  
Planner thread: `019eefc3-8126-7271-b4b4-7dd9742c8545`

## Scope Lock

- Add an HTML-first Hazard Director V1 for deterministic movement, temporary CRT interference, and 2D spatial grouping facts.
- Preserve the base puzzle/combat loop: read rule, avoid forbidden buttons, press safe buttons, build combo, damage enemy, survive mistakes, choose one upgrade, continue.
- Keep first enemy and first upgrade cadence readable. Hazards should not appear before the first learnable RPG loop has had room to land.
- Keep hazard schedules and tuning in config/core modules.
- Keep UI as a renderer of hazard facts, transforms, classes, and overlays only.
- Keep host bridge payloads JSON-safe and plugin-neutral.
- Preserve Phase 6A combat feel: bottom player HUD, button-to-enemy tracers, combo/wrong-press feedback, upgrade overlay, and static GitHub Pages delivery.
- Do not add Unity/WebView/native integration, real 3D rendering, roguelite meta-progression, new dependencies, framework migration, CDN resources, or Phase 1 difficulty retuning.

## Round 1 Baseline

Current Phase 6A facts:

- First enemy HP tuning is `500 HP / 18 ATK`.
- Fixed-seed fast-cadence first upgrade appears at Level 18.
- Slower `1100ms` cadence first upgrade appears at Level 19.
- Wrong-press survivability remains enemy 1/2/3 survived wrong presses: `5 / 4 / 3`.
- Combo window remains `2400ms`, with `2500ms` breaking the chain and restarting as `CHAIN READY`.
- Player HUD lives in the bottom `#command-panel` before `#btn-grid`, not in `#battle-stage`.
- Safe and combo tracers originate from the pressed button's current DOM rect when a source element is available.
- Upgrade overlay reaches `upgrade_pending` with exactly three deterministic choices at first enemy defeat.

Current architecture shape:

- `src/config/difficulty.js` owns Phase 1 bands and must not be retuned in Phase 7.
- `src/config/battle.js` owns combat tuning and should not be used to smuggle hazard pacing into combat formulas.
- `src/core/debug.js` already provides fixed-seed previews for levels, combat balance, combo windows, upgrade choices, and host event payloads.
- `src/app/create-app.js` owns orchestration and currently routes DOM and host `press(buttonId)` through one `pressButton(...)` path.
- `src/ui/render.js` owns DOM rendering, current button rect use, button-to-enemy tracers, player HUD, upgrade overlay, and visual feedback.
- `src/core/host-events.js` centralizes versioned JSON-safe payload builders.
- `scripts/validate-structure.mjs` already guards core purity, host JSON safety, Phase 6A combat feedback markers, bottom player HUD placement, and combat balance previews.

Host snapshot baseline:

- Existing snapshots expose `version`, `status`, `run`, `round`, `player`, `combat`, `combo`, `upgrades`, and recap facts.
- Existing host input methods include `start`, `reset`, `press(buttonId)`, `selectUpgrade(upgradeId)`, `getSnapshot()`, and `getDebugApi()`.
- Phase 7 hazard facts should be added as JSON-safe state/payload fields without removing existing fields.

## Hazard Unlock Assumptions

The first enemy should stay hazard-free.

Initial unlock assumptions:

| Exposure | Suggested threshold | Reason |
| --- | ---: | --- |
| Hazard-free onboarding | Levels 1-18, enemy 1 | Preserve Phase 6A first upgrade cadence and RPG reward introduction. |
| Movement telegraph only | Level 19 or enemy 2 start | Player has already defeated enemy 1 and seen upgrades. |
| Gentle moving-button active state | Level 20+ or enemy 2 | Movement becomes a separate difficulty axis after the first reward loop. |
| Temporary interference | Level 22+ or enemy 2 after motion exposure | Avoid stacking movement and signal noise immediately. |
| Combined movement plus interference | Later enemy 2 or enemy 3 | Use only after isolated hazards remain readable. |

Design stance:

- Hazard unlocks should depend on level/enemy facts, not on Phase 1 timer shortening.
- Hazards should remain disabled or inactive in early debug previews unless a preview explicitly asks for later levels.
- Movement and interference should have independent cooldowns, durations, intensity, and unlock thresholds.
- Hazards should never change forbidden-button semantics.

## Planned Module Map

- `src/config/hazards.js`
  - unlock thresholds
  - duration, cooldown, amplitude, speed, intensity
  - debug disabled defaults
  - hazard type ids
- `src/core/hazards.js`
  - deterministic schedule generation
  - disabled/inactive/telegraph/active/cooldown/expired state helpers
  - board zone/lane/sector facts
  - no DOM, browser globals, URL query, CSS classes, AudioContext, or app state
- `src/core/debug.js`
  - fixed-seed hazard previews that call `src/core/hazards.js`
  - hazard-free early-run preview
- `src/core/host-events.js`
  - JSON-safe hazard payload builders and optional event types if runtime events are added
- `src/app/create-app.js`
  - orchestration only: hold hazard state, tick pure helpers, pass facts to renderer, emit host events
- `src/ui/render.js`
  - apply hazard facts as transforms, attributes, overlays, and marker classes
  - measure browser geometry only for presentation and smoke evidence
- `scripts/validate-structure.mjs`
  - import hazard modules directly
  - enforce core purity
  - guard deterministic previews, early hazard-free path, geometry/style markers, host JSON safety, and shared input behavior

## Risk Points

- Moving buttons can break readability if the visual target and click target diverge. Phase 7 should move the actual `.game-btn` element so current rect, focus rect, and pointer target stay unified.
- Button motion can break Phase 6A attack/combo tracers if projectiles use stale positions. Current renderer reads `getBoundingClientRect()` at feedback time, so validation should prove moved-button projectiles still originate from the moved rect.
- Motion can cause overlap, board escape, or rule-text collision on mobile and short viewports. Desktop/mobile geometry smoke must measure this.
- Interference can fight rule readability, bottom player HUD readability, or combo/wrong-press particles. The overlay should be brief, low opacity, pointer-safe, and scoped away from rule text/player HUD when possible.
- Upgrade selection should pause, clear, or make hazards harmless so upgrade cards remain readable and selectable.
- Host snapshots/events should expose facts, not DOM rects, nodes, functions, timers, or CSS class decisions.

## Playtest Checklist

- iOS Safari real device: pending. Check touch target accuracy while buttons move, first-tap audio unlock, vibration behavior, rule text readability, and bottom HUD readability during interference.
- Android Chrome real device: pending. Check moving-button touch accuracy, layout fit, supported vibration behavior, and low-end animation smoothness.
- Human playtest: pending. Ask whether movement feels readable rather than unfair, whether interference is understandable, whether the first enemy stays learnable, and whether hazards make retry more interesting.

## Round 1 Debug Self-Check

- Baseline can be explained by fixed seeds, Phase 6A combat balance previews, and measured Phase 6A layout smokes.
- Failures localize to future hazard config/core, app orchestration, UI render, host payloads, or validation.
- First enemy and first upgrade path remain explicitly planned as hazard-free.
- Disabled, inactive, telegraph, active, cooldown, and expired hazard states are identified for Round 2.
- Real-device and human playtest evidence remains pending and is not claimed.

## Round 1 Architecture Self-Check

- No runtime code changed in Round 1.
- Planned ownership keeps hazard schedules and tuning in config/core.
- UI remains a fact renderer and should not decide hazard scheduling or forbidden-button semantics.
- Host remains JSON-safe and plugin-neutral.
- Unity/WebView/native, real 3D, roguelite meta, dependencies, CDN resources, framework work, and Phase 1 retuning remain out of scope.

## Round 1 Validation

- `npm run validate`: PASS
- `npm run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS, no matches
- `git diff --check`: PASS

Commit / push:

- initial round record commit: `101e98d`
- push: PASS to `origin/main`
- buffer round consumed: no

Next:

- Round 2: add hazard config/core model with deterministic disabled/inactive/active/expired helpers and fixed-seed previews.

## Round 2 Hazard Config/Core Model

Implemented:

- Added `src/config/hazards.js` for Phase 7 hazard type ids, phases, unlock thresholds, movement tuning, interference tuning, and debug/config disable switches.
- Added `src/core/hazards.js` for pure deterministic hazard state:
  - disabled state,
  - onboarding-safe inactive state,
  - telegraph state,
  - active state,
  - cooldown state,
  - expired state,
  - JSON-safe hazard summaries,
  - deterministic fixed-seed previews,
  - 2D board zone facts.
- Added `previewHazardSchedule(...)` to `src/core/debug.js`.
- Extended `scripts/validate-structure.mjs` so hazard config/core are part of module graph and core purity checks.
- Added validation fixtures for:
  - first enemy / Level 18 hazard-free onboarding,
  - Level 19 enemy 1 still hazard-free,
  - Level 19 enemy 2 moving-button telegraph/active/cooldown/expired states,
  - Level 22 enemy 2 interference active state,
  - deterministic preview repeatability,
  - disabled hazard state,
  - JSON-safe hazard summaries,
  - debug API hazard preview availability.

Key schedule assumptions now protected by validation:

- Movement unlocks at Level 19 and enemy 2.
- Interference unlocks at Level 22 and enemy 2.
- First enemy remains hazard-free even if it reaches Level 19 on a slower run.
- Movement targets are selected from provided button ids while avoiding the provided forbidden ids when safe candidates exist.

Debug self-check:

- This change is explained by fixed seed `phase7-validate`, sampled levels `[1, 8, 18, 19, 22]`, and sampled times `[0, 1300, 2000, 4700, 9100]`.
- Failures localize to `src/config/hazards.js`, `src/core/hazards.js`, debug preview wiring, or structure validation.
- First enemy and first upgrade path remain hazard-free by explicit preview and validation.
- Disabled, inactive, telegraph, active, cooldown, and expired states are covered.
- No UI geometry changed in this round.

Architecture self-check:

- Hazard schedules and tuning live in config/core.
- `src/core/hazards.js` does not access DOM, browser globals, URL query, CSS classes, AudioContext, or app state.
- UI and host code were not changed in this round.
- Hazard logic does not decide forbidden-button semantics; it consumes existing button/forbidden facts only for target selection.
- Unity/WebView/native, real 3D, roguelite meta, dependencies, CDN resources, framework work, and Phase 1 retuning remain out of scope.
- Validation now guards the new hazard purity and schedule invariants.

Round 2 validation:

- `node --check src\config\hazards.js`: PASS
- `node --check src\core\hazards.js`: PASS
- `node --check src\core\debug.js`: PASS
- `node --check scripts\validate-structure.mjs`: PASS
- `npm run validate`: PASS
- `npm run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS, no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit / push:

- implementation commit: `88ba825`
- push: PASS to `origin/main`
- buffer round consumed: no

Next:

- Round 3: wire hazard facts through app/debug/host snapshots without visible runtime hazards.

## Round 3 App/Debug/Host Fact Integration

Implemented:

- Added `hazards` to initial app state.
- Added `hazards` to round snapshots and host round payloads.
- Added `createHazardPayload(...)` to `src/core/host-events.js`.
- Added `hazards` to host snapshots.
- Added app orchestration helper `updateHazardState(...)`:
  - uses current level, enemy index, grid size, button ids, forbidden ids, and round elapsed time,
  - supports `?hazards=0`, `?hazards=false`, and `?hazards=off`,
  - disables hazards during upgrade selection.
- Updated `startRound(...)` and the game loop so hazard facts advance deterministically by round elapsed time.
- Extended validation so host snapshots carry hazard facts and the URL disable path works.

No visible hazard behavior was added in this round:

- Renderer does not consume hazard facts yet.
- Buttons do not move yet.
- Interference overlay is not rendered yet.
- No hazard host events were added yet.

Debug self-check:

- The change is explained by fixed-seed app smokes and host snapshot facts.
- Failures localize to app orchestration, round snapshot construction, host payload construction, or structure validation.
- First enemy / first upgrade path remains hazard-free in app snapshots because Round 2 validation still guards the core schedule.
- Disabled and inactive states are covered in app/host integration; active visual states remain future work.
- No UI geometry changed in this round.

Architecture self-check:

- Hazard scheduling still lives in config/core.
- App orchestration only passes current facts into pure hazard helpers.
- UI code was not changed and does not decide hazard scheduling.
- Host code transports cloned JSON-safe hazard facts only.
- Rule, fatal-button, combat, combo, and upgrade semantics were not duplicated.
- Unity/WebView/native, real 3D, roguelite meta, dependencies, CDN resources, framework work, and Phase 1 retuning remain out of scope.
- Validation now guards host snapshot hazard facts and the debug disable path.

Round 3 validation:

- `node --check src\app\create-app.js`: PASS
- `node --check src\core\app-state.js`: PASS
- `node --check src\core\level.js`: PASS
- `node --check src\core\host-events.js`: PASS
- `node --check src\host\app-host-api.js`: PASS
- `node --check scripts\validate-structure.mjs`: PASS
- `npm run validate`: PASS
- `npm run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS after rerun, no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit / push:

- commit: `3fbc28f` (`feat: expose phase 7 hazard facts`)
- push: PASS
- buffer round consumed: no

Next:

- Round 4: add UI hazard marker foundation without actual movement/interference behavior.

## Round 4 UI Hazard Marker Foundation

Implemented:

- Added a bottom command-panel hazard presentation foundation:
  - `hazard-status-text` for telegraph/active status,
  - `hazard-layer` for non-interactive marker overlays,
  - low-fi CRT marker styles using scanline/vector fragments.
- Added `renderer.updateHazardPresentation(...)`:
  - writes hazard phase/type/target-count facts into command-panel and grid data attributes,
  - renders active/telegraph button-target markers from current button `getBoundingClientRect()` values,
  - renders a board marker for board-target hazards,
  - clears markers when hazards are inactive, disabled, expired, or absent.
- Wired app orchestration so hazard presentation syncs on run reset, round start, upgrade pending, and each game-loop tick.
- Added validation markers for the new structure and renderer behavior.
- Added a fake-geometry renderer smoke that checks marker placement relative to the command panel for two button targets and one board target.

No actual hazard behavior was added in this round:

- Buttons do not move yet.
- Click targets are unchanged.
- Interference does not distort or cover the board yet.
- Hazard markers are pointer-events-free and only consume existing hazard facts.

Debug self-check:

- The UI change is explained by a fixed fake-geometry smoke and existing fixed-seed hazard facts.
- Failures localize to HTML marker structure, renderer presentation, app orchestration sync, or validation guards.
- First enemy / first upgrade path remains hazard-free because hazard facts still report `onboarding_safe` through existing app/host smokes.
- Disabled, inactive, active, and telegraph presentation paths are covered by structure markers and the fake-geometry smoke; cooldown/expired currently clear markers.
- UI geometry changed only by adding an absolute, non-interactive overlay inside the bottom command panel.

Architecture self-check:

- Hazard schedules and unlocks remain owned by config/core.
- UI only renders hazard facts and measures DOM geometry for presentation.
- App orchestration only synchronizes current hazard facts into the renderer.
- Host payload code was not changed in this round.
- Rule, fatal-button, combat, combo, upgrade, and difficulty semantics were not duplicated.
- Unity/WebView/native, real 3D, roguelite meta, dependencies, CDN resources, framework work, and Phase 1 retuning remain out of scope.
- Validation now guards the marker DOM placement and current-rect marker geometry.

Round 4 validation:

- `node --check src\ui\render.js`: PASS
- `node --check src\app\create-app.js`: PASS
- `node --check scripts\validate-structure.mjs`: PASS
- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS, no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit / push:

- commit: `aed0280` (`feat: add phase 7 hazard marker foundation`)
- push: PASS
- buffer round consumed: no

Next:

- Round 5: add gentle moving-button behavior using the current marker foundation.

## Round 5 Moving-Button Hazard V1

Implemented:

- Added deterministic moving-button offset facts in `src/core/hazards.js`:
  - active movement uses bounded sine-wave offsets,
  - telegraph, cooldown, expired, disabled, and inactive states keep `0px` offsets,
  - `sampledAtMs` is exposed on active hazard director state for debug/host inspection.
- Updated button transforms to be CSS-variable driven:
  - `--hazard-x` and `--hazard-y` control hazard drift,
  - `--button-press-y` preserves pressed/disabled feedback,
  - `--button-scale` preserves spawn/explode scale feedback.
- Updated renderer hazard presentation:
  - applies motion offsets to the actual target button element,
  - keeps marker geometry based on current button rects,
  - resets prior target buttons when hazards leave active/telegraph presentation.
- Extended validation:
  - core smoke checks active movement offset and telegraph zero offset,
  - fake-geometry renderer smoke checks CSS motion variables on target buttons,
  - structure guards require moving-button CSS variables and renderer motion application markers.

Tuning:

- Movement remains bounded by the Round 2 config:
  - amplitude X: `10px`
  - amplitude Y: `6px`
  - cycle: `2400ms`
- The first active fixed-seed validation sample at Level 19 / enemy 2 / `2000ms` produces a gentle `3px, 3px` drift.

Debug self-check:

- The change is explained by fixed-seed core hazard samples and a fake-geometry renderer smoke.
- Failures localize to core offset calculation, CSS variable transform composition, renderer motion application, or structure validation.
- First enemy / first upgrade path remains hazard-free because unlock thresholds were not changed.
- Disabled, inactive, telegraph, active, cooldown, and expired movement states remain covered by existing and extended validation.
- Moving buttons use transforms on the button element itself, so click target and visual target stay unified.
- Attack/combo tracers still use `getBoundingClientRect()` on the pressed button, so future active motion remains compatible with current rect sourcing.

Architecture self-check:

- Movement timing and offset facts are pure core data.
- UI only applies provided offsets to CSS variables and measures presentation geometry.
- App orchestration was not changed in this round.
- Host payload code was not changed in this round; hazard facts remain JSON-safe through existing payload smokes.
- Rule, fatal-button, combat, combo, upgrade, and difficulty semantics were not duplicated.
- Unity/WebView/native, real 3D, roguelite meta, dependencies, CDN resources, framework work, and Phase 1 retuning remain out of scope.
- Validation now guards current-rect markers, CSS motion variables, and deterministic active/telegraph movement offsets.

Round 5 validation:

- `node --check src\core\hazards.js`: PASS
- `node --check src\ui\render.js`: PASS
- `node --check scripts\validate-structure.mjs`: PASS
- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS, no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit / push:

- commit: `b633f05` (`feat: add gentle moving button hazard`)
- push: PASS
- buffer round consumed: no

Next:

- Round 6: moving-button validation and tuning with stronger geometry/overlap guards.

## Round 6 Moving-Button Validation And Tuning

Implemented:

- Added renderer-side edge clamping for moving-button offsets:
  - clamps against the current button rect and grid rect,
  - subtracts the previous hazard offset so transformed rects can still produce stable base geometry,
  - stores `hazardOffsetX` and `hazardOffsetY` on button data attributes for the next frame.
- Tuned moving-button X amplitude from `10px` to `6px`.
- Kept Y amplitude at `6px`.
- Extended validation:
  - fake-geometry smoke now verifies an edge button clamps out-of-board negative motion to `0px`,
  - a centered button still receives the requested motion offset,
  - a tight-layout gap guard fails if configured amplitude exceeds the smallest known grid gap safety margin.

Tuning evidence:

- The tightest current layout gap marker is `8px` in short-height CSS.
- A `10px` X drift could visually intrude past that gap on edge/adjacent cases.
- `6px` keeps the first active fixed-seed sample gentle: Level 19 / enemy 2 / `2000ms` now produces `2px, 3px`.
- No timer, rule, combat, combo, upgrade, board-size, or unlock timing value changed.

Debug self-check:

- The change is explained by fixed fake geometry, existing fixed-seed hazard samples, and a documented layout-gap constraint.
- Failures localize to renderer clamp geometry, hazard tuning config, or structure validation.
- First enemy / first upgrade path remains hazard-free because unlock thresholds were not changed.
- Moving buttons still use transforms on the button element itself; click target and visual target remain unified.
- Current attack/combo tracer sourcing still uses the moved button rect through `getBoundingClientRect()`.

Architecture self-check:

- Core still owns schedule timing and deterministic offsets.
- UI owns viewport/grid clamping because it is presentation geometry.
- App and host code were not changed in this round.
- Rule, fatal-button, combat, combo, upgrade, and difficulty semantics were not duplicated.
- Unity/WebView/native, real 3D, roguelite meta, dependencies, CDN resources, framework work, and Phase 1 retuning remain out of scope.
- Validation now guards edge clamping and conservative amplitude bounds.

Round 6 validation:

- `node --check src\config\hazards.js`: PASS
- `node --check src\ui\render.js`: PASS
- `node --check scripts\validate-structure.mjs`: PASS
- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS, no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit / push:

- commit: `aa8dfd2` (`test: harden moving button hazard geometry`)
- push: PASS
- buffer round consumed: no

Next:

- Round 7: add temporary CRT/signal interference hazard V1.

## Round 7 Interference Hazard V1

Implemented:

- Added a low-fi CRT/signal interference presentation layer scoped to `btn-grid::after`.
- The interference layer:
  - is pointer-events-free,
  - uses low-opacity scanline/vector bands,
  - animates with short stepped signal jitter,
  - stays inside the button grid rather than rule text, timer, player HUD, upgrade cards, or enemy identity.
- Renderer now maps board-target interference facts into presentation:
  - writes `data-hazard-board` using the board hazard's own phase,
  - computes `--hazard-interference-opacity` from `interference.intensity`,
  - clears the opacity back to `0.000` when no board hazard is present.
- Extended validation:
  - structure markers require the `btn-grid::after` interference layer and signal animation,
  - renderer marker guards require intensity-to-opacity wiring,
  - fake-geometry smoke verifies `data-hazard-board="telegraph"` and opacity `0.087` for intensity `0.34`,
  - selector guard fails if interference targets rule text or player HUD selectors.

Debug self-check:

- The change is explained by fixed interference facts and a fake-geometry renderer smoke.
- Failures localize to CSS selector scope, renderer fact mapping, or structure validation.
- First enemy / first upgrade path remains hazard-free because unlock thresholds were not changed.
- Interference is brief and bounded by existing core timing; this round only renders active/telegraph facts.
- Moving-button clamp and marker geometry remain unchanged.

Architecture self-check:

- Interference timing and intensity remain core/config facts.
- UI only maps provided board-target facts into a scoped visual overlay.
- App and host code were not changed in this round.
- Rule, fatal-button, combat, combo, upgrade, and difficulty semantics were not duplicated.
- Unity/WebView/native, real 3D, roguelite meta, dependencies, CDN resources, framework work, and Phase 1 retuning remain out of scope.
- Validation now guards interference style scope and opacity fact wiring.

Round 7 validation:

- `node --check src\ui\render.js`: PASS
- `node --check scripts\validate-structure.mjs`: PASS
- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS, no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit / push:

- commit: `0ca9316` (`feat: add signal interference hazard`)
- push: PASS
- buffer round consumed: no

Next:

- Round 8: interference validation and tuning for readability and feedback coexistence.
