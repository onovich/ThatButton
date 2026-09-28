local Rules=require("domain.rules")
local View=require("domain.view")
local Game=require("domain.game")
local M={}
local function member(list,v) for _,x in ipairs(list) do if x==v then return true end end;return false end
local function valid(s)
 if type(s)~="table" or s.schema~=1 or type(s.rule)~="table" then return false end
 local r=s.rule
 return member(Rules.modes,r.mode) and member(Rules.shapes,r.shape) and member(Rules.kinds,r.kind)
  and type(r.n)=="number" and r.n%1==0 and r.n>=(r.kind=="multiple" and 2 or 0) and r.n<=9
  and type(s.answers)=="boolean"
end
function M.load(ctx)
 View.init(ctx)
 local s=ctx.state.thatbutton
 if not valid(s) then s={schema=1,rule={mode="and",shape="triangle",kind="prime",n=3},answers=false};ctx.state.thatbutton=s end
 s.rule.negated=s.rule.negated==true
 -- A launch consumes the next route; only rotation history survives.
 s.run=Game.start(s)
 s.loading=false;s.practice=false;s.page=s.run.status=="playing" and "board" or "result"
 s.focus=1;s.keyboard=false;s.last=0;ctx:set_tick_rate("normal");s.active=true
end
local function paint(ctx,full)
 local s=ctx.state.thatbutton
 ctx:set_tick_rate(s.active and (s.loading or (s.page=="board" and not s.practice and s.run.status=="playing")) and "normal" or "idle")
 ctx:request_refresh(full and "full" or "partial");ctx:invalidate() end
function M.enter(ctx) if not valid(ctx.state.thatbutton) or not ctx.state.thatbutton.active then M.load(ctx) end;ctx.state.thatbutton.active=true;paint(ctx,true) end
local function cycle(list,value,d)
 for i,v in ipairs(list) do if v==value then return list[(i-1+d)%#list+1] end end
end
local function adjust(s,i,d)
 local r=s.rule
 if i==1 then r.mode=cycle(Rules.modes,r.mode,d)
 elseif i==2 then r.shape=cycle(Rules.shapes,r.shape,d)
 elseif i==3 then r.kind=cycle(Rules.kinds,r.kind,d);if r.kind=="multiple" then r.n=3 elseif Rules.parameterized(r.kind) then r.n=7 end
 elseif i==4 then
  if r.mode=="shape" or not Rules.parameterized(r.kind) then return false end
  local min=r.kind=="multiple" and 2 or 0;r.n=min+(r.n-min+d)%(10-min)
 elseif i==5 then s.answers=not s.answers
 else r.negated=not r.negated end
 s.last=0;return true
end
local function activate(s,t)
 if t.kind=="cell" then
  if s.practice then local changed=s.last~=t.index;s.last=t.index;return changed end
  local changed=Game.press(s.run,t.index)
  if s.run.status~="playing" then s.page="result";s.focus=1;s.keyboard=false end
  return changed
 elseif t.kind=="primary" then
  if s.run.status=="won" then Game.next(s.run)
  else s.run=Game.start(s) end
  s.page="board";s.focus=1;s.keyboard=false
 elseif t.kind=="practice" then s.practice=true;s.page="board";s.focus=1
 elseif t.kind=="settings" then s.page="settings";s.focus=1
 elseif t.kind=="return" then s.practice=false;s.focus=1;s.page=s.run.status=="playing" and "board" or "result"
 elseif t.kind=="option" then return adjust(s,t.index,1)
 end
 return true
end
local function navigate(s,key,n,cols)
 local f=s.focus
 if s.page=="board" then
  if key=="left" then f=(f-2)%n+1
  elseif key=="right" then f=f%n+1
  elseif key=="up" then f=(f-1-cols)%n+1
  elseif key=="down" then f=(f-1+cols)%n+1 end
 else
  if key=="up" or key=="left" then f=(f-2)%n+1 elseif key=="down" or key=="right" then f=f%n+1 end
 end
 local changed=f~=s.focus;s.focus=f;return changed
end
function M.input(ctx,ev)
 local s=ctx.state.thatbutton;local layout=View.layout(ctx,s);local targets=layout.targets
 if #targets==0 then return false end
 local changed=false
 if ev.type=="touch" and ev.gesture=="tap" and type(ev.x)=="number" and type(ev.y)=="number" then
  for i,t in ipairs(targets) do
   if ev.x>=t.x and ev.x<t.x+t.w and ev.y>=t.y and ev.y<t.y+t.h then
    changed=s.keyboard;s.keyboard=false;s.focus=i;changed=activate(s,t) or changed
    if changed then paint(ctx,false) end;return true
   end
  end
  return false
 elseif ev.type=="key" and ev.state=="down" then
  if not member({"up","down","left","right","ok","back"},ev.key) then return false end
  if ev.key=="back" then
   if s.page=="result" then return true end
   activate(s,{kind=s.page=="board" and "settings" or "return"});changed=true
  else
   changed=not s.keyboard;s.keyboard=true
   if ev.key=="ok" then changed=activate(s,targets[s.focus]) or changed
   elseif s.page=="settings" and s.focus<=6 and (ev.key=="left" or ev.key=="right") then
    changed=adjust(s,s.focus,ev.key=="left" and -1 or 1) or changed
   else changed=navigate(s,ev.key,#targets,layout.cols or 3) or changed end
  end
  if changed then paint(ctx,false) end;return true
 end
 return false
end
function M.tick(ctx,dt_ms)
 local s=ctx.state.thatbutton
 if s.active and s.page=="board" and not s.practice and Game.elapse(s.run,dt_ms) then
  if s.run.status=="failed" then s.page="result";s.focus=1;s.keyboard=false end
  paint(ctx,false)
 end
end
function M.unload(ctx) View.dispose() end
function M.leave(ctx) ctx.state.thatbutton.active=false;ctx:set_tick_rate("idle") end
function M.draw(ctx,g) return View.draw(ctx,g,ctx.state.thatbutton) end
return M
