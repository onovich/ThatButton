// Windows use round-relative milliseconds; combo deadlines use the session clock.
export function extendProtectedCombo(combo, windows, from, to, roundOrigin) {
  if (combo.expiresAtMs === null) return;
  const since = Math.max(from, (combo.lastEventAtMs ?? roundOrigin + from) - roundOrigin);
  for (const [a,b] of windows || []) {
    const begin = Math.max(since,a), end = Math.min(to,b);
    if (end > begin && combo.expiresAtMs >= roundOrigin + begin) combo.expiresAtMs += end - begin;
  }
}
