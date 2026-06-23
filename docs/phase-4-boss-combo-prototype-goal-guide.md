# Phase 4 - Boss And Combo Gameplay Prototype Goal Guide

Date: 2026-06-23T16:03:45.3115551+08:00
Status: execution guide for the executor
Owner role: executor
Planner thread: 019eefc3-8126-7271-b4b4-7dd9742c8545
Executor thread: 019ef06d-eb89-75c2-beb2-c695f9bcbedd
Round budget: 10 conversation rounds

## 0. Direct Goal Prompt For The Executor

Execute Phase 4 for `D:\WebProjects\ThatButton`: prototype a lightweight boss objective and combo/streak feedback on top of the existing "avoid fatal conditions, press safe buttons" loop.

The design question is narrow: can the current rules loop feel less like a plain countdown survival test and more like a readable encounter with a target, progress, and satisfying momentum?

Build one boss-style prototype, one conservative combo/streak system, and the required data/UI/host-event support. Preserve the existing difficulty curve, fatal-condition semantics, best-run/failure recap behavior, Host Bridge boundary, normal browser play, and GitHub Pages delivery.

Do not build roguelite systems, shops, multiple bosses, moving buttons, Unity integration, 3D rendering, or a full combat game in this phase.

## 1. Required Reading

- `TODO.md`
- `README.md`
- `docs/README.md`
- `docs/phase-1-difficulty-curve-record.md`
- `docs/phase-2-copywriting-tone-record.md`
- `docs/phase-3-feedback-progression-record.md`
- `docs/phase-3a-architecture-regularization-record.md`
- `docs/phase-3b-host-bridge-preparation-record.md`
- `docs/phase-3b-final-report.md`
- `src/config/difficulty.js`
- `src/core/level.js`
- `src/core/rules.js`
- `src/core/recap.js`
- `src/core/storage.js`
- `src/core/host-events.js`
- `src/host/app-host-api.js`
- `src/main.js`
- `src/ui/render.js`
- `scripts/validate-structure.mjs`
- `StartLocalTest.ps1`
- `OpenOnlineTest.ps1`

## 2. Product Direction And Design Assumptions

This phase follows the current project consensus:

- The base puzzle loop stays the protagonist.
- Boss and combo are motivational framing and feedback, not a replacement for reading the rule.
- The first prototype should answer whether a visible enemy/health objective improves retry willingness.
- Combo must reward clean comprehension and execution, not encourage blind speed tapping.
- Roguelite elements remain deferred until the boss/combo layer proves useful.
- Future Unity/WebView embedding remains plugin-neutral through the Phase 3B Host Bridge.

Low-priority planner choices for this phase:

- Prototype one boss encounter only.
- Boss damage should primarily happen on round clear, with optional small safe-press feedback if it does not obscure the rule loop.
- Combo/streak should be capped and legible. It may affect damage bonus, UI feedback, and host events, but should not retune the Phase 1 timer curve.
- A boss defeat can end the current run with a victory/encounter-clear state. Do not add multiple boss progression unless needed to keep the prototype coherent.

## 3. Required Work

- Add a pure gameplay model for boss/combat state, likely under `src/core/combat.js` or a similarly clear module.
- Add a pure combo/streak model, likely under `src/core/combo.js` or folded into combat only if it stays small and cohesive.
- Add data/config for the prototype boss values in a dedicated config/core-owned place. Do not scatter HP/damage/combo constants through UI or `main.js`.
- Add a boss state to the runtime: current HP, max HP, encounter status, last damage, defeat state, and combat summary data.
- Add a combo state to the runtime: current streak/combo, multiplier or bonus tier, capped value, and last change reason.
- Decide one clear damage formula and document it. The default target is:
  - safe presses keep the player moving and may increment combo;
  - round clear deals boss damage;
  - remaining time and clean streak may add a small capped bonus;
  - fatal press or timeout ends the run as before.
- Add compact UI for boss HP/progress and combo/streak. It must fit mobile screens and must not crowd or obscure the clue, grid, timer, best run, or failure recap.
- Update failure/victory/recap facts so the player can see how boss/combo affected the run without turning the recap into a wall of text.
- Extend the Phase 3B Host Bridge event vocabulary centrally for boss/combo events, such as:
  - `combat_started`,
  - `boss_damaged`,
  - `boss_defeated`,
  - `combo_changed`,
  - `run_victory` or an equivalent final result event if needed.
