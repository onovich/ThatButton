# 微信小游戏 v19 姿态序列帧与换关节奏（已暂停）

> 2026-09-30 用户反馈：角色姿态序列帧观感怪且不一致，已从运行时撤回。当前采用 [角色动画回退记录](WECHAT_FRONTEND_V20_CHARACTER_MOTION_ROLLBACK.md) 所述的 v11 静态原图轻抖动；本页的序列帧说明仅保留为历史记录。换关、按钮、数值和布局部分继续生效。

日期：2026-09-30。针对用户对 v18“整图抖动”的反馈，改为真实重画的角色姿态关键帧，并修正分数牌光学对齐、按钮按下亮度和换关时的计时顺序。

## 角色序列帧

- 原有三张 v11 运行时透明角色图继续作为每段动画的第 0 帧。内置 `image_gen` 逐场景编辑生成 [六张新增透明关键帧](../ports/wechat/assets/concepts/2026-09-30/character-frames-v19/README.md)：首页奔跑两帧、局内分立两帧、结算抬手／扶头两帧。动画实际改变腿、鞋、手臂及扶头姿态，不再对整幅原图做循环位移和旋转。
- 首页与局内按 `0 → 1 → 2 → 1` 循环，分别为 8 fps 和 6 fps；结算在稳定 300ms 后按 `0 → 0 → 1 → 2 → 2 → 2 → 1 → 0`、6 fps 循环，让扶头接触停留更久。由 [character-frames.js](../ports/wechat/src/character-frames.js) 定义帧序，[renderer.js](../ports/wechat/src/renderer.js) 直接切换位图。缺失新增帧时回退原图，不阻断游戏。
- 原始生成 PNG 存在版本化概念目录，`prepare-character-frames.ps1` 将其机械缩放、保留透明度并导出六张运行时 PNG。浏览器黄色背景合成和实际手机尺寸截图已检查；六张运行图共约 0.75 MB，构建包约 3.52 MB。v11 两张主基准图未修改。
- [动态预览](../ports/wechat/assets/concepts/2026-09-30/character-frames-v19/preview.html) 将原画第 0 帧与新增帧按运行时节奏循环，可暂停检查姿态和透明边缘。

## 布局和反馈

- 局内分数牌的数字和“分”作为一个测量后的整体水平居中，文字基线下移 5px 修正粗体数字贴近上边框的光学偏差；六位分数压力图仍在框内。
- 九宫格的图案、间距与两位数字继续按组合居中。已检查 320×568／顶部安全区 46px 和 390×844／顶部安全区 47px，圆形、三角形、方形、星形及两位数字都留在按钮正面。
- 已按下的按钮保留实体下陷，并在正面加深蓝色半透明暗层，和未按的亮面明显区分。
- 底部体力心形以约 1.05 秒、挑战进度星形以约 1.47 秒作幅度克制的循环呼吸；危急倒计时仍沿用短脉动。它们不推动文字和状态牌布局。

## 换关状态机

普通清轮或击败考官后，旧按钮按格序每隔 45ms 缩小淡出；角色维持原位置、原帧周期，不再次淡入。新关按钮每隔 45ms 从小尺寸弹入，并以过冲缓动复位。

`game-session.js` 在新按钮全部入场前保持 `isPlaying = false`：此时拒绝按钮输入、倒计时不减，关卡的 `roundStartedAtMs` 和 `lastTime` 在入场完成时才设置。新关的初始剩余时间会立即显示，但在动画期间保持固定。Web 渲染器没有这一可选换关钩子，仍沿用原即时开局流程。

小游戏渲染器仅在一局真正重新开始时重置局内角色起始时间；连续关卡和升级后返回均保留角色图层的逻辑状态。新关只更新关卡内容和按钮动画。相机震动后的按钮命中仍按画面偏移校正。

## 视觉证据

下列图片由本地 Chrome Canvas 预览导出，位于 [visual-evidence](../ports/wechat/tests/visual-evidence/)：

| 检查点 | 截图 |
| --- | --- |
| 首页不同姿态 | `v19-home-motion-t300-390-safe47.png`、`v19-home-motion-t470-390-safe47.png` |
| 局内不同姿态与暗下按钮 | `v19-game-motion-t300-390-safe47.png`、`v19-game-motion-t470-390-safe47.png`、`v19-game-390-safe47.png` |
| 结算抬手与扶头动作 | `v19-result-motion-t650-390-safe47.png`、`v19-result-motion-t850-390-safe47.png` |
| 旧按钮退场／新按钮入场 | `v19-game-motion-round-exit-t290-390-safe47.png`、`v19-game-motion-round-enter-t290-390-safe47.png`、`v19-game-motion-round-enter-t650-390-safe47.png` |
| 分数与小屏排版 | `v19-game-score123456-320-safe46.png`、`v19-game-320-safe46.png` |

这些是浏览器 Canvas 截图；结算帧节奏按原画复核意见调整后，又生成了 `v19-result-motion-t650-390-safe47.png` 和 `v19-result-motion-t850-390-safe47.png` 对照。微信开发者工具 CLI 已对 `ports/wechat/build` 返回 `√ open`，但其 `wechatide` 自动化当前返回 `Waiting for user authorization`；模拟器截图和触控验收须待开发者工具内批准后继续。真机还需复核 paletted PNG 解码与帧率。

## 检查

- `ports/wechat`：`npm run check` 通过；新增集成检查验证旧关退场时停表、新关入场期间停表与禁止点击、入场后恢复计时。
- 根项目：`npm run validate`、`npm run build` 通过；Web 端静态结构未受影响。
- `verify-character-baseline.ps1` 和 `git diff --check` 通过。
- 原画负责人逐张复核新增源图与运行图，确认没有多余肢体、两只深蓝鞋和外侧细白边完整；结算扶头帧通过，并建议增加接触停留，已采纳。
