local M = {}
M.shapes = {"triangle", "circle", "square", "star"}
M.shape_names = {triangle="三角形",circle="圆形",square="方形",star="星形"}
M.kinds = {"multiple","ending","contains","odd","even","prime","composite"}
M.modes = {"number","shape","and","or"}
M.mode_names = {number="只看数字",shape="只看形状",["and"]="形状 并且是 数字",["or"]="形状 或 数字"}
M.cells = {{value=1,shape="circle"},{value=2,shape="square"},{value=9,shape="star"},
 {value=17,shape="triangle"},{value=21,shape="circle"},{value=27,shape="triangle"},
 {value=49,shape="star"},{value=70,shape="square"},{value=72,shape="triangle"}}
function M.parameterized(kind) return kind=="multiple" or kind=="ending" or kind=="contains" end
function M.prime(v)
 if type(v)~="number" or v%1~=0 or v<2 then return false end
 for d=2,math.floor(math.sqrt(v)) do if v%d==0 then return false end end
 return true
end
function M.number(v,kind,n)
 assert(type(v)=="number" and v%1==0 and v>=1 and v<=99,"Expected integer 1-99")
 if kind=="odd" then return v%2==1 end
 if kind=="even" then return v%2==0 end
 if kind=="prime" then return M.prime(v) end
 if kind=="composite" then return v>1 and not M.prime(v) end
 assert(M.parameterized(kind),"Unknown numeric rule")
 assert(type(n)=="number" and n%1==0 and n>=(kind=="multiple" and 2 or 0) and n<=9,"Invalid n")
 if kind=="multiple" then return v%n==0 end
 if kind=="ending" then return v%10==n end
 return string.find(tostring(v),tostring(n),1,true)~=nil
end
-- Only shape fill is stored. Numeral ink is always its inverse.
function M.fill(cell) return cell.fill or "white" end
function M.number_color(cell) return M.fill(cell)=="black" and "white" or "black" end
function M.color_fill(atom)
 assert(atom.target=="shape" or atom.target=="number","Unknown color target")
 assert(atom.tone=="black" or atom.tone=="white","Unknown color")
 return atom.target=="shape" and atom.tone or (atom.tone=="black" and "white" or "black")
end
function M.color_label(atom)
 return (atom.tone=="black" and "黑色" or "白色")..(atom.target=="shape" and "图形" or "数字")
end
-- Color aliases are one binary attribute, never two independent properties.
function M.admissible(r)
 if r.kind=="exact" or (r.second and r.second.kind=="exact") or (r.other and not M.admissible(r.other)) then return false end
 if r.mode=="color" then M.color_fill(r.color);return true end
 if r.mode=="colorAnd" or r.mode=="colorOr" then
  M.color_fill(r.color)
  -- A second color atom is either redundant, contradictory, or exhaustive.
  return r.other and (r.other.mode=="shape" or r.other.mode=="number") and not r.other.negated
 end
 return true
end
local function matches_base(cell,r)
 if r.wordJoin then
  local a,b=M.parts(cell,r)
  if r.wordJoin=="single" then return b end
  if r.wordJoin=="and" then return a and b end
  return a or b
 end
 if r.mode=="color" then return M.fill(cell)==M.color_fill(r.color) end
 if r.mode=="colorAnd" or r.mode=="colorOr" then
  local color=M.fill(cell)==M.color_fill(r.color)
  local other=M.matches(cell,r.other)
  if r.mode=="colorAnd" then return color and other end
  return color or other
 end
 local shape=cell.shape==r.shape
 if r.mode=="shape" then return shape end
 local number=M.number(cell.value,r.kind,r.n)
 if r.notNumber then number=not number end
 if r.mode=="numbers" then return number or M.number(cell.value,r.second.kind,r.second.n) end
 if r.mode=="number" then return number end
 if r.mode=="and" then return shape and number end
 if r.mode=="or" then return shape or number end
 error("Unknown combination")
end
function M.matches(cell,r)
 local result=matches_base(cell,r)
 if r.negated then return not result end
 return result
end
-- Independent witnesses prevent compound rules collapsing to one attribute.
function M.parts(c,r)
 if r.wordJoin then
  local b=c.category==r.category;if r.wordNot then b=not b end
  local a=c.shape==r.shape;if r.wordAxis=="color" then a=M.fill(c)==r.tone end
  return a,b
 end
 if r.mode=="colorAnd" or r.mode=="colorOr" then return M.fill(c)==M.color_fill(r.color),M.matches(c,r.other) end
 local n=M.number(c.value,r.kind,r.n);if r.notNumber then n=not n end
 if r.mode=="numbers" then return n,M.number(c.value,r.second.kind,r.second.n) end
 return c.shape==r.shape,n
