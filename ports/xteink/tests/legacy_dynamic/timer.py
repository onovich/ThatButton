"""Test real device lifecycle countdown, pause, timeout and persistence."""
from run import Host,ROOT,build
import json
source=(build()/'index.lua').read_text(encoding='utf-8')
def plain(v):return {k:plain(x) for k,x in v.items()} if hasattr(v,'items') else v
def tick(h,ms):h.vm.globals().on_tick(h.ctx,ms);h.frame()
h=Host(source);assert h.s.run.remainingMs==12000 and h.ctx.tick_rate=='normal'
invalidations=h.ctx.invalidations;tick(h,250);assert h.s.run.remainingMs==11750 and h.ctx.invalidations==invalidations
tick(h,750);assert h.s.run.remainingMs==11000 and h.ctx.invalidations==invalidations+1
h.frame();assert h.s.run.remainingMs==11000
h.key('back');tick(h,10000);assert h.s.run.remainingMs==11000 and h.ctx.tick_rate=='idle'
h.tap('practice');tick(h,10000);assert h.s.run.remainingMs==11000
h.key('back');h.tap('return');tick(h,1000);assert h.s.run.remainingMs==10000
h.vm.globals().on_leave(h.ctx);tick(h,99999);assert h.s.run.remainingMs==10000
h.vm.globals().on_enter(h.ctx);tick(h,1000);assert h.s.run.remainingMs==9000
restored=Host(source,plain(h.ctx.state));assert restored.s.run.remainingMs==9000
tick(restored,4000);restored.snapshot('campaign-countdown-urgent.png');assert restored.s.run.remainingMs==5000
assert any(k=='rect' and a[:4]==(356,7,116,49) for k,a in restored.commands)
tick(restored,4999);assert restored.s.run.status=='playing' and restored.s.run.remainingMs==1
tick(restored,1);assert restored.s.run.status=='failed' and restored.s.run.failureReason=='timeout' and restored.s.run.hp is None
assert restored.s.page=='result' and restored.ctx.tick_rate=='idle'
restored.snapshot('campaign-timeout.png')
tick(restored,9000);assert restored.s.run.remainingMs==0
r=Host(source,plain(restored.ctx.state));assert r.s.run.failureReason=='timeout'
r.tap('primary');assert r.s.run.remainingMs==12000 and r.s.run.status=='playing' and r.s.run.failureReason is None
# One delayed tick must consume the actual elapsed amount, not just one second.
tick(r,12001);assert r.s.run.status=='failed'
r.tap('primary');assert r.s.run.level==1 and r.s.run.remainingMs==12000
old=plain(r.ctx.state);del old['thatbutton']['run']['remainingMs']
assert Host(source,old).s.run.remainingMs==12000
bad=plain(r.ctx.state);bad['thatbutton']['run']['remainingMs']=-1
assert Host(source,bad).s.run.remainingMs==12000
# Ordinary success/complete countdown stays frozen, including a restored result.
from lupa.lua55 import LuaRuntime
vm=LuaRuntime(unpack_returned_tuples=True)
rules=vm.execute((ROOT/'app/domain/rules.lua').read_text(encoding='utf-8'))
config=vm.execute((ROOT/'app/domain/progression.lua').read_text(encoding='utf-8'))
words=vm.execute((ROOT/'app/domain/words.lua').read_text(encoding='utf-8'))
game=vm.execute((ROOT/'app/domain/game.lua').read_text(encoding='utf-8').replace('require("domain.rules")','...').replace('require("domain.progression")','select(2,...)').replace('require("domain.words")','select(3,...)'),rules,config,words)
for n,expected in [(1,12000),(2,11000),(3,14000),(5,12000),(6,18000),(10,15000),(11,20000),(18,16000),(19,17000),(26,15000),(27,16000),(40,12000)]:assert game.time_limit(n,2)==expected
assert game.time_limit(33,20260923)==16154
h=Host(source);tick(h,3000);b=game.generate(h.s.run.seed,1)
for i,c in b.cells.items():
 if not rules.matches(c,b.rule):h.tap('cell'+str(i))
assert h.s.run.status=='won';tick(h,99999);assert h.s.run.remainingMs==9000
h.tap('primary');assert h.s.run.remainingMs==11000
previous=plain(h.ctx.state);previous['thatbutton']['run']['remainingMs']=60000
migrated=Host(source,previous)
assert migrated.s.run.level==h.s.run.level and migrated.s.run.score==h.s.run.score
assert migrated.s.run.remainingMs==game.time_limit(h.s.run.level,h.s.run.seed)
report={'status':'PASS','checks':['elapsed milliseconds','second-only refresh','pause settings/practice/leave','restore remaining','last-five urgency','exact timeout boundary','timeout restore','restart','legacy migration','invalid save','time tiers','result frozen'],'max_commands':max(h.maximum,r.maximum,restored.maximum)}
(ROOT/'artifacts/timer-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))