- Emit JSON-safe host events for boss damage, combo changes, and boss defeat.
- Preserve `window.__THAT_BUTTON_HOST__`, `window.__THAT_BUTTON_DEBUG__`, `window.startGame`, and `window.resetGame` compatibility.
- Add deterministic validation for combat calculations, combo transitions, host events, and at least one fixed-seed boss defeat path.
- Add `docs/phase-4-boss-combo-prototype-record.md`.
- Add `docs/phase-4-final-report.md` at completion.

## 4. Strict Code Standards And Architecture Constraints

These are hard constraints:

- Phase 3A boundaries still apply: config/core pure, UI presentation-only, `main.js` orchestration-only.
- Combat and combo source-of-truth must live in pure modules. No DOM, browser globals, `localStorage`, `AudioContext`, CSS classes, or live `gameState` references in those modules.
- UI must not decide damage, combo, victory, score, fatality, or round completion. UI only renders facts and forwards input.
- `src/main.js` may orchestrate combat/combo updates, but it must not own damage formulas, combo formulas, event vocabulary, or payload schemas.
- Host event vocabulary and payload builders must remain centralized in `src/core/host-events.js` or a clearly named pure contract module.
- All new host payloads must be JSON-safe and free of DOM nodes, event objects, timers, class instances, functions, and circular references.
- Do not duplicate Phase 1 difficulty configuration or Phase 2 rule semantics.
- Do not change existing level generation, fatal-condition rules, timer values, reward values, board sizes, rule tiers, or clue semantics unless the guide is explicitly updated by the planner.
- Do not add dependencies.
- Do not edit `origin/` or GitHub Pages workflow files.
- Do not hide complexity in vague files such as `utils.js`. Names must state ownership: combat, combo, host events, render, storage, recap, debug, or config.

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

- Can the current combat/combo change be reproduced with a fixed seed or small pure-module fixture?
- Can failures be localized to combat model, combo model, host event contract, app orchestration, UI rendering, or existing rule generation?
- Are success, safe press, round clear, boss damage, boss defeat, fatal click, timeout, reset, repeated press, and stale/incompatible host states covered where relevant?
- If UI changed, is there a repeatable smoke or marker check showing the boss/combo elements render without overlapping core gameplay?
- If host events changed, are payloads JSON-safe and does the event order remain understandable?
- If recap/debug changed, are existing Phase 3 and Phase 3B helper names and semantics preserved?

## 7. Architecture Self-Check Required Each Round

Every round must answer:

- Does the existing source-of-truth layer remain the source of truth?
- Did combat/combo logic stay out of UI and host adapters?
- Did UI avoid duplicating damage, combo, victory, fatal, score, rule, or difficulty semantics?
- Did host event payloads stay centralized and JSON-safe?
- Did DOM clicks and host `press(buttonId)` still converge through one decision path?
- Did the phase avoid pulling deferred roguelite, multi-boss, moving-button, Unity, 3D, or plugin-specific work into P4?
- Did validation guard the new combat/combo boundary instead of relying on manual inspection only?
- Were unrelated files, generated outputs, and user changes left alone?

## 8. Round Plan

Round budget: 10 total rounds.

- Rounds 1-7: main implementation.
- Rounds 8-9: buffer fixes for validation, UI fit, event-contract drift, or gameplay clarity.
- Round 10: final validation, report, push, and READY_FOR_CHECK routing.

Detailed plan:

1. Combat/combo design baseline: document boss HP, damage formula, combo states, event vocabulary, UI placement, and validation fixtures in `docs/phase-4-boss-combo-prototype-record.md`.
2. Pure combat and combo modules: implement boss state, damage calculation, combo transitions, victory state, and direct module tests/smokes inside the existing validator.
3. Runtime integration: wire combat/combo into the existing round lifecycle while preserving one input path and existing failure behavior.
4. Host event extension: add boss/combo event types and payload builders centrally, then emit combat/combo events through the Phase 3B host bridge.
5. UI rendering: add compact boss HP and combo/streak presentation with mobile-safe layout constraints.
6. Recap/debug support: expose combat/combo facts in debug previews, failure/victory recap, and host snapshots without duplicating logic.
7. Balance/readability pass: tune only P4 combat/combo constants and labels, not Phase 1 difficulty bands or Phase 2 rule copy.
8. Buffer: fix validation, event order, UI fit, or gameplay clarity regressions.
9. Buffer: fix remaining smoke, docs, or host-bridge compatibility issues.
10. Final report: create `docs/phase-4-final-report.md`, run the full validation matrix, commit, push, and report READY_FOR_CHECK.

