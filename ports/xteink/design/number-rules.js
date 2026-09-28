// Design-study predicates, independent of Web gameplay and rendering.
export function matchesButton(button, rule) {
  const result = matchesBase(button, rule);
  return rule.negated ? !result : result;
}
function matchesBase(button, rule) {
  const shapeMatch = button.shape === rule.shape;
  if (rule.mode === 'shape') return shapeMatch;
  const numberMatch = matchesNumber(button.value, rule.kind, rule.n);
  if (rule.mode === 'number') return numberMatch;
  if (rule.mode === 'and') return shapeMatch && numberMatch;
  if (rule.mode === 'or') return shapeMatch || numberMatch;
  throw new RangeError('Unknown combination');
}
export function conditionLines(rule) {
  const shapes={circle:'圆形',triangle:'三角形',square:'方形',star:'星形'};
  const n=rule.n;
  const labels={multiple:`${n}的倍数`,ending:`尾数为${n}`,contains:`含数字${n}`,odd:'奇数',even:'偶数',prime:'质数',composite:'合数'};
  const number=labels[rule.kind];
  const lines=rule.mode==='shape'?[shapes[rule.shape]]:rule.mode==='number'?[number]:[shapes[rule.shape],rule.mode==='and'?'并且是':'或',number];
  if(rule.negated){lines[0]='除了'+lines[0];lines[lines.length-1]+='之外';}
  return lines;
}
export function isPrime(value) {
  if (!Number.isInteger(value) || value < 2) return false;
  for (let divisor = 2; divisor * divisor <= value; divisor++) {
    if (value % divisor === 0) return false;
  }
  return true;
}
export function matchesNumber(value, kind, n) {
  if (!Number.isInteger(value) || value < 1 || value > 99) throw new RangeError('Expected integer 1–99');
  if (kind === 'odd') return value % 2 === 1;
  if (kind === 'even') return value % 2 === 0;
  if (kind === 'prime') return isPrime(value);
  if (kind === 'composite') return value > 1 && !isPrime(value);
  if (!['multiple', 'ending', 'contains'].includes(kind)) throw new RangeError('Unknown numeric rule');
  const min = kind === 'multiple' ? 2 : 0;
  if (!Number.isInteger(n) || n < min || n > 9) throw new RangeError('Invalid rule parameter');
  if (kind === 'multiple') return value % n === 0;
  if (kind === 'ending') return value % 10 === n;
  return String(value).includes(String(n));
}
