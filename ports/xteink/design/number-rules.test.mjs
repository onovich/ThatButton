import assert from 'node:assert/strict';
import {matchesNumber as matches, matchesButton, conditionLines} from './number-rules.js';

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
  assert.deepEqual(fixtures.map(button=>matchesButton(button,{mode,shape:'triangle',kind:'prime',negated:true})),expected.map(v=>!v));
}
console.log('PASS: shape/number AND and OR truth tables');
assert.deepEqual(conditionLines({mode:'and',shape:'triangle',kind:'prime'}),['三角形','并且是','质数']);
assert.deepEqual(conditionLines({mode:'or',shape:'circle',kind:'ending',n:7,negated:true}),['除了圆形','或','尾数为7之外']);
console.log('PASS: whole-condition NOT and wording');
