# v19 角色姿态关键帧

> 状态：已暂停。2026-09-30 用户反馈动作观感怪、跨帧不一致，小游戏已恢复 v11 静态角色图轻微抖动。这些文件只作历史实验素材，不进入当前构建。

这六张 RGBA 透明源图由内置 `image_gen` 以已验收的 v11 运行时透明图为**编辑目标**生成。原始 `running-pair.png`、`separated-pair.png`、`caring-pair.png` 继续作为每段动画的第 0 帧，均未覆盖。生成图只作新的第 1／2 姿态帧。

| 场景 | 编辑目标 | 新帧 | 动作变化 |
| --- | --- | --- | --- |
| 首页奔跑 | `assets/runtime/running-pair.png` | `running-1.png`、`running-2.png` | 粉色腿与深蓝鞋交替前后，手臂摆动；两人仍保持追赶关系 |
| 局内陪伴 | `assets/runtime/separated-pair.png` | `separated-1.png`、`separated-2.png` | 脑和手分开站位，双腿交替屈伸，指向手角度轻变 |
| 结算安慰 | `assets/runtime/caring-pair.png` | `caring-1.png`、`caring-2.png` | 小手先抬手悬停，再轻扶脑袋；大脑抬眼接触 |

三个场景的请求均为 **stylized-concept** 透明逐帧编辑。通用提示：保留原角色的五官、比例、粉／白／深蓝配色、深蓝主轮廓及外侧细白边；在原图的左右关系和透明画布里**重画肢体姿态**，不得仅平移或旋转；大脑两臂两腿，小手两条短腿两只鞋，不得多肢、漂浮、裁切或出现文字、背景。各帧分别强调上表中的步态和扶头动作。第一张结算抬手候选出现装饰线且鞋子不清楚，已舍弃并重新生成 `caring-1.png`。

运行时素材由 [prepare-character-frames.ps1](../../../../scripts/prepare-character-frames.ps1) 通过 FFmpeg 从此处的全分辨率源图机械缩放为既有角色图的尺寸，并导出带透明索引的 PNG 至 `assets/runtime/frames/`。角色造型没有在此压缩步骤中重绘。六张运行图合计约 0.75 MB；浏览器在黄色背景上的透明合成检查通过。首页与局内按原图 → 新帧 1 → 新帧 2 → 新帧 1 循环；结算增加原图和扶头帧停留，让接触姿态成为主态。
