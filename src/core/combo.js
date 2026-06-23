import { COMBO_MAX_STREAK, COMBO_TIERS } from '../config/combat.js';

function normalizeStreak(value) {
  const streak = Math.max(0, Math.floor(Number(value) || 0));
  return Math.min(COMBO_MAX_STREAK, streak);
}

export function getComboTierForStreak(streak) {
  const normalizedStreak = normalizeStreak(streak);
  return COMBO_TIERS.find((tier) =>
    normalizedStreak >= tier.minStreak && normalizedStreak <= tier.maxStreak
  ) || COMBO_TIERS[0];
}

export function createComboState({ streak = 0, lastChangeReason = 'run_started' } = {}) {
  const normalizedStreak = normalizeStreak(streak);
  const tier = getComboTierForStreak(normalizedStreak);
  return {
    streak: normalizedStreak,
    maxStreak: COMBO_MAX_STREAK,
    tier: tier.tier,
    multiplier: tier.multiplier,
    multiplierLabel: tier.multiplierLabel,
    damageBonus: tier.damageBonus,
    isCapped: normalizedStreak >= COMBO_MAX_STREAK,
    lastChangeReason
  };
}

export function cloneComboState(combo = createComboState()) {
  return createComboState({
    streak: combo.streak,
    lastChangeReason: combo.lastChangeReason
  });
}

export function incrementCombo(combo = createComboState(), reason = 'safe_press') {
  const previous = cloneComboState(combo);
  const next = createComboState({
    streak: previous.streak + 1,
    lastChangeReason: reason
  });
  return {
    previous,
    combo: next,
    changed: JSON.stringify(previous) !== JSON.stringify(next)
  };
}

export function resetCombo(combo = createComboState(), reason = 'reset') {
  const previous = cloneComboState(combo);
  const next = createComboState({
    streak: 0,
    lastChangeReason: reason
  });
  return {
    previous,
    combo: next,
    changed: JSON.stringify(previous) !== JSON.stringify(next)
  };
}

export function getComboSummary(combo = createComboState()) {
  return cloneComboState(combo);
}
