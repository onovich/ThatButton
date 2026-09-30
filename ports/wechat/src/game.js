import { createGameSession } from '../../../src/app/game-session.js';
import { UPGRADE_DEFINITIONS } from '../../../src/config/upgrades.js';
import { createWechatAudio } from './audio.js';
import { createWechatMusic, normalizeMusicVolume } from './music.js';
import { createCanvasRenderer } from './renderer.js';
import { createWechatHazards } from './hazards.js';

const SETTINGS_KEY = 'thatbutton.wechat.settings.v1';
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
  let menuButtonRect = null;
  try { menuButtonRect = wxApi.getMenuButtonBoundingClientRect?.() || null; } catch {}
  const view = createCanvasRenderer({ canvas, info, menuButtonRect,
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
  const requestFrame = typeof canvas.requestAnimationFrame === 'function'
    ? (callback) => canvas.requestAnimationFrame(() => callback(clock.now()))
    : (callback) => setTimeout(() => callback(clock.now()), 16);
  const storage = {
    getItem: (key) => wxApi.getStorageSync(key) || null,
    setItem: (key, value) => wxApi.setStorageSync(key, value),
    removeItem: (key) => wxApi.removeStorageSync(key)
  };
  const query = wxApi.getLaunchOptionsSync?.().query || {};
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
    seedProvider: () => query.seed || null,
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
    const settled = await Promise.all(Object.entries(ART).map(([name, source]) => loadOne(name, source)));
    const images = {};
    const failed = [];
    for (const item of settled) {
      if (item.image) images[item.name] = item.image;
      else failed.push(item.name);
    }
    view.setImages(images);
    if (failed.length) view.showResourceError(failed);
    else { view.showHome(); music.play('home'); }
  }
  void loadArt();

  let lastDispatch = null;
  function handleTouch(event, source) {
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
    audio.suspend();
    music.pause();
    view.setMotionPaused(true);
    if (pausedAt === null && app.getState().isPlaying && view.getView().mode === 'game') {
      pausedAt = Date.now();
    }
  });
  wxApi.onShow?.(() => {
    if (pausedAt !== null && app.getState().isPlaying) {
      view.showResume();
    } else {
      unpause();
      view.draw();
      music.resume();
    }
    view.setMotionPaused(false);
  });

  return { app, view, audio, music };
}

if (typeof wx !== 'undefined') {
  createWechatGame(wx);
}
