# ThatButton

Core Meltdown: THAT Button is a single-screen HTML5 puzzle arcade game about identifying the fatal button and pressing every other safe button under pressure.<br/>**《核心熔毁：那个键》是一款单屏 HTML5 逻辑反应小游戏：玩家需要根据终端线索避开致命键，并在倒计时内按下所有安全键。**

The current implementation is intentionally lightweight: one playable `index.html`, vanilla JavaScript, CSS effects, and generated Web Audio feedback.<br/>**当前实现保持轻量：一个可玩的 `index.html`、原生 JavaScript、CSS 特效，以及 Web Audio 合成反馈。**

## Play Locally

- Double-click `StartLocalTest.cmd` to start a local server and open the game in the browser.<br/>**双击 `StartLocalTest.cmd` 可启动本地服务器并在浏览器中打开游戏。**
- You can also open `index.html` directly, though the local server path better matches GitHub Pages behavior.<br/>**也可以直接打开 `index.html`，但本地服务器方式更接近 GitHub Pages 的运行环境。**
- The launcher defaults to `http://127.0.0.1:<available-port>/` and falls back across common ports.<br/>**启动器默认使用 `http://127.0.0.1:<可用端口>/`，并会在常见端口被占用时自动换端口。**

## Commands

```bash
npm run validate
npm run build
npm run dev
```

`npm run validate` checks the static entry and inline script syntax; `npm run build` copies the deployable site into `dist/`; `npm run dev` serves the root folder with the local Node server.<br/>**`npm run validate` 会检查静态入口和内联脚本语法；`npm run build` 会把可部署站点复制到 `dist/`；`npm run dev` 会用本地 Node 服务器托管根目录。**

## Playtest Baseline

Phase 0 test criteria and evidence live in [`docs/phase-0-playtest-record.md`](docs/phase-0-playtest-record.md). Add `?seed=<label>` to a local or Pages URL to reproduce a generated run sequence; add `?debug=1` to log structured round and failure events for design review.<br/>**Phase 0 的测试标准与证据记录位于 [`docs/phase-0-playtest-record.md`](docs/phase-0-playtest-record.md)。在本地或 Pages 地址后添加 `?seed=<label>` 可以复现生成序列；添加 `?debug=1` 可为设计复盘输出结构化轮次和失败事件。**

## Difficulty Curve

Phase 1 replaces the fixed 3x3 opening with data-driven level bands: early levels start at 2x2, then move to 2x3, then return to 3x3 with rule complexity, fatal count, timer, reward, readability, and feedback intensity as separate tuning axes. The debug preview API reports the active band and parameters for each seeded level.<br/>**Phase 1 已把固定 3x3 开局改为数据驱动关卡段：早期从 2x2 开始，随后进入 2x3，再回到 3x3，并把规则复杂度、致命键数量、计时、奖励、可读性和反馈强度拆成独立调参轴。调试预览 API 会输出每个固定种子关卡的当前关卡段和参数。**

## Copywriting Pass

Phase 2 standardizes visible instructions around fatal conditions, forbidden buttons, safe buttons, and clearing the panel. Generated rules now use one shared sentence so matching buttons are always presented as forbidden, while the player action remains pressing the other safe buttons.<br/>**Phase 2 已统一所有玩家可见说明：围绕致命条件、禁止按键、安全键和清空面板展开。生成规则现在使用同一句式，明确“符合条件的是禁止按键”，玩家要按的是其他安全键。**

## Deployment

GitHub Pages deployment is configured with `.github/workflows/deploy.yml` and publishes the generated `dist/` folder from the `main` branch.<br/>**项目已通过 `.github/workflows/deploy.yml` 配置 GitHub Pages 部署，从 `main` 分支生成并发布 `dist/` 目录。**

Expected Pages URL: `https://onovich.github.io/ThatButton/`.<br/>**预期 Pages 地址：`https://onovich.github.io/ThatButton/`。**

If the first deployment does not appear, set the repository Pages source to GitHub Actions in GitHub repository settings.<br/>**如果首次部署后页面没有出现，请在 GitHub 仓库设置中把 Pages 来源设为 GitHub Actions。**

## Project Structure

- `index.html` - playable game entry.<br/>**`index.html` - 可直接运行的游戏入口。**
- `origin/` - original prototype and handoff/design notes.<br/>**`origin/` - 原始原型、交接和设计文档。**
- `scripts/` - zero-dependency local build, validation, and static-server helpers.<br/>**`scripts/` - 无第三方依赖的本地构建、校验和静态服务器脚本。**
- `StartLocalTest.cmd` / `OpenOnlineTest.cmd` - Windows launchers for local and online manual testing.<br/>**`StartLocalTest.cmd` / `OpenOnlineTest.cmd` - 用于本地和在线手动测试的 Windows 启动器。**
