# Mac / iPhone 微信小游戏测试交接

记录时间：2026-10-01 至 2026-10-02，Asia/Shanghai。本文件汇总当前会话的实测、材料和待办，供 Windows PC 继续处理。

**2026-10-03 Mac 接续入口：**新增诊断与同包文字 A/B 已纳入源码，拉取 `main` 后重新构建一次即可在手机菜单跑 A→B→B→A，并一次导出四轮报告。构建命令、预览步骤、报告保存与测量边界统一见 [同包真机 A/B 测试方法](../WECHAT_SAME_BUILD_AB_TEST.md)。下文保留 10 月 1–2 日的历史环境与采样，不把它当作新图集的效果验收。

## PC 端先读

采样的独立复核、调用路径和数据限制见 [CPU profile 分析报告](ANALYSIS.md)，报告附带可重跑的分析脚本。

原版游戏已恢复测试，最小探针程序已弃用。最后一轮用户玩到 **48 关、2910 分**，反馈“发热还好，不怎么热了，并且也没卡顿”。连接持续保持，已导出原版 CPU 采样。这是单设备、单轮主观验收，不是长时间温控或性能验收。

**不要继续把 VPN 认定为故障根因。** 关闭 VPN 后连接成功，但后来开启 VPN 也正常；期间还升级了工具、开通了高性能模式并重建会话，变量未隔离。根因尚未完全确定。当前仍有微信基础库内部控制台错误，日志采集能力需要复核。

## 环境与源码基线

| 项目 | 实测信息 |
| --- | --- |
| 源码分支 / 提交 | `main` / `89eab0160cb47aee84bc3f2ac25573688baf6795`，`perf: coalesce WeChat paints and reuse rendering work` |
| Mac | Apple Silicon，macOS 15.3.2，Safari 18.3.1 |
| 开发工具 | 原 Stable 2.02.2608080；本会话从官方更新入口升级至 Nightly **2.02.2609292** |
| iPhone | iPhone 17，iOS **26.6.2** |
| 手机微信 / 基础库 | **8.0.78** / **3.17.3 [1652]** |
| 项目 / AppID | 手指等等我 / `wxecad834e040489b5` |
| Mac 源码 | `/Users/onovich/WebProjects/ThatButton/ports/wechat/src/` |
| 实际导入目录 | `/Users/onovich/WebProjects/ThatButton/ports/wechat/build/` |
| 构建包 | 工具显示 3996 KB，低于 4 MiB；`game.js` 约 282.7 KB |
| 调试连接 | USB-C 直连，用于 iOS 调试实例发现；工具侧显示通信方式 Wi-Fi |

Windows 来的说明已确认：`project.config.json`、`game.js` 等由构建产生，`build/` 不上传 Git。Mac 完成拉取、依赖安装、构建与 `npm run check`，原版工程导入成功。Node 项目要求 >=20；Mac 构建使用 Node 24.19，系统原有 Node 18 不适用。回 PC 后在 `ports/wechat` 重新构建、导入 `build`，不要导入 `src`。

## 调试过程与获得的认知

