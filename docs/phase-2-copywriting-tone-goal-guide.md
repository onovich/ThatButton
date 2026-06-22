# Phase 2 - Copywriting And Tone Pass Goal Guide

日期：2026-06-23T02:40:37.6234066+08:00
状态：给执行者使用的 Phase 2 开发指令文档
Owner role: executor
Planner thread: 019eefc3-8126-7271-b4b4-7dd9742c8545
Executor thread: 019ef06d-eb89-75c2-beb2-c695f9bcbedd
Round budget: 10 conversation rounds

## 0. 直接给执行者的 Goal Prompt

Execute Phase 2 for `D:\WebProjects\ThatButton`: review and polish all player-facing game copy so it has one consistent urgent terminal voice, removes accidental ambiguity, and preserves the intended logic challenge. The most important rule is clarity: players must understand that the clue describes fatal/forbidden buttons, and their action is to press every other safe button.

Do not flatten deliberate logical difficulty. A rule such as "color is not red" may remain hard because of the logic, but the surrounding wording must not accidentally suggest "only press the described buttons" or confuse fatal conditions with safe targets.

Keep Phase 1 difficulty behavior, seed/debug APIs, validation scripts, and GitHub Pages deployment intact.

## 1. 必读上下文

- `TODO.md`
- `README.md`
- `docs/README.md`
- `docs/phase-0-playtest-record.md`
- `docs/phase-0-final-report.md`
- `docs/phase-1-difficulty-curve-record.md`
- `docs/phase-1-final-report.md`
- `docs/phase-1-difficulty-curve-goal-guide.md`
- `index.html`
- `scripts/validate-static-site.mjs`
- `scripts/validate-structure.mjs`
- `StartLocalTest.ps1`
- `OpenOnlineTest.ps1`

## 2. 本阶段要完成什么

- Inventory all visible player-facing text in `index.html`, including start screen instructions, objective hints, rule text templates, failure copy, button labels, status labels, debug-adjacent visible text, and any restart/summary text.
- Define a compact copy style for the game: urgent terminal language, short sentences, consistent terms, and no accidental contradiction between clue and action.
- Standardize the core terms. Prefer concepts like `致命条件`, `致命键`, `禁止按键`, `安全键`, `清空面板`, and avoid switching between several names for the same thing.
- Rewrite generated rule templates so every rule clearly states that matching buttons are fatal or forbidden. If a rule uses logical negation, make the negation belong to the fatal condition, not to the player's action.
- Review all existing prompts for the specific ambiguity: "cannot press X" being misread as "can only press X". Replace any actually ambiguous phrasing with wording that separates `fatal condition` from `safe action`.
- Keep intended trickiness from rule logic, time pressure, and board reading. Do not preserve accidental difficulty from grammar, unclear references, or inconsistent tone.
- Add a small copy audit record under `docs/` that lists changed text categories, accepted intentional difficulty, and any unresolved human-playtest questions.
- Extend validation where practical to catch obvious regression markers, such as missing fatal-condition phrasing in rule templates or broken debug preview.
- Run seeded previews for early, mid, and late levels after copy changes to confirm rule text remains readable and deterministic.

## 3. 本阶段不做什么

- Do not rebalance Phase 1 difficulty bands unless a copy change exposes a small clue-length limit that must be adjusted.
- Do not add boss, enemy, combo, roguelite, high-score, recap, moving buttons, occlusion, Unity, 3D, PWA, or CDN removal work.
- Do not redesign the UI layout beyond small text-fitting fixes needed by the rewritten copy.
- Do not implement a full i18n system or translate the whole game into multiple languages.
- Do not change rule semantics to make hard rules easier. The task is clearer wording, not easier logic.
- Do not delete or rewrite `origin/`, GitHub Pages workflow files, or unrelated docs.

## 4. 每轮固定工作流

每轮回复必须包含：

- 本轮目标
- 本轮完成内容
- Debug 自检
- 架构自检
- 已运行验证命令与结果
- commit hash 与 push 结果
- 下一轮目标
- 是否消耗缓冲轮

推进规则：

- 验证失败：不得提交推送，不得进入下一轮。
- 验证通过但提交失败：不得进入下一轮。
- 提交成功但推送失败：不得进入下一轮。
- 推送成功：记录 commit hash 和远端分支，然后进入下一轮。

Debug 自检每轮至少回答：

- 当前文案问题能否定位到具体文本、规则模板、失败流程或状态标签？
- 成功、失败、超时、错按、重开、早期关卡、中期关卡、后期关卡是否仍有清晰提示？
- seed/debug preview 是否仍能复现相同规则文本？
- 如果 UI 文字变长，移动端是否仍不溢出或遮挡关键控件？
- 是否保留了有意的逻辑难度，同时移除了意外歧义？

