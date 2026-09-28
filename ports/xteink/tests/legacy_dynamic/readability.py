"""Score stays inside its panel and all generated rule ink uses bundled images."""
from run import Host,build
source=(build()/'index.lua').read_text(encoding='utf-8')
h=Host(source,layer_budget=0)
assert any(k=='image' for k,a in h.commands)
for score in [0,60,280,2490,99999,99999999]:
 h.s.page='result';h.s.run.status='failed';h.s.run.failureReason='wrong';h.s.run.score=score;h.frame()
 ink=[a for k,a in h.commands if k=='rect' and a[-1]==0 and 490<=a[1]<538]
 assert ink
 for x,y,w,height,_,color in ink:
  assert x>=64 and x+w<=416 and y>=490 and y+height<=538
h.snapshot('score-width-check.png')
print('PASS: image-backed rules, score padding for 1–8 digits, zero layers')
