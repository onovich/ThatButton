export const COLORS = Object.freeze([
  { id: 'red', css: 'color-red', name: '红色' },
  { id: 'blue', css: 'color-blue', name: '蓝色' },
  { id: 'yellow', css: 'color-yellow', name: '黄色' },
  { id: 'purple', css: 'color-purple', name: '紫色' }
]);

export const SHAPES = Object.freeze([
  { id: 'triangle', char: '▲', name: '三角形' },
  { id: 'circle', char: '●', name: '圆形' },
  { id: 'square', char: '■', name: '正方形' },
  { id: 'star', char: '★', name: '五角星' }
]);

export const DIFFICULTY_BANDS = Object.freeze([
  {
    id: 'training',
    label: 'TRAINING',
    minLevel: 1,
    maxLevel: 2,
    rows: 2,
    cols: 2,
    buttonCount: 4,
    fatalMin: 1,
    fatalMax: 1,
    ruleTiers: ['singleVisual'],
    readability: 'short visual clue',
    maxClueChars: 34,
    baseTimeLimitMs: 18000,
    minTimeLimitMs: 17000,
    timeDropPerLevelMs: 500,
    timeRewardMs: 2200,
    carryoverRatio: 0.45,
    feedbackIntensity: 'calm'
  },
  {
    id: 'orientation',
    label: 'ORIENTATION',
    minLevel: 3,
    maxLevel: 5,
    rows: 2,
    cols: 3,
    buttonCount: 6,
    fatalMin: 1,
    fatalMax: 1,
    ruleTiers: ['singleVisual', 'singleNumber'],
    readability: 'single-axis clue',
    maxClueChars: 38,
    baseTimeLimitMs: 17000,
    minTimeLimitMs: 15500,
    timeDropPerLevelMs: 500,
    timeRewardMs: 1800,
    carryoverRatio: 0.4,
    feedbackIntensity: 'low'
  },
  {
    id: 'baseline',
    label: 'BASELINE',
    minLevel: 6,
    maxLevel: 10,
    rows: 3,
    cols: 3,
    buttonCount: 9,
    fatalMin: 1,
    fatalMax: 2,
    ruleTiers: ['singleVisual', 'singleNumber', 'compoundAnd'],
    readability: 'simple mixed clue',
    maxClueChars: 44,
    baseTimeLimitMs: 15500,
    minTimeLimitMs: 13500,
    timeDropPerLevelMs: 400,
    timeRewardMs: 1300,
    carryoverRatio: 0.34,
    feedbackIntensity: 'medium'
  },
  {
    id: 'pressure',
    label: 'PRESSURE',
    minLevel: 11,
    maxLevel: 15,
    rows: 3,
    cols: 3,
    buttonCount: 9,
    fatalMin: 2,
    fatalMax: 3,
    ruleTiers: ['compoundAnd', 'compoundExact', 'not', 'orColor'],
    readability: 'compound clue',
    maxClueChars: 50,
    baseTimeLimitMs: 13500,
    minTimeLimitMs: 11500,
    timeDropPerLevelMs: 400,
    timeRewardMs: 900,
    carryoverRatio: 0.28,
    feedbackIntensity: 'high'
  },
  {
    id: 'extended',
    label: 'EXTENDED',
    minLevel: 16,
    rows: 3,
    cols: 3,
    buttonCount: 9,
    fatalMin: 2,
    fatalMax: 4,
    ruleTiers: ['compoundAnd', 'compoundExact', 'not', 'orColor', 'orMixed'],
    readability: 'full rule set',
    maxClueChars: 56,
    baseTimeLimitMs: 12000,
    minTimeLimitMs: 9500,
    timeDropPerLevelMs: 250,
    timeRewardMs: 700,
    carryoverRatio: 0.22,
    feedbackIntensity: 'critical'
  }
]);

export function getDifficultyBand(level) {
  return DIFFICULTY_BANDS.find((band) =>
    level >= band.minLevel && (band.maxLevel === undefined || level <= band.maxLevel)
  ) || DIFFICULTY_BANDS[DIFFICULTY_BANDS.length - 1];
}

export function getDifficultyForLevel(level) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  const band = getDifficultyBand(normalizedLevel);
  const levelOffset = normalizedLevel - band.minLevel;
  const timeLimitMs = Math.max(
    band.minTimeLimitMs,
    band.baseTimeLimitMs - (levelOffset * band.timeDropPerLevelMs)
  );
  return {
    ...band,
    level: normalizedLevel,
    timeLimitMs,
    gridSize: `${band.rows}x${band.cols}`
  };
}
