# 微信小游戏 v16 视觉精修与验收

日期：2026-09-30。依据已签收的 v15 原画，精修运行时 Canvas 画面；不改动 v11 角色基准和 Web 端玩法。

## 本轮改动

- **连击：**用内置 `image_gen` 生成独立透明徽章 `ports/wechat/assets/runtime/combo-plaque-v16.png`，绘制在关卡牌与分数牌之间。数字和接续时间仍由游戏状态实时绘制，奖励时轻微放大。这个位置与 v15 原画的闪电牌一致，不遮挡规则、按钮或角色。
- **反馈：**删除局内底部白底黑字提示条。挑战进度增量不再弹字；进度、体力、分数分别由现有高对比数值和进度条表达。误按仍用按钮凹陷与红色外框反馈。安全按钮保持凸起／按下两种实体状态，没有勾号。
- **首页：**按原画重新对齐顶部入口、标题、倾斜标语、奔跑角色、主按钮和纪录牌，放大主按钮字样与亮面侧壁。针对 320×568 顶部安全区 46px 和 390×844 画布分别调整角色比例。
- **局内：**调整顶部牌、规则卡、分句换行、秒表、按钮矩阵、底部风景与角色以及体力／挑战进度面板的尺寸和位置。按钮使用原画式亮面、彩色侧壁、深蓝底座和内凹按下态。
- **结算：**按原画重排标题、倾斜原因牌、双角色、分数卡、复盘卡和操作按钮。复盘内容使用深蓝标签加红色关键字；体力耗尽与时间耗尽使用不同高度的复盘卡。

## 生图资产

使用内置 `image_gen` 的 `stylized-concept` 模式，以 `gameplay-v15-320x568-safe46.png` 为视觉参考生成一张透明贴纸徽章。角色和整屏原画未重新生成。原始输出作为 `combo-plaque-v16.png` 原样复制到运行时素材目录，并由 `scripts/build.mjs` 放入 `build/art/`；主包构建约 2.95 MB。

提示词：

> Use case: stylized-concept. Asset type: transparent 2D UI overlay asset for the top-center combo indicator in the WeChat Mini Game 手指等等我. Use the provided v15 gameplay screenshot as the visual reference. Create ONE compact horizontal comic sticker badge, about 3:1 width-to-height: warm cream/yellow lightly irregular banner, one small energetic orange-red lightning bolt at the left, a clean generous blank area across the center and right where Canvas will later draw a dynamic Chinese combo count. Thick but tidy deep navy hand-ink outline, thin white sticker edge, subtle golden lower extruded edge, glossy bright child-friendly finish. Match the original screenshot's top-center combo plaque and adjacent yellow level plaque, with restrained depth so it remains readable at roughly 95×38 logical pixels. Transparent outside the sticker. No words, letters, numerals, symbols other than the single lightning bolt, no characters, no full phone UI, no border around the whole image, no background, no watermark. Preserve the reference project's cheerful comic palette and clean shapes.

## 逐图复验

`ports/wechat/tests/render-preview.ps1` 使用本地静态服务和 Chrome/Edge 导出 Canvas 运行时截图；它们与 `assets/concepts/2026-09-29/v15-art-polish/` 中的签收原画逐图比对。下列图片位于 `ports/wechat/tests/visual-evidence/`：

| 状态 | 320×568、安全区 46px | 390×844 |
| --- | --- | --- |
| 首页 | `v16-home-320-safe46.png` | `v16-home-390-safe10.png` |
| 局内 | `v16-game-320-safe46.png` | `v16-game-390-safe10.png` |
| 体力耗尽 | `v16-result-320-safe46.png` | `v16-result-390-safe10.png` |
| 时间耗尽 | `v16-result-timeout-320-safe46.png` | `v16-result-timeout-390-safe10.png` |

另外检查了顶部安全区 47px 的 390×844 画布：`v16-home-390-safe47.png`、`v16-game-390-safe47.png`、`v16-result-390-safe47.png`。
最长条件复盘另存 `v16-result-long-rule-320-safe46.png` 和 `v16-result-long-rule-390-safe10.png`，确认完整条件仍在复盘卡内。

复验结果：320 画面各主模块未重叠、按钮和底部状态面板完整可见；390 规则按条件分为两行，局内角色、按钮和状态面板与原画顺序及比例基本对齐。结算页两种原因均保留角色与操作按钮，短复盘卡不再占用无内容的留白。顶部安全区增大时，结算角色按可用空间等比例缩小，避免与原因牌相碰。

## 工程检查

- `ports/wechat`: `npm run check` 通过，含小游戏构建和集成检查。
- 根项目：`npm run validate`、`npm run build` 通过。
- `verify-character-baseline.ps1` 通过，v11 两张基准图未改变。
- `git diff --check` 通过。
- 微信开发者工具 CLI 对 `ports/wechat/build` 返回 `√ open`；本轮视觉截图来自 Chrome Canvas 预览，尚不等同于微信真机截图。

下一步真机复核重点：顶部胶囊与安全区、生成徽章的解码、长规则在小屏的断行，以及连击奖励短暂放大时是否仍避开关卡牌和分数牌。
