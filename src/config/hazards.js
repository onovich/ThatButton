export const HAZARD_TYPES = Object.freeze({
  MOVING_BUTTON: 'moving_button',
  INTERFERENCE: 'interference'
});

export const HAZARD_PHASES = Object.freeze({
  DISABLED: 'disabled',
  INACTIVE: 'inactive',
  TELEGRAPH: 'telegraph',
  ACTIVE: 'active',
  COOLDOWN: 'cooldown',
  EXPIRED: 'expired'
});

export const BASE_HAZARD_CONFIG = Object.freeze({
  enabled: true,
  firstHazardLevel: 19,
  firstHazardEnemyIndex: 2,
  movingButton: Object.freeze({
    unlockLevel: 19,
    unlockEnemyIndex: 2,
    targetCount: 2,
    telegraphDelayMs: 1200,
    telegraphDurationMs: 700,
    durationMs: 2600,
    cooldownMs: 4200,
    amplitudeXPx: 6,
    amplitudeYPx: 6,
    cycleMs: 2400
  }),
  interference: Object.freeze({
    unlockLevel: 24,
    unlockEnemyIndex: 2,
    telegraphDelayMs: 5200,
    telegraphDurationMs: 500,
    durationMs: 1200,
    cooldownMs: 5200,
    intensity: 0.34
  })
});
