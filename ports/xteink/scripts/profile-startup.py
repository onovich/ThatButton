"""Read-only desktop Lua heap baseline; NOT a firmware memory-limit emulator."""
import json
from pathlib import Path
from lupa.lua55 import LuaRuntime
root=Path(__file__).resolve().parents[1]
vm=LuaRuntime(max_memory=0)
vm.execute((root/'build/index.lua').read_text(encoding='utf-8'))
heap=vm.get_memory_used()
glyphs=vm.execute((root/'app/domain/glyphs.lua').read_text(encoding='utf-8'))
layers=rectangles=pixels=0
for size,chars in glyphs.items():
 for ch,item in chars.items():
  layers+=1;rectangles+=len(item.r)//4;pixels+=(item.w+4)*(size+6)
print(json.dumps({'entry_heap_bytes_desktop':heap,'glyph_layers':layers,'shape_layers':8,
 'total_prepared_layers':layers+8,'max_layers_per_callback':4,'packed_glyph_rectangles':rectangles,
 'glyph_pixel_storage_lower_bound_1bpp':pixels//8,
 'limitation':'Desktop baseline only. Device allocation, firmware limits and actual fault unknown.'},indent=2))
