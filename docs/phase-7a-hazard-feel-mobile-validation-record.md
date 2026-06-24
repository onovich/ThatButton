# Phase 7A Hazard Feel And Mobile Validation Record

Status: in progress
Guide: `docs/phase-7a-hazard-feel-mobile-validation-goal-guide.md`
Planner thread: `019eefc3-8126-7271-b4b4-7dd9742c8545`
Executor thread: `019ef06d-eb89-75c2-beb2-c695f9bcbedd`
Workspace: `D:\WebProjects\ThatButton`

## Phase 7A Scope Lock

Phase 7A validates and lightly tunes the existing Phase 7 Hazard Director V1. It does not add new hazard types, enemies, bosses, upgrades, roguelite systems, Unity/WebView/native integration, real 3D, WebGL, dependencies, framework migration, CDN/runtime external resources, or Phase 1 difficulty retuning.

Preserve:

- first enemy and first upgrade hazard-free onboarding
- Phase 6A bottom player HUD separation
- button-to-enemy tracers from the current pressed button rect
- Host Bridge JSON-safe snapshots and event payloads
- normal static browser and GitHub Pages delivery

## Phase 7 Acceptance Baseline

- Phase 7 accepted by planner/checker.
- Phase 7 final head: `e2ffbaf1645610a66911fced5cf9fe9c1d84394e`.
- Phase 7 final report: `docs/phase-7-final-report.md`.
- Phase 7A route head at execution start: `1aff5e7dce308eb947f21db66e6b97d3acbe61ae`.
- Existing checker extra browser smoke: Chrome headless desktop `1280x720`, mobile `390x844`, and short mobile `360x740` initial playing geometry passed for viewport fit, clue/grid no overlap, HUD/grid no overlap, and player HUD in command panel rather than battle stage.

## Current Hazard Configuration

Moving button:

- unlock: level 19, enemy index 2
- selected safe targets: 2
- telegraph delay: `1200ms`
- telegraph duration: `700ms`
- active duration: `2600ms`
- cooldown: `4200ms`
- motion amplitude: `6px` X and `6px` Y
- motion cycle: `2400ms`

Interference:

- unlock: level 24, enemy index 2
- telegraph delay: `5200ms`
- telegraph duration: `500ms`
- active duration: `1200ms`
- cooldown: `5200ms`
- config intensity: `0.34`
- UI opacity cap: `0.100` during telegraph and `0.160` while active
- scope: board-only `.btn-grid::after`

Hazard-free onboarding:

- first enemy remains hazard-free
- first upgrade remains hazard-free
- level 22 intentionally exposes movement without interference

## Pending Evidence From Phase 7

- true active moving-hazard browser/mobile evidence
- true active interference browser/mobile evidence
- real iOS Safari touch/audio/vibration review
- real Android Chrome touch/layout/vibration review
- human fairness/readability playtest

These items must be recorded as pending unless they are actually run in this phase.

## Browser And Mobile Smoke Plan

Target repeatable smoke coverage, subject to local browser automation availability:

- desktop `1280x720` playing layout
- mobile `390x844` playing layout
- short mobile `360x740` playing layout
- active moving-button hazard at later level, including moved button geometry and safe touch target alignment
- active interference at later level, including board-only scope, opacity cap, and readable rule/player HUD
- upgrade overlay while hazards are inactive, paused, or harmless

If browser automation is unavailable or flaky, record the exact limitation and keep the structured validation path truthful.

## Manual Playtest Checklist

- iOS Safari: moving-button touch target accuracy, readable rule text, audio/vibration behavior, no HUD overlap
- Android Chrome: moving-button touch target accuracy, readable board under interference, vibration behavior, no HUD overlap
- Human feel: movement reads as fair drift rather than cheap evasion
- Human feel: interference adds tension without hiding the rule or current button labels
- Human feel: stacked late hazards feel worth keeping after the RPG loop

## Architecture Self-Check

