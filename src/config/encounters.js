export const ENCOUNTER_IDENTITIES = Object.freeze([
  Object.freeze({
    minEnemyIndex: 1,
    name: 'REACTOR WARDEN',
    stageLabel: 'S01 CORE LOCK',
    tierLabel: 'ONBOARDING',
    avatarGlyph: '01'
  }),
  Object.freeze({
    minEnemyIndex: 2,
    name: 'SIGNAL WARDEN',
    stageLabel: 'S02 DRIFT ARRAY',
    tierLabel: 'MOVEMENT',
    avatarGlyph: '02'
  }),
  Object.freeze({
    minEnemyIndex: 3,
    name: 'CIPHER WARDEN',
    stageLabel: 'S03 NOISE GATE',
    tierLabel: 'INTERFERENCE',
    avatarGlyph: '03'
  }),
  Object.freeze({
    minEnemyIndex: 4,
    name: 'NULL WARDEN',
    stageLabel: 'S04 BLACK BOX',
    tierLabel: 'DEEP LOOP',
    avatarGlyph: '04'
  })
]);

function normalizeEnemyIndex(value) {
  return Math.max(1, Math.floor(Number(value) || 1));
}

function padEnemyIndex(enemyIndex) {
  return String(normalizeEnemyIndex(enemyIndex)).padStart(2, '0');
}

export function getEncounterIdentity(enemyIndex = 1) {
  const index = normalizeEnemyIndex(enemyIndex);
  const matchingIdentities = ENCOUNTER_IDENTITIES.filter((entry) => index >= entry.minEnemyIndex);
  const identity = matchingIdentities[matchingIdentities.length - 1] || ENCOUNTER_IDENTITIES[0];
  const deepLoopOffset = Math.max(0, index - ENCOUNTER_IDENTITIES.length);
  const repeatedStageNumber = identity.minEnemyIndex + deepLoopOffset;
  const sequenceLabel = `E${padEnemyIndex(index)}`;
  const stageLabel = index > ENCOUNTER_IDENTITIES.length
    ? `S${padEnemyIndex(repeatedStageNumber)} DEEP LOOP`
    : identity.stageLabel;
  return {
    enemyIndex: index,
    identityKey: identity.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    enemyName: identity.name,
    stageLabel,
    tierLabel: identity.tierLabel,
    avatarGlyph: index > ENCOUNTER_IDENTITIES.length ? padEnemyIndex(index) : identity.avatarGlyph,
    sequenceLabel
  };
}
