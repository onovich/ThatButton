export const LATE_PLAN_VERSION = 'late-v2';

export function getLatePlan(level) {
  if (level <= 30) return null;
  const stage = Math.min(6, Math.floor((level - 31) / 10));
  const slot = (level - 31) % 10 + 1;
  const numberMax = [20, 50, 70, 99, 99, 99, 99][stage];
  const twoDigitCount = Math.min(9, 2 + stage * 2 + (slot > 2 ? 1 : 0));
  let scheduleRole = ['range', 'range', 'teach', 'practice', 'mixed', 'mixed', 'hazard', 'pressure', 'combined', 'rest'][slot - 1];
  let ruleFamily = null, fixedParameter = null;
  if (stage < 6 && [3, 4].includes(slot)) {
    ruleFamily = stage === 0 ? 'colorParityAnd' : stage === 1 ? 'containsDigit' : 'multipleOf';
    fixedParameter = stage === 0 ? (slot === 3 ? 1 : 0) : stage === 1 ? null : [5, 3, 4, 7][stage - 2];
  }
  if ([35, 36].includes(level)) {
    ruleFamily = 'shapeParityAnd'; fixedParameter = level === 35 ? 1 : 0;
    scheduleRole = level === 35 ? 'teach' : 'practice';
  }
  if ([76, 86].includes(level)) {
    ruleFamily = 'multipleOf'; fixedParameter = level === 76 ? 6 : 9; scheduleRole = 'practice';
  }
  if (stage === 6 && slot <= 4) scheduleRole = 'review';
  const visualOnly = ['range', 'hazard', 'pressure', 'rest'].includes(scheduleRole);
  const hazardAllowed = ['mixed', 'hazard', 'combined'].includes(scheduleRole);
  const maxWaves = level < 47 ? 1 : level < 57 ? 2 : level < 67 ? 3 : 4;
  const hazardTier = hazardAllowed ? (slot === 5 || slot === 6 ? 1 : maxWaves) : 0;
  return { planVersion: LATE_PLAN_VERSION, stage, slot, numberMax, twoDigitCount,
    scheduleRole, ruleFamily, fixedParameter, visualOnly, hazardTier };
}

export function ruleCompensation(plan, family) {
  if (!plan) return 0;
  if (plan.scheduleRole === 'teach') return 1500;
  if (plan.scheduleRole === 'practice') return 750;
  return family === 'containsDigit' ? 300 : family === 'multipleOf' ? 500 : 0;
}

export function formatButtonNumber(number, level = 1) {
  return level > 30 ? String(number) : String(number).padStart(2, '0');
}
