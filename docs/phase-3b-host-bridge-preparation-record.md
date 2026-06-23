# Phase 3B Host Bridge Preparation Record

## Scope

Phase 3B prepares a plugin-neutral host boundary while keeping ThatButton independently playable as a browser/GitHub Pages game. This phase does not integrate Unity, WebView plugins, native SDKs, custom URL schemes, 3D rendering, or engine build pipelines.

Preserved behavior:

- Phase 1 difficulty bands, timers, rewards, board sizes, fatal ranges, rule tiers, and clue semantics.
- Phase 2 fatal-condition, forbidden-button, safe-key, and clear-panel wording.
- Phase 3 best-run persistence, failure recap, scoring, timers, and retry feedback.
- Phase 3A module boundaries and zero-dependency static delivery.

## Architecture Decision

The host bridge will be an adapter boundary around the existing browser app, not a new gameplay layer.

- Core/config modules remain browser-free.
- Host event contracts may live in `src/core/` only as pure data builders and JSON-safety helpers.
- Browser host bridge adapters live outside core, for example under `src/host/`.
- UI modules forward user input and render facts; they do not decide safety, score, round completion, or failure.
- `src/main.js` owns orchestration, host adapter wiring, and the single input decision path.

## Input API Contract

The host-facing app boundary should expose:

```js
const app = createApp({
  window,
  document,
  performance,
  requestAnimationFrame,
  setTimeout,
  clearTimeout,
  hostBridge
});

app.init();
app.start();
app.reset();
app.press('btn-3');
app.getSnapshot();
app.getDebugApi();
```

Input semantics:

- `start()` starts a fresh run exactly like the current browser start button.
- `reset()` restarts a run exactly like the current browser reset button.
- `press(buttonId)` routes into the same gameplay decision path as DOM pointer/keyboard input.
- `getSnapshot()` returns a JSON-safe copy of the current app state for host rendering or inspection.
- `getDebugApi()` returns the existing debug helper surface without renaming current helpers.

Invalid or ignored host input should not throw during normal browser play. It should return a small result object such as `{ accepted: false, reason: 'not_playing' }`, `{ accepted: false, reason: 'unknown_button' }`, or `{ accepted: true, result: 'safe' | 'fatal' }`.

## Output Event Contract

All host events are versioned JSON-safe objects. Proposed envelope:

```json
{
  "version": 1,
  "type": "round_started",
  "atMs": 1000,
  "payload": {}
}
```

Event vocabulary:

- `host_bridge_ready`: app initialized and host bridge attached.
- `run_started`: a new run began.
- `run_reset`: a reset input was accepted.
- `round_started`: a round was generated and rendered.
- `button_pressed`: a button input was accepted, including `buttonId` and `result`.
- `safe_button_cleared`: a safe press changed safe-key progress.
- `score_changed`: score changed after a safe press.
- `round_cleared`: all safe keys in the current round were cleared.
- `run_finished`: the run ended by wrong click or timeout, with failure recap facts.
- `best_record_changed`: local best-run state changed.

Payload rules:

- Payloads must contain only JSON primitives, arrays, and plain objects.
- Payloads must not contain DOM nodes, event objects, functions, timers, class names, `AudioContext`, storage handles, or direct mutable `gameState` references.
- Button facts should use stable ids and domain data: `id`, `color`, `shape`, `number`, `label` where useful.
- Round facts should reuse the current snapshot vocabulary: level, seed, difficulty id, grid size, rule text, fatal count/range, safe remaining, score, and time values.
- Failure facts should reuse the Phase 3 recap model without exposing live arrays.

## Default Browser Bridge

The default bridge should be browser-safe and no-op by default:

- `emit(event)` accepts valid host events and returns without requiring an external host.
- Optional capture mode can collect emitted events for validation.
- Optional browser `CustomEvent` dispatch may be used for local inspection.
- No runtime code may reference plugin-specific globals such as `Unity`, `uniwebview`, `vuplex`, native WebView APIs, or custom URL schemes.

## Validation Plan

Required smokes:

- Import host event contract and verify event builders produce versioned JSON-safe payloads.
- Import browser host bridge adapter and verify no-op/capture modes.
- Instantiate `createApp()` with a fake host bridge and fixed seed.
- Verify captured sequence covers host bridge ready, run start, round start, safe press, fatal press, run finish, and best-record change where relevant.
- Verify `press(buttonId)` reuses the same decision path as DOM input by observing the same safe/fatal score and recap outcomes.
- Re-run existing seeded preview, failure recap, and best-record smokes.

## Round 1 Debug Self-Check

- Fixed-seed behavior remains untouched in this round; no runtime code changed.
- Future host event behavior can be reproduced with a fixed seed plus a fake capture bridge.
- Failure localization plan separates contract builder, browser bridge adapter, app orchestration, UI input, and gameplay core.
- Success, fatal click, timeout, reset, empty/no-op host, and incompatible host sink states are identified for later coverage.
- Existing debug API helper names are preserved by contract.

## Round 1 Architecture Self-Check

- No core/UI/runtime dependency changed in this round.
- Host bridge logic is planned outside core except pure data builders.
- DOM clicks and future host input are required to converge in `src/main.js`.
- Event vocabulary and payload shape are centralized in this record before code implementation.
- No plugin-specific SDK, engine assumption, Phase 4/6 gameplay scope, generated output, or unrelated file was touched.
