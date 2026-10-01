import assert from 'node:assert/strict';
import './hazards.mjs';
import './performance-diagnostics.mjs';
import './text-atlas.mjs';
import './ab-comparison.mjs';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWechatGame } from '../src/game.js';
import { drawPreCombo } from '../src/pre-combo.js';
import { SFX_CUES } from '../../../src/audio/cues.js';
import { getDifficultyForLevel } from '../../../src/config/difficulty.js';
import { generateLevelData } from '../../../src/core/level.js';
import { createSeededRng } from '../../../src/core/rng.js';
import {createWechatHazards} from '../src/hazards.js';

const readySticker = { width: 384, height: 144 };
const hitSticker = { width: 320, height: 168 };
const preComboDraws = [];
const preComboCtx = { drawImage(image) { preComboDraws.push(image); } };
drawPreCombo(preComboCtx, { left: 0, top: 0, width: 140, height: 43,
  stage: 0, readyImage: readySticker, hitImage: hitSticker });
drawPreCombo(preComboCtx, { left: 0, top: 0, width: 140, height: 43,
  stage: 1, readyImage: readySticker, hitImage: hitSticker });
assert.deepEqual(preComboDraws, [readySticker, hitSticker],
  'READY and 1 HIT must use their approved sticker images.');

function createFakeWx({ width = 390, height = 844, failImages = false,
  touchMode = 'both', canvasEvents = false, animateCanvas = false, query = {} } = {}) {
  const frames = [];
  const drawnText = [];
  const stats = { paints: 0, measures: 0 };
  const transforms = [];
  const alphaStack = [];
  const storage = new Map();
  let touchHandler = null;
  let touchEndHandler = null;
  const canvasHandlers = new Map();
  let hideHandler = null;
  let showHandler = null;
  const ctx = {
    globalAlpha: 1,
    setTransform() {}, scale() {}, fillRect(x,y,w,h) { if (x === 0 && y === 0 && w === width && h === height) stats.paints++; }, strokeRect() {},
    fillText(value) { drawnText.push(String(value)); }, strokeText() {},
    beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() {},
    arc() {}, fill() {}, stroke() {}, drawImage() {},
    createLinearGradient() { return { addColorStop() {} }; },
    measureText(value) { stats.measures++; return { width: [...String(value)].length * 17 }; }
  };
  if (animateCanvas) {
    ctx.save = () => { alphaStack.push(ctx.globalAlpha); };
    ctx.restore = () => { ctx.globalAlpha = alphaStack.pop() ?? 1; };
    ctx.translate = (x, y) => { transforms.push([x, y]); };
    ctx.scale = (x, y) => { transforms.push([x, y]); };
    ctx.rotate = (angle) => { transforms.push([angle]); };
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext() { return ctx; },
    ...(canvasEvents ? { addEventListener(name, callback) { canvasHandlers.set(name, callback); } } : {}),
    requestAnimationFrame(callback) { frames.push(callback); }
  };
  const wxApi = {
    createCanvas() { return canvas; },
    getWindowInfo() {
      return { windowWidth: width, windowHeight: height, pixelRatio: 2,
        safeArea: { top: height < 700 ? 24 : 47, bottom: height - 34 } };
    },
    getStorageSync(key) { return storage.get(key); },
    setStorageSync(key, value) { storage.set(key, value); },
    removeStorageSync(key) { storage.delete(key); },
    getLaunchOptionsSync() { return { query: { seed: 'wechat-integration', ...query } }; },
    createInnerAudioContext() { return { stop() {}, play() {}, destroy() {} }; },
    ...(failImages ? { createImage() {
      const image = {};
      Object.defineProperty(image, 'src', { set() { queueMicrotask(() => image.onerror?.()); } });
      return image;
    } } : {}),
    vibrateShort() {},
    ...(touchMode !== 'end' ? { onTouchStart(callback) { touchHandler = callback; } } : {}),
    onTouchEnd(callback) { touchEndHandler = callback; },
    onHide(callback) { hideHandler = callback; },
    onShow(callback) { showHandler = callback; }
  };
  return {
    wxApi,
    stats,
    frames,
    drawnText,
    transforms,
    storage,
    canvas,
    touch(x, y) {
      const point = { clientX: x, clientY: y };
      touchHandler?.({ touches: [point], changedTouches: [point] });
      touchEndHandler?.({ touches: [], changedTouches: [point] });
    },
    canvasMouse(x, y) {
      canvasHandlers.get('mousedown')?.({ clientX: x, clientY: y, offsetX: x, offsetY: y });
    },
    hide() { hideHandler(); },
    show() { showHandler(); }
  };
}

function pointFor(view, predicate) {
  for (let y = 30; y < view.height; y += 5) {
    for (let x = 10; x < view.width; x += 5) {
      const action = view.hitTest(x, y);
      if (action && predicate(action)) return { x, y };
    }
  }
  throw new Error('Expected touch action was not found.');
}

