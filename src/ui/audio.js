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

  function playChainReady() {
    playBeep(760, 'triangle', 0.08);
    schedule(() => playBeep(920, 'triangle', 0.09), 55);
  }

  function playComboCue({ streak = 2, capped = false } = {}) {
    const normalizedStreak = Math.max(2, Math.floor(Number(streak) || 2));
    const baseFrequency = capped ? 1100 : Math.min(980, 720 + (normalizedStreak * 54));
    playBeep(baseFrequency, 'square', 0.08);
    schedule(() => playBeep(baseFrequency + (capped ? 260 : 120), 'square', capped ? 0.16 : 0.1), 65);
    if (normalizedStreak >= 3 || capped) {
      schedule(() => playBeep(baseFrequency + (capped ? 420 : 220), 'triangle', 0.12), 135);
    }
  }

  function playError() {
    playBeep(180, 'square', 0.12);
    schedule(() => playBeep(90, 'sawtooth', 0.18), 60);
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
    playChainReady,
    playComboCue,
    playError,
    playExplosion,
    playLevelUp
  };
}
