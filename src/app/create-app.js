import { getDifficultyForLevel } from '../config/difficulty.js';
import { createInitialState } from '../core/app-state.js';
import { resolveWrongPressDamage } from '../core/battle.js';
import { createDebugApi } from '../core/debug.js';
import {
  applyEncounterUpgradeChoice,
  applySafePressCombo,
  createEncounterState,
  createNextEncounterCombat,
  expireEncounterComboIfNeeded,
  getEncounterComboWindow,
  getEncounterComboWindowMs,
  getEncounterFacts,
  getEncounterRoundTimeLimitMs,
  offerEncounterUpgradeChoices,
  resetEncounterCombo,
  resolveRoundClearCombat
} from '../core/encounter.js';
import { generateLevelData, getButtonSummary, getRoundSnapshot } from '../core/level.js';
import { createSeededRng } from '../core/rng.js';
import { buildFailureRecapFromState } from '../core/run-recaps.js';
import {
  buildPlaytestReportFromRunState,
  classifyViewport,
  createPlaytestRunState,
  recordPlaytestButtonPress,
  recordPlaytestCombo,
  recordPlaytestEnemyDefeated,
  recordPlaytestPlayerDamage,
  recordPlaytestRound,
  recordPlaytestUpgradeOffered,
  recordPlaytestUpgradeSelected
} from '../core/playtest-report.js';
import {
  buildBestRecordFromRun,
  cloneBestRecord,
  getBestRecordStatusNote,
  getRunComparisonNote,
  loadBestRecord as loadBestRecordFromStorage,
  saveBestRecord as saveBestRecordToStorage,
  resetBestRecord as resetBestRecordInStorage
} from '../core/storage.js';
import { createDisabledHazardState, createHazardDirectorState } from '../core/hazards.js';
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

  function getViewportClass() {
    return classifyViewport({
      width: browserWindow.innerWidth,
      height: browserWindow.innerHeight
    });
  }

  function getSeedFromUrl() {
    const seed = new URLSearchParams(browserWindow.location.search).get('seed');
    return seed && seed.trim() ? seed.trim() : null;
  }

  function getDebugFromUrl() {
    const value = new URLSearchParams(browserWindow.location.search).get('debug');
    return value === '1' || value === 'true';
  }

  function getHazardsDisabledFromUrl() {
    const value = new URLSearchParams(browserWindow.location.search).get('hazards');
    return value === '0' || value === 'false' || value === 'off';
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
      hazards: gameState.hazards,
      ...getEncounterFacts(gameState)
    });
  }

  function getHazardTypesForReport(hazards, phase = null) {
    const entries = Array.isArray(hazards?.hazards) ? hazards.hazards : [];
    return [...new Set(entries
      .filter((hazard) => !phase || hazard.phase === phase)
      .map((hazard) => hazard.type)
      .filter(Boolean))];
  }

  function getCurrentPlaytestRoundFacts(hazards = gameState.hazards) {
    return {
      level: gameState.level,
      enemyIndex: gameState.combat?.enemyIndex || 1,
      gridSize: gameState.currentDifficulty?.gridSize || 'unknown',
      fatalCount: gameState.forbiddenIds.length,
      safeCount: gameState.safeKeysRemaining,
      ruleTier: gameState.currentRuleTier || 'unknown',
      timeLimitMs: gameState.timeLimit,
      timeLeftMs: gameState.timeLeft,
      hazardTypes: getHazardTypesForReport(hazards),
      activeHazardTypes: getHazardTypesForReport(hazards, 'active')
    };
  }

  function syncPlaytestRound(hazards = gameState.hazards) {
    if (!gameState.playtestRun) return null;
    const roundFacts = getCurrentPlaytestRoundFacts(hazards);
    const signature = [
      roundFacts.level,
      roundFacts.enemyIndex,
      roundFacts.gridSize,
      roundFacts.safeCount,
      roundFacts.hazardTypes.join(','),
      roundFacts.activeHazardTypes.join(',')
    ].join('|');
    if (signature === gameState.playtestLastHazardSignature) {
      return gameState.playtestRun;
    }
    gameState.playtestLastHazardSignature = signature;
    gameState.playtestRun = recordPlaytestRound(gameState.playtestRun, roundFacts);
    return gameState.playtestRun;
  }

  function finalizePlaytestReport({ result, reason, recap }) {
    if (!gameState.playtestRun) return null;
    syncPlaytestRound(gameState.hazards);
    const encounterFacts = getEncounterFacts(gameState);
    const report = buildPlaytestReportFromRunState(gameState.playtestRun, {
      result,
      reason,
      level: gameState.level,
      score: gameState.score,
      endedAtMs: performance.now(),
      createdAt: new Date().toISOString(),
      combat: encounterFacts.combat,
      combo: encounterFacts.combo,
      upgrades: encounterFacts.upgrades,
      recap
    });
    gameState.lastPlaytestReport = report;
    return report;
  }

  function getCurrentComboWindow(nowMs = performance.now()) {
    return getEncounterComboWindow(gameState.combo, nowMs);
  }

  function getEffectiveRoundTimeLimit(difficulty) {
    return getEncounterRoundTimeLimitMs(difficulty, gameState.upgrades);
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

  function updateHazardState(roundElapsedMs = 0, { disabled = false, reason = null } = {}) {
    const hazardDisabled = disabled || getHazardsDisabledFromUrl();
    if (hazardDisabled) {
      gameState.hazards = createDisabledHazardState({
        level: gameState.level,
        enemyIndex: gameState.combat?.enemyIndex || 1,
        reason: reason || (getHazardsDisabledFromUrl() ? 'query_disabled' : 'disabled')
      });
      syncPlaytestRound(gameState.hazards);
      return gameState.hazards;
    }
    gameState.hazards = createHazardDirectorState({
      seed: gameState.seed || 'unseeded',
      level: gameState.level,
      enemyIndex: gameState.combat?.enemyIndex || 1,
      rows: gameState.currentDifficulty?.rows || 3,
      cols: gameState.currentDifficulty?.cols || 3,
      buttonIds: gameState.buttons.map((button) => button.id),
      forbiddenIds: gameState.forbiddenIds,
      nowMs: roundElapsedMs
    });
    syncPlaytestRound(gameState.hazards);
    return gameState.hazards;
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

  function applyComboChange(comboChange, { sourceElement = null, showReward = false } = {}) {
    gameState.combo = comboChange.combo;
    if (gameState.playtestRun) {
      gameState.playtestRun = recordPlaytestCombo(gameState.playtestRun, comboChange.combo);
    }
    renderer.updateCombatStatus(getEncounterFacts(gameState));
    renderer.updateTimer(gameState.timeLeft, gameState.timeLimit, getCurrentComboWindow(
      comboChange.combo.lastEventAtMs ?? performance.now()
    ));
    const comboIncreased = comboChange.combo.streak > comboChange.previous.streak;
    const cappedReward = showReward && !comboIncreased && comboChange.combo.isCapped && comboChange.combo.hasVisibleCombo;
    if (showReward && comboChange.combo.hasVisibleCombo && (comboIncreased || cappedReward)) {
      renderer.showComboReward({
        previous: comboChange.previous,
        combo: comboChange.combo,
        sourceElement,
        capped: cappedReward
      });
    }
    if (comboChange.changed) {
      hostController.emitComboChanged({
        previous: comboChange.previous,
        combo: comboChange.combo,
        reason: comboChange.combo.lastChangeReason
      });
    }
    return comboChange;
  }

  function playSafePressCue(comboChange) {
    if (comboChange.combo.hasVisibleCombo) {
      audio.playComboCue({
        streak: comboChange.combo.streak,
        capped: comboChange.combo.isCapped
      });
      return;
    }
    if (comboChange.combo.streak === 1) {
      audio.playChainReady();
      return;
    }
    audio.playSafeClick();
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
    finalizePlaytestReport({
      result: 'failure',
      reason: failureReason,
      recap: failureRecap
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

  function applyWrongPressDamage(id, sourceElement = null) {
    const playerDamageResult = resolveWrongPressDamage({
      player: gameState.player,
      enemyAttack: gameState.combat.attack,
      level: gameState.level,
      buttonId: id
    });
    gameState.player = playerDamageResult.player;
    gameState.lastPlayerDamage = playerDamageResult.damage;
    if (gameState.playtestRun) {
      gameState.playtestRun = recordPlaytestPlayerDamage(gameState.playtestRun, playerDamageResult.damage);
    }
    applyComboChange(resetEncounterCombo(gameState.combo, 'wrong_press'));
    const encounterFacts = getEncounterFacts(gameState);
    recordDebugEvent('player_damaged', {
      playerDamage: playerDamageResult.damage,
      player: encounterFacts.player,
      combo: encounterFacts.combo
    });
    hostController.emitPlayerDamaged({
      damage: playerDamageResult.damage,
      player: encounterFacts.player,
      combo: encounterFacts.combo
    });
    audio.playError();
    renderer.showWrongPressFeedback({
      sourceElement,
      damage: playerDamageResult.damage,
      defeated: playerDamageResult.defeated
    });
    return playerDamageResult;
  }

  function showUpgradeChoices() {
    updateHazardState(0, {
      disabled: true,
      reason: 'upgrade_pending'
    });
    renderer.updateHazardPresentation(gameState.hazards);
    const offer = offerEncounterUpgradeChoices(gameState.upgrades, {
      rng: gameState.rng,
      enemyIndex: gameState.combat.enemyIndex
    });
    gameState.upgrades = offer.upgrades;
    if (gameState.playtestRun) {
      gameState.playtestRun = recordPlaytestUpgradeOffered(gameState.playtestRun, offer.choices);
    }
    const encounterFacts = getEncounterFacts(gameState);
    renderer.updateCombatStatus(encounterFacts);
    renderer.showUpgradeScreen({
      choices: offer.choices,
      onSelect: selectUpgrade
    });
    recordDebugEvent('upgrades_offered', {
      choices: offer.choices,
      upgrades: encounterFacts.upgrades,
      combat: encounterFacts.combat
    });
    hostController.emitUpgradesOffered({
      choices: offer.choices,
      upgrades: encounterFacts.upgrades,
      combat: encounterFacts.combat,
      player: encounterFacts.player
    });
    return offer;
  }

  function continueAfterUpgrade() {
    gameState.combat = createNextEncounterCombat(gameState.combat);
    gameState.lastCombatResult = null;
    gameState.level++;
    const nextDifficulty = getDifficultyForLevel(gameState.level);
    gameState.currentDifficulty = nextDifficulty;
    gameState.timeLimit = getEffectiveRoundTimeLimit(nextDifficulty);
    gameState.timeLeft = gameState.timeLimit;
    applyComboChange(resetEncounterCombo(gameState.combo, 'upgrade_selected'));
    const encounterFacts = getEncounterFacts(gameState);
    renderer.updateCombatStatus(encounterFacts);
    renderer.updateTimer(gameState.timeLeft, gameState.timeLimit, getCurrentComboWindow());
    renderer.setWarningVisible(nextDifficulty.feedbackIntensity === 'critical');
    recordDebugEvent('enemy_spawned', {
      reason: 'upgrade_selected',
      combat: encounterFacts.combat,
      upgrades: encounterFacts.upgrades
    });
    hostController.emitEnemySpawned({
      reason: 'upgrade_selected',
      combat: encounterFacts.combat,
      player: encounterFacts.player,
      upgrades: encounterFacts.upgrades
    });
    setTimeout(() => {
      startRound();
    }, 450);
  }

  function selectUpgrade(upgradeId) {
    if (!gameState.upgrades.pending) {
      return { accepted: false, reason: 'no_pending_upgrade', upgradeId };
    }
    const applied = applyEncounterUpgradeChoice(gameState.upgrades, upgradeId, {
      player: gameState.player
    });
    gameState.upgrades = applied.upgrades;
    gameState.player = applied.player || gameState.player;
    if (gameState.playtestRun) {
      gameState.playtestRun = recordPlaytestUpgradeSelected(gameState.playtestRun, applied.upgrade);
    }
    renderer.showUpgradeReward({
      upgrade: applied.upgrade
    });
    renderer.hideUpgradeScreen();
    audio.playLevelUp();
    const encounterFacts = getEncounterFacts(gameState);
    recordDebugEvent('upgrade_selected', {
      upgrade: applied.upgrade,
      upgrades: applied.upgrades,
      player: encounterFacts.player
    });
    hostController.emitUpgradeSelected({
      upgrade: applied.upgrade,
      upgrades: encounterFacts.upgrades,
      player: encounterFacts.player,
      combat: encounterFacts.combat
    });
    continueAfterUpgrade();
    return {
      accepted: true,
      upgrade: applied.upgrade,
      upgrades: applied.upgrades,
      nextEnemy: gameState.combat
    };
  }

  function levelComplete({ sourceElement = null } = {}) {
    gameState.isPlaying = false;
    const combatResult = resolveRoundClearCombat({
      combat: gameState.combat,
      level: gameState.level,
      timeLeft: gameState.timeLeft,
      combo: gameState.combo,
      upgrades: gameState.upgrades
    });
    gameState.combat = combatResult.combat;
    gameState.lastCombatResult = combatResult;
    const encounterFacts = getEncounterFacts(gameState);
    renderer.updateCombatStatus(encounterFacts);
    renderer.showBossHit({
      damage: combatResult.damage,
      defeated: combatResult.defeated,
      sourceElement
    });
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
    hostController.emitEnemyDamaged({
      damage: combatResult.damage,
      combat: encounterFacts.combat,
      combo: encounterFacts.combo
    });
    if (combatResult.defeated) {
      if (gameState.playtestRun) {
        gameState.playtestRun = recordPlaytestEnemyDefeated(gameState.playtestRun, encounterFacts.combat);
      }
      recordDebugEvent('enemy_defeated', {
        combatDamage: combatResult.damage,
        combat: encounterFacts.combat
      });
      hostController.emitBossDefeated({
        damage: combatResult.damage,
        combat: encounterFacts.combat,
        combo: encounterFacts.combo
      });
      hostController.emitEnemyDefeated({
        damage: combatResult.damage,
        combat: encounterFacts.combat,
        combo: encounterFacts.combo,
        upgrades: encounterFacts.upgrades
      });
      audio.playLevelUp();
      setTimeout(() => {
        showUpgradeChoices();
      }, 600);
      return;
    }
    audio.playLevelUp();
    gameState.level++;

    const nextDifficulty = getDifficultyForLevel(gameState.level);
    gameState.currentDifficulty = nextDifficulty;
    gameState.timeLimit = getEffectiveRoundTimeLimit(nextDifficulty);
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
      hostController.emitButtonPressed({
        buttonId: id,
        result: 'fatal',
        button
      });
      if (gameState.playtestRun) {
        gameState.playtestRun = recordPlaytestButtonPress(gameState.playtestRun, {
          result: 'fatal',
          source,
          pointerType: event?.pointerType || null,
          key: event?.key || null
        });
      }
      const playerDamageResult = applyWrongPressDamage(id, element);
      const result = {
        accepted: true,
        result: 'fatal',
        buttonId: id,
        source,
        playerDamage: playerDamageResult.damage,
        playerDefeated: playerDamageResult.defeated
      };
      if (playerDamageResult.defeated) {
        triggerGameOver(id, element);
      }
      return result;
    } else {
      const previousScore = gameState.score;
      gameState.safeKeysRemaining--;
      gameState.score += 10;
      renderer.updateScore(gameState.score);
      const comboChange = applySafePressCombo(gameState.combo, {
        atMs: performance.now(),
        windowMs: getEncounterComboWindowMs(gameState.upgrades)
      });
      if (gameState.playtestRun) {
        gameState.playtestRun = recordPlaytestButtonPress(gameState.playtestRun, {
          result: 'safe',
          source,
          pointerType: event?.pointerType || null,
          key: event?.key || null
        });
      }
      playSafePressCue(comboChange);
      applyComboChange(comboChange, {
        sourceElement: element,
        showReward: true
      });
      if (!comboChange.combo.hasVisibleCombo) {
        renderer.showSafePressFeedback({
          sourceElement: element,
          previous: comboChange.previous,
          combo: comboChange.combo,
          expired: comboChange.expired
        });
      }
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
        levelComplete({ sourceElement: element });
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
      gameState.timeLimit = getEffectiveRoundTimeLimit(difficulty);
      gameState.timeLeft = gameState.timeLimit;
    }
    generateCurrentLevelData(difficulty);
    gameState.roundStartedAtMs = performance.now();
    updateHazardState(0);
    recordDebugEvent('round_start');
    renderer.renderBoard({
      buttons: gameState.buttons,
      difficulty: gameState.currentDifficulty,
      ruleText: gameState.currentRuleText,
      level: gameState.level,
      score: gameState.score,
      onButtonInput: handleButtonInput
    });
    renderer.updateHazardPresentation(gameState.hazards);
    gameState.lastTime = performance.now();
    gameState.isPlaying = true;
    hostController.emitRoundStarted();
  }

  function startGame() {
    audio.resume();
    renderer.hideStartScreen();
    renderer.hideGameOverScreen();
    renderer.hideUpgradeScreen();
    renderer.resetFailureShake();
    renderer.renderFailureRecap(null);
    syncBestRecordFromStorage();
    resetRandomSource();
    gameState.debug = getDebugFromUrl();
    gameState.debugLog = [];
    gameState.level = 1;
    gameState.score = 0;
    resetEncounterState();
    gameState.playtestRun = createPlaytestRunState({
      seed: gameState.seed,
      startedAtMs: performance.now(),
      viewportClass: getViewportClass()
    });
    gameState.playtestLastHazardSignature = '';
    gameState.lastPlaytestReport = null;
    gameState.currentDifficulty = getDifficultyForLevel(1);
    gameState.timeLimit = getEffectiveRoundTimeLimit(gameState.currentDifficulty);
    gameState.timeLeft = gameState.timeLimit;
    gameState.lastFailureRecap = null;
    gameState.lastRunComparison = null;
    gameState.hazards = createDisabledHazardState({
      level: 1,
      enemyIndex: 1,
      reason: 'run_reset'
    });
    renderer.updateHazardPresentation(gameState.hazards);
    renderer.updateCombatStatus(getEncounterFacts(gameState));
    renderer.updateTimer(gameState.timeLeft, gameState.timeLimit, getCurrentComboWindow());
    renderer.setWarningVisible(false);
    hostController.emitRunStarted();
    hostController.emitCombatStarted();
    hostController.emitEnemySpawned({
      reason: 'run_started',
      ...getEncounterFacts(gameState)
    });

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
    updateHazardState(timestamp - gameState.roundStartedAtMs);
    renderer.updateHazardPresentation(gameState.hazards);
    const comboExpiry = expireEncounterComboIfNeeded(gameState.combo, timestamp);
    if (comboExpiry.changed) {
      applyComboChange(comboExpiry);
    }
    renderer.updateTimer(gameState.timeLeft, gameState.timeLimit, getCurrentComboWindow(timestamp));

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
    renderer.updateCombatStatus(getEncounterFacts(gameState));
    const hostInputApi = {
      start: startGame,
      reset: resetGame,
      press: (buttonId) => pressButton(buttonId, { source: 'host' }),
      selectUpgrade,
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
    selectUpgrade,
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
