"""Replay level 1->3 with real callbacks; check countdown and touch progress."""
import time
from run import Host,ROOT
from lupa.lua55 import LuaRuntime
source=(ROOT/'build/index.lua').read_text(encoding='utf-8')
vm=LuaRuntime(unpack_returned_tuples=True)
rules=vm.execute((ROOT/'app/domain/rules.lua').read_text(encoding='utf-8'))
config=vm.execute((ROOT/'app/domain/progression.lua').read_text(encoding='utf-8'))
words=vm.execute((ROOT/'app/domain/words.lua').read_text(encoding='utf-8'))
game=vm.execute((ROOT/'app/domain/game.lua').read_text(encoding='utf-8').replace('require("domain.rules")','...').replace('require("domain.progression")','select(2,...)').replace('require("domain.words")','select(3,...)'),rules,config,words)
worst=0;slowest=None
for seed in [20260923+i for i in range(30)]:
 h=Host(source);h.s.run.seed=seed;h.frame()
 while h.s.run.level<=3:
  level=h.s.run.level
  before=h.s.run.remainingMs
  start=time.perf_counter();h.vm.globals().on_tick(h.ctx,1000);h.frame();elapsed=time.perf_counter()-start
  assert h.s.run.remainingMs==before-1000,(seed,level,'timer stalled')
  board=game.generate(seed,level)
  for i,c in board.cells.items():
   if not rules.matches(c,board.rule):
    start=time.perf_counter();h.tap('cell'+str(i));elapsed=max(elapsed,time.perf_counter()-start)
    assert h.s.run.pressed[i],(seed,level,'touch ignored')
  assert h.s.run.status=='won'
  if elapsed>worst:worst=elapsed;slowest=(seed,level,board.tier)
  h.tap('primary')
print({'status':'PASS desktop replay only','replayed_runs':30,'worst_callback_with_mock_draw_ms':round(worst*1000,2),'slowest':slowest,'device_freeze_reproduced':False})
