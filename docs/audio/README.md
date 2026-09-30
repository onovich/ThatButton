# 游戏音效交付与试听

从仓库根目录运行 `npm run dev`，打开 `http://127.0.0.1:5173/docs/audio/`。音效试听页按用途列出全部 19 个音效，提供单独播放、顺序播放和选择 JSON 导出。正式背景音乐请打开 [`bgm.html`](bgm.html)。正式音效在 [`src/audio/sfx`](../../src/audio/sfx)，逐项来源、SHA-256、时长、响度与建议音量在 [`manifest.json`](manifest.json)。

## 声音语言

采用短促的电子弹跳、轻点击和上扬确认声，呼应微信小游戏明亮的漫画配色。日常操作保持轻；连击、清关、击败敌人、升级依次更显眼；误按和失败用短而明确的下行提示。每个音效都从 Kenney 已录制音效取材，未用原有蜂鸣占位声。背景音乐采用用户试听后选定的两段 Fupi CC0 电子配乐。

来源均为 Kenney 官方发布的 [Interface Sounds](https://kenney.nl/assets/interface-sounds) 与 [Digital Audio](https://kenney.nl/assets/digital-audio)，页面标注 Creative Commons CC0。2026-09-30 下载；无需署名，仍在清单中保留创作者与原始文件名。原始 ZIP 和 OGG 放在忽略版本控制的 `output/sfx-sources/`；`python scripts/prepare-sfx.py` 可从官方地址重建正式 WAV 与清单。处理为单声道 44.1 kHz、16 bit PCM，裁去低于 -45 dBFS 的首尾空白并保留 5 ms 起音边缘、20 ms 尾部边缘；文件总计约 360 KiB。小游戏使用 WAV，兼容 iOS 与 Android。微信音频实例复用、静音开关和并发限制的实现依据是[腾讯小游戏音频说明](https://intl.cloud.tencent.com/zh/document/product/1219/68069)。

## 触发映射

| 场景 | 音效 |
| --- | --- |
| 帮助、设置、返回、继续／资源重试、开关 | `ui_open`, `ui_back`, `ui_confirm`, `ui_toggle` |
| 开局／重开、下一关入场、Web 规则打字、首次进入最后五秒 | `run_start`, `round_enter`, `typing_tick`, `time_warning` |
| 每次安全按键的触感、连击准备、二连、三连及以上、上限、非致命误按 | `safe_press`, `chain_ready`, `combo_2`, `combo_high`, `combo_cap`, `wrong_press` |
| 清关受击、击败敌人、升级选项、选择升级、生命或倒计时失败 | `round_clear`, `enemy_defeated`, `upgrade_offer`, `upgrade_select`, `run_failure` |

实际接线在 [`src/app/game-session.js`](../../src/app/game-session.js)、[`src/ui/audio.js`](../../src/ui/audio.js) 与 [`ports/wechat/src/game.js`](../../ports/wechat/src/game.js)。两端共用 [`src/audio/cues.js`](../../src/audio/cues.js) 的音量、冷却、时长和优先级。每次安全按键先给一声短触感，再给连击提示；新的连击提示会停止旧提示。任意时刻最多两条音效：高优先级结算声可以替换低优先级 UI 声。小游戏启动时只预加载 10 个常用实例；切后台或关音效时停止播放，实例在销毁时释放。关音效后的开关本身不出声，重新打开时播放一声确认。误按震动由独立设置控制。

Web 版目前没有可见音效设置控件；保留 `setEnabled(false)` 接口供宿主调用，避免为此改动画面布局。小游戏已有的“音效”设置仍保存到本机。没有任何音效在点击前暗示哪个按钮是禁止键。

## CC0 背景音乐

正式主页与局内 BGM 选自 Fupi 发布的 [Empacotatron](https://opengameart.org/content/empacotatron)。发布页将该作品标为 Creative Commons CC0 1.0，并提供菜单变体 `empacotatron_menu.ogg` 与循环版 `empacotatron_loop.ogg`。菜单变体用于主页、帮助、设置和结算；循环版用于局内挑战与升级选择。署名不是许可条件，但项目仍记录作者、原始下载地址与原文件哈希。用户试听并否定两版自生成音乐后，明确选用了这两段 CC0 曲目。

正式文件在 [`ports/wechat/assets/music`](../../ports/wechat/assets/music)，均为 44.1 kHz 单声道 AAC-LC / M4A、目标 72 kb/s，合计 867,785 字节。主页曲的 PCM 循环区间为 `0–516293` 采样（0–11,707 ms）；局内曲为 `0–3528000` 采样（0–80,000 ms）。文件在原曲终点后另附 350 ms 相同开头的音频。播放器在准确的区间终点启动下一实例，利用尾巴交叠淡入淡出。默认音量为 50% 档，对应音频实例音量 0.1；音量可在 0–100% 的五档中调整，另有独立音乐开关。高优先级音效响起时短暂压低音乐。切后台停止播放，回前台在非续局状态恢复；续局暂停屏等待玩家继续后恢复。设置保存在微信本地。

`python scripts/prepare-bgm.py` 可从官方发布文件重建试听副本、正式文件与清单。正式使用的 [`bgm-manifest.json`](bgm-manifest.json) 记录来源、CC0、SHA-256、循环点、响度、处理增益及包体；[`bgm-reference-manifest.json`](bgm-reference-manifest.json) 留存用户最初试听的无尾巴副本。先前生成的原创尝试与新版候选不打入游戏包。

## 复核记录

- 2026-09-30：浏览器打开本地试听页，点击“依次试听全部”；最终裁切版依次进入播放状态并在 19/19 项后正常结束，所有播放器均返回可再次播放状态，页面无加载错误。`-45 dBFS` / 80 ms 静音扫描没有检出长空白。
- WAV 结构检查覆盖 19/19 项：RIFF/PCM、单声道、44.1 kHz、文件时长与清单一致，峰值不超过 -3 dBFS；原始来源及成品 SHA-256 均已记录。
- `npm run validate` 运行静态站点、结构与音效契约检查；`npm run build` 生成 Web 静态站点；在 `ports/wechat` 目录运行 `npm run check` 重新打包并运行微信模拟 API 集成检查。手机微信真机听感仍需真机复核，尤其是系统静音开关与扬声器响度。
- 2026-09-30：用户试听后选定 CC0 菜单版与循环版。自动化音频生命周期检查覆盖准确循环点上的 350 ms 交叠、音乐静音／音量恢复、压低、场景切换与前后台暂停恢复。加入升级标题资源后，将正式 BGM 从 80 kb/s 调至 72 kb/s；微信构建包总计 4,063,911 字节，低于[腾讯小游戏文档所列 4 MiB 主包限制](https://intl.cloud.tencent.com/zh/document/product/1219/68072)。真实微信设备上的循环衔接与系统静音行为仍需真机复核。

试听页验证了实际播放和解码状态；当前自动化环境没有向代理回传扬声器声音，主观音色判断可由使用者通过上述试听页复核。
