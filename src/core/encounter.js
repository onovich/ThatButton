import { applyRoundClearDamage, createCombatState, getCombatSummary } from './combat.js';
import {
  createComboState,
  expireComboIfNeeded,
  getComboSummary,
  getComboWindowFacts,
  incrementCombo,
  resetCombo
} from './combo.js';
import { createPlayerState, getPlayerSummary } from './player.js';

export function createEncounterState() {
  return {
    player: createPlayerState(),
    combat: createCombatState(),
    combo: createComboState(),
    lastPlayerDamage: null,
    lastCombatResult: null,
    lastVictoryRecap: null,
    lastRunResultRecap: null
  };
}

export function getEncounterFacts({ player, combat, combo, lastPlayerDamage, lastCombatResult }) {
  return {
    player: getPlayerSummary(player),
    combat: getCombatSummary(combat),
    combo: getComboSummary(combo),
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

export function resetEncounterCombo(combo, reason) {
  return resetCombo(combo, reason);
}

export function resolveRoundClearCombat({ combat, level, timeLeft, combo }) {
  return applyRoundClearDamage(combat, {
    level,
    timeLeftMs: timeLeft,
    comboState: combo
  });
}
