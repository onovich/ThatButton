import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { getDifficultyForLevel } from '../src/config/difficulty.js';
import { generateLevelData } from '../src/core/level.js';
import { createSeededRng } from '../src/core/rng.js';

// Captured before the late-game edit: preserve all early boards/rules and numeric settings.
const early = [];
for (let seed = 0; seed < 30; seed++) for (let level = 1; level <= 30; level++) {
  const round = generateLevelData({ level, rng: createSeededRng(`curve-${seed}-${level}`) });
  const { maxLevel, ...difficulty } = round.difficulty;
  early.push({ ...round, difficulty });
}
assert.equal(createHash('sha256').update(JSON.stringify(early)).digest('hex'),
  '59ed75a03e36c116797ecc87f24c0c3754834cf8ddaee25c3a0864092612ddf0');

let previous = getDifficultyForLevel(30);
for (let level = 31; level <= 150; level++) {
  const next = getDifficultyForLevel(level);
  assert.ok(next.timeLimitMs <= previous.timeLimitMs && next.timeLimitMs >= 5500);
  assert.ok(previous.timeLimitMs - next.timeLimitMs <= 250, 'No sudden timer cliff at a band boundary.');
  assert.ok(next.timeRewardMs <= previous.timeRewardMs && next.timeRewardMs >= 200);
  assert.ok(next.carryoverRatio <= previous.carryoverRatio);
  assert.equal(next.buttonCount, 9);
  previous = next;
}

const { validateLateBoard, evaluateLateRule, renderLateRule, generateLateLevel } = await import('../src/core/late-rules.js');
const { getLatePlan } = await import('../src/config/late-plan.js');
const counts = {}, parity = [0,0];
for (let seed=0; seed<100; seed++) {
  const rng=createSeededRng(`late-${seed}`), mirror=createSeededRng(`late-${seed}`);
  for(let level=31;level<=150;level++) {
    const round=generateLevelData({level,rng});
    assert.deepEqual(round,generateLevelData({level,rng:mirror}));
    assert.ok(validateLateBoard(round.ruleDescriptor,round.buttons,getLatePlan(level)));
    assert.equal(round.ruleText,renderLateRule(round.ruleDescriptor));
    assert.deepEqual(round.forbiddenIds,round.buttons.filter(b=>evaluateLateRule(round.ruleDescriptor,b)).map(b=>b.id));
    assert.ok(round.buttons.every(b=>b.displayNumber===String(b.number)));
    counts[round.ruleId]=(counts[round.ruleId]||0)+1;
    if(['colorParityAnd','shapeParityAnd','colorOrParity'].includes(round.ruleId) && ![33,34,35,36].includes(level)) parity[round.ruleDescriptor.params.parity]++;
    if([33,34,35,36,43,44,53,54,63,64,73,74,76,83,84,86].includes(level)) assert.equal(round.difficulty.hazardTier,0);
  }
}
assert.ok(parity[0]/(parity[0]+parity[1])>=.45 && parity[0]/(parity[0]+parity[1])<=.55);
for(let level=31;level<=150;level++) {
  const round=generateLateLevel({level,difficulty:getDifficultyForLevel(level),rng:createSeededRng(`fallback-${level}`),forceFallback:true});
  assert.ok(validateLateBoard(round.ruleDescriptor,round.buttons,getLatePlan(level)));
  assert.equal(round.fallbackReason,'parameterFallback');
}
console.log('Passed: 900 unchanged early boards, 12000 late boards, deterministic replay, semantic witnesses, quotas, fallback and parity.',counts,parity);
