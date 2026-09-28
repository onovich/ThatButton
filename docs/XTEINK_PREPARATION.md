# ThatButton 阅星曈版准备

日期：2026-09-20。阶段：设计与研发准备，尚未实现 Lua 应用、导入 Studio 或安装设备。

最新决定：用户已取消 A–D 组别及纹理方向，改为倍数、尾数、包含数字、奇偶、质数与合数。当前 [数学条件试玩](../ports/xteink/design/math-study.html) 与 [设计规格最新决定](../ports/xteink/docs/DESIGN.md) 优先于下文第一轮提案；参考项目的平台、测试与交付经验仍然适用。

## 结论

同仓库维护 Web 与阅星曈两个产品入口。阅星曈以 X4 Pro 竖屏 480×800 为第一目标，采用 Lua 与离散输入驱动绘制。保留“读懂危险条件，按完所有安全按钮”的逻辑核心，把实时街机压力改编成回合式控制台；这是本轮提出的设计基线，尚非用户试玩认可的最终玩法。

先看 [可交互概念稿](../ports/xteink/design/index.html)，再看 [设备版设计](../ports/xteink/docs/DESIGN.md) 与 [研发路线及验收](../ports/xteink/docs/DEVELOPMENT.md)。概念稿是 HTML 设计验证，不是 Lua 模拟器或设备版本。

## 当前项目基线

- 当前目录 `D:/WebProjects/ThatButton`，分支 `main`，HEAD `2d3b742`（Phase 9 验收）。检查时只有一个 worktree。
- 本轮之前已有：`README.md` 修改、`README.zh-CN.md` 和 `docs/cover.png` 未跟踪。保留原样，不混入适配提交。
- 未发现未提交玩法源码。Phase 9 已验收；iOS Safari、Android Chrome 和真人试玩证据仍待补齐。此结论来自仓库记录，不代表检查过所有其他任务的运行状态。
- 原阶段建议先收集真人证据再扩展。用户本次明确要求准备设备版，因此进行独立平台准备；不据此宣称 Web 待办完成，也不修改 Web 平衡。
- `src/core/rules.js` 有 8 种常规规则和 1 种精确匹配兜底；`src/config/difficulty.js` 有 2×2、2×3、3×3 棋盘及 4 色、4 形状、数字维度。
- `src/core/level.js`、`rng.js` 可作为离线关卡生成和语义对照来源。`combo.js`、战斗和升级含时间相关语义，不能全量照搬。
- Web 构建只复制根 `index.html` 和 `src/`；新增 `ports/` 不进入当前 Pages 产物。工作流 push 限 main，但 workflow_dispatch 尚无显式分支门禁，设备分支开始前应补齐。

## 学习来源与证据顺序

