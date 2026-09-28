import { createGameSession } from '../../../src/app/game-session.js';
import { createWechatAudio } from './audio.js';
import { createCanvasRenderer } from './renderer.js';

export function createWechatGame(wxApi) {
  if (!wxApi || typeof wxApi.createCanvas !== 'function') {
    throw new Error('WeChat Mini Game canvas API is required.');
  }
  const canvas = wxApi.createCanvas();
  const info = wxApi.getWindowInfo?.() || wxApi.getSystemInfoSync();
  const view = createCanvasRenderer({ canvas, info });
  const audio = createWechatAudio(wxApi);
  let hiddenAt = null;
  let hiddenDurationMs = 0;
  const clock = { now: () => Date.now() - hiddenDurationMs - (hiddenAt === null ? 0 : Date.now() - hiddenAt) };
  const requestFrame = typeof canvas.requestAnimationFrame === 'function'
    ? (callback) => canvas.requestAnimationFrame(() => callback(clock.now()))
    : (callback) => setTimeout(() => callback(clock.now()), 16);
  const storage = {
    getItem: (key) => wxApi.getStorageSync(key) || null,
    setItem: (key, value) => wxApi.setStorageSync(key, value),
    removeItem: (key) => wxApi.removeStorageSync(key)
  };
  const query = wxApi.getLaunchOptionsSync?.().query || {};
  const app = createGameSession({
    performance: clock,
    requestAnimationFrame: requestFrame,
    setTimeout,
    hostBridge: { emit: () => ({ accepted: true, reason: 'emitted' }) },
    storage,
    audio,
    renderer: view.renderer,
    viewportSize: () => ({ width: view.width, height: view.height }),
    seedProvider: () => query.seed || null,
    debugProvider: () => false,
    hazardsDisabledProvider: () => false
  });
  app.init();

  wxApi.onTouchStart?.((event) => {
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    if (!touch) return;
    const x = touch.clientX ?? touch.pageX ?? touch.x;
    const y = touch.clientY ?? touch.pageY ?? touch.y;
    const action = view.hitTest(x, y);
    if (!action) return;
    if (action.type === 'start') app.start();
    else if (action.type === 'reset') app.reset();
    else if (action.type === 'press') app.press(action.buttonId);
    else if (action.type === 'upgrade') app.selectUpgrade(action.upgradeId);
    view.draw();
  });
  wxApi.onHide?.(() => {
    if (hiddenAt === null) hiddenAt = Date.now();
  });
  wxApi.onShow?.(() => {
    if (hiddenAt !== null) {
      hiddenDurationMs += Date.now() - hiddenAt;
      hiddenAt = null;
    }
    view.draw();
  });

  return { app, view, audio };
}

if (typeof wx !== 'undefined') {
  createWechatGame(wx);
}
