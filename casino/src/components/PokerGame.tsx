import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { UserData } from '../types';

interface Props {
  userData: UserData;
  updateBalance: (amount: number, stats?: { wonAmount?: number, gamePlayed?: boolean }) => Promise<void>;
}

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
interface Card { suit: Suit; rank: Rank; held: boolean; hidden?: boolean }

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const generateDeck = () => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, held: false });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
};

export default function PokerGame({ userData, updateBalance }: Props) {
  const [betAmount, setBetAmount] = useState<number>(10);
  const [deck, setDeck] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>(Array(5).fill({ hidden: true }));
  const [gameState, setGameState] = useState<'betting' | 'drawing' | 'drawn' | 'evaluating' | 'finished'>('betting');
  const [winStatus, setWinStatus] = useState<{ message: string, multiplier: number } | null>(null);

  const getRankValue = (rank: Rank) => RANKS.indexOf(rank);

  const evaluateHand = (finalHand: Card[]) => {
    const ranks = finalHand.map(c => getRankValue(c.rank)).sort((a, b) => a - b);
    const suits = finalHand.map(c => c.suit);
    
    const rankCounts: Record<number, number> = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = ranks[4] - ranks[0] === 4 && new Set(ranks).size === 5 || 
                       (ranks[4] === 12 && ranks[0] === 0 && ranks[1] === 1 && ranks[2] === 2 && ranks[3] === 3); // A-2-3-4-5

    if (isFlush && isStraight && ranks[4] === 12 && ranks[3] === 11) return { message: 'ロイヤルストレートフラッシュ', multiplier: 250 };
    if (isFlush && isStraight) return { message: 'ストレートフラッシュ', multiplier: 50 };
    if (counts[0] === 4) return { message: 'フォーカード', multiplier: 25 };
    if (counts[0] === 3 && counts[1] === 2) return { message: 'フルハウス', multiplier: 9 };
    if (isFlush) return { message: 'フラッシュ', multiplier: 6 };
    if (isStraight) return { message: 'ストレート', multiplier: 4 };
    if (counts[0] === 3) return { message: 'スリーカード', multiplier: 3 };
    if (counts[0] === 2 && counts[1] === 2) return { message: 'ツーペア', multiplier: 2 };
    
    // Jacks or better
    const pairRank = Object.keys(rankCounts).find(r => rankCounts[parseInt(r)] === 2);
    if (pairRank && parseInt(pairRank) >= 9) return { message: 'ジャックス・オア・ベター', multiplier: 1 };

    return { message: '役なし', multiplier: 0 };
  };

  const dealInitial = async () => {
    if (betAmount <= 0 || betAmount > userData.balance) return;
    setGameState('drawing');
    await updateBalance(-betAmount); // Deduct initial bet
    
    const newDeck = generateDeck();
    const newHand = newDeck.splice(0, 5);
    setDeck(newDeck);
    
    // Animate dealing
    setHand(newHand.map(c => ({...c, hidden: true})));
    await new Promise(resolve => setTimeout(resolve, 500));
    setHand(newHand);
    setGameState('drawn');
  };

  const toggleHold = (index: number) => {
    if (gameState !== 'drawn') return;
    const newHand = [...hand];
    newHand[index] = { ...newHand[index], held: !newHand[index].held };
    setHand(newHand);
  };

  const drawFinal = async () => {
    setGameState('evaluating');
    const currentDeck = [...deck];
    const newHand = hand.map(card => card.held ? card : currentDeck.pop()!);
    setHand(newHand);
    setDeck(currentDeck);

    await new Promise(resolve => setTimeout(resolve, 800));

    const result = evaluateHand(newHand);
    setWinStatus(result);
    setGameState('finished');
    
    if (result.multiplier > 0) {
      await updateBalance(betAmount * result.multiplier, { wonAmount: betAmount * result.multiplier, gamePlayed: true });
    } else {
      await updateBalance(0, { wonAmount: 0, gamePlayed: true });
    }
  };

  const resetGame = () => {
    setGameState('betting');
    setWinStatus(null);
    setHand(Array(5).fill({ hidden: true }));
  };

  const renderCard = (card: Card, index: number) => {
    if (card.hidden) {
      return (
        <motion.div 
          key={`hidden-${index}`}
          initial={{ opacity: 0, x: -50, rotateY: 180 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="w-12 h-16 sm:w-16 sm:h-24 bg-blue-900 border-2 border-blue-700 rounded-lg shadow-lg flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMxZTNhOGEiPjwvcmVjdD48cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iIzFkNGVkOCIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+PC9zdmc+')]"
        >
        </motion.div>
      );
    }
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const suitSymbol = card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠';
    
    return (
      <motion.div 
        key={`${card.rank}-${card.suit}-${index}`}
        initial={{ opacity: 0, scale: 0.8, rotateY: -180 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{ duration: 0.4, type: 'spring' }}
        onClick={() => toggleHold(index)}
        className={`relative w-12 h-16 sm:w-16 sm:h-24 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center cursor-pointer transition-transform ${card.held ? 'translate-y-2 ring-2 ring-blue-500' : ''}`}
      >
        {card.held && <div className="absolute -top-6 text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-900/80 px-2 py-0.5 rounded">HOLD</div>}
        <div className={`text-lg sm:text-2xl font-black ${isRed ? 'text-red-600' : 'text-slate-900'}`}>{card.rank}</div>
        <div className={`text-xl sm:text-3xl ${isRed ? 'text-red-600' : 'text-slate-900'}`}>{suitSymbol}</div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end border-b border-slate-800 pb-2">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">VOID BLACKJACK (POKER)</h2>
        <div className="flex gap-2 text-xs">
          <span className="text-blue-400 font-bold underline underline-offset-4">PRO TABLES</span>
        </div>
      </div>
      
      <div className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col justify-between overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
         <div className="z-10 flex flex-col items-center w-full">
            
            {/* Cards Area */}
            <div className="flex gap-2 sm:gap-4 mb-8 min-h-[120px] items-center justify-center">
              {hand.map((card, i) => renderCard(card, i))}
            </div>

            {gameState === 'betting' && (
              <div className="w-full max-w-sm mb-6 flex flex-col items-center">
                <div className="w-full mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">金額</label>
                    <div className="flex gap-2">
                      <button onClick={() => setBetAmount(Math.max(10, Math.floor(betAmount / 2)))} className="text-[10px] px-2 py-1 bg-slate-800 rounded font-bold hover:bg-slate-700 text-slate-300 uppercase">半分</button>
                      <button onClick={() => setBetAmount(userData.balance || 10)} className="text-[10px] px-2 py-1 bg-slate-800 rounded font-bold hover:bg-slate-700 text-slate-300 uppercase">最大</button>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="font-mono text-blue-500 font-bold">$</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={userData.balance || 0}
                      value={betAmount || ''}
                      onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 text-blue-400 font-bold rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 font-mono text-lg transition-colors"
                    />
                  </div>
                </div>

                <button
                  onClick={dealInitial}
                  disabled={betAmount <= 0 || betAmount > userData.balance}
                  className="w-full bg-white text-blue-700 font-black text-lg py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl active:scale-95 uppercase tracking-wider"
                >
                  カードを配る
                </button>
                {betAmount > userData.balance && (
                  <p className="text-rose-400 text-xs font-bold uppercase tracking-widest mt-4 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> 残高不足
                  </p>
                )}
              </div>
            )}

            {gameState === 'drawn' && (
              <div className="w-full max-w-sm flex flex-col items-center">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">ホールドするカードをタップ</p>
                <button
                  onClick={drawFinal}
                  className="w-full bg-blue-600 text-white font-black text-lg py-4 rounded-xl transition-all shadow-xl active:scale-95 uppercase tracking-wider"
                >
                  ドロー
                </button>
              </div>
            )}

            {gameState === 'evaluating' && (
              <div className="w-full max-w-sm flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              </div>
            )}

            {gameState === 'finished' && winStatus && (
              <div className="w-full max-w-sm flex flex-col items-center gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full p-4 rounded-xl border-l-4 flex flex-col items-center text-center ${
                    winStatus.multiplier > 0 
                      ? 'bg-slate-950 border-emerald-500 text-emerald-400' 
                      : 'bg-slate-950 border-rose-500 text-rose-400'
                  }`}
                >
                  <div className="text-xl font-black mb-1">{winStatus.message}</div>
                  <div className="font-mono text-sm font-bold flex items-center gap-1">
                    {winStatus.multiplier > 0 ? `+$${betAmount * winStatus.multiplier}` : `-$${betAmount}`}
                  </div>
                </motion.div>
                <button
                  onClick={resetGame}
                  className="w-full bg-white text-blue-700 font-black text-lg py-4 rounded-xl transition-all shadow-xl active:scale-95 uppercase tracking-wider"
                >
                  もう一度プレイ
                </button>
              </div>
            )}
            
         </div>
      </div>
    </div>
  );
}
