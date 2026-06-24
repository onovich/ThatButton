import { BASE_BATTLE_CONFIG } from '../config/battle.js';
import { UPGRADE_DEFINITIONS, UPGRADE_TYPES } from '../config/upgrades.js';
import { applyMaxHpChange, createPlayerState } from './player.js';

export const BASE_UPGRADE_MODIFIERS = Object.freeze({
  comboWindowBonusMs: 0,
  maxHpBonus: 0,
  roundTimeBonusMs: 0,
  baseAttackBonus: 0,
  comboRewardBonus: 0
});

function normalizeCount(value, fallback = 3) {
  return Math.max(1, Math.floor(Number(value) || fallback));
}

function normalizeEnemyIndex(value) {
  return Math.max(1, Math.floor(Number(value) || 1));
}

function cloneDefinition(definition, enemyIndex = 1) {
  return {
    id: definition.id,
    offerId: `${definition.id}@enemy-${normalizeEnemyIndex(enemyIndex)}`,
    type: definition.type,
    label: definition.label,
    shortLabel: definition.shortLabel,
    value: Math.max(0, Math.floor(Number(definition.value) || 0)),
    enemyIndex: normalizeEnemyIndex(enemyIndex)
  };
}

function cloneAppliedUpgrade(upgrade) {
  return {
    id: upgrade.id,
    offerId: upgrade.offerId || upgrade.id,
    type: upgrade.type,
    label: upgrade.label,
    shortLabel: upgrade.shortLabel,
    value: Math.max(0, Math.floor(Number(upgrade.value) || 0)),
    enemyIndex: upgrade.enemyIndex === null || upgrade.enemyIndex === undefined
      ? null
      : normalizeEnemyIndex(upgrade.enemyIndex),
    sequence: Math.max(1, Math.floor(Number(upgrade.sequence) || 1))
  };
}

export function getUpgradeDefinition(upgradeId) {
  return UPGRADE_DEFINITIONS.find((definition) => definition.id === upgradeId) || null;
}

export function getUpgradeModifiers(upgrades = {}) {
  const modifiers = upgrades?.modifiers || {};
  return {
    comboWindowBonusMs: Math.max(0, Math.floor(Number(modifiers.comboWindowBonusMs) || 0)),
    maxHpBonus: Math.max(0, Math.floor(Number(modifiers.maxHpBonus) || 0)),
    roundTimeBonusMs: Math.max(0, Math.floor(Number(modifiers.roundTimeBonusMs) || 0)),
    baseAttackBonus: Math.max(0, Math.floor(Number(modifiers.baseAttackBonus) || 0)),
    comboRewardBonus: Math.max(0, Math.floor(Number(modifiers.comboRewardBonus) || 0))
  };
}

export function createUpgradeState({
  applied = [],
  choices = [],
  pending = false,
  selected = null,
  modifiers = {}
} = {}) {
  const normalizedApplied = applied.map(cloneAppliedUpgrade);
  const normalizedChoices = choices.map((choice) => ({
    id: choice.id,
    offerId: choice.offerId || choice.id,
    type: choice.type,
    label: choice.label,
    shortLabel: choice.shortLabel,
    value: Math.max(0, Math.floor(Number(choice.value) || 0)),
    enemyIndex: normalizeEnemyIndex(choice.enemyIndex)
  }));
  return {
    applied: normalizedApplied,
    choices: normalizedChoices,
    pending: Boolean(pending) && normalizedChoices.length > 0,
    selected: selected ? cloneAppliedUpgrade(selected) : null,
    modifiers: {
      ...BASE_UPGRADE_MODIFIERS,
      ...getUpgradeModifiers({ modifiers })
    }
  };
}

