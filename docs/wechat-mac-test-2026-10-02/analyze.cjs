const fs = require('fs'), crypto = require('crypto'), zlib = require('zlib');
const dir = 'docs/wechat-mac-test-2026-10-02';
const raw = zlib.gunzipSync(fs.readFileSync(`${dir}/iphone17-level48-score2910.trace.json.gz`));
const trace = JSON.parse(raw), events = trace.traceEvents || trace;
const data = events.find(e => e.name === 'ProfileChunk').args.data;
const {nodes, samples} = data.cpuProfile, deltas = data.timeDeltas;
const index = new Map(nodes.map(n => [n.id,n]));
const key = n => `${n.callFrame.functionName || '(anonymous)'} | ${n.callFrame.url || '(native/unknown)'}`;
const counts = {}, leaf = new Map(), inclusive = new Map(), callers = {}, chains = {};
const targets = ['fillText','label','send','getImageData','measuredWidth'];
let missing = 0, cycles = 0, maxDepth = 0;
function add(map,k,d) {const a=map.get(k)||{samples:0,intervalUs:0};a.samples++;a.intervalUs+=d;map.set(k,a);}
for(let i=0;i<samples.length;i++) {
  const d=deltas[i], n=index.get(samples[i]); counts[d]=(counts[d]||0)+1;
  if(!n){missing++;continue;} add(leaf,key(n),d);
  const path=[], seen=new Set(); let p=n;
  while(p){if(seen.has(p.id)){cycles++;break;}seen.add(p.id);path.push(p);p=index.get(p.parent);}
  maxDepth=Math.max(maxDepth,path.length);
  for(const k of new Set(path.map(key))) add(inclusive,k,d);
  if(targets.includes(n.callFrame.functionName)) {
    const f=n.callFrame.functionName;
    callers[f] ||= new Map(); chains[f] ||= new Map();
    add(callers[f],path.slice(1,4).map(key).join(' <- '),d);
    add(chains[f],path.slice().reverse().map(key).join(' > '),d);
  }
}
const total=deltas.reduce((a,b)=>a+b,0);
const ranked=m=>[...m.entries()].map(([functionKey,v])=>({functionKey,...v,intervalMs:v.intervalUs/1000,sharePct:100*v.intervalUs/total})).sort((a,b)=>b.intervalUs-a.intervalUs);
const out={sha256:crypto.createHash('sha256').update(raw).digest('hex'),rawBytes:raw.length,events:events.map(e=>({name:e.name,ts:e.ts,dur:e.dur})),nodes:nodes.length,samples:samples.length,deltaHistogram:counts,totalIntervalUs:total,missing,cycles,maxDepth,leaf:ranked(leaf),inclusive:ranked(inclusive),callers:Object.fromEntries(Object.entries(callers).map(([k,v])=>[k,ranked(v)])),chains:Object.fromEntries(Object.entries(chains).map(([k,v])=>[k,ranked(v).slice(0,10)]))};
fs.mkdirSync('output/mac-test-2026-10-02', { recursive: true });
fs.writeFileSync('output/mac-test-2026-10-02/analysis-stats.json',JSON.stringify(out,null,2));
console.log(JSON.stringify({...out,leaf:out.leaf.slice(0,20),inclusive:out.inclusive.slice(0,20),chains:undefined,callers:Object.fromEntries(Object.entries(out.callers).map(([k,v])=>[k,v.slice(0,4)]))},null,2));
