from pathlib import Path
import sys,json,base64
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'))
from run import Host
source=(ROOT/'build/index.lua').read_text(encoding='utf-8')
routes=json.loads((ROOT/'artifacts/offline-routes.json').read_text(encoding='utf-8'))
h=Host(source);html='<meta charset="utf-8"><title>禁止按键 · 离线整套路线</title><style>body{font-family:system-ui;background:#eee;margin:30px}main{display:flex;flex-wrap:wrap;gap:20px}article{background:white;padding:12px}img{width:240px}table{border-collapse:collapse}td,th{padding:8px;border:1px solid #aaa}</style><h1>20套 × 40关 · 离线整套路线</h1><p>每次读取整套路线，失败重开换下一套；退出后重开换下一套，从第1关开始。图像为正式Lua本地渲染，并非设备实拍。</p><main>'
for level in [1,3,11,18,26,40]:
 h.s.run.level=level;h.s.run.remainingMs=routes[h.s.run.route-1]['boards'][level-1]['ms'];h.s.run.pressed=h.table({});h.s.page='board';h.snapshot(f'offline-board-{level}.png')
 data=base64.b64encode((ROOT/f'artifacts/offline-board-{level}.png').read_bytes()).decode()
 html+=f'<article><h2>第{level}关</h2><img src="data:image/png;base64,{data}"></article>'
html+='</main><h2>完整路线分布</h2><table><tr><th>路线</th><th>单条件</th><th>AND</th><th>OR</th><th>NOT</th></tr>'
for route in routes:
 o=route['operators'];html+=f"<tr><td>R{route['id']:02d}</td><td>{o['single']}</td><td>{o['and']}</td><td>{o['or']}</td><td>{o['not']}</td></tr>"
html+='</table>'
(ROOT/'artifacts/current-flow-demo.html').write_text(html,encoding='utf-8')
