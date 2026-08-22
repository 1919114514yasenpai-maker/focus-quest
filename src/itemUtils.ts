import { PlayerItem, GameItem, ItemEffect, JobType } from './types';
import { ITEMS } from './gameData';
import { getSellGoldMultiplier, getUncurseDiscountMultiplier } from './jobUtils';

export const getCompiledItem = (playerItem: PlayerItem | undefined, ignoreCurses: boolean = false): GameItem | null => {
  if (!playerItem) return null;
  const baseItem = ITEMS[playerItem.baseId];
  if (!baseItem) return null;

  const isUncursed = !!playerItem.isUncursed || ignoreCurses;
  const rawIsCursed = (baseItem.isCursed || baseItem.effect?.isCursed) && !isUncursed;

  // Name calculation
  let name = baseItem.name;
  if (playerItem.customPrefix) {
    name = `${playerItem.customPrefix}${name}`;
  } else if (isUncursed) {
    name = `浄化された${name}`;
  }

  if (rawIsCursed) {
    if (!name.startsWith('💀')) name = `💀${name}`;
  } else if (isUncursed) {
    if (!name.startsWith('✨')) name = `✨${name}`;
  }

  if (playerItem.upgradeLevel > 0) {
    name = `${name} Lv.${playerItem.upgradeLevel}`;
  }
  if (playerItem.limitBreak && playerItem.limitBreak > 0) {
    name = `${name} +${playerItem.limitBreak}`;
  }

  // Base Effect handling
  let baseEffect = baseItem.effect;
  if (isUncursed && baseEffect) {
    baseEffect = {
      description: '✨【解呪済】聖なる力で呪いが浄化された。圧倒的な威力を安全に行使できる。',
      critChance: baseEffect.critChance ? Math.max(0, baseEffect.critChance) : undefined,
      goldBonus: baseEffect.goldBonus ? Math.max(0, baseEffect.goldBonus) : undefined,
      xpBonus: baseEffect.xpBonus ? Math.max(0, baseEffect.xpBonus) : undefined,
      hpRegen: baseEffect.hpRegen,
      lifesteal: baseEffect.lifesteal,
      maxHpBonus: baseEffect.maxHpBonus,
      isCursed: false,
      curseHpDrain: 0,
      damageMultiplier: baseEffect.damageMultiplier ? Math.max(0, baseEffect.damageMultiplier) : undefined,
      enemySlowRate: baseEffect.enemySlowRate,
    };
  }

  // Effect merging
  let effect: ItemEffect | undefined = baseEffect ? { ...baseEffect } : undefined;
  if (playerItem.addedEffect) {
    const descParts = [baseEffect?.description].filter(Boolean);
    if (playerItem.addedEffect.description) {
      descParts.push(playerItem.addedEffect.description);
    }

    const baseDrain = isUncursed ? 0 : (baseEffect?.curseHpDrain || 0);
    const addedDrain = isUncursed ? 0 : (playerItem.addedEffect.curseHpDrain || 0);

    effect = {
      description: descParts.join(' / '),
      critChance: (baseEffect?.critChance || 0) + (playerItem.addedEffect.critChance || 0),
      goldBonus: (baseEffect?.goldBonus || 0) + (playerItem.addedEffect.goldBonus || 0),
      xpBonus: (baseEffect?.xpBonus || 0) + (playerItem.addedEffect.xpBonus || 0),
      hpRegen: (baseEffect?.hpRegen || 0) + (playerItem.addedEffect.hpRegen || 0),
      lifesteal: (baseEffect?.lifesteal || 0) + (playerItem.addedEffect.lifesteal || 0),
      maxHpBonus: (baseEffect?.maxHpBonus || 0) + (playerItem.addedEffect.maxHpBonus || 0),
      isCursed: rawIsCursed,
      curseHpDrain: baseDrain + addedDrain,
      damageMultiplier: (baseEffect?.damageMultiplier || 0) + (playerItem.addedEffect.damageMultiplier || 0),
      enemySlowRate: (baseEffect?.enemySlowRate || 0) + (playerItem.addedEffect.enemySlowRate || 0),
    };

    if (isUncursed && effect) {
      effect.isCursed = false;
      effect.curseHpDrain = 0;
      if (effect.xpBonus && effect.xpBonus < 0) effect.xpBonus = 0;
      if (effect.goldBonus && effect.goldBonus < 0) effect.goldBonus = 0;
      if (effect.critChance && effect.critChance < 0) effect.critChance = 0;
      if (effect.damageMultiplier && effect.damageMultiplier < 0) effect.damageMultiplier = 0;
    }
  }

  const limitBreakPower = (playerItem.limitBreak || 0) * (baseItem.type === 'weapon' ? 10 : 8);

  // Gem handling
  let totalGemPower = 0;
  if (playerItem.slottedGems && playerItem.slottedGems.length > 0) {
    if (!effect) effect = { description: '' };
    playerItem.slottedGems.forEach(gemId => {
      const gem = ITEMS[gemId];
      if (gem) {
        totalGemPower += gem.power || 0;
        if (gem.effect) {
          effect!.description += `\n[${gem.name}] ${gem.effect.description}`;
          if (gem.effect.elementalDamage) effect!.elementalDamage = (effect!.elementalDamage || 0) + gem.effect.elementalDamage;
          if (gem.effect.elementalType) effect!.elementalType = gem.effect.elementalType;
          if (gem.effect.critChance) effect!.critChance = (effect!.critChance || 0) + gem.effect.critChance;
          if (gem.effect.hpRegen) effect!.hpRegen = (effect!.hpRegen || 0) + gem.effect.hpRegen;
          if (gem.effect.goldBonus) effect!.goldBonus = (effect!.goldBonus || 0) + gem.effect.goldBonus;
          if (gem.effect.xpBonus) effect!.xpBonus = (effect!.xpBonus || 0) + gem.effect.xpBonus;
          if (gem.effect.maxHpBonus) effect!.maxHpBonus = (effect!.maxHpBonus || 0) + gem.effect.maxHpBonus;
          if (gem.effect.damageMultiplier) effect!.damageMultiplier = (effect!.damageMultiplier || 0) + gem.effect.damageMultiplier;
          if (gem.effect.lifesteal) effect!.lifesteal = (effect!.lifesteal || 0) + gem.effect.lifesteal;
        }
      }
    });
  }

  return {
    ...baseItem,
    id: playerItem.uid,
    name,
    power: baseItem.power + playerItem.addedPower + (playerItem.upgradeLevel * (baseItem.type === 'weapon' ? 3 : 2)) + limitBreakPower + totalGemPower,
    isCursed: rawIsCursed,
    effect,
  };
};

