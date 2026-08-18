import React, { useState, useEffect, useRef } from 'react';
import { EquipmentState, GameItem, PlayerItem, ItemEffect, JobType } from '../types';
import { ITEMS } from '../gameData';
import { WEAPON_SPRITES, ARMOR_SPRITES, drawIconSprite } from '../sprites';
import { getCompiledItem, calculateSellPrice, calculateUncurseCost } from '../itemUtils';
import { generateDailyShopItems, getTodayDateString, DailyShopItem } from '../dailyShopUtils';
import { getShopDiscountMultiplier } from '../jobUtils';

interface ItemIconProps {
  item: GameItem;
}

const ItemIcon: React.FC<ItemIconProps> = ({ item }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw generic square for materials for now, or you could add specific material sprites later
    if (item.type === 'material') {
      ctx.fillStyle = item.color;
      ctx.fillRect(8, 8, 16, 16);
      ctx.fillStyle = '#fff';
      ctx.fillRect(10, 10, 4, 4);
      return;
    }

    const spriteData = item.type === 'weapon' ? WEAPON_SPRITES[item.id] || WEAPON_SPRITES['w_wood_sword'] : ARMOR_SPRITES[item.id] || ARMOR_SPRITES['a_cloth'];
    
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
  }, [item]);

  return <canvas ref={canvasRef} width={32} height={32} className="w-8 h-8 rounded-sm pixel-panel p-0 bg-slate-800" style={{ imageRendering: 'pixelated' }} />;
};

interface InventoryProps {
  inventory: PlayerItem[];
  equipment: EquipmentState;
  gold: number;
  job?: JobType;
  onEquip: (slot: keyof EquipmentState, itemId: string) => void;
  onBuyItem: (itemId: string, price: number) => void;
  onBuyDailyItem?: (item: DailyShopItem) => void;
  soldOutDailyItemIds?: string[];
  onEnchantItem: (uid: string, cost: number, newEffect: PlayerItem) => void;
  onLimitBreak?: (uid1: string, uid2: string) => void;
  onSpecialEnchant?: (uid: string, materialUid: string, cost: number, newEffect: PlayerItem) => void;
  onSellItem?: (uid: string, sellPrice: number) => void;
  onDismantleItem?: (uid: string) => void;
  onToggleLock?: (uid: string) => void;
  onUncurseItem?: (uid: string, cost: number) => void;
  onOpenChest?: (item: PlayerItem) => void;
  onCraftItem?: (recipeId: string) => void;
  onUseConsumable?: (uid: string) => void;
  onOpenSocket?: (uid: string) => void;
  onInsertGem?: (weaponUid: string, gemUid: string) => void;
  onTransferEnhancements?: (sourceUid: string, targetUid: string, scrollUid: string) => void;
  isQuestActive?: boolean;
}

