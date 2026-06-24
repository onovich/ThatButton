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
