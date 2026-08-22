import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc, getDoc, deleteDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { generateUid } from '../gameData';
import { ItemIcon } from './Inventory';
import { ITEMS } from '../gameData';
import { PlayerItem, GameItem } from '../types';
import { getCompiledItem } from '../itemUtils';

export interface GuildShopItem {
  id: string;
  guildId: string;
  sellerId: string;
  sellerName: string;
  itemData: PlayerItem;
  price: number;
  buyerId?: string | null;
  buyerName?: string | null;
  status: 'active' | 'sold' | 'claimed' | 'canceled';
  sellerClaimed?: boolean;
  note?: string;
  createdAt: string;
}

interface GuildShopProps {
  guildId: string;
  guildName: string;
  isLeader: boolean;
  inventory: PlayerItem[];
  gold: number;
  onRefreshGold: (amount: number) => void;
  onReceiveItem: (item: PlayerItem) => void;
  onRemoveItem: (uid: string) => void;
  showToast?: (msg: string) => void;
}

// Safely remove any undefined values for Firestore serialization
const sanitizeForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned;
  }
  return obj;
};

// Safely normalize a PlayerItem
const normalizePlayerItem = (rawItem: any): PlayerItem => {
  if (!rawItem) {
    return {
      uid: generateUid(),
      baseId: 'w_wood_sword',
      upgradeLevel: 0,
      addedPower: 0,
    };
  }
  const baseId = rawItem.baseId || rawItem.itemId || 'w_wood_sword';
  const cleanItem: PlayerItem = {
    uid: rawItem.uid || generateUid(),
    baseId,
    upgradeLevel: Number(rawItem.upgradeLevel ?? rawItem.plus) || 0,
    addedPower: Number(rawItem.addedPower) || 0,
  };
  if (rawItem.isLocked !== undefined) cleanItem.isLocked = Boolean(rawItem.isLocked);
  if (rawItem.limitBreak !== undefined && rawItem.limitBreak !== null) cleanItem.limitBreak = Number(rawItem.limitBreak);
  if (rawItem.specialEnchantCount !== undefined && rawItem.specialEnchantCount !== null) cleanItem.specialEnchantCount = Number(rawItem.specialEnchantCount);
  if (rawItem.customPrefix) cleanItem.customPrefix = String(rawItem.customPrefix);
  if (rawItem.addedEffect) cleanItem.addedEffect = rawItem.addedEffect;
  if (rawItem.engraving) cleanItem.engraving = String(rawItem.engraving);
  if (rawItem.isUncursed !== undefined && rawItem.isUncursed !== null) cleanItem.isUncursed = Boolean(rawItem.isUncursed);
  if (rawItem.unlockedSockets !== undefined && rawItem.unlockedSockets !== null) cleanItem.unlockedSockets = Number(rawItem.unlockedSockets);
  if (rawItem.slottedGems !== undefined && Array.isArray(rawItem.slottedGems)) cleanItem.slottedGems = rawItem.slottedGems;
  return cleanItem;
};

const getSafeCompiledItem = (pItem: PlayerItem): GameItem & { baseId?: string } => {
  const normalized = normalizePlayerItem(pItem);
  const base = ITEMS[normalized.baseId];
  
  if (!base) {
    return {
      id: normalized.uid,
      baseId: normalized.baseId,
      name: '未知のアイテム',
      type: 'material',
      power: 0,
      price: 10,
      color: '#94a3b8',
    };
  }

  if (base.type === 'weapon' || base.type === 'armor') {
    const compiled = getCompiledItem(normalized);
    if (compiled) {
      return { ...compiled, baseId: normalized.baseId };
    }
  }

  let name = base.name;
  if (normalized.customPrefix) name = `${normalized.customPrefix}${name}`;
  if (normalized.upgradeLevel > 0) name = `${name} +${normalized.upgradeLevel}`;

  return {
    ...base,
    id: normalized.uid,
    baseId: normalized.baseId,
    name,
    power: base.power + (normalized.addedPower || 0),
  };
};

const getItemTypeLabel = (type: string) => {
  switch (type) {
    case 'weapon': return '⚔️ 武器';
    case 'armor': return '🛡️ 防具';
    case 'chest': return '🧰 宝箱';
    case 'gem': return '💎 宝石';
    case 'consumable': return '📜 護符/巻物';
    case 'material': return '📦 素材';
    default: return 'アイテム';
  }
};

