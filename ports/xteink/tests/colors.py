"""Independent truth oracle for the coupled color attribute and rejection guards."""
from itertools import product
from lupa.lua55 import LuaRuntime
from run import ROOT
vm=LuaRuntime(unpack_returned_tuples=True)
r=vm.execute((ROOT/'app/domain/rules.lua').read_text(encoding='utf-8'))
def t(value):return vm.table_from(value,recursive=True)
colors=[{'mode':'color','color':{'target':target,'tone':tone}} for target,tone in product(['shape','number'],['black','white'])]
count=0
for fill,shape,value in product(['black','white'],['circle','square','triangle','star'],range(1,100)):
 c=t({'fill':fill,'shape':shape,'value':value})
 for atom in colors:
  expected=(fill==atom['color']['tone']) if atom['color']['target']=='shape' else (fill!=atom['color']['tone'])
  assert r.matches(c,t(atom))==expected
  for mode in ['colorAnd','colorOr']:
   rule=t({'mode':mode,'color':atom['color'],'other':{'mode':'number','kind':'even'}})
   assert r.admissible(rule)
   assert r.matches(c,rule)==((expected and value%2==0) if mode=='colorAnd' else (expected or value%2==0))
   count+=1
# Same-axis pairs cannot carry two independent facts: forbid even equivalent aliases.
for a,b,mode in product(colors,colors,['colorAnd','colorOr']):
 assert not r.admissible(t({'mode':mode,'color':a['color'],'other':b}))
# A legal formula can still be unusable on the particular random board.
rule=t({'mode':'colorOr','color':{'target':'shape','tone':'black'},'other':{'mode':'number','kind':'even'}})
assert not r.board_valid(t([{'fill':'black','shape':'circle','value':1},{'fill':'white','shape':'triangle','value':2}]),rule)
assert r.board_valid(t([{'fill':'black','shape':'circle','value':1},{'fill':'white','shape':'triangle','value':2},{'fill':'white','shape':'square','value':3}]),rule)
# An AND that has no witness is rejected; so is a redundant branch on this board.
rule.mode='colorAnd'
assert not r.board_valid(t([{'fill':'black','shape':'circle','value':1},{'fill':'white','shape':'triangle','value':2}]),rule)
assert not r.board_valid(t([{'fill':'black','shape':'circle','value':2},{'fill':'white','shape':'triangle','value':1}]),rule)
assert r.board_valid(t([{'fill':'black','shape':'circle','value':2},{'fill':'black','shape':'star','value':1},{'fill':'white','shape':'triangle','value':4}]),rule)
print({'status':'PASS','color_boolean_oracles':count,'invalid_color_pairs':32,'finite_board_guards':'PASS'})
