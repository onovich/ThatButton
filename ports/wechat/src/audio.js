const FILES = {
  click: 'audio/click.wav',
  chain: 'audio/chain.wav',
  combo: 'audio/combo.wav',
  error: 'audio/error.wav',
  explosion: 'audio/explosion.wav',
  levelup: 'audio/levelup.wav',
  beep: 'audio/beep.wav'
};

export function createWechatAudio(wxApi) {
  const contexts = new Map();

  function play(name) {
    if (typeof wxApi.createInnerAudioContext !== 'function') return;
    try {
      let context = contexts.get(name);
      if (!context) {
        context = wxApi.createInnerAudioContext();
        context.src = FILES[name];
        context.obeyMuteSwitch = true;
        contexts.set(name, context);
      }
      context.stop();
      context.play();
    } catch {
      // Sound is feedback only; an unavailable decoder must not interrupt play.
    }
  }

  return {
    resume() {},
    playBeep() { play('beep'); },
    playSafeClick() { play('click'); },
    playChainReady() { play('chain'); },
    playComboCue() { play('combo'); },
    playError() {
      play('error');
      try { wxApi.vibrateShort?.({ type: 'light' }); } catch {}
    },
    playExplosion() { play('explosion'); },
    playLevelUp() { play('levelup'); },
    destroy() {
      contexts.forEach((context) => context.destroy?.());
      contexts.clear();
    }
  };
}
