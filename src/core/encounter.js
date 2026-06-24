import { applyRoundClearDamage, createCombatState, createNextCombatState, getCombatSummary } from './combat.js';
import {
  createComboState,
  expireComboIfNeeded,
  getComboSummary,
  getComboWindowFacts,
  incrementCombo,
  resetCombo
} from './combo.js';
import { createPlayerState, getPlayerSummary } from './player.js';
import {
  createUpgradeState,
  getEffectiveComboWindowMs,
  getEffectiveRoundTimeLimitMs,
  getUpgradeSummary,
  offerUpgradeChoices,
  applyUpgradeChoice
} from './upgrades.js';

export function createEncounterState() {
  return {
    player: createPlayerState(),
    combat: createCombatState(),
    combo: createComboState(),
    upgrades: createUpgradeState(),
    lastPlayerDamage: null,
    lastCombatResult: null,
    lastVictoryRecap: null,
    lastRunResultRecap: null
  };
}

export function getEncounterFacts({ player, combat, combo, upgrades, lastPlayerDamage, lastCombatResult }) {
  return {
    player: getPlayerSummary(player),
    combat: getCombatSummary(combat),
    combo: getComboSummary(combo),
    upgrades: getUpgradeSummary(upgrades),
    lastPlayerDamage,
    lastDamage: lastCombatResult?.damage || null
  };
}

export function applySafePressCombo(combo, options = {}) {
  return incrementCombo(combo, 'safe_press', options);
}

export function expireEncounterComboIfNeeded(combo, nowMs) {
  return expireComboIfNeeded(combo, nowMs);
}

export function getEncounterComboWindow(combo, nowMs) {
  return getComboWindowFacts(combo, nowMs);
}

export function getEncounterComboWindowMs(upgrades) {
  return getEffectiveComboWindowMs(upgrades);
}

export function getEncounterRoundTimeLimitMs(difficulty, upgrades) {
  return getEffectiveRoundTimeLimitMs(difficulty.timeLimitMs, upgrades);
}

export function offerEncounterUpgradeChoices(upgrades, options = {}) {
  return offerUpgradeChoices(upgrades, options);
}

export function applyEncounterUpgradeChoice(upgrades, choiceId, options = {}) {
  return applyUpgradeChoice(upgrades, choiceId, options);
}

export function createNextEncounterCombat(combat) {
  return createNextCombatState(combat);
}

export function resetEncounterCombo(combo, reason) {
  return resetCombo(combo, reason);
}

export function resolveRoundClearCombat({ combat, level, timeLeft, combo, upgrades }) {
  return applyRoundClearDamage(combat, {
    level,
    timeLeftMs: timeLeft,
    comboState: combo,
    upgrades
  });
}
