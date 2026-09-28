import { matchesButton, conditionLines } from './number-rules.js';
const $ = id => document.getElementById(id);
const names = {circle:'圆形',triangle:'三角形',square:'方形',star:'星形'};
const cells = [
  {value:1,shape:'circle'},{value:2,shape:'square'},{value:9,shape:'star'},
  {value:17,shape:'triangle'},{value:21,shape:'circle'},{value:27,shape:'triangle'},
  {value:49,shape:'star'},{value:70,shape:'square'},{value:72,shape:'triangle'}
];
function tile(cell) {
  const paths={circle:'<circle cx="70" cy="75" r="50"/>',triangle:'<path d="M70 10L130 126H10Z"/>',square:'<rect x="22" y="27" width="96" height="96"/>',star:'<path d="M70 13L90 47L130 55L105 87L108 130L70 112L32 130L35 87L10 55L50 47Z"/>'};
  return `<svg viewBox="0 0 140 150" aria-hidden="true"><g fill="white" stroke="black" stroke-width="3" stroke-linejoin="round">${paths[cell.shape]}</g><text x="70" y="${cell.shape==='triangle'?108:92}" text-anchor="middle" font-family="Arial,sans-serif" font-size="52" font-weight="bold">${cell.value}</text></svg>`;
}
const parameterized = kind => ['multiple', 'ending', 'contains'].includes(kind);
function valid() {
  if ($('mode').value === 'shape' || !parameterized($('rule').value)) return true;
  const raw = $('parameter').value, n = Number(raw);
  return raw !== '' && Number.isInteger(n) && n >= Number($('parameter').min) && n <= 9;
}
function selectedRule() {return {mode:$('mode').value,shape:$('shape').value,kind:$('rule').value,n:Number($('parameter').value),negated:$('negated').checked};}
function danger(cell) { return matchesButton(cell, selectedRule()); }
function clue() {
  return conditionLines(selectedRule()).join('\n');
}
function render() {
  const ok = valid();
  $('validation').textContent = '';
  $('clue').replaceChildren(...(ok ? conditionLines(selectedRule()) : ['请先设置有效的 n']).map(line => {
    const span=document.createElement('span');span.textContent=line;
    span.style.fontSize=Math.min(line==='并且是'||line==='或'?36:52,Math.floor(424/[...line].length))+'px';
    return span;
  }));
  $('board').innerHTML = cells.map((cell,i) => `<button class="key" data-index="${i}" aria-label="数字 ${cell.value}，${names[cell.shape]}" ${ok?'':'disabled'}>${tile(cell)}${$('answers').checked&&ok&&danger(cell)?'<span class="answer">危险</span>':''}</button>`).join('');
  if (!ok) $('validation').textContent = `n 请输入 ${$('parameter').min}–9 的整数。`;
  else if (cells.every(v=>!danger(v)) || cells.every(danger)) $('validation').textContent = '此固定样例缺少安全或危险键，请换 n。';
}
function changed() {
  const kind = $('rule').value;
  $('rule').disabled = $('mode').value === 'shape';
  $('shape').disabled = $('mode').value === 'number';
  $('parameter').disabled = $('mode').value === 'shape' || !parameterized(kind);
  $('parameter').min = kind === 'multiple' ? '2' : '0';
  if (parameterized(kind)) $('parameter').value = kind === 'multiple' ? '3' : '7';
  $('parameter-note').textContent = parameterized(kind) ? (kind==='multiple'?'n = 2–9。':'n = 0–9；尾数指个位数字。') : '此条件不需要 n。';
  $('definition').textContent = {
    multiple:'能被 n 整除的正整数。例如 21 = 3 × 7，所以是 3 的倍数。',
    ending:'只检查个位。17、27 的尾数是 7；70、72 的尾数不是 7。',
    contains:'检查十进制写法中的任意一位。17、27、70、72 都含数字 7。',
    odd:'除以 2 余 1 的整数。奇数可以是质数，也可以是合数。',
    even:'能被 2 整除的整数。2 是质数，其余正偶数是合数。',
    prime:'大于 1，且只有 1 和自身两个正因数的整数。例如 2、17。',
    composite:'大于 1，且除了 1 和自身还有其他正因数的整数。例如 9 = 3 × 3。'
  }[kind];
  $('validation').textContent = ''; render();
}
$('rule').onchange = changed;
$('mode').onchange = changed;
$('shape').onchange = () => {$('validation').textContent='';render();};
$('negated').onchange = () => {$('validation').textContent='';render();};
$('answers').onchange = render;
$('parameter').oninput = () => {$('validation').textContent='';render();};
$('board').onclick = e => {
  const b=e.target.closest('[data-index]'); if(!b||b.disabled)return;
  b.focus();
};
changed();
