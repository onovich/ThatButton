"""Validate complete fixed routes through shipped lifecycle callbacks."""
import json,time
from collections import Counter
from run import Host,ROOT,build
from lupa.lua55 import LuaRuntime
source=(build()/'index.lua').read_text(encoding='utf-8')
assert 'function M.generate' not in source and 'for attempt=' not in source and '__tb_words' not in source
vm=LuaRuntime(unpack_returned_tuples=True,max_memory=2097152)
vm.execute(source);heap=vm.get_memory_used();assert heap<700000,heap
routes=json.loads((ROOT/'artifacts/offline-routes.json').read_text(encoding='utf-8'))
rules=vm.execute((ROOT/'app/domain/rules.lua').read_text(encoding='utf-8'))
bank=vm.execute((ROOT/'app/domain/bank.lua').read_text(encoding='utf-8'))
game=vm.execute((ROOT/'app/domain/game.lua').read_text(encoding='utf-8').replace('require("domain.rules")','...').replace('require("domain.bank")','select(2,...)'),rules,bank)
def plain(v):return {k:plain(x) for k,x in v.items()} if hasattr(v,'items') else v
h=Host(source,layer_budget=0);visited=[];rounds=0;max_commands=0
for cycle_round in range(20):
 route=h.s.run.route;visited.append(route)
 for level in range(1,41):
  expected=routes[route-1]['boards'][level-1];mask=expected['fatalMask']
  if level in [1,4]:assert expected['rule']['mode']=='shape'
  board=game.board(vm.table_from({'route':route,'level':level}))
  assert board.id==expected['id'] and board.timeMs==expected['ms']
  assert [x for _,x in board.lines.items()]==expected['clue']
  for i,c in board.cells.items():
   original=expected['cells'][i-1]
   assert c.forbidden==bool(mask & (1<<(i-1)))
   assert c.shape==original['shape'] and c.fill==original['fill']
   assert (c.wordKey==original['wordKey']) if original.get('word') else (c.value==original['value'])
  assert h.s.run.level==level and game.valid(vm.table_from(plain(h.s.run),recursive=True))
  before=h.s.run.remainingMs;h.vm.globals().on_tick(h.ctx,1000);h.frame();assert h.s.run.remainingMs==before-1000
  safe=[i for i in range(1,len(expected['cells'])+1) if not mask & (1<<(i-1))]
  h.tap('cell'+str(safe[0]))
  old=plain(h.ctx.state);reopened=Host(source,old,layer_budget=0)
  assert reopened.s.run.route!=route and reopened.s.run.level==1 and reopened.s.run.score==0
  assert len(reopened.s.run.pressed)==0 and reopened.s.run.status=='playing'
  assert reopened.s.lastRouteId==route%20+1 and reopened.s.rotation is None
  for i in safe[1:]:h.tap('cell'+str(i))
  assert h.s.run.status==('complete' if level==40 else 'won')
  assert len(h.targets)==1 and 'primary' in h.targets
  if cycle_round==0 and level in [3,11,26,40]:h.snapshot('offline-'+str(level)+'-result.png')
  max_commands=max(max_commands,h.maximum);rounds+=1
  h.key('ok')
 assert h.s.run.level==1 and h.s.run.score==0
assert len(set(visited))==20 and h.s.run.route!=visited[-1]
# Per-board wrong/timeout outcomes, persistence and cold decoding.
for route in range(1,21):
 for level in range(1,41):
  run=game.new(route);run.level=level;run.remainingMs=game.time_limit(level,route)
  board=game.board(run)
  bad=next(i for i,c in board.cells.items() if c.forbidden)
  assert game.press(run,bad) and run.status=='failed' and run.failureReason=='wrong' and game.valid(run)
  run=game.new(route);run.level=level;run.remainingMs=game.time_limit(level,route)
  game.elapse(run,run.remainingMs)
  assert run.status=='failed' and run.failureReason=='timeout' and game.valid(run)
# Failure restart and reopening each consume one next route.
h=Host(source);oldroute=h.s.run.route
mask=routes[oldroute-1]['boards'][0]['fatalMask'];bad=next(i for i in range(1,5) if mask & (1<<(i-1)))
h.tap('cell'+str(bad));saved=plain(h.ctx.state);reopened=Host(source,saved)
assert reopened.s.run.status=='playing' and reopened.s.run.route!=oldroute and reopened.s.lastRouteId==2
assert h.s.run.status=='failed';h.tap('primary');assert h.s.run.route!=oldroute and h.s.lastRouteId==2
# Returning to the same VM after leave starts once; repeated enter alone does not advance.
before=h.s.run.route;h.vm.globals().on_leave(h.ctx);h.vm.globals().on_enter(h.ctx);h.frame()
assert h.s.run.route!=before and h.s.lastRouteId==3
h.vm.globals().on_enter(h.ctx);assert h.s.lastRouteId==3
opened=[];fresh=Host(source)
for i in range(41):
 opened.append(fresh.s.run.route)
 fresh=Host(source,plain(fresh.ctx.state))
assert len(set(opened[:20]))==20 and len(set(opened[20:40]))==20 and opened[19]!=opened[20] and opened[39]!=opened[40]
# Three full rotation groups have no repeats within group or at boundaries.
s=vm.table_from({});ids=[]
for i in range(60):s.run=game.start(s);ids.append(s.run.route)
for start in [0,20,40]:assert len(set(ids[start:start+20]))==20
assert ids==list(range(1,21))*3
assert opened==list(range(1,21))*2+[1]
assert s.rotation is None and s.lastRouteId==20
for last in [1,7,20]:
 legacy=vm.table_from({'rotation':{'lastRoute':last}},recursive=True)
 assert game.start(legacy).route==last%20+1 and legacy.lastRouteId==last%20+1 and legacy.rotation is None
# Corrupt saves fall back without indexing bad bank positions.
for field,value in [('route',999),('level',0),('remainingMs',-1)]:
 old=plain(h.ctx.state);old['thatbutton']['run'][field]=value
 assert Host(source,old).s.run.level==1
report=dict(status='PASS',complete_routes=20,rounds=rounds,reopen_checks=800,wrong_checks=800,timeout_checks=800,rotation_cycles=3,max_draw_commands=max_commands,entry_heap=heap)
(ROOT/'artifacts/offline-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(report)
