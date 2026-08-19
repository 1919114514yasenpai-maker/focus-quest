import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { generateUid } from '../gameData';
import { ItemIcon } from './Inventory';
import { ITEMS } from '../gameData';
import { PlayerItem, GameItem } from '../types';

interface MarketItem {
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

export const AuctionHouse: React.FC<AuctionHouseProps> = ({ onClose, inventory, gold, onRefreshGold, onReceiveItem, onRemoveItem }) => {
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
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketItem));
      
      const now = Date.now();
      const updated = fetched.map(item => {
        if (item.status === 'active' && item.expiresAt < now) {
          const newStatus = item.highestBidderId ? 'sold' : 'expired';
          updateDoc(doc(db, 'market', item.id), { status: newStatus });
          return { ...item, status: newStatus };
        }
        return item;
      });
      
      setItems(updated);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSell = async () => {
    if (!auth.currentUser || !selectedSellItem) return;
    if (startingBid < 10) { alert('最低価格は10G以上です'); return; }
    if (buyoutPrice <= startingBid) { alert('即決価格は最低価格より高く設定してください'); return; }

    try {
      const marketId = generateUid();
      const expiresAt = Date.now() + (durationHours * 60 * 60 * 1000);
      const newItem: MarketItem = {
        id: marketId,
        sellerId: auth.currentUser.uid,
        sellerName: auth.currentUser.displayName || '名無し勇者',
        itemData: selectedSellItem,
        startingBid: startingBid,
        currentBid: 0,
        buyoutPrice,
        highestBidderId: null,
        highestBidderName: null,
        expiresAt,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'market', marketId), newItem);
      onRemoveItem(selectedSellItem.uid);
      setSelectedSellItem(null);
      setTab('buy');
      fetchItems();
    } catch (e) {
      console.error(e);
      alert('出品に失敗しました');
    }
  };

  const handleBid = async (item: MarketItem, bidAmount: number) => {
    if (!auth.currentUser || gold < bidAmount) return;
    
    try {
      const docRef = doc(db, 'market', item.id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;
      const currentData = snap.data() as MarketItem;
      
      if (currentData.status !== 'active') {
        alert('このオークションは終了しています');
        fetchItems();
        return;
      }
      
      if (bidAmount <= currentData.currentBid || bidAmount < currentData.startingBid) {
        alert('入札額が低すぎます');
        fetchItems();
        return;
      }

      onRefreshGold(-bidAmount);

      const isBuyout = bidAmount >= currentData.buyoutPrice;
      const newStatus = isBuyout ? 'sold' : 'active';
      
      await updateDoc(docRef, {
        currentBid: isBuyout ? currentData.buyoutPrice : bidAmount,
        highestBidderId: auth.currentUser.uid,
        highestBidderName: auth.currentUser.displayName,
        status: newStatus
      });
      
      fetchItems();
    } catch (e) {
      console.error(e);
      alert('入札に失敗しました');
    }
  };

  const handleCancelListing = async (item: MarketItem) => {
    if (item.sellerId !== auth.currentUser?.uid || item.status !== 'active') return;
    if (item.currentBid > 0) {
      alert('すでに入札があるため取り消せません');
      return;
    }
    
    if (confirm('出品を取り消しますか？アイテムはインベントリに戻ります。')) {
      try {
        await updateDoc(doc(db, 'market', item.id), { status: 'canceled' });
        onReceiveItem(item.itemData);
        fetchItems();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleClaim = async (item: MarketItem) => {
    if (!auth.currentUser) return;
    
    try {
      if (item.status === 'sold' && item.highestBidderId === auth.currentUser.uid) {
        // I won
        await updateDoc(doc(db, 'market', item.id), { status: 'claimed' });
        onReceiveItem(item.itemData);
      } else if (item.status === 'sold' && item.sellerId === auth.currentUser.uid) {
        // My item sold
        await updateDoc(doc(db, 'market', item.id), { status: 'claimed' });
        onRefreshGold(item.currentBid);
      } else if (item.status === 'expired' && item.sellerId === auth.currentUser.uid) {
        // Expired without sale
        await updateDoc(doc(db, 'market', item.id), { status: 'claimed' });
        onReceiveItem(item.itemData);
      } else if (item.status === 'canceled' && item.sellerId === auth.currentUser.uid) {
         // Should already be in inventory, just hide
         await updateDoc(doc(db, 'market', item.id), { status: 'claimed' });
      }
      fetchItems();
    } catch (e) {
      console.error(e);
    }
  };

  const formatTimeLeft = (expiresAt: number) => {
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
            <span>⚖️</span> グローバルオークション
          </h2>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-amber-300 font-bold text-xs sm:text-sm">所持: {gold} G</span>
            <button onClick={onClose} className="pixel-btn text-xs !bg-slate-800 !py-1 !px-2">閉じる</button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => setTab('buy')} 
            className={`pixel-btn flex-1 text-xs sm:text-sm py-2 ${tab === 'buy' ? '!bg-amber-700 !border-amber-500' : '!bg-slate-800 !text-slate-400'}`}
          >
            🛒 買う
          </button>
          <button 
            onClick={() => setTab('sell')} 
            className={`pixel-btn flex-1 text-xs sm:text-sm py-2 ${tab === 'sell' ? '!bg-amber-700 !border-amber-500' : '!bg-slate-800 !text-slate-400'}`}
          >
            💰 売る
          </button>
          <button 
            onClick={() => setTab('my')} 
            className={`pixel-btn flex-1 text-xs sm:text-sm py-2 ${tab === 'my' ? '!bg-amber-700 !border-amber-500' : '!bg-slate-800 !text-slate-400'}`}
          >
            👤 取引状況
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="text-center py-10 text-amber-500 animate-pulse">読み込み中...</div>
          ) : tab === 'sell' ? (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 border border-slate-700">
                <h3 className="text-sm font-bold text-amber-400 mb-3">出品するアイテムを選ぶ</h3>
                <div className="flex flex-wrap gap-2">
                  {inventory.filter(i => !i.isLocked).map(item => (
                    <div 
                      key={item.uid}
                      onClick={() => setSelectedSellItem(item)}
                      className={`relative cursor-pointer p-1 border-2 ${selectedSellItem?.uid === item.uid ? 'border-amber-500 bg-amber-900/30' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}`}
                    >
                      <ItemIcon item={item} />
                      {item.plus > 0 && <span className="absolute -top-1 -right-1 text-[10px] text-amber-400 font-bold">+{item.plus}</span>}
                    </div>
                  ))}
                  {inventory.filter(i => !i.isLocked).length === 0 && (
                    <div className="text-xs text-slate-500">出品可能なアイテムがありません（ロック中のアイテムは出品できません）</div>
                  )}
                </div>
              </div>

              {selectedSellItem && (
                <div className="bg-slate-950 p-4 border border-amber-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <ItemIcon item={selectedSellItem} />
                    <div>
                      <div className="font-bold text-sm text-slate-200">{ITEMS[selectedSellItem.itemId].name} {selectedSellItem.plus > 0 ? `+${selectedSellItem.plus}` : ''}</div>
                      <div className="text-xs text-slate-400">推奨相場: {ITEMS[selectedSellItem.itemId].price * 2}G ~</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">最低価格 (入札開始額)</label>
                      <input 
                        type="number" 
                        value={startingBid}
                        onChange={(e) => setStartingBid(Math.max(10, parseInt(e.target.value) || 0))}
                        className="pixel-input w-full p-2 bg-slate-900 border border-slate-700 text-amber-300 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">即決価格 (バイアウト)</label>
                      <input 
                        type="number" 
                        value={buyoutPrice}
                        onChange={(e) => setBuyoutPrice(Math.max(10, parseInt(e.target.value) || 0))}
                        className="pixel-input w-full p-2 bg-slate-900 border border-slate-700 text-amber-300 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">出品期間</label>
                      <select 
                        value={durationHours}
                        onChange={(e) => setDurationHours(parseInt(e.target.value))}
                        className="pixel-input w-full p-2 bg-slate-900 border border-slate-700 text-slate-200"
                      >
                        <option value={6}>6時間</option>
                        <option value={12}>12時間</option>
                        <option value={24}>24時間</option>
                        <option value={48}>48時間</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={handleSell} className="pixel-btn active w-full py-3">
                    出品する
                  </button>
                </div>
              )}
            </div>
          ) : tab === 'buy' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.filter(i => i.status === 'active' && i.sellerId !== auth.currentUser?.uid).map(item => (
                <div key={item.id} className="bg-slate-950 border border-slate-700 p-3 flex flex-col gap-2">
                  <div className="flex items-start gap-3">
                    <ItemIcon item={item.itemData} />
                    <div className="flex-1">
                      <div className="font-bold text-xs sm:text-sm text-slate-200 truncate">
                        {ITEMS[item.itemData.itemId].name} {item.itemData.plus > 0 ? `+${item.itemData.plus}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-500">出品: {item.sellerName}</div>
                      {item.itemData.engraving && (
                        <div className="text-[10px] text-indigo-300 mt-0.5">🛡️ 刻印: {item.itemData.engraving}</div>
                      )}
                      <div className="text-[10px] text-rose-400 mt-0.5">残り: {formatTimeLeft(item.expiresAt)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-400">現在価格 (最低: {item.startingBid})</div>
                      <div className="font-bold text-amber-400 text-xs sm:text-sm">{Math.max(item.currentBid, item.startingBid)} G</div>
                      <button 
                        onClick={() => handleBid(item, Math.max(item.currentBid + 10, item.startingBid))}
                        className="pixel-btn text-[10px] w-full mt-1 !py-1"
                      >
                        入札
                      </button>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">即決価格</div>
                      <div className="font-bold text-amber-200 text-xs sm:text-sm">{item.buyoutPrice} G</div>
                      <button 
                        onClick={() => handleBid(item, item.buyoutPrice)}
                        className="pixel-btn text-[10px] w-full mt-1 !py-1 !bg-amber-600"
                      >
                        即決購入
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {items.filter(i => i.status === 'active' && i.sellerId !== auth.currentUser?.uid).length === 0 && (
                <div className="col-span-1 sm:col-span-2 text-center py-10 text-slate-500 text-xs">
                  現在出品されているアイテムはありません
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {items.filter(i => (i.sellerId === auth.currentUser?.uid || i.highestBidderId === auth.currentUser?.uid) && i.status !== 'claimed').map(item => {
                const isSeller = item.sellerId === auth.currentUser?.uid;
                const isWinner = item.highestBidderId === auth.currentUser?.uid && item.status === 'sold';
                
                return (
                  <div key={item.id} className="bg-slate-950 border border-slate-700 p-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <ItemIcon item={item.itemData} />
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-200">
                          {ITEMS[item.itemData.itemId].name} {item.itemData.plus > 0 ? `+${item.itemData.plus}` : ''}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isSeller ? 'あなたの出品' : 'あなたの入札'} / 現在: {item.currentBid || item.startingBid}G
                        </div>
                        <div className="text-[10px] font-bold mt-1">
                          {item.status === 'active' && <span className="text-sky-400">出品中 ({formatTimeLeft(item.expiresAt)})</span>}
                          {item.status === 'sold' && <span className="text-emerald-400">落札完了！</span>}
                          {item.status === 'expired' && <span className="text-rose-400">期限切れ</span>}
                          {item.status === 'canceled' && <span className="text-slate-500">取り消し済み</span>}
                        </div>
                      </div>
                    </div>
                    <div>
                      {item.status === 'active' && isSeller && (
                        <button 
                          onClick={() => handleCancelListing(item)} 
                          className="pixel-btn text-[10px] !py-1 !px-2 !bg-rose-900 !border-rose-700 hover:!bg-rose-800"
                        >
                          取り消す
                        </button>
                      )}
                      {(item.status === 'sold' || item.status === 'expired' || item.status === 'canceled') && (isSeller || isWinner) && (
                        <button 
                          onClick={() => handleClaim(item)} 
                          className="pixel-btn text-xs !py-2 !px-4 !bg-emerald-600 active"
                        >
                          {isSeller && item.status === 'sold' ? '売上受取' : 'アイテム回収'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {items.filter(i => (i.sellerId === auth.currentUser?.uid || i.highestBidderId === auth.currentUser?.uid) && i.status !== 'claimed').length === 0 && (
                <div className="text-center py-10 text-slate-500 text-xs">
                  取引中のアイテムはありません
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