// The player-facing diagnostic switch is session-only and separate from game settings.
const diagnosticFake = createFakeWx();
let perfReads = 0, menu, modal, copiedReport;
diagnosticFake.wxApi.getPerformance = () => { perfReads++; return { now: () => Date.now() }; };
diagnosticFake.wxApi.showActionSheet = (options) => { menu = options; };
diagnosticFake.wxApi.showModal = (options) => { modal = options; };
diagnosticFake.wxApi.setClipboardData = ({ data }) => { copiedReport = data; };
const diagnosticRun = createWechatGame(diagnosticFake.wxApi);
assert.equal(diagnosticRun.diagnostics, null);
assert.equal(perfReads, 0, 'Default-off startup must not initialize the diagnostic clock.');
assert.equal(diagnosticFake.storage.has('thatbutton.wechat.performance.v1'), false);
diagnosticRun.view.showSettings();
let diagPoint = pointFor(diagnosticRun.view, (action) => action.type === 'diagnosticsMenu');
diagnosticFake.touch(diagPoint.x, diagPoint.y);
assert.match(menu.itemList[0], /开启/);
menu.success({ tapIndex: 0 });
modal.success({ confirm: false });
assert.equal(diagnosticRun.diagnostics, null, 'Cancelled opt-in must not enable sampling.');
menu.success({ tapIndex: 0 });
modal.success({ confirm: true });
assert.equal(diagnosticRun.performanceControls.isEnabled(), true);
assert.equal(perfReads, 1);
diagnosticRun.view.draw();
assert.ok(diagnosticRun.diagnostics.snapshot().scenes.settings.draws > 0);
const collected = diagnosticRun.diagnostics;
diagnosticRun.performanceControls.setEnabled(false);
const stopped = collected.snapshot().scenes.settings.draws;
assert.equal(diagnosticRun.diagnostics, null);
diagnosticRun.view.draw();
assert.equal(collected.snapshot().scenes.settings.draws, stopped, 'Off detaches renderer sampling.');
assert.equal(diagnosticRun.performanceControls.exportReport(), copiedReport);
assert.equal(JSON.parse(copiedReport).schemaVersion, 1);
const recreated = createWechatGame(diagnosticFake.wxApi);
assert.equal(recreated.diagnostics, null, 'Saved report must never persist the enabled flag.');
assert.equal(perfReads, 1);
diagnosticFake.storage.set('thatbutton.bestRun.v1', 'keep-best');
diagnosticRun.performanceControls.clear();
assert.equal(diagnosticFake.storage.has('thatbutton.wechat.performance.v1'), false);
assert.equal(diagnosticFake.storage.get('thatbutton.bestRun.v1'), 'keep-best');
for (const [width, height] of [[320,568], [390,844]]) {
  const smallFake = createFakeWx({ width, height });
  const smallRun = createWechatGame(smallFake.wxApi);
  smallRun.view.showSettings();
  assert.ok(pointFor(smallRun.view, (action) => action.type === 'diagnosticsMenu'));
  assert.ok(pointFor(smallRun.view, (action) => action.type === 'home'));
}

