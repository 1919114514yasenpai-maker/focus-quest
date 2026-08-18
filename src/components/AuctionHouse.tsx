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
  currentBid: number;
  buyoutPrice: number;
  highestBidderId: string | null;
  highestBidderName: string | null;
  expiresAt: number;
  status: 'active' | 'sold' | 'expired' | 'claimed';
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
  const [tab, setTab] = useState<'buy' | 'sell' | 'mybids'>('buy');
  
  // Sell state
  const [selectedSellItem, setSelectedSellItem] = useState<PlayerItem | null>(null);
  const [buyoutPrice, setBuyoutPrice] = useState<number>(1000);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'market'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketItem));
      
      const now = Date.now();
      const updated = fetched.map(item => {
        if (item.status === 'active' && item.expiresAt < now) {
          return { ...item, status: item.highestBidderId ? 'sold' : 'expired' } as MarketItem;
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
    if (buyoutPrice <= 0) return;

    const marketId = generateUid();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const newItem: MarketItem = {
      id: marketId,
      sellerId: auth.currentUser.uid,
      sellerName: auth.currentUser.displayName || '名無し勇者',
      itemData: selectedSellItem,
      currentBid: Math.floor(buyoutPrice * 0.1), // starting bid is 10%
      buyoutPrice,
      highestBidderId: null,
      highestBidderName: null,
      expiresAt,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'market', marketId), newItem);
      onRemoveItem(selectedSellItem.uid);
      setSelectedSellItem(null);
      fetchItems();
      alert('出品しました！');
    } catch (e) {
      console.error(e);
      alert('出品に失敗しました');
    }
  };

  const handleBuyout = async (marketItem: MarketItem) => {
    if (!auth.currentUser) return;
    if (gold < marketItem.buyoutPrice) {
      alert('所持金が足りません！');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'market', marketItem.id), {
        status: 'sold',
        highestBidderId: auth.currentUser.uid,
        highestBidderName: auth.currentUser.displayName || '名無し勇者',
        currentBid: marketItem.buyoutPrice
      });
      onRefreshGold(-marketItem.buyoutPrice);
      // Give item to player immediately for buyout
      onReceiveItem({ ...marketItem.itemData, uid: generateUid() });
      alert('落札しました！');
      fetchItems();
    } catch (e) {
      console.error(e);
      alert('購入に失敗しました');
    }
  };

  const handleClaim = async (marketItem: MarketItem) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'market', marketItem.id), { status: 'claimed' });
      if (marketItem.sellerId === auth.currentUser.uid && marketItem.highestBidderId) {
        // Seller gets gold
        onRefreshGold(marketItem.currentBid);
        alert(`${marketItem.currentBid}G を受け取りました！`);
      } else if (marketItem.highestBidderId === auth.currentUser.uid) {
        // Bidder gets item
        onReceiveItem({ ...marketItem.itemData, uid: generateUid() });
        alert('落札アイテムを受け取りました！');
      } else if (marketItem.sellerId === auth.currentUser.uid && !marketItem.highestBidderId) {
        // Seller gets item back
        onReceiveItem({ ...marketItem.itemData, uid: generateUid() });
        alert('出品アイテムを回収しました！');
      }
      fetchItems();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="pixel-panel max-w-3xl w-full bg-slate-900 border-2 border-emerald-500 p-5 relative text-slate-100 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
          <h2 className="text-lg font-bold text-emerald-300 flex items-center gap-2">
            <span>⚖️</span> グローバルオークション
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-amber-300 font-bold">所持金: {gold} G</span>
            <button onClick={onClose} className="pixel-btn text-xs !bg-slate-800 !py-1 !px-2">閉じる</button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('buy')} className={`pixel-btn text-xs flex-1 ${tab === 'buy' ? '!bg-emerald-700' : '!bg-slate-800'}`}>購入する</button>
          <button onClick={() => setTab('sell')} className={`pixel-btn text-xs flex-1 ${tab === 'sell' ? '!bg-emerald-700' : '!bg-slate-800'}`}>出品する</button>
          <button onClick={() => setTab('mybids')} className={`pixel-btn text-xs flex-1 ${tab === 'mybids' ? '!bg-emerald-700' : '!bg-slate-800'}`}>取引状況</button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-emerald-400 animate-pulse">読み込み中...</div>
        ) : (
          <div className="h-[50vh] overflow-y-auto pr-2">
            {tab === 'buy' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.filter(i => i.status === 'active' && i.sellerId !== auth.currentUser?.uid).map(item => {
                  const baseDef = ITEMS[item.itemData.baseId];
                  return (
                    <div key={item.id} className="bg-slate-950 border border-slate-700 p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <ItemIcon item={{ ...baseDef, id: item.itemData.baseId } as GameItem} />
                          <div className="font-bold text-sm text-slate-200">
                            {baseDef?.name} {item.itemData.upgradeLevel > 0 ? `+${item.itemData.upgradeLevel}` : ''}
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400">出品者: {item.sellerName}</div>
                        <div className="text-[10px] text-amber-300">即決価格: {item.buyoutPrice} G</div>
                      </div>
                      <button 
                        onClick={() => handleBuyout(item)}
                        className="pixel-btn mt-2 text-xs !bg-amber-600 !py-1"
                      >
                        即決購入
                      </button>
                    </div>
                  );
                })}
                {items.filter(i => i.status === 'active' && i.sellerId !== auth.currentUser?.uid).length === 0 && (
                  <div className="col-span-2 text-center text-slate-500 py-10">出品がありません</div>
                )}
              </div>
            )}

            {tab === 'sell' && (
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 border border-slate-700">
                  <h3 className="text-sm font-bold text-slate-300 mb-2">出品するアイテムを選ぶ</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {inventory.filter(i => !i.isLocked).map(item => {
                      const baseDef = ITEMS[item.baseId];
                      return (
                        <button
                          key={item.uid}
                          onClick={() => setSelectedSellItem(item)}
                          className={`pixel-btn text-[10px] !py-1 !px-2 flex items-center gap-1 ${selectedSellItem?.uid === item.uid ? '!border-emerald-400' : '!border-slate-600 !bg-slate-800'}`}
                        >
                          <ItemIcon item={{ ...baseDef, id: item.baseId } as GameItem} />
                          {baseDef?.name} {item.upgradeLevel > 0 ? `+${item.upgradeLevel}` : ''}
                        </button>
                      );
                    })}
                  </div>
                  
                  {selectedSellItem && (
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block mb-1">即決価格 (G)</label>
                        <input 
                          type="number" 
                          min={1} 
                          value={buyoutPrice} 
                          onChange={e => setBuyoutPrice(parseInt(e.target.value) || 0)}
                          className="pixel-input w-full p-2 bg-slate-900 border border-slate-600 text-slate-200 text-sm"
                        />
                      </div>
                      <button 
                        onClick={handleSell}
                        className="pixel-btn text-xs !bg-emerald-600 h-[38px] px-4"
                      >
                        出品
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'mybids' && (
              <div className="space-y-2">
                {items.filter(i => i.sellerId === auth.currentUser?.uid || i.highestBidderId === auth.currentUser?.uid).map(item => {
                  const baseDef = ITEMS[item.itemData.baseId];
                  const isSeller = item.sellerId === auth.currentUser?.uid;
                  
                  let statusText = '';
                  if (item.status === 'active') statusText = '出品中 (残り時間あり)';
                  if (item.status === 'sold') statusText = '落札済み！';
                  if (item.status === 'expired') statusText = '期限切れ (未落札)';
                  if (item.status === 'claimed') statusText = '受取完了';

                  return (
                    <div key={item.id} className="bg-slate-950 p-3 border border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-200">
                          {isSeller ? '📤 出品' : '📥 入札'}: {baseDef?.name} {item.itemData.upgradeLevel > 0 ? `+${item.itemData.upgradeLevel}` : ''}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          状態: <span className={item.status === 'sold' ? 'text-emerald-400' : 'text-slate-300'}>{statusText}</span>
                        </div>
                      </div>
                      
                      {item.status !== 'active' && item.status !== 'claimed' && isSeller && (
                        <button onClick={() => handleClaim(item)} className="pixel-btn text-[10px] !bg-amber-600 !py-1 !px-3">
                          {item.status === 'sold' ? '売上金を受け取る' : 'アイテムを回収'}
                        </button>
                      )}
                      
                      {item.status === 'sold' && !isSeller && item.highestBidderId === auth.currentUser?.uid && (
                        <button onClick={() => handleClaim(item)} className="pixel-btn text-[10px] !bg-amber-600 !py-1 !px-3">
                          アイテムを受け取る
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
