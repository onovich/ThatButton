# Phase 9 Playtest Evidence And Decision Gate Record

Status: in progress
Guide: `docs/phase-9-playtest-evidence-decision-gate-goal-guide.md`
Planner thread: `019eefc3-8126-7271-b4b4-7dd9742c8545`
Executor thread: `019ef06d-eb89-75c2-beb2-c695f9bcbedd`
Workspace: `D:\WebProjects\ThatButton`

## Phase 9 Scope Lock

Phase 9 creates a local evidence kit for comparable real runs. It does not add remote analytics, telemetry upload, tracking, network submission, cookies for tracking, user identifiers, external reporting services, Unity/WebView/native/3D work, roguelite meta-progression, shops, maps, currencies, inventories, loadouts, new hazard categories, new combat formulas, new upgrade categories, new rule semantics, new dependencies, framework rewrites, CDN resources, PWA/service worker work, or broad visual redesign.

Preserve:

- Phase 8 progression labels and session preview evidence
- Phase 7A retro-futurist terminal VFX language
- bottom command/control player HUD
- button-to-enemy tracer origin from the pressed button
- Host Bridge JSON-safe snapshots and events
- first enemy / first upgrade hazard-free onboarding
- normal static browser and GitHub Pages delivery

## Required Reading Notes

- `TODO.md` lists Phase 9 as the current recommendation after Phase 8 acceptance.
- `docs/phase-8-final-report.md` records that real iOS Safari, Android Chrome, and human playtest evidence remain pending.
- `docs/phase-8-playtest-calibration-content-record.md` records deterministic progression facts: first `3x3` at Level 6, first upgrade at Level 18, moving hazard at Level 19 / enemy 2, interference at Level 24 / enemy 2, E2 defeat tuned to Level 39, and E3 defeat at Level 62 in a 72-level preview.
- `docs/phase-7a-final-report.md` records desktop/mobile/short-mobile browser smoke PASS for VFX, hazards, bottom player HUD, and button-origin tracers.
- `src/core/session-preview.js` already exposes comparable deterministic run facts, but it is a synthetic preview and not a real run export.
- `src/app/create-app.js` already records runtime debug events for round starts, player damage, level complete, enemy defeated, upgrade offered/selected, and failure.
- `src/host/app-host-api.js` already exposes JSON-safe snapshots and run-finished events.
- `src/ui/render.js` already owns the post-run overlay, so any player-facing export UI should live there and stay hidden during active play.

## Round 1 - Baseline And Report Schema

Round goal:

- Create this Phase 9 record before code changes.
- Inventory current runtime/session facts available from Phase 8.
- Define a local report schema and privacy boundaries before implementation.

Current available facts:

| Fact group | Current source |
| --- | --- |
| seed/debug flag | URL-derived app state and debug API |
| build/version facts | `package.json`, static app version constants to be added in report builder |
| viewport class | UI/browser layer can classify dimensions without storing exact user agent |
| input mode | DOM pointer source can infer keyboard/pointer/touch/mouse without storing device identifiers |
| levels/score | app state and host run payload |
| enemy progression | combat facts, enemy identity facts, enemy damage/defeat debug events |
| upgrades | upgrade offer/selection debug events and upgrade state |
| combo peak | combo change events and current combo summary |
| wrong presses/player damage | player damage debug events and recap |
| hazard exposure | hazard facts on round starts and active hazard summaries |
| failure/victory reason | run recap and host run-finished payload |
| timing/pressure facts | time limit/time left per round, elapsed runtime, Phase 8 pressure-like facts where available |

Local playtest report schema draft:

```json
{
  "version": 1,
  "kind": "thatbutton.playtestReport",
  "createdAt": "local ISO timestamp or null",
  "privacy": {
    "localOnly": true,
    "personalData": false,
    "networkSubmission": false
  },
  "build": {
    "app": "ThatButton",
    "version": "0.1.0",
    "phase": "Phase 9",
    "schemaVersion": 1
  },
  "run": {
    "seed": "string or null",
    "result": "failure | victory | reset | unknown",
    "reason": "timeout | wrong_click | player_defeated | manual_reset | unknown",
    "level": 1,
    "score": 0,
    "elapsedMs": 0,
    "viewportClass": "desktop | mobile | short-mobile | unknown",
    "inputMode": "pointer | touch | mouse | keyboard | host | mixed | unknown"
  },
  "progression": {
    "firstThreeByThreeLevel": 6,
    "enemiesReached": 1,
    "enemiesDefeated": 0,
    "highestEnemyIndex": 1,
    "finalEnemy": {
      "enemyIndex": 1,
      "enemyName": "REACTOR WARDEN",
      "stageLabel": "S01 CORE LOCK",
      "tierLabel": "ONBOARDING",
      "hp": 0,
      "maxHp": 500
    }
  },
  "combat": {
    "maxCombo": 0,
    "visibleComboPeak": 0,
    "wrongPresses": 0,
    "playerDamageTaken": 0,
    "safePresses": 0
  },
  "upgrades": {
    "offeredCount": 0,
    "selectedCount": 0,
    "selected": []
  },
  "hazards": {
    "firstMovingLevel": null,
    "firstInterferenceLevel": null,
    "roundsWithMoving": 0,
    "roundsWithInterference": 0,
    "roundsWithActiveHazards": 0
  },
  "rounds": []
}
```