// Same-build A/B can be selected from the native settings menu, without launch parameters.
const comparisonFake = createFakeWx({ query: { seed: '' } });
let comparisonMenu, comparisonModal, comparisonCopy, atlasLoads = 0;
comparisonFake.wxApi.showActionSheet = (options) => { comparisonMenu = options; };
comparisonFake.wxApi.showModal = (options) => { comparisonModal = options; };
comparisonFake.wxApi.setClipboardData = ({ data }) => { comparisonCopy = data; };
const comparisonRun = createWechatGame(comparisonFake.wxApi);
assert.equal(comparisonRun.performanceControls.getComparison(), null);
assert.equal(comparisonRun.diagnostics, null);
comparisonFake.wxApi.createImage = () => {
  const image = { width: 864, height: 588 };
  Object.defineProperty(image, 'src', { set() { atlasLoads++; queueMicrotask(() => image.onload?.()); } });
  return image;
};
comparisonRun.view.showSettings();
const comparisonPoint = pointFor(comparisonRun.view, (action) => action.type === 'diagnosticsMenu');
comparisonFake.touch(comparisonPoint.x, comparisonPoint.y);
comparisonMenu.success({ tapIndex: 3 });
assert.match(comparisonMenu.itemList[0], /A组/);
comparisonMenu.success({ tapIndex: 1 });
comparisonModal.success({ confirm: false });
assert.equal(comparisonRun.diagnostics, null, 'Cancelled comparison must keep normal play untouched.');
let firstSeed, firstButtons, firstRule, firstSampler;
for (const [index, group] of ['A', 'B', 'B', 'A'].entries()) {
  assert.equal(await comparisonRun.performanceControls.beginComparison(group), true,
    `Preparing ${group}/${index}: ${comparisonRun.view.getView().mode}, playing=${comparisonRun.app.getState().isPlaying}, status=${JSON.stringify(comparisonRun.view.getTextAtlasStatus())}`);
  const status = comparisonRun.view.getTextAtlasStatus();
  assert.equal(status.loaded, true, 'Both groups must retain the same preloaded asset.');
  assert.equal(status.rules, group === 'B');
  assert.equal(status.numbers, group === 'B');
  assert.equal(comparisonRun.diagnostics.metadata.comparison.group, group);
  assert.equal(comparisonRun.diagnostics.metadata.comparison.order, index + 1);
  if (firstSampler) {
    const stopped = firstSampler.snapshot().scenes.game?.draws || 0;
    comparisonRun.view.draw();
    assert.equal(firstSampler.snapshot().scenes.game?.draws || 0, stopped);
  }
  comparisonRun.app.start();
  const state = comparisonRun.app.getState();
  if (!index) { firstSeed = state.seed; firstButtons = JSON.stringify(state.buttons); firstRule = state.currentRuleText; }
  assert.equal(state.seed, firstSeed);
  assert.equal(JSON.stringify(state.buttons), firstButtons);
  assert.equal(state.currentRuleText, firstRule);
  assert.equal(await comparisonRun.performanceControls.beginComparison(group === 'A' ? 'B' : 'A'), false,
    'Group changes must be blocked while a game is running.');
  firstSampler = comparisonRun.diagnostics;
  comparisonRun.view.draw();
  const sampled = firstSampler.snapshot().scenes.game;
  if (group === 'B') assert.ok(sampled.ruleAtlasHit > 0 && sampled.numberAtlasHit > 0);
  else assert.equal(sampled.ruleAtlasHit + sampled.numberAtlasHit, 0);
  comparisonRun.app.gameLoop(state.lastTime + state.timeLeft + 5);
  assert.equal(await comparisonRun.performanceControls.beginComparison('B'), false,
    'Post-failure animation must finish before switching groups.');
  await new Promise((done) => setTimeout(done, 820));
}
assert.equal(atlasLoads, 1, 'Four group selections must reuse one decoded atlas.');
assert.equal(comparisonRun.performanceControls.finishComparison(), true);
assert.equal(comparisonRun.diagnostics, null);
assert.equal(comparisonRun.view.getTextAtlasStatus().decodedBytes, 0);
assert.equal(comparisonRun.view.getTextAtlasStatus().rules, false);
const comparisonBundle = JSON.parse(comparisonRun.performanceControls.exportComparison());
assert.equal(comparisonBundle.reports.length, 4);
assert.deepEqual(comparisonBundle.reports.map((r) => r.metadata.comparison.group), ['A', 'B', 'B', 'A']);
assert.equal(comparisonBundle.hasBothGroups, true);
assert.equal(JSON.parse(comparisonCopy).type, 'thatbutton.prebuilt-text-ab');
assert.equal(comparisonFake.storage.has('thatbutton.wechat.settings.v1'), false);
const freshComparisonRun = createWechatGame(createFakeWx().wxApi);
assert.equal(freshComparisonRun.diagnostics, null);
assert.equal(freshComparisonRun.performanceControls.getComparison(), null);

const failedComparison = createWechatGame(createFakeWx({ failImages: true }).wxApi);
await new Promise((done) => setTimeout(done, 1));
failedComparison.view.showHome();
assert.equal(await failedComparison.performanceControls.beginComparison('B'), false);
assert.equal(failedComparison.diagnostics, null, 'A missing image must not be labelled a started B test.');
const pendingFake = createFakeWx();
const pendingRun = createWechatGame(pendingFake.wxApi);
let completeAtlas;
pendingFake.wxApi.createImage = () => {
  const image = { width: 864, height: 588 };
  Object.defineProperty(image, 'src', { set() { completeAtlas = () => image.onload?.(); } });
  return image;
};
const pendingSelection = pendingRun.performanceControls.beginComparison('B');
pendingRun.app.start(); // A user starts playing before the optional load has finished.
completeAtlas();
assert.equal(await pendingSelection, false);
assert.equal(pendingRun.view.getTextAtlasStatus().rules, false, 'A late asset must never switch a live game.');
assert.equal(pendingRun.performanceControls.getComparison(), null);

// An optional atlas failure must not block the already usable game artwork.
const optionalAssetFake = createFakeWx({ query: { ruleAtlas: '1', numberAtlas: '1' } });
const loadedPaths = [];
optionalAssetFake.wxApi.createImage = () => {
  const image = { width: 100, height: 100 };
  Object.defineProperty(image, 'src', { set(path) {
    loadedPaths.push(path);
    queueMicrotask(() => path === 'art/text-atlas-v1.png' ? image.onerror?.() : image.onload?.());
  } });
  return image;
};
const optionalAssetRun = createWechatGame(optionalAssetFake.wxApi);
await new Promise((done) => setTimeout(done, 1));
assert.ok(loadedPaths.includes('art/text-atlas-v1.png'));
assert.equal(optionalAssetRun.view.getView().mode, 'home');
assert.equal(optionalAssetRun.view.getTextAtlasStatus().loaded, false);
assert.deepEqual(optionalAssetRun.view.getView().failedAssets, []);

