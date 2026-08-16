import React, { useState } from 'react';

interface StageSelectModalProps {
  currentStage: number;
  maxStageReached: number;
  onSelectStage: (stage: number) => void;
  onClose: () => void;
}

export const StageSelectModal: React.FC<StageSelectModalProps> = ({
  currentStage,
  maxStageReached,
  onSelectStage,
  onClose,
}) => {
  const [selectedStage, setSelectedStage] = useState<number>(currentStage);

  const handleApply = () => {
    const valid = Math.max(1, Math.min(maxStageReached, selectedStage));
    onSelectStage(valid);
  };

  const getStageZoneName = (stage: number) => {
    if (stage > 500) return { name: '深層カオスゾーン', icon: '⚡', color: 'text-purple-400' };
    if (stage > 400) return { name: 'ドラゴンゾーン', icon: '🐲', color: 'text-rose-400' };
    if (stage > 300) return { name: 'デーモンゾーン', icon: '👿', color: 'text-amber-400' };
    if (stage > 200) return { name: 'オークゾーン', icon: '🐗', color: 'text-purple-300' };
    if (stage > 100) return { name: 'ゴブリンゾーン', icon: '👺', color: 'text-red-400' };
    return { name: 'スライムゾーン', icon: '🟢', color: 'text-emerald-400' };
  };

  const currentZone = getStageZoneName(selectedStage);

  const quickJumpStages = [1];
  for (let s = 101; s <= maxStageReached; s += 100) {
    quickJumpStages.push(s);
  }
  if (!quickJumpStages.includes(maxStageReached)) {
    quickJumpStages.push(maxStageReached);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="pixel-panel max-w-md w-full bg-slate-900 border-2 border-amber-400 p-5 relative shadow-[0_0_25px_rgba(245,158,11,0.3)] text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-slate-400 hover:text-white text-lg font-bold px-2 py-0.5 rounded"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
          <span className="text-2xl">🗺️</span>
          <div>
            <h3 className="text-base font-bold text-amber-300">階層移動 (フロア選択)</h3>
            <p className="text-[11px] text-slate-400">到達したことのある階層へ自由に戻って再挑戦できます</p>
          </div>
        </div>

        {/* 現在値と最高到達層 */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400">現在地</div>
            <div className="text-sm font-bold text-sky-300">Stage {currentStage}</div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-center">
            <div className="text-[10px] text-amber-400 font-bold">最高到達階層</div>
            <div className="text-sm font-bold text-amber-300">Stage {maxStageReached}</div>
          </div>
        </div>

        {/* 選択中の階層表示 */}
        <div className="bg-slate-950 p-4 rounded border border-amber-500/50 text-center mb-4 space-y-2">
          <div className="text-[11px] text-slate-400">移動先の階層</div>
          <div className="text-3xl font-black text-amber-300 flex items-center justify-center gap-2">
            <span>Stage</span>
            <input
              type="number"
              min={1}
              max={maxStageReached}
              value={selectedStage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  setSelectedStage(Math.max(1, Math.min(maxStageReached, val)));
                }
              }}
              className="w-24 bg-slate-900 border-2 border-amber-400 text-center text-2xl font-black text-amber-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <div className={`text-xs font-bold ${currentZone.color} flex items-center justify-center gap-1`}>
            <span>{currentZone.icon}</span>
            <span>{currentZone.name}</span>
          </div>

          {/* 増減コントロール */}
          <div className="flex justify-center gap-1.5 pt-2">
            <button
              onClick={() => setSelectedStage(prev => Math.max(1, prev - 10))}
              className="pixel-btn text-xs !py-1 !px-2.5 !bg-slate-800 hover:!bg-slate-700 active"
            >
              -10
            </button>
            <button
              onClick={() => setSelectedStage(prev => Math.max(1, prev - 1))}
              className="pixel-btn text-xs !py-1 !px-2.5 !bg-slate-800 hover:!bg-slate-700 active"
            >
              -1
            </button>
            <button
              onClick={() => setSelectedStage(prev => Math.min(maxStageReached, prev + 1))}
              className="pixel-btn text-xs !py-1 !px-2.5 !bg-slate-800 hover:!bg-slate-700 active"
            >
              +1
            </button>
            <button
              onClick={() => setSelectedStage(prev => Math.min(maxStageReached, prev + 10))}
              className="pixel-btn text-xs !py-1 !px-2.5 !bg-slate-800 hover:!bg-slate-700 active"
            >
              +10
            </button>
          </div>
        </div>

        {/* クイックジャンプ */}
        <div className="mb-4">
          <div className="text-[10px] text-slate-400 mb-1.5 font-bold">📍 クイックジャンプ</div>
          <div className="flex flex-wrap gap-1.5">
            {quickJumpStages.map(st => (
              <button
                key={st}
                onClick={() => setSelectedStage(st)}
                className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
                  selectedStage === st
                    ? 'bg-amber-950 border-amber-400 text-amber-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                {st === maxStageReached ? `最前線 (Stage ${st})` : `Stage ${st}`}
              </button>
            ))}
          </div>
        </div>

        {/* フッターアクション */}
        <div className="flex gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={handleApply}
            className="pixel-btn active text-xs py-2 flex-1 !border-amber-400"
          >
            ⚔️ Stage {selectedStage} へ移動する
          </button>
          <button
            onClick={onClose}
            className="pixel-btn text-xs py-2 px-4 !bg-slate-800 !text-slate-300 !border-slate-600"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};
