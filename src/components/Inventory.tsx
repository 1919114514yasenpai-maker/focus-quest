import React, { useState, useEffect, useRef, useMemo } from 'react';
import { EquipmentState, GameItem, PlayerItem, ItemEffect, JobType } from '../types';
import { ITEMS, isCraftExclusiveItem } from '../gameData';
import { WEAPON_SPRITES, ARMOR_SPRITES, drawIconSprite } from '../sprites';
import { 
  getCompiledItem, 
  calculateSellPrice, 
  calculateUncurseCost,
  calculateBatchEnchantCost,
  calculateMaxEnchantLevels,
  performBatchEnchant,
  performBatchSpecialEnchant
} from '../itemUtils';
import { generateDailyShopItems, getTodayDateString, DailyShopItem } from '../dailyShopUtils';
import { getShopDiscountMultiplier } from '../jobUtils';

interface ItemIconProps {
  item: GameItem & { baseId?: string };
  size?: number;
}

const iconCache = new Map<string, string>();

const getIconCacheKey = (item: GameItem & { baseId?: string }): string => {
  return `${item.type}_${item.baseId || item.id}_${item.color || ''}_${item.name || ''}`;
};

export const ItemIcon: React.FC<ItemIconProps> = React.memo(({ item, size = 32 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cacheKey = getIconCacheKey(item);
  const cachedUrl = iconCache.get(cacheKey);

  useEffect(() => {
    if (cachedUrl) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw generic square for materials or gems
    if (item.type === 'material' || item.type === 'gem') {
      ctx.fillStyle = item.color || '#94a3b8';
      ctx.fillRect(8, 8, 16, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, 10, 4, 4);
      iconCache.set(cacheKey, canvas.toDataURL());
      return;
    }

    // Draw chest icon
    if (item.type === 'chest') {
      const isGold = item.name?.includes('金') || item.color === '#f59e0b';
      const isSilver = item.name?.includes('銀') || item.color === '#94a3b8';
      const isLegend = item.name?.includes('伝説') || item.color === '#a855f7';
      
      const bodyColor = isLegend ? '#581c87' : isGold ? '#b45309' : isSilver ? '#475569' : '#78350f';
      const lidColor = isLegend ? '#9333ea' : isGold ? '#f59e0b' : isSilver ? '#94a3b8' : '#b45309';
      const lockColor = isLegend ? '#facc15' : isGold ? '#fde047' : '#e2e8f0';

      ctx.fillStyle = bodyColor;
      ctx.fillRect(6, 12, 20, 14);
      ctx.fillStyle = lidColor;
      ctx.fillRect(5, 7, 22, 6);
      ctx.fillStyle = lockColor;
      ctx.fillRect(14, 11, 4, 5);
      iconCache.set(cacheKey, canvas.toDataURL());
      return;
    }

    // Draw scroll / consumable icon
    if (item.type === 'consumable') {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(8, 6, 16, 20);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(10, 9, 12, 2);
      ctx.fillRect(10, 13, 12, 2);
      ctx.fillRect(10, 17, 12, 2);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(6, 5, 20, 2);
      ctx.fillRect(6, 25, 20, 2);
      iconCache.set(cacheKey, canvas.toDataURL());
      return;
    }

    const spriteKey = (item as any).baseId || item.id;
    const spriteData = item.type === 'weapon' 
      ? WEAPON_SPRITES[spriteKey] || WEAPON_SPRITES[item.id] || WEAPON_SPRITES['w_wood_sword'] 
      : ARMOR_SPRITES[spriteKey] || ARMOR_SPRITES[item.id] || ARMOR_SPRITES['a_cloth'];
    
    if (spriteData) {
      if (item.type === 'weapon') {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 4);
        drawIconSprite(ctx, spriteData, -16, -16, 2);
        ctx.restore();
      } else {
        drawIconSprite(ctx, spriteData, 0, 0, 2);
      }
    }
    iconCache.set(cacheKey, canvas.toDataURL());
  }, [cacheKey, cachedUrl, item]);

  if (cachedUrl) {
    return (
      <img
        src={cachedUrl}
        alt={item.name}
        style={{ width: size, height: size, imageRendering: 'pixelated' }}
        className="rounded-sm pixel-panel p-0 bg-slate-800 flex-shrink-0"
        loading="lazy"
      />
    );
  }

  return (
    <canvas 
      ref={canvasRef} 
      width={32} 
      height={32} 
      style={{ width: size, height: size, imageRendering: 'pixelated' }} 
      className="rounded-sm pixel-panel p-0 bg-slate-800 flex-shrink-0" 
    />
  );
});

interface InventoryProps {
  inventory: PlayerItem[];
  equipment: EquipmentState;
  gold: number;
  job?: JobType;
  maxStage?: number;
  playerName?: string;
  onEquip: (slot: keyof EquipmentState, itemId: string) => void;
  onBuyItem: (itemId: string, price: number) => void;
  onBuyDailyItem?: (item: DailyShopItem) => void;
  onBatchBuyItem?: (itemId: string, quantity: number, unitPrice: number) => void;
  onBatchBuyDailyItems?: (dailyItemsToBuy: DailyShopItem[]) => void;
  soldOutDailyItemIds?: string[];
  onEnchantItem: (uid: string, cost: number, newEffect: PlayerItem) => void;
  onLimitBreak?: (uid1: string, uid2: string) => void;
  onBatchLimitBreak?: (targetUid: string, consumedUids: string[]) => void;
  onSpecialEnchant?: (uid: string, materialUid: string, cost: number, newEffect: PlayerItem) => void;
  onBatchSpecialEnchant?: (uid: string, consumedMaterialUids: string[], cost: number, newEffect: PlayerItem) => void;
  onSellItem?: (uid: string, sellPrice: number) => void;
  onBatchSellItems?: (uids: string[], totalSellPrice: number) => void;
  onDismantleItem?: (uid: string) => void;
  onToggleLock?: (uid: string) => void;
  onUncurseItem?: (uid: string, cost: number) => void;
  onOpenChest?: (item: PlayerItem) => void;
  onCraftItem?: (recipeId: string) => void;
  onUseConsumable?: (uid: string) => void;
  onOpenSocket?: (uid: string) => void;
  onInsertGem?: (weaponUid: string, gemUid: string) => void;
  guildName?: string;
  onEngraveItem?: (uid: string, guildName: string) => void;
  onTransferEnhancements?: (sourceUid: string, targetUid: string, scrollUid: string) => void;
  isQuestActive?: boolean;
}

