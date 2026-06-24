import { getDifficultyForLevel } from '../config/difficulty.js';
import { applyRoundClearDamage, createCombatState, createNextCombatState, getCombatSummary } from './combat.js';
import { createComboState, expireComboIfNeeded, getComboSummary, incrementCombo, resetCombo } from './combo.js';
import { createHazardDirectorState, getHazardSummary } from './hazards.js';
import { generateLevelData } from './level.js';
import { createPlayerState, getPlayerSummary } from './player.js';
import { createSeededRng } from './rng.js';
import {
  applyUpgradeChoice,
  createUpgradeState,
  getEffectiveComboWindowMs,
  getEffectiveRoundTimeLimitMs,
  getUpgradeSummary,
  offerUpgradeChoices
} from './upgrades.js';

const DEFAULT_UPGRADE_PRIORITY = Object.freeze([
  'round_time',
  'base_attack',
  'combo_reward',
  'combo_window',
  'max_hp'
]);

function normalizePositiveInteger(value, fallback = 1) {
  return Math.max(1, Math.floor(Number(value) || fallback));
}

function normalizeNonNegativeInteger(value, fallback = 0) {
  return Math.max(0, Math.floor(Number(value) || fallback));
}

function normalizeBoolean(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function getDifficultySummary(difficulty) {
  return {
    id: difficulty.id,
    label: difficulty.label,
    gridSize: difficulty.gridSize,
    rows: difficulty.rows,
    cols: difficulty.cols,
    buttonCount: difficulty.buttonCount,
    fatalRange: `${difficulty.fatalMin}-${difficulty.fatalMax}`,
    timeLimitMs: difficulty.timeLimitMs,
    timeRewardMs: difficulty.timeRewardMs,
    readability: difficulty.readability,
    feedbackIntensity: difficulty.feedbackIntensity
  };
}

function getHazardTypes(hazards, phase = null) {
  const entries = Array.isArray(hazards?.hazards) ? hazards.hazards : [];
  return [...new Set(entries
    .filter((hazard) => !phase || hazard.phase === phase)
    .map((hazard) => hazard.type))];
}

function getPressureBand(score) {
  if (score >= 72) return 'critical';
  if (score >= 52) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function calculateRoundPressure({
  difficulty,
  fatalCount,
  safeCount,
  timeLeftBefore,
  timeLeftAfter,
  lowestTimeLeft,
  hazards
}) {
  const timeLimit = Math.max(1, difficulty.timeLimitMs);
  const timeUsedRatio = Math.max(0, Math.min(1, 1 - (timeLeftAfter / timeLimit)));
  const lowWaterRatio = Math.max(0, Math.min(1, 1 - (lowestTimeLeft / timeLimit)));
  const fatalRatio = Math.max(0, Math.min(1, fatalCount / Math.max(1, difficulty.buttonCount)));
  const safeLoadRatio = Math.max(0, Math.min(1, safeCount / Math.max(1, difficulty.buttonCount)));
  const activeHazards = getHazardTypes(hazards, 'active').length;
  const telegraphHazards = getHazardTypes(hazards, 'telegraph').length;
  const hazardRatio = Math.max(0, Math.min(1, (activeHazards + telegraphHazards * 0.5) / 2));
  const score = Math.round(
    (timeUsedRatio * 24) +
    (lowWaterRatio * 22) +
    (fatalRatio * 28) +
    (safeLoadRatio * 14) +
    (hazardRatio * 12)
  );
  return {
    score,
    band: getPressureBand(score),
    timeLeftBeforeMs: Math.round(timeLeftBefore),
    timeLeftAfterMs: Math.round(timeLeftAfter),
    lowestTimeLeftMs: Math.round(lowestTimeLeft),
    fatalRatio: Number(fatalRatio.toFixed(3)),
    safeLoadRatio: Number(safeLoadRatio.toFixed(3)),
    activeHazardTypes: getHazardTypes(hazards, 'active'),
    telegraphHazardTypes: getHazardTypes(hazards, 'telegraph')
  };
}

function chooseUpgrade(choices, strategy = 'balanced', priority = DEFAULT_UPGRADE_PRIORITY) {
  if (!Array.isArray(choices) || choices.length === 0) return null;
  if (strategy === 'first') return choices[0];
  if (strategy === 'survival') {
    return choices.find((choice) => choice.type === 'max_hp') || choices[0];
  }
  if (strategy === 'damage') {
    return choices.find((choice) => choice.type === 'base_attack') ||
      choices.find((choice) => choice.type === 'combo_reward') ||
      choices[0];
  }
  const priorityList = Array.isArray(priority) && priority.length ? priority : DEFAULT_UPGRADE_PRIORITY;
  return priorityList
    .map((type) => choices.find((choice) => choice.type === type))
    .find(Boolean) || choices[0];
}

function getUpgradePreview(upgrade) {
  if (!upgrade) return null;
  return {
    id: upgrade.id,
    offerId: upgrade.offerId,
    type: upgrade.type,
    label: upgrade.label,
    shortLabel: upgrade.shortLabel,
    value: upgrade.value,
    enemyIndex: upgrade.enemyIndex,
    sequence: upgrade.sequence || null
  };
}

function summarizePressure(rounds) {
  if (!rounds.length) {
    return {
      maxScore: 0,
      averageScore: 0,
      highPressureRounds: 0,
      criticalRounds: 0,
      peak: null
    };
  }
  const scores = rounds.map((round) => round.pressure.score);
  const maxScore = Math.max(...scores);
  return {
    maxScore,
    averageScore: Math.round(scores.reduce((total, score) => total + score, 0) / scores.length),
    highPressureRounds: rounds.filter((round) => ['high', 'critical'].includes(round.pressure.band)).length,
    criticalRounds: rounds.filter((round) => round.pressure.band === 'critical').length,
    peak: rounds.find((round) => round.pressure.score === maxScore) || null
  };
}

function summarizeHazardExposure(rounds) {
  const movingRounds = rounds.filter((round) => round.hazards.types.includes('moving_button'));
  const interferenceRounds = rounds.filter((round) => round.hazards.types.includes('interference'));
  const activeRounds = rounds.filter((round) => round.hazards.activeTypes.length > 0);
  return {
    firstMovingLevel: movingRounds[0]?.level || null,
    firstInterferenceLevel: interferenceRounds[0]?.level || null,
    roundsWithMoving: movingRounds.length,
    roundsWithInterference: interferenceRounds.length,
    roundsWithActiveHazards: activeRounds.length
  };
}

function finalizePreview({
  config,
  result,
  level,
  score,
  player,
  combat,
  combo,
  upgrades,
  rounds,
  defeatedEnemies,
  upgradeLog,
  totalSafePresses,
  elapsedMs
}) {
  const firstThreeByThree = rounds.find((round) => round.gridSize === '3x3') || null;
  const pressure = summarizePressure(rounds);
  const hazardExposure = summarizeHazardExposure(rounds);
  return {
    kind: 'phase8-session-preview',
    config,
    result,
    summary: {
      finalLevel: level,
      score,
      levelsCleared: rounds.length,
      enemiesDefeated: defeatedEnemies.length,
      upgradesSelected: upgradeLog.length,
      firstThreeByThreeLevel: firstThreeByThree?.level || null,
      firstUpgradeLevel: upgradeLog[0]?.level || null,
      totalSafePresses,
      elapsedMs: Math.round(elapsedMs),
      pressure,
      hazardExposure
    },
    player: getPlayerSummary(player),
    combat: getCombatSummary(combat),
    combo: getComboSummary(combo),
    upgrades: getUpgradeSummary(upgrades),
    defeatedEnemies,
    upgradeLog,
    rounds
  };
}

export function previewSessionProgression({
  seed = 'phase8-session',
  maxLevels = 42,
  maxEnemies = 4,
  safePressCadenceMs = 850,
  interRoundDelayMs = 600,
  hazardSampleMs = 6000,
  upgradeStrategy = 'balanced',
  upgradePriority = DEFAULT_UPGRADE_PRIORITY,
  includeSafePressRewards = true
} = {}) {
  const config = {
    seed: String(seed || 'phase8-session'),
    maxLevels: normalizePositiveInteger(maxLevels, 42),
    maxEnemies: normalizePositiveInteger(maxEnemies, 4),
    safePressCadenceMs: normalizePositiveInteger(safePressCadenceMs, 850),
    interRoundDelayMs: normalizeNonNegativeInteger(interRoundDelayMs, 600),
    hazardSampleMs: normalizeNonNegativeInteger(hazardSampleMs, 6000),
    upgradeStrategy: String(upgradeStrategy || 'balanced'),
    includeSafePressRewards: normalizeBoolean(includeSafePressRewards, true)
  };
  const rng = createSeededRng(config.seed);
  let level = 1;
  let score = 0;
  let elapsedMs = 0;
  let totalSafePresses = 0;
  let player = createPlayerState();
  let combat = createCombatState();
  let combo = createComboState();
  let upgrades = createUpgradeState();
  let currentDifficulty = getDifficultyForLevel(level);
  let timeLimit = getEffectiveRoundTimeLimitMs(currentDifficulty.timeLimitMs, upgrades);
  let timeLeft = timeLimit;
  const rounds = [];
  const defeatedEnemies = [];
  const upgradeLog = [];
  let result = {
    outcome: 'preview_limit',
    reason: 'max_levels_reached',
    level: config.maxLevels,
    enemyIndex: combat.enemyIndex
  };

  while (level <= config.maxLevels && combat.enemyIndex <= config.maxEnemies) {
    currentDifficulty = getDifficultyForLevel(level);
    timeLimit = getEffectiveRoundTimeLimitMs(currentDifficulty.timeLimitMs, upgrades);
    timeLeft = Math.min(timeLimit, timeLeft || timeLimit);
    const timeLeftBefore = timeLeft;
    const levelData = generateLevelData({
      level,
      difficulty: currentDifficulty,
      rng
    });
    const hazards = createHazardDirectorState({
      seed: config.seed,
      level,
      enemyIndex: combat.enemyIndex,
      rows: currentDifficulty.rows,
      cols: currentDifficulty.cols,
      buttonIds: levelData.buttons.map((button) => button.id),
      forbiddenIds: levelData.forbiddenIds,
      nowMs: config.hazardSampleMs
    });
    let lowestTimeLeft = timeLeft;

    for (let pressIndex = 0; pressIndex < levelData.safeKeysRemaining; pressIndex++) {
      elapsedMs += config.safePressCadenceMs;
      timeLeft = Math.max(0, timeLeft - config.safePressCadenceMs);
      lowestTimeLeft = Math.min(lowestTimeLeft, timeLeft);
      if (timeLeft <= 0) {
        result = {
          outcome: 'failure',
          reason: 'timeout',
          level,
          enemyIndex: combat.enemyIndex
        };
        return finalizePreview({
          config,
          result,
          level,
          score,
          player,
          combat,
          combo,
          upgrades,
          rounds,
          defeatedEnemies,
          upgradeLog,
          totalSafePresses,
          elapsedMs
        });
      }
      combo = expireComboIfNeeded(combo, elapsedMs).combo;
      combo = incrementCombo(combo, 'safe_press', {
        atMs: elapsedMs,
        windowMs: getEffectiveComboWindowMs(upgrades)
      }).combo;
      totalSafePresses++;
      score += 10;
      if (config.includeSafePressRewards) {
        timeLeft = Math.min(timeLimit, timeLeft + currentDifficulty.timeRewardMs);
      }
    }

    const combatBefore = getCombatSummary(combat);
    const combatResult = applyRoundClearDamage(combat, {
      level,
      timeLeftMs: timeLeft,
      comboState: combo,
      upgrades
    });
    combat = combatResult.combat;
    const pressure = calculateRoundPressure({
      difficulty: currentDifficulty,
      fatalCount: levelData.forbiddenIds.length,
      safeCount: levelData.safeKeysRemaining,
      timeLeftBefore,
      timeLeftAfter: timeLeft,
      lowestTimeLeft,
      hazards
    });
    rounds.push({
      level,
      enemyIndex: combatBefore.enemyIndex,
      difficultyId: currentDifficulty.id,
      gridSize: currentDifficulty.gridSize,
      fatalCount: levelData.forbiddenIds.length,
      safeCount: levelData.safeKeysRemaining,
      ruleTier: levelData.ruleTier,
      timeLimitMs: timeLimit,
      timeLeftAfterMs: Math.round(timeLeft),
      comboText: combo.comboText || combo.statusText,
      damage: combatResult.damage,
      enemyHpAfter: combat.hp,
      defeated: combatResult.defeated,
      pressure,
      hazards: {
        phase: hazards.phase,
        unlocked: hazards.unlocked,
        types: getHazardTypes(hazards),
        activeTypes: getHazardTypes(hazards, 'active'),
        summary: getHazardSummary(hazards)
      },
      difficulty: getDifficultySummary(currentDifficulty)
    });

    if (combatResult.defeated) {
      const defeatedEnemy = {
        enemyIndex: combatBefore.enemyIndex,
        enemyName: combatBefore.enemyName,
        stageLabel: combatBefore.stageLabel,
        tierLabel: combatBefore.tierLabel,
        defeatedAtLevel: level,
        roundsCleared: combat.roundsCleared,
        maxHp: combatBefore.maxHp,
        attack: combatBefore.attack
      };
      defeatedEnemies.push(defeatedEnemy);
      const offer = offerUpgradeChoices(upgrades, {
        rng,
        enemyIndex: combat.enemyIndex
      });
      const selectedChoice = chooseUpgrade(offer.choices, config.upgradeStrategy, upgradePriority);
      const applied = selectedChoice
        ? applyUpgradeChoice(offer.upgrades, selectedChoice.id, { player })
        : null;
      if (applied) {
        upgrades = applied.upgrades;
        player = applied.player || player;
        upgradeLog.push({
          level,
          afterEnemyIndex: combat.enemyIndex,
          choices: offer.choices.map(getUpgradePreview),
          selected: getUpgradePreview(applied.upgrade)
        });
      }

      if (defeatedEnemies.length >= config.maxEnemies) {
        result = {
          outcome: 'preview_limit',
          reason: 'max_enemies_reached',
          level,
          enemyIndex: combat.enemyIndex
        };
        break;
      }

      combat = createNextCombatState(combat);
      combo = resetCombo(combo, 'upgrade_selected').combo;
      level++;
      currentDifficulty = getDifficultyForLevel(level);
      timeLimit = getEffectiveRoundTimeLimitMs(currentDifficulty.timeLimitMs, upgrades);
      timeLeft = timeLimit;
      elapsedMs += config.interRoundDelayMs;
      combo = expireComboIfNeeded(combo, elapsedMs).combo;
      continue;
    }

    level++;
    currentDifficulty = getDifficultyForLevel(level);
    timeLimit = getEffectiveRoundTimeLimitMs(currentDifficulty.timeLimitMs, upgrades);
    timeLeft = Math.min(
      timeLimit,
      timeLeft + (timeLimit * currentDifficulty.carryoverRatio)
    );
    elapsedMs += config.interRoundDelayMs;
    combo = expireComboIfNeeded(combo, elapsedMs).combo;
  }

  if (level > config.maxLevels) {
    result = {
      outcome: 'preview_limit',
      reason: 'max_levels_reached',
      level: config.maxLevels,
      enemyIndex: combat.enemyIndex
    };
  } else if (combat.enemyIndex > config.maxEnemies) {
    result = {
      outcome: 'preview_limit',
      reason: 'max_enemies_reached',
      level,
      enemyIndex: config.maxEnemies
    };
  }

  return finalizePreview({
    config,
    result,
    level,
    score,
    player,
    combat,
    combo,
    upgrades,
    rounds,
    defeatedEnemies,
    upgradeLog,
    totalSafePresses,
    elapsedMs
  });
}
