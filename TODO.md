# ThatButton Roadmap

## Phase 0 - Baseline And Playtest Criteria

Estimated conversation rounds: 1-2
Goal guide: [docs/phase-0-baseline-playtest-goal-guide.md](docs/phase-0-baseline-playtest-goal-guide.md)
Status: Baseline implementation completed on 2026-06-23; see [docs/phase-0-final-report.md](docs/phase-0-final-report.md) and [docs/phase-0-playtest-record.md](docs/phase-0-playtest-record.md).

- Run a real-device pass on iOS Safari and Android Chrome, focusing on first tap audio unlock, button hit accuracy, safe-area spacing, and whether the no-scroll game layout still fits short screens.
- Record where players usually fail, how many levels they willingly retry, and which clues make them ask whether they should press or avoid the described buttons.
- Define target early-session pacing, such as "first 5 levels are learnable", "first 10 levels feel winnable", and "difficulty ramps after the player has already had one good run".
- Add deterministic debug seeds for rule generation so confusing rounds can be reproduced during design review.

## Phase 1 - Difficulty Curve And Level Structure

Estimated conversation rounds: 2-4
Goal guide: [docs/phase-1-difficulty-curve-goal-guide.md](docs/phase-1-difficulty-curve-goal-guide.md)
Status: Accepted by CheckAndGoal; see [docs/phase-1-final-report.md](docs/phase-1-final-report.md) and [docs/phase-1-difficulty-curve-record.md](docs/phase-1-difficulty-curve-record.md).

- Rework the difficulty curve so the game does not become punishing too quickly or make players abandon early.
- Increase playable level count by pacing difficulty across a longer sequence instead of mostly compressing the timer.
- Introduce multi-dimensional difficulty parameters: grid size, fatal-button count, clue complexity, clue length, time limit, time reward, button readability, and feedback intensity.
- Start with fewer buttons in early levels, then expand toward the current 3x3 board and later variants.
- Keep moving buttons or shifting hazards as future difficulty dimensions, but prototype them only after the basic curve is stable.

## Phase 2 - Copywriting And Tone Pass

Estimated conversation rounds: 1-2
Goal guide: [docs/phase-2-copywriting-tone-goal-guide.md](docs/phase-2-copywriting-tone-goal-guide.md)
Status: Accepted by CheckAndGoal; see [docs/phase-2-final-report.md](docs/phase-2-final-report.md) and [docs/phase-2-copywriting-tone-record.md](docs/phase-2-copywriting-tone-record.md).

- Rewrite all visible copy into one consistent voice: urgent terminal instructions, clear failure feedback, and concise rule language. Done.
- Remove awkward phrasing, grammatical issues, redundant warnings, and overly tangled clue sentences. Done.
- Preserve intended challenge from logic rules, not from accidental ambiguity or uneven wording. Done; no Phase 1 difficulty parameters changed.
- Playtest the updated first 10 levels and revise any clue that still reads like "press this" instead of "avoid this condition". Pending real-player follow-up after acceptance.

## Phase 3 - Feedback, Progression, And Retention

Estimated conversation rounds: 1-3
Goal guide: [docs/phase-3-feedback-progression-goal-guide.md](docs/phase-3-feedback-progression-goal-guide.md)
Status: Accepted by CheckAndGoal; see [docs/phase-3-final-report.md](docs/phase-3-final-report.md) and [docs/phase-3-feedback-progression-record.md](docs/phase-3-feedback-progression-record.md).

- Add a lightweight high-score record with `localStorage`, including best level and best score. Implemented as a small versioned local best-run record.
- Add a post-death recap that lists the actual fatal button attributes for learning without making the next run too easy. Implemented with current fatal condition, actual forbidden buttons, safe-key progress, and failure reason.
- Tune early-level timing after mobile testing; touch input is slower than mouse, so the timer curve may need a mobile buffer. Deferred pending real iOS/Android evidence; no Phase 1 timing values changed.
- Consider combo or streak rewards to make correct rapid decisions feel more expressive than simple survival. Deferred; Phase 3 uses best-run and improvement feedback without adding a balance system.

## Phase 3A - Architecture Regularization And Guardrails

Estimated conversation rounds: 3-5
Goal guide: [docs/phase-3a-architecture-regularization-goal-guide.md](docs/phase-3a-architecture-regularization-goal-guide.md)
Status: Inserted after Phase 3 PASS; dispatched before Phase 4 gameplay expansion.
Completion: Implemented in Phase 3A; see [docs/phase-3a-final-report.md](docs/phase-3a-final-report.md) and [docs/phase-3a-architecture-regularization-record.md](docs/phase-3a-architecture-regularization-record.md).

