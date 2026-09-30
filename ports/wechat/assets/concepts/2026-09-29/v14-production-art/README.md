# 手指等等我 · v14 原画交付与分层清单

状态：**小游戏负责人已完成静态原画验收并批准接入**，记录见 [v14 验收文档](../../../../../../docs/WECHAT_ART_V14_ACCEPTANCE.md)。这是版本化原画和可编辑 HTML/CSS 源，尚未接入微信 Canvas；v11 角色基准、已批准头像、v12/v13 历史稿和游戏运行代码均未覆盖。先从 [可浏览交付页](index.html)逐图查看，再看 [局内源](gameplay-v14.html)与[页面源](flow-v14.html)。运行 `render-v14.ps1` 可重导出全部截图。

## 设计边界

- **v11 角色造型继续有效。** 首页使用新透明奔跑双人组 `brain-glove-running-pair-v14.png`，以 v11 首页奔跑和 v11 透明照应组为参考；结算直接复用 [v11 透明照应组](../brain-glove-b-caring-pair-thin-rim.png)。大脑两臂两腿，小手两条深蓝腿和两只鞋，深蓝主轮廓与薄白外缘保持一致。新奔跑组是待验收的姿态变体，不替换 v11 基准。
- **分数与挑战进度分离。** 安全按钮每次 +10 分；清完一轮才按战斗结算推进挑战进度，显示值为 `maxHp - hp`。普通清轮进入下一关；进度满后才三选一升级。没有自动定时反击。
- **按钮状态不泄题。** 未按和已按保留原色、图形、数字；只以顶面高度、侧壁、投影、明度和高光变化区分。没有勾号，也不显示“剩余安全按钮”。误按且存活时该按钮同样下沉，短反馈取真实扣血。
- **UI 信息顺序。** 规则、分数、体力和时间优先；挑战进度和连击次级。常驻 HUD 不显示威力、伤害加成或反击数值。

## 页面与状态交付