export const calculateSellPrice = (playerItem: PlayerItem, job: JobType = 'balanced'): number => {
  const baseItem = ITEMS[playerItem.baseId];
  if (!baseItem) return 10;

  const basePrice = baseItem.price || (
    baseItem.type === 'material' ? 50 :
    baseItem.type === 'gem' ? 800 :
    baseItem.type === 'chest' ? 200 : 100
  );
  // 基本は定価の半額 (50%)
  let sellPrice = Math.floor(basePrice * 0.5);

  // 強化レベルによる加算 (+20% of basePrice per level)
  if (playerItem.upgradeLevel > 0) {
    sellPrice += Math.floor(basePrice * 0.20 * playerItem.upgradeLevel);
  }

  // 限界突破(凸)による加算 (+50% of basePrice per limit break)
  if (playerItem.limitBreak && playerItem.limitBreak > 0) {
    sellPrice += Math.floor(basePrice * 0.50 * playerItem.limitBreak);
  }

  // 特殊強化回数による加算 (+30% of basePrice per special enchant)
  if (playerItem.specialEnchantCount && playerItem.specialEnchantCount > 0) {
    sellPrice += Math.floor(basePrice * 0.30 * playerItem.specialEnchantCount);
  }

  // 追加ステータス(addedPower)による補正
  if (playerItem.addedPower > 0) {
    sellPrice += playerItem.addedPower * 12;
  }

  const jobMult = getSellGoldMultiplier(job);
  return Math.max(5, Math.floor(sellPrice * jobMult));
};

export const calculateUncurseCost = (playerItem: PlayerItem, job: JobType = 'balanced'): number => {
  const baseItem = ITEMS[playerItem.baseId];
  if (!baseItem) return 5000000;

  const basePrice = baseItem.price || 5000;
  // 呪い解除（解呪）の儀式費用は超高額 (基本価格の 1000 倍、最低 5,000,000 G 〜 数千万 G)
  let cost = Math.floor(basePrice * 1000);

  if (playerItem.upgradeLevel > 0) {
    cost += Math.floor(basePrice * 200 * playerItem.upgradeLevel);
  }
  if (playerItem.limitBreak && playerItem.limitBreak > 0) {
    cost += Math.floor(basePrice * 500 * playerItem.limitBreak);
  }
  if (playerItem.specialEnchantCount && playerItem.specialEnchantCount > 0) {
    cost += Math.floor(basePrice * 300 * playerItem.specialEnchantCount);
  }

  cost = Math.max(5000000, cost);
  const discountMult = getUncurseDiscountMultiplier(job);
  return Math.floor(cost * discountMult);
};

// --- まとめ強化用ヘルパー ---

