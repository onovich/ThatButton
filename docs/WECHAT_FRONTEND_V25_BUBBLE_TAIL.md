# 升级页气泡尾角 v25 修复

日期：2026-10-01。用户提供的开发者工具截图显示气泡右下角的轮廓像被切掉一块。

## 原因与处理

v23 透明层的提取遮罩在尾角右侧以 `x=430` 垂直截断，还把少量黄色背景保留为不透明像素。尾尖本身完整，但返回气泡主体的上侧线条在角色旁中断。

使用内置 `image_gen`，以[原画气泡裁片](../ports/wechat/assets/concepts/2026-09-30/upgrade-v22/bubble-source-crop.png)及 v23 切图为参考，生成[完整尾角参考图](../ports/wechat/assets/concepts/2026-09-30/upgrade-v22/bubble-tail-v25-generated-master.png)。生成稿的整体文字与原画有细微差别，因此最终运行资源没有重绘文字；[prepare-upgrade-bubble-v25.py](../ports/wechat/scripts/prepare-upgrade-bubble-v25.py)沿生成稿确认的曲线范围，从原画重新提取尾角，去除黄色和粉色杂像素，输出[气泡 v25](../ports/wechat/assets/runtime/upgrade-bubble-v25.png)。画面中角色改在气泡之后绘制，恢复原画里的遮挡关系。

生图提示词：

> Use case: precise-object-edit. Asset type: transparent illustrated dialogue bubble for a WeChat mini game. Image 1 is the edit target: the original yellow-background crop of the approved upgrade-page speech bubble. Image 2 shows the current isolated bubble with a visibly squared-off, missing section at its lower-right edge. Reconstruct ONLY the missing lower-right outline and speech-tail connection so the cream-white bubble has one smooth continuous deep-navy border and thin coral shadow, matching the original line weight and curvature. Remove the pink character fragment and yellow background from the bubble asset; make the exterior genuinely transparent. Preserve the bubble's overall wide shape, exact original Chinese text and typography: first line '挑战进度已满', second line '选一个升级，继续下一关', with '选一个升级' red and the rest navy. Do not redesign the bubble, change the text, move the text, introduce decorative elements, or change the left side. The repair must be local and pixel-clean at small phone display size.

## 复核

- [328×710 升级页](../ports/wechat/tests/visual-evidence/v25-upgrade-score1180-simulator-order-hp100-328-safe54.png)及[尾角放大图](../ports/wechat/tests/visual-evidence/v25-bubble-tail-zoom.png)。
- [320×568](../ports/wechat/tests/visual-evidence/v25-upgrade-320-safe46.png)和[390×844](../ports/wechat/tests/visual-evidence/v25-upgrade-390-safe47.png)画面中，尾尖与右侧描边相连，角色自然盖住气泡的末端。
- 小游戏 `npm run check`、根项目 `npm run validate` / `npm run build` 均通过。构建产物包含 v25 气泡、不含旧 v23 气泡；当前包体 3,633,925 字节，距 4 MiB 余 560,379 字节。

截图来自与小游戏相同的 Canvas 渲染器。微信开发者工具的 v25 实时画面需重新编译后确认。