export const GuildShop: React.FC<GuildShopProps> = ({
  guildId,
  guildName,
  isLeader,
  inventory,
  gold,
  onRefreshGold,
  onReceiveItem,
  onRemoveItem,
  showToast,
}) => {
  const [shopTab, setShopTab] = useState<'browse' | 'sell' | 'my'>('browse');
  const [shopItems, setShopItems] = useState<GuildShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  // Sell state
  const [selectedSellItem, setSelectedSellItem] = useState<PlayerItem | null>(null);
  const [priceInput, setPriceInput] = useState<number>(500);
  const [noteInput, setNoteInput] = useState<string>('');
  const [sellFilterType, setSellFilterType] = useState<string>('all');
  const [sellSearchQuery, setSellSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchShopItems = async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'guilds', guildId, 'shop'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const fetched: GuildShopItem[] = snapshot.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          guildId: data.guildId || guildId,
          sellerId: data.sellerId || '',
          sellerName: data.sellerName || '名無しメンバー',
          itemData: normalizePlayerItem(data.itemData),
          price: Number(data.price) || 10,
          buyerId: data.buyerId || null,
          buyerName: data.buyerName || null,
          status: data.status || 'active',
          sellerClaimed: Boolean(data.sellerClaimed),
          note: data.note || '',
          createdAt: data.createdAt || new Date().toISOString(),
        };
      });
      setShopItems(fetched);
    } catch (e) {
      console.error('Fetch guild shop error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopItems();
  }, [guildId]);

  // Handle Listing an Item to Guild Shop
  const handleListItem = async () => {
    if (!auth.currentUser || !selectedSellItem) return;
    if (priceInput < 1) {
      alert('販売価格は1G以上に設定してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemId = generateUid();
      const normalizedItem = normalizePlayerItem(selectedSellItem);

      const newItem: GuildShopItem = {
        id: itemId,
        guildId,
        sellerId: auth.currentUser.uid,
        sellerName: auth.currentUser.displayName || '名無しメンバー',
        itemData: normalizedItem,
        price: Math.floor(priceInput),
        status: 'active',
        sellerClaimed: false,
        note: noteInput.trim(),
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'guilds', guildId, 'shop', itemId), sanitizeForFirestore(newItem));
      
      // Remove from player inventory
      onRemoveItem(selectedSellItem.uid);
      setSelectedSellItem(null);
      setNoteInput('');
      setShopTab('my');
      await fetchShopItems();

      const compiled = getSafeCompiledItem(normalizedItem);
      const msg = `✨ 「${compiled.name}」を ${priceInput.toLocaleString()} G でギルドショップに出品しました！`;
      if (showToast) showToast(msg);
      else alert(msg);
    } catch (e: any) {
      console.error('Guild shop list error:', e);
      alert(`出品に失敗しました: ${e?.message || e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Purchasing an Item from Guild Shop
  const handlePurchase = async (shopItem: GuildShopItem) => {
    if (!auth.currentUser) {
      alert('購入するにはログインが必要です');
      return;
    }
    if (shopItem.sellerId === auth.currentUser.uid) {
      alert('自分の出品したアイテムは購入できません（「出品管理」から出品取消ができます）');
      return;
    }

    if (gold < shopItem.price) {
      alert(`所持金が足りません！（必要: ${shopItem.price.toLocaleString()} G / 所持: ${gold.toLocaleString()} G）`);
      return;
    }

    const compiled = getSafeCompiledItem(shopItem.itemData);
    const confirmBuy = window.confirm(
      `🛒 ギルドメンバー「${shopItem.sellerName}」の出品アイテム\n【${compiled.name}】を ${shopItem.price.toLocaleString()} G で購入しますか？`
    );
    if (!confirmBuy) return;

    try {
      const docRef = doc(db, 'guilds', guildId, 'shop', shopItem.id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        alert('この出品は既に削除されたか終了しました');
        fetchShopItems();
        return;
      }
      const currentData = snap.data() as GuildShopItem;
      if (currentData.status !== 'active') {
        alert('この商品は既に売約済みです');
        fetchShopItems();
        return;
      }

      // 1. Deduct gold
      onRefreshGold(-shopItem.price);

      // 2. Grant item to buyer
      const normalizedItem = normalizePlayerItem(currentData.itemData);
      onReceiveItem(normalizedItem);

      // 3. Mark as sold in Firestore
      await updateDoc(docRef, {
        status: 'sold',
        buyerId: auth.currentUser.uid,
        buyerName: auth.currentUser.displayName || 'ギルドメンバー',
        sellerClaimed: false,
      });

      await fetchShopItems();

      const successMsg = `🎉 ギルドショップから「${compiled.name}」を ${shopItem.price.toLocaleString()} G で購入しました！\n（アイテムをバッグに収納しました）`;
      if (showToast) showToast(successMsg);
      else alert(successMsg);
    } catch (e: any) {
      console.error('Guild purchase error:', e);
      alert(`購入処理に失敗しました: ${e?.message || e}`);
    }
  };

  // Handle Cancel Listing
  const handleCancelListing = async (shopItem: GuildShopItem) => {
    if (!auth.currentUser || shopItem.sellerId !== auth.currentUser.uid) return;
    if (shopItem.status !== 'active') {
      alert('販売中のアイテムのみ出品取消が可能です');
      return;
    }

    const confirmCancel = window.confirm('出品を取り消して、アイテムをバッグに戻しますか？');
    if (!confirmCancel) return;

    try {
      const docRef = doc(db, 'guilds', guildId, 'shop', shopItem.id);
      await deleteDoc(docRef);

      // Restore item to player inventory
      onReceiveItem(normalizePlayerItem(shopItem.itemData));
      await fetchShopItems();

      const msg = '📦 出品を取り消し、アイテムをバッグに戻しました';
      if (showToast) showToast(msg);
      else alert(msg);
    } catch (e: any) {
      console.error('Cancel listing error:', e);
      alert(`出品取消に失敗しました: ${e?.message || e}`);
    }
  };

  // Handle Claim Gold from Sold Item
  const handleClaimGold = async (shopItem: GuildShopItem) => {
    if (!auth.currentUser || shopItem.sellerId !== auth.currentUser.uid) return;
    if (shopItem.status !== 'sold' || shopItem.sellerClaimed) return;

    try {
      const docRef = doc(db, 'guilds', guildId, 'shop', shopItem.id);
      await updateDoc(docRef, {
        sellerClaimed: true,
        status: 'claimed',
      });

      // Grant gold
      onRefreshGold(shopItem.price);
      await fetchShopItems();

      const msg = `🪙 売上金 +${shopItem.price.toLocaleString()} G を受け取りました！`;
      if (showToast) showToast(msg);
      else alert(msg);
    } catch (e: any) {
      console.error('Claim gold error:', e);
      alert(`売上受取に失敗しました: ${e?.message || e}`);
    }
  };

  // Handle Claim All Sold Gold
  const handleClaimAllGold = async () => {
    if (!auth.currentUser) return;
    const claimableItems = shopItems.filter(
      i => i.sellerId === auth.currentUser?.uid && i.status === 'sold' && !i.sellerClaimed
    );
    if (claimableItems.length === 0) return;

    let totalEarned = 0;
    try {
      for (const item of claimableItems) {
        totalEarned += item.price;
        const docRef = doc(db, 'guilds', guildId, 'shop', item.id);
        await updateDoc(docRef, {
          sellerClaimed: true,
          status: 'claimed',
        });
      }

      onRefreshGold(totalEarned);
      await fetchShopItems();

      const msg = `🎉 売上金を一括受領しました！ 合計 +${totalEarned.toLocaleString()} G`;
      if (showToast) showToast(msg);
      else alert(msg);
    } catch (e: any) {
      console.error('Claim all gold error:', e);
      alert(`一括受取に失敗しました: ${e?.message || e}`);
    }
  };

  // Filtered browse items
  const activeMarketItems = useMemo(() => {
    return shopItems.filter(item => {
      if (item.status !== 'active') return false;
      const compiled = getSafeCompiledItem(item.itemData);
      
      // Type filter
      if (filterType !== 'all') {
        if (compiled.type !== filterType) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        const nameMatch = compiled.name.toLowerCase().includes(queryLower);
        const sellerMatch = item.sellerName.toLowerCase().includes(queryLower);
        const noteMatch = item.note?.toLowerCase().includes(queryLower);
        if (!nameMatch && !sellerMatch && !noteMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [shopItems, filterType, searchQuery, sortBy]);

  // My listings
  const myListings = useMemo(() => {
    if (!auth.currentUser) return [];
    return shopItems.filter(item => item.sellerId === auth.currentUser?.uid);
  }, [shopItems]);

  const unclaimedSalesTotal = useMemo(() => {
    return myListings
      .filter(i => i.status === 'sold' && !i.sellerClaimed)
      .reduce((sum, i) => sum + i.price, 0);
  }, [myListings]);

  // Inventory items available for selling
  const availableInventory = useMemo(() => {
    return inventory.filter(item => {
      const base = ITEMS[item.baseId];
      if (!base) return false;
      if (item.isLocked) return false;

      if (sellFilterType !== 'all') {
        if (base.type !== sellFilterType) return false;
      }

      if (sellSearchQuery.trim()) {
        const q = sellSearchQuery.toLowerCase();
        const compiled = getSafeCompiledItem(item);
        if (!compiled.name.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [inventory, sellFilterType, sellSearchQuery]);

  return (
    <div className="flex flex-col h-full overflow-hidden text-slate-100">
      {/* Sub Header / Nav Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setShopTab('browse')}
            className={`pixel-btn text-xs !py-1 !px-2.5 sm:!px-3 flex items-center gap-1.5 ${
              shopTab === 'browse'
                ? '!bg-indigo-700 !border-indigo-400 font-bold text-white shadow-md'
                : '!bg-slate-950 !border-slate-700 text-slate-300 hover:!bg-slate-800'
            }`}
          >
            <span>🛒</span> メンバー出品一覧
            <span className="text-[10px] bg-indigo-950 px-1.5 py-0.2 rounded-full border border-indigo-600 text-indigo-200">
              {shopItems.filter(i => i.status === 'active').length}
            </span>
          </button>

          <button
            onClick={() => setShopTab('sell')}
            className={`pixel-btn text-xs !py-1 !px-2.5 sm:!px-3 flex items-center gap-1.5 ${
              shopTab === 'sell'
                ? '!bg-amber-700 !border-amber-400 font-bold text-white shadow-md'
                : '!bg-slate-950 !border-slate-700 text-slate-300 hover:!bg-slate-800'
            }`}
          >
            <span>➕</span> ギルドに出品
          </button>

          <button
            onClick={() => setShopTab('my')}
            className={`pixel-btn text-xs !py-1 !px-2.5 sm:!px-3 flex items-center gap-1.5 relative ${
              shopTab === 'my'
                ? '!bg-emerald-700 !border-emerald-400 font-bold text-white shadow-md'
                : '!bg-slate-950 !border-slate-700 text-slate-300 hover:!bg-slate-800'
            }`}
          >
            <span>📦</span> 自分の出品・売上
            {unclaimedSalesTotal > 0 && (
              <span className="animate-pulse bg-amber-400 text-slate-950 font-bold text-[9px] px-1 py-0.2 rounded-full">
                受取可!
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-amber-300 bg-slate-950 px-2 py-1 rounded border border-amber-500/40 font-bold">
            🪙 所持金: {gold.toLocaleString()} G
          </span>
          <button
            onClick={fetchShopItems}
            className="pixel-btn text-[10px] !py-1 !px-2 !bg-slate-800 text-slate-300 hover:!bg-slate-700"
            title="更新"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center py-12 text-indigo-400 animate-pulse text-xs">
            🏪 ギルドショップの在庫を確認中...
          </div>
        ) : shopTab === 'browse' ? (
          /* TAB 1: BROWSE SHOP */
          <div className="space-y-3">
            {/* Search & Filter Bar */}
            <div className="flex flex-wrap gap-2 items-center bg-slate-950 p-2 border border-slate-800 rounded">
              <input
                type="text"
                placeholder="アイテム名・出品者・メモ検索..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pixel-input flex-1 min-w-[140px] text-xs p-1.5 bg-slate-900 border border-slate-700 text-slate-200"
              />

              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="pixel-input text-xs p-1.5 bg-slate-900 border border-slate-700 text-slate-200"
              >
                <option value="all">すべての種別</option>
                <option value="weapon">⚔️ 武器</option>
                <option value="armor">🛡️ 防具</option>
                <option value="gem">💎 宝石</option>
                <option value="material">📦 素材</option>
                <option value="consumable">📜 護符/巻物</option>
                <option value="chest">🧰 宝箱</option>
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="pixel-input text-xs p-1.5 bg-slate-900 border border-slate-700 text-slate-200"
              >
                <option value="newest">新着順</option>
                <option value="price_asc">価格が安い順</option>
                <option value="price_desc">価格が高い順</option>
              </select>
            </div>

            {/* Item Grid */}
            {activeMarketItems.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-400 text-xs">
                <div className="text-3xl mb-2">🏪</div>
                現在ギルドショップに出品されているアイテムはありません。<br />
                <span className="text-indigo-300 text-[11px] mt-1 inline-block">
                  「➕ ギルドに出品」タブから余った武具や素材をメンバー向けに出品してみましょう！
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {activeMarketItems.map(item => {
                  const compiled = getSafeCompiledItem(item.itemData);
                  const isMyItem = item.sellerId === auth.currentUser?.uid;
                  const canAfford = gold >= item.price;

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-950 border border-slate-700 hover:border-indigo-500/70 p-3 rounded flex flex-col justify-between gap-2.5 transition-colors shadow-inner"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="flex-shrink-0 mt-0.5">
                          <ItemIcon item={{ ...compiled, id: item.itemData.baseId }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="font-bold text-xs sm:text-sm truncate"
                              style={{ color: compiled.color || '#e2e8f0' }}
                            >
                              {compiled.name}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 whitespace-nowrap">
                              {getItemTypeLabel(compiled.type)}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {compiled.type === 'weapon' && (
                              <span className="text-rose-300 font-bold">攻撃力: {compiled.power}</span>
                            )}
                            {compiled.type === 'armor' && (
                              <span className="text-sky-300 font-bold">防御力: {compiled.power}</span>
                            )}
                            {item.itemData.engraving && (
                              <span className="text-indigo-400">🛡️ 刻印: {item.itemData.engraving}</span>
                            )}
                          </div>

                          {compiled.effect?.description && (
                            <div className="text-[10px] text-amber-200/90 mt-1 line-clamp-2 bg-slate-900/80 p-1 rounded border border-slate-800">
                              ✨ {compiled.effect.description}
                            </div>
                          )}

                          {item.note && (
                            <div className="text-[10px] text-emerald-300 mt-1 italic flex items-center gap-1">
                              <span>💬</span>「{item.note}」
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Row: Seller & Buy Button */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                          <span>出品者:</span>
                          <span className="text-indigo-300 font-bold truncate">{item.sellerName}</span>
                          {isMyItem && (
                            <span className="text-[9px] bg-indigo-900/80 text-indigo-200 px-1 rounded border border-indigo-700">
                              あなた
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="font-bold text-amber-300 text-xs sm:text-sm">
                            🪙 {item.price.toLocaleString()} G
                          </div>

                          {isMyItem ? (
                            <button
                              onClick={() => handleCancelListing(item)}
                              className="pixel-btn text-[10px] !py-1 !px-2 !bg-rose-950 !border-rose-700 text-rose-300 hover:!bg-rose-900"
                            >
                              出品取消
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePurchase(item)}
                              disabled={!canAfford}
                              className={`pixel-btn text-xs !py-1 !px-3 font-bold ${
                                canAfford
                                  ? '!bg-emerald-700 !border-emerald-500 hover:!bg-emerald-600 text-white shadow-md'
                                  : 'opacity-50 !bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {canAfford ? '購入する' : '金不足'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : shopTab === 'sell' ? (
          /* TAB 2: SELL ITEM */
          <div className="flex flex-col md:flex-row gap-4 h-full">
            {/* Left: Inventory Selection */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-950 p-3 border border-slate-800 rounded">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-xs sm:text-sm text-slate-300 flex items-center gap-1">
                  <span>🎒</span> 出品するアイテムを選択
                </h4>
                <span className="text-[10px] text-slate-400">{availableInventory.length} 個</span>
              </div>

              {/* Search & Filter */}
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="アイテム検索..."
                  value={sellSearchQuery}
                  onChange={e => setSellSearchQuery(e.target.value)}
                  className="pixel-input flex-1 text-xs p-1 bg-slate-900 border border-slate-700 text-slate-200"
                />
                <select
                  value={sellFilterType}
                  onChange={e => setSellFilterType(e.target.value)}
                  className="pixel-input text-xs p-1 bg-slate-900 border border-slate-700 text-slate-200"
                >
                  <option value="all">全種別</option>
                  <option value="weapon">武器</option>
                  <option value="armor">防具</option>
                  <option value="gem">宝石</option>
                  <option value="material">素材</option>
                  <option value="consumable">護符/巻物</option>
                  <option value="chest">宝箱</option>
                </select>
              </div>

              {/* Inventory List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[300px] md:max-h-none pr-1">
                {availableInventory.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    出品可能なアイテムがありません<br />
                    <span className="text-[10px] opacity-75">（ロック中のアイテムは解除してから出品してください）</span>
                  </div>
                ) : (
                  availableInventory.map(item => {
                    const compiled = getSafeCompiledItem(item);
                    const isSelected = selectedSellItem?.uid === item.uid;

                    return (
                      <div
                        key={item.uid}
                        onClick={() => setSelectedSellItem(item)}
                        className={`p-2 rounded border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                          isSelected
                            ? 'bg-indigo-950/80 border-indigo-400 shadow-md scale-[1.01]'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ItemIcon item={{ ...compiled, id: item.baseId }} />
                          <div className="min-w-0">
                            <div
                              className="font-bold text-xs truncate"
                              style={{ color: compiled.color || '#e2e8f0' }}
                            >
                              {compiled.name}
                            </div>
                            <div className="text-[9px] text-slate-400">
                              {getItemTypeLabel(compiled.type)}
                              {compiled.power > 0 && ` | 力:${compiled.power}`}
                            </div>
                          </div>
                        </div>

                        <button
                          className={`pixel-btn text-[10px] !py-0.5 !px-2 flex-shrink-0 ${
                            isSelected ? '!bg-indigo-600 text-white' : '!bg-slate-800 text-slate-300'
                          }`}
                        >
                          {isSelected ? '選択中' : '選択'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Price & Listing Config */}
            <div className="w-full md:w-72 bg-slate-950 p-3 border border-slate-800 rounded flex flex-col justify-between gap-3">
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-amber-300 mb-2 flex items-center gap-1">
                  <span>⚙️</span> 出品設定
                </h4>

                {selectedSellItem ? (
                  (() => {
                    const compiled = getSafeCompiledItem(selectedSellItem);
                    return (
                      <div className="bg-slate-900 p-2.5 rounded border border-indigo-900/50 mb-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <ItemIcon item={{ ...compiled, id: selectedSellItem.baseId }} />
                          <div className="min-w-0">
                            <div
                              className="font-bold text-xs truncate"
                              style={{ color: compiled.color || '#e2e8f0' }}
                            >
                              {compiled.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {getItemTypeLabel(compiled.type)}
                            </div>
                          </div>
                        </div>
                        {compiled.effect?.description && (
                          <div className="text-[9px] text-amber-200/90 bg-slate-950 p-1 rounded border border-slate-800">
                            ✨ {compiled.effect.description}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="bg-slate-900/50 p-4 text-center rounded border border-slate-800 text-slate-500 text-xs mb-3">
                    左の一覧から出品したいアイテムを選択してください
                  </div>
                )}

                {/* Price Setting */}
                <div className="space-y-1.5 mb-3">
                  <label className="text-xs font-bold text-slate-300 flex justify-between">
                    <span>販売価格 (Gold)</span>
                    <span className="text-amber-300">🪙 {priceInput.toLocaleString()} G</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99999999}
                    value={priceInput}
                    onChange={e => setPriceInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    disabled={!selectedSellItem}
                    className="pixel-input w-full text-xs p-2 bg-slate-900 border border-slate-700 text-amber-300 font-bold"
                  />

                  {/* Preset Price Buttons */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {[100, 500, 1000, 5000, 10000, 50000, 100000, 500000].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setPriceInput(amt)}
                        disabled={!selectedSellItem}
                        className="pixel-btn text-[9px] !py-0.5 !px-1 !bg-slate-900 hover:!bg-slate-800 text-slate-300 disabled:opacity-50"
                      >
                        {amt >= 10000 ? `${amt / 10000}万` : amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note for guild mates */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    メンバーへのメモ <span className="text-[10px] text-slate-500">(任意)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="例: ギルド特価！/ ボス戦用にどうぞ"
                    maxLength={50}
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    disabled={!selectedSellItem}
                    className="pixel-input w-full text-xs p-1.5 bg-slate-900 border border-slate-700 text-slate-200"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleListItem}
                disabled={!selectedSellItem || isSubmitting || priceInput < 1}
                className="pixel-btn w-full py-2 text-xs !bg-amber-700 !border-amber-500 hover:!bg-amber-600 font-bold text-white shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? '出品処理中...' : '🏪 ギルドショップに出品する'}
              </button>
            </div>
          </div>
        ) : (
          /* TAB 3: MY LISTINGS & SALES */
          <div className="space-y-4">
            {/* Sales Banner */}
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 p-3 sm:p-4 rounded border border-indigo-900 flex flex-wrap items-center justify-between gap-3 shadow-inner">
              <div>
                <div className="text-xs text-slate-400">未受取のギルドショップ売上金</div>
                <div className="text-lg sm:text-xl font-bold text-amber-300 flex items-center gap-1.5 mt-0.5">
                  <span>🪙</span>
                  <span>{unclaimedSalesTotal.toLocaleString()} G</span>
                </div>
              </div>

              {unclaimedSalesTotal > 0 && (
                <button
                  onClick={handleClaimAllGold}
                  className="pixel-btn text-xs !py-2 !px-4 !bg-amber-600 !border-amber-400 hover:!bg-amber-500 text-white font-bold animate-pulse shadow-md"
                >
                  💰 売上金を一括受取 ({unclaimedSalesTotal.toLocaleString()} G)
                </button>
              )}
            </div>

            {/* My Items List */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                <span>あなたの出品アイテム履歴 ({myListings.length} 件)</span>
              </h4>

              {myListings.length === 0 ? (
                <div className="text-center py-10 bg-slate-950 border border-slate-800 rounded text-slate-500 text-xs">
                  まだギルドショップに出品したアイテムはありません。
                </div>
              ) : (
                <div className="space-y-2">
                  {myListings.map(item => {
                    const compiled = getSafeCompiledItem(item.itemData);
                    const isSold = item.status === 'sold' && !item.sellerClaimed;
                    const isClaimed = item.status === 'claimed' || item.sellerClaimed;
                    const isActive = item.status === 'active';

                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                          isSold
                            ? 'bg-amber-950/30 border-amber-500/70 shadow-md'
                            : isClaimed
                            ? 'bg-slate-950/40 border-slate-800 opacity-70'
                            : 'bg-slate-950 border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ItemIcon item={{ ...compiled, id: item.itemData.baseId }} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-bold text-xs truncate"
                                style={{ color: compiled.color || '#e2e8f0' }}
                              >
                                {compiled.name}
                              </span>
                              {isActive && (
                                <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1 rounded border border-emerald-800">
                                  販売中
                                </span>
                              )}
                              {isSold && (
                                <span className="text-[9px] bg-amber-900 text-amber-200 font-bold px-1 rounded border border-amber-600 animate-pulse">
                                  売却完了!
                                </span>
                              )}
                              {isClaimed && (
                                <span className="text-[9px] bg-slate-900 text-slate-500 px-1 rounded border border-slate-800">
                                  受領済
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                              <span>価格: 🪙 {item.price.toLocaleString()} G</span>
                              {item.buyerName && (
                                <span className="text-sky-300">購入者: {item.buyerName}</span>
                              )}
                              {item.note && (
                                <span className="text-slate-500 italic">「{item.note}」</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                          {isActive && (
                            <button
                              onClick={() => handleCancelListing(item)}
                              className="pixel-btn text-[10px] !py-1 !px-2.5 !bg-rose-950 !border-rose-700 text-rose-300 hover:!bg-rose-900"
                            >
                              出品取消
                            </button>
                          )}

                          {isSold && (
                            <button
                              onClick={() => handleClaimGold(item)}
                              className="pixel-btn text-xs !py-1 !px-3 !bg-amber-600 !border-amber-400 hover:!bg-amber-500 font-bold text-white shadow"
                            >
                              💰 売上金受取 (+{item.price.toLocaleString()} G)
                            </button>
                          )}

                          {isClaimed && (
                            <span className="text-[10px] text-slate-500">取引完了</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
