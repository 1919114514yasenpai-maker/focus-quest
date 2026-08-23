import { ChestReward, PlayerItem, JobType } from './types';
import { ITEMS, generateUid, isCraftExclusiveItem } from './gameData';

export const CHEST_TYPES = {
  WOODEN: {
    id: 'm_chest_wooden',
    name: '木の宝箱',
    color: '#8B4513',
    icon: '📦',
  },
  SILVER: {
    id: 'm_chest_silver',
    name: '銀の宝箱',
    color: '#94a3b8',
    icon: '🎁',
  },
  GOLD: {
    id: 'm_chest_gold',
    name: '金の宝箱',
    color: '#f59e0b',
    icon: '🧰',
  },
  LEGEND: {
    id: 'm_chest_legend',
    name: '伝説の宝箱',
    color: '#a855f7',
    icon: '👑',
  },
};

export const getChestForFocusMinutes = (minutes: number): string => {
  if (minutes >= 60) return CHEST_TYPES.LEGEND.id;
  if (minutes >= 30) return CHEST_TYPES.GOLD.id;
  if (minutes >= 15) return CHEST_TYPES.SILVER.id;
  return CHEST_TYPES.WOODEN.id;
};

export const generateChestReward = (chestId: string, stage: number, focusMinutes: number = 25, job: JobType = 'balanced'): ChestReward => {
  const isLegend = chestId === CHEST_TYPES.LEGEND.id;
  const isGold = chestId === CHEST_TYPES.GOLD.id;
  const isSilver = chestId === CHEST_TYPES.SILVER.id;

  let chestName = '木の宝箱';
  let goldMultiplier = 1;
  let xpMultiplier = 1;
  let itemCount = 1;

  if (isLegend) {
    chestName = '伝説の宝箱';
    goldMultiplier = 3.5;
    xpMultiplier = 3.0;
    itemCount = 3;
  } else if (isGold) {
    chestName = '金の宝箱';
    goldMultiplier = 2.2;
    xpMultiplier = 2.0;
    itemCount = 2;
  } else if (isSilver) {
    chestName = '銀の宝箱';
    goldMultiplier = 1.5;
    xpMultiplier = 1.4;
    itemCount = 2;
  }

  // Base gold and XP calculation based on focus minutes and stage
  const baseGold = Math.floor((200 + stage * 30 + focusMinutes * 15) * goldMultiplier);
  const baseXp = Math.floor((300 + stage * 50 + focusMinutes * 25) * xpMultiplier);

  // Filter possible weapon/armor items according to rank/stage (exclude craft only items)
  const allItemKeys = Object.keys(ITEMS);
  const weaponsAndArmors = allItemKeys.filter(k => 
    (ITEMS[k].type === 'weapon' || ITEMS[k].type === 'armor') && 
    !isCraftExclusiveItem(ITEMS[k])
  );
  const materials = allItemKeys.filter(k => ITEMS[k].type === 'material' && !isCraftExclusiveItem(ITEMS[k]));

  const rewardItems: PlayerItem[] = [];

  const prefixes = ['鋭利な', '伝説の', '祝福された', '古代の', '聖なる', '煌めく', '深遠な'];

  for (let i = 0; i < itemCount; i++) {
    // 70% chance weapon/armor, 30% material
    const isEquip = Math.random() < 0.7;

    if (isEquip && weaponsAndArmors.length > 0) {
      // Pick item scaled somewhat by stage or chest quality
      let subList = weaponsAndArmors;
      if (isLegend || isGold) {
        subList = weaponsAndArmors.filter(k => ITEMS[k].price >= 300);
        if (subList.length === 0) subList = weaponsAndArmors;
      }

      const randomBaseId = subList[Math.floor(Math.random() * subList.length)];
      const itemDef = ITEMS[randomBaseId];
      const isCursed = itemDef?.isCursed;

      const hasPrefix = !isCursed && Math.random() < (isLegend ? 0.8 : isGold ? 0.5 : 0.2);
      const customPrefix = isCursed ? '禍々しい' : (hasPrefix ? prefixes[Math.floor(Math.random() * prefixes.length)] : undefined);
      const initialUpgrade = isLegend ? Math.floor(Math.random() * 3) + 1 : isGold ? Math.floor(Math.random() * 2) : 0;
      const initialAddedPower = isCursed ? 10 : (hasPrefix ? Math.floor(Math.random() * 5) + 2 : 0);

      rewardItems.push({
        uid: generateUid(),
        baseId: randomBaseId,
        upgradeLevel: initialUpgrade,
        limitBreak: 0,
        addedPower: initialAddedPower,
        customPrefix,
      });
    } else if (materials.length > 0) {
      const randomMatId = materials[Math.floor(Math.random() * materials.length)];
      rewardItems.push({
        uid: generateUid(),
        baseId: randomMatId,
        upgradeLevel: 0,
        limitBreak: 0,
        addedPower: 0,
      });
    }
  }

  // Miner or Balanced bonus material drops
  let bonusMaterialCount = 0;
  if (job === 'miner') {
    bonusMaterialCount = Math.floor(Math.random() * 2) + 1; // 1~2 extra materials
  } else if (job === 'balanced' && Math.random() < 0.5) {
    bonusMaterialCount = 1;
  }

  if (bonusMaterialCount > 0 && materials.length > 0) {
    for (let b = 0; b < bonusMaterialCount; b++) {
      const randomMatId = materials[Math.floor(Math.random() * materials.length)];
      rewardItems.push({
        uid: generateUid(),
        baseId: randomMatId,
        upgradeLevel: 0,
        limitBreak: 0,
        addedPower: 0,
      });
    }
  }

  return {
    xp: baseXp,
    gold: baseGold,
    items: rewardItems,
    chestName,
  };
};
