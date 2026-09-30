# v15 视觉回归提案

针对“新版 UI 不如之前原画”的反馈，重新把已确认的 v11 造型和三屏原画的表现力带入可实施的 UI。此稿供视觉比较；v14 正在接入的资源及游戏代码没有被本次改动覆盖。

## 视觉决策

- **首页与结算：**恢复 v11 的明黄舞台、奶油云朵、海军蓝粗线、立体漫画标题、青色大按钮和双角色表演。首页奔跑组沿用 v11 造型；结算直接使用已确认的 v11 透明安抚组。角色外沿保留统一的细白边。
- **局内：**按 v11 原画重排关卡／分数、粉白大规则牌、居中秒表与进度条、亮面方形积木和风景里的双角色。规则去掉方括号，采用加粗的圆润汉字、红色重点和按条件分组的换行；连击独立显示旧稿式闪电与次数。未按按钮有彩色侧壁并凸出；已按按钮缩进深蓝底座，彩色面、图形和数字仍清晰，绝不预告安全答案。体力与挑战进度占用底部旧稿冗余 HUD 腾出的区域。底部角色整张显示，不再裁切身体。
- **其他页面：**升级卡使用相同的积木材质；帮助、设置和恢复遮罩维持安静清楚。体力耗尽与时间耗尽继续展示真实原因。可选漫画分镜只用于三屏展示板，不是每局必须经历的页面。
- **小屏约束：**局内信息及可点区域在 320×568 有效画布和顶部额外占用 46px 的整窗压力样例下均保留。真正接入时仍需读取微信实际安全区。

## 文件

| 文件 | 用途 |
| --- | --- |
| `index.html` | 旧稿与 v15 并排画廊、各尺寸截图入口 |
| `board-v15.html` / `board-v15-1536x1024.png` | 三屏展示板；底部两格漫画由 v11 参照图裁切，仅用于展示 |
| `flow-v15.html` | 首页、升级、结算、帮助、设置等可编辑 HTML 原稿 |
| `gameplay-v15.html` | 局内、按钮状态可编辑 HTML 原稿 |
| `render-v15.ps1` | 用本机 Chrome/Edge 复现各尺寸静态截图 |
| `sunny-stage-v15.png`, `title-home-v15.png`, `title-result-v15.png` | 本轮使用内置 imagegen 新生成的位图素材 |
| `brain-glove-running-pair-v15.png` | 从 v14 原画交付复制的已校验透明奔跑组；本轮未重新生成角色 |
| `brain-glove-separated-v15.png` | 以奔跑组为严格参照生成的独立完整双角色透明变体，仅用于 A2 底部 |
| `gameplay-landscape-v15.png` | 仅含云朵、灌木和暖黄地面的 A2 横向风景背景，角色叠加在其上 |
| `button-state-study-v15.png` | 使用内置 imagegen 生成的四种颜色、两种高度的积木按钮设计参考；不直接当运行时按钮图 |

`brain-glove-running-pair-v14.png` 是同一奔跑组的工作副本，不参与页面引用。结算角色引用上级目录的 `brain-glove-b-caring-pair-thin-rim.png`，继续保持 v11 已确认原画基准。

## 生图记录

使用内置 `image_gen` 制作分层位图，再与可编辑 HTML/CSS 排版组合；没有反复重绘整个三屏位图。标题、舞台和横向风景参考 `../hybrid-ui-v11-unified-thin-rim.png`；分离角色严格参考透明奔跑组。

1. 首页标题：独立透明素材，仅写准确汉字“手指等等我”；v11 式白字和黄色重点字、粗海军蓝边、外层白色贴纸边、饱满的手绘立体感；不出现手机或角色。
2. 结算标题：独立透明素材，仅写准确汉字“这次到这里”；同一漫画字形、海军蓝和白边；不出现手机或角色。
3. 舞台底图：无字、无人、无 UI 的明黄竖版背景；上部温暖光芒、周围奶油云朵、底部少量绿色灌木，中间留出规则与角色的清晰区域；避免鳞片、噪点和密集纹理。
4. A2 分离角色：以 `brain-glove-running-pair-v15.png` 为严格造型参照，生成透明画布上相互分离、各自全身完整的大脑与手套；大脑恰好两手两腿，手套恰好两条蓝鞋腿，保留表情、深蓝轮廓与细白边；宽透明间距，不重叠、不缺肢、不多肢，不生成背景或文字。最终 A2 整张显示该素材，没有 CSS 人物裁切。
5. A2 横向风景：仅画奶油色天空、少量浅蓝／浅黄云朵、底边薄暖黄地面与层叠薄荷绿、湖绿灌木；中央留白，适合叠放两位角色；不生成角色、文字、UI、按钮或厚重纹理。
6. 按钮状态参考板：以 v11 三屏原画和当时的 v15 按钮组件板为风格参照，要求四列红／蓝／黄／紫与上下两排；上排是带亮面、高光、单层彩色侧壁及柔和落影的凸起积木，下排是同色彩色面缩进深蓝凹槽的按下态；没有符号、数字、勾号、文字、角色和杂纹。此图只辅助确定状态几何；最终组件由 `gameplay-v15.html` 的可编辑 HTML/CSS 绘制，图形和数字继续绑定按钮数据。

按钮参考板的最终提示词（内置 `image_gen`，两张参照图分别为 v11 原画与上一版按钮组件板）：

> Create a clean UI component design study of glossy toy building-block buttons: four color columns (red, vivid blue, sunshine yellow, violet) and two state rows. Top: raised, nearly square plastic buttons with one navy outline, a curved white reflection, a color-matched extruded side wall and a soft ground shadow. Bottom: the same colors pressed into dark navy sockets; the colored face is smaller and lower, the side wall disappears, and the inward shadow makes the state obvious at mobile size. No icons, shapes, digits, words, checkmarks, characters, phones, scene, grunge or extra shadow stripes. White neutral background and consistent spacing. Match the playful polished v11 illustration. This is guidance for editable HTML/CSS buttons, not a full screen.

角色造型以现有 v11/v14 透明原画为准；原始基准没有修改。新分离变体已检查四肢数量和轮廓完整性。页面使用透明角色素材，后续布局调整无需再次生图。

## 验证与接入边界

`render-v15.ps1` 输出 320×568、360×640、390×844 以及 safe46 压力样例和三屏板。页面源中的分数、体力、规则等是说明布局的真实玩法样本，并非当前游戏运行截图。正式接入需按游戏状态映射数据与触摸矩形，同时保留 v14 已采纳的流程约束；视觉方向确认后再替换运行时资源。