// Same seed and touch/RAF/pause timeline must produce identical business state.
const savedDate = Date;
let replayTime = 100000;
globalThis.Date = class extends savedDate {
  constructor(...args) { super(...(args.length ? args : [replayTime])); }
  static now() { return replayTime; }
};
try {
  const replays = [{}, { ruleAtlas: '1', numberAtlas: '1' }].map((query) => {
    const host = createFakeWx({ query });
    const run = createWechatGame(host.wxApi);
    run.view.setImages({ textAtlas: { width: 864, height: 588 } });
    return { host, ...run };
  });
  const compareState = (step) => {
    const differences = [];
    function compare(left, right, path) {
      if (left && right && typeof left === 'object' && typeof right === 'object') {
        for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) compare(left[key], right[key], `${path}.${key}`);
      } else if (typeof left !== 'function' && left !== right) differences.push({ path, left, right });
    }
    compare(replays[0].app.getState(), replays[1].app.getState(), 'state');
    assert.deepEqual(differences, [], `Atlas A/B state mismatch: ${step}`);
  };
  for (const run of replays) {
    const point = pointFor(run.view, (action) => action.type === 'start');
    run.host.touch(point.x, point.y);
  }
  compareState('start');
  for (const interval of [16, 100, 16]) {
    replayTime += interval;
    for (const run of replays) run.host.frames.shift()();
    compareState(`RAF ${interval}`);
  }
  for (const kind of ['safe', 'safe', 'fatal']) {
    replayTime += 200;
    for (const run of replays) {
      const state = run.app.getState();
      const button = state.buttons.find((b) => !b.isClicked &&
        state.forbiddenIds.includes(b.id) === (kind === 'fatal'));
      const point = pointFor(run.view, (action) => action.type === 'press' && action.buttonId === button.id);
      run.host.touch(point.x, point.y);
    }
    compareState(`${kind} touch`);
  }
  for (const run of replays) { run.host.hide(); run.host.frames.shift()(); }
  replayTime += 12000;
  for (const run of replays) run.host.show();
  compareState('waiting for resume');
  replayTime += 200;
  for (const run of replays) {
    const point = pointFor(run.view, (action) => action.type === 'resume');
    run.host.touch(point.x, point.y); run.host.frames.shift()();
  }
  compareState('resume');
  for (const run of replays) run.app.reset();
  compareState('reset');
  for (const run of replays) {
    const state = run.app.getState();
    run.app.gameLoop(state.lastTime + state.timeLeft + 5);
  }
  compareState('timeout and save');
  assert.equal(replays[0].host.storage.get('thatbutton.bestRun.v1'), replays[1].host.storage.get('thatbutton.bestRun.v1'));
} finally { globalThis.Date = savedDate; }

const fake = createFakeWx();
const { app, view } = createWechatGame(fake.wxApi);
assert.equal(view.getView().mode, 'home');
assert.equal(fake.canvas.width, 780);
assert.equal(fake.canvas.height, 1688);

const helpPoint = pointFor(view, (action) => action.type === 'help');
fake.touch(helpPoint.x, helpPoint.y);
assert.equal(view.getView().mode, 'help');
let homePoint = pointFor(view, (action) => action.type === 'home');
fake.touch(homePoint.x, homePoint.y);
assert.equal(view.getView().mode, 'home');
const settingsPoint = pointFor(view, (action) => action.type === 'settings');
fake.touch(settingsPoint.x, settingsPoint.y);
assert.equal(view.getView().mode, 'settings');
const soundPoint = pointFor(view, (action) => action.type === 'toggle' && action.key === 'sound');
fake.touch(soundPoint.x, soundPoint.y);
assert.equal(fake.storage.get('thatbutton.wechat.settings.v1').sound, false);
const musicPoint = pointFor(view, (action) => action.type === 'toggle' && action.key === 'music');
fake.touch(musicPoint.x, musicPoint.y);
assert.equal(fake.storage.get('thatbutton.wechat.settings.v1').music, false);
await new Promise((resolveWait) => setTimeout(resolveWait, 85));
fake.touch(musicPoint.x, musicPoint.y);
assert.equal(fake.storage.get('thatbutton.wechat.settings.v1').music, true);
const musicLouder = pointFor(view, (action) => action.type === 'musicVolume' && action.delta === 1);
fake.touch(musicLouder.x, musicLouder.y);
assert.equal(fake.storage.get('thatbutton.wechat.settings.v1').musicVolume, 3);
assert.equal(fake.drawnText.includes('75%'), true);
const vibrationPoint = pointFor(view, (action) => action.type === 'toggle' && action.key === 'vibration');
fake.touch(vibrationPoint.x, vibrationPoint.y);
assert.equal(fake.storage.get('thatbutton.wechat.settings.v1').vibration, false);
homePoint = pointFor(view, (action) => action.type === 'home');
fake.touch(homePoint.x, homePoint.y);
assert.equal(view.getView().mode, 'home');

