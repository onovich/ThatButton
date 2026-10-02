import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createGameSession } from '../src/app/game-session.js';
import { createWechatHazards } from '../ports/wechat/src/hazards.js';

const models = { skilled: [800,1600,350], medium: [1500,2500,500], slow: [2500,3500,700] };
const results=[];
for (const [model,[read,newRead,cadence]] of Object.entries(models)) for(const strategy of ['no-time','balanced','time']) for(let seed=0;seed<20;seed++) {
  let now=0; const timers=[]; let offers=[], app;
  const rows=[];
  const empty=()=>{};
  const renderer=new Proxy({renderBoard:()=>0,beginRoundExit:()=>0,getButtonElement:()=>null,
    showUpgradeScreen:({choices})=>{offers=choices;},canPressButton:()=>{
      const h=app.getState().hazards.hazards?.find(h=>h.type==='button_swap'); return !h?.exchanging;
    }},{get:(target,key)=>target[key]||empty});
  const audio=new Proxy({},{get:()=>empty});
  app=createGameSession({performance:{now:()=>now},requestAnimationFrame:empty,setTimeout:(fn,delay)=>timers.push({at:now+delay,fn}),
    renderer,audio,storage:{getItem:()=>null,setItem:empty},hostBridge:{emit:empty},viewportSize:()=>({width:402,height:874}),
    seedProvider:()=>`balance-${seed}`,debugProvider:()=>false,hazardsDisabledProvider:()=>false,hazardDirector:createWechatHazards,
    roundDiagnostics:{finish:(state,outcome)=>rows.push({level:state.level,outcome,left:Math.round(state.timeLeft),rule:state.currentRuleId,
      timeLimit:state.timeLimit,role:state.currentDifficulty.scheduleRole,protection:(state.hazards.protectionWindows||[]).length*640})}});
  app.start();
  const advance=duration=>{
    const end=now+duration;
    while(now<end){now=Math.min(end,now+20);app.gameLoop(now);}
  };
  let lastLevel=0, guard=0;
  while(app.getState().level<=120 && guard++<3000) {
    const state=app.getState();
    if (!state.isPlaying) {
      if(offers.length){
        const choices=offers;offers=[];
        const priority=strategy==='time'?['round_time','base_attack','combo_reward']:strategy==='no-time'?['base_attack','combo_reward','combo_window','max_hp']:['base_attack','round_time','combo_reward'];
        const chosen=priority.map(type=>choices.find(c=>c.type===type)).find(Boolean)||choices[0];
        assert.ok(strategy!=='no-time'||chosen.type!=='round_time');app.selectUpgrade(chosen.id);continue;
      }
      if(timers.length){timers.sort((a,b)=>a.at-b.at);const t=timers.shift();now=Math.max(now,t.at);t.fn();continue;}
      break;
    }
    if(lastLevel!==state.level){lastLevel=state.level;advance(['teach','practice'].includes(state.currentDifficulty.scheduleRole)?newRead:read);}
    if(!state.isPlaying)continue;
    const button=state.buttons.find(b=>!b.isClicked&&!state.forbiddenIds.includes(b.id));
    advance(cadence);if(state.isPlaying)app.press(button.id);
  }
  assert.ok(guard<3000);
  results.push({model,strategy,seed,reached:Math.min(120,app.getState().level),outcome:rows.at(-1)?.outcome,
    bins:Array.from({length:12},(_,i)=>{const part=rows.filter(r=>r.level>i*10&&r.level<=(i+1)*10);return {from:i*10+1,cleared:part.filter(r=>r.outcome==='clear').length,minEndMs:part.length?Math.min(...part.map(r=>r.left)):null};})});
}
const summary=Object.keys(models).flatMap(model=>['no-time','balanced','time'].map(strategy=>{
  const runs=results.filter(r=>r.model===model&&r.strategy===strategy);
  return {model,strategy,reached60:runs.filter(r=>r.reached>=60).length,minLevel:Math.min(...runs.map(r=>r.reached)),maxLevel:Math.max(...runs.map(r=>r.reached))};
}));
assert.ok(summary.find(r=>r.model==='skilled'&&r.strategy==='no-time').reached60>=18);
writeFileSync(new URL('../docs/LATE_DIFFICULTY_SIMULATION.json',import.meta.url),JSON.stringify({scope:'Controlled real session, known safe clicks; not human success rates or phone performance',summary,results},null,2));
console.table(summary);