1. 原工具自动真机调试报 `Error: Timeout`。iPhone 配对/信任正常，开启 Safari 网页检查器，重启手机微信后仍可复现。
2. 初始连接是 Mac USB-C 转接器 → USB-A 线 → iPhone USB-C。换成 USB-C 直连后仍有约 4 秒结束，不能将转接器认定为唯一原因。
3. 修复 Mac iOS 调试代理缺失的动态库依赖。工具自带 `ios_webkit_debug_proxy` 1.9.1；另安装 Homebrew 1.9.2 作独立对照，没有替换工具二进制。两个版本都能发现 Safari 页面；当时找不到小游戏实例。
4. 读取工具日志和逻辑：工具寻找 URL 为 `weapp://wechat-game-runtime` 的实例；初始化后约 10 秒仍未连接实例，就主动触发 `FindInstanceTimeout` 并结束会话。手机页面晚于计时起点进入，故用户看到的停留时间约 2–4 秒。手机“本地调试已结束 / 开发工具已退出调试”与此一致，并不是已经证实游戏崩溃。
5. 在同一失败会话可发现 Safari `https://example.com/` 目标，证明设备和基础目标枚举可工作，但不证明小游戏检查器已经工作。旧 Mac Safari 调试新 iOS 的兼容性也有疑点，未升级 macOS，未证明其为微信故障根因。
6. 官方 Nightly 升级成功后仍复现；工具更新本身没有解决问题。曾遇二维码上传迟迟不出，重启工具后恢复。代理直连/代理请求行为有差异，但未据此修改系统代理配置。
7. 用相同 AppID 创建过约 1 KB 静态最小探针：无资源、计时器或游戏循环，也会退出。这降低了原版负载/逻辑导致当时断开的可能性。探针显示 `GameGlobal.isIOSHighPerformanceMode` 为 `undefined`；后续官方文档确认该字段正确，但早期截图本身不能证明所有原因。
8. 进入微信公众平台 → 功能 → 游戏能力地图 → 研发能力 → 生产提效包，发现高性能模式原为“立即申请”；本会话实际开通后显示 **“已开启”**。后台最低 iOS 版本 14.0，高性能+最低微信版本 8.0.45。项目 `game.json` 原已设置 `iOSHighPerformance: true`，后台开通与源码配置是两个条件。
9. 开通后有一次仍 `FindInstanceTimeout`。官方文档指出普通模式缓存可能阻止切换，建议清除本地开发/体验/线上游戏记录。曾向用户提出此步骤（可能影响本地存档），**未得到已清除的确认，不要写成已执行**。
10. 用户关闭 VPN 后，工具成功发现并连接小游戏实例，远程执行返回 `highPerformance: true`。后续用户重新开启 VPN，调试仍正常。因此早先“基本确定是 VPN 导致”的说法已撤回。
11. 按用户要求停止最小探针，打开最近项目中的原版 `ThatButton`，导入路径确认是 `ports/wechat/build`，开始原版测试。探针仅保留为历史诊断材料，不作为后续测试对象。
12. 后续数次 UI 自动化输入失败、超时或报告无窗口，但窗口实际仍在；重新访问可读连接状态。这是自动化访问失败，不能当作手机断线或游戏错误。

## 当前未解决错误

```text
Error: undefined is not an object (evaluating 'e.__isNativeConsole__')
WAGame.js:1
(anonymous) → Tl → (anonymous) → forEach [native code] → y
→ (anonymous) (index):98
```

错误位于微信基础库，未见项目 `game.js` 的调用帧，工具隐藏该基础库源码。最小探针和原版均显示此错误；当前会话保持连接，CPU 采样可导出。未查到可靠的相同错误公开修复记录，**尚不能宣布已修复或无害**。

最小探针会话中，控制台表达式返回值可读取；调用 `console.log` / `console.warn` 后返回了“console check complete”，却没有显示两条测试日志。说明日志转发可能不完整，也可能与上下文/桥接机制有关；没有确认根因。原版后续的自动化输入失败不能用于证明远程执行坏了。不要给 `__isNativeConsole__` 硬补值、修改微信基础库或仅屏蔽错误。

## 已保存的实测材料

| 文件 | 用途 |
| --- | --- |
| [iphone17-level48-score2910.trace.json.gz](iphone17-level48-score2910.trace.json.gz) | 工具实际导出的完整采样，gzip 压缩存储；解压后可在 DevTools Performance 的 Load profile 中加载 |
| [profile-summary.json](profile-summary.json) | 源码基线、用户反馈、哈希、采样结构与按函数聚合的初步结果 |
| [connection-log-excerpt.txt](connection-log-excerpt.txt) | 已选择的工具连接/超时事件；省略设备标识、账号标识、登录 token 和完整应用日志 |
| [01-connected-before-failure.png](01-connected-before-failure.png) | 早期短暂绿色连接状态 |
| [02-session-ended.png](02-session-ended.png) | 随后服务结束、设备断开 |
| [03-minimal-probe-connected.jpg](03-minimal-probe-connected.jpg) | 已弃用的静态探针，模式字段 undefined |
| [04-phone-tool-ended-dialog.jpg](04-phone-tool-ended-dialog.jpg) | 手机提示开发工具退出调试 |
| [05-native-console-error.png](05-native-console-error.png) | 连接成功后的 WAGame.js 错误 |

Mac 原始未压缩文件：`/Users/onovich/Downloads/ThatButton-iPhone17-level48-score2910-20261002.json`。项目已保存 gzip 副本，不依赖 Mac 下载目录。原始 JSON 4,073,450 字节；SHA-256 见摘要。照片/截图来自用户本会话上传，已复制到项目，不依赖临时目录。

工具原日志在 Mac 用户 Library 的微信开发者工具 `WeappLog/logs/`；临时诊断提取代码 `/tmp/wechat-ios-logic.js`，临时探针 `/tmp/thatbutton-ios-debug-probe`。这些不是 PC 的可用路径，也不是正式源码。未把完整应用日志纳入 Git，以免混入账号与设备信息。

## 48 关 / 2910 分这一轮的采样边界

