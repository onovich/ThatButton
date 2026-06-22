# Phase 0 Baseline And Playtest Goal 模式执行指南

日期: 2026-06-23
状态: 给执行者使用的 Phase 0 开发指令文档
阶段: Phase 0 - Baseline And Playtest Criteria
轮次预算: 6 轮。第 1-4 轮为主体工作，第 5 轮为缓冲修复，第 6 轮为最终验证与报告。

## 0. 直接给执行者的 Goal Prompt

你是 ThatButton 当前阶段的执行者。请读取并执行 `docs/phase-0-baseline-playtest-goal-guide.md`。

目标是在不大改玩法的前提下，建立 Phase 0 的可复现测试与验收基线：补齐真实设备测试清单、首轮可玩性指标、规则文案歧义记录方式、可复现随机种子或等价调试入口，并把结果回写到项目文档。每一轮都必须完成相关验证、提交、推送，并在轮次报告里写明 commit hash 与 push 结果。不要开始 Phase 1 的难度曲线大改、Phase 2 的全量文案润色、Phase 4 的 boss/肉鸽玩法扩展，除非本指南明确要求。

## 1. 必读上下文

- `TODO.md`
- `index.html`
- `README.md`
- `package.json`
- `scripts/validate-static-site.mjs`
- `scripts/build-static-site.mjs`
- `StartLocalTest.ps1`
- `OpenOnlineTest.ps1`

## 2. 本阶段要完成什么

- 明确 Phase 0 的验收标准: 首 5 关可学习、首 10 关可期待通关、玩家失败后愿意重试。
- 增加或整理测试记录文档，覆盖 iOS Safari、Android Chrome、桌面浏览器、本地启动器、GitHub Pages。
- 为规则生成增加可复现能力。优先选择 URL query seed、debug seed 输入、或轻量 deterministic RNG；实现方式必须不破坏普通玩家随机体验。
- 增加面向设计调试的记录项: level、seed、grid size、fatal count、rule text、time limit、failure reason。
- 记录哪些数据用于 Phase 1 难度曲线和 Phase 2 文案润色。
- 保持当前游戏体验可运行，GitHub Pages 部署继续通过。

## 3. 本阶段不做什么

- 不重写完整难度曲线。
- 不引入 boss、敌人、血条、combo、肉鸽系统。
- 不做 Unity 或 3D 引擎迁移。
- 不把 Tailwind/Google Fonts 离线化，除非验证失败必须临时处理。
- 不引入大型框架或构建链。
- 不删除或改写 `origin/` 原始资料。

## 4. 每轮固定工作流

每一轮开始前:

- 运行 `git status --short --branch`。
- 阅读本指南和本轮相关文件。
- 确认本轮范围没有越过 Phase 0。

每一轮结束前:

- 运行相关验证命令。
- 运行 `git diff --check`。
- 提交本轮相关文件。
- 推送到 `origin/main`。
- 报告 commit hash、push 结果、验证结果。

## 5. 每轮通过后提交推送工作流

优先使用项目 git wrapper:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Validate.cmd
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "<message>" -Paths <phase-relevant-files>
```

如果 wrapper 不可用，使用:

```powershell
git status --short --branch
npm run validate
npm run build
git diff --check
git add <phase-relevant-files>
git commit -m "<message>"
git push
git status --short --branch
```

不要 stage 无关未跟踪文件。

## 6. 分轮安排

### Round 1 - Baseline 文档和测试矩阵

- 新增或更新 Phase 0 测试记录文档。
- 定义真实设备测试项、桌面 smoke 项、GitHub Pages 验证项。
- 定义必须记录的玩家反馈字段。
- 验证: `git diff --check`，必要时 `npm run validate`。

### Round 2 - 可复现随机种子方案

- 设计并实现最小可复现 seed 机制。
- 保持无 seed 时仍为普通随机玩法。
- 在 UI 或 URL 中提供足够轻量的调试入口，避免干扰玩家体验。
- 验证同一 seed 能复现同一轮核心生成结果。

### Round 3 - 设计调试输出和失败记录

- 增加面向开发/设计的轻量记录方式。
- 记录 level、seed、规则文本、致命键数量、失败原因。
- 不把大量调试文本暴露给普通玩家，除非有明确 debug 开关。

### Round 4 - 手动测试和移动端证据

- 使用本地启动器或 Pages 跑桌面 smoke。
- 如果没有真实手机，明确记录未完成的真机测试项，不伪造结果。
- 根据已有证据补齐 Phase 1 难度曲线输入项。

### Round 5 - Buffer 修复

- 只修复前四轮暴露出的 Phase 0 问题。
- 不新增 Phase 1/2/4 范围。

### Round 6 - Final validation and report

- 跑完整验证: `npm run validate`、`npm run build`、launcher dry-run、`git diff --check`。
- 确认 GitHub Pages workflow 状态。
- 输出最终报告，说明哪些测试已完成、哪些需要真实设备、人类 playtest 或架构师决策。

## 7. 每轮自检模板

每轮回复必须包含:

- 本轮目标
- 本轮完成内容
- Debug 自检
- 架构自检
- 已运行验证命令与结果
- commit hash 与 push 结果
- 下一轮目标
- 是否消耗缓冲轮

推进规则:

- 验证失败: 不得提交推送，不得进入下一轮。
- 验证通过但提交失败: 不得进入下一轮。
- 提交成功但推送失败: 不得进入下一轮。
- 推送成功: 记录 commit hash 和远端分支，然后进入下一轮。

## 8. Debug 自检

- 当前变更能否用一个固定 seed 或明确手动测试步骤复现?
- 失败能否定位到规则生成、计时、输入、渲染、音频、启动器、Pages 部署中的某一层?
- 是否覆盖成功、失败、超时、错误点击、无 seed、指定 seed、移动端触摸等状态?
- 如果 UI 变化，是否有可重复的 smoke 或手动检查步骤?
- 如果状态或存储变化，是否没有污染普通玩家体验?

## 9. 架构自检

- 规则生成逻辑是否仍是规则真相来源，而不是在 UI 中复制规则语义?
- 调试 seed 和记录能力是否与玩家 UI 解耦?
- Phase 0 是否只建立基线和可复现性，没有提前拉入难度曲线大改?
- 是否避免引入大型框架、全新构建链或难以迁移到引擎的耦合?
- 是否保留 HTML 原型作为快速验证载体，同时为未来 Unity/3D 迁移留下清晰数据边界?

## 10. PASS 标准

- Phase 0 文档说明如何测试和记录首 10 关体验。
- 固定 seed 或等价机制可以复现至少一个稳定生成流程。
- 普通玩家无 debug 参数时仍能直接开始游戏。
- 项目验证命令通过。
- GitHub Pages 部署未被破坏。
- 最终报告明确给出 Phase 1 难度曲线需要的数据和未完成的真实设备测试项。

## 11. 最终报告模板

```text
Phase 0 final report

完成:
- ...

验证:
- ...

Debug 自检:
- ...

架构自检:
- ...

提交与推送:
- commit: ...
- push: ...

剩余风险:
- ...

建议进入:
- Phase 1 / Phase 2 / 阻塞项说明
```
