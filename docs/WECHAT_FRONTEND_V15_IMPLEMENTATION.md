# 微信小游戏 v15 前端接入与验收记录

日期：2026-09-30。依据 [v15 视觉交付](WECHAT_V15_VISUAL_HANDOFF_2026-09-30.md)，在 `ports/wechat` 的 Canvas 端接入，Web 原有界面与玩法文件保持独立。

## 已接入

- `scripts/prepare-art.py` 从 v15 可编辑原画导出首页和结算标题、舞台、局内风景、完整双角色透明图层；沿用已验收的 v11/v14 奔跑组与安抚组。运行时素材位于 `assets/runtime`，构建复制到 `build/art`。构建目录当前约 2.0 MB。
- `src/renderer.js` 用舞台素材绘制首页和结算，用风景和完整角色图层绘制局内页。分数、体力、挑战进度、连击、计时、规则和按钮图形数字继续绑定游戏状态。规则重点保留红色，但不显示源文本的 `【】`。按钮有凸起彩色侧壁和按下的深蓝凹槽，触摸矩形覆盖可见实体。
- 升级卡增加与积木一致的亮面和侧壁。原有帮助、设置、返回前台继续、结算再来一局与返回首页流程保留。
- `src/game.js` 同时接受 `touchstart` 与缺少起始事件时的 `touchend`，同一手势只派发一次；画布的 `pointerdown`、`mousedown`、`touchstart` 作为兼容入口，统一命中处理并在同次输入中去重。
- `scripts/build.mjs` 默认写入已经由用户的公众平台与开发者工具截图交叉确认的正式小游戏 AppID `wxecad834e040489b5`，仍可用 `WECHAT_GAME_APPID` 环境变量覆盖，避免日常重建把项目改回游客模式。
- 2026-09-30 用户提供的开发者工具截图确认实际打开的是 `build`，v15 首页资源已经显示，但「开始游戏」仍未响应。用临时诊断确认 `wx.onTouchStart`、`wx.onTouchEnd` 和画布 `addEventListener` 均存在（`SEC`），但点击前后没有任何已注册回调收到事件。完成诊断后移除了画面上的临时状态条。

## 已验证

- `ports/wechat`：`npm run check` 通过，包括开始、帮助、设置、局内按键、误按、升级、暂停继续、结算重开和返回首页；新增仅有 `touchend` 的触摸路径、320×568 顶部安全区的九键命中与规则括号检查。
- 不带 `WECHAT_GAME_APPID` 运行 `npm run check` 后，生成的 `build/project.config.json` 仍为正式 AppID，CLI `open --project` 成功，首页「开始游戏」再次实点进入第 1 关。
- 根项目：`npm run validate`、`npm run build` 通过。
- v11 角色基准：`verify-character-baseline.ps1` 通过，基准原图未改。
- Chrome Canvas 预览截图：`ports/wechat/tests/visual-evidence/v15-home-320-safe46.png`、`v15-game-320-safe46.png`、`v15-game-320-safe24.png`、`v15-game-390-safe47.png`、`v15-upgrade-320-safe46.png`、`v15-result-320-safe46.png`。它们检验排版和素材层次，不等同微信模拟器验收。

## 开发者工具实测与剩余验收

2026-09-30 获用户授权后，直接操作已打开的微信开发者工具 `2.02.2609231 RC`，在安全设置开启服务端口，确认工程类型为「小游戏」、实际目录为 `D:/WebProjects/ThatButton/ports/wechat/build`、AppID 为 `touristappid`。在 iPhone 12/13 和 Pixel 9 模拟器上重新编译、重新打开项目、完整退出并重启开发者工具，点击首页「开始游戏」均无反应。帮助、设置同样不能收到输入。控制台的额外 `wx.onTouchStart` 及 document/window 监听探针也没有输出。

为了排除游戏按钮命中代码，曾暂时将生成的 `build/game.js` 替换成只有绿色背景、计数器与 `wx.onTouchStart`/`wx.onTouchEnd` 监听的最小探针；游客工程的模拟器点击后计数仍为 0。随即用 `npm run build` 恢复正式构建，并核对恢复后的文件哈希与替换前相同。

服务端口已开启。CLI `open --project` 对游客工程返回 `不存在此 AppID`（错误码 10），但使用正式 AppID 重建后返回 `√ open`，开发者工具的「预览」「真机调试」「上传」入口也从禁用变为可用。正式工程内点击「开始游戏」立即进入第 1 关；安全按钮按下呈实体凹陷、分数从 0 增为 10；误按紫色按钮后出现红边反馈且体力从 100 降为 82；清完安全按钮后分数升至 30、挑战进度升至 23/500，并自动进入第 2 关。自然超时进入结算；「返回首页」「再来一局」均已点击通过。首页「怎么玩」打开帮助并可返回，设置页音效开关可切换并返回首页。由此可确认本机游客配置与无输入现象相关，正式 AppID 下用户报告的“开始游戏没反应”已解除；微信工具内部为什么没有给游客工程派发输入事件，尚无直接证据。

模拟器尚待补验：积满 500 挑战进度后的升级卡选择、后台返回的继续弹层、320×568 小屏及顶部额外占用 46px 的真机安全区。这些流程已有自动化和 Canvas 预览证据，仍不能标记为微信模拟器／真机通过。
