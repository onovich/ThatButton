import {
  COMBO_DAMAGE_PER_CHAIN,
  COMBO_MAX_DAMAGE_BONUS,
  COMBO_MAX_STREAK,
  COMBO_TIERS
} from '../config/combat.js';
import { BASE_BATTLE_CONFIG } from '../config/battle.js';

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

function normalizeWindowMs(value) {
  const fallback = BASE_BATTLE_CONFIG.comboWindowMs;
  const candidate = Number(value);
  if (!Number.isFinite(candidate)) return fallback;
  return Math.max(0, Math.floor(candidate));
}

function normalizeOptionalTime(value) {
  if (value === null || value === undefined) return null;
  return Math.max(0, Math.round(Number(value) || 0));
}

export function getComboWindowRemaining(combo = createComboState(), nowMs = combo.lastEventAtMs) {
  const expiresAtMs = normalizeOptionalTime(combo.expiresAtMs);
  const currentTime = normalizeOptionalTime(nowMs);
  if (expiresAtMs === null || currentTime === null) return 0;
  return Math.max(0, expiresAtMs - currentTime);
}

export function getComboWindowFacts(combo = createComboState(), nowMs = combo.lastEventAtMs) {
  const summary = cloneComboState(combo);
  const remainingMs = summary.streak > 0 ? getComboWindowRemaining(summary, nowMs) : 0;
  const remainingPercent = summary.comboWindowMs > 0
    ? Math.max(0, Math.min(100, Math.round((remainingMs / summary.comboWindowMs) * 100)))
    : 0;
  return {
    comboWindowMs: summary.comboWindowMs,
    expiresAtMs: summary.expiresAtMs,
    remainingMs,
    remainingPercent,
    isWindowActive: summary.isWindowActive && remainingMs > 0,
    isExpiring: remainingPercent > 0 && remainingPercent <= 28
  };
}

export function createComboState({
  streak = 0,
  chainCount = streak,
  comboWindowMs = BASE_BATTLE_CONFIG.comboWindowMs,
  expiresAtMs = null,
  lastEventAtMs = null,
  lastExpiredAtMs = null,
  lastChangeReason = 'run_started'
} = {}) {
  const normalizedStreak = normalizeStreak(chainCount);
  const legacyTier = getComboTierForStreak(normalizedStreak);
  const comboText = getVisibleComboText(normalizedStreak);
  const damageBonus = getDamageBonus(normalizedStreak);
  const rewardText = damageBonus > 0 ? `DMG +${damageBonus}` : '';
  const hasVisibleCombo = comboText !== '';
  const normalizedWindowMs = normalizeWindowMs(comboWindowMs);
  const normalizedExpiresAtMs = normalizeOptionalTime(expiresAtMs);
  const normalizedLastEventAtMs = normalizeOptionalTime(lastEventAtMs);
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
    comboWindowMs: normalizedWindowMs,
    expiresAtMs: normalizedStreak > 0 ? normalizedExpiresAtMs : null,
    remainingMs: normalizedStreak > 0
      ? getComboWindowRemaining({ expiresAtMs: normalizedExpiresAtMs, lastEventAtMs: normalizedLastEventAtMs }, normalizedLastEventAtMs)
      : 0,
    lastEventAtMs: normalizedLastEventAtMs,
    lastExpiredAtMs: normalizeOptionalTime(lastExpiredAtMs),
    isWindowActive: normalizedStreak > 0 && normalizedExpiresAtMs !== null,
    legacyMultiplierLabel: legacyTier.multiplierLabel,
    legacyTierDamageBonus: legacyTier.damageBonus,
    isCapped: normalizedStreak >= COMBO_MAX_STREAK,
    lastChangeReason
  };
}

export function cloneComboState(combo = createComboState()) {
  return createComboState({
    chainCount: combo.chainCount ?? combo.streak,
    comboWindowMs: combo.comboWindowMs,
    expiresAtMs: combo.expiresAtMs,
    lastEventAtMs: combo.lastEventAtMs,
    lastExpiredAtMs: combo.lastExpiredAtMs,
    lastChangeReason: combo.lastChangeReason
  });
}

export function expireComboIfNeeded(combo = createComboState(), nowMs = null, reason = 'combo_expired') {
  const previous = cloneComboState(combo);
  const currentTime = normalizeOptionalTime(nowMs);
  const expiresAtMs = normalizeOptionalTime(previous.expiresAtMs);
  const expired = previous.streak > 0 && currentTime !== null && expiresAtMs !== null && currentTime > expiresAtMs;
  if (!expired) {
    return {
      previous,
      combo: previous,
      expired: false,
      changed: false
    };
  }
  const next = createComboState({
    streak: 0,
    comboWindowMs: previous.comboWindowMs,
    lastEventAtMs: currentTime,
    lastExpiredAtMs: currentTime,
    lastChangeReason: reason
  });
  return {
    previous,
    combo: next,
    expired: true,
    changed: JSON.stringify(previous) !== JSON.stringify(next)
  };
}

export function incrementCombo(combo = createComboState(), reason = 'safe_press', { atMs = null, windowMs = null } = {}) {
  const expiryCheck = expireComboIfNeeded(combo, atMs);
  const previous = expiryCheck.combo;
  const currentTime = normalizeOptionalTime(atMs);
  const comboWindowMs = normalizeWindowMs(windowMs ?? previous.comboWindowMs);
  const next = createComboState({
    streak: previous.streak + 1,
    comboWindowMs,
    expiresAtMs: currentTime === null ? previous.expiresAtMs : currentTime + comboWindowMs,
    lastEventAtMs: currentTime,
    lastExpiredAtMs: previous.lastExpiredAtMs,
    lastChangeReason: reason
  });
  return {
    previous: expiryCheck.previous,
    expired: expiryCheck.expired,
    combo: next,
    changed: JSON.stringify(previous) !== JSON.stringify(next)
  };
}

export function resetCombo(combo = createComboState(), reason = 'reset') {
  const previous = cloneComboState(combo);
  const next = createComboState({
    streak: 0,
    comboWindowMs: previous.comboWindowMs,
    lastEventAtMs: previous.lastEventAtMs,
    lastExpiredAtMs: previous.lastExpiredAtMs,
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
