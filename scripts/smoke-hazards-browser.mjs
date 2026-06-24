import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createNetServer } from 'node:net';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const docsDir = join(projectRoot, 'docs');
const resultPath = join(docsDir, 'phase-7a-browser-smoke-results.json');
const phase9ResultPath = join(docsDir, 'phase-9-browser-smoke-results.json');
const smokeSeed = 'phase3a-baseline';
const smokeUrlPath = `/?seed=${encodeURIComponent(smokeSeed)}&debug=1`;
const browserCandidates = [
  process.env.CHROME_PATH,
  process.env.EDGE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);

const viewports = [
  { name: 'desktop-1280x720', width: 1280, height: 720, isMobile: false },
  { name: 'mobile-390x844', width: 390, height: 844, isMobile: true },
  { name: 'short-mobile-360x740', width: 360, height: 740, isMobile: true }
];

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp']
]);

function findBrowserExecutable() {
  const found = browserCandidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`No Chrome/Edge executable found. Checked: ${browserCandidates.join(', ')}`);
  }
  return found;
}

function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
  });
}

function isInsideRoot(filePath, rootPath) {
  const normalizedRoot = normalize(rootPath);
  const normalizedFile = normalize(filePath);
  return normalizedFile === normalizedRoot || normalizedFile.startsWith(`${normalizedRoot}${sep}`);
}

function compactRect(rect) {
  if (!rect) return null;
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
    centerX: rect.centerX,
    centerY: rect.centerY
  };
}

function compactMovedButton(button) {
  return {
    id: button.id,
    offsetX: button.offsetX,
    offsetY: button.offsetY,
    cssOffsetX: button.cssOffsetX,
    cssOffsetY: button.cssOffsetY,
    beforeCenter: {
      x: button.before.centerX,
      y: button.before.centerY
    },
    afterCenter: {
      x: button.after.centerX,
      y: button.after.centerY
    },
    deltaX: Number((button.after.centerX - button.before.centerX).toFixed(2)),
    deltaY: Number((button.after.centerY - button.before.centerY).toFixed(2))
  };
}

function compactSmokeResult(result) {
  return {
    viewport: result.viewport,
    ok: result.ok,
    checks: result.checks.map((check) => ({
      ok: check.ok,
      message: check.message
    })),
    layout: {
      clue: compactRect(result.layout.clue),
      grid: compactRect(result.layout.grid),
      commandPanel: compactRect(result.layout.commandPanel),
      playerHud: compactRect(result.layout.playerHud)
    },
    encounterLabel: {
      text: result.encounterLabel.text,
      label: compactRect(result.encounterLabel.label),
      combatStatus: compactRect(result.encounterLabel.combatStatus),
      commandTagText: result.encounterLabel.commandTagText,
      commandTag: compactRect(result.encounterLabel.commandTag)
    },
    moving: {
      phase: result.moving.hazards.phase,
      targetCount: result.moving.movedButtons.length,
      movedButtons: result.moving.movedButtons.map(compactMovedButton)
    },
    interference: {
      phase: result.interference.phase,
      boardDataset: result.interference.boardDataset,
      opacityVar: result.interference.opacityVar,
      pseudoOpacity: result.interference.pseudoOpacity,
      markerCount: result.interference.markerCount
    },
    upgrade: {
      cardCount: result.upgrade.cardCount,
      hidden: result.upgrade.hidden,
      boardDataset: result.upgrade.boardDataset,
      opacityVar: result.upgrade.opacityVar
    },
    reportExport: {
      status: result.reportExport.status,
      copyState: result.reportExport.copyState,
      statusText: result.reportExport.statusText,
      panelHidden: result.reportExport.panelHidden,
      textHidden: result.reportExport.textHidden,
      exportIncludesKind: result.reportExport.exportIncludesKind,
      summaryIncludesPrivacy: result.reportExport.summaryIncludesPrivacy,
      panel: compactRect(result.reportExport.panel),
      textarea: compactRect(result.reportExport.textarea)
    },
    vfx: {
      counts: result.vfx.counts,
      sourceCenter: result.vfx.sourceCenter,
      firstTracerStart: result.vfx.firstTracerStart,
      tracerOriginDelta: result.vfx.tracerOriginDelta,
      particleZIndex: result.vfx.particleZIndex,
      interferenceBoardDataset: result.vfx.interferenceBoardDataset
    }
  };
}

