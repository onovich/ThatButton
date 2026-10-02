import assert from 'node:assert/strict';
import { createWechatGame } from '../src/game.js';
import { createCanvasRenderer } from '../src/renderer.js';
import { createPerformanceDiagnostics } from '../src/performance-diagnostics.js';
import { generateLevelData } from '../../../src/core/level.js';
import { createSeededRng } from '../../../src/core/rng.js';

// Exercise the actual scheduler and renderer with a controlled host clock.
const originalNow = Date.now;
const originalTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const originalRaf = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame');
let time = 100000, timers = [], globalFrames = [];
Date.now = () => time;
globalThis.setTimeout = (callback, delay) => { const token = { callback, delay }; timers.push(token); return token; };
globalThis.clearTimeout = (token) => { timers = timers.filter((item) => item !== token); };

function context(animated = false, commands = []) {
  const target = { globalAlpha: 1,
    measureText: (value) => ({ width: [...String(value)].length * 17 }),
    createLinearGradient: () => ({ addColorStop() {} }) };
  return new Proxy(target, { get(object, key) {
    if (key in object) return object[key];
    if (!animated && ['save', 'restore', 'translate', 'rotate'].includes(key)) return undefined;
    return (...args) => commands.push([key, ...args]);
  } });
}
function host(withCanvasRaf) {
  const frames = [], callbacks = {}, ctx = context();
  const canvas = { getContext: () => ctx };
  if (withCanvasRaf) canvas.requestAnimationFrame = function (callback) {
    assert.equal(this, canvas); frames.push(callback);
  };
  const wxApi = { createCanvas: () => canvas,
    getWindowInfo: () => ({ windowWidth: 390, windowHeight: 844, pixelRatio: 2 }),
    getLaunchOptionsSync: () => ({ query: { perf: '1', seed: 'diagnostic-quality' } }),
    getStorageSync() {}, setStorageSync() {},
    createInnerAudioContext: () => ({ stop() {}, play() {}, destroy() {} }),
    onTouchStart() {},
    onHide: (fn) => { callbacks.hide = fn; }, onShow: (fn) => { callbacks.show = fn; } };
  return { frames, callbacks, run: createWechatGame(wxApi) };
}
function installGlobalRaf(enabled) {
  globalFrames = [];
  if (enabled) globalThis.requestAnimationFrame = function (callback) {
    globalFrames.push(callback);
  };
  else delete globalThis.requestAnimationFrame;
}
const failures = [];
function check(name, body) {
  time = 100000; timers = [];
  try { body(); } catch (error) { failures.push(`${name}: ${error.message}`); }
}
try {
  for (const [canvasRaf, globalRaf] of [[true, false], [false, true], [true, true]]) {
    check(`RAF canvas=${canvasRaf} global=${globalRaf}`, () => {
      installGlobalRaf(globalRaf);
      const { run, frames, callbacks } = host(canvasRaf);
      assert.equal(run.diagnostics.metadata.frameSource, canvasRaf ? 'canvas.requestAnimationFrame' : 'global.requestAnimationFrame');
      run.app.start();
      const queue = canvasRaf ? frames : globalFrames;
      for (const interval of [16, 16, 51]) {
        time += interval;
        if (queue.length) queue.shift()();
        else {
          const index = timers.findIndex((item) => item.delay === 16);
          assert.ok(index >= 0, 'The actual scheduler must produce a callback.');
          timers.splice(index, 1)[0].callback();
        }
      }
      const sampled = run.diagnostics.snapshot().scenes.game;
      assert.equal(sampled.rafInterval.count, 2, 'The available real RAF must yield intervals, not zero samples.');
      assert.equal(sampled.rafCallbacks, 3);
      assert.equal(sampled.rafOver50ms, 1);
      assert.equal(sampled.timerCallbacks, 0);
      if (canvasRaf) assert.equal(globalFrames.length, 0, 'Preserve the existing canvas RAF when available.');
      callbacks.hide(); time += 60000; queue.shift()();
      assert.equal(run.diagnostics.snapshot().scenes.game.rafCallbacks, 3, 'Hidden callbacks are excluded.');
      callbacks.show();
      assert.equal(queue.length, 0, 'Waiting for player resume must not schedule a game frame.');
      run.diagnostics.dispose();
      run.performanceControls.setEnabled(false); run.performanceControls.setEnabled(true);
      assert.equal(run.diagnostics.metadata.frameSource, canvasRaf ? 'canvas.requestAnimationFrame' : 'global.requestAnimationFrame',
        'Manually enabled diagnostics must retain the actual scheduler source.');
      run.diagnostics.dispose();
    });
  }
  check('Timer fallback remains separate from RAF', () => {
    installGlobalRaf(false);
    const { run } = host(false); run.app.start();
    assert.equal(run.diagnostics.metadata.frameSource, 'setTimeout');
    for (let i = 0; i < 3; i++) {
      const index = timers.findIndex((item) => item.delay === 16);
      assert.ok(index >= 0); time += 16; timers.splice(index, 1)[0].callback();
    }
    const sampled = run.diagnostics.snapshot().scenes.game;
    assert.equal(sampled.timerCallbacks, 3);
    assert.equal(sampled.rafCallbacks, 0);
    assert.equal(sampled.rafInterval.count, 0);
    run.diagnostics.dispose();
  });
  check('Completed entry must stop masking game/hazards', () => {
    const commands = [], ctx = context(true, commands);
    const diagnostics = createPerformanceDiagnostics({}, { enabled: true, now: () => time });
    const view = createCanvasRenderer({ canvas: { getContext: () => ctx }, diagnostics,
      info: { windowWidth: 390, windowHeight: 844, pixelRatio: 2 } });
    const board = generateLevelData({ level: 1, rng: createSeededRng('entry-quality') });
    const options = { ...board, level: 1, score: 0 };
    view.renderer.renderBoard(options); // First board establishes the character animation.
    const delay = view.renderer.renderBoard(options); // Subsequent round has staggered tile entry.
    assert.equal(view.getDiagnosticScene(), 'game-entry');
    time += delay - 31;
    assert.equal(view.getDiagnosticScene(), 'game-entry', 'Entry is still active just before its end.');
    time++;
    assert.equal(view.getDiagnosticScene(), 'game', 'Expired roundEnter must not classify the rest of the round as entry.');
    commands.length = 0; view.draw(); const before = [...commands];
    view.getDiagnosticScene(); view.getDiagnosticScene();
    commands.length = 0; view.draw();
    assert.deepEqual(commands, before, 'Diagnostic classification must not mutate rendering.');
    assert.equal(diagnostics.snapshot().scenes['game-entry'].draws, 1,
      'Only the active entry paint belongs in the entry bucket.');
    assert.equal(diagnostics.snapshot().scenes.game.draws, 3,
      'Post-entry paints must be counted with the initial normal game paint.');
    for (const [type, scene] of [['button_glitch', 'game-glitch'], ['button_swap', 'game-swap'], ['moving_button', 'game-drift']]) {
      view.renderer.updateHazardPresentation({ hazards: [{ type, phase: 'active' }] });
      assert.equal(view.getDiagnosticScene(), scene, 'Finished entry must expose active hazards.');
    }
    view.setMotionPaused(true);
    diagnostics.dispose();
  });
} finally {
  Date.now = originalNow; globalThis.setTimeout = originalTimeout;
  globalThis.clearTimeout = originalClearTimeout;
  if (originalRaf) Object.defineProperty(globalThis, 'requestAnimationFrame', originalRaf);
  else delete globalThis.requestAnimationFrame;
}
assert.deepEqual(failures, []);
console.log('Actual RAF sources, timer distinction, foreground pause and expired entry classification passed.');
