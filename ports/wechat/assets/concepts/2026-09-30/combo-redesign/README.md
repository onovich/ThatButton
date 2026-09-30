# 局内连击字标：整屏设计交付

这是以已签收 v15 局内原画为底的连击细节设计。v11 角色、规则牌、积木按钮、底部风景及状态面板来自原稿，未重画；只有顶部连击区域改为开放式漫画字标。相邻的 combo-v17/combo-full-screen-study.png 是前期生图方向参考，不能整体替换原画或作为运行时界面。

v17 运行候选已与本稿逐图对照；最终采用建议和小屏间距规格见 [V17_RUNTIME_REVIEW.md](V17_RUNTIME_REVIEW.md)。运行时透明字标比下列早期 HTML 字形更清晰，接入时以 v17 运行候选为准。

## 整屏效果图

| 状态 | 320×568、顶部安全区 46px | 390×844、顶部安全区 10px |
| --- | --- | --- |
| 4 连击 | [combo-full-320x568-safe46-count4.png](combo-full-320x568-safe46-count4.png) | [combo-full-390x844-safe10-count4.png](combo-full-390x844-safe10-count4.png) |
| 12 连击 | [combo-full-320x568-safe46-count12.png](combo-full-320x568-safe46-count12.png) | [combo-full-390x844-safe10-count12.png](combo-full-390x844-safe10-count12.png) |
| 无连击 | [combo-full-320x568-safe46-count0.png](combo-full-320x568-safe46-count0.png) | 不绘制连击字标 |

可编辑整屏源为 [gameplay-combo-study.html](gameplay-combo-study.html)，通过 [render-combo.ps1](render-combo.ps1) 导出截图。HTML 是视觉规格，不是小游戏运行时代码。已有 v16 的奶油色连击贴纸和“接续 2.1 秒”小字应由本方案替代。

## 视觉与状态

- 顶部两个信息牌保持原位置。中间不加第三张卡片；橙色动态数字与黄色 COMBO! 使用深蓝粗描边、细白色分离边，整体向左倾约 4°。数字和字母在同一行，下面以一条短金色弧线收束。
- 接续时间不以文字或秒数显示。弧线中的橙色线段按剩余时间与总接续时间的比例缩短。玩家仍可从局内主倒计时读取本轮时间，两种时间不会挤成两行小字。
- 连击为 0、未建立或中断后，完全隐藏字标；不显示“连击待命”“连击中断”占位文案。连击增加可短暂放大，最大 6%，须重新按中间可用宽度约束。
- 两位数使用同一字形与字号，并在宽度不足时将整组等比缩小。上限展示建议 99；更高数值若玩法需要精确显示，应重新评估顶部牌宽，不裁字。
- 这块区域不提供点击行为，不能盖住关卡或分数牌的视觉边框与触摸区。

## Canvas 接入

[draw-combo-mark.mjs](draw-combo-mark.mjs) 是可拆分的 Canvas 字形方案：动态数字、静态 COMBO!、白色外缘、深蓝描边和接续弧线由代码绘制，无需使用整屏位图或加载新运行时资源。在已绘制关卡牌和分数牌后调用，传入 ctx、连击区域的 left/top/width/height、count、remainingMs、windowMs 和 pulse。其中 windowMs 对应现有 comboWindow.comboWindowMs。

[combo-word-layer.svg](combo-word-layer.svg) 另给出无背景、无动态数字的静态 COMBO! 字形分层源，便于美术调整字重与描边。它是透明矢量交付件，不建议直接依赖微信 Canvas 对 SVG 的解码；若需位图资源，请按目标尺寸栅格化后与动态数字、接续弧线分别绘制。当前整屏预览采用同类可编辑字形与弧线，并非把这张 SVG 贴到画面上。

[combo-canvas-lettering-proof.png](combo-canvas-lettering-proof.png) 是绘制函数在浏览器 Canvas 上以 320 和 390 的实际中间宽度渲染 4／12 连击的校样；测试入口在 [canvas-lettering-test.html](canvas-lettering-test.html)。

现有 renderer.js 的 comboX／comboW 区间可直接作为布局输入：320 宽时约为 x=108、w=108；390 宽时约为 x=126、w=144。绘制函数在区间内测量实际文字宽度，再整体缩放，因此不会因 12 连击或系统字体差异冲出边界。字体优先 Arial Black，回退 Arial；使用 strokeText 和 fillText 保持描边一致。如果真机文字宽度仍有差异，以实测 measureText 与画面边距为准。

现有 src/core/combo.js 的 getComboWindowFacts 已返回 comboWindowMs、remainingMs 和 remainingPercent。没有有效总时长时，字标仍显示，弧线作为静态金色底纹，不显示伪造百分比。

## 验收点

1. 在 320×568、安全区 46px 和 390×844 的完整游戏画面看 4 连击、12 连击、无连击；两位数不能碰到关卡牌或分数牌。
2. 检查 COMBO! 在实际手机尺寸可读；规则卡、倒计时、九个按钮、角色与底部面板保持 v15 已签收视觉。
3. 接入时通过真实游戏状态更新数字和弧线，不把效果图贴到 Canvas；无连击时顶部中间应自然留白。
4. 用开发者工具截图及真机检查字形、白边和安全区。上述效果图来自浏览器原画预览，不等同于微信真机验证。
