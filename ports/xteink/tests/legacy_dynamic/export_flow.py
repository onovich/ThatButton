"""Export reproducible real-input Studio scenarios and a Lua-rendered result gallery."""
import base64,json
from run import Host,ROOT,build
from lupa.lua55 import LuaRuntime
source=(build()/'index.lua').read_text(encoding='utf-8')
vm=LuaRuntime(unpack_returned_tuples=True)
rules=vm.execute((ROOT/'app/domain/rules.lua').read_text(encoding='utf-8'))
config=vm.execute((ROOT/'app/domain/progression.lua').read_text(encoding='utf-8'))
words=vm.execute((ROOT/'app/domain/words.lua').read_text(encoding='utf-8'))
game=vm.execute((ROOT/'app/domain/game.lua').read_text(encoding='utf-8').replace('require("domain.rules")','...').replace('require("domain.progression")','select(2,...)').replace('require("domain.words")','select(3,...)'),rules,config,words)
scenarios={}
for name,limit in [('success',6),('failure',6),('victory',40)]:
 h=Host(source);touches=[]
 def tap(id):
  t=h.targets[id];touches.append({'gesture':'tap','x':t.x+t.w/2,'y':t.y+t.h/2});h.tap(id)
 while True:
  board=game.generate(h.s.run.seed,h.s.run.level)
  if name=='success' and h.s.run.level==6:h.snapshot('campaign-board.png')
  if name=='failure' and h.s.run.level==6:
   for i,c in board.cells.items():
    if rules.matches(c,board.rule):
     tap('cell'+str(i))
     if h.s.run.status=='failed':break
  if h.s.run.status=='failed':break
  for i,c in board.cells.items():
   if not rules.matches(c,board.rule):tap('cell'+str(i))
  if h.s.run.level==limit:break
  tap('primary')
 h.snapshot('campaign-'+name+'.png')
 scenarios[name]={'keys':[],'touches':touches,'expected':{'level':h.s.run.level,'status':h.s.run.status,'score':h.s.run.score,'failureReason':h.s.run.failureReason}}
(ROOT/'build/campaign-qa-v6.json').write_text(json.dumps(scenarios,ensure_ascii=False,indent=2),encoding='utf-8')
# Additional actual-board previews of the new coupled-color rule families.
for mode,filename in [('color','color-single'),('colorOr','color-or')]:
 for level in range(1,41):
  board=game.generate(20260923,level)
  if board.rule.mode==mode:
   h=Host(source);h.s.run.level=level;h.s.run.remainingMs=game.time_limit(level,20260923)
   h.snapshot('campaign-'+filename+'.png');break
html='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>禁止按键 · 40关体验</title><style>body{margin:0;background:#eae7e0;color:#202020;font-family:system-ui}main{max-width:1280px;margin:48px auto;padding:0 24px}h1{font-size:32px}p{line-height:1.8}section{background:white;padding:16px;border:1px solid #b8b4ab}img{width:100%;height:auto;display:block}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}h2{font-size:17px}@media(max-width:850px){.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:480px){.grid{grid-template-columns:1fr}}</style><main><h1>禁止按键 · 40关连续挑战</h1><p>动态出题，每轮40关；计时已收紧，完整体验时长待本轮真机试玩校准。没有Boss与敌人战。黑色图形配白色数字，白色图形配黑色数字；颜色规则逐步与形状、数学条件组合。每题保证存在安全键和禁止键，排除等价重复、互相矛盾及全禁组合。质数、合数只出现在最后10关，每轮最多3关且不相邻。每轮另含10个词语关、160个双字词；首次两次词语题额外2秒。普通题分阶段倒计时11–18秒，段内逐渐缩短；质合数题仅加2秒；最后5秒反白强调，归零失败。以下为实际Lua输入与计时流程截图，不是实时倒计时，正式交互请使用Studio预览。</p><div class="grid">'''
for name,title in [('color-single','单一颜色条件'),('board','颜色与形状 · 第6关'),('color-or','颜色“或”条件'),('countdown-urgent','最后5秒'),('timeout','时间耗尽'),('success','本关完成'),('failure','挑战结束'),('victory','全部通关')]:
 data=base64.b64encode((ROOT/f'artifacts/campaign-{name}.png').read_bytes()).decode()
 html+=f'<section><h2>{title}</h2><img alt="{title} Lua实际画面" src="data:image/png;base64,{data}"></section>'
for level in [11,17,23,34]:
 path=ROOT/f'artifacts/words-{level}.png'
 if path.exists():
  data=base64.b64encode(path.read_bytes()).decode()
  html+=f'<section><h2>词语关 · 第{level}关</h2><img alt="词语关Lua实际画面" src="data:image/png;base64,{data}"></section>'
html+='</div><p>误按一次立即失败；没有生命值。过关只能进入下一关，失败只能从第一关重新开始；全部通关后可用新题目再来一轮。截图不是设备屏幕实拍。</p></main></html>'
(ROOT/'artifacts/current-flow-demo.html').write_text(html,encoding='utf-8')
print({k:{'taps':len(v['touches']),**v['expected']} for k,v in scenarios.items()})