const startPoint = pointFor(view, (action) => action.type === 'start');
fake.touch(startPoint.x, startPoint.y);
assert.equal(app.getSnapshot().status, 'playing');
assert.equal(fake.frames.length, 1);
const firstRound = app.getState();
assert.equal(firstRound.seed, 'wechat-integration');
assert.equal(firstRound.buttons.length, 4);
assert.ok(fake.drawnText.includes('READY'), 'Zero streak should show the designed idle mark.');

const endOnly = createFakeWx({ touchMode: 'end' });
const endOnlyRun = createWechatGame(endOnly.wxApi);
const endOnlyStart = pointFor(endOnlyRun.view, (action) => action.type === 'start');
endOnly.touch(endOnlyStart.x, endOnlyStart.y);
assert.equal(endOnlyRun.app.getSnapshot().status, 'playing');

const canvasOnly = createFakeWx({ touchMode: 'end', canvasEvents: true });
const canvasOnlyRun = createWechatGame(canvasOnly.wxApi);
const canvasStart = pointFor(canvasOnlyRun.view, (action) => action.type === 'start');
canvasOnly.canvasMouse(canvasStart.x, canvasStart.y);
assert.equal(canvasOnlyRun.app.getSnapshot().status, 'playing');

const safeId = firstRound.buttons.find((button) => !firstRound.forbiddenIds.includes(button.id)).id;
const safePoint = pointFor(view, (action) => action.type === 'press' && action.buttonId === safeId);
fake.touch(safePoint.x, safePoint.y);
assert.equal(app.getState().score, 10);
assert.equal(app.getState().buttons.find((button) => button.id === safeId).isClicked, true);
assert.ok(fake.drawnText.includes('1 HIT!'), 'One safe press should show the primed mark.');
const secondSafeId = firstRound.buttons.find((button) =>
  button.id !== safeId && !firstRound.forbiddenIds.includes(button.id)).id;
app.press(secondSafeId);
assert.ok(fake.drawnText.includes('2 COMBO!'), 'Two safe presses should switch to the combo wordmark.');

const forbiddenId = app.getState().forbiddenIds[0];
const hpBefore = app.getState().player.hp;
const forbiddenPoint = pointFor(view, (action) => action.type === 'press' && action.buttonId === forbiddenId);
fake.touch(forbiddenPoint.x, forbiddenPoint.y);
assert.ok(app.getState().player.hp < hpBefore);

const paintsBeforeFrame = fake.stats.paints;
fake.frames.shift()();
assert.equal(fake.stats.paints - paintsBeforeFrame, 1, 'One logic frame must paint exactly once.');
view.draw();
const measuresBefore = fake.stats.measures;
view.draw();
assert.equal(fake.stats.measures, measuresBefore, 'Unchanged text/layout should reuse measurements.');
fake.hide();
const hiddenPaints = fake.stats.paints;
fake.frames.shift()();
assert.equal(fake.stats.paints, hiddenPaints, 'Hidden queued RAF must not paint.');
const timeBeforePause = app.getState().timeLeft;
await new Promise((resolveWait) => setTimeout(resolveWait, 25));
assert.equal(fake.frames.length, 0, "Paused game must not keep scheduling RAF callbacks.");
assert.ok(Math.abs(app.getState().timeLeft - timeBeforePause) < 5);
fake.show();
assert.equal(view.getView().mode, 'resume');
const timeWhileWaiting = app.getState().timeLeft;
await new Promise((resolveWait) => setTimeout(resolveWait, 25));
assert.equal(fake.frames.length, 0, "Paused game must not keep scheduling RAF callbacks.");
assert.ok(Math.abs(app.getState().timeLeft - timeWhileWaiting) < 5,
  'Returning to the foreground must stay paused until the player continues.');
const resumePoint = pointFor(view, (action) => action.type === 'resume');
fake.touch(resumePoint.x, resumePoint.y);
assert.equal(view.getView().mode, 'game');

app.reset();
assert.equal(fake.frames.length, 1, 'Reset must not create a second frame loop.');
assert.equal(app.getState().score, 0);
const nextSafeId = app.getState().buttons.find((button) =>
  !app.getState().forbiddenIds.includes(button.id)).id;
