import { DRIFT_MS, SWAP_MS, swapPose, hitAt, resolveTap, overlaps } from './hazard-lab-model.js';
import { slicePixels } from '../src/hazards.js';
const $ = id => document.getElementById(id);
const query = new URLSearchParams(location.search);
const definitions = {
 swap: [['scale','交换时保留尺寸',.85,.5,1,.01],['duration','交换时长 ms',640,400,1200,20],['driftMs','漂移时长 ms',1400,300,3000,100],['arc','绕行高度 / 按钮高',.27,.05,.5,.01]],
 unity: [['count','目标按钮数',2,1,4,1],['duration','持续时间 ms',2200,400,3000,100],['rate','变化频率 Hz',10,2,24,1],['slice','切片高度比例',.1,.02,.35,.01],['probability','切片触发概率',.5,.1,1,.05],['shift','位移比例',.05,0,.2,.01],['rgb','RGB 分离像素',2.8,0,6,.2]],
 room: [['count','目标按钮数',2,1,4,1],['duration','持续时间 ms',1200,400,3000,100],['rate','变化频率 Hz',12,2,24,1],['shift','撕裂位移比例',.036,0,.16,.002],['rgb','RGB 分离像素',1,0,6,.2],['grain','噪点',.055,0,.25,.005],['scan','扫描线',.06,0,.3,.01],['block','暗块概率',.006,0,.08,.002],['tear','撕裂带宽度',.025,.005,.12,.005]]
};
let saved={};try{saved=JSON.parse(localStorage.getItem('thatbutton-hazard-tuning-v2')||'{}')}catch{}
const settings={};
for(const [name,defs] of Object.entries(definitions)){
  settings[name]={};const panel=document.createElement('div');panel.className='tuning';
  panel.innerHTML='<strong>参数（自动保存）</strong>';
  for(const [key,label,value,min,max,step] of defs){
    const candidate=Number(saved[name]?.[key]??value);settings[name][key]=Number.isFinite(candidate)?Math.max(min,Math.min(max,candidate)):value;
    const row=document.createElement('label');row.innerHTML=`<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${settings[name][key]}"><output>${settings[name][key]}</output>`;
    row.querySelector('input').oninput=e=>{settings[name][key]=Number(e.target.value);row.querySelector('output').value=e.target.value;persist();};panel.append(row);
  }
  $(name+'-status').after(panel);
}
const exportBox=document.createElement('textarea');exportBox.id='tuning-export';exportBox.rows=6;exportBox.readOnly=true;
const exportButton=document.createElement('button');exportButton.textContent='复制当前参数';
exportButton.onclick=async()=>{persist();try{await navigator.clipboard.writeText(exportBox.value);exportButton.textContent='已复制参数'}catch{exportBox.select();exportButton.textContent='请复制已选中的参数'}};
document.querySelector('.foot').prepend(exportButton,exportBox);
function persist(){const data={...settings,strength:{unity:Number($('unity-strength').value),room:Number($('room-strength').value)}};try{localStorage.setItem('thatbutton-hazard-tuning-v2',JSON.stringify(data))}catch{}exportBox.value=JSON.stringify(data,null,2)}
for(const name of ['unity','room']){if(saved.strength?.[name])$(name+'-strength').value=saved.strength[name];$(name+'-strength').oninput=persist;document.querySelector(`[data-play="${name}"]`).textContent='播放一次';}
persist();
window.addEventListener('error',event=>{
  document.body.dataset.tests='failed';const out=document.createElement('pre');out.textContent=event.message;document.body.prepend(out);
});
const canvases = Object.fromEntries(['swap','unity','room'].map(id=>[id,$(id)]));
const contexts = Object.fromEntries(Object.entries(canvases).map(([id,c])=>[id,c.getContext('2d')]));
const sourceFrame = $('source');
const lab = await new Promise((resolve,reject)=>{
  const started=performance.now(); const timer=setInterval(()=>{
    const value=sourceFrame.contentWindow?.previewLab;
    if(value){clearInterval(timer);resolve(value)}
    else if(performance.now()-started>15000){clearInterval(timer);reject(new Error('游戏预览加载失败，请刷新页面'))}
  },30);
});
lab.view.draw();
const base=document.createElement('canvas');base.width=320;base.height=568;
const baseCtx=base.getContext('2d',{willReadFrequently:true});baseCtx.drawImage(lab.canvas,0,0);
// Obtain the actual rendered hit rectangles, avoiding a second layout implementation.
const bounds=new Map();
for(let y=0;y<568;y++)for(let x=0;x<320;x++){
  const action=lab.view.hitTest(x,y);if(action?.type!=='press')continue;
  const r=bounds.get(action.buttonId)||{id:action.buttonId,x,y,right:x,bottom:y};
  r.x=Math.min(r.x,x);r.y=Math.min(r.y,y);r.right=Math.max(r.right,x);r.bottom=Math.max(r.bottom,y);bounds.set(r.id,r);
}
const tiles=[...bounds.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(r=>({...r,w:r.right-r.x+1,h:r.bottom-r.y+1}));
if(tiles.length!==9)throw new Error(`预览应有 9 个按钮，实际 ${tiles.length}`);
const board={x:Math.min(...tiles.map(r=>r.x))-2,y:Math.min(...tiles.map(r=>r.y))-3};
board.w=Math.max(...tiles.map(r=>r.x+r.w))+2-board.x;
board.h=Math.max(...tiles.map(r=>r.y+r.h))+3-board.y;
const sample=baseCtx.getImageData(1,200,1,1).data;
const paper=`rgb(${sample[0]},${sample[1]},${sample[2]})`;
const original=baseCtx.getImageData(board.x,board.y,board.w,board.h);
const hash=n=>{const a=Math.sin(n*127.1+17*13.13)*43758.5453;return a-Math.floor(a)};
let poses=tiles,swapStart=null,swapElapsed=0,pointerDown=null,feedbackUntil=0;
const effects={unity:{start:null,hold:false,last:-1},room:{start:null,hold:false,last:-1}};
const targets={unity:['btn-0','btn-1'],room:['btn-0','btn-1']};
function selectTargets(name){
  const pool=[...tiles];for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  targets[name]=pool.slice(0,settings[name].count).map(r=>r.id);
  $(name+'-targets').textContent='本次目标：'+targets[name].map(id=>String(lab.buttons.find(b=>b.id===id).number).padStart(2,'0')).join('、');
}
for(const name of ['unity','room']){
 const line=document.createElement('p');line.id=name+'-targets';line.className='target-list';$(name+'-status').before(line);
 const reroll=document.createElement('button');reroll.className='secondary';reroll.textContent='重新抽取目标';
 reroll.onclick=()=>{effects[name].start=null;contexts[name].drawImage(base,0,0);selectTargets(name);$(name+'-status').textContent='目标已选定，点击播放';};line.before(reroll);selectTargets(name);
}
function drawSwap(elapsed){
  const ctx=contexts.swap;ctx.drawImage(base,0,0);ctx.fillStyle=paper;
  ctx.fillRect(board.x,board.y,board.w,board.h);
  poses=tiles.map((r,i)=>i<2?{...swapPose(r,tiles[1-i],i,elapsed,settings.swap),id:r.id}:r);
  poses=poses.map(r=>({...r,y:Math.max(board.y,Math.min(board.y+board.h-r.h,r.y))}));
  poses.forEach((r,i)=>{const s=tiles[i];ctx.drawImage(base,s.x,s.y,s.w,s.h,r.x,r.y,r.w,r.h)});
}
function stateText(t){const protectedCount=poses.filter(a=>poses.some(b=>a.id!==b.id&&overlaps(a,b))).length;return protectedCount?`交换中 · ${protectedCount} 个重叠按钮暂不结算点击（保护双方）`:t<settings.swap.driftMs?'漂移中 · 可点击':t<settings.swap.driftMs+settings.swap.duration?'交换中 · 触区跟随按钮':'交换完成 · 新位置保留，可点击确认'}
$('swap-play').onclick=()=>{swapStart=performance.now();pointerDown=null};
$('swap-reset').onclick=()=>{swapStart=null;swapElapsed=0;pointerDown=null;drawSwap(0);$('swap-status').textContent='已复位 · 点击“漂移并交换”'};
function coords(e){const r=canvases.swap.getBoundingClientRect();return{x:(e.clientX-r.left)*320/r.width,y:(e.clientY-r.top)*568/r.height}}
canvases.swap.onpointerdown=e=>{const p=coords(e);pointerDown=hitAt(poses,p.x,p.y);canvases.swap.setPointerCapture(e.pointerId)};
canvases.swap.onpointerup=e=>{const p=coords(e),id=resolveTap(pointerDown,hitAt(poses,p.x,p.y));pointerDown=null;
  feedbackUntil=performance.now()+1400;
  $('swap-status').textContent=id?`命中 ${String(lab.buttons.find(b=>b.id===id).number).padStart(2,'0')} · ${id}（演示不扣体力）`:'这次点击已取消：落点改变或未命中按钮';
  if(id){const r=poses.find(p=>p.id===id),ctx=contexts.swap;ctx.save();ctx.strokeStyle='#06a58d';ctx.lineWidth=3;ctx.strokeRect(r.x+2,r.y+2,r.w-4,r.h-4);ctx.restore()}
};
canvases.swap.onpointercancel=()=>{pointerDown=null};
// CPU Canvas adaptations of the source shaders; only the board pixels are processed.
function glitch(name,time,strength){
  const ctx=contexts[name];ctx.drawImage(base,0,0);
  const p=settings[name];
  for(const tile of tiles.filter(r=>targets[name].includes(r.id))){
  const {w,h}=tile,input=baseCtx.getImageData(tile.x,tile.y,w,h).data,out=ctx.createImageData(w,h),dst=out.data;
  if(name==='unity'){dst.set(slicePixels(input,w,h,time,{...p,strength}));ctx.putImageData(out,tile.x,tile.y);continue;}
  const tick=Math.floor(time*p.rate);
  const read=(x,y,c)=>input[(y*w+Math.max(0,Math.min(w-1,Math.round(x))))*4+c];
  for(let y=0;y<h;y++){
    const v=y/h;
    const slice=Math.floor(v/(p.slice||.1));
    const unityShift=hash(slice+tick*19)<p.probability?(hash(slice+tick*19+42)*2-1)*w*p.shift*strength:0;
    const row=Math.floor(v*172),rowShift=hash(row+tick*17)>.955?(hash(row*4.73+tick*3.58)-.5)*w*p.shift:0;
    const centers=[.528+Math.sin(tick/12*3.4)*.02,.668+Math.sin(tick/12*5.7)*.014,.38+Math.sin(tick/12*4.1)*.012];
    const tear=Math.max(...centers.map((c,i)=>Math.max(0,1-Math.abs(v-c)/((p.tear||.025)*[1,.58,.42][i]))));
    for(let x=0;x<w;x++){
      const cell=Math.floor(x/w*48)+Math.floor(v*30)*48;
      const block=hash(cell+Math.floor(tick*7/12)*991)>.986;
      const shift=name==='unity'?unityShift:(rowShift+(hash(Math.floor(tick*9/12)+71)-.5)*w*p.shift*tear+(block?(hash(cell+12.7)-.5)*w*p.shift*1.7:0))*strength;
      const split=name==='unity'?0:p.rgb*(1+Math.abs(shift)*.22+tear)*strength;
      const scan=name==='unity'?1:1-strength*(p.scan*(1-Math.sin(y*3.1416))+p.scan*.25*(1-Math.sin(y*.42)));
      const grain=name==='unity'?0:(hash(x+y*w+tick*1009)-.5)*p.grain*255*strength;
      const drop=name==='room'&&hash(cell*1.7+Math.floor(tick*5/12))>1-p.block?1-.42*strength:1;
      const i=(y*w+x)*4;
      dst[i]=read(x+shift+split,y,0)*scan*drop+grain;
      dst[i+1]=read(x+shift*.92,y,1)*scan*drop+grain;
      dst[i+2]=read(x+shift-split*1.15,y,2)*scan*drop+grain;dst[i+3]=255;
    }
  }
  ctx.putImageData(out,tile.x,tile.y);
  }
}
for(const name of ['unity','room']){
  const start=hold=>{if(targets[name].length!==settings[name].count)selectTargets(name);effects[name]={start:performance.now(),hold,last:-1}};
  document.querySelector(`[data-play="${name}"]`).onclick=()=>start(false);
  document.querySelector(`[data-hold="${name}"]`).onclick=()=>start(true);
  document.querySelector(`[data-stop="${name}"]`).onclick=()=>{effects[name].start=null;contexts[name].drawImage(base,0,0);$(name+'-status').textContent='已停止 · 正常画面'};
}
function frame(now){
  if(swapStart!==null){swapElapsed=now-swapStart;drawSwap(swapElapsed);if(now>feedbackUntil)$('swap-status').textContent=stateText(swapElapsed);if(swapElapsed>=settings.swap.driftMs+settings.swap.duration)swapStart=null}
  for(const name of ['unity','room']){
    const fx=effects[name];if(fx.start===null)continue;
    const elapsed=now-fx.start;
    const duration=settings[name].duration;
    if(!fx.hold&&elapsed>=duration){fx.start=null;contexts[name].drawImage(base,0,0);$(name+'-status').textContent='播放结束 · 恢复正常';continue}
    const tick=Math.floor(elapsed/(1000/settings[name].rate));if(tick===fx.last)continue;fx.last=tick;
    const envelope=fx.hold?1:Math.min(1,elapsed/100,(duration-elapsed)/100);
    glitch(name,elapsed/1000,Number($(name+'-strength').value)*envelope);
    $(name+'-status').textContent=fx.hold?'持续预览中 · 目标固定':`干扰中 · ${(elapsed/1000).toFixed(1)} / ${duration/1000} 秒 · 目标固定`;
  }
  requestAnimationFrame(frame);
}
drawSwap(0);contexts.unity.drawImage(base,0,0);contexts.room.drawImage(base,0,0);
$('swap-status').textContent='准备交换 · 可先点击按钮确认命中';$('ready').textContent='已加载真实游戏素材 · 仅本地预览';
window.hazardLab={tiles,board,getPoses:()=>poses,drawSwap,glitch};
document.body.dataset.ready='true';
if(query.has('selftest')){
  const check=(condition,message)=>{if(!condition)throw new Error(message)};
  let samples=0;
  const originalSwap={...settings.swap};
  for(const scale of [.5,.85,1])for(const arc of [.05,.27,.5]){
  settings.swap={scale,arc,duration:640,driftMs:1400};
  for(let t=0;t<=DRIFT_MS+SWAP_MS+100;t+=2){
    drawSwap(t);samples++;
    for(let i=0;i<poses.length;i++){
      const a=poses[i],protectedTile=poses.some(b=>a.id!==b.id&&overlaps(a,b));
      check(hitAt(poses,a.x+a.w/2,a.y+a.h/2)===(protectedTile?null:a.id),`点击保护错误 ${t} ${a.id}`);
    }
  }
  }
  settings.swap=originalSwap;
  check(Math.abs(poses[0].x-tiles[1].x)<.01,'交换终点错误');
  check(resolveTap('btn-0','btn-1')===null,'跨对象点击未取消');
  check(resolveTap(null,'btn-1')===null,'空白按下不能激活');
  const shared=[{id:'a',x:0,y:0,w:10,h:10},{id:'b',x:2,y:2,w:10,h:10}];
  check(hitAt(shared,5,5)===null,'歧义点击没有取消');
  for(const name of ['unity','room']){
    glitch(name,.63,1);
    const a=contexts[name].getImageData(board.x,board.y,board.w,board.h).data;
    check(a.some((v,i)=>v!==original.data[i]),`${name} 没有改变像素`);
    const outside=contexts[name].getImageData(0,0,320,board.y).data,expected=baseCtx.getImageData(0,0,320,board.y).data;
    check(outside.every((v,i)=>v===expected[i]),`${name} 影响了提示区域`);
    for(const tile of tiles.filter(r=>!targets[name].includes(r.id))){
      const actual=contexts[name].getImageData(tile.x,tile.y,tile.w,tile.h).data,reference=baseCtx.getImageData(tile.x,tile.y,tile.w,tile.h).data;
      check(actual.every((v,i)=>v===reference[i]),`${name} 改变了非目标按钮 ${tile.id}`);
    }
  }
  const result=document.createElement('pre');result.id='test-result';result.textContent=`PASS: ${samples} trajectory samples; overlap protects both tiles; cancelled ambiguous taps; final positions; both glitch outputs; unselected tiles and HUD unchanged`;
  document.body.append(result);document.body.dataset.tests='passed';
}
if(query.has('snapshot')){
  drawSwap(Number(query.get('swapTime')||1710));glitch('unity',.63,1);glitch('room',.63,1);
  $('swap-status').textContent='交换途中定格 · 用于查看轨迹间距';
}else requestAnimationFrame(frame);
