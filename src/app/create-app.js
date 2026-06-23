import { getDifficultyForLevel } from '../config/difficulty.js';
import { createInitialState } from '../core/app-state.js';
import { createDebugApi } from '../core/debug.js';
import {
  applySafePressCombo,
  createEncounterState,
  getEncounterFacts,
  resetEncounterCombo,
  resolveRoundClearCombat
} from '../core/encounter.js';
import { generateLevelData, getButtonSummary, getRoundSnapshot } from '../core/level.js';
import { createSeededRng } from '../core/rng.js';
import { buildFailureRecapFromState, buildVictoryRecapFromState } from '../core/run-recaps.js';
import {
  buildBestRecordFromRun,
  cloneBestRecord,
  getBestRecordStatusNote,
  getRunComparisonNote,
  loadBestRecord as loadBestRecordFromStorage,
  saveBestRecord as saveBestRecordToStorage,
  resetBestRecord as resetBestRecordInStorage
} from '../core/storage.js';
import { createAppHostApi } from '../host/app-host-api.js';
import { createBrowserHostBridge } from '../host/browser-host-bridge.js';
import { getStorageAdapter } from '../host/browser-storage.js';
import { createAudioFeedback } from '../ui/audio.js';
import { createRenderer } from '../ui/render.js';

export function createApp({
  window: browserWindow,
  document,
  performance,
  requestAnimationFrame,
  setTimeout,
  clearTimeout,
  random = Math.random,
  hostBridge = null
}) {
  const storage = getStorageAdapter(browserWindow);
  const resolvedHostBridge = hostBridge || createBrowserHostBridge();
  const loadedBestRecord = loadBestRecordFromStorage(storage);
  const audio = createAudioFeedback(browserWindow.AudioContext || browserWindow.webkitAudioContext, { setTimeout });
  const renderer = createRenderer({
    document,
    timers: { setTimeout, clearTimeout },
    random,
    audio
  });
  const gameState = createInitialState({
    bestRecord: loadedBestRecord.record,
    bestRecordStatus: loadedBestRecord.status,
    rng: random
  });
  const hostController = createAppHostApi({
    hostBridge: resolvedHostBridge,
    getState: () => gameState,
    performance
  });

  function getSeedFromUrl() {
    const seed = new URLSearchParams(browserWindow.location.search).get('seed');
    return seed && seed.trim() ? seed.trim() : null;
  }

  function getDebugFromUrl() {
    const value = new URLSearchParams(browserWindow.location.search).get('debug');
    return value === '1' || value === 'true';
  }

  function resetRandomSource() {
    gameState.seed = getSeedFromUrl();
    gameState.rng = gameState.seed ? createSeededRng(gameState.seed) : random;
  }

  function setBestRecordState(record, status) {
    gameState.bestRecord = record;
    gameState.bestRecordStatus = status;
  }

  function updateBestRecordUi(note = getBestRecordStatusNote(gameState.bestRecordStatus)) {
    renderer.updateBestRecordUi(gameState.bestRecord || cloneBestRecord(), note);
  }

  function syncBestRecordFromStorage() {
    const loaded = loadBestRecordFromStorage(storage);
    setBestRecordState(loaded.record, loaded.status);
    updateBestRecordUi();
    return loaded;
  }

  function getCurrentRoundSnapshot() {
    return getRoundSnapshot({
      level: gameState.level,
      seed: gameState.seed,
      difficulty: gameState.currentDifficulty,
      forbiddenIds: gameState.forbiddenIds,
      ruleText: gameState.currentRuleText,
      ruleTier: gameState.currentRuleTier,
      ruleId: gameState.currentRuleId,
      timeLimit: gameState.timeLimit,
      safeKeysRemaining: gameState.safeKeysRemaining,
      ...getEncounterFacts(gameState)
    });
  }

  function recordDebugEvent(type, details = {}) {
    const entry = {
      type,
      atMs: Math.round(performance.now()),
      ...getCurrentRoundSnapshot(),
      ...details
    };
    gameState.debugLog.push(entry);
    if (gameState.debug) {
      console.info('[ThatButton debug]', entry);
    }
    return entry;
  }

  function applyLevelData(levelData) {
    gameState.currentDifficulty = levelData.difficulty;
    gameState.buttons = levelData.buttons;
    gameState.currentRuleText = levelData.ruleText;
    gameState.forbiddenIds = levelData.forbiddenIds;
    gameState.currentRuleTier = levelData.ruleTier;
    gameState.currentRuleId = levelData.ruleId;
    gameState.safeKeysRemaining = levelData.safeKeysRemaining;
  }

  function generateCurrentLevelData(difficulty = getDifficultyForLevel(gameState.level)) {
    applyLevelData(generateLevelData({
      level: gameState.level,
      difficulty,
      rng: gameState.rng
    }));
  }

  function finalizeBestRecordForRun(recap) {
    const comparison = recap.bestComparison;
    let saveResult = {
      record: cloneBestRecord(gameState.bestRecord),
      status: 'not_saved'
    };
    if (comparison === 'new_best') {
      saveResult = saveBestRecordToStorage(storage, buildBestRecordFromRun(recap.level, recap.score));
      gameState.bestRecord = saveResult.record;
      gameState.bestRecordStatus = saveResult.status;
    }
    gameState.lastRunComparison = comparison;
    recap.bestAfter = cloneBestRecord(gameState.bestRecord);
    recap.bestSaveStatus = saveResult.status;
    updateBestRecordUi(getRunComparisonNote(comparison));
    if (comparison === 'new_best') {
      hostController.emitBestRecordChanged({
        comparison,
        status: saveResult.status
      });
    }
    return recap;
  }

  function resetEncounterState() {
    Object.assign(gameState, createEncounterState());
  }

  function applyComboChange(comboChange) {
    gameState.combo = comboChange.combo;
    if (comboChange.changed) {
      hostController.emitComboChanged({
        previous: comboChange.previous,
        combo: comboChange.combo,
        reason: comboChange.combo.lastChangeReason
      });
    }
    return comboChange;
  }

  function triggerGameOver(id, element) {
    gameState.isPlaying = false;
    audio.playExplosion();
    const isTimeout = id === 'timeout';
    const failedButton = gameState.buttons.find((button) => button.id === id);
    const failureReason = isTimeout ? 'timeout' : 'wrong_click';
    const failureRecap = finalizeBestRecordForRun(buildFailureRecapFromState(gameState, {
      failureReason,
      pressedButton: failedButton
    }));
    gameState.lastFailureRecap = failureRecap;
    gameState.lastRunResultRecap = failureRecap;
    applyComboChange(resetEncounterCombo(gameState.combo, failureReason));
    recordDebugEvent('failure', {
      failureReason,
      pressedButtonId: isTimeout ? null : id,
      pressedButton: getButtonSummary(failedButton),
      failureRecap
    });
    hostController.emitRunFinished({
      failureReason,
      recap: failureRecap
    });

    if (element) {
      renderer.markButtonExploded(element);
    }
    renderer.setFailureShake();

    setTimeout(() => {
      renderer.showGameOverScreen({
        level: gameState.level,
        isTimeout,
        recap: failureRecap
      });
    }, 800);
  }

  function levelComplete() {
    gameState.isPlaying = false;
    const combatResult = resolveRoundClearCombat({
      combat: gameState.combat,
      level: gameState.level,
      timeLeft: gameState.timeLeft,
      combo: gameState.combo
    });
    gameState.combat = combatResult.combat;
    gameState.lastCombatResult = combatResult;
    const encounterFacts = getEncounterFacts(gameState);
    recordDebugEvent('level_complete', {
      combatDamage: combatResult.damage,
      combat: encounterFacts.combat,
      combo: encounterFacts.combo
    });
    hostController.emitRoundCleared();
    hostController.emitBossDamaged({
      damage: combatResult.damage,
      combat: encounterFacts.combat,
      combo: encounterFacts.combo
    });
    if (combatResult.defeated) {
      const victoryRecap = finalizeBestRecordForRun(buildVictoryRecapFromState(gameState));
      gameState.lastVictoryRecap = victoryRecap;
      gameState.lastRunResultRecap = victoryRecap;
      recordDebugEvent('victory', {
        combatDamage: combatResult.damage,
        victoryRecap
      });
      hostController.emitBossDefeated({
        damage: combatResult.damage,
        combat: encounterFacts.combat,
        combo: encounterFacts.combo
      });
      hostController.emitRunFinished({
        result: 'victory',
        reason: 'boss_defeated',
        recap: victoryRecap
      });
      audio.playLevelUp();
      setTimeout(() => {
        renderer.showGameOverScreen({
          level: gameState.level,
          isTimeout: false,
          isVictory: true,
          recap: victoryRecap
        });
      }, 600);
      return;
    }
    audio.playLevelUp();
    gameState.level++;

    const nextDifficulty = getDifficultyForLevel(gameState.level);
    gameState.currentDifficulty = nextDifficulty;
    gameState.timeLimit = nextDifficulty.timeLimitMs;
    gameState.timeLeft = Math.min(
      gameState.timeLimit,
      gameState.timeLeft + (gameState.timeLimit * nextDifficulty.carryoverRatio)
    );

    renderer.setWarningVisible(nextDifficulty.feedbackIntensity === 'critical');
    setTimeout(() => {
      startRound();
    }, 600);
  }

  function pressButton(id, { element = renderer.getButtonElement(id), event = null, source = 'host' } = {}) {
    if (event) {
      if (event.pointerType && event.isPrimary === false) {
        return { accepted: false, reason: 'non_primary_pointer', buttonId: id, source };
      }
      event.preventDefault();
    }
    if (!gameState.isPlaying) {
      return { accepted: false, reason: 'not_playing', buttonId: id, source };
    }

    const button = gameState.buttons.find((entry) => entry.id === id);
    if (!button) {
      return { accepted: false, reason: 'unknown_button', buttonId: id, source };
    }
    if (button.isClicked) {
      return { accepted: false, reason: 'already_pressed', buttonId: id, source };
    }

    renderer.playInteractionShake();
    if (element) {
      renderer.markButtonPressed(element);
    }
    button.isClicked = true;

    if (gameState.forbiddenIds.includes(id)) {
      const result = { accepted: true, result: 'fatal', buttonId: id, source };
      hostController.emitButtonPressed({
        buttonId: id,
        result: result.result,
        button
      });
      triggerGameOver(id, element);
      return result;
    } else {
      const previousScore = gameState.score;
      audio.playSafeClick();
      gameState.safeKeysRemaining--;
      gameState.score += 10;
      applyComboChange(applySafePressCombo(gameState.combo));
      gameState.timeLeft = Math.min(
        gameState.timeLimit,
        gameState.timeLeft + gameState.currentDifficulty.timeRewardMs
      );
      const result = {
        accepted: true,
        result: 'safe',
        buttonId: id,
        source,
        score: gameState.score,
        safeKeysRemaining: gameState.safeKeysRemaining
      };
      hostController.emitButtonPressed({
        buttonId: id,
        result: result.result,
        button
      });
      hostController.emitSafeButtonCleared({
        buttonId: id,
        button
      });
      hostController.emitScoreChanged({ previousScore });

      if (gameState.safeKeysRemaining <= 0) {
        levelComplete();
      }
      return result;
    }
  }

  function handleButtonInput(id, element, event) {
    return pressButton(id, { element, event, source: 'dom' });
  }

  function startRound() {
    const difficulty = getDifficultyForLevel(gameState.level);
    gameState.currentDifficulty = difficulty;
    if (!gameState.timeLimit) {
      gameState.timeLimit = difficulty.timeLimitMs;
      gameState.timeLeft = difficulty.timeLimitMs;
    }
    generateCurrentLevelData(difficulty);
    recordDebugEvent('round_start');
    renderer.renderBoard({
      buttons: gameState.buttons,
      difficulty: gameState.currentDifficulty,
      ruleText: gameState.currentRuleText,
      level: gameState.level,
      score: gameState.score,
      onButtonInput: handleButtonInput
    });
    gameState.lastTime = performance.now();
    gameState.isPlaying = true;
    hostController.emitRoundStarted();
  }

  function startGame() {
    audio.resume();
    renderer.hideStartScreen();
    renderer.hideGameOverScreen();
    renderer.resetFailureShake();
    renderer.renderFailureRecap(null);
    syncBestRecordFromStorage();
    resetRandomSource();
    gameState.debug = getDebugFromUrl();
    gameState.debugLog = [];
    gameState.level = 1;
    gameState.score = 0;
    gameState.currentDifficulty = getDifficultyForLevel(1);
    gameState.timeLimit = gameState.currentDifficulty.timeLimitMs;
    gameState.timeLeft = gameState.currentDifficulty.timeLimitMs;
    gameState.lastFailureRecap = null;
    gameState.lastRunComparison = null;
    resetEncounterState();
    renderer.setWarningVisible(false);
    hostController.emitRunStarted();
    hostController.emitCombatStarted();

    startRound();
    requestAnimationFrame(gameLoop);
  }

  function resetGame() {
    hostController.emitRunReset();
    startGame();
  }

  function gameLoop(timestamp) {
    if (!gameState.isPlaying) {
      gameState.lastTime = timestamp;
      requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = timestamp - gameState.lastTime;
    gameState.lastTime = timestamp;
    gameState.timeLeft -= deltaTime;
    renderer.updateTimer(gameState.timeLeft, gameState.timeLimit);

    if (gameState.timeLeft <= 0) {
      triggerGameOver('timeout', null);
    }

    renderer.updateScore(gameState.score);
    requestAnimationFrame(gameLoop);
  }

  const debugApi = createDebugApi({
    getState: () => gameState,
    loadBestRecord: () => loadBestRecordFromStorage(storage),
    saveBestRecord: (record) => saveBestRecordToStorage(storage, record),
    resetBestRecord: () => resetBestRecordInStorage(storage),
    setBestRecordState,
    onBestRecordChanged: updateBestRecordUi,
    getLog: () => gameState.debugLog,
    clearLog: () => {
      gameState.debugLog = [];
    }
  });

  function init() {
    updateBestRecordUi();
    const hostInputApi = {
      start: startGame,
      reset: resetGame,
      press: (buttonId) => pressButton(buttonId, { source: 'host' }),
      getSnapshot: () => hostController.getSnapshot(),
      getDebugApi: () => debugApi
    };
    browserWindow.__THAT_BUTTON_DEBUG__ = debugApi;
    browserWindow.__THAT_BUTTON_HOST__ = hostInputApi;
    browserWindow.startGame = startGame;
    browserWindow.resetGame = resetGame;
    hostController.emitBridgeReady();
  }

  return {
    init,
    start: startGame,
    reset: resetGame,
    press: (buttonId) => pressButton(buttonId, { source: 'host' }),
    getSnapshot: () => hostController.getSnapshot(),
    getDebugApi: () => debugApi,
    startGame,
    resetGame,
    gameLoop,
    debugApi,
    hostBridge: resolvedHostBridge,
    getState: () => gameState
  };
}
