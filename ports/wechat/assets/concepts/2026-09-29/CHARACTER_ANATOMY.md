# 角色肢体硬约束与验收

融合稿 `hybrid-ui-v1.png` 的结算大脑出现多余粉色手；`v2` 仍被读出 **3 只手 + 2 条腿**。`v3` 站姿僵硬，`v4` 踉跄不符失败语义，`v5` 太正面，`v6` 上身侧而腿正面。`v7`、`v8` 的生图合成重新描画了左脚。`v9` 的侧跪角色解决了多肢体问题，但用户更喜欢 B 稿的低坐委屈表情与安慰动作。当前候选为 [v11 统一薄白边融合图](hybrid-ui-v11-unified-thin-rim.png)和[透明双人组](brain-glove-b-caring-pair-thin-rim.png)；`v9` 保留为侧跪结构参考，`v10` 保留为厚白边对照。详细流程见 [POSE_WORKFLOW.md](POSE_WORKFLOW.md)。

## 大脑：严格四肢

- **两条手臂、两只手：**左右各一条，手臂从身体对应侧边接出；每条手臂只连接一只手。
- **两条腿、两只脚：**从身体下方左右接出；脚与腿一一对应。
- **当前失败姿态采用收拢低坐：**大脑抬眼委屈地望向小手，前方两只粉色小掌并拢，身体下缘收在背后。遮住的肢体保持明确的身体归属，不为补轮廓新增可见粉色端点。
- **侧跪参考的手脚分区：**若后续复用 `v9` 的展开侧跪，左后方只有两只光滑、无指瓣的圆脚；右前方只有两只有指瓣的撑地手。四个末端彼此留出空隙，不让左脚重新变成手形。
- **动作角度连续：**结算表演不画成僵硬的绝对正面，也不出现上身侧面、下肢正面的拼接；遇到遮挡，应以完整角色剪影和接触关系判断，不通过新增手臂制造侧角。
- 脑纹、脸颊、泪滴与阴影是身体内部图案，不能形成手指、手掌或脚的独立外轮廓。白色小手角色触碰大脑头部时，白手轮廓与粉色肢体保持明确分离。
- 大脑与白色小手同屏时，使用相近的深蓝外轮廓粗细和柔和的内部线条；不让大脑单独变成厚黑边贴纸。

**统一描边：**所有角色使用深蓝主轮廓，外侧加窄白色分离边。白边的视觉厚度小于深蓝线；首页、局内、结算与漫画均遵守此层级，并按展示尺寸缩放。白边只围角色剪影，不进入脸部线条或两位角色的接触处；结算角色不再使用 `v10` 那种明显更厚的白色贴纸圈。

## 小手：双腿与食指分职

- 白色伸长食指用于指向、悬停和点击，不作走路的腿。
- 手掌下方始终两条深蓝腿、两只深蓝鞋；全身姿态让两只鞋可辨。
- 不出现第三条腿、漂浮鞋或脚与手掌不相连的姿态。参考 [小手结构稿](hand-two-legs-model-v2.png)。

## 每张图的硬性验收

1. 对每个完整角色放大检查，沿轮廓追踪**所有可见肢体**的起点、连接和末端。展开动作中的大脑应能数出左手、右手、左脚、右脚；收拢坐姿允许有明确的身体遮挡，但绝不能出现来源不明的额外粉色端点。小手必须数出两只深蓝鞋。
2. 缩到手机展示尺寸再次看结算角色。无需解释“那其实是膝盖”才能排除多余的手；若需要解释，直接重画。
3. 跨首页、局内、结算和分镜比较同一角色的结构。动作可以转向，肢体数量不能变化。
4. 发现额外肢体、断开的肢体、来源不明的粉色团块或无法判断的重叠时，整张稿不进入候选。生图提示词只能降低风险，**逐张目视验收是必需的**。
5. 肢体数量合格后再看动作：低坐委屈、抬眼求助、扶头安慰共同传达体力耗尽；若看起来像平直站立的人偶或正在踉跄奔跑，仍需重画。
6. 与相邻小手并排检查外轮廓粗细、内线细度和粉色阴影；线条风格脱节则不进入候选。
7. 和站立、跑步、恢复动作并排检查眼睛、脑叶和身体朝向；跪下时可以低头，但不能突然转为正面符号。

旧侧跪姿态的生图约束：`Pink brain companion collapses into a sorrowful three-quarter RIGHT-FACING side-saddle kneel; head, shoulders, hips, knees and feet share the same angle. Exactly two rooted arms end in two separated fingered hands braced on the RIGHT FRONT. Exactly two rooted bent legs end in two separated smooth unfingered oval feet folded to the LEFT REAR. Clear negative space among all four endpoints; no front-facing knees below the face, no extra pink appendage, no hand-shaped left foot. Match the adjacent white glove's moderate navy outline thickness and soft internal lines. Reject if anatomy is ambiguous at phone size or if compositing changes a foot into a hand.`

其他动作也可参考 [大脑动作稿](brain-four-limbs-model.png)。已批准头像和游戏代码没有因本规范自动替换。
