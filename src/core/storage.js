export const BEST_RECORD_KEY = 'thatbutton.bestRun.v1';
export const BEST_RECORD_VERSION = 1;
export const DEFAULT_BEST_RECORD = Object.freeze({
  version: BEST_RECORD_VERSION,
  bestLevel: 1,
  bestScore: 0,
  updatedAt: null
});

export function cloneBestRecord(record = DEFAULT_BEST_RECORD) {
  return {
    version: BEST_RECORD_VERSION,
    bestLevel: Math.max(1, Math.floor(Number(record.bestLevel) || 1)),
    bestScore: Math.max(0, Math.floor(Number(record.bestScore) || 0)),
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : null
  };
}

export function normalizeBestRecord(value) {
  if (!value || value.version !== BEST_RECORD_VERSION) {
    return null;
  }
  const bestLevel = Number(value.bestLevel);
  const bestScore = Number(value.bestScore);
  if (!Number.isFinite(bestLevel) || !Number.isFinite(bestScore)) {
    return null;
  }
  return cloneBestRecord({
    bestLevel,
    bestScore,
    updatedAt: value.updatedAt
  });
}

export function loadBestRecord(storage) {
  if (!storage) {
    return { record: cloneBestRecord(), status: 'unavailable' };
  }
  try {
    const raw = storage.getItem(BEST_RECORD_KEY);
    if (!raw) {
      return { record: cloneBestRecord(), status: 'empty' };
    }
    const parsed = JSON.parse(raw);
    const normalized = normalizeBestRecord(parsed);
    if (!normalized) {
      return { record: cloneBestRecord(), status: 'corrupt' };
    }
    return { record: normalized, status: 'loaded' };
  } catch (error) {
    return { record: cloneBestRecord(), status: 'corrupt' };
  }
}

export function saveBestRecord(storage, record) {
  const normalized = cloneBestRecord(record);
  if (!storage) {
    return { record: normalized, status: 'unavailable' };
  }
  try {
    storage.setItem(BEST_RECORD_KEY, JSON.stringify(normalized));
    return { record: normalized, status: 'saved' };
  } catch (error) {
    return { record: normalized, status: 'unavailable' };
  }
}

export function resetBestRecord(storage) {
  if (storage) {
    storage.removeItem(BEST_RECORD_KEY);
  }
  return {
    record: cloneBestRecord(),
    status: storage ? 'empty' : 'unavailable'
  };
}

export function compareRunToBest(runLevel, runScore, bestRecord) {
  const level = Math.max(1, Math.floor(Number(runLevel) || 1));
  const score = Math.max(0, Math.floor(Number(runScore) || 0));
  const best = cloneBestRecord(bestRecord);
  if (level > best.bestLevel || (level === best.bestLevel && score > best.bestScore)) {
    return 'new_best';
  }
  if (level === best.bestLevel && score === best.bestScore) {
    return 'matched_best';
  }
  return 'below_best';
}

export function buildBestRecordFromRun(runLevel, runScore, timestamp = new Date().toISOString()) {
  return cloneBestRecord({
    bestLevel: runLevel,
    bestScore: runScore,
    updatedAt: timestamp
  });
}

export function getBestRecordStatusNote(status) {
  if (status === 'corrupt') return 'RESET';
  if (status === 'unavailable') return 'LOCAL OFF';
  return '';
}

export function getRunComparisonNote(comparison) {
  if (comparison === 'new_best') return 'NEW BEST';
  if (comparison === 'matched_best') return 'MATCHED BEST';
  return '';
}
