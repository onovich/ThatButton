# 有限规则/按钮数字图集候选

`../runtime/text-atlas-v1.png` 是预先栅格化、运行时直接拼接的 PNG，不是运行时 fillText 离屏缓存。

源字体：Noto Sans CJK SC Black，Version 2.004；字体 nameID 0 为 Copyright 2014-2021 Adobe。官方发布的 [SIL OFL 1.1](https://github.com/notofonts/noto-cjk/blob/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Sans/LICENSE) 允许使用与随软件分发，并随工程/构建保留本目录 OFL.txt。没有将字体文件放入首包。不要用未知许可的系统字体替换素材。

重建：在 `ports/wechat` 运行 `npm run atlas:prepare`。需要 Node >=20、Chrome/Chromium（可指定环境变量 CHROME_PATH）。脚本将固定提交的字体下载到根 `output/text-atlas-font`，校验 SHA-256，再用无头 Canvas2D 在构建时栅格化。不会操控桌面，也不会调用 AI 生图。

固定源提交：`f8d157532fbfaeda587e826d4cd5b21a49186f7c`。源字体 SHA-256：`2267c4a0312d267dff8c0d1609948f7d949a3da8be3e126f5e2690cb9cc883b4`。源文件和 PNG 的哈希、坐标、基线、字符表与内存预算同时记录于生成的 `src/text-atlas-manifest.js`。

素材覆盖 16 基础词条、24 不同汉字、0–9 数字。规则数字实际使用 1–9，按钮显示 01–09；0 只为按钮前导零。navy/red/white 对应原绘制颜色。并未枚举完整规则或动态分数。源字号 63 px，适用于最高 21 逻辑 px × DPR 3；画布本身没有降低 DPR。

图集 864×588，RGBA 解码上限 2,032,128 字节；一张不可变素材，替换资源时失效，不保存历史规则。Chromium/平台栅格化版本改变可能改变 PNG 字节，重新生成后必须重新验图，不可仅更新哈希就接受。

跨设备使用同一 PNG，字符形状固定；原版的系统字体选择却随设备变化。Windows 对照已确认字形与抗锯齿差异，所以此候选默认关闭，不能称为视觉等价或已通过 iPhone 字体验收。详见 `docs/WECHAT_TEXT_ATLAS_CANDIDATE.md`。
