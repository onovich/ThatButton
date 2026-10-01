import { createGameSession } from '../../../src/app/game-session.js';
import { UPGRADE_DEFINITIONS } from '../../../src/config/upgrades.js';
import { createWechatAudio } from './audio.js';
import { createWechatMusic, normalizeMusicVolume } from './music.js';
import { createCanvasRenderer } from './renderer.js';
import { createWechatHazards } from './hazards.js';
import { createPerformanceDiagnostics, PERFORMANCE_STORAGE_KEY } from './performance-diagnostics.js';
import { createComparisonExport } from './ab-comparison.js';

const SETTINGS_KEY = 'thatbutton.wechat.settings.v1';
const BUILD_ID = typeof __WECHAT_BUILD_ID__ === 'undefined' ? 'source-preview' : __WECHAT_BUILD_ID__;
const ART = {
  running: 'art/running-pair.png',
  caring: 'art/caring-pair.png',
  separated: 'art/separated-pair.png',
  homeTitle: 'art/title-home.png',
  resultTitle: 'art/title-result.png',
  resultButtonRetry: 'art/result-button-retry-v32.png',
  resultButtonHome: 'art/result-button-home-v32.png',
  resultScoreDigits: 'art/result-score-digits-v32.png',
  resultScoreFen: 'art/result-score-fen-v32.png',
  resultCrown: 'art/result-crown-v32.png',
  resultBurst: 'art/result-burst-v32.png',
  resultBurstRight: 'art/result-burst-right-v32.png',
  upgradeTitle: 'art/title-upgrade-v22.png',
  upgradeBubble: 'art/upgrade-bubble-v25.png',
  upgradeStatus: 'art/upgrade-status-v23.png',
  upgradeHeart: 'art/upgrade-heart-v23.png',
  upgradeChain: 'art/upgrade-card-chain-v23.png',
  upgradeHp: 'art/upgrade-card-hp-v23.png',
  upgradeTime: 'art/upgrade-card-time-v23.png',
  upgradeProgress: 'art/upgrade-card-progress-v23.png',
  upgradePair: 'art/upgrade-pair-v24.png',
  upgradeBackground: 'art/upgrade-background-v24.jpg',
  upgradeRays: 'art/upgrade-rays-v24.png',
  stage: 'art/sunny-stage.jpg',
  landscape: 'art/gameplay-landscape.jpg',
  comboWordmark: 'art/combo-wordmark-v30.png',
  maxWordmark: 'art/max-wordmark-v30.png',
  readyWordmark: 'art/ready-wordmark-v25.png',
  hitWordmark: 'art/hit-wordmark-v30.png',
  comboDigits: 'art/combo-digits-v29.png'
};