Privacy boundaries:

- Do not store names, emails, IPs, exact user agent strings, geolocation, device identifiers, account identifiers, or free-form personal notes inside the automatic run report.
- Do not send the report over the network.
- Do not create remote analytics, telemetry upload, tracking cookies, or third-party reporting integrations.
- Allow local copy/download/selectable export only after run end or via debug API.
- Manual playtest templates may include observations, but they must remind testers not to add personal data.

Debug self-check:

- Smallest current fixture for Phase 9 is a single synthetic run/report object assembled from existing state/debug facts.
- Likely failure layers are report core, app event collection, UI export, clipboard permission fallback, browser smoke tooling, and docs.
- Empty report, corrupt/stale report, clipboard denied, and storage-disabled cases still need implementation coverage in later rounds.
- No code changed in Round 1, so no gameplay, VFX, hazard, host, or UI behavior changed.

Architecture self-check:

- Report schema is documented before coding.
- No report formulas moved into UI.
- No app orchestration changes were made.
- No non-scope systems were added.
- Existing Phase 8/7A invariants are untouched.

Validation:

- `cmd /c npm.cmd run validate`: PASS
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- `git diff --check`: PASS

Commit/push:

- round commit: reported after commit
- push: pending

Next round goal:

- Add a pure report builder with deterministic fixtures, JSON-safe output, missing-field handling, compact export text, and privacy-safe shape validation.

## Round 2 - Pure Report Builder

Round goal:

- Add a pure report builder for synthetic or real run facts.
- Include schema versioning, JSON-safe payloads, compact summary/export text, missing-field handling, and privacy-safe shape validation.
- Add deterministic validation coverage.

Changes:

- Added `src/core/playtest-report.js`.
- Added `previewPlaytestReport(...)` and `previewPlaytestReportExport(...)` to `src/core/debug.js`.
- Extended `scripts/validate-structure.mjs` so the new core file is scanned for architecture boundaries and the deterministic report fixture/export path is validated.

Report builder facts:

- Report kind: `thatbutton.playtestReport`
- Report version: `1`
- Privacy flags: `localOnly: true`, `personalData: false`, `networkSubmission: false`
- Build facts: app, app version, phase, schema version
- Run facts: seed, result, reason, level, score, elapsed time, viewport class, input mode
- Progression facts: first `3x3`, enemies reached/defeated, highest enemy index, final enemy identity/HP
- Combat facts: max combo, visible combo peak, wrong presses, player damage taken, safe presses
- Upgrade facts: offered count, selected count, selected upgrade summaries
- Hazard facts: first moving/interference levels and round exposure counts
- Round facts: compact per-round level/enemy/grid/fatal/safe/rule/timing/hazard facts

Fixture evidence:

```text
THATBUTTON PLAYTEST REPORT
schema: v1
privacy: local-only / no personal data / no network submission
run: failure / wrong_click / seed phase9-fixture
progress: L24 / 1420 pts / enemies 1/2
combat: max combo 8 / wrong 1 / safe 126
hazards: moving L19 / interference L24
```

Debug self-check:

- Smallest fixture: `createPlaytestReportFixture()` and `debugApi.previewPlaytestReportExport()`.
- Failure layers are isolated to pure report assembly and validation; no UI/export permissions or runtime collection changed yet.
- Empty/missing fields normalize to safe defaults without adding personal data.
- Clipboard denied, storage-disabled, runtime run-end collection, and UI fallback remain for later rounds.

Architecture self-check:

- Report assembly lives in `src/core/playtest-report.js`.
- The new core module does not touch DOM, `window`, `document`, localStorage, clipboard, downloads, CSS classes, audio, vibration, URL query parsing, or global game state.
- UI does not own report schema or gameplay formulas.
- Debug API exposes cloneable facts only.
- No non-scope systems were added.

Validation:

- `node --check src\core\playtest-report.js`: PASS
- `node --check src\core\debug.js`: PASS
- `node --check scripts\validate-structure.mjs`: PASS
- `cmd /c npm.cmd run validate`: PASS after fixing the new test fixture to include hazard-active levels
- `cmd /c npm.cmd run build`: PASS
- `node scripts\validate-static-site.mjs --include-dist`: PASS
- Runtime external URL scan across `index.html`, `src`, and `dist`: PASS / no matches
- Privacy/no-network initial scan: PASS for network APIs; expected matches were existing CSS `tracking-*` utility class names and the new forbidden-key deny-list in `playtest-report.js`
- `git diff --check`: PASS with expected Windows line-ending warnings only

Commit/push:

- Pending.

Next round goal:

- Collect real runtime run facts through the app flow without changing gameplay decisions, then build and retain a final run report at run-end states.
