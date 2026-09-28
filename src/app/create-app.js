import { createBrowserHostBridge } from '../host/browser-host-bridge.js';
import { getStorageAdapter } from '../host/browser-storage.js';
import { createAudioFeedback } from '../ui/audio.js';
import { createRenderer } from '../ui/render.js';
import { createGameSession } from './game-session.js';

export function createApp({
  window: browserWindow,
  document,
  performance,
  requestAnimationFrame,
  setTimeout,
  clearTimeout,
  random = Math.random,
  hostBridge = null
}) {
  const storage = getStorageAdapter(browserWindow);
  const audio = createAudioFeedback(browserWindow.AudioContext || browserWindow.webkitAudioContext, { setTimeout });
  const renderer = createRenderer({
    document,
    timers: { setTimeout, clearTimeout },
    random,
    audio
  });
  return createGameSession({
    performance,
    requestAnimationFrame,
    setTimeout,
    random,
    hostBridge: hostBridge || createBrowserHostBridge(),
    storage,
    audio,
    renderer,
    viewportSize: () => ({ width: browserWindow.innerWidth, height: browserWindow.innerHeight }),
    seedProvider: () => {
      const seed = new URLSearchParams(browserWindow.location.search).get('seed');
      return seed && seed.trim() ? seed.trim() : null;
    },
    debugProvider: () => {
      const value = new URLSearchParams(browserWindow.location.search).get('debug');
      return value === '1' || value === 'true';
    },
    hazardsDisabledProvider: () => {
      const value = new URLSearchParams(browserWindow.location.search).get('hazards');
      return value === '0' || value === 'false' || value === 'off';
    },
    exposeHostApi: (hostInputApi, debugApi) => {
      browserWindow.__THAT_BUTTON_DEBUG__ = debugApi;
      browserWindow.__THAT_BUTTON_HOST__ = hostInputApi;
      browserWindow.startGame = hostInputApi.start;
      browserWindow.resetGame = hostInputApi.reset;
    }
  });
}
