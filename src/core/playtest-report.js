import { cloneJsonSafeValue, isJsonSafeValue } from './host-events.js';

export const PLAYTEST_REPORT_VERSION = 1;
export const PLAYTEST_REPORT_KIND = 'thatbutton.playtestReport';

export const DEFAULT_PLAYTEST_BUILD = Object.freeze({
  app: 'ThatButton',
  version: '0.1.0',
  phase: 'Phase 9',
  schemaVersion: PLAYTEST_REPORT_VERSION
});

const PRIVACY_GUARD = Object.freeze({
  localOnly: true,
  personalData: false,
  networkSubmission: false
});

const FORBIDDEN_REPORT_KEYS = Object.freeze([
  'accountId',
  'cookie',
  'cookies',
  'deviceId',
  'email',
  'geo',
  'geolocation',
  'ip',
  'ipAddress',
  'latitude',
  'longitude',
  'name',
  'phone',
  'trackingId',
  'userAgent',
  'userId',
  'username'
]);

function normalizeText(value, fallback = null) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

function normalizeInteger(value, fallback = 0) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? number : fallback;
}

function normalizeNonNegative(value, fallback = 0) {
  return Math.max(0, normalizeInteger(value, fallback));
}

function normalizeLevel(value, fallback = 1) {
  return Math.max(1, normalizeInteger(value, fallback));
}

function normalizeResult(value) {
  const normalized = normalizeText(value, 'unknown');
  return ['failure', 'victory', 'reset', 'unknown'].includes(normalized)
    ? normalized
    : 'unknown';
}

function normalizeReason(value) {
  const normalized = normalizeText(value, 'unknown');
  return [
    'timeout',
    'wrong_click',
    'player_defeated',
    'manual_reset',
    'run_reset',
    'victory',
    'unknown'
  ].includes(normalized)
    ? normalized
    : 'unknown';
}

export function classifyViewport({ width = 0, height = 0 } = {}) {
  const normalizedWidth = normalizeNonNegative(width);
  const normalizedHeight = normalizeNonNegative(height);
  if (!normalizedWidth || !normalizedHeight) return 'unknown';
  if (normalizedWidth <= 420 && normalizedHeight <= 760) return 'short-mobile';
  if (normalizedWidth <= 520 || normalizedHeight <= 520) return 'mobile';
  return 'desktop';
}

function normalizeViewportClass(value, viewport = null) {
  const normalized = normalizeText(value, '');
  if (['desktop', 'mobile', 'short-mobile', 'unknown'].includes(normalized)) {
    return normalized;
  }
  return viewport ? classifyViewport(viewport) : 'unknown';
}

function normalizeInputMode(value) {
  const normalized = normalizeText(value, 'unknown');
  return ['pointer', 'touch', 'mouse', 'keyboard', 'host', 'mixed', 'unknown'].includes(normalized)
    ? normalized
    : 'unknown';
}

function normalizeBuildFacts(build = {}) {
  return cloneJsonSafeValue({
    app: normalizeText(build.app, DEFAULT_PLAYTEST_BUILD.app),
    version: normalizeText(build.version, DEFAULT_PLAYTEST_BUILD.version),
    phase: normalizeText(build.phase, DEFAULT_PLAYTEST_BUILD.phase),
    schemaVersion: PLAYTEST_REPORT_VERSION
  }, 'playtest report build');
}

function normalizeEnemyFacts(enemy = null) {
  if (!enemy) return null;
  return cloneJsonSafeValue({
    enemyIndex: normalizeLevel(enemy.enemyIndex),
    enemyName: normalizeText(enemy.enemyName || enemy.bossName, 'UNKNOWN ENEMY'),
    stageLabel: normalizeText(enemy.stageLabel, 'STAGE --'),
    tierLabel: normalizeText(enemy.tierLabel, 'UNKNOWN'),
    hp: normalizeNonNegative(enemy.hp),
    maxHp: Math.max(1, normalizeInteger(enemy.maxHp, 1))
  }, 'playtest report enemy');
}

