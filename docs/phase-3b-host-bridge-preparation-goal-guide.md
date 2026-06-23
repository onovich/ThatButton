# Phase 3B - Host Bridge Preparation Goal Guide

Date: 2026-06-23T10:59:13.6245938+08:00
Status: execution guide for the executor
Owner role: executor
Planner thread: 019eefc3-8126-7271-b4b4-7dd9742c8545
Executor thread: 019ef06d-eb89-75c2-beb2-c695f9bcbedd
Round budget: 6 conversation rounds

## 0. Direct Goal Prompt For The Executor

Execute Phase 3B for `D:\WebProjects\ThatButton`: prepare the web game for a future host environment such as Unity WebView without actually integrating any engine, WebView plugin, native SDK, or 3D runtime in this phase.

The product decision for this phase is narrow: ThatButton should remain an independent playable HTML game, while exposing a stable host-facing boundary for two future needs:

- host-driven input, such as `start`, `reset`, `press(buttonId)`, and `getSnapshot()`;
- result output, such as JSON events for run start, round start, button press, round clear, run finish, score changes, best-run changes, and failure recap.

Implement the smallest useful Host Bridge preparation layer. It must be plugin-neutral, browser-safe, and testable without Unity. Ordinary browser and GitHub Pages play must continue to work exactly as before.

## 1. Required Reading

- `TODO.md`
- `README.md`
- `docs/README.md`
- `docs/phase-3a-architecture-regularization-goal-guide.md`
- `docs/phase-3a-architecture-regularization-record.md`
- `docs/phase-3a-final-report.md`
- `src/main.js`
- `src/core/level.js`
- `src/core/recap.js`
- `src/core/debug.js`
- `src/ui/render.js`
- `scripts/validate-structure.mjs`
- `scripts/build-static-site.mjs`
- `StartLocalTest.ps1`
- `OpenOnlineTest.ps1`

## 2. Phase Intent And Product Decision

This phase is preparation, not engine integration.

The target future shape is:

```js
const app = createThatButtonApp({
  hostBridge,
});

app.start();
app.press("btn-3");
app.reset();
app.getSnapshot();
```

The HTML version may keep handling its own DOM clicks. A future Unity WebView may only listen to output events. A future 3D Unity version may call the input API and render its own buttons from snapshots. This phase should make both routes cheaper later without choosing either route now.

## 3. Required Work

- Define a small, versioned host event contract in a pure module, such as `src/core/host-events.js` or another clearly named core contract module.
- Define event builder helpers so payload shape is centralized and JSON-serializable.
- Add a browser host bridge adapter in a non-core module, such as `src/host/browser-host-bridge.js`.
- Keep the default host bridge as no-op plus optional debug/test capture. It may dispatch a browser `CustomEvent` for local inspection, but it must not require or import any engine plugin.
- Do not call plugin-specific globals such as `Unity`, `uniwebview`, `vuplex`, native WebView APIs, or custom URL schemes in runtime code during this phase.
- Refactor input handling enough to expose a stable host-facing input path. If a host calls `press(buttonId)`, it must reuse the same gameplay decision path as DOM clicks instead of duplicating rule logic.
- Expose a stable host-facing app API only from the orchestration layer. A likely shape is `start`, `reset`, `press`, `getSnapshot`, and `getDebugApi`.
- Emit host events at the smallest useful points:
  - host bridge ready,
  - run started,
  - round started,
  - button pressed with `safe` or `fatal` result,
  - safe button cleared or score changed,
  - round cleared,
  - run finished,
  - best record changed when relevant.
- Ensure every output payload avoids DOM nodes, live objects, functions, class names, `AudioContext`, timers, and circular references.
- Add deterministic validation or smoke coverage for the host event contract, the default no-op bridge, captured event order, host-driven button input, and run-finished recap output.
- Add `docs/phase-3b-host-bridge-preparation-record.md` documenting the event vocabulary, input API, output API, non-goals, and future Unity/WebView adapter notes.
- Add `docs/phase-3b-final-report.md` at completion.

## 4. Strict Code Standards And Architecture Constraints

These are hard constraints, not preferences:

- Core/config modules must remain browser-free. No `window`, `document`, `localStorage`, `AudioContext`, DOM event objects, CSS classes, URL query parsing, or global game state in core/config.
- Host event contracts may live in core only if they are pure data builders and validators. They must not know about Unity, WebView plugins, browser globals, or DOM.
- Browser host bridge adapters may touch `window` and browser events, but they must not own gameplay decisions.
- UI modules must not emit gameplay truth by themselves. UI can forward user input to the app and render facts; it must not decide whether a button is safe, fatal, scored, or finished.
- `src/main.js` may orchestrate host events, but it must not become a contract dumping ground. Event vocabulary and payload shape belong in a dedicated module.
- There must be exactly one gameplay decision path for a button press. DOM click input and future host input must meet before safety/fatal/score logic is applied.
- Event payloads must be stable, versioned, and JSON-safe. Do not leak internal mutable arrays or direct `gameState` references.
- Do not add npm dependencies for this phase.
- Do not change Phase 1 difficulty values, Phase 2 copy semantics, Phase 3 best-run/recap rules, Phase 3A architecture boundaries, or visible UI styling unless a tiny text label is required for testing.
- Do not add boss, enemy, combo, roguelite, moving-button, 3D, Unity, PWA, CDN removal, i18n, or framework migration work.
- Do not edit `origin/` or GitHub Pages workflow files.

## 5. Per-Round Fixed Workflow

Every round reply must include:

- round goal,
- completed work,
- Debug self-check,
- architecture self-check,
- validation commands and results,
- commit hash and push result,
- next round goal,
- whether a buffer round was consumed.

Progression rules:

- If validation fails, do not commit, do not push, and do not move to the next round.
- If validation passes but commit fails, do not move to the next round.
- If commit succeeds but push fails, do not move to the next round.
- Only after successful push may the executor continue to the next round.
- Do not stage unrelated files or unrelated user changes.

## 6. Debug Self-Check Required Each Round

Every round must answer:

- Can the current host event behavior be reproduced with a fixed seed or a small fake host bridge?
- Can a failed host event be localized to contract builder, bridge adapter, app orchestration, UI input, or gameplay core?
- Are success, fatal click, timeout, reset, empty/no-op host, and incompatible host sink states covered where relevant?
- If host-driven input changed, does it reuse the same button press decision path as DOM input?
- If output changed, is the emitted payload JSON-safe and free of live DOM/game-state references?
- If debug APIs changed, are existing `window.__THAT_BUTTON_DEBUG__` helper names and semantics preserved?

## 7. Architecture Self-Check Required Each Round

Every round must answer:

- Does Phase 3A's layer map still hold: config/core pure, UI presentation-only, `main.js` orchestration-only?
- Did the phase keep host bridge logic out of core except for pure data contracts?
- Did UI avoid duplicating rules, difficulty, score, recap, or run-finish semantics?
- Did DOM clicks and host input converge into one decision path?
- Did event contract changes remain centralized instead of being scattered across `main.js` and UI files?
- Did validation guard the new boundary instead of relying on manual inspection only?
- Did the work avoid plugin-specific SDKs, engine assumptions, and deferred Phase 4/6 gameplay scope?
- Were unrelated files, generated outputs, and user changes left alone?

## 8. Round Plan

Round budget: 6 total rounds.

1. Contract baseline and record: document the event vocabulary, input API shape, output payload shape, and no-engine decision in `docs/phase-3b-host-bridge-preparation-record.md`.
2. Host event contract module: add pure event builders, payload snapshot helpers, JSON-safety checks if useful, and direct module validation.
3. Browser host bridge and app wiring: add the no-op/test-capture/browser event adapter and wire it through `createApp()` without changing visible gameplay.
4. Host input path: expose `press(buttonId)` or an equivalent stable API that reuses the DOM click decision path and preserves UI feedback when invoked through the browser app.
5. Validation guardrails and docs: update `scripts/validate-structure.mjs`, docs index, README/TODO if implementation changes require it, and add host event/input smokes.
6. Final validation and report: run the full matrix, create `docs/phase-3b-final-report.md`, commit, push, and report READY_FOR_CHECK.

Adjacent rounds may be combined if validation remains strong, but the executor must not skip the contract record, host input smoke, event capture smoke, architecture self-check, final report, commit, or push.

## 9. Non-Scope

- No real Unity project.
- No WebView plugin installation or spike.
- No engine-specific API calls.
- No custom URL scheme implementation.
- No native Android/iOS code.
- No 3D rendering, Unity scene, prefab, C# bridge, or build pipeline.
- No boss, enemy, combo, health bar, roguelite, shop, loadout, moving-button, occlusion, or spatial interaction.
- No difficulty curve retuning.
- No copywriting style pass except docs explaining the host bridge.
- No CDN removal, PWA, i18n, framework rewrite, or new package dependency.

## 10. PASS Criteria

Phase 3B can be READY_FOR_CHECK only when all are true:

- A host event contract exists and is documented.
- Event payloads are versioned, JSON-safe, and free of DOM/live object references.
- Default browser play remains unchanged.
- A no-op host bridge works without errors in normal browsers and GitHub Pages.
- A test/capture host bridge can observe the expected event sequence.
- Host-driven `start`, `reset`, `press(buttonId)`, and `getSnapshot()` or equivalent API shape is available from the app boundary.
- DOM click input and host input use one gameplay decision path.
- `window.__THAT_BUTTON_DEBUG__` remains compatible.
- `scripts/validate-structure.mjs` checks the new host bridge boundaries and event contract.
- Existing Phase 1/2/3/3A validation still passes.
- `docs/phase-3b-host-bridge-preparation-record.md` and `docs/phase-3b-final-report.md` exist.
- `TODO.md` and `docs/README.md` point to Phase 3B artifacts.
- The final implementation has been committed and pushed.

## 11. Required Validation Matrix

- `npm run validate`
- `npm run build`
- `.\StartLocalTest.ps1 -DryRun`
- `.\OpenOnlineTest.ps1 -DryRun`
- `git diff --check`
- Local HTTP smoke for a seeded debug URL
- Module import smoke for host event contract and host bridge adapter
- Host event capture smoke covering run start, round start, safe press, fatal press, and run finish
- Host-driven input smoke proving `press(buttonId)` reuses gameplay logic
- Existing seeded preview smoke for levels 1, 4, 8, 12, and 18
- Existing failure recap smoke for wrong-click and timeout
- Existing best-record helper smoke

## 12. Final Report Template

Create `docs/phase-3b-final-report.md` with:

- Summary
- Host bridge architecture map
- Event vocabulary and payload contract
- Input API contract
- Browser/no-op behavior
- Validation guardrails added
- Architecture self-check summary
- Compatibility notes for future Unity WebView work
- Validation results
- Non-scope preserved
- Remaining pending evidence
- Commits and push result

## Return Message

When complete, send the planner thread a routing message with:

- `from: executor`
- `to: planner`
- `workspace: D:\WebProjects\ThatButton`
- `phase: Phase 3B - Host Bridge Preparation`
- `action: recheck`
- `guide: docs/phase-3b-host-bridge-preparation-goal-guide.md`
- `status: READY_FOR_CHECK`
- final commit, push result, final report path, host bridge record path, validation evidence, architecture self-check summary, and explicit pending evidence.
