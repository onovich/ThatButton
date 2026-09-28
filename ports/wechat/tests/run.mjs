import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWechatGame } from '../src/game.js';
import { getDifficultyForLevel } from '../../../src/config/difficulty.js';
import { generateLevelData } from '../../../src/core/level.js';
import { createSeededRng } from '../../../src/core/rng.js';

function createFakeWx({ width = 390, height = 844 } = {}) {
  const frames = [];
  const storage = new Map();
  let touchHandler = null;
  let hideHandler = null;
  let showHandler = null;
  const ctx = {
    setTransform() {}, scale() {}, fillRect() {}, strokeRect() {}, fillText() {},
    measureText(value) { return { width: [...String(value)].length * 17 }; }
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext() { return ctx; },
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
    getLaunchOptionsSync() { return { query: { seed: 'wechat-integration' } }; },
    createInnerAudioContext() { return { stop() {}, play() {}, destroy() {} }; },
    vibrateShort() {},
    onTouchStart(callback) { touchHandler = callback; },
    onHide(callback) { hideHandler = callback; },
    onShow(callback) { showHandler = callback; }
  };
  return {
    wxApi,
    frames,
    storage,
    canvas,
    touch(x, y) { touchHandler({ touches: [{ clientX: x, clientY: y }] }); },
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

const fake = createFakeWx();
const { app, view } = createWechatGame(fake.wxApi);
assert.equal(view.getView().mode, 'start');
assert.equal(fake.canvas.width, 780);
assert.equal(fake.canvas.height, 1688);

const startPoint = pointFor(view, (action) => action.type === 'start');
fake.touch(startPoint.x, startPoint.y);
assert.equal(app.getSnapshot().status, 'playing');
assert.equal(fake.frames.length, 1);
const firstRound = app.getState();
assert.equal(firstRound.seed, 'wechat-integration');
assert.equal(firstRound.buttons.length, 4);

const safeId = firstRound.buttons.find((button) => !firstRound.forbiddenIds.includes(button.id)).id;
const safePoint = pointFor(view, (action) => action.type === 'press' && action.buttonId === safeId);
fake.touch(safePoint.x, safePoint.y);
assert.equal(app.getState().score, 10);
assert.equal(app.getState().buttons.find((button) => button.id === safeId).isClicked, true);

const forbiddenId = app.getState().forbiddenIds[0];
const hpBefore = app.getState().player.hp;
const forbiddenPoint = pointFor(view, (action) => action.type === 'press' && action.buttonId === forbiddenId);
fake.touch(forbiddenPoint.x, forbiddenPoint.y);
assert.ok(app.getState().player.hp < hpBefore);

fake.hide();
const timeBeforePause = app.getState().timeLeft;
await new Promise((resolveWait) => setTimeout(resolveWait, 25));
fake.frames.shift()();
assert.ok(Math.abs(app.getState().timeLeft - timeBeforePause) < 5);
fake.show();

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
const upgradeGame = createWechatGame(upgradeFake.wxApi);
upgradeGame.app.start();
upgradeGame.app.getState().combat.hp = 1;
for (const button of upgradeGame.app.getState().buttons) {
  if (!upgradeGame.app.getState().forbiddenIds.includes(button.id)) upgradeGame.app.press(button.id);
}
await new Promise((resolveWait) => setTimeout(resolveWait, 630));
assert.equal(upgradeGame.view.getView().mode, 'upgrade');
assert.equal(upgradeGame.app.getState().upgrades.pending, true);
const upgradePoint = pointFor(upgradeGame.view, (action) => action.type === 'upgrade');
upgradeFake.touch(upgradePoint.x, upgradePoint.y);
await new Promise((resolveWait) => setTimeout(resolveWait, 470));
assert.equal(upgradeGame.app.getSnapshot().status, 'playing');
assert.equal(upgradeGame.app.getState().level, 2);

const buildRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'build');
const bundle = readFileSync(resolve(buildRoot, 'game.js'), 'utf8');
assert.ok(statSync(resolve(buildRoot, 'game.js')).size > 10000);
assert.equal(bundle.includes('document.getElementById'), false);
assert.equal(bundle.includes('new AudioContext('), false);
assert.equal(JSON.parse(readFileSync(resolve(buildRoot, 'project.config.json'))).compileType, 'game');
assert.equal(readFileSync(resolve(buildRoot, 'audio/click.wav')).toString('ascii', 0, 4), 'RIFF');
console.log('WeChat port integration checks passed.');
