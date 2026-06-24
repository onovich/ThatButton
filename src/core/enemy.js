import { BASE_BATTLE_CONFIG } from '../config/battle.js';

function normalizeEnemyIndex(value) {
  return Math.max(1, Math.floor(Number(value) || 1));
}

function normalizeHp(value, maxHp) {
  const hp = Math.max(0, Math.floor(Number(value) || 0));
  return Math.min(maxHp, hp);
}

export function calculateEnemyMaxHp(enemyIndex = 1, config = BASE_BATTLE_CONFIG) {
  const index = normalizeEnemyIndex(enemyIndex);
  return Math.max(1, Math.floor(
    config.enemyBaseHp + ((index - 1) * config.enemyHpPerIndex)
  ));
}

export function calculateEnemyAttack(enemyIndex = 1, config = BASE_BATTLE_CONFIG) {
  const index = normalizeEnemyIndex(enemyIndex);
  return Math.max(0, Math.floor(
    config.enemyBaseAttack + ((index - 1) * config.enemyAttackPerIndex)
  ));
}

export function createEnemyState({
  enemyIndex = 1,
  hp = null,
  maxHp = null,
  attack = null,
  status = 'active',
  totalDamage = 0,
  lastDamage = null,
  defeatedAtLevel = null
} = {}) {
  const index = normalizeEnemyIndex(enemyIndex);
  const normalizedMaxHp = Math.max(1, Math.floor(Number(maxHp) || calculateEnemyMaxHp(index)));
  const normalizedHp = normalizeHp(hp === null ? normalizedMaxHp : hp, normalizedMaxHp);
  const normalizedAttack = Math.max(0, Math.floor(Number(attack) || calculateEnemyAttack(index)));
  const romanSuffix = index === 1 ? '' : ` ${index}`;
  return {
    enemyIndex: index,
    enemyId: `reactor-warden-${index}`,
    enemyName: `REACTOR WARDEN${romanSuffix}`,
    hp: normalizedHp,
    maxHp: normalizedMaxHp,
    attack: normalizedAttack,
    status: normalizedHp <= 0 || status === 'defeated' ? 'defeated' : 'active',
    totalDamage: Math.max(0, Math.floor(Number(totalDamage) || 0)),
    lastDamage: lastDamage ? { ...lastDamage } : null,
    defeatedAtLevel: defeatedAtLevel === null ? null : Math.max(1, Math.floor(Number(defeatedAtLevel) || 1))
  };
}

export function cloneEnemyState(enemy = createEnemyState()) {
  return createEnemyState(enemy);
}

export function applyEnemyDamage(enemy = createEnemyState(), {
  amount = 0,
  level = 1,
  source = 'round_clear'
} = {}) {
  const previous = cloneEnemyState(enemy);
  const totalDamage = Math.max(0, Math.floor(Number(amount) || 0));
  const hpBefore = previous.hp;
  const appliedDamage = previous.status === 'defeated' ? 0 : Math.min(hpBefore, totalDamage);
  const hpAfter = Math.max(0, hpBefore - appliedDamage);
  const defeated = hpAfter <= 0;
  const damage = {
    source,
    enemyIndex: previous.enemyIndex,
    enemyId: previous.enemyId,
    enemyName: previous.enemyName,
    level: Math.max(1, Math.floor(Number(level) || 1)),
    hpBefore,
    hpAfter,
    totalDamage,
    appliedDamage,
    defeated
  };

  return {
    previous,
    damage,
    defeated,
    enemy: {
      ...previous,
      hp: hpAfter,
      status: defeated ? 'defeated' : previous.status,
      totalDamage: previous.totalDamage + appliedDamage,
      lastDamage: damage,
      defeatedAtLevel: defeated ? damage.level : previous.defeatedAtLevel
    }
  };
}

export function createNextEnemyState(enemy = createEnemyState()) {
  return createEnemyState({
    enemyIndex: normalizeEnemyIndex(enemy.enemyIndex) + 1
  });
}

export function getEnemySummary(enemy = createEnemyState()) {
  const summary = cloneEnemyState(enemy);
  return {
    ...summary,
    hpPercent: Math.round((summary.hp / summary.maxHp) * 100)
  };
}
