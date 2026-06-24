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
  'src/config/combat.js',
  'src/core/app-state.js',
  'src/core/combat.js',
  'src/core/combo.js',
  'src/core/encounter.js',
  'src/core/rng.js',
  'src/core/rules.js',
  'src/core/level.js',
  'src/core/storage.js',
  'src/core/recap.js',
  'src/core/run-recaps.js',
  'src/core/debug.js',
  'src/core/host-events.js',
  'src/host/app-host-api.js',
  'src/host/browser-host-bridge.js',
  'src/host/browser-storage.js',
  'src/app/create-app.js',
  'src/ui/audio.js',
  'src/ui/render.js',
  'src/main.js'
];

const sources = new Map(moduleFiles.map((relativePath) => [relativePath, readProjectFile(relativePath)]));

for (const marker of [
  '<script type="module" src="./src/main.js"></script>',
  'id="best-status"',
  'id="battle-stage"',
  'id="combat-status"',
  'id="boss-avatar-shell"',
  'id="boss-hp-bar"',
  'id="boss-damage-text"',
  'id="boss-attack-layer"',
  'id="combo-status-text"',
  'id="combo-reward-text"',
  'id="combo-particle-layer"',
  'id="command-panel"',
  'id="clue-title"',
  '别按那个按钮！',
  'id="failure-recap"',
  '禁止按键',
  '安全键'
]) {
  if (!html.includes(marker)) {
    failures.push(`Missing required structure/copy marker in index.html: ${marker}`);
  }
}

const combinedRuntimeSource = [...sources.values()].join('\n');
for (const marker of ['NEW BEST', 'MATCHED BEST', 'previewFailureRecap', 'getBestRecord', 'updateCombatStatus', 'showComboReward', 'spawnComboParticles', 'MAX COMBO', 'showBossHit', 'spawnBossProjectile']) {
  if (!combinedRuntimeSource.includes(marker)) {
    failures.push(`Missing required runtime marker in modules: ${marker}`);
  }
}

for (const marker of ['id="boss-avatar"', '.battle-stage', '.command-panel', '.boss-avatar-shell', '.boss-damage-text', '.boss-projectile', 'grid-template-areas:', '"avatar label combo"', '.combat-hp-bar', 'display: block;', 'id="combo-reward-text"', 'id="combo-particle-layer"', '.combo-reward-text', '.combo-particle', '.button-float-text', '.combo-shake-strong', '@keyframes boss-projectile-flight', '@keyframes combo-reward-pop', '@keyframes combo-particle-burst', '@media (max-width: 520px)']) {
  if (!html.includes(marker)) {
    failures.push(`Missing combat mobile layout marker in index.html: ${marker}`);
  }
}

for (const localDistributionMarker of [
  'Local utility subset replacing previous Tailwind CDN usage.',
  'font-family: system-ui',
  'font-family: ui-monospace'
]) {
  if (!html.includes(localDistributionMarker)) {
    failures.push(`Missing local distribution marker in index.html: ${localDistributionMarker}`);
  }
}

for (const forbiddenRuntimeResource of [
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
]) {
  if (html.includes(forbiddenRuntimeResource)) {
    failures.push(`Runtime external resource marker remains in index.html: ${forbiddenRuntimeResource}`);
  }
}