app.press(nextSafeId);
const state = app.getState();
app.gameLoop(state.lastTime + state.timeLeft + 5);
assert.equal(app.getSnapshot().status, 'finished');
assert.equal(JSON.parse(fake.storage.get('thatbutton.bestRun.v1')).bestScore, 10);
await new Promise((resolveWait) => setTimeout(resolveWait, 820));
assert.equal(view.getView().mode, 'gameover');
const resetPoint = pointFor(view, (action) => action.type === 'reset');
fake.touch(resetPoint.x, resetPoint.y);
assert.equal(app.getSnapshot().status, 'playing');
assert.equal(app.getState().bestRecord.bestScore, 10);

const homeFromResult = createFakeWx();
const homeRun = createWechatGame(homeFromResult.wxApi);
homeRun.app.start();
const homeRunState = homeRun.app.getState();
homeRun.app.gameLoop(homeRunState.lastTime + homeRunState.timeLeft + 5);
await new Promise((resolveWait) => setTimeout(resolveWait, 820));
const resultHomePoint = pointFor(homeRun.view, (action) => action.type === 'home');
homeFromResult.touch(resultHomePoint.x, resultHomePoint.y);
assert.equal(homeRun.view.getView().mode, 'home');
assert.equal(homeRun.app.getState().isPlaying, false);
const freshStartPoint = pointFor(homeRun.view, (action) => action.type === 'start');
homeFromResult.touch(freshStartPoint.x, freshStartPoint.y);
assert.equal(homeRun.app.getState().level, 1);
assert.equal(homeRun.app.getSnapshot().status, 'playing');

const brokenArt = createFakeWx({ failImages: true });
const artRun = createWechatGame(brokenArt.wxApi);
await new Promise((resolveWait) => setTimeout(resolveWait, 0));
assert.equal(artRun.view.getView().mode, 'resource-error');
const fallbackPoint = pointFor(artRun.view, (action) => action.type === 'continueFallback');
brokenArt.touch(fallbackPoint.x, fallbackPoint.y);
assert.equal(artRun.view.getView().mode, 'home');

const capsuleFake = createFakeWx({ width: 320, height: 568 });
capsuleFake.wxApi.getMenuButtonBoundingClientRect = () => ({ bottom: 48 });
const capsuleRun = createWechatGame(capsuleFake.wxApi);
assert.ok(capsuleRun.view.safeTop >= 53);
const capsuleHelp = pointFor(capsuleRun.view, (action) => action.type === 'help');
assert.ok(capsuleHelp.y >= capsuleRun.view.safeTop);
const capsuleBoard = generateLevelData({ level: 6, difficulty: getDifficultyForLevel(6),
  rng: createSeededRng('wechat-capsule-layout') });
capsuleRun.view.renderer.renderBoard({ ...capsuleBoard, level: 6, score: 90 });
for (const button of capsuleBoard.buttons) {
  const point = pointFor(capsuleRun.view, (action) =>
    action.type === 'press' && action.buttonId === button.id);
  assert.ok(point.y < 520, 'Safe-area layout must keep every tile above the status panel.');
}
assert.equal(capsuleFake.drawnText.some((value) => value.includes('【') || value.includes('】')), false,
  'Visible rule text must omit source emphasis brackets.');

view.renderer.showUpgradeScreen({ choices: [{ id: 'test-upgrade', label: 'TEST', shortLabel: '+TEST', value: 1 }] });
assert.equal(pointFor(view, (action) => action.type === 'upgrade').x > 0, true);

const shortFake = createFakeWx({ width: 360, height: 640 });
const shortGame = createWechatGame(shortFake.wxApi);
const difficulty = getDifficultyForLevel(6);
const layoutBoard = generateLevelData({ level: 6, difficulty, rng: createSeededRng('wechat-layout') });
shortGame.view.renderer.renderBoard({ ...layoutBoard, level: 6, score: 70 });
assert.equal(layoutBoard.buttons.length, 9);
for (const button of layoutBoard.buttons) {
  const point = pointFor(shortGame.view, (action) =>
    action.type === 'press' && action.buttonId === button.id);
  assert.ok(point.y < shortGame.view.height - 60, 'Board touch target must stay above the footer.');
}

