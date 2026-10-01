# ThatButton 微信小游戏工程

此目录把浏览器游戏的同一套规则和运行控制器打包为微信小游戏。源代码在 `src/`；`build/` 是生成产物，已加入仓库忽略列表。当前已完成本地构建、模拟微信 API 集成检查和开发者工具主要流程验证；2026-10-01 用户反馈真机试玩未遇到问题，下一步准备小范围体验版。详见[试玩验收记录](../../docs/WECHAT_FRONTEND_V26_PLAYTEST_PREP.md)。

## 注册名称与图标

开发者交接请先阅读[命名、简介与设计说明](../../docs/WECHAT_BRAND_BRIEF.md)，其中记录了已确定内容、设计原因和后续界面接入建议。

整套美术与前端改版参考[整体形象与 UI 重设计构想](../../docs/WECHAT_ART_UI_CONCEPT.md)：气质定位、角色、全流程界面、动效与资源交付建议。

[最终原画陈列](assets/concepts/2026-10-01/final-art-gallery/index.html)按封面、局内、升级、结算和辅助界面展示当前接入画面及对应原画；旧的连击预览地址会跳转到这份定稿陈列。

- 名称与简称：**手指等等我**。
- 已选定的账号头像：[shouzhi-dengdengwo-avatar-v1.png](assets/branding/shouzhi-dengdengwo-avatar-v1.png)。
- 图标于 2026-09-28 生成并确认；PNG 原图为 1254×1254，1,250,998 字节。

已选定的品牌素材保存在 `assets/branding/` 并纳入版本管理；`output/` 与 `build/` 只保存可重新生成的临时产物。

介绍文案：

> 一款考验观察、判断与反应的休闲益智小游戏。读懂提示，限时点完所有安全按钮，挑战连击与更高关卡。手指等等我！

## 本地构建与检查

从此目录运行：

```powershell
npm install
npm run check
```

`npm run check` 会生成 `build/game.js`、`game.json`、`project.config.json` 和从项目正式资源复制的音效及 CC0 背景音乐，并验证触摸输入、计时暂停、重开、存档、音乐设置和产物结构。构建包须低于 4 MiB。根项目的 `npm run validate` 还会检查 Web 版本、音效与背景音乐契约。[音频试听与来源](../../docs/audio/README.md)提供逐项复核入口。

设置页可按 [内测诊断说明](../../docs/WECHAT_PLAYTEST_DIAGNOSTICS.md) 开启本次诊断并主动复制报告，正常启动默认关。手机可从「同包文字A/B对照」选择 A 原文字或 B 图集，同一 build 依次测试并复制四轮报告，见 [真机四轮步骤](../../docs/WECHAT_SAME_BUILD_AB_TEST.md)。规则/按钮数字的有限预制 PNG 图集也默认关，开发者可用 `ruleAtlas=1` / `numberAtlas=1` 单独 A/B；当前字形对照有差异，不能称为视觉验收通过。重建素材用 `npm run atlas:prepare`，无头画面对照用 `npm run atlas:check`，详见 [图集候选、许可、体积及验收证据](../../docs/WECHAT_TEXT_ATLAS_CANDIDATE.md)。

若需在浏览器预览 Canvas 画面，从仓库根目录运行 `npm run dev`，然后打开 `/ports/wechat/preview.html`。预览使用模拟 `wx` 接口，只用于布局与输入检查。加上 `?autostart&layout=3x3&w=360&h=640` 可查看窄屏 3×3 排版；该参数注入的是示意棋盘，点击不会推进真实第 6 关状态。

## 导入微信开发者工具

1. 当前正式小游戏账号已注册，工程默认使用 AppID `wxecad834e040489b5`。
2. 在此目录运行 `npm run build`。若需切换账号，用环境变量 `WECHAT_GAME_APPID` 覆盖默认 AppID 后重新构建。
3. 用微信开发者工具选择“小游戏”项目，导入 `ports/wechat/build/`。
4. 在模拟器和 iPhone、Android 真机上检查完整游戏流程。账号权限、体验成员、备案和审核由微信公众平台管理。

不要把上传密钥、管理员登录信息或身份证明材料放进仓库。浏览器版与阅星曈版不依赖此工程。

## iOS USB 真机调试

Mac / iPhone 实测、原始采样和未解决问题请先阅读 [2026-10-02 测试交接](../../docs/wechat-mac-test-2026-10-02/README.md)。本次已在微信公众平台开通高性能模式，并在真机验证 `GameGlobal.isIOSHighPerformanceMode === true`；仅设置下面的构建配置并不能替代后台开通。若扫码仍进入旧普通模式，按[微信官方说明](https://developers.weixin.qq.com/minigame/dev/guide/performance/perf-high-performance.html)检查本地运行模式缓存，清除记录前注意本地存档影响。

构建脚本已开启 `game.json` 的 `iOSHighPerformance: true`。当前安装的开发者工具要求高性能模式、USB 可识别设备和 iOS 16.4 及以上，连接后还会检查微信 8.0.61 及以上、基础库 3.8.10 及以上。重新构建后在开发者工具点击「编译」，重新打开「真机调试」并选择 iOS；若仍灰显，继续检查设备信任与 USB 调试连接。

2026-10-01 开启此配置；本地检查不等同于高性能模式的真机验收，仍需验证启动、触摸、音频和返回前台继续。
