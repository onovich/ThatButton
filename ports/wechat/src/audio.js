import { SFX_CUES, createSfxGate } from '../../../src/audio/cues.js';

export function createWechatAudio(wxApi, now = Date.now, onCue = () => {}) {
  const contexts = new Map();
  const gate = createSfxGate(now);
  let soundEnabled = true;
  let vibrationEnabled = true;

  function contextFor(name) {
    let context = contexts.get(name);
    if (context || typeof wxApi.createInnerAudioContext !== 'function') return context;
    context = wxApi.createInnerAudioContext();
    context.src = `audio/${SFX_CUES[name].file}`;
    context.volume = SFX_CUES[name].volume;
    context.obeyMuteSwitch = true;
    contexts.set(name, context);
    return context;
  }

  function play(name) {
    if (!soundEnabled) return;
    const permit = gate.allow(name);
    if (!permit.allowed) return;
    try {
      for (const victim of permit.victims) contexts.get(victim)?.stop();
      const existed = contexts.has(name);
      const context = contextFor(name);
      if (!context) return;
      if (existed) context.stop();
      context.play();
      onCue(SFX_CUES[name]);
    } catch {
      // An unavailable decoder must never interrupt gameplay.
    }
  }

  function stopAll() {
    for (const context of contexts.values()) {
      try { context.stop(); } catch {}
    }
    gate.clear();
  }

  return {
    setPreferences({ sound = soundEnabled, vibration = vibrationEnabled } = {}) {
      soundEnabled = Boolean(sound);
      vibrationEnabled = Boolean(vibration);
      if (!soundEnabled) stopAll();
    },
    preload() {
      if (!soundEnabled) return;
      for (const name of ['ui_open', 'ui_back', 'ui_toggle', 'run_start', 'safe_press', 'chain_ready', 'combo_2', 'wrong_press', 'round_clear', 'run_failure']) {
        try { contextFor(name); } catch {}
      }
    },
    resume() {},
    suspend: stopAll,
    playUiOpen() { play('ui_open'); },
    playUiBack() { play('ui_back'); },
    playUiToggle() { play('ui_toggle'); },
    playUiConfirm() { play('ui_confirm'); },
    playRunStart() { play('run_start'); },
    playRoundEnter() { play('round_enter'); },
    playTypingTick() { play('typing_tick'); },
    playSafeClick() { play('safe_press'); },
    playChainReady() { play('chain_ready'); },
    playComboCue({ streak = 2, capped = false } = {}) {
      play(capped ? 'combo_cap' : streak >= 3 ? 'combo_high' : 'combo_2');
    },
    playError() {
      play('wrong_press');
      if (vibrationEnabled) {
        try { wxApi.vibrateShort?.({ type: 'light' }); } catch {}
      }
    },
    playTimeWarning() { play('time_warning'); },
    playRoundClear() { play('round_clear'); },
    playEnemyDefeated() { play('enemy_defeated'); },
    playUpgradeOffer() { play('upgrade_offer'); },
    playUpgradeSelect() { play('upgrade_select'); },
    playFailure() {
      play('run_failure');
      if (vibrationEnabled) {
        try { wxApi.vibrateShort?.({ type: 'heavy' }); } catch {}
      }
    },
    destroy() {
      stopAll();
      for (const context of contexts.values()) context.destroy?.();
      contexts.clear();
    }
  };
}