end
function M.compound(r) return (r.wordJoin~=nil and r.wordJoin~="single") or r.mode=="and" or r.mode=="or" or r.mode=="numbers" or r.mode=="colorAnd" or r.mode=="colorOr" end
function M.board_valid(cells,r)
 if not M.admissible(r) then return false end
 local fatal=0;local aOnly,bOnly=false,false
 for _,c in ipairs(cells) do
  if M.matches(c,r) then fatal=fatal+1 end
  if M.compound(r) then
   local a,b=M.parts(c,r);aOnly=aOnly or (a and not b);bOnly=bOnly or (b and not a)
  end
 end
 return fatal>0 and fatal<#cells and (not M.compound(r) or (aOnly and bOnly))
end
function M.number_label(r)
 if r.kind=="multiple" then return r.n.." 的倍数" end
 if r.kind=="ending" then return "尾数为 "..r.n end
 if r.kind=="contains" then return "含数字 "..r.n end
 return ({odd="奇数",even="偶数",prime="质数",composite="合数"})[r.kind]
end
function M.clue_lines(r)
 if r.wordJoin then
  local label=r.wordNot and ("除了"..r.label.."之外") or r.label
  if r.wordJoin=="single" then return {label} end
  local axis=r.wordAxis=="color" and ((r.tone=="black" and "黑色" or "白色").."图形") or M.shape_names[r.shape]
  return {axis,r.wordJoin=="and" and "并且是" or "或",label}
 end
 if r.mode=="color" then return {M.color_label(r.color)} end
 if r.mode=="colorAnd" or r.mode=="colorOr" then
  return {M.color_label(r.color),r.mode=="colorAnd" and "并且是" or "或",M.clue_lines(r.other)[1]}
 end
 local number=string.gsub(M.number_label(r)," ","")
 if r.notNumber then number="除了"..number.."之外" end
 local lines
 if r.mode=="numbers" then lines={number,"或",(string.gsub(M.number_label(r.second)," ",""))}
 elseif r.mode=="number" then lines={number}
 elseif r.mode=="shape" then lines={M.shape_names[r.shape]}
 else lines={M.shape_names[r.shape],r.mode=="and" and "并且是" or "或",number} end
 if r.negated then lines[1]="除了"..lines[1];lines[#lines]=lines[#lines].."之外" end
 return lines
end
function M.clue(r) return table.concat(M.clue_lines(r)," ") end
function M.count(r)
 local n=0;for _,c in ipairs(M.cells) do if M.matches(c,r) then n=n+1 end end;return n
end
function M.explain(c,r)
 local out={M.matches(c,r) and "危险 · 符合禁止条件" or "安全 · 不符合禁止条件"}
 if r.mode~="number" then out[#out+1]=c.value.." 是"..M.shape_names[c.shape]..(c.shape==r.shape and "，形状符合。" or "，形状不符。") end
 if r.mode=="shape" then return out end
 local v=c.value;local k=r.kind;local n=r.n;local reason
 if k=="prime" or k=="composite" then
  reason=v.." 是质数。"
  if v==1 then reason="1 既不是质数，也不是合数。"
  else for d=2,math.floor(math.sqrt(v)) do if v%d==0 then reason=v.." = "..d.." × "..math.floor(v/d).."，是合数。";break end end end
 elseif k=="multiple" then reason=v%n==0 and v.." = "..n.." × "..math.floor(v/n).."，可整除。" or v.." 除以 "..n.." 余 "..v%n.."。"
 elseif k=="ending" then reason=v.." 的个位是 "..(v%10).."。"
 elseif k=="contains" then reason=v..(M.number(v,k,n) and " 含有数字 " or " 不含数字 ")..n.."。"
 else reason=v..(v%2==0 and " 是偶数。" or " 是奇数。") end
 out[#out+1]=reason;return out
end
M.definitions={
 multiple={"能被 n 整除的正整数。","例如 21 = 3 × 7。","倍数参数 n 为 2 至 9。"},
 ending={"尾数只看个位数字。","17、27 的尾数为 7。","70、72 的尾数不是 7。"},
 contains={"检查十进制的任意一位。","17、27、70、72 都含 7。","不补前导零；7 不含 0。"},
 odd={"除以 2 余 1 的整数。","奇数不一定是质数。","9、21、27 都是奇合数。"},
 even={"能被 2 整除的整数。","2 是唯一的偶质数。","其余正偶数都是合数。"},
 prime={"大于 1，仅有两个正因数：","1 和它自身。例如 2、17。","1 不是质数。"},
 composite={"大于 1，除 1 和自身之外","还有其他正因数。","例如 9 = 3 × 3。"}}
return M