- Core/config modules remain DOM-free and do not access `window`, `document`, `localStorage`, `AudioContext`, CSS classes, URL query, or global game state.
- UI renders hazard facts and browser geometry only; it does not duplicate hazard unlock/timing/rule semantics.
- Host Bridge payloads remain JSON-safe and plugin-neutral.
- `main.js` remains orchestration-focused.

## Round 1 - Baseline And Test Plan

Changes:

- Created this Phase 7A record before implementation.
- Captured Phase 7 accepted hazard values and pending evidence.
- Defined browser/mobile smoke targets and manual playtest checklist.

Validation:

- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- `git diff --check`: PASS

Commit/push:

- round commit: `b93dca8`
- push: `origin/main` PASS

## Round 2 - Repeatable Browser/Mobile Hazard Smoke

Changes:

- Added `scripts/smoke-hazards-browser.mjs`.
- Added `npm run smoke:hazards`.
- Added lightweight JSON evidence at `docs/phase-7a-browser-smoke-results.json`.
- The smoke launches a local static server and headless Chrome through CDP with no new dependencies.

Coverage:

- desktop `1280x720`: PASS
- mobile `390x844`: PASS
- short mobile `360x740`: PASS
- initial playing layout: clue/grid/HUD viewport fit and no overlap PASS
- player HUD placement: inside command panel and not inside battle stage PASS
- active moving-button presentation on a deterministic later-level `3x3` board: PASS
- active interference presentation on the same later-level board: PASS
- upgrade overlay with hazards disabled/harmless: PASS

Key browser evidence:

- active moving targets: `btn-1` and `btn-4`
- movement offset: `2px` X and `3px` Y in all three viewports
- measured visual rect movement: `dx=2`, `dy=3` in all three viewports
- interference opacity var: `0.141`, below the active cap of `0.160`
- upgrade cards: 3 visible cards in all three viewports

Limitations:

- Active hazard browser smoke uses the real browser DOM, real CSS, real UI renderer, and real hazard core with deterministic synthetic later-level state. It does not claim a full human browser playthrough to level 24.
- This avoids adding a private debug backdoor or exposing forbidden button IDs through the Host Bridge. Existing structure validation still covers the host-driven active L24 interference press path.
- Real iOS Safari, Android Chrome, and human playtest evidence remain pending.

Validation:

- `node --check scripts\smoke-hazards-browser.mjs`: PASS
- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `cmd /c npm.cmd run smoke:hazards`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit/push:

- round commit: `3948e9d`
- push: `origin/main` PASS

## Round 3 - Browser Smoke Review And Tuning Gate

Changes:

- Detected updated Phase 7A guide/TODO scope that expands this phase to VFX Feel And Hazard Validation; treated the working guide as the current source of truth.
- Reviewed browser smoke evidence before touching tuning values.
- Kept hazard tuning unchanged because evidence supports the current values.
- Updated the smoke result writer to preserve platform line endings so repeat runs avoid false content churn.

Evidence reviewed:

- `docs/phase-7a-browser-smoke-results.json` status: PASS
- desktop `1280x720`, mobile `390x844`, and short mobile `360x740` all report `ok: true`
- initial layout checks passed for clue/grid/HUD fit, clue-grid separation, grid-player HUD separation, command-panel HUD containment, and battle-stage HUD separation
- active movement checks passed for two rendered targets, non-zero offsets, in-grid/in-viewport geometry, visual rect movement matching offsets, and marker count
- active interference checks passed for board dataset scope, opacity cap, pseudo-element opacity, one board marker, and clue/player HUD clear of grid
- upgrade overlay checks passed for three cards, viewport fit, and disabled/harmless hazard state

Tuning decision:

- No hazard parameter changes in this round.
- Movement amplitude remains `6px` X / `6px` Y because browser evidence shows the current `2px`/`3px` sampled active offset renders accurately on desktop and mobile, while existing structure validation continues to guard edge clamp behavior.
- Interference opacity remains capped at `0.160` because browser evidence measured `0.141` active opacity with board-only scope and no clue/player-HUD obstruction.
- Unlock levels and timings remain unchanged because the phase evidence did not show a readability or fairness regression.

