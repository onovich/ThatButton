import json
from run import Host,ROOT,build
from lupa.lua55 import LuaRuntime
source=(build()/'index.lua').read_text(encoding='utf-8')
vm=LuaRuntime(unpack_returned_tuples=True)
rules=vm.execute((ROOT/'app/domain/rules.lua').read_text(encoding='utf-8'))
config=vm.execute((ROOT/'app/domain/progression.lua').read_text(encoding='utf-8'))
words=vm.execute((ROOT/'app/domain/words.lua').read_text(encoding='utf-8'))
game=vm.execute((ROOT/'app/domain/game.lua').read_text(encoding='utf-8').replace('require("domain.rules")','...').replace('require("domain.progression")','select(2,...)').replace('require("domain.words")','select(3,...)'),rules,config,words)
data=json.loads((ROOT/'assets/words/catalog.json').read_text(encoding='utf-8'))
assert len(data)==10 and sum(len(c['words']) for c in data)==160
assert len({w['text'] for c in data for w in c['words']})==160
assert all(len(w['text'])==2 for c in data for w in c['words'])
by_id={c['id']:c for c in data}
h=Host(source);count=0
for seed in range(1,201):
 slots=[level for level in range(1,41) if game.word_slot(level)]
 assert len(slots)==10 and not any(game.rare(seed,n) for n in slots)
 for level in slots:
  board=game.generate(seed,level);r=board.rule
  assert rules.board_valid(board.cells,r)
  assert len({c.word for _,c in board.cells.items()})==9
  assert all(c.value is None and len(c.word)==2 for _,c in board.cells.items())
  assert all(c.category not in by_id[r.category]['exclude'] for _,c in board.cells.items())
  assert 2<=board.fatal<=3
  assert {c.fill for _,c in board.cells.items()}=={'black','white'}
  h.s.run=h.table({k:({} if k=="pressed" else v) for k,v in game.new(seed).items()});h.s.run.pressed=h.table({});h.s.run.level=level;h.s.run.remainingMs=game.time_limit(level,seed);h.frame()
  if seed==1 and level in [11,17,23,34]:h.snapshot('words-'+str(level)+'.png')
  count+=1
print({'word_boards':count,'max_commands':h.maximum,'status':'PASS'})
