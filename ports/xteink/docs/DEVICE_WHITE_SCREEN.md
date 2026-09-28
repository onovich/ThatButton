# X4Pro 启动后白屏：诊断中

2026-09-23 用户确认：已通过Studio推送并在真机启动，启动页后没有任何画面。当前版本0.6.0。尚无真机固件版本、Lua错误日志或崩溃回执，不能把Studio运行成功当成真机通过。

## 已确认

本地实际入口通过Lupa Lua5.5加载后，桌面宿主Lua堆约1453781字节。226个字号/字符图层加8个形状图层在on_load中一次创建。字形数据有9686个矩形table。代码没有dispose。复现此测量：`ports/xteink/.venv/Scripts/python.exe ports/xteink/scripts/profile-startup.py`。

这是资源用量测量，不是设备故障复现；不能把任意人为内存阈值当成固件真实上限。公共搜索未找到可信的图层数量、总内存、Lua堆预算数字。

官方图形契约允许ctx.layers/create、draw_with几何与g:layer；不允许draw_with内文字或嵌套draw_with。本实现只使用几何。官方Studio只读查询还指出未用图层需要dispose，公开示例在on_unload释放。

inspect_xtapp_preview_context返回另一个历史项目方寸牌局，不能用于当前真机诊断；未对其进行任何修改。当前应用只通过浏览器中的禁止按键工作区检查。

## 未确认

无法读取真机运行日志；白屏可能发生在入口加载、on_load或首帧，当前没有可区分的设备证据。已向用户询问固件版本、白屏后返回键是否有效及可见错误文字。未宣称确定根因，未把未验证的改动推送到设备。

## 后续：USB 串口可用

用户确认白屏后返回键可回桌面，无错误提示。Windows检测到COM4（USB JTAG/serial debug unit，VID_303A PID_1001）。115200串口读取获得真实启动日志：App version 7.5.1；BootInfo firmware=V7.5.1 env=DEV，build_local=2026-09-05 15:04:30 +0800，device=ESP32S3_X4_TL，screen=SSD1677；ESP-IDF v6.0.1，8MB PSRAM。

接入串口时观察到USB_UART_CHIP_RESET，已告知用户现场被重启中断。未向串口写任何命令，DTR/RTS均设false。随后保持COM4打开采集10分钟，日志文件artifacts/device-live-log.txt，等待用户重新启动禁止按键以捕获实际应用异常。固件版本已确定，白屏根因仍未确定。先前“无法读真机日志”仅适用于Studio云端工具，USB串口提供了新的可用通路。

## 真机证据与修复（0.6.1）

用户重新打开应用后，USB日志确认：入口编译成功，素材5/5预加载成功；随后在on_load批量创建图层时触发 `on_load error after 233095 us: script callback exceeded time budget (watchdog)`。这是当前白屏的直接错误。真机Lua加载后984922B、启动失败后992260B，limit=1048576B；未出现OOM终止，不能把内存警告当成此次直接根因。

修复：字形矩形列表改为四字节坐标字符串（像素几何不变），去掉9686个常驻矩形table；入口桌面堆237198B。on_load只排队，on_tick每次最多创建4层，59次完成；准备中显示原生文字进度、禁止游戏点击、暂停倒计时。on_unload释放离屏层。题目、generation=4和存档规则不变。

回归命令 `ports/xteink/.venv/Scripts/python.exe ports/xteink/tests/startup.py`：先在旧版观测到 `startup watchdog regression: unbounded layer creation`，修复后PASS，peak_layers_per_callback=4，preparation_ticks=59；1MiB受限桌面Lua可加载，加载后堆小于350KB。该测试约束分批工作量，不伪装为真机时间模拟。旧有6732数学判定、2176配置、2480关卡和计时检查均通过。

Studio/真机后续复测结果另记；目前仅本地通过，不能宣称真机已恢复。

## 官方开发固件升级（2026-09-23）

按用户授权，参考任务既有烧录流程，使用 esptool 5.4.0、COM4、ESP32-S3、115200，将官方 full 文件 `xteink_app_full_x4pro_7.6.1_20260920_173423_C105_31FB(1).bin` 从 0x0 写入，保留镜像参数，未使用 erase-all。文件 16662528 B，SHA256 `3A618385742045A1B34F8C7B1027B5B99DDDF3579AC2C6EAA226B37609E37B52`。烧录退出码 0，输出 `Hash of data verified`。

刷前完整 16 MiB 备份保存在 `C:/Users/Administrator/Documents/X4Pro-backups/20260923-761/before-761-full.bin`，SHA256 `3B9B15C7669024A14A4F7CB6A0A2FA2704C43E8E6A08156AA2E101A16E878691`。备份及原始串口日志只存电脑私有目录，不打包进应用。

烧录后通过 esptool HardReset 保持串口采集，真实启动日志确认 `App version: 7.6.1`、`firmware=V7.6.1 env=DEV`、`runtime firmware=XTOS-DEV V7.6.1 product=XTEink X4 Pro`；app_main 正常返回。本步骤证明固件升级成功，尚不能证明禁止按键已通过真机复测。等待用户在设备上打开应用，串口保留 10 分钟用于捕获启动结果。

## 7.6.1 上的异常停止提示（第二次采集）

