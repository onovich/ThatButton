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

- Keep ThatButton independently playable as an HTML game while preparing a stable host-facing boundary.
- Define plugin-neutral input and output contracts: `start`, `reset`, `press(buttonId)`, `getSnapshot()`, and versioned JSON events for run/round/button/result states.
- Add a no-op/browser-safe Host Bridge so normal browser and GitHub Pages play continue unchanged.
- Ensure DOM clicks and future host-driven input reuse one gameplay decision path.
- Add validation that protects JSON-safe payloads, host bridge boundaries, and Phase 3A architecture constraints.
- Defer actual Unity, WebView plugin selection, native bridge code, 3D rendering, and gameplay expansion.

## Phase 4 - Gameplay Expansion Prototypes

Estimated conversation rounds: 3-6

- Explore whether the core "avoid fatal conditions, press safe targets" loop can power enemy or boss encounters.
- Prototype a boss-health version where solving rounds damages an enemy, replacing or supplementing the plain countdown presentation.
- Test combo systems, special rounds, and pressure spikes carefully so they deepen the loop without making the rules noisy.
- Consider roguelite elements only after the base loop, difficulty curve, and readability are stable; candidate elements include run modifiers, temporary perks, escalating hazards, or selectable risk-reward rules.
- Decide whether these expansions belong in the HTML prototype, a separate branch, or a later engine version.

## Phase 5 - Demo Stability And Distribution

Estimated conversation rounds: 1-2

- Replace CDN-loaded Tailwind and Google Fonts with local CSS or system-font fallbacks if offline GameJam/demo use matters.
- Keep GitHub Pages validation healthy after asset changes.
- Consider a PWA manifest and install icon once the gameplay loop is stable.

## Phase 6 - Engine Embedding Preparation

Estimated conversation rounds: 2-4

- Prepare for possible Unity or other 3D engine embedding by separating game rules from DOM rendering.
- Extract data contracts for board state, button attributes, clue text, round result, score, combo, and failure reason.
- Define an input/output adapter layer so the same core rules can drive HTML buttons now and 3D interactable objects later.
- Identify which effects are game-state events versus presentation-only effects, such as shake, scanlines, sounds, health bars, and boss attacks.
- Keep the HTML version as the fast design prototype while making future engine migration cheaper.

## Phase 7 - Advanced Hazards And Spatial Interaction

Estimated conversation rounds: 2-5

- Prototype moving buttons, temporary occlusion, spatial grouping, or camera/observation constraints only after Phase 1 proves the baseline difficulty curve.
- If moving objects are introduced, tune movement as a separate difficulty axis instead of combining it immediately with short timers and complex clues.
- For a future 3D version, explore whether the player should inspect panels in space, physically move between controls, or read clues from diegetic displays.

## Current Recommendation

Build phases in this order: Phase 0, Phase 1, Phase 2, Phase 3, Phase 3A, Phase 3B, then Phase 4 for gameplay expansion. Phase 6 can stay narrower later: consume the Phase 3B host bridge and only add real Unity/WebView integration when there is an engine milestone.
