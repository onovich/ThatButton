# 2026-10-02 实现职责交接

收到主会话调整后，本工作会话停止诊断及 game.js 编辑，专注 renderer 的预制规则/数字图集。为避免覆盖，记录已落地的内容。

## 调整前已提交

- `63f0fed`：`ports/wechat/src/performance-diagnostics.js`；game.js 的 `perf=1` 接入、前台 RAF、后台保存/恢复、主动复制；renderer.js 的 draw/fillText/glitch 计数、场景分类、设置页导出按钮；tests/performance-diagnostics.mjs、tests/run.mjs 导入、docs/WECHAT_TEXT_ATLAS_ACCEPTANCE.md。
- `d2ae9e9`：诊断计时单位非阻塞校验（微信 now 增量可能是微秒或毫秒），测试和文档。
- 此两提交已通过根 validate/build/启动脚本 dry run 与小游戏 check。未推送。
- 未修改、未提交原来未跟踪的 docs/wechat-mac-test-2026-10-02/ANALYSIS.md。

## 调整时 game.js 尚未提交的图集接入

这是调整前已经写入的差异；接下来交由主会话整合，图集会话不再编辑 game.js：

- `textAtlasOptions = { rules: query.ruleAtlas === '1', numbers: query.numberAtlas === '1' }`，传入 createCanvasRenderer；默认均关闭。
- diagnostics metadata 增加两个开关值。
- 仅任一图集开关开启才加载可选 `art/text-atlas-v1.png`。加载失败不进入必需美术错误页，直接走原 fillText。
- setImages 后以 getTextAtlasStatus 更新诊断 metadata。

主会话可接管已有诊断模块，或替换为自己的模块，避免两套同时计数。renderer 当前消费的是可选 `diagnostics` 参数（默认为 null），方法如下：

```js
beginDraw(scene) // 返回采样开始值
endDraw(start)
count(name, amount = 1)
```

计数名为 fillText、glitchReadback、glitchRebuild、ruleAtlasHit、ruleAtlasFallback、numberAtlasHit、numberAtlasFallback。图集 hit/fallback 单位是字符；按钮正常两字符，失败整串 fillText 一次但 fallback 计两字符。设置页只在 diagnostics 参数非空时显示 exportPerformance 操作；普通玩家 UI 保持。

后续主会话若使用独立诊断 UI，可删除已有 drawSettings 中诊断条件分支；其余图集绘制修改集中在 drawTile、drawRuleText、setImages 和独立 text-atlas.js。text-atlas-manifest.js、PNG 和脚本是预制素材，不是运行时离屏文字缓存。
