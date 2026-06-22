# Phase 0 Final Report

Date: 2026-06-23
Phase: Phase 0 - Baseline And Playtest Criteria
Guide: `docs/phase-0-baseline-playtest-goal-guide.md`

## Completed

- Created `docs/phase-0-playtest-record.md` as the Phase 0 source of truth for first 10-level playtest criteria, test surfaces, session fields, round fields, failure reasons, and later Phase 1/Phase 2 inputs.
- Added deterministic debug seed support through `?seed=<label>` while preserving normal browser randomness when no seed is present.
- Added `window.__THAT_BUTTON_DEBUG__.previewSeededLevel(seed, level)` for reproducible design review. The helper now simulates the seeded run sequence through the requested level.
- Added structured in-memory debug logging for `round_start`, `level_complete`, and `failure` events. Debug console output is gated behind `?debug=1`, so ordinary player UI remains unchanged.
- Recorded local validation, launcher dry-runs, HTTP smoke evidence, Pages workflow file evidence, and pending real-device/manual browser checks.
- Preserved `origin/` source notes unchanged.

## Validation

- `npm run validate`: PASS
- `npm run build`: PASS
- `powershell -ExecutionPolicy Bypass -File .\StartLocalTest.ps1 -DryRun`: PASS
- `powershell -ExecutionPolicy Bypass -File .\OpenOnlineTest.ps1 -DryRun`: PASS
- `git diff --check`: PASS
- Local HTTP smoke at `http://127.0.0.1:5175/?seed=phase0-smoke&debug=1`: PASS
- Seeded generation reproduction check: PASS
- Seeded level sequence preview check: PASS
- `git status --short -- origin .github\workflows\deploy.yml`: PASS, no changes under `origin/` or the Pages workflow file.
- GitHub Pages workflow: Phase 0 implementation pushes through `0122ab9` reported `completed success` through GitHub CLI. The final report push will trigger one additional Pages run for checker confirmation.

## Debug Self-Check

- Current changes can be reproduced with a fixed seed and a specific level using the debug preview helper.
- Failure records can be localized to rule generation, timer pressure, wrong click, input miss, layout issue, or copy ambiguity through the playtest record fields.
- Success, failure, timeout, wrong click, absent seed, specified seed, debug logging, launcher dry-run, and local HTTP states were covered by validation or documentation.
- UI behavior for ordinary players remains unchanged unless `seed` or `debug` query parameters are supplied.
- No persistent storage was introduced, so debug records do not pollute future ordinary sessions.

## Architecture Self-Check

- `generateRule` remains the rule source of truth; debug code records generated facts instead of duplicating rule semantics in UI.
- Seeded randomness is isolated behind the random utility layer used by generation.
- Debug seed and logging are query/API driven and decoupled from normal player UI.
- Phase 0 stayed within baseline, reproducibility, and test evidence scope. It did not rewrite the difficulty curve or add deferred gameplay systems.
- No new framework, package dependency, build chain, Unity/3D migration, boss, enemy, combo, or roguelite scope was introduced.
- `origin/` was left untouched.

## Commits And Pushes

- Round 1: `47c34e5` - Phase 0 playtest baseline record.
- Round 2: `5b4739f` - deterministic debug seeds.
- Round 3: `8d6df35` - debug playtest logging.
- Round 4: `da60c6d` - smoke evidence record.
- Round 5: `0122ab9` - seed preview aligned with run sequence.
- Round 6: final report/docs commit is recorded in the executor completion message after push.

All round commits above were pushed to `origin/main`.

## Remaining Risks

- iOS Safari and Android Chrome real-device testing is still pending; audio unlock, touch latency, safe-area behavior, and restart must be checked on physical devices.
- Desktop browser click smoke is still pending human/browser automation because Playwright is not installed in this workspace.
- Human playtest evidence for first 5-level learnability, first 10-level winnability, retry willingness, and copy ambiguity has not yet been collected.
- The final report push triggers a new GitHub Pages workflow run; checker should confirm that run finishes successfully.

## Recommended Check

- Use `docs/phase-0-playtest-record.md` for planner/checker validation.
- Treat Phase 0 as ready for CheckAndGoal review after the final report commit is pushed and the final Pages workflow run is checked.
- If accepted, Phase 1 should consume the recorded fields rather than rewrite the curve from guesses.
