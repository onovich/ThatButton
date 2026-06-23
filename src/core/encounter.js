import { applyRoundClearDamage, createCombatState, getCombatSummary } from './combat.js';
import { createComboState, getComboSummary, incrementCombo, resetCombo } from './combo.js';

export function createEncounterState() {
  return {
    combat: createCombatState(),
    combo: createComboState(),
    lastCombatResult: null,
    lastVictoryRecap: null,
    lastRunResultRecap: null
  };
}

export function getEncounterFacts({ combat, combo, lastCombatResult }) {
  return {
    combat: getCombatSummary(combat),
    combo: getComboSummary(combo),
    lastDamage: lastCombatResult?.damage || null
  };
}

export function applySafePressCombo(combo) {
  return incrementCombo(combo, 'safe_press');
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
