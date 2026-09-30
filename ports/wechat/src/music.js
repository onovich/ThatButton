export const MUSIC_TRACKS = Object.freeze({
  home: { src: 'audio/music/home.m4a', loopEndMs: 11707 },
  game: { src: 'audio/music/game.m4a', loopEndMs: 80000 }
});

const CROSSFADE_MS = 350;
const MAX_GAIN = .20;

export function normalizeMusicVolume(value) {
  return Math.max(0, Math.min(4, Math.round(Number(value) || 0)));
}

export function createWechatMusic(wxApi, timers = {}) {
  const now = timers.now || Date.now;
  const schedule = timers.setTimeout || setTimeout;
  const cancel = timers.clearTimeout || clearTimeout;
  const repeat = timers.setInterval || setInterval;
  const cancelRepeat = timers.clearInterval || clearInterval;
  let enabled = true;
  let volumeStep = 2;
  let hidden = false;
  let desiredMode = 'home';
  let currentMode = null;
  let contexts = [];
  let activeIndex = 0;
  let confirmedPlaying = false;
  let loopTimer = null;
  let fadeTimer = null;
  let duckTimer = null;
  let fade = null;
  let duckUntil = 0;

  function canPlay() { return enabled && volumeStep > 0 && !hidden; }
  function gain() {
    const base = MAX_GAIN * volumeStep / 4;
    return now() < duckUntil ? base * .55 : base;
  }
  function clearLoop() {
    if (loopTimer !== null) cancel(loopTimer);
    if (fadeTimer !== null) cancelRepeat(fadeTimer);
    loopTimer = null;
    fadeTimer = null;
    fade = null;
  }
  function applyVolume() {
    const target = canPlay() ? gain() : 0;
    if (fade) {
      const progress = Math.max(0, Math.min(1, (now() - fade.startedAt) / CROSSFADE_MS));
      contexts[fade.outgoing].volume = target * (1 - progress);
      contexts[fade.incoming].volume = target * progress;
    } else {
      contexts.forEach((context, index) => { context.volume = index === activeIndex ? target : 0; });
    }
  }
  function scheduleBoundary(index) {
    if (!canPlay() || index !== activeIndex || !contexts[index]) return;
    if (loopTimer !== null) cancel(loopTimer);
    const positionMs = Math.max(0, Number(contexts[index].currentTime) || 0) * 1000;
    const remaining = MUSIC_TRACKS[currentMode].loopEndMs - positionMs;
    loopTimer = schedule(() => advance(false), Math.max(50, remaining));
    loopTimer?.unref?.();
  }
  function finishFade() {
    if (!fade) return;
    const outgoing = fade.outgoing;
    if (fadeTimer !== null) cancelRepeat(fadeTimer);
    fadeTimer = null;
    fade = null;
    try { contexts[outgoing].stop(); } catch {}
    applyVolume();
  }
  function advance(immediate) {
    if (!canPlay() || contexts.length !== 2) return;
    clearLoop();
    const outgoing = activeIndex;
    const incoming = 1 - outgoing;
    activeIndex = incoming;
    confirmedPlaying = false;
    try {
      contexts[incoming].stop();
      contexts[incoming].volume = immediate ? gain() : 0;
      contexts[incoming].play();
      if (typeof contexts[incoming].onPlay !== 'function') scheduleBoundary(incoming);
    } catch {
      activeIndex = outgoing;
      applyVolume();
      scheduleBoundary(outgoing);
      return;
    }
    if (immediate) {
      try { contexts[outgoing].stop(); } catch {}
      applyVolume();
      return;
    }
    fade = { outgoing, incoming, startedAt: now() };
    applyVolume();
    fadeTimer = repeat(() => {
      if (!fade || !canPlay()) return;
      if (now() - fade.startedAt >= CROSSFADE_MS) finishFade();
      else applyVolume();
    }, 25);
  }
  function createContext(mode, index) {
    const context = wxApi.createInnerAudioContext();
    context.src = MUSIC_TRACKS[mode].src;
    context.autoplay = false;
    context.loop = false;
    context.obeyMuteSwitch = true;
    context.volume = 0;
    context.onPlay?.(() => {
      if (mode !== currentMode || index !== activeIndex) return;
      confirmedPlaying = true;
      scheduleBoundary(index);
    });
    context.onEnded?.(() => {
      if (mode === currentMode && index === activeIndex && canPlay()) advance(true);
    });
    return context;
  }
  function destroyContexts() {
    clearLoop();
    for (const context of contexts) {
      try { context.stop(); context.destroy?.(); } catch {}
    }
    contexts = [];
    confirmedPlaying = false;
  }
  function start() {
    if (!canPlay() || typeof wxApi.createInnerAudioContext !== 'function') return;
    if (contexts.length === 0) {
      currentMode = desiredMode;
      try { contexts = [createContext(currentMode, 0), createContext(currentMode, 1)]; }
      catch { destroyContexts(); return; }
      activeIndex = 0;
    }
    applyVolume();
    try {
      contexts[activeIndex].play();
      if (typeof contexts[activeIndex].onPlay !== 'function') scheduleBoundary(activeIndex);
    } catch {}
  }
  function pausePlayback() {
    clearLoop();
    for (const context of contexts) {
      try { context.pause?.(); } catch {}
    }
    confirmedPlaying = false;
  }

  return {
    play(mode) {
      if (!MUSIC_TRACKS[mode]) return;
      desiredMode = mode;
      if (currentMode !== mode) destroyContexts();
      if (!canPlay()) return;
      if (contexts.length === 0 || !confirmedPlaying) start();
    },
    setPreferences({ music = enabled, musicVolume = volumeStep } = {}) {
      const wasAudible = enabled && volumeStep > 0;
      enabled = Boolean(music);
      volumeStep = normalizeMusicVolume(musicVolume);
      if (!enabled || volumeStep === 0) pausePlayback();
      else if (!wasAudible && !hidden) start();
      else applyVolume();
    },
    duck(durationMs = 420) {
      if (!canPlay()) return;
      duckUntil = Math.max(duckUntil, now() + durationMs);
      if (duckTimer !== null) cancel(duckTimer);
      applyVolume();
      duckTimer = schedule(() => { duckTimer = null; applyVolume(); }, durationMs + 5);
    },
    pause() { hidden = true; pausePlayback(); },
    resume() {
      hidden = false;
      if (canPlay() && (contexts.length === 0 || !confirmedPlaying)) start();
    },
    destroy() {
      if (duckTimer !== null) cancel(duckTimer);
      duckTimer = null;
      destroyContexts();
    },
    getState() { return { mode: desiredMode, enabled, volumeStep, hidden, activeIndex, contexts: contexts.length }; }
  };
}
