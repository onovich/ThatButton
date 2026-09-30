# v25 原画接入暂停交接

2026-10-01：用户准备重启、升级 Codex，要求立即暂停。保留所有未提交文件；本记录之后不继续修改或清理。

## 已完成

- 找到开发工具 READY 偏差原因：运行时原本加载 `ready-wordmark-v21.png`（直立深蓝字），1 HIT! 由 Canvas 普通文字绘制。
- 将用户认可的 READY 与同系列 1 HIT! 透明切图复制为 `assets/runtime/ready-wordmark-v25.png`、`hit-wordmark-v25.png`；`src/pre-combo.js` 改为绘制两张图，1 HIT! 金色弧线仍按真实剩余比例绘制。
- 用 `scripts/prepare-combo-digits-v25.py` 生成 0–9 黄橙、深蓝轮廓、细白边数字图集 `assets/runtime/combo-digits-v25.png`；`src/renderer.js` 的 COMBO 数字优先绘制图集，保留素材解码失败时的文本兜底。`src/game.js`、`scripts/build.mjs`、`tests/visual-preview.html` 已接入三张新素材。
- 新建 `assets/concepts/2026-10-01/final-art-gallery/render-final.ps1` 和 `index.html`。页面按封面、局内、升级、结算、辅助界面陈列当前定稿截图及运行时原画，不列过程稿；页面结构和素材链接已写好。
- 已生成并逐张查看 `final-game-ready/hit/combo` 的 390 与 320 共 6 张截图。READY/HIT 与用户给定的贴纸字标一致；12 COMBO 数字间距已收紧，顶栏未碰撞。

## 尚未完成

1. `final-art-gallery/index.html` 引用的封面、升级、结算、玩法说明、设置、继续游戏和资源异常截图尚未生成；运行 `render-final.ps1` 不带 `-Only` 后检查全部界面。升级页气泡 v25 正由小游戏负责人处理，先确认其最终接入再导出。
2. 原 `assets/concepts/2026-09-30/combo-idle-motion/index.html` 仍展示过程研究，尚未改为指向新的最终陈列页。可保留旧内容为不公开链接的归档，但用户当前打开的旧 URL 应跳转或展示新页。
3. 尚未为新三张素材补集成断言，也未运行本轮 `npm run build`、`ports/wechat` 的 `npm run check`、v11 基准校验和微信开发者工具复核。需检查 4 MiB 包体余量。
4. 数字图集已在 12 COMBO 画面核对；恢复后可快速检查单数字和三位数边界，避免顶栏挤压。

## 本轮改动范围

- `ports/wechat/src/pre-combo.js`
- `ports/wechat/src/renderer.js`：只改顶部连击数字函数与 0/1 字标调用处；同文件其他区域有小游戏负责人正在进行的升级页改动，不要覆盖。
- `ports/wechat/src/game.js`、`ports/wechat/scripts/build.mjs`、`ports/wechat/tests/visual-preview.html`
- `ports/wechat/scripts/prepare-combo-digits-v25.py`
- `ports/wechat/assets/runtime/ready-wordmark-v25.png`、`hit-wordmark-v25.png`、`combo-digits-v25.png`
- `ports/wechat/assets/concepts/2026-10-01/final-art-gallery/`（HTML、导出脚本、6 张局内截图）

## 恢复第一步

先查看小游戏负责人升级气泡 v25 的最终文件及 `git status`，确认共享 `renderer.js` 没有冲突；随后运行 `final-art-gallery/render-final.ps1` 补齐页面截图并逐张检查，再做旧页指向、构建和检查。不要清理或重置当前工作树。