| 编号 | 图与源 | 触发 / 可操作 / 下一步 | 动态字段与样例 |
|---|---|---|---|
| A1 首页 | [320](home-v14-320x568.png)、[360](home-v14-360x640.png)、[390](home-v14-390x844.png)、[首次](home-v14-first-320x568.png)；`flow-v14.html?page=home` | 打开或重返首页；“开始游戏”开启新局并进入第1关 2×2。已决定采纳的玩法、设置为次级入口。 | `bestRecord.bestLevel/bestScore`；有纪录样例 15关/900分，首次不虚构纪录。 |
| A2 局内 | [320长规则](gameplay-v14-320x568.png)、[360](gameplay-v14-360x640.png)、[390](gameplay-v14-390x844.png)、[2×2](gameplay-v14-2x2-360x640.png)、[2×3](gameplay-v14-2x3-360x640.png)；`gameplay-v14.html` | 读“本轮别按”，点其余按钮；每次正确点击加分，清轮进下一关，满进度进入 A3。 | `level/score/ruleText/timeLeft/timeLimit/player.hp/maxHp/combat.hp/maxHp/combo/buttons[]`。第16关样例 900分、体力82/100、挑战350/500、已按3枚；第4关样例120分、已按1枚。 |
| A2 局内变体 | [误按](gameplay-v14-wrong-click-320x568.png)、[时间/体力临界](gameplay-v14-critical-320x568.png)、[进度将满](gameplay-v14-progress-near-320x568.png)、[按钮状态板](buttons-v14-state-board.png) | 误按仍存活：短显扣血并继续判断。体力/时间临界仅局部变色；486/500 仍不弹升级。 | 误按样例体力82→64、红三角03下沉，分数900和进度350不变。临界样例18/124与1.2秒，示范升级后体力上限可变。 |
| A3 升级 | [三选一 A/B/C](upgrade-v14-choices-abc-320x568.png)、[含第四种 D](upgrade-v14-choices-abd-320x568.png)、[390](upgrade-v14-choices-abc-390x844.png)、[选中](upgrade-v14-selected-320x568.png)；`flow-v14.html?page=upgrade` | 进度达到目标后必选一张，点整卡立即应用，输入锁定后进入下一关；没有“返回/确认/领取”步骤。 | `upgrades.choices/selected`、本局分数与体力。四种候选：连击接续+0.5秒；体力上限和当前体力+24；每轮时间上限+1.2秒；每次清轮挑战进度额外+4。每次从四种随机三张，移除连击收益+1。图中1040分、82/100只是可成立的静态样例。 |
| A4 结算 | [体力耗尽](result-v14-health-320x568.png)、[时间到啦](result-v14-timeout-320x568.png)、[390体力](result-v14-health-390x844.png)、[390超时](result-v14-timeout-390x844.png)；`flow-v14.html?page=result-health/result-time` | 真实 `wrong_click` 扣尽体力或 `timeout`；“再来一局”新开第1关，次按钮“返回首页”为已决定采纳的新增 B4。 | `recap.failureReason/level/score/ruleText/pressedButton/bestAfter`。误按结算显示真实按钮；超时不显示伪造的“最后误按”。样例分别为第12关690分和第16关920分。 |
| S1/S2 资源准备 | [准备](loading-v14-320x568.png)、[失败](resource-error-v14-320x568.png)；`flow-v14.html?page=loading/resource-error` | 可复用黄底承载，不增业务页；资源未就绪时等待，可恢复错误则重试，非关键图片失败可用几何回退继续。 | 由未来资源管理器的真实加载/解码结果驱动；不画虚构百分比或网络原因。 |
| S3–S9 | [状态关键帧板](states-v14-board.png) | 正确/非致命误按、普通清轮、满进度、升级应用、移动/干扰、后台、纪录未保存均用局部反馈或轻遮罩，不增加每轮整页。 | 清轮示例进度180→202/500；进度满500/500进入 A3。移动后绘制与命中矩形一致。 |
| B1 玩法帮助 | [320](help-v14-320x568.png)；`flow-v14.html?page=help` | 首页次级入口，关闭回首页；**已决定首版采纳，需新增功能代码**。 | 静态说明基于真实规则，不取当前关答案，也不强制教程。 |
| B2 设置 | [320](settings-v14-320x568.png)；`flow-v14.html?page=settings` | 首页次级入口；音效和误按震动独立开关；**已决定首版采纳，需新增偏好存储与能力检查**。 | 设备不支持震动时隐藏或停用该项；没有背景音乐开关。 |
| B3 返回前台继续 | [320轻遮罩](resume-v14-320x568.png)；`flow-v14.html?page=resume` | **已决定首版采纳，需新增持续暂停原因**；仅计时中的局内从后台回来显示，点“继续这一局”后恢复。升级/结算/首页直接回原页。 | 原规则、按钮、体力和剩余时间不重抽不重置。 |
| B4 结算返回首页 | 已在 A4 次按钮呈现 | **已决定首版采纳，需新增返回首页动作**。与 `app.reset()` 的“再来一局”不同。 | 保留最佳纪录。 |
| C 类宣传/故事 | v11 底部两格分镜及 [状态板](states-v14-board.png)说明 | 宣传或以后短过渡候选；本批不做每局必经剧情、分享领奖或新功能入口。 | 不与现有主流程混淆。 |

## 尺寸、安全区与触控

标准的 320×568、360×640、390×844 图表示**扣除原生安全区后的有效绘制画布**，不画假状态栏或手机外框。[局内整窗 safe46](gameplay-v14-320x568-safe46.png)、[首页](home-v14-320x568-safe46.png)、[帮助](help-v14-320x568-safe46.png)、[设置](settings-v14-320x568-safe46.png)、[升级](upgrade-v14-choices-abc-320x568-safe46.png)及[结算](result-v14-health-320x568-safe46.png)另在 320×568 整窗顶部留出 46px 压力测试。这个 46px 是示例占用，运行端仍须读取真实 `safeArea` 与原生菜单按钮矩形。

320 短屏九格按钮可见面约 90×78px，safe46 时高度仍超过 56px；首页“怎么玩/设置”、辅助页“返回”、结算“返回首页”实际 CSS 触控框至少 44px 高。规则在可用宽度内自动换行；实际极端规则、字体回退、平台胶囊和高速连续触摸仍须微信真机验证。

## 分层与运行素材清单

