import { getLatePlan } from '../../../src/config/late-plan.js';
import { createSeededRng } from '../../../src/core/rng.js';
import { createHazardDirectorState } from '../../../src/core/hazards.js';
import { BASE_HAZARD_CONFIG } from '../../../src/config/hazards.js';

export const WECHAT_HAZARDS = Object.freeze({
  swap: Object.freeze({ scale: .85, duration: 640, driftMs: 1400, arc: .27 }),
  glitch: Object.freeze({ count: 2, duration: 2200, rate: 10, slice: .1,
    probability: .5, shift: .05, rgb: 2.8, strength: 1 })
});
// Wave counts are ceilings: clearing a round cancels the remaining scheduled waves.
export function hazardIntensityForLevel(level) {
  if (level <= 30) return { waves: 1, swapDriftMs: 1400, gapMs: 1400, driftCycleMs: 2400 };
  if (level <= 46) return { waves: 1, swapDriftMs: 1200, gapMs: 1400, driftCycleMs: 2200 };
  if (level <= 56) return { waves: 2, swapDriftMs: 1000, gapMs: 1200, driftCycleMs: 2000 };
  if (level <= 66) return { waves: 3, swapDriftMs: 850, gapMs: 900, driftCycleMs: 1700 };
  return { waves: 4, swapDriftMs: 700, gapMs: 700, driftCycleMs: 1400 };
}
function waveAt(nowMs, firstWarning, period, count) {
  return Math.max(0, Math.min(count - 1, Math.floor((nowMs - firstWarning) / period)));
}
export function hazardForLevel(level) {
  if (level > 30) {
    const plan = getLatePlan(level);
    return plan.hazardTier ? ['swap', 'drift', 'glitch'][(Math.floor((level - 31) / 10) + plan.slot) % 3] : null;
  }
  if (level < 19) return null;
  if (level < 28) return 'drift';
  if ([28,29,32,39].includes(level)) return 'swap';
  if ([31,34].includes(level)) return 'drift';
  if ([36,37].includes(level)) return 'glitch';
  if (level < 40) return null;
  if (level < 50) return ['swap','drift','glitch',null][(level-40)%4];
  return ['swap','drift','glitch','swap','drift',null][(level-50)%6];
}
function sampleHazards(options) {
  const {level=1,buttonIds=[],cols=3,nowMs=0,seed='game'}=options;
  const type=hazardForLevel(level);
  const intensity={...hazardIntensityForLevel(level)};
  if (level > 30) intensity.waves = getLatePlan(level).hazardTier;
  if(type==='drift') {
    const period=700+2600+intensity.gapMs;
    const wave=waveAt(nowMs,1200,period,intensity.waves), offset=wave*period;
    const state=createHazardDirectorState({...options,nowMs:nowMs-offset,config:{...BASE_HAZARD_CONFIG,
      movingButton:{...BASE_HAZARD_CONFIG.movingButton,cycleMs:intensity.driftCycleMs},
      interference:{...BASE_HAZARD_CONFIG.interference,unlockLevel:Number.MAX_SAFE_INTEGER}}});
    state.sampledAtMs=nowMs;
    for(const hazard of state.hazards) {
      hazard.wave=wave;
      if(level>30 && hazard.motion && hazard.phase==='active') {
        const local=nowMs-offset;
        const fade=Math.max(0,Math.min(1,(local-hazard.timing.startsAtMs)/200,(hazard.timing.endsAtMs-local)/200));
        hazard.motion.offsetXPx*=fade; hazard.motion.offsetYPx*=fade;
      }
      for(const key of Object.keys(hazard.timing || {})) hazard.timing[key]+=offset;
    }
    return state;
  }
  const state={enabled:true,unlocked:Boolean(type),level,sampledAtMs:nowMs,hazards:[],protectionWindows:[]};
  if(!type)return state;
  const random=createSeededRng(`${seed}:wechat-hazard:${level}`);
  const pool=[...buttonIds];
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  let targets;
  if(type==='swap'){
    const pairs=buttonIds.flatMap((id,i)=>i%cols<cols-1&&buttonIds[i+1]?[[id,buttonIds[i+1]]]:[]);
    targets=pairs[Math.floor(random()*pairs.length)]||[];
  }else targets=pool.slice(0,WECHAT_HAZARDS.glitch.count);
  const motion={...WECHAT_HAZARDS.swap,driftMs:intensity.swapDriftMs};
  const activeDuration=type==='swap'?motion.driftMs+motion.duration:WECHAT_HAZARDS.glitch.duration;
  const period=300+activeDuration+intensity.gapMs;
  const wave=waveAt(nowMs,1500,period,intensity.waves);
  const start=1800+wave*period;
  if(type==='swap'){
    const swapStart=start+motion.driftMs,end=swapStart+motion.duration;
    for(let i=0;i<intensity.waves;i++) {
      const from=1800+i*period+motion.driftMs;
      state.protectionWindows.push([from,from+motion.duration]);
    }
    state.hazards.push({type:'button_swap',targetButtonIds:targets,elapsedMs:Math.max(0,nowMs-start),
      wave,reversed:wave%2===1,motion,
      phase:nowMs<start-300?'inactive':nowMs<start?'telegraph':nowMs<end?'active':'settled',
      exchanging:nowMs>=swapStart&&nowMs<end});
  }else{
    state.hazards.push({type:'button_glitch',targetButtonIds:targets,elapsedMs:nowMs-start,
      wave,phase:nowMs<start-300?'inactive':nowMs<start?'telegraph':nowMs<start+WECHAT_HAZARDS.glitch.duration?'active':'expired'});
  }
  return state;
}
// Latch each wave against the actual round state; a skipped swap grants no protection.
export function createWechatHazards(options) {
  const state = sampleHazards(options);
  if (options.level <= 30 || !state.hazards.length) return state;
  const { level, nowMs = 0, clickedIds = [], previousState } = options;
  const plan = getLatePlan(level), intensity = hazardIntensityForLevel(level);
  const hazard = state.hazards[0], swap = hazard.type === 'button_swap';
  const drift = hazard.type === 'moving_button';
  const first = drift ? 1200 : 1500;
  const period = drift ? 700 + 2600 + intensity.gapMs : 300 + (swap ? intensity.swapDriftMs + 640 : 2200) + intensity.gapMs;
  const prior = previousState?.level === level && previousState.sampledAtMs <= nowMs ? previousState : null;
  const records = (prior?.waveRecords || []).map(r => ({...r}));
  for (let wave = records.length; wave < plan.hazardTier && first + wave * period <= nowMs; wave++) {
    const effectiveTargets = hazard.targetButtonIds.filter(id => !clickedIds.includes(id)).length;
    records.push({ wave, execute: effectiveTargets > 0, effectiveTargets });
  }
  state.waveRecords = records;
  state.plannedWaves = plan.hazardTier;
  state.protectionWindows = swap ? records.filter(r => r.execute).map(r => {
    const from = first + r.wave * period + 300 + intensity.swapDriftMs;
    return [from, from + 640];
  }) : [];
  const record = records[hazard.wave];
  if (record && !record.execute) {
    if (swap) {
      const executed = records.filter(r => r.execute && r.wave < hazard.wave).length;
      hazard.reversed = executed % 2 === 1; hazard.phase = 'inactive';
    } else hazard.phase = 'expired';
  } else if (swap) hazard.reversed = records.filter(r => r.execute && r.wave < hazard.wave).length % 2 === 1;
  if (!swap) hazard.targetButtonIds = hazard.targetButtonIds.filter(id => !clickedIds.includes(id));
  return state;
}
export function protectedDuration(windows,from,to){
  return (windows||[]).reduce((sum,[a,b])=>sum+Math.max(0,Math.min(to,b)-Math.max(from,a)),0);
}
const unit=v=>Math.max(0,Math.min(1,v));
const ease=v=>v*v*(3-2*v);
export function swapRect(rect,destination,index,elapsed,options=WECHAT_HAZARDS.swap){
  const {driftMs,duration,scale:minimum,arc:amplitude}=options;
  if(elapsed<driftMs){const fade=Math.sin(Math.PI*unit(elapsed/driftMs));return {...rect,
    x:rect.x+Math.sin(elapsed/145)*3*fade,y:rect.y+Math.sin(elapsed/190)*2*fade};}
  const t=(elapsed-driftMs)*640/duration,travel=ease(unit((t-100)/420));
  const scale=t<100?1-(1-minimum)*ease(unit(t/100)):t<520?minimum:minimum+(1-minimum)*ease(unit((t-520)/120));
  const cx=rect.x+rect.w/2+(destination.x-rect.x)*travel;
  const arc=Math.sin(Math.PI*Math.min(.5,travel*2,(1-travel)*2));
  const cy=rect.y+rect.h/2+(index===0?-1:1)*arc*rect.h*amplitude;
  return {x:cx-rect.w*scale/2,y:cy-rect.h*scale/2,w:rect.w*scale,h:rect.h*scale};
}
export function swapHazardRect(rect,destination,index,hazard) {
  const from=hazard.reversed?destination:rect, to=hazard.reversed?rect:destination;
  if (!['active','settled'].includes(hazard.phase)) return from;
  return swapRect(from,to,index,hazard.elapsedMs,hazard.motion || WECHAT_HAZARDS.swap);
}
export const rectsOverlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
// Work at logical tile resolution, never read neighbouring tile pixels.
export function slicePixels(input,width,height,time,config=WECHAT_HAZARDS.glitch,output=new Uint8ClampedArray(input.length)){
  const tick=Math.floor(time*config.rate);
  const hash=n=>{const v=Math.sin(n*127.1+17*13.13)*43758.5453123;return v-Math.floor(v)};
  for(let y=0;y<height;y++){
    const row=Math.floor(y/height/config.slice);
    const shift=hash(row+tick*19)<config.probability?(hash(row+tick*19+42)*2-1)*width*config.shift*config.strength:0;
    for(let x=0;x<width;x++){
      const dest=(y*width+x)*4;
      for(let c=0;c<3;c++){
        const split=c===0?config.rgb:c===2?-config.rgb:0;
        const sx=Math.max(0,Math.min(width-1,Math.round(x+shift+split*config.strength)));
        output[dest+c]=input[(y*width+sx)*4+c];
      }
      output[dest+3]=input[dest+3];
    }
  }
  return output;
}
