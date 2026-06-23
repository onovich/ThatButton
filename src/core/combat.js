import { PROTOTYPE_BOSS_CONFIG } from '../config/combat.js';

function normalizeHp(value, maxHp) {
  const hp = Math.max(0, Math.floor(Number(value) || 0));
  return Math.min(maxHp, hp);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createCombatState(config = PROTOTYPE_BOSS_CONFIG) {
  const maxHp = Math.max(1, Math.floor(Number(config.maxHp) || 1));
  return {
    bossId: config.id,
    bossName: config.name,
    hp: maxHp,
    maxHp,
    status: 'active',
    totalDamage: 0,
    roundsCleared: 0,
    lastDamage: null,
    defeatedAtLevel: null
  };
}

export function cloneCombatState(combat = createCombatState()) {
  const maxHp = Math.max(1, Math.floor(Number(combat.maxHp) || PROTOTYPE_BOSS_CONFIG.maxHp));
  return {
    bossId: combat.bossId || PROTOTYPE_BOSS_CONFIG.id,
    bossName: combat.bossName || PROTOTYPE_BOSS_CONFIG.name,
    hp: normalizeHp(combat.hp, maxHp),
    maxHp,
    status: combat.status === 'defeated' ? 'defeated' : 'active',
    totalDamage: Math.max(0, Math.floor(Number(combat.totalDamage) || 0)),
    roundsCleared: Math.max(0, Math.floor(Number(combat.roundsCleared) || 0)),
    lastDamage: combat.lastDamage ? { ...combat.lastDamage } : null,
    defeatedAtLevel: combat.defeatedAtLevel === null ? null : Math.max(1, Math.floor(Number(combat.defeatedAtLevel) || 1))
  };
}

export function calculateRoundDamage({
  timeLeftMs = 0,
  comboState = null,
  config = PROTOTYPE_BOSS_CONFIG
} = {}) {
  const timeBonus = clamp(
    Math.floor(Math.max(0, Number(timeLeftMs) || 0) / config.timeBonusDivisorMs),
    0,
    config.maxTimeBonus
  );
  const comboBonus = Math.max(0, Math.floor(Number(comboState?.damageBonus) || 0));
  const baseDamage = Math.max(0, Math.floor(Number(config.baseRoundDamage) || 0));
  return {
    baseDamage,
    timeBonus,
    comboBonus,
    totalDamage: baseDamage + timeBonus + comboBonus
  };
}

export function applyRoundClearDamage(combat = createCombatState(), {
  level = 1,
  timeLeftMs = 0,
  comboState = null,
  config = PROTOTYPE_BOSS_CONFIG
} = {}) {
  const previous = cloneCombatState(combat);
  const damage = calculateRoundDamage({ timeLeftMs, comboState, config });
  const hpBefore = previous.hp;
  const appliedDamage = previous.status === 'defeated' ? 0 : Math.min(hpBefore, damage.totalDamage);
  const hpAfter = Math.max(0, hpBefore - appliedDamage);
  const defeated = hpAfter <= 0;
  const damageResult = {
    bossId: previous.bossId,
    bossName: previous.bossName,
    level: Math.max(1, Math.floor(Number(level) || 1)),
    hpBefore,
    hpAfter,
    baseDamage: damage.baseDamage,
    timeBonus: damage.timeBonus,
    comboBonus: damage.comboBonus,
    totalDamage: damage.totalDamage,
    appliedDamage,
    defeated
  };

  return {
    previous,
    damage: damageResult,
    defeated,
    combat: {
      ...previous,
      hp: hpAfter,
      status: defeated ? 'defeated' : previous.status,
      totalDamage: previous.totalDamage + appliedDamage,
      roundsCleared: previous.roundsCleared + (previous.status === 'defeated' ? 0 : 1),
      lastDamage: damageResult,
      defeatedAtLevel: defeated ? damageResult.level : previous.defeatedAtLevel
    }
  };
}

export function getCombatSummary(combat = createCombatState()) {
  const summary = cloneCombatState(combat);
  return {
    ...summary,
    hpPercent: Math.round((summary.hp / summary.maxHp) * 100)
  };
}