export function generateUpgradeChoices({
  rng = Math.random,
  enemyIndex = 1,
  count = 3,
  definitions = UPGRADE_DEFINITIONS
} = {}) {
  const normalizedEnemyIndex = normalizeEnemyIndex(enemyIndex);
  const pool = definitions.map((definition) => cloneDefinition(definition, normalizedEnemyIndex));
  for (let index = pool.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.max(0, Math.min(0.999999, Number(rng()) || 0)) * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, Math.min(normalizeCount(count), pool.length));
}

export function offerUpgradeChoices(upgrades = createUpgradeState(), options = {}) {
  const previous = createUpgradeState(upgrades);
  const choices = generateUpgradeChoices(options);
  return {
    previous,
    upgrades: createUpgradeState({
      applied: previous.applied,
      choices,
      pending: true,
      selected: previous.selected,
      modifiers: previous.modifiers
    }),
    choices
  };
}

function applyModifier(modifiers, upgrade) {
  const next = { ...getUpgradeModifiers({ modifiers }) };
  if (upgrade.type === UPGRADE_TYPES.COMBO_WINDOW) {
    next.comboWindowBonusMs += upgrade.value;
  } else if (upgrade.type === UPGRADE_TYPES.MAX_HP) {
    next.maxHpBonus += upgrade.value;
  } else if (upgrade.type === UPGRADE_TYPES.ROUND_TIME) {
    next.roundTimeBonusMs += upgrade.value;
  } else if (upgrade.type === UPGRADE_TYPES.BASE_ATTACK) {
    next.baseAttackBonus += upgrade.value;
  } else if (upgrade.type === UPGRADE_TYPES.COMBO_REWARD) {
    next.comboRewardBonus += upgrade.value;
  }
  return next;
}

export function applyUpgradeChoice(upgrades = createUpgradeState(), choiceId, {
  player = null
} = {}) {
  const previous = createUpgradeState(upgrades);
  const choice = previous.choices.find((entry) => entry.id === choiceId || entry.offerId === choiceId)
    || (getUpgradeDefinition(choiceId) ? cloneDefinition(getUpgradeDefinition(choiceId)) : null);
  if (!choice) {
    throw new TypeError(`Unknown upgrade choice: ${choiceId}`);
  }
  const applied = {
    ...choice,
    sequence: previous.applied.length + 1
  };
  const modifiers = applyModifier(previous.modifiers, applied);
  const playerResult = applied.type === UPGRADE_TYPES.MAX_HP
    ? applyMaxHpChange(player || createPlayerState(), {
      amount: applied.value,
      source: 'upgrade',
      upgradeId: applied.id
    })
    : { player };
  return {
    previous,
    upgrade: applied,
    player: playerResult.player || player,
    upgrades: createUpgradeState({
      applied: [...previous.applied, applied],
      choices: [],
      pending: false,
      selected: applied,
      modifiers
    })
  };
}

export function getEffectiveComboWindowMs(upgrades = createUpgradeState(), baseWindowMs = BASE_BATTLE_CONFIG.comboWindowMs) {
  return Math.max(0, Math.floor(Number(baseWindowMs) || 0) + getUpgradeModifiers(upgrades).comboWindowBonusMs);
}

export function getEffectiveRoundTimeLimitMs(baseTimeLimitMs, upgrades = createUpgradeState()) {
  return Math.max(1, Math.floor(Number(baseTimeLimitMs) || 1) + getUpgradeModifiers(upgrades).roundTimeBonusMs);
}

export function getEffectiveBaseAttack(baseAttack = BASE_BATTLE_CONFIG.baseAttackDamage, upgrades = createUpgradeState()) {
  return Math.max(0, Math.floor(Number(baseAttack) || 0) + getUpgradeModifiers(upgrades).baseAttackBonus);
}

export function getEffectiveComboRewardBonus(upgrades = createUpgradeState()) {
  return getUpgradeModifiers(upgrades).comboRewardBonus;
}

export function getUpgradeSummary(upgrades = createUpgradeState()) {
  return createUpgradeState(upgrades);
}
