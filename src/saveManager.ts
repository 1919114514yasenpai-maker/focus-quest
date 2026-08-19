import { SaveData, PlayerStats, EquipmentState, PlayerItem } from './types';
import { INITIAL_INVENTORY, ITEMS, generateUid } from './gameData';

export const CURRENT_SAVE_KEY = 'focus_quest_save_v3';
export const LEGACY_SAVE_KEYS = [
  'focus_quest_save_v2',
  'focus_quest_save_v1',
  'focus_quest_save',
];

export function parseSaveText(input: string): any {
  let cleaned = input.trim();
  // Remove markdown code blocks if present (e.g. ```json ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  // Normalize smart quotes if any
  cleaned = cleaned.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  return JSON.parse(cleaned);
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
    inventory = rawData.inventory.map((item: any): PlayerItem => {
      // 古い形式：文字列 ID
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
      // オブジェクト形式
      if (item && typeof item === 'object') {
        const baseId = item.baseId || item.id || 'w_wood_sword';
        const validBaseId = ITEMS[baseId] ? baseId : 'w_wood_sword';

        let slottedGems: string[] | undefined = undefined;
        if (Array.isArray(item.slottedGems)) {
          const validGems = item.slottedGems.filter((g: any) => typeof g === 'string' && ITEMS[g] && ITEMS[g].type === 'gem');
          if (validGems.length > 0) {
            slottedGems = validGems;
          }
        }

        const cleanItem: PlayerItem = {
          uid: item.uid ? String(item.uid) : generateUid(),
          baseId: validBaseId,
          upgradeLevel: typeof item.upgradeLevel === 'number' ? Math.max(0, item.upgradeLevel) : 0,
          limitBreak: typeof item.limitBreak === 'number' ? Math.max(0, item.limitBreak) : 0,
          addedPower: typeof item.addedPower === 'number' ? item.addedPower : 0,
          specialEnchantCount: typeof item.specialEnchantCount === 'number' ? Math.max(0, item.specialEnchantCount) : 0,
          customPrefix: typeof item.customPrefix === 'string' && item.customPrefix.trim() ? item.customPrefix.trim() : undefined,
          addedEffect: item.addedEffect,
          isLocked: Boolean(item.isLocked),
          isUncursed: Boolean(item.isUncursed),
          unlockedSockets: typeof item.unlockedSockets === 'number' ? Math.max(0, Math.min(3, item.unlockedSockets)) : 0,
          slottedGems: slottedGems,
          engraving: typeof item.engraving === 'string' && item.engraving.trim() ? item.engraving.trim() : undefined,
        };

        return cleanItem;
      }
      return {
        uid: generateUid(),
        baseId: 'w_wood_sword',
        upgradeLevel: 0,
        limitBreak: 0,
        addedPower: 0,
      };
    });
  }

  // インベントリが空なら初期装備を付元
  if (inventory.length === 0) {
    inventory = [...INITIAL_INVENTORY];
  }

  // 2. Equipment Normalization
  const rawEquip = rawData.equipment || {};

  let statWeaponId = String(rawEquip.statWeaponId || 'initial_w');
  let statArmorId = String(rawEquip.statArmorId || 'initial_a');

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

  const appearanceWeaponId = (rawEquip.appearanceWeaponId && ITEMS[rawEquip.appearanceWeaponId]?.type === 'weapon')
    ? rawEquip.appearanceWeaponId
    : (foundWeapon && ITEMS[foundWeapon.baseId]?.type === 'weapon' ? foundWeapon.baseId : 'w_wood_sword');

  const appearanceArmorId = (rawEquip.appearanceArmorId && ITEMS[rawEquip.appearanceArmorId]?.type === 'armor')
    ? rawEquip.appearanceArmorId
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

  const level = typeof rawStats.level === 'number' && rawStats.level > 0 ? rawStats.level : 1;
  const calculatedMaxHp = 100 + (level - 1) * 25 + maxHpBonus;

  const maxHp = typeof rawStats.maxHp === 'number' && rawStats.maxHp > 0
    ? rawStats.maxHp
    : calculatedMaxHp;

  const hp = typeof rawStats.hp === 'number' && rawStats.hp >= 0
    ? Math.min(rawStats.hp, maxHp)
    : maxHp;

  const validJobs = ['merchant', 'miner', 'appraiser', 'warrior', 'balanced', 'artisan'];
  const stats: PlayerStats = {
    level,
    xp: typeof rawStats.xp === 'number' && rawStats.xp >= 0 ? rawStats.xp : 0,
    gold: typeof rawStats.gold === 'number' && rawStats.gold >= 0 ? rawStats.gold : 50,
    hp,
    maxHp,
    stage: typeof rawStats.stage === 'number' && rawStats.stage > 0 ? rawStats.stage : 1,
    maxStageReached: typeof rawStats.maxStageReached === 'number' && rawStats.maxStageReached > 0
      ? rawStats.maxStageReached
      : (typeof rawStats.stage === 'number' && rawStats.stage > 0 ? rawStats.stage : 1),
    job: (validJobs.includes(rawStats.job) ? rawStats.job : 'balanced'),
    lastJobChangeLevel: typeof rawStats.lastJobChangeLevel === 'number' ? rawStats.lastJobChangeLevel : undefined,
    hasCurseImmunity: Boolean(rawStats.hasCurseImmunity),
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
