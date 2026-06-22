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
  'getDifficultyForLevel',
  'const SAFE_ACTION_TEXT',
  'formatFatalRule',
  '匹配者是禁止按键；按其他安全键。',
  '** 避开禁止按键，清空所有安全键 **',
  '致命条件回放',
  'const BEST_RECORD_KEY',
  'thatbutton.bestRun.v1',
  'id="best-status"',
  'id="failure-recap"',
  'previewFailureRecap',
  'getBestRecord',
  'NEW BEST'
]) {
  if (!html.includes(marker)) {
    failures.push(`Missing required structure/copy marker: ${marker}`);
  }
}

for (const staleCopy of [
  '目标：按下其它安全键',
  '备用判定',
  '你按下了那个致命键',
  '未能及时释放压力'
]) {
  if (html.includes(staleCopy)) {
    failures.push(`Stale Phase 2 copy remains: ${staleCopy}`);
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

function fakeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    }
  };
}

if (inlineScript) {
  const storage = fakeStorage();
  const context = {
    console,
    URLSearchParams,
    window: {
      location: { search: '?seed=phase1-validate&debug=1' },
      AudioContext: FakeAudioContext,
      webkitAudioContext: FakeAudioContext,
      localStorage: storage
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
    if (!debugApi?.previewSeededLevel || !debugApi?.getDifficultyForLevel || !debugApi?.previewFailureRecap || !debugApi?.getBestRecord) {
      failures.push('Debug API is missing previewSeededLevel, getDifficultyForLevel, previewFailureRecap, or getBestRecord.');
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

        for (const requiredCopy of ['致命条件', '禁止按键', '安全键']) {
          if (!preview.ruleText.includes(requiredCopy)) {
            failures.push(`Rule copy for level ${preview.level} is missing ${requiredCopy}: ${preview.ruleText}`);
          }
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

      const bestInitial = debugApi.getBestRecord();
      if (bestInitial.key !== 'thatbutton.bestRun.v1' || bestInitial.record.bestLevel !== 1 || bestInitial.record.bestScore !== 0) {
        failures.push(`Unexpected initial best-record state: ${JSON.stringify(bestInitial)}`);
      }

      storage.setItem('thatbutton.bestRun.v1', '{broken json');
      const corruptBest = debugApi.loadBestRecord();
      if (corruptBest.status !== 'corrupt' || corruptBest.record.bestLevel !== 1 || corruptBest.record.bestScore !== 0) {
        failures.push(`Corrupt best-record fallback failed: ${JSON.stringify(corruptBest)}`);
      }

      debugApi.saveBestRecord(6, 100);
      const loadedBest = debugApi.loadBestRecord();
      if (loadedBest.status !== 'loaded' || loadedBest.record.bestLevel !== 6 || loadedBest.record.bestScore !== 100) {
        failures.push(`Saved best-record did not reload: ${JSON.stringify(loadedBest)}`);
      }

      if (debugApi.compareRunToBest(7, 0, loadedBest.record) !== 'new_best') {
        failures.push('Best-record comparison should classify a higher level as new_best.');
      }
      if (debugApi.compareRunToBest(6, 100, loadedBest.record) !== 'matched_best') {
        failures.push('Best-record comparison should classify same level and score as matched_best.');
      }
      if (debugApi.compareRunToBest(5, 200, loadedBest.record) !== 'below_best') {
        failures.push('Best-record comparison should classify lower level as below_best.');
      }

      const wrongRecap = debugApi.previewFailureRecap('phase3-validate', 8, 'wrong_click');
      const timeoutRecap = debugApi.previewFailureRecap('phase3-validate', 8, 'timeout');
      if (wrongRecap.failureReason !== 'wrong_click' || !wrongRecap.pressedButton) {
        failures.push(`Wrong-click recap missing pressed button: ${JSON.stringify(wrongRecap)}`);
      }
      if (timeoutRecap.failureReason !== 'timeout' || timeoutRecap.pressedButton !== null) {
        failures.push(`Timeout recap should not include a pressed button: ${JSON.stringify(timeoutRecap)}`);
      }
      for (const recap of [wrongRecap, timeoutRecap]) {
        if (!recap.ruleText.includes('致命条件') || !recap.ruleText.includes('禁止按键') || !recap.ruleText.includes('安全键')) {
          failures.push(`Recap rule text lost Phase 2 terminology: ${recap.ruleText}`);
        }
        if (recap.forbiddenButtons.length !== recap.fatalCount || recap.forbiddenButtons.length === 0) {
          failures.push(`Recap forbidden-button list does not match fatal count: ${JSON.stringify(recap)}`);
        }
        if (!Number.isFinite(recap.safeRemaining) || !Number.isFinite(recap.safeCleared)) {
          failures.push(`Recap safe-key progress is invalid: ${JSON.stringify(recap)}`);
        }
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
