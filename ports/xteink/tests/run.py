"""Execute the shipped Lua 5.5 entry, not a rewritten JavaScript simulator."""
import json
import subprocess
import sys
from pathlib import Path
from lupa.lua55 import LuaRuntime
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from build import build

class Host:
    def __init__(self, source, state=None, prepare=True, layer_budget=None):
        self.vm = LuaRuntime(unpack_returned_tuples=True)
        self.commands = []
        self.maximum = 0
        self.vm.globals().record = lambda kind, *args: self.commands.append((kind,args))
        self.vm.execute('''
ctx={state={},screen={width=480,height=800},invalidations=0,
 set_tick_rate=function(self,v) assert(v=="idle" or v=="normal");self.tick_rate=v end,
 request_refresh=function(self,v) assert(v=="partial" or v=="full");self.refresh=v end,
 invalidate=function(self) self.invalidations=self.invalidations+1 end}
g={image=function(_,key,x,y,opts) assert(opts.invert==true and (opts.color==0 or opts.color==15));record("image",key,x,y,opts.color) end,clear=function(_,c) record("clear",c) end,
 rect=function(_,x,y,w,h,m,c) record("rect",x,y,w,h,m,c) end,
 line=function(_,x,y,x2,y2,c) record("line",x,y,x2,y2,c) end,
 circle=function(_,x,y,r,m,c) record("circle",x,y,r,m,c) end,
 text=function(_,x,y,t,o) assert(o.color and not o.font and not o.size);record("text",x,y,t,o.color) end}
for _,n in ipairs({"io","os","package","debug","dofile","loadfile","load","require","collectgarbage","print"}) do _G[n]=nil end
''')
        self.vm.execute('''
ctx.layers={create=function(_,w,h)
 local layer={width=w,height=h,commands={}}
 function layer:draw_with(fn)
  local lg={}
  for _,kind in ipairs({"clear","rect","line","circle"}) do
   lg[kind]=function(_,...) self.commands[#self.commands+1]={kind=kind,args={...}} end
  end
  fn(lg)
 end
 return layer
end}
g.layer=function(_,layer,x,y,opts) record("layer",layer,x,y,opts.color or 15) end
''')
        self.vm.globals().layer_budget = layer_budget
        self.vm.execute('''
created_this_callback=0;peak_layers_callback=0
local original_create=ctx.layers.create
ctx.layers.create=function(self,w,h)
 created_this_callback=created_this_callback+1
 peak_layers_callback=math.max(peak_layers_callback,created_this_callback)
 if layer_budget then assert(created_this_callback<=layer_budget,"startup watchdog regression: unbounded layer creation") end
 local layer=original_create(self,w,h)
 function layer:dispose() self.disposed=true end
 return layer
end
''')
        self.vm.execute(source)
        self.ctx = self.vm.globals().ctx
        if state is not None:
            self.ctx.state = self.table(state)
        self.vm.globals().on_load(self.ctx)
        self.vm.globals().created_this_callback=0
        self.vm.globals().on_enter(self.ctx)
        if prepare:
            for _ in range(100):
                if not self.s.loading: break
                self.vm.globals().created_this_callback=0
                self.vm.globals().on_tick(self.ctx,1)
            assert not self.s.loading
        self.frame()

    def table(self,v):
        if isinstance(v,dict): return self.vm.table_from({k:self.table(x) for k,x in v.items()})
        if isinstance(v,list): return self.vm.table_from([self.table(x) for x in v])
        return v

    def frame(self):
        self.commands.clear()
        layout = self.vm.globals().on_draw(self.ctx,self.vm.globals().g)
        self.maximum = max(self.maximum,len(self.commands))
        assert len(self.commands) <= 1000, len(self.commands)
        for kind,a in self.commands:
            assert a[-1] in (0,15),a
            if kind=='rect':
                x,y,w,h,mode,c=a
                assert mode in ('stroke','fill') and x>=0 and y>=0 and w>0 and h>0 and x+w<=480 and y+h<=800,a
            elif kind=='line':
                x,y,x2,y2,c=a
                assert min(x,x2)>=0 and min(y,y2)>=0 and max(x,x2)<=480 and max(y,y2)<=800,a
            elif kind=='circle':
                x,y,r,mode,c=a
                assert x-r>=0 and x+r<=480 and y-r>=0 and y+r<=800,a
            elif kind=='layer':
                layer,x,y,c=a
                assert x>=0 and y>=0 and x+layer.width<=480 and y+layer.height<=800
                assert len(layer.commands)<=1000
            elif kind=='image':
                key,x,y,_=a
                im=Image.open(ROOT/('assets/words' if key.startswith('wd_') else 'assets/rule-text')/f'{key}.png')
                assert x>=0 and y>=0 and x+im.width<=480 and y+im.height<=800
            elif kind=='text':
                x,y,t,c=a
                # Conservative local 20px CJK / 10px ASCII metric, not firmware font proof.
                width=sum(10 if ord(ch)<128 else 20 for ch in t)
                assert x>=0 and y>=0 and x+width<=480 and y+24<=800,(a,width)
        self.targets={t.id:t for _,t in layout.targets.items()}
        targets=list(self.targets.values())
        for i,t in enumerate(targets):
            assert t.w>=44 and t.h>=44
            assert t.x>=0 and t.y>=0 and t.x+t.w<=480 and t.y+t.h<=800
            for o in targets[i+1:]:
                assert not(t.x<o.x+o.w and t.x+t.w>o.x and t.y<o.y+o.h and t.y+t.h>o.y)
        return layout

    def event(self,e):
        result=self.vm.globals().on_input(self.ctx,self.table(e));self.frame();return result
    def key(self,k): return self.event({'type':'key','state':'down','key':k})
    def tap(self,id):
        t=self.targets[id]
        return self.event({'type':'touch','gesture':'tap','x':t.x+t.w/2,'y':t.y+t.h/2})
    @property
    def s(self): return self.ctx.state.thatbutton
    def snapshot(self,name):
        self.frame();im=Image.new('RGB',(480,800),'white');d=ImageDraw.Draw(im)
        font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',20)
        for kind,a in self.commands:
            c='black' if a[-1]==15 else 'white'
            if kind=='clear': d.rectangle((0,0,479,799),fill=c)
            elif kind=='rect':
                x,y,w,h,m,_=a;box=(x,y,x+w-1,y+h-1)
                d.rectangle(box,fill=c if m=='fill' else None,outline=c)
            elif kind=='line': d.line(a[:4],fill=c)
            elif kind=='circle':
                x,y,r,m,_=a;d.ellipse((x-r,y-r,x+r,y+r),fill=c if m=='fill' else None,outline=c)
            elif kind=='layer':
                layer,x,y,_=a
                for _,cmd in layer.commands.items():
                    v=list(cmd.args.values());ink=('white' if v[-1]==15 else 'black') if a[-1]==0 else ('black' if v[-1]==15 else 'white')
                    if cmd.kind=='clear': pass # White is the empty mask; g:layer color tints its ink.
                    elif cmd.kind=='rect':
                        xx,yy,w,h,mode,_=v;d.rectangle((x+xx,y+yy,x+xx+w-1,y+yy+h-1),fill=ink if mode=='fill' else None,outline=ink)
                    elif cmd.kind=='line':
                        xx,yy,xx2,yy2,_=v;d.line((x+xx,y+yy,x+xx2,y+yy2),fill=ink)
                    elif cmd.kind=='circle':
                        xx,yy,r,mode,_=v;d.ellipse((x+xx-r,y+yy-r,x+xx+r,y+yy+r),fill=ink if mode=='fill' else None,outline=ink)
            elif kind=='image':
                key,x,y,_=a
                mask=Image.open(ROOT/('assets/words' if key.startswith('wd_') else 'assets/rule-text')/f'{key}.png').convert('L')
                im.paste(c,(int(x),int(y),int(x)+mask.width,int(y)+mask.height),mask)
            elif kind=='text':
                x,y,t,_=a;d.text((x,y),t,font=font,fill=c,anchor='lt')
        folder=ROOT/'artifacts';folder.mkdir(exist_ok=True);im.save(folder/name)

