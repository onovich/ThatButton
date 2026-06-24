import { getDifficultyForLevel } from '../config/difficulty.js';
import { resolveWrongPressDamage } from './battle.js';
import { applyRoundClearDamage, createCombatState, getCombatSummary } from './combat.js';
import { createComboState, expireComboIfNeeded, getComboSummary, incrementCombo } from './combo.js';
import { createEnemyState, getEnemySummary } from './enemy.js';
import { generateLevelData } from './level.js';
import { createPlayerState, getPlayerSummary } from './player.js';
import { createSeededRng } from './rng.js';
import {
  applyUpgradeChoice,
  createUpgradeState,
  generateUpgradeChoices,
  getEffectiveComboWindowMs,
  getEffectiveRoundTimeLimitMs,
  getUpgradeSummary
} from './upgrades.js';
import {
  HOST_EVENT_TYPES,
  createEnemyDamagePayload,
  createEnemyDefeatPayload,
  createEnemySpawnPayload,
  createHostEvent,
  createPlayerDamagePayload,
  createUpgradeOfferPayload,
  createUpgradeSelectionPayload
} from './host-events.js';
import { previewHazardSchedule as previewCoreHazardSchedule } from './hazards.js';
import {
  buildPlaytestReport,
  buildPlaytestReportFromRunState,
  buildPlaytestReportExport,
  createPlaytestRunState,
  createPlaytestReportFixture,
  formatPlaytestReportSummary,
  isPrivacySafePlaytestReport,
  recordPlaytestButtonPress,
  recordPlaytestCombo,
  recordPlaytestEnemyDefeated,
  recordPlaytestPlayerDamage,
  recordPlaytestRound,
  recordPlaytestUpgradeOffered,
  recordPlaytestUpgradeSelected,
  serializePlaytestReport
} from './playtest-report.js';
import { previewSessionProgression as previewCoreSessionProgression } from './session-preview.js';
import {
  BEST_RECORD_KEY,
  BEST_RECORD_VERSION,
  buildBestRecordFromRun,
  cloneBestRecord,
  compareRunToBest
} from './storage.js';
import { buildFailureRecap, previewBestRecordForRun } from './recap.js';

export function previewSeededLevel(seed, level = 1) {
  const targetLevel = Math.max(1, Math.floor(Number(level) || 1));
  const rng = createSeededRng(seed);
  let preview = null;

  for (let currentLevel = 1; currentLevel <= targetLevel; currentLevel++) {
    const difficulty = getDifficultyForLevel(currentLevel);
    const levelData = generateLevelData({ level: currentLevel, difficulty, rng });
    preview = {
      level: currentLevel,
      seed,
      difficultyId: difficulty.id,
      gridSize: difficulty.gridSize,
      rows: difficulty.rows,
      cols: difficulty.cols,
      buttonCount: difficulty.buttonCount,
      fatalCount: levelData.forbiddenIds.length,
      fatalRange: `${difficulty.fatalMin}-${difficulty.fatalMax}`,
      ruleText: levelData.ruleText,
      ruleTier: levelData.ruleTier,
      ruleId: levelData.ruleId,
      timeLimitMs: difficulty.timeLimitMs,
      timeRewardMs: difficulty.timeRewardMs,
      readability: difficulty.readability,
      feedbackIntensity: difficulty.feedbackIntensity,
      forbiddenIds: [...levelData.forbiddenIds],
      buttons: levelData.buttons.map((button) => ({
        color: button.color.id,
        shape: button.shape.id,
        number: button.number
      }))
    };
  }

  return preview;
}

export function previewFailureRecap(seed, level = 1, failureReason = 'wrong_click', options = {}) {
  const targetLevel = Math.max(1, Math.floor(Number(level) || 1));
  const normalizedReason = failureReason === 'timeout' ? 'timeout' : 'wrong_click';
  const rng = createSeededRng(seed);
  let levelData = null;
  let difficulty = null;

  for (let currentLevel = 1; currentLevel <= targetLevel; currentLevel++) {
    difficulty = getDifficultyForLevel(currentLevel);
    levelData = generateLevelData({ level: currentLevel, difficulty, rng });
  }

  const pressedButton = normalizedReason === 'wrong_click'
    ? levelData.buttons.find((button) => button.id === levelData.forbiddenIds[0])
    : null;

  return previewBestRecordForRun(buildFailureRecap({
    failureReason: normalizedReason,
    pressedButton,
    level: targetLevel,
    score: Math.max(0, Math.floor(Number(options.score) || 0)),
    difficulty,
    ruleText: levelData.ruleText,
    forbiddenIds: levelData.forbiddenIds,
    buttons: levelData.buttons,
    safeKeysRemaining: levelData.safeKeysRemaining,
    bestRecord: options.bestRecord || cloneBestRecord()
  }));
}

