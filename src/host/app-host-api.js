import {
  HOST_EVENT_TYPES,
  HOST_EVENT_VERSION,
  cloneJsonSafeValue,
  createButtonPayload,
  createButtonPressPayload,
  createFailurePayload,
  createHostEvent,
  createRoundPayload,
  createRunPayload
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
      timeLeft: state.timeLeft
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
      status: state.isPlaying ? 'playing' : (state.lastFailureRecap ? 'finished' : 'idle'),
      run: getRunPayload(),
      round: getRoundPayload(),
      lastFailureRecap: state.lastFailureRecap
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
      inputApi: ['start', 'reset', 'press', 'getSnapshot', 'getDebugApi']
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
    emitRunFinished: ({ failureReason, recap }) => emit(HOST_EVENT_TYPES.RUN_FINISHED, createFailurePayload({
      failureReason,
      recap,
      round: getRoundPayload()
    })),
    emitBestRecordChanged: ({ comparison, status }) => emit(HOST_EVENT_TYPES.BEST_RECORD_CHANGED, {
      comparison,
      status,
      record: getState().bestRecord
    })
  };
}
