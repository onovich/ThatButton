export const PROTOTYPE_BOSS_CONFIG = Object.freeze({
  id: 'reactor-warden',
  name: 'REACTOR WARDEN',
  maxHp: 160,
  baseRoundDamage: 18,
  timeBonusDivisorMs: 3500,
  maxTimeBonus: 4
});

export const COMBO_MAX_STREAK = 12;

export const COMBO_TIERS = Object.freeze([
  Object.freeze({
    tier: 0,
    minStreak: 0,
    maxStreak: 2,
    multiplier: 1,
    multiplierLabel: 'x1.0',
    damageBonus: 0
  }),
  Object.freeze({
    tier: 1,
    minStreak: 3,
    maxStreak: 5,
    multiplier: 1.1,
    multiplierLabel: 'x1.1',
    damageBonus: 2
  }),
  Object.freeze({
    tier: 2,
    minStreak: 6,
    maxStreak: 8,
    multiplier: 1.2,
    multiplierLabel: 'x1.2',
    damageBonus: 4
  }),
  Object.freeze({
    tier: 3,
    minStreak: 9,
    maxStreak: COMBO_MAX_STREAK,
    multiplier: 1.3,
    multiplierLabel: 'x1.3',
    damageBonus: 6
  })
]);