for (const staleCopy of [
  '目标：按下其它安全键',
  '备用判定',
  '你按下了那个致命键',
  '未能及时释放压力',
  'FATAL_CONDITION // READ FIRST',
  '匹配者是禁止按键',
  '按其他安全键',
  'terminal-hint'
]) {
  if ((html + combinedRuntimeSource).includes(staleCopy)) {
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
  'src/config/combat.js',
  'src/core/app-state.js',
  'src/core/combat.js',
  'src/core/combo.js',
  'src/core/encounter.js',
  'src/core/rng.js',
  'src/core/rules.js',
  'src/core/level.js',
  'src/core/storage.js',
  'src/core/recap.js',
  'src/core/run-recaps.js',
  'src/core/debug.js',
  'src/core/host-events.js'
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

const pluginSpecificMarkers = [
  /\bUnity\b/,
  /\buniwebview\b/i,
  /\bvuplex\b/i,
  /\bpostMessageToNative\b/i,
  /\bcustom URL scheme\b/i
];
for (const [relativePath, source] of sources) {
  for (const pattern of pluginSpecificMarkers) {
    if (pattern.test(source)) {
      failures.push(`Plugin-specific host bridge marker found in ${relativePath}: ${pattern}`);
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
  combatConfigModule,
  combatModule,
  comboModule,
  debugModule,
  storageModule,
  recapModule,
  hostEventsModule,
  hostBridgeModule,
  mainModule
] = await Promise.all([
  import(moduleUrl('src/config/difficulty.js')),
  import(moduleUrl('src/config/combat.js')),
  import(moduleUrl('src/core/combat.js')),
  import(moduleUrl('src/core/combo.js')),
  import(moduleUrl('src/core/debug.js')),
  import(moduleUrl('src/core/storage.js')),
  import(moduleUrl('src/core/recap.js')),
  import(moduleUrl('src/core/host-events.js')),
  import(moduleUrl('src/host/browser-host-bridge.js')),
  import(moduleUrl('src/main.js'))
]);

const {
  getDifficultyForLevel
} = difficultyModule;
const {
  PROTOTYPE_BOSS_CONFIG,
  COMBO_MAX_STREAK
} = combatConfigModule;
const {
  applyRoundClearDamage,
  calculateRoundDamage,
  createCombatState,
  getCombatSummary
} = combatModule;
const {
  createComboState,
  getComboSummary,
  incrementCombo,
  resetCombo
} = comboModule;
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
const {
  HOST_EVENT_VERSION,
  HOST_EVENT_TYPES,
  createHostEvent,
  cloneHostEvent,
  createBossDamagePayload,
  createButtonPayload,
  createCombatPayload,
  createComboPayload,
  createRoundPayload,
  createRunResultPayload,
  isJsonSafeValue
} = hostEventsModule;
const {
  createBrowserHostBridge,
  createCaptureHostBridge,
  createNoopHostBridge
} = hostBridgeModule;

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
    ruleText: '形状为【正方形】',
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
    ruleText: '颜色为【紫色】',
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
    ruleText: '颜色为【蓝色】',
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
    ruleText: '颜色不是【蓝色】且形状为【正方形】',
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
    ruleText: '颜色为【红色】或【黄色】',
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
  for (const staleRuleCopy of ['致命条件：', '匹配者是禁止按键', '按其他安全键']) {
    if (preview.ruleText.includes(staleRuleCopy)) {
      failures.push(`Rule copy for level ${expected.level} is still too verbose: ${preview.ruleText}`);
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

const initialCombo = createComboState();
if (COMBO_MAX_STREAK !== 12 || initialCombo.streak !== 0 || initialCombo.multiplierLabel !== 'x1.0' || initialCombo.damageBonus !== 0) {
  failures.push(`Initial combo state changed: ${JSON.stringify(initialCombo)}`);
}
let comboState = initialCombo;
for (let pressIndex = 0; pressIndex < 13; pressIndex++) {
  comboState = incrementCombo(comboState, 'safe_press').combo;
}
if (comboState.streak !== 12 || !comboState.isCapped || comboState.tier !== 3 || comboState.multiplierLabel !== 'x1.3' || comboState.damageBonus !== 6) {
  failures.push(`Combo cap/tier smoke failed: ${JSON.stringify(comboState)}`);
}
const comboReset = resetCombo(comboState, 'fatal_press').combo;
if (comboReset.streak !== 0 || comboReset.lastChangeReason !== 'fatal_press' || comboReset.damageBonus !== 0) {
  failures.push(`Combo reset smoke failed: ${JSON.stringify(comboReset)}`);
}
if (JSON.stringify(getComboSummary(comboState)) !== JSON.stringify(comboState)) {
  failures.push('Combo summary should be a stable plain-data clone.');
}

const initialCombat = createCombatState();
if (
  PROTOTYPE_BOSS_CONFIG.maxHp !== 540 ||
  initialCombat.bossId !== 'reactor-warden' ||
  initialCombat.hp !== 540 ||
  initialCombat.status !== 'active'
) {
  failures.push(`Initial combat state changed: ${JSON.stringify(initialCombat)}`);
}
const roundDamage = calculateRoundDamage({
  timeLeftMs: 18000,
  comboState: createComboState({ streak: 3 })
});
if (roundDamage.baseDamage !== 18 || roundDamage.timeBonus !== 4 || roundDamage.comboBonus !== 2 || roundDamage.totalDamage !== 24) {
  failures.push(`Round damage formula changed: ${JSON.stringify(roundDamage)}`);
}
const firstCombatHit = applyRoundClearDamage(initialCombat, {
  level: 1,
  timeLeftMs: 18000,
  comboState: createComboState({ streak: 3 })
});
if (firstCombatHit.damage.appliedDamage !== 24 || firstCombatHit.combat.hp !== 516 || firstCombatHit.defeated) {
  failures.push(`Combat damage application smoke failed: ${JSON.stringify(firstCombatHit)}`);
}
let defeatCombat = createCombatState();
for (let level = 1; level <= 20; level++) {
  defeatCombat = applyRoundClearDamage(defeatCombat, {
    level,
    timeLeftMs: 18000,
    comboState: createComboState({ streak: 12 })
  }).combat;
}
const defeatSummary = getCombatSummary(defeatCombat);
if (defeatSummary.status !== 'defeated' || defeatSummary.hp !== 0 || defeatSummary.defeatedAtLevel !== 20 || defeatSummary.roundsCleared !== 20) {
  failures.push(`Boss defeat smoke failed: ${JSON.stringify(defeatSummary)}`);
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
  for (const staleRuleCopy of ['致命条件：', '匹配者是禁止按键', '按其他安全键']) {
    if (recap.ruleText.includes(staleRuleCopy)) {
      failures.push(`Recap rule text is still too verbose: ${recap.ruleText}`);
    }
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

const hostEvent = createHostEvent(HOST_EVENT_TYPES.ROUND_STARTED, { ok: true }, { atMs: 12.4 });
if (hostEvent.version !== HOST_EVENT_VERSION || hostEvent.type !== 'round_started' || hostEvent.atMs !== 12 || hostEvent.payload.ok !== true) {
  failures.push(`Host event builder produced an unexpected event: ${JSON.stringify(hostEvent)}`);
}
if (JSON.stringify(hostEvent) !== JSON.stringify(JSON.parse(JSON.stringify(hostEvent)))) {
  failures.push('Host event builder did not produce a JSON-stable payload.');
}
if (isJsonSafeValue({ fn() {} }) || isJsonSafeValue({ missing: undefined }) || isJsonSafeValue(new Date())) {
  failures.push('Host event JSON-safety guard accepted unsupported values.');
}
try {
  createHostEvent('plugin_specific_event', {});
  failures.push('Host event builder accepted an unknown event type.');
} catch (error) {
  if (!(error instanceof TypeError)) {
    failures.push(`Host event builder threw the wrong error for unknown type: ${error.message}`);
  }
}
const clonedHostEvent = cloneHostEvent(hostEvent);
if (clonedHostEvent === hostEvent || clonedHostEvent.payload === hostEvent.payload) {
  failures.push('Host event clone should return detached event and payload objects.');
}

const hostRoundPreview = previewSeededLevel(baselineSeed, 1);
const hostRoundPayload = createRoundPayload({
  level: hostRoundPreview.level,
  score: 0,
  isPlaying: true,
  seed: baselineSeed,
  difficulty: getDifficultyForLevel(hostRoundPreview.level),
  ruleText: hostRoundPreview.ruleText,
  ruleTier: hostRoundPreview.ruleTier,
  ruleId: hostRoundPreview.ruleId,
  buttons: hostRoundPreview.buttons.map((button, index) => ({
    id: `btn-${index}`,
    color: difficultyModule.COLORS.find((color) => color.id === button.color),
    shape: difficultyModule.SHAPES.find((shape) => shape.id === button.shape),
    number: button.number
  })),
  forbiddenIds: hostRoundPreview.forbiddenIds,
  safeKeysRemaining: hostRoundPreview.buttonCount - hostRoundPreview.fatalCount,
  timeLimit: hostRoundPreview.timeLimitMs,
  timeLeft: hostRoundPreview.timeLimitMs
});
if (!isJsonSafeValue(hostRoundPayload) || hostRoundPayload.buttons[1].label !== '黄色 正方形 01') {
  failures.push(`Host round payload smoke failed: ${JSON.stringify(hostRoundPayload)}`);
}
const hostButtonPayload = createButtonPayload({
  id: 'btn-1',
  color: difficultyModule.COLORS[2],
  shape: difficultyModule.SHAPES[2],
  number: 1
});
if (hostButtonPayload.label !== '黄色 正方形 01' || 'css' in hostButtonPayload.color) {
  failures.push(`Host button payload leaked presentation fields or lost its label: ${JSON.stringify(hostButtonPayload)}`);
}
const combatPayload = createCombatPayload(getCombatSummary(firstCombatHit.combat));
const comboPayload = createComboPayload(createComboState({ streak: 3 }));
const bossDamagePayload = createBossDamagePayload({
  damage: firstCombatHit.damage,
  combat: combatPayload,
  combo: comboPayload,
  round: hostRoundPayload
});
if (!isJsonSafeValue(bossDamagePayload) || bossDamagePayload.damage.appliedDamage !== 24 || bossDamagePayload.combo.multiplierLabel !== 'x1.1') {
  failures.push(`Boss damage payload smoke failed: ${JSON.stringify(bossDamagePayload)}`);
}
const victoryPayload = createRunResultPayload({
  result: 'victory',
  reason: 'boss_defeated',
  recap: { result: 'victory', ok: true },
  combat: combatPayload,
  combo: comboPayload
});
if (!isJsonSafeValue(victoryPayload) || victoryPayload.result !== 'victory' || victoryPayload.reason !== 'boss_defeated') {
  failures.push(`Run victory payload smoke failed: ${JSON.stringify(victoryPayload)}`);
}

const noopBridge = createNoopHostBridge();
const noopResult = noopBridge.emit(hostEvent);
if (!noopResult.accepted || noopBridge.getEvents().length !== 0) {
  failures.push(`No-op host bridge did not accept without capture: ${JSON.stringify(noopResult)}`);
}
const captureBridge = createCaptureHostBridge();
captureBridge.emit(hostEvent);
if (captureBridge.getEvents().length !== 1 || captureBridge.getEvents()[0].type !== HOST_EVENT_TYPES.ROUND_STARTED) {
  failures.push(`Capture host bridge did not retain a cloned event: ${JSON.stringify(captureBridge.getEvents())}`);
}
captureBridge.clearEvents();
if (captureBridge.getEvents().length !== 0) {
  failures.push('Capture host bridge clearEvents failed.');
}
const invalidSinkBridge = createBrowserHostBridge({ sink: { nope: true } });
const invalidSinkResult = invalidSinkBridge.emit(hostEvent);
if (invalidSinkResult.accepted || invalidSinkResult.reason !== 'invalid_sink') {
  failures.push(`Browser host bridge did not isolate incompatible sink state: ${JSON.stringify(invalidSinkResult)}`);
}
const browserDispatches = [];
const eventWindow = {
  CustomEvent: class CustomEvent {
    constructor(name, init) {
      this.name = name;
      this.detail = init.detail;
    }
  },
  dispatchEvent(event) {
    browserDispatches.push(event);
  }
};
const dispatchBridge = createBrowserHostBridge({
  window: eventWindow,
  dispatchBrowserEvent: true,
  eventName: 'thatbutton:test'
});
dispatchBridge.emit(hostEvent);
if (browserDispatches.length !== 1 || browserDispatches[0].name !== 'thatbutton:test' || browserDispatches[0].detail.type !== HOST_EVENT_TYPES.ROUND_STARTED) {
  failures.push(`Browser host bridge dispatch smoke failed: ${JSON.stringify(browserDispatches)}`);
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
  random: () => 0.5,
  hostBridge: createCaptureHostBridge()
});
app.init();
if (app.hostBridge.getEvents()[0]?.type !== HOST_EVENT_TYPES.HOST_BRIDGE_READY) {
  failures.push(`App did not emit host bridge ready during init: ${JSON.stringify(app.hostBridge.getEvents())}`);
}
if (typeof app.press !== 'function' || typeof app.getSnapshot !== 'function' || typeof fakeWindow.__THAT_BUTTON_HOST__?.press !== 'function') {
  failures.push('Host-facing input API is missing from app boundary or browser window.');
}

const debugApi = fakeWindow.__THAT_BUTTON_DEBUG__;
const requiredDebugHelpers = [
  'previewSeededLevel',
  'previewFailureRecap',
  'getDifficultyForLevel',
  'getLastFailureRecap',
  'getLastVictoryRecap',
  'getLastRunResultRecap',
  'previewCombatRoundClear',
  'getCombatState',
  'getComboState',
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

const hostSmokeStorage = fakeStorage();
const hostSmokeBridge = createCaptureHostBridge();
const hostSmokeWindow = {
  location: { search: '?seed=phase3a-baseline' },
  AudioContext: FakeAudioContext,
  webkitAudioContext: FakeAudioContext,
  localStorage: hostSmokeStorage
};
const hostSmokeApp = mainModule.createApp({
  window: hostSmokeWindow,
  document: fakeDocument,
  performance: { now: () => 2000 },
  requestAnimationFrame: () => 0,
  setTimeout: () => 0,
  clearTimeout: () => {},
  random: () => 0.5,
  hostBridge: hostSmokeBridge
});
hostSmokeApp.init();
hostSmokeApp.start();
const firstSnapshot = hostSmokeApp.getSnapshot();
if (firstSnapshot.status !== 'playing' || firstSnapshot.round.forbiddenIds || firstSnapshot.round.buttons.length !== 4) {
  failures.push(`Host snapshot shape changed: ${JSON.stringify(firstSnapshot)}`);
}
const safePress = hostSmokeApp.press('btn-0');
if (!safePress.accepted || safePress.result !== 'safe' || hostSmokeApp.getSnapshot().run.score !== 10) {
  failures.push(`Host safe press did not reuse gameplay scoring: ${JSON.stringify(safePress)}`);
}
if (hostSmokeApp.getSnapshot().combo.streak !== 1) {
  failures.push(`Host safe press did not update combo state: ${JSON.stringify(hostSmokeApp.getSnapshot().combo)}`);
}
const repeatPress = hostSmokeApp.press('btn-0');
if (repeatPress.accepted || repeatPress.reason !== 'already_pressed') {
  failures.push(`Host repeat press should be rejected by shared input state: ${JSON.stringify(repeatPress)}`);
}
const fatalPress = hostSmokeApp.press('btn-1');
if (!fatalPress.accepted || fatalPress.result !== 'fatal' || hostSmokeApp.getSnapshot().status !== 'finished') {
  failures.push(`Host fatal press did not finish the run: ${JSON.stringify(fatalPress)}`);
}
const hostEventTypes = hostSmokeBridge.getEvents().map((event) => event.type);
for (const requiredType of [
  HOST_EVENT_TYPES.HOST_BRIDGE_READY,
  HOST_EVENT_TYPES.RUN_STARTED,
  HOST_EVENT_TYPES.COMBAT_STARTED,
  HOST_EVENT_TYPES.ROUND_STARTED,
  HOST_EVENT_TYPES.BUTTON_PRESSED,
  HOST_EVENT_TYPES.SAFE_BUTTON_CLEARED,
  HOST_EVENT_TYPES.SCORE_CHANGED,
  HOST_EVENT_TYPES.COMBO_CHANGED,
  HOST_EVENT_TYPES.RUN_FINISHED,
  HOST_EVENT_TYPES.BEST_RECORD_CHANGED
]) {
  if (!hostEventTypes.includes(requiredType)) {
    failures.push(`Host event capture smoke missed ${requiredType}: ${JSON.stringify(hostEventTypes)}`);
  }
}
const runFinishedEvent = hostSmokeBridge.getEvents().find((event) => event.type === HOST_EVENT_TYPES.RUN_FINISHED);
if (runFinishedEvent?.payload?.recap?.pressedButton?.id !== 'btn-1') {
  failures.push(`Host run_finished event lost fatal recap facts: ${JSON.stringify(runFinishedEvent)}`);
}
if (!isJsonSafeValue(hostSmokeBridge.getEvents())) {
  failures.push('Captured host event sequence is not JSON-safe.');
}

const victoryBridge = createCaptureHostBridge();
const victoryWindow = {
  location: { search: '?seed=phase3a-baseline' },
  AudioContext: FakeAudioContext,
  webkitAudioContext: FakeAudioContext,
  localStorage: fakeStorage()
};
const victoryApp = mainModule.createApp({
  window: victoryWindow,
  document: fakeDocument,
  performance: { now: () => 3000 },
  requestAnimationFrame: () => 0,
  setTimeout: (callback) => {
    if (typeof callback === 'function') callback();
    return 0;
  },
  clearTimeout: () => {},
  random: () => 0.5,
  hostBridge: victoryBridge
});
victoryApp.init();
victoryApp.start();
for (let guard = 0; guard < 26 && victoryApp.getSnapshot().status === 'playing'; guard++) {
  const state = victoryApp.getState();
  const safeIds = state.buttons
    .filter((button) => !state.forbiddenIds.includes(button.id) && !button.isClicked)
    .map((button) => button.id);
  safeIds.forEach((buttonId) => victoryApp.press(buttonId));
}
const victorySnapshot = victoryApp.getSnapshot();
if (victorySnapshot.status !== 'finished' || victorySnapshot.lastVictoryRecap?.result !== 'victory' || victorySnapshot.combat.status !== 'defeated') {
  failures.push(`Fixed-seed boss defeat path failed: ${JSON.stringify(victorySnapshot)}`);
}
if (victorySnapshot.combat.defeatedAtLevel < 18 || victorySnapshot.combat.roundsCleared < 18) {
  failures.push(`Boss encounter ends before 3x3 has room to develop: ${JSON.stringify(victorySnapshot.combat)}`);
}
const victoryEventTypes = victoryBridge.getEvents().map((event) => event.type);
for (const requiredType of [
  HOST_EVENT_TYPES.BOSS_DAMAGED,
  HOST_EVENT_TYPES.BOSS_DEFEATED,
  HOST_EVENT_TYPES.RUN_FINISHED
]) {
  if (!victoryEventTypes.includes(requiredType)) {
    failures.push(`Victory host event smoke missed ${requiredType}: ${JSON.stringify(victoryEventTypes)}`);
  }
}
const victoryFinishedEvent = victoryBridge.getEvents().find((event) =>
  event.type === HOST_EVENT_TYPES.RUN_FINISHED && event.payload.result === 'victory'
);
if (victoryFinishedEvent?.payload?.reason !== 'boss_defeated') {
  failures.push(`Victory run_finished event lost result facts: ${JSON.stringify(victoryFinishedEvent)}`);
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
  const debugCombatPreview = debugApi.previewCombatRoundClear({ timeLeftMs: 18000, streak: 3 });
  if (debugCombatPreview.damage.appliedDamage !== 24 || debugCombatPreview.combo.multiplierLabel !== 'x1.1') {
    failures.push(`Debug API combat preview changed: ${JSON.stringify(debugCombatPreview)}`);
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
