import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth, signInWithGoogle } from '../firebase';
import { generateUid } from '../gameData';
import { ItemIcon } from './Inventory';
import { ITEMS } from '../gameData';
import { PlayerItem, GameItem } from '../types';
import { getCompiledItem } from '../itemUtils';

export interface BidRecord {
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: number;
  refunded?: boolean;
}

export type ListingType = 'fixed' | 'auction';

export interface MarketItem {
  id: string;
  sellerId: string;
  sellerName: string;
  itemData: PlayerItem;
  listingType?: ListingType; // 'fixed' (定価ショップ) or 'auction' (オークション)
  fixedPrice?: number;       // 定価販売時の価格
  startingBid: number;
  currentBid: number;
  buyoutPrice: number;
  highestBidderId: string | null;
  highestBidderName: string | null;
  expiresAt: number;
  status: 'active' | 'sold' | 'expired' | 'claimed' | 'canceled';
  sellerClaimed?: boolean;
  buyerClaimed?: boolean;
  bids?: BidRecord[];
  createdAt: string;
}

interface AuctionHouseProps {
  onClose: () => void;
  inventory: PlayerItem[];
  gold: number;
  creditScore: number;
  onRefreshGold: (amount: number) => void;
  onReceiveItem: (item: PlayerItem) => void;
  onRemoveItem: (uid: string) => void;
  onUpdateCreditScore: (delta: number) => void;
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

// Safely normalize a PlayerItem so missing or undefined fields don't cause crashes or Firestore errors
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
    case 'consumable': return '📜 スクロール';
    case 'material': return '📦 素材';
    default: return 'アイテム';
  }
};

