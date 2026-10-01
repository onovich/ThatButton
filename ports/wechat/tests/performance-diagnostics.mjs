import assert from 'node:assert/strict';
import { createPerformanceDiagnostics, createDiagnosticClock } from '../src/performance-diagnostics.js';

for (const unit of [1, 1000, 7]) {
  let wall = 100, calibrate;
  const clock = createDiagnosticClock({ getPerformance: () => ({ now: () => wall * unit }) }, {
    wallNow: () => wall, schedule: (fn) => { calibrate = fn; }
  });
  wall += 200; calibrate();
  const before = clock.now(); wall += 16;
  assert.equal(clock.now() - before, 16);
  assert.match(clock.source(), unit === 7 ? /Date.now/ : new RegExp(`/ ${unit} `));
}

assert.equal(createPerformanceDiagnostics({ getPerformance() { throw new Error('off'); } }), null);
let time = 0, saved, copied;
const diagnostics = createPerformanceDiagnostics({
  getStorageSync: () => saved,
  setStorageSync: (_key, value) => { saved = value; },
  setClipboardData: ({ data }) => { copied = data; }
}, { enabled: true, now: () => time, clockSource: 'test' });
diagnostics.frame('game');
time += 16; diagnostics.frame('game');
time += 51; diagnostics.frame('game');
time += 101; diagnostics.frame('game');
diagnostics.setActive(false);
time += 60000; diagnostics.frame('game');
diagnostics.count('fillText');
diagnostics.setActive(true);
diagnostics.frame('game');
time += 16; diagnostics.frame('game');
time += 16; diagnostics.frame('game-glitch'); // scene change must not form an interval
const start = diagnostics.beginDraw('game-glitch');
diagnostics.count('glitchRebuild'); diagnostics.count('glitchReadback');
time += 3; diagnostics.endDraw(start);
for (let i = 0; i < 1000; i++) { time += 16; diagnostics.frame('game-glitch'); }
const report = diagnostics.snapshot();
assert.equal(report.scenes.game.rafInterval.count, 4);
assert.equal(report.scenes.game.rafOver34ms, 2);
assert.equal(report.scenes.game.rafOver50ms, 2);
assert.equal(report.scenes.game.rafOver100ms, 1);
assert.equal(report.scenes.game.fillText, 0);
assert.equal(report.scenes['game-glitch'].rafInterval.recentSampleCount, 256);
assert.equal(report.scenes['game-glitch'].drawSubmit.meanMs, 3);
assert.equal(report.scenes['game-glitch'].glitchReadback, 1);
assert.ok(Object.values(report.unavailable).every((v) => v === null));
diagnostics.frame('home', false);
assert.equal(diagnostics.snapshot().scenes.home.timerCallbacks, 1);
assert.equal(diagnostics.snapshot().scenes.home.rafInterval.count, 0);
diagnostics.save(); diagnostics.save(); diagnostics.exportReport();
assert.equal(saved.length, 1);
assert.deepEqual(JSON.parse(copied), diagnostics.snapshot());
assert.ok(copied.length < 24000);
const failing = createPerformanceDiagnostics({ setStorageSync() { throw new Error('quota'); } },
  { enabled: true, now: () => time });
failing.save();
assert.equal(failing.snapshot().persistenceError, 'local storage failed');
console.log('Opt-in performance diagnostics, foreground gaps, scene bounds and explicit export checks passed.');

let pendingCalibration, cancelledCalibration = false, platformReads = 0;
const disposableClock = createDiagnosticClock({ getPerformance: () => ({ now() { platformReads++; return 0; } }) }, {
  schedule(fn) { pendingCalibration = fn; return 17; },
  cancel(id) { assert.equal(id,17); cancelledCalibration = true; }
});
disposableClock.dispose();
pendingCalibration();
assert.equal(cancelledCalibration,true);
assert.equal(platformReads,1,'Disposed calibration must not read the platform clock again.');
