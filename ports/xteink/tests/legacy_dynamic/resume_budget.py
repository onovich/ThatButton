"""Real callbacks must not regenerate a deterministic board on every draw/input."""
from run import Host,ROOT
from lupa.lua55 import LuaRuntime
source=(ROOT/'build/index.lua').read_text(encoding='utf-8')
source=source.replace('function M.generate(seed,level)','function M.generate(seed,level) generationCalls=(generationCalls or 0)+1',1)
h=Host(source)
# Play first two rounds by inspecting the actual Lua render targets and predicates.
vm=LuaRuntime(unpack_returned_tuples=True)
rules=vm.execute((ROOT/'app/domain/rules.lua').read_text(encoding='utf-8'))
config=vm.execute((ROOT/'app/domain/progression.lua').read_text(encoding='utf-8'))
words=vm.execute((ROOT/'app/domain/words.lua').read_text(encoding='utf-8'))
game=vm.execute((ROOT/'app/domain/game.lua').read_text(encoding='utf-8').replace('require("domain.rules")','...').replace('require("domain.progression")','select(2,...)').replace('require("domain.words")','select(3,...)'),rules,config,words)
while h.s.run.level<3:
 b=game.generate(h.s.run.seed,h.s.run.level)
 for i,c in b.cells.items():
  if not rules.matches(c,b.rule):h.tap('cell'+str(i))
 h.tap('primary')
b=game.generate(h.s.run.seed,3)
h.vm.globals().on_tick(h.ctx,6000);h.frame()
safe=[i for i,c in b.cells.items() if not rules.matches(c,b.rule)]
h.tap('cell'+str(safe[0]));assert h.s.run.remainingMs==8000
# Reopen at the user's exact state shape: level3, one correct tick, 8 seconds.
def plain(v):return {k:plain(x) for k,x in v.items()} if hasattr(v,'items') else v
restored=Host(source,plain(h.ctx.state))
assert restored.s.run.level==3 and restored.s.run.pressed[safe[0]]
load_calls=restored.vm.globals().generationCalls
before=load_calls
for _ in range(3):restored.frame()
restored.vm.globals().on_tick(restored.ctx,1000);restored.frame()
restored.tap('cell'+str(safe[1]))
hot_calls=restored.vm.globals().generationCalls-before
assert restored.s.run.remainingMs==7000 and restored.s.run.pressed[safe[1]]
print({'load_generations':load_calls,'hot_generations':hot_calls,'third_round_tier':b.tier})
assert load_calls==1 and hot_calls==0,'Repeated board generation in lifecycle callbacks'
