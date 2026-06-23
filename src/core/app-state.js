import { getDifficultyForLevel } from '../config/difficulty.js';

export function createInitialState({ bestRecord, bestRecordStatus, rng }) {
  return {
    level: 1,
    score: 0,
    isPlaying: false,
    seed: null,
    rng,
    debug: false,
    debugLog: [],
    currentDifficulty: getDifficultyForLevel(1),
    currentRuleTier: '',
    currentRuleId: '',
    buttons: [],
    forbiddenIds: [],
    safeKeysRemaining: 0,
    timeLimit: 12000,
    timeLeft: 12000,
    lastTime: 0,
    animationFrame: null,
    currentRuleText: '',
    bestRecord,
    bestRecordStatus,
    lastRunComparison: null,
    lastFailureRecap: null
  };
}
