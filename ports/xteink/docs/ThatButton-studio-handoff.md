# 别碰那个按钮 · Studio 设备版交付

> 已废止的首轮交接：用户已明确要求由 Codex 在本地实现 Lua，Studio 仅负责导入、校验、预览和打包。权威源码现为 `ports/xteink/app/`，交付状态见 `DELIVERY.md`。下文要求 Studio 编写 Lua 的内容不再适用。

本文件来自 ThatButton 当前已确认的阅星曈原型；目标工作区仅为「别碰那个按钮」。禁止修改、复制覆盖或提交「方寸牌局」。

## 本次交付
将下列真实 HTML/JS/CSS 原型迁移为 X4 Pro 480×800 黑白 Lua 应用 0.1.0，校验、运行、生成可下载的 .xtapp。当前范围是可交互的形状与数学条件试玩，不是完整战斗游戏。保留全部当前原型能力，用设备内「条件设置」页替代浏览器旁边的设置区；返回主面板保持已选规则。

- 保留圆、三角、方、星的真实几何轮廓及内部大数字，禁止用形状名称代替图形。白底、黑线、黑色禁止指令块、九宫格；禁用颜色、纹理、A-D/组xx。
- 固定九键值/形状与附录源码一致。只看数字、只看形状、且、或四模式；multiple/ending/contains/odd/even/prime/composite 七规则；倍数 n=2–9，其余参数 n=0–9。1–99 正整数无前导零，1 非质非合，2 偶质数。
- 默认三角形 且 质数；27 三角形安全，17 三角形危险。可反复点击，不扣护盾；反馈解释原因，不出现“已试”标签；可清除反馈、可标出危险答案。
- 提供条件说明；无安全或无危险键时提示固定样例局限，不给出假成功。无需倒计时、升级或新战斗系统。
- 触摸和方向键/OK 均可操作全部设置及九宫格；Back 仅返回页面，最外层不调用 ctx:quit（参考项目打包测试曾因此失败）。焦点框独立于危险标记，无点击穿透。
- 不承诺断电保存；有效变化请求局刷，静止无连续刷新。使用当前官方 Lua/API/manifest 契约，不假设 WebView、不运行 HTML。独立 app_id、名称别碰那个按钮、版本0.1.0；禁止继承参考项目ID。
- 如需多个源码模块，确保最终打包入口可在官方运行时执行。中文字体/换行以真实预览验证，不假设任意字号参数。

## 验收与回传
核实实际入口；校验规则的1/2/9/49/97边界、尾7与含7的70/72反例、shape/number/AND/OR真值表；运行设备预览并测试按键与触摸、设置返回、解释长文本。生成 .xtapp 后提供产物文件名、版本与校验/预览/打包各步结果；同时提供当前工程源码导出。不可把源码ZIP当安装包，不提交商店，不向其他项目发消息。不将模拟器通过当作真机已安装。

## 当前原型源码（逐文件原文）

### math-study.html

<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ThatButton · 数学条件试玩</title>
<link rel="stylesheet" href="math-study.css">
<main>
<header><div><small>THAT BUTTON / SHAPE + NUMBER</small><h1>读懂条件，再按按钮。</h1><p>保留形状，结合倍数、尾数、包含、奇偶、质数与合数。</p></div></header>
<section class="lab"><div class="settings"><h2>数学条件试玩</h2><p>选择禁止条件，试着找出安全数字。点击后会解释原因，可以反复尝试。</p>
 <label for="mode">禁止条件组合</label><select id="mode"><option value="number">只看数字</option><option value="shape">只看形状</option><option value="and" selected>形状 且 数字条件</option><option value="or">形状 或 数字条件</option></select>
 <label for="shape">形状条件</label><select id="shape"><option value="triangle">三角形</option><option value="circle">圆形</option><option value="square">方形</option><option value="star">星形</option></select>
 <label for="rule">数字条件</label><select id="rule"><option value="multiple">是 n 的倍数</option><option value="ending">尾数是 n</option><option value="contains">数字中含 n</option><option value="odd">是奇数</option><option value="even">是偶数</option><option value="prime" selected>是质数</option><option value="composite">是合数</option></select>
 <label for="parameter">n 的值</label><input id="parameter" type="number" value="3" min="2" max="9" step="1"><p id="parameter-note" class="note"></p>
 <label class="toggle"><input id="answers" type="checkbox"> 标出危险答案</label>
 <div class="explain"><h3 id="definition-title">条件说明</h3><p id="definition"></p></div>
 <p><b>1 既不是质数，也不是合数。</b><br>2 是唯一的偶质数；9、21、27、49 是奇合数。</p>
 <p class="note">这是本地规则原型，不扣护盾。使用 1–99 的正整数，不补前导零。画布为 480×800，窄屏可横向滚动；尚未接入设备。</p>
