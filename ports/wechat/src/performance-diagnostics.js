// Opt-in application-side counters. No per-frame logs, uploads or unbounded history.
const STORAGE_KEY = 'thatbutton.wechat.performance.v1';
const SAMPLE_LIMIT = 256;
const SCENES = new Set(['loading', 'resource-error', 'home', 'help', 'settings',
  'upgrade', 'gameover', 'resume', 'game', 'game-entry', 'game-exit',
  'game-drift', 'game-swap', 'game-glitch']);
const COUNTERS = ['draws', 'fillText', 'ruleAtlasHit', 'ruleAtlasFallback',
  'numberAtlasHit', 'numberAtlasFallback', 'glitchRebuild', 'glitchReadback',
  'rafCallbacks', 'timerCallbacks', 'rafOver34ms', 'rafOver50ms', 'rafOver100ms'];

function series() { return { count: 0, sum: 0, max: 0, samples: [] }; }
function record(target, value) {
  if (!Number.isFinite(value) || value < 0) return;
  target.samples[target.count % SAMPLE_LIMIT] = value;
  target.count++;
  target.sum += value;
  target.max = Math.max(target.max, value);
}
function summarize(target) {
  const sorted = [...target.samples].sort((a, b) => a - b);
  const percentile = (p) => sorted.length ? sorted[Math.ceil(sorted.length * p) - 1] : null;
  return { count: target.count, totalMs: target.sum, maxMs: target.max,
    meanMs: target.count ? target.sum / target.count : null,
    recentSampleCount: sorted.length, recentP50Ms: percentile(.5), recentP95Ms: percentile(.95) };
}

export function createDiagnosticClock(wxApi, { wallNow = Date.now, schedule = setTimeout,
  onChange = () => {} } = {}) {
  let read = wallNow;
  let source = 'Date.now (millisecond resolution)';
  try {
    const platform = wxApi.getPerformance?.();
    if (platform?.now) {
      const rawStart = platform.now(), wallStart = wallNow();
      // WeChat hosts can expose microseconds or milliseconds. Measure the unit
      // without blocking, guessing from platform names, or changing the game clock.
      const timer = schedule(() => {
        try {
          const rawEnd = platform.now(), wallEnd = wallNow();
          const elapsed = wallEnd - wallStart;
          if (elapsed < 100) return;
          const scale = (rawEnd - rawStart) / elapsed;
          const divisor = scale > .8 && scale < 1.2 ? 1 :
            scale > 800 && scale < 1200 ? 1000 : null;
          if (!divisor) return;
          read = () => {
            try {
              const value = platform.now();
              return Number.isFinite(value) ? wallEnd + (value - rawEnd) / divisor : wallNow();
            } catch { return wallNow(); }
          };
          source = `wx.getPerformance.now / ${divisor} (unit checked against wall clock)`;
          onChange();
        } catch {}
      }, 200);
      timer?.unref?.();
    }
  } catch {}
  return { now: () => read(), source: () => source };
}

export function createPerformanceDiagnostics(wxApi, { enabled = false, now, clockSource,
  metadata = {} } = {}) {
  if (!enabled) return null;
  const startedAt = Date.now();
  const scenes = new Map();
  let active = true, previousRaf = null, previousScene = null;
  let currentScene = 'loading';
  let persistenceError = null;
  const diagnosticClock = !now ? createDiagnosticClock(wxApi, {
    onChange() { previousRaf = null; previousScene = null; }
  }) : null;
  now ||= diagnosticClock.now;
  function bucket(scene = currentScene) {
    const key = SCENES.has(scene) ? scene : 'game';
    if (!scenes.has(key)) scenes.set(key, {
      counters: Object.fromEntries(COUNTERS.map((name) => [name, 0])),
      rafInterval: series(), drawSubmit: series()
    });
    return scenes.get(key);
  }
  function snapshot() {
    return { schemaVersion: 1, startedAt, exportedAt: Date.now(),
      clockSource: diagnosticClock?.source() || clockSource,
      metadata: { ...metadata },
      semantics: 'Foreground RAF callback intervals and synchronous application draw/submit time; not GPU presentation FPS or CPU utilization. Percentiles use the latest 256 samples per scene.',
      unavailable: { gpuPresentationFps: null, cpuPercent: null, temperatureCelsius: null,
        gpuTimeMs: null, memoryBytes: null },
      limits: { scenes: SCENES.size, samplesPerSeries: SAMPLE_LIMIT, savedReports: 3 },
      persistenceError,
      scenes: Object.fromEntries([...scenes].map(([name, data]) => [name, {
        ...data.counters, rafInterval: summarize(data.rafInterval),
        drawSubmit: summarize(data.drawSubmit)
      }])) };
  }
  function save() {
    try {
      const stored = wxApi.getStorageSync?.(STORAGE_KEY);
      // Replace this session's previous snapshot; retain at most two earlier sessions.
      const history = Array.isArray(stored) ? stored.slice(-3).filter((r) =>
        r?.schemaVersion === 1 && r.startedAt !== startedAt &&
        JSON.stringify(r).length <= 24000).slice(-2) : [];
      persistenceError = null;
      wxApi.setStorageSync?.(STORAGE_KEY, [...history, snapshot()]);
    } catch { persistenceError = 'local storage failed'; }
  }
  return {
    metadata,
    now,
    setScene(scene) { currentScene = scene; },
    count(name, amount = 1) {
      if (active && COUNTERS.includes(name)) bucket().counters[name] += amount;
    },
    beginDraw(scene) { currentScene = scene; return now(); },
    endDraw(start) {
      if (!active) return;
      const data = bucket();
      data.counters.draws++;
      record(data.drawSubmit, now() - start);
    },
    frame(scene, isRaf = true) {
      if (!active) return;
      currentScene = scene;
      const time = now(), data = bucket();
      data.counters[isRaf ? 'rafCallbacks' : 'timerCallbacks']++;
      if (isRaf && previousRaf !== null && previousScene === scene) {
        const interval = time - previousRaf;
        record(data.rafInterval, interval);
        if (interval > 34) data.counters.rafOver34ms++;
        if (interval > 50) data.counters.rafOver50ms++;
        if (interval > 100) data.counters.rafOver100ms++;
      }
      previousRaf = isRaf ? time : null;
      previousScene = scene;
    },
    resetFrame() { previousRaf = null; previousScene = null; },
    setActive(value) { active = Boolean(value); previousRaf = null; previousScene = null; },
    snapshot, save,
    exportReport() {
      save();
      const report = JSON.stringify(snapshot(), null, 2);
      if (typeof wxApi.setClipboardData === 'function') {
        wxApi.setClipboardData({ data: report,
          fail: () => wxApi.showToast?.({ title: '复制失败，请重试', icon: 'none' }) });
      } else wxApi.showToast?.({ title: '此环境不支持复制报告', icon: 'none' });
      return report;
    }
  };
}
