import {
  COMBO_DAMAGE_PER_CHAIN,
  COMBO_MAX_DAMAGE_BONUS,
  COMBO_MAX_STREAK,
  COMBO_TIERS
} from '../config/combat.js';

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

function getVisibleComboText(streak) {
  return streak >= 2 ? `COMBO x${streak}` : '';
}

function getStatusText(streak) {
  if (streak >= 2) return getVisibleComboText(streak);
  if (streak === 1) return 'CHAIN READY';
  return 'CHAIN --';
}

function getDamageBonus(streak) {
  if (streak < 2) return 0;
  return Math.min(
    COMBO_MAX_DAMAGE_BONUS,
    (streak - 1) * COMBO_DAMAGE_PER_CHAIN
  );
}

export function createComboState({ streak = 0, chainCount = streak, lastChangeReason = 'run_started' } = {}) {
  const normalizedStreak = normalizeStreak(chainCount);
  const legacyTier = getComboTierForStreak(normalizedStreak);
  const comboText = getVisibleComboText(normalizedStreak);
  const damageBonus = getDamageBonus(normalizedStreak);
  const rewardText = damageBonus > 0 ? `DMG +${damageBonus}` : '';
  const hasVisibleCombo = comboText !== '';
  return {
    streak: normalizedStreak,
    chainCount: normalizedStreak,
    maxStreak: COMBO_MAX_STREAK,
    maxChain: COMBO_MAX_STREAK,
    tier: legacyTier.tier,
    multiplier: 1,
    multiplierLabel: comboText || 'x1',
    comboText,
    statusText: getStatusText(normalizedStreak),
    rewardText,
    hasVisibleCombo,
    hasReward: hasVisibleCombo && damageBonus > 0,
    damageBonus,
    legacyMultiplierLabel: legacyTier.multiplierLabel,
    legacyTierDamageBonus: legacyTier.damageBonus,
    isCapped: normalizedStreak >= COMBO_MAX_STREAK,
    lastChangeReason
  };
}

export function cloneComboState(combo = createComboState()) {
  return createComboState({
    chainCount: combo.chainCount ?? combo.streak,
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
