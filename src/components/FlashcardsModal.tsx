import React, { useState, useEffect } from 'react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  nextReview: number;
}

interface FlashcardsModalProps {
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const FlashcardsModal: React.FC<FlashcardsModalProps> = ({ onClose, showToast }) => {
  const [cards, setCards] = useState<Flashcard[]>(() => {
    const saved = localStorage.getItem('focus_quest_flashcards');
    return saved ? JSON.parse(saved) : [];
  });
  const [mode, setMode] = useState<'list' | 'add' | 'study' | 'import'>('list');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  
  // Study state
  const [studyQueue, setStudyQueue] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    localStorage.setItem('focus_quest_flashcards', JSON.stringify(cards));
  }, [cards]);

  const handleAdd = () => {
    if (!front.trim() || !back.trim()) return;
    const newCard: Flashcard = {
      id: Math.random().toString(36).substring(2, 9),
      front,
      back,
      nextReview: Date.now()
    };
    setCards([...cards, newCard]);
    setFront('');
    setBack('');
    showToast('単語を追加しました');
  };

  const handleDelete = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
  };

  const startStudy = () => {
    // Very simple study logic: all cards
    setStudyQueue([...cards].sort(() => Math.random() - 0.5));
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setMode('study');
  };

  const nextCard = () => {
    if (currentCardIndex + 1 < studyQueue.length) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    } else {
      showToast('学習完了！お疲れ様でした');
      setMode('list');
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const lines = text.split('\n');
    const newCards: Flashcard[] = [];
    lines.forEach(line => {
      const parts = line.split('\t'); // TSV (Anki Default)
      if (parts.length >= 2) {
        newCards.push({
          id: Math.random().toString(36).substring(2, 9),
          front: parts[0].trim(),
          back: parts[1].trim(),
          nextReview: Date.now()
        });
      }
    });
    if (newCards.length > 0) {
      setCards(prev => [...prev, ...newCards]);
      showToast(`${newCards.length}枚のカードをインポートしました`);
    }
  };

  const exportCSV = () => {
    const tsv = cards.map(c => `${c.front}\t${c.back}`).join('\n');
    navigator.clipboard.writeText(tsv);
    showToast('Anki互換データ(TSV)をクリップボードにコピーしました');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80">
      <div className="pixel-panel bg-slate-950 w-full max-w-md max-h-[90vh] flex flex-col p-3 sm:p-4 border-2 border-amber-600 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm sm:text-base text-amber-400 font-bold flex items-center gap-2">
            <span>📖</span> 魔導書（単語帳）
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 font-bold text-lg">✕</button>
        </div>

        {mode === 'list' && (
          <div className="flex flex-col gap-2 flex-1 overflow-hidden">
            <div className="flex gap-2">
              <button onClick={() => setMode('add')} className="pixel-btn text-xs flex-1 py-2">＋ 追加</button>
              <button onClick={startStudy} disabled={cards.length === 0} className="pixel-btn active text-xs flex-1 py-2">学習開始</button>
              <button onClick={() => setMode('import')} className="pixel-btn text-xs px-2 py-2">TSV入出力</button>
            </div>
            
            <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
              {cards.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">単語がありません</p>
              ) : (
                cards.map(c => (
                  <div key={c.id} className="bg-slate-900 border border-slate-700 p-2 flex justify-between items-center text-xs text-slate-300">
                    <div className="flex-1 truncate pr-2">
                      <span className="font-bold text-amber-200">{c.front}</span>
                      <span className="mx-2 text-slate-600">|</span>
                      <span>{c.back}</span>
                    </div>
                    <button onClick={() => handleDelete(c.id)} className="text-rose-400 hover:text-rose-300 px-2">✕</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {mode === 'add' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] text-amber-200 mb-1 block">表面 (Front)</label>
              <input type="text" value={front} onChange={e => setFront(e.target.value)} className="pixel-input w-full text-xs p-2 bg-slate-900 text-white border border-slate-700" />
            </div>
            <div>
              <label className="text-[10px] text-amber-200 mb-1 block">裏面 (Back)</label>
              <input type="text" value={back} onChange={e => setBack(e.target.value)} className="pixel-input w-full text-xs p-2 bg-slate-900 text-white border border-slate-700" />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={handleAdd} className="pixel-btn active flex-1 text-xs py-2">追加する</button>
              <button onClick={() => setMode('list')} className="pixel-btn flex-1 text-xs py-2">戻る</button>
            </div>
          </div>
        )}

        {mode === 'import' && (
          <div className="flex flex-col gap-3 flex-1">
            <p className="text-[10px] text-slate-300">Anki互換 (タブ区切りテキスト) を貼り付けてインポート、またはエクスポートします。</p>
            <textarea 
              onChange={handleImportCSV} 
              placeholder="表[Tab]裏&#10;Apple[Tab]りんご"
              className="pixel-input flex-1 w-full text-xs p-2 bg-slate-900 text-white border border-slate-700 min-h-[100px]"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={exportCSV} className="pixel-btn active flex-1 text-xs py-2">全てコピー (Export)</button>
              <button onClick={() => setMode('list')} className="pixel-btn flex-1 text-xs py-2">戻る</button>
            </div>
          </div>
        )}

        {mode === 'study' && studyQueue.length > 0 && (
          <div className="flex flex-col items-center justify-center flex-1 py-8">
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full aspect-[4/3] max-h-64 bg-slate-900 border-2 border-amber-800 rounded-xl flex items-center justify-center p-6 cursor-pointer hover:bg-slate-800 transition-colors"
            >
              <p className={`text-xl sm:text-2xl font-bold text-center ${isFlipped ? 'text-indigo-300' : 'text-amber-200'}`}>
                {isFlipped ? studyQueue[currentCardIndex].back : studyQueue[currentCardIndex].front}
              </p>
            </div>
            <p className="text-[10px] text-slate-500 mt-4 mb-2">
              {currentCardIndex + 1} / {studyQueue.length}
            </p>
            <div className="flex gap-2 w-full mt-4">
              <button onClick={() => setIsFlipped(!isFlipped)} className="pixel-btn flex-1 text-xs py-3">裏返す</button>
              {isFlipped && (
                <button onClick={nextCard} className="pixel-btn active flex-1 text-xs py-3">次へ</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