def run():
    folder=build();source=(folder/'index.lua').read_text(encoding='utf-8')
    vm=LuaRuntime(unpack_returned_tuples=True)
    rules=vm.execute((ROOT/'app/domain/rules.lua').read_text(encoding='utf-8'))
    # Exhaustive cross-language oracle from the already reviewed JS predicates.
    js='''import {matchesNumber} from './ports/xteink/design/number-rules.js';
const rows=[];for(let v=1;v<=99;v++)for(const k of ['multiple','ending','contains','odd','even','prime','composite'])
for(let n=(k==='multiple'?2:0);n<=9;n++) rows.push([v,k,n,matchesNumber(v,k,n)]);
console.log(JSON.stringify(rows));'''
    rows=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=ROOT.parents[1],text=True))
    for v,k,n,expected in rows:
        assert rules.number(v,k,n)==expected,(v,k,n)
    for mode in ['shape','number','and','or']:
        for shape in ['circle','triangle']:
            for value in [1,2,9,17,49,97]:
                c=vm.table_from({'value':value,'shape':shape})
                r=vm.table_from({'mode':mode,'shape':'triangle','kind':'prime','n':3})
                a,b=shape=='triangle',value in [2,17,97]
                expected={'shape':a,'number':b,'and':a and b,'or':a or b}[mode]
                assert rules.matches(c,r)==expected
                r.negated=True
                assert rules.matches(c,r)==(not expected)
    for v,k,n in [(0,'odd',3),(100,'even',3),(2,'multiple',0),(7,'ending',10),(7,'contains',-1)]:
        try: rules.number(v,k,n)
        except Exception: pass
        else: raise AssertionError((v,k,n))
    h=Host(source);h.s.practice=True;h.frame();h.snapshot('01-board.png')
    assert h.s.rule.mode=='and' and h.s.rule.kind=='prime'
    h.tap('cell6');assert h.s.last==6;h.snapshot('02-safe.png')
    count=h.ctx.invalidations;h.tap('cell6');assert h.ctx.invalidations==count
    h.tap('cell4');assert h.s.last==4;h.snapshot('03-danger.png')
    h.key('back');assert h.s.page=='settings';h.snapshot('04-settings.png')
    # The settings surface cannot activate the board behind it.
    before=h.s.last;h.event({'type':'touch','gesture':'tap','x':238,'y':400});assert h.s.last==before
    h.tap('practice');assert h.s.page=='board'
    assert set(h.targets)=={'cell'+str(i) for i in range(1,10)}
    assert not any(k=='text' and ('先读' in a[2] or '可重复' in a[2] or '0.1.' in a[2]) for k,a in h.commands)
    # Navigate the complete board and footer with physical keys only.
    h=Host(source);h.s.practice=True;h.frame();seen=set()
    for _ in range(9): seen.add(h.s.focus);h.key('right')
    assert len(seen)==9
    h.key('back');assert h.s.page=='settings'
    old=h.s.rule.mode;h.key('right');assert h.s.rule.mode!=old
    h.key('left');assert h.s.rule.mode==old
    for _ in range(7):h.key('down')
    h.key('ok');assert h.s.page=='board'
    h.key('back');assert h.s.page=='settings';h.key('back');assert h.s.page=='board'
    assert not h.event({'type':'key','state':'up','key':'ok'})
    assert not h.event({'type':'touch','gesture':'long','x':40,'y':300})
    # Every configuration and its longest per-button explanation stays in bounds.
    h.s.practice=True
    max_commands=0;configurations=0
    for mode in ['shape','number','and','or']:
        for shape in ['circle','triangle','square','star']:
            for kind in ['multiple','ending','contains','odd','even','prime','composite']:
                for n in range(2 if kind=='multiple' else 0,10):
                    h.s.rule=h.table({'mode':mode,'shape':shape,'kind':kind,'n':n})
                    h.s.answers=True
                    for page in ['board','settings']:
                        h.s.page=page;h.s.focus=1;h.s.last=0;h.frame()
                    h.s.page='board'
                    for i in range(1,10):h.s.last=i;h.frame()
                    h.s.rule.negated=True
                    for i in range(1,10):h.s.last=i;h.frame()
                    h.s.rule.negated=False
                    max_commands=max(max_commands,h.maximum);configurations+=2
    # Normal re-entry snapshot restoration and corrupt-state fallback.
    restored=Host(source,{'thatbutton':{'schema':1,'rule':{'mode':'or','shape':'star','kind':'contains','n':0},'answers':True}})
    assert restored.s.rule.n==0 and restored.s.rule.shape=='star' and restored.s.answers
    corrupt=Host(source,{'thatbutton':{'schema':1,'rule':{'kind':'multiple','n':0}}})
    assert corrupt.s.rule.kind=='prime'
    report={'lua':vm.eval('_VERSION'),'numeric_cases':len(rows),'configurations':configurations,
            'max_draw_commands':max_commands,'status':'PASS',
            'limits':'Local Lua host; physical font, refresh and installation are not proven.'}
    (ROOT/'artifacts/validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2))

if __name__=='__main__':run()