function createStaticServer({ root, port }) {
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
    const decodedPath = decodeURIComponent(requestUrl.pathname);
    const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
    const filePath = resolve(root, relativePath);

    if (!isInsideRoot(filePath, root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    const contentType = mimeTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream';
    response.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    });
    response.end(readFileSync(filePath));
  });

  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolveServer(server));
  });
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function waitForExit(child, timeoutMs = 2000) {
  if (!child || child.exitCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolveExit) => {
    const timeout = setTimeout(resolveExit, timeoutMs);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolveExit();
    });
  });
}

async function removeTempDir(path) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      rmSync(path, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 5) {
        console.warn(`Warning: could not remove temp browser directory ${path}: ${error.message}`);
        return;
      }
      await delay(150);
    }
  }
}

async function waitForJson(url, { timeoutMs = 6000 } = {}) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await delay(80);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || 'no response'}`);
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.socket = null;
  }

  connect() {
    return new Promise((resolveConnect, reject) => {
      this.socket = new WebSocket(this.webSocketUrl);
      this.socket.addEventListener('open', () => resolveConnect(this));
      this.socket.addEventListener('error', (event) => {
        reject(new Error(event.message || 'CDP websocket error'));
      }, { once: true });
      this.socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (!message.id || !this.pending.has(message.id)) return;
        const { resolveMessage, rejectMessage } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) {
          rejectMessage(new Error(`${message.error.message || 'CDP error'} ${JSON.stringify(message.error.data || '')}`));
          return;
        }
        resolveMessage(message.result || {});
      });
      this.socket.addEventListener('close', () => {
        for (const { rejectMessage } of this.pending.values()) {
          rejectMessage(new Error('CDP websocket closed'));
        }
        this.pending.clear();
      });
    });
  }

  send(method, params = {}, sessionId = null) {
    const id = this.nextId++;
    const payload = sessionId
      ? { id, method, params, sessionId }
      : { id, method, params };
    return new Promise((resolveMessage, rejectMessage) => {
      this.pending.set(id, { resolveMessage, rejectMessage });
      this.socket.send(JSON.stringify(payload));
    });
  }

  close() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: 15000
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(`Browser evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
  }
  return result.result?.value;
}

async function waitForBrowserReady(client, sessionId) {
  const expression = `(() => ({
    readyState: document.readyState,
    hasHost: Boolean(window.__THAT_BUTTON_HOST__),
    hasDebug: Boolean(window.__THAT_BUTTON_DEBUG__)
  }))()`;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 6000) {
    const state = await evaluate(client, sessionId, expression);
    if (state?.readyState === 'complete' && state.hasHost && state.hasDebug) {
      return;
    }
    await delay(100);
  }
  throw new Error('Timed out waiting for app host/debug globals');
}

