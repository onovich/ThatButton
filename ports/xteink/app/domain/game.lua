local Rules=require("domain.rules")
local Bank=require("domain.bank")
local M={total=40,routes=20,generation=10}
local function integer(v,lo,hi) return type(v)=="number" and v%1==0 and v>=lo and v<=hi end
local cachedRoute,cachedLevel,cachedBoard
local shapes={"triangle","circle","square","star"}
-- Only the current row is decoded. No rules search, word selection, or board construction.
function M.board(run)
 if cachedBoard and cachedRoute==run.route and cachedLevel==run.level then return cachedBoard end
 assert(integer(run.route,1,20) and integer(run.level,1,40),"Invalid route position")
 local row;local n=0
 for line in Bank[run.route]:gmatch("[^\n]+") do n=n+1;if n==run.level then row=line;break end end
 assert(row,"Missing offline board")
 local ms,rows,cols,mask,clues,tokens=row:match("^(%d+)|(%d+)|(%d+)|(%d+)|([^|]+)|(.+)$")
 local board={id=string.format("R%02d-L%02d",run.route,run.level),timeMs=tonumber(ms),rows=tonumber(rows),cols=tonumber(cols),lines={},cells={},fatal=0}
 for line in clues:gmatch("[^~]+") do board.lines[#board.lines+1]=line end
 mask=tonumber(mask)
 for token in tokens:gmatch("[^,]+") do
  local shape,fill,payload=token:match("^(%d)([bw])(.+)$")
  local i=#board.cells;local forbidden=math.floor(mask/2^i)%2==1
  local c={shape=shapes[tonumber(shape)],fill=fill=="b" and "black" or "white",forbidden=forbidden}
  if payload:sub(1,1)=="w" then c.word=true;c.wordKey="wd_"..payload:sub(2) else c.value=tonumber(payload) end
  board.cells[i+1]=c;if forbidden then board.fatal=board.fatal+1 end
 end
 cachedRoute=run.route;cachedLevel=run.level;cachedBoard=board;return board
end
function M.time_limit(level,route) return M.board({route=route,level=level}).timeMs end
function M.remaining(run) return run.remainingMs end
function M.migrate(run) end
function M.new(route)
 return {generation=M.generation,route=route,level=1,score=0,startScore=0,pressed={},status="playing",remainingMs=M.time_limit(1,route)}
end
function M.start(s)
 local last=s.lastRouteId
 -- Migrate the last entered ID once; discard the old shuffle history.
 if not integer(last,1,20) then
  last=type(s.rotation)=="table" and s.rotation.lastRoute or nil
  if not integer(last,1,20) then last=type(s.run)=="table" and s.run.route or nil end
 end
 if not integer(last,1,20) then last=0 end
 local nextId=last%20+1
 s.lastRouteId=nextId;s.rotation=nil
 return M.new(nextId)
end
function M.valid(run)
 if type(run)~="table" or run.generation~=M.generation or not integer(run.route,1,20) or not integer(run.level,1,40) or not integer(run.startScore,0,9007199254740000) or type(run.pressed)~="table" then return false end
 local board=M.board(run)
 if not integer(run.remainingMs,0,board.timeMs) then return false end
 local safe,wrong=0,0
 for i,v in pairs(run.pressed) do
  if not integer(i,1,#board.cells) or v~=true then return false end
  if board.cells[i].forbidden then wrong=wrong+1 else safe=safe+1 end
 end
 local status=(wrong>0 or run.remainingMs==0) and "failed" or (safe==#board.cells-board.fatal and (run.level==40 and "complete" or "won") or "playing")
 if status=="failed" and run.failureReason~=(wrong>0 and "wrong" or "timeout") then return false end
 if status~="failed" and run.failureReason~=nil then return false end
 return run.score==run.startScore+safe*10 and run.status==status
end
function M.elapse(run,dt)
 if run.status~="playing" or type(dt)~="number" or dt~=dt or dt<=0 or dt==math.huge then return false end
 local before=math.ceil(run.remainingMs/1000);run.remainingMs=math.max(0,run.remainingMs-math.floor(dt))
 if run.remainingMs==0 then run.status="failed";run.failureReason="timeout" end
 return before~=math.ceil(run.remainingMs/1000) or run.status=="failed"
end
function M.press(run,index)
 local board=M.board(run)
 if run.status~="playing" or not board.cells[index] or run.pressed[index] then return false end
 run.pressed[index]=true
 if board.cells[index].forbidden then run.status="failed";run.failureReason="wrong";return true end
 run.score=run.score+10
 local left=0;for i,c in ipairs(board.cells) do if not run.pressed[i] and not c.forbidden then left=left+1 end end
 if left==0 then run.status=run.level==40 and "complete" or "won" end
 return true
end
function M.next(run)
 if run.status~="won" or run.level>=40 then return false end
 run.level=run.level+1;run.remainingMs=M.time_limit(run.level,run.route);run.failureReason=nil;run.startScore=run.score;run.pressed={};run.status="playing";return true
end
function M.current(s)
 if s.practice then return {cells=Rules.cells,rule=s.rule,rows=3,cols=3} end
 return M.board(s.run)
end
return M
