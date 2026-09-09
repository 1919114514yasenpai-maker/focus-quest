import { SaveData, PlayerStats, EquipmentState, PlayerItem } from './types';
import { INITIAL_INVENTORY, ITEMS, generateUid } from './gameData';
import { parseAnySaveText } from './compression';

export const CURRENT_SAVE_KEY = 'focus_quest_save_v3';
export const LEGACY_SAVE_KEYS = [
  'focus_quest_save_v2',
  'focus_quest_save_v1',
  'focus_quest_save',
];

export function parseSaveText(input: string): any {
  try {
    return parseAnySaveText(input);
  } catch {
    let cleaned = input.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    cleaned = cleaned.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    return JSON.parse(cleaned);
  }
}

export function sanitizeSingleItem(item: any): PlayerItem | null {
  if (!item) return null;
  if (typeof item === 'string') {
    const baseId = ITEMS[item] ? item : 'w_wood_sword';
    return {
      uid: generateUid(),
      baseId,
      upgradeLevel: 0,
      limitBreak: 0,
      addedPower: 0,
    };
  }
  if (typeof item === 'object') {
    const baseId = item.baseId || item.id || 'w_wood_sword';
    const validBaseId = ITEMS[baseId] ? baseId : 'w_wood_sword';

    const upgradeLevel = typeof item.upgradeLevel === 'number' 
      ? Math.max(0, item.upgradeLevel) 
      : (typeof item.lvl === 'number' ? Math.max(0, item.lvl) : 0);
    const limitBreak = typeof item.limitBreak === 'number' 
      ? Math.max(0, item.limitBreak) 
      : (typeof item.lb === 'number' ? Math.max(0, item.lb) : 0);
    const addedPower = typeof item.addedPower === 'number' 
      ? item.addedPower 
      : (typeof item.pow === 'number' ? item.pow : 0);
    const specialEnchantCount = typeof item.specialEnchantCount === 'number' 
      ? Math.max(0, item.specialEnchantCount) 
      : (typeof item.sec === 'number' ? Math.max(0, item.sec) : 0);
    const customPrefix = typeof item.customPrefix === 'string' && item.customPrefix.trim() 
      ? item.customPrefix.trim() 
      : (typeof item.pfx === 'string' && item.pfx.trim() ? item.pfx.trim() : undefined);
    const isLocked = Boolean(item.isLocked || item.lock);
    const isUncursed = Boolean(item.isUncursed || item.unc);
    const unlockedSockets = typeof item.unlockedSockets === 'number' 
      ? Math.max(0, Math.min(3, item.unlockedSockets)) 
      : (typeof item.soc === 'number' ? Math.max(0, Math.min(3, item.soc)) : 0);
    const engraving = typeof item.engraving === 'string' && item.engraving.trim() 
      ? item.engraving.trim() 
      : (typeof item.eng === 'string' && item.eng.trim() ? item.eng.trim() : undefined);

    let slottedGems: string[] | undefined = undefined;
    const gemsRaw = item.slottedGems || item.gems;
    if (Array.isArray(gemsRaw)) {
      const validGems = gemsRaw.filter((g: any) => typeof g === 'string' && ITEMS[g] && ITEMS[g].type === 'gem');
      if (validGems.length > 0) {
        slottedGems = validGems;
      }
    }

    let packedItems: PlayerItem[] | undefined = undefined;
    const packedRaw = item.packedItems || item.pack;
    if (Array.isArray(packedRaw) && packedRaw.length > 0) {
      const validPacked = packedRaw.map(sanitizeSingleItem).filter((p): p is PlayerItem => p !== null);
      if (validPacked.length > 0) {
        packedItems = validPacked;
      }
    }

    return {
      uid: item.uid ? String(item.uid) : generateUid(),
      baseId: validBaseId,
      upgradeLevel,
      limitBreak,
      addedPower,
      specialEnchantCount,
      customPrefix,
      addedEffect: item.addedEffect || item.eff,
      isLocked,
      isUncursed,
      unlockedSockets,
      slottedGems,
      engraving,
      packedItems,
    };
  }
  return null;
}

