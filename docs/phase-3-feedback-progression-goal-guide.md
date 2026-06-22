# Phase 3 - Feedback, Progression, And Retention Goal Guide

日期：2026-06-23T03:02:01.9400006+08:00
状态：给执行者使用的 Phase 3 开发指令文档
Owner role: executor
Planner thread: 019eefc3-8126-7271-b4b4-7dd9742c8545
Executor thread: 019ef06d-eb89-75c2-beb2-c695f9bcbedd
Round budget: 12 conversation rounds

## 0. 直接给执行者的 Goal Prompt

Execute Phase 3 for `D:\WebProjects\ThatButton`: add lightweight progression and learning feedback so a failed run gives the player a reason to retry and enough information to understand what happened. Preserve the Phase 1 difficulty curve and Phase 2 copy clarity.

The core deliverables are persistent best-run records, a useful post-death recap, and a small feedback/progression layer that remains compatible with the current single-file HTML prototype. Do not add boss fights, enemies, roguelite systems, moving buttons, Unity/3D work, or a broad gameplay expansion in this phase.

## 1. 必读上下文

- `TODO.md`
- `README.md`
- `docs/README.md`
- `docs/phase-0-playtest-record.md`
- `docs/phase-1-difficulty-curve-record.md`
- `docs/phase-1-final-report.md`
- `docs/phase-2-copywriting-tone-record.md`
- `docs/phase-2-final-report.md`
- `docs/phase-2-copywriting-tone-goal-guide.md`
- `index.html`
- `scripts/validate-static-site.mjs`
- `scripts/validate-structure.mjs`
- `StartLocalTest.ps1`
- `OpenOnlineTest.ps1`

## 2. 本阶段要完成什么

- Add a small `localStorage` backed best-run record, including at least best level and best score.
- Show current best-run context in a compact place that does not crowd the core clue and board.
- Add a post-death recap that helps the player learn: final level, score, failure reason, current fatal condition, actual forbidden/fatal button attributes, and how many safe buttons were left.
- Keep the recap clear but not overly revealing for the next run. The goal is learning from the current failure, not showing a full solver.
- Add a small run summary or improvement signal, such as "new best", "matched best", or "safe buttons cleared before failure".
- Evaluate a lightweight streak/combo feedback layer only if it can be implemented without changing Phase 1 difficulty, timers, board size, or rule unlocks. A visual/sound feedback streak is acceptable; a new balance system is not.
- Extend debug logging and preview helpers where useful so progression and failure recap state can be inspected during validation.
- Add or update validation checks for the best-record markers, recap markers, and Phase 1/2 compatibility.
- Create a Phase 3 feedback/progression record under `docs/` and a final report when complete.

## 3. 本阶段不做什么

- Do not change Phase 1 difficulty bands, timer values, time rewards, board sizes, fatal ranges, rule tiers, or clue semantics.
- Do not tune early-level timing unless new real mobile evidence is recorded during this phase. If no real device evidence is available, document timing-tuning as pending.
- Do not add boss, enemy, health bars, roguelite modifiers, run perks, shops, loadouts, moving buttons, occlusion, 3D, Unity, PWA, CDN removal, or i18n work.
- Do not build a full account/profile/save system. `localStorage` is enough for this prototype.
- Do not introduce package dependencies unless the existing zero-dependency approach becomes impossible.
- Do not rewrite the app into a framework or split files broadly.
- Do not edit `origin/` or GitHub Pages workflow files.

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

- 当前变化能否通过一个固定 seed、一个失败路径或一个重开路径复现？
- best record 的读、写、空状态、损坏状态、刷新后恢复是否被覆盖？
- wrong-click 和 timeout 两种失败 recap 是否都准确？
- 失败回顾是否能定位到当前规则、实际禁止按键和剩余安全键？
- 移动端是否仍不遮挡线索、棋盘、失败弹窗和重开按钮？

架构自检每轮至少回答：

