"""Pre-render only the finite rule alphabet; no device font-building work."""
from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
chars='水果蔬菜动物容器衣物家具文具乐器交通工具身体部位黑白色图三角形圆方星并且是或质数合奇偶的倍尾为含字0123456789除了之外'
folder=ROOT/'assets/rule-text';folder.mkdir(parents=True,exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/SourceHanSansSC-VF.otf',44);font.set_variation_by_axes([900])
digit=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',44)
widths={}
for ch in sorted(set(chars)):
 face=digit if ch.isascii() else font
 width=round(face.getlength(ch));widths[ch]=width
 im=Image.new('L',(width,52),0)
 ImageDraw.Draw(im).text((0,40),ch,font=face,fill=255,anchor='ls')
 im=im.point(lambda p:255 if p>=128 else 0).convert('1')
 im.save(folder/f'rt_{ord(ch):x}.png')
(ROOT/'app/domain/ruleimages.lua').write_text('return {'+','.join('['+json.dumps(ch,ensure_ascii=False)+']='+str(w) for ch,w in widths.items())+'}\n',encoding='utf-8')
(folder/'widths.json').write_text(json.dumps(widths,ensure_ascii=False),encoding='utf-8')
print(len(widths),'rule images')
