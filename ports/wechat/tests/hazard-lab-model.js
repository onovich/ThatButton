// Preview only. Times are relative to the start of a demonstration.
export const DRIFT_MS = 1400;
export const SWAP_MS = 640;
const clamp = v => Math.max(0, Math.min(1, v));
const ease = v => v * v * (3 - 2 * v);
export function swapPose(rect, destination, index, elapsed, options = {}) {
  const driftMs = options.driftMs ?? DRIFT_MS, duration = options.duration ?? SWAP_MS;
  const minimum = options.scale ?? .85, amplitude = options.arc ?? .27;
  if (elapsed < driftMs) {
    const fade = Math.sin(Math.PI * clamp(elapsed / driftMs));
    return { ...rect, x: rect.x + Math.sin(elapsed / 145) * 3 * fade,
      y: rect.y + Math.sin(elapsed / 190) * 2 * fade };
  }
  const t = (elapsed - driftMs) * 640 / duration;
  const travel = ease(clamp((t - 100) / 420));
  const scale = t < 100 ? 1 - (1-minimum) * ease(clamp(t / 100))
    : t < 520 ? minimum : minimum + (1-minimum) * ease(clamp((t - 520) / 120));
  const cx = rect.x + rect.w / 2 + (destination.x - rect.x) * travel;
  const arc = Math.sin(Math.PI * Math.min(.5, travel * 2, (1 - travel) * 2));
  const cy = rect.y + rect.h / 2 + (index === 0 ? -1 : 1) * arc * rect.h * amplitude;
  return { x: cx - rect.w * scale / 2, y: cy - rect.h * scale / 2, w: rect.w * scale, h: rect.h * scale };
}
export function hitAt(rects, x, y) {
  const matches = rects.filter(r => x >= r.x && x <= r.x+r.w && y >= r.y && y <= r.y+r.h);
  if (matches.length !== 1) return null;
  // Any tile participating in overlap is protected in its entirety, regardless of draw order.
  return rects.some(r => r.id !== matches[0].id && overlaps(r,matches[0])) ? null : matches[0].id;
}
export function resolveTap(downId, upId) { return downId && downId === upId ? downId : null; }
export function overlaps(a,b) {
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}
