import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { generateUid } from '../gameData';
import { ItemIcon } from './Inventory';
import { ITEMS } from '../gameData';
import { PlayerItem, GameItem } from '../types';
import { getCompiledItem } from '../itemUtils';

export interface MarketItem {
  id: string;
  sellerId: string;
  sellerName: string;
  itemData: PlayerItem;
  startingBid: number;
  currentBid: number;
  buyoutPrice: number;
  highestBidderId: string | null;
  highestBidderName: string | null;
  expiresAt: number;
  status: 'active' | 'sold' | 'expired' | 'claimed' | 'canceled';
  createdAt: string;
}

interface AuctionHouseProps {
  onClose: () => void;
  inventory: PlayerItem[];
  gold: number;
  onRefreshGold: (amount: number) => void;
  onReceiveItem: (item: PlayerItem) => void;
  onRemoveItem: (uid: string) => void;
}

// Safely normalize a PlayerItem so missing fields don't cause crashes
const normalizePlayerItem = (rawItem: any): PlayerItem => {
  if (!rawItem) {
    return {
      uid: generateUid(),
      baseId: 'w_wood_sword',
      upgradeLevel: 0,
      addedPower: 0,
    };
  }
  return {
    ...rawItem,
    uid: rawItem.uid || generateUid(),
    baseId: rawItem.baseId || rawItem.itemId || 'w_wood_sword',
    upgradeLevel: rawItem.upgradeLevel || rawItem.plus || 0,
    addedPower: rawItem.addedPower || 0,
  };
};

const getSafeCompiledItem = (pItem: PlayerItem): GameItem => {
  const normalized = normalizePlayerItem(pItem);
  const compiled = getCompiledItem(normalized);
  if (compiled) return compiled;

  const base = ITEMS[normalized.baseId];
  if (base) {
    return {
      ...base,
      id: normalized.uid,
      name: base.name,
      power: base.power + (normalized.addedPower || 0),
    };
  }

  return {
    id: normalized.uid,
    name: '未知のアイテム',
    type: 'weapon',
    power: 1,
    price: 10,
    color: '#94a3b8',
  };
};

