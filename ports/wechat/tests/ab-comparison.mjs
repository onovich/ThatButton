import assert from 'node:assert/strict';
import { createComparisonExport } from '../src/ab-comparison.js';
import { createPerformanceDiagnostics } from '../src/performance-diagnostics.js';

const report = (group, order, seriesId = 'test') => ({
  schemaVersion: 1, sessionId: `id-${order}`, metadata: { buildId: 'build-one',
    comparison: { seriesId, group, order, seed: 'same-seed' } },
  scenes: { game: { draws: 10, fillText: group === 'A' ? 120 : 40,
    drawSubmit: { meanMs: 3, recentP95Ms: 5, recentSampleCount: 10 },
    rafInterval: { count: 20 }, rafOver50ms: 2, ruleAtlasHit: group === 'B' ? 80 : 0 },
  home: { draws: 0, fillText: 0, rafInterval: { count: 0 } } }
});
const reports = [report('A', 1), report('B', 2), report('B', 3), report('A', 4)];
const bundle = createComparisonExport(reports, 'test');
assert.equal(bundle.reports.length, 4);
assert.equal(bundle.hasBothGroups, true);
assert.equal(bundle.sameBuildAndSeed, true);
assert.equal(bundle.rows[0].fillTextPerDraw, 12);
assert.equal(bundle.rows[0].rafOver50Percent, 10);
assert.equal(bundle.rows[1].fillTextPerDraw, null);
assert.equal(bundle.rows[1].rafOver50Percent, null);
assert.equal(bundle.rows[2].fillTextPerDraw, 4);
assert.deepEqual(createComparisonExport([report('A', 1, 'old')], 'test').reports, []);
assert.equal(createComparisonExport(null, 'test').hasBothGroups, false);
assert.equal(createComparisonExport([reports[0]], 'test').hasBothGroups, false);
const mismatched = structuredClone(reports);
mismatched[1].metadata.buildId = 'other-build';
assert.equal(createComparisonExport(mismatched, 'test').sameBuildAndSeed, false);
mismatched[1].metadata.buildId = 'build-one';
mismatched[1].metadata.comparison.seed = 'other-seed';
assert.equal(createComparisonExport(mismatched, 'test').sameBuildAndSeed, false);

// Rapid toggles in a single millisecond must not overwrite distinct test runs.
let stored;
const wxApi = { getStorageSync: () => stored, setStorageSync: (_key, value) => { stored = value; } };
const originalNow = Date.now;
Date.now = () => 100000;
try {
  for (let i = 0; i < 6; i++) {
    const diagnostics = createPerformanceDiagnostics(wxApi, { enabled: true, now: () => 0,
      metadata: { comparison: { group: i % 2 ? 'B' : 'A', order: i } } });
    diagnostics.save(); diagnostics.save(); diagnostics.dispose();
  }
  assert.equal(stored.length, 4);
  assert.equal(new Set(stored.map((r) => r.sessionId)).size, 4);
  assert.deepEqual(stored.map((r) => r.metadata.comparison.order), [2, 3, 4, 5]);
} finally { Date.now = originalNow; }
console.log('A/B report grouping, normalized metrics, build/seed checks and four-run bounds passed.');
