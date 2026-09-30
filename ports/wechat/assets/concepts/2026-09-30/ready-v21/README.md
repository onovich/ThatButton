# READY 顶栏改稿 v21

用户指出原来的 `READY` 细斜体、多层描边与整套界面不协调。本稿用完整的 390×844 局内运行截图作为编辑目标，经内置 `image_gen` 做[整屏设计研究](ready-fullscreen-study.png)，再用它提取[透明原稿](ready-transparent-master.png)。仅从透明原稿机械裁切并缩到 3x，得到[正式切图](ready-wordmark-3x.png)（360×136，透明背景）；运行时副本为 `assets/runtime/ready-wordmark-v21.png`。

## 生图提示词

整屏编辑：`Use case: precise-object-edit. Asset type: full-screen 390×844 WeChat mini-game UI design study. The supplied screenshot is the exact edit target and complete style reference. Change ONLY the small READY mark in the top header center, between the yellow level plaque and white score plaque (roughly x=128–274, y=62–111). Keep every other pixel, all Chinese text, numbers, tiles, characters, background, positions and proportions faithful to the reference. Redesign READY as a compact, polished pre-combo status that belongs to this UI: upright chunky readable uppercase letters R E A D Y, deep navy ink matching the UI text, a small warm yellow or cyan accent and perhaps a tiny lightning spark, restrained two-dimensional playful game graphic. Its weight must be quieter than the two neighbouring plaques and much quieter than a COMBO celebration. NO thick white sticker border, NO double outline, NO thin italic slanted lettering, NO large swoosh underline, NO enclosing extra rectangular badge, NO overlap with plaques or rule card. Maintain generous whitespace. Exact text READY, no additional text. This output is for design exploration; preserve the surrounding game screen exactly so the header can be judged in context.`

透明提取：`Use case: background-extraction. Asset type: transparent READY status wordmark for the exact game screen shown in the reference. Extract and preserve ONLY the redesigned top-center mark from the provided full-screen image: the tiny yellow lightning bolt at left, the upright chunky deep-navy uppercase letters READY, and the two tiny warm-yellow rays above the letters. Keep their exact relative spacing, colors and simple crisp 2D contours; do not redesign, slant or add outlines. Remove the entire screen, background, cream rectangle, neighbouring level/score plaques, all other text and icons. Output a tightly framed PNG with genuine transparent pixels around this mark, centered and with about 5% clear padding. Exact spelling R E A D Y. No shadow, no underline, no white sticker rim, no extra symbols.`

## 接入边界

整屏研究图只作比例与风格判断，**没有**替换游戏全屏画面。运行时只加载透明 READY 切图，在顶栏中央等比绘制；其他界面像素仍由原有 Canvas 与已验收素材组成。`1 HIT!` 同步去掉原来的细斜体、多重描边，改为直立深蓝字、黄色数字与细金色真实进度弧线。
