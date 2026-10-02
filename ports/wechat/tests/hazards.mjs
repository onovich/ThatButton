import assert from 'node:assert/strict';
import {createWechatHazards,hazardForLevel,hazardIntensityForLevel,protectedDuration,swapRect,swapHazardRect,WECHAT_HAZARDS,slicePixels} from '../src/hazards.js';
import {createHazardDirectorState} from '../../../src/core/hazards.js';
const options={seed:'hazard-tests',enemyIndex:2,cols:3,buttonIds:Array.from({length:9},(_,i)=>`btn-${i}`)};
assert.equal(hazardForLevel(24),'drift'); assert.equal(hazardForLevel(28),'swap');
assert.equal(hazardForLevel(30),null);
const {getLatePlan}=await import('../../../src/config/late-plan.js');
const a={x:10,y:200,w:95,h:75},b={...a,x:116};
for(let level=31;level<=150;level++) {
 const plan=getLatePlan(level),type=hazardForLevel(level);
 assert.equal(Boolean(type),Boolean(plan.hazardTier));
 let previousState=null;
 for(let nowMs=0;nowMs<20000;nowMs+=100) {
  const state=createWechatHazards({...options,level,nowMs,previousState});
  assert.ok((state.waveRecords?.length||0)<=plan.hazardTier);
  if(type==='swap') {
   const executed=state.waveRecords.filter(w=>w.execute).length;
   assert.equal(protectedDuration(state.protectionWindows,0,100000),executed*640);
   const h=state.hazards[0];
   if(h.phase==='settled') assert.deepEqual(swapHazardRect(a,b,0,h),executed%2?b:a);
  }
  previousState=state;
 }
 const canceled=createWechatHazards({...options,level,nowMs:20000,clickedIds:options.buttonIds});
 assert.equal(protectedDuration(canceled.protectionWindows,0,100000),0);
 assert.ok((canceled.waveRecords||[]).every(w=>!w.execute));
}
const lateSwap=Array.from({length:30},(_,i)=>67+i).find(l=>getLatePlan(l).hazardTier===4&&hazardForLevel(l)==='swap');
let active=createWechatHazards({...options,level:lateSwap,nowMs:1500});
const latched=createWechatHazards({...options,level:lateSwap,nowMs:18000,previousState:active,clickedIds:options.buttonIds});
assert.equal(latched.waveRecords.filter(w=>w.execute).length,1);
assert.equal(protectedDuration(latched.protectionWindows,0,20000),640);
const old=createWechatHazards({...options,level:28,nowMs:0});
assert.equal(protectedDuration(old.protectionWindows,0,10000),640);
assert.deepEqual(swapRect(a,b,0,2040),b);
assert.equal(swapRect(a,b,0,1710).w,95*.85);
const pixels=Uint8ClampedArray.from({length:32*24*4},(_,i)=>i%4===3?255:(i*17)%256);
const result=slicePixels(pixels,32,24,.5);assert.notDeepEqual(result,pixels);
assert.deepEqual(slicePixels(pixels,32,24,.5,{...WECHAT_HAZARDS.glitch,strength:0}),pixels);
assert.deepEqual(result,slicePixels(pixels,32,24,.5),'same frame must not flicker on incidental redraws');
console.log('WeChat hazard schedule, stable targets, swap endpoint, protection and slice RGB checks passed.');

const reusable = new Uint8ClampedArray(pixels.length);
for (const time of [0, .1, .5, 1.2, 2.1]) {
  const expected = slicePixels(pixels,32,24,time);
  assert.equal(slicePixels(pixels,32,24,time,undefined,reusable), reusable);
  assert.deepEqual(reusable,expected,'Reused output must preserve every RGBA byte.');
}