| 层 / 资源 | 当前来源 | 后续接入做法 |
|---|---|---|
| 首页奔跑双人组 | `brain-glove-running-pair-v14.png`，1536×1024 透明 PNG；非透明主体约 x78–1499、y141–893。首页样例显示宽310px（320画布），其余尺寸在 CSS 中单独定位。 | 单独角色层；锚点建议以两鞋地面基线及整体水平中心管理。先验收肢体、脸和小尺寸白边；通过后再按设备像素比分档压缩，不把整个首页烘焙成贴图。 |
| 结算双人组 | [v11 透明基准](../brain-glove-b-caring-pair-thin-rim.png)，1426×1103，**未修改**。 | 单独角色层；以双鞋底和双人中心对齐，扶头的白手已在透明组内部处理，勿重新生图叠手。超时与体力耗尽复用同一照应姿态。 |
| 中文标题“手指等等我” | `flow-v14.html` 中 `.logo` 可编辑 CSS 描边文字。 | 固定品牌字可另导 SVG/透明标题图；动态数值、规则、按钮数字仍由 Canvas 文本绘制。字体需确认来源与分发权利。 |
| 背景/云/卡片/条形 | `flow-v14.html` 与 `gameplay-v14.html` 的 CSS 几何、渐变；非角色图片。 | 按页面拆为 Canvas 背景与面板组件；分数、体力、挑战条分别绑定实际状态，不用整屏 PNG 作运行 UI。 |
| 四色实体按钮 | [状态板](buttons-v14-state-board.png)、`gameplay-v14.html` 中 `.tile`。顶面渐变、深蓝 3px 轮廓、6px 侧壁+投影；完成态下移6px、侧壁消失、内阴影与较弱高光。 | 做同一材质的凸起/下沉运行组件；颜色是题目属性（红/蓝/黄/紫），黄色图形和数字深蓝。图形为统一26×26 SVG 视口，数字18px；绘制矩形与触摸矩形共用。 |
| 升级卡/小图标 | `flow-v14.html` 四种卡片 CSS 与字符图标。 | 将四图标绘为 Canvas 路径/图片；整卡命中，选中后锁输入。文案/数值运行时按四个真实 ID 映射，不能再出现第五种。 |
| 动态文字/数据 | 所有 HTML 中的数字只是演示。正文 `system-ui,"Microsoft YaHei",sans-serif`，深蓝 `#071944`；主操作青色 `#03d7e3`；背景黄 `#ffe135`，局内纸白。 | 局内字体约规则14px、按钮数字18px、计时/体力17px、主分数31px；运行端按真实尺寸、字体和 `measureText` 换行，不固定两行。 |

透明奔跑组由内置 `imagegen` 根据 v11 三屏与 v11 透明照应组生成；实际提示词核心约束：保留相同的脑叶/手套/脸、深蓝轮廓与薄白边，只制作向右奔跑的两位角色；严格大脑两手两脚、小手两条深蓝腿与两只鞋，无多余肢体；透明背景、无文字和场景。已在原尺寸及 320/360/390 首页图复看，未覆盖旧图。

<details><summary>奔跑组最终生成提示词（内置 imagegen）</summary>

> Use case: illustration-story. Asset type: independent transparent PNG character layer for a mobile game home screen. Input images: Image 1 is the accepted v11 full three-screen concept and is the authoritative running pose on the left home phone; Image 2 is the accepted transparent caring pair and is the authoritative detailed face, anatomy, navy outline and thin white outer rim reference. Create ONLY the same two established characters running together toward the right, based closely on the home-screen pose of Image 1: the pink brain slightly behind, reaching forward with a delighted determined expression; the white pointing-hand mascot slightly ahead, laughing and running. Preserve their exact established facial proportions, scalloped brain silhouette, white glove body and cap, deep navy main outline, slim white separation rim, restrained clean pink/white/blue shading, and lively asymmetric action. Strict anatomy: pink brain has exactly two arms/two hands and two legs/two feet, no extra pink endpoints; white hand mascot has exactly two short navy legs with two clearly visible navy shoes, and its extended white index finger is an arm/pointing feature, never a leg. Keep silhouettes separated enough to count limbs. Full characters entirely within frame with padding, no cutoff. No words, buttons, scenery, shadows, ground, phone frames, texture dirt, extra characters, redundant limbs, extra shoes or objects. Genuine transparent background with alpha. Make the sprite usable atop a bright yellow home UI. Preserve the accepted character identity; do not redesign.

</details>

## 本批检查与限制

- `render-v14.ps1` 已成功导出全部 PNG；逐图复看 320/360/390 的主页面和 safe46 压力图。局内第一轮进度条和误按气泡的越界问题已修正；小游戏负责人已完成整套静态验收。
- A1/A3/A4 在 390×844 单独重排，不是把 320 内容贴在顶部；次级可操作入口和按钮均至少 44px 高。
- 这套 HTML 是可复查的原画源与静态样例，不承担真实规则判定、随机升级、计时、音效、存档或微信安全区获取。示例链接便于审稿；正式页面转移以 `game-session.js` 和微信入口绑定。
- 美术分层、图片加载/失败回退、B1–B4 新功能代码、真机触控和性能仍由小游戏负责人在验收后实施。现有核心没有商店、支付、自动定时反击或独立剧情，本批没有画成现成功能。
