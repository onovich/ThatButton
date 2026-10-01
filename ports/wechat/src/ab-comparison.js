// Export only: never pool recent percentiles across different runs or scenes.
export function createComparisonExport(stored, seriesId) {
  const reports = (Array.isArray(stored) ? stored.slice(-4) : []).filter((report) =>
    report?.schemaVersion === 1 && report.metadata?.comparison?.seriesId === seriesId &&
    ['A', 'B'].includes(report.metadata.comparison.group) && JSON.stringify(report).length <= 24000
  ).sort((a, b) => a.metadata.comparison.order - b.metadata.comparison.order);
  const rows = [];
  for (const report of reports) for (const [scene, data] of Object.entries(report.scenes || {})) {
    const draws = data.draws || 0, intervals = data.rafInterval?.count || 0;
    rows.push({ sessionId: report.sessionId, group: report.metadata.comparison.group,
      order: report.metadata.comparison.order, scene, draws,
      drawMeanMs: data.drawSubmit?.meanMs ?? null,
      drawRecentP95Ms: data.drawSubmit?.recentP95Ms ?? null,
      recentDrawSamples: data.drawSubmit?.recentSampleCount || 0,
      fillTextPerDraw: draws ? data.fillText / draws : null,
      rafIntervals: intervals, rafOver50Percent: intervals ? data.rafOver50ms / intervals * 100 : null,
      ruleAtlasHit: data.ruleAtlasHit || 0, numberAtlasHit: data.numberAtlasHit || 0,
      atlasFallback: (data.ruleAtlasFallback || 0) + (data.numberAtlasFallback || 0) });
  }
  const buildIds = [...new Set(reports.map((r) => r.metadata.buildId))];
  const seeds = [...new Set(reports.map((r) => r.metadata.comparison.seed))];
  const groups = [...new Set(reports.map((r) => r.metadata.comparison.group))];
  return { schemaVersion: 1, type: 'thatbutton.prebuilt-text-ab', seriesId,
    scope: 'Prebuilt rule/number text only. Earlier paint batching, RAF and glitch optimizations remain enabled in A and B.',
    sameBuildAndSeed: reports.length > 0 && buildIds.length === 1 &&
      typeof buildIds[0] === 'string' && buildIds[0] !== 'source-preview' &&
      seeds.length === 1 && typeof seeds[0] === 'string',
    hasBothGroups: groups.includes('A') && groups.includes('B'),
    note: 'Compare matching scenes and level ranges. Recent P95 uses the latest 256 samples per run; no automatic winner. GPU FPS, CPU percentage and temperature unavailable.',
    rows, reports };
}
