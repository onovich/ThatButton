import { COLORS, SHAPES, getDifficultyForLevel } from '../config/difficulty.js';
import { createRandomTools } from './rng.js';
import { generateRule } from './rules.js';

export function generateLevelData({ level, difficulty = getDifficultyForLevel(level), rng }) {
  const randomTools = createRandomTools(rng);
  const buttons = [];
  const numbers = randomTools.shuffledNumbers(difficulty.buttonCount);

  for (let index = 0; index < difficulty.buttonCount; index++) {
    buttons.push({
      id: `btn-${index}`,
      color: randomTools.randomItem(COLORS),
      shape: randomTools.randomItem(SHAPES),
      number: numbers[index],
      isClicked: false
    });
  }

  const rule = generateRule(buttons, level, difficulty, randomTools);

  return {
    difficulty,
    buttons,
    forbiddenIds: rule.targetIds,
    safeKeysRemaining: difficulty.buttonCount - rule.targetIds.length,
    ruleText: rule.text,
    ruleTier: rule.ruleTier,
    ruleId: rule.ruleId
  };
}

export function getButtonSummary(button) {
  if (!button) return null;
  return {
    id: button.id,
    color: button.color.id,
    shape: button.shape.id,
    number: button.number
  };
}

export function getRoundSnapshot({
  level,
  seed,
  difficulty,
  forbiddenIds,
  ruleText,
  ruleTier,
  ruleId,
  timeLimit,
  safeKeysRemaining,
  player = null,
  combat = null,
  combo = null
}) {
  return {
    level,
    seed,
    difficultyId: difficulty.id,
    gridSize: difficulty.gridSize,
    rows: difficulty.rows,
    cols: difficulty.cols,
    buttonCount: difficulty.buttonCount,
    fatalCount: forbiddenIds.length,
    fatalRange: `${difficulty.fatalMin}-${difficulty.fatalMax}`,
    ruleText,
    ruleTier,
    ruleId,
    timeLimitMs: timeLimit,
    timeRewardMs: difficulty.timeRewardMs,
    readability: difficulty.readability,
    feedbackIntensity: difficulty.feedbackIntensity,
    safeKeysRemaining,
    player,
    combat,
    combo
  };
}