export const Inventory: React.FC<InventoryProps> = ({
  inventory,
  equipment,
  gold,
  job = 'balanced' as JobType,
  onEquip,
  onBuyItem,
  onBuyDailyItem,
  soldOutDailyItemIds = [],
  onEnchantItem,
  onLimitBreak,
  onSpecialEnchant,
  onSellItem,
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
}) => {
  const [tab, setTab] = useState<'inventory' | 'shop' | 'dailyShop' | 'forge' | 'materials'>('inventory');
  const [selectedMaterialUid, setSelectedMaterialUid] = useState<string>('');
  const [detailPlayerItem, setDetailPlayerItem] = useState<PlayerItem | null>(null);
  const [dismantleConfirmItem, setDismantleConfirmItem] = useState<{ item: PlayerItem; gameItem: GameItem } | null>(null);
  const [uncurseConfirmItem, setUncurseConfirmItem] = useState<{ item: PlayerItem; gameItem: GameItem; cost: number } | null>(null);
  const [transferScrollUid, setTransferScrollUid] = useState<string | null>(null);
  const [transferSourceUid, setTransferSourceUid] = useState<string>('');
  const [transferTargetUid, setTransferTargetUid] = useState<string>('');
  
  const todayStr = getTodayDateString();
  const dailyItems = generateDailyShopItems(todayStr);

  const ownedItems = inventory.map(pItem => getCompiledItem(pItem)).filter(Boolean) as GameItem[];
  const weapons = ownedItems.filter(item => item.type === 'weapon');
  const armors = ownedItems.filter(item => item.type === 'armor');
  const materials = inventory.filter(i => ITEMS[i.baseId]?.type === 'material');
  const chests = inventory.filter(i => ITEMS[i.baseId]?.type === 'chest');
  const nonEquipItems = inventory.filter(i => {
    const type = ITEMS[i.baseId]?.type;
    return type === 'material' || type === 'chest' || type === 'gem' || type === 'consumable';
  });

  // ショップにはベースアイテムが並ぶ (素材・宝箱・呪い装備は除外)
  const shopItems = Object.values(ITEMS).filter(item => 
    item.type === 'weapon' || item.type === 'armor' || item.id === 'c_transfer_scroll'
  ).filter(item => 
    item.price > 0 && 
    !item.isCursed && 
    !item.effect?.isCursed &&
    !item.id.includes('craft_')
  );

  // Initialize selected material if none is selected
  useEffect(() => {
    if (materials.length > 0 && !materials.find(m => m.uid === selectedMaterialUid)) {
      setSelectedMaterialUid(materials[0].uid);
    }
  }, [materials, selectedMaterialUid]);

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

    return (
      <div key={item.id} className={`pixel-panel flex flex-col gap-2 border-2 ${cardBg} ${cardBorderColor} ${cardShadow} relative transition-all duration-300 hover:scale-[1.01]`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-1.5">
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
          <div className="flex flex-col gap-2 mt-1">
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
                disabled={isStatEq || isQuestActive}
                className="pixel-btn text-[10px] !py-1 !px-3 active !border-amber-400 disabled:opacity-40"
              >
                {isStatEq ? '装備中不可' : '💰 売却する'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-slate-800">
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

            {/* Basic Enchant */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">基本強化 (ゴールド消費)</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-300 font-bold whitespace-nowrap">🪙 {200 + pItem.upgradeLevel * 100}</span>
                <button
                  onClick={() => handleEnchant(pItem)}
                  disabled={gold < (200 + pItem.upgradeLevel * 100) || isQuestActive}
                  className="pixel-btn text-[10px] !py-1 active !border-rose-400 disabled:opacity-40"
                >
                  基本強化 (+1)
                </button>
              </div>
            </div>

            {/* Limit Break / Merge */}
            <div className="flex items-center justify-between border-t border-slate-800/50 pt-2">
              <span className="text-[10px] text-slate-400">同名の装備を合体</span>
              <button
                onClick={() => handleLimitBreakClick(pItem)}
                disabled={!duplicate || isQuestActive}
                className="pixel-btn text-[10px] !py-1 disabled:opacity-40"
              >
                限界突破 (凸)
              </button>
            </div>
            
            {/* Special Enchant */}
            <div className="flex flex-col gap-1 bg-slate-950 p-2 border border-slate-800 rounded mt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-400">素材を消費して特殊強化 (ゴールド不要)</span>
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
                    return (
                      <option key={m.uid} value={m.uid}>{baseMat?.name}</option>
                    )
                  })}
                </select>
              </div>

              {selectedMaterialUid && (() => {
                const selMat = materials.find(m => m.uid === selectedMaterialUid);
                if (!selMat) return null;
                const matInfo: Record<string, string> = {
                  'm_slime_jelly': '🟢 粘り属性: 敵の攻撃速度 -15% (粘液スロー)',
                  'm_goblin_ear': '🔴 会心属性: クリティカル率 +5%',
                  'm_orc_fang': '🟣 吸血属性: 攻撃時HP吸収 +3%',
                  'm_demon_horn': '🟡 魔性属性: 毎秒HP回復+2 & 与ダメ+5%',
                  'm_dragon_scale': '🐲 覇竜属性: 最大HP+30 & 獲得G+10%',
                };
                return (
                  <div className="text-[9px] text-purple-200 bg-purple-950/90 p-1.5 rounded border border-purple-800/90 mt-1">
                    【付与予定】{matInfo[selMat.baseId] || '✨ 特殊効果付与'}
                  </div>
                );
              })()}

              <button
                onClick={() => handleSpecialEnchantClick(pItem)}
                disabled={!selectedMaterialUid || isQuestActive}
                className="pixel-btn text-[10px] !py-1 active !border-purple-400 disabled:opacity-40 mt-1"
              >
                特殊強化を実行
              </button>
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

    return (
      <div key={item.id} className="pixel-panel flex flex-col gap-2 bg-slate-900/90 border-2 border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ItemIcon item={item} />
            <span className="text-sm font-bold text-slate-100">{item.name}</span>
          </div>
          <span className="text-xs text-amber-400 font-bold">
            {item.type === 'weapon' ? `攻撃力 ${item.power}` : `防御力 ${item.power}`}
          </span>
        </div>
        {item.effect && (
          <div className="text-[11px] text-sky-300 bg-slate-950 p-2 border border-slate-800 rounded">
            ✨ {item.effect.description}
          </div>
        )}
        <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-800">
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
          <button
            onClick={() => onBuyItem(item.id, finalPrice)}
            disabled={gold < finalPrice || isQuestActive}
            className="pixel-btn text-xs active !border-amber-400 disabled:opacity-40"
          >
            購入する
          </button>
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

            <div className="flex gap-2">
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

    return (
      <div key={pItem.uid} className={`pixel-panel flex flex-col gap-2 bg-slate-900/90 border-2 ${isChest ? 'border-amber-500/70 bg-slate-900/95' : 'border-slate-700'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isChest ? (
              <span className="text-xl select-none">
                {baseMat.name.includes('伝説') ? '👑' : baseMat.name.includes('金') ? '🧰' : baseMat.name.includes('銀') ? '🎁' : '📦'}
              </span>
            ) : isConsumable ? (
              <span className="text-xl select-none">📜</span>
            ) : (
              <ItemIcon item={{ ...baseMat, id: pItem.baseId }} />
            )}
            <span className="text-sm font-bold" style={{ color: baseMat.color }}>{baseMat.name}</span>
          </div>
          {isChest && onOpenChest && (
            <button
              onClick={() => onOpenChest(pItem)}
              disabled={isQuestActive}
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
              disabled={isQuestActive}
              className="pixel-btn text-xs !py-1 !px-2 font-bold !bg-emerald-700 !text-emerald-100 hover:!bg-emerald-600 active:scale-95 disabled:opacity-40"
            >
              使用する
            </button>
          )}
        </div>
        {baseMat.effect && (
          <div className="text-[11px] text-slate-300 bg-slate-950 p-2 border border-slate-800 rounded">
            {baseMat.effect.description}
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
          className={`pixel-btn text-[11px] flex-1 min-w-[75px] ${tab === 'inventory' ? 'active' : ''}`}
        >
          🎒 装備
        </button>
        <button
          onClick={() => setTab('forge')}
          className={`pixel-btn text-[11px] flex-1 min-w-[75px] ${tab === 'forge' ? 'active' : ''}`}
        >
          🔨 鍛冶屋
        </button>
        <button
          onClick={() => setTab('materials')}
          className={`pixel-btn text-[11px] flex-1 min-w-[75px] ${tab === 'materials' ? 'active' : ''}`}
        >
          💎 素材 {chests.length > 0 ? `(🎁${chests.length})` : ''}
        </button>
        <button
          onClick={() => setTab('dailyShop')}
          className={`pixel-btn text-[11px] flex-1 min-w-[100px] ${tab === 'dailyShop' ? 'active !border-purple-400 !text-purple-300' : ''}`}
        >
          📅 日替わりショップ
        </button>
        <button
          onClick={() => setTab('shop')}
          className={`pixel-btn text-[11px] flex-1 min-w-[75px] ${tab === 'shop' ? 'active' : ''}`}
        >
          🏪 通常店
        </button>
      </div>

      {tab === 'inventory' || tab === 'forge' ? (
        <div>
          {tab === 'forge' ? (
            <div className="mb-4 text-xs leading-relaxed text-slate-300 bg-slate-950 p-3 border-2 border-slate-800 rounded">
              <p className="text-rose-400 font-bold mb-1">🔨 鍛冶屋工房</p>
              <p>【解呪 (呪い解除)】: ゴールドを消費し、呪い装備のHPドレインやデバフを聖なる力で浄化！</p>
              <p>【基本強化】: ゴールドを消費してアイテムの基本性能をアップグレード！</p>
              <p>【限界突破】: 同名の装備を消費して限界突破(+値が上昇)！</p>
              <p>【特殊強化】: ドロップ素材を消費して追加能力を付与！(ゴールド不要)</p>
            </div>
          ) : (
            <div className="mb-4 text-xs leading-relaxed text-slate-300 bg-slate-950 p-3 border-2 border-slate-800 rounded">
              <p className="text-amber-400 font-bold mb-1">💡 装備システムのヒント</p>
              <p>・【能力を装備】：攻撃力・防御力や自動HP回復・獲得量UP効果が反映されます。</p>
              <p>・【見た目を装備】：ステータスはそのままで、キャラクターの見た目だけを変更できます！</p>
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
      ) : tab === 'materials' ? (
        <div>
          <div className="mb-4 bg-slate-950 p-3 rounded border border-slate-800">
            <h3 className="text-sm font-bold text-amber-300 mb-2 border-b border-slate-800 pb-1 flex items-center justify-between">
              <span>🛠️ アイテムクラフト</span>
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <div className="text-sm font-bold text-slate-100">📜 呪い封じの護符</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    全5種のモンスター素材 各{job === 'artisan' ? 8 : 10}個
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (onCraftItem) onCraftItem('c_curse_breaker');
                  }}
                  disabled={isQuestActive}
                  className="pixel-btn text-xs !py-1 !px-3 font-bold !bg-amber-600 !text-slate-100 !border-amber-400 active:scale-95 disabled:opacity-40"
                >
                  作成
                </button>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <div className="text-sm font-bold text-rose-300">⚔️ 終焉剣ラグナロク</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    全5種の素材 各{job === 'artisan' ? 40 : 50}個<br/>+ 全5種の属性宝石 各{job === 'artisan' ? 4 : 5}個
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (onCraftItem) onCraftItem('w_craft_ragnarok');
                  }}
                  disabled={isQuestActive}
                  className="pixel-btn text-xs !py-1 !px-3 font-bold !bg-rose-900 !text-rose-100 !border-rose-500 active:scale-95 disabled:opacity-40"
                >
                  鍛造
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-sky-300">🛡️ 創星盾イージス</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    全5種の素材 各{job === 'artisan' ? 40 : 50}個<br/>+ 全5種の属性宝石 各{job === 'artisan' ? 4 : 5}個
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (onCraftItem) onCraftItem('a_craft_aegis');
                  }}
                  disabled={isQuestActive}
                  className="pixel-btn text-xs !py-1 !px-3 font-bold !bg-sky-900 !text-sky-100 !border-sky-500 active:scale-95 disabled:opacity-40"
                >
                  鍛造
                </button>
              </div>
            </div>
          </div>
          
          <h3 className="text-sm font-bold text-amber-300 mb-3 border-b border-slate-800 pb-1">💎 所持素材・宝箱・消費アイテム</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nonEquipItems.length > 0 ? nonEquipItems.map(item => renderMaterialCard(item)) : <div className="text-xs text-slate-500">素材や宝箱を持っていません。集中クエストを完遂して宝箱を獲得しましょう！</div>}
          </div>
        </div>
      ) : tab === 'dailyShop' ? (
        <div>
          <div className="mb-4 text-xs leading-relaxed text-purple-200 bg-purple-950/80 p-3 border-2 border-purple-700/80 rounded shadow-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-purple-300 font-bold text-sm">📅 本日の闇市・限定日替わりショップ</span>
              <span className="text-[10px] text-purple-400 font-mono bg-purple-900/60 px-2 py-0.5 rounded border border-purple-700">【日付連動更新】</span>
            </div>
            <p className="text-[11px] text-purple-300/90">
              毎日新しい商品が入荷！驚異的な能力と凶悪なデバフを併せ持つ<span className="text-purple-300 font-bold">【💀 呪われた装備】</span>や、割引限定品が並びます。
            </p>
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
                  onChange={(e) => setTransferSourceUid(e.target.value)}
                  className="pixel-input text-xs w-full p-2 bg-slate-950 border border-slate-700 text-slate-200"
                >
                  <option value="">選択してください...</option>
                  {ownedItems.filter(i => !inventory.find(inv => inv.uid === i.id)?.isLocked).map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-sky-300 mb-1">継承先（上書きされます）:</label>
                <select 
                  value={transferTargetUid}
                  onChange={(e) => setTransferTargetUid(e.target.value)}
                  className="pixel-input text-xs w-full p-2 bg-slate-950 border border-slate-700 text-slate-200"
                >
                  <option value="">選択してください...</option>
                  {ownedItems.filter(i => !inventory.find(inv => inv.uid === i.id)?.isLocked && i.id !== transferSourceUid).map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
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