export function minifyPlayerItem(item: PlayerItem): any {
  const min: any = {
    uid: item.uid,
    baseId: item.baseId,
  };
  if (item.upgradeLevel > 0) min.lvl = item.upgradeLevel;
  if (item.limitBreak && item.limitBreak > 0) min.lb = item.limitBreak;
  if (item.addedPower) min.pow = item.addedPower;
  if (item.specialEnchantCount && item.specialEnchantCount > 0) min.sec = item.specialEnchantCount;
  if (item.customPrefix) min.pfx = item.customPrefix;
  if (item.addedEffect) min.eff = item.addedEffect;
  if (item.isLocked) min.lock = 1;
  if (item.isUncursed) min.unc = 1;
  if (item.unlockedSockets && item.unlockedSockets > 0) min.soc = item.unlockedSockets;
  if (item.slottedGems && item.slottedGems.length > 0) min.gems = item.slottedGems;
  if (item.engraving) min.eng = item.engraving;
  if (item.packedItems && item.packedItems.length > 0) {
    min.pack = item.packedItems.map(minifyPlayerItem);
  }
  return min;
}

export function minifySaveData(data: SaveData): any {
  return {
    stats: {
      lvl: data.stats.level,
      xp: data.stats.xp,
      g: data.stats.gold,
      hp: data.stats.hp,
      mhp: data.stats.maxHp,
      stg: data.stats.stage,
      mstg: data.stats.maxStageReached,
      job: data.stats.job,
      ...(data.stats.lastJobChangeLevel !== undefined ? { ljc: data.stats.lastJobChangeLevel } : {}),
      ...(data.stats.hasCurseImmunity ? { ci: 1 } : {}),
      ...(data.stats.creditScore !== undefined && data.stats.creditScore !== 100 ? { cs: data.stats.creditScore } : {}),
    },
    equipment: {
      sw: data.equipment.statWeaponId,
      aw: data.equipment.appearanceWeaponId,
      sa: data.equipment.statArmorId,
      aa: data.equipment.appearanceArmorId,
    },
    inventory: (data.inventory || []).map(minifyPlayerItem),
  };
}

