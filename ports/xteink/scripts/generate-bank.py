"""Generate and audit complete 40-round routes OFF DEVICE."""
import json,hashlib
from pathlib import Path
from collections import Counter
from lupa.lua55 import LuaRuntime
ROOT=Path(__file__).resolve().parents[1]
vm=LuaRuntime(unpack_returned_tuples=True)
def read(f):return (ROOT/f).read_text(encoding='utf-8')
rules=vm.execute(read('app/domain/rules.lua'))
config=vm.execute(read('app/domain/progression.lua'))
words=vm.execute(read('app/domain/words.lua'))
game=vm.execute(read('scripts/offline-generator.lua').replace('require("domain.rules")','...').replace('require("domain.progression")','select(2,...)').replace('require("domain.words")','select(3,...)'),rules,config,words)
def plain(v):return {k:plain(x) for k,x in v.items()} if hasattr(v,'items') else v
shapes=['triangle','circle','square','star']
routes=[];encoded=[];fingerprints=set()
for route in range(1,21):
 seed=20260923+route*7919;boards=[];lines=[];ops=Counter();cats=[];rare=[]
 for level in range(1,41):
  b=game.generate(seed,level);r=b.rule
  assert rules.board_valid(b.cells,r)
  if level in [1,4]:assert r.mode=="shape",(route,level,r.mode)
  cells=[c for _,c in b.cells.items()]
  assert len({c.word or c.value for c in cells})==len(cells)
  op='not' if r.notNumber or r.wordNot else 'or' if r.mode in ['or','numbers','colorOr'] or r.wordJoin=='or' else 'and' if rules.compound(r) else 'single'
  ops[op]+=1
  if r.wordJoin:cats.append(r.category)
  if r.kind in ['prime','composite']:rare.append(level)
  clue=[v for _,v in rules.clue_lines(r).items()]
  assert len(clue)<=3 and all(isinstance(v,str) and not v.isdigit() for v in clue)
  mask=0;tokens=[]
  for i,c in enumerate(cells):
   if rules.matches(c,r):mask|=1<<i
   payload=('w'+c.wordKey[3:]) if c.word else str(c.value)
   tokens.append(str(shapes.index(c.shape)+1)+('b' if c.fill=='black' else 'w')+payload)
  ms=int(game.time_limit(level,seed))
  line='|'.join([str(ms),str(b.rows),str(b.cols),str(mask),'~'.join(clue),','.join(tokens)])
  assert line not in fingerprints;fingerprints.add(line)
  lines.append(line)
  boards.append(dict(id=f'R{route:02d}-L{level:02d}',seed=seed,level=level,ms=ms,operator=op,clue=clue,rule=plain(r),cells=[plain(c) for c in cells],fatalMask=mask))
 assert ops['single']==12 and ops['not']==6 and 7<=ops['or']<=8 and 14<=ops['and']<=15
 assert len(cats)==10 and len(set(cats))==10
 assert len(rare)<=3 and all(n>30 for n in rare) and all(b-a>1 for a,b in zip(rare,rare[1:]))
 routes.append(dict(id=route,seed=seed,operators=dict(ops),boards=boards))
 encoded.append('[=[\n'+'\n'.join(lines)+'\n]=]')
(ROOT/'app/domain/bank.lua').write_text('return {'+','.join(encoded)+'}\n',encoding='utf-8')
(ROOT/'artifacts/offline-routes.json').write_text(json.dumps(routes,ensure_ascii=False,indent=2),encoding='utf-8')
print('PASS: 20 complete routes, 800 unique boards, per-route operator/category/rare checks')
