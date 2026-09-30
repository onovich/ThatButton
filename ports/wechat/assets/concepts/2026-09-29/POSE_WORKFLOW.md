# 结算角色：独立验收与固定图层合成

之前反复失败的原因是同时让生图模型改全局画面、转动身体、重排弯腿，并用“不要多画手脚”约束数量。侧面遮挡使它补出第五个粉色端点；锁住旧腿又会出现侧面身体配正面膝盖。即使[独立侧跪角色](brain-failure-side-kneel-four-limbs.png)通过验收，生图模型在整屏“合成”时仍会重画脚的形状。当前[三屏图](hybrid-ui-v11-unified-thin-rim.png)继续采用**生图清洁底板 + 固定透明图层合成**，并以薄白边统一用户选定的 B 稿双人表演。

## 当前 B 稿双人表演

1. 从 B 稿结算页和用户截图提取[透明双人组](brain-glove-b-caring-pair.png)：大脑低坐、抬眼委屈，两只前掌收拢；小手闭眼微笑并扶住大脑头部。不要分开重画两位角色，保留动作之间的接触关系。
2. 只针对小手下方少一只鞋的问题，制作[双鞋版本](brain-glove-b-caring-pair-two-shoes.png)。两只深蓝鞋分开可辨；没有新增粉色肢体。
3. 从已清理的三屏底板仅移除右屏旧小手，生成[无角色底板](hybrid-clean-base-no-result-characters.png)。底板保持明黄色块、文字、积木按钮及底部漫画。
4. 运行 [compose-b-caring-pair.ps1](compose-b-caring-pair.ps1) 将双人透明图层等比放进结算页。成图不再交给模型重画。完整尺寸与缩小后的结果都检查神态、手脚数、接触关系及和得分卡的间距。
5. 以首页角色的白色外缘为参考，把结算双人组偏厚的白色贴纸圈收细，得到[薄白边双人组](brain-glove-b-caring-pair-thin-rim.png)。用 [compose-thin-rim-pair.ps1](compose-thin-rim-pair.ps1) 合入同一清洁底板，成为当前 `v11`。白边窄于深蓝主轮廓，只围整体角色剪影；小尺寸角色随展示比例收细。

在本目录运行 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\compose-thin-rim-pair.ps1` 可重建当前 `v11` 三屏 PNG；原脚本仍可重建 `v10` 供对照。下面保留 `v9` 侧跪探索的结构与提示词，供制作其他失败动作时参考。

## 上一版侧跪动作的结构参考

### 先固定空间关系

| 部位 | 位置与方向 | 判读要求 |
|---|---|---|
| 脑袋、脸、肩、髋 | 同一三分之四视角，朝画面右侧小手 | 近侧较宽、远侧略收，不只转脸 |
| 两条手臂 → 两只手 | 从身体两侧出发，两只有指瓣的手在右前方撑地 | 近手偏下、远手偏上；各有可追踪的连接 |
| 两条腿 → 两只脚 | 从身体下方出发，膝盖弯曲，两只无指瓣的圆脚折向左后方 | 上下错开、有透明间隙；不在脸下画一对正面圆膝 |
| 白色小手 | 独立角色，在大脑右侧安慰 | 白手碰头，但不能和粉色肢体混算 |

这四个粉色末端按空间分组：**左后两脚、右前两手**。手和脚不占同一片轮廓，缩到结算页尺寸仍要能数清。

## 生成顺序

1. **先出透明角色。**只给原角色风格和侧面跑步动作作参考；完整指定四条肢体的根部、弯折、末端和画面位置。不要先在整张三屏稿里改姿态。
2. **只修一个问题。**第一张独立侧跪稿的两脚粘连，第二次只拉开两脚间隙，保持脸、身体和两手。两次都实际检查，没有把“提示词写了四肢”当作验收。
3. **用 imagegen 清洁底板。**从较早的 `hybrid-ui-v1.png` 而非累积重绘后的稿重新开始，参考 A 稿的清爽赛璐璐式色块；清掉右屏旧大脑，同时清理全图鳞片状斑纹、颗粒和脏边。所得[清洁底板](hybrid-clean-base-no-brain.png)保留三屏 UI、中文文字、漫画和白色小手。
4. **固定图层合成。**[合成脚本](compose-side-kneel.ps1)把已验收的透明 PNG 等比缩小，直接贴入右屏，不让图像模型重画任何肢体。原底板中白色小手的安慰手掌再作为前景像素叠回，使它盖在脑袋上。脚本只做缩放、Alpha 合成和这块手掌的前景恢复，形成 `v9`。
5. **合成后重新验收。**沿轮廓从身体数到两只手、两只脚，检查腿仍向左后方折起、脸和髋同向、线条与小手接近；再看三屏整体的平滑色块、按钮边缘和文字。`v7`、`v8` 的生图合成都没有原样保留独立角色，故不作为当前稿。

在本目录运行 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\compose-side-kneel.ps1` 可从两张固定输入重建 `v9` 三屏 PNG。任何改变角色尺寸、位置或前景手掌遮挡的操作都应重新检查手机尺寸下的四肢轮廓。

## 可复用提示词核心

清洁底板使用内置 imagegen，`hybrid-ui-v1.png` 为编辑目标，`../2026-09-28/A-cel-stage.png` 为干净色块参考：

> Remove only the old pink brain from the right result screen and reconstruct its smooth yellow background; preserve the white glove and its consoling white hand. Across all three screens, remove fish-scale patterns, mottled speckles, dirty grain and noisy edge halos. Restore crisp dark-navy outlines, smooth color gradients and clean cel shading. Preserve every Chinese word, number, button, phone frame and bottom comic panel; do not redesign or move content.

独立角色提示词以原角色和动作稿为参考：

> One pink brain character in a coherent three-quarter RIGHT-FACING side-saddle kneel. Head, shoulders, hips, both knees and both feet share the same viewing direction. Exactly two arms rooted at the body end in two separated fingered hands bracing the ground on the RIGHT FRONT. Exactly two bent legs rooted under the body end in two smooth unfingered feet folded toward the LEFT REAR, separated vertically by clear negative space. Near and far limbs are distinguishable; no front-facing pair of round knees below the face, no fifth pink endpoint. Sad collapsed expression with tears. Match the adjacent white glove's moderate navy outline thickness and soft pink internal lines. Generate the isolated transparent sprite first; composite only after full-size and phone-size anatomy checks.

提示词解决构图和清洁底板，**固定图层合成**避免把已验收角色再次交给模型重画，**目视淘汰**处理最后仍可能出现的重叠与尺度问题。
