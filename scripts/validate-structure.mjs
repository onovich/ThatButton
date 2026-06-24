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
  'src/config/battle.js',
  'src/config/combat.js',
  'src/config/upgrades.js',
  'src/core/app-state.js',
  'src/core/battle.js',
  'src/core/combat.js',
  'src/core/combo.js',
  'src/core/encounter.js',
  'src/core/enemy.js',
  'src/core/player.js',
  'src/core/upgrades.js',
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
  'id="player-hud"',
  'id="player-hp-text"',
  'id="player-hp-bar"',
  'id="enemy-attack-text"',
  'id="player-damage-text"',
  'id="combo-status-text"',
  'id="combo-window-bar"',
  'id="combo-reward-text"',
  'id="combo-particle-layer"',
  'id="upgrade-screen"',
  'id="upgrade-choice-list"',
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
for (const marker of ['NEW BEST', 'MATCHED BEST', 'previewFailureRecap', 'getBestRecord', 'updateCombatStatus', 'showComboReward', 'showSafePressFeedback', 'showWrongPressFeedback', 'showUpgradeScreen', 'hideUpgradeScreen', 'selectUpgrade', 'updateComboWindow', 'spawnComboParticles', 'MAX COMBO', 'showBossHit', 'showPlayerHit', 'spawnBossProjectile', 'playError', 'playChainReady', 'playComboCue']) {
  if (!combinedRuntimeSource.includes(marker)) {
    failures.push(`Missing required runtime marker in modules: ${marker}`);
  }
}

for (const marker of ['id="boss-avatar"', '.battle-stage', '.player-hud', '.command-panel', '.upgrade-screen', '.upgrade-card', '.boss-avatar-shell', '.boss-damage-text', '.boss-projectile', 'grid-template-areas:', '"avatar label combo"', '"avatar hp attack"', '.combat-hp-bar', '.player-hp-bar', '.enemy-attack-text', '.player-damage-text', '@keyframes player-damage-pop', 'display: block;', 'id="combo-window-bar"', '.combo-window-bar', 'id="combo-reward-text"', 'id="combo-particle-layer"', '.combo-reward-text', '.combo-stage-two', '.combo-stage-high', '.combo-particle', '.button-float-text', '.safe-success', '.chain-start', '.wrong-press-flash', '.combo-shake-strong', '@keyframes boss-projectile-flight', '@keyframes combo-reward-pop', '@keyframes combo-particle-burst', '@media (max-width: 520px)']) {
  if (!html.includes(marker)) {
    failures.push(`Missing combat mobile layout marker in index.html: ${marker}`);
  }
}

