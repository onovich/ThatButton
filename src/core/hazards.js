import { BASE_HAZARD_CONFIG, HAZARD_PHASES, HAZARD_TYPES } from '../config/hazards.js';
import { createSeededRng } from './rng.js';

function normalizeLevel(value) {
  return Math.max(1, Math.floor(Number(value) || 1));
}

function normalizeEnemyIndex(value) {
  return Math.max(1, Math.floor(Number(value) || 1));
}

function normalizeTime(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function normalizeRows(value) {
  return Math.max(1, Math.floor(Number(value) || 1));
}

function normalizeCols(value) {
  return Math.max(1, Math.floor(Number(value) || 1));
}

function normalizeButtonIds(buttonIds = []) {
  return [...new Set((buttonIds || [])
    .map((buttonId) => String(buttonId || '').trim())
    .filter(Boolean))];
}

function isUnlocked({ level, enemyIndex, unlockLevel, unlockEnemyIndex }) {
  return normalizeLevel(level) >= normalizeLevel(unlockLevel) &&
    normalizeEnemyIndex(enemyIndex) >= normalizeEnemyIndex(unlockEnemyIndex);
}

function pickTargets({ rng, buttonIds, forbiddenIds = [], count = 1 }) {
  const forbiddenSet = new Set(normalizeButtonIds(forbiddenIds));
  const safeCandidates = normalizeButtonIds(buttonIds).filter((buttonId) => !forbiddenSet.has(buttonId));
  const candidates = safeCandidates.length > 0 ? safeCandidates : normalizeButtonIds(buttonIds);
  const pool = [...candidates];
  for (let index = pool.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.max(0, Math.min(0.999999, Number(rng()) || 0)) * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, Math.min(Math.max(0, Math.floor(Number(count) || 0)), pool.length));
}

function getPhaseForTiming({ telegraphAtMs, startsAtMs, endsAtMs, cooldownEndsAtMs }, nowMs) {
  const now = normalizeTime(nowMs);
  if (now < telegraphAtMs) return HAZARD_PHASES.INACTIVE;
  if (now < startsAtMs) return HAZARD_PHASES.TELEGRAPH;
  if (now < endsAtMs) return HAZARD_PHASES.ACTIVE;
  if (now < cooldownEndsAtMs) return HAZARD_PHASES.COOLDOWN;
  return HAZARD_PHASES.EXPIRED;
}

function buildScheduleTiming({ telegraphDelayMs, telegraphDurationMs, durationMs, cooldownMs }) {
  const telegraphAtMs = normalizeTime(telegraphDelayMs);
  const startsAtMs = telegraphAtMs + normalizeTime(telegraphDurationMs);
  const endsAtMs = startsAtMs + normalizeTime(durationMs);
  const cooldownEndsAtMs = endsAtMs + normalizeTime(cooldownMs);
  return {
    telegraphAtMs,
    startsAtMs,
    endsAtMs,
    cooldownEndsAtMs
  };
}

function calculateMotionOffset({ phase, timing, nowMs, amplitudeXPx, amplitudeYPx, cycleMs }) {
  if (phase !== HAZARD_PHASES.ACTIVE) {
    return {
      offsetXPx: 0,
      offsetYPx: 0
    };
  }
  const cycle = Math.max(1, Math.floor(Number(cycleMs) || 1));
  const activeElapsed = Math.max(0, normalizeTime(nowMs) - normalizeTime(timing.startsAtMs));
  const progress = (activeElapsed % cycle) / cycle;
  return {
    offsetXPx: Math.round(Math.sin(progress * Math.PI * 2) * Math.max(0, Math.floor(Number(amplitudeXPx) || 0))),
    offsetYPx: Math.round(Math.sin(progress * Math.PI * 4) * Math.max(0, Math.floor(Number(amplitudeYPx) || 0)))
  };
}

export function createBoardZoneFacts({ rows = 3, cols = 3 } = {}) {
  const normalizedRows = normalizeRows(rows);
  const normalizedCols = normalizeCols(cols);
  const cells = [];
  for (let row = 0; row < normalizedRows; row++) {
    for (let col = 0; col < normalizedCols; col++) {
      const horizontal = col < normalizedCols / 3
        ? 'left'
        : (col >= (normalizedCols * 2) / 3 ? 'right' : 'center');
      const vertical = row < normalizedRows / 3
        ? 'top'
        : (row >= (normalizedRows * 2) / 3 ? 'bottom' : 'middle');
      cells.push({
        buttonId: `btn-${cells.length}`,
        row,
        col,
        lane: normalizedRows <= 2 ? `row-${row + 1}` : vertical,
        sector: `${vertical}-${horizontal}`
      });
    }
  }
  return {
    rows: normalizedRows,
    cols: normalizedCols,
    gridSize: `${normalizedRows}x${normalizedCols}`,
    cells
  };
}

export function createDisabledHazardState({
  level = 1,
  enemyIndex = 1,
  reason = 'disabled'
} = {}) {
  return {
    enabled: false,
    unlocked: false,
    phase: HAZARD_PHASES.DISABLED,
    reason,
    level: normalizeLevel(level),
    enemyIndex: normalizeEnemyIndex(enemyIndex),
    hazards: [],
    boardZones: createBoardZoneFacts()
  };
}

function createMovementHazard({
  level,
  enemyIndex,
  seed,
  buttonIds,
  forbiddenIds,
  rng,
  nowMs,
  config
}) {
  const movementConfig = config.movingButton;
  if (!isUnlocked({
    level,
    enemyIndex,
    unlockLevel: movementConfig.unlockLevel,
    unlockEnemyIndex: movementConfig.unlockEnemyIndex
  })) {
    return null;
  }
  const timing = buildScheduleTiming(movementConfig);
  const phase = getPhaseForTiming(timing, nowMs);
  const offset = calculateMotionOffset({
    phase,
    timing,
    nowMs,
    amplitudeXPx: movementConfig.amplitudeXPx,
    amplitudeYPx: movementConfig.amplitudeYPx,
    cycleMs: movementConfig.cycleMs
  });
  const targets = pickTargets({
    rng,
    buttonIds,
    forbiddenIds,
    count: movementConfig.targetCount
  });
  return {
    id: `${HAZARD_TYPES.MOVING_BUTTON}:L${normalizeLevel(level)}:E${normalizeEnemyIndex(enemyIndex)}`,
    type: HAZARD_TYPES.MOVING_BUTTON,
    phase,
    seed,
    targetButtonIds: targets,
    timing,
    motion: {
      amplitudeXPx: Math.max(0, Math.floor(Number(movementConfig.amplitudeXPx) || 0)),
      amplitudeYPx: Math.max(0, Math.floor(Number(movementConfig.amplitudeYPx) || 0)),
      cycleMs: Math.max(1, Math.floor(Number(movementConfig.cycleMs) || 1)),
      ...offset
    }
  };
}

function createInterferenceHazard({
  level,
  enemyIndex,
  seed,
  nowMs,
  config
}) {
  const interferenceConfig = config.interference;
  if (!isUnlocked({
    level,
    enemyIndex,
    unlockLevel: interferenceConfig.unlockLevel,
    unlockEnemyIndex: interferenceConfig.unlockEnemyIndex
  })) {
    return null;
  }
  const timing = buildScheduleTiming(interferenceConfig);
  return {
    id: `${HAZARD_TYPES.INTERFERENCE}:L${normalizeLevel(level)}:E${normalizeEnemyIndex(enemyIndex)}`,
    type: HAZARD_TYPES.INTERFERENCE,
    phase: getPhaseForTiming(timing, nowMs),
    seed,
    target: 'board',
    timing,
    interference: {
      intensity: Math.max(0, Math.min(1, Number(interferenceConfig.intensity) || 0))
    }
  };
}

export function createHazardDirectorState({
  seed = 'phase7-hazards',
  level = 1,
  enemyIndex = 1,
  rows = 3,
  cols = 3,
  buttonIds = [],
  forbiddenIds = [],
  nowMs = 0,
  disabled = false,
  config = BASE_HAZARD_CONFIG
} = {}) {
  const normalizedLevel = normalizeLevel(level);
  const normalizedEnemyIndex = normalizeEnemyIndex(enemyIndex);
  const boardZones = createBoardZoneFacts({ rows, cols });
  if (disabled || !config.enabled) {
    return {
      ...createDisabledHazardState({
        level: normalizedLevel,
        enemyIndex: normalizedEnemyIndex,
        reason: disabled ? 'debug_disabled' : 'config_disabled'
      }),
      boardZones
    };
  }
  const rng = createSeededRng(`${seed}:hazards:L${normalizedLevel}:E${normalizedEnemyIndex}`);
  const hazards = [
    createMovementHazard({
      level: normalizedLevel,
      enemyIndex: normalizedEnemyIndex,
      seed,
      buttonIds,
      forbiddenIds,
      rng,
      nowMs,
      config
    }),
    createInterferenceHazard({
      level: normalizedLevel,
      enemyIndex: normalizedEnemyIndex,
      seed,
      nowMs,
      config
    })
  ].filter(Boolean);
  const hasActiveHazard = hazards.some((hazard) => hazard.phase === HAZARD_PHASES.ACTIVE);
  const hasTelegraphHazard = hazards.some((hazard) => hazard.phase === HAZARD_PHASES.TELEGRAPH);
  const unlocked = isUnlocked({
    level: normalizedLevel,
    enemyIndex: normalizedEnemyIndex,
    unlockLevel: config.firstHazardLevel,
    unlockEnemyIndex: config.firstHazardEnemyIndex
  });

  return {
    enabled: true,
    unlocked,
    phase: hasActiveHazard
      ? HAZARD_PHASES.ACTIVE
      : (hasTelegraphHazard ? HAZARD_PHASES.TELEGRAPH : HAZARD_PHASES.INACTIVE),
    reason: unlocked ? 'scheduled' : 'onboarding_safe',
    level: normalizedLevel,
    enemyIndex: normalizedEnemyIndex,
    sampledAtMs: normalizeTime(nowMs),
    hazards,
    boardZones
  };
}

export function getHazardSummary(state = createHazardDirectorState()) {
  return JSON.parse(JSON.stringify(state));
}

export function previewHazardSchedule({
  seed = 'phase7-hazards',
  levels = [1, 8, 18, 19, 22],
  enemyIndexByLevel = {
    19: 2,
    20: 2,
    21: 2,
    22: 2
  },
  rows = 3,
  cols = 3,
  buttonIds = Array.from({ length: 9 }, (_, index) => `btn-${index}`),
  forbiddenIds = ['btn-0'],
  sampleTimesMs = [0, 1300, 2000, 4700, 9100],
  disabled = false
} = {}) {
  return {
    seed,
    disabled,
    levels: levels.map((level) => {
      const normalizedLevel = normalizeLevel(level);
      const enemyIndex = enemyIndexByLevel[normalizedLevel] || 1;
      return {
        level: normalizedLevel,
        enemyIndex,
        samples: sampleTimesMs.map((nowMs) => createHazardDirectorState({
          seed,
          level: normalizedLevel,
          enemyIndex,
          rows,
          cols,
          buttonIds,
          forbiddenIds,
          nowMs,
          disabled
        }))
      };
    })
  };
}
