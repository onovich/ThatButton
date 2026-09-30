import { createSeededRng } from '../../../src/core/rng.js';
import { createHazardDirectorState } from '../../../src/core/hazards.js';
import { BASE_HAZARD_CONFIG } from '../../../src/config/hazards.js';

export const WECHAT_HAZARDS = Object.freeze({
  swap: Object.freeze({ scale: .85, duration: 640, driftMs: 1400, arc: .27 }),
  glitch: Object.freeze({ count: 2, duration: 2200, rate: 10, slice: .1,
    probability: .5, shift: .05, rgb: 2.8, strength: 1 })
});
export function hazardForLevel(level) {
  if (level < 19) return null;
  if (level < 28) return 'drift';
  if ([28,29,32,39].includes(level)) return 'swap';
  if ([31,34].includes(level)) return 'drift';
  if ([36,37].includes(level)) return 'glitch';
  if (level < 40) return null;
  return ['swap',null,'glitch',null][(level-40)%4];
}
export function createWechatHazards(options) {
  const {level=1,buttonIds=[],cols=3,nowMs=0,seed='game'}=options;
  const type=hazardForLevel(level);
  if(type==='drift') return createHazardDirectorState({...options,config:{...BASE_HAZARD_CONFIG,
    interference:{...BASE_HAZARD_CONFIG.interference,unlockLevel:Number.MAX_SAFE_INTEGER}}});
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
  const start=1800;
  if(type==='swap'){
    const swapStart=start+WECHAT_HAZARDS.swap.driftMs,end=swapStart+WECHAT_HAZARDS.swap.duration;
    state.protectionWindows.push([swapStart,end]);
    state.hazards.push({type:'button_swap',targetButtonIds:targets,elapsedMs:Math.max(0,nowMs-start),
      phase:nowMs<1500?'inactive':nowMs<start?'telegraph':nowMs<end?'active':'settled',
      exchanging:nowMs>=swapStart&&nowMs<end});
  }else{
    state.hazards.push({type:'button_glitch',targetButtonIds:targets,elapsedMs:nowMs-start,
      phase:nowMs<1500?'inactive':nowMs<start?'telegraph':nowMs<start+WECHAT_HAZARDS.glitch.duration?'active':'expired'});
  }
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
export const rectsOverlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
// Work at logical tile resolution, never read neighbouring tile pixels.
export function slicePixels(input,width,height,time,config=WECHAT_HAZARDS.glitch){
  const output=new Uint8ClampedArray(input.length),tick=Math.floor(time*config.rate);
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
