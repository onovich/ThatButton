import {
  buildBestRecordFromRun,
  cloneBestRecord,
  compareRunToBest
} from './storage.js';

export function getButtonRecap(button) {
  if (!button) return null;
  return {
    id: button.id,
    color: button.color.name,
    colorId: button.color.id,
    shape: button.shape.name,
    shapeId: button.shape.id,
    number: button.number,
    label: `${button.color.name} ${button.shape.name} ${String(button.number).padStart(2, '0')}`
  };
}

export function getForbiddenButtonRecaps(buttons, forbiddenIds) {
  return forbiddenIds
    .map((id) => buttons.find((button) => button.id === id))
    .filter(Boolean)
    .map(getButtonRecap);
}

export function buildFailureRecap({
  failureReason,
  pressedButton = null,
  level,
  score,
  difficulty,
  ruleText,
  forbiddenIds,
  buttons,
  safeKeysRemaining,
  bestRecord,
  combat = null,
  combo = null,
  lastDamage = null
}) {
  const forbiddenButtons = getForbiddenButtonRecaps(buttons, forbiddenIds);
  const safeTotal = Math.max(0, difficulty.buttonCount - forbiddenButtons.length);
  const safeRemaining = Math.max(0, safeKeysRemaining);
  const safeCleared = Math.max(0, safeTotal - safeRemaining);
  const comparison = compareRunToBest(level, score, bestRecord);
  return {
    result: 'failure',
    failureReason,
    level,
    score,
    difficultyId: difficulty.id,
    gridSize: difficulty.gridSize,
    ruleText,
    fatalCount: forbiddenButtons.length,
    forbiddenButtons,
    pressedButton: getButtonRecap(pressedButton),
    safeTotal,
    safeCleared,
    safeRemaining,
    bestBefore: cloneBestRecord(bestRecord),
    bestAfter: cloneBestRecord(bestRecord),
    bestComparison: comparison,
    bestSaveStatus: 'not_saved',
    combat,
    combo,
    lastDamage
  };
}

export function buildVictoryRecap({
  level,
  score,
  difficulty,
  bestRecord,
  combat,
  combo,
  lastDamage
}) {
  const comparison = compareRunToBest(level, score, bestRecord);
  return {
    result: 'victory',
    failureReason: null,
    level,
    score,
    difficultyId: difficulty.id,
    gridSize: difficulty.gridSize,
    bestBefore: cloneBestRecord(bestRecord),
    bestAfter: cloneBestRecord(bestRecord),
    bestComparison: comparison,
    bestSaveStatus: 'not_saved',
    combat,
    combo,
    lastDamage
  };
}

export function previewBestRecordForRun(recap) {
  if (recap.bestComparison === 'new_best') {
    recap.bestAfter = buildBestRecordFromRun(recap.level, recap.score, 'preview');
    recap.bestSaveStatus = 'preview';
  }
  return recap;
}
