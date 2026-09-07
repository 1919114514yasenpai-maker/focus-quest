export default `import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  return \`\${item.type}_\${item.baseId || item.id}_\${item.color || ''}_\${item.name || ''}\`;
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
  const [materialFilter, setMaterialFilter] = useState<'all' | 'material' | 'chest' | 'gem' | 'consumable'>('all');
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

  const { ownedItems, weapons, armors, materials, chests, nonEquipItems, groupedNonEquipItems } = useMemo(() => {
    const owned = inventory.map(pItem => getCompiledItem(pItem)).filter(Boolean) as GameItem[];
    const weps = owned.filter(item => item.type === 'weapon');
    const arms = owned.filter(item => item.type === 'armor');
    const mats = inventory.filter(i => ITEMS[i.baseId]?.type === 'material');
    const chs = inventory.filter(i => ITEMS[i.baseId]?.type === 'chest');
    const nonEq = inventory.filter(i => {
      const type = ITEMS[i.baseId]?.type;
      return type === 'material' || type === 'chest' || type === 'gem' || type === 'consumable';
    });
    const grouped = nonEq.reduce((acc, item) => {
      const key = \`\${item.baseId}_\${item.isLocked ? 'locked' : 'unlocked'}\`;
      if (!acc[key]) acc[key] = { items: [] };
      acc[key].items.push(item);
      return acc;
    }, {} as Record<string, { items: PlayerItem[] }>);
    const groupedArr = Object.values(grouped).map(g => g.items);

    return {
      ownedItems: owned,
      weapons: weps,
      armors: arms,
      materials: mats,
      chests: chs,
      nonEquipItems: nonEq,
      groupedNonEquipItems: groupedArr,
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
    if (matEffect.enemySlowRate) descParts.push(\`遅延\${Math.round(matEffect.enemySlowRate * 100)}%\`);
    if (matEffect.critChance) descParts.push(\`会心+\${Math.round(matEffect.critChance * 100)}%\`);
    if (matEffect.lifesteal) descParts.push(\`吸血+\${Math.round(matEffect.lifesteal * 100)}%\`);
    if (matEffect.hpRegen || matEffect.damageMultiplier) {
      descParts.push(\`毎秒HP+\${matEffect.hpRegen || 0}/ダメ+\${Math.round((matEffect.damageMultiplier || 0) * 100)}%\`);
    }
    if (matEffect.maxHpBonus || matEffect.goldBonus) {
      descParts.push(\`HP+\${matEffect.maxHpBonus || 0}/金+\${Math.round((matEffect.goldBonus || 0) * 100)}%\`);
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
        className={\`pixel-panel flex flex-col gap-2 border-2 \${cardBg} \${cardBorderColor} \${cardShadow} relative transition-all duration-300 hover:scale-[1.01] \${
          batchSellMode ? (canSelectForSell ? 'cursor-pointer hover:border-amber-400' : 'opacity-60 cursor-not-allowed') : ''
        } \${isSelectedForSell ? '!border-amber-400 !bg-amber-950/60 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : ''}\`}
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
                className={\`pixel-btn text-xs flex-1 \${isStatEq ? 'active !border-emerald-400 !text-emerald-300' : ''} \${isQuestActive ? 'opacity-50 cursor-not-allowed' : ''}\`}
              >
                {isStatEq ? '能力: 装備中' : '能力を装備'}
              </button>
              <button
                onClick={() => onEquip(appSlot, pItem.baseId)}
                disabled={isAppEq || isQuestActive}
                className={\`pixel-btn text-xs flex-1 \${isAppEq ? 'active !border-purple-400 !text-purple-300' : ''} \${isQuestActive ? 'opacity-50 cursor-not-allowed' : ''}\`}
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

                  const formatCost = (c: number) => c >= 10000 ? \`\${(c/1000).toFixed(0)}k\` : c >= 1000 ? \`\${(c/1000).toFixed(1)}k\` : \`\${c}\`;

                  return (
                    <>
                      <button
                        onClick={() => {
                          const { updatedItem, totalCost } = performBatchEnchant(pItem, 1);
                          onEnchantItem(pItem.uid, totalCost, updatedItem);
                        }}
                        disabled={gold < cost1 || isQuestActive}
                        className="pixel-btn text-[10px] !py-1 active !border-rose-400 disabled:opacity-40"
                        title={\`1回強化 (費用: 🪙\${cost1.toLocaleString()}G)\`}
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
                        title={\`5回まとめ強化 (費用: 🪙\${cost5.toLocaleString()}G)\`}
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
                        title={\`10回まとめ強化 (費用: 🪙\${cost10.toLocaleString()}G)\`}
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
                        title={\`所持金で最大強化 (+\${maxLevels}回 / 費用: 🪙\${maxCost.toLocaleString()}G)\`}
                      >
                        MAX{maxLevels > 0 ? \`(+\${maxLevels})\` : ''}
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
                  'm_slime_jelly': \`🟢 粘り属性: 敵の攻撃速度 -\${Math.min(90, 15 * curQty)}% (粘液スロー)\`,
                  'm_goblin_ear': \`🔴 会心属性: クリティカル率 +\${Math.min(100, 5 * curQty)}%\`,
                  'm_orc_fang': \`🟣 吸血属性: 攻撃時HP吸収 +\${Math.min(100, 3 * curQty)}%\`,
                  'm_demon_horn': \`🟡 魔性属性: 毎秒HP回復+\${2 * curQty} & 与ダメ+\${5 * curQty}%\`,
                  'm_dragon_scale': \`🐲 覇竜属性: 最大HP+\${30 * curQty} & 獲得G+\${10 * curQty}%\`,
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
                              className={\`pixel-btn text-[9px] !py-0.5 !px-1.5 \${curQty === q ? 'active !border-purple-400 !text-purple-300' : ''}\`}
                            >
                              ×{q}
                            </button>
                          );
                        })}
                        {matCount > 1 && (
                          <button
                            type="button"
                            onClick={() => setSpecialEnchantQty(matCount)}
                            className={\`pixel-btn text-[9px] !py-0.5 !px-1.5 \${curQty === matCount ? 'active !border-purple-400 !text-purple-300' : ''}\`}
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
            {item.type === 'weapon' ? \`攻撃力 \${item.power}\` : item.type === 'armor' ? \`防御力 \${item.power}\` : ''}
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
                  className={\`pixel-btn text-[9px] !py-0.5 !px-1.5 \${qty === preset ? 'active !border-amber-400 !text-amber-300' : ''}\`}
                >
                  {preset}個
                </button>
              ))}
              <button
                type="button"
                onClick={() => setQty(maxAffordable)}
                className={\`pixel-btn text-[9px] !py-0.5 !px-1.5 \${qty === maxAffordable ? 'active !border-amber-400 !text-amber-300' : ''}\`}
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
              {qty > 1 ? \`🛒 \${qty}個購入 (🪙\${totalCost.toLocaleString()}G)\` : '購入する'}
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
    if (item.customPrefix) displayName = \`\${item.customPrefix}\${displayName}\`;
    if (isCursed && !displayName.startsWith('💀')) displayName = \`💀\${displayName}\`;
    if (item.upgradeLevel > 0) displayName = \`\${displayName} Lv.\${item.upgradeLevel}\`;

    const totalPower = baseItem.power + item.addedPower + item.upgradeLevel * 3;

    return (
      <div
        key={item.shopItemId}
        className={\`pixel-panel flex flex-col gap-2 relative transition-all \${
          isCursed
            ? 'bg-purple-950/40 border-2 border-purple-600/80 shadow-[0_0_15px_rgba(147,51,234,0.25)]'
            : 'bg-slate-900/90 border-2 border-slate-700'
        } \${isSoldOut ? 'opacity-50 grayscale' : ''}\`}
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
                <span className={\`text-sm font-bold \${isCursed ? 'text-purple-300' : 'text-slate-100'}\`}>
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
          <div className={\`text-[11px] p-2 border rounded \${isCursed ? 'text-purple-200 bg-purple-950/80 border-purple-800' : 'text-sky-300 bg-slate-950 border-slate-800'}\`}>
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
            className={\`pixel-btn text-xs active disabled:opacity-40 \${
              isCursed
                ? '!bg-purple-700 !text-purple-100 !border-purple-400 hover:!bg-purple-600'
                : '!border-amber-400'
            }\`}
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
                <div className="text-sm font-bold text-sky-300">{(detailPlayerItem.limitBreak || 0) > 0 ? \`+\${detailPlayerItem.limitBreak}凸\` : '未実施'}</div>
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
                className={\`pixel-btn text-xs flex-1 \${isStatEq ? 'active !border-emerald-400 !text-emerald-300' : ''}\`}
              >
                {isStatEq ? '能力: 装備中' : '能力を装備'}
              </button>
              <button
                onClick={() => {
                  onEquip(appSlot, detailPlayerItem.baseId);
                  setDetailPlayerItem(null);
                }}
                disabled={isAppEq || isQuestActive}
                className={\`pixel-btn text-xs flex-1 \${isAppEq ? 'active !border-purple-400 !text-purple-300' : ''}\`}
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
                {isStatEq ? '装備中不可' : detailPlayerItem.isLocked ? '🔒 ロック中' : \`💰 🪙\${sellPrice}G で売却\`}
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
                    if (confirm(\`「\${compiled.name}」にギルド名「\${guildName}」を刻印しますか？\`)) {
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

`;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkludmVudG9yeS50c3g/cmF3Il0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBkZWZhdWx0IFwiaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QsIHVzZVJlZiwgdXNlTWVtbyB9IGZyb20gJ3JlYWN0JztcXG5pbXBvcnQgeyBFcXVpcG1lbnRTdGF0ZSwgR2FtZUl0ZW0sIFBsYXllckl0ZW0sIEl0ZW1FZmZlY3QsIEpvYlR5cGUgfSBmcm9tICcuLi90eXBlcyc7XFxuaW1wb3J0IHsgSVRFTVMsIGlzQ3JhZnRFeGNsdXNpdmVJdGVtIH0gZnJvbSAnLi4vZ2FtZURhdGEnO1xcbmltcG9ydCB7IFdFQVBPTl9TUFJJVEVTLCBBUk1PUl9TUFJJVEVTLCBkcmF3SWNvblNwcml0ZSB9IGZyb20gJy4uL3Nwcml0ZXMnO1xcbmltcG9ydCB7IFxcbiAgZ2V0Q29tcGlsZWRJdGVtLCBcXG4gIGNhbGN1bGF0ZVNlbGxQcmljZSwgXFxuICBjYWxjdWxhdGVVbmN1cnNlQ29zdCxcXG4gIGNhbGN1bGF0ZUJhdGNoRW5jaGFudENvc3QsXFxuICBjYWxjdWxhdGVNYXhFbmNoYW50TGV2ZWxzLFxcbiAgcGVyZm9ybUJhdGNoRW5jaGFudCxcXG4gIHBlcmZvcm1CYXRjaFNwZWNpYWxFbmNoYW50XFxufSBmcm9tICcuLi9pdGVtVXRpbHMnO1xcbmltcG9ydCB7IGdlbmVyYXRlRGFpbHlTaG9wSXRlbXMsIGdldFRvZGF5RGF0ZVN0cmluZywgRGFpbHlTaG9wSXRlbSB9IGZyb20gJy4uL2RhaWx5U2hvcFV0aWxzJztcXG5pbXBvcnQgeyBnZXRTaG9wRGlzY291bnRNdWx0aXBsaWVyIH0gZnJvbSAnLi4vam9iVXRpbHMnO1xcblxcbmludGVyZmFjZSBJdGVtSWNvblByb3BzIHtcXG4gIGl0ZW06IEdhbWVJdGVtICYgeyBiYXNlSWQ/OiBzdHJpbmcgfTtcXG4gIHNpemU/OiBudW1iZXI7XFxufVxcblxcbmNvbnN0IGljb25DYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XFxuXFxuY29uc3QgZ2V0SWNvbkNhY2hlS2V5ID0gKGl0ZW06IEdhbWVJdGVtICYgeyBiYXNlSWQ/OiBzdHJpbmcgfSk6IHN0cmluZyA9PiB7XFxuICByZXR1cm4gYCR7aXRlbS50eXBlfV8ke2l0ZW0uYmFzZUlkIHx8IGl0ZW0uaWR9XyR7aXRlbS5jb2xvciB8fCAnJ31fJHtpdGVtLm5hbWUgfHwgJyd9YDtcXG59O1xcblxcbmV4cG9ydCBjb25zdCBJdGVtSWNvbjogUmVhY3QuRkM8SXRlbUljb25Qcm9wcz4gPSBSZWFjdC5tZW1vKCh7IGl0ZW0sIHNpemUgPSAzMiB9KSA9PiB7XFxuICBjb25zdCBjYW52YXNSZWYgPSB1c2VSZWY8SFRNTENhbnZhc0VsZW1lbnQ+KG51bGwpO1xcbiAgY29uc3QgY2FjaGVLZXkgPSBnZXRJY29uQ2FjaGVLZXkoaXRlbSk7XFxuICBjb25zdCBjYWNoZWRVcmwgPSBpY29uQ2FjaGUuZ2V0KGNhY2hlS2V5KTtcXG5cXG4gIHVzZUVmZmVjdCgoKSA9PiB7XFxuICAgIGlmIChjYWNoZWRVcmwpIHJldHVybjtcXG5cXG4gICAgY29uc3QgY2FudmFzID0gY2FudmFzUmVmLmN1cnJlbnQ7XFxuICAgIGlmICghY2FudmFzKSByZXR1cm47XFxuICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcsIHsgYWxwaGE6IHRydWUgfSk7XFxuICAgIGlmICghY3R4KSByZXR1cm47XFxuXFxuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcXG4gICAgXFxuICAgIC8vIERyYXcgZ2VuZXJpYyBzcXVhcmUgZm9yIG1hdGVyaWFscyBvciBnZW1zXFxuICAgIGlmIChpdGVtLnR5cGUgPT09ICdtYXRlcmlhbCcgfHwgaXRlbS50eXBlID09PSAnZ2VtJykge1xcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBpdGVtLmNvbG9yIHx8ICcjOTRhM2I4JztcXG4gICAgICBjdHguZmlsbFJlY3QoOCwgOCwgMTYsIDE2KTtcXG4gICAgICBjdHguZmlsbFN0eWxlID0gJyNmZmZmZmYnO1xcbiAgICAgIGN0eC5maWxsUmVjdCgxMCwgMTAsIDQsIDQpO1xcbiAgICAgIGljb25DYWNoZS5zZXQoY2FjaGVLZXksIGNhbnZhcy50b0RhdGFVUkwoKSk7XFxuICAgICAgcmV0dXJuO1xcbiAgICB9XFxuXFxuICAgIC8vIERyYXcgY2hlc3QgaWNvblxcbiAgICBpZiAoaXRlbS50eXBlID09PSAnY2hlc3QnKSB7XFxuICAgICAgY29uc3QgaXNHb2xkID0gaXRlbS5uYW1lPy5pbmNsdWRlcygn6YeRJykgfHwgaXRlbS5jb2xvciA9PT0gJyNmNTllMGInO1xcbiAgICAgIGNvbnN0IGlzU2lsdmVyID0gaXRlbS5uYW1lPy5pbmNsdWRlcygn6YqAJykgfHwgaXRlbS5jb2xvciA9PT0gJyM5NGEzYjgnO1xcbiAgICAgIGNvbnN0IGlzTGVnZW5kID0gaXRlbS5uYW1lPy5pbmNsdWRlcygn5Lyd6KqsJykgfHwgaXRlbS5jb2xvciA9PT0gJyNhODU1ZjcnO1xcbiAgICAgIFxcbiAgICAgIGNvbnN0IGJvZHlDb2xvciA9IGlzTGVnZW5kID8gJyM1ODFjODcnIDogaXNHb2xkID8gJyNiNDUzMDknIDogaXNTaWx2ZXIgPyAnIzQ3NTU2OScgOiAnIzc4MzUwZic7XFxuICAgICAgY29uc3QgbGlkQ29sb3IgPSBpc0xlZ2VuZCA/ICcjOTMzM2VhJyA6IGlzR29sZCA/ICcjZjU5ZTBiJyA6IGlzU2lsdmVyID8gJyM5NGEzYjgnIDogJyNiNDUzMDknO1xcbiAgICAgIGNvbnN0IGxvY2tDb2xvciA9IGlzTGVnZW5kID8gJyNmYWNjMTUnIDogaXNHb2xkID8gJyNmZGUwNDcnIDogJyNlMmU4ZjAnO1xcblxcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBib2R5Q29sb3I7XFxuICAgICAgY3R4LmZpbGxSZWN0KDYsIDEyLCAyMCwgMTQpO1xcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBsaWRDb2xvcjtcXG4gICAgICBjdHguZmlsbFJlY3QoNSwgNywgMjIsIDYpO1xcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBsb2NrQ29sb3I7XFxuICAgICAgY3R4LmZpbGxSZWN0KDE0LCAxMSwgNCwgNSk7XFxuICAgICAgaWNvbkNhY2hlLnNldChjYWNoZUtleSwgY2FudmFzLnRvRGF0YVVSTCgpKTtcXG4gICAgICByZXR1cm47XFxuICAgIH1cXG5cXG4gICAgLy8gRHJhdyBzY3JvbGwgLyBjb25zdW1hYmxlIGljb25cXG4gICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2NvbnN1bWFibGUnKSB7XFxuICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjZmVmM2M3JztcXG4gICAgICBjdHguZmlsbFJlY3QoOCwgNiwgMTYsIDIwKTtcXG4gICAgICBjdHguZmlsbFN0eWxlID0gJyNkOTc3MDYnO1xcbiAgICAgIGN0eC5maWxsUmVjdCgxMCwgOSwgMTIsIDIpO1xcbiAgICAgIGN0eC5maWxsUmVjdCgxMCwgMTMsIDEyLCAyKTtcXG4gICAgICBjdHguZmlsbFJlY3QoMTAsIDE3LCAxMiwgMik7XFxuICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjYjQ1MzA5JztcXG4gICAgICBjdHguZmlsbFJlY3QoNiwgNSwgMjAsIDIpO1xcbiAgICAgIGN0eC5maWxsUmVjdCg2LCAyNSwgMjAsIDIpO1xcbiAgICAgIGljb25DYWNoZS5zZXQoY2FjaGVLZXksIGNhbnZhcy50b0RhdGFVUkwoKSk7XFxuICAgICAgcmV0dXJuO1xcbiAgICB9XFxuXFxuICAgIGNvbnN0IHNwcml0ZUtleSA9IChpdGVtIGFzIGFueSkuYmFzZUlkIHx8IGl0ZW0uaWQ7XFxuICAgIGNvbnN0IHNwcml0ZURhdGEgPSBpdGVtLnR5cGUgPT09ICd3ZWFwb24nIFxcbiAgICAgID8gV0VBUE9OX1NQUklURVNbc3ByaXRlS2V5XSB8fCBXRUFQT05fU1BSSVRFU1tpdGVtLmlkXSB8fCBXRUFQT05fU1BSSVRFU1snd193b29kX3N3b3JkJ10gXFxuICAgICAgOiBBUk1PUl9TUFJJVEVTW3Nwcml0ZUtleV0gfHwgQVJNT1JfU1BSSVRFU1tpdGVtLmlkXSB8fCBBUk1PUl9TUFJJVEVTWydhX2Nsb3RoJ107XFxuICAgIFxcbiAgICBpZiAoc3ByaXRlRGF0YSkge1xcbiAgICAgIGlmIChpdGVtLnR5cGUgPT09ICd3ZWFwb24nKSB7XFxuICAgICAgICBjdHguc2F2ZSgpO1xcbiAgICAgICAgY3R4LnRyYW5zbGF0ZShjYW52YXMud2lkdGggLyAyLCBjYW52YXMuaGVpZ2h0IC8gMik7XFxuICAgICAgICBjdHgucm90YXRlKE1hdGguUEkgLyA0KTtcXG4gICAgICAgIGRyYXdJY29uU3ByaXRlKGN0eCwgc3ByaXRlRGF0YSwgLTE2LCAtMTYsIDIpO1xcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcXG4gICAgICB9IGVsc2Uge1xcbiAgICAgICAgZHJhd0ljb25TcHJpdGUoY3R4LCBzcHJpdGVEYXRhLCAwLCAwLCAyKTtcXG4gICAgICB9XFxuICAgIH1cXG4gICAgaWNvbkNhY2hlLnNldChjYWNoZUtleSwgY2FudmFzLnRvRGF0YVVSTCgpKTtcXG4gIH0sIFtjYWNoZUtleSwgY2FjaGVkVXJsLCBpdGVtXSk7XFxuXFxuICBpZiAoY2FjaGVkVXJsKSB7XFxuICAgIHJldHVybiAoXFxuICAgICAgPGltZ1xcbiAgICAgICAgc3JjPXtjYWNoZWRVcmx9XFxuICAgICAgICBhbHQ9e2l0ZW0ubmFtZX1cXG4gICAgICAgIHN0eWxlPXt7IHdpZHRoOiBzaXplLCBoZWlnaHQ6IHNpemUsIGltYWdlUmVuZGVyaW5nOiAncGl4ZWxhdGVkJyB9fVxcbiAgICAgICAgY2xhc3NOYW1lPVxcXCJyb3VuZGVkLXNtIHBpeGVsLXBhbmVsIHAtMCBiZy1zbGF0ZS04MDAgZmxleC1zaHJpbmstMFxcXCJcXG4gICAgICAgIGxvYWRpbmc9XFxcImxhenlcXFwiXFxuICAgICAgLz5cXG4gICAgKTtcXG4gIH1cXG5cXG4gIHJldHVybiAoXFxuICAgIDxjYW52YXMgXFxuICAgICAgcmVmPXtjYW52YXNSZWZ9IFxcbiAgICAgIHdpZHRoPXszMn0gXFxuICAgICAgaGVpZ2h0PXszMn0gXFxuICAgICAgc3R5bGU9e3sgd2lkdGg6IHNpemUsIGhlaWdodDogc2l6ZSwgaW1hZ2VSZW5kZXJpbmc6ICdwaXhlbGF0ZWQnIH19IFxcbiAgICAgIGNsYXNzTmFtZT1cXFwicm91bmRlZC1zbSBwaXhlbC1wYW5lbCBwLTAgYmctc2xhdGUtODAwIGZsZXgtc2hyaW5rLTBcXFwiIFxcbiAgICAvPlxcbiAgKTtcXG59KTtcXG5cXG5pbnRlcmZhY2UgSW52ZW50b3J5UHJvcHMge1xcbiAgaW52ZW50b3J5OiBQbGF5ZXJJdGVtW107XFxuICBlcXVpcG1lbnQ6IEVxdWlwbWVudFN0YXRlO1xcbiAgZ29sZDogbnVtYmVyO1xcbiAgam9iPzogSm9iVHlwZTtcXG4gIG1heFN0YWdlPzogbnVtYmVyO1xcbiAgcGxheWVyTmFtZT86IHN0cmluZztcXG4gIG9uRXF1aXA6IChzbG90OiBrZXlvZiBFcXVpcG1lbnRTdGF0ZSwgaXRlbUlkOiBzdHJpbmcpID0+IHZvaWQ7XFxuICBvbkJ1eUl0ZW06IChpdGVtSWQ6IHN0cmluZywgcHJpY2U6IG51bWJlcikgPT4gdm9pZDtcXG4gIG9uQnV5RGFpbHlJdGVtPzogKGl0ZW06IERhaWx5U2hvcEl0ZW0pID0+IHZvaWQ7XFxuICBvbkJhdGNoQnV5SXRlbT86IChpdGVtSWQ6IHN0cmluZywgcXVhbnRpdHk6IG51bWJlciwgdW5pdFByaWNlOiBudW1iZXIpID0+IHZvaWQ7XFxuICBvbkJhdGNoQnV5RGFpbHlJdGVtcz86IChkYWlseUl0ZW1zVG9CdXk6IERhaWx5U2hvcEl0ZW1bXSkgPT4gdm9pZDtcXG4gIHNvbGRPdXREYWlseUl0ZW1JZHM/OiBzdHJpbmdbXTtcXG4gIG9uRW5jaGFudEl0ZW06ICh1aWQ6IHN0cmluZywgY29zdDogbnVtYmVyLCBuZXdFZmZlY3Q6IFBsYXllckl0ZW0pID0+IHZvaWQ7XFxuICBvbkxpbWl0QnJlYWs/OiAodWlkMTogc3RyaW5nLCB1aWQyOiBzdHJpbmcpID0+IHZvaWQ7XFxuICBvbkJhdGNoTGltaXRCcmVhaz86ICh0YXJnZXRVaWQ6IHN0cmluZywgY29uc3VtZWRVaWRzOiBzdHJpbmdbXSkgPT4gdm9pZDtcXG4gIG9uU3BlY2lhbEVuY2hhbnQ/OiAodWlkOiBzdHJpbmcsIG1hdGVyaWFsVWlkOiBzdHJpbmcsIGNvc3Q6IG51bWJlciwgbmV3RWZmZWN0OiBQbGF5ZXJJdGVtKSA9PiB2b2lkO1xcbiAgb25CYXRjaFNwZWNpYWxFbmNoYW50PzogKHVpZDogc3RyaW5nLCBjb25zdW1lZE1hdGVyaWFsVWlkczogc3RyaW5nW10sIGNvc3Q6IG51bWJlciwgbmV3RWZmZWN0OiBQbGF5ZXJJdGVtKSA9PiB2b2lkO1xcbiAgb25TZWxsSXRlbT86ICh1aWQ6IHN0cmluZywgc2VsbFByaWNlOiBudW1iZXIpID0+IHZvaWQ7XFxuICBvbkJhdGNoU2VsbEl0ZW1zPzogKHVpZHM6IHN0cmluZ1tdLCB0b3RhbFNlbGxQcmljZTogbnVtYmVyKSA9PiB2b2lkO1xcbiAgb25EaXNtYW50bGVJdGVtPzogKHVpZDogc3RyaW5nKSA9PiB2b2lkO1xcbiAgb25Ub2dnbGVMb2NrPzogKHVpZDogc3RyaW5nKSA9PiB2b2lkO1xcbiAgb25VbmN1cnNlSXRlbT86ICh1aWQ6IHN0cmluZywgY29zdDogbnVtYmVyKSA9PiB2b2lkO1xcbiAgb25PcGVuQ2hlc3Q/OiAoaXRlbTogUGxheWVySXRlbSkgPT4gdm9pZDtcXG4gIG9uQ3JhZnRJdGVtPzogKHJlY2lwZUlkOiBzdHJpbmcpID0+IHZvaWQ7XFxuICBvblVzZUNvbnN1bWFibGU/OiAodWlkOiBzdHJpbmcpID0+IHZvaWQ7XFxuICBvbk9wZW5Tb2NrZXQ/OiAodWlkOiBzdHJpbmcpID0+IHZvaWQ7XFxuICBvbkluc2VydEdlbT86ICh3ZWFwb25VaWQ6IHN0cmluZywgZ2VtVWlkOiBzdHJpbmcpID0+IHZvaWQ7XFxuICBndWlsZE5hbWU/OiBzdHJpbmc7XFxuICBvbkVuZ3JhdmVJdGVtPzogKHVpZDogc3RyaW5nLCBndWlsZE5hbWU6IHN0cmluZykgPT4gdm9pZDtcXG4gIG9uVHJhbnNmZXJFbmhhbmNlbWVudHM/OiAoc291cmNlVWlkOiBzdHJpbmcsIHRhcmdldFVpZDogc3RyaW5nLCBzY3JvbGxVaWQ6IHN0cmluZykgPT4gdm9pZDtcXG4gIGlzUXVlc3RBY3RpdmU/OiBib29sZWFuO1xcbn1cXG5cXG5leHBvcnQgY29uc3QgSW52ZW50b3J5OiBSZWFjdC5GQzxJbnZlbnRvcnlQcm9wcz4gPSAoe1xcbiAgaW52ZW50b3J5LFxcbiAgZXF1aXBtZW50LFxcbiAgZ29sZCxcXG4gIGpvYiA9ICdiYWxhbmNlZCcgYXMgSm9iVHlwZSxcXG4gIG1heFN0YWdlID0gMSxcXG4gIHBsYXllck5hbWUgPSAn5ZCN54Sh44GX5YuH6ICFJyxcXG4gIG9uRXF1aXAsXFxuICBvbkJ1eUl0ZW0sXFxuICBvbkJ1eURhaWx5SXRlbSxcXG4gIG9uQmF0Y2hCdXlJdGVtLFxcbiAgb25CYXRjaEJ1eURhaWx5SXRlbXMsXFxuICBzb2xkT3V0RGFpbHlJdGVtSWRzID0gW10sXFxuICBvbkVuY2hhbnRJdGVtLFxcbiAgb25MaW1pdEJyZWFrLFxcbiAgb25CYXRjaExpbWl0QnJlYWssXFxuICBvblNwZWNpYWxFbmNoYW50LFxcbiAgb25CYXRjaFNwZWNpYWxFbmNoYW50LFxcbiAgb25TZWxsSXRlbSxcXG4gIG9uQmF0Y2hTZWxsSXRlbXMsXFxuICBvbkRpc21hbnRsZUl0ZW0sXFxuICBvblRvZ2dsZUxvY2ssXFxuICBvblVuY3Vyc2VJdGVtLFxcbiAgb25PcGVuQ2hlc3QsXFxuICBvbkNyYWZ0SXRlbSxcXG4gIG9uVXNlQ29uc3VtYWJsZSxcXG4gIG9uT3BlblNvY2tldCxcXG4gIG9uSW5zZXJ0R2VtLFxcbiAgb25UcmFuc2ZlckVuaGFuY2VtZW50cyxcXG4gIGlzUXVlc3RBY3RpdmUgPSBmYWxzZSxcXG4gIGd1aWxkTmFtZSxcXG4gIG9uRW5ncmF2ZUl0ZW0sXFxufSkgPT4ge1xcbiAgY29uc3QgW3RhYiwgc2V0VGFiXSA9IHVzZVN0YXRlPCdpbnZlbnRvcnknIHwgJ3Nob3AnIHwgJ2RhaWx5U2hvcCcgfCAnZm9yZ2UnIHwgJ2NyYWZ0JyB8ICdtYXRlcmlhbHMnPignaW52ZW50b3J5Jyk7XFxuICBjb25zdCBbbWF0ZXJpYWxGaWx0ZXIsIHNldE1hdGVyaWFsRmlsdGVyXSA9IHVzZVN0YXRlPCdhbGwnIHwgJ21hdGVyaWFsJyB8ICdjaGVzdCcgfCAnZ2VtJyB8ICdjb25zdW1hYmxlJz4oJ2FsbCcpO1xcbiAgY29uc3QgW3NlbGVjdGVkTWF0ZXJpYWxVaWQsIHNldFNlbGVjdGVkTWF0ZXJpYWxVaWRdID0gdXNlU3RhdGU8c3RyaW5nPignJyk7XFxuICBjb25zdCBbZGV0YWlsUGxheWVySXRlbSwgc2V0RGV0YWlsUGxheWVySXRlbV0gPSB1c2VTdGF0ZTxQbGF5ZXJJdGVtIHwgbnVsbD4obnVsbCk7XFxuICBjb25zdCBbZGlzbWFudGxlQ29uZmlybUl0ZW0sIHNldERpc21hbnRsZUNvbmZpcm1JdGVtXSA9IHVzZVN0YXRlPHsgaXRlbTogUGxheWVySXRlbTsgZ2FtZUl0ZW06IEdhbWVJdGVtIH0gfCBudWxsPihudWxsKTtcXG4gIGNvbnN0IFt1bmN1cnNlQ29uZmlybUl0ZW0sIHNldFVuY3Vyc2VDb25maXJtSXRlbV0gPSB1c2VTdGF0ZTx7IGl0ZW06IFBsYXllckl0ZW07IGdhbWVJdGVtOiBHYW1lSXRlbTsgY29zdDogbnVtYmVyIH0gfCBudWxsPihudWxsKTtcXG4gIGNvbnN0IFt0cmFuc2ZlclNjcm9sbFVpZCwgc2V0VHJhbnNmZXJTY3JvbGxVaWRdID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbCk7XFxuICBjb25zdCBbdHJhbnNmZXJTb3VyY2VVaWQsIHNldFRyYW5zZmVyU291cmNlVWlkXSA9IHVzZVN0YXRlPHN0cmluZz4oJycpO1xcbiAgY29uc3QgW3RyYW5zZmVyVGFyZ2V0VWlkLCBzZXRUcmFuc2ZlclRhcmdldFVpZF0gPSB1c2VTdGF0ZTxzdHJpbmc+KCcnKTtcXG5cXG4gIC8vIEJ1bGsgQWN0aW9ucyBTdGF0ZVxcbiAgY29uc3QgW2JhdGNoU2VsbE1vZGUsIHNldEJhdGNoU2VsbE1vZGVdID0gdXNlU3RhdGU8Ym9vbGVhbj4oZmFsc2UpO1xcbiAgY29uc3QgW3NlbGVjdGVkU2VsbFVpZHMsIHNldFNlbGVjdGVkU2VsbFVpZHNdID0gdXNlU3RhdGU8c3RyaW5nW10+KFtdKTtcXG4gIGNvbnN0IFtzaG9wUXVhbnRpdGllcywgc2V0U2hvcFF1YW50aXRpZXNdID0gdXNlU3RhdGU8UmVjb3JkPHN0cmluZywgbnVtYmVyPj4oe30pO1xcbiAgY29uc3QgW3NwZWNpYWxFbmNoYW50UXR5LCBzZXRTcGVjaWFsRW5jaGFudFF0eV0gPSB1c2VTdGF0ZTxudW1iZXI+KDEpO1xcbiAgXFxuICBjb25zdCB0b2RheVN0ciA9IGdldFRvZGF5RGF0ZVN0cmluZygpO1xcbiAgY29uc3QgZGFpbHlJdGVtcyA9IHVzZU1lbW8oKCkgPT4gZ2VuZXJhdGVEYWlseVNob3BJdGVtcyh0b2RheVN0ciksIFt0b2RheVN0cl0pO1xcblxcbiAgY29uc3QgeyBvd25lZEl0ZW1zLCB3ZWFwb25zLCBhcm1vcnMsIG1hdGVyaWFscywgY2hlc3RzLCBub25FcXVpcEl0ZW1zLCBncm91cGVkTm9uRXF1aXBJdGVtcyB9ID0gdXNlTWVtbygoKSA9PiB7XFxuICAgIGNvbnN0IG93bmVkID0gaW52ZW50b3J5Lm1hcChwSXRlbSA9PiBnZXRDb21waWxlZEl0ZW0ocEl0ZW0pKS5maWx0ZXIoQm9vbGVhbikgYXMgR2FtZUl0ZW1bXTtcXG4gICAgY29uc3Qgd2VwcyA9IG93bmVkLmZpbHRlcihpdGVtID0+IGl0ZW0udHlwZSA9PT0gJ3dlYXBvbicpO1xcbiAgICBjb25zdCBhcm1zID0gb3duZWQuZmlsdGVyKGl0ZW0gPT4gaXRlbS50eXBlID09PSAnYXJtb3InKTtcXG4gICAgY29uc3QgbWF0cyA9IGludmVudG9yeS5maWx0ZXIoaSA9PiBJVEVNU1tpLmJhc2VJZF0/LnR5cGUgPT09ICdtYXRlcmlhbCcpO1xcbiAgICBjb25zdCBjaHMgPSBpbnZlbnRvcnkuZmlsdGVyKGkgPT4gSVRFTVNbaS5iYXNlSWRdPy50eXBlID09PSAnY2hlc3QnKTtcXG4gICAgY29uc3Qgbm9uRXEgPSBpbnZlbnRvcnkuZmlsdGVyKGkgPT4ge1xcbiAgICAgIGNvbnN0IHR5cGUgPSBJVEVNU1tpLmJhc2VJZF0/LnR5cGU7XFxuICAgICAgcmV0dXJuIHR5cGUgPT09ICdtYXRlcmlhbCcgfHwgdHlwZSA9PT0gJ2NoZXN0JyB8fCB0eXBlID09PSAnZ2VtJyB8fCB0eXBlID09PSAnY29uc3VtYWJsZSc7XFxuICAgIH0pO1xcbiAgICBjb25zdCBncm91cGVkID0gbm9uRXEucmVkdWNlKChhY2MsIGl0ZW0pID0+IHtcXG4gICAgICBjb25zdCBrZXkgPSBgJHtpdGVtLmJhc2VJZH1fJHtpdGVtLmlzTG9ja2VkID8gJ2xvY2tlZCcgOiAndW5sb2NrZWQnfWA7XFxuICAgICAgaWYgKCFhY2Nba2V5XSkgYWNjW2tleV0gPSB7IGl0ZW1zOiBbXSB9O1xcbiAgICAgIGFjY1trZXldLml0ZW1zLnB1c2goaXRlbSk7XFxuICAgICAgcmV0dXJuIGFjYztcXG4gICAgfSwge30gYXMgUmVjb3JkPHN0cmluZywgeyBpdGVtczogUGxheWVySXRlbVtdIH0+KTtcXG4gICAgY29uc3QgZ3JvdXBlZEFyciA9IE9iamVjdC52YWx1ZXMoZ3JvdXBlZCkubWFwKGcgPT4gZy5pdGVtcyk7XFxuXFxuICAgIHJldHVybiB7XFxuICAgICAgb3duZWRJdGVtczogb3duZWQsXFxuICAgICAgd2VhcG9uczogd2VwcyxcXG4gICAgICBhcm1vcnM6IGFybXMsXFxuICAgICAgbWF0ZXJpYWxzOiBtYXRzLFxcbiAgICAgIGNoZXN0czogY2hzLFxcbiAgICAgIG5vbkVxdWlwSXRlbXM6IG5vbkVxLFxcbiAgICAgIGdyb3VwZWROb25FcXVpcEl0ZW1zOiBncm91cGVkQXJyLFxcbiAgICB9O1xcbiAgfSwgW2ludmVudG9yeV0pO1xcblxcblxcbiAgLy8g44K344On44OD44OX44Gr44Gv44OZ44O844K544Ki44Kk44OG44Og44GM5Lim44G2ICjntKDmnZDjg7vlrp3nrrHjg7vlkarjgYToo4Xlgpnjg7vjgq/jg6njg5Xjg4jpmZDlrprlk4Hjga/pmaTlpJYpXFxuICBjb25zdCBzaG9wSXRlbXMgPSB1c2VNZW1vKCgpID0+IHtcXG4gICAgcmV0dXJuIE9iamVjdC52YWx1ZXMoSVRFTVMpLmZpbHRlcihpdGVtID0+IFxcbiAgICAgIGl0ZW0udHlwZSA9PT0gJ3dlYXBvbicgfHwgaXRlbS50eXBlID09PSAnYXJtb3InIHx8IGl0ZW0uaWQgPT09ICdjX3RyYW5zZmVyX3Njcm9sbCdcXG4gICAgKS5maWx0ZXIoaXRlbSA9PiBcXG4gICAgICBpdGVtLnByaWNlID4gMCAmJiBcXG4gICAgICAhaXRlbS5pc0N1cnNlZCAmJiBcXG4gICAgICAhaXRlbS5lZmZlY3Q/LmlzQ3Vyc2VkICYmXFxuICAgICAgIWlzQ3JhZnRFeGNsdXNpdmVJdGVtKGl0ZW0pXFxuICAgICk7XFxuICB9LCBbXSk7XFxuXFxuICAvLyBJbml0aWFsaXplIHNlbGVjdGVkIG1hdGVyaWFsIGlmIG5vbmUgaXMgc2VsZWN0ZWRcXG4gIHVzZUVmZmVjdCgoKSA9PiB7XFxuICAgIGlmIChtYXRlcmlhbHMubGVuZ3RoID4gMCAmJiAhbWF0ZXJpYWxzLmZpbmQobSA9PiBtLnVpZCA9PT0gc2VsZWN0ZWRNYXRlcmlhbFVpZCkpIHtcXG4gICAgICBzZXRTZWxlY3RlZE1hdGVyaWFsVWlkKG1hdGVyaWFsc1swXS51aWQpO1xcbiAgICB9XFxuICB9LCBbbWF0ZXJpYWxzLCBzZWxlY3RlZE1hdGVyaWFsVWlkXSk7XFxuXFxuICAvLyAtLS0g5LiA5ous5aOy5Y206Zai6YCj44OY44Or44OR44O8IC0tLVxcbiAgY29uc3Qgc2VsZWN0ZWRTZWxsVG90YWxQcmljZSA9IHVzZU1lbW8oKCkgPT4ge1xcbiAgICByZXR1cm4gc2VsZWN0ZWRTZWxsVWlkcy5yZWR1Y2UoKHN1bSwgdWlkKSA9PiB7XFxuICAgICAgY29uc3QgaXRlbSA9IGludmVudG9yeS5maW5kKGkgPT4gaS51aWQgPT09IHVpZCk7XFxuICAgICAgaWYgKCFpdGVtKSByZXR1cm4gc3VtO1xcbiAgICAgIHJldHVybiBzdW0gKyBjYWxjdWxhdGVTZWxsUHJpY2UoaXRlbSwgam9iKTtcXG4gICAgfSwgMCk7XFxuICB9LCBbc2VsZWN0ZWRTZWxsVWlkcywgaW52ZW50b3J5LCBqb2JdKTtcXG5cXG4gIGNvbnN0IHRvZ2dsZVNlbGVjdFNlbGwgPSAodWlkOiBzdHJpbmcpID0+IHtcXG4gICAgY29uc3QgaXRlbSA9IGludmVudG9yeS5maW5kKGkgPT4gaS51aWQgPT09IHVpZCk7XFxuICAgIGlmICghaXRlbSB8fCBpdGVtLmlzTG9ja2VkIHx8IGVxdWlwbWVudC5zdGF0V2VhcG9uSWQgPT09IHVpZCB8fCBlcXVpcG1lbnQuc3RhdEFybW9ySWQgPT09IHVpZCkgcmV0dXJuO1xcblxcbiAgICBzZXRTZWxlY3RlZFNlbGxVaWRzKHByZXYgPT4gXFxuICAgICAgcHJldi5pbmNsdWRlcyh1aWQpID8gcHJldi5maWx0ZXIoaWQgPT4gaWQgIT09IHVpZCkgOiBbLi4ucHJldiwgdWlkXVxcbiAgICApO1xcbiAgfTtcXG5cXG4gIGNvbnN0IGhhbmRsZVNlbGVjdEFsbFVudXNlZEVxdWlwID0gKCkgPT4ge1xcbiAgICBjb25zdCB2YWxpZCA9IGludmVudG9yeS5maWx0ZXIoaSA9PiB7XFxuICAgICAgY29uc3QgdHlwZSA9IElURU1TW2kuYmFzZUlkXT8udHlwZTtcXG4gICAgICBjb25zdCBpc0VxdWlwID0gdHlwZSA9PT0gJ3dlYXBvbicgfHwgdHlwZSA9PT0gJ2FybW9yJztcXG4gICAgICBjb25zdCBpc0VxdWlwcGVkID0gZXF1aXBtZW50LnN0YXRXZWFwb25JZCA9PT0gaS51aWQgfHwgZXF1aXBtZW50LnN0YXRBcm1vcklkID09PSBpLnVpZDtcXG4gICAgICByZXR1cm4gaXNFcXVpcCAmJiAhaS5pc0xvY2tlZCAmJiAhaXNFcXVpcHBlZDtcXG4gICAgfSkubWFwKGkgPT4gaS51aWQpO1xcbiAgICBzZXRTZWxlY3RlZFNlbGxVaWRzKHZhbGlkKTtcXG4gIH07XFxuXFxuICBjb25zdCBoYW5kbGVTZWxlY3RBbGxVbmVuaGFuY2VkID0gKCkgPT4ge1xcbiAgICBjb25zdCB2YWxpZCA9IGludmVudG9yeS5maWx0ZXIoaSA9PiB7XFxuICAgICAgY29uc3QgdHlwZSA9IElURU1TW2kuYmFzZUlkXT8udHlwZTtcXG4gICAgICBjb25zdCBpc0VxdWlwID0gdHlwZSA9PT0gJ3dlYXBvbicgfHwgdHlwZSA9PT0gJ2FybW9yJztcXG4gICAgICBjb25zdCBpc0VxdWlwcGVkID0gZXF1aXBtZW50LnN0YXRXZWFwb25JZCA9PT0gaS51aWQgfHwgZXF1aXBtZW50LnN0YXRBcm1vcklkID09PSBpLnVpZDtcXG4gICAgICBjb25zdCBpc0NsZWFuID0gaS51cGdyYWRlTGV2ZWwgPT09IDAgJiYgKCFpLmxpbWl0QnJlYWsgfHwgaS5saW1pdEJyZWFrID09PSAwKSAmJiAoIWkuc3BlY2lhbEVuY2hhbnRDb3VudCB8fCBpLnNwZWNpYWxFbmNoYW50Q291bnQgPT09IDApICYmIChpLmFkZGVkUG93ZXIgPT09IDApO1xcbiAgICAgIHJldHVybiBpc0VxdWlwICYmICFpLmlzTG9ja2VkICYmICFpc0VxdWlwcGVkICYmIGlzQ2xlYW47XFxuICAgIH0pLm1hcChpID0+IGkudWlkKTtcXG4gICAgc2V0U2VsZWN0ZWRTZWxsVWlkcyh2YWxpZCk7XFxuICB9O1xcblxcbiAgY29uc3QgaGFuZGxlU2VsZWN0QWxsRHVwbGljYXRlcyA9ICgpID0+IHtcXG4gICAgY29uc3QgZ3JvdXBzOiBSZWNvcmQ8c3RyaW5nLCBQbGF5ZXJJdGVtW10+ID0ge307XFxuICAgIGludmVudG9yeS5mb3JFYWNoKGkgPT4ge1xcbiAgICAgIGNvbnN0IHR5cGUgPSBJVEVNU1tpLmJhc2VJZF0/LnR5cGU7XFxuICAgICAgaWYgKHR5cGUgPT09ICd3ZWFwb24nIHx8IHR5cGUgPT09ICdhcm1vcicpIHtcXG4gICAgICAgIGlmICghZ3JvdXBzW2kuYmFzZUlkXSkgZ3JvdXBzW2kuYmFzZUlkXSA9IFtdO1xcbiAgICAgICAgZ3JvdXBzW2kuYmFzZUlkXS5wdXNoKGkpO1xcbiAgICAgIH1cXG4gICAgfSk7XFxuXFxuICAgIGNvbnN0IHNlbGVjdGVkOiBzdHJpbmdbXSA9IFtdO1xcbiAgICBPYmplY3QudmFsdWVzKGdyb3VwcykuZm9yRWFjaChpdGVtcyA9PiB7XFxuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA8PSAxKSByZXR1cm47XFxuICAgICAgY29uc3Qgc29ydGVkID0gWy4uLml0ZW1zXS5zb3J0KChhLCBiKSA9PiB7XFxuICAgICAgICBjb25zdCBhRXEgPSBlcXVpcG1lbnQuc3RhdFdlYXBvbklkID09PSBhLnVpZCB8fCBlcXVpcG1lbnQuc3RhdEFybW9ySWQgPT09IGEudWlkO1xcbiAgICAgICAgY29uc3QgYkVxID0gZXF1aXBtZW50LnN0YXRXZWFwb25JZCA9PT0gYi51aWQgfHwgZXF1aXBtZW50LnN0YXRBcm1vcklkID09PSBiLnVpZDtcXG4gICAgICAgIGlmIChhRXEgJiYgIWJFcSkgcmV0dXJuIC0xO1xcbiAgICAgICAgaWYgKCFhRXEgJiYgYkVxKSByZXR1cm4gMTtcXG4gICAgICAgIGlmIChhLmlzTG9ja2VkICYmICFiLmlzTG9ja2VkKSByZXR1cm4gLTE7XFxuICAgICAgICBpZiAoIWEuaXNMb2NrZWQgJiYgYi5pc0xvY2tlZCkgcmV0dXJuIDE7XFxuICAgICAgICBjb25zdCBhUG93ZXIgPSBhLnVwZ3JhZGVMZXZlbCAqIDMgKyAoYS5saW1pdEJyZWFrIHx8IDApICogNSArIGEuYWRkZWRQb3dlcjtcXG4gICAgICAgIGNvbnN0IGJQb3dlciA9IGIudXBncmFkZUxldmVsICogMyArIChiLmxpbWl0QnJlYWsgfHwgMCkgKiA1ICsgYi5hZGRlZFBvd2VyO1xcbiAgICAgICAgcmV0dXJuIGJQb3dlciAtIGFQb3dlcjtcXG4gICAgICB9KTtcXG5cXG4gICAgICBmb3IgKGxldCBpZHggPSAxOyBpZHggPCBzb3J0ZWQubGVuZ3RoOyBpZHgrKykge1xcbiAgICAgICAgY29uc3QgaXQgPSBzb3J0ZWRbaWR4XTtcXG4gICAgICAgIGNvbnN0IGlzRXEgPSBlcXVpcG1lbnQuc3RhdFdlYXBvbklkID09PSBpdC51aWQgfHwgZXF1aXBtZW50LnN0YXRBcm1vcklkID09PSBpdC51aWQ7XFxuICAgICAgICBpZiAoIWl0LmlzTG9ja2VkICYmICFpc0VxKSB7XFxuICAgICAgICAgIHNlbGVjdGVkLnB1c2goaXQudWlkKTtcXG4gICAgICAgIH1cXG4gICAgICB9XFxuICAgIH0pO1xcblxcbiAgICBzZXRTZWxlY3RlZFNlbGxVaWRzKHNlbGVjdGVkKTtcXG4gIH07XFxuXFxuICBjb25zdCBoYW5kbGVTZWxlY3RBbGxNYXRlcmlhbHMgPSAoKSA9PiB7XFxuICAgIGNvbnN0IHZhbGlkID0gaW52ZW50b3J5LmZpbHRlcihpID0+IHtcXG4gICAgICBjb25zdCB0eXBlID0gSVRFTVNbaS5iYXNlSWRdPy50eXBlO1xcbiAgICAgIHJldHVybiAodHlwZSA9PT0gJ21hdGVyaWFsJyB8fCB0eXBlID09PSAnZ2VtJykgJiYgIWkuaXNMb2NrZWQ7XFxuICAgIH0pLm1hcChpID0+IGkudWlkKTtcXG4gICAgc2V0U2VsZWN0ZWRTZWxsVWlkcyh2YWxpZCk7XFxuICB9O1xcblxcbiAgY29uc3QgdG90YWxCYXRjaFNlbGxQcmljZSA9IHVzZU1lbW8oKCkgPT4ge1xcbiAgICByZXR1cm4gc2VsZWN0ZWRTZWxsVWlkcy5yZWR1Y2UoKHN1bSwgdWlkKSA9PiB7XFxuICAgICAgY29uc3QgaXRlbSA9IGludmVudG9yeS5maW5kKGkgPT4gaS51aWQgPT09IHVpZCk7XFxuICAgICAgcmV0dXJuIHN1bSArIChpdGVtID8gY2FsY3VsYXRlU2VsbFByaWNlKGl0ZW0sIGpvYikgOiAwKTtcXG4gICAgfSwgMCk7XFxuICB9LCBbc2VsZWN0ZWRTZWxsVWlkcywgaW52ZW50b3J5LCBqb2JdKTtcXG5cXG4gIGNvbnN0IGhhbmRsZUV4ZWN1dGVCYXRjaFNlbGwgPSAoKSA9PiB7XFxuICAgIGlmICghc2VsZWN0ZWRTZWxsVWlkcy5sZW5ndGgpIHJldHVybjtcXG4gICAgaWYgKG9uQmF0Y2hTZWxsSXRlbXMpIHtcXG4gICAgICBvbkJhdGNoU2VsbEl0ZW1zKHNlbGVjdGVkU2VsbFVpZHMsIHRvdGFsQmF0Y2hTZWxsUHJpY2UpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIHNlbGVjdGVkU2VsbFVpZHMuZm9yRWFjaCh1aWQgPT4ge1xcbiAgICAgICAgY29uc3QgaXQgPSBpbnZlbnRvcnkuZmluZChpID0+IGkudWlkID09PSB1aWQpO1xcbiAgICAgICAgaWYgKGl0ICYmIG9uU2VsbEl0ZW0pIG9uU2VsbEl0ZW0odWlkLCBjYWxjdWxhdGVTZWxsUHJpY2UoaXQsIGpvYikpO1xcbiAgICAgIH0pO1xcbiAgICB9XFxuICAgIHNldFNlbGVjdGVkU2VsbFVpZHMoW10pO1xcbiAgfTtcXG5cXG4gIGNvbnN0IGhhbmRsZUVuY2hhbnQgPSAocEl0ZW06IFBsYXllckl0ZW0pID0+IHtcXG4gICAgY29uc3QgY29zdCA9IDIwMCArIHBJdGVtLnVwZ3JhZGVMZXZlbCAqIDEwMDtcXG4gICAgaWYgKGdvbGQgPCBjb3N0KSByZXR1cm47XFxuXFxuICAgIGNvbnN0IGFkZGVkUG93ZXIgPSBwSXRlbS5hZGRlZFBvd2VyICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMykgKyAxO1xcbiAgICBjb25zdCBuZXdMZXZlbCA9IHBJdGVtLnVwZ3JhZGVMZXZlbCArIDE7XFxuICAgIFxcbiAgICBjb25zdCBwcmVmaXhlcyA9IFsn6Yut5Yip44GqJywgJ+eCjuOBricsICfkvJ3oqqzjga4nLCAn56Wd56aP44GV44KM44GfJywgJ+WRquOCj+OCjOOBnycsICflkI3lt6Xjga4nLCAn56We6IGW44Gq44KLJ107XFxuICAgIGNvbnN0IGN1c3RvbVByZWZpeCA9IG5ld0xldmVsICUgMyA9PT0gMCA/IHByZWZpeGVzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHByZWZpeGVzLmxlbmd0aCldIDogcEl0ZW0uY3VzdG9tUHJlZml4O1xcblxcbiAgICBvbkVuY2hhbnRJdGVtKHBJdGVtLnVpZCwgY29zdCwge1xcbiAgICAgIC4uLnBJdGVtLFxcbiAgICAgIHVwZ3JhZGVMZXZlbDogbmV3TGV2ZWwsXFxuICAgICAgYWRkZWRQb3dlcixcXG4gICAgICBjdXN0b21QcmVmaXgsXFxuICAgIH0pO1xcbiAgfTtcXG5cXG4gIGNvbnN0IGhhbmRsZUxpbWl0QnJlYWtDbGljayA9IChwSXRlbTogUGxheWVySXRlbSkgPT4ge1xcbiAgICBpZiAoIW9uTGltaXRCcmVhaykgcmV0dXJuO1xcbiAgICBjb25zdCBkdXBsaWNhdGUgPSBpbnZlbnRvcnkuZmluZChpID0+IGkudWlkICE9PSBwSXRlbS51aWQgJiYgaS5iYXNlSWQgPT09IHBJdGVtLmJhc2VJZCk7XFxuICAgIGlmIChkdXBsaWNhdGUpIHtcXG4gICAgICBvbkxpbWl0QnJlYWsocEl0ZW0udWlkLCBkdXBsaWNhdGUudWlkKTtcXG4gICAgfVxcbiAgfTtcXG5cXG4gIGNvbnN0IGhhbmRsZVNwZWNpYWxFbmNoYW50Q2xpY2sgPSAocEl0ZW06IFBsYXllckl0ZW0pID0+IHtcXG4gICAgaWYgKCFvblNwZWNpYWxFbmNoYW50IHx8ICFzZWxlY3RlZE1hdGVyaWFsVWlkKSByZXR1cm47XFxuICAgIFxcbiAgICBjb25zdCBtYXQgPSBtYXRlcmlhbHMuZmluZChtID0+IG0udWlkID09PSBzZWxlY3RlZE1hdGVyaWFsVWlkKTtcXG4gICAgaWYgKCFtYXQpIHJldHVybjtcXG4gICAgXFxuICAgIGNvbnN0IGJhc2VNYXRJdGVtID0gSVRFTVNbbWF0LmJhc2VJZF07XFxuICAgIGlmICghYmFzZU1hdEl0ZW0pIHJldHVybjtcXG5cXG4gICAgY29uc3QgY29zdCA9IDA7IC8vIOOCtOODvOODq+ODieiyu+eUqOeEoeaWmVxcbiAgICBjb25zdCBhZGRlZFBvd2VyID0gcEl0ZW0uYWRkZWRQb3dlciArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDUpICsgMzsgLy8gKzN+NyBwb3dlclxcbiAgICBcXG4gICAgY29uc3QgcHJldkVmZmVjdDogSXRlbUVmZmVjdCA9IHBJdGVtLmFkZGVkRWZmZWN0IHx8IHsgZGVzY3JpcHRpb246ICcnIH07XFxuICAgIGxldCBtYXRFZmZlY3Q6IEl0ZW1FZmZlY3QgPSB7IC4uLnByZXZFZmZlY3QgfTtcXG4gICAgbGV0IHByZWZpeCA9IHByZXZFZmZlY3QuZGVzY3JpcHRpb24gPyAn44Kt44Oh44Op44GuJyA6ICfnpZ7np5jjga4nO1xcblxcbiAgICBpZiAobWF0LmJhc2VJZCA9PT0gJ21fc2xpbWVfamVsbHknKSB7XFxuICAgICAgcHJlZml4ID0gcHJldkVmZmVjdC5kZXNjcmlwdGlvbiA/ICfjgq3jg6Hjg6njga4nIDogJ+eymOaAp+OBric7XFxuICAgICAgbWF0RWZmZWN0LmVuZW15U2xvd1JhdGUgPSBNYXRoLm1pbigwLjkwLCAobWF0RWZmZWN0LmVuZW15U2xvd1JhdGUgfHwgMCkgKyAwLjE1KTtcXG4gICAgfSBlbHNlIGlmIChtYXQuYmFzZUlkID09PSAnbV9nb2JsaW5fZWFyJykge1xcbiAgICAgIHByZWZpeCA9IHByZXZFZmZlY3QuZGVzY3JpcHRpb24gPyAn44Kt44Oh44Op44GuJyA6ICfph47om67jgaonO1xcbiAgICAgIG1hdEVmZmVjdC5jcml0Q2hhbmNlID0gTWF0aC5taW4oMS4wLCAobWF0RWZmZWN0LmNyaXRDaGFuY2UgfHwgMCkgKyAwLjA1KTtcXG4gICAgfSBlbHNlIGlmIChtYXQuYmFzZUlkID09PSAnbV9vcmNfZmFuZycpIHtcXG4gICAgICBwcmVmaXggPSBwcmV2RWZmZWN0LmRlc2NyaXB0aW9uID8gJ+OCreODoeODqeOBricgOiAn6LGq5YKR44GuJztcXG4gICAgICBtYXRFZmZlY3QubGlmZXN0ZWFsID0gTWF0aC5taW4oMS4wLCAobWF0RWZmZWN0LmxpZmVzdGVhbCB8fCAwKSArIDAuMDMpO1xcbiAgICB9IGVsc2UgaWYgKG1hdC5iYXNlSWQgPT09ICdtX2RlbW9uX2hvcm4nKSB7XFxuICAgICAgcHJlZml4ID0gcHJldkVmZmVjdC5kZXNjcmlwdGlvbiA/ICfjgq3jg6Hjg6njga4nIDogJ+mtlOaAp+OBric7XFxuICAgICAgbWF0RWZmZWN0LmhwUmVnZW4gPSAobWF0RWZmZWN0LmhwUmVnZW4gfHwgMCkgKyAyO1xcbiAgICAgIG1hdEVmZmVjdC5kYW1hZ2VNdWx0aXBsaWVyID0gKG1hdEVmZmVjdC5kYW1hZ2VNdWx0aXBsaWVyIHx8IDApICsgMC4wNTtcXG4gICAgfSBlbHNlIGlmIChtYXQuYmFzZUlkID09PSAnbV9kcmFnb25fc2NhbGUnKSB7XFxuICAgICAgcHJlZml4ID0gcHJldkVmZmVjdC5kZXNjcmlwdGlvbiA/ICfjgq3jg6Hjg6njga4nIDogJ+imh+ernOOBric7XFxuICAgICAgbWF0RWZmZWN0Lm1heEhwQm9udXMgPSAobWF0RWZmZWN0Lm1heEhwQm9udXMgfHwgMCkgKyAzMDtcXG4gICAgICBtYXRFZmZlY3QuZ29sZEJvbnVzID0gKG1hdEVmZmVjdC5nb2xkQm9udXMgfHwgMCkgKyAwLjEwO1xcbiAgICB9XFxuXFxuICAgIC8vIEJ1aWxkIG5ldyBkZXNjcmlwdGlvbiBkeW5hbWljYWxseVxcbiAgICBjb25zdCBkZXNjUGFydHMgPSBbXTtcXG4gICAgaWYgKG1hdEVmZmVjdC5lbmVteVNsb3dSYXRlKSBkZXNjUGFydHMucHVzaChg6YGF5bu2JHtNYXRoLnJvdW5kKG1hdEVmZmVjdC5lbmVteVNsb3dSYXRlICogMTAwKX0lYCk7XFxuICAgIGlmIChtYXRFZmZlY3QuY3JpdENoYW5jZSkgZGVzY1BhcnRzLnB1c2goYOS8muW/gyske01hdGgucm91bmQobWF0RWZmZWN0LmNyaXRDaGFuY2UgKiAxMDApfSVgKTtcXG4gICAgaWYgKG1hdEVmZmVjdC5saWZlc3RlYWwpIGRlc2NQYXJ0cy5wdXNoKGDlkLjooYArJHtNYXRoLnJvdW5kKG1hdEVmZmVjdC5saWZlc3RlYWwgKiAxMDApfSVgKTtcXG4gICAgaWYgKG1hdEVmZmVjdC5ocFJlZ2VuIHx8IG1hdEVmZmVjdC5kYW1hZ2VNdWx0aXBsaWVyKSB7XFxuICAgICAgZGVzY1BhcnRzLnB1c2goYOavjuenkkhQKyR7bWF0RWZmZWN0LmhwUmVnZW4gfHwgMH0v44OA44OhKyR7TWF0aC5yb3VuZCgobWF0RWZmZWN0LmRhbWFnZU11bHRpcGxpZXIgfHwgMCkgKiAxMDApfSVgKTtcXG4gICAgfVxcbiAgICBpZiAobWF0RWZmZWN0Lm1heEhwQm9udXMgfHwgbWF0RWZmZWN0LmdvbGRCb251cykge1xcbiAgICAgIGRlc2NQYXJ0cy5wdXNoKGBIUCske21hdEVmZmVjdC5tYXhIcEJvbnVzIHx8IDB9L+mHkSske01hdGgucm91bmQoKG1hdEVmZmVjdC5nb2xkQm9udXMgfHwgMCkgKiAxMDApfSVgKTtcXG4gICAgfVxcbiAgICBtYXRFZmZlY3QuZGVzY3JpcHRpb24gPSBkZXNjUGFydHMuam9pbignIHwgJykgfHwgJ+eJueauiuW8t+WMlua4iCc7XFxuXFxuICAgIGNvbnN0IG5ld0VmZmVjdDogUGxheWVySXRlbSA9IHtcXG4gICAgICAuLi5wSXRlbSxcXG4gICAgICBhZGRlZFBvd2VyLFxcbiAgICAgIHNwZWNpYWxFbmNoYW50Q291bnQ6IChwSXRlbS5zcGVjaWFsRW5jaGFudENvdW50IHx8IDApICsgMSxcXG4gICAgICBjdXN0b21QcmVmaXg6IHByZWZpeCxcXG4gICAgICBhZGRlZEVmZmVjdDogbWF0RWZmZWN0LFxcbiAgICB9O1xcblxcbiAgICBvblNwZWNpYWxFbmNoYW50KHBJdGVtLnVpZCwgc2VsZWN0ZWRNYXRlcmlhbFVpZCwgY29zdCwgbmV3RWZmZWN0KTtcXG4gIH07XFxuXFxuICBjb25zdCByZW5kZXJJbnZlbnRvcnlDYXJkID0gKGl0ZW06IEdhbWVJdGVtKSA9PiB7XFxuICAgIGNvbnN0IHBJdGVtID0gaW52ZW50b3J5LmZpbmQoaSA9PiBpLnVpZCA9PT0gaXRlbS5pZCkhO1xcbiAgICBjb25zdCBpc1N0YXRFcSA9IGVxdWlwbWVudC5zdGF0V2VhcG9uSWQgPT09IGl0ZW0uaWQgfHwgZXF1aXBtZW50LnN0YXRBcm1vcklkID09PSBpdGVtLmlkO1xcbiAgICBjb25zdCBpc0FwcEVxID0gZXF1aXBtZW50LmFwcGVhcmFuY2VXZWFwb25JZCA9PT0gcEl0ZW0uYmFzZUlkIHx8IGVxdWlwbWVudC5hcHBlYXJhbmNlQXJtb3JJZCA9PT0gcEl0ZW0uYmFzZUlkO1xcblxcbiAgICBjb25zdCBzdGF0U2xvdDoga2V5b2YgRXF1aXBtZW50U3RhdGUgPSBpdGVtLnR5cGUgPT09ICd3ZWFwb24nID8gJ3N0YXRXZWFwb25JZCcgOiAnc3RhdEFybW9ySWQnO1xcbiAgICBjb25zdCBhcHBTbG90OiBrZXlvZiBFcXVpcG1lbnRTdGF0ZSA9IGl0ZW0udHlwZSA9PT0gJ3dlYXBvbicgPyAnYXBwZWFyYW5jZVdlYXBvbklkJyA6ICdhcHBlYXJhbmNlQXJtb3JJZCc7XFxuXFxuICAgIC8vIEZpbmQgZHVwbGljYXRlcyBmb3IgTGltaXQgQnJlYWtcXG4gICAgY29uc3QgZHVwbGljYXRlID0gaW52ZW50b3J5LmZpbmQoaSA9PiBpLnVpZCAhPT0gcEl0ZW0udWlkICYmIGkuYmFzZUlkID09PSBwSXRlbS5iYXNlSWQpO1xcbiAgICBjb25zdCBzZWxsUHJpY2UgPSBjYWxjdWxhdGVTZWxsUHJpY2UocEl0ZW0sIGpvYik7XFxuICAgIGNvbnN0IGlzRW5jaGFudGVkID0gcEl0ZW0udXBncmFkZUxldmVsID4gMCB8fCAocEl0ZW0ubGltaXRCcmVhayAmJiBwSXRlbS5saW1pdEJyZWFrID4gMCkgfHwgcEl0ZW0uYWRkZWRQb3dlciA+IDA7XFxuICAgIGNvbnN0IHNwZWNpYWxDb3VudCA9IHBJdGVtLnNwZWNpYWxFbmNoYW50Q291bnQgfHwgMDtcXG4gICAgY29uc3QgYmFzZUl0ZW1EZWYgPSBJVEVNU1twSXRlbS5iYXNlSWRdO1xcbiAgICBjb25zdCBpc0N1cnNlZEl0ZW0gPSAoaXRlbS5pc0N1cnNlZCB8fCBiYXNlSXRlbURlZj8uaXNDdXJzZWQpICYmICFwSXRlbS5pc1VuY3Vyc2VkO1xcbiAgICBjb25zdCB1bmN1cnNlQ29zdCA9IGNhbGN1bGF0ZVVuY3Vyc2VDb3N0KHBJdGVtLCBqb2IpO1xcblxcbiAgICBsZXQgY2FyZEJvcmRlckNvbG9yID0gXFxcImJvcmRlci1zbGF0ZS03MDBcXFwiO1xcbiAgICBsZXQgY2FyZFNoYWRvdyA9IFxcXCJcXFwiO1xcbiAgICBsZXQgY2FyZEJnID0gXFxcImJnLXNsYXRlLTkwMC85MFxcXCI7XFxuICAgIFxcbiAgICBpZiAoKHBJdGVtLmxpbWl0QnJlYWsgfHwgMCkgPj0gMSkge1xcbiAgICAgIGNhcmRCb3JkZXJDb2xvciA9IFxcXCJib3JkZXItcm9zZS01MDBcXFwiO1xcbiAgICAgIGNhcmRCZyA9IFxcXCJiZy1zbGF0ZS05NTBcXFwiO1xcbiAgICAgIGNhcmRTaGFkb3cgPSBcXFwic2hhZG93LVswXzBfMTVweF9yZ2JhKDI0NCw2Myw5NCwwLjQpXVxcXCI7XFxuICAgIH0gZWxzZSBpZiAocEl0ZW0udXBncmFkZUxldmVsID49IDE1KSB7XFxuICAgICAgY2FyZEJvcmRlckNvbG9yID0gXFxcImJvcmRlci1mdWNoc2lhLTUwMFxcXCI7XFxuICAgICAgY2FyZEJnID0gXFxcImJnLXNsYXRlLTk1MFxcXCI7XFxuICAgICAgY2FyZFNoYWRvdyA9IFxcXCJzaGFkb3ctWzBfMF8xMnB4X3JnYmEoMjE3LDcwLDIzOSwwLjQpXVxcXCI7XFxuICAgIH0gZWxzZSBpZiAocEl0ZW0udXBncmFkZUxldmVsID49IDEwKSB7XFxuICAgICAgY2FyZEJvcmRlckNvbG9yID0gXFxcImJvcmRlci1hbWJlci00MDBcXFwiO1xcbiAgICAgIGNhcmRTaGFkb3cgPSBcXFwic2hhZG93LVswXzBfMTBweF9yZ2JhKDI1MSwxOTEsMzYsMC4zKV1cXFwiO1xcbiAgICB9IGVsc2UgaWYgKHBJdGVtLnVwZ3JhZGVMZXZlbCA+PSA1KSB7XFxuICAgICAgY2FyZEJvcmRlckNvbG9yID0gXFxcImJvcmRlci1za3ktNDAwXFxcIjtcXG4gICAgICBjYXJkU2hhZG93ID0gXFxcInNoYWRvdy1bMF8wXzhweF9yZ2JhKDU2LDE4OSwyNDgsMC4yKV1cXFwiO1xcbiAgICB9IGVsc2UgaWYgKHBJdGVtLnVwZ3JhZGVMZXZlbCA+PSAxIHx8IChwSXRlbS5hZGRlZFBvd2VyIHx8IDApID4gMCkge1xcbiAgICAgIGNhcmRCb3JkZXJDb2xvciA9IFxcXCJib3JkZXItZW1lcmFsZC01MDBcXFwiO1xcbiAgICAgIGNhcmRTaGFkb3cgPSBcXFwic2hhZG93LVswXzBfNXB4X3JnYmEoMTYsMTg1LDEyOSwwLjE1KV1cXFwiO1xcbiAgICB9IGVsc2UgaWYgKHBJdGVtLmJhc2VJZC5pbmNsdWRlcygnY3JhZnQnKSkge1xcbiAgICAgIGNhcmRCb3JkZXJDb2xvciA9IFxcXCJib3JkZXItYW1iZXItNjAwXFxcIjtcXG4gICAgICBjYXJkU2hhZG93ID0gXFxcInNoYWRvdy1bMF8wXzhweF9yZ2JhKDIxNywxMTksNiwwLjMpXVxcXCI7XFxuICAgIH1cXG5cXG4gICAgY29uc3QgaXNTZWxlY3RlZEZvclNlbGwgPSBzZWxlY3RlZFNlbGxVaWRzLmluY2x1ZGVzKHBJdGVtLnVpZCk7XFxuICAgIGNvbnN0IGNhblNlbGVjdEZvclNlbGwgPSAhaXNTdGF0RXEgJiYgIXBJdGVtLmlzTG9ja2VkICYmICFpc1F1ZXN0QWN0aXZlO1xcblxcbiAgICByZXR1cm4gKFxcbiAgICAgIDxkaXYgXFxuICAgICAgICBrZXk9e2l0ZW0uaWR9IFxcbiAgICAgICAgb25DbGljaz17KCkgPT4ge1xcbiAgICAgICAgICBpZiAoYmF0Y2hTZWxsTW9kZSAmJiBjYW5TZWxlY3RGb3JTZWxsKSB7XFxuICAgICAgICAgICAgdG9nZ2xlU2VsZWN0U2VsbChwSXRlbS51aWQpO1xcbiAgICAgICAgICB9XFxuICAgICAgICB9fVxcbiAgICAgICAgY2xhc3NOYW1lPXtgcGl4ZWwtcGFuZWwgZmxleCBmbGV4LWNvbCBnYXAtMiBib3JkZXItMiAke2NhcmRCZ30gJHtjYXJkQm9yZGVyQ29sb3J9ICR7Y2FyZFNoYWRvd30gcmVsYXRpdmUgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMzAwIGhvdmVyOnNjYWxlLVsxLjAxXSAke1xcbiAgICAgICAgICBiYXRjaFNlbGxNb2RlID8gKGNhblNlbGVjdEZvclNlbGwgPyAnY3Vyc29yLXBvaW50ZXIgaG92ZXI6Ym9yZGVyLWFtYmVyLTQwMCcgOiAnb3BhY2l0eS02MCBjdXJzb3Itbm90LWFsbG93ZWQnKSA6ICcnXFxuICAgICAgICB9ICR7aXNTZWxlY3RlZEZvclNlbGwgPyAnIWJvcmRlci1hbWJlci00MDAgIWJnLWFtYmVyLTk1MC82MCByaW5nLTIgcmluZy1hbWJlci00MDAgc2hhZG93LVswXzBfMTVweF9yZ2JhKDI0NSwxNTgsMTEsMC40KV0nIDogJyd9YH1cXG4gICAgICA+XFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXFxcIj5cXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXFxcIj5cXG4gICAgICAgICAgICB7YmF0Y2hTZWxsTW9kZSAmJiAoXFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBpdGVtcy1jZW50ZXJcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXRcXG4gICAgICAgICAgICAgICAgICB0eXBlPVxcXCJjaGVja2JveFxcXCJcXG4gICAgICAgICAgICAgICAgICBjaGVja2VkPXtpc1NlbGVjdGVkRm9yU2VsbH1cXG4gICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KCkgPT4gdG9nZ2xlU2VsZWN0U2VsbChwSXRlbS51aWQpfVxcbiAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXshY2FuU2VsZWN0Rm9yU2VsbH1cXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XFxcInctNCBoLTQgYWNjZW50LWFtYmVyLTQwMCBjdXJzb3ItcG9pbnRlciByb3VuZGVkXFxcIlxcbiAgICAgICAgICAgICAgICAvPlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgKX1cXG4gICAgICAgICAgICA8SXRlbUljb24gaXRlbT17eyAuLi5pdGVtLCBpZDogcEl0ZW0uYmFzZUlkIH19IC8+XFxuICAgICAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IGZsZXgtd3JhcFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC1zbSBmb250LWJvbGQgdGV4dC1zbGF0ZS0xMDBcXFwiPntpdGVtLm5hbWV9PC9zcGFuPlxcbiAgICAgICAgICAgICAgICB7c3BlY2lhbENvdW50ID4gMCAmJiAoXFxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LVs5cHhdIGJnLXB1cnBsZS05MDAvOTAgdGV4dC1wdXJwbGUtMjAwIGJvcmRlciBib3JkZXItcHVycGxlLTYwMCBweC0xIHB5LTAuMiByb3VuZGVkIGZvbnQtZXh0cmFib2xkXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIOKYheeJueauiuW8t+WMliB7c3BlY2lhbENvdW50feWbnlxcbiAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgKX1cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNDAwXFxcIj5cXG4gICAgICAgICAgICAgICAge2l0ZW0udHlwZSA9PT0gJ3dlYXBvbicgPyAn5pS75pKD5YqbJyA6ICfpmLLlvqHlipsnfTogPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LWFtYmVyLTQwMCBmb250LWJvbGRcXFwiPit7aXRlbS5wb3dlcn08L3NwYW4+XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41XFxcIiBvbkNsaWNrPXtlID0+IGUuc3RvcFByb3BhZ2F0aW9uKCl9PlxcbiAgICAgICAgICAgIDxidXR0b25cXG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uVG9nZ2xlTG9jayAmJiBvblRvZ2dsZUxvY2socEl0ZW0udWlkKX1cXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cXFwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0xICFweC0yLjUgYWN0aXZlIGhvdmVyOiFiZy1zbGF0ZS03MDBcXFwiXFxuICAgICAgICAgICAgICB0aXRsZT1cXFwi44Ot44OD44Kv44GX44Gm5aOy5Y2044O75YiG6Kej44KS6Ziy5q2iXFxcIlxcbiAgICAgICAgICAgID5cXG4gICAgICAgICAgICAgIHtwSXRlbS5pc0xvY2tlZCA/ICfwn5SSJyA6ICfwn5STJ31cXG4gICAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICAgICA8YnV0dG9uXFxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXREZXRhaWxQbGF5ZXJJdGVtKHBJdGVtKX1cXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cXFwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0xICFweC0yLjUgYWN0aXZlICFib3JkZXItc2t5LTQwMCAhdGV4dC1za3ktMzAwIGhvdmVyOiFiZy1za3ktOTUwXFxcIlxcbiAgICAgICAgICAgID5cXG4gICAgICAgICAgICAgIPCflI0g6Kmz57SwXFxuICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICB7aXRlbS5lZmZlY3QgJiYgKFxcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidGV4dC1bMTFweF0gdGV4dC1za3ktMzAwIGJnLXNsYXRlLTk1MCBwLTIgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgcm91bmRlZFxcXCI+XFxuICAgICAgICAgICAg4pyoIHtpdGVtLmVmZmVjdC5kZXNjcmlwdGlvbn1cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICApfVxcblxcbiAgICAgICAge3RhYiA9PT0gJ2ludmVudG9yeScgPyAoXFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGZsZXgtY29sIGdhcC0yIG10LTFcXFwiIG9uQ2xpY2s9e2UgPT4gZS5zdG9wUHJvcGFnYXRpb24oKX0+XFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZ2FwLTJcXFwiPlxcbiAgICAgICAgICAgICAgPGJ1dHRvblxcbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBvbkVxdWlwKHN0YXRTbG90LCBpdGVtLmlkKX1cXG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2lzU3RhdEVxIHx8IGlzUXVlc3RBY3RpdmV9XFxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHBpeGVsLWJ0biB0ZXh0LXhzIGZsZXgtMSAke2lzU3RhdEVxID8gJ2FjdGl2ZSAhYm9yZGVyLWVtZXJhbGQtNDAwICF0ZXh0LWVtZXJhbGQtMzAwJyA6ICcnfSAke2lzUXVlc3RBY3RpdmUgPyAnb3BhY2l0eS01MCBjdXJzb3Itbm90LWFsbG93ZWQnIDogJyd9YH1cXG4gICAgICAgICAgICAgID5cXG4gICAgICAgICAgICAgICAge2lzU3RhdEVxID8gJ+iDveWKmzog6KOF5YKZ5LitJyA6ICfog73lipvjgpLoo4XlgpknfVxcbiAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgICA8YnV0dG9uXFxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uRXF1aXAoYXBwU2xvdCwgcEl0ZW0uYmFzZUlkKX1cXG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2lzQXBwRXEgfHwgaXNRdWVzdEFjdGl2ZX1cXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcGl4ZWwtYnRuIHRleHQteHMgZmxleC0xICR7aXNBcHBFcSA/ICdhY3RpdmUgIWJvcmRlci1wdXJwbGUtNDAwICF0ZXh0LXB1cnBsZS0zMDAnIDogJyd9ICR7aXNRdWVzdEFjdGl2ZSA/ICdvcGFjaXR5LTUwIGN1cnNvci1ub3QtYWxsb3dlZCcgOiAnJ31gfVxcbiAgICAgICAgICAgICAgPlxcbiAgICAgICAgICAgICAgICB7aXNBcHBFcSA/ICfopovjgZ/nm646IOijheWCmeS4rScgOiAn6KaL44Gf55uu44KS6KOF5YKZJ31cXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gYm9yZGVyLXQgYm9yZGVyLXNsYXRlLTgwMC84MCBwdC0yIHRleHQteHNcXFwiPlxcbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMFxcXCI+5aOy5Y205L6h5qC8OiA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtYW1iZXItMzAwIGZvbnQtYm9sZFxcXCI+8J+qmSB7c2VsbFByaWNlfSBHPC9zcGFuPjwvc3Bhbj5cXG4gICAgICAgICAgICAgIDxidXR0b25cXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gb25TZWxsSXRlbSAmJiBvblNlbGxJdGVtKHBJdGVtLnVpZCwgc2VsbFByaWNlKX1cXG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2lzU3RhdEVxIHx8IGlzUXVlc3RBY3RpdmUgfHwgcEl0ZW0uaXNMb2NrZWR9XFxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cXFwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0xICFweC0zIGFjdGl2ZSAhYm9yZGVyLWFtYmVyLTQwMCBkaXNhYmxlZDpvcGFjaXR5LTQwXFxcIlxcbiAgICAgICAgICAgICAgPlxcbiAgICAgICAgICAgICAgICB7aXNTdGF0RXEgPyAn6KOF5YKZ5Lit5LiN5Y+vJyA6IHBJdGVtLmlzTG9ja2VkID8gJ+ODreODg+OCr+S4rScgOiAn8J+SsCDlo7LljbTjgZnjgosnfVxcbiAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgKSA6IChcXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZmxleC1jb2wgZ2FwLTIgbXQtMSBwdC0yIGJvcmRlci10IGJvcmRlci1zbGF0ZS04MDBcXFwiIG9uQ2xpY2s9e2UgPT4gZS5zdG9wUHJvcGFnYXRpb24oKX0+XFxuICAgICAgICAgICAgey8qIFVuY3Vyc2UgU2VjdGlvbiBpZiBDdXJzZWQgKi99XFxuICAgICAgICAgICAge2lzQ3Vyc2VkSXRlbSAmJiAoXFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGJnLXB1cnBsZS05NTAvODAgcC0yIGJvcmRlciBib3JkZXItcHVycGxlLTcwMCByb3VuZGVkXFxcIj5cXG4gICAgICAgICAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidGV4dC1bMTFweF0gdGV4dC1wdXJwbGUtMzAwIGZvbnQtYm9sZCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj7inJ3vuI8g5ZGq44GE44KS6Kej6ZmkICjop6PlkaopPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJ0ZXh0LVsxMHB4XSB0ZXh0LXB1cnBsZS0yMDAvODBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAg6LK755SoOiA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtYW1iZXItMzAwIGZvbnQtYm9sZFxcXCI+8J+qmSB7dW5jdXJzZUNvc3QudG9Mb2NhbGVTdHJpbmcoKX0gRzwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC1bOXB4XSB0ZXh0LXB1cnBsZS0zMDAvODAgbWwtMVxcXCI+KOavjuenkkhQ44OJ44Os44Kk44Oz44KS5rWE5YyWKTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDxidXR0b25cXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRVbmN1cnNlQ29uZmlybUl0ZW0oeyBpdGVtOiBwSXRlbSwgZ2FtZUl0ZW06IGl0ZW0sIGNvc3Q6IHVuY3Vyc2VDb3N0IH0pfVxcbiAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtnb2xkIDwgdW5jdXJzZUNvc3QgfHwgaXNRdWVzdEFjdGl2ZX1cXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XFxcInBpeGVsLWJ0biB0ZXh0LVsxMHB4XSAhcHktMSAhcHgtMyBhY3RpdmUgIWJnLXB1cnBsZS04MDAgIXRleHQtcHVycGxlLTEwMCAhYm9yZGVyLXB1cnBsZS00MDAgaG92ZXI6IWJnLXB1cnBsZS03MDAgZGlzYWJsZWQ6b3BhY2l0eS00MCBmb250LWJvbGRcXFwiXFxuICAgICAgICAgICAgICAgID5cXG4gICAgICAgICAgICAgICAgICDinJ3vuI8g6Kej5ZGq44GZ44KLXFxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgKX1cXG5cXG4gICAgICAgICAgICB7LyogQmFzaWMgRW5jaGFudCB3aXRoIEJhdGNoIEVuaGFuY2VtZW50cyAoKzEsICs1LCArMTAsIE1BWCkgKi99XFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZmxleC1jb2wgZ2FwLTEuNSBiZy1zbGF0ZS05NTAgcC0yIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHJvdW5kZWRcXFwiPlxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDAgZm9udC1ib2xkXFxcIj7ln7rmnKzlvLfljJYgKOePvuWcqCBMdi57cEl0ZW0udXBncmFkZUxldmVsfSk8L3NwYW4+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC1bMTBweF0gdGV4dC1hbWJlci0zMDAgZm9udC1ib2xkXFxcIj7mrKE6IPCfqpkgeygyMDAgKyBwSXRlbS51cGdyYWRlTGV2ZWwgKiAxMDApLnRvTG9jYWxlU3RyaW5nKCl9IEc8L3NwYW4+XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJncmlkIGdyaWQtY29scy00IGdhcC0xXFxcIj5cXG4gICAgICAgICAgICAgICAgeygoKSA9PiB7XFxuICAgICAgICAgICAgICAgICAgY29uc3QgY29zdDEgPSAyMDAgKyBwSXRlbS51cGdyYWRlTGV2ZWwgKiAxMDA7XFxuICAgICAgICAgICAgICAgICAgY29uc3QgY29zdDUgPSBjYWxjdWxhdGVCYXRjaEVuY2hhbnRDb3N0KHBJdGVtLnVwZ3JhZGVMZXZlbCwgNSk7XFxuICAgICAgICAgICAgICAgICAgY29uc3QgY29zdDEwID0gY2FsY3VsYXRlQmF0Y2hFbmNoYW50Q29zdChwSXRlbS51cGdyYWRlTGV2ZWwsIDEwKTtcXG4gICAgICAgICAgICAgICAgICBjb25zdCB7IG1heExldmVscywgdG90YWxDb3N0OiBtYXhDb3N0IH0gPSBjYWxjdWxhdGVNYXhFbmNoYW50TGV2ZWxzKHBJdGVtLnVwZ3JhZGVMZXZlbCwgZ29sZCk7XFxuXFxuICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0Q29zdCA9IChjOiBudW1iZXIpID0+IGMgPj0gMTAwMDAgPyBgJHsoYy8xMDAwKS50b0ZpeGVkKDApfWtgIDogYyA+PSAxMDAwID8gYCR7KGMvMTAwMCkudG9GaXhlZCgxKX1rYCA6IGAke2N9YDtcXG5cXG4gICAgICAgICAgICAgICAgICByZXR1cm4gKFxcbiAgICAgICAgICAgICAgICAgICAgPD5cXG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgdXBkYXRlZEl0ZW0sIHRvdGFsQ29zdCB9ID0gcGVyZm9ybUJhdGNoRW5jaGFudChwSXRlbSwgMSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbkVuY2hhbnRJdGVtKHBJdGVtLnVpZCwgdG90YWxDb3N0LCB1cGRhdGVkSXRlbSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgfX1cXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17Z29sZCA8IGNvc3QxIHx8IGlzUXVlc3RBY3RpdmV9XFxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVxcXCJwaXhlbC1idG4gdGV4dC1bMTBweF0gIXB5LTEgYWN0aXZlICFib3JkZXItcm9zZS00MDAgZGlzYWJsZWQ6b3BhY2l0eS00MFxcXCJcXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17YDHlm57lvLfljJYgKOiyu+eUqDog8J+qmSR7Y29zdDEudG9Mb2NhbGVTdHJpbmcoKX1HKWB9XFxuICAgICAgICAgICAgICAgICAgICAgID5cXG4gICAgICAgICAgICAgICAgICAgICAgICArMSAoe2Zvcm1hdENvc3QoY29zdDEpfSlcXG4gICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHVwZGF0ZWRJdGVtLCB0b3RhbENvc3QgfSA9IHBlcmZvcm1CYXRjaEVuY2hhbnQocEl0ZW0sIDUpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25FbmNoYW50SXRlbShwSXRlbS51aWQsIHRvdGFsQ29zdCwgdXBkYXRlZEl0ZW0pO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIH19XFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2dvbGQgPCBjb3N0NSB8fCBpc1F1ZXN0QWN0aXZlfVxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cXFwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0xIGFjdGl2ZSAhYm9yZGVyLXJvc2UtNDAwICFiZy1yb3NlLTk1MC80MCBob3ZlcjohYmctcm9zZS05MDAgZGlzYWJsZWQ6b3BhY2l0eS00MCBmb250LWJvbGRcXFwiXFxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2A15Zue44G+44Go44KB5by35YyWICjosrvnlKg6IPCfqpkke2Nvc3Q1LnRvTG9jYWxlU3RyaW5nKCl9RylgfVxcbiAgICAgICAgICAgICAgICAgICAgICA+XFxuICAgICAgICAgICAgICAgICAgICAgICAgKzUgKHtmb3JtYXRDb3N0KGNvc3Q1KX0pXFxuICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXFxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyB1cGRhdGVkSXRlbSwgdG90YWxDb3N0IH0gPSBwZXJmb3JtQmF0Y2hFbmNoYW50KHBJdGVtLCAxMCk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbkVuY2hhbnRJdGVtKHBJdGVtLnVpZCwgdG90YWxDb3N0LCB1cGRhdGVkSXRlbSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgfX1cXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17Z29sZCA8IGNvc3QxMCB8fCBpc1F1ZXN0QWN0aXZlfVxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cXFwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0xIGFjdGl2ZSAhYm9yZGVyLWFtYmVyLTQwMCAhYmctYW1iZXItOTUwLzQwIGhvdmVyOiFiZy1hbWJlci05MDAgZGlzYWJsZWQ6b3BhY2l0eS00MCBmb250LWJvbGRcXFwiXFxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2AxMOWbnuOBvuOBqOOCgeW8t+WMliAo6LK755SoOiDwn6qZJHtjb3N0MTAudG9Mb2NhbGVTdHJpbmcoKX1HKWB9XFxuICAgICAgICAgICAgICAgICAgICAgID5cXG4gICAgICAgICAgICAgICAgICAgICAgICArMTAgKHtmb3JtYXRDb3N0KGNvc3QxMCl9KVxcbiAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtYXhMZXZlbHMgPD0gMCkgcmV0dXJuO1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyB1cGRhdGVkSXRlbSwgdG90YWxDb3N0IH0gPSBwZXJmb3JtQmF0Y2hFbmNoYW50KHBJdGVtLCBtYXhMZXZlbHMpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25FbmNoYW50SXRlbShwSXRlbS51aWQsIHRvdGFsQ29zdCwgdXBkYXRlZEl0ZW0pO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIH19XFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e21heExldmVscyA8PSAwIHx8IGlzUXVlc3RBY3RpdmV9XFxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVxcXCJwaXhlbC1idG4gdGV4dC1bMTBweF0gIXB5LTEgYWN0aXZlICFib3JkZXItZW1lcmFsZC00MDAgIWJnLWVtZXJhbGQtOTUwLzYwIGhvdmVyOiFiZy1lbWVyYWxkLTkwMCB0ZXh0LWVtZXJhbGQtMjAwIGRpc2FibGVkOm9wYWNpdHktNDAgZm9udC1ibGFja1xcXCJcXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17YOaJgOaMgemHkeOBp+acgOWkp+W8t+WMliAoKyR7bWF4TGV2ZWxzfeWbniAvIOiyu+eUqDog8J+qmSR7bWF4Q29zdC50b0xvY2FsZVN0cmluZygpfUcpYH1cXG4gICAgICAgICAgICAgICAgICAgICAgPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIE1BWHttYXhMZXZlbHMgPiAwID8gYCgrJHttYXhMZXZlbHN9KWAgOiAnJ31cXG4gICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgICA8Lz5cXG4gICAgICAgICAgICAgICAgICApO1xcbiAgICAgICAgICAgICAgICB9KSgpfVxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgICAgey8qIExpbWl0IEJyZWFrIC8gTWVyZ2UgKDHlh7ggb3Ig5LiA5ous5ZCI5L2TKSAqL31cXG4gICAgICAgICAgICB7KCgpID0+IHtcXG4gICAgICAgICAgICAgIGNvbnN0IGR1cGxpY2F0ZXMgPSBpbnZlbnRvcnkuZmlsdGVyKGkgPT4gXFxuICAgICAgICAgICAgICAgIGkudWlkICE9PSBwSXRlbS51aWQgJiYgXFxuICAgICAgICAgICAgICAgIGkuYmFzZUlkID09PSBwSXRlbS5iYXNlSWQgJiYgXFxuICAgICAgICAgICAgICAgICFpLmlzTG9ja2VkICYmIFxcbiAgICAgICAgICAgICAgICBlcXVpcG1lbnQuc3RhdFdlYXBvbklkICE9PSBpLnVpZCAmJiBcXG4gICAgICAgICAgICAgICAgZXF1aXBtZW50LnN0YXRBcm1vcklkICE9PSBpLnVpZFxcbiAgICAgICAgICAgICAgKTtcXG5cXG4gICAgICAgICAgICAgIHJldHVybiAoXFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gYm9yZGVyLXQgYm9yZGVyLXNsYXRlLTgwMC81MCBwdC0yIGZsZXgtd3JhcCBnYXAtMVxcXCI+XFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNDAwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIOWQjOWQjeijheWCmeWQiOS9kyAoe2R1cGxpY2F0ZXMubGVuZ3RofeWAiyDmiYDmjIEpXFxuICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0xXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIHtkdXBsaWNhdGVzLmxlbmd0aCA+IDAgJiYgKFxcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXFxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9uTGltaXRCcmVhaykgb25MaW1pdEJyZWFrKHBJdGVtLnVpZCwgZHVwbGljYXRlc1swXS51aWQpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIH19XFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2lzUXVlc3RBY3RpdmV9XFxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVxcXCJwaXhlbC1idG4gdGV4dC1bMTBweF0gIXB5LTEgYWN0aXZlIGRpc2FibGVkOm9wYWNpdHktNDBcXFwiXFxuICAgICAgICAgICAgICAgICAgICAgID5cXG4gICAgICAgICAgICAgICAgICAgICAgICArMeWHuFxcbiAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgICl9XFxuICAgICAgICAgICAgICAgICAgICB7ZHVwbGljYXRlcy5sZW5ndGggPiAxICYmIChcXG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbkJhdGNoTGltaXRCcmVhaykge1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkJhdGNoTGltaXRCcmVhayhwSXRlbS51aWQsIGR1cGxpY2F0ZXMubWFwKGQgPT4gZC51aWQpKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob25MaW1pdEJyZWFrKSB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cGxpY2F0ZXMuZm9yRWFjaChkID0+IG9uTGltaXRCcmVhayhwSXRlbS51aWQsIGQudWlkKSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgICAgICAgICAgfX1cXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNRdWVzdEFjdGl2ZX1cXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XFxcInBpeGVsLWJ0biB0ZXh0LVsxMHB4XSAhcHktMSBhY3RpdmUgIWJnLXJvc2UtOTAwICF0ZXh0LXJvc2UtMTAwICFib3JkZXItcm9zZS00MDAgaG92ZXI6IWJnLXJvc2UtODAwIGRpc2FibGVkOm9wYWNpdHktNDAgZm9udC1ib2xkXFxcIlxcbiAgICAgICAgICAgICAgICAgICAgICA+XFxuICAgICAgICAgICAgICAgICAgICAgICAg8J+UqCDlhah7ZHVwbGljYXRlcy5sZW5ndGh95YCL5LiA5ous5ZCI5L2TICgre2R1cGxpY2F0ZXMubGVuZ3RofeWHuClcXG4gICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICAgICAgICAge2R1cGxpY2F0ZXMubGVuZ3RoID09PSAwICYmIChcXG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTYwMFxcXCI+5ZCI5L2T5Y+v6IO95ZOB44Gq44GXPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgKX1cXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICApO1xcbiAgICAgICAgICAgIH0pKCl9XFxuICAgICAgICAgICAgXFxuICAgICAgICAgICAgey8qIFNwZWNpYWwgRW5jaGFudCB3aXRoIE1hdGVyaWFsIEJhdGNoICovfVxcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGZsZXgtY29sIGdhcC0xLjUgYmctc2xhdGUtOTUwIHAtMiBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCByb3VuZGVkIG10LTFcXFwiPlxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBtYi0wLjVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNDAwXFxcIj7ntKDmnZDjgafnibnmrorlvLfljJYgKOOCtOODvOODq+ODieS4jeimgSk8L3NwYW4+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC1bMTBweF0gdGV4dC1wdXJwbGUtMzAwIGZvbnQtYm9sZCBiZy1wdXJwbGUtOTUwIHB4LTEuNSBweS0wLjUgcm91bmRlZCBib3JkZXIgYm9yZGVyLXB1cnBsZS04MDBcXFwiPlxcbiAgICAgICAgICAgICAgICAgIOe0r+ioiCB7c3BlY2lhbENvdW50feWbniDlvLfljJbmuIhcXG4gICAgICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2VsZWN0IFxcbiAgICAgICAgICAgICAgICAgIHZhbHVlPXtzZWxlY3RlZE1hdGVyaWFsVWlkfSBcXG4gICAgICAgICAgICAgICAgICBvbkNoYW5nZT17ZSA9PiBzZXRTZWxlY3RlZE1hdGVyaWFsVWlkKGUudGFyZ2V0LnZhbHVlKX1cXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XFxcImJnLXNsYXRlLTkwMCB0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTIwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCByb3VuZGVkIHAtMSBmbGV4LTFcXFwiXFxuICAgICAgICAgICAgICAgID5cXG4gICAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiIGRpc2FibGVkPue0oOadkOOCkumBuOaKnjwvb3B0aW9uPlxcbiAgICAgICAgICAgICAgICAgIHttYXRlcmlhbHMubWFwKG0gPT4ge1xcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmFzZU1hdCA9IElURU1TW20uYmFzZUlkXTtcXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gbWF0ZXJpYWxzLmZpbHRlcihtYXQgPT4gbWF0LmJhc2VJZCA9PT0gbS5iYXNlSWQpLmxlbmd0aDtcXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoXFxuICAgICAgICAgICAgICAgICAgICAgIDxvcHRpb24ga2V5PXttLnVpZH0gdmFsdWU9e20udWlkfT57YmFzZU1hdD8ubmFtZX0gKOaJgOaMgToge2NvdW50feWAiyk8L29wdGlvbj5cXG4gICAgICAgICAgICAgICAgICAgICk7XFxuICAgICAgICAgICAgICAgICAgfSl9XFxuICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgICAgICB7c2VsZWN0ZWRNYXRlcmlhbFVpZCAmJiAoKCkgPT4ge1xcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxNYXQgPSBtYXRlcmlhbHMuZmluZChtID0+IG0udWlkID09PSBzZWxlY3RlZE1hdGVyaWFsVWlkKTtcXG4gICAgICAgICAgICAgICAgaWYgKCFzZWxNYXQpIHJldHVybiBudWxsO1xcbiAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVNYXRzID0gbWF0ZXJpYWxzLmZpbHRlcihtID0+IG0uYmFzZUlkID09PSBzZWxNYXQuYmFzZUlkKTtcXG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Q291bnQgPSBhdmFpbGFibGVNYXRzLmxlbmd0aDtcXG4gICAgICAgICAgICAgICAgY29uc3QgY3VyUXR5ID0gTWF0aC5taW4oc3BlY2lhbEVuY2hhbnRRdHkgfHwgMSwgbWF0Q291bnQpO1xcblxcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRJbmZvOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xcbiAgICAgICAgICAgICAgICAgICdtX3NsaW1lX2plbGx5JzogYPCfn6Ig57KY44KK5bGe5oCnOiDmlbXjga7mlLvmkoPpgJ/luqYgLSR7TWF0aC5taW4oOTAsIDE1ICogY3VyUXR5KX0lICjnspjmtrLjgrnjg63jg7wpYCxcXG4gICAgICAgICAgICAgICAgICAnbV9nb2JsaW5fZWFyJzogYPCflLQg5Lya5b+D5bGe5oCnOiDjgq/jg6rjg4bjgqPjgqvjg6vnjocgKyR7TWF0aC5taW4oMTAwLCA1ICogY3VyUXR5KX0lYCxcXG4gICAgICAgICAgICAgICAgICAnbV9vcmNfZmFuZyc6IGDwn5+jIOWQuOihgOWxnuaApzog5pS75pKD5pmCSFDlkLjlj44gKyR7TWF0aC5taW4oMTAwLCAzICogY3VyUXR5KX0lYCxcXG4gICAgICAgICAgICAgICAgICAnbV9kZW1vbl9ob3JuJzogYPCfn6Eg6a2U5oCn5bGe5oCnOiDmr47np5JIUOWbnuW+qSskezIgKiBjdXJRdHl9ICYg5LiO44OA44OhKyR7NSAqIGN1clF0eX0lYCxcXG4gICAgICAgICAgICAgICAgICAnbV9kcmFnb25fc2NhbGUnOiBg8J+QsiDopofnq5zlsZ7mgKc6IOacgOWkp0hQKyR7MzAgKiBjdXJRdHl9ICYg542y5b6XRyskezEwICogY3VyUXR5fSVgLFxcbiAgICAgICAgICAgICAgICB9O1xcblxcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGZsZXgtY29sIGdhcC0xLjUgbXQtMVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidGV4dC1bOXB4XSB0ZXh0LXB1cnBsZS0yMDAgYmctcHVycGxlLTk1MC85MCBwLTEuNSByb3VuZGVkIGJvcmRlciBib3JkZXItcHVycGxlLTgwMC85MFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgIOOAkHtjdXJRdHl95YCL5raI6LK75pmC44Gu5LuY5LiO5LqI5a6a44CRe21hdEluZm9bc2VsTWF0LmJhc2VJZF0gfHwgJ+KcqCDnibnmrorlirnmnpzku5jkuI4nfSAo6IO95YqbK3soMyAqIGN1clF0eSl944Cceyg3ICogY3VyUXR5KX0pXFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIFxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtMSBmbGV4LXdyYXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNDAwXFxcIj7mtojosrvmlbA6PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBnYXAtMVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAge1sxLCA1LCAxMF0ubWFwKHEgPT4ge1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHEgPiBtYXRDb3VudCAmJiBxICE9PSAxKSByZXR1cm4gbnVsbDtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e3F9XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cXFwiYnV0dG9uXFxcIlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNwZWNpYWxFbmNoYW50UXR5KHEpfVxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHBpeGVsLWJ0biB0ZXh0LVs5cHhdICFweS0wLjUgIXB4LTEuNSAke2N1clF0eSA9PT0gcSA/ICdhY3RpdmUgIWJvcmRlci1wdXJwbGUtNDAwICF0ZXh0LXB1cnBsZS0zMDAnIDogJyd9YH1cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIMOXe3F9XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICB9KX1cXG4gICAgICAgICAgICAgICAgICAgICAgICB7bWF0Q291bnQgPiAxICYmIChcXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cXFwiYnV0dG9uXFxcIlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRTcGVjaWFsRW5jaGFudFF0eShtYXRDb3VudCl9XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHBpeGVsLWJ0biB0ZXh0LVs5cHhdICFweS0wLjUgIXB4LTEuNSAke2N1clF0eSA9PT0gbWF0Q291bnQgPyAnYWN0aXZlICFib3JkZXItcHVycGxlLTQwMCAhdGV4dC1wdXJwbGUtMzAwJyA6ICcnfWB9XFxuICAgICAgICAgICAgICAgICAgICAgICAgICA+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIOWFqOaVsCjDl3ttYXRDb3VudH0pXFxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxcbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9Db25zdW1lID0gYXZhaWxhYmxlTWF0cy5zbGljZSgwLCBjdXJRdHkpLm1hcChtID0+IG0udWlkKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGVkSXRlbSA9IHBlcmZvcm1CYXRjaFNwZWNpYWxFbmNoYW50KHBJdGVtLCBzZWxNYXQuYmFzZUlkLCBjdXJRdHkpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbkJhdGNoU3BlY2lhbEVuY2hhbnQpIHtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQmF0Y2hTcGVjaWFsRW5jaGFudChwSXRlbS51aWQsIHRvQ29uc3VtZSwgMCwgdXBkYXRlZEl0ZW0pO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob25TcGVjaWFsRW5jaGFudCkge1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25TcGVjaWFsRW5jaGFudChwSXRlbS51aWQsIHRvQ29uc3VtZVswXSwgMCwgdXBkYXRlZEl0ZW0pO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICAgICAgICAgICAgfX1cXG4gICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9eyFzZWxlY3RlZE1hdGVyaWFsVWlkIHx8IG1hdENvdW50ID09PSAwIHx8IGlzUXVlc3RBY3RpdmV9XFxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cXFwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0xIGFjdGl2ZSAhYm9yZGVyLXB1cnBsZS00MDAgIWJnLXB1cnBsZS05MDAgaG92ZXI6IWJnLXB1cnBsZS04MDAgIXRleHQtcHVycGxlLTEwMCBkaXNhYmxlZDpvcGFjaXR5LTQwIGZvbnQtYm9sZCBtdC0wLjVcXFwiXFxuICAgICAgICAgICAgICAgICAgICA+XFxuICAgICAgICAgICAgICAgICAgICAgIOKcqCDnibnmrorlvLfljJbjgpLlrp/ooYwgKOe0oOadkCDDl3tjdXJRdHl95YCLIOa2iOiyuylcXG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICApO1xcbiAgICAgICAgICAgICAgfSkoKX1cXG4gICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgICB7LyogRm9yZ2UgUmVzYWxlIC8gU2VsbCBTZWN0aW9uICovfVxcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gYmctYW1iZXItOTUwLzMwIHAtMiBib3JkZXIgYm9yZGVyLWFtYmVyLTgwMC82MCByb3VuZGVkIG10LTFcXFwiPlxcbiAgICAgICAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0xXFxcIj5cXG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtWzExcHhdIHRleHQtYW1iZXItMjAwIGZvbnQtYm9sZFxcXCI+8J+SsCDpjZvlhrblsYvjgaflo7LljbTjg7vliIbop6M8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAge2lzRW5jaGFudGVkICYmIChcXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC1bOXB4XSBiZy1hbWJlci04MDAgdGV4dC1hbWJlci0xMDAgcHgtMSBweS0wLjIgcm91bmRlZCBmb250LWJvbGRcXFwiPumrmOS+oeiyt+WPluS4rSE8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgKX1cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJ0ZXh0LVsxMHB4XSB0ZXh0LWFtYmVyLTMwMC84MFxcXCI+XFxuICAgICAgICAgICAgICAgICAg5p+75a6a6aGNOiA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtYW1iZXItMzAwIGZvbnQtYm9sZCB0ZXh0LXhzXFxcIj7wn6qZIHtzZWxsUHJpY2V9IEc8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAge2lzRW5jaGFudGVkICYmIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC1bOXB4XSB0ZXh0LWFtYmVyLTQwMC85MCBtbC0xXFxcIj4o5by35YyW44O75Ye444Oc44O844OK44K55Y+N5pig5riIKTwvc3Bhbj59XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBmbGV4LWNvbCBnYXAtMS41XFxcIj5cXG4gICAgICAgICAgICAgICAgPGJ1dHRvblxcbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uU2VsbEl0ZW0gJiYgb25TZWxsSXRlbShwSXRlbS51aWQsIHNlbGxQcmljZSl9XFxuICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2lzU3RhdEVxIHx8IGlzUXVlc3RBY3RpdmUgfHwgcEl0ZW0uaXNMb2NrZWR9XFxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVxcXCJwaXhlbC1idG4gdGV4dC1bMTBweF0gIXB5LTEgIXB4LTMgYWN0aXZlICFib3JkZXItYW1iZXItNDAwIGRpc2FibGVkOm9wYWNpdHktNDBcXFwiXFxuICAgICAgICAgICAgICAgID5cXG4gICAgICAgICAgICAgICAgICB7aXNTdGF0RXEgPyAn6KOF5YKZ5Lit5LiN5Y+vJyA6IHBJdGVtLmlzTG9ja2VkID8gJ+ODreODg+OCr+S4rScgOiAn5aOy5Y2044GZ44KLJ31cXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgICAgIDxidXR0b25cXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXREaXNtYW50bGVDb25maXJtSXRlbSh7IGl0ZW06IHBJdGVtLCBnYW1lSXRlbTogaXRlbSB9KX1cXG4gICAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNTdGF0RXEgfHwgaXNRdWVzdEFjdGl2ZSB8fCBwSXRlbS5pc0xvY2tlZH1cXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XFxcInBpeGVsLWJ0biB0ZXh0LVsxMHB4XSAhcHktMSAhcHgtMyBhY3RpdmUgIWJnLXNsYXRlLTgwMCAhdGV4dC1zbGF0ZS0zMDAgaG92ZXI6IWJnLXNsYXRlLTcwMCBkaXNhYmxlZDpvcGFjaXR5LTQwXFxcIlxcbiAgICAgICAgICAgICAgICA+XFxuICAgICAgICAgICAgICAgICAge2lzU3RhdEVxID8gJ+ijheWCmeS4reS4jeWPrycgOiBwSXRlbS5pc0xvY2tlZCA/ICfjg63jg4Pjgq/kuK0nIDogJ+WIhuino+OBmeOCiyd9XFxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgKX1cXG4gICAgICA8L2Rpdj5cXG4gICAgKTtcXG4gIH07XFxuXFxuICBjb25zdCByZW5kZXJTaG9wQ2FyZCA9IChpdGVtOiBHYW1lSXRlbSkgPT4ge1xcbiAgICBjb25zdCBzaG9wRGlzY291bnRNdWx0ID0gZ2V0U2hvcERpc2NvdW50TXVsdGlwbGllcihqb2IpO1xcbiAgICBjb25zdCBmaW5hbFByaWNlID0gTWF0aC5mbG9vcihpdGVtLnByaWNlICogc2hvcERpc2NvdW50TXVsdCk7XFxuICAgIGNvbnN0IGhhc0pvYkRpc2NvdW50ID0gc2hvcERpc2NvdW50TXVsdCA8IDEuMDtcXG4gICAgY29uc3QgcXR5ID0gc2hvcFF1YW50aXRpZXNbaXRlbS5pZF0gfHwgMTtcXG4gICAgY29uc3QgdG90YWxDb3N0ID0gZmluYWxQcmljZSAqIHF0eTtcXG4gICAgY29uc3QgbWF4QWZmb3JkYWJsZSA9IE1hdGgubWF4KDEsIE1hdGguZmxvb3IoZ29sZCAvIGZpbmFsUHJpY2UpKTtcXG5cXG4gICAgY29uc3Qgc2V0UXR5ID0gKHZhbDogbnVtYmVyKSA9PiB7XFxuICAgICAgY29uc3Qgc2FuaXRpemVkID0gTWF0aC5tYXgoMSwgTWF0aC5taW4oOTk5LCBNYXRoLmZsb29yKHZhbCkpKTtcXG4gICAgICBzZXRTaG9wUXVhbnRpdGllcyhwcmV2ID0+ICh7IC4uLnByZXYsIFtpdGVtLmlkXTogc2FuaXRpemVkIH0pKTtcXG4gICAgfTtcXG5cXG4gICAgcmV0dXJuIChcXG4gICAgICA8ZGl2IGtleT17aXRlbS5pZH0gY2xhc3NOYW1lPVxcXCJwaXhlbC1wYW5lbCBmbGV4IGZsZXgtY29sIGdhcC0yIGJnLXNsYXRlLTkwMC85MCBib3JkZXItMiBib3JkZXItc2xhdGUtNzAwXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW5cXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcXFwiPlxcbiAgICAgICAgICAgIDxJdGVtSWNvbiBpdGVtPXtpdGVtfSAvPlxcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC1zbSBmb250LWJvbGQgdGV4dC1zbGF0ZS0xMDBcXFwiPntpdGVtLm5hbWV9PC9zcGFuPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LXhzIHRleHQtYW1iZXItNDAwIGZvbnQtYm9sZFxcXCI+XFxuICAgICAgICAgICAge2l0ZW0udHlwZSA9PT0gJ3dlYXBvbicgPyBg5pS75pKD5YqbICR7aXRlbS5wb3dlcn1gIDogaXRlbS50eXBlID09PSAnYXJtb3InID8gYOmYsuW+oeWKmyAke2l0ZW0ucG93ZXJ9YCA6ICcnfVxcbiAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIHtpdGVtLmVmZmVjdCAmJiAoXFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJ0ZXh0LVsxMXB4XSB0ZXh0LXNreS0zMDAgYmctc2xhdGUtOTUwIHAtMiBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCByb3VuZGVkXFxcIj5cXG4gICAgICAgICAgICDinKgge2l0ZW0uZWZmZWN0LmRlc2NyaXB0aW9ufVxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICl9XFxuXFxuICAgICAgICB7LyogUXVhbnRpdHkgQ29udHJvbHMgJiBCdWxrIEJ1eSAqL31cXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGZsZXgtY29sIGdhcC0xLjUgbXQtMSBwdC0yIGJvcmRlci10IGJvcmRlci1zbGF0ZS04MDBcXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNVxcXCI+XFxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQteHMgdGV4dC1hbWJlci0zMDAgZm9udC1ib2xkXFxcIj7wn6qZIHtmaW5hbFByaWNlfSBHPC9zcGFuPlxcbiAgICAgICAgICAgICAge2hhc0pvYkRpc2NvdW50ICYmIChcXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTUwMCBsaW5lLXRocm91Z2hcXFwiPvCfqpkge2l0ZW0ucHJpY2V9IEc8L3NwYW4+XFxuICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICAge2hhc0pvYkRpc2NvdW50ICYmIChcXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LVs5cHhdIGJnLWVtZXJhbGQtOTAwIHRleHQtZW1lcmFsZC0zMDAgcHgtMSBweS0wLjIgcm91bmRlZCBmb250LWJvbGQgYm9yZGVyIGJvcmRlci1lbWVyYWxkLTYwMFxcXCI+XFxuICAgICAgICAgICAgICAgICAg54m55YyW5Ymy5byVXFxuICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICl9XFxuICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgICAgey8qIFN0ZXBwZXIgKi99XFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIGJnLXNsYXRlLTk1MCBweC0xIHB5LTAuNSByb3VuZGVkIGJvcmRlciBib3JkZXItc2xhdGUtODAwXFxcIj5cXG4gICAgICAgICAgICAgIDxidXR0b25cXG4gICAgICAgICAgICAgICAgdHlwZT1cXFwiYnV0dG9uXFxcIlxcbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRRdHkocXR5IC0gMSl9XFxuICAgICAgICAgICAgICAgIGRpc2FibGVkPXtxdHkgPD0gMX1cXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVxcXCJwaXhlbC1idG4gdGV4dC1bMTBweF0gIXB5LTAuNSAhcHgtMS41IGRpc2FibGVkOm9wYWNpdHktMzBcXFwiXFxuICAgICAgICAgICAgICA+XFxuICAgICAgICAgICAgICAgIC1cXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgPGlucHV0XFxuICAgICAgICAgICAgICAgIHR5cGU9XFxcIm51bWJlclxcXCJcXG4gICAgICAgICAgICAgICAgbWluPXsxfVxcbiAgICAgICAgICAgICAgICBtYXg9ezk5OX1cXG4gICAgICAgICAgICAgICAgdmFsdWU9e3F0eX1cXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9e2UgPT4gc2V0UXR5KHBhcnNlSW50KGUudGFyZ2V0LnZhbHVlKSB8fCAxKX1cXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVxcXCJ3LTEwIHRleHQtY2VudGVyIGJnLXNsYXRlLTkwMCB0ZXh0LXNsYXRlLTIwMCB0ZXh0LXhzIGZvbnQtYm9sZCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCByb3VuZGVkIHB5LTAuNVxcXCJcXG4gICAgICAgICAgICAgIC8+XFxuICAgICAgICAgICAgICA8YnV0dG9uXFxuICAgICAgICAgICAgICAgIHR5cGU9XFxcImJ1dHRvblxcXCJcXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0UXR5KHF0eSArIDEpfVxcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XFxcInBpeGVsLWJ0biB0ZXh0LVsxMHB4XSAhcHktMC41ICFweC0xLjVcXFwiXFxuICAgICAgICAgICAgICA+XFxuICAgICAgICAgICAgICAgICtcXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgey8qIFF1aWNrIHByZXNldHMgKi99XFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTEgZmxleC13cmFwXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBnYXAtMVxcXCI+XFxuICAgICAgICAgICAgICB7WzEsIDUsIDEwXS5tYXAocHJlc2V0ID0+IChcXG4gICAgICAgICAgICAgICAgPGJ1dHRvblxcbiAgICAgICAgICAgICAgICAgIGtleT17cHJlc2V0fVxcbiAgICAgICAgICAgICAgICAgIHR5cGU9XFxcImJ1dHRvblxcXCJcXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRRdHkocHJlc2V0KX1cXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BwaXhlbC1idG4gdGV4dC1bOXB4XSAhcHktMC41ICFweC0xLjUgJHtxdHkgPT09IHByZXNldCA/ICdhY3RpdmUgIWJvcmRlci1hbWJlci00MDAgIXRleHQtYW1iZXItMzAwJyA6ICcnfWB9XFxuICAgICAgICAgICAgICAgID5cXG4gICAgICAgICAgICAgICAgICB7cHJlc2V0feWAi1xcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICkpfVxcbiAgICAgICAgICAgICAgPGJ1dHRvblxcbiAgICAgICAgICAgICAgICB0eXBlPVxcXCJidXR0b25cXFwiXFxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFF0eShtYXhBZmZvcmRhYmxlKX1cXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcGl4ZWwtYnRuIHRleHQtWzlweF0gIXB5LTAuNSAhcHgtMS41ICR7cXR5ID09PSBtYXhBZmZvcmRhYmxlID8gJ2FjdGl2ZSAhYm9yZGVyLWFtYmVyLTQwMCAhdGV4dC1hbWJlci0zMDAnIDogJyd9YH1cXG4gICAgICAgICAgICAgID5cXG4gICAgICAgICAgICAgICAgTUFYKHttYXhBZmZvcmRhYmxlfeWAiylcXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDxidXR0b25cXG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcXG4gICAgICAgICAgICAgICAgaWYgKHF0eSA9PT0gMSkge1xcbiAgICAgICAgICAgICAgICAgIG9uQnV5SXRlbShpdGVtLmlkLCBmaW5hbFByaWNlKTtcXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvbkJhdGNoQnV5SXRlbSkge1xcbiAgICAgICAgICAgICAgICAgIG9uQmF0Y2hCdXlJdGVtKGl0ZW0uaWQsIHF0eSwgZmluYWxQcmljZSk7XFxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XFxuICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBxdHk7IGkrKykgb25CdXlJdGVtKGl0ZW0uaWQsIGZpbmFsUHJpY2UpO1xcbiAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICB9fVxcbiAgICAgICAgICAgICAgZGlzYWJsZWQ9e2dvbGQgPCB0b3RhbENvc3QgfHwgaXNRdWVzdEFjdGl2ZX1cXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cXFwicGl4ZWwtYnRuIHRleHQteHMgYWN0aXZlICFib3JkZXItYW1iZXItNDAwICFiZy1hbWJlci05NTAvNjAgaG92ZXI6IWJnLWFtYmVyLTkwMCBmb250LWJvbGQgZGlzYWJsZWQ6b3BhY2l0eS00MCAhcHktMSAhcHgtM1xcXCJcXG4gICAgICAgICAgICA+XFxuICAgICAgICAgICAgICB7cXR5ID4gMSA/IGDwn5uSICR7cXR5feWAi+izvOWFpSAo8J+qmSR7dG90YWxDb3N0LnRvTG9jYWxlU3RyaW5nKCl9RylgIDogJ+izvOWFpeOBmeOCiyd9XFxuICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgICk7XFxuICB9O1xcblxcbiAgY29uc3QgcmVuZGVyRGFpbHlTaG9wQ2FyZCA9IChpdGVtOiBEYWlseVNob3BJdGVtKSA9PiB7XFxuICAgIGNvbnN0IGJhc2VJdGVtID0gSVRFTVNbaXRlbS5iYXNlSWRdO1xcbiAgICBpZiAoIWJhc2VJdGVtKSByZXR1cm4gbnVsbDtcXG5cXG4gICAgY29uc3Qgc2hvcERpc2NvdW50TXVsdCA9IGdldFNob3BEaXNjb3VudE11bHRpcGxpZXIoam9iKTtcXG4gICAgY29uc3QgZmluYWxQcmljZSA9IE1hdGguZmxvb3IoaXRlbS5wcmljZSAqIHNob3BEaXNjb3VudE11bHQpO1xcbiAgICBjb25zdCBoYXNKb2JEaXNjb3VudCA9IHNob3BEaXNjb3VudE11bHQgPCAxLjA7XFxuXFxuICAgIGNvbnN0IGlzU29sZE91dCA9IHNvbGRPdXREYWlseUl0ZW1JZHMuaW5jbHVkZXMoaXRlbS5zaG9wSXRlbUlkKSB8fCBpdGVtLmlzU29sZE91dDtcXG4gICAgY29uc3QgaXNDdXJzZWQgPSBpdGVtLmlzQ3Vyc2VkIHx8IGJhc2VJdGVtLmlzQ3Vyc2VkO1xcblxcbiAgICBsZXQgZGlzcGxheU5hbWUgPSBiYXNlSXRlbS5uYW1lO1xcbiAgICBpZiAoaXRlbS5jdXN0b21QcmVmaXgpIGRpc3BsYXlOYW1lID0gYCR7aXRlbS5jdXN0b21QcmVmaXh9JHtkaXNwbGF5TmFtZX1gO1xcbiAgICBpZiAoaXNDdXJzZWQgJiYgIWRpc3BsYXlOYW1lLnN0YXJ0c1dpdGgoJ/CfkoAnKSkgZGlzcGxheU5hbWUgPSBg8J+SgCR7ZGlzcGxheU5hbWV9YDtcXG4gICAgaWYgKGl0ZW0udXBncmFkZUxldmVsID4gMCkgZGlzcGxheU5hbWUgPSBgJHtkaXNwbGF5TmFtZX0gTHYuJHtpdGVtLnVwZ3JhZGVMZXZlbH1gO1xcblxcbiAgICBjb25zdCB0b3RhbFBvd2VyID0gYmFzZUl0ZW0ucG93ZXIgKyBpdGVtLmFkZGVkUG93ZXIgKyBpdGVtLnVwZ3JhZGVMZXZlbCAqIDM7XFxuXFxuICAgIHJldHVybiAoXFxuICAgICAgPGRpdlxcbiAgICAgICAga2V5PXtpdGVtLnNob3BJdGVtSWR9XFxuICAgICAgICBjbGFzc05hbWU9e2BwaXhlbC1wYW5lbCBmbGV4IGZsZXgtY29sIGdhcC0yIHJlbGF0aXZlIHRyYW5zaXRpb24tYWxsICR7XFxuICAgICAgICAgIGlzQ3Vyc2VkXFxuICAgICAgICAgICAgPyAnYmctcHVycGxlLTk1MC80MCBib3JkZXItMiBib3JkZXItcHVycGxlLTYwMC84MCBzaGFkb3ctWzBfMF8xNXB4X3JnYmEoMTQ3LDUxLDIzNCwwLjI1KV0nXFxuICAgICAgICAgICAgOiAnYmctc2xhdGUtOTAwLzkwIGJvcmRlci0yIGJvcmRlci1zbGF0ZS03MDAnXFxuICAgICAgICB9ICR7aXNTb2xkT3V0ID8gJ29wYWNpdHktNTAgZ3JheXNjYWxlJyA6ICcnfWB9XFxuICAgICAgPlxcbiAgICAgICAge2l0ZW0uZGlzY291bnRQZXJjZW50ID4gMCAmJiAhaXNTb2xkT3V0ICYmIChcXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImFic29sdXRlIC10b3AtMi41IC1yaWdodC0yIGJnLXJvc2UtNjAwIHRleHQtd2hpdGUgZm9udC1ibGFjayB0ZXh0LVsxMHB4XSBweC0yIHB5LTAuNSByb3VuZGVkIHNoYWRvdy1tZCB6LTEwIGJvcmRlciBib3JkZXItcm9zZS00MDAgYW5pbWF0ZS1wdWxzZVxcXCI+XFxuICAgICAgICAgICAge2l0ZW0uZGlzY291bnRQZXJjZW50fSUgT0ZGXFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgKX1cXG5cXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW5cXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcXFwiPlxcbiAgICAgICAgICAgIDxJdGVtSWNvbiBpdGVtPXt7IC4uLmJhc2VJdGVtLCBpZDogaXRlbS5iYXNlSWQgfX0gLz5cXG4gICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0xXFxcIj5cXG4gICAgICAgICAgICAgICAge2lzQ3Vyc2VkICYmIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC14cyB0ZXh0LXB1cnBsZS00MDAgZm9udC1leHRyYWJvbGRcXFwiPuOAkOWRquOBhOOAkTwvc3Bhbj59XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT17YHRleHQtc20gZm9udC1ib2xkICR7aXNDdXJzZWQgPyAndGV4dC1wdXJwbGUtMzAwJyA6ICd0ZXh0LXNsYXRlLTEwMCd9YH0+XFxuICAgICAgICAgICAgICAgICAge2Rpc3BsYXlOYW1lfVxcbiAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMFxcXCI+XFxuICAgICAgICAgICAgICAgIHtiYXNlSXRlbS50eXBlID09PSAnd2VhcG9uJyA/ICfmlLvmkoPlipsnIDogYmFzZUl0ZW0udHlwZSA9PT0gJ2FybW9yJyA/ICfpmLLlvqHlipsnIDogJ+OCouOCpOODhuODoCd9OiA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtYW1iZXItMzAwIGZvbnQtYm9sZFxcXCI+K3t0b3RhbFBvd2VyfTwvc3Bhbj5cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAge2Jhc2VJdGVtLmVmZmVjdCAmJiAoXFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgdGV4dC1bMTFweF0gcC0yIGJvcmRlciByb3VuZGVkICR7aXNDdXJzZWQgPyAndGV4dC1wdXJwbGUtMjAwIGJnLXB1cnBsZS05NTAvODAgYm9yZGVyLXB1cnBsZS04MDAnIDogJ3RleHQtc2t5LTMwMCBiZy1zbGF0ZS05NTAgYm9yZGVyLXNsYXRlLTgwMCd9YH0+XFxuICAgICAgICAgICAge2lzQ3Vyc2VkID8gJ/CfkoAgJyA6ICfinKggJ317YmFzZUl0ZW0uZWZmZWN0LmRlc2NyaXB0aW9ufVxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICl9XFxuXFxuICAgICAgICB7aXNDdXJzZWQgJiYgKFxcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidGV4dC1bMTBweF0gdGV4dC1yb3NlLTQwMCBmb250LWJvbGQgYmctcm9zZS05NTAvNjAgcC0xLjUgYm9yZGVyIGJvcmRlci1yb3NlLTgwMC84MCByb3VuZGVkIGZsZXggaXRlbXMtY2VudGVyIGdhcC0xXFxcIj5cXG4gICAgICAgICAgICA8c3Bhbj7imqDvuI8g5Zyn5YCS55qE5aiB5Yqb44Go5byV44GN5o+b44GI44Gr5q+O56eSSFDjg4njg6zjgqTjg7Pjg7vjg4fjg5Djg5Xjga7lkarjgYTjgYznmbrli5XvvIE8L3NwYW4+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgKX1cXG5cXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gbXQtMSBwdC0yIGJvcmRlci10IGJvcmRlci1zbGF0ZS04MDBcXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcXFwiPlxcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC14cyB0ZXh0LWFtYmVyLTMwMCBmb250LWJvbGRcXFwiPvCfqpkge2ZpbmFsUHJpY2V9IEc8L3NwYW4+XFxuICAgICAgICAgICAge2l0ZW0ucHJpY2UgPiBmaW5hbFByaWNlICYmIChcXG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS01MDAgbGluZS10aHJvdWdoXFxcIj7wn6qZIHtpdGVtLnByaWNlfSBHPC9zcGFuPlxcbiAgICAgICAgICAgICl9XFxuICAgICAgICAgICAge2hhc0pvYkRpc2NvdW50ICYmIChcXG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC1bOXB4XSBiZy1lbWVyYWxkLTkwMCB0ZXh0LWVtZXJhbGQtMzAwIHB4LTEgcHktMC4yIHJvdW5kZWQgZm9udC1ib2xkIGJvcmRlciBib3JkZXItZW1lcmFsZC02MDBcXFwiPlxcbiAgICAgICAgICAgICAgICDnibnljJblibLlvJVcXG4gICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICApfVxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPGJ1dHRvblxcbiAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uQnV5RGFpbHlJdGVtICYmIG9uQnV5RGFpbHlJdGVtKHsgLi4uaXRlbSwgcHJpY2U6IGZpbmFsUHJpY2UgfSl9XFxuICAgICAgICAgICAgZGlzYWJsZWQ9e2dvbGQgPCBmaW5hbFByaWNlIHx8IGlzU29sZE91dCB8fCBpc1F1ZXN0QWN0aXZlfVxcbiAgICAgICAgICAgIGNsYXNzTmFtZT17YHBpeGVsLWJ0biB0ZXh0LXhzIGFjdGl2ZSBkaXNhYmxlZDpvcGFjaXR5LTQwICR7XFxuICAgICAgICAgICAgICBpc0N1cnNlZFxcbiAgICAgICAgICAgICAgICA/ICchYmctcHVycGxlLTcwMCAhdGV4dC1wdXJwbGUtMTAwICFib3JkZXItcHVycGxlLTQwMCBob3ZlcjohYmctcHVycGxlLTYwMCdcXG4gICAgICAgICAgICAgICAgOiAnIWJvcmRlci1hbWJlci00MDAnXFxuICAgICAgICAgICAgfWB9XFxuICAgICAgICAgID5cXG4gICAgICAgICAgICB7aXNTb2xkT3V0ID8gJ+WjsuWIh+OCjCcgOiAn6LO85YWl44GZ44KLJ31cXG4gICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgKTtcXG4gIH07XFxuXFxuICBjb25zdCByZW5kZXJEZXRhaWxNb2RhbCA9ICgpID0+IHtcXG4gICAgaWYgKCFkZXRhaWxQbGF5ZXJJdGVtKSByZXR1cm4gbnVsbDtcXG4gICAgY29uc3QgY29tcGlsZWQgPSBnZXRDb21waWxlZEl0ZW0oZGV0YWlsUGxheWVySXRlbSk7XFxuICAgIGNvbnN0IGJhc2VJdGVtID0gSVRFTVNbZGV0YWlsUGxheWVySXRlbS5iYXNlSWRdO1xcbiAgICBpZiAoIWJhc2VJdGVtIHx8ICFjb21waWxlZCkgcmV0dXJuIG51bGw7XFxuXFxuICAgIGNvbnN0IGlzU3RhdEVxID0gZXF1aXBtZW50LnN0YXRXZWFwb25JZCA9PT0gZGV0YWlsUGxheWVySXRlbS51aWQgfHwgZXF1aXBtZW50LnN0YXRBcm1vcklkID09PSBkZXRhaWxQbGF5ZXJJdGVtLnVpZDtcXG4gICAgY29uc3QgaXNBcHBFcSA9IGVxdWlwbWVudC5hcHBlYXJhbmNlV2VhcG9uSWQgPT09IGRldGFpbFBsYXllckl0ZW0uYmFzZUlkIHx8IGVxdWlwbWVudC5hcHBlYXJhbmNlQXJtb3JJZCA9PT0gZGV0YWlsUGxheWVySXRlbS5iYXNlSWQ7XFxuXFxuICAgIGNvbnN0IHN0YXRTbG90OiBrZXlvZiBFcXVpcG1lbnRTdGF0ZSA9IGNvbXBpbGVkLnR5cGUgPT09ICd3ZWFwb24nID8gJ3N0YXRXZWFwb25JZCcgOiAnc3RhdEFybW9ySWQnO1xcbiAgICBjb25zdCBhcHBTbG90OiBrZXlvZiBFcXVpcG1lbnRTdGF0ZSA9IGNvbXBpbGVkLnR5cGUgPT09ICd3ZWFwb24nID8gJ2FwcGVhcmFuY2VXZWFwb25JZCcgOiAnYXBwZWFyYW5jZUFybW9ySWQnO1xcbiAgICBjb25zdCBzZWxsUHJpY2UgPSBjYWxjdWxhdGVTZWxsUHJpY2UoZGV0YWlsUGxheWVySXRlbSwgam9iKTtcXG5cXG4gICAgY29uc3QgYmFzZVByaWNlID0gYmFzZUl0ZW0ucHJpY2UgfHwgMTAwO1xcbiAgICBjb25zdCBoYWxmQmFzZSA9IE1hdGguZmxvb3IoYmFzZVByaWNlICogMC41KTtcXG4gICAgY29uc3QgZW5jaGFudEJvbnVzID0gZGV0YWlsUGxheWVySXRlbS51cGdyYWRlTGV2ZWwgPiAwID8gTWF0aC5mbG9vcihiYXNlUHJpY2UgKiAwLjIwICogZGV0YWlsUGxheWVySXRlbS51cGdyYWRlTGV2ZWwpIDogMDtcXG4gICAgY29uc3QgbGltaXRCcmVha0JvbnVzID0gKGRldGFpbFBsYXllckl0ZW0ubGltaXRCcmVhayB8fCAwKSA+IDAgPyBNYXRoLmZsb29yKGJhc2VQcmljZSAqIDAuNTAgKiBkZXRhaWxQbGF5ZXJJdGVtLmxpbWl0QnJlYWshKSA6IDA7XFxuICAgIGNvbnN0IHNwZWNpYWxFbmNoYW50Qm9udXMgPSAoZGV0YWlsUGxheWVySXRlbS5zcGVjaWFsRW5jaGFudENvdW50IHx8IDApID4gMCA/IE1hdGguZmxvb3IoYmFzZVByaWNlICogMC4zMCAqIGRldGFpbFBsYXllckl0ZW0uc3BlY2lhbEVuY2hhbnRDb3VudCEpIDogMDtcXG4gICAgY29uc3QgYWRkZWRQb3dlckJvbnVzID0gZGV0YWlsUGxheWVySXRlbS5hZGRlZFBvd2VyID4gMCA/IGRldGFpbFBsYXllckl0ZW0uYWRkZWRQb3dlciAqIDEyIDogMDtcXG4gICAgY29uc3Qgc3BlY2lhbENvdW50ID0gZGV0YWlsUGxheWVySXRlbS5zcGVjaWFsRW5jaGFudENvdW50IHx8IDA7XFxuICAgIGNvbnN0IGlzQ3Vyc2VkRGV0YWlsID0gKGNvbXBpbGVkLmlzQ3Vyc2VkIHx8IGJhc2VJdGVtLmlzQ3Vyc2VkKSAmJiAhZGV0YWlsUGxheWVySXRlbS5pc1VuY3Vyc2VkO1xcbiAgICBjb25zdCB1bmN1cnNlRGV0YWlsQ29zdCA9IGNhbGN1bGF0ZVVuY3Vyc2VDb3N0KGRldGFpbFBsYXllckl0ZW0sIGpvYik7XFxuXFxuICAgIHJldHVybiAoXFxuICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZpeGVkIGluc2V0LTAgei01MCBiZy1zbGF0ZS05NTAvODAgYmFja2Ryb3AtYmx1ci1zbSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBwLTRcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInBpeGVsLXBhbmVsIG1heC13LW1kIHctZnVsbCBiZy1zbGF0ZS05MDAgYm9yZGVyLTIgYm9yZGVyLWFtYmVyLTQwMCBwLTQgcmVsYXRpdmUgc2hhZG93LVswXzBfMzBweF9yZ2JhKDI0NSwxNTgsMTEsMC4zKV0gbWF4LWgtWzkwdmhdIG92ZXJmbG93LXktYXV0b1xcXCI+XFxuICAgICAgICAgIDxidXR0b25cXG4gICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXREZXRhaWxQbGF5ZXJJdGVtKG51bGwpfVxcbiAgICAgICAgICAgIGNsYXNzTmFtZT1cXFwiYWJzb2x1dGUgdG9wLTIgcmlnaHQtMiB0ZXh0LXNsYXRlLTQwMCBob3Zlcjp0ZXh0LXdoaXRlIHRleHQtbGcgZm9udC1ib2xkIHB4LTIgcHktMC41IHJvdW5kZWRcXFwiXFxuICAgICAgICAgID5cXG4gICAgICAgICAgICDinJVcXG4gICAgICAgICAgPC9idXR0b24+XFxuXFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIHBiLTMgbWItM1xcXCI+XFxuICAgICAgICAgICAgPEl0ZW1JY29uIGl0ZW09e3sgLi4uY29tcGlsZWQsIGlkOiBkZXRhaWxQbGF5ZXJJdGVtLmJhc2VJZCB9fSBzaXplPXs0OH0gLz5cXG4gICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgZmxleC13cmFwXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LWJhc2UgZm9udC1ib2xkIHRleHQtc2xhdGUtMTAwXFxcIj57Y29tcGlsZWQubmFtZX08L3NwYW4+XFxuICAgICAgICAgICAgICAgIHtkZXRhaWxQbGF5ZXJJdGVtLmVuZ3JhdmluZyAmJiAoXFxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LVsxMHB4XSBiZy1zbGF0ZS04MDAgdGV4dC1pbmRpZ28tMzAwIGJvcmRlciBib3JkZXItc2xhdGUtNjAwIHB4LTEuNSBweS0wLjUgcm91bmRlZCBmb250LWJvbGQgd2hpdGVzcGFjZS1ub3dyYXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAg8J+boe+4jyB7ZGV0YWlsUGxheWVySXRlbS5lbmdyYXZpbmd9XFxuICAgICAgICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICAgICB7Y29tcGlsZWQuaXNDdXJzZWQgJiYgKFxcbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC14cyBiZy1wdXJwbGUtOTUwIHRleHQtcHVycGxlLTMwMCBweC0xLjUgcHktMC41IHJvdW5kZWQgYm9yZGVyIGJvcmRlci1wdXJwbGUtNzAwIGZvbnQtZXh0cmFib2xkXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIPCfkoAg5ZGq44GE6KOF5YKZXFxuICAgICAgICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICAgICB7c3BlY2lhbENvdW50ID4gMCAmJiAoXFxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LVsxMHB4XSBiZy1wdXJwbGUtOTAwIHRleHQtcHVycGxlLTIwMCBib3JkZXIgYm9yZGVyLXB1cnBsZS02MDAgcHgtMS41IHB5LTAuNSByb3VuZGVkIGZvbnQtYm9sZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICDimIUg54m55q6K5by35YyWIHtzcGVjaWFsQ291bnR95ZueXFxuICAgICAgICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidGV4dC14cyB0ZXh0LXNsYXRlLTQwMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBtdC0xXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4+56iu5YilOiB7Y29tcGlsZWQudHlwZSA9PT0gJ3dlYXBvbicgPyAn4pqU77iPIOatpuWZqCcgOiAn8J+boe+4jyDpmLLlhbcnfTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPHNwYW4+KOODmeODvOOCuToge2Jhc2VJdGVtLm5hbWV9KTwvc3Bhbj5cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgey8qIOOCueODhuODvOOCv+OCueWGheiosyAqL31cXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBtYi0zXFxcIj5cXG4gICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVxcXCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LWFtYmVyLTMwMCBtYi0yIGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAgcGItMVxcXCI+8J+TiiDog73lipvlgKTjg7vlvLfljJbjgrnjg4bjg7zjgr/jgrnoqbPntLA8L2g0PlxcbiAgICAgICAgICAgIFxcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJncmlkIGdyaWQtY29scy0yIGdhcC0yIHRleHQteHMgbWItM1xcXCI+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiYmctc2xhdGUtOTAwLzkwIHAtMiByb3VuZGVkIGJvcmRlciBib3JkZXItc2xhdGUtODAwXFxcIj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNDAwXFxcIj7ln7rmnKx7Y29tcGlsZWQudHlwZSA9PT0gJ3dlYXBvbicgPyAn5pS75pKD5YqbJyA6ICfpmLLlvqHlipsnfTwvZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidGV4dC1zbSBmb250LWJvbGQgdGV4dC1zbGF0ZS0yMDBcXFwiPit7YmFzZUl0ZW0ucG93ZXJ9PC9kaXY+XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJiZy1zbGF0ZS05MDAvOTAgcC0yIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDBcXFwiPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDBcXFwiPuWfuuacrOW8t+WMliAoTHYue2RldGFpbFBsYXllckl0ZW0udXBncmFkZUxldmVsfSk8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInRleHQtc20gZm9udC1ib2xkIHRleHQtcm9zZS0zMDBcXFwiPit7ZGV0YWlsUGxheWVySXRlbS51cGdyYWRlTGV2ZWwgKiAzfTwvZGl2PlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiYmctc2xhdGUtOTAwLzkwIHAtMiByb3VuZGVkIGJvcmRlciBib3JkZXItc2xhdGUtODAwXFxcIj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInRleHQtWzEwcHhdIHRleHQtcHVycGxlLTMwMCBmb250LWJvbGRcXFwiPuKYhSDnibnmrorlvLfljJYgKHtzcGVjaWFsQ291bnR95Zue5a6f5pa9KTwvZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidGV4dC1zbSBmb250LWJvbGQgdGV4dC1wdXJwbGUtMzAwXFxcIj4re2RldGFpbFBsYXllckl0ZW0uYWRkZWRQb3dlcn08L2Rpdj5cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImJnLXNsYXRlLTkwMC85MCBwLTIgcm91bmRlZCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMFxcXCI+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMFxcXCI+6ZmQ55WM56qB56C0PC9kaXY+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJ0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LXNreS0zMDBcXFwiPnsoZGV0YWlsUGxheWVySXRlbS5saW1pdEJyZWFrIHx8IDApID4gMCA/IGArJHtkZXRhaWxQbGF5ZXJJdGVtLmxpbWl0QnJlYWt95Ye4YCA6ICfmnKrlrp/mlr0nfTwvZGl2PlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBiZy1hbWJlci05NTAvNDAgcC0yLjUgcm91bmRlZCBib3JkZXIgYm9yZGVyLWFtYmVyLTgwMC84MFxcXCI+XFxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQteHMgZm9udC1ib2xkIHRleHQtYW1iZXItMjAwXFxcIj7wn5SlIOe3j+WQiCB7Y29tcGlsZWQudHlwZSA9PT0gJ3dlYXBvbicgPyAn5pS75pKD5YqbJyA6ICfpmLLlvqHlipsnfTo8L3NwYW4+XFxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtbGcgZm9udC1ibGFjayB0ZXh0LWFtYmVyLTMwMFxcXCI+K3tjb21waWxlZC5wb3dlcn08L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICB7Lyog54m55q6K5Yq55p6cIC8g5ZGq44GEICovfVxcbiAgICAgICAgICB7Y29tcGlsZWQuZWZmZWN0ICYmIChcXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiYmctc2xhdGUtOTUwIHAtMyByb3VuZGVkIGJvcmRlciBib3JkZXItc2xhdGUtODAwIG1iLTNcXFwiPlxcbiAgICAgICAgICAgICAgPGg0IGNsYXNzTmFtZT1cXFwidGV4dC14cyBmb250LWJvbGQgdGV4dC1za3ktMzAwIG1iLTFcXFwiPuKcqCDku5jkuI7lirnmnpzjg7vjgrnjgq3jg6s8L2g0PlxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInRleHQteHMgdGV4dC1za3ktMjAwIGxlYWRpbmctcmVsYXhlZFxcXCI+XFxuICAgICAgICAgICAgICAgIHtjb21waWxlZC5lZmZlY3QuZGVzY3JpcHRpb259XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgKX1cXG5cXG4gICAgICAgICAgey8qIOafu+WumuS+oeWApCAvIOWjsuWNtOWGheiosyAqL31cXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBtYi0zXFxcIj5cXG4gICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVxcXCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LWFtYmVyLTMwMCBtYi0yIGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAgcGItMVxcXCI+8J+SsCDpjZvlhrblsYvlo7LljbTmn7vlrprkvqHmoLzjga7lhoXoqLM8L2g0PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJzcGFjZS15LTEgdGV4dC1bMTFweF0gdGV4dC1zbGF0ZS0zMDAgbWItMlxcXCI+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBqdXN0aWZ5LWJldHdlZW5cXFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtc2xhdGUtNDAwXFxcIj7ln7rmnKzkvqHmoLwgKOWumuS+oeOBrjUwJSk6PC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8c3Bhbj7wn6qZIHtoYWxmQmFzZX0gRzwvc3Bhbj5cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAge2VuY2hhbnRCb251cyA+IDAgJiYgKFxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBqdXN0aWZ5LWJldHdlZW4gdGV4dC1yb3NlLTMwMFxcXCI+XFxuICAgICAgICAgICAgICAgICAgPHNwYW4+5Z+65pys5by35YyW44Oc44O844OK44K5IChMdi57ZGV0YWlsUGxheWVySXRlbS51cGdyYWRlTGV2ZWx9KTo8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgPHNwYW4+K/Cfqpkge2VuY2hhbnRCb251c30gRzwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICAge2xpbWl0QnJlYWtCb251cyA+IDAgJiYgKFxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBqdXN0aWZ5LWJldHdlZW4gdGV4dC1za3ktMzAwXFxcIj5cXG4gICAgICAgICAgICAgICAgICA8c3Bhbj7pmZDnlYznqoHnoLTjg5zjg7zjg4rjgrkgKHtkZXRhaWxQbGF5ZXJJdGVtLmxpbWl0QnJlYWt95Ye4KTo8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgPHNwYW4+K/Cfqpkge2xpbWl0QnJlYWtCb251c30gRzwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICAge3NwZWNpYWxFbmNoYW50Qm9udXMgPiAwICYmIChcXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXgganVzdGlmeS1iZXR3ZWVuIHRleHQtcHVycGxlLTMwMFxcXCI+XFxuICAgICAgICAgICAgICAgICAgPHNwYW4+54m55q6K5by35YyW44Oc44O844OK44K5ICh7c3BlY2lhbENvdW50feWbnik6PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgIDxzcGFuPivwn6qZIHtzcGVjaWFsRW5jaGFudEJvbnVzfSBHPC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICl9XFxuICAgICAgICAgICAgICB7YWRkZWRQb3dlckJvbnVzID4gMCAmJiAoXFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGp1c3RpZnktYmV0d2VlbiB0ZXh0LWFtYmVyLTMwMFxcXCI+XFxuICAgICAgICAgICAgICAgICAgPHNwYW4+6L+95Yqg6IO95Yqb44Oc44O844OK44K5Ojwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICA8c3Bhbj4r8J+qmSB7YWRkZWRQb3dlckJvbnVzfSBHPC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICl9XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBwdC0xIGJvcmRlci10IGJvcmRlci1zbGF0ZS04MDAgdGV4dC14cyBmb250LWJvbGRcXFwiPlxcbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LWFtYmVyLTIwMFxcXCI+5ZCI6KiI5aOy5Y205p+75a6a6aGNOjwvc3Bhbj5cXG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC1hbWJlci0zMDAgdGV4dC1zbSBmb250LWJsYWNrXFxcIj7wn6qZIHtzZWxsUHJpY2V9IEc8L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICB7Lyog5a6d55+z44K544Ot44OD44OIICjmrablmajjga7jgb8pICovfVxcbiAgICAgICAgICB7Y29tcGlsZWQudHlwZSA9PT0gJ3dlYXBvbicgJiYgKFxcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgbWItM1xcXCI+XFxuICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVxcXCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LWVtZXJhbGQtMzAwIG1iLTIgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBwYi0xIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuPvCfko4g5a6d55+z44K544Ot44OD44OIICh7ZGV0YWlsUGxheWVySXRlbS5zbG90dGVkR2Vtcz8ubGVuZ3RoIHx8IDB9L3tkZXRhaWxQbGF5ZXJJdGVtLnVubG9ja2VkU29ja2V0cyB8fCAwfSk8L3NwYW4+XFxuICAgICAgICAgICAgICA8L2g0PlxcbiAgICAgICAgICAgICAgXFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS0yIG1iLTNcXFwiPlxcbiAgICAgICAgICAgICAgICB7QXJyYXkuZnJvbSh7IGxlbmd0aDogTWF0aC5tYXgoZGV0YWlsUGxheWVySXRlbS51bmxvY2tlZFNvY2tldHMgfHwgMCwgMSkgfSkubWFwKChfLCBpZHgpID0+IHtcXG4gICAgICAgICAgICAgICAgICBpZiAoaWR4ID49IChkZXRhaWxQbGF5ZXJJdGVtLnVubG9ja2VkU29ja2V0cyB8fCAwKSkgcmV0dXJuIG51bGw7XFxuICAgICAgICAgICAgICAgICAgY29uc3QgZ2VtSWQgPSBkZXRhaWxQbGF5ZXJJdGVtLnNsb3R0ZWRHZW1zPy5baWR4XTtcXG4gICAgICAgICAgICAgICAgICBjb25zdCBnZW0gPSBnZW1JZCA/IElURU1TW2dlbUlkXSA6IG51bGw7XFxuICAgICAgICAgICAgICAgICAgcmV0dXJuIChcXG4gICAgICAgICAgICAgICAgICAgIDxkaXYga2V5PXtpZHh9IGNsYXNzTmFtZT1cXFwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcC0yIGJnLXNsYXRlLTkwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCByb3VuZGVkXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInctNiBoLTYgcm91bmRlZCBiZy1zbGF0ZS05NTAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZmxleC1zaHJpbmstMFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAge2dlbSA/ICfwn5KOJyA6IDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS02MDBcXFwiPuepujwvc3Bhbj59XFxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleC0xIHRleHQtWzEwcHhdXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICB7Z2VtID8gKFxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPD5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZvbnQtYm9sZCB0ZXh0LXNsYXRlLTIwMFxcXCI+e2dlbS5uYW1lfTwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidGV4dC1za3ktMzAwXFxcIj57Z2VtLmVmZmVjdD8uZGVzY3JpcHRpb259PC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICA8Lz5cXG4gICAgICAgICAgICAgICAgICAgICAgICApIDogKFxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInRleHQtc2xhdGUtNTAwXFxcIj7nqbrjgY3jgrnjg63jg4Pjg4g8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICk7XFxuICAgICAgICAgICAgICAgIH0pfVxcbiAgICAgICAgICAgICAgICB7KGRldGFpbFBsYXllckl0ZW0udW5sb2NrZWRTb2NrZXRzIHx8IDApID09PSAwICYmIChcXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS01MDAgdGV4dC1jZW50ZXIgcHktMlxcXCI+XFxuICAgICAgICAgICAgICAgICAgICDjgrnjg63jg4Pjg4jjgYznqbrjgYTjgabjgYTjgb7jgZvjgpPjgILnqbTplovjgZHjgpLooYzjgaPjgabjgY/jgaDjgZXjgYTjgIJcXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgKX1cXG4gICAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZmxleC1jb2wgZ2FwLTJcXFwiPlxcbiAgICAgICAgICAgICAgICB7Lyog56m06ZaL44GR44Oc44K/44OzICovfVxcbiAgICAgICAgICAgICAgICB7KGRldGFpbFBsYXllckl0ZW0udW5sb2NrZWRTb2NrZXRzIHx8IDApIDwgMyAmJiAoXFxuICAgICAgICAgICAgICAgICAgPGJ1dHRvblxcbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xcbiAgICAgICAgICAgICAgICAgICAgICBpZiAob25PcGVuU29ja2V0KSBvbk9wZW5Tb2NrZXQoZGV0YWlsUGxheWVySXRlbS51aWQpO1xcbiAgICAgICAgICAgICAgICAgICAgICBzZXREZXRhaWxQbGF5ZXJJdGVtKG51bGwpO1xcbiAgICAgICAgICAgICAgICAgICAgfX1cXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtkZXRhaWxQbGF5ZXJJdGVtLmlzTG9ja2VkIHx8IGlzUXVlc3RBY3RpdmUgfHwgZ29sZCA8IDUwMDAgKiAoKGRldGFpbFBsYXllckl0ZW0udW5sb2NrZWRTb2NrZXRzIHx8IDApICsgMSl9XFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XFxcInBpeGVsLWJ0biB0ZXh0LVsxMHB4XSB3LWZ1bGwgIWJnLXNsYXRlLTgwMCBhY3RpdmUgZGlzYWJsZWQ6b3BhY2l0eS00MFxcXCJcXG4gICAgICAgICAgICAgICAgICA+XFxuICAgICAgICAgICAgICAgICAgICDim4/vuI8g56m044KS6ZaL44GR44KLICjwn6qZIHs1MDAwICogKChkZXRhaWxQbGF5ZXJJdGVtLnVubG9ja2VkU29ja2V0cyB8fCAwKSArIDEpfSBHIC8g5oiQ5Yqf546HIHtNYXRoLmZsb29yKCgwLjUgLSAoKGRldGFpbFBsYXllckl0ZW0udW5sb2NrZWRTb2NrZXRzIHx8IDApICogMC4xNSkgKyAoam9iID09PSAnYXJ0aXNhbicgPyAwLjMgOiAwKSkgKiAxMDApfSUpXFxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgICAgICl9XFxuICAgICAgICAgICAgICAgIFxcbiAgICAgICAgICAgICAgICB7Lyog5a6d55+z44KS44Gv44KB44KL44K744Os44Kv44OIICjnqbrjgY3jgrnjg63jg4Pjg4jjgYzjgYLjgovloLTlkIjjga7jgb/ooajnpLopICovfVxcbiAgICAgICAgICAgICAgICB7KGRldGFpbFBsYXllckl0ZW0udW5sb2NrZWRTb2NrZXRzIHx8IDApID4gKGRldGFpbFBsYXllckl0ZW0uc2xvdHRlZEdlbXM/Lmxlbmd0aCB8fCAwKSAmJiAoXFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZ2FwLTJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHNlbGVjdCBcXG4gICAgICAgICAgICAgICAgICAgICAgaWQ9XFxcImdlbS1zZWxlY3RcXFwiXFxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cXFwicGl4ZWwtaW5wdXQgdGV4dC1bMTBweF0gZmxleC0xICFwLTEgYmctc2xhdGUtOTAwIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIHRleHQtc2xhdGUtMzAwXFxcIlxcbiAgICAgICAgICAgICAgICAgICAgPlxcbiAgICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPuWuneefs+OCkumBuOaKni4uLjwvb3B0aW9uPlxcbiAgICAgICAgICAgICAgICAgICAgICB7aW52ZW50b3J5LmZpbHRlcihpID0+IElURU1TW2kuYmFzZUlkXT8udHlwZSA9PT0gJ2dlbScgJiYgIWkuaXNMb2NrZWQpLm1hcChpID0+IChcXG4gICAgICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIGtleT17aS51aWR9IHZhbHVlPXtpLnVpZH0+e0lURU1TW2kuYmFzZUlkXS5uYW1lfTwvb3B0aW9uPlxcbiAgICAgICAgICAgICAgICAgICAgICApKX1cXG4gICAgICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxcbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dlbS1zZWxlY3QnKSBhcyBIVE1MU2VsZWN0RWxlbWVudDtcXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZWN0ICYmIHNlbGVjdC52YWx1ZSAmJiBvbkluc2VydEdlbSkge1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25JbnNlcnRHZW0oZGV0YWlsUGxheWVySXRlbS51aWQsIHNlbGVjdC52YWx1ZSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICBzZXREZXRhaWxQbGF5ZXJJdGVtKG51bGwpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICAgICAgICAgICAgfX1cXG4gICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2RldGFpbFBsYXllckl0ZW0uaXNMb2NrZWQgfHwgaXNRdWVzdEFjdGl2ZX1cXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVxcXCJwaXhlbC1idG4gdGV4dC1bMTBweF0gIXB5LTEgIWJnLWVtZXJhbGQtOTAwICF0ZXh0LWVtZXJhbGQtMTAwICFib3JkZXItZW1lcmFsZC02MDAgYWN0aXZlIGRpc2FibGVkOm9wYWNpdHktNDBcXFwiXFxuICAgICAgICAgICAgICAgICAgICA+XFxuICAgICAgICAgICAgICAgICAgICAgIOOBr+OCgei+vOOCgFxcbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICl9XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgKX1cXG5cXG4gICAgICAgICAgey8qIOOCouOCr+OCt+ODp+ODs+ODnOOCv+ODsyAqL31cXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZmxleC1jb2wgZ2FwLTJcXFwiPlxcbiAgICAgICAgICAgIHtpc0N1cnNlZERldGFpbCAmJiAoXFxuICAgICAgICAgICAgICA8YnV0dG9uXFxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcXG4gICAgICAgICAgICAgICAgICBzZXRVbmN1cnNlQ29uZmlybUl0ZW0oeyBpdGVtOiBkZXRhaWxQbGF5ZXJJdGVtLCBnYW1lSXRlbTogY29tcGlsZWQsIGNvc3Q6IHVuY3Vyc2VEZXRhaWxDb3N0IH0pO1xcbiAgICAgICAgICAgICAgICB9fVxcbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17Z29sZCA8IHVuY3Vyc2VEZXRhaWxDb3N0IHx8IGlzUXVlc3RBY3RpdmV9XFxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cXFwicGl4ZWwtYnRuIHRleHQteHMgdy1mdWxsICFiZy1wdXJwbGUtOTAwICF0ZXh0LXB1cnBsZS0xMDAgIWJvcmRlci1wdXJwbGUtNDAwIGZvbnQtYm9sZCBweS0yIGFjdGl2ZSBkaXNhYmxlZDpvcGFjaXR5LTQwXFxcIlxcbiAgICAgICAgICAgICAgPlxcbiAgICAgICAgICAgICAgICDinJ3vuI8g5ZGq44GE44KS6Kej6Zmk77yI6Kej5ZGq77yJ44GZ44KLICjosrvnlKg6IPCfqpkge3VuY3Vyc2VEZXRhaWxDb3N0LnRvTG9jYWxlU3RyaW5nKCl9IEcpXFxuICAgICAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICAgICApfVxcblxcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGdhcC0yXFxcIj5cXG4gICAgICAgICAgICAgIDxidXR0b25cXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xcbiAgICAgICAgICAgICAgICAgIG9uRXF1aXAoc3RhdFNsb3QsIGNvbXBpbGVkLmlkKTtcXG4gICAgICAgICAgICAgICAgICBzZXREZXRhaWxQbGF5ZXJJdGVtKG51bGwpO1xcbiAgICAgICAgICAgICAgICB9fVxcbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNTdGF0RXEgfHwgaXNRdWVzdEFjdGl2ZX1cXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcGl4ZWwtYnRuIHRleHQteHMgZmxleC0xICR7aXNTdGF0RXEgPyAnYWN0aXZlICFib3JkZXItZW1lcmFsZC00MDAgIXRleHQtZW1lcmFsZC0zMDAnIDogJyd9YH1cXG4gICAgICAgICAgICAgID5cXG4gICAgICAgICAgICAgICAge2lzU3RhdEVxID8gJ+iDveWKmzog6KOF5YKZ5LitJyA6ICfog73lipvjgpLoo4XlgpknfVxcbiAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgICA8YnV0dG9uXFxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcXG4gICAgICAgICAgICAgICAgICBvbkVxdWlwKGFwcFNsb3QsIGRldGFpbFBsYXllckl0ZW0uYmFzZUlkKTtcXG4gICAgICAgICAgICAgICAgICBzZXREZXRhaWxQbGF5ZXJJdGVtKG51bGwpO1xcbiAgICAgICAgICAgICAgICB9fVxcbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNBcHBFcSB8fCBpc1F1ZXN0QWN0aXZlfVxcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BwaXhlbC1idG4gdGV4dC14cyBmbGV4LTEgJHtpc0FwcEVxID8gJ2FjdGl2ZSAhYm9yZGVyLXB1cnBsZS00MDAgIXRleHQtcHVycGxlLTMwMCcgOiAnJ31gfVxcbiAgICAgICAgICAgICAgPlxcbiAgICAgICAgICAgICAgICB7aXNBcHBFcSA/ICfopovjgZ/nm646IOijheWCmeS4rScgOiAn6KaL44Gf55uu44KS6KOF5YKZJ31cXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGdhcC0yXFxcIj5cXG4gICAgICAgICAgICAgIDxidXR0b25cXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xcbiAgICAgICAgICAgICAgICAgIGlmIChvblNlbGxJdGVtKSBvblNlbGxJdGVtKGRldGFpbFBsYXllckl0ZW0udWlkLCBzZWxsUHJpY2UpO1xcbiAgICAgICAgICAgICAgICAgIHNldERldGFpbFBsYXllckl0ZW0obnVsbCk7XFxuICAgICAgICAgICAgICAgIH19XFxuICAgICAgICAgICAgICAgIGRpc2FibGVkPXtpc1N0YXRFcSB8fCBpc1F1ZXN0QWN0aXZlIHx8IGRldGFpbFBsYXllckl0ZW0uaXNMb2NrZWR9XFxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cXFwicGl4ZWwtYnRuIHRleHQteHMgZmxleC0xICFib3JkZXItYW1iZXItNDAwIGRpc2FibGVkOm9wYWNpdHktNDBcXFwiXFxuICAgICAgICAgICAgICA+XFxuICAgICAgICAgICAgICAgIHtpc1N0YXRFcSA/ICfoo4XlgpnkuK3kuI3lj68nIDogZGV0YWlsUGxheWVySXRlbS5pc0xvY2tlZCA/ICfwn5SSIOODreODg+OCr+S4rScgOiBg8J+SsCDwn6qZJHtzZWxsUHJpY2V9RyDjgaflo7LljbRgfVxcbiAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgICA8YnV0dG9uXFxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcXG4gICAgICAgICAgICAgICAgICBzZXREaXNtYW50bGVDb25maXJtSXRlbSh7IGl0ZW06IGRldGFpbFBsYXllckl0ZW0sIGdhbWVJdGVtOiBiYXNlSXRlbSB9KTtcXG4gICAgICAgICAgICAgICAgfX1cXG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2lzU3RhdEVxIHx8IGlzUXVlc3RBY3RpdmUgfHwgZGV0YWlsUGxheWVySXRlbS5pc0xvY2tlZH1cXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVxcXCJwaXhlbC1idG4gdGV4dC14cyBmbGV4LTEgIWJnLXNsYXRlLTgwMCAhdGV4dC1zbGF0ZS0zMDAgaG92ZXI6IWJnLXNsYXRlLTcwMCBkaXNhYmxlZDpvcGFjaXR5LTQwXFxcIlxcbiAgICAgICAgICAgICAgPlxcbiAgICAgICAgICAgICAgICB7aXNTdGF0RXEgPyAn6KOF5YKZ5Lit5LiN5Y+vJyA6IGRldGFpbFBsYXllckl0ZW0uaXNMb2NrZWQgPyAn8J+UkiDjg63jg4Pjgq/kuK0nIDogJ/CflKgg5YiG6Kej44GZ44KLJ31cXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGdhcC0yIGZsZXgtd3JhcFxcXCI+XFxuICAgICAgICAgICAgICB7Z3VpbGROYW1lICYmICFkZXRhaWxQbGF5ZXJJdGVtLmVuZ3JhdmluZyAmJiBvbkVuZ3JhdmVJdGVtICYmIChcXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBcXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XFxuICAgICAgICAgICAgICAgICAgICBpZiAoY29uZmlybShg44CMJHtjb21waWxlZC5uYW1lfeOAjeOBq+OCruODq+ODieWQjeOAjCR7Z3VpbGROYW1lfeOAjeOCkuWIu+WNsOOBl+OBvuOBmeOBi++8n2ApKSB7XFxuICAgICAgICAgICAgICAgICAgICAgIG9uRW5ncmF2ZUl0ZW0oZGV0YWlsUGxheWVySXRlbS51aWQsIGd1aWxkTmFtZSk7XFxuICAgICAgICAgICAgICAgICAgICAgIHNldERldGFpbFBsYXllckl0ZW0obnVsbCk7XFxuICAgICAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgICAgfX1cXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XFxcInBpeGVsLWJ0biB0ZXh0LXhzIGZsZXgtMSBtaW4tdy1bNDAlXSAhYmctaW5kaWdvLTcwMCAhYm9yZGVyLWluZGlnby01MDAgaG92ZXI6IWJnLWluZGlnby02MDBcXFwiXFxuICAgICAgICAgICAgICAgID5cXG4gICAgICAgICAgICAgICAgICDwn5uh77iPIOOCruODq+ODieWIu+WNsFxcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICl9XFxuICAgICAgICAgICAgICA8YnV0dG9uXFxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uVG9nZ2xlTG9jayAmJiBvblRvZ2dsZUxvY2soZGV0YWlsUGxheWVySXRlbS51aWQpfVxcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XFxcInBpeGVsLWJ0biB0ZXh0LXhzIGZsZXgtMSAhYmctc2xhdGUtODAwICFib3JkZXItc2xhdGUtNjAwXFxcIlxcbiAgICAgICAgICAgICAgPlxcbiAgICAgICAgICAgICAgICB7ZGV0YWlsUGxheWVySXRlbS5pc0xvY2tlZCA/ICfwn5SSIOODreODg+OCr+ino+mZpCcgOiAn8J+UkyDjg63jg4Pjgq/jgZnjgosnfVxcbiAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgICA8YnV0dG9uXFxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldERldGFpbFBsYXllckl0ZW0obnVsbCl9XFxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cXFwicGl4ZWwtYnRuIHRleHQteHMgZmxleC0xICFiZy1zbGF0ZS04MDAgIXRleHQtc2xhdGUtMzAwICFib3JkZXItc2xhdGUtNjAwXFxcIlxcbiAgICAgICAgICAgICAgPlxcbiAgICAgICAgICAgICAgICDplonjgZjjgotcXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICApO1xcbiAgfTtcXG5cXG5cIiJdLCJtYXBwaW5ncyI6IkFBQUEsZUFBZTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTsiLCJuYW1lcyI6W119