# Phase 3A - Architecture Regularization And Guardrails Goal Guide

日期：2026-06-23T03:38:42.6406390+08:00
状态：给执行者使用的 Phase 3A 架构规整指令文档
Owner role: executor
Planner thread: 019eefc3-8126-7271-b4b4-7dd9742c8545
Executor thread: 019ef06d-eb89-75c2-beb2-c695f9bcbedd
Round budget: 12 conversation rounds

## 0. 直接给执行者的 Goal Prompt

Execute Phase 3A for `D:\WebProjects\ThatButton`: regularize the current single-file prototype architecture before Phase 4 gameplay expansion. The goal is to prevent future feature work from turning the project into an unmaintainable pile of cross-coupled state, DOM, rules, storage, and debug logic.

Refactor conservatively. Preserve player-visible behavior, Phase 1 difficulty, Phase 2 copy semantics, Phase 3 best-run/recap behavior, seed/debug APIs, validation commands, and GitHub Pages deployment. Do not add gameplay features in this phase.

The expected direction is a zero-dependency ES module structure: `index.html` keeps markup/CSS and loads a small module entrypoint, while rules, difficulty, random/seed, storage, debug, level generation, rendering, audio, and app orchestration move into clearly bounded modules under `src/`.

## 1. 必读上下文

- `TODO.md`
- `README.md`
- `docs/README.md`
- `docs/phase-1-difficulty-curve-record.md`
- `docs/phase-2-copywriting-tone-record.md`
- `docs/phase-3-feedback-progression-record.md`
- `docs/phase-3-final-report.md`
- `docs/phase-3-feedback-progression-goal-guide.md`
- `index.html`
- `scripts/validate-static-site.mjs`
- `scripts/validate-structure.mjs`
- `StartLocalTest.ps1`
- `OpenOnlineTest.ps1`

## 2. 架构评估结论

当前实现是高质量单文件原型，但已经到达继续叠功能前必须规整的边界：

- `index.html` 已超过 1300 行，inline script 集中承载规则、难度、随机、存储、debug、DOM、音效、输入、循环和失败回顾。
- `gameState` 被多个层面直接读写，后续加入 boss、combo、移动按钮或 3D/Unity 适配会显著放大耦合风险。
- `previewSeededLevel` 和 recap/debug helper 依赖临时改写全局状态，字段继续增加时容易漏恢复。
- 验证脚本仍大量依赖解析 inline script 和 fake DOM；后续应让纯逻辑模块可以被直接 import 验证。
- Phase 3 已加入 `localStorage`、失败回顾和 best-run UI，如果不先建立边界，Phase 4 会继续把功能塞进同一个文件。

因此，Phase 3A 是必要的架构规整 phase，不是视觉、玩法或功能扩展 phase。

## 3. 本阶段要完成什么

- 建立零依赖 ES module 目录结构，优先使用 `src/`。
- 将纯数据和纯逻辑从 `index.html` 抽出，同时保持现有行为等价。
- 保留 `index.html` 的 HTML/CSS 和一个 module entry script，例如 `src/main.js`。
- 推荐模块边界：
  - `src/config/difficulty.js`：颜色、形状、难度 band、`getDifficultyForLevel`
  - `src/core/rng.js`：seed hash、seeded RNG、随机工具
  - `src/core/rules.js`：规则模板、`generateRule`、规则文案格式
  - `src/core/level.js`：按钮生成、关卡数据、round snapshot 所需事实
  - `src/core/storage.js`：best-run localStorage schema/helper
  - `src/core/recap.js`：失败回顾数据模型，只消费已生成事实
  - `src/core/debug.js`：debug API 构建、seed preview、failure recap preview
  - `src/ui/render.js`：DOM 渲染、棋盘、线索、best strip、failure overlay
  - `src/ui/audio.js`：Web Audio feedback
  - `src/main.js`：流程编排、事件绑定、game loop、`window.__THAT_BUTTON_DEBUG__`
- 更新验证脚本，让它能直接 import core modules 验证难度、规则、storage、recap、seed determinism 和 copy guards。
- 建立一份架构说明文档，记录模块边界、禁止跨层依赖、后续功能应落在哪一层。
- 锁定重构前后的行为等价：固定 seed preview、failure recap preview、storage helper、HTTP marker smoke 都必须保持可验证。