Adjacent rounds may be combined if validation remains strong, but the executor must not skip the design record, pure-module validation, host event smoke, mobile layout check, final report, commit, or push.

## 9. Non-Scope

- No roguelite systems, shops, perks, loadouts, meta-progression, or risk-reward selection.
- No multiple bosses, boss roster, stage map, or campaign.
- No moving buttons, occlusion, spatial inspection, camera rules, or 3D interaction.
- No Unity, WebView plugin, native SDK, C# bridge, custom URL scheme, or engine build pipeline.
- No new dependency, framework migration, CDN removal, PWA, or i18n.
- No broad visual redesign or landing page.
- No Phase 1 difficulty curve retuning.
- No Phase 2 copywriting tone pass beyond concise boss/combo labels and recap facts.
- No change to best-record storage schema unless strictly required and documented with migration/validation.
- No edits to `origin/` or GitHub Pages workflow files.

## 10. PASS Criteria

Phase 4 can be READY_FOR_CHECK only when all are true:

- One playable boss-style prototype exists.
- Boss HP/progress and combo/streak are visible, compact, and usable on mobile layout.
- Combat and combo logic live in pure modules or a clearly bounded pure layer.
- Damage and combo formulas are documented and validated with deterministic fixtures.
- Round clear, boss damage, boss defeat, fatal click, timeout, reset, and repeated press paths are covered by validation or smoke tests.
- Host events cover combat started, combo changed, boss damaged, boss defeated, and final run result where applicable.
- Host events remain versioned and JSON-safe.
- DOM click input and host input still share the same gameplay decision path.
- Phase 1 difficulty values, Phase 2 rule semantics, Phase 3 best-run/failure recap behavior, and Phase 3B host API compatibility are preserved.
- `scripts/validate-structure.mjs` covers combat/combo/host-event boundaries.
- `docs/phase-4-boss-combo-prototype-record.md` and `docs/phase-4-final-report.md` exist.
- `TODO.md` and `docs/README.md` point to Phase 4 artifacts.
- The final implementation has been committed and pushed.

## 11. Required Validation Matrix

- `npm run validate`
- `npm run build`
- `.\StartLocalTest.ps1 -DryRun`
- `.\OpenOnlineTest.ps1 -DryRun`
- `git diff --check`
- Local HTTP smoke for a seeded debug URL
- Module import smoke for combat, combo, host event contract, and host bridge modules
- Fixed-seed combat/combo smoke for at least one safe press, one round clear, one boss damage event, one boss defeat/victory path, one fatal click, and one timeout
- Host event capture smoke covering combo changed, boss damaged, boss defeated, and run finished/victory result
- Host-driven input smoke proving `press(buttonId)` still reuses gameplay logic after combat/combo integration
- Existing seeded preview smoke for levels 1, 4, 8, 12, and 18
- Existing failure recap smoke for wrong-click and timeout
- Existing best-record helper smoke
- Mobile layout smoke for the boss/combo UI using whichever repeatable browser or static marker method is available; if no browser tool is available, document the limitation and keep real-device mobile smoke pending.

## 12. Final Report Template

Create `docs/phase-4-final-report.md` with:

- Summary
- Gameplay result: what the boss objective and combo system do
- Combat/combo architecture map
- Damage and combo formulas
- Host event additions
- UI/mobile layout notes
- Debug and recap support
- Architecture self-check summary
- Validation guardrails added
- Validation results
- Non-scope preserved
- Remaining pending evidence
- Commits and push result

## Return Message

When complete, send the planner thread a routing message with:

- `from: executor`
- `to: planner`
- `workspace: D:\WebProjects\ThatButton`
- `phase: Phase 4 - Boss And Combo Gameplay Prototype`
- `action: recheck`
- `guide: docs/phase-4-boss-combo-prototype-goal-guide.md`
- `status: READY_FOR_CHECK`
- final commit, push result, final report path, combat/combo record path, validation evidence, architecture self-check summary, and explicit pending evidence.