export function cloneFailureRecap(recap) {
  return recap ? {
    ...recap,
    forbiddenButtons: recap.forbiddenButtons ? [...recap.forbiddenButtons] : [],
    bestBefore: cloneBestRecord(recap.bestBefore),
    bestAfter: cloneBestRecord(recap.bestAfter)
  } : null;
}

export function previewCombatRoundClear({ level = 1, timeLeftMs = 18000, streak = 3 } = {}) {
  const combo = createComboState({ streak });
  const combatResult = applyRoundClearDamage(createCombatState(), {
    level,
    timeLeftMs,
    comboState: combo
  });
  return {
    combat: getCombatSummary(combatResult.combat),
    combo: getComboSummary(combo),
    damage: combatResult.damage,
    defeated: combatResult.defeated
  };
}

export function previewPlayerDamage({ hp = 100, maxHp = 100, enemyAttack = 18, level = 1, buttonId = 'btn-test' } = {}) {
  const playerResult = resolveWrongPressDamage({
    player: createPlayerState({ hp, maxHp }),
    enemyAttack,
    level,
    buttonId
  });
  return {
    player: getPlayerSummary(playerResult.player),
    damage: playerResult.damage,
    defeated: playerResult.defeated
  };
}

export function previewEnemyScaling(enemyIndex = 1) {
  return getEnemySummary(createEnemyState({ enemyIndex }));
}

export function previewComboWindow({
  firstAtMs = 1000,
  secondAtMs = 1800,
  expiredAtMs = 4201
} = {}) {
  const first = incrementCombo(createComboState(), 'safe_press', { atMs: firstAtMs }).combo;
  const second = incrementCombo(first, 'safe_press', { atMs: secondAtMs }).combo;
  const expiry = expireComboIfNeeded(second, expiredAtMs);
  const restarted = incrementCombo(second, 'safe_press', { atMs: expiredAtMs }).combo;
  return {
    first: getComboSummary(first),
    second: getComboSummary(second),
    expired: getComboSummary(expiry.combo),
    restarted: getComboSummary(restarted)
  };
}

export function previewUpgradeChoices(seed = 'phase6-upgrades', enemyIndex = 1) {
  return generateUpgradeChoices({
    rng: createSeededRng(seed),
    enemyIndex
  });
}

export function previewUpgradeApplication(upgradeId = 'chain-span-plus') {
  const choices = previewUpgradeChoices('phase6-upgrades', 1);
  const choice = choices.find((entry) => entry.id === upgradeId) || choices[0];
  const player = createPlayerState();
  const applied = applyUpgradeChoice(createUpgradeState({
    choices,
    pending: true
  }), choice.id, { player });
  const difficulty = getDifficultyForLevel(1);
  return {
    selected: applied.upgrade,
    upgrades: getUpgradeSummary(applied.upgrades),
    player: getPlayerSummary(applied.player),
    comboWindowMs: getEffectiveComboWindowMs(applied.upgrades),
    timeLimitMs: getEffectiveRoundTimeLimitMs(difficulty.timeLimitMs, applied.upgrades)
  };
}