function normalizeUpgradeEntry(upgrade = {}) {
  return cloneJsonSafeValue({
    id: normalizeText(upgrade.id, 'unknown-upgrade'),
    type: normalizeText(upgrade.type, 'unknown'),
    label: normalizeText(upgrade.label, 'UNKNOWN UPGRADE'),
    shortLabel: normalizeText(upgrade.shortLabel, 'UPGRADE'),
    value: normalizeNonNegative(upgrade.value),
    enemyIndex: upgrade.enemyIndex === null || upgrade.enemyIndex === undefined
      ? null
      : normalizeLevel(upgrade.enemyIndex),
    sequence: upgrade.sequence === null || upgrade.sequence === undefined
      ? null
      : normalizeLevel(upgrade.sequence)
  }, 'playtest report upgrade');
}

function getRoundHazardTypes(round = {}, key) {
  const values = round.hazards?.[key] || round[key] || [];
  return Array.isArray(values)
    ? [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))]
    : [];
}

function normalizeRoundFacts(round = {}) {
  const level = normalizeLevel(round.level);
  return cloneJsonSafeValue({
    level,
    enemyIndex: normalizeLevel(round.enemyIndex),
    gridSize: normalizeText(round.gridSize || round.difficulty?.gridSize, 'unknown'),
    fatalCount: normalizeNonNegative(round.fatalCount),
    safeCount: normalizeNonNegative(round.safeCount),
    ruleTier: normalizeText(round.ruleTier, 'unknown'),
    timeLimitMs: normalizeNonNegative(round.timeLimitMs),
    timeLeftMs: normalizeNonNegative(round.timeLeftAfterMs ?? round.timeLeftMs),
    hazardTypes: getRoundHazardTypes(round, 'types'),
    activeHazardTypes: getRoundHazardTypes(round, 'activeTypes')
  }, 'playtest report round');
}

function normalizeRounds(rounds = []) {
  return Array.isArray(rounds) ? rounds.map(normalizeRoundFacts) : [];
}

function deriveHazardExposure(rounds) {
  const movingRounds = rounds.filter((round) => round.hazardTypes.includes('moving_button'));
  const interferenceRounds = rounds.filter((round) => round.hazardTypes.includes('interference'));
  const activeRounds = rounds.filter((round) => round.activeHazardTypes.length > 0);
  return {
    firstMovingLevel: movingRounds[0]?.level || null,
    firstInterferenceLevel: interferenceRounds[0]?.level || null,
    roundsWithMoving: movingRounds.length,
    roundsWithInterference: interferenceRounds.length,
    roundsWithActiveHazards: activeRounds.length
  };
}

function normalizeHazardExposure(hazards = {}, rounds = []) {
  const derived = deriveHazardExposure(rounds);
  return cloneJsonSafeValue({
    firstMovingLevel: hazards.firstMovingLevel ?? derived.firstMovingLevel,
    firstInterferenceLevel: hazards.firstInterferenceLevel ?? derived.firstInterferenceLevel,
    roundsWithMoving: normalizeNonNegative(hazards.roundsWithMoving, derived.roundsWithMoving),
    roundsWithInterference: normalizeNonNegative(hazards.roundsWithInterference, derived.roundsWithInterference),
    roundsWithActiveHazards: normalizeNonNegative(hazards.roundsWithActiveHazards, derived.roundsWithActiveHazards)
  }, 'playtest report hazards');
}

function getHighestEnemyIndex({ combat = {}, defeatedEnemies = [], rounds = [] } = {}) {
  const values = [
    combat?.enemyIndex,
    ...defeatedEnemies.map((enemy) => enemy.enemyIndex),
    ...rounds.map((round) => round.enemyIndex)
  ].map((value) => normalizeNonNegative(value)).filter(Boolean);
  return values.length ? Math.max(...values) : 1;
}

function hasForbiddenPrivacyKey(value, path = []) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) {
    return value.some((entry, index) => hasForbiddenPrivacyKey(entry, [...path, String(index)]));
  }
  return Object.entries(value).some(([key, entry]) => {
    if (FORBIDDEN_REPORT_KEYS.includes(key)) return true;
    return hasForbiddenPrivacyKey(entry, [...path, key]);
  });
}

