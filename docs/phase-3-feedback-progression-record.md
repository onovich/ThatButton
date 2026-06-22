# Phase 3 Feedback, Progression, And Retention Record

> Status: In progress
> Guide: `docs/phase-3-feedback-progression-goal-guide.md`
> Phase scope: add best-run persistence, post-death learning recap, and lightweight retry feedback without changing Phase 1 difficulty or Phase 2 rule semantics.

## Round 1 Flow Audit

| Surface | Current source | Phase 3 use |
| --- | --- | --- |
| Score | `gameState.score`, +10 on each safe button in `handleBtnClick`. | Persist best score and compare current run against it. |
| Level progression | `levelComplete()` records debug, increments `gameState.level`, then starts the next round. | Track highest reached level and safe clears without changing timers or rewards. |
| Failure path | `triggerGameOver(id, element)` handles wrong-click and timeout failures. | Build recap from the already-generated round facts at the moment of failure. |
| Current rule | `gameState.currentRuleText`, created by `generateRule`. | Show as `致命条件` recap; do not reinterpret the rule. |
| Forbidden buttons | `gameState.forbiddenIds`, created by `generateRule`. | List actual matching buttons by consuming existing button data. |
| Safe remaining | `gameState.safeKeysRemaining`, decremented only on safe clicks. | Show how close the player was to clearing the panel. |
| Button facts | `gameState.buttons` plus `getButtonSummary(button)`. | Render compact forbidden-button attributes for recap. |
| Debug logs | `recordDebugEvent(type, details)` merges `getRoundSnapshot()`. | Extend with best-record and recap fields for validation. |
| Reset | `resetGame()` delegates to `startGame()`. | Reload current best record and clear run-local feedback state. |
| Overlay | `#game-over-screen`, `#death-reason`, `#final-level`. | Add a compact recap block under failure reason, keeping the restart button visible. |

## Storage Model

Use one local key:

`thatbutton.bestRun.v1`

Schema:

```json
{
  "version": 1,
  "bestLevel": 1,
  "bestScore": 0,
  "updatedAt": "2026-06-23T00:00:00.000Z"
}
```

Rules:

- Empty storage returns the default record and is shown as `BEST -- / 0`.
- Corrupted JSON, wrong version, or invalid numeric fields fall back to the default record without blocking play.
- A run improves the record when final level is higher than `bestLevel`, or when level ties and score is higher than `bestScore`.
- A run matches the best when both final level and score equal the existing record.
- The best record is updated on failure, after final level and score are known.
- Storage is local-only and intentionally small; no account, profile, cloud sync, migration, or save-slot system.

## Recap Model

Build recap only from generated facts already present in `gameState`:

- failure reason: `wrong_click` or `timeout`
- final level and score
- difficulty band and grid size
- current `致命条件` text
- actual `禁止按键` list derived from `gameState.forbiddenIds` and `gameState.buttons`
- pressed button summary for wrong-click failure
- safe buttons remaining at failure
- improvement status: `new_best`, `matched_best`, or `below_best`

Button labels should stay compact:

`红色 三角形 04`

The recap should not expose future-round data, solver steps, hidden odds, or alternate generated rules.

## Lightweight Feedback Decision

Allowed:

- A compact best-run strip in the header.
- A failure-overlay improvement signal such as `NEW BEST`, `MATCHED BEST`, or `BEST Lx / score`.
- A simple safe-click streak indicator that resets on each run and does not affect timers, scores, rewards, board size, or rule unlocks.

Deferred:

- Combo multipliers, score bonuses, perks, shops, loadouts, achievements, profiles, or balance systems.

## Validation Plan

- Extend structure validation with markers for storage key, best-run UI, recap UI, and debug helpers.
- Run seeded/debug smokes for:
  - empty storage default
  - corrupted storage fallback
  - improved and non-improved records
  - wrong-click recap
  - timeout recap
  - reset and reload/persistence
- Keep existing Phase 1 preview checks and Phase 2 copy checks passing.
- Run the baseline matrix: `npm run validate`, `npm run build`, `StartLocalTest.ps1 -DryRun`, `OpenOnlineTest.ps1 -DryRun`, and `git diff --check`.

## Round Evidence

- Round 1 audited score, level-complete, failure, reset, overlay, seed/debug preview, and debug logging flows in `index.html`.
- Round 1 confirmed `generateRule` remains the source of rule semantics and recap will consume `currentRuleText`, `forbiddenIds`, and button facts.
- Round 1 made no runtime, difficulty, timer, reward, board-size, rule-tier, or copy-semantics changes.
- Round 2 added `BEST_RECORD_KEY`, schema versioning, default clone/normalization, guarded `localStorage` access, JSON corruption fallback, save helpers, and run-vs-best comparison helpers.
- Round 2 exposed best-record debug helpers for load, save, reset, inspect, and comparison validation.
- Round 2 did not render UI or update records on failure yet; those are intentionally left for later rounds.
- Round 2 storage smoke in a VM with fake `localStorage`: empty -> `empty`, malformed JSON -> `corrupt`, saved L5/120 -> reload `loaded`, comparisons returned `new_best`, `matched_best`, and `below_best`.
- Round 3 added a compact `BEST: -- / 0` status strip under the existing top status row, with short storage notes for corrupt/unavailable states.
- Round 3 reloads best-record state on start/reset and refreshes the strip from debug save/reset helpers.
- Round 3 fake-DOM smoke confirmed the strip renders default `-- / 0`, debug-saved `L7 / 210 SAVED`, and reset default values.
