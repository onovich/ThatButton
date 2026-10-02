import assert from 'node:assert/strict';
import { createDifficultyDiagnostics, DIFFICULTY_STORAGE_KEY } from '../src/difficulty-diagnostics.js';
import { generateLevelData } from '../../../src/core/level.js';
import { createSeededRng } from '../../../src/core/rng.js';
import { reportSummaryPages } from '../src/report-export.js';
const storage = new Map();
const wx = {getStorageSync:k=>storage.get(k),setStorageSync:(k,v)=>storage.set(k,JSON.parse(JSON.stringify(v))),removeStorageSync:k=>storage.delete(k)};
const diagnostic=createDifficultyDiagnostics(wx,{buildId:'test-build',now:()=>100});
const rng=createSeededRng('difficulty-report');
diagnostic.setEnabled(true,{});
for(let session=0;session<5;session++) {
  diagnostic.reset({});
  for(let level=31;level<=90;level++) {
    const round=generateLevelData({level,rng});
    const state={...round,currentDifficulty:round.difficulty,currentRuleId:round.ruleId,seed:'test',level,
      timeLimit:round.difficulty.timeLimitMs+round.difficulty.compensationMs,timeLeft:4000,roundStartedAtMs:500,lastTime:500,hazards:{}};
    diagnostic.begin(state);
    state.lastTime=800;diagnostic.press(state,false);diagnostic.tick(state,0);diagnostic.finish(state,'clear');
  }
}
const summary=diagnostic.summary();
assert.equal(summary.reports.length,4);
assert.ok(JSON.stringify(summary).length<=12000);
assert.ok(summary.reports.every(r=>r.droppedRounds===28));
assert.ok(reportSummaryPages(summary).some(p=>p.includes('通关')));
const parts=diagnostic.details();
assert.equal(parts.length,4);
assert.ok(parts.every(p=>p.rows.length===8&&JSON.stringify(p).length<=5905));
assert.ok(parts.every(p=>p.rows.every(r=>r[16]===300)));
assert.equal(parts[0].fields[28],'secondColor');
assert.ok(reportSummaryPages(parts[0])[0].includes('关卡'));
assert.equal(createDifficultyDiagnostics(wx).summary().reports.length,4);
diagnostic.clear();assert.equal(storage.has(DIFFICULTY_STORAGE_KEY),false);
// Full-width counters and maximum metadata stay within the summary budget.
const max=summary.reports[0];
max.buckets.forEach(b=>b.fill(2147483647));max.totals.fill(2147483647);
for(const key of ['sessionId','buildId','seed','planVersion'])max[key]='x'.repeat(128);
assert.ok(JSON.stringify(max).length<=2800);
console.log('Difficulty diagnostics: bounded storage, restart, four runs, partition export, params, pause-safe click clock and clear passed.');