const combatStatusIndex = html.indexOf('id="combat-status"');
const playerHudIndex = html.indexOf('id="player-hud"');
if (combatStatusIndex < 0 || playerHudIndex < 0 || playerHudIndex <= combatStatusIndex) {
  failures.push('Player HUD should appear after the enemy combat-status area.');
}
const enemyIdentitySnippet = html.slice(combatStatusIndex, playerHudIndex);
for (const playerOwnedMarker of ['id="player-hp-text"', 'id="player-hp-bar"', 'id="player-damage-text"']) {
  if (enemyIdentitySnippet.includes(playerOwnedMarker)) {
    failures.push(`Player-owned marker is still inside the enemy combat-status area: ${playerOwnedMarker}`);
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
  'src/config/battle.js',
  'src/config/combat.js',
  'src/config/upgrades.js',
  'src/core/app-state.js',
  'src/core/battle.js',
  'src/core/combat.js',
  'src/core/combo.js',
  'src/core/encounter.js',
  'src/core/enemy.js',
  'src/core/player.js',
  'src/core/upgrades.js',
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
  battleConfigModule,
  battleModule,
  combatConfigModule,
  combatModule,
  comboModule,
  debugModule,
  enemyModule,
  playerModule,
  rngModule,
  upgradeConfigModule,
  upgradeModule,
  storageModule,
  recapModule,
  hostEventsModule,
  hostBridgeModule,
  mainModule
] = await Promise.all([
  import(moduleUrl('src/config/difficulty.js')),
  import(moduleUrl('src/config/battle.js')),
  import(moduleUrl('src/core/battle.js')),
  import(moduleUrl('src/config/combat.js')),
  import(moduleUrl('src/core/combat.js')),
  import(moduleUrl('src/core/combo.js')),
  import(moduleUrl('src/core/debug.js')),
  import(moduleUrl('src/core/enemy.js')),
  import(moduleUrl('src/core/player.js')),
  import(moduleUrl('src/core/rng.js')),
  import(moduleUrl('src/config/upgrades.js')),
  import(moduleUrl('src/core/upgrades.js')),
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
  BASE_BATTLE_CONFIG
} = battleConfigModule;
const {
  calculatePlayerAttackDamage,
  calculateWrongPressDamage,
  resolveWrongPressDamage
} = battleModule;
const {
  COMBO_DAMAGE_PER_CHAIN,
  COMBO_MAX_DAMAGE_BONUS,
  PROTOTYPE_BOSS_CONFIG,
  COMBO_MAX_STREAK
} = combatConfigModule;
const {
  applyRoundClearDamage,
  calculateRoundDamage,
  createCombatState,
  createNextCombatState,
  getCombatSummary
} = combatModule;
const {
  createComboState,
  expireComboIfNeeded,
  getComboWindowFacts,
  getComboWindowRemaining,
  getComboSummary,
  incrementCombo,
  resetCombo
} = comboModule;
const {
  applyEnemyDamage,
  calculateEnemyAttack,
  calculateEnemyMaxHp,
  createEnemyState,
  createNextEnemyState,
  getEnemySummary
} = enemyModule;
const {
  applyMaxHpChange,
  applyPlayerDamage,
  createPlayerState,
  getPlayerSummary
} = playerModule;
const {
  createSeededRng
} = rngModule;
const {
  UPGRADE_DEFINITIONS,
  UPGRADE_TYPES
} = upgradeConfigModule;
const {
  applyUpgradeChoice,
  createUpgradeState,
  generateUpgradeChoices,
  getEffectiveBaseAttack,
  getEffectiveComboRewardBonus,
  getEffectiveComboWindowMs,
  getEffectiveRoundTimeLimitMs,
  getUpgradeSummary
} = upgradeModule;
const {
  previewSeededLevel,
  previewFailureRecap,
  previewComboWindow,
  previewUpgradeApplication,
  previewUpgradeChoices,
  previewEnemyScaling,
  previewPlayerDamage
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
  createPlayerDamagePayload,
  createPlayerPayload,
  createUpgradePayload,
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

const initialPlayer = createPlayerState();
if (
  BASE_BATTLE_CONFIG.playerMaxHp !== 100 ||
  BASE_BATTLE_CONFIG.wrongPressDamage !== 18 ||
  initialPlayer.hp !== 100 ||
  initialPlayer.maxHp !== 100 ||
  initialPlayer.status !== 'active'
) {
  failures.push(`Initial player state changed: ${JSON.stringify({ config: BASE_BATTLE_CONFIG, initialPlayer })}`);
}
const playerDamageResult = applyPlayerDamage(initialPlayer, {
  amount: 18,
  enemyAttack: 18,
  source: 'wrong_press',
  level: 3,
  buttonId: 'btn-1'
});
if (
  playerDamageResult.damage.appliedDamage !== 18 ||
  playerDamageResult.damage.hpBefore !== 100 ||
  playerDamageResult.damage.hpAfter !== 82 ||
  playerDamageResult.player.hp !== 82 ||
  playerDamageResult.player.status !== 'active' ||
  playerDamageResult.defeated
) {
  failures.push(`Player damage smoke failed: ${JSON.stringify(playerDamageResult)}`);
}
const lethalPlayerDamage = resolveWrongPressDamage({
  player: createPlayerState({ hp: 12, maxHp: 100 }),
  enemyAttack: 18,
  level: 4,
  buttonId: 'btn-1'
});
if (
  calculateWrongPressDamage({ enemyAttack: 18 }) !== 18 ||
  lethalPlayerDamage.player.hp !== 0 ||
  lethalPlayerDamage.player.status !== 'defeated' ||
  !lethalPlayerDamage.defeated
) {
  failures.push(`Lethal wrong-press damage smoke failed: ${JSON.stringify(lethalPlayerDamage)}`);
}
const maxHpUpgradeSmoke = applyMaxHpChange(playerDamageResult.player, { amount: 24 }).player;
if (maxHpUpgradeSmoke.maxHp !== 124 || maxHpUpgradeSmoke.hp !== 106 || maxHpUpgradeSmoke.status !== 'active') {
  failures.push(`Player max-HP change smoke failed: ${JSON.stringify(maxHpUpgradeSmoke)}`);
}
const playerAttackDamage = calculatePlayerAttackDamage({
  baseAttack: 18,
  combo: createComboState({ streak: 3 })
});
if (playerAttackDamage.baseDamage !== 18 || playerAttackDamage.comboBonus !== 2 || playerAttackDamage.totalDamage !== 20) {
  failures.push(`Player attack damage smoke failed: ${JSON.stringify(playerAttackDamage)}`);
}
const playerPayload = createPlayerPayload(getPlayerSummary(playerDamageResult.player));
if (!isJsonSafeValue(playerPayload) || playerPayload.hp !== 82 || playerPayload.hpPercent !== 82) {
  failures.push(`Player payload smoke failed: ${JSON.stringify(playerPayload)}`);
}
const playerDamagePayload = createPlayerDamagePayload({
  damage: playerDamageResult.damage,
  player: playerPayload,
  combo: createComboState(),
  round: null
});
if (!isJsonSafeValue(playerDamagePayload) || playerDamagePayload.damage.appliedDamage !== 18 || playerDamagePayload.player.hp !== 82) {
  failures.push(`Player damage payload smoke failed: ${JSON.stringify(playerDamagePayload)}`);
}

const initialUpgrades = createUpgradeState();
if (
  UPGRADE_DEFINITIONS.length !== 5 ||
  !Object.values(UPGRADE_TYPES).includes('combo_window') ||
  initialUpgrades.pending ||
  initialUpgrades.applied.length !== 0 ||
  initialUpgrades.choices.length !== 0 ||
  initialUpgrades.modifiers.comboWindowBonusMs !== 0
) {
  failures.push(`Initial upgrade state smoke failed: ${JSON.stringify({ UPGRADE_DEFINITIONS, UPGRADE_TYPES, initialUpgrades })}`);
}
const fixedUpgradeChoicesA = generateUpgradeChoices({
  rng: createSeededRng('phase6-upgrades'),
  enemyIndex: 2
});
const fixedUpgradeChoicesB = generateUpgradeChoices({
  rng: createSeededRng('phase6-upgrades'),
  enemyIndex: 2
});
if (
  fixedUpgradeChoicesA.length !== 3 ||
  JSON.stringify(fixedUpgradeChoicesA) !== JSON.stringify(fixedUpgradeChoicesB) ||
  new Set(fixedUpgradeChoicesA.map((choice) => choice.id)).size !== 3 ||
  fixedUpgradeChoicesA.some((choice) => choice.enemyIndex !== 2)
) {
  failures.push(`Deterministic upgrade choices smoke failed: ${JSON.stringify({ fixedUpgradeChoicesA, fixedUpgradeChoicesB })}`);
}
const comboWindowUpgrade = applyUpgradeChoice(initialUpgrades, 'chain-span-plus').upgrades;
if (getEffectiveComboWindowMs(comboWindowUpgrade) !== 2900 || comboWindowUpgrade.modifiers.comboWindowBonusMs !== 500) {
  failures.push(`Combo-window upgrade smoke failed: ${JSON.stringify(comboWindowUpgrade)}`);
}
const hpUpgrade = applyUpgradeChoice(initialUpgrades, 'max-hp-plus', {
  player: createPlayerState({ hp: 80, maxHp: 100 })
});
if (
  hpUpgrade.upgrades.modifiers.maxHpBonus !== 24 ||
  hpUpgrade.player.maxHp !== 124 ||
  hpUpgrade.player.hp !== 104
) {
  failures.push(`Max-HP upgrade smoke failed: ${JSON.stringify(hpUpgrade)}`);
}
const roundTimeUpgrade = applyUpgradeChoice(initialUpgrades, 'round-time-plus').upgrades;
if (getEffectiveRoundTimeLimitMs(level1.timeLimitMs, roundTimeUpgrade) !== 19200) {
  failures.push(`Round-time upgrade smoke failed: ${JSON.stringify(roundTimeUpgrade)}`);
}
const baseAttackUpgrade = applyUpgradeChoice(initialUpgrades, 'base-attack-plus').upgrades;
if (
  getEffectiveBaseAttack(18, baseAttackUpgrade) !== 22 ||
  calculatePlayerAttackDamage({ baseAttack: 18, combo: createComboState({ streak: 1 }), upgrades: baseAttackUpgrade }).baseDamage !== 22
) {
  failures.push(`Base-attack upgrade smoke failed: ${JSON.stringify(baseAttackUpgrade)}`);
}
const comboRewardUpgrade = applyUpgradeChoice(initialUpgrades, 'combo-reward-plus').upgrades;
const upgradedComboDamage = calculateRoundDamage({
  timeLeftMs: 0,
  comboState: createComboState({ streak: 2 }),
  upgrades: comboRewardUpgrade
});
if (
  getEffectiveComboRewardBonus(comboRewardUpgrade) !== 1 ||
  upgradedComboDamage.comboBonus !== 2 ||
  upgradedComboDamage.totalDamage !== 20
) {
  failures.push(`Combo-reward upgrade smoke failed: ${JSON.stringify({ comboRewardUpgrade, upgradedComboDamage })}`);
}
const upgradePayload = createUpgradePayload(getUpgradeSummary(comboWindowUpgrade));
if (!isJsonSafeValue(upgradePayload) || upgradePayload.modifiers.comboWindowBonusMs !== 500) {
  failures.push(`Upgrade payload smoke failed: ${JSON.stringify(upgradePayload)}`);
}

const firstEnemy = createEnemyState({ enemyIndex: 1 });
const secondEnemy = createEnemyState({ enemyIndex: 2 });
if (
  calculateEnemyMaxHp(1) !== 540 ||
  calculateEnemyMaxHp(2) !== 660 ||
  calculateEnemyAttack(1) !== 18 ||
  calculateEnemyAttack(2) !== 24 ||
  firstEnemy.hp !== 540 ||
  firstEnemy.attack !== 18 ||
  secondEnemy.hp !== 660 ||
  secondEnemy.attack !== 24
) {
  failures.push(`Enemy scaling smoke failed: ${JSON.stringify({ firstEnemy, secondEnemy })}`);
}
const secondEnemyHit = applyEnemyDamage(secondEnemy, { amount: 30, level: 2 });
if (
  secondEnemyHit.enemy.enemyIndex !== 2 ||
  secondEnemyHit.enemy.hp !== 630 ||
  secondEnemyHit.enemy.attack !== 24 ||
  secondEnemyHit.damage.appliedDamage !== 30 ||
  secondEnemyHit.defeated
) {
  failures.push(`Enemy damage should preserve stable attack while alive: ${JSON.stringify(secondEnemyHit)}`);
}
const thirdEnemy = createNextEnemyState(secondEnemyHit.enemy);
if (thirdEnemy.enemyIndex !== 3 || thirdEnemy.maxHp !== 780 || thirdEnemy.attack !== 30) {
  failures.push(`Next enemy scaling smoke failed: ${JSON.stringify(thirdEnemy)}`);
}
const enemySummary = getEnemySummary(secondEnemyHit.enemy);
if (enemySummary.hpPercent !== 95 || enemySummary.attack !== 24 || enemySummary.enemyIndex !== 2) {
  failures.push(`Enemy summary smoke failed: ${JSON.stringify(enemySummary)}`);
}

const initialCombo = createComboState();
if (
  COMBO_MAX_STREAK !== 12 ||
  COMBO_DAMAGE_PER_CHAIN !== 1 ||
  COMBO_MAX_DAMAGE_BONUS !== 8 ||
  initialCombo.streak !== 0 ||
  initialCombo.chainCount !== 0 ||
  initialCombo.comboText !== '' ||
  initialCombo.statusText !== 'CHAIN --' ||
  initialCombo.hasVisibleCombo ||
  initialCombo.rewardText !== '' ||
  initialCombo.damageBonus !== 0 ||
  initialCombo.comboWindowMs !== BASE_BATTLE_CONFIG.comboWindowMs ||
  initialCombo.expiresAtMs !== null ||
  initialCombo.remainingMs !== 0 ||
  initialCombo.isWindowActive
) {
  failures.push(`Initial combo state changed: ${JSON.stringify(initialCombo)}`);
}
const firstComboPress = incrementCombo(initialCombo, 'safe_press').combo;
if (
  firstComboPress.streak !== 1 ||
  firstComboPress.chainCount !== 1 ||
  firstComboPress.comboText !== '' ||
  firstComboPress.statusText !== 'CHAIN READY' ||
  firstComboPress.hasVisibleCombo ||
  firstComboPress.rewardText !== '' ||
  firstComboPress.damageBonus !== 0
) {
  failures.push(`First safe press should start a silent chain: ${JSON.stringify(firstComboPress)}`);
}
const secondComboPress = incrementCombo(firstComboPress, 'safe_press').combo;
if (
  secondComboPress.streak !== 2 ||
  secondComboPress.chainCount !== 2 ||
  secondComboPress.comboText !== 'COMBO x2' ||
  secondComboPress.statusText !== 'COMBO x2' ||
  !secondComboPress.hasVisibleCombo ||
  secondComboPress.rewardText !== 'DMG +1' ||
  secondComboPress.damageBonus !== 1
) {
  failures.push(`Second safe press should show COMBO x2 with separate damage reward: ${JSON.stringify(secondComboPress)}`);
}
const thirdComboPress = incrementCombo(secondComboPress, 'safe_press').combo;
if (
  thirdComboPress.streak !== 3 ||
  thirdComboPress.comboText !== 'COMBO x3' ||
  thirdComboPress.rewardText !== 'DMG +2' ||
  thirdComboPress.damageBonus !== 2
) {
  failures.push(`Later chained safe presses should increment visible chain count by one: ${JSON.stringify(thirdComboPress)}`);
}
let comboState = initialCombo;
for (let pressIndex = 0; pressIndex < 13; pressIndex++) {
  comboState = incrementCombo(comboState, 'safe_press').combo;
}
if (
  comboState.streak !== 12 ||
  comboState.chainCount !== 12 ||
  !comboState.isCapped ||
  comboState.comboText !== 'COMBO x12' ||
  comboState.rewardText !== 'DMG +8' ||
  comboState.damageBonus !== 8
) {
  failures.push(`Combo cap/tier smoke failed: ${JSON.stringify(comboState)}`);
}
const comboReset = resetCombo(comboState, 'fatal_press').combo;
if (
  comboReset.streak !== 0 ||
  comboReset.chainCount !== 0 ||
  comboReset.comboText !== '' ||
  comboReset.statusText !== 'CHAIN --' ||
  comboReset.lastChangeReason !== 'fatal_press' ||
  comboReset.damageBonus !== 0
) {
  failures.push(`Combo reset smoke failed: ${JSON.stringify(comboReset)}`);
}
if (JSON.stringify(getComboSummary(comboState)) !== JSON.stringify(comboState)) {
  failures.push('Combo summary should be a stable plain-data clone.');
}
const timedFirstCombo = incrementCombo(initialCombo, 'safe_press', { atMs: 1000 }).combo;
if (
  timedFirstCombo.streak !== 1 ||
  timedFirstCombo.comboText !== '' ||
  timedFirstCombo.statusText !== 'CHAIN READY' ||
  timedFirstCombo.expiresAtMs !== 3400 ||
  timedFirstCombo.remainingMs !== 2400 ||
  !timedFirstCombo.isWindowActive
) {
  failures.push(`Timed first safe press should arm a silent combo window: ${JSON.stringify(timedFirstCombo)}`);
}
const timedSecondCombo = incrementCombo(timedFirstCombo, 'safe_press', { atMs: 1800 }).combo;
const timedSecondWindowFacts = getComboWindowFacts(timedSecondCombo, 3000);
if (
  timedSecondCombo.streak !== 2 ||
  timedSecondCombo.comboText !== 'COMBO x2' ||
  timedSecondCombo.rewardText !== 'DMG +1' ||
  timedSecondCombo.expiresAtMs !== 4200 ||
  timedSecondCombo.remainingMs !== 2400 ||
  getComboWindowRemaining(timedSecondCombo, 3000) !== 1200 ||
  timedSecondWindowFacts.remainingMs !== 1200 ||
  timedSecondWindowFacts.remainingPercent !== 50 ||
  !timedSecondWindowFacts.isWindowActive ||
  timedSecondWindowFacts.isExpiring
) {
  failures.push(`Timed second safe press should refresh a visible combo window: ${JSON.stringify({ timedSecondCombo, timedSecondWindowFacts })}`);
}
const expiringWindowFacts = getComboWindowFacts(timedSecondCombo, 3900);
if (expiringWindowFacts.remainingPercent !== 13 || !expiringWindowFacts.isExpiring) {
  failures.push(`Combo-window facts should flag expiring state: ${JSON.stringify(expiringWindowFacts)}`);
}
const activeComboWindow = expireComboIfNeeded(timedSecondCombo, 4200);
if (activeComboWindow.expired || activeComboWindow.combo.streak !== 2) {
  failures.push(`Combo window should still be active exactly at expiry time: ${JSON.stringify(activeComboWindow)}`);
}
const expiredComboWindow = expireComboIfNeeded(timedSecondCombo, 4201);
if (
  !expiredComboWindow.expired ||
  expiredComboWindow.combo.streak !== 0 ||
  expiredComboWindow.combo.statusText !== 'CHAIN --' ||
  expiredComboWindow.combo.lastExpiredAtMs !== 4201 ||
  expiredComboWindow.combo.lastChangeReason !== 'combo_expired'
) {
  failures.push(`Combo expiry should reset the chain with explicit expiry facts: ${JSON.stringify(expiredComboWindow)}`);
}
const restartedAfterExpiry = incrementCombo(timedSecondCombo, 'safe_press', { atMs: 4300 });
if (
  !restartedAfterExpiry.expired ||
  restartedAfterExpiry.combo.streak !== 1 ||
  restartedAfterExpiry.combo.comboText !== '' ||
  restartedAfterExpiry.combo.statusText !== 'CHAIN READY' ||
  restartedAfterExpiry.combo.expiresAtMs !== 6700 ||
  restartedAfterExpiry.combo.remainingMs !== 2400 ||
  restartedAfterExpiry.combo.lastExpiredAtMs !== 4300
) {
  failures.push(`Safe press after combo expiry should restart as a silent first press: ${JSON.stringify(restartedAfterExpiry)}`);
}

const initialCombat = createCombatState();
if (
  PROTOTYPE_BOSS_CONFIG.maxHp !== 540 ||
  initialCombat.enemyIndex !== 1 ||
  initialCombat.enemyId !== 'reactor-warden-1' ||
  initialCombat.enemyName !== 'REACTOR WARDEN' ||
  initialCombat.attack !== 18 ||
  initialCombat.bossId !== 'reactor-warden' ||
  initialCombat.hp !== 540 ||
  initialCombat.status !== 'active'
) {
  failures.push(`Initial combat state changed: ${JSON.stringify(initialCombat)}`);
}
const nextCombat = createNextCombatState(initialCombat);
if (
  nextCombat.enemyIndex !== 2 ||
  nextCombat.maxHp !== 660 ||
  nextCombat.attack !== 24 ||
  nextCombat.status !== 'active'
) {
  failures.push(`Next combat state scaling failed: ${JSON.stringify(nextCombat)}`);
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
if (firstCombatHit.damage.appliedDamage !== 24 || firstCombatHit.damage.enemyAttack !== 18 || firstCombatHit.combat.hp !== 516 || firstCombatHit.combat.attack !== 18 || firstCombatHit.defeated) {
  failures.push(`Combat damage application smoke failed: ${JSON.stringify(firstCombatHit)}`);
}
let defeatCombat = createCombatState();
for (let level = 1; level <= 18; level++) {
  defeatCombat = applyRoundClearDamage(defeatCombat, {
    level,
    timeLeftMs: 18000,
    comboState: createComboState({ streak: 12 })
  }).combat;
}
const defeatSummary = getCombatSummary(defeatCombat);
if (defeatSummary.status !== 'defeated' || defeatSummary.hp !== 0 || defeatSummary.defeatedAtLevel !== 18 || defeatSummary.roundsCleared !== 18) {
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
if (
  !isJsonSafeValue(bossDamagePayload) ||
  bossDamagePayload.damage.appliedDamage !== 24 ||
  bossDamagePayload.combo.comboText !== 'COMBO x3' ||
  bossDamagePayload.combo.rewardText !== 'DMG +2'
) {
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
if (
  typeof app.press !== 'function' ||
  typeof app.selectUpgrade !== 'function' ||
  typeof app.getSnapshot !== 'function' ||
  typeof fakeWindow.__THAT_BUTTON_HOST__?.press !== 'function' ||
  typeof fakeWindow.__THAT_BUTTON_HOST__?.selectUpgrade !== 'function'
) {
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
  'previewPlayerDamage',
  'previewEnemyScaling',
  'previewComboWindow',
  'previewUpgradeChoices',
  'previewUpgradeApplication',
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
if (
  firstSnapshot.player?.hp !== 100 ||
  firstSnapshot.player?.maxHp !== 100 ||
  firstSnapshot.round.player?.hp !== 100
) {
  failures.push(`Host snapshot missing player facts: ${JSON.stringify(firstSnapshot.player)}`);
}
if (
  firstSnapshot.combat?.enemyIndex !== 1 ||
  firstSnapshot.combat?.attack !== 18 ||
  firstSnapshot.round.combat?.attack !== 18
) {
  failures.push(`Host snapshot missing enemy scaling facts: ${JSON.stringify(firstSnapshot.combat)}`);
}
if (
  firstSnapshot.combo?.comboWindowMs !== BASE_BATTLE_CONFIG.comboWindowMs ||
  firstSnapshot.round.combo?.statusText !== 'CHAIN --'
) {
  failures.push(`Host snapshot missing combo-window facts: ${JSON.stringify(firstSnapshot.combo)}`);
}
if (
  firstSnapshot.upgrades?.pending ||
  firstSnapshot.upgrades?.applied?.length !== 0 ||
  firstSnapshot.round.upgrades?.modifiers?.baseAttackBonus !== 0
) {
  failures.push(`Host snapshot missing initial upgrade facts: ${JSON.stringify(firstSnapshot.upgrades)}`);
}
const safePress = hostSmokeApp.press('btn-0');
if (!safePress.accepted || safePress.result !== 'safe' || hostSmokeApp.getSnapshot().run.score !== 10) {
  failures.push(`Host safe press did not reuse gameplay scoring: ${JSON.stringify(safePress)}`);
}
if (
  hostSmokeApp.getSnapshot().combo.streak !== 1 ||
  hostSmokeApp.getSnapshot().combo.comboText !== '' ||
  hostSmokeApp.getSnapshot().combo.statusText !== 'CHAIN READY' ||
  hostSmokeApp.getSnapshot().combo.hasVisibleCombo ||
  hostSmokeApp.getSnapshot().combo.expiresAtMs !== 4400 ||
  hostSmokeApp.getSnapshot().combo.remainingMs !== 2400
) {
  failures.push(`First host safe press should start a silent chain: ${JSON.stringify(hostSmokeApp.getSnapshot().combo)}`);
}
const repeatPress = hostSmokeApp.press('btn-0');
if (repeatPress.accepted || repeatPress.reason !== 'already_pressed') {
  failures.push(`Host repeat press should be rejected by shared input state: ${JSON.stringify(repeatPress)}`);
}
const secondSafePress = hostSmokeApp.press('btn-2');
if (
  !secondSafePress.accepted ||
  secondSafePress.result !== 'safe' ||
  hostSmokeApp.getSnapshot().run.score !== 20 ||
  hostSmokeApp.getSnapshot().combo.comboText !== 'COMBO x2' ||
  hostSmokeApp.getSnapshot().combo.rewardText !== 'DMG +1'
) {
  failures.push(`Second host safe press should expose COMBO x2: ${JSON.stringify({ secondSafePress, combo: hostSmokeApp.getSnapshot().combo })}`);
}
const fatalPress = hostSmokeApp.press('btn-1');
if (
  !fatalPress.accepted ||
  fatalPress.result !== 'fatal' ||
  fatalPress.playerDamage.appliedDamage !== 18 ||
  fatalPress.playerDefeated ||
  hostSmokeApp.getSnapshot().status !== 'playing' ||
  hostSmokeApp.getSnapshot().player.hp !== 82 ||
  hostSmokeApp.getSnapshot().combo.streak !== 0
) {
  failures.push(`Host wrong press should damage player, break combo, and continue while HP remains: ${JSON.stringify({ fatalPress, snapshot: hostSmokeApp.getSnapshot() })}`);
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
  HOST_EVENT_TYPES.PLAYER_DAMAGED
]) {
  if (!hostEventTypes.includes(requiredType)) {
    failures.push(`Host event capture smoke missed ${requiredType}: ${JSON.stringify(hostEventTypes)}`);
  }
}
if (!isJsonSafeValue(hostSmokeBridge.getEvents())) {
  failures.push('Captured host event sequence is not JSON-safe.');
}

const lethalBridge = createCaptureHostBridge();
const lethalWindow = {
  location: { search: '?seed=phase3a-baseline' },
  AudioContext: FakeAudioContext,
  webkitAudioContext: FakeAudioContext,
  localStorage: fakeStorage()
};
const lethalApp = mainModule.createApp({
  window: lethalWindow,
  document: fakeDocument,
  performance: { now: () => 2500 },
  requestAnimationFrame: () => 0,
  setTimeout: (callback) => {
    if (typeof callback === 'function') callback();
    return 0;
  },
  clearTimeout: () => {},
  random: () => 0.5,
  hostBridge: lethalBridge
});
lethalApp.init();
lethalApp.start();
lethalApp.getState().player.hp = 10;
const lethalPress = lethalApp.press('btn-1');
const lethalSnapshot = lethalApp.getSnapshot();
if (
  !lethalPress.accepted ||
  lethalPress.result !== 'fatal' ||
  !lethalPress.playerDefeated ||
  lethalSnapshot.status !== 'finished' ||
  lethalSnapshot.player.hp !== 0 ||
  lethalSnapshot.lastFailureRecap?.pressedButton?.id !== 'btn-1' ||
  lethalSnapshot.lastFailureRecap?.lastPlayerDamage?.appliedDamage !== 10
) {
  failures.push(`Lethal wrong press should finish the run with player damage recap facts: ${JSON.stringify({ lethalPress, lethalSnapshot })}`);
}
const lethalEventTypes = lethalBridge.getEvents().map((event) => event.type);
for (const requiredType of [
  HOST_EVENT_TYPES.PLAYER_DAMAGED,
  HOST_EVENT_TYPES.RUN_FINISHED
]) {
  if (!lethalEventTypes.includes(requiredType)) {
    failures.push(`Lethal wrong-press smoke missed ${requiredType}: ${JSON.stringify(lethalEventTypes)}`);
  }
}
const runFinishedEvent = lethalBridge.getEvents().find((event) => event.type === HOST_EVENT_TYPES.RUN_FINISHED);
if (runFinishedEvent?.payload?.recap?.pressedButton?.id !== 'btn-1') {
  failures.push(`Host run_finished event lost fatal recap facts: ${JSON.stringify(runFinishedEvent)}`);
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
if (
  victorySnapshot.status !== 'upgrade_pending' ||
  !victorySnapshot.upgrades.pending ||
  victorySnapshot.upgrades.choices.length !== 3 ||
  victorySnapshot.combat.status !== 'defeated'
) {
  failures.push(`Fixed-seed enemy defeat should pause for three upgrade choices: ${JSON.stringify(victorySnapshot)}`);
}
if (victorySnapshot.combat.defeatedAtLevel < 18 || victorySnapshot.combat.roundsCleared < 18) {
  failures.push(`First enemy encounter ends before 3x3 has room to develop: ${JSON.stringify(victorySnapshot.combat)}`);
}
const selectedUpgrade = victorySnapshot.upgrades.choices[0];
const upgradeSelection = victoryApp.selectUpgrade(selectedUpgrade.id);
const afterUpgradeSnapshot = victoryApp.getSnapshot();
if (
  !upgradeSelection.accepted ||
  afterUpgradeSnapshot.status !== 'playing' ||
  afterUpgradeSnapshot.upgrades.pending ||
  afterUpgradeSnapshot.upgrades.applied.length !== 1 ||
  afterUpgradeSnapshot.upgrades.applied[0].id !== selectedUpgrade.id ||
  afterUpgradeSnapshot.combat.enemyIndex !== 2 ||
  afterUpgradeSnapshot.combat.maxHp !== 660 ||
  afterUpgradeSnapshot.combat.attack !== 24 ||
  afterUpgradeSnapshot.round.level <= victorySnapshot.round.level
) {
  failures.push(`Upgrade selection should apply one upgrade and continue into stronger enemy 2: ${JSON.stringify({ selectedUpgrade, upgradeSelection, afterUpgradeSnapshot })}`);
}
const victoryEventTypes = victoryBridge.getEvents().map((event) => event.type);
for (const requiredType of [
  HOST_EVENT_TYPES.BOSS_DAMAGED,
  HOST_EVENT_TYPES.BOSS_DEFEATED
]) {
  if (!victoryEventTypes.includes(requiredType)) {
    failures.push(`Enemy-defeat host event smoke missed ${requiredType}: ${JSON.stringify(victoryEventTypes)}`);
  }
}
const unexpectedVictoryFinishedEvent = victoryBridge.getEvents().find((event) =>
  event.type === HOST_EVENT_TYPES.RUN_FINISHED && event.payload.result === 'victory'
);
if (unexpectedVictoryFinishedEvent) {
  failures.push(`Enemy defeat should offer upgrades instead of ending the run as victory: ${JSON.stringify(unexpectedVictoryFinishedEvent)}`);
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
  if (
    debugCombatPreview.damage.appliedDamage !== 24 ||
    debugCombatPreview.combo.comboText !== 'COMBO x3' ||
    debugCombatPreview.combo.rewardText !== 'DMG +2'
  ) {
    failures.push(`Debug API combat preview changed: ${JSON.stringify(debugCombatPreview)}`);
  }
  const debugPlayerDamage = debugApi.previewPlayerDamage({ hp: 20, maxHp: 100, enemyAttack: 18, level: 4, buttonId: 'btn-1' });
  if (
    debugPlayerDamage.damage.appliedDamage !== 18 ||
    debugPlayerDamage.player.hp !== 2 ||
    debugPlayerDamage.player.status !== 'active' ||
    debugPlayerDamage.defeated
  ) {
    failures.push(`Debug API player-damage preview changed: ${JSON.stringify(debugPlayerDamage)}`);
  }
  const debugSecondEnemy = debugApi.previewEnemyScaling(2);
  if (debugSecondEnemy.enemyIndex !== 2 || debugSecondEnemy.maxHp !== 660 || debugSecondEnemy.attack !== 24) {
    failures.push(`Debug API enemy-scaling preview changed: ${JSON.stringify(debugSecondEnemy)}`);
  }
  const debugComboWindow = debugApi.previewComboWindow();
  if (
    debugComboWindow.first.statusText !== 'CHAIN READY' ||
    debugComboWindow.second.comboText !== 'COMBO x2' ||
    debugComboWindow.expired.streak !== 0 ||
    debugComboWindow.restarted.statusText !== 'CHAIN READY' ||
    debugComboWindow.restarted.comboText !== ''
  ) {
    failures.push(`Debug API combo-window preview changed: ${JSON.stringify(debugComboWindow)}`);
  }
  const debugUpgradeChoices = debugApi.previewUpgradeChoices('phase6-upgrades', 2);
  if (
    debugUpgradeChoices.length !== 3 ||
    JSON.stringify(debugUpgradeChoices) !== JSON.stringify(fixedUpgradeChoicesA)
  ) {
    failures.push(`Debug API upgrade choices changed: ${JSON.stringify(debugUpgradeChoices)}`);
  }
  const debugUpgradeApplication = debugApi.previewUpgradeApplication('chain-span-plus');
  if (
    debugUpgradeApplication.upgrades.modifiers.comboWindowBonusMs !== 500 ||
    debugUpgradeApplication.comboWindowMs !== 2900 ||
    debugUpgradeApplication.timeLimitMs !== 18000
  ) {
    failures.push(`Debug API upgrade application changed: ${JSON.stringify(debugUpgradeApplication)}`);
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