const upgradeFake = createFakeWx();
// New mechanic rounds start normally; only the swap window compensates time.
const hazardFake=createFakeWx(),hazardGame=createWechatGame(hazardFake.wxApi);
const realDateNow=Date.now;let hazardNow=100000;Date.now=()=>hazardNow;
hazardGame.app.start();
const hs=hazardGame.app.getState();
Object.assign(hs,{level:28,roundStartedAtMs:100000,lastTime:100000,timeLeft:10000});
Object.assign(hs.combo,{streak:2,expiresAtMs:102400,lastEventAtMs:100000});
hazardNow=101000;hazardFake.frames.shift()();
assert.equal(hs.timeLeft,9000);assert.equal(hs.combo.expiresAtMs,102400);
assert.equal(hazardGame.view.renderer.canPressButton(hs.buttons[0].id),true);
hazardNow=101600;hazardFake.frames.shift()();
assert.equal(hs.timeLeft,8400);assert.equal(hs.combo.expiresAtMs,102400);
Object.assign(hs,{lastTime:103190,timeLeft:9000});
Object.assign(hs.combo,{streak:2,expiresAtMs:105000,lastEventAtMs:103000});
hazardNow=103850;hazardFake.frames.shift()();
assert.equal(hs.timeLeft,8980);assert.equal(hs.combo.expiresAtMs,105640);
// Renderer retains swapped identities at their destination and guards BOTH tiles.
const hb=generateLevelData({level:28,difficulty:getDifficultyForLevel(28),rng:createSeededRng('swap-layout')});
const hazardOptions={seed:'swap-renderer',level:28,enemyIndex:2,cols:3,buttonIds:hb.buttons.map(b=>b.id)};
hazardGame.view.renderer.renderBoard({...hb,level:28,score:0});
hazardGame.view.renderer.updateHazardPresentation(createWechatHazards({...hazardOptions,nowMs:1600}));hazardGame.view.draw();
const targetPair=createWechatHazards({...hazardOptions,nowMs:1600}).hazards[0].targetButtonIds;
const beforePoint=pointFor(hazardGame.view,a=>a.buttonId===targetPair[0]);
hazardGame.view.renderer.updateHazardPresentation(createWechatHazards({...hazardOptions,nowMs:3510}));hazardGame.view.draw();
for(const id of targetPair)assert.equal(hazardGame.view.renderer.canPressButton(id),false);
hazardGame.view.renderer.updateHazardPresentation(createWechatHazards({...hazardOptions,nowMs:5000}));hazardGame.view.draw();
assert.equal(hazardGame.view.hitTest(beforePoint.x,beforePoint.y)?.buttonId,targetPair[1]);
Date.now=realDateNow;
const upgradeGame = createWechatGame(upgradeFake.wxApi);
upgradeGame.app.start();
upgradeGame.app.getState().combat.hp = 1;
for (const button of upgradeGame.app.getState().buttons) {
  if (!upgradeGame.app.getState().forbiddenIds.includes(button.id)) upgradeGame.app.press(button.id);
}
await new Promise((resolveWait) => setTimeout(resolveWait, 630));
assert.equal(upgradeGame.view.getView().mode, 'upgrade');
assert.equal(upgradeGame.app.getState().upgrades.pending, true);
assert.equal(upgradeGame.app.getState().upgrades.choices.length, 3);
assert.equal(upgradeGame.app.getState().upgrades.choices.some((choice) => choice.id === 'combo-reward-plus'), false);
const upgradePoint = pointFor(upgradeGame.view, (action) => action.type === 'upgrade');
upgradeFake.touch(upgradePoint.x, upgradePoint.y);
await new Promise((resolveWait) => setTimeout(resolveWait, 470));
assert.equal(upgradeGame.app.getSnapshot().status, 'playing');
assert.equal(upgradeGame.app.getState().level, 2);

const animatedFake = createFakeWx({ animateCanvas: true });
const animatedRun = createWechatGame(animatedFake.wxApi);
animatedRun.app.start();
const animatedSafe = animatedRun.app.getState().buttons.find((button) =>
  !animatedRun.app.getState().forbiddenIds.includes(button.id));
animatedRun.app.press(animatedSafe.id);
const animatedForbidden = animatedRun.app.getState().forbiddenIds[0];
animatedRun.app.press(animatedForbidden);
assert.ok(animatedFake.transforms.length > 0,
  'Full Canvas mode must exercise animated transforms.');
assert.ok(animatedFake.transforms.every((entry) => entry.every(Number.isFinite)),
  'Motion transforms must stay finite after safe and wrong presses.');

animatedRun.view.renderer.updateScore(87654);
await new Promise((resolveWait) => setTimeout(resolveWait, 410));
animatedRun.view.renderer.showGameOverScreen({ level: 1, score: 87654, isTimeout: true });
animatedFake.drawnText.length = 0;
animatedRun.app.reset();
assert.equal(animatedRun.view.getView().score, 0);
assert.equal(animatedRun.view.getView().mode, 'game');
animatedFake.drawnText.length = 0;
animatedRun.view.draw();
assert.equal(animatedFake.drawnText.includes('87654'), false,
  'Restart must not keep drawing the previous run through its completed score tween.');
assert.ok(animatedFake.drawnText.includes('0'), 'A new run must visibly start at zero points.');

const transitionFake = createFakeWx({ animateCanvas: true });
const transitionRun = createWechatGame(transitionFake.wxApi);
transitionRun.app.start();
for (const button of transitionRun.app.getState().buttons) {
  if (!transitionRun.app.getState().forbiddenIds.includes(button.id)) {
    transitionRun.app.press(button.id);
  }
}
assert.equal(transitionRun.app.getState().isPlaying, false,
  'Clearing a round must pause its timer while old tiles leave.');
