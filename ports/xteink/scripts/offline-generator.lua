local Rules=require("domain.rules")
local Config=require("domain.progression")
local Words=require("domain.words")
local M={total=Config.total}
-- Three separated late slots per seed; never consume rare rules outside them.
function M.rare(seed,level)
 return level==32+seed%2 or level==35+seed%2 or level==38+seed%2
end
local function integer(n,min,max) return type(n)=="number" and n%1==0 and n>=min and n<=max end
function M.band(level)
 local b=Config.bands[1]
 for _,candidate in ipairs(Config.bands) do if level>=candidate.min then b=candidate end end
 return b
end
-- Introduce operators separately, then interleave them instead of blocking by chapter.
local operatorSlots={
 [18]="or",[20]="or",[22]="or",[24]="or",[26]="not",
 [28]="or",[29]="not",[30]="or",[31]="not",[33]="or",[34]="not",
 [35]="or",[36]="not",[38]="not",[39]="or",[40]="not"}
function M.operator(level) return operatorSlots[level] or "and" end
local wordSlots={11,14,17,20,23,26,28,30,34,40}
function M.word_slot(level)
 for i,n in ipairs(wordSlots) do if n==level then return i end end
end
local function word_board(seed,level,rand)
 local slot=M.word_slot(level);local category=Words[(seed+slot*3)%#Words+1]
 local join=slot<=2 and "single" or (M.operator(level)=="or" and "or" or "and")
 local axis=slot>2 and rand(2)==1 and "color" or "shape"
 local r={wordJoin=join,wordAxis=axis,category=category.id,label=category.label,
  shape=Rules.shapes[rand(#Rules.shapes)],tone=rand(2)==1 and "black" or "white",wordNot=M.operator(level)=="not"}
 local safeCategories={}
 for _,c in ipairs(Words) do if c.id~=category.id and not category.exclude[c.id] then safeCategories[#safeCategories+1]=c end end
 local cells={};local used={};local fatal=0
 local function add(a,b)
  local member=b;if r.wordNot then member=not member end
  local cat=member and category or safeCategories[rand(#safeCategories)]
  local start=(rand(16)+slot*5)%16
  local word
  for i=0,15 do local w=cat.words[(start+i)%16+1];if not used[w.text] then word=w;break end end
  assert(word,"Word pool exhausted");used[word.text]=true
  local shape=r.shape
  if axis=="color" or join=="single" then shape=Rules.shapes[rand(#Rules.shapes)]
  elseif not a then
   local options={};for _,v in ipairs(Rules.shapes) do if v~=r.shape then options[#options+1]=v end end
   shape=options[rand(#options)]
  end
  local fill=#cells%2==0 and "black" or "white"
  if axis=="color" and join~="single" then fill=a and r.tone or (r.tone=="black" and "white" or "black") end
  local c={word=word.text,wordKey=word.key,category=cat.id,shape=shape,fill=fill}
  cells[#cells+1]=c;if Rules.matches(c,r) then fatal=fatal+1 end
 end
 if join=="single" then
  for i=1,9 do add(rand(2)==1,i<=2) end
 else
  -- Both one-sided witnesses are required, so neither clause is redundant.
  add(true,false);add(false,true)
  if join=="and" then add(true,true);add(true,true) end
  while #cells<9 do
   if join=="or" then add(false,false)
   else local a=rand(2)==1;add(a,not a) end
  end
 end
 for i=#cells,2,-1 do local j=rand(i);cells[i],cells[j]=cells[j],cells[i] end
 assert(Rules.board_valid(cells,r))
 return {cells=cells,rule=r,rows=3,cols=3,fatal=fatal,tier="words",wordSlot=slot}
end
function M.generate(seed,level)
 assert(integer(level,1,Config.total),"Round outside campaign")
 local state=(seed+(level%2147483646)*7919)%2147483646+1
 local function rand(n) state=(state*16807)%2147483647;return state%n+1 end
 local function pick(list) return list[rand(#list)] end
 if M.word_slot(level) then return word_board(seed,level,rand) end
 local band=M.band(level);local cells={};local used={}
 for i=1,band.rows*band.cols do
  local n=rand(99);while used[n] do n=rand(99) end;used[n]=true
  cells[i]={value=n,shape=pick(Rules.shapes),fill="white"}
 end
 -- Shuffle a minority of black fills; both ink pairings occur on every board.
 local order={};for i=1,#cells do order[i]=i end
 for i=#order,2,-1 do local j=rand(i);order[i],order[j]=order[j],order[i] end
 local blackCount=level<6 and rand(math.floor(#cells/2)) or (1+rand(math.floor(#cells/2)-1))
 for i=1,blackCount do cells[order[i]].fill="black" end
 local function color()
  return {target=rand(2)==1 and "shape" or "number",tone=rand(2)==1 and "black" or "white"}
 end
 local function numeric()
  local kind=pick({"multiple","ending","contains","odd","even"})
  if M.rare(seed,level) then kind=rand(2)==1 and "prime" or "composite" end
  return {kind=kind,n=kind=="multiple" and rand(8)+1 or rand(10)-1}
 end
 local selectedTier=pick(band.tiers)
 if level==1 or level==4 then selectedTier="singleVisual" end
 if level>=11 then
  local op=M.operator(level)
  selectedTier=op=="not" and "not" or (op=="or" and pick({"orMixed","orColor"}) or "compoundAnd")
 end
 for attempt=1,120 do
  local tier=selectedTier;local r=numeric();r.shape=pick(Rules.shapes);r.mode="number"
  if tier=="singleVisual" then r.mode="shape"
  elseif tier=="singleNumber" then r.kind=rand(2)==1 and "even" or "odd"
  elseif tier=="singleMath" then r.kind=pick({"multiple","ending","contains"});r.n=r.kind=="multiple" and rand(8)+1 or rand(10)-1
  elseif tier=="compoundAnd" then r.mode="and"
  elseif tier=="not" then r.mode="and";r.notNumber=true
  elseif tier=="orColor" then r.mode="numbers";r.second=numeric()
  elseif tier=="orMixed" then r.mode="or" end
  -- One color atom at most. It may combine only with an independent shape/math atom.
  -- Every third round introduces color; other rounds can mix it in at low frequency.
  if (level==2 or (level>=11 and selectedTier~="not")) and (level%3==2 or rand(4)==1) then
   local atom=color()
   if level<6 then r={mode="color",color=atom};tier="singleColor"
   else
    local other=numeric()
    other.mode=other.mode or "number"
    local mode=M.operator(level)=="or" and "colorOr" or "colorAnd"
    r={mode=mode,color=atom,other=other};tier=mode
   end
  end
  if M.rare(seed,level) then
   -- Rare late concepts retain two attributes, but avoid negating primality.
   r=numeric();r.mode="and";r.shape=pick(Rules.shapes);tier="rareNumber"
  end
  local fatal=0;for _,c in ipairs(cells) do if Rules.matches(c,r) then fatal=fatal+1 end end
  if Rules.board_valid(cells,r) and fatal>=band.fatalMin and fatal<=band.fatalMax and fatal>0 and fatal<#cells then
   return {cells=cells,rule=r,rows=band.rows,cols=band.cols,fatal=fatal,tier=tier}
  end
 end
 -- Construct an equally complex board if random candidates do not fit.
 local r={mode="number",kind=level>=6 and "multiple" or "odd",n=3,shape=pick(Rules.shapes)}
 if level<=2 or level==4 then r.mode="shape"
 elseif level>=11 and M.operator(level)=="not" then r.mode="and";r.kind="odd";r.notNumber=true
 elseif level>=11 and M.operator(level)=="or" then r.mode="or";r.kind="odd"
 elseif level>=11 then r.mode="and";r.kind="odd" end
 if M.rare(seed,level) then r.mode="and";r.kind="prime";r.notNumber=nil end
 local pool={}
 for value=1,99 do for _,shape in ipairs(Rules.shapes) do pool[#pool+1]={value=value,shape=shape,fill="white"} end end
 cells={};used={}
 local function take(want,aWanted,bWanted)
  local start=rand(#pool)
  for offset=0,#pool-1 do
   local c=pool[(start+offset-1)%#pool+1]
   local a,b=Rules.parts(c,r)
   if not used[c.value] and Rules.matches(c,r)==want and (aWanted==nil or (a==aWanted and b==bWanted)) then
    cells[#cells+1]={value=c.value,shape=c.shape,fill=#cells%2==0 and "black" or "white"};used[c.value]=true;return
   end
  end
  error("Constructive generation failed")
 end
 local fatal=0
 if Rules.compound(r) then
  local isAnd=r.mode=="and"
  take(not isAnd,true,false);take(not isAnd,false,true)
  fatal=isAnd and 0 or 2
 end
 while fatal<band.fatalMin do take(true);fatal=fatal+1 end
 while #cells<band.rows*band.cols do take(false) end
 for i=#cells,2,-1 do local j=rand(i);cells[i],cells[j]=cells[j],cells[i] end
 assert(Rules.board_valid(cells,r))
 return {cells=cells,rule=r,rows=band.rows,cols=band.cols,fatal=fatal,tier="fallback"}
end
function M.time_limit(level,seed)
 local b=M.band(level)
 local seconds=b.seconds-(b.seconds-b.finish)*(level-b.min)/(b["end"]-b.min)
 if M.rare(seed,level) or (M.word_slot(level) and M.word_slot(level)<=2) then seconds=seconds+2 end
 if level==18 or level==26 then seconds=seconds+1 end
 return math.floor(seconds*1000+0.5)
end
function M.remaining(run) return run.remainingMs or M.time_limit(run.level,run.seed) end
function M.migrate(run)
 if type(run)~="table" or run.generation~=Config.generation
  or not integer(run.level,1,Config.total) or not integer(run.seed,1,2147483646) then return end
 if run.remainingMs==nil then run.remainingMs=M.time_limit(run.level,run.seed)
 elseif type(run.remainingMs)=="number" then run.remainingMs=math.min(run.remainingMs,M.time_limit(run.level,run.seed)) end
 -- Remove retired combat fields from old saves; a previously wrong key now ends the round.
 run.hp=nil;run.startHp=nil
 if type(run.pressed)=="table" then
  local board=M.board(run)
  for i,v in pairs(run.pressed) do
   if v==true and board.cells[i] and Rules.matches(board.cells[i],board.rule) then
    run.status="failed";run.failureReason="wrong";break
   end
  end
 end
end
function M.elapse(run,dt)
 if run.status~="playing" or type(dt)~="number" or dt~=dt or dt<=0 or dt==math.huge then return false end
 local before=math.ceil(M.remaining(run)/1000)
 run.remainingMs=math.max(0,M.remaining(run)-math.floor(dt))
 if run.remainingMs==0 then run.status="failed";run.failureReason="timeout" end
 return math.ceil(run.remainingMs/1000)~=before or run.status=="failed"
end
function M.new(seed)
 return {remainingMs=M.time_limit(1,seed or 20260923),generation=Config.generation,seed=seed or 20260923,level=1,score=0,startScore=0,pressed={},status="playing"}
end
-- Cache only the current deterministic board, outside persisted state.
local cachedSeed,cachedLevel,cachedBoard
function M.board(run)
 if not cachedBoard or cachedSeed~=run.seed or cachedLevel~=run.level then
  cachedBoard=M.generate(run.seed,run.level);cachedSeed=run.seed;cachedLevel=run.level
 end
 return cachedBoard
end
function M.valid(run)
 if type(run)~="table" or run.generation~=Config.generation or not integer(run.seed,1,2147483646) or not integer(run.level,1,Config.total)
  or not integer(run.startScore,0,9007199254740000)
  or type(run.pressed)~="table" then return false end
 if not integer(run.remainingMs,0,M.time_limit(run.level,run.seed)) then return false end
 local board=M.board(run);local safe,wrong=0,0
 for key,value in pairs(run.pressed) do
  if not integer(key,1,#board.cells) or value~=true then return false end
  if Rules.matches(board.cells[key],board.rule) then wrong=wrong+1 else safe=safe+1 end
 end
 local status=(wrong>0 or run.remainingMs==0) and "failed" or (safe==#board.cells-board.fatal and (run.level==Config.total and "complete" or "won") or "playing")
 if status=="failed" and run.failureReason~=(wrong>0 and "wrong" or "timeout") then return false end
 if status~="failed" and run.failureReason~=nil then return false end
 return run.score==run.startScore+safe*10 and run.status==status
end
function M.press(run,index)
 local board=M.board(run)
 if run.status~="playing" or not board.cells[index] or run.pressed[index] then return false end
 run.pressed[index]=true
 if Rules.matches(board.cells[index],board.rule) then
  run.status="failed";run.failureReason="wrong";return true
 end
 run.score=run.score+10
 local remaining=0
 for i,c in ipairs(board.cells) do if not run.pressed[i] and not Rules.matches(c,board.rule) then remaining=remaining+1 end end
 if remaining==0 then run.status=run.level==Config.total and "complete" or "won" end
 return true
end
function M.next(run)
 if run.status~="won" or run.level>=Config.total then return false end
 run.level=run.level+1;run.remainingMs=M.time_limit(run.level,run.seed);run.failureReason=nil;run.startScore=run.score;run.pressed={};run.status="playing";return true
end
function M.current(s)
 if s.practice then return {cells=Rules.cells,rule=s.rule,rows=3,cols=3} end
 return M.board(s.run)
end
return M