Validation:

- `node --check scripts\smoke-hazards-browser.mjs`: PASS
- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `cmd /c npm.cmd run smoke:hazards`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit/push:

- round commit: `fd5876a`
- push: `origin/main` PASS

## Round 4 - VFX Feel Overhaul And Evidence

Changes:

- Defined VFX presentation markers for retro terminal/data-signal effects:
  - `vfx-data-projectile`
  - `vfx-phosphor-afterimage`
  - `vfx-terminal-packet`
  - `chunky-neon-fragment`
  - `vfx-tier-safe-success`
  - `vfx-tier-chain-start`
  - `vfx-tier-combo-x2`
  - `vfx-tier-combo-high`
  - `vfx-tier-combo-capped`
  - `vfx-tier-wrong-press`
  - `vfx-tier-upgrade`
- Reworked button-to-enemy tracers to carry data-projectile/phosphor markers and stronger tiered counts.
- Reworked safe press and chain-start feedback so non-combo success remains visible while chain start is brighter.
- Reworked combo reward feedback so `COMBO x2`, high combo, and capped combo have distinct tier markers.
- Reworked enemy hit/defeat feedback with `enemy-hit-vector` and `enemy-defeat-burst` markers.
- Reworked wrong-press feedback with button-local `wrong-impact-vector`, screen vector flash, player damage float, error audio path, and vibration path preservation.
- Added upgrade reward feedback through `showUpgradeReward(...)` and `upgrade-reward-burst` markers.
- Extended `npm run smoke:hazards` to trigger and record VFX marker evidence across desktop, mobile, and short mobile.
- Extended structure validation with VFX tier markers and anti-pattern guards for non-terminal particle language.

Browser VFX evidence:

- desktop `1280x720`: PASS
- mobile `390x844`: PASS
- short mobile `360x740`: PASS
- safe success marker count: 16 per viewport
- chain-start marker count: 29 per viewport
- `COMBO x2` marker count: 53 per viewport
- high-combo marker count: 53 per viewport
- capped-combo marker count: 53 per viewport
- wrong-press marker count: 18 per viewport
- enemy-hit marker count: 29 per viewport
- enemy-defeat marker count: 29 per viewport
- upgrade-reward marker count: 19 per viewport
- data-projectile marker count: 163 per viewport
- phosphor-afterimage marker count: 162 per viewport
- chunky-neon-fragment marker count: 249 per viewport
- first button-to-enemy tracer origin delta: `0,0` in all three viewports
- combat VFX z-index: `80` with board interference dataset `active`

Debug self-check:

- VFX changes are localized to `src/ui/render.js`, `index.html`, and browser/structure validation.
- `src/app/create-app.js` only calls the new renderer upgrade reward method after core upgrade application; upgrade formulas remain in core/config.
- Wrong-press audio remains on the existing `audio.playError()` path, with renderer vibration/screen/button feedback only.
- No hazard, combat, combo, enemy, player, or upgrade formula changed.

Architecture self-check:

- UI renders already-computed facts and DOM geometry only.
- No gameplay decisions moved into UI or host code.
- Hazard config/core and Host Bridge payload semantics remain unchanged.
- No new dependencies, frameworks, external runtime URLs, Unity/WebView/native/3D, or roguelite scope.

Validation:

- `node --check src\ui\render.js`: PASS
- `node --check src\app\create-app.js`: PASS
- `node --check scripts\smoke-hazards-browser.mjs`: PASS
- `node --check scripts\validate-structure.mjs`: PASS
- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run smoke:hazards`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `StartLocalTest.ps1 -DryRun`: PASS
- `OpenOnlineTest.ps1 -DryRun`: PASS
- runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit/push:

- pending
