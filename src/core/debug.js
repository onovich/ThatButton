import { getDifficultyForLevel } from '../config/difficulty.js';
import { resolveWrongPressDamage } from './battle.js';
import { applyRoundClearDamage, createCombatState, getCombatSummary } from './combat.js';
import { createComboState, expireComboIfNeeded, getComboSummary, incrementCombo } from './combo.js';
import { createEnemyState, getEnemySummary } from './enemy.js';
import { generateLevelData } from './level.js';
import { createPlayerState, getPlayerSummary } from './player.js';
import { createSeededRng } from './rng.js';
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