export function sanitizeSaveData(rawData: any): SaveData {
  if (!rawData || typeof rawData !== 'object') {
    return {
      stats: {
        level: 1,
        xp: 0,
        gold: 50,
        hp: 100,
        maxHp: 100,
        stage: 1,
        maxStageReached: 1,
      },
      equipment: {
        statWeaponId: 'initial_w',
        appearanceWeaponId: 'w_wood_sword',
        statArmorId: 'initial_a',
        appearanceArmorId: 'a_cloth',
      },
      inventory: INITIAL_INVENTORY,
    };
  }

  // 1. Inventory Normalization
  let inventory: PlayerItem[] = [];

  if (Array.isArray(rawData.inventory)) {
    inventory = rawData.inventory
      .map(sanitizeSingleItem)
      .filter((i): i is PlayerItem => i !== null);
  }

  // インベントリが空なら初期装備を付与
  if (inventory.length === 0) {
    inventory = [...INITIAL_INVENTORY];
  }

  // 2. Equipment Normalization
  const rawEquip = rawData.equipment || {};

  let statWeaponId = String(rawEquip.statWeaponId || rawEquip.sw || 'initial_w');
  let statArmorId = String(rawEquip.statArmorId || rawEquip.sa || 'initial_a');

  // statWeaponId が inventory 内の uid に存在するか確認
  let foundWeapon = inventory.find(i => i.uid === statWeaponId);
  if (!foundWeapon) {
    foundWeapon = inventory.find(i => i.baseId === statWeaponId && ITEMS[i.baseId]?.type === 'weapon');
    if (foundWeapon) {
      statWeaponId = foundWeapon.uid;
    } else {
      const newW: PlayerItem = {
        uid: statWeaponId || generateUid(),
        baseId: ITEMS[statWeaponId]?.type === 'weapon' ? statWeaponId : 'w_wood_sword',
        upgradeLevel: 0,
        limitBreak: 0,
        addedPower: 0,
      };
      inventory.push(newW);
      statWeaponId = newW.uid;
      foundWeapon = newW;
    }
  }

  // statArmorId が inventory 内の uid に存在するか確認
  let foundArmor = inventory.find(i => i.uid === statArmorId);
  if (!foundArmor) {
    foundArmor = inventory.find(i => i.baseId === statArmorId && ITEMS[i.baseId]?.type === 'armor');
    if (foundArmor) {
      statArmorId = foundArmor.uid;
    } else {
      const newA: PlayerItem = {
        uid: statArmorId || generateUid(),
        baseId: ITEMS[statArmorId]?.type === 'armor' ? statArmorId : 'a_cloth',
        upgradeLevel: 0,
        limitBreak: 0,
        addedPower: 0,
      };
      inventory.push(newA);
      statArmorId = newA.uid;
      foundArmor = newA;
    }
  }

  const rawAppW = rawEquip.appearanceWeaponId || rawEquip.aw;
  const rawAppA = rawEquip.appearanceArmorId || rawEquip.aa;

  const appearanceWeaponId = (rawAppW && ITEMS[rawAppW]?.type === 'weapon')
    ? rawAppW
    : (foundWeapon && ITEMS[foundWeapon.baseId]?.type === 'weapon' ? foundWeapon.baseId : 'w_wood_sword');

  const appearanceArmorId = (rawAppA && ITEMS[rawAppA]?.type === 'armor')
    ? rawAppA
    : (foundArmor && ITEMS[foundArmor.baseId]?.type === 'armor' ? foundArmor.baseId : 'a_cloth');

  const equipment: EquipmentState = {
    statWeaponId,
    appearanceWeaponId,
    statArmorId,
    appearanceArmorId,
  };

  // 3. Stats Normalization
  const rawStats = rawData.stats || {};

  // 装備効果による MaxHP ボーナスを正確に加算した基礎 MaxHP 計算
  const statArmorItem = inventory.find(i => i.uid === statArmorId);
  const armorBase = statArmorItem ? ITEMS[statArmorItem.baseId] : null;
  const maxHpBonus = armorBase?.effect?.maxHpBonus || 0;

  const level = typeof rawStats.level === 'number' && rawStats.level > 0 
    ? rawStats.level 
    : (typeof rawStats.lvl === 'number' && rawStats.lvl > 0 ? rawStats.lvl : 1);
  const calculatedMaxHp = 100 + (level - 1) * 25 + maxHpBonus;

  const rawMaxHp = typeof rawStats.maxHp === 'number' && rawStats.maxHp > 0 
    ? rawStats.maxHp 
    : (typeof rawStats.mhp === 'number' && rawStats.mhp > 0 ? rawStats.mhp : calculatedMaxHp);
  const maxHp = rawMaxHp;

  const rawHp = typeof rawStats.hp === 'number' && rawStats.hp >= 0 ? rawStats.hp : maxHp;
  const hp = Math.min(rawHp, maxHp);

  const stage = typeof rawStats.stage === 'number' && rawStats.stage > 0 
    ? rawStats.stage 
    : (typeof rawStats.stg === 'number' && rawStats.stg > 0 ? rawStats.stg : 1);
  const maxStageReached = typeof rawStats.maxStageReached === 'number' && rawStats.maxStageReached > 0
    ? rawStats.maxStageReached
    : (typeof rawStats.mstg === 'number' && rawStats.mstg > 0 ? rawStats.mstg : stage);

  const validJobs = ['merchant', 'miner', 'appraiser', 'warrior', 'balanced', 'artisan'];
  const stats: PlayerStats = {
    level,
    xp: typeof rawStats.xp === 'number' && rawStats.xp >= 0 ? rawStats.xp : 0,
    gold: typeof rawStats.gold === 'number' && rawStats.gold >= 0 
      ? rawStats.gold 
      : (typeof rawStats.g === 'number' && rawStats.g >= 0 ? rawStats.g : 50),
    hp,
    maxHp,
    stage,
    maxStageReached,
    job: (validJobs.includes(rawStats.job) ? rawStats.job : 'balanced'),
    lastJobChangeLevel: typeof rawStats.lastJobChangeLevel === 'number' 
      ? rawStats.lastJobChangeLevel 
      : (typeof rawStats.ljc === 'number' ? rawStats.ljc : undefined),
    hasCurseImmunity: Boolean(rawStats.hasCurseImmunity || rawStats.ci),
    creditScore: typeof rawStats.creditScore === 'number' 
      ? rawStats.creditScore 
      : (typeof rawStats.cs === 'number' ? rawStats.cs : 100),
  };

  return {
    stats,
    equipment,
    inventory,
  };
}

export function loadSaveDataFromLocalStorage(): SaveData | null {
  try {
    // 現行のキーを最優先で確認
    const saved = localStorage.getItem(CURRENT_SAVE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return sanitizeSaveData(parsed);
    }

    // 古いキー（v2, v1 等）からの移行チェック
    for (const legacyKey of LEGACY_SAVE_KEYS) {
      const legacySaved = localStorage.getItem(legacyKey);
      if (legacySaved) {
        const parsed = JSON.parse(legacySaved);
        const sanitized = sanitizeSaveData(parsed);
        // 新しいキーに移動保存
        localStorage.setItem(CURRENT_SAVE_KEY, JSON.stringify(sanitized));
        return sanitized;
      }
    }
  } catch (e) {
    console.error('Failed to load save data from localStorage:', e);
  }
  return null;
}
