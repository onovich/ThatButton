import { LATE_PLAN_VERSION } from '../../../src/config/late-plan.js';
import { hashSeed } from '../../../src/core/rng.js';

export const DIFFICULTY_STORAGE_KEY = 'thatbutton.wechat.difficulty.v1';
const RULES = ['colorShapeAnd', 'notColorShape', 'twoColorsOr', 'colorParityAnd', 'shapeParityAnd', 'colorOrParity', 'containsDigit', 'multipleOf'];
const ROLES = ['range', 'teach', 'practice', 'mixed', 'hazard', 'pressure', 'combined', 'rest', 'review'];
const OUTCOMES = ['clear', 'timeout', 'health-depleted', 'aborted'];
const FIELDS = ['level','role','rule','color','shape','parity','digit','divisor','numberMax','twoDigits','forbidden','safe','upgradeMs','startMs','minimumMs','endMs','firstClickMs','safeClicks','forbiddenPress','outcome','firstDamage','fallback','hazardType','waves','executed','skipped','effectiveTargets','protectedMs','secondColor','generationMs'];
const size = value => JSON.stringify(value).length;
const integer = value => Math.min(2147483647, Math.max(0, Math.round(Number(value) || 0)));
const validReport = r => r?.schemaVersion === 1 && r?.summary && Array.isArray(r.rounds) && size(r) <= 16000 && size(r.summary) <= 2800;

export function createDifficultyDiagnostics(wx, { buildId, now = () => Date.now() } = {}) {
  let enabled = false, report = null, current = null, serial = 0;
  function history() {
    const stored = wx.getStorageSync?.(DIFFICULTY_STORAGE_KEY);
    const entries = Array.isArray(stored) ? stored : [];
    return { reports: entries.filter(validReport).slice(-4), ignoredRecords: entries.filter(r => !validReport(r)).length };
  }
  function startReport(state) {
    const seed = String(state.seed || '');
    report = { schemaVersion: 1, summary: {
      sessionId: `${now()}:${++serial}`, buildId: String(buildId || '').slice(0,128), planVersion: LATE_PLAN_VERSION,
      seed: seed.length <= 128 ? seed : String(hashSeed(seed)), seedTruncated: seed.length > 128,
      buckets: Array.from({length:24}, () => [0,0,0,0,0,0]), totals: [0,0,0], saturated: false
    }, rounds: [], droppedRounds: 0 };
  }
  function save() {
    if (!report) return;
    while (size(report) > 16000 && report.rounds.length) { report.rounds.shift(); report.droppedRounds++; }
    if (!validReport(report)) throw new Error('difficulty report budget exceeded');
    const previous = history().reports.filter(r => r.summary.sessionId !== report.summary.sessionId).slice(-3);
    wx.setStorageSync?.(DIFFICULTY_STORAGE_KEY, [...previous, report]);
  }
  function add(bucket, index, amount = 1) {
    const value = bucket[index] + amount;
    if (value > 2147483647) report.summary.saturated = true;
    bucket[index] = integer(value);
  }
  function finish(state, outcome) {
    if (!current) return;
    const d = current.difficulty, p = current.params, h = state.hazards || {};
    const waves = h.waveRecords || [], executed = waves.filter(w => w.execute).length;
    const row = [current.level, ROLES.indexOf(d.scheduleRole), RULES.indexOf(current.rule), p.color,p.shape,p.parity,p.digit,p.divisor,
      d.numberMax,d.twoDigitCount,current.forbidden,current.safe,current.upgrade,current.start,current.minimum,Math.max(0,state.timeLeft),
      current.firstClick ?? -1,current.safeClicks,current.forbiddenPress,OUTCOMES.indexOf(outcome),current.forbiddenPress ? 1 : outcome === 'timeout' ? 2 : 0,
      current.fallback ? 1 : 0,['button_swap','moving_button','button_glitch'].indexOf(h.hazards?.[0]?.type),
      h.plannedWaves || 0,executed,waves.length-executed,waves.reduce((n,w)=>n+w.effectiveTargets,0),current.protected,p.secondColor,current.generationMs];
    const tuple = row.map(v => Math.round(Number(v) || 0));
    if (size(tuple) > 512) throw new Error('difficulty tuple budget exceeded');
    report.rounds.push(tuple);
    if (report.rounds.length > 32) { report.rounds.shift(); report.droppedRounds++; }
    const buckets = [Math.min(6,Math.floor((current.level-31)/10)),7+RULES.indexOf(current.rule),19+(d.hazardTier || 0)];
    for (const index of buckets) { const b = report.summary.buckets[index]; add(b,0); add(b,OUTCOMES.indexOf(outcome)+1); add(b,5,current.forbiddenPress); }
    for (const [i,value] of [executed,waves.length-executed,current.protected].entries()) add(report.summary.totals,i,value);
    current = null; save();
  }
  return {
    setEnabled(value, state) { if (!value && current) finish(state,'aborted'); enabled = Boolean(value); if (!enabled) save(); },
    reset(state) { if (current) finish(state,'aborted'); report = null; },
    begin(state) {
      if (!enabled || state.level <= 30) return;
      if (current) finish(state,'aborted');
      if (!report) startReport(state);
      const d=state.currentDifficulty;
      current={level:state.level,difficulty:d,params:state.ruleDescriptor.params,rule:state.currentRuleId,
        generationMs:state.generationMs, fallback:state.fallbackReason,forbidden:state.forbiddenIds.length,safe:state.safeKeysRemaining,
        upgrade:state.timeLimit-d.timeLimitMs-(d.compensationMs||0),start:state.timeLeft,minimum:state.timeLeft,
        begun:state.roundStartedAtMs,firstClick:null,safeClicks:0,forbiddenPress:0,protected:0};
    },
    tick(state, protectedMs=0) { if(current) { current.minimum=Math.min(current.minimum,state.timeLeft); current.protected+=protectedMs; } },
    press(state, fatal) { if(current) { current.firstClick ??= state.lastTime-state.roundStartedAtMs; current[fatal?'forbiddenPress':'safeClicks']++; } },
    finish,
    clear() { current=null; report=null; enabled=false; wx.removeStorageSync?.(DIFFICULTY_STORAGE_KEY); },
    summary() {
      save(); const stored=history();
      const bundle={schemaVersion:1,type:'thatbutton.difficulty-summary',detailIncluded:false,ignoredRecords:stored.ignoredRecords,
        rules:RULES,roles:ROLES,counters:['started','cleared','timeout','healthDepleted','aborted','forbiddenPress'],
        reports:stored.reports.map(r=>({...r.summary,droppedRounds:r.droppedRounds}))};
      if(size(bundle)>12000) throw new Error('summary export budget exceeded');
      return bundle;
    },
    details(sessionIndex=-1) {
      save(); const records=history().reports; const selected=records.at(sessionIndex); if(!selected)return [];
      const total=Math.ceil(selected.rounds.length/8);
      return Array.from({length:total},(_,i)=>{
        const rows=selected.rounds.slice(i*8,i*8+8);
        const part={schemaVersion:1,type:'thatbutton.difficulty-detail',sessionId:selected.summary.sessionId,
          part:i+1,total,fromLevel:rows[0][0],toLevel:rows.at(-1)[0],droppedRounds:selected.droppedRounds,
          fields:FIELDS,rules:RULES,roles:ROLES,outcomes:OUTCOMES,rows};
        if(size(part)>12000)throw new Error('detail export budget exceeded'); return part;
      });
    }
  };
}
