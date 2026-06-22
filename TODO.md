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
Status: Implemented by executor; ready for CheckAndGoal acceptance. See [docs/phase-2-final-report.md](docs/phase-2-final-report.md) and [docs/phase-2-copywriting-tone-record.md](docs/phase-2-copywriting-tone-record.md).

- Rewrite all visible copy into one consistent voice: urgent terminal instructions, clear failure feedback, and concise rule language. Done.
- Remove awkward phrasing, grammatical issues, redundant warnings, and overly tangled clue sentences. Done.
- Preserve intended challenge from logic rules, not from accidental ambiguity or uneven wording. Done; no Phase 1 difficulty parameters changed.
- Playtest the updated first 10 levels and revise any clue that still reads like "press this" instead of "avoid this condition". Pending real-player follow-up after acceptance.

## Phase 3 - Feedback, Progression, And Retention

Estimated conversation rounds: 1-3

- Add a lightweight high-score record with `localStorage`, including best level and best score.
- Add a post-death recap that lists the actual fatal button attributes for learning without making the next run too easy.
- Tune early-level timing after mobile testing; touch input is slower than mouse, so the timer curve may need a mobile buffer.
- Consider combo or streak rewards to make correct rapid decisions feel more expressive than simple survival.

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

Build phases in this order: Phase 0, Phase 1, Phase 2, Phase 3, then choose between Phase 4 and Phase 6 depending on whether the next milestone is a better web prototype or engine migration prep.
