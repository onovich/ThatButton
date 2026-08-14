# ThatButton

[English](README.md)

[在线试玩](https://blog.onovich.com/ThatButton/)

ThatButton 是一款单屏逻辑街机游戏。玩家需要读懂终端线索，找出致命按钮，并在系统崩溃前按下所有安全按钮。

![ThatButton 封面](docs/cover.png)

## 玩法

- 阅读终端显示的致命条件。
- 按下所有**不符合**该条件的按钮。
- 在倒计时结束前清空面板。
- 错误按键会让玩家受伤，并打断当前连击。
- 击败越来越危险的敌人，并在下一场战斗前选择升级。

鼠标和触摸使用相同的按钮界面。

## 主要特点

- 数据驱动的棋盘尺寸、计时、致命条件与难度段。
- 连击攻击、敌人生命、Boss 战和确定性的升级选择。
- 在前期教学后逐步出现的移动按钮与信号干扰 Hazard。
- 本地最佳记录和简短失败回顾。
- 可复现测试的固定 Seed URL 与调试快照。
- 零依赖 ES Modules 与项目自有浏览器资源。

## 开发

ThatButton 需要 Node.js `20` 或以上版本。

```bash
npm run dev
```

Windows 上可以运行 `StartLocalTest.cmd` 启动本地服务器并打开游戏；`OpenOnlineTest.cmd` 会打开线上版本。

验证并构建静态站点：

```bash
npm run validate
npm run build
```

修改移动或信号干扰行为后，可以运行专门的浏览器 Hazard Smoke：

```bash
npm run smoke:hazards
```

## 项目结构

- `src/config/` 保存难度、战斗、遭遇、Hazard 和升级数据。
- `src/core/` 保存确定性的玩法规则与状态变化。
- `src/ui/` 保存 DOM 渲染和 Web Audio 合成反馈。
- `src/host/` 保存带版本、与插件无关的 Host 边界。
- `docs/` 保存详细阶段报告和试玩验证记录。

## 当前状态

当前版本已经包含完整的浏览器玩法循环、成长、Hazard、本地记录、脚本验证和 GitHub Pages 部署。它仍是一个范围紧凑的原型：真机移动端验证和更广泛的玩家试玩仍然有限。

## 许可证

当前仓库尚未包含开源许可证。
