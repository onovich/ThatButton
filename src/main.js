import { getDifficultyForLevel } from './config/difficulty.js';
import { createDebugApi } from './core/debug.js';
import {
  HOST_EVENT_TYPES,
  HOST_EVENT_VERSION,
  createHostEvent
} from './core/host-events.js';
import { generateLevelData, getButtonSummary, getRoundSnapshot } from './core/level.js';
import { createSeededRng } from './core/rng.js';
import {
  buildBestRecordFromRun,
  cloneBestRecord,
  getBestRecordStatusNote,
  getRunComparisonNote,
  loadBestRecord as loadBestRecordFromStorage,
  saveBestRecord as saveBestRecordToStorage,
  resetBestRecord as resetBestRecordInStorage
} from './core/storage.js';
import { buildFailureRecap } from './core/recap.js';
import { createBrowserHostBridge } from './host/browser-host-bridge.js';
import { createAudioFeedback } from './ui/audio.js';
import { createRenderer } from './ui/render.js';

function getStorageAdapter(browserWindow) {
  try {
    return browserWindow.localStorage || null;
  } catch (error) {
    return null;
  }
}

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
  const gameState = {
    level: 1,
    score: 0,
    isPlaying: false,
    seed: null,
    rng: random,
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
    bestRecord: loadedBestRecord.record,
    bestRecordStatus: loadedBestRecord.status,
    lastRunComparison: null,
    lastFailureRecap: null
  };

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
      safeKeysRemaining: gameState.safeKeysRemaining
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

  function emitHostEvent(type, payload = {}) {
    return resolvedHostBridge.emit(createHostEvent(type, payload, {
      atMs: performance.now()
    }));
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

  function createFailureRecap(failureReason, pressedButton = null) {
    return buildFailureRecap({
      failureReason,
      pressedButton,
      level: gameState.level,
      score: gameState.score,
      difficulty: gameState.currentDifficulty,
      ruleText: gameState.currentRuleText,
      forbiddenIds: gameState.forbiddenIds,
      buttons: gameState.buttons,
      safeKeysRemaining: gameState.safeKeysRemaining,
      bestRecord: gameState.bestRecord
    });
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
    return recap;
  }

  function triggerGameOver(id, element) {
    gameState.isPlaying = false;
    audio.playExplosion();
    const isTimeout = id === 'timeout';
    const failedButton = gameState.buttons.find((button) => button.id === id);
    const failureReason = isTimeout ? 'timeout' : 'wrong_click';
    const failureRecap = finalizeBestRecordForRun(createFailureRecap(failureReason, failedButton));
    gameState.lastFailureRecap = failureRecap;
    recordDebugEvent('failure', {
      failureReason,
      pressedButtonId: isTimeout ? null : id,
      pressedButton: getButtonSummary(failedButton),
      failureRecap
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
    recordDebugEvent('level_complete');
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

  function handleButtonInput(id, element, event) {
    if (event) {
      if (event.pointerType && event.isPrimary === false) return;
      event.preventDefault();
    }
    if (!gameState.isPlaying) return;
    if (element.classList.contains('disabled') || element.classList.contains('pressed')) return;

    renderer.playInteractionShake();
    renderer.markButtonPressed(element);

    if (gameState.forbiddenIds.includes(id)) {
      triggerGameOver(id, element);
    } else {
      audio.playSafeClick();
      gameState.safeKeysRemaining--;
      gameState.score += 10;
      gameState.timeLeft = Math.min(
        gameState.timeLimit,
        gameState.timeLeft + gameState.currentDifficulty.timeRewardMs
      );

      if (gameState.safeKeysRemaining <= 0) {
        levelComplete();
      }
    }
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
    renderer.setWarningVisible(false);

    startRound();
    requestAnimationFrame(gameLoop);
  }

  function resetGame() {
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
    browserWindow.__THAT_BUTTON_DEBUG__ = debugApi;
    browserWindow.startGame = startGame;
    browserWindow.resetGame = resetGame;
    emitHostEvent(HOST_EVENT_TYPES.HOST_BRIDGE_READY, {
      eventVersion: HOST_EVENT_VERSION,
      inputApi: ['start', 'reset', 'press', 'getSnapshot', 'getDebugApi']
    });
  }

  return {
    init,
    startGame,
    resetGame,
    gameLoop,
    debugApi,
    hostBridge: resolvedHostBridge,
    getState: () => gameState
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  createApp({
    window,
    document,
    performance,
    requestAnimationFrame,
    setTimeout,
    clearTimeout
  }).init();
}
