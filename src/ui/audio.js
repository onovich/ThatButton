export function createAudioFeedback(AudioContextConstructor, timers = {}) {
  const schedule = timers.setTimeout || setTimeout;
  const audioContext = AudioContextConstructor ? new AudioContextConstructor() : null;

  function resume() {
    if (audioContext?.state === 'suspended') audioContext.resume();
  }

  function playBeep(freq, type, duration) {
    if (!audioContext) return;
    resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);
    oscillator.stop(audioContext.currentTime + duration);
  }

  function playSafeClick() {
    playBeep(600, 'sine', 0.1);
  }

  function playExplosion() {
    playBeep(100, 'sawtooth', 0.5);
    schedule(() => playBeep(50, 'square', 0.8), 100);
  }

  function playLevelUp() {
    playBeep(400, 'square', 0.1);
    schedule(() => playBeep(600, 'square', 0.15), 100);
    schedule(() => playBeep(800, 'square', 0.2), 250);
  }

  return {
    resume,
    playBeep,
    playSafeClick,
    playExplosion,
    playLevelUp
  };
}