- Split the current single-file prototype into strict zero-dependency ES modules before adding broader gameplay systems. Done.
- Enforce code standards and architecture boundaries: core logic must not touch DOM/window/localStorage, UI must not duplicate rule semantics, and `main.js` must stay orchestration-only. Done through module boundaries and `npm run validate` guardrails.
- Make architecture self-checks part of every execution round, with explicit answers before validation, commit, and push. Done for Phase 3A execution.
- Preserve Phase 1 difficulty, Phase 2 copy semantics, Phase 3 best-run/recap behavior, seed/debug APIs, and GitHub Pages behavior. Done; fixed-seed and helper smokes cover the preserved behavior.
- Update validation so architecture boundaries and fixed-seed behavior equivalence are protected by repeatable checks. Done in `scripts/validate-structure.mjs`.

## Phase 3B - Host Bridge Preparation

Estimated conversation rounds: 2-3
Goal guide: [docs/phase-3b-host-bridge-preparation-goal-guide.md](docs/phase-3b-host-bridge-preparation-goal-guide.md)
Status: Planned after Phase 3A PASS; prepares future Unity/WebView embedding without integrating any engine or WebView plugin yet.
Implementation record: [docs/phase-3b-host-bridge-preparation-record.md](docs/phase-3b-host-bridge-preparation-record.md).
Completion: Implemented in Phase 3B; see [docs/phase-3b-final-report.md](docs/phase-3b-final-report.md).

- Keep ThatButton independently playable as an HTML game while preparing a stable host-facing boundary. Implemented; normal browser play remains the default path.
- Define plugin-neutral input and output contracts: `start`, `reset`, `press(buttonId)`, `getSnapshot()`, and versioned JSON events for run/round/button/result states. Implemented with pure host event builders and app boundary APIs.
- Add a no-op/browser-safe Host Bridge so normal browser and GitHub Pages play continue unchanged. Implemented with no-op, capture, and optional browser `CustomEvent` adapter modes.
- Ensure DOM clicks and future host-driven input reuse one gameplay decision path. Implemented through shared `pressButton(...)` orchestration.
- Add validation that protects JSON-safe payloads, host bridge boundaries, and Phase 3A architecture constraints. Implemented in `scripts/validate-structure.mjs`.
- Defer actual Unity, WebView plugin selection, native bridge code, 3D rendering, and gameplay expansion. Preserved.

## Phase 4 - Gameplay Expansion Prototypes

Estimated conversation rounds: 6-10
Goal guide: [docs/phase-4-boss-combo-prototype-goal-guide.md](docs/phase-4-boss-combo-prototype-goal-guide.md)
Status: Implemented in Phase 4 as a focused boss/combo prototype; see [docs/phase-4-boss-combo-prototype-record.md](docs/phase-4-boss-combo-prototype-record.md) and [docs/phase-4-final-report.md](docs/phase-4-final-report.md).

- Explore whether the core "avoid fatal conditions, press safe targets" loop can power enemy or boss encounters. Implemented as one `REACTOR WARDEN` encounter.
- Prototype a boss-health version where solving rounds damages an enemy, replacing or supplementing the plain countdown presentation. Implemented with visible HP and victory recap.
- Add a conservative combo/streak layer that rewards clean comprehension and round clears without encouraging blind tapping. Implemented as capped combo damage bonus only.
- Emit combat/combo result events through the Phase 3B Host Bridge so future embedding can observe the prototype. Implemented with JSON-safe combat/combo events.
- Defer roguelite elements until the boss/combo loop proves useful; do not add perks, shops, loadouts, or meta-progression in this phase.
- Keep Unity, WebView plugin, native bridge, 3D, moving-button, and spatial interaction work deferred.

## Phase 5 - Demo Stability And Distribution

Estimated conversation rounds: 4-6
Goal guide: [docs/phase-5-demo-stability-distribution-goal-guide.md](docs/phase-5-demo-stability-distribution-goal-guide.md)
Status: Implemented in Phase 5 as distribution hardening; see [docs/phase-5-demo-stability-distribution-record.md](docs/phase-5-demo-stability-distribution-record.md) and [docs/phase-5-final-report.md](docs/phase-5-final-report.md).

- Replace CDN-loaded Tailwind and Google Fonts with local CSS or system-font fallbacks so local demos and GitHub Pages do not rely on runtime third-party resources. Done.
- Keep GitHub Pages validation healthy after asset changes. Done; source and `dist/` runtime files now have external URL guardrails.
- Make an explicit PWA/manifest decision. Done; manifest/PWA work is deferred and no service worker was added.

## Phase 6 - RPG Combat Loop V1

Estimated conversation rounds: 16
Goal guide: [docs/phase-6-rpg-combat-loop-goal-guide.md](docs/phase-6-rpg-combat-loop-goal-guide.md)
Status: Accepted by CheckAndGoal; see [docs/phase-6-rpg-combat-loop-record.md](docs/phase-6-rpg-combat-loop-record.md) and [docs/phase-6-final-report.md](docs/phase-6-final-report.md).

