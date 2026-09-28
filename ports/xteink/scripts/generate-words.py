from pathlib import Path
import json
from io import BytesIO
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'assets/words/catalog.json').read_text(encoding='utf-8'))
font=ImageFont.truetype('C:/Windows/Fonts/SourceHanSansSC-VF.otf',26);font.set_variation_by_axes([700])
rows=[]
for category in data:
 words=[]
 for word in category['words']:
  im=Image.new('L',(52,34),0);ImageDraw.Draw(im).text((0,27),word['text'],font=font,fill=255,anchor='ls')
  buffer=BytesIO();im.point(lambda p:255 if p>=128 else 0).convert('RGB').save(buffer,format='PNG')
  target=ROOT/'assets/words'/f"{word['key']}.png"
  if not target.exists() or target.read_bytes()!=buffer.getvalue():target.write_bytes(buffer.getvalue())
  words.append('{text='+json.dumps(word['text'],ensure_ascii=False)+',key='+json.dumps(word['key'])+'}')
 rows.append('{id='+json.dumps(category['id'])+',label='+json.dumps(category['label'],ensure_ascii=False)+',exclude={'+','.join('['+json.dumps(x)+']=true' for x in category['exclude'])+'},words={'+','.join(words)+'}}')
(ROOT/'app/domain/words.lua').write_text('return {'+','.join(rows)+'}\n',encoding='utf-8')
