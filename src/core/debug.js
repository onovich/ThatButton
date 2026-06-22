import { getDifficultyForLevel } from '../config/difficulty.js';
import { generateLevelData } from './level.js';
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
    forbiddenButtons: [...recap.forbiddenButtons],
    bestBefore: cloneBestRecord(recap.bestBefore),
    bestAfter: cloneBestRecord(recap.bestAfter)
  } : null;
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
    getDifficultyForLevel,
    getLastFailureRecap: () => cloneFailureRecap(getState().lastFailureRecap),
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
