import React, { useState } from 'react';
import { ChestReward, PlayerItem } from '../types';
import { ITEMS } from '../gameData';
import { getCompiledItem } from '../itemUtils';

interface ChestModalProps {
  reward: ChestReward;
  focusMinutes?: number;
  onClaim: (reward: ChestReward) => void;
}

export const ChestModal: React.FC<ChestModalProps> = ({ reward, focusMinutes, onClaim }) => {
  const [isOpened, setIsOpened] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleOpen = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      setIsOpened(true);
    }, 1200);
  };

  const chestTitle = reward.chestName || '宝箱';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border-4 border-amber-500/80 rounded-xl max-w-md w-full p-6 text-slate-100 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Header background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-amber-400 font-extrabold text-sm tracking-widest uppercase mb-1">
          {focusMinutes ? `🎉 ${focusMinutes}分間のクエスト完遂！` : '🎁 宝箱開封'}
        </div>
        <h2 className="text-2xl font-black text-amber-300 drop-shadow mb-4">
          {chestTitle}を獲得！
        </h2>

        {!isOpened ? (
          <div className="my-6 flex flex-col items-center gap-6 w-full">
            <div className={`text-8xl select-none transition-transform duration-300 ${isAnimating ? 'animate-bounce scale-110' : 'hover:scale-105'}`}>
              {chestTitle.includes('伝説') ? '👑' : chestTitle.includes('金') ? '🧰' : chestTitle.includes('銀') ? '🎁' : '📦'}
            </div>
            <p className="text-slate-300 text-sm">
              クエストお疲れ様でした！宝箱を開けて成果を受け取りましょう！
            </p>
            <button
              onClick={handleOpen}
              disabled={isAnimating}
              className="pixel-btn text-base py-3 px-8 w-full font-bold !bg-gradient-to-r !from-amber-500 !to-amber-600 hover:!from-amber-400 hover:!to-amber-500 !text-slate-950 !border-amber-300 shadow-lg active:scale-95 transition-all"
            >
              {isAnimating ? '開封中...' : '🔓 宝箱を開ける！'}
            </button>
          </div>
        ) : (
          <div className="my-2 flex flex-col items-center w-full animate-fade-in gap-4">
            <div className="text-6xl animate-pulse">✨🧰✨</div>
            <div className="text-amber-300 font-bold text-lg">豪華な報酬を獲得しました！</div>

            {/* Exp & Gold rewards */}
            <div className="flex justify-center gap-4 w-full bg-slate-950 p-3 rounded-lg border border-slate-800 text-sm font-semibold">
              <div className="text-sky-300 flex items-center gap-1">
                ⭐ <span>+{reward.xp} EXP</span>
              </div>
              <div className="text-amber-300 flex items-center gap-1">
                🪙 <span>+{reward.gold} G</span>
              </div>
            </div>

            {/* Dropped items */}
            {reward.items.length > 0 && (
              <div className="w-full flex flex-col gap-2 my-1">
                <div className="text-xs text-slate-400 font-semibold text-left">獲得アイテム ({reward.items.length}個):</div>
                <div className="max-h-48 overflow-y-auto flex flex-col gap-2 pr-1">
                  {reward.items.map((item, idx) => {
                    const compiled = getCompiledItem(item);
                    const baseItem = ITEMS[item.baseId];
                    if (!compiled || !baseItem) return null;

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-slate-950 border border-amber-500/30 rounded-lg text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center font-bold text-white text-xs shadow-inner"
                            style={{ backgroundColor: baseItem.color || '#64748b' }}
                          >
                            {baseItem.type === 'weapon' ? '⚔️' : baseItem.type === 'armor' ? '🛡️' : '💎'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-100">
                              {compiled.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {baseItem.type === 'weapon'
                                ? `攻撃力 +${compiled.power}`
                                : baseItem.type === 'armor'
                                ? `防御力 +${compiled.power}`
                                : baseItem.effect?.description || (baseItem.type === 'material' ? '鍛冶・特殊強化素材' : baseItem.type === 'chest' ? '開封可能な宝箱' : baseItem.type === 'gem' ? 'ソケット装着用宝石' : 'アイテム')}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => onClaim(reward)}
              className="pixel-btn text-sm py-3 px-6 w-full font-bold mt-2 !bg-amber-500 !text-slate-950 !border-amber-300 hover:!bg-amber-400 active:scale-95"
            >
              🎁 報酬をバッグに仕舞う
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
