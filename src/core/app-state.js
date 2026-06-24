import { getDifficultyForLevel } from '../config/difficulty.js';
import { createCombatState } from './combat.js';
import { createComboState } from './combo.js';
import { createDisabledHazardState } from './hazards.js';
import { createPlayerState } from './player.js';
import { createUpgradeState } from './upgrades.js';

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
    roundStartedAtMs: 0,
    animationFrame: null,
    currentRuleText: '',
    bestRecord,
    bestRecordStatus,
    lastRunComparison: null,
    player: createPlayerState(),
    combat: createCombatState(),
    combo: createComboState(),
    hazards: createDisabledHazardState({
      reason: 'not_started'
    }),
    upgrades: createUpgradeState(),
    lastCombatResult: null,
    lastFailureRecap: null,
    lastVictoryRecap: null,
    lastRunResultRecap: null,
    playtestRun: null,
    playtestLastHazardSignature: '',
    lastPlaytestReport: null
  };
}
