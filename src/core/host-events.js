export const HOST_EVENT_VERSION = 1;

export const HOST_EVENT_TYPES = Object.freeze({
  HOST_BRIDGE_READY: 'host_bridge_ready',
  RUN_STARTED: 'run_started',
  RUN_RESET: 'run_reset',
  ROUND_STARTED: 'round_started',
  BUTTON_PRESSED: 'button_pressed',
  SAFE_BUTTON_CLEARED: 'safe_button_cleared',
  SCORE_CHANGED: 'score_changed',
  ROUND_CLEARED: 'round_cleared',
  COMBAT_STARTED: 'combat_started',
  COMBO_CHANGED: 'combo_changed',
  BOSS_DAMAGED: 'boss_damaged',
  BOSS_DEFEATED: 'boss_defeated',
  RUN_FINISHED: 'run_finished',
  BEST_RECORD_CHANGED: 'best_record_changed'
});

export const HOST_EVENT_TYPE_VALUES = Object.freeze(Object.values(HOST_EVENT_TYPES));

export function isKnownHostEventType(type) {
  return HOST_EVENT_TYPE_VALUES.includes(type);
}

export function assertKnownHostEventType(type) {
  if (!isKnownHostEventType(type)) {
    throw new TypeError(`Unknown host event type: ${type}`);
  }
}

export function isJsonSafeValue(value, seen = new Set()) {
  if (value === null) return true;
  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return Number.isFinite(value) || valueType !== 'number';
  }
  if (valueType !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    return false;
  }
  if (seen.has(value)) {
    return false;
  }
  seen.add(value);
  const values = Array.isArray(value) ? value : Object.values(value);
  const safe = values.every((entry) => isJsonSafeValue(entry, seen));
  seen.delete(value);
  return safe;
}

export function assertJsonSafeValue(value, label = 'host event payload') {
  if (!isJsonSafeValue(value)) {
    throw new TypeError(`${label} must be JSON-safe.`);
  }
}

export function cloneJsonSafeValue(value, label = 'host event payload') {
  assertJsonSafeValue(value, label);
  return JSON.parse(JSON.stringify(value));
}

export function createHostEvent(type, payload = {}, { atMs = 0 } = {}) {
  assertKnownHostEventType(type);
  const normalizedEvent = {
    version: HOST_EVENT_VERSION,
    type,
    atMs: Math.max(0, Math.round(Number(atMs) || 0)),
    payload: cloneJsonSafeValue(payload)
  };
  assertJsonSafeValue(normalizedEvent, 'host event');
  return normalizedEvent;
}

export function assertHostEvent(event) {
  if (!event || typeof event !== 'object') {
    throw new TypeError('Host event must be an object.');
  }
  if (event.version !== HOST_EVENT_VERSION) {
    throw new TypeError(`Unsupported host event version: ${event.version}`);
  }
  assertKnownHostEventType(event.type);
  if (!Number.isFinite(event.atMs) || event.atMs < 0) {
    throw new TypeError('Host event atMs must be a non-negative finite number.');
  }
  assertJsonSafeValue(event.payload);
}

export function cloneHostEvent(event) {
  assertHostEvent(event);
  return cloneJsonSafeValue(event, 'host event');
}

export function createButtonPayload(button) {
  if (!button) return null;
  return {
    id: button.id,
    color: {
      id: button.color.id,
      name: button.color.name
    },
    shape: {
      id: button.shape.id,
      name: button.shape.name,
      char: button.shape.char
    },
    number: button.number,
    label: `${button.color.name} ${button.shape.name} ${String(button.number).padStart(2, '0')}`
  };
}

export function createRoundPayload({
  level,
  score,
  isPlaying,
  seed,
  difficulty,
  ruleText,
  ruleTier,
  ruleId,
  buttons,
  forbiddenIds,
  safeKeysRemaining,
  timeLimit,
  timeLeft,
  player = null,
  combat = null,
  combo = null
}) {
  return cloneJsonSafeValue({
    level,
    score,
    isPlaying,
    seed,
    difficultyId: difficulty.id,
    gridSize: difficulty.gridSize,
    rows: difficulty.rows,
    cols: difficulty.cols,
    buttonCount: difficulty.buttonCount,
    fatalCount: forbiddenIds.length,
    fatalRange: `${difficulty.fatalMin}-${difficulty.fatalMax}`,
    ruleText,
    ruleTier,
    ruleId,
    timeLimitMs: timeLimit,
    timeLeftMs: Math.max(0, Math.round(Number(timeLeft) || 0)),
    timeRewardMs: difficulty.timeRewardMs,
    safeKeysRemaining,
    player,
    combat,
    combo,
    buttons: buttons.map(createButtonPayload)
  }, 'round payload');
}

export function createRunPayload({ level, score, bestRecord = null, bestRecordStatus = null }) {
  return cloneJsonSafeValue({
    level,
    score,
    bestRecord,
    bestRecordStatus
  }, 'run payload');
}

export function createButtonPressPayload({ buttonId, result, button = null, round = null }) {
  return cloneJsonSafeValue({
    buttonId,
    result,
    button: createButtonPayload(button),
    round
  }, 'button press payload');
}

export function createFailurePayload({ failureReason, recap, round = null }) {
  return createRunResultPayload({
    result: 'failure',
    reason: failureReason,
    recap,
    round
  });
}

export function createCombatPayload(combat = null) {
  return cloneJsonSafeValue(combat, 'combat payload');
}

export function createComboPayload(combo = null) {
  return cloneJsonSafeValue(combo, 'combo payload');
}

export function createPlayerPayload(player = null) {
  return cloneJsonSafeValue(player, 'player payload');
}

export function createBossDamagePayload({ damage, combat, combo, round = null }) {
  return cloneJsonSafeValue({
    damage,
    combat,
    combo,
    round
  }, 'boss damage payload');
}

export function createRunResultPayload({
  result,
  reason = null,
  recap,
  round = null,
  player = null,
  combat = null,
  combo = null
}) {
  return cloneJsonSafeValue({
    result,
    reason,
    recap,
    round,
    player,
    combat,
    combo
  }, 'run result payload');
}
