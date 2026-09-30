# 微信小游戏 READY 顶栏改稿

日期：2026-09-30。原来的 `READY` 实际由 `pre-combo.js` 现场绘制，采用细斜体、白色外框、深蓝二重描边和粗下划线。虽然旧概念目录中有 READY 透明图，运行时此前没有使用它。用户提供的顶部截图揭示了这处风格不一致。

以[完整局内截图为底设计并提取](../ports/wechat/assets/concepts/2026-09-30/ready-v21/README.md)后，接入深蓝直立粗字、黄色闪电和两枚小光点的透明切图。字标在顶栏中央按可用宽高等比缩放，不跨入左右牌或规则卡；素材解码失败时回退成简洁深蓝 `READY` 文本。第一下安全按钮对应的 `1 HIT!` 也去除多层描边与斜体，保留由实际连击窗口驱动的细金色进度弧线。

## 验收

| 状态 | 390×844 / 安全区 47px | 320×568 / 安全区 46px |
| --- | --- | --- |
| 0 次 READY | [截图](../ports/wechat/tests/visual-evidence/v21ready-game-combo0-390-safe47.png) | [截图](../ports/wechat/tests/visual-evidence/v21ready-game-combo0-320-safe46.png) |
| 1 次 HIT | [截图](../ports/wechat/tests/visual-evidence/v21readyfixed-game-combo1-390-safe47.png) | [截图](../ports/wechat/tests/visual-evidence/v21readyfixed-game-combo1-320-safe46.png) |

两种尺寸下，三个顶栏元素未相撞，规则卡上缘完整。透明切图宽 360、高 136，角像素 alpha 为 0；构建输出已包含 `art/ready-wordmark-v21.png`。根项目 `npm run validate`、小游戏 `npm run check` 通过。截图来自浏览器 Canvas 预览，微信开发者工具模拟器仍需再次编译复核。