完整分页阅读了 [参考会话](codex://threads/01a07afc-6e9f-7f91-b293-957537ecc241)，并检查实际工作树 `D:/WebProjects/RoyalTapestry-xteink` 的源码、清单、视觉图及以下记录：

| 资料 | 可迁移经验 |
|---|---|
| `docs/XTEINK_PREPARATION.md` | 先检查脏区与未完工作，同仓库独立 worktree |
| `ports/xteink/docs/PLATFORM.md` | 带契约版本的 API 清单、能力边界与严格宿主 |
| `ports/xteink/docs/INK_DESIGN.md`、`ink-preview.png` | 原玩法身份优先、原创 1bit 图形、稳定触区和静态反馈 |
| `ports/xteink/app/index.lua`、`domain/app.lua` | 生命周期薄入口、事件处理、显式刷新请求 |
| `ports/xteink/docs/ONBOARDING.md` | 教学与正式局隔离、可跳过可复习、操作触发推进 |
| `ports/xteink/docs/VALIDATION.md` | JS/Lua 对照、触区与绘图预算、真实 Lua 回调预览 |
| `ports/xteink/docs/EXPORT-STATUS.md` | 源码一致性、退出自检失败、打包与交付分开记账 |

记录存在时间差：README 与部分验证文档仍写“尚未安装”。较晚会话明确有用户确认基础版安装，反馈翻页全刷反色、换牌未观察到闪烁和残影；最后新版 50,646 字节包已下载并复制，哈希一致，但未见新版安装完成反馈。不能把旧文档当最新状态，也不能把另一游戏的硬件表现当本项目验收。

## 平台事实的有效范围

下列为参考项目 2026-09-07 保存的官方前端契约观测，标识 `xtapp-lua-contracts@3872b1cd7c87e37f31f97aae30422f2a84fa37eb`，不是对今日平台的无条件保证。本轮尝试读取 [官方 Studio](https://xtapp-ai-dev.xteink.cn/studio)，网页工具无法访问正文；未登录或变更云端项目。实现 P0 时须用最新模板复核。

| 项目 | 历史观测 / 本轮处理 |
|---|---|
| 运行环境 | Lua 5.5、API 0.8、Pro 480×800；待当前设备确认 |
| 生命周期 | on_load / on_enter / on_input / on_draw；本地保持薄入口 |
| 绘图 | clear / rect / line / text；0 白、15 黑；不猜测字体大小和透明度参数 |
| 输入 | tap，方向键 / ok / back 的 down；不接管电源键 |
| 刷新 | 实际参考源码使用 request_refresh("partial"/"full")、invalidate、idle；仅为平台请求，非精确波形承诺 |
| 模块 | authoring require 在构建时展开；不能依赖运行时 require |
| 预算 | 历史 1024 绘图命令；on_load 200ms、on_input 400ms、on_draw 1500ms；本机耗时不是设备性能 |
| 保存 | ctx.state 快照可恢复不等于落盘；ctx:save() 历史列为 stub，不能用其返回值证明持久化 |
| 打包 | 已走通路径为 Studio 导出 .xtapp；未验证公开离线打包器，不断言只能 Studio 打包 |

## 必须吸收的经验

1. 保留产品身份：RoyalTapestry 从 ASCII 表单回到牌桌、牌角和花色。ThatButton 应保留反应堆仪表、几何按钮、危险指令和战斗结果，不能套牌桌皮肤。
2. 首屏能操作：不要长篇规则和逐步“下一步”打断每次操作。提示以祈使句表达，成功按实际状态推进；包含一次不标答案的独立判断。
3. 遮罩只弱化背景，交互也必须真正禁用。完成教学时只开放继续、重练、退出练习；教学中禁用再次进入教学，避免递归。
4. 1bit 条纹不是透明灰。参考方案缩到非整数比例出现摩尔纹；按原生分辨率检查，再看真机。当前概念稿不用条纹遮罩。
5. 高频操作优先局刷，无效/重复输入不重绘。全刷放在入场、大场景变化或人工清屏；不要先写死“每 N 次全刷”。
6. 图形数字要整套比较，特别是 1/7、6/9 等；参考项目 Q/9 的修正不能只改一个孤立字形。设备实现用整套像素数字，中文用验证过的宿主字体。
7. 本地源码唯一维护源，直接上传构建产物；Studio 的修复先 diff，再回写本地并重建。上传重名生成 index-2.lua 等时须确认真正入口。
8. Studio 自动按键遍历曾触发 ctx:quit() 导致导出失败。首版不放应用内退出按钮，保留返回和退出练习；此为历史规避方案，不把合法 API 说成永久不可用。
9. 平台异常应尽早请求可定位的诊断，避免无止境刷新。后续若要代用户发送 Studio 消息，应在该次任务有明确授权；历史会话授权不当成本轮发送指令。
10. 本地通过、Studio 通过、打包成功、文件下载、USB 复制、设备安装和设备验收是不同状态，各自保留证据。

## 本轮产物和下一步

已准备平台经验、设备交互与美学、模块边界、分阶段验收，以及可点击概念稿。未创建工作树、提交或推送，未修改生产玩法。

下一步先试玩概念稿，确认“组别标签替代颜色”和“无倒计时的回合制”是否符合方向；随后 P0 复核契约并打通最小 .xtapp 安装。正式 Lua 开发建议在同仓库独立 `codex/xteink` 分支/worktree 进行，当前目录继续服务 Web；准备资料需显式带入，不能误以为 worktree 自动包含未提交文件。

本轮验证：`npm run validate` 通过，`git diff --check` 通过（既有文件有 Windows 换行提示）。浏览器实际点击确认误按扣盾并锁定、7 个安全键全部解除后结算、进入练习后正确反馈、退出练习恢复正式局。检查了初始画面，并修正数字底色切断形状轮廓的问题。实体键全路径、窄屏和设备体验尚未完整验收；本轮没有 Lua 测试或真机测试。
