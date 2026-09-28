-- System text has a fixed font in the public device contract.
-- Width is a conservative CJK/ASCII layout estimate, not a font measurement API.
local RuleImages=require("domain.ruleimages")
local M={}
function M.init(ctx) end
function M.dispose() end
function M.width(str,size)
 local w=0
 for _,code in utf8.codes(str) do w=w+(code<128 and 10 or 20) end
 return w
end
function M.condition(g,x,y,str,size,color)
 g:text(math.floor(x),math.floor(y+math.max(0,((size or 24)-24)/2)),tostring(str),{color=color or 0})
end
function M.center(g,cx,y,str,size,color)
 M.condition(g,math.floor(cx-M.width(str,size)/2),y,str,size,color)
end
-- Ready-made 1bpp rule glyphs; no font construction or layer allocations.
function M.rule(g,x,y,str)
 for _,code in utf8.codes(tostring(str)) do
  local ch=utf8.char(code);local w=assert(RuleImages[ch],"Missing rule image: "..ch)
  g:image(string.format("rt_%x",code),x,y,{invert=true,color=0})
  x=x+w
 end
end
-- Bounded, seven-segment large numerals: at most seven rectangles per digit.
local digits={['0']='abcdef',['1']='bc',['2']='abged',['3']='abgcd',
 ['4']='fgbc',['5']='afgcd',['6']='afgecd',['7']='abc',['8']='abcdefg',['9']='abfgcd'}
function M.number(g,cx,y,value,scale,color,maxWidth,height)
 local h=height or ((scale==8 or scale==9) and 72 or 50)
 if maxWidth then h=math.min(h,math.floor(maxWidth/(#tostring(value)*0.70))) end
 local w=math.floor(h*0.55);local t=math.max(3,math.floor(h/9));local gap=math.floor(h/7)
 local str=tostring(value);local x=math.floor(cx-(#str*w+(#str-1)*gap)/2)
 local middle=math.floor(h/2)
 local strokes={a={0,0,w,t},b={w-t,0,t,middle},c={w-t,middle,t,h-middle},
 d={0,h-t,w,t},e={0,middle,t,h-middle},f={0,0,t,middle},g={0,middle-math.floor(t/2),w,t}}
 for i=1,#str do
  for key in (digits[str:sub(i,i)] or 'g'):gmatch('%a') do
   local r=strokes[key];g:rect(x+r[1],y+r[2],r[3],r[4],'fill',color or 15)
  end
  x=x+w+gap
 end
end
local function polygon(g,cx,cy,points)
 for i,p in ipairs(points) do
  local q=points[i%#points+1]
  for d=-1,1 do g:line(cx+p[1]+d,cy+p[2],cx+q[1]+d,cy+q[2],15) end
 end
end
function M.shape(g,cx,cy,shape,fill)
 local black=fill=="black"
 if shape=="circle" then g:circle(cx,cy,56,"fill",15);if not black then g:circle(cx,cy,53,"fill",0) end
 elseif shape=="square" and black then g:rect(cx-55,cy-55,110,110,"fill",15)
 elseif shape=="square" then for d=0,2 do g:rect(cx-55+d,cy-55+d,110-d*2,110-d*2,"stroke",15) end
 elseif shape=="triangle" then
  if black then M.solid(g,cx,cy,{{0,-70},{67,61},{-67,61}}) end
  polygon(g,cx,cy,{{0,-70},{67,61},{-67,61}})
 else
  if black then M.solid(g,cx,cy,{{0,-68},{22,-31},{66,-22},{39,13},{42,61},{0,41},{-42,61},{-39,13},{-66,-22},{-22,-31}}) end
  polygon(g,cx,cy,{{0,-68},{22,-31},{66,-22},{39,13},{42,61},{0,41},{-42,61},{-39,13},{-66,-22},{-22,-31}})
 end
end
function M.scaled_shape(g,cx,cy,shape,scale,fill,building)
 if scale==1 then M.shape(g,cx,cy,shape,fill);return end
 local proxy={
  line=function(_,a,b,c,d,color)
   if building and b==d then g:rect(cx+math.min(a,c)*scale,cy+b*scale,math.abs(c-a)*scale+1,math.ceil(scale),"fill",color)
   else g:line(cx+a*scale,cy+b*scale,cx+c*scale,cy+d*scale,color) end
  end,
  circle=function(_,a,b,r,mode,color) g:circle(cx+a*scale,cy+b*scale,r*scale,mode,color) end,
  rect=function(_,a,b,w,h,mode,color) g:rect(cx+a*scale,cy+b*scale,w*scale,h*scale,mode,color) end}
 M.shape(proxy,0,0,shape,fill)
end
-- Scan-convert flat silhouettes without depending on unavailable polygon APIs.
function M.solid(g,ox,oy,points)
 local lo,hi=800,0
 for _,p in ipairs(points) do lo=math.min(lo,p[2]);hi=math.max(hi,p[2]) end
 for y=lo,hi-1,2 do
  local xs={}
  for i,a in ipairs(points) do
   local b=points[i%#points+1]
   if (a[2]<=y and b[2]>y) or (b[2]<=y and a[2]>y) then xs[#xs+1]=a[1]+(y-a[2])*(b[1]-a[1])/(b[2]-a[2]) end
  end
  table.sort(xs)
  for i=1,#xs-1,2 do g:rect(math.ceil(xs[i])+ox,y+oy,math.max(1,math.floor(xs[i+1])-math.ceil(xs[i])+1),math.min(2,hi-y),"fill",15) end
 end
end
function M.motifs(g,ox,oy,y)
 for r=18,21 do g:circle(168+ox,y+oy,r,"stroke",15) end
 polygon(g,240+ox,y+oy,{{0,-21},{21,18},{-21,18}})
 for d=0,3 do g:rect(292+d+ox,y-20+d+oy,40-2*d,40-2*d,"stroke",15) end
end
-- Final-run seal inspired by the approved monochrome result concept.
function M.victory(g,ox,oy,total)
 for _,r in ipairs({78,79,84,85}) do g:circle(240+ox,280+oy,r,"stroke",15) end
 M.number(g,240+ox,248+oy,total,9,15)
 local leaves={
  {{126,266},{113,279},{116,303},{130,290}},
  {{130,300},{116,308},{128,329},{142,321}},
  {{146,326},{132,333},{147,353},{161,345}},
  {{167,346},{153,356},{175,371},{187,361}},
  {{193,361},{180,375},{205,383},{218,372}}}
 for _,points in ipairs(leaves) do
  polygon(g,ox,oy,points)
  local mirror={};for _,pt in ipairs(points) do mirror[#mirror+1]={480-pt[1],pt[2]} end
  polygon(g,ox,oy,mirror)
 end
 -- Reuse the game's four shape outlines, reduced to a quiet signature row.
 for i,shape in ipairs({"circle","triangle","square","star"}) do
  local x=180+(i-1)*40+ox;local y=412+oy;local scale=0.17
  local proxy={
   line=function(_,a,b,c,d,color) g:line(x+a*scale,y+b*scale,x+c*scale,y+d*scale,color) end,
   circle=function(_,a,b,r,mode,color) g:circle(x+a*scale,y+b*scale,r*scale,mode,color) end,
   rect=function(_,a,b,w,h,mode,color) g:rect(x+a*scale,y+b*scale,w*scale,h*scale,mode,color) end}
  M.shape(proxy,0,0,shape)
 end
end
return M
