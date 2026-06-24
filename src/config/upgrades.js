import { BASE_BATTLE_CONFIG } from './battle.js';

export const UPGRADE_TYPES = Object.freeze({
  COMBO_WINDOW: 'combo_window',
  MAX_HP: 'max_hp',
  ROUND_TIME: 'round_time',
  BASE_ATTACK: 'base_attack',
  COMBO_REWARD: 'combo_reward'
});

export const UPGRADE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'chain-span-plus',
    type: UPGRADE_TYPES.COMBO_WINDOW,
    label: 'WIDER CHAIN',
    shortLabel: '+WINDOW',
    value: BASE_BATTLE_CONFIG.comboWindowUpgradeMs
  }),
  Object.freeze({
    id: 'max-hp-plus',
    type: UPGRADE_TYPES.MAX_HP,
    label: 'ARMOR PATCH',
    shortLabel: '+HP',
    value: BASE_BATTLE_CONFIG.maxHpUpgradeAmount
  }),
  Object.freeze({
    id: 'round-time-plus',
    type: UPGRADE_TYPES.ROUND_TIME,
    label: 'SLOW CLOCK',
    shortLabel: '+TIME',
    value: BASE_BATTLE_CONFIG.roundTimeUpgradeMs
  }),
  Object.freeze({
    id: 'base-attack-plus',
    type: UPGRADE_TYPES.BASE_ATTACK,
    label: 'HOTTER STRIKE',
    shortLabel: '+ATK',
    value: BASE_BATTLE_CONFIG.baseAttackUpgradeAmount
  }),
  Object.freeze({
    id: 'combo-reward-plus',
    type: UPGRADE_TYPES.COMBO_REWARD,
    label: 'CHAIN AMP',
    shortLabel: '+COMBO',
    value: BASE_BATTLE_CONFIG.comboRewardUpgradeAmount
  })
]);
