// One source of truth for the Web and WeChat sound palette. Files live beside this module.
export const SFX_CUES = Object.freeze({
  ui_open: { file: 'ui_open.wav', volume: .27, durationMs: 148, cooldownMs: 90, priority: 1 },
  ui_back: { file: 'ui_back.wav', volume: .26, durationMs: 75, cooldownMs: 90, priority: 1 },
  ui_toggle: { file: 'ui_toggle.wav', volume: .23, durationMs: 63, cooldownMs: 90, priority: 1 },
  ui_confirm: { file: 'ui_confirm.wav', volume: .28, durationMs: 290, cooldownMs: 160, priority: 1 },
  run_start: { file: 'run_start.wav', volume: .38, durationMs: 260, cooldownMs: 250, priority: 3 },
  round_enter: { file: 'round_enter.wav', volume: .29, durationMs: 314, cooldownMs: 200, priority: 2 },
  typing_tick: { file: 'typing_tick.wav', volume: .10, durationMs: 29, cooldownMs: 85, priority: 1 },
  safe_press: { file: 'safe_press.wav', volume: .32, durationMs: 95, cooldownMs: 65, priority: 1 },
  chain_ready: { file: 'chain_ready.wav', volume: .27, durationMs: 205, cooldownMs: 90, priority: 2, family: 'press_accent' },
  combo_2: { file: 'combo_2.wav', volume: .31, durationMs: 211, cooldownMs: 120, priority: 2, family: 'press_accent' },
  combo_high: { file: 'combo_high.wav', volume: .32, durationMs: 401, cooldownMs: 140, priority: 2, family: 'press_accent' },
  combo_cap: { file: 'combo_cap.wav', volume: .34, durationMs: 304, cooldownMs: 350, priority: 3, family: 'press_accent' },
  wrong_press: { file: 'wrong_press.wav', volume: .38, durationMs: 104, cooldownMs: 180, priority: 3 },
  time_warning: { file: 'time_warning.wav', volume: .18, durationMs: 55, cooldownMs: 900, priority: 2 },
  round_clear: { file: 'round_clear.wav', volume: .37, durationMs: 322, cooldownMs: 200, priority: 3 },
  enemy_defeated: { file: 'enemy_defeated.wav', volume: .43, durationMs: 314, cooldownMs: 350, priority: 4 },
  upgrade_offer: { file: 'upgrade_offer.wav', volume: .25, durationMs: 320, cooldownMs: 250, priority: 2 },
  upgrade_select: { file: 'upgrade_select.wav', volume: .43, durationMs: 490, cooldownMs: 250, priority: 4 },
  run_failure: { file: 'run_failure.wav', volume: .43, durationMs: 163, cooldownMs: 400, priority: 4 }
});

// Small, strict polyphony limit keeps fast button presses from masking feedback.
export function createSfxGate(now = Date.now, maxVoices = 2) {
  const lastPlayed = new Map();
  let active = [];

  function allow(name) {
    const cue = SFX_CUES[name];
    if (!cue) return { allowed: false };
    const timestamp = now();
    if (timestamp - (lastPlayed.get(name) ?? -Infinity) < cue.cooldownMs) {
      return { allowed: false };
    }
    const live = active.filter((voice) => voice.until > timestamp);
    const victims = live.filter((voice) => voice.name === name || (cue.family && voice.family === cue.family));
    const remaining = live.filter((voice) => !victims.includes(voice));
    if (remaining.length >= maxVoices) {
      const quietest = remaining.reduce((a, b) => a.priority <= b.priority ? a : b);
      if (quietest.priority >= cue.priority) return { allowed: false };
      victims.push(quietest);
      remaining.splice(remaining.indexOf(quietest), 1);
    }
    lastPlayed.set(name, timestamp);
    active = [...remaining, { name, family: cue.family, priority: cue.priority, until: timestamp + cue.durationMs }];
    return { allowed: true, victims: victims.map((voice) => voice.name) };
  }

  return { allow, clear() { active = []; lastPlayed.clear(); } };
}