export function createWechatGame(wxApi) {
  if (!wxApi || typeof wxApi.createCanvas !== 'function') {
    throw new Error('WeChat Mini Game canvas API is required.');
  }
  const canvas = wxApi.createCanvas();
  const info = wxApi.getWindowInfo?.() || wxApi.getSystemInfoSync();
  const query = wxApi.getLaunchOptionsSync?.().query || {};
  // Candidate remains opt-in until system-font visual parity is accepted.
  const textAtlasOptions = { rules: query.ruleAtlas === '1', numbers: query.numberAtlas === '1' };
  let comparison = null, comparisonSeed = null, comparisonSeriesId = null;
  let comparisonOrder = 0, comparisonRequest = 0, atlasImagePromise = null;
  let diagnostics = createPerformanceDiagnostics(wxApi, {
    enabled: query.perf === '1',
    metadata: { buildId: BUILD_ID, width: info.windowWidth, height: info.windowHeight, pixelRatio: info.pixelRatio,
      ruleAtlas: textAtlasOptions.rules, numberAtlas: textAtlasOptions.numbers }
  });
  let menuButtonRect = null;
  try { menuButtonRect = wxApi.getMenuButtonBoundingClientRect?.() || null; } catch {}
  const view = createCanvasRenderer({ canvas, info, menuButtonRect, diagnostics, textAtlasOptions,
    createSurface: () => wxApi.createOffscreenCanvas?.({type:'2d',width:128,height:128}) || wxApi.createCanvas() });
  const music = createWechatMusic(wxApi);
  const audio = createWechatAudio(wxApi, Date.now, (cue) => {
    if (cue.priority >= 3) music.duck();
  });
  const vibrationAvailable = typeof wxApi.vibrateShort === 'function';
  let preferences = { sound: true, music: true, musicVolume: 2, vibration: vibrationAvailable };
  try {
    const saved = wxApi.getStorageSync(SETTINGS_KEY);
    if (saved && typeof saved === 'object') {
      preferences = {
        sound: saved.sound !== false,
        music: saved.music !== false,
        musicVolume: normalizeMusicVolume(saved.musicVolume ?? 2),
        vibration: vibrationAvailable && saved.vibration !== false
      };
    }
  } catch {}
  function applyPreferences() {
    audio.setPreferences(preferences);
    music.setPreferences(preferences);
    view.setSettings({ ...preferences, vibrationAvailable });
  }
  applyPreferences();
  audio.preload();

  let pausedAt = null;
  let pausedDurationMs = 0;
  const clock = {
    now: () => Date.now() - pausedDurationMs - (pausedAt === null ? 0 : Date.now() - pausedAt)
  };
  let hidden = false;
  let pendingFrame = null;
  let frameScheduled = false;
  function scheduleFrame() {
    if (hidden || pausedAt !== null || frameScheduled || !pendingFrame) return;
    frameScheduled = true;
    const run = () => {
      frameScheduled = false;
      if (hidden || pausedAt !== null) return;
      diagnostics?.frame(view.getDiagnosticScene(), typeof canvas.requestAnimationFrame === 'function');
      const callback = pendingFrame;
      pendingFrame = null;
      if (callback) view.batch(() => callback(clock.now()));
    };
    if (typeof canvas.requestAnimationFrame === 'function') canvas.requestAnimationFrame(run);
    else setTimeout(run, 16);
  }
  function requestFrame(callback) { pendingFrame = callback; scheduleFrame(); }
  const storage = {
    getItem: (key) => wxApi.getStorageSync(key) || null,
    setItem: (key, value) => wxApi.setStorageSync(key, value),
    removeItem: (key) => wxApi.removeStorageSync(key)
  };
  const renderer = {
    ...view.renderer,
    renderBoard(options) {
      const delay = view.renderer.renderBoard(options);
      music.play('game');
      return delay;
    },
    showGameOverScreen(options) {
      view.renderer.showGameOverScreen(options);
      music.play('home');
    }
  };
  const app = createGameSession({
    performance: clock,
    requestAnimationFrame: requestFrame,
    setTimeout,
    hostBridge: { emit: () => ({ accepted: true, reason: 'emitted' }) },
    storage,
    audio,
    renderer,
    hazardDirector: createWechatHazards,
    viewportSize: () => ({ width: view.width, height: view.height }),
    seedProvider: () => comparisonSeed || query.seed || null,
    debugProvider: () => false,
    hazardsDisabledProvider: () => false,
    upgradeDefinitions: UPGRADE_DEFINITIONS.filter((item) => item.id !== 'combo-reward-plus')
  });
  app.init();

  function unpause() {
    if (pausedAt !== null) {
      pausedDurationMs += Date.now() - pausedAt;
      pausedAt = null;
    }
    diagnostics?.setActive(true);
    scheduleFrame();
  }
  function loadOne(name, source) {
    return new Promise((resolve) => {
      let img;
      try { img = wxApi.createImage(); } catch { resolve({ name, failed: true }); return; }
      let done = false;
      const finish = (result) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        resolve(result);
      };
      const timeout = setTimeout(() => finish({ name, failed: true }), 5000);
      img.onload = () => finish({ name, image: img });
      img.onerror = () => finish({ name, failed: true });
      try { img.src = source; } catch { finish({ name, failed: true }); }
    });
  }
  async function loadArt() {
    if (typeof wxApi.createImage !== 'function') {
      view.showHome();
      music.play('home');
      return;
    }
    view.showLoading();
    const assets = { ...ART };
    if (textAtlasOptions.rules || textAtlasOptions.numbers) assets.textAtlas = 'art/text-atlas-v1.png';
    const settled = await Promise.all(Object.entries(assets).map(([name, source]) => loadOne(name, source)));
    const images = {};
    const failed = [];
    for (const item of settled) {
      if (item.image) images[item.name] = item.image;
      else if (item.name !== 'textAtlas') failed.push(item.name);
    }
    view.setImages(images);
    if (diagnostics) diagnostics.metadata.atlasStatus = view.getTextAtlasStatus();
    if (failed.length) view.showResourceError(failed);
    else { view.showHome(); music.play('home'); }
  }
  void loadArt();

  function updateDiagnosticMetadata() {
    if (!diagnostics) return;
    const state = app.getState();
    diagnostics.metadata.run = { seed: state.seed, level: state.level, score: state.score };
    diagnostics.metadata.atlasStatus = view.getTextAtlasStatus();
  }

  function setDiagnosticsEnabled(enabled) {
    if (Boolean(diagnostics) === Boolean(enabled)) return;
    if (enabled) {
      let device = {};
      try {
        const details = wxApi.getDeviceInfo?.() || {};
        for (const key of ['model', 'system', 'platform']) {
          if (typeof details[key] === 'string') device[key] = details[key].slice(0, 100);
        }
      } catch {}
      diagnostics = createPerformanceDiagnostics(wxApi, { enabled: true,
        metadata: { ...device, buildId: BUILD_ID, comparison,
          width: info.windowWidth, height: info.windowHeight,
          pixelRatio: info.pixelRatio, ruleAtlas: textAtlasOptions.rules,
          numberAtlas: textAtlasOptions.numbers, atlasStatus: view.getTextAtlasStatus() } });
      diagnostics.setActive(!hidden && pausedAt === null);
    } else {
      updateDiagnosticMetadata();
      diagnostics.setActive(false);
      diagnostics.save();
      diagnostics.dispose();
      diagnostics = null;
    }
    view.setDiagnostics(diagnostics);
  }
  function exportDiagnostics() {
    if (diagnostics) { updateDiagnosticMetadata(); return diagnostics.exportReport(); }
    try {
      const stored = wxApi.getStorageSync?.(PERFORMANCE_STORAGE_KEY);
      const report = Array.isArray(stored) ? stored[stored.length - 1] : null;
      if (!report || report.schemaVersion !== 1 || JSON.stringify(report).length > 24000) {
        wxApi.showToast?.({ title: '暂无报告，请先开启诊断试玩', icon: 'none' });
        return null;
      }
      const data = JSON.stringify(report, null, 2);
      if (typeof wxApi.setClipboardData !== 'function') throw new Error('clipboard unavailable');
      wxApi.setClipboardData({ data,
        fail: () => wxApi.showToast?.({ title: '复制失败，请重试', icon: 'none' }) });
      return data;
    } catch {
      wxApi.showToast?.({ title: '报告读取或复制失败', icon: 'none' });
      return null;
    }
  }
  function clearDiagnostics() {
    if (diagnostics) {
      diagnostics.dispose();
      diagnostics = null;
      view.setDiagnostics(null);
    }
    try { wxApi.removeStorageSync(PERFORMANCE_STORAGE_KEY); }
    catch { wxApi.showToast?.({ title: '清除失败，请重试', icon: 'none' }); return false; }
    return true;
  }
  function canSelectComparison() {
    if (hidden || app.getState().isPlaying || !['home', 'settings', 'gameover'].includes(view.getView().mode)) {
      wxApi.showToast?.({ title: '请先结束本局，再选择对照组', icon: 'none' });
      return false;
    }
    return true;
  }
  async function beginComparison(group) {
    if (!['A', 'B'].includes(group) || !canSelectComparison()) return false;
    const request = ++comparisonRequest;
    setDiagnosticsEnabled(false); // Save the previous group before changing its metadata or rendering.
    // Both groups retain the same decoded asset; exclude loading from their samples.
    if (view.getTextAtlasStatus().failed) atlasImagePromise = null;
    let image = view.getTextAtlasStatus().loaded && !view.getTextAtlasStatus().failed
      ? view.getView().images.textAtlas : null;
    if (!image) {
      wxApi.showToast?.({ title: '正在准备对照素材', icon: 'loading' });
      atlasImagePromise ||= loadOne('textAtlas', 'art/text-atlas-v1.png');
      image = (await atlasImagePromise).image;
    }
    if (request !== comparisonRequest || !canSelectComparison()) return false;
    view.setImages({ ...view.getView().images, textAtlas: image });
    if (!view.getTextAtlasStatus().loaded) {
      atlasImagePromise = null;
      wxApi.showToast?.({ title: '图集加载失败，对照未开始', icon: 'none' });
      return false;
    }
    comparisonSeriesId ||= `text-ab-${Date.now()}`;
    comparisonSeed = query.seed ? String(query.seed).slice(0, 128) : 'text-atlas-ab-v1';
    Object.assign(textAtlasOptions, { rules: group === 'B', numbers: group === 'B' });
    comparison = { seriesId: comparisonSeriesId, order: ++comparisonOrder, group,
      seed: comparisonSeed, scope: 'prebuilt-text-only', warmedAtlasInBothGroups: true };
    view.setTextAtlasOptions(textAtlasOptions);
    setDiagnosticsEnabled(true);
    wxApi.showToast?.({ title: `${group}组已就绪，请开始游戏`, icon: 'none' });
    return true;
  }
  function finishComparison() {
    if (!canSelectComparison()) return false;
    comparisonRequest++;
    setDiagnosticsEnabled(false);
    comparison = null; comparisonSeed = null;
    Object.assign(textAtlasOptions, { rules: false, numbers: false });
    view.setTextAtlasOptions(textAtlasOptions);
    const { textAtlas, ...images } = view.getView().images;
    view.setImages(images); atlasImagePromise = null;
    return true;
  }
  function exportComparison() {
    if (diagnostics) { updateDiagnosticMetadata(); diagnostics.save(); }
    try {
      const bundle = createComparisonExport(wxApi.getStorageSync?.(PERFORMANCE_STORAGE_KEY), comparisonSeriesId);
      if (!bundle.reports.length) {
        wxApi.showToast?.({ title: '暂无本次A/B报告，请先选组试玩', icon: 'none' });
        return null;
      }
      if (typeof wxApi.setClipboardData !== 'function') throw new Error('clipboard unavailable');
      const data = JSON.stringify(bundle, null, 2);
      wxApi.setClipboardData({ data,
        fail: () => wxApi.showToast?.({ title: '复制失败，请重试', icon: 'none' }) });
      return data;
    } catch { wxApi.showToast?.({ title: '对照报告读取或复制失败', icon: 'none' }); return null; }
  }
  function openComparisonMenu() {
    if (!canSelectComparison()) return;
    wxApi.showActionSheet({ itemList: ['A组：原文字绘制', 'B组：规则和数字图集', '退出A/B，恢复默认绘制'],
      success({ tapIndex }) {
        if (tapIndex === 2) { finishComparison(); return; }
        const group = ['A', 'B'][tapIndex];
        if (!group) return;
        if (typeof wxApi.showModal === 'function') wxApi.showModal({ title: `开始${group}组对照`,
          content: '保存上一份报告，使用固定种子并开始新采样。仅本次运行；B组字体外观可能不同。素材准备后从首页开始游戏。',
          confirmText: '开始对照', success: ({ confirm }) => { if (confirm) void beginComparison(group); } });
        else void beginComparison(group);
      }
    });
  }
  function openDiagnosticsMenu() {
    if (typeof wxApi.showActionSheet !== 'function') {
      wxApi.showToast?.({ title: '请在微信中使用内测诊断', icon: 'none' });
      return;
    }
    wxApi.showActionSheet({
      itemList: [diagnostics ? '关闭内测诊断并保存报告' : '开启内测诊断（仅本次运行）',
        '复制最近内测报告', '关闭诊断并清除内测记录',
        `同包文字A/B对照${comparison ? `：${comparison.group}组` : ''}`, '复制本次A/B对照报告'],
      success({ tapIndex }) {
        if (tapIndex === 0) {
          if (diagnostics) setDiagnosticsEnabled(false);
          else if (typeof wxApi.showModal === 'function') wxApi.showModal({
            title: '开启内测诊断',
            content: '记录机型和游戏性能统计，仅保存在本机。会有少量采样开销，不自动上传；重启后默认关闭。',
            confirmText: '开启',
            success: ({ confirm }) => { if (confirm) setDiagnosticsEnabled(true); }
          });
          else setDiagnosticsEnabled(true);
        } else if (tapIndex === 1) exportDiagnostics();
        else if (tapIndex === 2) {
          if (clearDiagnostics()) wxApi.showToast?.({ title: '内测记录已清除', icon: 'none' });
        } else if (tapIndex === 3) openComparisonMenu();
        else if (tapIndex === 4) exportComparison();
      }
    });
  }

  let lastDispatch = null;
  function handleTouch(event, source) {
    return view.batch(() => dispatchTouch(event, source));
  }
  function dispatchTouch(event, source) {
    const touch = event.changedTouches?.[0] || event.touches?.[0] || event;
    if (!touch) return;
    let x = touch.clientX ?? touch.pageX ?? touch.x ?? touch.screenX;
    let y = touch.clientY ?? touch.pageY ?? touch.y ?? touch.screenY;
    if (source.startsWith('canvas')) {
      const rect = canvas.getBoundingClientRect?.();
      if (rect?.width > 0 && rect?.height > 0 && Number.isFinite(touch.clientX)) {
        x = (touch.clientX - rect.left) * view.width / rect.width;
        y = (touch.clientY - rect.top) * view.height / rect.height;
      } else {
        x = touch.offsetX ?? x;
        y = touch.offsetY ?? y;
      }
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const now = Date.now();
    if (lastDispatch && now - lastDispatch.time < 80 &&
        Math.abs(x - lastDispatch.x) < 5 && Math.abs(y - lastDispatch.y) < 5) return;
    lastDispatch = { x, y, time: now };
    const action = view.hitTest(x, y);
    if (!action) return;
    if (view.getView().mode !== 'resume') music.resume();
    view.playActionFeedback(action);
    if (action.type === 'help' || action.type === 'settings') audio.playUiOpen();
    else if (action.type === 'home') audio.playUiBack();
    else if (['resume', 'retryAssets', 'continueFallback'].includes(action.type)) audio.playUiConfirm();
    if (action.type === 'start') app.start();
    else if (action.type === 'reset') app.reset();
    else if (action.type === 'press') app.press(action.buttonId);
    else if (action.type === 'upgrade') app.selectUpgrade(action.upgradeId);
    else if (action.type === 'help') view.showHelp();
    else if (action.type === 'settings') view.showSettings();
    else if (action.type === 'home') { view.showHome(); music.play('home'); }
    else if (action.type === 'resume') { unpause(); view.resumeGame(); music.resume(); }
    else if (action.type === 'retryAssets') void loadArt();
    else if (action.type === 'continueFallback') { view.showHome(); music.play('home'); }
    else if (action.type === 'diagnosticsMenu') openDiagnosticsMenu();
    else if (action.type === 'exportPerformance') exportDiagnostics();
    else if (action.type === 'toggle') {
      preferences = { ...preferences, [action.key]: !preferences[action.key] };
      try { wxApi.setStorageSync(SETTINGS_KEY, preferences); } catch {}
      applyPreferences();
      if (preferences.sound) audio.playUiToggle();
    } else if (action.type === 'musicVolume') {
      preferences = { ...preferences,
        musicVolume: normalizeMusicVolume(preferences.musicVolume + action.delta) };
      try { wxApi.setStorageSync(SETTINGS_KEY, preferences); } catch {}
      applyPreferences();
      if (preferences.sound) audio.playUiToggle();
    }
    view.draw();
  }

  // Some simulator input paths emit only touchend. A start/end pair must still
  // dispatch exactly once, including when the first action changes screens.
  let startedTouch = false;
  if (typeof wxApi.onTouchStart === 'function') {
    wxApi.onTouchStart((event) => {
      startedTouch = true;
      handleTouch(event, 'start');
    });
  }
  if (typeof wxApi.onTouchEnd === 'function') {
    wxApi.onTouchEnd((event) => {
      if (!startedTouch) handleTouch(event, 'end');
      startedTouch = false;
    });
  }
  if (typeof canvas.addEventListener === 'function') {
    for (const name of ['pointerdown', 'mousedown', 'touchstart']) {
      canvas.addEventListener(name, (event) => handleTouch(event, `canvas:${name}`));
    }
  }
  wxApi.onTouchCancel?.(() => { startedTouch = false; });
  if (typeof wxApi.onTouchStart !== 'function' && typeof wxApi.onTouchEnd !== 'function') {
    console.error('WeChat touch APIs are unavailable; check the imported project type and runtime.');
  }
  wxApi.onHide?.(() => {
    hidden = true;
    updateDiagnosticMetadata();
    diagnostics?.setActive(false);
    diagnostics?.save();
    audio.suspend();
    music.pause();
    view.setMotionPaused(true);
    if (pausedAt === null && app.getState().isPlaying && view.getView().mode === 'game') {
      pausedAt = Date.now();
    }
  });
  wxApi.onShow?.(() => {
    hidden = false;
    if (pausedAt !== null && app.getState().isPlaying) {
      view.showResume();
    } else {
      unpause();
      view.draw();
      music.resume();
    }
    view.setMotionPaused(false);
  });

  return { app, view, audio, music, get diagnostics() { return diagnostics; },
    performanceControls: { setEnabled: setDiagnosticsEnabled, exportReport: exportDiagnostics,
      clear: clearDiagnostics, isEnabled: () => Boolean(diagnostics),
      beginComparison, finishComparison, exportComparison, getComparison: () => comparison } };
}

if (typeof wx !== 'undefined') {
  createWechatGame(wx);
}