export const AuctionHouse: React.FC<AuctionHouseProps> = ({
  onClose,
  inventory,
  gold,
  onRefreshGold,
  onReceiveItem,
  onRemoveItem,
}) => {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'buy' | 'sell' | 'my'>('buy');

  // Sell state
  const [selectedSellItem, setSelectedSellItem] = useState<PlayerItem | null>(null);
  const [startingBid, setStartingBid] = useState<number>(100);
  const [buyoutPrice, setBuyoutPrice] = useState<number>(1000);
  const [durationHours, setDurationHours] = useState<number>(24);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'market'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched: MarketItem[] = snapshot.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          sellerId: data.sellerId || '',
          sellerName: data.sellerName || '名無し勇者',
          itemData: normalizePlayerItem(data.itemData),
          startingBid: Number(data.startingBid) || 10,
          currentBid: Number(data.currentBid) || 0,
          buyoutPrice: Number(data.buyoutPrice) || 100,
          highestBidderId: data.highestBidderId || null,
          highestBidderName: data.highestBidderName || null,
          expiresAt: Number(data.expiresAt) || 0,
          status: data.status || 'active',
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
    fetchItems();
  }, []);

  const handleSell = async () => {
    if (!auth.currentUser || !selectedSellItem) return;
    if (startingBid < 10) {
      alert('最低価格は10G以上に設定してください');
      return;
    }
    if (buyoutPrice <= startingBid) {
      alert('即決価格は最低価格より高く設定してください');
      return;
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
        startingBid: startingBid,
        currentBid: 0,
        buyoutPrice,
        highestBidderId: null,
        highestBidderName: null,
        expiresAt,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'market', marketId), newItem);
      onRemoveItem(selectedSellItem.uid);
      setSelectedSellItem(null);
      setTab('buy');
      await fetchItems();
      alert('✨ 取引所に出品しました！');
    } catch (e: any) {
      console.error('Listing error:', e);
      alert(`出品に失敗しました: ${e?.message || e}`);
    }
  };

  const handleBid = async (item: MarketItem, bidAmount: number) => {
    if (!auth.currentUser) {
      alert('入札するにはログインが必要です');
      return;
    }
    if (gold < bidAmount) {
      alert('ゴールドが足りません！');
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
        alert('このオークションは既に終了しています');
        fetchItems();
        return;
      }

      if (bidAmount <= currentData.currentBid || bidAmount < currentData.startingBid) {
        alert('現在の価格より高い金額で入札してください');
        fetchItems();
        return;
      }

      onRefreshGold(-bidAmount);

      const isBuyout = bidAmount >= currentData.buyoutPrice;
      const newStatus = isBuyout ? 'sold' : 'active';

      await updateDoc(docRef, {
        currentBid: isBuyout ? currentData.buyoutPrice : bidAmount,
        highestBidderId: auth.currentUser.uid,
        highestBidderName: auth.currentUser.displayName || '名無し勇者',
        status: newStatus,
      });

      await fetchItems();
      if (isBuyout) {
        alert('🎉 即決価格で購入しました！「取引状況」タブからアイテムを受け取ってください。');
      } else {
        alert(`💰 ${bidAmount} G で入札しました！`);
      }
    } catch (e: any) {
      console.error('Bid error:', e);
      alert(`入札に失敗しました: ${e?.message || e}`);
    }
  };

  const handleCancelListing = async (item: MarketItem) => {
    if (item.sellerId !== auth.currentUser?.uid || item.status !== 'active') return;
    if (item.currentBid > 0) {
      alert('すでに入札が入っているため出品を取り消せません');
      return;
    }

    if (confirm('出品を取り消しますか？アイテムはインベントリに戻ります。')) {
      try {
        await updateDoc(doc(db, 'market', item.id), { status: 'canceled' });
        onReceiveItem(normalizePlayerItem(item.itemData));
        await fetchItems();
        alert('出品を取り消し、アイテムを回収しました。');
      } catch (e: any) {
        console.error('Cancel listing error:', e);
        alert(`取り消しに失敗しました: ${e?.message || e}`);
      }
    }
  };

  const handleClaim = async (item: MarketItem) => {
    if (!auth.currentUser) return;

    try {
      const isWinner = item.highestBidderId === auth.currentUser.uid;
      const isSeller = item.sellerId === auth.currentUser.uid;

      if (item.status === 'sold' && isWinner) {
        // I won the auction
        await updateDoc(doc(db, 'market', item.id), { status: 'claimed' });
        onReceiveItem(normalizePlayerItem(item.itemData));
        alert('🎁 落札したアイテムを受け取りました！');
      } else if (item.status === 'sold' && isSeller) {
        // My item sold
        await updateDoc(doc(db, 'market', item.id), { status: 'claimed' });
        onRefreshGold(item.currentBid);
        alert(`🪙 売上金 ${item.currentBid.toLocaleString()} G を受け取りました！`);
      } else if (item.status === 'expired' && isSeller) {
        // Expired without sale -> return item to seller
        await updateDoc(doc(db, 'market', item.id), { status: 'claimed' });
        onReceiveItem(normalizePlayerItem(item.itemData));
        alert('期限切れのアイテムを回収しました。');
      } else if (item.status === 'canceled' && isSeller) {
        await updateDoc(doc(db, 'market', item.id), { status: 'claimed' });
      }
      await fetchItems();
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="pixel-panel max-w-4xl w-full bg-slate-900 border-2 border-amber-600 p-3 sm:p-5 relative text-slate-100 shadow-[0_0_25px_rgba(217,119,6,0.3)] h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
          <h2 className="text-base sm:text-lg font-bold text-amber-500 flex items-center gap-2">
            <span>⚖️</span> グローバル取引所 (オークション)
          </h2>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-amber-300 font-bold text-xs sm:text-sm">所持: {gold.toLocaleString()} G</span>
            <button onClick={onClose} className="pixel-btn text-xs !bg-slate-800 !py-1 !px-2.5">閉じる</button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-shrink-0">
          <button
            onClick={() => setTab('buy')}
            className={`pixel-btn flex-1 text-xs sm:text-sm py-2 ${tab === 'buy' ? '!bg-amber-700 !border-amber-500' : '!bg-slate-800 !text-slate-400'}`}
          >
            🛒 買う (一覧)
          </button>
          <button
            onClick={() => setTab('sell')}
            className={`pixel-btn flex-1 text-xs sm:text-sm py-2 ${tab === 'sell' ? '!bg-amber-700 !border-amber-500' : '!bg-slate-800 !text-slate-400'}`}
          >
            💰 売る (出品)
          </button>
          <button
            onClick={() => setTab('my')}
            className={`pixel-btn flex-1 text-xs sm:text-sm py-2 ${tab === 'my' ? '!bg-amber-700 !border-amber-500' : '!bg-slate-800 !text-slate-400'}`}
          >
            👤 取引状況
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-10 text-amber-500 animate-pulse font-bold">取引情報を読み込み中...</div>
          ) : tab === 'sell' ? (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 border border-slate-700 rounded">
                <h3 className="text-sm font-bold text-amber-400 mb-3">出品するアイテムを選択</h3>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                  {inventory.filter(i => !i.isLocked).map(pItem => {
                    const compiled = getSafeCompiledItem(pItem);
                    const isSelected = selectedSellItem?.uid === pItem.uid;
                    return (
                      <div
                        key={pItem.uid}
                        onClick={() => setSelectedSellItem(pItem)}
                        className={`relative cursor-pointer p-1.5 border-2 rounded transition-all ${
                          isSelected
                            ? 'border-amber-400 bg-amber-950/60 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                            : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                        }`}
                        title={compiled.name}
                      >
                        <ItemIcon item={compiled} />
                        {pItem.upgradeLevel > 0 && (
                          <span className="absolute -top-1 -right-1 text-[9px] bg-sky-600 text-white font-bold px-1 rounded">
                            +{pItem.upgradeLevel}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {inventory.filter(i => !i.isLocked).length === 0 && (
                    <div className="text-xs text-slate-400 py-4">
                      出品可能なアイテムがありません（ロック中のアイテムや装備中は出品できません）
                    </div>
                  )}
                </div>
              </div>

              {selectedSellItem && (() => {
                const compiled = getSafeCompiledItem(selectedSellItem);
                return (
                  <div className="bg-slate-950 p-4 border border-amber-800 space-y-4 rounded">
                    <div className="flex items-center gap-3">
                      <ItemIcon item={compiled} />
                      <div>
                        <div className="font-bold text-sm text-slate-100">{compiled.name}</div>
                        <div className="text-xs text-slate-400">
                          種別: {compiled.type === 'weapon' ? '武器' : compiled.type === 'armor' ? '防具' : 'アイテム'} | 威力/防御: {compiled.power} | 定価: {compiled.price} G
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-300 block mb-1">最低価格 (入札開始額)</label>
                        <input
                          type="number"
                          value={startingBid}
                          min={10}
                          onChange={(e) => setStartingBid(Math.max(10, parseInt(e.target.value) || 0))}
                          className="pixel-input w-full p-2 bg-slate-900 border border-slate-700 text-amber-300 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300 block mb-1">即決価格 (バイアウト)</label>
                        <input
                          type="number"
                          value={buyoutPrice}
                          min={startingBid + 1}
                          onChange={(e) => setBuyoutPrice(Math.max(10, parseInt(e.target.value) || 0))}
                          className="pixel-input w-full p-2 bg-slate-900 border border-slate-700 text-amber-300 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300 block mb-1">出品期間</label>
                        <select
                          value={durationHours}
                          onChange={(e) => setDurationHours(parseInt(e.target.value) || 24)}
                          className="pixel-input w-full p-2 bg-slate-900 border border-slate-700 text-slate-200"
                        >
                          <option value={6}>6時間</option>
                          <option value={12}>12時間</option>
                          <option value={24}>24時間 (推奨)</option>
                          <option value={48}>48時間</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={handleSell} className="pixel-btn active w-full py-2.5 sm:py-3 font-bold">
                      出品する
                    </button>
                  </div>
                );
              })()}
            </div>
          ) : tab === 'buy' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.filter(i => i.status === 'active' && i.sellerId !== auth.currentUser?.uid).map(item => {
                const compiled = getSafeCompiledItem(item.itemData);
                const currentPrice = Math.max(item.currentBid, item.startingBid);
                return (
                  <div key={item.id} className="bg-slate-950 border border-slate-700 p-3 flex flex-col gap-2 rounded">
                    <div className="flex items-start gap-3">
                      <ItemIcon item={compiled} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                          {compiled.name}
                        </div>
                        <div className="text-[10px] text-slate-400">出品者: {item.sellerName}</div>
                        {item.itemData.engraving && (
                          <div className="text-[10px] text-indigo-300 mt-0.5">🛡️ 刻印: {item.itemData.engraving}</div>
                        )}
                        <div className="text-[10px] text-rose-400 mt-0.5">残り時間: {formatTimeLeft(item.expiresAt)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-400">現在価格 (最低: {item.startingBid} G)</div>
                        <div className="font-bold text-amber-400 text-xs sm:text-sm">{currentPrice.toLocaleString()} G</div>
                        <button
                          onClick={() => handleBid(item, Math.max(item.currentBid + 10, item.startingBid))}
                          className="pixel-btn text-[10px] w-full mt-1 !py-1"
                        >
                          入札 (+10G)
                        </button>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">即決価格</div>
                        <div className="font-bold text-amber-200 text-xs sm:text-sm">{item.buyoutPrice.toLocaleString()} G</div>
                        <button
                          onClick={() => handleBid(item, item.buyoutPrice)}
                          className="pixel-btn text-[10px] w-full mt-1 !py-1 !bg-amber-600 font-bold"
                        >
                          即決購入
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {items.filter(i => i.status === 'active' && i.sellerId !== auth.currentUser?.uid).length === 0 && (
                <div className="col-span-1 sm:col-span-2 text-center py-10 text-slate-400 text-xs">
                  現在出品されているアイテムはありません
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {items
                .filter(
                  i =>
                    (i.sellerId === auth.currentUser?.uid || i.highestBidderId === auth.currentUser?.uid) &&
                    i.status !== 'claimed'
                )
                .map(item => {
                  const isSeller = item.sellerId === auth.currentUser?.uid;
                  const isWinner = item.highestBidderId === auth.currentUser?.uid && item.status === 'sold';
                  const compiled = getSafeCompiledItem(item.itemData);

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-950 border border-slate-700 p-3 flex justify-between items-center gap-3 rounded"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ItemIcon item={compiled} />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                            {compiled.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {isSeller ? '🏷️ あなたの出品' : '💰 あなたの入札'} / 現在額: {(item.currentBid || item.startingBid).toLocaleString()} G
                          </div>
                          <div className="text-[10px] font-bold mt-1">
                            {item.status === 'active' && (
                              <span className="text-sky-400">出品中 (残り: {formatTimeLeft(item.expiresAt)})</span>
                            )}
                            {item.status === 'sold' && (
                              <span className="text-emerald-400 font-bold">
                                {isWinner ? '🎉 あなたが落札しました！' : '🎉 出品アイテムが落札されました！'}
                              </span>
                            )}
                            {item.status === 'expired' && <span className="text-rose-400">期限切れ (入札なし)</span>}
                            {item.status === 'canceled' && <span className="text-slate-400">取り消し済み</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {item.status === 'active' && isSeller && item.currentBid === 0 && (
                          <button
                            onClick={() => handleCancelListing(item)}
                            className="pixel-btn text-[10px] !py-1 !px-2.5 !bg-rose-900 !border-rose-700 hover:!bg-rose-800"
                          >
                            出品取消
                          </button>
                        )}
                        {(item.status === 'sold' || item.status === 'expired' || item.status === 'canceled') &&
                          (isSeller || isWinner) && (
                            <button
                              onClick={() => handleClaim(item)}
                              className="pixel-btn text-xs !py-2 !px-3 !bg-emerald-600 active font-bold text-white shadow-sm"
                            >
                              {isSeller && item.status === 'sold' ? '🪙 売上金受取' : '🎁 アイテム受取'}
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              {items.filter(
                i =>
                  (i.sellerId === auth.currentUser?.uid || i.highestBidderId === auth.currentUser?.uid) &&
                  i.status !== 'claimed'
              ).length === 0 && (
                <div className="text-center py-10 text-slate-400 text-xs">
                  現在取引中または受取待ちのアイテムはありません
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
