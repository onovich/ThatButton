"""Side-by-side unmodified approved references and actual Lua captures."""
from pathlib import Path
import base64
root=Path(__file__).resolve().parents[1]
def uri(path):return 'data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode()
html='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>禁止按键 · 设计稿对照</title><style>body{background:#eae7e0;color:#111;font-family:system-ui;margin:36px}main{max-width:1200px;margin:auto}.row{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}section{background:white;padding:16px}img{width:100%;display:block}.pair{display:grid;grid-template-columns:1fr 1fr}h2{font-size:20px}p{line-height:1.8}</style><main><h1>设计稿与实际 Lua 渲染对照</h1><p>字号、字重、图形比例、区域坐标按批准稿修复。实际分数与题目由游戏生成；旧稿生命文案已删除，条件用简化名称，顶部保留关卡和倒计时。实际图由Lua绘制指令渲染，不是设备实拍。</p><div class="row"><section><h2>批准稿 · 结算</h2>'''
html+=f'<img src="{uri(root/"design/references/approved-results.png")}"></section><section><h2>实际 Lua · 结算</h2><div class="pair">'
for name in ['success','failure']:html+=f'<img src="{uri(root/f"artifacts/campaign-{name}.png")}">'
html+='</div></section><section><h2>批准稿 · 九宫格</h2>'
html+=f'<img src="{uri(root/"design/references/approved-board.png")}"></section><section><h2>实际 Lua · 第6关</h2><img src="{uri(root/"artifacts/campaign-board.png")}"></section></div></main>'
(root/'artifacts/fidelity-review.html').write_text(html,encoding='utf-8')