架构自检每轮至少回答：

- `generateRule` 是否仍是规则语义和致命条件的来源？
- UI 文案是否只消费规则结果，而不是复制一套判断逻辑？
- Phase 1 的 `DIFFICULTY_BANDS`、debug API、seed 行为是否保持兼容？
- 本阶段是否避免把 Phase 3/4/6 的功能拉进来？
- 是否只 stage 本阶段相关文件，保留无关用户改动？

## 5. 每轮通过后提交推送工作流

优先使用仓库已有包装器：

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "<message>" -Paths "<comma-separated phase files>"
```

如果包装器不可用，使用：

```powershell
git status --short --branch
git diff --stat
git add <phase-relevant files>
git commit -m "<phase>: <round summary>"
git push
git status --short --branch
```

不要 stage 无关未跟踪文件。

## 6. 分轮安排

Round budget: 10 total rounds.

1. 文案盘点：列出所有玩家可见文本和生成规则模板，标记真歧义、风格不统一、语病、冗余、故意但合理的难点。
2. 建立术语与语气准则：确认核心词表、句式长度、规则提示格式、失败回顾格式，并写入 Phase 2 copy audit record。
3. 改写静态 UI 文案：开始页、目标提示、状态标签、失败弹窗、按钮文案和辅助提示，保持终端警报感但更短更清楚。
4. 改写动态规则模板：统一 `致命条件 -> 禁止按键 -> 安全行动` 的表达，覆盖 single、AND、NOT、OR、fallback 等模板。
5. UI fit pass：检查改写后的移动端文字长度、按钮/面板不溢出，并做必要的小型 CSS 或换行调整。
6. 验证与文档：更新结构验证或新增轻量文案验证，补齐 copy audit record、README/TODO/docs entry 的 Phase 2 状态。
7. Buffer: 修复 copy regression、规则模板长度、验证脚本或移动端布局问题。
8. Buffer: 修复 playtest/readability 风险或术语不一致。
9. Buffer: 修复 Pages/build/launcher 或文档入口问题。
10. Final validation: 运行完整验证矩阵，创建 Phase 2 final report，提交推送，并向 planner 汇报 READY_FOR_CHECK。

执行者可以合并相邻轮次，但不能跳过盘点、动态规则模板检查、seed preview、文档和最终报告。

## 7. PASS 标准

Phase 2 只有同时满足以下条件才可 READY_FOR_CHECK：

- 所有玩家可见文案已被盘点并处理，或明确记录为有意保留。
- 规则提示始终清楚表达：提示描述的是致命/禁止按键，玩家应按其它安全键。
- 真正会让玩家把 "不能按 X" 误解成 "只能按 X" 的措辞已移除或改写。
- 有意的逻辑难点仍存在，并在 copy audit record 中说明原因。
- 静态 UI、动态规则文本、失败回顾和目标提示使用一致术语与语气。
- Phase 1 难度曲线、seed/debug API 和结构验证保持通过。
- 移动端文字没有明显溢出、遮挡或破坏主操作区。
- `docs/phase-2-copywriting-tone-record.md` 与 `docs/phase-2-final-report.md` 已创建或更新。
- `TODO.md` 和 `docs/README.md` 指向 Phase 2 指南与报告。
- 必跑验证通过，或剩余人测/真机项被明确记录为 pending，不得宣称通过。
- 最终实现已提交并推送。

## 8. 最终报告模板

在 `docs/phase-2-final-report.md` 中记录：

- Summary: 本阶段改写了哪些文本类别。
- Copy style: 最终采用的术语表和语气准则。
- Ambiguity fixes: 明确列出修复了哪些真歧义。
- Intentional difficulty kept: 哪些逻辑难点保留，为什么不是文案歧义。
- Seeded preview evidence: 至少包含早期、中期、后期关卡的规则文本样例。
- UI/mobile evidence: 文字长度、换行、移动端布局或 smoke 结果。
- Validation results: `npm run validate`、`npm run build`、launcher dry-run、`git diff --check`、local HTTP/browser smoke、seeded preview smoke。
- Remaining pending evidence: 人类玩家是否仍误读提示、iOS/Android 真机、桌面人工点击 smoke。
- Commits and push result.

## Return Message

When complete, send the planner thread a routing message with:

- `from: executor`
- `to: planner`
- `workspace: D:\WebProjects\ThatButton`
- `phase: Phase 2 - Copywriting And Tone Pass`
- `action: recheck`
- `guide: docs/phase-2-copywriting-tone-goal-guide.md`
- `status: READY_FOR_CHECK`
- final commit, push result, final report path, copy audit record path, validation evidence, and explicit pending evidence.
