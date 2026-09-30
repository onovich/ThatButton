# 微信小游戏升级页 v24 细节复核

日期：2026-10-01。v23 升级页已获用户验收，本轮按七项反馈细修。

## 改动

1. 底部提示改为“选择后立刻生效”。
2. 从 [v22 整页原画](../ports/wechat/assets/concepts/2026-09-30/upgrade-v22/upgrade-fullscreen-study.png)抽出标题周围和角色旁的白色爆发线，作为独立透明层。
3. 体力心形徽章向分隔线靠近，文本最大字号从约 15 px 调到约 14 px，并按实际 `measureText()` 宽度缩小，保留右侧内边距。
4. 分数采用较大的数字和稍小的“本局”“分”，三段整体居中。字号以三段实测宽度相同比例缩放，长分数不会越过分隔线。
5. 底部灌木改从原画按绿色轮廓提取，保持自然高宽与不规则顶部，不再把高图强压到屏幕的 10%。
6. 新升级背景使用舞台图的完整横向云层，并与原画底部灌木组合；首页专用深蓝爆发线不进入升级页。
7. 升级页改用接近原画奔跑姿势的专属透明角色层，并修复大脑抬起右臂的肘部连接。首页和结算页的 v11 角色资源未变。

升级页专用资源由 [prepare-upgrade-v24.py](../ports/wechat/scripts/prepare-upgrade-v24.py)重建。角色透明母图是内置 `image_gen` 对[原画角色裁片](../ports/wechat/assets/concepts/2026-09-30/upgrade-v22/upgrade-character-edit-target-v24.png)的局部编辑；保存于 [upgrade-pair-v24-generated-master.png](../ports/wechat/assets/concepts/2026-09-30/upgrade-v22/upgrade-pair-v24-generated-master.png)。另一输入参考为已接受的 v11 三屏图。提示词要求只提取双角色、透明背景、保留神态和轮廓及两只鞋，修复大脑右臂的肩—肘—手连续关系，并移除气泡、云朵、爆发线和文字。角色与其他层按不同图层加载；没有对整页重新生图。

实际使用的内置 `image_gen` 提示词：

> Use case: precise-object-edit. Asset type: transparent character pair for a WeChat mini game upgrade screen. Image 1 is the exact edit target: crop from the approved full-page upgrade painting. Image 2 is a visual identity and anatomy reference (the approved v11 three-screen art). Isolate ONLY the pink brain and white glove characters from Image 1 onto a genuinely transparent background. Keep their original upgrade-page running/celebratory pose, facing right, their expressions, body proportions, navy outlines, thin white outer rims, glossy color blocks, and two navy legs/shoes on the glove. Repair the pink brain's raised right arm near the glove: make the shoulder, elbow, forearm and small hand a single naturally jointed continuous limb reaching toward the glove, with no kink/twisted elbow and no extra arm. Preserve the brain's other arm and both legs. Do not include the yellow background, speech bubble, white burst rays, clouds, ground, text, or UI. Keep both complete characters in one wide transparent PNG, with clean antialiased edges and a little transparent breathing room. This is a localized anatomy correction and extraction, not a redesign.

为给新图层留包体空间，将原 1774 px 的 COMBO 美术字另存为 256 色 PNG。手机画面仍使用相同原图与尺寸；v17 源文件保留，构建只采用压缩后的 v24 文件。

## 视觉与构建检查

- [328×710，1180 分、100/100 体力](../ports/wechat/tests/visual-evidence/v24-upgrade-score1180-simulator-order-hp100-328-safe54.png)：核对常用状态的分数强调、体力右边距、角色与原画线条。
- [328×710，1,234,567 分、124/124 体力](../ports/wechat/tests/visual-evidence/v24-upgrade-score1234567-simulator-order-hp124-maxhp124-328-safe54.png)：核对动态字号。
- [320×568，999,999,999 分、999/999 体力](../ports/wechat/tests/visual-evidence/v24-upgrade-score999999999-fourth-hp999-maxhp999-320-safe46.png)：核对极端文字长度与短屏卡片。
- [390×844 常规屏](../ports/wechat/tests/visual-evidence/v24-upgrade-390-safe47.png)：核对三卡、云朵及灌木比例。

上述截图由与小游戏共用的 Canvas 渲染器生成。微信开发者工具中的 v24 实时画面仍需重新编译后复核。

`ports/wechat: npm run check`、根项目 `npm run validate` 与 `npm run build` 均通过；v11 角色基准校验通过。小游戏构建为 **3,633,458 字节**，距 4 MiB 上限余 **560,846 字节**。构建检查还确认新角色、背景、白线和压缩 COMBO 资源已打包，旧 COMBO 文件未残留。