export const Inventory: React.FC<InventoryProps> = ({
  inventory,
  equipment,
  gold,
  job = 'balanced' as JobType,
  maxStage = 1,
  playerName = '名無し勇者',
  onEquip,
  onBuyItem,
  onBuyDailyItem,
  onBatchBuyItem,
  onBatchBuyDailyItems,
  soldOutDailyItemIds = [],
  onEnchantItem,
  onLimitBreak,
  onBatchLimitBreak,
  onSpecialEnchant,
  onBatchSpecialEnchant,
  onSellItem,
  onBatchSellItems,
  onDismantleItem,
  onToggleLock,
  onUncurseItem,
  onOpenChest,
  onCraftItem,
  onUseConsumable,
  onOpenSocket,
  onInsertGem,
  onTransferEnhancements,
  isQuestActive = false,
  guildName,
  onEngraveItem,
}) => {
  const [tab, setTab] = useState<'inventory' | 'shop' | 'dailyShop' | 'forge' | 'craft' | 'materials'>('inventory');
  const [selectedMaterialUid, setSelectedMaterialUid] = useState<string>('');
  const [detailPlayerItem, setDetailPlayerItem] = useState<PlayerItem | null>(null);
  const [dismantleConfirmItem, setDismantleConfirmItem] = useState<{ item: PlayerItem; gameItem: GameItem } | null>(null);
  const [uncurseConfirmItem, setUncurseConfirmItem] = useState<{ item: PlayerItem; gameItem: GameItem; cost: number } | null>(null);
  const [transferScrollUid, setTransferScrollUid] = useState<string | null>(null);
  const [transferSourceUid, setTransferSourceUid] = useState<string>('');
  const [transferTargetUid, setTransferTargetUid] = useState<string>('');

  // Bulk Actions State
  const [batchSellMode, setBatchSellMode] = useState<boolean>(false);
  const [selectedSellUids, setSelectedSellUids] = useState<string[]>([]);
  const [shopQuantities, setShopQuantities] = useState<Record<string, number>>({});
  const [specialEnchantQty, setSpecialEnchantQty] = useState<number>(1);
  
  const todayStr = getTodayDateString();
  const dailyItems = useMemo(() => generateDailyShopItems(todayStr), [todayStr]);

  const { ownedItems, weapons, armors, materials, chests, nonEquipItems } = useMemo(() => {
    const owned = inventory.map(pItem => getCompiledItem(pItem)).filter(Boolean) as GameItem[];
    const weps = owned.filter(item => item.type === 'weapon');
    const arms = owned.filter(item => item.type === 'armor');
    const mats = inventory.filter(i => ITEMS[i.baseId]?.type === 'material');
    const chs = inventory.filter(i => ITEMS[i.baseId]?.type === 'chest');
    const nonEq = inventory.filter(i => {
      const type = ITEMS[i.baseId]?.type;
      return type === 'material' || type === 'chest' || type === 'gem' || type === 'consumable';
    });

    return {
      ownedItems: owned,
      weapons: weps,
      armors: arms,
      materials: mats,
      chests: chs,
      nonEquipItems: nonEq,
    };
  }, [inventory]);

  // ショップにはベースアイテムが並ぶ (素材・宝箱・呪い装備・クラフト限定品は除外)
  const shopItems = useMemo(() => {
    return Object.values(ITEMS).filter(item => 
      item.type === 'weapon' || item.type === 'armor' || item.id === 'c_transfer_scroll'
    ).filter(item => 
      item.price > 0 && 
      !item.isCursed && 
      !item.effect?.isCursed &&
      !isCraftExclusiveItem(item)
    );
  }, []);

  // Initialize selected material if none is selected
  useEffect(() => {
    if (materials.length > 0 && !materials.find(m => m.uid === selectedMaterialUid)) {
      setSelectedMaterialUid(materials[0].uid);
    }
  }, [materials, selectedMaterialUid]);

  // --- 一括売却関連ヘルパー ---
  const selectedSellTotalPrice = useMemo(() => {
    return selectedSellUids.reduce((sum, uid) => {
      const item = inventory.find(i => i.uid === uid);
      if (!item) return sum;
      return sum + calculateSellPrice(item, job);
    }, 0);
  }, [selectedSellUids, inventory, job]);

  const toggleSelectSell = (uid: string) => {
    const item = inventory.find(i => i.uid === uid);
    if (!item || item.isLocked || equipment.statWeaponId === uid || equipment.statArmorId === uid) return;

    setSelectedSellUids(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectAllUnusedEquip = () => {
    const valid = inventory.filter(i => {
      const type = ITEMS[i.baseId]?.type;
      const isEquip = type === 'weapon' || type === 'armor';
      const isEquipped = equipment.statWeaponId === i.uid || equipment.statArmorId === i.uid;
      return isEquip && !i.isLocked && !isEquipped;
    }).map(i => i.uid);
    setSelectedSellUids(valid);
  };

  const handleSelectAllUnenhanced = () => {
    const valid = inventory.filter(i => {
      const type = ITEMS[i.baseId]?.type;
      const isEquip = type === 'weapon' || type === 'armor';
      const isEquipped = equipment.statWeaponId === i.uid || equipment.statArmorId === i.uid;
      const isClean = i.upgradeLevel === 0 && (!i.limitBreak || i.limitBreak === 0) && (!i.specialEnchantCount || i.specialEnchantCount === 0) && (i.addedPower === 0);
      return isEquip && !i.isLocked && !isEquipped && isClean;
    }).map(i => i.uid);
    setSelectedSellUids(valid);
  };

  const handleSelectAllDuplicates = () => {
    const groups: Record<string, PlayerItem[]> = {};
    inventory.forEach(i => {
      const type = ITEMS[i.baseId]?.type;
      if (type === 'weapon' || type === 'armor') {
        if (!groups[i.baseId]) groups[i.baseId] = [];
        groups[i.baseId].push(i);
      }
    });

    const selected: string[] = [];
    Object.values(groups).forEach(items => {
      if (items.length <= 1) return;
      const sorted = [...items].sort((a, b) => {
        const aEq = equipment.statWeaponId === a.uid || equipment.statArmorId === a.uid;
        const bEq = equipment.statWeaponId === b.uid || equipment.statArmorId === b.uid;
        if (aEq && !bEq) return -1;
        if (!aEq && bEq) return 1;
        if (a.isLocked && !b.isLocked) return -1;
        if (!a.isLocked && b.isLocked) return 1;
        const aPower = a.upgradeLevel * 3 + (a.limitBreak || 0) * 5 + a.addedPower;
        const bPower = b.upgradeLevel * 3 + (b.limitBreak || 0) * 5 + b.addedPower;
        return bPower - aPower;
      });

      for (let idx = 1; idx < sorted.length; idx++) {
        const it = sorted[idx];
        const isEq = equipment.statWeaponId === it.uid || equipment.statArmorId === it.uid;
        if (!it.isLocked && !isEq) {
          selected.push(it.uid);
        }
      }
    });

    setSelectedSellUids(selected);
  };

  const handleSelectAllMaterials = () => {
    const valid = inventory.filter(i => {
      const type = ITEMS[i.baseId]?.type;
      return (type === 'material' || type === 'gem') && !i.isLocked;
    }).map(i => i.uid);
    setSelectedSellUids(valid);
  };

  const totalBatchSellPrice = useMemo(() => {
    return selectedSellUids.reduce((sum, uid) => {
      const item = inventory.find(i => i.uid === uid);
      return sum + (item ? calculateSellPrice(item, job) : 0);
    }, 0);
  }, [selectedSellUids, inventory, job]);

  const handleExecuteBatchSell = () => {
    if (!selectedSellUids.length) return;
    if (onBatchSellItems) {
      onBatchSellItems(selectedSellUids, totalBatchSellPrice);
    } else {
      selectedSellUids.forEach(uid => {
        const it = inventory.find(i => i.uid === uid);
        if (it && onSellItem) onSellItem(uid, calculateSellPrice(it, job));
      });
    }
    setSelectedSellUids([]);
  };

  const handleEnchant = (pItem: PlayerItem) => {
    const cost = 200 + pItem.upgradeLevel * 100;
    if (gold < cost) return;

    const addedPower = pItem.addedPower + Math.floor(Math.random() * 3) + 1;
    const newLevel = pItem.upgradeLevel + 1;
    
    const prefixes = ['鋭利な', '炎の', '伝説の', '祝福された', '呪われた', '名工の', '神聖なる'];
    const customPrefix = newLevel % 3 === 0 ? prefixes[Math.floor(Math.random() * prefixes.length)] : pItem.customPrefix;

    onEnchantItem(pItem.uid, cost, {
      ...pItem,
      upgradeLevel: newLevel,
      addedPower,
      customPrefix,
    });
  };

  const handleLimitBreakClick = (pItem: PlayerItem) => {
    if (!onLimitBreak) return;
    const duplicate = inventory.find(i => i.uid !== pItem.uid && i.baseId === pItem.baseId);
    if (duplicate) {
      onLimitBreak(pItem.uid, duplicate.uid);
    }
  };

  const handleSpecialEnchantClick = (pItem: PlayerItem) => {
    if (!onSpecialEnchant || !selectedMaterialUid) return;
    
    const mat = materials.find(m => m.uid === selectedMaterialUid);
    if (!mat) return;
    
    const baseMatItem = ITEMS[mat.baseId];
    if (!baseMatItem) return;

    const cost = 0; // ゴールド費用無料
    const addedPower = pItem.addedPower + Math.floor(Math.random() * 5) + 3; // +3~7 power
    
    const prevEffect: ItemEffect = pItem.addedEffect || { description: '' };
    let matEffect: ItemEffect = { ...prevEffect };
    let prefix = prevEffect.description ? 'キメラの' : '神秘の';

    if (mat.baseId === 'm_slime_jelly') {
      prefix = prevEffect.description ? 'キメラの' : '粘性の';
      matEffect.enemySlowRate = Math.min(0.90, (matEffect.enemySlowRate || 0) + 0.15);
    } else if (mat.baseId === 'm_goblin_ear') {
      prefix = prevEffect.description ? 'キメラの' : '野蛮な';
      matEffect.critChance = Math.min(1.0, (matEffect.critChance || 0) + 0.05);
    } else if (mat.baseId === 'm_orc_fang') {
      prefix = prevEffect.description ? 'キメラの' : '豪傑の';
      matEffect.lifesteal = Math.min(1.0, (matEffect.lifesteal || 0) + 0.03);
    } else if (mat.baseId === 'm_demon_horn') {
      prefix = prevEffect.description ? 'キメラの' : '魔性の';
      matEffect.hpRegen = (matEffect.hpRegen || 0) + 2;
      matEffect.damageMultiplier = (matEffect.damageMultiplier || 0) + 0.05;
    } else if (mat.baseId === 'm_dragon_scale') {
      prefix = prevEffect.description ? 'キメラの' : '覇竜の';
      matEffect.maxHpBonus = (matEffect.maxHpBonus || 0) + 30;
      matEffect.goldBonus = (matEffect.goldBonus || 0) + 0.10;
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

    const newEffect: PlayerItem = {
      ...pItem,
      addedPower,
      specialEnchantCount: (pItem.specialEnchantCount || 0) + 1,
      customPrefix: prefix,
      addedEffect: matEffect,
    };

    onSpecialEnchant(pItem.uid, selectedMaterialUid, cost, newEffect);
  };

  const renderInventoryCard = (item: GameItem) => {
    const pItem = inventory.find(i => i.uid === item.id)!;
    const isStatEq = equipment.statWeaponId === item.id || equipment.statArmorId === item.id;
    const isAppEq = equipment.appearanceWeaponId === pItem.baseId || equipment.appearanceArmorId === pItem.baseId;

    const statSlot: keyof EquipmentState = item.type === 'weapon' ? 'statWeaponId' : 'statArmorId';
    const appSlot: keyof EquipmentState = item.type === 'weapon' ? 'appearanceWeaponId' : 'appearanceArmorId';

    // Find duplicates for Limit Break
    const duplicate = inventory.find(i => i.uid !== pItem.uid && i.baseId === pItem.baseId);
    const sellPrice = calculateSellPrice(pItem, job);
    const isEnchanted = pItem.upgradeLevel > 0 || (pItem.limitBreak && pItem.limitBreak > 0) || pItem.addedPower > 0;
    const specialCount = pItem.specialEnchantCount || 0;
    const baseItemDef = ITEMS[pItem.baseId];
    const isCursedItem = (item.isCursed || baseItemDef?.isCursed) && !pItem.isUncursed;
    const uncurseCost = calculateUncurseCost(pItem, job);

    let cardBorderColor = "border-slate-700";
    let cardShadow = "";
    let cardBg = "bg-slate-900/90";
    
    if ((pItem.limitBreak || 0) >= 1) {
      cardBorderColor = "border-rose-500";
      cardBg = "bg-slate-950";
      cardShadow = "shadow-[0_0_15px_rgba(244,63,94,0.4)]";
    } else if (pItem.upgradeLevel >= 15) {
      cardBorderColor = "border-fuchsia-500";
      cardBg = "bg-slate-950";
      cardShadow = "shadow-[0_0_12px_rgba(217,70,239,0.4)]";
    } else if (pItem.upgradeLevel >= 10) {
      cardBorderColor = "border-amber-400";
      cardShadow = "shadow-[0_0_10px_rgba(251,191,36,0.3)]";
    } else if (pItem.upgradeLevel >= 5) {
      cardBorderColor = "border-sky-400";
      cardShadow = "shadow-[0_0_8px_rgba(56,189,248,0.2)]";
    } else if (pItem.upgradeLevel >= 1 || (pItem.addedPower || 0) > 0) {
      cardBorderColor = "border-emerald-500";
      cardShadow = "shadow-[0_0_5px_rgba(16,185,129,0.15)]";
    } else if (pItem.baseId.includes('craft')) {
      cardBorderColor = "border-amber-600";
      cardShadow = "shadow-[0_0_8px_rgba(217,119,6,0.3)]";
    }

    const isSelectedForSell = selectedSellUids.includes(pItem.uid);
    const canSelectForSell = !isStatEq && !pItem.isLocked && !isQuestActive;

    return (
      <div 
        key={item.id} 
        onClick={() => {
          if (batchSellMode && canSelectForSell) {
            toggleSelectSell(pItem.uid);
          }
        }}
        className={`pixel-panel flex flex-col gap-2 border-2 ${cardBg} ${cardBorderColor} ${cardShadow} relative transition-all duration-300 hover:scale-[1.01] ${
          batchSellMode ? (canSelectForSell ? 'cursor-pointer hover:border-amber-400' : 'opacity-60 cursor-not-allowed') : ''
        } ${isSelectedForSell ? '!border-amber-400 !bg-amber-950/60 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {batchSellMode && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={isSelectedForSell}
                  onChange={() => toggleSelectSell(pItem.uid)}
                  disabled={!canSelectForSell}
                  className="w-4 h-4 accent-amber-400 cursor-pointer rounded"
                />
              </div>
            )}
            <ItemIcon item={{ ...item, id: pItem.baseId }} />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-slate-100">{item.name}</span>
                {specialCount > 0 && (
                  <span className="text-[9px] bg-purple-900/90 text-purple-200 border border-purple-600 px-1 py-0.2 rounded font-extrabold">
                    ★特殊強化 {specialCount}回
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">
                {item.type === 'weapon' ? '攻撃力' : '防御力'}: <span className="text-amber-400 font-bold">+{item.power}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onToggleLock && onToggleLock(pItem.uid)}
              className="pixel-btn text-[10px] !py-1 !px-2.5 active hover:!bg-slate-700"
              title="ロックして売却・分解を防止"
            >
              {pItem.isLocked ? '🔒' : '🔓'}
            </button>
            <button
              onClick={() => setDetailPlayerItem(pItem)}
              className="pixel-btn text-[10px] !py-1 !px-2.5 active !border-sky-400 !text-sky-300 hover:!bg-sky-950"
            >
              🔍 詳細
            </button>
          </div>
        </div>

        {item.effect && (
          <div className="text-[11px] text-sky-300 bg-slate-950 p-2 border border-slate-800 rounded">
            ✨ {item.effect.description}
          </div>
        )}

        {tab === 'inventory' ? (
          <div className="flex flex-col gap-2 mt-1" onClick={e => e.stopPropagation()}>
            <div className="flex gap-2">
              <button
                onClick={() => onEquip(statSlot, item.id)}
                disabled={isStatEq || isQuestActive}
                className={`pixel-btn text-xs flex-1 ${isStatEq ? 'active !border-emerald-400 !text-emerald-300' : ''} ${isQuestActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isStatEq ? '能力: 装備中' : '能力を装備'}
              </button>
              <button
                onClick={() => onEquip(appSlot, pItem.baseId)}
                disabled={isAppEq || isQuestActive}
                className={`pixel-btn text-xs flex-1 ${isAppEq ? 'active !border-purple-400 !text-purple-300' : ''} ${isQuestActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isAppEq ? '見た目: 装備中' : '見た目を装備'}
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs">
              <span className="text-[10px] text-slate-400">売却価格: <span className="text-amber-300 font-bold">🪙 {sellPrice} G</span></span>
              <button
                onClick={() => onSellItem && onSellItem(pItem.uid, sellPrice)}
                disabled={isStatEq || isQuestActive || pItem.isLocked}
                className="pixel-btn text-[10px] !py-1 !px-3 active !border-amber-400 disabled:opacity-40"
              >
                {isStatEq ? '装備中不可' : pItem.isLocked ? 'ロック中' : '💰 売却する'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-slate-800" onClick={e => e.stopPropagation()}>
            {/* Uncurse Section if Cursed */}
            {isCursedItem && (
              <div className="flex items-center justify-between bg-purple-950/80 p-2 border border-purple-700 rounded">
                <div>
                  <div className="text-[11px] text-purple-300 font-bold flex items-center gap-1">
                    <span>✝️ 呪いを解除 (解呪)</span>
                  </div>
                  <div className="text-[10px] text-purple-200/80">
                    費用: <span className="text-amber-300 font-bold">🪙 {uncurseCost.toLocaleString()} G</span>
                    <span className="text-[9px] text-purple-300/80 ml-1">(毎秒HPドレインを浄化)</span>
                  </div>
                </div>
                <button
                  onClick={() => setUncurseConfirmItem({ item: pItem, gameItem: item, cost: uncurseCost })}
                  disabled={gold < uncurseCost || isQuestActive}
                  className="pixel-btn text-[10px] !py-1 !px-3 active !bg-purple-800 !text-purple-100 !border-purple-400 hover:!bg-purple-700 disabled:opacity-40 font-bold"
                >
                  ✝️ 解呪する
                </button>
              </div>
            )}

            {/* Basic Enchant with Batch Enhancements (+1, +5, +10, MAX) */}
            <div className="flex flex-col gap-1.5 bg-slate-950 p-2 border border-slate-800 rounded">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold">基本強化 (現在 Lv.{pItem.upgradeLevel})</span>
                <span className="text-[10px] text-amber-300 font-bold">次: 🪙 {(200 + pItem.upgradeLevel * 100).toLocaleString()} G</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(() => {
                  const cost1 = 200 + pItem.upgradeLevel * 100;
                  const cost5 = calculateBatchEnchantCost(pItem.upgradeLevel, 5);
                  const cost10 = calculateBatchEnchantCost(pItem.upgradeLevel, 10);
                  const { maxLevels, totalCost: maxCost } = calculateMaxEnchantLevels(pItem.upgradeLevel, gold);

                  const formatCost = (c: number) => c >= 10000 ? `${(c/1000).toFixed(0)}k` : c >= 1000 ? `${(c/1000).toFixed(1)}k` : `${c}`;

                  return (
                    <>
                      <button
                        onClick={() => {
                          const { updatedItem, totalCost } = performBatchEnchant(pItem, 1);
                          onEnchantItem(pItem.uid, totalCost, updatedItem);
                        }}
                        disabled={gold < cost1 || isQuestActive}
                        className="pixel-btn text-[10px] !py-1 active !border-rose-400 disabled:opacity-40"
                        title={`1回強化 (費用: 🪙${cost1.toLocaleString()}G)`}
                      >
                        +1 ({formatCost(cost1)})
                      </button>
                      <button
                        onClick={() => {
                          const { updatedItem, totalCost } = performBatchEnchant(pItem, 5);
                          onEnchantItem(pItem.uid, totalCost, updatedItem);
                        }}
                        disabled={gold < cost5 || isQuestActive}
                        className="pixel-btn text-[10px] !py-1 active !border-rose-400 !bg-rose-950/40 hover:!bg-rose-900 disabled:opacity-40 font-bold"
                        title={`5回まとめ強化 (費用: 🪙${cost5.toLocaleString()}G)`}
                      >
                        +5 ({formatCost(cost5)})
                      </button>
                      <button
                        onClick={() => {
                          const { updatedItem, totalCost } = performBatchEnchant(pItem, 10);
                          onEnchantItem(pItem.uid, totalCost, updatedItem);
                        }}
                        disabled={gold < cost10 || isQuestActive}
                        className="pixel-btn text-[10px] !py-1 active !border-amber-400 !bg-amber-950/40 hover:!bg-amber-900 disabled:opacity-40 font-bold"
                        title={`10回まとめ強化 (費用: 🪙${cost10.toLocaleString()}G)`}
                      >
                        +10 ({formatCost(cost10)})
                      </button>
                      <button
                        onClick={() => {
                          if (maxLevels <= 0) return;
                          const { updatedItem, totalCost } = performBatchEnchant(pItem, maxLevels);
                          onEnchantItem(pItem.uid, totalCost, updatedItem);
                        }}
                        disabled={maxLevels <= 0 || isQuestActive}
                        className="pixel-btn text-[10px] !py-1 active !border-emerald-400 !bg-emerald-950/60 hover:!bg-emerald-900 text-emerald-200 disabled:opacity-40 font-black"
                        title={`所持金で最大強化 (+${maxLevels}回 / 費用: 🪙${maxCost.toLocaleString()}G)`}
                      >
                        MAX{maxLevels > 0 ? `(+${maxLevels})` : ''}
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Limit Break / Merge (1凸 or 一括合体) */}
            {(() => {
              const duplicates = inventory.filter(i => 
                i.uid !== pItem.uid && 
                i.baseId === pItem.baseId && 
                !i.isLocked && 
                equipment.statWeaponId !== i.uid && 
                equipment.statArmorId !== i.uid
              );

              return (
                <div className="flex items-center justify-between border-t border-slate-800/50 pt-2 flex-wrap gap-1">
                  <div className="text-[10px] text-slate-400">
                    同名装備合体 ({duplicates.length}個 所持)
                  </div>
                  <div className="flex items-center gap-1">
                    {duplicates.length > 0 && (
                      <button
                        onClick={() => {
                          if (onLimitBreak) onLimitBreak(pItem.uid, duplicates[0].uid);
                        }}
                        disabled={isQuestActive}
                        className="pixel-btn text-[10px] !py-1 active disabled:opacity-40"
                      >
                        +1凸
                      </button>
                    )}
                    {duplicates.length > 1 && (
                      <button
                        onClick={() => {
                          if (onBatchLimitBreak) {
                            onBatchLimitBreak(pItem.uid, duplicates.map(d => d.uid));
                          } else if (onLimitBreak) {
                            duplicates.forEach(d => onLimitBreak(pItem.uid, d.uid));
                          }
                        }}
                        disabled={isQuestActive}
                        className="pixel-btn text-[10px] !py-1 active !bg-rose-900 !text-rose-100 !border-rose-400 hover:!bg-rose-800 disabled:opacity-40 font-bold"
                      >
                        🔨 全{duplicates.length}個一括合体 (+{duplicates.length}凸)
                      </button>
                    )}
                    {duplicates.length === 0 && (
                      <span className="text-[10px] text-slate-600">合体可能品なし</span>
                    )}
                  </div>
                </div>
              );
            })()}
            
            {/* Special Enchant with Material Batch */}
            <div className="flex flex-col gap-1.5 bg-slate-950 p-2 border border-slate-800 rounded mt-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-slate-400">素材で特殊強化 (ゴールド不要)</span>
                <span className="text-[10px] text-purple-300 font-bold bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800">
                  累計 {specialCount}回 強化済
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedMaterialUid} 
                  onChange={e => setSelectedMaterialUid(e.target.value)}
                  className="bg-slate-900 text-[10px] text-slate-200 border border-slate-700 rounded p-1 flex-1"
                >
                  <option value="" disabled>素材を選択</option>
                  {materials.map(m => {
                    const baseMat = ITEMS[m.baseId];
                    const count = materials.filter(mat => mat.baseId === m.baseId).length;
                    return (
                      <option key={m.uid} value={m.uid}>{baseMat?.name} (所持: {count}個)</option>
                    );
                  })}
                </select>
              </div>

              {selectedMaterialUid && (() => {
                const selMat = materials.find(m => m.uid === selectedMaterialUid);
                if (!selMat) return null;
                const availableMats = materials.filter(m => m.baseId === selMat.baseId);
                const matCount = availableMats.length;
                const curQty = Math.min(specialEnchantQty || 1, matCount);

                const matInfo: Record<string, string> = {
                  'm_slime_jelly': `🟢 粘り属性: 敵の攻撃速度 -${Math.min(90, 15 * curQty)}% (粘液スロー)`,
                  'm_goblin_ear': `🔴 会心属性: クリティカル率 +${Math.min(100, 5 * curQty)}%`,
                  'm_orc_fang': `🟣 吸血属性: 攻撃時HP吸収 +${Math.min(100, 3 * curQty)}%`,
                  'm_demon_horn': `🟡 魔性属性: 毎秒HP回復+${2 * curQty} & 与ダメ+${5 * curQty}%`,
                  'm_dragon_scale': `🐲 覇竜属性: 最大HP+${30 * curQty} & 獲得G+${10 * curQty}%`,
                };

                return (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="text-[9px] text-purple-200 bg-purple-950/90 p-1.5 rounded border border-purple-800/90">
                      【{curQty}個消費時の付与予定】{matInfo[selMat.baseId] || '✨ 特殊効果付与'} (能力+{(3 * curQty)}〜{(7 * curQty)})
                    </div>
                    
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="text-[10px] text-slate-400">消費数:</span>
                      <div className="flex gap-1">
                        {[1, 5, 10].map(q => {
                          if (q > matCount && q !== 1) return null;
                          return (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setSpecialEnchantQty(q)}
                              className={`pixel-btn text-[9px] !py-0.5 !px-1.5 ${curQty === q ? 'active !border-purple-400 !text-purple-300' : ''}`}
                            >
                              ×{q}
                            </button>
                          );
                        })}
                        {matCount > 1 && (
                          <button
                            type="button"
                            onClick={() => setSpecialEnchantQty(matCount)}
                            className={`pixel-btn text-[9px] !py-0.5 !px-1.5 ${curQty === matCount ? 'active !border-purple-400 !text-purple-300' : ''}`}
                          >
                            全数(×{matCount})
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const toConsume = availableMats.slice(0, curQty).map(m => m.uid);
                        const updatedItem = performBatchSpecialEnchant(pItem, selMat.baseId, curQty);
                        if (onBatchSpecialEnchant) {
                          onBatchSpecialEnchant(pItem.uid, toConsume, 0, updatedItem);
                        } else if (onSpecialEnchant) {
                          onSpecialEnchant(pItem.uid, toConsume[0], 0, updatedItem);
                        }
                      }}
                      disabled={!selectedMaterialUid || matCount === 0 || isQuestActive}
                      className="pixel-btn text-[10px] !py-1 active !border-purple-400 !bg-purple-900 hover:!bg-purple-800 !text-purple-100 disabled:opacity-40 font-bold mt-0.5"
                    >
                      ✨ 特殊強化を実行 (素材 ×{curQty}個 消費)
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Forge Resale / Sell Section */}
            <div className="flex items-center justify-between bg-amber-950/30 p-2 border border-amber-800/60 rounded mt-1">
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-amber-200 font-bold">💰 鍛冶屋で売却・分解</span>
                  {isEnchanted && (
                    <span className="text-[9px] bg-amber-800 text-amber-100 px-1 py-0.2 rounded font-bold">高価買取中!</span>
                  )}
                </div>
                <div className="text-[10px] text-amber-300/80">
                  査定額: <span className="text-amber-300 font-bold text-xs">🪙 {sellPrice} G</span>
                  {isEnchanted && <span className="text-[9px] text-amber-400/90 ml-1">(強化・凸ボーナス反映済)</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => onSellItem && onSellItem(pItem.uid, sellPrice)}
                  disabled={isStatEq || isQuestActive || pItem.isLocked}
                  className="pixel-btn text-[10px] !py-1 !px-3 active !border-amber-400 disabled:opacity-40"
                >
                  {isStatEq ? '装備中不可' : pItem.isLocked ? 'ロック中' : '売却する'}
                </button>
                <button
                  onClick={() => setDismantleConfirmItem({ item: pItem, gameItem: item })}
                  disabled={isStatEq || isQuestActive || pItem.isLocked}
                  className="pixel-btn text-[10px] !py-1 !px-3 active !bg-slate-800 !text-slate-300 hover:!bg-slate-700 disabled:opacity-40"
                >
                  {isStatEq ? '装備中不可' : pItem.isLocked ? 'ロック中' : '分解する'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderShopCard = (item: GameItem) => {
    const shopDiscountMult = getShopDiscountMultiplier(job);
    const finalPrice = Math.floor(item.price * shopDiscountMult);
    const hasJobDiscount = shopDiscountMult < 1.0;
    const qty = shopQuantities[item.id] || 1;
    const totalCost = finalPrice * qty;
    const maxAffordable = Math.max(1, Math.floor(gold / finalPrice));

    const setQty = (val: number) => {
      const sanitized = Math.max(1, Math.min(999, Math.floor(val)));
      setShopQuantities(prev => ({ ...prev, [item.id]: sanitized }));
    };

    return (
      <div key={item.id} className="pixel-panel flex flex-col gap-2 bg-slate-900/90 border-2 border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ItemIcon item={item} />
            <span className="text-sm font-bold text-slate-100">{item.name}</span>
          </div>
          <span className="text-xs text-amber-400 font-bold">
            {item.type === 'weapon' ? `攻撃力 ${item.power}` : item.type === 'armor' ? `防御力 ${item.power}` : ''}
          </span>
        </div>
        {item.effect && (
          <div className="text-[11px] text-sky-300 bg-slate-950 p-2 border border-slate-800 rounded">
            ✨ {item.effect.description}
          </div>
        )}

        {/* Quantity Controls & Bulk Buy */}
        <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-amber-300 font-bold">🪙 {finalPrice} G</span>
              {hasJobDiscount && (
                <span className="text-[10px] text-slate-500 line-through">🪙 {item.price} G</span>
              )}
              {hasJobDiscount && (
                <span className="text-[9px] bg-emerald-900 text-emerald-300 px-1 py-0.2 rounded font-bold border border-emerald-600">
                  特化割引
                </span>
              )}
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
              <button
                type="button"
                onClick={() => setQty(qty - 1)}
                disabled={qty <= 1}
                className="pixel-btn text-[10px] !py-0.5 !px-1.5 disabled:opacity-30"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                max={999}
                value={qty}
                onChange={e => setQty(parseInt(e.target.value) || 1)}
                className="w-10 text-center bg-slate-900 text-slate-200 text-xs font-bold border border-slate-700 rounded py-0.5"
              />
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                className="pixel-btn text-[10px] !py-0.5 !px-1.5"
              >
                +
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex gap-1">
              {[1, 5, 10].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQty(preset)}
                  className={`pixel-btn text-[9px] !py-0.5 !px-1.5 ${qty === preset ? 'active !border-amber-400 !text-amber-300' : ''}`}
                >
                  {preset}個
                </button>
              ))}
              <button
                type="button"
                onClick={() => setQty(maxAffordable)}
                className={`pixel-btn text-[9px] !py-0.5 !px-1.5 ${qty === maxAffordable ? 'active !border-amber-400 !text-amber-300' : ''}`}
              >
                MAX({maxAffordable}個)
              </button>
            </div>

            <button
              onClick={() => {
                if (qty === 1) {
                  onBuyItem(item.id, finalPrice);
                } else if (onBatchBuyItem) {
                  onBatchBuyItem(item.id, qty, finalPrice);
                } else {
                  for (let i = 0; i < qty; i++) onBuyItem(item.id, finalPrice);
                }
              }}
              disabled={gold < totalCost || isQuestActive}
              className="pixel-btn text-xs active !border-amber-400 !bg-amber-950/60 hover:!bg-amber-900 font-bold disabled:opacity-40 !py-1 !px-3"
            >
              {qty > 1 ? `🛒 ${qty}個購入 (🪙${totalCost.toLocaleString()}G)` : '購入する'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDailyShopCard = (item: DailyShopItem) => {
    const baseItem = ITEMS[item.baseId];
    if (!baseItem) return null;

    const shopDiscountMult = getShopDiscountMultiplier(job);
    const finalPrice = Math.floor(item.price * shopDiscountMult);
    const hasJobDiscount = shopDiscountMult < 1.0;

    const isSoldOut = soldOutDailyItemIds.includes(item.shopItemId) || item.isSoldOut;
    const isCursed = item.isCursed || baseItem.isCursed;

    let displayName = baseItem.name;
    if (item.customPrefix) displayName = `${item.customPrefix}${displayName}`;
    if (isCursed && !displayName.startsWith('💀')) displayName = `💀${displayName}`;
    if (item.upgradeLevel > 0) displayName = `${displayName} Lv.${item.upgradeLevel}`;

    const totalPower = baseItem.power + item.addedPower + item.upgradeLevel * 3;

    return (
      <div
        key={item.shopItemId}
        className={`pixel-panel flex flex-col gap-2 relative transition-all ${
          isCursed
            ? 'bg-purple-950/40 border-2 border-purple-600/80 shadow-[0_0_15px_rgba(147,51,234,0.25)]'
            : 'bg-slate-900/90 border-2 border-slate-700'
        } ${isSoldOut ? 'opacity-50 grayscale' : ''}`}
      >
        {item.discountPercent > 0 && !isSoldOut && (
          <div className="absolute -top-2.5 -right-2 bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded shadow-md z-10 border border-rose-400 animate-pulse">
            {item.discountPercent}% OFF
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ItemIcon item={{ ...baseItem, id: item.baseId }} />
            <div>
              <div className="flex items-center gap-1">
                {isCursed && <span className="text-xs text-purple-400 font-extrabold">【呪い】</span>}
                <span className={`text-sm font-bold ${isCursed ? 'text-purple-300' : 'text-slate-100'}`}>
                  {displayName}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                {baseItem.type === 'weapon' ? '攻撃力' : baseItem.type === 'armor' ? '防御力' : 'アイテム'}: <span className="text-amber-300 font-bold">+{totalPower}</span>
              </div>
            </div>
          </div>
        </div>

        {baseItem.effect && (
          <div className={`text-[11px] p-2 border rounded ${isCursed ? 'text-purple-200 bg-purple-950/80 border-purple-800' : 'text-sky-300 bg-slate-950 border-slate-800'}`}>
            {isCursed ? '💀 ' : '✨ '}{baseItem.effect.description}
          </div>
        )}

        {isCursed && (
          <div className="text-[10px] text-rose-400 font-bold bg-rose-950/60 p-1.5 border border-rose-800/80 rounded flex items-center gap-1">
            <span>⚠️ 圧倒的威力と引き換えに毎秒HPドレイン・デバフの呪いが発動！</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-300 font-bold">🪙 {finalPrice} G</span>
            {item.price > finalPrice && (
              <span className="text-[10px] text-slate-500 line-through">🪙 {item.price} G</span>
            )}
            {hasJobDiscount && (
              <span className="text-[9px] bg-emerald-900 text-emerald-300 px-1 py-0.2 rounded font-bold border border-emerald-600">
                特化割引
              </span>
            )}
          </div>
          <button
            onClick={() => onBuyDailyItem && onBuyDailyItem({ ...item, price: finalPrice })}
            disabled={gold < finalPrice || isSoldOut || isQuestActive}
            className={`pixel-btn text-xs active disabled:opacity-40 ${
              isCursed
                ? '!bg-purple-700 !text-purple-100 !border-purple-400 hover:!bg-purple-600'
                : '!border-amber-400'
            }`}
          >
            {isSoldOut ? '売切れ' : '購入する'}
          </button>
        </div>
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!detailPlayerItem) return null;
    const compiled = getCompiledItem(detailPlayerItem);
    const baseItem = ITEMS[detailPlayerItem.baseId];
    if (!baseItem || !compiled) return null;

    const isStatEq = equipment.statWeaponId === detailPlayerItem.uid || equipment.statArmorId === detailPlayerItem.uid;
    const isAppEq = equipment.appearanceWeaponId === detailPlayerItem.baseId || equipment.appearanceArmorId === detailPlayerItem.baseId;

    const statSlot: keyof EquipmentState = compiled.type === 'weapon' ? 'statWeaponId' : 'statArmorId';
    const appSlot: keyof EquipmentState = compiled.type === 'weapon' ? 'appearanceWeaponId' : 'appearanceArmorId';
    const sellPrice = calculateSellPrice(detailPlayerItem, job);

    const basePrice = baseItem.price || 100;
    const halfBase = Math.floor(basePrice * 0.5);
    const enchantBonus = detailPlayerItem.upgradeLevel > 0 ? Math.floor(basePrice * 0.20 * detailPlayerItem.upgradeLevel) : 0;
    const limitBreakBonus = (detailPlayerItem.limitBreak || 0) > 0 ? Math.floor(basePrice * 0.50 * detailPlayerItem.limitBreak!) : 0;
    const specialEnchantBonus = (detailPlayerItem.specialEnchantCount || 0) > 0 ? Math.floor(basePrice * 0.30 * detailPlayerItem.specialEnchantCount!) : 0;
    const addedPowerBonus = detailPlayerItem.addedPower > 0 ? detailPlayerItem.addedPower * 12 : 0;
    const specialCount = detailPlayerItem.specialEnchantCount || 0;
    const isCursedDetail = (compiled.isCursed || baseItem.isCursed) && !detailPlayerItem.isUncursed;
    const uncurseDetailCost = calculateUncurseCost(detailPlayerItem, job);

    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="pixel-panel max-w-md w-full bg-slate-900 border-2 border-amber-400 p-4 relative shadow-[0_0_30px_rgba(245,158,11,0.3)] max-h-[90vh] overflow-y-auto">
          <button
            onClick={() => setDetailPlayerItem(null)}
            className="absolute top-2 right-2 text-slate-400 hover:text-white text-lg font-bold px-2 py-0.5 rounded"
          >
            ✕
          </button>

          <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-3">
            <ItemIcon item={{ ...compiled, id: detailPlayerItem.baseId }} size={48} />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-base font-bold text-slate-100">{compiled.name}</span>
                {detailPlayerItem.engraving && (
                  <span className="text-[10px] bg-slate-800 text-indigo-300 border border-slate-600 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                    🛡️ {detailPlayerItem.engraving}
                  </span>
                )}
                {compiled.isCursed && (
                  <span className="text-xs bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded border border-purple-700 font-extrabold">
                    💀 呪い装備
                  </span>
                )}
                {specialCount > 0 && (
                  <span className="text-[10px] bg-purple-900 text-purple-200 border border-purple-600 px-1.5 py-0.5 rounded font-bold">
                    ★ 特殊強化 {specialCount}回
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                <span>種別: {compiled.type === 'weapon' ? '⚔️ 武器' : '🛡️ 防具'}</span>
                <span>(ベース: {baseItem.name})</span>
              </div>
            </div>
          </div>

          {/* ステータス内訳 */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800 mb-3">
            <h4 className="text-xs font-bold text-amber-300 mb-2 border-b border-slate-800 pb-1">📊 能力値・強化ステータス詳細</h4>
            
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">基本{compiled.type === 'weapon' ? '攻撃力' : '防御力'}</div>
                <div className="text-sm font-bold text-slate-200">+{baseItem.power}</div>
              </div>
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">基本強化 (Lv.{detailPlayerItem.upgradeLevel})</div>
                <div className="text-sm font-bold text-rose-300">+{detailPlayerItem.upgradeLevel * 3}</div>
              </div>
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-purple-300 font-bold">★ 特殊強化 ({specialCount}回実施)</div>
                <div className="text-sm font-bold text-purple-300">+{detailPlayerItem.addedPower}</div>
              </div>
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">限界突破</div>
                <div className="text-sm font-bold text-sky-300">{(detailPlayerItem.limitBreak || 0) > 0 ? `+${detailPlayerItem.limitBreak}凸` : '未実施'}</div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-amber-950/40 p-2.5 rounded border border-amber-800/80">
              <span className="text-xs font-bold text-amber-200">🔥 総合 {compiled.type === 'weapon' ? '攻撃力' : '防御力'}:</span>
              <span className="text-lg font-black text-amber-300">+{compiled.power}</span>
            </div>
          </div>

          {/* 特殊効果 / 呪い */}
          {compiled.effect && (
            <div className="bg-slate-950 p-3 rounded border border-slate-800 mb-3">
              <h4 className="text-xs font-bold text-sky-300 mb-1">✨ 付与効果・スキル</h4>
              <div className="text-xs text-sky-200 leading-relaxed">
                {compiled.effect.description}
              </div>
            </div>
          )}

          {/* 査定価値 / 売却内訳 */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800 mb-3">
            <h4 className="text-xs font-bold text-amber-300 mb-2 border-b border-slate-800 pb-1">💰 鍛冶屋売却査定価格の内訳</h4>
            <div className="space-y-1 text-[11px] text-slate-300 mb-2">
              <div className="flex justify-between">
                <span className="text-slate-400">基本価格 (定価の50%):</span>
                <span>🪙 {halfBase} G</span>
              </div>
              {enchantBonus > 0 && (
                <div className="flex justify-between text-rose-300">
                  <span>基本強化ボーナス (Lv.{detailPlayerItem.upgradeLevel}):</span>
                  <span>+🪙 {enchantBonus} G</span>
                </div>
              )}
              {limitBreakBonus > 0 && (
                <div className="flex justify-between text-sky-300">
                  <span>限界突破ボーナス ({detailPlayerItem.limitBreak}凸):</span>
                  <span>+🪙 {limitBreakBonus} G</span>
                </div>
              )}
              {specialEnchantBonus > 0 && (
                <div className="flex justify-between text-purple-300">
                  <span>特殊強化ボーナス ({specialCount}回):</span>
                  <span>+🪙 {specialEnchantBonus} G</span>
                </div>
              )}
              {addedPowerBonus > 0 && (
                <div className="flex justify-between text-amber-300">
                  <span>追加能力ボーナス:</span>
                  <span>+🪙 {addedPowerBonus} G</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-xs font-bold">
              <span className="text-amber-200">合計売却査定額:</span>
              <span className="text-amber-300 text-sm font-black">🪙 {sellPrice} G</span>
            </div>
          </div>

          {/* 宝石スロット (武器のみ) */}
          {compiled.type === 'weapon' && (
            <div className="bg-slate-950 p-3 rounded border border-slate-800 mb-3">
              <h4 className="text-xs font-bold text-emerald-300 mb-2 border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>💎 宝石スロット ({detailPlayerItem.slottedGems?.length || 0}/{detailPlayerItem.unlockedSockets || 0})</span>
              </h4>
              
              <div className="space-y-2 mb-3">
                {Array.from({ length: Math.max(detailPlayerItem.unlockedSockets || 0, 1) }).map((_, idx) => {
                  if (idx >= (detailPlayerItem.unlockedSockets || 0)) return null;
                  const gemId = detailPlayerItem.slottedGems?.[idx];
                  const gem = gemId ? ITEMS[gemId] : null;
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded">
                      <div className="w-6 h-6 rounded bg-slate-950 border border-slate-700 flex items-center justify-center flex-shrink-0">
                        {gem ? '💎' : <span className="text-[10px] text-slate-600">空</span>}
                      </div>
                      <div className="flex-1 text-[10px]">
                        {gem ? (
                          <>
                            <div className="font-bold text-slate-200">{gem.name}</div>
                            <div className="text-sky-300">{gem.effect?.description}</div>
                          </>
                        ) : (
                          <div className="text-slate-500">空きスロット</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(detailPlayerItem.unlockedSockets || 0) === 0 && (
                  <div className="text-[10px] text-slate-500 text-center py-2">
                    スロットが空いていません。穴開けを行ってください。
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {/* 穴開けボタン */}
                {(detailPlayerItem.unlockedSockets || 0) < 3 && (
                  <button
                    onClick={() => {
                      if (onOpenSocket) onOpenSocket(detailPlayerItem.uid);
                      setDetailPlayerItem(null);
                    }}
                    disabled={detailPlayerItem.isLocked || isQuestActive || gold < 5000 * ((detailPlayerItem.unlockedSockets || 0) + 1)}
                    className="pixel-btn text-[10px] w-full !bg-slate-800 active disabled:opacity-40"
                  >
                    ⛏️ 穴を開ける (🪙 {5000 * ((detailPlayerItem.unlockedSockets || 0) + 1)} G / 成功率 {Math.floor((0.5 - ((detailPlayerItem.unlockedSockets || 0) * 0.15) + (job === 'artisan' ? 0.3 : 0)) * 100)}%)
                  </button>
                )}
                
                {/* 宝石をはめるセレクト (空きスロットがある場合のみ表示) */}
                {(detailPlayerItem.unlockedSockets || 0) > (detailPlayerItem.slottedGems?.length || 0) && (
                  <div className="flex gap-2">
                    <select 
                      id="gem-select"
                      className="pixel-input text-[10px] flex-1 !p-1 bg-slate-900 border border-slate-700 text-slate-300"
                    >
                      <option value="">宝石を選択...</option>
                      {inventory.filter(i => ITEMS[i.baseId]?.type === 'gem' && !i.isLocked).map(i => (
                        <option key={i.uid} value={i.uid}>{ITEMS[i.baseId].name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const select = document.getElementById('gem-select') as HTMLSelectElement;
                        if (select && select.value && onInsertGem) {
                          onInsertGem(detailPlayerItem.uid, select.value);
                          setDetailPlayerItem(null);
                        }
                      }}
                      disabled={detailPlayerItem.isLocked || isQuestActive}
                      className="pixel-btn text-[10px] !py-1 !bg-emerald-900 !text-emerald-100 !border-emerald-600 active disabled:opacity-40"
                    >
                      はめ込む
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex flex-col gap-2">
            {isCursedDetail && (
              <button
                onClick={() => {
                  setUncurseConfirmItem({ item: detailPlayerItem, gameItem: compiled, cost: uncurseDetailCost });
                }}
                disabled={gold < uncurseDetailCost || isQuestActive}
                className="pixel-btn text-xs w-full !bg-purple-900 !text-purple-100 !border-purple-400 font-bold py-2 active disabled:opacity-40"
              >
                ✝️ 呪いを解除（解呪）する (費用: 🪙 {uncurseDetailCost.toLocaleString()} G)
              </button>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  onEquip(statSlot, compiled.id);
                  setDetailPlayerItem(null);
                }}
                disabled={isStatEq || isQuestActive}
                className={`pixel-btn text-xs flex-1 ${isStatEq ? 'active !border-emerald-400 !text-emerald-300' : ''}`}
              >
                {isStatEq ? '能力: 装備中' : '能力を装備'}
              </button>
              <button
                onClick={() => {
                  onEquip(appSlot, detailPlayerItem.baseId);
                  setDetailPlayerItem(null);
                }}
                disabled={isAppEq || isQuestActive}
                className={`pixel-btn text-xs flex-1 ${isAppEq ? 'active !border-purple-400 !text-purple-300' : ''}`}
              >
                {isAppEq ? '見た目: 装備中' : '見た目を装備'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onSellItem) onSellItem(detailPlayerItem.uid, sellPrice);
                  setDetailPlayerItem(null);
                }}
                disabled={isStatEq || isQuestActive || detailPlayerItem.isLocked}
                className="pixel-btn text-xs flex-1 !border-amber-400 disabled:opacity-40"
              >
                {isStatEq ? '装備中不可' : detailPlayerItem.isLocked ? '🔒 ロック中' : `💰 🪙${sellPrice}G で売却`}
              </button>
              <button
                onClick={() => {
                  setDismantleConfirmItem({ item: detailPlayerItem, gameItem: baseItem });
                }}
                disabled={isStatEq || isQuestActive || detailPlayerItem.isLocked}
                className="pixel-btn text-xs flex-1 !bg-slate-800 !text-slate-300 hover:!bg-slate-700 disabled:opacity-40"
              >
                {isStatEq ? '装備中不可' : detailPlayerItem.isLocked ? '🔒 ロック中' : '🔨 分解する'}
              </button>
            </div>

            <div className="flex gap-2 flex-wrap">
              {guildName && !detailPlayerItem.engraving && onEngraveItem && (
                <button 
                  onClick={() => {
                    if (confirm(`「${compiled.name}」にギルド名「${guildName}」を刻印しますか？`)) {
                      onEngraveItem(detailPlayerItem.uid, guildName);
                      setDetailPlayerItem(null);
                    }
                  }}
                  className="pixel-btn text-xs flex-1 min-w-[40%] !bg-indigo-700 !border-indigo-500 hover:!bg-indigo-600"
                >
                  🛡️ ギルド刻印
                </button>
              )}
              <button
                onClick={() => onToggleLock && onToggleLock(detailPlayerItem.uid)}
                className="pixel-btn text-xs flex-1 !bg-slate-800 !border-slate-600"
              >
                {detailPlayerItem.isLocked ? '🔒 ロック解除' : '🔓 ロックする'}
              </button>
              <button
                onClick={() => setDetailPlayerItem(null)}
                className="pixel-btn text-xs flex-1 !bg-slate-800 !text-slate-300 !border-slate-600"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMaterialCard = (pItem: PlayerItem) => {
    const baseMat = ITEMS[pItem.baseId];
    if (!baseMat) return null;
    const isChest = baseMat.type === 'chest';
    const isConsumable = baseMat.type === 'consumable';
    const sellPrice = calculateSellPrice(pItem, job);
    const isSelected = selectedSellUids.includes(pItem.uid);
    const canSelectForSell = !pItem.isLocked && !isQuestActive;

    return (
      <div 
        key={pItem.uid} 
        onClick={() => {
          if (batchSellMode && canSelectForSell) {
            toggleSelectSell(pItem.uid);
          }
        }}
        className={`pixel-panel flex flex-col gap-2 bg-slate-900/90 border-2 ${
          isChest ? 'border-amber-500/70 bg-slate-900/95' : 'border-slate-700'
        } ${batchSellMode ? (canSelectForSell ? 'cursor-pointer hover:border-amber-400' : 'opacity-60 cursor-not-allowed') : ''} ${
          isSelected ? '!border-amber-400 !bg-amber-950/60 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {batchSellMode && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelectSell(pItem.uid)}
                  disabled={!canSelectForSell}
                  className="w-4 h-4 accent-amber-400 cursor-pointer rounded"
                />
              </div>
            )}
            {isChest ? (
              <span className="text-xl select-none">
                {baseMat.name.includes('伝説') ? '👑' : baseMat.name.includes('金') ? '🧰' : baseMat.name.includes('銀') ? '🎁' : '📦'}
              </span>
            ) : isConsumable ? (
              <span className="text-xl select-none">📜</span>
            ) : (
              <ItemIcon item={{ ...baseMat, id: pItem.baseId }} />
            )}
            <div>
              <span className="text-sm font-bold" style={{ color: baseMat.color }}>{baseMat.name}</span>
              <div className="text-[10px] text-slate-400">
                売却価格: <span className="text-amber-300 font-bold">🪙 {sellPrice} G</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onToggleLock && onToggleLock(pItem.uid)}
              className="pixel-btn text-[10px] !py-1 !px-2 active hover:!bg-slate-700"
              title="ロックして売却・消費を防止"
            >
              {pItem.isLocked ? '🔒' : '🔓'}
            </button>
            {isChest && onOpenChest && (
              <button
                onClick={() => onOpenChest(pItem)}
                disabled={isQuestActive || pItem.isLocked}
                className="pixel-btn text-xs !py-1 !px-2 font-bold !bg-amber-500 !text-slate-950 !border-amber-300 hover:!bg-amber-400 active:scale-95 disabled:opacity-40"
              >
                🔓 開封
              </button>
            )}
            {isConsumable && onUseConsumable && (
              <button
                onClick={() => {
                  if (baseMat.id === 'c_transfer_scroll') {
                    setTransferScrollUid(pItem.uid);
                  } else {
                    onUseConsumable(pItem.uid);
                  }
                }}
                disabled={isQuestActive || pItem.isLocked}
                className="pixel-btn text-xs !py-1 !px-2 font-bold !bg-emerald-700 !text-emerald-100 hover:!bg-emerald-600 active:scale-95 disabled:opacity-40"
              >
                使用する
              </button>
            )}
            {!isChest && !isConsumable && onSellItem && (
              <button
                onClick={() => onSellItem(pItem.uid, sellPrice)}
                disabled={isQuestActive || pItem.isLocked}
                className="pixel-btn text-[10px] !py-1 !px-2 active !border-amber-400 disabled:opacity-40"
              >
                売却
              </button>
            )}
          </div>
        </div>
        {baseMat.effect && (
          <div className="text-[11px] text-slate-300 bg-slate-950 p-2 border border-slate-800 rounded">
            {baseMat.effect.description}
          </div>
        )}
      </div>
    );
  };

  const renderBatchSellToolbar = () => {
    return (
      <div className="mb-4 bg-slate-950 p-3 rounded border-2 border-amber-500/80 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
              <span>💰 まとめ売り・一括売却モード</span>
            </span>
            <button
              onClick={() => {
                setBatchSellMode(!batchSellMode);
                if (batchSellMode) setSelectedSellUids([]);
              }}
              className={`pixel-btn text-xs !py-1 !px-3 font-bold ${
                batchSellMode ? 'active !border-rose-400 !bg-rose-950 !text-rose-200' : '!border-amber-400 !bg-amber-950/60 !text-amber-200'
              }`}
            >
              {batchSellMode ? '✕ 一括売却モードを終了' : '⚡ 一括売却モードを開始'}
            </button>
          </div>

          {batchSellMode && (
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <span>選択中: <strong className="text-amber-300">{selectedSellUids.length}</strong> 個</span>
              <span>合計: <strong className="text-amber-300 font-bold">🪙 {selectedSellTotalPrice.toLocaleString()} G</strong></span>
            </div>
          )}
        </div>

        {batchSellMode && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-bold">一括選択:</span>
              <button
                type="button"
                onClick={handleSelectAllUnusedEquip}
                className="pixel-btn text-[10px] !py-0.5 !px-2 active hover:!bg-slate-800"
              >
                未装備武具を全選択
              </button>
              <button
                type="button"
                onClick={handleSelectAllUnenhanced}
                className="pixel-btn text-[10px] !py-0.5 !px-2 active hover:!bg-slate-800"
              >
                未強化武具を全選択
              </button>
              <button
                type="button"
                onClick={handleSelectAllDuplicates}
                className="pixel-btn text-[10px] !py-0.5 !px-2 active hover:!bg-slate-800"
              >
                重複所持品を全選択
              </button>
              <button
                type="button"
                onClick={handleSelectAllMaterials}
                className="pixel-btn text-[10px] !py-0.5 !px-2 active hover:!bg-slate-800"
              >
                素材・宝石を全選択
              </button>
              {selectedSellUids.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSellUids([])}
                  className="pixel-btn text-[10px] !py-0.5 !px-2 !border-slate-600 !text-slate-400 hover:!bg-slate-800"
                >
                  選択全解除
                </button>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400">
                ※ ロック中のアイテムおよび装備中の武具は売却対象外です。
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedSellUids.length === 0) return;
                  if (onBatchSellItems) {
                    onBatchSellItems(selectedSellUids, selectedSellTotalPrice);
                    setSelectedSellUids([]);
                  }
                }}
                disabled={selectedSellUids.length === 0 || isQuestActive}
                className="pixel-btn text-xs !py-1.5 !px-4 active !border-amber-400 !bg-amber-900 hover:!bg-amber-800 !text-amber-100 font-black disabled:opacity-30 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
              >
                💰 選択した {selectedSellUids.length} 個を一括売却 (+🪙 {selectedSellTotalPrice.toLocaleString()} G)
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pixel-panel max-h-[480px] overflow-y-auto">
      {isQuestActive && (
        <div className="mb-4 text-xs font-bold text-rose-300 bg-rose-950/80 p-3 border-2 border-rose-600 rounded flex items-center gap-2">
          <span>⚠️</span>
          <span>集中クエスト中は装備の変更・購入・強化ができません。</span>
        </div>
      )}

      <div className="flex gap-1 mb-4 border-b-2 border-slate-700 pb-3 flex-wrap">
        <button
          onClick={() => setTab('inventory')}
          className={`pixel-btn text-[11px] flex-1 min-w-[70px] ${tab === 'inventory' ? 'active' : ''}`}
        >
          🎒 装備
        </button>
        <button
          onClick={() => setTab('forge')}
          className={`pixel-btn text-[11px] flex-1 min-w-[70px] ${tab === 'forge' ? 'active' : ''}`}
        >
          🔨 鍛冶屋
        </button>
        <button
          onClick={() => setTab('craft')}
          className={`pixel-btn text-[11px] flex-1 min-w-[70px] ${tab === 'craft' ? 'active !border-amber-400 !text-amber-300' : ''}`}
        >
          🛠️ クラフト
        </button>
        <button
          onClick={() => setTab('materials')}
          className={`pixel-btn text-[11px] flex-1 min-w-[70px] ${tab === 'materials' ? 'active' : ''}`}
        >
          💎 素材 {chests.length > 0 ? `(🎁${chests.length})` : ''}
        </button>
        <button
          onClick={() => setTab('dailyShop')}
          className={`pixel-btn text-[11px] flex-1 min-w-[95px] ${tab === 'dailyShop' ? 'active !border-purple-400 !text-purple-300' : ''}`}
        >
          📅 日替わり店
        </button>
        <button
          onClick={() => setTab('shop')}
          className={`pixel-btn text-[11px] flex-1 min-w-[70px] ${tab === 'shop' ? 'active' : ''}`}
        >
          🏪 通常店
        </button>
      </div>

      {tab === 'inventory' || tab === 'forge' ? (
        <div>
          {renderBatchSellToolbar()}

          {tab === 'forge' ? (
            <div className="mb-4 text-xs leading-relaxed text-slate-300 bg-slate-950 p-3 border-2 border-slate-800 rounded">
              <p className="text-rose-400 font-bold mb-1">🔨 鍛冶屋工房</p>
              <p>【解呪 (呪い解除)】: ゴールドを消費し、呪い装備のHPドレインやデバフを聖なる力で浄化！</p>
              <p>【基本強化】: +1 / +5 / +10 / MAXまとめ強化に対応！</p>
              <p>【限界突破】: 重複装備の一括合体に対応！</p>
              <p>【特殊強化】: 素材を複数個まとめて一括消費強化に対応！</p>
            </div>
          ) : (
            <div className="mb-4 text-xs leading-relaxed text-slate-300 bg-slate-950 p-3 border-2 border-slate-800 rounded">
              <p className="text-amber-400 font-bold mb-1">💡 装備システムのヒント</p>
              <p>・【能力を装備】：攻撃力・防御力や自動HP回復・獲得量UP効果が反映されます。</p>
              <p>・【見た目を装備】：ステータスはそのままで、キャラクターの見た目だけを変更できます！</p>
              <p>・【まとめ売り】：不要な装備や重複装備を一括選択してワンタップで換金できます！</p>
            </div>
          )}
          <h3 className="text-sm font-bold text-amber-300 mb-2 border-b border-slate-800 pb-1">🗡️ 武器</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {weapons.length > 0 ? weapons.map(item => renderInventoryCard(item)) : <div className="text-xs text-slate-500">所持していません</div>}
          </div>

          <h3 className="text-sm font-bold text-amber-300 mb-2 border-b border-slate-800 pb-1">🛡️ 防具</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {armors.length > 0 ? armors.map(item => renderInventoryCard(item)) : <div className="text-xs text-slate-500">所持していません</div>}
          </div>
        </div>
      ) : tab === 'craft' ? (
        <div>
          <div className="mb-4 bg-slate-950 p-3.5 rounded border-2 border-amber-500/70 shadow-md">
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                <span>🛠️ 秘術・深層クラフト工房</span>
              </h3>
              {job === 'artisan' && (
                <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-500 px-2 py-0.5 rounded font-bold">
                  🏛️ アルティザン特権: 素材20%軽減適用中！
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-2">
              モンスターのドロップ素材・属性宝石・深層素材を組み合わせて、特別な武具や護符を鍛造します。
            </p>
            <div className="text-[11px] text-sky-300 bg-sky-950/60 p-2 border border-sky-800/80 rounded flex items-center justify-between flex-wrap gap-2">
              <span>🌌 <strong>深層武具ボーナス</strong>: クラフト時の最高到達階層（地下 <strong>{maxStage}</strong> 階）に応じてボーナス付与！</span>
              <span className="text-amber-300 font-bold">付与威力: +{Math.floor(maxStage * 1.5)}</span>
            </div>
          </div>

          <div className="space-y-3.5">
            {(() => {
              const isArtisan = job === 'artisan';
              const matNormal = isArtisan ? 40 : 50;
              const gemNormal = isArtisan ? 4 : 5;
              const curseMat = isArtisan ? 8 : 10;
              const deepCrystal = isArtisan ? 8 : 10;
              const abyssCore = isArtisan ? 1 : 2;
              const deepBonus = Math.floor(maxStage * 1.5);

              // Calculate material counts
              const matCounts: Record<string, number> = {};
              inventory.forEach(item => {
                matCounts[item.baseId] = (matCounts[item.baseId] || 0) + 1;
              });

              const recipes = [
                {
                  id: 'c_curse_breaker',
                  name: '📜 呪い封じの護符',
                  category: '消耗品 / 護符',
                  color: '#f59e0b',
                  desc: '使用すると解呪を行うまで呪い装備のマイナス効果を完全に無効化する。',
                  statsPreview: 'マイナス効果無効化',
                  isDeep: false,
                  materials: [
                    { id: 'm_slime_jelly', name: 'スライムゼリー', count: curseMat },
                    { id: 'm_goblin_ear', name: 'ゴブリンの耳', count: curseMat },
                    { id: 'm_orc_fang', name: 'オークの牙', count: curseMat },
                    { id: 'm_demon_horn', name: '悪魔の角', count: curseMat },
                    { id: 'm_dragon_scale', name: '竜の鱗', count: curseMat },
                  ],
                },
                {
                  id: 'w_craft_ragnarok',
                  name: '⚔️ 終焉剣ラグナロク',
                  category: '神話武器',
                  color: '#f43f5e',
                  desc: '神話の終焉を告げる究極の大剣。圧倒的な攻撃力とステータスを宿す。',
                  statsPreview: '基本攻撃力 +250',
                  isDeep: false,
                  materials: [
                    { id: 'm_slime_jelly', name: 'スライムゼリー', count: matNormal },
                    { id: 'm_goblin_ear', name: 'ゴブリンの耳', count: matNormal },
                    { id: 'm_orc_fang', name: 'オークの牙', count: matNormal },
                    { id: 'm_demon_horn', name: '悪魔の角', count: matNormal },
                    { id: 'm_dragon_scale', name: '竜の鱗', count: matNormal },
                    { id: 'g_fire_ruby', name: '火のルビー', count: gemNormal },
                    { id: 'g_water_sapphire', name: '水のサファイア', count: gemNormal },
                    { id: 'g_thunder_topaz', name: '雷のトパーズ', count: gemNormal },
                    { id: 'g_light_diamond', name: '光のダイヤモンド', count: gemNormal },
                    { id: 'g_dark_onyx', name: '闇のオニキス', count: gemNormal },
                  ],
                },
                {
                  id: 'a_craft_aegis',
                  name: '🛡️ 創星盾イージス',
                  category: '神話防具',
                  color: '#38bdf8',
                  desc: 'あらゆる厄災を跳ね返す究極の聖盾。絶大な防御力と加護を得る。',
                  statsPreview: '基本防御力 +250',
                  isDeep: false,
                  materials: [
                    { id: 'm_slime_jelly', name: 'スライムゼリー', count: matNormal },
                    { id: 'm_goblin_ear', name: 'ゴブリンの耳', count: matNormal },
                    { id: 'm_orc_fang', name: 'オークの牙', count: matNormal },
                    { id: 'm_demon_horn', name: '悪魔の角', count: matNormal },
                    { id: 'm_dragon_scale', name: '竜の鱗', count: matNormal },
                    { id: 'g_fire_ruby', name: '火のルビー', count: gemNormal },
                    { id: 'g_water_sapphire', name: '水のサファイア', count: gemNormal },
                    { id: 'g_thunder_topaz', name: '雷のトパーズ', count: gemNormal },
                    { id: 'g_light_diamond', name: '光のダイヤモンド', count: gemNormal },
                    { id: 'g_dark_onyx', name: '闇のオニキス', count: gemNormal },
                  ],
                },
                {
                  id: 'w_deep_sword',
                  name: '⚔️ 深淵の魔剣',
                  category: '深層スケーリング武器',
                  color: '#38bdf8',
                  desc: '500F/1000F深層素材から鍛造される魔剣。最高到達階層に応じたボーナス威力が永久付与され、作成者名が永遠に刻印される。',
                  statsPreview: `基本攻撃力 +180 ＋ 階層ボーナス +${deepBonus} ＝ 合計 +${180 + deepBonus}`,
                  isDeep: true,
                  materials: [
                    { id: 'm_deep_crystal', name: '深層の結晶 (500F~)', count: deepCrystal },
                    { id: 'm_abyss_core', name: '奈落のコア (1000F~)', count: abyssCore },
                  ],
                },
                {
                  id: 'a_deep_armor',
                  name: '🛡️ 奈落の鎧',
                  category: '深層スケーリング防具',
                  color: '#a855f7',
                  desc: '500F/1000F深層素材から鍛造される重鎧。最高到達階層に応じたボーナス威力が永久付与され、作成者名が永遠に刻印される。',
                  statsPreview: `基本防御力 +180 ＋ 階層ボーナス +${deepBonus} ＝ 合計 +${180 + deepBonus}`,
                  isDeep: true,
                  materials: [
                    { id: 'm_deep_crystal', name: '深層の結晶 (500F~)', count: deepCrystal },
                    { id: 'm_abyss_core', name: '奈落のコア (1000F~)', count: abyssCore },
                  ],
                },
              ];

              return recipes.map(recipe => {
                const canCraft = recipe.materials.every(m => (matCounts[m.id] || 0) >= m.count);
                const mockGameItem = ITEMS[recipe.id] || { id: recipe.id, name: recipe.name, type: 'weapon', color: recipe.color, price: 0, power: 0 };

                return (
                  <div 
                    key={recipe.id} 
                    className={`pixel-panel bg-slate-900 border-2 p-3 sm:p-3.5 transition-all ${
                      canCraft 
                        ? 'border-amber-400/90 shadow-[0_0_15px_rgba(245,158,11,0.2)] bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20' 
                        : 'border-slate-800 opacity-90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2 mb-2.5 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <ItemIcon item={{ ...mockGameItem, id: recipe.id }} size={36} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold" style={{ color: recipe.color }}>{recipe.name}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                              {recipe.category}
                            </span>
                            {recipe.isDeep && (
                              <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700 px-1.5 py-0.5 rounded font-bold">
                                🛡️ 刻印: {playerName}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-amber-300/90 font-bold mt-0.5">
                            📊 {recipe.statsPreview}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (onCraftItem) onCraftItem(recipe.id);
                        }}
                        disabled={!canCraft || isQuestActive}
                        className={`pixel-btn text-xs !py-1.5 !px-3.5 font-bold whitespace-nowrap self-center sm:self-start ${
                          canCraft
                            ? '!bg-amber-600 !text-white !border-amber-300 hover:!bg-amber-500 active:scale-95 animate-pulse'
                            : 'opacity-40 !bg-slate-800 !text-slate-400 !border-slate-700 cursor-not-allowed'
                        }`}
                      >
                        {isQuestActive ? '🔒 クエスト中' : canCraft ? '✨ 鍛造する' : '素材不足'}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                      {recipe.desc}
                    </p>

                    {/* 必要素材リスト */}
                    <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
                      <div className="text-[10px] font-bold text-slate-400 mb-1.5 flex justify-between items-center">
                        <span>📋 必要素材</span>
                        {canCraft && <span className="text-emerald-400 font-bold">✅ クラフト可能です</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recipe.materials.map(mat => {
                          const current = matCounts[mat.id] || 0;
                          const satisfied = current >= mat.count;
                          return (
                            <span
                              key={mat.id}
                              className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                                satisfied
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 font-bold'
                                  : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
                              }`}
                            >
                              <span>{ITEMS[mat.id]?.name || mat.name}:</span>
                              <span className={satisfied ? 'text-emerald-200 font-black' : 'text-rose-400 font-black'}>
                                {current}/{mat.count}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      ) : tab === 'materials' ? (
        <div>
          {renderBatchSellToolbar()}
          <div className="mb-3 bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center text-xs">
            <span className="text-amber-300 font-bold">💎 素材・宝箱・消費アイテム一覧</span>
            <span className="text-slate-400">所持数: {nonEquipItems.length} 個</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nonEquipItems.length > 0 ? nonEquipItems.map(item => renderMaterialCard(item)) : <div className="text-xs text-slate-500 p-4 text-center col-span-2">素材や宝箱を持っていません。集中クエストを完遂してモンスターを討伐し、宝箱や素材を獲得しましょう！</div>}
          </div>
        </div>
      ) : tab === 'dailyShop' ? (
        <div>
          <div className="mb-4 text-xs leading-relaxed text-purple-200 bg-purple-950/80 p-3 border-2 border-purple-700/80 rounded shadow-md">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
              <span className="text-purple-300 font-bold text-sm">📅 本日の闇市・限定日替わりショップ</span>
              <span className="text-[10px] text-purple-400 font-mono bg-purple-900/60 px-2 py-0.5 rounded border border-purple-700">【日付連動更新】</span>
            </div>
            <p className="text-[11px] text-purple-300/90 mb-2">
              毎日新しい商品が入荷！驚異的な能力と凶悪なデバフを併せ持つ<span className="text-purple-300 font-bold">【💀 呪われた装備】</span>や、割引限定品が並びます。
            </p>

            {/* Bulk Buy Daily Shop Banner */}
            {(() => {
              const availableItems = dailyItems.filter(item => !soldOutDailyItemIds.includes(item.shopItemId));
              const shopDiscountMult = getShopDiscountMultiplier(job);
              const totalBulkCost = availableItems.reduce((sum, item) => {
                const finalPrice = Math.floor(item.price * shopDiscountMult);
                return sum + finalPrice;
              }, 0);

              if (availableItems.length === 0) {
                return (
                  <div className="bg-purple-900/40 p-2 rounded border border-purple-800 text-[11px] text-purple-300 text-center font-bold">
                    ✅ 本日の日替わり商品はすべて完売しました！また明日お越しください。
                  </div>
                );
              }

              return (
                <div className="flex items-center justify-between bg-purple-900/60 p-2.5 rounded border border-purple-500/80 flex-wrap gap-2">
                  <div className="text-[11px]">
                    <div className="text-purple-200 font-bold">🛒 本日の入荷品まとめ買い</div>
                    <div className="text-slate-300 text-[10px]">
                      未購入 {availableItems.length} 品を一括購入: <span className="text-amber-300 font-bold">🪙 {totalBulkCost.toLocaleString()} G</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onBatchBuyDailyItems) {
                        const itemsWithDiscount = availableItems.map(item => ({
                          ...item,
                          price: Math.floor(item.price * shopDiscountMult)
                        }));
                        onBatchBuyDailyItems(itemsWithDiscount, totalBulkCost);
                      } else if (onBuyDailyItem) {
                        availableItems.forEach(item => {
                          onBuyDailyItem({ ...item, price: Math.floor(item.price * shopDiscountMult) });
                        });
                      }
                    }}
                    disabled={gold < totalBulkCost || isQuestActive}
                    className="pixel-btn text-xs !py-1.5 !px-3.5 !bg-purple-800 hover:!bg-purple-700 !text-purple-100 !border-purple-300 font-bold active disabled:opacity-40 shadow-sm"
                  >
                    ⚡ 残り全{availableItems.length}品を一括購入
                  </button>
                </div>
              );
            })()}
          </div>
          <h3 className="text-sm font-bold text-purple-300 mb-3 border-b border-purple-900 pb-1 flex items-center justify-between">
            <span>💀 日替わり限定アイテム ({todayStr})</span>
            <span className="text-xs text-slate-400 font-normal">全5品</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dailyItems.map(item => renderDailyShopCard(item))}
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-bold text-amber-300 mb-3 border-b border-slate-800 pb-1">✨ 新しいベース装備品</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {shopItems.map(item => renderShopCard(item))}
          </div>
        </div>
      )}

      {renderDetailModal()}

      {transferScrollUid && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pixel-panel max-w-md w-full bg-slate-900 border-2 border-purple-500 p-5 relative text-slate-100 shadow-[0_0_25px_rgba(168,85,247,0.3)]">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 text-purple-400 font-bold">
              <span className="text-xl">📜</span>
              <h3 className="text-sm font-bold">強化の継承</h3>
            </div>
            <p className="text-xs text-slate-200 mb-3 leading-relaxed">
              抽出元（失われる）と継承先（強化される）の装備を選択してください。<br/>
              <span className="text-rose-400">※同じ種類（武器同士、防具同士）のみ継承可能です。</span>
            </p>
            
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[10px] text-purple-300 mb-1">抽出元（消滅します）:</label>
                <select 
                  value={transferSourceUid}
                  onChange={(e) => {
                    setTransferSourceUid(e.target.value);
                    setTransferTargetUid('');
                  }}
                  className="pixel-input text-xs w-full p-2 bg-slate-950 border border-slate-700 text-slate-200"
                >
                  <option value="">抽出元の装備を選択...</option>
                  {ownedItems
                    .filter(i => (i.type === 'weapon' || i.type === 'armor') && !inventory.find(inv => inv.uid === i.id)?.isLocked)
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {item.type === 'weapon' ? '⚔️' : '🛡️'} {item.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-sky-300 mb-1">継承先（上書きされます）:</label>
                <select 
                  value={transferTargetUid}
                  onChange={(e) => setTransferTargetUid(e.target.value)}
                  disabled={!transferSourceUid}
                  className="pixel-input text-xs w-full p-2 bg-slate-950 border border-slate-700 text-slate-200 disabled:opacity-50"
                >
                  <option value="">継承先の装備を選択...</option>
                  {(() => {
                    const sourceItem = ownedItems.find(i => i.id === transferSourceUid);
                    if (!sourceItem) return null;
                    return ownedItems
                      .filter(i => i.type === sourceItem.type && i.id !== transferSourceUid && !inventory.find(inv => inv.uid === i.id)?.isLocked)
                      .map(item => (
                        <option key={item.id} value={item.id}>
                          {item.type === 'weapon' ? '⚔️' : '🛡️'} {item.name}
                        </option>
                      ));
                  })()}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onTransferEnhancements && transferSourceUid && transferTargetUid) {
                    onTransferEnhancements(transferSourceUid, transferTargetUid, transferScrollUid);
                  }
                  setTransferScrollUid(null);
                  setTransferSourceUid('');
                  setTransferTargetUid('');
                }}
                disabled={!transferSourceUid || !transferTargetUid}
                className="pixel-btn text-xs flex-1 !bg-purple-900 !text-purple-100 !border-purple-500 active disabled:opacity-40"
              >
                継承を実行する
              </button>
              <button
                onClick={() => {
                  setTransferScrollUid(null);
                  setTransferSourceUid('');
                  setTransferTargetUid('');
                }}
                className="pixel-btn text-xs flex-1 !bg-slate-800 !text-slate-300 !border-slate-600 active"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {dismantleConfirmItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pixel-panel max-w-sm w-full bg-slate-900 border-2 border-rose-500 p-5 relative text-slate-100 shadow-[0_0_25px_rgba(244,63,94,0.3)]">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 text-rose-400 font-bold">
              <span className="text-xl">🔨</span>
              <h3 className="text-sm font-bold">装備の分解確認</h3>
            </div>
            <p className="text-xs text-slate-200 mb-3 leading-relaxed">
              「<span className="font-bold text-amber-300">{dismantleConfirmItem.gameItem.name}</span>」を分解して素材にしますか？
            </p>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] text-slate-400 mb-4 space-y-1">
              <div className="text-amber-400 font-bold">⚠️ 注意事項:</div>
              <div>・この装備品は失われます。</div>
              <div>・強化値や上限突破数に応じたランダム素材を獲得できます。</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onDismantleItem) {
                    onDismantleItem(dismantleConfirmItem.item.uid);
                  }
                  setDismantleConfirmItem(null);
                  setDetailPlayerItem(null);
                }}
                className="pixel-btn text-xs py-2 flex-1 !border-rose-500 !bg-rose-950 hover:!bg-rose-900 !text-rose-200 active font-bold"
              >
                🔨 分解を実行する
              </button>
              <button
                onClick={() => setDismantleConfirmItem(null)}
                className="pixel-btn text-xs py-2 px-3 !bg-slate-800 !text-slate-300 !border-slate-600"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
      {uncurseConfirmItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pixel-panel max-w-sm w-full bg-slate-900 border-2 border-purple-500 p-5 relative text-slate-100 shadow-[0_0_25px_rgba(168,85,247,0.4)]">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 text-purple-400 font-bold">
              <span className="text-xl">✝️</span>
              <h3 className="text-sm font-bold">装備の解呪（呪い解除）確認</h3>
            </div>
            <p className="text-xs text-slate-200 mb-3 leading-relaxed">
              「<span className="font-bold text-amber-300">{uncurseConfirmItem.gameItem.name}</span>」の呪いを解除（解呪）しますか？
            </p>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] text-slate-300 mb-4 space-y-1">
              <div className="text-purple-300 font-bold">✨ 解呪の効果:</div>
              <div>・毎秒HPドレインや獲得量低下などの呪いが全て消滅します。</div>
              <div>・安全に装備でき、基本強化・限界突破・特殊強化が自由に可能になります！</div>
              <div className="pt-1 text-amber-300 font-bold">必要費用: 🪙 {uncurseConfirmItem.cost.toLocaleString()} G</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onUncurseItem) {
                    onUncurseItem(uncurseConfirmItem.item.uid, uncurseConfirmItem.cost);
                  }
                  setUncurseConfirmItem(null);
                  setDetailPlayerItem(null);
                }}
                disabled={gold < uncurseConfirmItem.cost}
                className="pixel-btn text-xs py-2 flex-1 !border-purple-400 !bg-purple-900 hover:!bg-purple-800 !text-purple-100 active font-bold disabled:opacity-40"
              >
                ✝️ 解呪を実行する
              </button>
              <button
                onClick={() => setUncurseConfirmItem(null)}
                className="pixel-btn text-xs py-2 px-3 !bg-slate-800 !text-slate-300 !border-slate-600"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
