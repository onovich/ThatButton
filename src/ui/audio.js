import { SFX_CUES, createSfxGate } from '../audio/cues.js';

export function createAudioFeedback(AudioConstructor, { now = Date.now } = {}) {
  const gate = createSfxGate(now);
  const players = new Map();
  let enabled = true;

  function playerFor(name) {
    if (!AudioConstructor) return null;
    let player = players.get(name);
    if (!player) {
      const cue = SFX_CUES[name];
      player = new AudioConstructor(new URL(`../audio/sfx/${cue.file}`, import.meta.url).href);
      player.preload = 'auto';
      player.volume = cue.volume;
      players.set(name, player);
    }
    return player;
  }

  function play(name) {
    if (!enabled || !AudioConstructor) return;
    const permit = gate.allow(name);
    if (!permit.allowed) return;
    try {
      for (const victim of permit.victims) players.get(victim)?.pause();
      const player = playerFor(name);
      player.pause();
      player.currentTime = 0;
      const started = player.play();
      started?.catch?.(() => {}); // Autoplay restrictions should never interrupt the game.
    } catch {
      // Audio is optional feedback; decoding failures leave gameplay intact.
    }
  }

  function stopAll() {
    for (const player of players.values()) player.pause();
    gate.clear();
  }

  return {
    resume() {},
    suspend: stopAll,
    setEnabled(value) { enabled = Boolean(value); if (!enabled) stopAll(); },
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
    playError() { play('wrong_press'); },
    playTimeWarning() { play('time_warning'); },
    playRoundClear() { play('round_clear'); },
    playEnemyDefeated() { play('enemy_defeated'); },
    playUpgradeOffer() { play('upgrade_offer'); },
    playUpgradeSelect() { play('upgrade_select'); },
    playFailure() { play('run_failure'); }
  };
}