// 指定回数(+N)強化時の合計費用を算出
export const calculateBatchEnchantCost = (currentLevel: number, count: number): number => {
  let totalCost = 0;
  for (let i = 0; i < count; i++) {
    totalCost += 200 + (currentLevel + i) * 100;
  }
  return totalCost;
};

// 所持ゴールドで可能な最大強化回数と合計費用を算出
export const calculateMaxEnchantLevels = (currentLevel: number, availableGold: number): { maxLevels: number; totalCost: number } => {
  let levels = 0;
  let totalCost = 0;
  let nextCost = 200 + (currentLevel + levels) * 100;
  while (availableGold >= totalCost + nextCost) {
    totalCost += nextCost;
    levels++;
    nextCost = 200 + (currentLevel + levels) * 100;
  }
  return { maxLevels: levels, totalCost };
};

// まとめ基本強化を実行し、更新後アイテムと消費ゴールドを返却
export const performBatchEnchant = (pItem: PlayerItem, count: number): { updatedItem: PlayerItem; totalCost: number } => {
  const cost = calculateBatchEnchantCost(pItem.upgradeLevel, count);
  let newLevel = pItem.upgradeLevel;
  let addedPower = pItem.addedPower;
  let customPrefix = pItem.customPrefix;
  const prefixes = ['鋭利な', '炎の', '伝説の', '祝福された', '呪われた', '名工の', '神聖なる'];

  for (let i = 0; i < count; i++) {
    newLevel++;
    addedPower += Math.floor(Math.random() * 3) + 1;
    if (newLevel % 3 === 0) {
      customPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    }
  }

  return {
    updatedItem: {
      ...pItem,
      upgradeLevel: newLevel,
      addedPower,
      customPrefix,
    },
    totalCost: cost,
  };
};

// まとめ特殊強化（素材複数消費）を実行
export const performBatchSpecialEnchant = (
  pItem: PlayerItem,
  materialBaseId: string,
  count: number
): PlayerItem => {
  let addedPower = pItem.addedPower;
  const prevEffect: ItemEffect = pItem.addedEffect || { description: '' };
  const matEffect: ItemEffect = { ...prevEffect };
  let prefix = prevEffect.description ? 'キメラの' : '神秘の';

  for (let i = 0; i < count; i++) {
    addedPower += Math.floor(Math.random() * 5) + 3; // +3~7 power
    if (materialBaseId === 'm_slime_jelly') {
      prefix = prevEffect.description ? 'キメラの' : '粘性の';
      matEffect.enemySlowRate = Math.min(0.90, (matEffect.enemySlowRate || 0) + 0.15);
    } else if (materialBaseId === 'm_goblin_ear') {
      prefix = prevEffect.description ? 'キメラの' : '野蛮な';
      matEffect.critChance = Math.min(1.0, (matEffect.critChance || 0) + 0.05);
    } else if (materialBaseId === 'm_orc_fang') {
      prefix = prevEffect.description ? 'キメラの' : '豪傑の';
      matEffect.lifesteal = Math.min(1.0, (matEffect.lifesteal || 0) + 0.03);
    } else if (materialBaseId === 'm_demon_horn') {
      prefix = prevEffect.description ? 'キメラの' : '魔性の';
      matEffect.hpRegen = (matEffect.hpRegen || 0) + 2;
      matEffect.damageMultiplier = (matEffect.damageMultiplier || 0) + 0.05;
    } else if (materialBaseId === 'm_dragon_scale') {
      prefix = prevEffect.description ? 'キメラの' : '覇竜の';
      matEffect.maxHpBonus = (matEffect.maxHpBonus || 0) + 30;
      matEffect.goldBonus = (matEffect.goldBonus || 0) + 0.10;
    }
  }

  // Build new description dynamically
  const descParts = [];
  if (matEffect.enemySlowRate) descParts.push(`遅延${Math.round(matEffect.enemySlowRate * 100)}%`);
  if (matEffect.critChance) descParts.push(`会心+${Math.round(matEffect.critChance * 100)}%`);
  if (matEffect.lifesteal) descParts.push(`吸血+${Math.round(matEffect.lifesteal * 100)}%`);
  if (matEffect.hpRegen || matEffect.damageMultiplier) {
    descParts.push(`毎秒HP+${matEffect.hpRegen || 0}/ダメ+${Math.round((matEffect.damageMultiplier || 0) * 100)}%`);
  }
  if (matEffect.maxHpBonus || matEffect.goldBonus) {
    descParts.push(`HP+${matEffect.maxHpBonus || 0}/金+${Math.round((matEffect.goldBonus || 0) * 100)}%`);
  }
  matEffect.description = descParts.join(' | ') || '特殊強化済';

  return {
    ...pItem,
    addedPower,
    specialEnchantCount: (pItem.specialEnchantCount || 0) + count,
    customPrefix: prefix,
    addedEffect: matEffect,
  };
};

