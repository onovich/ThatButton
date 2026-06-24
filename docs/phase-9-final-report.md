# Phase 9 Final Report - Playtest Evidence And Decision Gate

Phase: Phase 9 - Playtest Evidence And Decision Gate
Guide: `docs/phase-9-playtest-evidence-decision-gate-goal-guide.md`
Phase record: `docs/phase-9-playtest-evidence-decision-gate-record.md`
Final commit: final pushed head is reported in the READY_FOR_CHECK payload
Push: `origin/main` final push required after this report is committed
GitHub Pages workflow: verify after final push

## Summary

Phase 9 created a local-only evidence loop for real playtests before more tuning or engine work. The game can now build a versioned JSON-safe run report, retain the last report after run end, expose it through Host/debug surfaces, and show a compact post-run export panel with clipboard copy plus a selectable-text fallback.

No gameplay formulas, difficulty values, hazards, upgrades, VFX semantics, host bridge semantics, dependencies, CDN resources, PWA/service worker behavior, Unity/WebView/native integration, 3D work, or roguelite meta systems were added.

## Report Schema

- Kind: `thatbutton.playtestReport`
- Version: `1`
- Privacy flags: `localOnly: true`, `personalData: false`, `networkSubmission: false`
- Captured facts: build, seed, result/reason, level, score, elapsed time, viewport class, input mode, enemy progression, selected/offered upgrades, max combo, visible combo peak, wrong presses, player damage taken, safe presses, hazard exposure, and compact per-round facts.
- Pure implementation: `src/core/playtest-report.js`
- Deterministic fixture/debug coverage: `debugApi.previewPlaytestReportExport()` and `debugApi.previewRuntimePlaytestReport()`

## Runtime Export Flow

- Runtime collection starts on `startGame()`.
- Existing app orchestration records round/hazard facts, safe/fatal presses, combo peaks, player damage, enemy defeat, upgrade offers/selections, and final failure/timeout facts.
- `lastPlaytestReport` is built at run end and exposed in Host snapshot/debug API.
- The game-over overlay shows `LOCAL REPORT` only after a report exists.
- `COPY` attempts `navigator.clipboard.writeText(...)`.
- Clipboard denial/unavailability falls back to a visible readonly textarea marked `SELECTABLE`.

## Playtest Evidence Kit

- Manual template: `docs/phase-9-playtest-script-and-template.md`
- Browser smoke evidence: `docs/phase-9-browser-smoke-results.json`
- Legacy hazard smoke path preserved: `docs/phase-7a-browser-smoke-results.json`
- Covered manual surfaces: desktop browser, iOS Safari, Android Chrome, and human observation notes.

## Privacy And No-Network Guardrails

- No remote analytics, telemetry upload, tracking cookies, user identifiers, exact user agent strings, geolocation, IP addresses, account identifiers, or external reporting service.
- Runtime external URL scans across `index.html`, `src`, and `dist` found no matches.
- Active network/privacy API scans across `index.html`, `src`, and `dist` found no matches.
- `npm run validate` now guards Phase 9 evidence docs and browser smoke JSON.

## VFX, Hazard, Layout, And Progression Preservation

- Browser smoke still covers desktop `1280x720`, mobile `390x844`, and short-mobile `360x740`.
- Existing checks continue to cover bottom player HUD separation, clue/grid/HUD overlap, active moving-button offsets, interference scoping, upgrade overlay safety, retro-futurist VFX markers, button-origin tracers, and combat VFX layering.
- The report overlay is post-run only and top-aligned so export/fallback controls fit the tested viewports.

## Host Bridge And Debug API

- Host snapshot includes `lastPlaytestReport`.
- Debug API includes `getLastPlaytestReport()` and `getLastPlaytestReportExport()`.
- Report payloads are JSON-safe and cloneable.
- No high-frequency telemetry/event stream was added.

## Architecture Self-Check

- Core owns schema and aggregation.
- App orchestration records already-computed facts and builds the final report without owning formulas.
- UI owns only rendering, clipboard attempt, and local textarea fallback.
- Host/debug expose facts without interpreting gameplay or submitting data.
- Validation now guards evidence artifacts, report privacy shape, runtime report creation, export fallback, and no-network behavior.

## Validation

- `node --check` on changed JS/MJS files: PASS
- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- `cmd /c npm.cmd run smoke:hazards`: PASS
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\StartLocalTest.ps1 -DryRun`: PASS
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\OpenOnlineTest.ps1 -DryRun`: PASS
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- Active network/privacy API scan across `index.html`, `src`, and `dist`: PASS / no matches
- `git diff --check`: PASS with expected Windows line-ending warnings only when files are modified
- Deterministic report builder fixture smoke: PASS via `npm run validate`
- Runtime run-end report smoke: PASS via `npm run validate`
- Clipboard-denied/fallback export smoke: PASS via `npm run validate`
- Desktop/mobile/short-mobile export/hazard/VFX browser smoke: PASS via `npm run smoke:hazards`

## Pending Real-Device And Human Evidence

Still pending because this executor cannot honestly perform physical device or player tests here:

- Real iOS Safari touch/audio/vibration/export pass.
- Real Android Chrome touch/audio/vibration/export pass.
- Human playtest observations for report usefulness, longer-run retention, hazard fairness, VFX satisfaction, and decision direction.

The template is ready for those runs, and the exported report text makes future runs comparable.

## Decision Gate Recommendation

Do not start engine embedding or another gameplay system until at least a small real-device/human evidence set is filled using the Phase 9 template. Recommended next decision gate:

- If reports show export reliability, readable mobile layout, and players want more runs: continue HTML gameplay calibration around longer-run retention and hazard readability.
- If reports show the HTML loop is stable but the product direction needs platform/engine affordances: start a separate engine-embedding preparation phase that consumes existing Host Bridge contracts without moving gameplay formulas into host/native code.
- If reports are mixed or sparse: run more local playtests before adding scope.

## Non-Scope Preserved

Preserved: no analytics/tracking/network submission, no personal identifiers, no external reporting service, no Unity/WebView/native/3D/WebGL/Three.js/camera work, no roguelite meta, no new hazards, no new combat/upgrades/rules, no dependency/framework migration, no CDN resources, and no PWA/service worker.

## READY_FOR_CHECK Payload

```text
Role routing message

from: executor
to: planner
workspace: D:\WebProjects\ThatButton
phase: Phase 9 - Playtest Evidence And Decision Gate
action: recheck
guide: docs/phase-9-playtest-evidence-decision-gate-goal-guide.md
status: READY_FOR_CHECK
evidence:
- final_commit: reported after final push
- push: origin/main PASS after final push
- pass_report: docs/phase-9-final-report.md
- phase_record: docs/phase-9-playtest-evidence-decision-gate-record.md
- report_schema: src/core/playtest-report.js
- export_ui: post-run LOCAL REPORT panel with COPY and SELECT fallback
- browser_smoke: docs/phase-9-browser-smoke-results.json PASS
- playtest_template: docs/phase-9-playtest-script-and-template.md
- privacy: local-only/no-personal-data/no-network-submission PASS
pending:
- real iOS Safari evidence
- real Android Chrome evidence
- human playtest observations
next:
- Use $checkandgoal to validate this result. If PASS, proceed with planner-side $goalnext.
```
