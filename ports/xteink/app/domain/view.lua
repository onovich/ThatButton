local Rules=require("domain.rules")
local Pixels=require("domain.pixels")
local Game=require("domain.game")
local M={}
function M.init(ctx) Pixels.init(ctx) end
function M.dispose() Pixels.dispose() end
local function text(g,x,y,t,color) g:text(x,y,t,{color=color or 15}) end
local function frame(g,t,focused)
 for d=0,2 do g:rect(t.x+d,t.y+d,t.w-2*d,t.h-2*d,"stroke",15) end
 if focused then g:rect(t.x+6,t.y+6,t.w-12,t.h-12,"stroke",15) end
end
function M.layout(ctx,s)
 local w,h=ctx.screen.width,ctx.screen.height
 local ox=math.floor((w-480)/2);local oy=math.floor((h-800)/2)
 local targets={}
 local function add(id,x,y,tw,th,kind,index)
  targets[#targets+1]={id=id,x=x+ox,y=y+oy,w=tw,h=th,kind=kind,index=index}
 end
 if w<480 or h<800 then return {targets=targets,ox=0,oy=0,unsupported=true} end
 if s.loading then return {targets=targets,ox=ox,oy=oy} end
 if s.page=="board" then
  local board=Game.current(s);local tw=(472-(board.cols-1)*8)/board.cols;local th=(480-(board.rows-1)*8)/board.rows
  for i=1,#board.cells do add("cell"..i,4+((i-1)%board.cols)*(tw+8),314+math.floor((i-1)/board.cols)*(th+8),tw,th,"cell",i) end
  return {targets=targets,ox=ox,oy=oy,cols=board.cols}
 elseif s.page=="result" then
  add("primary",20,644,440,66,"primary")
 else
  for i=1,6 do add("option"..i,20,82+(i-1)*94,440,82,"option",i) end
  add("practice",20,650,440,54,"practice")
  add("return",20,730,440,50,"return")
 end
 return {targets=targets,ox=ox,oy=oy}
end
function M.draw(ctx,g,s)
 local layout=M.layout(ctx,s);local ox,oy=layout.ox,layout.oy
 g:clear(0)
 if layout.unsupported then text(g,8,20,"请使用竖屏 480×800");return layout end
 local function t(x,y,v,c) text(g,x+ox,y+oy,v,c) end
 if s.page=="result" then
  local complete=s.run.status=="complete"
  local won=s.run.status=="won" or complete
  local function centered(y,str,size,color) Pixels.center(g,240+ox,y+oy,str,size,color or 15) end
  centered(12,string.format("第 %02d 关",s.run.level),24)
  g:rect(20+ox,57+oy,440,3,"fill",15)
  centered(78,complete and "全部通关" or (won and "本关完成" or "挑战结束"),88)
  if complete then Pixels.victory(g,ox,oy,Game.total)
  else
   if won then
    g:circle(240+ox,290+oy,111,"fill",15);g:circle(240+ox,290+oy,104,"fill",0)
    Pixels.solid(g,ox,oy,{{171,289},{191,268},{222,299},{285,233},{307,254},{222,340}})
   else
    for d=-4,4 do
     g:line(240+d+ox,193+oy,355+d+ox,393+oy,15)
     g:line(355+ox,393+d+oy,125+ox,393+d+oy,15)
     g:line(125+d+ox,393+oy,240+d+ox,193+oy,15)
    end
    Pixels.solid(g,ox,oy,{{202,303},{220,285},{278,343},{260,361}})
    Pixels.solid(g,ox,oy,{{260,285},{278,303},{220,361},{202,343}})
   end
   Pixels.motifs(g,ox,oy,430)
  end
  local score=(won and not complete) and s.run.score-s.run.startScore or s.run.score
  g:rect(20+ox,468+oy,440,118,"fill",15)
  Pixels.number(g,240+ox,490+oy,score,8,0,352,48)
  centered(552,(won and not complete) and "本关得分" or "累计得分",28,0)
  centered(597,complete and (Game.total.." 关挑战完成") or (won and "全部安全按键已清除" or (s.run.failureReason=="timeout" and "时间耗尽" or "误按了禁止按键")),28)
  local primary=layout.targets[1];g:rect(primary.x,primary.y,primary.w,primary.h,"fill",15)
  centered(652,complete and "再来一轮" or (won and "下一关" or "重新开始"),40,0)
  if s.keyboard and s.focus==1 then g:rect(26+ox,650+oy,428,54,"stroke",0) end
  return layout
 end
 if s.page=="board" then
  Pixels.condition(g,8+ox,12+oy,"禁止按下",36,15)
  if not s.practice then
   Pixels.center(g,263+ox,24+oy,string.format("第 %02d 关",s.run.level),24,15)
   local seconds=math.ceil(Game.remaining(s.run)/1000);local urgent=seconds<=5
   if urgent then g:rect(356+ox,7+oy,116,49,"fill",15) end
   Pixels.center(g,414+ox,13+oy,tostring(seconds).."秒",32,urgent and 0 or 15)
   g:rect(8+ox,62+oy,464,5,"stroke",15)
   local width=math.floor(460*Game.remaining(s.run)/Game.time_limit(s.run.level,s.run.route))
   if width>0 then g:rect(10+ox,64+oy,width,1,"fill",15) end
  else
   Pixels.center(g,400+ox,24+oy,"练习",24,15);g:rect(8+ox,62+oy,464,3,"fill",15)
  end
  g:rect(4+ox,80+oy,472,220,"fill",15)
  local board=Game.current(s);local lines=board.lines or Rules.clue_lines(board.rule)
  for i,line in ipairs(lines) do
   Pixels.rule(g,24+ox,98+(i-1)*62+oy,line)
  end
  for i,c in ipairs(board.cells) do
   local target=layout.targets[i];local cx=target.x+target.w/2;local cy=target.y+target.h/2
   frame(g,target,s.keyboard and s.focus==i)
   if not s.practice and s.run.pressed[i] then
    for d=-2,2 do
     if c.forbidden then
      g:line(cx-20,cy-20+d,cx+20,cy+20+d,15);g:line(cx+20,cy-20+d,cx-20,cy+20+d,15)
     else g:line(cx-25,cy+d,cx-5,cy+20+d,15);g:line(cx-5,cy+20+d,cx+30,cy-20+d,15) end
    end
   else
    local large=board.cols==2;local scale=large and 1.5 or 1
    Pixels.scaled_shape(g,cx,cy,c.shape,scale,Rules.fill(c))
    if c.word then
     g:image(c.wordKey,math.floor(cx-26),math.floor(cy+(c.shape=="triangle" and 8 or -17)),{invert=true,color=Rules.fill(c)=="black" and 0 or 15})
    else
    Pixels.number(g,cx,cy+(c.shape=="triangle" and -5 or (large and -40 or -28)),c.value,large and 8 or 5,Rules.number_color(c)=="black" and 15 or 0)
    end
   end
   if s.practice and s.answers and Rules.matches(c,s.rule) then
    g:rect(target.x+3,target.y+3,46,22,"fill",15);text(g,target.x+4,target.y+3,"危险",0)
   end
  end
 else
  t(20,30,"练习设置");g:rect(20+ox,61+oy,440,3,"fill",15)
  local labels={"组合方式","形状条件","数字条件","参数 n","危险答案","除了上述条件之外"}
  local parameter=Rules.parameterized(s.rule.kind) and tostring(s.rule.n) or "此条件无需 n"
  local values={Rules.mode_names[s.rule.mode],Rules.shape_names[s.rule.shape],Rules.number_label(s.rule),parameter,s.answers and "显示" or "隐藏",s.rule.negated and "开启（整个条件取反）" or "关闭"}
  if s.rule.mode=="number" then values[2]=values[2].."（不参与）" end
  if s.rule.mode=="shape" then values[3]=values[3].."（不参与）";values[4]="只看形状，无需 n" end
  for i=1,6 do
   local target=layout.targets[i];frame(g,target,s.keyboard and s.focus==i)
   text(g,target.x+16,target.y+8,labels[i]);text(g,target.x+16,target.y+43,values[i])
  end
  local practice=layout.targets[7];frame(g,practice,s.keyboard and s.focus==7)
  text(g,practice.x+170,practice.y+15,"试练条件")
  local target=layout.targets[8];frame(g,target,s.keyboard and s.focus==8)
  text(g,target.x+170,target.y+13,"返回挑战")
 end
 return layout
end
return M
