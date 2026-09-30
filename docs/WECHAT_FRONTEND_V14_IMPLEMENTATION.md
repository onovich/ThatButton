# 手指等等我：微信小游戏 v14 前端接入记录

日期：2026-09-29。依据为 [v14 原画签收](WECHAT_ART_V14_ACCEPTANCE.md)、[视觉还原准备](WECHAT_FRONTEND_VISUAL_RESTORATION_PREP.md)与原画 [分层清单](../ports/wechat/assets/concepts/2026-09-29/v14-production-art/README.md)。

## 已接入

- 从 v14 透明奔跑双人组、v11 透明照应组按 alpha 边界裁切并缩为游戏用图，分别为 840×452 和 760×577。两图保留透明通道，总计约 758 KiB；源图与 v11 基准未改。处理脚本为 [prepare-art.py](../ports/wechat/scripts/prepare-art.py)，构建会复制这两张游戏用图。
- [renderer.js](../ports/wechat/src/renderer.js) 改为 v14 明亮视觉：黄底首页／结算、纸白局内／升级／帮助／设置、角色独立图片层、动态规则与数值 Canvas 文本。按真实窗体、安全区和原生菜单按钮位置排版，触摸矩形与移动后棋盘绘制矩形共用。
- 棋盘保留红／蓝／黄／紫和图形／数字；未按按钮有高光、侧壁、深色底影，已按按钮下沉、侧壁消失且明度减弱。没有勾号，也没有预先标出安全答案。
- 页头强调分数，体力同时显示数字与比例条；“挑战进度”显示 `combat.maxHp - combat.hp`／`combat.maxHp`，每轮继续进下一关、满格后出现三选一升级。常驻界面不显示威力、反击、剩余安全按钮。微信随机升级池仅保留四项，Web 仍使用原池。
- [game.js](../ports/wechat/src/game.js) 接入玩法帮助、音效与误按震动独立开关及本机存储、返回前台时持续暂停直到玩家点击继续、结算页真正返回首页。角色加载失败有重试与几何回退入口；角色解码超时按失败处理。[audio.js](../ports/wechat/src/audio.js) 按偏好分别控制音效和震动。
- 结束原因、关卡、分数、当时规则、误按按钮和最高纪录从会话回顾数据绘制。超时结果不编造误按。

## 视觉与功能证据

运行时 Canvas 预览源为 [visual-preview.html](../ports/wechat/tests/visual-preview.html)，以下 PNG 是浏览器 Canvas 实际渲染截图，不是原画整页截图：

| 场景 | 截图 | 核对点 |
|---|---|---|
| 320×568、顶部 46px 占用 | [首页](../ports/wechat/tests/visual-evidence/runtime-home-320.png)、[局内](../ports/wechat/tests/visual-evidence/runtime-game-320.png)、[升级](../ports/wechat/tests/visual-evidence/runtime-upgrade-320.png)、[含第四种升级](../ports/wechat/tests/visual-evidence/runtime-upgrade-fourth-320.png)、[结算](../ports/wechat/tests/visual-evidence/runtime-result-320.png) | 顶部入口、规则、九宫格、进度与底部动作均完整；按钮凸起／凹陷可辨。 |
| 320×568 辅助状态 | [帮助](../ports/wechat/tests/visual-evidence/runtime-help-320.png)、[设置](../ports/wechat/tests/visual-evidence/runtime-settings-320.png)、[继续](../ports/wechat/tests/visual-evidence/runtime-resume-320.png) | 44px 级入口、设置开关和继续遮罩；继续前棋盘不能响应触摸。 |
| 360×640 棋盘变体 | [2×2](../ports/wechat/tests/visual-evidence/runtime-game-2x2-360.png)、[2×3](../ports/wechat/tests/visual-evidence/runtime-game-2x3-360.png)、[3×3](../ports/wechat/tests/visual-evidence/runtime-game-3x3-360.png) | 不同规模下按钮和状态条都留在画布内。 |
| 390×844 | [首页](../ports/wechat/tests/visual-evidence/runtime-home-390.png)、[局内](../ports/wechat/tests/visual-evidence/runtime-game-390.png)、[升级](../ports/wechat/tests/visual-evidence/runtime-upgrade-390.png)、[结算](../ports/wechat/tests/visual-evidence/runtime-result-390.png) | 长屏分组重排，升级卡铺到中下部，结算操作放在底部。 |

[小游戏集成检查](../ports/wechat/tests/run.mjs)覆盖首页→帮助／设置、偏好持久化、正确与误按、后台时间冻结及手动继续、结算返回首页、三选一排除第五种升级、资源加载失败回退、两张 PNG 打包。构建包 `build/game.js` 约 197 KiB，角色资源约 758 KiB。

## 检查结果与边界

- `python ports/wechat/scripts/prepare-art.py`：通过；两张运行素材透明。
- `ports/wechat: npm run check`：通过。微信开发者工具占用 build 目录时构建使用覆写回退，通过。
- 根项目 `npm run validate` 与 `npm run build`：通过。共用会话只增加可选升级池参数；Web 侧未传入，仍按原逻辑。
- 本机微信开发者工具已安装，但其 **安全设置中的服务端口关闭**，CLI `open --project ports/wechat/build` 返回“IDE service port disabled”；因此尚未通过该 CLI 自动验证模拟器，也没有真机触控、音频与性能结论。开启服务端口后可继续模拟器验收；上传、发布仍由运营事务另行办理。