export function isPrivacySafePlaytestReport(report) {
  return Boolean(
    report &&
    report.kind === PLAYTEST_REPORT_KIND &&
    report.version === PLAYTEST_REPORT_VERSION &&
    report.privacy?.localOnly === true &&
    report.privacy?.personalData === false &&
    report.privacy?.networkSubmission === false &&
    isJsonSafeValue(report) &&
    !hasForbiddenPrivacyKey(report)
  );
}

export function buildPlaytestReport(input = {}) {
  const runInput = input.run || {};
  const progressionInput = input.progression || {};
  const combatInput = input.combatReport || input.combatMetrics || {};
  const combatState = input.combat || progressionInput.finalEnemy || null;
  const comboState = input.combo || {};
  const upgradeInput = input.upgradesReport || {};
  const upgradeState = input.upgrades || {};
  const rounds = normalizeRounds(input.rounds || progressionInput.rounds);
  const defeatedEnemies = Array.isArray(progressionInput.defeatedEnemies)
    ? progressionInput.defeatedEnemies
    : (Array.isArray(input.defeatedEnemies) ? input.defeatedEnemies : []);
  const selectedUpgrades = Array.isArray(upgradeInput.selected)
    ? upgradeInput.selected
    : (Array.isArray(upgradeState.applied) ? upgradeState.applied : []);
  const highestEnemyIndex = getHighestEnemyIndex({
    combat: combatState,
    defeatedEnemies,
    rounds
  });
  const report = {
    version: PLAYTEST_REPORT_VERSION,
    kind: PLAYTEST_REPORT_KIND,
    createdAt: normalizeText(input.createdAt, null),
    privacy: { ...PRIVACY_GUARD },
    build: normalizeBuildFacts(input.build),
    run: {
      seed: normalizeText(runInput.seed ?? input.seed, null),
      result: normalizeResult(runInput.result ?? input.recap?.result),
      reason: normalizeReason(runInput.reason ?? input.recap?.failureReason),
      level: normalizeLevel(runInput.level ?? input.recap?.level),
      score: normalizeNonNegative(runInput.score ?? input.recap?.score),
      elapsedMs: normalizeNonNegative(runInput.elapsedMs),
      viewportClass: normalizeViewportClass(runInput.viewportClass, runInput.viewport),
      inputMode: normalizeInputMode(runInput.inputMode)
    },
    progression: {
      firstThreeByThreeLevel: progressionInput.firstThreeByThreeLevel ??
        rounds.find((round) => round.gridSize === '3x3')?.level ??
        null,
      enemiesReached: normalizeLevel(progressionInput.enemiesReached, highestEnemyIndex),
      enemiesDefeated: normalizeNonNegative(progressionInput.enemiesDefeated, defeatedEnemies.length),
      highestEnemyIndex,
      finalEnemy: normalizeEnemyFacts(progressionInput.finalEnemy || combatState)
    },
    combat: {
      maxCombo: normalizeNonNegative(combatInput.maxCombo ?? comboState.streak),
      visibleComboPeak: normalizeNonNegative(combatInput.visibleComboPeak ?? (comboState.hasVisibleCombo ? comboState.streak : 0)),
      wrongPresses: normalizeNonNegative(combatInput.wrongPresses),
      playerDamageTaken: normalizeNonNegative(combatInput.playerDamageTaken),
      safePresses: normalizeNonNegative(combatInput.safePresses)
    },
    upgrades: {
      offeredCount: normalizeNonNegative(upgradeInput.offeredCount),
      selectedCount: normalizeNonNegative(upgradeInput.selectedCount, selectedUpgrades.length),
      selected: selectedUpgrades.map(normalizeUpgradeEntry)
    },
    hazards: normalizeHazardExposure(input.hazardsReport || input.hazards || {}, rounds),
    rounds
  };
  const clonedReport = cloneJsonSafeValue(report, 'playtest report');
  if (!isPrivacySafePlaytestReport(clonedReport)) {
    throw new TypeError('Playtest report failed privacy or JSON-safety checks.');
  }
  return clonedReport;
}