- Fix combo semantics first: the first safe press starts a chain silently, `COMBO x2` appears only on the second chained safe press, and later chained presses increment the visible count by one. Done.
- Add player HP so a wrong press damages the player and breaks combo instead of ending the run immediately; HP reaching zero ends the run. Done.
- Add enemy scaling: each enemy has stable attack while alive, and the next enemy has higher HP and attack. Done.
- Add a combo time window and show it as a small contrasting segment on the existing timer/pressure bar. Done.
- Defeating an enemy presents three deterministic upgrade choices before the next enemy starts. Done.
- Include upgrades for longer combo window, more max/player HP, longer decision time, higher base attack, and higher combo reward. Done.
- Strengthen combo particles, floating text, vibration/body impact, and damage feedback while keeping mobile layout readable. Done.
- Expand debug previews, host events, and validation smokes for player HP, enemy state, combo expiry, upgrades, and JSON-safe payloads. Done.
- Keep Unity/WebView/native engine integration deferred; Phase 6 remains an HTML-first gameplay expansion with host-contract preparation. Preserved.

## Phase 6A - Combat Feel And Balance Calibration

Estimated conversation rounds: 8
Goal guide: [docs/phase-6a-combat-feel-balance-goal-guide.md](docs/phase-6a-combat-feel-balance-goal-guide.md)
Status: Accepted by CheckAndGoal; see [docs/phase-6a-combat-feel-balance-record.md](docs/phase-6a-combat-feel-balance-record.md) and [docs/phase-6a-final-report.md](docs/phase-6a-final-report.md).

- Record fixed-seed baseline metrics for first enemy defeat timing, first upgrade timing, wrong-press survivability, combo-window forgiveness, and upgrade cadence.
- Tune only existing Phase 6 numbers when evidence supports it: player HP, enemy HP/attack progression, base attack, combo window, combo reward, upgrade values, and decision-time modifiers.
- Polish existing feedback tiers for no-combo success, chain start, `COMBO x2`, higher combos, wrong press, enemy damage, and upgrade selection.
- Keep player HUD separate from enemy identity and preserve mobile/short-desktop layout fit.
- Add or refine validation smokes for balance previews, feedback markers, upgrade determinism, wrong-press survival/death, combo expiry, and desktop/mobile geometry.
- Record real-device and human playtest items explicitly as passed or pending; do not claim evidence that was not gathered.
- Do not add moving buttons, spatial hazards, Unity/WebView integration, roguelite meta-progression, new dependencies, or framework work.

## Phase 7 - Advanced Hazards And Spatial Interaction

Estimated conversation rounds: 16
Goal guide: [docs/phase-7-advanced-hazards-spatial-interaction-goal-guide.md](docs/phase-7-advanced-hazards-spatial-interaction-goal-guide.md)
Status: Implementation in progress; see [docs/phase-7-advanced-hazards-spatial-interaction-record.md](docs/phase-7-advanced-hazards-spatial-interaction-record.md). Final report target: [docs/phase-7-final-report.md](docs/phase-7-final-report.md).

- Prototype moving buttons and temporary visual interference as separate difficulty axes after the first learnable RPG loop, not in the opening onboarding sequence. V1 implemented; pending human readability playtest.
- Keep the first enemy / first upgrade cadence from Phase 6A readable; do not stack motion, interference, short timers, and complex clues too early. Current schedule keeps early levels hazard-free and delays interference beyond first movement exposure.
- Add deterministic hazard schedules, debug previews, host/debug facts, and validation smokes before treating hazards as a permanent design direction. Implemented through core hazard helpers, debug previews, structure validation, and host JSON-safety smoke.
- Preserve Phase 6A combat feel: bottom player HUD, button-to-enemy attack/combo tracers, readable combo/wrong-press feedback, and mobile layout fit. Guarded by validation smokes; manual device pass remains pending.
- Prepare only lightweight 2D spatial grouping facts for future engine consumption; do not add Unity/WebView/native integration or real 3D rendering in this phase. Implemented as board zone/lane/sector data only.

Phase 7 playtest questions still pending:

- Does the Level 18+ moving-button drift feel readable and fair on touch devices?
- Does Level 24+ interference add tension without obscuring rule text, player HUD, combo feedback, or pressed-button tracers?
- Do moving-button click targets feel aligned with the visible button position on iOS Safari and Android Chrome?
- Does hazard stacking after the first learnable RPG loop make later runs more interesting, or should motion/interference unlock even later?

## Current Recommendation

Finish Phase 7 final validation and planner acceptance before engine embedding. Keep engine embedding as a later milestone that consumes the Phase 3B Host Bridge, Phase 6 host/debug contracts, and Phase 7 hazard facts only after the HTML gameplay loop proves the hazards are fun and readable.
