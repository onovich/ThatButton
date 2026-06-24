import { COLORS, SHAPES, getDifficultyForLevel } from '../config/difficulty.js';

export const formatFatalRule = (conditionText) => conditionText;

export function generateRule(buttons, level, difficulty = getDifficultyForLevel(level), randomTools) {
  const { randomItem, randomValue } = randomTools;
  let targets = [];
  let attempts = 0;
  const maxAttempts = 100;

  const templates = [
    { id: 'color', tier: 'singleVisual', fn: () => {
      const color = randomItem(COLORS);
      return { txt: formatFatalRule(`颜色为【${color.name}】`), check: (button) => button.color.id === color.id };
    }},
    { id: 'shape', tier: 'singleVisual', fn: () => {
      const shape = randomItem(SHAPES);
      return { txt: formatFatalRule(`形状为【${shape.name}】`), check: (button) => button.shape.id === shape.id };
    }},
    { id: 'number-parity', tier: 'singleNumber', fn: () => {
      const isEven = randomValue() > 0.5;
      return {
        txt: formatFatalRule(`数字为【${isEven ? '偶数' : '奇数'}】`),
        check: (button) => isEven ? (button.number % 2 === 0) : (button.number % 2 !== 0)
      };
    }},
    { id: 'color-shape-and', tier: 'compoundAnd', fn: () => {
      const color = randomItem(COLORS);
      const shape = randomItem(SHAPES);
      return {
        txt: formatFatalRule(`颜色为【${color.name}】且形状为【${shape.name}】`),
        check: (button) => button.color.id === color.id && button.shape.id === shape.id
      };
    }},
    { id: 'color-number-exact', tier: 'compoundExact', fn: () => {
      const sample = randomItem(buttons);
      return {
        txt: formatFatalRule(`数字为【${sample.number}】且颜色为【${sample.color.name}】`),
        check: (button) => button.color.id === sample.color.id && button.number === sample.number
      };
    }},
    { id: 'not-color-shape', tier: 'not', fn: () => {
      const color = randomItem(COLORS);
      const shape = randomItem(SHAPES);
      return {
        txt: formatFatalRule(`颜色不是【${color.name}】且形状为【${shape.name}】`),
        check: (button) => button.color.id !== color.id && button.shape.id === shape.id
      };
    }},
    { id: 'two-colors-or', tier: 'orColor', fn: () => {
      const firstColor = randomItem(COLORS);
      let secondColor = randomItem(COLORS);
      while (secondColor.id === firstColor.id) secondColor = randomItem(COLORS);
      return {
        txt: formatFatalRule(`颜色为【${firstColor.name}】或【${secondColor.name}】`),
        check: (button) => button.color.id === firstColor.id || button.color.id === secondColor.id
      };
    }},
    { id: 'color-or-parity', tier: 'orMixed', fn: () => {
      const isEven = randomValue() > 0.5;
      const color = randomItem(COLORS);
      return {
        txt: formatFatalRule(`颜色为【${color.name}】或数字为【${isEven ? '偶数' : '奇数'}】`),
        check: (button) => button.color.id === color.id || (isEven ? (button.number % 2 === 0) : (button.number % 2 !== 0))
      };
    }}
  ];

  const availableTemplates = templates.filter((template) => difficulty.ruleTiers.includes(template.tier));

  while (attempts < maxAttempts) {
    const template = randomItem(availableTemplates);
    const rule = template.fn();
    targets = buttons.filter((button) => rule.check(button));

    if (
      targets.length >= difficulty.fatalMin &&
      targets.length <= difficulty.fatalMax &&
      rule.txt.length <= difficulty.maxClueChars
    ) {
      return {
        text: rule.txt,
        targetIds: targets.map((target) => target.id),
        ruleTier: template.tier,
        ruleId: template.id
      };
    }
    attempts++;
  }

  const fallbackTarget = buttons[0];
  const fallbackTargets = buttons.filter((button) =>
    button.color.id === fallbackTarget.color.id &&
    button.shape.id === fallbackTarget.shape.id &&
    button.number === fallbackTarget.number
  );
  return {
    text: formatFatalRule(`颜色为【${fallbackTarget.color.name}】且形状为【${fallbackTarget.shape.name}】且数字为【${fallbackTarget.number}】`),
    targetIds: fallbackTargets.map((target) => target.id),
    ruleTier: 'fallback',
    ruleId: 'exact-button'
  };
}