</div><div class="device-scroll"><div class="device" aria-label="480×800 数学条件面板">
 <div class="top"><b>THAT BUTTON</b><span>逻辑检修 / 03</span></div>
 <div class="instruction"><small>禁止按下</small><strong id="clue"></strong><span>按不符合条件的按钮。</span></div>
 <div class="legend">无需抢时间，先判断再操作。</div><div class="board" id="board"></div>
 <div id="feedback" class="feedback" aria-live="polite">先读条件，再按按钮。</div><div class="device-foot"><span>可重复点击，查看判断原因</span><button id="reset">清除反馈</button></div>
</div></div></section>
<section class="findings"><h2>从直观判断，到逻辑组合</h2><div><p><b>入门</b><br>形状、奇偶、尾数、包含某个数字。</p><p><b>进阶</b><br>倍数、质数与合数；通过按键反馈认识边界。</p><p><b>组合</b><br>“三角形且为质数”要求两个条件同时成立；“或”只需满足其中一个。</p></div><p>尾数为 7 与含数字 7 不相同：70、72 含 7，但尾数不是 7。“不是质数”也不等于“是合数”，因为还包括 1。</p></section>
</main><script type="module" src="math-study.js"></script>
</html>


### math-study.css

*{box-sizing:border-box}body{margin:0;background:white;color:black;font-family:'Microsoft YaHei',sans-serif}main{max-width:1180px;margin:auto;padding:36px 28px 72px}header{display:flex;justify-content:space-between;gap:24px;align-items:center;border-bottom:4px solid;padding-bottom:22px}h1{font-size:36px;margin:12px 0}h2{font-size:23px;margin:0 0 16px}h3{font-size:19px}p{line-height:1.8;margin:12px 0}small{font:13px Consolas,monospace;letter-spacing:2px}a{color:inherit}button,input,select{font:inherit;color:#000}button,select,input[type=number]{background:white;border:2px solid;padding:10px}button{cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid black;outline-offset:4px}input{accent-color:black}input[type=checkbox],input[type=radio]{width:18px;height:18px;vertical-align:middle}.controls{display:flex;gap:28px;flex-wrap:wrap;align-items:center;padding:26px 0}fieldset{border:1px solid;padding:12px 16px}legend{font-size:14px}fieldset label{display:inline-flex;align-items:center;gap:5px;margin:4px 12px 4px 0;min-height:30px}.toggle{display:block;line-height:1.6}.catalog{border-block:1px solid;padding:28px 0}.samples{display:flex;gap:22px;flex-wrap:wrap;margin:24px 0}.sample{text-align:center;margin:0}.sample svg{display:block;width:132px;height:112px}.sample figcaption{margin-top:9px}.note{font-size:14px}.lab{display:grid;grid-template-columns:minmax(220px,1fr) 482px;gap:64px;padding:40px 0;border-bottom:3px solid}.settings{max-width:430px}.settings>label:not(.toggle){display:block;margin:24px 0 8px;font-weight:700}.settings select{width:100%;min-height:48px}.settings input[type=number]{width:110px}.explain{border-top:2px solid;margin-top:30px;padding-top:10px}.device-scroll{overflow-x:auto}.device{width:480px;height:800px;border:1px solid;padding:20px;background:white}.top{height:58px;border-bottom:3px solid;display:flex;justify-content:space-between;align-items:center}.top b{font:900 24px Consolas,monospace}.top span{font-size:13px}.instruction{margin-top:20px;height:112px;background:black;color:white;padding:12px 16px}.instruction strong{font-size:26px;display:block;margin:6px 0}.instruction span{font-size:16px}.legend{height:55px;display:flex;align-items:center;gap:14px;font-size:14px}.legend svg{width:28px;height:18px;vertical-align:middle;margin-right:3px}.board{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.key{height:112px;padding:0;position:relative;border:0;background:white;isolation:isolate}.key svg{width:100%;height:112px;display:block}.key .answer{position:absolute;right:4px;top:3px;background:black;color:white;font-size:13px;padding:2px 4px;border:1px solid white}.key .attempt{position:absolute;left:4px;top:3px;background:white;color:black;border:1px solid;font-size:12px;padding:1px 4px}.feedback{height:102px;padding-top:20px;font-size:19px;line-height:1.6}.device-foot{display:flex;align-items:center;justify-content:space-between;border-top:2px solid;padding-top:12px;font-size:16px}.device-foot button{min-height:48px}.findings{padding-top:32px}.findings>div{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}@media(max-width:850px){.lab{grid-template-columns:1fr;gap:28px}.settings{max-width:none}.device-scroll{max-width:100%}.samples{gap:16px}.findings>div{grid-template-columns:1fr;gap:0}header{align-items:start;flex-direction:column}main{padding:24px 16px}h1{font-size:29px}}

.key{border:3px solid #000}.number{font:700 44px Consolas,monospace}.feedback{font-size:18px}.instruction strong{font-size:26px}

.key svg{height:106px}.feedback{font-size:16px;line-height:1.5}.instruction strong{font-size:23px}.device-foot{font-size:14px}


### math-study.js

import { matchesButton } from './number-rules.js';
const $ = id => document.getElementById(id);
const names = {circle:'圆形',triangle:'三角形',square:'方形',star:'星形'};
const cells = [
  {value:1,shape:'circle'},{value:2,shape:'square'},{value:9,shape:'star'},
  {value:17,shape:'triangle'},{value:21,shape:'circle'},{value:27,shape:'triangle'},
  {value:49,shape:'star'},{value:70,shape:'square'},{value:72,shape:'triangle'}
];
function tile(cell) {
  const paths={circle:'<circle cx="66" cy="55" r="38"/>',triangle:'<path d="M66 9L120 96H12Z"/>',square:'<rect x="29" y="18" width="74" height="74"/>',star:'<path d="M66 6L81 34L113 39L90 63L96 98L66 83L36 98L42 63L19 39L51 34Z"/>'};
  return `<svg viewBox="0 0 132 112" aria-hidden="true"><g fill="white" stroke="black" stroke-width="3" stroke-linejoin="round">${paths[cell.shape]}</g><text x="66" y="69" text-anchor="middle" font-family="Consolas,monospace" font-size="29" font-weight="bold">${cell.value}</text></svg>`;
}
const parameterized = kind => ['multiple', 'ending', 'contains'].includes(kind);
function valid() {
  if ($('mode').value === 'shape' || !parameterized($('rule').value)) return true;
  const raw = $('parameter').value, n = Number(raw);
  return raw !== '' && Number.isInteger(n) && n >= Number($('parameter').min) && n <= 9;
}
function danger(cell) { return matchesButton(cell, {mode:$('mode').value,shape:$('shape').value,kind:$('rule').value,n:Number($('parameter').value)}); }
function clue() {
  const n = Number($('parameter').value);
  const number = {multiple:`${n} 的倍数`,ending:`尾数为 ${n}`,contains:`含数字 ${n}`,odd:'奇数',even:'偶数',prime:'质数',composite:'合数'}[$('rule').value];
  const mode=$('mode').value,shape=names[$('shape').value];
  return mode==='number'?number:mode==='shape'?shape:`${shape} ${mode==='and'?'且':'或'} ${number}`;
}
function explanation(value) {
  const kind = $('rule').value, n = Number($('parameter').value);
  if (kind === 'prime' || kind === 'composite') {
    if (value === 1) return '1 既不是质数，也不是合数。';
    for (let d = 2; d*d <= value; d++) if (value%d === 0) return `${value} = ${d} × ${value/d}，是合数。`;
    return `${value} 只有 1 和自身两个正因数，是质数。`;
  }
  if (kind === 'multiple') return value%n === 0 ? `${value} = ${n} × ${value/n}。` : `${value} 除以 ${n} 余 ${value%n}。`;
  if (kind === 'ending') return `${value} 的个位是 ${value%10}。`;
  if (kind === 'contains') return `${value} 的十进制写法${String(value).includes(String(n))?'含有':'不含'}数字 ${n}。`;
  return `${value} 是${value%2?'奇数':'偶数'}。`;
}
function render() {
  const ok = valid();
  $('clue').textContent = ok ? clue() : '请先设置有效的 n';
  $('board').innerHTML = cells.map((cell,i) => `<button class="key" data-index="${i}" aria-label="数字 ${cell.value}，${names[cell.shape]}" ${ok?'':'disabled'}>${tile(cell)}${$('answers').checked&&ok&&danger(cell)?'<span class="answer">危险</span>':''}</button>`).join('');
  if (!ok) $('feedback').textContent = `n 请输入 ${$('parameter').min}–9 的整数。`;
  else if (cells.every(v=>!danger(v)) || cells.every(danger)) $('feedback').textContent = '此固定样例缺少安全或危险键，请换 n。';
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
  $('feedback').textContent = '先读条件，再按按钮。'; render();
}
$('rule').onchange = changed;
$('mode').onchange = changed;
$('shape').onchange = () => {$('feedback').textContent='形状条件已更新。';render();};
$('answers').onchange = render;
$('parameter').oninput = () => {$('feedback').textContent='条件已更新，可以重新判断。';render();};
$('reset').onclick = () => {$('feedback').textContent='先读条件，再按按钮。';render();};
$('board').onclick = e => {
  const b=e.target.closest('[data-index]'); if(!b||b.disabled)return;
  const i=Number(b.dataset.index),cell=cells[i],bad=danger(cell),mode=$('mode').value;
  const shapeInfo=mode==='number'?'':`${cell.value} 是${names[cell.shape]}${cell.shape===$('shape').value?'，符合形状条件。':'，不符形状条件。'}`;
  $('feedback').textContent=`${bad?'危险':'安全'}：${shapeInfo}${mode==='shape'?'':explanation(cell.value)}`;
  document.querySelector(`[data-index="${i}"]`).focus();
};
changed();


### number-rules.js

// Design-study predicates, independent of Web gameplay and rendering.
export function matchesButton(button, rule) {
  const shapeMatch = button.shape === rule.shape;
  if (rule.mode === 'shape') return shapeMatch;
  const numberMatch = matchesNumber(button.value, rule.kind, rule.n);
  if (rule.mode === 'number') return numberMatch;
  if (rule.mode === 'and') return shapeMatch && numberMatch;
  if (rule.mode === 'or') return shapeMatch || numberMatch;
  throw new RangeError('Unknown combination');
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


### number-rules.test.mjs

import assert from 'node:assert/strict';
import {matchesNumber as matches, matchesButton} from './number-rules.js';

const primes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97];
for(let value=1;value<=99;value++) {
  assert.equal(matches(value,'prime'),primes.includes(value),`prime ${value}`);
  assert.equal(matches(value,'composite'),value>1&&!primes.includes(value),`composite ${value}`);
}
const values=[1,2,9,17,21,27,49,70,72];
for(const [kind,n,expected] of [
  ['multiple',3,[9,21,27,72]],['ending',7,[17,27]],
  ['contains',7,[17,27,70,72]],['odd',null,[1,9,17,21,27,49]],
  ['even',null,[2,70,72]],['ending',0,[70]],['contains',0,[70]]
]) assert.deepEqual(values.filter(value=>matches(value,kind,n)),expected);
assert.equal(matches(77,'contains',7),true);
assert.equal(matches(7,'contains',0),false);
for(const args of [[0,'prime'],[100,'composite'],[1.5,'odd'],[12,'multiple',0],[12,'multiple',1],[12,'ending',10],[12,'contains',1.5],[12,'invalid']]) {
  assert.throws(()=>matches(...args),RangeError);
}
console.log('PASS: prime/composite 1–99, numeric examples and invalid inputs');
const fixtures=[{value:17,shape:'triangle'},{value:27,shape:'triangle'},{value:2,shape:'square'},{value:9,shape:'star'}];
for(const [mode,expected] of [['and',[true,false,false,false]],['or',[true,true,true,false]],['shape',[true,true,false,false]],['number',[true,false,true,false]]]) {
  assert.deepEqual(fixtures.map(button=>matchesButton(button,{mode,shape:'triangle',kind:'prime'})),expected);
}
console.log('PASS: shape/number AND and OR truth tables');