USB 捕获同一应用再次启动，入口仍是 150414 B；on_load 一次创建图层，213549 us 后报 `script callback exceeded time budget (watchdog)`。新固件将故障转为 RuntimeError UI，因此屏幕出现“应用异常停止”。这次日志没有 API 缺失错误，直接失败仍是初始化超时。已修复 0.6.1 的本地入口为 89063 B，Studio 先前已验证正式 index.lua 与 index-14.lua 逐字相等；因此真机本次运行的不是该修复代码。

再次经 Studio 的“安装到设备”向 X4Pro 创建推送，打包对话框正常结束。已请用户回桌面保持 Wi-Fi/云同步，等待安装并再次启动。尚未取得新包安装成功或 89063 B 入口运行的设备证据，不能将 Push 请求提交等同于安装成功。原始日志留在电脑私有备份目录 app-retest-private.log。
## 0.6.2：改用系统字体、取消预构建

用户授权将复杂字形改用系统字体。所有中文、条件、标签、按钮、标题使用官方 g:text（仅 color；不伪造字号 API）；大数字为最多 7 矩形的几何数字。移除打包 glyphs 模块、234 层构建队列及加载页；0 离屏层，首帧直接显示关卡。系统字号固定，条件区改为 124px、按钮区扩大到 576px；标题沿用系统字号，原大字形视觉不再逐像素一致。几何图形直接绘制，实心多边形按 2px 扫描带输出，限制绘制量。

入口 32993 B，SHA256 0285ed3d3f6232417ab8b8ca6ae30350ae2ccab1c8ac087b0bf35c775278d6f7。启动测试零层/零等待、桌面 Lua 入口堆 124351 B；6732 数学判定、2176 配置、2480 生成关卡及计时测试通过，关卡最大绘制命令 634。此修改消除字形预构建工作，但尚无此次加载后报错的真机栈，不能据本地测试声称真机问题已修复。
0.6.2 已在 Studio 正式 index.lua 读回核对 SHA256 一致，manifest 仅版本更新，保留既有素材绑定。官方校验无错误/警告；首帧 71 条绘制命令，失败结果页 139 条，触摸测试通过且无越界。已保存云工作区并通过“安装到设备”提交 X4Pro Push。真机安装/启动结果仍待回执。
## 0.6.3：规则可读性与时限（用户已确认 0.6.2 真机可运行）

保留零离屏层启动。规则字改为电脑预渲染的 38 张 1bpp PNG，经 Studio 原尺寸转 XIC（数字24×52，中文44×52），字号44粗体白字黑底。运行时每字一次 g:image，不恢复 Lua 字形生成。规则区恢复220px，格子从y314开始，复合条件三行行距62。其他中文仍用系统字体。

结算得分由72px降为48px，高度位置y490，最大宽352px，随位数继续缩小；覆盖1–8位得分边距测试。各阶段倒计时15/20/25秒，质合数题加5秒；迁移时仅将旧剩余时间截到新上限，保留关卡和分数。40关单轮时长需重新试玩校准，不沿用之前20–30分钟估计。

本地6732数学判定、2176配置、2480生成关卡、计时/存档迁移、零层启动及得分边距检查通过。源码入口33888B，SHA256 97f9a844639d614c4b4919a8c33338d4df0bae0b07385829c05e1c2a40ee14af。生成脚本scripts/generate-rule-images.py，源PNG目录assets/rule-text，源码ZIP附带rule-images。Studio实际素材与预加载配置需保留原有图标/启动图绑定。
0.6.3 官方预览发现主图默认黑墨会使白字黑底字图不可见；已按契约改为 g:image(...,{invert=true,color=0})，实际截图确认“3的倍数”粗体白字可见。正式源码最终33910B，SHA256 5714f9cc1cc8ae64fb23219894fb66a2437bae61bf56840e3b207bfaa820c774，Studio读回相等。校验无诊断，官方重启运行首帧及1000ms tick通过、74条命令、0越界、状态恢复通过，preload_assets共43项（原有5+38规则字图）。
0.6.3 已保存云工作区，官方真实页面截图确认规则字显示及超时结算分数留白；已从安装到设备向 X4Pro 提交更新，设备安装回执尚未确认。

## 0.7.0 词语关卡

160张52×34词图和20个新类别字形，全部静态图片，零运行时字形构建/离屏分配。Studio validate无缺失资源引用，共226个preload（含原图标）。第11关临时冻结预览目视确认黑白词图显示与边界正常；QA覆盖随后必须恢复index-21原构建。2000词语板面最大860绘图命令，2480综合板面及40关流程通过。入口堆193133字节（本地Lua测试，不是真机实测）。正式entry44461字节，SHA b3d52f1728dc8f8ed6b0d4838234705df119a4b7eaa0c4013006453781c57f28。

## 0.7.2 第三关冻结/重开watchdog

用户现场：第三关按对一次后留下勾，8秒停止，返回桌面可用，再开报应用异常。COM4被动日志freeze071-private.log捕获重开：226/226素材成功，Lua peak约340472B/cap2097152B；on_load在200879us被watchdog停止。未捕获最初冻结时刻，因此不能把首次冻结原因视为已确认。

tests/resume_budget.py重现同状态的生命周期成本：旧版load含首帧生成4次，后续3次重绘+tick+安全点击生成12次。修复Game.board为只缓存当前seed/level的题板，不写入持久化state，不改变题目生成或generation8；修复后1/0次，恢复进度、倒计时、输入均通过。2480关、40关流程、启动、计时通过。0.7.2设备回归仍需重新打开并试玩第三关；桌面模拟不代表固件watchdog已实测通过。
