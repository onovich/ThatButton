import { BASE_BATTLE_CONFIG } from '../config/battle.js';

function normalizeMaxHp(value) {
  return Math.max(1, Math.floor(Number(value) || BASE_BATTLE_CONFIG.playerMaxHp));
}

function normalizeHp(value, maxHp) {
  const hp = Math.max(0, Math.floor(Number(value) || 0));
  return Math.min(maxHp, hp);
}

export function createPlayerState({
  maxHp = BASE_BATTLE_CONFIG.playerMaxHp,
  hp = maxHp,
  status = 'active',
  totalDamageTaken = 0,
  lastDamage = null
} = {}) {
  const normalizedMaxHp = normalizeMaxHp(maxHp);
  const normalizedHp = normalizeHp(hp, normalizedMaxHp);
  return {
    hp: normalizedHp,
    maxHp: normalizedMaxHp,
    status: normalizedHp <= 0 || status === 'defeated' ? 'defeated' : 'active',
    totalDamageTaken: Math.max(0, Math.floor(Number(totalDamageTaken) || 0)),
    lastDamage: lastDamage ? { ...lastDamage } : null
  };
}

export function clonePlayerState(player = createPlayerState()) {
  return createPlayerState(player);
}

export function applyPlayerDamage(player = createPlayerState(), {
  amount = 0,
  source = 'enemy_attack',
  level = 1,
  enemyAttack = amount,
  buttonId = null
} = {}) {
  const previous = clonePlayerState(player);
  const requestedDamage = Math.max(0, Math.floor(Number(amount) || 0));
  const hpBefore = previous.hp;
  const appliedDamage = previous.status === 'defeated' ? 0 : Math.min(hpBefore, requestedDamage);
  const hpAfter = Math.max(0, hpBefore - appliedDamage);
  const defeated = hpAfter <= 0;
  const damage = {
    source,
    level: Math.max(1, Math.floor(Number(level) || 1)),
    buttonId,
    enemyAttack: Math.max(0, Math.floor(Number(enemyAttack) || requestedDamage)),
    hpBefore,
    hpAfter,
    requestedDamage,
    appliedDamage,
    defeated
  };

  return {
    previous,
    damage,
    defeated,
    player: {
      ...previous,
      hp: hpAfter,
      status: defeated ? 'defeated' : previous.status,
      totalDamageTaken: previous.totalDamageTaken + appliedDamage,
      lastDamage: damage
    }
  };
}

export function applyMaxHpChange(player = createPlayerState(), {
  amount = 0,
  healByIncrease = true
} = {}) {
  const previous = clonePlayerState(player);
  const increase = Math.floor(Number(amount) || 0);
  const maxHp = Math.max(1, previous.maxHp + increase);
  const hp = healByIncrease && increase > 0
    ? Math.min(maxHp, previous.hp + increase)
    : Math.min(maxHp, previous.hp);
  return {
    previous,
    player: createPlayerState({
      ...previous,
      maxHp,
      hp
    })
  };
}

export function getPlayerSummary(player = createPlayerState()) {
  const summary = clonePlayerState(player);
  return {
    ...summary,
    hpPercent: Math.round((summary.hp / summary.maxHp) * 100)
  };
}
