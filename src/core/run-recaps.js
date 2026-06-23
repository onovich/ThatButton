import { getEncounterFacts } from './encounter.js';
import { buildFailureRecap, buildVictoryRecap } from './recap.js';

export function buildFailureRecapFromState(state, { failureReason, pressedButton = null }) {
  return buildFailureRecap({
    failureReason,
    pressedButton,
    level: state.level,
    score: state.score,
    difficulty: state.currentDifficulty,
    ruleText: state.currentRuleText,
    forbiddenIds: state.forbiddenIds,
    buttons: state.buttons,
    safeKeysRemaining: state.safeKeysRemaining,
    bestRecord: state.bestRecord,
    ...getEncounterFacts(state)
  });
}

export function buildVictoryRecapFromState(state) {
  return buildVictoryRecap({
    level: state.level,
    score: state.score,
    difficulty: state.currentDifficulty,
    bestRecord: state.bestRecord,
    ...getEncounterFacts(state)
  });
}
