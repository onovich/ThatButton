# 微信小游戏 v17 连击视觉调整

日期：2026-09-30。用户指出 v16 连击徽章和中文提示不符合整屏风格，要求原画负责人以完整局内画面为底重新设计，并可采用英文与阿拉伯数字的美术字。

## 原画协作与生图

- 已将反馈发送给原画会话，要求在 320×568（顶部安全区 46px）和 390×844 两种完整局内画面上验证：无连击、4 连击、12 连击；提供透明独立图层和动态数字排版，保持已验收的 v11 角色与 v15 页面结构。
- 使用内置 `image_gen` 以当前运行画面和已验收的 v15 局内稿为参考，生成[整屏风格探索稿](../ports/wechat/assets/concepts/2026-09-30/combo-v17/combo-full-screen-study.png)。它只用于讨论连击位置、色彩与字形；生图重绘了其他画面内容，不作为运行时整屏素材。
- 从整屏方向继续生成[透明 `COMBO!` 字标](../ports/wechat/assets/concepts/2026-09-30/combo-v17/combo-wordmark-transparent-study.png)，另存为运行时素材 `ports/wechat/assets/runtime/combo-wordmark-v17.png`。字标使用黄橙渐变、深蓝主轮廓、细白分离边和短金色弧线，留出数字位置。
- 原画负责人按完整局内画面提交了[0／4／12 连击设计与 Canvas 分层方案](../ports/wechat/assets/concepts/2026-09-30/combo-redesign/README.md)，并在[运行图终审](../ports/wechat/assets/concepts/2026-09-30/combo-redesign/V17_RUNTIME_REVIEW.md)中确认以透明 `COMBO!` 字标为最终视觉方向。按其意见，320 宽度下字标上移 2px，接续进度仅绘制在现有金色弧线内部。

## 运行时表现

- 连击出现在关卡牌和分数牌之间；无连击时该区域留白，避免常驻装饰抢走分数和规则的注意力。
- `COMBO!` 是透明图层，阿拉伯数字由 Canvas 根据真实连击数绘制。数字按一位、两位、三位缩放，采用相同的黄橙渐变、深蓝及白色轮廓；奖励时轻微脉动。采纳原画负责人的接续弧线思路，在字标底部金色弧线上用橙色短线呈现剩余比例，不再用小字占据空间。
- 删除 v16 的奶油色徽章、`4 连击` 和 `接续 2.1 秒` 小字。连击接续时间仍由游戏逻辑计算，界面不再显示小号倒计时文本。
- 构建将字标复制到 `build/art/combo-wordmark-v17.png`，页面其他素材和 Web 端未改动。
- 微信开发者工具占用 `build/` 时，构建脚本也会单独移除已弃用的 v16 徽章，防止旧图片滞留在小程序包。复建后旧徽章不存在，构建目录约 2.61 MiB。

## 屏幕检查

下列截图由 `ports/wechat/tests/render-preview.ps1 -Version v17` 在本地 Chrome Canvas 预览生成，保存在 `ports/wechat/tests/visual-evidence/`：

| 状态 | 截图 |
| --- | --- |
| 4 连击，窄屏安全区 46px | `v17-game-320-safe46.png` |
| 4 连击，390 屏安全区 47px | `v17-game-390-safe47.png` |
| 12 连击，窄屏安全区 46px | `v17-game-combo12-320-safe46.png` |
| 12 连击，390 屏安全区 47px | `v17-game-combo12-390-safe47.png` |
| 无连击，390 屏安全区 47px | `v17-game-combo0-390-safe47.png` |
| 接续时间剩余 600ms，390 屏安全区 47px | `v17-game-remaining600-390-safe47.png` |

逐图查看后，连击字标与关卡牌、分数牌、下方规则卡均不重叠；两位数仍可辨读，无连击状态干净；接续弧线从 2100ms 到 600ms 明显缩短。原画负责人已经逐图审阅并签收该方向。上述截图是 Canvas 预览，并非微信真机截图。

## 检查

- `ports/wechat` 的 `npm run check` 通过；其中包含构建及小游戏集成检查。
- 根项目 `npm run validate`、`npm run build` 通过，Web 端结构及静态构建未受影响。
- `verify-character-baseline.ps1` 通过，v11 两张角色基准图未改变。
- `git diff --check` 通过。
