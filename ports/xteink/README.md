# 禁止按键 · 阅星曈版本

当前为 Lua 0.8.3 离线整套路线版，app_id 为 thatbutton-7b26d930。电脑预生成20套完整40关路线，共800题；设备只读取当前题、计时与判定，不再执行动态出题搜索。按套ID 1→2→…→20→1顺序循环，不再洗牌；失败重开或通关进入下一套，每次退出后重新打开也换下一套，从第1关零分开始，选套只保存lastRouteId，进入时立即更新。

保留形状、黑白反色、数学条件和160个双字词。每套有10词语关、后期最多3个质合数关；AND用“并且是”，OR用“或”，NOT用“除了……之外”。一错或超时即失败，无生命数值、无单关重试、无敌人/Boss。

详细规格与路线分布见 [离线整套路线](docs/OFFLINE_ROUTES.md)。词库见 [词语规则](docs/WORD_LEVELS.md)，难度演变见 [难度曲线](docs/DIFFICULTY.md)。旧文档和tests/legacy_dynamic属于历史动态版，不代表当前运行方式。

## 构建与验证

在仓库根运行：
```powershell
ports/xteink/.venv/Scripts/python.exe ports/xteink/scripts/generate-bank.py
ports/xteink/.venv/Scripts/python.exe ports/xteink/tests/offline.py
ports/xteink/.venv/Scripts/python.exe ports/xteink/scripts/export-offline.py
```

题库改动后先离线生成、验证，再发布。验证执行真实Lua 5.5入口，覆盖20套完整通关、800重开/误按/超时、3组轮换。结果在artifacts/offline-validation.json。生成器scripts/offline-generator.lua不打入设备。

build/index.lua是无运行时require的正式入口；build/manifest.json是本地基础配置，导入Studio时保留其图标、启动图和完整素材绑定。build/ThatButton-studio-source.zip是源码归档，不是设备安装包。只更新「禁止按键」，不得修改参考项目「方寸牌局/格局25」。

artifacts/current-flow-demo.html提供本地Lua画面及20套分布。图片不是设备实拍，正式操作在Studio。设备预算需真机验证，不能仅凭桌面模拟宣布卡死问题解决。0.8.1采用generation10，旧动态存档重开。

Web原版及数学HTML实验室保持独立，不改其玩法。

所有路线第1关必定使用纯形状规则，第4关再次复习形状判断，避免形状成为长时间不参与规则的装饰。
