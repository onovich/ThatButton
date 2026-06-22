# Phase 2 Copywriting And Tone Record

> Status: In progress  
> Guide: `docs/phase-2-copywriting-tone-goal-guide.md`  
> Phase scope: polish player-facing copy and rule wording without changing the Phase 1 difficulty curve.

## Copy Goals

- Make every rule read as a fatal-condition warning, not as an instruction to press the described buttons.
- Keep the intended logic challenge: AND, OR, NOT, parity, exact-number, and time pressure remain part of play.
- Use the same action vocabulary from start screen through generated rules and failure feedback.
- Preserve the terminal/core-meltdown tone, but prefer clarity whenever flavor competes with input safety.

## Terminology

| Term | Use |
| --- | --- |
| `致命条件` | The rule that describes which buttons will fail the run. |
| `致命键` | A concise label for any button matching the fatal condition. |
| `禁止按键` | The clearer operational term for matching buttons; used in rules and failure copy. |
| `安全键` | Buttons that do not match the fatal condition and should be pressed. |
| `清空面板` | The level objective: press every safe button until none remain. |

Preferred generated-rule shape:

`致命条件：...。匹配者是禁止按键；按其它安全键。`

This keeps the predicate and the player action in a stable order. The predicate may still contain negation or alternatives when the level band allows it.

## Inventory

| Surface | Current state | Phase 2 handling |
| --- | --- | --- |
| Page title | `核心熔毁：那个键` names the premise. | Keep; it is brand/flavor, not instructional. |
| Top status labels | `SYS.LEVEL`, `CRITICAL OVR`, `SCORE`. | Keep short terminal tone unless fit issues appear. |
| Terminal header | `DIRECTIVE_RECV // ID: 89X_A`. | Can be clarified if needed, but not a safety issue. |
| Terminal hint | Says to only press safe keys and clear the board. | Align with `避开禁止按键 / 清空面板`. |
| Start title/subtitle | `别按那个键`, `CORE MELTDOWN`. | Keep the hook, clarify rules below it. |
| Start rules | Explains fatal-key traits, forbidden buttons, safe keys, and pressure release. | Rewrite around `致命条件`, `禁止按键`, `安全键`, `清空面板`. |
| Start button | `启动稳定程序`. | Consider a more action-specific command. |
| Generated single-axis rules | Include fatal condition plus `目标：按下其它安全键`. | Replace with the shared action sentence. |
| Generated compound / NOT / OR rules | State the fatal condition but omit the action sentence. | Add the shared action sentence without changing predicates. |
| Fallback rule | Uses `备用判定` and omits safe-action guidance. | Rewrite as fallback fatal condition plus shared action sentence. |
| Timeout failure | Uses pressure-release language. | Tie to failure to clear the panel in time. |
| Wrong-click failure | Says the player pressed the fatal key and echoes the rule. | Use `禁止按键` and label the echoed rule as a fatal-condition replay. |
| Reset button | `重新启动反应堆`. | Keep or shorten if failure overlay fit needs help. |

## Intentional Difficulty To Retain

- Negation in `颜色不是...且形状为...` remains a late-rule reading challenge.
- OR rules remain alternatives that can mark multiple buttons as fatal.
- Exact number/color combinations stay in pressure bands.
- The player still wins by clearing safe buttons, not by identifying only one forbidden button.

## Issues Found

- The early rule templates mention the safe action, while compound, NOT, OR, and fallback templates do not. This unevenness makes later rules easier to misread under pressure.
- `目标：按下其它安全键` is correct but weakly tied to the fatal-condition sentence; `匹配者是禁止按键；按其它安全键` is more explicit.
- The start screen mixes `致命键`, `禁止按键`, and pressure-release phrasing before defining `致命条件`.
- Failure copy uses `那个致命键`, which fits the title but is less actionable than `禁止按键`.

## Round Evidence

- Round 1 inventory completed against `index.html` static UI, generated rule templates, fallback rule, and failure copy.
- No Phase 1 difficulty or level-structure changes made in this round.
- Round 2 static UI copy updated to define `致命条件`, `禁止按键`, `安全键`, and `清空面板` before play starts.
- Round 2 generated rule templates now share `致命条件：...。匹配者是禁止按键；按其他安全键。`
- Round 2 failure copy now reports timeout as uncleared-panel failure and wrong click as `禁止按键`.
- New generated clue samples stayed within existing `maxClueChars`; no difficulty band, timer, button-count, or rule unlock changes were required.
