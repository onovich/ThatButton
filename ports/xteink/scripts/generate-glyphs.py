"""Native-size, heavyweight type for the 1-bit device; no enlarged 28px glyphs."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
condition='黑白色图三角形圆方星并且是或质数合奇偶的倍尾为含字0123456789除了之外'
groups={24:'第关0123456789 /练习',28:'本关得分累计全部安全按键已清除误了禁止时间耗尽挑战完成0123456789 ',30:'再玩本关重试',32:condition+'秒',36:'禁止按下练习设置并且是或',40:condition+'下一关重新开始再来轮',52:condition,56:'0123456789',80:'0123456789',88:'本关完成挑战结束全部通关'}
lines=['-- Generated at native display sizes. Source Han Sans SC Heavy + Arial Bold digits.','local M={}']
for size,chars in groups.items():
 font=ImageFont.truetype('C:/Windows/Fonts/SourceHanSansSC-VF.otf',size);font.set_variation_by_axes([900])
 digits=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',size)
 lines.append(f'M[{size}]={{}}')
 for ch in sorted(set(chars)):
  face=digits if ord(ch)<128 else font
  advance=round(face.getlength(ch));im=Image.new('L',(max(size,advance)+4,size+6))
  ImageDraw.Draw(im).text((0,round(size*.88)),ch,font=face,fill=255,anchor='ls')
  # Largest-rectangle cover preserves every source pixel while reducing draw commands.
  mask=[[im.getpixel((x,y))>=128 for x in range(im.width)] for y in range(im.height)]
  rects=[]
  while True:
   heights=[0]*im.width;best=(0,0,0,0,0)
   for y,row in enumerate(mask):
    heights=[h+1 if bit else 0 for h,bit in zip(heights,row)]
    stack=[]
    for x,h in enumerate(heights+[0]):
     left=x
     while stack and stack[-1][1]>h:
      xx,hh=stack.pop();left=xx;area=(x-xx)*hh
      if area>best[0]:best=(area,xx,y-hh+1,x-xx,hh)
     if h and (not stack or stack[-1][1]<h):stack.append((left,h))
   area,x,y,w,h=best
   if not area:break
   rects.append([x,y,w,h])
   for yy in range(y,y+h):
    for xx in range(x,x+w):mask[yy][xx]=False
  packed=''.join(chr(value+33) for rect in rects for value in rect)
  lines.append(f'M[{size}]["{ch}"]={{w={advance},r='+json.dumps(packed)+'}')
lines.append('return M')
(ROOT/'app/domain/glyphs.lua').write_text('\n'.join(lines)+'\n',encoding='utf-8')