export const AuctionHouse: React.FC<AuctionHouseProps> = ({
  onClose,
  inventory,
  gold,
  creditScore,
  onRefreshGold,
  onReceiveItem,
  onRemoveItem,
  onUpdateCreditScore,
}) => {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'buy' | 'sell' | 'my'>('buy');
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterListingType, setFilterListingType] = useState<'all' | 'fixed' | 'auction'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'expires_soon'>('newest');
  const [showHistory, setShowHistory] = useState(false);

  // Sell form state
  const [sellMode, setSellMode] = useState<ListingType>('fixed'); // default to fixed price shop
  const [selectedSellItem, setSelectedSellItem] = useState<PlayerItem | null>(null);
  const [fixedPriceInput, setFixedPriceInput] = useState<number>(500);
  const [startingBid, setStartingBid] = useState<number>(100);
  const [buyoutPrice, setBuyoutPrice] = useState<number>(1000);
  const [durationHours, setDurationHours] = useState<number>(48);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'market'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched: MarketItem[] = snapshot.docs.map(d => {
        const data = d.data() as any;
        const listingType: ListingType = data.listingType || (data.startingBid === data.buyoutPrice ? 'fixed' : 'auction');
        return {
          id: d.id,
          sellerId: data.sellerId || '',
          sellerName: data.sellerName || '名無し勇者',
          itemData: normalizePlayerItem(data.itemData),
          listingType,
          fixedPrice: Number(data.fixedPrice || data.buyoutPrice || data.startingBid) || 100,
          startingBid: Number(data.startingBid) || 10,
          currentBid: Number(data.currentBid) || 0,
          buyoutPrice: Number(data.buyoutPrice) || 100,
          highestBidderId: data.highestBidderId || null,
          highestBidderName: data.highestBidderName || null,
          expiresAt: Number(data.expiresAt) || 0,
          status: data.status || 'active',
          sellerClaimed: Boolean(data.sellerClaimed),
          buyerClaimed: Boolean(data.buyerClaimed),
          bids: Array.isArray(data.bids) ? data.bids : [],
          createdAt: data.createdAt || new Date().toISOString(),
        };
      });

      const now = Date.now();
      const updated = fetched.map(item => {
        if (item.status === 'active' && item.expiresAt > 0 && item.expiresAt < now) {
          const newStatus = item.highestBidderId ? 'sold' : 'expired';
          try {
            updateDoc(doc(db, 'market', item.id), { status: newStatus });
          } catch (err) {
            console.warn('Failed to update expired status:', err);
          }
          return { ...item, status: newStatus as MarketItem['status'] };
        }
        return item;
      });

      setItems(updated);
    } catch (e) {
      console.error('Fetch market items error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      fetchItems();
    } else {
      setLoading(false);
    }
  }, []);

  const handleSell = async () => {
    if (!auth.currentUser || !selectedSellItem) return;

    if (sellMode === 'fixed') {
      if (fixedPriceInput < 10) {
        alert('販売価格は10G以上に設定してください');
        return;
      }
    } else {
      if (startingBid < 10) {
        alert('最低入札価格は10G以上に設定してください');
        return;
      }
      if (buyoutPrice <= startingBid) {
        alert('即決価格は最低価格より高く設定してください');
        return;
      }
    }

    try {
      const marketId = generateUid();
      const expiresAt = Date.now() + durationHours * 60 * 60 * 1000;
      const normalizedItem = normalizePlayerItem(selectedSellItem);

      const newItem: MarketItem = {
        id: marketId,
        sellerId: auth.currentUser.uid,
        sellerName: auth.currentUser.displayName || '名無し勇者',
        itemData: normalizedItem,
        listingType: sellMode,
        fixedPrice: sellMode === 'fixed' ? fixedPriceInput : undefined,
        startingBid: sellMode === 'fixed' ? fixedPriceInput : startingBid,
        currentBid: 0,
        buyoutPrice: sellMode === 'fixed' ? fixedPriceInput : buyoutPrice,
        highestBidderId: null,
        highestBidderName: null,
        expiresAt,
        status: 'active',
        sellerClaimed: false,
        buyerClaimed: false,
        bids: [],
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'market', marketId), sanitizeForFirestore(newItem));
      onRemoveItem(selectedSellItem.uid);
      setSelectedSellItem(null);
      setTab('my');
      await fetchItems();
      alert(
        sellMode === 'fixed'
          ? `✨ 「定価 ${fixedPriceInput.toLocaleString()} G」でショップに出品しました！`
          : '✨ オークションに出品しました！'
      );
    } catch (e: any) {
      console.error('Listing error:', e);
      alert(`出品に失敗しました: ${e?.message || e}`);
    }
  };

  // Fixed price direct purchase or auction buyout/bidding
  const handlePurchase = async (item: MarketItem, bidAmount?: number) => {
    if (!auth.currentUser) {
      alert('購入するにはログインが必要です');
      return;
    }
    if (item.sellerId === auth.currentUser.uid) {
      alert('自分の出品したアイテムは購入できません');
      return;
    }

    const isFixed = item.listingType === 'fixed';
    const cost = isFixed ? (item.fixedPrice || item.buyoutPrice) : (bidAmount || item.buyoutPrice);

    if (gold < cost) {
      alert(`ゴールドが足りません！（必要: ${cost.toLocaleString()} G / 所持: ${gold.toLocaleString()} G）`);
      return;
    }

    try {
      const docRef = doc(db, 'market', item.id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        alert('この出品は既に終了または削除されました');
        fetchItems();
        return;
      }
      const currentData = snap.data() as MarketItem;

      if (currentData.status !== 'active') {
        alert('この商品は既に売り切れまたは終了しています');
        fetchItems();
        return;
      }

      if (isFixed || cost >= currentData.buyoutPrice) {
        // Direct purchase or Auction Buyout:
        // 1. Deduct gold
        onRefreshGold(-cost);

        // 2. Grant item to buyer immediately
        const normalizedItem = normalizePlayerItem(currentData.itemData);
        onReceiveItem(normalizedItem);

        // 3. Register any existing bidder for refund
        const updatedBids: BidRecord[] = Array.isArray(currentData.bids) ? [...currentData.bids] : [];
        if (currentData.highestBidderId && currentData.currentBid > 0 && currentData.highestBidderId !== auth.currentUser.uid) {
          updatedBids.push({
            bidderId: currentData.highestBidderId,
            bidderName: currentData.highestBidderName || '名無し勇者',
            amount: currentData.currentBid,
            timestamp: Date.now(),
            refunded: false,
          });
        }

        // 4. Update Firestore doc
        await updateDoc(docRef, {
          currentBid: cost,
          highestBidderId: auth.currentUser.uid,
          highestBidderName: auth.currentUser.displayName || '名無し勇者',
          status: 'sold',
          buyerClaimed: true,
          sellerClaimed: false,
          bids: updatedBids,
        });

        onUpdateCreditScore(5); // Reward for completing a direct purchase

        await fetchItems();
        const compiled = getSafeCompiledItem(normalizedItem);
        alert(`🎉 「${compiled.name}」を ${cost.toLocaleString()} G で購入しました！信用スコアがアップしました。\nアイテムをバッグに追加しました。`);
      } else {
        // Auction Bid
        if (cost <= currentData.currentBid || cost < currentData.startingBid) {
          alert('現在の価格より高い金額で入札してください');
          fetchItems();
          return;
        }

        onRefreshGold(-cost);

        const updatedBids: BidRecord[] = Array.isArray(currentData.bids) ? [...currentData.bids] : [];
        if (currentData.highestBidderId && currentData.currentBid > 0 && currentData.highestBidderId !== auth.currentUser.uid) {
          updatedBids.push({
            bidderId: currentData.highestBidderId,
            bidderName: currentData.highestBidderName || '名無し勇者',
            amount: currentData.currentBid,
            timestamp: Date.now(),
            refunded: false,
          });
        }

        await updateDoc(docRef, {
          currentBid: cost,
          highestBidderId: auth.currentUser.uid,
          highestBidderName: auth.currentUser.displayName || '名無し勇者',
          status: 'active',
          buyerClaimed: false,
          sellerClaimed: false,
          bids: updatedBids,
        });

        await fetchItems();
        alert(`💰 ${cost.toLocaleString()} G で入札しました！\nオークション終了時に落札された場合、「取引状況」から受け取れます。`);
      }
    } catch (e: any) {
      console.error('Purchase error:', e);
      alert(`購入/入札処理に失敗しました: ${e?.message || e}`);
    }
  };

  const handleCancelListing = async (item: MarketItem) => {
    if (item.sellerId !== auth.currentUser?.uid || item.status !== 'active') return;
    
    if (item.currentBid > 0 && item.listingType === 'auction') {
      if (!confirm('すでに入札が入っています。入札中の出品を取り消すと信用スコアが低下します。本当によろしいですか？')) {
        return;
      }
      onUpdateCreditScore(-20); // Penalty for canceling with bids
    } else {
      if (!confirm('出品を取り消しますか？アイテムはインベントリに戻ります。')) return;
    }

    try {
      await updateDoc(doc(db, 'market', item.id), {
        status: 'canceled',
        sellerClaimed: true,
      });
      onReceiveItem(normalizePlayerItem(item.itemData));
      await fetchItems();
      alert('出品を取り消し、アイテムを回収しました。');
    } catch (e: any) {
      console.error('Cancel listing error:', e);
      alert(`取り消しに失敗しました: ${e?.message || e}`);
    }
  };

  const handleClaim = async (item: MarketItem) => {
    if (!auth.currentUser) return;

    try {
      const myUid = auth.currentUser.uid;
      const isWinner = item.highestBidderId === myUid;
      const isSeller = item.sellerId === myUid;

      if (item.status === 'sold' && isWinner && !item.buyerClaimed) {
        const nextStatus = item.sellerClaimed ? 'claimed' : 'sold';
        await updateDoc(doc(db, 'market', item.id), {
          buyerClaimed: true,
          status: nextStatus,
        });
        const normalized = normalizePlayerItem(item.itemData);
        onReceiveItem(normalized);
        const compiled = getSafeCompiledItem(normalized);
        onUpdateCreditScore(5); // Reward for completing a purchase
        await fetchItems();
        alert(`🎁 落札アイテム「${compiled.name}」を受け取りました！信用スコアがアップしました。`);
        return;
      }

      if (item.status === 'sold' && isSeller && !item.sellerClaimed) {
        const nextStatus = item.buyerClaimed ? 'claimed' : 'sold';
        await updateDoc(doc(db, 'market', item.id), {
          sellerClaimed: true,
          status: nextStatus,
        });
        onRefreshGold(item.currentBid);
        onUpdateCreditScore(5); // Reward for completing a sale
        await fetchItems();
        alert(`🪙 出品売上金 ${item.currentBid.toLocaleString()} G を受け取りました！信用スコアがアップしました。`);
        return;
      }

      if (item.status === 'expired' && isSeller && !item.sellerClaimed) {
        await updateDoc(doc(db, 'market', item.id), {
          sellerClaimed: true,
          status: 'claimed',
        });
        const normalized = normalizePlayerItem(item.itemData);
        onReceiveItem(normalized);
        await fetchItems();
        alert('📦 期限切れの出品アイテムを回収しました。');
        return;
      }

      const myUnrefundedBids = (item.bids || []).filter(b => b.bidderId === myUid && !b.refunded);
      if (myUnrefundedBids.length > 0) {
        const totalRefund = myUnrefundedBids.reduce((sum, b) => sum + b.amount, 0);
        const updatedBids = (item.bids || []).map(b => (b.bidderId === myUid ? { ...b, refunded: true } : b));
        await updateDoc(doc(db, 'market', item.id), {
          bids: updatedBids,
        });
        onRefreshGold(totalRefund);
        await fetchItems();
        alert(`🪙 入札超過の返金 ${totalRefund.toLocaleString()} G を受け取りました！`);
        return;
      }
    } catch (e: any) {
      console.error('Claim error:', e);
      alert(`受取処理に失敗しました: ${e?.message || e}`);
    }
  };

  const formatTimeLeft = (expiresAt: number) => {
    if (!expiresAt) return '終了';
    const diff = expiresAt - Date.now();
    if (diff <= 0) return '終了';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}時間${m}分`;
  };

  const myUid = auth.currentUser?.uid || '';

  // Filter and search items in Buy Tab
  const filteredBuyItems = useMemo(() => {
    return items
      .filter(i => {
        if (i.status !== 'active' || i.sellerId === myUid) return false;

        // Listing type filter
        if (filterListingType === 'fixed' && i.listingType === 'auction') return false;
        if (filterListingType === 'auction' && i.listingType === 'fixed') return false;

        // Category filter
        if (filterType !== 'all') {
          const base = ITEMS[i.itemData.baseId];
          if (base?.type !== filterType) return false;
        }

        // Search query filter (matches Item Name, Base Name, Seller Name, Engraving)
        if (searchQuery.trim()) {
          const queryLower = searchQuery.trim().toLowerCase();
          const compiled = getSafeCompiledItem(i.itemData);
          const base = ITEMS[i.itemData.baseId];
          const sellerNameMatch = i.sellerName.toLowerCase().includes(queryLower);
          const itemNameMatch = compiled.name.toLowerCase().includes(queryLower);
          const baseNameMatch = base?.name.toLowerCase().includes(queryLower) || false;
          const engravingMatch = i.itemData.engraving?.toLowerCase().includes(queryLower) || false;

          if (!sellerNameMatch && !itemNameMatch && !baseNameMatch && !engravingMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const getPrice = (item: MarketItem) =>
          item.listingType === 'fixed'
            ? (item.fixedPrice || item.buyoutPrice)
            : Math.max(item.currentBid, item.startingBid);

        if (sortBy === 'price_asc') return getPrice(a) - getPrice(b);
        if (sortBy === 'price_desc') return getPrice(b) - getPrice(a);
        if (sortBy === 'expires_soon') return a.expiresAt - b.expiresAt;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [items, myUid, filterListingType, filterType, searchQuery, sortBy]);

  // Categorize items for "My Transactions"
  const pendingActions = items.filter(i => {
    if (i.sellerId === myUid && i.status === 'sold' && !i.sellerClaimed) return true;
    if (i.highestBidderId === myUid && i.status === 'sold' && !i.buyerClaimed) return true;
    if (i.sellerId === myUid && i.status === 'expired' && !i.sellerClaimed) return true;
    if ((i.bids || []).some(b => b.bidderId === myUid && !b.refunded)) return true;
    return false;
  });

  const activeTransactions = items.filter(i => {
    if (i.status !== 'active') return false;
    return i.sellerId === myUid || i.highestBidderId === myUid;
  });

  const completedHistory = items.filter(i => {
    if (i.sellerId === myUid && (i.sellerClaimed || i.status === 'claimed' || i.status === 'canceled')) return true;
    if (i.highestBidderId === myUid && (i.buyerClaimed || i.status === 'claimed')) return true;
    return false;
  });

  if (!auth.currentUser) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="pixel-panel max-w-md w-full bg-slate-900 border-2 border-amber-600 p-6 text-center space-y-4 shadow-[0_0_30px_rgba(217,119,6,0.35)]">
          <div className="text-4xl mb-1">⚖️ 🔒</div>
          <h2 className="text-lg font-bold text-amber-400">Googleログインが必要です</h2>
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded border border-slate-800 text-left">
            グローバル市場・取引所（オークション・定価ショップ）での武具の出品・入札・即決購入・売上ゴールド受取を利用するには、Googleアカウントでのログインが必要です。
          </p>
          <div className="space-y-2 pt-2">
            <button
              onClick={async () => {
                try {
                  await signInWithGoogle();
                } catch (e) {
                  console.error(e);
                }
              }}
              className="pixel-btn w-full py-2.5 text-xs flex items-center justify-center gap-2 active !bg-amber-600 hover:!bg-amber-500 !text-slate-950 font-bold !border-amber-400 shadow-md"
            >
              <span>🌐</span> Googleアカウントでログイン
            </button>
            <button onClick={onClose} className="pixel-btn w-full py-2 text-xs !bg-slate-800 text-slate-400">
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="pixel-panel max-w-4xl w-full bg-slate-900 border-2 border-amber-600 p-3 sm:p-5 relative text-slate-100 shadow-[0_0_30px_rgba(217,119,6,0.35)] h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏪</span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-amber-400 leading-tight">
                グローバル市場 (ショップ & オークション)
              </h2>
              <p className="text-[10px] text-slate-400 hidden sm:block">プレイヤー間の定価売買＆オークション取引</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-sky-300 font-bold text-[10px] sm:text-xs bg-slate-950 px-2 py-0.5 rounded border border-sky-800/60 hidden sm:inline-block">
              信用スコア: <span className={creditScore >= 120 ? 'text-emerald-400 font-black' : creditScore < 80 ? 'text-rose-400 font-black' : 'text-sky-300'}>{creditScore}</span>
            </span>
            <span className="text-amber-300 font-bold text-xs sm:text-sm bg-slate-950 px-2.5 py-1 rounded border border-amber-500/40">
              所持: 🪙 {gold.toLocaleString()} G
            </span>
            <button
              onClick={fetchItems}
              title="取引情報を最新に更新"
              className="pixel-btn text-xs !bg-slate-800 hover:!bg-slate-700 !py-1 !px-2.5 text-slate-200"
            >
              🔄 更新
            </button>
            <button onClick={onClose} className="pixel-btn text-xs !bg-slate-800 !py-1 !px-3">閉じる</button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-3 flex-shrink-0">
          <button
            onClick={() => setTab('buy')}
            className={`pixel-btn flex-1 text-xs sm:text-sm py-2 font-bold transition-all ${
              tab === 'buy' ? '!bg-amber-600 !border-amber-400 text-white shadow-md' : '!bg-slate-800/80 !text-slate-400'
            }`}
          >
            🛒 買う (ショップ＆オークション)
          </button>
          <button
            onClick={() => setTab('sell')}
            className={`pixel-btn flex-1 text-xs sm:text-sm py-2 font-bold transition-all ${
              tab === 'sell' ? '!bg-amber-600 !border-amber-400 text-white shadow-md' : '!bg-slate-800/80 !text-slate-400'
            }`}
          >
            💰 売る (出品)
          </button>
          <button
            onClick={() => setTab('my')}
            className={`pixel-btn flex-1 text-xs sm:text-sm py-2 font-bold relative transition-all ${
              tab === 'my' ? '!bg-amber-600 !border-amber-400 text-white shadow-md' : '!bg-slate-800/80 !text-slate-400'
            }`}
          >
            👤 取引状況
            {pendingActions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-rose-600 text-white font-bold rounded-full animate-bounce">
                {pendingActions.length}
              </span>
            )}
          </button>
        </div>

        {/* Search & Filter Controls (Buy tab only) */}
        {tab === 'buy' && (
          <div className="flex flex-col gap-2 mb-3 bg-slate-950/70 p-2.5 rounded border border-slate-800 flex-shrink-0">
            {/* Search Input Bar */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="アイテム名、ベース名、出品者名、刻印名で検索..."
                  className="pixel-input text-xs w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded focus:border-amber-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="pixel-input text-xs bg-slate-900 border border-slate-700 text-slate-200 py-1.5 px-2 rounded max-w-[140px]"
              >
                <option value="newest">🕒 新着順</option>
                <option value="price_asc">🪙 価格が安い順</option>
                <option value="price_desc">💎 価格が高い順</option>
                <option value="expires_soon">⏳ 残り時間短い順</option>
              </select>
            </div>

            {/* Mode & Category Filter Chips */}
            <div className="flex flex-wrap gap-1 items-center justify-between">
              {/* Type mode filter */}
              <div className="flex gap-1">
                <button
                  onClick={() => setFilterListingType('all')}
                  className={`text-[10px] sm:text-xs py-1 px-2 rounded font-bold transition-all border ${
                    filterListingType === 'all'
                      ? 'bg-amber-600 text-white border-amber-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  すべて
                </button>
                <button
                  onClick={() => setFilterListingType('fixed')}
                  className={`text-[10px] sm:text-xs py-1 px-2 rounded font-bold transition-all border ${
                    filterListingType === 'fixed'
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  🏷️ 定価ショップ
                </button>
                <button
                  onClick={() => setFilterListingType('auction')}
                  className={`text-[10px] sm:text-xs py-1 px-2 rounded font-bold transition-all border ${
                    filterListingType === 'auction'
                      ? 'bg-purple-600 text-white border-purple-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  ⚖️ オークション
                </button>
              </div>

              {/* Item category chips */}
              <div className="flex gap-1 overflow-x-auto pb-0.5 max-w-full">
                {[
                  { id: 'all', label: '全種別' },
                  { id: 'weapon', label: '⚔️ 武器' },
                  { id: 'armor', label: '🛡️ 防具' },
                  { id: 'chest', label: '🧰 宝箱' },
                  { id: 'gem', label: '💎 宝石' },
                  { id: 'consumable', label: '📜 スクロール' },
                  { id: 'material', label: '📦 素材' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id)}
                    className={`text-[10px] py-0.5 px-2 rounded whitespace-nowrap transition-all border ${
                      filterType === f.id
                        ? 'bg-amber-700/80 text-amber-200 border-amber-500 font-bold'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-12 text-amber-500 animate-pulse font-bold">市場データを読み込み中...</div>
          ) : tab === 'sell' ? (
            /* =================== Tab: Sell (出品) =================== */
            <div className="space-y-4">
              {/* Selling method selection */}
              <div className="bg-slate-950 p-3.5 border border-slate-800 rounded">
                <label className="text-xs font-bold text-slate-300 block mb-2">① 販売方式の選択</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSellMode('fixed')}
                    className={`p-2.5 rounded border text-left flex flex-col transition-all ${
                      sellMode === 'fixed'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center gap-1 text-emerald-400">
                      🏷️ 定価販売 (ショップ・バザー)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      設定した販売価格で誰でも即座に購入可能。売却が成立しやすいおすすめ方式。
                    </span>
                  </button>

                  <button
                    onClick={() => setSellMode('auction')}
                    className={`p-2.5 rounded border text-left flex flex-col transition-all ${
                      sellMode === 'auction'
                        ? 'bg-purple-950/60 border-purple-500 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center gap-1 text-purple-400">
                      ⚖️ オークション形式 (入札＆即決)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      最低入札価格と即決価格を設定。入札で価格が吊り上がる競り方式。
                    </span>
                  </button>
                </div>
              </div>

              {/* Item selection */}
              <div className="bg-slate-950 p-3.5 border border-slate-800 rounded">
                <h3 className="text-xs font-bold text-slate-300 mb-1">② 出品するアイテムを選択</h3>
                <p className="text-[10px] text-slate-400 mb-2">武具・宝箱・宝石・スクロール・素材を出品できます。</p>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 bg-slate-900/50 rounded border border-slate-800">
                  {inventory.filter(i => !i.isLocked).map(pItem => {
                    const compiled = getSafeCompiledItem(pItem);
                    const isSelected = selectedSellItem?.uid === pItem.uid;
                    return (
                      <div
                        key={pItem.uid}
                        onClick={() => setSelectedSellItem(pItem)}
                        className={`relative cursor-pointer p-1.5 border-2 rounded transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'border-amber-400 bg-amber-950/70 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                            : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                        }`}
                        title={compiled.name}
                      >
                        <ItemIcon item={compiled} size={30} />
                        <span className="text-[11px] font-bold text-slate-200 max-w-[110px] truncate">
                          {compiled.name}
                        </span>
                        {pItem.upgradeLevel > 0 && (
                          <span className="absolute -top-1 -right-1 text-[9px] bg-sky-600 text-white font-bold px-1 rounded shadow">
                            +{pItem.upgradeLevel}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {inventory.filter(i => !i.isLocked).length === 0 && (
                    <div className="text-xs text-slate-400 py-4 w-full text-center">
                      出品可能なアイテムがありません（ロック中のアイテムは出品できません）
                    </div>
                  )}
                </div>
              </div>

              {/* Price & Duration setup */}
              {selectedSellItem && (() => {
                const compiled = getSafeCompiledItem(selectedSellItem);
                const base = ITEMS[selectedSellItem.baseId];
                return (
                  <div className="bg-slate-950 p-4 border border-amber-700/80 space-y-3.5 rounded shadow-lg">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
                      <ItemIcon item={compiled} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-100 truncate">{compiled.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {getItemTypeLabel(compiled.type)}
                          {compiled.type === 'weapon' && ` | 攻撃力: +${compiled.power}`}
                          {compiled.type === 'armor' && ` | 防御力: +${compiled.power}`}
                          {base?.effect && ` | 効果: ${base.effect.description}`}
                          {compiled.price > 0 && ` | 定価基準: 🪙 ${compiled.price} G`}
                        </div>
                      </div>
                    </div>

                    {sellMode === 'fixed' ? (
                      <div>
                        <label className="text-xs text-emerald-400 font-bold block mb-1">
                          🏷️ 販売定価 (G)
                        </label>
                        <input
                          type="number"
                          value={fixedPriceInput}
                          min={10}
                          onChange={(e) => setFixedPriceInput(Math.max(10, parseInt(e.target.value) || 0))}
                          className="pixel-input w-full p-2.5 bg-slate-900 border border-emerald-600/60 text-emerald-300 font-bold text-sm"
                          placeholder="販売価格を入力..."
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          購入希望者はこの価格で1クリック即時購入できます。
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-300 block mb-1">最低入札開始価格 (G)</label>
                          <input
                            type="number"
                            value={startingBid}
                            min={10}
                            onChange={(e) => setStartingBid(Math.max(10, parseInt(e.target.value) || 0))}
                            className="pixel-input w-full p-2 bg-slate-900 border border-slate-700 text-amber-300 font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-300 block mb-1">即決価格 (バイアウト G)</label>
                          <input
                            type="number"
                            value={buyoutPrice}
                            min={startingBid + 1}
                            onChange={(e) => setBuyoutPrice(Math.max(10, parseInt(e.target.value) || 0))}
                            className="pixel-input w-full p-2 bg-slate-900 border border-slate-700 text-amber-300 font-bold"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-slate-300 block mb-1">出品期間</label>
                      <select
                        value={durationHours}
                        onChange={(e) => setDurationHours(parseInt(e.target.value) || 48)}
                        className="pixel-input w-full p-2 bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                      >
                        <option value={12}>12時間</option>
                        <option value={24}>24時間</option>
                        <option value={48}>48時間 (推奨)</option>
                        <option value={72}>72時間 (3日間)</option>
                      </select>
                    </div>

                    <button
                      onClick={handleSell}
                      className={`pixel-btn active w-full py-3 font-bold text-sm shadow-md transition-all ${
                        sellMode === 'fixed'
                          ? '!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-400 text-white'
                          : '!bg-purple-600 hover:!bg-purple-500 !border-purple-400 text-white'
                      }`}
                    >
                      {sellMode === 'fixed' ? '🏷️ 定価で出品する' : '⚖️ オークションに出品する'}
                    </button>
                  </div>
                );
              })()}
            </div>
          ) : tab === 'buy' ? (
            /* =================== Tab: Buy (一覧 & 検索) =================== */
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400 flex justify-between items-center mb-1">
                <span>検索結果: {filteredBuyItems.length}件</span>
                {searchQuery && (
                  <span className="text-amber-300 font-semibold">
                    「{searchQuery}」で絞り込み中
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredBuyItems.map(item => {
                  const compiled = getSafeCompiledItem(item.itemData);
                  const isFixed = item.listingType === 'fixed';
                  const base = ITEMS[item.itemData.baseId];
                  const currentPrice = isFixed
                    ? (item.fixedPrice || item.buyoutPrice)
                    : Math.max(item.currentBid, item.startingBid);

                  return (
                    <div
                      key={item.id}
                      className={`bg-slate-950 border p-3 flex flex-col gap-2 rounded transition-all ${
                        isFixed
                          ? 'border-emerald-900/60 hover:border-emerald-500'
                          : 'border-purple-900/60 hover:border-purple-500'
                      }`}
                    >
                      {/* Top Header: Badge & Expiry */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-1.5">
                          {isFixed ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 rounded">
                              🏷️ 定価ショップ
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-700 rounded">
                              ⚖️ オークション
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {getItemTypeLabel(compiled.type)}
                          </span>
                        </div>
                        <span className="text-[10px] text-rose-400 font-bold whitespace-nowrap">
                          ⏳ {formatTimeLeft(item.expiresAt)}
                        </span>
                      </div>

                      {/* Item info */}
                      <div className="flex items-start gap-3">
                        <ItemIcon item={compiled} size={38} />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                            {compiled.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                            {compiled.type === 'weapon' && `攻+${compiled.power} `}
                            {compiled.type === 'armor' && `防+${compiled.power} `}
                            {base?.effect?.description}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            <span className="text-slate-500">👤 {item.sellerName}</span>
                            {item.itemData.engraving && (
                              <span className="text-indigo-300 font-semibold">🛡️ {item.itemData.engraving}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Area */}
                      <div className="mt-auto pt-2 border-t border-slate-800">
                        {isFixed ? (
                          /* Fixed Price Direct Purchase Button */
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-[10px] text-slate-400">販売定価</div>
                              <div className="font-bold text-emerald-400 text-sm sm:text-base">
                                🪙 {currentPrice.toLocaleString()} G
                              </div>
                            </div>
                            <button
                              onClick={() => handlePurchase(item)}
                              className="pixel-btn text-xs !py-2 !px-4 !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-400 text-white font-bold shadow active:scale-95 transition-all"
                            >
                              🛒 購入する
                            </button>
                          </div>
                        ) : (
                          /* Auction Bidding or Buyout */
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-[10px] text-slate-400">
                                現在額 (最低: {item.startingBid.toLocaleString()}G)
                              </div>
                              <div className="font-bold text-amber-400 text-xs sm:text-sm">
                                🪙 {currentPrice.toLocaleString()} G
                              </div>
                              <button
                                onClick={() => handlePurchase(item, Math.max(item.currentBid + 10, item.startingBid))}
                                className="pixel-btn text-[10px] w-full mt-1 !py-1 !bg-slate-800 hover:!bg-slate-700"
                              >
                                入札 (+10G)
                              </button>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400">即決価格</div>
                              <div className="font-bold text-purple-300 text-xs sm:text-sm">
                                🪙 {item.buyoutPrice.toLocaleString()} G
                              </div>
                              <button
                                onClick={() => handlePurchase(item, item.buyoutPrice)}
                                className="pixel-btn text-[10px] w-full mt-1 !py-1 !bg-purple-600 hover:!bg-purple-500 font-bold text-white"
                              >
                                即決購入
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredBuyItems.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs bg-slate-950/60 rounded border border-slate-800">
                  {searchQuery ? (
                    <div>
                      「<span className="text-amber-300">{searchQuery}</span>」に一致する出品は見つかりませんでした。
                      <button
                        onClick={() => setSearchQuery('')}
                        className="block mx-auto mt-2 text-sky-400 hover:underline text-xs"
                      >
                        検索条件をクリア
                      </button>
                    </div>
                  ) : (
                    '現在出品されているアイテムはありません'
                  )}
                </div>
              )}
            </div>
          ) : (
            /* =================== Tab: My Transactions (取引状況) =================== */
            <div className="space-y-4">
              {/* Section 1: Pending Claims */}
              {pendingActions.length > 0 && (
                <div className="bg-amber-950/40 border-2 border-amber-500 p-3 rounded space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <span>🔔</span>
                    <span>受取待ちの報酬・アイテム ({pendingActions.length}件)</span>
                  </div>
                  <div className="space-y-2">
                    {pendingActions.map(item => {
                      const isSeller = item.sellerId === myUid;
                      const isWinner = item.highestBidderId === myUid && item.status === 'sold' && !item.buyerClaimed;
                      const isSellerSold = isSeller && item.status === 'sold' && !item.sellerClaimed;
                      const isSellerExpired = isSeller && item.status === 'expired' && !item.sellerClaimed;
                      const myUnrefundedBids = (item.bids || []).filter(b => b.bidderId === myUid && !b.refunded);
                      const refundTotal = myUnrefundedBids.reduce((sum, b) => sum + b.amount, 0);

                      const compiled = getSafeCompiledItem(item.itemData);

                      return (
                        <div
                          key={item.id}
                          className="bg-slate-950 border border-amber-600/60 p-2.5 flex justify-between items-center gap-3 rounded"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <ItemIcon item={compiled} size={36} />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                                {compiled.name}
                              </div>
                              <div className="text-[10px] text-amber-300 font-bold mt-0.5">
                                {isSellerSold && `🎉 出品商品が売却されました！ 売上金: 🪙 ${item.currentBid.toLocaleString()} G`}
                                {isWinner && `🎉 落札しました！ (落札額: 🪙 ${item.currentBid.toLocaleString()} G)`}
                                {isSellerExpired && `📦 期限切れ（未売却） アイテムを回収できます`}
                                {refundTotal > 0 && !isWinner && !isSeller && `💸 他プレイヤーに高値更新されました 返金: 🪙 ${refundTotal.toLocaleString()} G`}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleClaim(item)}
                            className="pixel-btn text-xs !py-2 !px-3.5 !bg-emerald-600 hover:!bg-emerald-500 active font-bold text-white shadow-lg flex-shrink-0"
                          >
                            {isSellerSold
                              ? `🪙 売上金受取 (${item.currentBid.toLocaleString()} G)`
                              : isWinner
                              ? '🎁 アイテム受取'
                              : isSellerExpired
                              ? '📦 アイテム回収'
                              : `🪙 返金受取 (${refundTotal.toLocaleString()} G)`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 2: Active Transactions */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>🏷️ 出品中・入札中の取引 ({activeTransactions.length}件)</span>
                </div>
                {activeTransactions.map(item => {
                  const isSeller = item.sellerId === myUid;
                  const isHighestBidder = item.highestBidderId === myUid;
                  const compiled = getSafeCompiledItem(item.itemData);
                  const isFixed = item.listingType === 'fixed';

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-950 border border-slate-700 p-3 flex justify-between items-center gap-3 rounded"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ItemIcon item={compiled} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                            {compiled.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {isSeller ? (
                              <span>🏷️ あなたの出品 ({isFixed ? '定価販売' : 'オークション'})</span>
                            ) : (
                              <span>💰 最高額で入札中</span>
                            )}
                            {' · '}
                            現在価格: {(isFixed ? (item.fixedPrice || item.buyoutPrice) : (item.currentBid || item.startingBid)).toLocaleString()} G
                          </div>
                          <div className="text-[10px] text-sky-400 font-bold mt-0.5">
                            出品中 (残り時間: {formatTimeLeft(item.expiresAt)})
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isSeller && (item.currentBid === 0 || isFixed) && (
                          <button
                            onClick={() => handleCancelListing(item)}
                            className="pixel-btn text-[10px] !py-1 !px-2.5 !bg-rose-900 !border-rose-700 hover:!bg-rose-800"
                          >
                            出品取消
                          </button>
                        )}
                        {isSeller && item.currentBid > 0 && !isFixed && (
                          <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-1 rounded border border-amber-800">
                            入札あり ({item.currentBid.toLocaleString()} G)
                          </span>
                        )}
                        {isHighestBidder && (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800">
                            最高額入札中
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {activeTransactions.length === 0 && pendingActions.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs bg-slate-950/50 rounded border border-slate-800">
                    現在取引中または受取待ちのアイテムはありません
                  </div>
                )}
              </div>

              {/* Section 3: Completed History (Toggleable) */}
              {completedHistory.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-semibold"
                  >
                    <span>{showHistory ? '▼' : '▶'}</span>
                    <span>完了した取引履歴 ({completedHistory.length}件)</span>
                  </button>
                  {showHistory && (
                    <div className="space-y-2 mt-2">
                      {completedHistory.slice(0, 15).map(item => {
                        const isSeller = item.sellerId === myUid;
                        const compiled = getSafeCompiledItem(item.itemData);
                        return (
                          <div
                            key={item.id}
                            className="bg-slate-950/60 border border-slate-800/80 p-2 flex justify-between items-center gap-2 rounded opacity-75"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <ItemIcon item={compiled} size={28} />
                              <div className="min-w-0 flex-1 text-[11px]">
                                <div className="text-slate-300 truncate">{compiled.name}</div>
                                <div className="text-[9px] text-slate-500">
                                  {isSeller ? `🏷️ 出品売却完了 (${item.currentBid.toLocaleString()} G)` : `🎉 落札完了 (${item.currentBid.toLocaleString()} G)`} · {new Date(item.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold">取引完了</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