export function formatPlaytestReportSummary(report) {
  const safeReport = cloneJsonSafeValue(report, 'playtest report summary');
  return [
    'THATBUTTON PLAYTEST REPORT',
    `schema: v${safeReport.version}`,
    'privacy: local-only / no personal data / no network submission',
    `run: ${safeReport.run.result} / ${safeReport.run.reason} / seed ${safeReport.run.seed || 'unseeded'}`,
    `progress: L${safeReport.run.level} / ${safeReport.run.score} pts / enemies ${safeReport.progression.enemiesDefeated}/${safeReport.progression.enemiesReached}`,
    `combat: max combo ${safeReport.combat.maxCombo} / wrong ${safeReport.combat.wrongPresses} / safe ${safeReport.combat.safePresses}`,
    `hazards: moving L${safeReport.hazards.firstMovingLevel || '--'} / interference L${safeReport.hazards.firstInterferenceLevel || '--'}`
  ].join('\n');
}

export function serializePlaytestReport(report) {
  return JSON.stringify(cloneJsonSafeValue(report, 'playtest report JSON'), null, 2);
}

export function buildPlaytestReportExport(report) {
  const safeReport = cloneJsonSafeValue(report, 'playtest report export');
  return `${formatPlaytestReportSummary(safeReport)}\n\nJSON\n${serializePlaytestReport(safeReport)}`;
}

export function createPlaytestReportFixture(overrides = {}) {
  return buildPlaytestReport({
    createdAt: '2026-06-24T00:00:00.000Z',
    seed: 'phase9-fixture',
    build: DEFAULT_PLAYTEST_BUILD,
    run: {
      result: 'failure',
      reason: 'wrong_click',
      level: 24,
      score: 1420,
      elapsedMs: 184000,
      viewportClass: 'mobile',
      inputMode: 'touch',
      ...overrides.run
    },
    progression: {
      firstThreeByThreeLevel: 6,
      enemiesReached: 2,
      enemiesDefeated: 1,
      finalEnemy: {
        enemyIndex: 2,
        enemyName: 'SIGNAL WARDEN',
        stageLabel: 'S02 DRIFT ARRAY',
        tierLabel: 'MOVEMENT',
        hp: 328,
        maxHp: 580
      },
      defeatedEnemies: [
        {
          enemyIndex: 1,
          enemyName: 'REACTOR WARDEN',
          stageLabel: 'S01 CORE LOCK',
          tierLabel: 'ONBOARDING'
        }
      ],
      ...overrides.progression
    },
    combatReport: {
      maxCombo: 8,
      visibleComboPeak: 8,
      wrongPresses: 1,
      playerDamageTaken: 24,
      safePresses: 126,
      ...overrides.combatReport
    },
    upgradesReport: {
      offeredCount: 1,
      selectedCount: 1,
      selected: [
        {
          id: 'round-time-plus',
          type: 'round_time',
          label: 'SLOW CLOCK',
          shortLabel: 'TIME',
          value: 700,
          enemyIndex: 1,
          sequence: 1
        }
      ],
      ...overrides.upgradesReport
    },
    rounds: [
      {
        level: 6,
        enemyIndex: 1,
        gridSize: '3x3',
        fatalCount: 2,
        safeCount: 7,
        ruleTier: 'singleVisual',
        timeLimitMs: 15500,
        timeLeftAfterMs: 14400,
        hazards: { types: [], activeTypes: [] }
      },
      {
        level: 19,
        enemyIndex: 2,
        gridSize: '3x3',
        fatalCount: 4,
        safeCount: 5,
        ruleTier: 'orMixed',
        timeLimitMs: 11250,
        timeLeftAfterMs: 10100,
        hazards: { types: ['moving_button'], activeTypes: ['moving_button'] }
      },
      {
        level: 24,
        enemyIndex: 2,
        gridSize: '3x3',
        fatalCount: 4,
        safeCount: 5,
        ruleTier: 'orColor',
        timeLimitMs: 10000,
        timeLeftAfterMs: 8800,
        hazards: { types: ['moving_button', 'interference'], activeTypes: ['interference'] }
      }
    ],
    ...overrides
  });
}