function previewFirstEnemyRun({
  seed = 'phase6a-baseline',
  safePressCadenceMs = 700,
  interRoundDelayMs = 600,
  maxLevels = 40
} = {}) {
  const rng = createSeededRng(seed);
  let combat = createCombatState();
  let combo = createComboState();
  const upgrades = createUpgradeState();
  let nowMs = 0;
  let totalSafePresses = 0;
  const rounds = [];

  for (let level = 1; level <= maxLevels; level++) {
    const difficulty = getDifficultyForLevel(level);
    const timeLimitMs = getEffectiveRoundTimeLimitMs(difficulty.timeLimitMs, upgrades);
    const levelData = generateLevelData({ level, difficulty, rng });
    let timeLeftMs = timeLimitMs;

    for (let pressIndex = 0; pressIndex < levelData.safeKeysRemaining; pressIndex++) {
      nowMs += safePressCadenceMs;
      timeLeftMs = Math.max(0, timeLeftMs - safePressCadenceMs);
      combo = expireComboIfNeeded(combo, nowMs).combo;
      combo = incrementCombo(combo, 'safe_press', {
        atMs: nowMs,
        windowMs: getEffectiveComboWindowMs(upgrades)
      }).combo;
      totalSafePresses++;
    }

    const combatResult = applyRoundClearDamage(combat, {
      level,
      timeLeftMs,
      comboState: combo,
      upgrades
    });
    combat = combatResult.combat;
    rounds.push({
      level,
      difficultyId: difficulty.id,
      safeCount: levelData.safeKeysRemaining,
      timeLimitMs,
      timeLeftMs,
      comboText: combo.comboText || combo.statusText,
      damage: combatResult.damage.appliedDamage,
      enemyHpAfter: combat.hp,
      defeated: combatResult.defeated
    });

    if (combatResult.defeated) {
      const choices = generateUpgradeChoices({
        rng,
        enemyIndex: combat.enemyIndex
      });
      return {
        seed,
        safePressCadenceMs,
        interRoundDelayMs,
        enemyDefeatedAtLevel: level,
        firstUpgradeAtLevel: level,
        totalSafePresses,
        elapsedMs: nowMs,
        enemy: getCombatSummary(combat),
        choices,
        rounds
      };
    }

    nowMs += interRoundDelayMs;
    combo = expireComboIfNeeded(combo, nowMs).combo;
  }

  return {
    seed,
    safePressCadenceMs,
    interRoundDelayMs,
    enemyDefeatedAtLevel: null,
    firstUpgradeAtLevel: null,
    totalSafePresses,
    elapsedMs: nowMs,
    enemy: getCombatSummary(combat),
    choices: [],
    rounds
  };
}

function previewWrongPressSurvivability(enemyIndex = 1) {
  const combat = createCombatState({ enemyIndex });
  let player = createPlayerState();
  const hits = [];

  for (let hit = 1; hit <= 12 && player.status === 'active'; hit++) {
    const result = resolveWrongPressDamage({
      player,
      enemyAttack: combat.attack,
      level: hit,
      buttonId: `wrong-${hit}`
    });
    player = result.player;
    hits.push({
      hit,
      damage: result.damage.appliedDamage,
      hpAfter: player.hp,
      defeated: result.defeated
    });
  }

  return {
    enemyIndex,
    enemyAttack: combat.attack,
    hitsToDeath: hits.length,
    survivedWrongPresses: hits.filter((hit) => !hit.defeated).length,
    hits
  };
}

function previewComboCadence(cadenceMs) {
  const firstAtMs = 1000;
  const secondAtMs = firstAtMs + Math.max(0, Math.floor(Number(cadenceMs) || 0));
  const first = incrementCombo(createComboState(), 'safe_press', { atMs: firstAtMs }).combo;
  const expiry = expireComboIfNeeded(first, secondAtMs);
  const second = incrementCombo(expiry.combo, 'safe_press', { atMs: secondAtMs }).combo;
  return {
    cadenceMs: secondAtMs - firstAtMs,
    expiredBeforeSecond: expiry.expired,
    secondStatus: second.statusText,
    secondComboText: second.comboText,
    remainingMs: second.remainingMs
  };
}

export function previewCombatBalance({
  seeds = ['phase6a-baseline', 'phase6a-alt-a', 'phase6a-alt-b'],
  safePressCadenceMs = 700,
  slowerCadenceMs = 1100,
  interRoundDelayMs = 600,
  comboCadencesMs = [600, 900, 1200, 1800, 2400, 2500]
} = {}) {
  return {
    firstEnemyRuns: seeds.map((seed) => previewFirstEnemyRun({
      seed,
      safePressCadenceMs,
      interRoundDelayMs
    })),
    slowerComparison: previewFirstEnemyRun({
      seed: seeds[0],
      safePressCadenceMs: slowerCadenceMs,
      interRoundDelayMs
    }),
    wrongPressSurvivability: [1, 2, 3].map(previewWrongPressSurvivability),
    comboWindowReadability: comboCadencesMs.map(previewComboCadence)
  };
}

export function previewHazardSchedule(options = {}) {
  return previewCoreHazardSchedule(options);
}

export function previewSessionProgression(options = {}) {
  return previewCoreSessionProgression(options);
}

