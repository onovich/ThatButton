"""System-font startup: first frame is playable, with zero offscreen allocations."""
from run import Host, build
from lupa.lua55 import LuaRuntime
source=(build()/'index.lua').read_text(encoding='utf-8')
vm=LuaRuntime(max_memory=1048576);vm.execute(source)
assert vm.get_memory_used()<200000
h=Host(source,prepare=False,layer_budget=0)
assert not h.s.loading and len(h.targets)==4
assert h.s.run.remainingMs==12000
assert any(k=='text' and a[2]=='禁止按下' for k,a in h.commands)
assert h.vm.globals().peak_layers_callback==0
h.vm.globals().on_tick(h.ctx,1000);h.frame()
assert h.s.run.remainingMs==11000
h.snapshot('device-boot-ready.png')
h.vm.globals().on_unload(h.ctx)
print({'status':'PASS','loading_ticks':0,'offscreen_layers':0,'entry_heap':vm.get_memory_used()})
