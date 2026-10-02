# 首轮 A/B 后的采集质量修复

2026-10-02。原始截图摘要见 [首轮记录](WECHAT_AB_SCREENSHOT_FINDINGS.md)。这一轮已证明图集生效和四份报告保留；不能据此宣布图集性能更好，图集继续默认关闭。

## 复现与原因

在 `ports/wechat` 运行 `node tests/diagnostic-quality.mjs`，对真实 `createWechatGame` 调度路径和 `createCanvasRenderer` 使用固定时钟及可控宿主，修复前两次运行均复现：

1. Canvas 没有 RAF、全局提供 RAF 时，游戏仍调度 `setTimeout(16)`；诊断按设计只计 `timerCallbacks`，三个回调后 `rafInterval.count` 为 0，测试期待两个间隔。问题是漏探测全局 RAF，不能通过把定时器改名为 RAF 解决。
2. 第二轮棋盘的错峰入场持续 `230 + (按钮数 - 1) × 45` ms。到期后原 `getDiagnosticScene()` 只判断 `motion.roundEnter` 对象是否存在，持续返回 `game-entry`，掩盖普通局内和干扰场景；绘制和命中代码自身已有时间判断。四按钮用例在 365 ms 边界应回到 `game`，旧实现仍返回 `game-entry`。

时钟校准与场景切换会排除跨边界间隔，但不是上述确定性复现的原因。原截图 RAF 为零不能视为没有卡顿；尚未直接确认用户设备当时实际提供了哪些 RAF 接口。

## 修改边界

- 调度优先保留已有 Canvas RAF；Canvas 缺失时使用可用的全局 RAF；两者都没有时才保留原 16 ms 定时器。
- 启动参数开启和玩家手动开启的报告都记录 `metadata.frameSource`：`canvas.requestAnimationFrame`、`global.requestAnimationFrame` 或 `setTimeout`。采样标记与实际选择的调度器一致。
- 只有真实 RAF 回调生成 `rafInterval`；定时器只计 `timerCallbacks`。后台和等待继续仍不采样，不用 RAF 间隔冒充真实呈现 FPS。
- 场景分类按入场截止时间判断。保留入场对象、按钮变换、命中保护与原动画时序，不为分类清空动画状态。
- 未调整分辨率、目标帧率、音效、glitch 效果或共享游戏规则。剪贴板处理由另一项修复负责，本项未编辑 `report-export.js`。

## 验证与补测

同一复现命令修复后通过；回归覆盖 Canvas RAF、全局 RAF、两者都有时保持 Canvas 优先、无 RAF 的定时器回退、后台/等待继续、手动开启的调度来源、入场边界、到期后的绘制计数与三种干扰分类。固定时间下重复分类查询不会改变绘制命令。

`npm run check` 已通过完整集成检查；`npm run atlas:check` 的 102 个画面对照中，默认关闭和缺图仍与旧基线 0 不同像素，同一规则/glitch 的 6 个 A→B→A 对照恢复 A 后也均为 0。B 已知字形差异保持，不作为视觉验收通过。

后续真机先跑短轮，查看新报告 `frameSource` 和对应 `rafCallbacks` / `timerCallbacks`。若来源为 RAF，相同连续场景应有间隔样本；若仍为定时器，RAF 指标继续不可用，先核查宿主环境。确认入场结束后的绘制归入 `game` / `game-glitch` / `game-swap` / `game-drift` 后，再决定是否补跑同一构建的 A→B→B→A。

保留旧报告，新旧构建的数据分开比较：旧版 `game-entry` 包含了大量正常局内绘制，不能直接与修复后的同名场景相比。旧截图的 game 均值 A1 2.106、B2 1.646、B3 1.483、A4 1.342 ms 随顺序波动，最后一轮 A 更低，仍没有足够证据宣布 B 收益。