function getSmokeExpression(viewport) {
  return `(async () => {
    const viewport = ${JSON.stringify(viewport)};
    const waitFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return {
        left: Number(value.left.toFixed(2)),
        top: Number(value.top.toFixed(2)),
        right: Number(value.right.toFixed(2)),
        bottom: Number(value.bottom.toFixed(2)),
        width: Number(value.width.toFixed(2)),
        height: Number(value.height.toFixed(2)),
        centerX: Number((value.left + value.width / 2).toFixed(2)),
        centerY: Number((value.top + value.height / 2).toFixed(2))
      };
    };
    const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const contains = (outer, inner, tolerance = 0) => Boolean(outer && inner &&
      inner.left >= outer.left - tolerance &&
      inner.right <= outer.right + tolerance &&
      inner.top >= outer.top - tolerance &&
      inner.bottom <= outer.bottom + tolerance);
    const withinViewport = (box, tolerance = 1) => Boolean(box &&
      box.left >= -tolerance &&
      box.top >= -tolerance &&
      box.right <= window.innerWidth + tolerance &&
      box.bottom <= window.innerHeight + tolerance);
    const fail = (message, details = {}) => ({ ok: false, message, details });
    const pass = (message, details = {}) => ({ ok: true, message, details });

    const host = window.__THAT_BUTTON_HOST__;
    if (!host || typeof host.start !== 'function') {
      return { viewport, ok: false, failures: [fail('Host API is unavailable')] };
    }
    host.reset();
    host.start();
    await waitFrame();
    await new Promise((resolve) => setTimeout(resolve, 460));
    await waitFrame();

    const { createRenderer } = await import('/src/ui/render.js');
    const { createHazardDirectorState, createDisabledHazardState } = await import('/src/core/hazards.js');
    const renderer = createRenderer({
      document,
      timers: {
        setTimeout: window.setTimeout.bind(window),
        clearTimeout: window.clearTimeout.bind(window)
      },
      random: () => 0.5,
      audio: null
    });
    const failures = [];
    const checks = [];
    const pushCheck = (check) => {
      checks.push(check);
      if (!check.ok) failures.push(check);
    };
    renderer.updateCombatStatus({
      player: { hp: 100, maxHp: 100 },
      combat: {
        enemyIndex: 3,
        enemyName: 'CIPHER WARDEN',
        stageLabel: 'S03 NOISE GATE',
        tierLabel: 'INTERFERENCE',
        hp: 714,
        maxHp: 740,
        attack: 30,
        status: 'active'
      },
      combo: { statusText: 'COMBO x12' }
    });
    await waitFrame();
    const encounterLabel = {
      text: document.querySelector('#boss-hp-text')?.innerText || '',
      label: rect('#boss-hp-text'),
      combatStatus: rect('#combat-status'),
      commandTagText: document.querySelector('#command-level-tag')?.innerText || '',
      commandTag: rect('#command-level-tag'),
      commandPanel: rect('#command-panel')
    };
    pushCheck(
      encounterLabel.text.includes('CIPHER WARDEN') && encounterLabel.text.includes('S03 NOISE GATE')
        ? pass('encounter stage label renders compact identity', encounterLabel)
        : fail('encounter stage label missing identity text', encounterLabel)
    );
    pushCheck(
      withinViewport(encounterLabel.label) && contains(encounterLabel.combatStatus, encounterLabel.label, 2)
        ? pass('encounter stage label fits combat status and viewport', encounterLabel)
        : fail('encounter stage label overflows combat status or viewport', encounterLabel)
    );
    pushCheck(
      encounterLabel.commandTagText.includes('E03') && encounterLabel.commandTagText.includes('INTERFERENCE')
        ? pass('command run-depth tag renders encounter tier', encounterLabel)
        : fail('command run-depth tag is missing encounter tier', encounterLabel)
    );
    pushCheck(
      withinViewport(encounterLabel.commandTag) && contains(encounterLabel.commandPanel, encounterLabel.commandTag, 2)
        ? pass('command run-depth tag fits command panel and viewport', encounterLabel)
        : fail('command run-depth tag overflows command panel or viewport', encounterLabel)
    );

    const layout = {
      clue: rect('#clue-text'),
      grid: rect('#btn-grid'),
      commandPanel: rect('#command-panel'),
      battleStage: rect('#battle-stage'),
      playerHud: rect('#player-hud'),
      comboStatus: rect('#combo-status-text')
    };
    pushCheck(withinViewport(layout.clue) ? pass('clue fits viewport', layout.clue) : fail('clue outside viewport', layout.clue));
    pushCheck(withinViewport(layout.grid) ? pass('grid fits viewport', layout.grid) : fail('grid outside viewport', layout.grid));
    pushCheck(withinViewport(layout.commandPanel) ? pass('command panel fits viewport', layout.commandPanel) : fail('command panel outside viewport', layout.commandPanel));
    pushCheck(!intersects(layout.clue, layout.grid) ? pass('clue and grid do not overlap') : fail('clue and grid overlap', layout));
    pushCheck(!intersects(layout.grid, layout.playerHud) ? pass('grid and player HUD do not overlap') : fail('grid and player HUD overlap', layout));
    pushCheck(contains(layout.commandPanel, layout.playerHud, 2) ? pass('player HUD is inside command panel') : fail('player HUD is not inside command panel', layout));
    pushCheck(!contains(layout.battleStage, layout.playerHud, -1) ? pass('player HUD is not inside battle stage') : fail('player HUD is inside battle stage', layout));

    let reportExport = {
      status: 'not-run',
      copyState: '',
      statusText: '',
      panelHidden: true,
      textHidden: true,
      exportIncludesKind: false,
      summaryIncludesPrivacy: false,
      panel: null,
      textarea: null
    };
    const reportPreview = window.__THAT_BUTTON_DEBUG__?.previewPlaytestReportExport?.();
    if (!reportPreview?.exportText || !reportPreview?.summaryText) {
      pushCheck(fail('debug report export preview is unavailable', { reportPreview }));
    } else {
      renderer.showGameOverScreen({
        level: reportPreview.report?.run?.level || 1,
        isTimeout: false,
        recap: window.__THAT_BUTTON_DEBUG__.previewFailureRecap('${smokeSeed}', 1),
        playtestReportExport: reportPreview
      });
      await waitFrame();
      const reportCopyButton = document.querySelector('#playtest-report-copy');
      const reportSelectButton = document.querySelector('#playtest-report-select');
      try {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText() {
              throw new Error('denied');
            }
          }
        });
      } catch (error) {
        // Headless browser descriptors can be locked; SELECT still exercises the fallback surface.
      }
      reportCopyButton?.click();
      await Promise.resolve();
      reportSelectButton?.click();
      await waitFrame();
      const reportPanel = document.querySelector('#playtest-report-export');
      const reportSummary = document.querySelector('#playtest-report-summary');
      const reportText = document.querySelector('#playtest-report-text');
      reportExport = {
        status: 'checked',
        copyState: reportPanel?.dataset.copyState || '',
        statusText: document.querySelector('#playtest-report-status')?.innerText || '',
        panelHidden: reportPanel?.classList.contains('hidden') ?? true,
        textHidden: reportText?.classList.contains('hidden') ?? true,
        exportIncludesKind: Boolean(reportText?.value.includes('"kind": "thatbutton.playtestReport"')),
        summaryIncludesPrivacy: Boolean(reportSummary?.innerText.includes('local-only')),
        panel: rect('#playtest-report-export'),
        textarea: rect('#playtest-report-text')
      };
      pushCheck(!reportExport.panelHidden && withinViewport(reportExport.panel, 2)
        ? pass('playtest report export panel renders after run end', reportExport)
        : fail('playtest report export panel missing or outside viewport', reportExport));
      pushCheck(reportExport.summaryIncludesPrivacy && reportExport.exportIncludesKind
        ? pass('playtest report export contains privacy summary and JSON kind', reportExport)
        : fail('playtest report export lost privacy summary or JSON kind', reportExport));
      pushCheck(!reportExport.textHidden && reportExport.copyState === 'fallback' && reportExport.statusText === 'SELECTABLE' && withinViewport(reportExport.textarea, 2)
        ? pass('playtest report export fallback text area is selectable', reportExport)
        : fail('playtest report export fallback text area did not become selectable', reportExport));
      renderer.hideGameOverScreen();
      await waitFrame();
    }

    const syntheticButtons = Array.from({ length: 9 }, (_, index) => ({
      id: 'btn-' + index,
      number: index + 1,
      color: ['color-red', 'color-blue', 'color-yellow', 'color-purple'][index % 4],
      shape: ['+', '#', '*', '/'][index % 4]
    })).map((button) => ({
      id: button.id,
      number: button.number,
      color: { css: button.color, name: button.color },
      shape: { char: button.shape, name: button.shape }
    }));
    const syntheticDifficulty = {
      id: 'hazard-smoke',
      cols: 3,
      rows: 3,
      gridSize: '3x3',
      buttonCount: 9
    };
    renderer.renderBoard({
      buttons: syntheticButtons,
      difficulty: syntheticDifficulty,
      ruleText: 'SMOKE: verify active hazard movement',
      level: 19,
      score: 0,
      onButtonInput: () => {}
    });
    await new Promise((resolve) => setTimeout(resolve, 460));
    await waitFrame();

    const hazardLayout = {
      grid: rect('#btn-grid'),
      commandPanel: rect('#command-panel'),
      playerHud: rect('#player-hud')
    };
    const buttonElements = Array.from(document.querySelectorAll('#btn-grid [role="button"]'));
    const buttonIds = buttonElements.map((button) => button.id).filter(Boolean);
    const initialButtonRects = Object.fromEntries(buttonIds.map((buttonId) => [buttonId, rect('#' + buttonId)]));
    const gridColumns = getComputedStyle(document.querySelector('#btn-grid')).gridTemplateColumns.split(' ').filter(Boolean).length || 3;
    const gridRows = Math.ceil(Math.max(1, buttonIds.length) / Math.max(1, gridColumns));
    const movingSafeTargets = new Set(['btn-1', 'btn-4']);
    const movingForbiddenIds = buttonIds.filter((buttonId) => !movingSafeTargets.has(buttonId));

    const movingHazards = createHazardDirectorState({
      seed: '${smokeSeed}',
      level: 19,
      enemyIndex: 2,
      rows: gridRows,
      cols: gridColumns,
      buttonIds,
      forbiddenIds: movingForbiddenIds,
      nowMs: 2000
    });
    renderer.updateHazardPresentation(movingHazards);
    void document.body.offsetWidth;
    const movingMarkerCount = document.querySelectorAll('.hazard-marker-active[data-hazard-type="moving_button"]').length;
    await new Promise((resolve) => setTimeout(resolve, 240));
    void document.body.offsetWidth;
    const movedButtons = Array.from(document.querySelectorAll('#btn-grid [role="button"][data-hazard-motion="active"]')).map((button) => ({
      id: button.id,
      offsetX: Number(button.dataset.hazardOffsetX || 0),
      offsetY: Number(button.dataset.hazardOffsetY || 0),
      cssOffsetX: getComputedStyle(button).getPropertyValue('--hazard-x').trim(),
      cssOffsetY: getComputedStyle(button).getPropertyValue('--hazard-y').trim(),
      before: initialButtonRects[button.id],
      after: rect('#' + button.id),
      transform: getComputedStyle(button).transform
    }));
    pushCheck(movingHazards.phase === 'active' ? pass('synthetic moving hazard is active', { phase: movingHazards.phase }) : fail('synthetic moving hazard is not active', movingHazards));
    pushCheck(movedButtons.length === 2 ? pass('two moved buttons rendered', { movedButtons }) : fail('unexpected moved button count', { movedButtons }));
    pushCheck(movedButtons.every((button) => Math.abs(button.offsetX) > 0 || Math.abs(button.offsetY) > 0)
      ? pass('moved buttons have non-zero offsets', { movedButtons })
      : fail('moved buttons have zero offsets', { movedButtons }));
    pushCheck(movedButtons.every((button) => withinViewport(button.after) && contains(hazardLayout.grid, button.after, 10))
      ? pass('moved buttons stay inside grid and viewport', { movedButtons })
      : fail('moved buttons escape grid or viewport', { movedButtons, grid: hazardLayout.grid }));
    pushCheck(movedButtons.every((button) =>
      Math.abs((button.after.centerX - button.before.centerX) - button.offsetX) <= 1.5 &&
      Math.abs((button.after.centerY - button.before.centerY) - button.offsetY) <= 1.5
    )
      ? pass('moved button visual rect follows hazard offsets', { movedButtons })
      : fail('moved button visual rect does not follow offsets', { movedButtons }));
    pushCheck(movingMarkerCount === movedButtons.length
      ? pass('moving hazard markers match moved buttons')
      : fail('moving hazard marker count mismatch', {
        markerCount: movingMarkerCount,
        movedCount: movedButtons.length
      }));

    const interferenceHazards = createHazardDirectorState({
      seed: '${smokeSeed}',
      level: 24,
      enemyIndex: 2,
      rows: gridRows,
      cols: gridColumns,
      buttonIds,
      forbiddenIds: movingForbiddenIds,
      nowMs: 6000
    });
    renderer.updateHazardPresentation(interferenceHazards);
    void document.body.offsetWidth;
    const commandPanel = document.querySelector('#command-panel');
    const grid = document.querySelector('#btn-grid');
    const interference = {
      phase: interferenceHazards.phase,
      boardDataset: commandPanel?.dataset.hazardBoard || '',
      opacityVar: commandPanel ? getComputedStyle(commandPanel).getPropertyValue('--hazard-interference-opacity').trim() : '',
      pseudoOpacity: grid ? getComputedStyle(grid, '::after').opacity : '',
      markerCount: document.querySelectorAll('.hazard-board-marker[data-hazard-type="interference"]').length,
      clue: rect('#clue-text'),
      playerHud: rect('#player-hud'),
      grid: rect('#btn-grid')
    };
    pushCheck(interference.phase === 'active' ? pass('synthetic interference hazard is active', interference) : fail('synthetic interference hazard is not active', interference));
    pushCheck(interference.boardDataset === 'active' ? pass('interference is scoped to board dataset', interference) : fail('interference board dataset mismatch', interference));
    pushCheck(Number(interference.opacityVar) <= 0.16 && Number(interference.opacityVar) > 0 ? pass('interference opacity cap is honored', interference) : fail('interference opacity cap mismatch', interference));
    pushCheck(interference.markerCount === 1 ? pass('one board interference marker rendered') : fail('interference marker count mismatch', interference));
    pushCheck(!intersects(interference.clue, interference.grid) && !intersects(interference.playerHud, interference.grid)
      ? pass('interference leaves clue and player HUD clear of grid')
      : fail('interference overlaps clue/player HUD geometry', interference));

    renderer.updateHazardPresentation(createDisabledHazardState({ level: 18, enemyIndex: 1, reason: 'upgrade_pending' }));
    renderer.showUpgradeScreen({
      choices: [
        { id: 'smoke-fast-hands', label: 'Fast Hands', shortLabel: 'TIME', value: 2 },
        { id: 'smoke-chain-focus', label: 'Chain Focus', shortLabel: 'COMBO', value: 1 },
        { id: 'smoke-plating', label: 'Plating', shortLabel: 'HP', value: 12 }
      ],
      onSelect: () => {}
    });
    void document.body.offsetWidth;
    const upgrade = {
      overlay: rect('#upgrade-screen'),
      cardCount: document.querySelectorAll('.upgrade-card').length,
      hidden: document.querySelector('#upgrade-screen')?.classList.contains('hidden') || false,
      boardDataset: document.querySelector('#command-panel')?.dataset.hazardBoard || '',
      opacityVar: getComputedStyle(document.querySelector('#command-panel')).getPropertyValue('--hazard-interference-opacity').trim()
    };
    pushCheck(!upgrade.hidden && upgrade.cardCount === 3 ? pass('upgrade overlay renders three cards', upgrade) : fail('upgrade overlay missing cards', upgrade));
    pushCheck(withinViewport(upgrade.overlay, 2) ? pass('upgrade overlay fits viewport', upgrade) : fail('upgrade overlay outside viewport', upgrade));
    pushCheck(upgrade.boardDataset === 'none' && Number(upgrade.opacityVar) === 0 ? pass('upgrade overlay has hazards disabled/harmless', upgrade) : fail('upgrade overlay hazard state mismatch', upgrade));
    renderer.showUpgradeReward({
      id: 'smoke-fast-hands',
      label: 'Fast Hands',
      shortLabel: 'TIME',
      value: 2
    });
    void document.body.offsetWidth;
    const upgradeRewardCount = document.querySelectorAll('.upgrade-reward-burst.vfx-tier-upgrade').length;
    pushCheck(upgradeRewardCount > 0 ? pass('upgrade reward VFX marker rendered', { upgradeRewardCount }) : fail('upgrade reward VFX marker missing', { upgradeRewardCount }));
    renderer.hideUpgradeScreen();

    renderer.updateHazardPresentation(interferenceHazards);
    const vfxSourceElement = document.querySelector('#btn-4') || document.querySelector('#btn-grid [role="button"]');
    const sourceCenterBeforeVfx = rect('#' + vfxSourceElement.id);
    renderer.showSafePressFeedback({
      sourceElement: vfxSourceElement,
      previous: { streak: 0 },
      combo: { streak: 0 }
    });
    renderer.showSafePressFeedback({
      sourceElement: vfxSourceElement,
      previous: { streak: 0 },
      combo: { streak: 1 }
    });
    renderer.showComboReward({
      previous: { streak: 1, damageBonus: 0 },
      combo: { streak: 2, comboText: 'COMBO x2', rewardText: 'DMG +1', damageBonus: 1, hasVisibleCombo: true },
      sourceElement: vfxSourceElement
    });
    renderer.showComboReward({
      previous: { streak: 2, damageBonus: 1 },
      combo: { streak: 4, comboText: 'COMBO x4', rewardText: 'DMG +3', damageBonus: 3, hasVisibleCombo: true },
      sourceElement: vfxSourceElement
    });
    renderer.showComboReward({
      previous: { streak: 12, damageBonus: 8 },
      combo: { streak: 12, comboText: 'COMBO x12', rewardText: 'DMG +8', damageBonus: 8, isCapped: true, hasVisibleCombo: true },
      capped: true,
      sourceElement: vfxSourceElement
    });
    renderer.showWrongPressFeedback({
      sourceElement: vfxSourceElement,
      damage: { appliedDamage: 18 },
      defeated: false
    });
    renderer.showBossHit({
      sourceElement: vfxSourceElement,
      damage: { appliedDamage: 32 },
      defeated: true
    });
    await new Promise((resolve) => setTimeout(resolve, 360));
    renderer.updateHazardPresentation(interferenceHazards);
    void document.body.offsetWidth;
    const firstTracer = document.querySelector('.button-to-enemy-tracer.vfx-data-projectile');
    const firstTracerStart = firstTracer ? {
      x: Number.parseFloat(firstTracer.style.left || '0'),
      y: Number.parseFloat(firstTracer.style.top || '0')
    } : null;
    const sourceCenter = sourceCenterBeforeVfx ? {
      x: sourceCenterBeforeVfx.centerX,
      y: sourceCenterBeforeVfx.centerY
    } : null;
    const tracerOriginDelta = firstTracerStart && sourceCenter ? {
      x: Number((firstTracerStart.x - sourceCenter.x).toFixed(2)),
      y: Number((firstTracerStart.y - sourceCenter.y).toFixed(2))
    } : null;
    const vfx = {
      counts: {
        safeSuccess: document.querySelectorAll('.vfx-tier-safe-success').length,
        chainStart: document.querySelectorAll('.vfx-tier-chain-start').length,
        comboX2: document.querySelectorAll('.vfx-tier-combo-x2').length,
        comboHigh: document.querySelectorAll('.vfx-tier-combo-high').length,
        comboCapped: document.querySelectorAll('.vfx-tier-combo-capped').length,
        wrongPress: document.querySelectorAll('.wrong-impact-vector.vfx-tier-wrong-press').length,
        enemyHit: document.querySelectorAll('.enemy-hit-vector').length,
        enemyDefeat: document.querySelectorAll('.enemy-defeat-burst').length,
        upgradeReward: upgradeRewardCount,
        dataProjectile: document.querySelectorAll('.vfx-data-projectile').length,
        phosphorAfterimage: document.querySelectorAll('.vfx-phosphor-afterimage').length,
        chunkyNeonFragment: document.querySelectorAll('.chunky-neon-fragment').length
      },
      sourceCenter,
      firstTracerStart,
      tracerOriginDelta,
      particleZIndex: Number.parseInt(getComputedStyle(document.querySelector('.button-combo-spark')).zIndex || '0', 10),
      interferenceBoardDataset: document.querySelector('#command-panel')?.dataset.hazardBoard || ''
    };
    pushCheck(vfx.counts.safeSuccess > 0 && vfx.counts.chainStart > 0
      ? pass('safe and chain-start VFX markers rendered', vfx.counts)
      : fail('safe or chain-start VFX markers missing', vfx.counts));
    pushCheck(vfx.counts.comboX2 > 0 && vfx.counts.comboHigh > 0 && vfx.counts.comboCapped > 0
      ? pass('combo tier VFX markers rendered', vfx.counts)
      : fail('combo tier VFX markers missing', vfx.counts));
    pushCheck(vfx.counts.wrongPress > 0
      ? pass('wrong-press VFX marker rendered', vfx.counts)
      : fail('wrong-press VFX marker missing', vfx.counts));
    pushCheck(vfx.counts.enemyHit > 0 && vfx.counts.enemyDefeat > 0
      ? pass('enemy hit/defeat VFX markers rendered', vfx.counts)
      : fail('enemy hit/defeat VFX markers missing', vfx.counts));
    pushCheck(vfx.counts.dataProjectile > 0 && vfx.counts.phosphorAfterimage > 0 && vfx.counts.chunkyNeonFragment > 0
      ? pass('retro terminal projectile VFX markers rendered', vfx.counts)
      : fail('retro terminal projectile VFX markers missing', vfx.counts));
    pushCheck(vfx.tracerOriginDelta && Math.abs(vfx.tracerOriginDelta.x) <= sourceCenterBeforeVfx.width * 0.7 && Math.abs(vfx.tracerOriginDelta.y) <= sourceCenterBeforeVfx.height * 0.7
      ? pass('button-to-enemy VFX originates from current button rect', vfx)
      : fail('button-to-enemy VFX origin is detached from button rect', vfx));
    pushCheck(vfx.interferenceBoardDataset === 'active' && vfx.particleZIndex >= 80
      ? pass('combat VFX remains above active board interference', vfx)
      : fail('combat VFX layering over interference is weak', vfx));

    return {
      viewport,
      ok: failures.length === 0,
      checks,
      layout,
      encounterLabel,
      moving: {
        hazards: movingHazards,
        movedButtons
      },
      interference,
      upgrade,
      reportExport,
      vfx
    };
  })()`;
}

