# Phase 3B Final Report - Host Bridge Preparation

Status: READY_FOR_CHECK

## Summary

Phase 3B prepares ThatButton for a future host environment while preserving the browser game. The implementation adds plugin-neutral input and output contracts, a browser-safe host bridge adapter, app-level host APIs, host event validation smokes, and documentation. It does not integrate Unity, WebView plugins, native SDKs, custom URL schemes, 3D rendering, or engine build pipelines.

## Host Bridge Architecture Map

- `src/core/host-events.js`: pure event vocabulary, version, event builders, host payload builders, clone helpers, and JSON-safety guards.
- `src/host/browser-host-bridge.js`: no-op, capture, optional browser `CustomEvent`, invalid event, incompatible sink, and sink failure adapter behavior.
- `src/host/app-host-api.js`: app snapshot and host event emission helper layer.
- `src/host/browser-storage.js`: browser storage adapter.
- `src/core/app-state.js`: initial runtime state factory.
- `src/main.js`: orchestration, browser adapter wiring, shared input path, debug API assignment, and host API exposure.
- `src/ui/render.js`: presentation-only rendering plus element lookup for host-driven button feedback.

## Event Vocabulary And Payload Contract

Event envelope:

- `version: 1`
- `type`
- `atMs`
- `payload`

Implemented event types:

- `host_bridge_ready`
- `run_started`
- `run_reset`
- `round_started`
- `button_pressed`
- `safe_button_cleared`
- `score_changed`
- `round_cleared`
- `run_finished`
- `best_record_changed`

Payloads are guarded as JSON-safe plain data. They reject functions, `undefined`, circular objects, class instances such as `Date`, and unknown event types. Payload builders avoid DOM nodes, event objects, timers, `AudioContext`, storage handles, class names, and live `gameState` references.

## Input API Contract

The app boundary exposes:

- `start()`
- `reset()`
- `press(buttonId)`
- `getSnapshot()`
- `getDebugApi()`

The browser also assigns the same host-facing surface to `window.__THAT_BUTTON_HOST__`. Existing `window.__THAT_BUTTON_DEBUG__`, `window.startGame`, and `window.resetGame` compatibility remains.

`press(buttonId)` returns accepted/rejected result objects. DOM pointer/keyboard input and host-driven input both route through `pressButton(...)` before safe/fatal/score/run-finish decisions, so there is one gameplay decision path.

## Browser And No-Op Behavior

- Normal browser play remains the default.
- The default bridge is no-op and requires no external host.
- Capture mode records cloned events for validation.
- Optional browser `CustomEvent` dispatch is available for local inspection.
- No runtime code references plugin-specific globals or native bridge APIs.

## Validation Guardrails Added

`scripts/validate-structure.mjs` now checks:

- host event contract import and event builder behavior,
- JSON-safety acceptance and rejection,
- no-op, capture, invalid-sink, and browser-dispatch bridge behavior,
- app init `host_bridge_ready`,
- host API presence on app and `window.__THAT_BUTTON_HOST__`,
- host-driven safe press, repeated press rejection, fatal press, run-finished recap facts, best-record changed event, and captured event JSON safety,
- Phase 3A core/UI/main architecture boundaries,
- existing seeded previews, failure recaps, and best-record helper states.

## Architecture Self-Check Summary

- Core/config modules remain browser-free.
- Host bridge logic outside core is limited to host adapter and app host API modules.
- Core host event code is pure data contract code only.
- UI modules still do not decide rules, difficulty, score, recap, or run finish semantics.
- `src/main.js` remains under the validator line-count guard and does not own the host event contract.
- DOM clicks and host input converge before gameplay decisions.
- No plugin-specific SDK, engine assumption, or deferred Phase 4/6 gameplay scope was added.

## Future Unity WebView Notes

A future Unity WebView adapter can either listen to browser `CustomEvent` output or inject a custom `hostBridge` sink when creating the app. A future engine-side renderer can call `start`, `reset`, `press(buttonId)`, and `getSnapshot()` while rendering from JSON-safe snapshot facts. Actual Unity, WebView plugin selection, native messaging, and C# bridge code remain intentionally deferred.

## Validation Results

- `npm run validate` - PASS via `cmd /c npm.cmd run validate`
- `npm run build` - PASS via `cmd /c npm.cmd run build`
- `StartLocalTest.ps1 -DryRun` - PASS via `powershell -ExecutionPolicy Bypass -File .\StartLocalTest.ps1 -DryRun`
- `OpenOnlineTest.ps1 -DryRun` - PASS via `powershell -ExecutionPolicy Bypass -File .\OpenOnlineTest.ps1 -DryRun`
- `git diff --check` - PASS
- Core browser-boundary scan - PASS, no forbidden browser/global markers in `src/core`
- Plugin-specific runtime scan - PASS, no Unity/WebView/native bridge markers in `src` or `scripts`
- Local HTTP host bridge smoke - PASS at `http://127.0.0.1:5191/?seed=phase3a-baseline&debug=1`
- Module import smoke - PASS for host event contract and browser host bridge adapter
- Host event capture smoke - PASS for run start, round start, safe press, fatal press, run finish, and best-record changed
- Host-driven input smoke - PASS for `press(buttonId)` safe/fatal/repeat paths using shared gameplay logic
- Existing seeded preview smoke - PASS for levels `1`, `4`, `8`, `12`, and `18`
- Existing failure recap smoke - PASS for wrong-click and timeout
- Existing best-record helper smoke - PASS for empty, corrupt, saved, loaded, reset, new-best, matched-best, and below-best states

## Non-Scope Preserved

- No real Unity project.
- No WebView plugin installation or spike.
- No engine-specific API calls.
- No custom URL scheme implementation.
- No native Android/iOS code.
- No 3D rendering, Unity scene, prefab, C# bridge, or build pipeline.
- No boss, enemy, combo, health bar, roguelite, shop, loadout, moving-button, occlusion, or spatial interaction.
- No difficulty curve retuning.
- No copywriting style pass beyond docs explaining the host bridge.
- No CDN removal, PWA, i18n, framework rewrite, or new dependency.
- `origin/` and GitHub Pages workflow files were not edited.

## Remaining Pending Evidence

- Real browser manual smoke after GitHub Pages deployment completes.
- Future host integration proof once a specific Unity/WebView milestone chooses an adapter.
- Real-device mobile smoke remains pending from prior phases.

## Commits

- `05c3472` - docs: define phase 3b host bridge contract
- `c643341` - feat: add host event contract
- `21bf0f6` - feat: add browser host bridge adapter
- `6f6c257` - feat: expose host input API
- `0f98914` - docs: document host bridge preparation

The final docs and Role.md commits are recorded in the executor completion message after push.
