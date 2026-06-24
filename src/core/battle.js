import { BASE_BATTLE_CONFIG } from '../config/battle.js';
import { applyPlayerDamage, createPlayerState } from './player.js';

export function calculateWrongPressDamage({
  enemyAttack = BASE_BATTLE_CONFIG.wrongPressDamage
} = {}) {
  return Math.max(0, Math.floor(Number(enemyAttack) || 0));
}

export function resolveWrongPressDamage({
  player = createPlayerState(),
  enemyAttack = BASE_BATTLE_CONFIG.wrongPressDamage,
  level = 1,
  buttonId = null
} = {}) {
  const damageAmount = calculateWrongPressDamage({ enemyAttack });
  return applyPlayerDamage(player, {
    amount: damageAmount,
    source: 'wrong_press',
    level,
    enemyAttack,
    buttonId
  });
}

export function calculatePlayerAttackDamage({
  baseAttack = BASE_BATTLE_CONFIG.baseAttackDamage,
  combo = null
} = {}) {
  const baseDamage = Math.max(0, Math.floor(Number(baseAttack) || 0));
  const comboBonus = Math.max(0, Math.floor(Number(combo?.damageBonus) || 0));
  return {
    baseDamage,
    comboBonus,
    totalDamage: baseDamage + comboBonus
  };
}
