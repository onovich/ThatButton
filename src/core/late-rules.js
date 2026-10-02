import { COLORS, SHAPES } from '../config/difficulty.js';
import { getLatePlan, ruleCompensation } from '../config/late-plan.js';

const histories = new WeakMap();
const visual = ['colorShapeAnd', 'notColorShape', 'twoColorsOr'];
const parityFamilies = ['colorParityAnd', 'shapeParityAnd', 'colorOrParity'];
const shuffle = (values, rng) => {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export function rulePredicates({ id, params: p }, button) {
  const color = button.color.id === COLORS[p.color].id;
  const shape = button.shape.id === SHAPES[p.shape].id;
  const parity = button.number % 2 === p.parity;
  switch (id) {
    case 'colorShapeAnd': return [color, shape];
    case 'notColorShape': return [!color, shape];
    case 'colorParityAnd': case 'colorOrParity': return [color, parity];
    case 'shapeParityAnd': return [shape, parity];
    case 'twoColorsOr': return [color, button.color.id === COLORS[p.secondColor].id];
    case 'containsDigit': return [String(button.number).includes(String(p.digit))];
    case 'multipleOf': return [button.number % p.divisor === 0];
    default: throw new Error(`Unknown rule ${id}`);
  }
}
export function evaluateLateRule(rule, button) {
  const values = rulePredicates(rule, button);
  return ['colorOrParity', 'twoColorsOr'].includes(rule.id) ? values.some(Boolean) : values.every(Boolean);
}
export function renderLateRule({ id, params: p }) {
  const c = `颜色为【${COLORS[p.color].name}】`, s = `形状为【${SHAPES[p.shape].name}】`;
  const n = `数字为【${p.parity ? '奇数' : '偶数'}】`;
  return {
    colorShapeAnd: `${c}且${s}`, notColorShape: `颜色不是【${COLORS[p.color].name}】且${s}`,
    colorParityAnd: `${c}且${n}`, shapeParityAnd: `${s}且${n}`, colorOrParity: `${c}或${n}`,
    twoColorsOr: `${c}或【${COLORS[p.secondColor].name}】`,
    containsDigit: `数字中含【${p.digit}】`, multipleOf: `数字是【${p.divisor}】的倍数`
  }[id];
}

export function validateLateBoard(descriptor, buttons, plan) {
  const hits = buttons.filter(b => evaluateLateRule(descriptor, b));
  if (buttons.length !== 9 || new Set(buttons.map(b => b.number)).size !== 9 ||
      buttons.some(b => b.number < 1 || b.number > plan.numberMax) ||
      buttons.filter(b => b.number >= 10).length !== plan.twoDigitCount || hits.length < 2 || hits.length > 4) return false;
  const witnesses = new Set(buttons.map(b => rulePredicates(descriptor, b).map(Number).join('')));
  if (['colorShapeAnd', 'notColorShape', 'colorParityAnd', 'shapeParityAnd'].includes(descriptor.id) &&
      !['11', '10', '01', '00'].every(v => witnesses.has(v))) return false;
  if (['colorOrParity', 'twoColorsOr'].includes(descriptor.id) && !['10', '01', '00'].every(v => witnesses.has(v))) return false;
  if (['containsDigit', 'multipleOf'].includes(descriptor.id) && hits.filter(b => b.number >= 10).length < 2) return false;
  if (descriptor.id === 'containsDigit' && buttons.filter(b => b.number >= 10 && !evaluateLateRule(descriptor, b)).length < 2) return false;
  return true;
}

// Construct truth witnesses first, then choose unique numbers satisfying the exact digit quota.
function construct(descriptor, plan, rng, targetCount) {
  const id = descriptor.id;
  const unary = ['containsDigit', 'multipleOf'].includes(id);
  const or = ['colorOrParity', 'twoColorsOr'].includes(id);
  const repeat = (count, pattern) => Array.from({length:count}, () => pattern);
  const patterns = unary ? [...repeat(targetCount,[1]), ...repeat(9-targetCount,[0])] :
    or ? [[1,0], ...repeat(targetCount-1,[0,1]), ...repeat(9-targetCount,[0,0])] :
      [...repeat(targetCount,[1,1]), [1,0], [0,1], ...repeat(7-targetCount,[0,0])];
  const numbers = Array.from({ length: plan.numberMax }, (_, i) => i + 1);
  const candidates = patterns.map(pattern => shuffle(numbers, rng).map(number => {
    const attributes = [];
    for (const color of COLORS) for (const shape of SHAPES) {
      const button = { number, color, shape, isClicked: false };
      if (rulePredicates(descriptor, button).every((value, i) => Number(value) === pattern[i])) attributes.push(button);
    }
    return { number, attributes };
  }).filter(c => c.attributes.length && (!unary || pattern[0] !== 1 || c.number >= 10)));
  const result = [], used = new Set();
  // Digit allocation is a nine-bit bounded search, not repeated random board rejection.
  for (let mask = 0; mask < 512; mask++) {
    if (mask.toString(2).replaceAll('0', '').length !== plan.twoDigitCount) continue;
    result.length = 0; used.clear();
    for (let i = 0; i < 9; i++) {
      const candidate = candidates[i].find(c => !used.has(c.number) && (c.number >= 10) === Boolean(mask & (1 << i)));
      if (!candidate) break;
      used.add(candidate.number);
      result.push(candidate.attributes[Math.floor(rng() * candidate.attributes.length)]);
    }
    if (result.length === 9 && validateLateBoard(descriptor, result, plan)) return shuffle(result, rng).map((b, i) => ({ ...b, id: `btn-${i}`, displayNumber: String(b.number) }));
  }
  return null;
}

function allowedFamilies(plan) {
  if (plan.visualOnly) return visual;
  const families = [...visual, ...parityFamilies];
  if (plan.stage >= 1) families.push('containsDigit');
  if (plan.stage >= 2) families.push('multipleOf');
  return plan.scheduleRole === 'combined' ? families.filter(f => !visual.includes(f)) : families;
}

export function generateLateLevel({ level, difficulty, rng, forceFallback = false }) {
  const plan = getLatePlan(level);
  let history = histories.get(rng);
  if (!history || level <= history.level) history = { counts: {}, recent: [], parity: {}, level: 0 };
  const available = allowedFamilies(plan).filter(f => !(history.recent.length === 2 && history.recent.every(v => v === f)));
  const minimum = Math.min(...available.map(f => history.counts[f] || 0));
  const pool = available.filter(f => (history.counts[f] || 0) === minimum);
  const family = plan.ruleFamily || pool[Math.floor(rng() * pool.length)];
  const parity = plan.fixedParameter !== null && parityFamilies.includes(family) ? plan.fixedParameter :
    history.parity[family] ?? Math.floor(rng() * 2);
  const divisors = plan.stage < 3 ? [2, 5] : plan.stage < 4 ? [2, 3, 5] : plan.stage < 5 ? [2, 3, 4, 5, ...(level >= 76 ? [6] : [])] : [2, 3, 4, 5, 6, 7, ...(level >= 86 ? [9] : [])];
  const params = { color: Math.floor(rng() * 4), shape: Math.floor(rng() * 4), secondColor: 0, parity,
    digit: plan.stage < 3 ? 1 + Math.floor(rng() * 4) : Math.floor(rng() * 10),
    divisor: plan.fixedParameter ?? divisors[Math.floor(rng() * divisors.length)] };
  params.secondColor = (params.color + 1 + Math.floor(rng() * 3)) % 4;
  const targetCounts = shuffle([2,3,4], rng);
  let descriptor = { id: family, params }, buttons = null;
  if (!forceFallback) for (const count of targetCounts) { buttons = construct(descriptor, plan, rng, count); if(buttons)break; }
  let fallbackReason = null;
  if (!buttons) {
    // Canonical parameters have a deterministic constructive board for every reachable quota.
    descriptor = { id: family, params: { ...params, color: 0, shape: 0, secondColor: 1, digit: 1 } };
    for (const count of [2,3,4]) { buttons = construct(descriptor, plan, () => 0.5, count); if(buttons)break; }
    fallbackReason = 'parameterFallback';
  }
  if (!buttons) throw new Error(`Missing canonical board: ${family}/${plan.numberMax}/${plan.twoDigitCount}`);
  history.counts[family] = (history.counts[family] || 0) + 1;
  history.recent = [...history.recent, family].slice(-2);
  history.parity[family] = 1 - parity; history.level = level; histories.set(rng, history);
  const forbiddenIds = buttons.filter(b => evaluateLateRule(descriptor, b)).map(b => b.id);
  return { difficulty: { ...difficulty, ...plan, compensationMs: ruleCompensation(plan, family) },
    buttons, forbiddenIds, safeKeysRemaining: 9 - forbiddenIds.length,
    ruleText: renderLateRule(descriptor), ruleTier: 'late', ruleId: family, ruleDescriptor: descriptor, fallbackReason };
}
