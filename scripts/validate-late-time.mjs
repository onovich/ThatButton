import assert from 'node:assert/strict';
import { getDifficultyForLevel } from '../src/config/difficulty.js';
import { generateLevelData } from '../src/core/level.js';
import { createSeededRng } from '../src/core/rng.js';
import { createGameSession } from '../src/app/game-session.js';
import { createWechatHazards } from '../ports/wechat/src/hazards.js';

// Same fixture and action stream: time upgrades must never reduce survival or recovery.
const rounds=Array.from({length:90},(_,i)=>generateLevelData({level:i+31,rng:createSeededRng(`fixed-${i}`)}));
const simulate=upgrade=>{
  let left=6000, survived=0;
  for(const round of rounds){
    const d=round.difficulty,base=d.timeLimitMs+upgrade,cap=base+d.compensationMs;
    left=Math.min(cap,left+base*d.carryoverRatio+d.compensationMs);
    const read=['teach','practice'].includes(d.scheduleRole)?3500:2500;
    left-=read;if(left<=0)return survived;
    for(let i=0;i<round.safeKeysRemaining;i++){
      left-=700;if(left<=0)return survived;
      survived++;left=Math.min(cap,left+d.timeRewardMs);
    }
  }
  return survived;
};
const survival=[0,2400,6000].map(simulate);
assert.ok(survival[0]<=survival[1]&&survival[1]<=survival[2]);
let now=0;const timers=[];const empty=()=>{};
const app=createGameSession({performance:{now:()=>now},requestAnimationFrame:empty,setTimeout:(fn)=>timers.push(fn),
  renderer:new Proxy({renderBoard:()=>0,beginRoundExit:()=>0,getButtonElement:()=>null},{get:(o,k)=>o[k]||empty}),
  audio:new Proxy({},{get:()=>empty}),storage:{getItem:()=>null,setItem:empty},hostBridge:{emit:empty},
  viewportSize:()=>({width:402,height:874}),seedProvider:()=> 'time-test',debugProvider:()=>false,
  hazardsDisabledProvider:()=>false,hazardDirector:createWechatHazards});
app.start();const state=app.getState();
// Jump in the harness only: production transition from 32 to the first compound tutorial at 33.
Object.assign(state,{level:32,combat:{...state.combat,hp:1e9,maxHp:1e9},timeLeft:1000,timeLimit:9500,
  currentDifficulty:getDifficultyForLevel(32)});
for(const button of [...state.buttons])if(!state.forbiddenIds.includes(button.id))app.press(button.id);
const before=state.timeLeft;while(timers.length)timers.shift()();
assert.equal(state.level,33);assert.equal(state.timeLimit,11000);
assert.equal(state.currentDifficulty.compensationMs,1500);
assert.equal(state.timeLeft,Math.min(11000,before+9500*.22+1500));
assert.equal(state.hazards.hazards.length,0);
// Input after timeout cannot obtain a click reward, even if the RAF callback hasn't run.
state.timeLeft=10;now+=20;
const safe=state.buttons.find(b=>!state.forbiddenIds.includes(b.id));
assert.equal(app.press(safe.id).accepted,false);
assert.equal(state.isPlaying,false);
console.log('Late timing: tutorial compensation, shared transition cap, no post-timeout clicks, fixed-input upgrade monotonicity passed.',survival);

const {extendProtectedCombo}=await import('../src/core/protected-clock.js');
const combo={expiresAtMs:1300,lastEventAtMs:1000};
extendProtectedCombo(combo,[[200,840]],0,1000,1000);
assert.equal(combo.expiresAtMs,1940);
const expired={expiresAtMs:1199,lastEventAtMs:1000};
extendProtectedCombo(expired,[[200,840]],0,1000,1000);
assert.equal(expired.expiresAtMs,1199,'Protection cannot revive an expired combo');
