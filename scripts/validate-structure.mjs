import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const file = (relativePath) => resolve(root, relativePath);
const moduleUrl = (relativePath) => pathToFileURL(file(relativePath)).href;

function readProjectFile(relativePath) {
  const path = file(relativePath);
  if (!existsSync(path)) {
    failures.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

const html = readProjectFile('index.html');
const moduleFiles = [
  'src/config/difficulty.js',
  'src/core/rng.js',
  'src/core/rules.js',
  'src/core/level.js',
  'src/core/storage.js',
  'src/core/recap.js',
  'src/core/debug.js',
  'src/ui/audio.js',
  'src/ui/render.js',
  'src/main.js'
];

const sources = new Map(moduleFiles.map((relativePath) => [relativePath, readProjectFile(relativePath)]));

for (const marker of [
  '<script type="module" src="./src/main.js"></script>',
  'id="best-status"',
  'id="failure-recap"',
  '致命条件',
  '禁止按键',
  '安全键'
]) {
  if (!html.includes(marker)) {
    failures.push(`Missing required structure/copy marker in index.html: ${marker}`);
  }
}

const combinedRuntimeSource = [...sources.values()].join('\n');
for (const marker of ['NEW BEST', 'MATCHED BEST', 'previewFailureRecap', 'getBestRecord']) {
  if (!combinedRuntimeSource.includes(marker)) {
    failures.push(`Missing required runtime marker in modules: ${marker}`);
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

for (const [relativePath, source] of [['index.html', html], ...sources]) {
  if (source.includes('\uFFFD')) {
    failures.push(`${relativePath} contains replacement characters, which usually means broken text encoding.`);
  }
}

const coreBoundaryFiles = [
  'src/config/difficulty.js',
  'src/core/rng.js',
  'src/core/rules.js',
  'src/core/level.js',
  'src/core/storage.js',
  'src/core/recap.js',
  'src/core/debug.js'
];
const forbiddenCorePatterns = [
  /\bwindow\b/,
  /\bdocument\b/,
  /\blocalStorage\b/,
  /\bAudioContext\b/,
  /\bclassList\b/,
  /\bURLSearchParams\b/,
  /\bgameState\b/,
  /\.getElementById\b/,
  /\.querySelector\b/
];

for (const relativePath of coreBoundaryFiles) {
  const source = sources.get(relativePath) || '';
  for (const pattern of forbiddenCorePatterns) {
    if (pattern.test(source)) {
      failures.push(`Core boundary violation in ${relativePath}: ${pattern}`);
    }
  }
}

const uiBoundaryFiles = ['src/ui/audio.js', 'src/ui/render.js'];
const forbiddenUiRuleMarkers = [
  'DIFFICULTY_BANDS',
  'SAFE_ACTION_TEXT',
  'formatFatalRule',
  'getDifficultyForLevel',
  'fatalMin',
  'fatalMax',
  'ruleTiers'
];

for (const relativePath of uiBoundaryFiles) {
  const source = sources.get(relativePath) || '';
  for (const marker of forbiddenUiRuleMarkers) {
    if (source.includes(marker)) {
      failures.push(`UI module duplicates rule/difficulty semantics in ${relativePath}: ${marker}`);
    }
  }
}

const mainSource = sources.get('src/main.js') || '';
for (const marker of [
  'const COLORS',
  'const SHAPES',
  'const DIFFICULTY_BANDS',
  'SAFE_ACTION_TEXT',
  'formatFatalRule',
  'function generateRule',
  'function generateLevelData',
  'ruleTiers: [',
  'fatalMin:',
  'fatalMax:'
]) {
  if (mainSource.includes(marker)) {
    failures.push(`src/main.js contains business-logic marker that belongs in core/config: ${marker}`);
  }
}

const mainLineCount = mainSource.split(/\r?\n/).length;
if (mainLineCount > 420) {
  failures.push(`src/main.js should remain orchestration-sized; found ${mainLineCount} lines.`);
}

const [
  difficultyModule,
  debugModule,
  storageModule,
  recapModule,
  mainModule
] = await Promise.all([
  import(moduleUrl('src/config/difficulty.js')),
  import(moduleUrl('src/core/debug.js')),
  import(moduleUrl('src/core/storage.js')),
  import(moduleUrl('src/core/recap.js')),
  import(moduleUrl('src/main.js'))
]);

const {
  getDifficultyForLevel
} = difficultyModule;
const {
  previewSeededLevel,
  previewFailureRecap
} = debugModule;
const {
  BEST_RECORD_KEY,
  buildBestRecordFromRun,
  compareRunToBest,
  loadBestRecord,
  resetBestRecord,
  saveBestRecord
} = storageModule;

function assertEqual(label, actual, expected) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    failures.push(`${label} mismatch:\nactual   ${actualText}\nexpected ${expectedText}`);
  }
}

const baselineSeed = 'phase3a-baseline';
const baselineFixtures = [
  {
    level: 1,
    difficultyId: 'training',
    gridSize: '2x2',
    buttonCount: 4,
    fatalCount: 1,
    fatalRange: '1-1',
    ruleTier: 'singleVisual',
    ruleId: 'shape',
    timeLimitMs: 18000,
    timeRewardMs: 2200,
    ruleText: '致命条件：形状为【正方形】。匹配者是禁止按键；按其他安全键。',
    forbiddenIds: ['btn-1'],
    buttons: [
      { color: 'red', shape: 'circle', number: 4 },
      { color: 'yellow', shape: 'square', number: 1 },
      { color: 'yellow', shape: 'circle', number: 6 },
      { color: 'red', shape: 'circle', number: 7 }
    ]
  },
  {
    level: 4,
    difficultyId: 'orientation',
    gridSize: '2x3',
    buttonCount: 6,
    fatalCount: 1,
    fatalRange: '1-1',
    ruleTier: 'singleVisual',
    ruleId: 'color',
    timeLimitMs: 16500,
    timeRewardMs: 1800,
    ruleText: '致命条件：颜色为【紫色】。匹配者是禁止按键；按其他安全键。',
    forbiddenIds: ['btn-0'],
    buttons: [
      { color: 'purple', shape: 'circle', number: 2 },
      { color: 'red', shape: 'star', number: 6 },
      { color: 'red', shape: 'circle', number: 9 },
      { color: 'yellow', shape: 'star', number: 8 },
      { color: 'red', shape: 'triangle', number: 1 },
      { color: 'red', shape: 'circle', number: 4 }
    ]
  },
  {
    level: 8,
    difficultyId: 'baseline',
    gridSize: '3x3',
    buttonCount: 9,
    fatalCount: 1,
    fatalRange: '1-2',
    ruleTier: 'singleVisual',
    ruleId: 'color',
    timeLimitMs: 14700,
    timeRewardMs: 1300,
    ruleText: '致命条件：颜色为【蓝色】。匹配者是禁止按键；按其他安全键。',
    forbiddenIds: ['btn-3'],
    buttons: [
      { color: 'purple', shape: 'square', number: 1 },
      { color: 'yellow', shape: 'triangle', number: 3 },
      { color: 'red', shape: 'square', number: 9 },
      { color: 'blue', shape: 'triangle', number: 6 },
      { color: 'purple', shape: 'triangle', number: 4 },
      { color: 'yellow', shape: 'circle', number: 2 },
      { color: 'yellow', shape: 'circle', number: 7 },
      { color: 'red', shape: 'star', number: 5 },
      { color: 'yellow', shape: 'star', number: 8 }
    ]
  },
  {
    level: 12,
    difficultyId: 'pressure',
    gridSize: '3x3',
    buttonCount: 9,
    fatalCount: 2,
    fatalRange: '2-3',
    ruleTier: 'not',
    ruleId: 'not-color-shape',
    timeLimitMs: 13100,
    timeRewardMs: 900,
    ruleText: '致命条件：颜色不是【蓝色】且形状为【正方形】。匹配者是禁止按键；按其他安全键。',
    forbiddenIds: ['btn-5', 'btn-8'],
    buttons: [
      { color: 'yellow', shape: 'triangle', number: 7 },
      { color: 'purple', shape: 'triangle', number: 8 },
      { color: 'blue', shape: 'square', number: 2 },
      { color: 'red', shape: 'triangle', number: 5 },
      { color: 'purple', shape: 'star', number: 1 },
      { color: 'purple', shape: 'square', number: 6 },
      { color: 'red', shape: 'circle', number: 4 },
      { color: 'purple', shape: 'triangle', number: 9 },
      { color: 'yellow', shape: 'square', number: 3 }
    ]
  },
  {
    level: 18,
    difficultyId: 'extended',
    gridSize: '3x3',
    buttonCount: 9,
    fatalCount: 4,
    fatalRange: '2-4',
    ruleTier: 'orColor',
    ruleId: 'two-colors-or',
    timeLimitMs: 11500,
    timeRewardMs: 700,
    ruleText: '致命条件：颜色为【红色】或【黄色】。匹配者是禁止按键；按其他安全键。',
    forbiddenIds: ['btn-0', 'btn-4', 'btn-5', 'btn-6'],
    buttons: [
      { color: 'yellow', shape: 'circle', number: 2 },
      { color: 'purple', shape: 'square', number: 4 },
      { color: 'blue', shape: 'square', number: 3 },
      { color: 'blue', shape: 'circle', number: 8 },
      { color: 'red', shape: 'circle', number: 5 },
      { color: 'red', shape: 'circle', number: 9 },
      { color: 'yellow', shape: 'star', number: 1 },
      { color: 'blue', shape: 'circle', number: 7 },
      { color: 'purple', shape: 'circle', number: 6 }
    ]
  }
];

for (const expected of baselineFixtures) {
  const preview = previewSeededLevel(baselineSeed, expected.level);
  for (const key of Object.keys(expected)) {
    assertEqual(`Seed fixture level ${expected.level}.${key}`, preview[key], expected[key]);
  }
  for (const requiredCopy of ['致命条件', '禁止按键', '安全键']) {
    if (!preview.ruleText.includes(requiredCopy)) {
      failures.push(`Rule copy for level ${expected.level} is missing ${requiredCopy}: ${preview.ruleText}`);
    }
  }
}

const level12A = JSON.stringify(previewSeededLevel(baselineSeed, 12));
const level12B = JSON.stringify(previewSeededLevel(baselineSeed, 12));
if (level12A !== level12B) {
  failures.push('Seeded preview is not deterministic for level 12.');
}

const phase1ExpectedShapes = [
  { level: 1, difficultyId: 'training', gridSize: '2x2', buttonCount: 4 },
  { level: 4, difficultyId: 'orientation', gridSize: '2x3', buttonCount: 6 },
  { level: 8, difficultyId: 'baseline', gridSize: '3x3', buttonCount: 9 },
  { level: 12, difficultyId: 'pressure', gridSize: '3x3', buttonCount: 9 },
  { level: 18, difficultyId: 'extended', gridSize: '3x3', buttonCount: 9 }
];
phase1ExpectedShapes.forEach((expected) => {
  const preview = previewSeededLevel('phase1-validate', expected.level);
  for (const key of Object.keys(expected)) {
    if (preview[key] !== expected[key]) {
      failures.push(`Unexpected Phase 1 preview shape for level ${expected.level}: ${JSON.stringify(preview)}`);
    }
  }
  const [minFatal, maxFatal] = preview.fatalRange.split('-').map(Number);
  if (preview.fatalCount < minFatal || preview.fatalCount > maxFatal) {
    failures.push(`Fatal count out of range for level ${preview.level}: ${preview.fatalCount} not in ${preview.fatalRange}`);
  }
});

const level1 = getDifficultyForLevel(1);
const level10 = getDifficultyForLevel(10);
if (level1.buttonCount >= 9) {
  failures.push('Level 1 should start below the old 3x3 baseline.');
}
if (level10.timeLimitMs < 13000) {
  failures.push('Level 10 should remain readable instead of relying on a harsh timer.');
}

const wrongRecap = previewFailureRecap(baselineSeed, 8, 'wrong_click');
const timeoutRecap = previewFailureRecap(baselineSeed, 8, 'timeout');
if (wrongRecap.failureReason !== 'wrong_click' || wrongRecap.pressedButton?.id !== 'btn-3') {
  failures.push(`Wrong-click recap missing pressed button: ${JSON.stringify(wrongRecap)}`);
}
if (timeoutRecap.failureReason !== 'timeout' || timeoutRecap.pressedButton !== null) {
  failures.push(`Timeout recap should not include a pressed button: ${JSON.stringify(timeoutRecap)}`);
}
for (const recap of [wrongRecap, timeoutRecap]) {
  if (recap.level !== 8 || recap.difficultyId !== 'baseline' || recap.gridSize !== '3x3') {
    failures.push(`Recap lost level/difficulty context: ${JSON.stringify(recap)}`);
  }
  if (!recap.ruleText.includes('致命条件') || !recap.ruleText.includes('禁止按键') || !recap.ruleText.includes('安全键')) {
    failures.push(`Recap rule text lost Phase 2 terminology: ${recap.ruleText}`);
  }
  if (recap.forbiddenButtons.length !== recap.fatalCount || recap.forbiddenButtons.length === 0) {
    failures.push(`Recap forbidden-button list does not match fatal count: ${JSON.stringify(recap)}`);
  }
  if (recap.safeTotal !== 8 || recap.safeCleared !== 0 || recap.safeRemaining !== 8) {
    failures.push(`Recap safe-key progress changed: ${JSON.stringify(recap)}`);
  }
  if (recap.bestComparison !== 'new_best' || recap.bestSaveStatus !== 'preview') {
    failures.push(`Recap best-record preview changed: ${JSON.stringify(recap)}`);
  }
}

if (typeof recapModule.getButtonRecap !== 'function' || typeof recapModule.buildFailureRecap !== 'function') {
  failures.push('Recap module import smoke failed.');
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

const storage = fakeStorage();
const bestInitial = loadBestRecord(storage);
if (BEST_RECORD_KEY !== 'thatbutton.bestRun.v1' || bestInitial.status !== 'empty' || bestInitial.record.bestLevel !== 1 || bestInitial.record.bestScore !== 0) {
  failures.push(`Unexpected initial best-record state: ${JSON.stringify(bestInitial)}`);
}

storage.setItem('thatbutton.bestRun.v1', '{broken json');
const corruptBest = loadBestRecord(storage);
if (corruptBest.status !== 'corrupt' || corruptBest.record.bestLevel !== 1 || corruptBest.record.bestScore !== 0) {
  failures.push(`Corrupt best-record fallback failed: ${JSON.stringify(corruptBest)}`);
}

saveBestRecord(storage, buildBestRecordFromRun(6, 100, 'validate'));
const loadedBest = loadBestRecord(storage);
if (loadedBest.status !== 'loaded' || loadedBest.record.bestLevel !== 6 || loadedBest.record.bestScore !== 100 || loadedBest.record.updatedAt !== 'validate') {
  failures.push(`Saved best-record did not reload: ${JSON.stringify(loadedBest)}`);
}
if (compareRunToBest(7, 0, loadedBest.record) !== 'new_best') {
  failures.push('Best-record comparison should classify a higher level as new_best.');
}
if (compareRunToBest(6, 100, loadedBest.record) !== 'matched_best') {
  failures.push('Best-record comparison should classify same level and score as matched_best.');
}
if (compareRunToBest(5, 200, loadedBest.record) !== 'below_best') {
  failures.push('Best-record comparison should classify lower level as below_best.');
}
const resetBest = resetBestRecord(storage);
if (resetBest.status !== 'empty' || resetBest.record.bestLevel !== 1 || resetBest.record.bestScore !== 0) {
  failures.push(`Best-record reset failed: ${JSON.stringify(resetBest)}`);
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
    id: '',
    offsetWidth: 1
  };
}

const appStorage = fakeStorage();
const fakeWindow = {
  location: { search: '?seed=phase3a-baseline&debug=1' },
  AudioContext: FakeAudioContext,
  webkitAudioContext: FakeAudioContext,
  localStorage: appStorage
};
const fakeDocument = {
  body: fakeElement(),
  getElementById: () => fakeElement(),
  createElement: fakeElement
};
const app = mainModule.createApp({
  window: fakeWindow,
  document: fakeDocument,
  performance: { now: () => 1000 },
  requestAnimationFrame: () => 0,
  setTimeout: () => 0,
  clearTimeout: () => {},
  random: () => 0.5
});
app.init();

const debugApi = fakeWindow.__THAT_BUTTON_DEBUG__;
const requiredDebugHelpers = [
  'previewSeededLevel',
  'previewFailureRecap',
  'getDifficultyForLevel',
  'getLastFailureRecap',
  'getBestRecord',
  'loadBestRecord',
  'saveBestRecord',
  'resetBestRecord',
  'compareRunToBest',
  'getLog',
  'clearLog'
];
for (const helper of requiredDebugHelpers) {
  if (typeof debugApi?.[helper] !== 'function') {
    failures.push(`Debug API is missing helper: ${helper}`);
  }
}

if (debugApi) {
  assertEqual(
    'Debug API level 18 preview',
    debugApi.previewSeededLevel(baselineSeed, 18).forbiddenIds,
    ['btn-0', 'btn-4', 'btn-5', 'btn-6']
  );
  const debugWrongRecap = debugApi.previewFailureRecap(baselineSeed, 8, 'wrong_click');
  if (debugWrongRecap.pressedButton?.label !== '蓝色 三角形 06') {
    failures.push(`Debug API wrong-click recap changed: ${JSON.stringify(debugWrongRecap)}`);
  }

  const debugInitial = debugApi.getBestRecord();
  if (debugInitial.key !== 'thatbutton.bestRun.v1' || debugInitial.record.bestLevel !== 1 || debugInitial.record.bestScore !== 0) {
    failures.push(`Debug API best-record state changed: ${JSON.stringify(debugInitial)}`);
  }
  appStorage.setItem('thatbutton.bestRun.v1', '{broken json');
  const debugCorrupt = debugApi.loadBestRecord();
  if (debugCorrupt.status !== 'corrupt') {
    failures.push(`Debug API corrupt best-record load changed: ${JSON.stringify(debugCorrupt)}`);
  }
  const debugSaved = debugApi.saveBestRecord(6, 100);
  if (debugSaved.status !== 'saved' || debugSaved.record.bestLevel !== 6 || debugSaved.record.bestScore !== 100) {
    failures.push(`Debug API save best-record changed: ${JSON.stringify(debugSaved)}`);
  }
  if (debugApi.compareRunToBest(5, 200, debugSaved.record) !== 'below_best') {
    failures.push('Debug API compareRunToBest changed.');
  }
}

if (failures.length > 0) {
  console.error('Structure validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Structure validation passed.');