export function previewHostEventPayloads() {
  const player = getPlayerSummary(createPlayerState());
  const combo = getComboSummary(createComboState({ streak: 3 }));
  const activeCombat = getCombatSummary(createCombatState());
  const damageResult = applyRoundClearDamage(createCombatState(), {
    level: 1,
    timeLeftMs: 18000,
    comboState: createComboState({ streak: 3 })
  });
  const defeatResult = applyRoundClearDamage(createCombatState({ hp: 10 }), {
    level: 1,
    timeLeftMs: 0,
    comboState: createComboState({ streak: 2 })
  });
  const damagedPlayer = previewPlayerDamage();
  const offered = generateUpgradeChoices({
    rng: createSeededRng('phase6-host-events'),
    enemyIndex: activeCombat.enemyIndex
  });
  const pendingUpgrades = createUpgradeState({
    choices: offered,
    pending: true
  });
  const selected = applyUpgradeChoice(pendingUpgrades, offered[0].id, {
    player: createPlayerState()
  });
  const round = null;
  return {
    playerDamaged: createHostEvent(HOST_EVENT_TYPES.PLAYER_DAMAGED, createPlayerDamagePayload({
      damage: damagedPlayer.damage,
      player: damagedPlayer.player,
      combo,
      round
    })),
    enemySpawned: createHostEvent(HOST_EVENT_TYPES.ENEMY_SPAWNED, createEnemySpawnPayload({
      reason: 'debug_preview',
      combat: activeCombat,
      player,
      upgrades: getUpgradeSummary(createUpgradeState()),
      round
    })),
    enemyDamaged: createHostEvent(HOST_EVENT_TYPES.ENEMY_DAMAGED, createEnemyDamagePayload({
      damage: damageResult.damage,
      combat: getCombatSummary(damageResult.combat),
      combo,
      round
    })),
    enemyDefeated: createHostEvent(HOST_EVENT_TYPES.ENEMY_DEFEATED, createEnemyDefeatPayload({
      damage: defeatResult.damage,
      combat: getCombatSummary(defeatResult.combat),
      combo,
      upgrades: getUpgradeSummary(pendingUpgrades),
      round
    })),
    upgradesOffered: createHostEvent(HOST_EVENT_TYPES.UPGRADES_OFFERED, createUpgradeOfferPayload({
      choices: offered,
      upgrades: getUpgradeSummary(pendingUpgrades),
      combat: activeCombat,
      player,
      round
    })),
    upgradeSelected: createHostEvent(HOST_EVENT_TYPES.UPGRADE_SELECTED, createUpgradeSelectionPayload({
      upgrade: selected.upgrade,
      upgrades: getUpgradeSummary(selected.upgrades),
      player: getPlayerSummary(selected.player),
      combat: activeCombat,
      round
    }))
  };
}

export function previewPlaytestReport(options = {}) {
  return createPlaytestReportFixture(options);
}

function buildPlaytestReportExportBundle(report) {
  return {
    report: JSON.parse(JSON.stringify(report)),
    summaryText: formatPlaytestReportSummary(report),
    jsonText: serializePlaytestReport(report),
    exportText: buildPlaytestReportExport(report),
    privacySafe: isPrivacySafePlaytestReport(report)
  };
}

export function previewPlaytestReportExport(options = {}) {
  const report = previewPlaytestReport(options);
  return buildPlaytestReportExportBundle(report);
}