- `generateRule` 是否仍是规则语义来源，recap 只消费已生成事实？
- `DIFFICULTY_BANDS` 和 Phase 1 seed/debug 行为是否保持兼容？
- Phase 2 的术语和规则文案是否保持清晰一致？
- best-record 存储是否被限制在轻量、可迁移的本地数据结构内？
- 是否避免把 Phase 4/6 的玩法或引擎迁移范围拉进本阶段？

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

Round budget: 12 total rounds.

1. Audit current score, failure, level-complete, reset, debug logging, and overlay flows. Define the best-record and recap data shape in a Phase 3 record.
2. Implement robust `localStorage` helpers for best level, best score, timestamp/version, empty state, and corrupted JSON fallback.
3. Add compact best-run UI and update it on start, level completion, failure, reset, and page load without crowding the board.
4. Build post-death recap data from existing generated facts: failure reason, rule text, forbidden IDs, button attributes, fatal count, safe remaining, level, score, and difficulty band.
5. Render the recap in the failure overlay with Phase 2 terminology and mobile-safe text wrapping.
6. Add improvement feedback such as new-best/matched-best and, if safe, a lightweight streak indicator that does not change timers or level balance.
7. Extend debug logging with best-record and recap fields needed for validation.
8. Update structure validation and seeded/runtime smoke checks for progression and recap markers.
9. Update README/TODO/docs index and write `docs/phase-3-feedback-progression-record.md`.
10. Run local HTTP/browser smoke for new run, wrong-click failure, timeout failure when feasible, reset, and persistence after reload.
11. Buffer for storage, UI fit, validation, or copy consistency repair.
12. Final validation: produce `docs/phase-3-final-report.md`, run the full validation matrix, commit, push, and report READY_FOR_CHECK to the planner.

执行者可以合并相邻轮次，但不能跳过 storage failure states, recap evidence, validation, docs, and final report.

## 7. PASS 标准

Phase 3 只有同时满足以下条件才可 READY_FOR_CHECK：

- Best level and best score persist through `localStorage` and survive page reload.
- Empty, existing, improved, non-improved, and corrupted stored-record states are handled safely.
- Failure overlay includes a clear recap for wrong-click and timeout failures.
- Recap lists the current fatal condition and actual forbidden button attributes without duplicating rule logic.
- Player-facing recap terms remain aligned with Phase 2: `致命条件`, `禁止按键`, `安全键`, `清空面板`.
- Phase 1 difficulty values and unlock structure are unchanged unless new evidence is documented and the change is explicitly justified.
- Optional streak/combo feedback, if implemented, is lightweight and does not become a new balance system.
- Debug logs expose enough recap/progression facts to validate a run.
- Mobile layout remains usable for best-record UI and failure recap.
- `docs/phase-3-feedback-progression-record.md` and `docs/phase-3-final-report.md` exist and list validation evidence plus pending real-device/human-playtest items.
- `TODO.md` and `docs/README.md` link to Phase 3 guide and outputs.
- Required validation passes, and the final implementation is committed and pushed.

## 8. 最终报告模板

在 `docs/phase-3-final-report.md` 中记录：

- Summary: best-record, recap, and retention feedback changes.
- Storage model: keys, schema/version, empty/corrupt handling, and update rules.
- Recap model: fields shown for wrong-click and timeout failures.
- Optional streak/combo decision: implemented or deferred, with reason.
- Debug evidence: fixed-seed or scripted evidence for level complete, failure, reset, and persistence.
- UI/mobile evidence: layout smoke for best-record display and failure overlay.
- Validation results: `npm run validate`, `npm run build`, launcher dry-runs, `git diff --check`, local HTTP/browser smoke, seeded debug smoke.
- Remaining pending evidence: iOS Safari, Android Chrome, human replay willingness, and whether recap improves retry behavior.
- Commits and push result.

## Return Message

When complete, send the planner thread a routing message with:

- `from: executor`
- `to: planner`
- `workspace: D:\WebProjects\ThatButton`
- `phase: Phase 3 - Feedback, Progression, And Retention`
- `action: recheck`
- `guide: docs/phase-3-feedback-progression-goal-guide.md`
- `status: READY_FOR_CHECK`
- final commit, push result, final report path, progression record path, validation evidence, and explicit pending evidence.