- 用户反馈：不明显发热、不卡顿；未测温，没有电量变化记录，没有精确纯游戏时长。
- 录制总窗口 **310,458 ms（约 5 分 10 秒）**，包括点击录制后等待用户开始的时间，不能全部当成有效游戏时长。
- 原始 trace 仅 **9 个事件**，包含一个 CPU ProfileChunk；**21,764 个节点、24,670 条采样/时间间隔**。有原版 `weapp://wechat-game-runtime/wxfs/game.js` 的函数，确认采样包含原版。
- 结束时服务正常，往返约 323 ms，待发送/未确认均为 0。此前原版会话观察到 824 ms，不能将调试通信延迟当成帧耗时。
- 按叶节点函数聚合，采样间隔累计：`fillText` 约 53.0 秒，`send` 约 36.4 秒，原版 `label` 约 19.1 秒，`setTimeout` 约 10.7 秒，`fill` 约 9.7 秒。`label` 对应构建文件零基行 5522（编辑器行 5523）。只是分析入口，不是优化结论。
- iOS 适配器把 CPU profile 转成合成 trace，面板显示 Scripting 几乎覆盖整个录制窗口，Total blocking time 约 310 秒。**这不能直接解释为游戏阻塞 310 秒或 CPU 使用率 100%**。没有真实逐帧/绘制 timeline 证据；`send` 可能包含调试通信/采样开销。
- 本轮没有 FPS 样本、内存数值、GPU 数据、设备温度；Screenshots 和 Memory 录制选项未开启。不要用主观流畅替代测量，也不要用该 trace 的空 FPS 图宣布帧率异常。

## PC 端待办（按优先顺序）

- [ ] 在 PC 拉到含本交接材料的提交；核对与测试基线的差异。重建 `ports/wechat/build`，记录新构建提交和包大小，继续原版测试，不再使用最小探针。
- [ ] 解压并导入 CPU profile，检查调用树/Bottom-Up、节点父子关系和采样间隔分布。区分业务绘制、原生边界与调试开销，追踪 `label` / `fillText` 到源码；优化前先证明重复文字绘制或绘制频率确实是瓶颈。
- [ ] 复核日志采集：在原版启动与操作处使用明确的一次性测试日志，确认正确 JS 上下文，检查 `log` / `warn` / `error` 转发；保持变量单一，再对照另一基础库版本。记录是否仍有 `__isNativeConsole__`，不要直接修改游戏逻辑来掩盖微信内部错误。
- [ ] 连续原版试玩 10–15 分钟：记录开始/结束电量、是否充电、亮度、室温、保护壳、VPN/网络、微信/基础库版本、关卡和分数、卡顿/发热主观等级。温度读不到就明确写“未测”，不要虚构温度。
- [ ] 发热对照尽量使用普通预览/体验版且不连接调试器、不充电，避免把调试和充电开销计入正常游戏表现；再与调试版比较。需要真实 FPS/帧间隔时考虑低开销的原版内测统计，当前没有实现该方案。
- [ ] 验证暂停/锁屏/切后台/返回前台、音频、触摸、重开和存档，补充 iPhone 长局验收；Android 仍待独立实测。
- [ ] 若继续定位断开，固定工具/基础库/高性能状态，分别做 VPN 开/关、重启、缓存清除对照。当前不建议为定位而再次盲目换线、升级整个 macOS 或修改工具的超时常量。

## 官方资料与参考的可信度

- [微信高性能模式官方说明](https://developers.weixin.qq.com/minigame/dev/guide/performance/perf-high-performance.html)：后台开通 + `game.json` 配置；模式缓存说明；`GameGlobal.isIOSHighPerformanceMode`；高性能调试数据限制。已通过浏览器实际读到原文。
- [Google ios-webkit-debug-proxy](https://github.com/google/ios-webkit-debug-proxy)：信任设备、网页检查器、目标枚举排障。
- [ios-webkit-debug-proxy 1.9.2 发布说明](https://github.com/google/ios-webkit-debug-proxy/releases/tag/v1.9.2)：不能据版本更高断言解决 iOS 26 或本次微信问题。
- [WebKit 检查器启用说明](https://webkit.org/web-inspector/enabling-web-inspector/) 与 [应用内容需可检查](https://webkit.org/blog/13936/enabling-the-inspection-of-web-content-in-apps/)：原生宿主是否公开目标也影响检查器。
- [WebKit 255130](https://bugs.webkit.org/show_bug.cgi?id=255130)：旧 Safari / 新 iOS 调试兼容性讨论，不是本次故障已确诊的证据。

本次没有更改原版业务源码，没有部署/发布体验版，也没有完成长时间发热验收。开通的是已有小游戏账号的高性能能力。最终诊断应以可复现对照和有效采样为准。
