import {
  HOST_EVENT_TYPES,
  HOST_EVENT_VERSION,
  cloneJsonSafeValue,
  createBossDamagePayload,
  createButtonPayload,
  createButtonPressPayload,
  createCombatPayload,
  createComboPayload,
  createEnemyDamagePayload,
  createEnemyDefeatPayload,
  createEnemySpawnPayload,
  createFailurePayload,
  createHazardPayload,
  createHostEvent,
  createPlayerDamagePayload,
  createPlayerPayload,
  createRoundPayload,
  createRunPayload,
  createRunResultPayload,
  createUpgradeOfferPayload,
  createUpgradePayload,
  createUpgradeSelectionPayload
} from '../core/host-events.js';

export function createAppHostApi({ hostBridge, getState, performance }) {
  function getRoundPayload() {
    const state = getState();
    return createRoundPayload({
      level: state.level,
      score: state.score,
      isPlaying: state.isPlaying,
      seed: state.seed,
      difficulty: state.currentDifficulty,
      ruleText: state.currentRuleText,
      ruleTier: state.currentRuleTier,
      ruleId: state.currentRuleId,
      buttons: state.buttons,
      forbiddenIds: state.forbiddenIds,
      safeKeysRemaining: state.safeKeysRemaining,
      timeLimit: state.timeLimit,
      timeLeft: state.timeLeft,
      player: state.player,
      combat: state.combat,
      combo: state.combo,
      hazards: state.hazards,
      upgrades: state.upgrades
    });
  }

  function getRunPayload() {
    const state = getState();
    return createRunPayload({
      level: state.level,
      score: state.score,
      bestRecord: state.bestRecord,
      bestRecordStatus: state.bestRecordStatus
    });
  }

  function getSnapshot() {
    const state = getState();
    return cloneJsonSafeValue({
      version: HOST_EVENT_VERSION,
      status: state.isPlaying
        ? 'playing'
        : (state.upgrades?.pending ? 'upgrade_pending' : (state.lastRunResultRecap ? 'finished' : 'idle')),
      run: getRunPayload(),
      round: getRoundPayload(),
      player: createPlayerPayload(state.player),
      combat: createCombatPayload(state.combat),
      combo: createComboPayload(state.combo),
      hazards: createHazardPayload(state.hazards),
      upgrades: createUpgradePayload(state.upgrades),
      lastFailureRecap: state.lastFailureRecap,
      lastVictoryRecap: state.lastVictoryRecap,
      lastRunResultRecap: state.lastRunResultRecap
    }, 'host snapshot');
  }

  function emit(type, payload = {}) {
    return hostBridge.emit(createHostEvent(type, payload, {
      atMs: performance.now()
    }));
  }

  return {
    getRoundPayload,
    getSnapshot,
    emitBridgeReady: () => emit(HOST_EVENT_TYPES.HOST_BRIDGE_READY, {
      eventVersion: HOST_EVENT_VERSION,
      inputApi: ['start', 'reset', 'press', 'selectUpgrade', 'getSnapshot', 'getDebugApi']
    }),
    emitRunStarted: () => emit(HOST_EVENT_TYPES.RUN_STARTED, {
      run: getRunPayload()
    }),
    emitRunReset: () => emit(HOST_EVENT_TYPES.RUN_RESET, {
      run: getRunPayload()
    }),
    emitRoundStarted: () => emit(HOST_EVENT_TYPES.ROUND_STARTED, {
      round: getRoundPayload()
    }),
    emitButtonPressed: ({ buttonId, result, button }) => emit(HOST_EVENT_TYPES.BUTTON_PRESSED, createButtonPressPayload({
      buttonId,
      result,
      button,
      round: getRoundPayload()
    })),
    emitSafeButtonCleared: ({ buttonId, button }) => emit(HOST_EVENT_TYPES.SAFE_BUTTON_CLEARED, {
      buttonId,
      button: createButtonPayload(button),
      safeKeysRemaining: getState().safeKeysRemaining,
      round: getRoundPayload()
    }),
    emitScoreChanged: ({ previousScore }) => {
      const state = getState();
      return emit(HOST_EVENT_TYPES.SCORE_CHANGED, {
        previousScore,
        score: state.score,
        delta: state.score - previousScore,
        round: getRoundPayload()
      });
    },
    emitRoundCleared: () => emit(HOST_EVENT_TYPES.ROUND_CLEARED, {
      round: getRoundPayload()
    }),
    emitCombatStarted: () => emit(HOST_EVENT_TYPES.COMBAT_STARTED, {
      combat: createCombatPayload(getState().combat),
      combo: createComboPayload(getState().combo)
    }),
    emitComboChanged: ({ previous, combo, reason }) => emit(HOST_EVENT_TYPES.COMBO_CHANGED, {
      previous: createComboPayload(previous),
      combo: createComboPayload(combo),
      reason
    }),
    emitPlayerDamaged: ({ damage, player, combo }) => emit(HOST_EVENT_TYPES.PLAYER_DAMAGED, createPlayerDamagePayload({
      damage,
      player,
      combo,
      round: getRoundPayload()
    })),
    emitEnemySpawned: ({ combat = null, player = null, upgrades = null, reason = null } = {}) => {
      const state = getState();
      return emit(HOST_EVENT_TYPES.ENEMY_SPAWNED, createEnemySpawnPayload({
        reason,
        combat: createCombatPayload(combat || state.combat),
        player: createPlayerPayload(player || state.player),
        upgrades: createUpgradePayload(upgrades || state.upgrades),
        round: getRoundPayload()
      }));
    },
    emitEnemyDamaged: ({ damage, combat, combo }) => emit(HOST_EVENT_TYPES.ENEMY_DAMAGED, createEnemyDamagePayload({
      damage,
      combat,
      combo,
      round: getRoundPayload()
    })),
    emitEnemyDefeated: ({ damage, combat, combo, upgrades = null }) => emit(HOST_EVENT_TYPES.ENEMY_DEFEATED, createEnemyDefeatPayload({
      damage,
      combat,
      combo,
      upgrades: createUpgradePayload(upgrades || getState().upgrades),
      round: getRoundPayload()
    })),
    emitBossDamaged: ({ damage, combat, combo }) => emit(HOST_EVENT_TYPES.BOSS_DAMAGED, createBossDamagePayload({
      damage,
      combat,
      combo,
      round: getRoundPayload()
    })),
    emitBossDefeated: ({ damage, combat, combo }) => emit(HOST_EVENT_TYPES.BOSS_DEFEATED, createBossDamagePayload({
      damage,
      combat,
      combo,
      round: getRoundPayload()
    })),
    emitUpgradesOffered: ({ choices, upgrades, combat = null, player = null }) => emit(HOST_EVENT_TYPES.UPGRADES_OFFERED, createUpgradeOfferPayload({
      choices,
      upgrades,
      combat,
      player,
      round: getRoundPayload()
    })),
    emitUpgradeSelected: ({ upgrade, upgrades, player = null, combat = null }) => emit(HOST_EVENT_TYPES.UPGRADE_SELECTED, createUpgradeSelectionPayload({
      upgrade,
      upgrades,
      player,
      combat,
      round: getRoundPayload()
    })),
    emitRunFinished: ({ failureReason = null, result = 'failure', reason = failureReason, recap }) => {
      const state = getState();
      const payload = result === 'failure'
        ? createFailurePayload({
          failureReason,
          recap,
          round: getRoundPayload()
        })
        : createRunResultPayload({
          result,
          reason,
          recap,
          round: getRoundPayload(),
          combat: createCombatPayload(state.combat),
          combo: createComboPayload(state.combo)
        });
      return emit(HOST_EVENT_TYPES.RUN_FINISHED, payload);
    },
    emitBestRecordChanged: ({ comparison, status }) => emit(HOST_EVENT_TYPES.BEST_RECORD_CHANGED, {
      comparison,
      status,
      record: getState().bestRecord
    })
  };
}