await new Promise((resolveWait) => setTimeout(resolveWait, 640));
assert.equal(transitionRun.app.getState().level, 2);
assert.equal(transitionRun.app.getState().isPlaying, false,
  'The new timer must wait until staggered tile entry finishes.');
const entryTimeLeft = transitionRun.app.getState().timeLeft;
assert.throws(() => pointFor(transitionRun.view, (action) => action.type === 'press'),
  'New tiles must ignore input while entering.');
await new Promise((resolveWait) => setTimeout(resolveWait, 260));
assert.equal(transitionRun.app.getState().timeLeft, entryTimeLeft,
  'The countdown must remain fixed during tile entry.');
await new Promise((resolveWait) => setTimeout(resolveWait, 400));
assert.equal(transitionRun.app.getState().isPlaying, true);
assert.ok(transitionRun.app.getState().timeLeft <= entryTimeLeft);
assert.ok(pointFor(transitionRun.view, (action) => action.type === 'press').x > 0);

const buildRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'build');
const bundle = readFileSync(resolve(buildRoot, 'game.js'), 'utf8');
assert.ok(statSync(resolve(buildRoot, 'game.js')).size > 10000);
assert.equal(bundle.includes('document.getElementById'), false);
assert.equal(bundle.includes('new AudioContext('), false);
assert.equal(JSON.parse(readFileSync(resolve(buildRoot, 'project.config.json'))).compileType, 'game');
assert.equal(readFileSync(resolve(buildRoot, 'audio/safe_press.wav')).toString('ascii', 0, 4), 'RIFF');
assert.equal(existsSync(resolve(buildRoot, 'audio/click.wav')), false, 'Placeholder audio must be removed.');
for (const cue of Object.values(SFX_CUES)) {
  assert.ok(readFileSync(resolve(buildRoot, 'audio', cue.file)).equals(
    readFileSync(resolve(buildRoot, '../../../src/audio/sfx', cue.file))
  ), `Built audio differs from source: ${cue.file}`);
}
for (const name of ['home.m4a', 'game.m4a']) {
  assert.ok(readFileSync(resolve(buildRoot, 'audio/music', name)).equals(
    readFileSync(resolve(buildRoot, '../assets/music', name))
  ), `Built music differs from source: ${name}`);
}
function directoryBytes(path) {
  return readdirSync(path, { withFileTypes: true }).reduce((total, item) => {
    const child = resolve(path, item.name);
    return total + (item.isDirectory() ? directoryBytes(child) : statSync(child).size);
  }, 0);
}
assert.ok(directoryBytes(buildRoot) < 4 * 1024 * 1024,
  'WeChat main package must stay below 4 MiB.');
for (const name of [
  'running-pair.png', 'caring-pair.png', 'separated-pair.png',
  'title-home.png', 'title-result.png', 'sunny-stage.jpg', 'gameplay-landscape.jpg',
  'result-button-retry-v32.png', 'result-button-home-v32.png',
  'result-score-digits-v32.png', 'result-score-fen-v32.png',
  'result-crown-v32.png', 'result-burst-v32.png', 'result-burst-right-v32.png',
  'upgrade-pair-v24.png', 'upgrade-background-v24.jpg', 'upgrade-rays-v24.png',
  'upgrade-bubble-v25.png',
  'combo-wordmark-v30.png', 'max-wordmark-v30.png', 'ready-wordmark-v25.png',
  'hit-wordmark-v30.png', 'combo-digits-v29.png'
]) {
  if (name.endsWith('.jpg')) {
    assert.equal(readFileSync(resolve(buildRoot, 'art', name)).toString('hex', 0, 2), 'ffd8');
    continue;
  }
  assert.equal(readFileSync(resolve(buildRoot, 'art', name)).toString('hex', 0, 4), '89504e47');
}
assert.equal(existsSync(resolve(buildRoot, 'art/combo-wordmark-v17.png')), false);
assert.equal(existsSync(resolve(buildRoot, 'art/ready-wordmark-v21.png')), false);
assert.equal(existsSync(resolve(buildRoot, 'art/upgrade-bubble-v23.png')), false);
for (const name of ['ready-wordmark-v25.png', 'hit-wordmark-v30.png',
  'combo-wordmark-v30.png', 'combo-digits-v29.png', 'max-wordmark-v30.png',
  'result-button-retry-v32.png', 'result-button-home-v32.png',
  'result-score-digits-v32.png', 'result-score-fen-v32.png',
  'result-crown-v32.png', 'result-burst-v32.png', 'result-burst-right-v32.png']) {
  assert.ok(readFileSync(resolve(buildRoot, 'art', name)).equals(
    readFileSync(resolve(buildRoot, '../assets/runtime', name))
  ), `Built sticker art differs from source: ${name}`);
}
console.log('WeChat port integration checks passed.');
