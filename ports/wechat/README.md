# ThatButton 微信小游戏工程

此目录把浏览器游戏的同一套规则和运行控制器打包为微信小游戏。源代码在 `src/`；`build/` 是生成产物，已加入仓库忽略列表。当前已完成本地构建与模拟微信 API 的集成检查，尚未在微信开发者工具或手机微信中验证。

## 本地构建与检查

从此目录运行：

```powershell
npm install
npm run check
```

`npm run check` 会生成 `build/game.js`、`game.json`、`project.config.json` 和本地合成音效，并验证触摸输入、计时暂停、重开、存档和产物结构。根项目的 `npm run validate` 用于检查 Web 版本。

若需在浏览器预览 Canvas 画面，从仓库根目录运行 `npm run dev`，然后打开 `/ports/wechat/preview.html`。预览使用模拟 `wx` 接口，只用于布局与输入检查。加上 `?autostart&layout=3x3&w=360&h=640` 可查看窄屏 3×3 排版；该参数注入的是示意棋盘，点击不会推进真实第 6 关状态。

## 导入微信开发者工具

1. 完成正式小游戏账号注册并取得 AppID。
2. 在此目录设置环境变量 `WECHAT_GAME_APPID` 为该 AppID，运行 `npm run build`。不设置时项目配置写入 `touristappid` 占位值；在开发者工具中按当前版本要求选测试号或改填正式 AppID。
3. 用微信开发者工具选择“小游戏”项目，导入 `ports/wechat/build/`。
4. 在模拟器和 iPhone、Android 真机上检查完整游戏流程。账号权限、体验成员、备案和审核由微信公众平台管理。

不要把上传密钥、管理员登录信息或身份证明材料放进仓库。浏览器版与阅星曈版不依赖此工程。