## 4. 严格代码规范与架构约束

这些是硬约束，不是建议：

- 单一职责：一个模块只拥有一个清晰领域。规则、难度、随机、存储、recap、debug、UI、音效、编排不得混写。
- 纯 core 模块不得访问 DOM、`window`、`document`、`localStorage`、`AudioContext`、CSS class、URL query 或全局 `gameState`。
- UI 模块不得复制规则语义，不得重新判断按钮是否致命；只能消费 core 输出的 facts。
- Storage 模块只处理 best-record schema、normalize、load/save adapter；不得知道 UI 文案、规则、DOM 或关卡生成。
- Debug 模块不得成为第二套游戏逻辑；seed preview 和 recap preview 必须复用 core generation/recap functions。
- `main.js` 只能做编排和依赖注入，不允许变成新的巨型文件。若 `main.js` 开始承载规则、存储细节或大量 DOM 字符串，本阶段不通过。
- `DIFFICULTY_BANDS` 是难度唯一来源；不得在 UI/debug/validation 中硬编码另一份真实难度配置。
- `generateRule`/core rules 是规则语义唯一来源；不得在 recap/UI/debug 中复制 fatal-condition 判断。
- `window.__THAT_BUTTON_DEBUG__` 是兼容面；可以由模块重新组装，但既有 helper 名称和语义必须保持。
- 不得为了“顺手”加入新玩法、新平衡、新视觉 redesign、新依赖或框架迁移。
- 文件命名、导出命名、数据字段命名必须清晰稳定；禁止含糊的 `utils.js` 堆所有东西。
- 新增注释只解释边界、契约或复杂流程；不要写空泛注释。

## 5. 每轮固定工作流

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

## 6. 每轮必须执行的架构自检

架构自检是工作流的一部分，必须逐轮回答，不能只在最终报告里补一句：

- 本轮是否增加了跨层依赖？如果有，为什么不可避免？
- 是否有 DOM/UI 逻辑漏进 core 模块？
- 是否有 `window`、`document`、`localStorage`、`AudioContext` 漏进纯逻辑模块？
- 是否有规则语义被复制到 UI/debug/validation？
- 是否有难度配置被复制到 UI/debug/validation？
- 是否新增了全局变量、隐式状态或直接跨模块写状态？
- `main.js` 是否保持编排层职责，没有吸收业务逻辑？
- seed preview、failure recap preview、best-record helper、debug API 是否保持兼容？
- 本轮是否只是架构规整，没有暗改玩法、难度、计分、文案语义或视觉布局？
- 后续 Phase 4/6 功能如果要接入，本轮边界是否让它更容易落位，而不是更依赖临时写法？

## 7. Debug 自检

每轮至少覆盖：

- 固定 seed preview 是否可复现，且与重构前关键字段等价？
- wrong-click 和 timeout failure recap preview 是否仍可生成？
- best-record empty/corrupt/saved/loaded/new/matched/below states 是否仍可验证？
- HTTP marker smoke 或结构验证是否覆盖本轮新增模块入口？
- 如果 UI 文件移动，点击、键盘、计时、音效触发路径是否仍由同一流程控制？

## 8. 分轮安排

Round budget: 12 total rounds.

1. 建立架构 baseline：记录当前模块候选边界、固定 seed fixture、现有 debug helper 输出、文件职责地图，创建 `docs/phase-3a-architecture-regularization-record.md`。
2. 准备 module entry：让 `index.html` 加载 `src/main.js`，先以最小搬迁验证 module serving/build/Pages 路径。
3. 抽出 config/difficulty/rng：直接 import 验证 `getDifficultyForLevel` 和 seed determinism。
4. 抽出 rules/level generation：保持 `generateRule`、button generation、seed preview 关键输出等价。
5. 抽出 storage/recap core：保留 Phase 3 best-record 和 failure recap 行为，确保 core 不碰 DOM。
6. 抽出 debug API builder：`window.__THAT_BUTTON_DEBUG__` 由 main 组装，helper 名称和语义保持。
7. 抽出 UI render/audio：DOM 字符串、best strip、failure overlay、board rendering、typewriter、audio feedback 分层清楚。
8. 收紧 `main.js`：只保留 state orchestration、event binding、game loop、dependency wiring。
9. 更新 `scripts/validate-structure.mjs`：优先 import modules 验证结构约束、core purity、fixtures 和 debug compatibility。
10. 更新 README/TODO/docs index 和架构说明，记录后续 Phase 4/6 如何接入。
11. Buffer：修复 module path、Pages、validation、fixture mismatch、UI behavior regression。
12. Final validation：创建 `docs/phase-3a-final-report.md`，运行完整验证矩阵，提交推送并回报 READY_FOR_CHECK。