export function previewRuntimePlaytestReport() {
  let runState = createPlaytestRunState({
    seed: 'phase9-runtime-fixture',
    startedAtMs: 1000,
    viewportClass: 'short-mobile'
  });
  runState = recordPlaytestRound(runState, {
    level: 6,
    enemyIndex: 1,
    gridSize: '3x3',
    fatalCount: 2,
    safeCount: 7,
    ruleTier: 'singleVisual',
    timeLimitMs: 15500,
    timeLeftMs: 14400,
    hazardTypes: [],
    activeHazardTypes: []
  });
  runState = recordPlaytestRound(runState, {
    level: 24,
    enemyIndex: 2,
    gridSize: '3x3',
    fatalCount: 4,
    safeCount: 5,
    ruleTier: 'orColor',
    timeLimitMs: 10000,
    timeLeftMs: 8800,
    hazardTypes: ['moving_button', 'interference'],
    activeHazardTypes: ['interference']
  });
  runState = recordPlaytestButtonPress(runState, { result: 'safe', source: 'dom', pointerType: 'touch' });
  runState = recordPlaytestButtonPress(runState, { result: 'fatal', source: 'dom', pointerType: 'touch' });
  runState = recordPlaytestCombo(runState, { streak: 4, hasVisibleCombo: true });
  runState = recordPlaytestPlayerDamage(runState, { appliedDamage: 24 });
  runState = recordPlaytestEnemyDefeated(runState, {
    enemyIndex: 1,
    enemyName: 'REACTOR WARDEN',
    stageLabel: 'S01 CORE LOCK',
    tierLabel: 'ONBOARDING',
    hp: 0,
    maxHp: 500
  });
  runState = recordPlaytestUpgradeOffered(runState, [{ id: 'round-time-plus' }]);
  runState = recordPlaytestUpgradeSelected(runState, {
    id: 'round-time-plus',
    type: 'round_time',
    label: 'SLOW CLOCK',
    shortLabel: 'TIME',
    value: 700,
    enemyIndex: 1,
    sequence: 1
  });
  return buildPlaytestReportFromRunState(runState, {
    result: 'failure',
    reason: 'wrong_click',
    level: 24,
    score: 1420,
    endedAtMs: 191000,
    createdAt: '2026-06-24T00:00:00.000Z',
    combat: {
      enemyIndex: 2,
      enemyName: 'SIGNAL WARDEN',
      stageLabel: 'S02 DRIFT ARRAY',
      tierLabel: 'MOVEMENT',
      hp: 328,
      maxHp: 580
    },
    combo: { streak: 0, hasVisibleCombo: false }
  });
}

export function createDebugApi({
  getState,
  loadBestRecord,
  saveBestRecord,
  resetBestRecord,
  setBestRecordState,
  onBestRecordChanged,
  getLog,
  clearLog
}) {
  return {
    previewSeededLevel,
    previewFailureRecap: (seed, level = 1, failureReason = 'wrong_click') => {
      const state = getState();
      return previewFailureRecap(seed, level, failureReason, {
        score: state.score,
        bestRecord: state.bestRecord
      });
    },
    previewCombatRoundClear,
    previewPlayerDamage,
    previewEnemyScaling,
    previewComboWindow,
    previewUpgradeChoices,
    previewUpgradeApplication,
    previewCombatBalance,
    previewHazardSchedule,
    previewSessionProgression,
    previewHostEventPayloads,
    previewPlaytestReport,
    previewPlaytestReportExport,
    previewRuntimePlaytestReport,
    buildPlaytestReport,
    isPrivacySafePlaytestReport,
    getLastPlaytestReport: () => getState().lastPlaytestReport
      ? JSON.parse(JSON.stringify(getState().lastPlaytestReport))
      : null,
    getLastPlaytestReportExport: () => getState().lastPlaytestReport
      ? buildPlaytestReportExportBundle(getState().lastPlaytestReport)
      : null,
    getDifficultyForLevel,
    getLastFailureRecap: () => cloneFailureRecap(getState().lastFailureRecap),
    getLastVictoryRecap: () => cloneFailureRecap(getState().lastVictoryRecap),
    getLastRunResultRecap: () => cloneFailureRecap(getState().lastRunResultRecap),
    getCombatState: () => getCombatSummary(getState().combat),
    getComboState: () => getComboSummary(getState().combo),
    getBestRecord: () => {
      const state = getState();
      return {
        record: cloneBestRecord(state.bestRecord),
        status: state.bestRecordStatus,
        key: BEST_RECORD_KEY,
        version: BEST_RECORD_VERSION
      };
    },
    loadBestRecord: () => {
      const loaded = loadBestRecord();
      setBestRecordState(loaded.record, loaded.status);
      onBestRecordChanged();
      const state = getState();
      return {
        record: cloneBestRecord(state.bestRecord),
        status: state.bestRecordStatus
      };
    },
    saveBestRecord: (level, score) => {
      const saved = saveBestRecord(buildBestRecordFromRun(level, score));
      setBestRecordState(saved.record, saved.status);
      onBestRecordChanged('SAVED');
      const state = getState();
      return {
        record: cloneBestRecord(state.bestRecord),
        status: state.bestRecordStatus
      };
    },
    resetBestRecord: () => {
      const reset = resetBestRecord();
      setBestRecordState(reset.record, reset.status);
      onBestRecordChanged();
      const state = getState();
      return {
        record: cloneBestRecord(state.bestRecord),
        status: state.bestRecordStatus
      };
    },
    compareRunToBest,
    getLog: () => [...getLog()],
    clearLog
  };
}
