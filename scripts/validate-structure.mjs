import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = resolve(root, 'index.html');
const html = readFileSync(indexPath, 'utf8');
const failures = [];

const inlineScript = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/i)?.[1];

for (const marker of [
  'const DIFFICULTY_BANDS',
  'function getDifficultyForLevel',
  'buttonCount',
  'fatalMin',
  'fatalMax',
  'ruleTiers',
  'timeRewardMs',
  'carryoverRatio',
  'window.__THAT_BUTTON_DEBUG__',
  'previewSeededLevel',
  'getDifficultyForLevel'
]) {
  if (!html.includes(marker)) {
    failures.push(`Missing Phase 1 structure marker: ${marker}`);
  }
}

if (!inlineScript) {
  failures.push('No inline game script found for structure validation.');
}

class FakeAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
  }

  createOscillator() {
    return {
      type: '',
      frequency: { setValueAtTime() {} },
      connect() {},
      start() {},
      stop() {}
    };
  }

  createGain() {
    return {
      gain: { exponentialRampToValueAtTime() {} },
      connect() {}
    };
  }

  resume() {
    this.state = 'running';
  }
}

function fakeElement() {
  return {
    classList: {
      add() {},
      remove() {},
      contains() { return false; }
    },
    dataset: {},
    style: { setProperty() {} },
    addEventListener() {},
    appendChild() {},
    setAttribute() {},
    innerHTML: '',
    innerText: '',
    id: ''
  };
}

if (inlineScript) {
  const context = {
    console,
    URLSearchParams,
    window: {
      location: { search: '?seed=phase1-validate&debug=1' },
      AudioContext: FakeAudioContext,
      webkitAudioContext: FakeAudioContext
    },
    document: {
      body: fakeElement(),
      getElementById: () => fakeElement(),
      createElement: fakeElement
    },
    performance: { now: () => 1000 },
    requestAnimationFrame: () => 0,
    setTimeout: () => 0,
    clearTimeout: () => {}
  };

  try {
    vm.runInNewContext(inlineScript, context, { filename: 'index.html:inline-script' });
    const debugApi = context.window.__THAT_BUTTON_DEBUG__;
    if (!debugApi?.previewSeededLevel || !debugApi?.getDifficultyForLevel) {
      failures.push('Debug API is missing previewSeededLevel or getDifficultyForLevel.');
    } else {
      const levels = [1, 4, 8, 12, 18];
      const previews = levels.map((level) => debugApi.previewSeededLevel('phase1-validate', level));
      const expected = [
        { level: 1, difficultyId: 'training', gridSize: '2x2', buttonCount: 4 },
        { level: 4, difficultyId: 'orientation', gridSize: '2x3', buttonCount: 6 },
        { level: 8, difficultyId: 'baseline', gridSize: '3x3', buttonCount: 9 },
        { level: 12, difficultyId: 'pressure', gridSize: '3x3', buttonCount: 9 },
        { level: 18, difficultyId: 'extended', gridSize: '3x3', buttonCount: 9 }
      ];

      previews.forEach((preview, index) => {
        const want = expected[index];
        if (preview.level !== want.level || preview.difficultyId !== want.difficultyId || preview.gridSize !== want.gridSize || preview.buttonCount !== want.buttonCount) {
          failures.push(`Unexpected preview shape for level ${want.level}: ${JSON.stringify(preview)}`);
        }

        const [minFatal, maxFatal] = preview.fatalRange.split('-').map(Number);
        if (preview.fatalCount < minFatal || preview.fatalCount > maxFatal) {
          failures.push(`Fatal count out of range for level ${preview.level}: ${preview.fatalCount} not in ${preview.fatalRange}`);
        }
      });

      const level12A = JSON.stringify(debugApi.previewSeededLevel('phase1-validate', 12));
      const level12B = JSON.stringify(debugApi.previewSeededLevel('phase1-validate', 12));
      if (level12A !== level12B) {
        failures.push('Seeded preview is not deterministic for level 12.');
      }

      const level1 = debugApi.getDifficultyForLevel(1);
      const level10 = debugApi.getDifficultyForLevel(10);
      if (level1.buttonCount >= 9) {
        failures.push('Level 1 should start below the old 3x3 baseline.');
      }
      if (level10.timeLimitMs < 13000) {
        failures.push('Level 10 should remain readable instead of relying on a harsh timer.');
      }
    }
  } catch (error) {
    failures.push(`Structure validation runtime failed: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error('Structure validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Structure validation passed.');