执行者可以合并相邻轮次，但不得跳过 baseline fixtures、module boundary record、core import validation、architecture self-check、final report。

## 9. 本阶段不做什么

- 不做 boss、敌人、血条、combo、肉鸽、移动按钮、遮挡、3D、Unity、PWA、CDN 移除、i18n 或框架迁移。
- 不改变 Phase 1 难度 band、timer、reward、board size、fatal range、rule tier、rule unlock。
- 不改变 Phase 2 规则文案语义和玩家可见说明风格。
- 不改变 Phase 3 best-record 规则、失败回顾内容或 retry feedback 语义。
- 不引入新 npm 依赖，除非先在报告中证明零依赖路径不可行。
- 不把重构当成视觉 redesign；UI 外观应保持等价。
- 不删除或重写 `origin/`、GitHub Pages workflow 或无关文档。

## 10. PASS 标准

Phase 3A 只有同时满足以下条件才可 READY_FOR_CHECK：

- `index.html` 明显瘦身，运行逻辑从 inline script 迁移到 `src/` modules。
- 模块边界文档化，且与实际文件结构一致。
- core modules 不访问 DOM/window/localStorage/AudioContext/global gameState。
- UI modules 不复制规则语义或难度配置。
- `main.js` 保持编排层职责，没有成为新的巨型业务文件。
- `window.__THAT_BUTTON_DEBUG__` helper 名称和语义保持兼容。
- 固定 seed preview 的关键字段在重构前后等价，至少覆盖 levels 1/4/8/12/18。
- failure recap preview 覆盖 wrong-click 和 timeout。
- best-record helper 覆盖 empty/corrupt/saved/loaded/new/matched/below states。
- `scripts/validate-structure.mjs` 能直接 import core modules 并检查架构边界/行为 fixtures。
- Phase 1/2/3 既有验证全部通过。
- `docs/phase-3a-architecture-regularization-record.md` 和 `docs/phase-3a-final-report.md` 存在。
- `TODO.md` 和 `docs/README.md` 指向 Phase 3A 指南与最终报告。
- 最终实现已提交并推送。

## 11. 必跑验证矩阵

- `npm run validate`
- `npm run build`
- `.\StartLocalTest.ps1 -DryRun`
- `.\OpenOnlineTest.ps1 -DryRun`
- `git diff --check`
- Local HTTP smoke for a seeded debug URL
- Module import smoke for core difficulty/rules/storage/recap
- Seeded preview equivalence smoke for levels 1, 4, 8, 12, 18
- Failure recap preview smoke for wrong-click and timeout
- Best-record storage helper smoke for empty/corrupt/saved/loaded/new/matched/below states

## 12. 最终报告模板

在 `docs/phase-3a-final-report.md` 中记录：

- Summary: 拆分了哪些模块，保留了哪些行为。
- Architecture map: 文件结构、每个模块职责、禁止依赖。
- Code standards applied: 哪些规范被执行，哪些由 validator 保护。
- Architecture self-check summary: 每轮关键自检结论。
- Behavior equivalence: seed preview、failure recap、best-record helper 证据。
- Validation results: 完整验证矩阵。
- Remaining risks: 仍需人工浏览器/真机验证的点。
- Commits and push result.

## Return Message

When complete, send the planner thread a routing message with:

- `from: executor`
- `to: planner`
- `workspace: D:\WebProjects\ThatButton`
- `phase: Phase 3A - Architecture Regularization And Guardrails`
- `action: recheck`
- `guide: docs/phase-3a-architecture-regularization-goal-guide.md`
- `status: READY_FOR_CHECK`
- final commit, push result, final report path, architecture record path, validation evidence, architecture self-check summary, and explicit pending evidence.