async function runViewportSmoke(client, sessionId, appUrl, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.isMobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
    screenOrientation: {
      type: viewport.height >= viewport.width ? 'portraitPrimary' : 'landscapePrimary',
      angle: 0
    }
  }, sessionId);
  await client.send('Emulation.setTouchEmulationEnabled', {
    enabled: viewport.isMobile,
    configuration: viewport.isMobile ? 'mobile' : 'desktop'
  }, sessionId);
  await client.send('Page.navigate', { url: appUrl }, sessionId);
  await waitForBrowserReady(client, sessionId);
  return await evaluate(client, sessionId, getSmokeExpression(viewport));
}

async function main() {
  const browserExecutable = findBrowserExecutable();
  const appPort = await getFreePort();
  const debugPort = await getFreePort();
  const userDataDir = join(tmpdir(), `thatbutton-hazard-smoke-${Date.now()}`);
  const appServer = await createStaticServer({ root: projectRoot, port: appPort });
  let browser = null;
  let client = null;

  try {
    browser = spawn(browserExecutable, [
      '--headless=new',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      '--remote-allow-origins=*',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-default-apps',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1280,720',
      'about:blank'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    const version = await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
    client = await new CdpClient(version.webSocketDebuggerUrl).connect();
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });
    await client.send('Page.enable', {}, sessionId);
    await client.send('Runtime.enable', {}, sessionId);

    const appUrl = `http://127.0.0.1:${appPort}${smokeUrlPath}`;
    const results = [];
    for (const viewport of viewports) {
      results.push(await runViewportSmoke(client, sessionId, appUrl, viewport));
    }

    const summary = {
      status: results.every((result) => result.ok) ? 'PASS' : 'FAIL',
      smoke: 'phase-9-browser-hazard-report-smoke',
      browserExecutable,
      servedPath: smokeUrlPath,
      seed: smokeSeed,
      viewports: results.map(compactSmokeResult)
    };
    mkdirSync(docsDir, { recursive: true });
    const jsonLineEnding = process.platform === 'win32' ? '\r\n' : '\n';
    const legacySummary = {
      ...summary,
      smoke: 'phase-7a-browser-hazard-smoke'
    };
    const legacyJsonOutput = `${JSON.stringify(legacySummary, null, 2)}\n`.replace(/\n/g, jsonLineEnding);
    const phase9JsonOutput = `${JSON.stringify(summary, null, 2)}\n`.replace(/\n/g, jsonLineEnding);
    writeFileSync(resultPath, legacyJsonOutput, 'utf8');
    writeFileSync(phase9ResultPath, phase9JsonOutput, 'utf8');

    if (summary.status !== 'PASS') {
      console.error(`Hazard/report browser smoke failed. Results written to ${resultPath} and ${phase9ResultPath}`);
      for (const result of results) {
        const failures = result.checks.filter((check) => !check.ok);
        if (failures.length) {
          console.error(`${result.viewport.name}: ${failures.map((failure) => failure.message).join('; ')}`);
        }
      }
      process.exitCode = 1;
      return;
    }

    console.log(`Hazard/report browser smoke passed. Results written to ${resultPath} and ${phase9ResultPath}`);
  } finally {
    if (client) {
      await client.send('Browser.close').catch(() => {});
      client.close();
    }
    if (browser && browser.exitCode === null && !browser.killed) {
      browser.kill();
    }
    await waitForExit(browser);
    await new Promise((resolveClose) => appServer.close(resolveClose));
    await removeTempDir(userDataDir);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
