import { PROTOTYPE_BOSS_CONFIG } from '../config/combat.js';
import { createEnemyState, getEnemySummary } from './enemy.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createCombatState(config = PROTOTYPE_BOSS_CONFIG) {
  const enemy = createEnemyState({
    enemyIndex: config.enemyIndex || 1,
    maxHp: config.maxHp,
    hp: config.hp,
    attack: config.attack
  });
  return {
    enemyIndex: enemy.enemyIndex,
    enemyId: enemy.enemyId,
    enemyName: enemy.enemyName,
    attack: enemy.attack,
    bossId: config.id || enemy.enemyId,
    bossName: config.name || enemy.enemyName,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    status: enemy.status,
    totalDamage: 0,
    roundsCleared: 0,
    lastDamage: null,
    defeatedAtLevel: null
  };
}

export function cloneCombatState(combat = createCombatState()) {
  const maxHp = Math.max(1, Math.floor(Number(combat.maxHp) || PROTOTYPE_BOSS_CONFIG.maxHp));
  const enemy = createEnemyState({
    enemyIndex: combat.enemyIndex || 1,
    hp: combat.hp,
    maxHp,
    attack: combat.attack,
    status: combat.status,
    totalDamage: combat.totalDamage,
    lastDamage: combat.lastDamage,
    defeatedAtLevel: combat.defeatedAtLevel
  });
  return {
    enemyIndex: enemy.enemyIndex,
    enemyId: enemy.enemyId,
    enemyName: enemy.enemyName,
    attack: enemy.attack,
    bossId: combat.bossId || enemy.enemyId,
    bossName: combat.bossName || enemy.enemyName,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    status: enemy.status,
    totalDamage: enemy.totalDamage,
    roundsCleared: Math.max(0, Math.floor(Number(combat.roundsCleared) || 0)),
    lastDamage: enemy.lastDamage,
    defeatedAtLevel: enemy.defeatedAtLevel
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
    enemyIndex: previous.enemyIndex,
    enemyId: previous.enemyId,
    enemyName: previous.enemyName,
    enemyAttack: previous.attack,
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
  const enemy = getEnemySummary(summary);
  return {
    ...summary,
    enemy,
    hpPercent: Math.round((summary.hp / summary.maxHp) * 100)
  };
}
