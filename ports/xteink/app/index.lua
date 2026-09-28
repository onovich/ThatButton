local App = require("domain.app")
function on_load(ctx) App.load(ctx) end
function on_enter(ctx) App.enter(ctx) end
function on_input(ctx, ev) return App.input(ctx, ev) end
function on_draw(ctx, g) return App.draw(ctx, g) end
function on_tick(ctx, dt_ms) App.tick(ctx, dt_ms) end
function on_leave(ctx) App.leave(ctx) end

function on_unload(ctx) App.unload(ctx) end
