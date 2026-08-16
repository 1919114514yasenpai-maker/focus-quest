import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { UserData } from '../types';

interface Props {
  userData: UserData;
  updateBalance: (amount: number, stats?: { wonAmount?: number, gamePlayed?: boolean }) => Promise<void>;
}

export default function RouletteGame({ userData, updateBalance }: Props) {
  const [betAmount, setBetAmount] = useState<number>(10);
  const [selectedGuess, setSelectedGuess] = useState<'red' | 'black' | 'green' | null>(null);
  const [rolling, setRolling] = useState(false);
  const [tempResult, setTempResult] = useState<{ number: number; color: 'red' | 'black' | 'green' } | null>(null);
  const [rollResult, setRollResult] = useState<{ number: number; color: 'red' | 'black' | 'green' } | null>(null);
  const [winStatus, setWinStatus] = useState<'win' | 'lose' | null>(null);

  const getNumberColor = (num: number): 'red' | 'black' | 'green' => {
    if (num === 0) return 'green';
    // Simplified roulette colors
    const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return reds.includes(num) ? 'red' : 'black';
  };

  const playTurn = async () => {
    if (!selectedGuess || betAmount <= 0 || betAmount > userData.balance || rolling) return;

    setRolling(true);
    setRollResult(null);
    setWinStatus(null);
    setTempResult({ number: 0, color: 'green' });

    // Visual roll interval
    const rollInterval = setInterval(() => {
      const rn = Math.floor(Math.random() * 37);
      setTempResult({ number: rn, color: getNumberColor(rn) });
    }, 100);

    // Simulate spin time
    await new Promise(resolve => setTimeout(resolve, 2000));
    clearInterval(rollInterval);

    const resultNumber = Math.floor(Math.random() * 37); // 0-36
    const resultColor = getNumberColor(resultNumber);

    let won = false;
    let winnings = -betAmount;

    if (selectedGuess === resultColor) {
      won = true;
      winnings = selectedGuess === 'green' ? betAmount * 14 : betAmount;
    }

    try {
      await updateBalance(winnings, { wonAmount: won ? winnings : 0, gamePlayed: true });
      setTempResult(null);
      setRollResult({ number: resultNumber, color: resultColor });
      setWinStatus(won ? 'win' : 'lose');
    } catch (error) {
      console.error("Error updating balance:", error);
    } finally {
      setRolling(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end border-b border-slate-800 pb-2">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">サイバー ルーレット</h2>
        <div className="flex gap-2 text-xs">
          <span className="text-red-400 font-bold underline underline-offset-4">HOT</span>
        </div>
      </div>
      
      <div className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
         <div className="z-10 flex flex-col items-center">
            <h3 className="text-lg font-bold mb-6">ベットする色を選択</h3>
            
            {/* Bet Amount */}
            <div className="w-full max-w-sm mb-6">
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">金額</label>
                <div className="flex gap-2">
                  <button onClick={() => setBetAmount(Math.max(10, Math.floor(betAmount / 2)))} className="text-[10px] px-2 py-1 bg-slate-800 rounded font-bold hover:bg-slate-700 text-slate-300 uppercase">半分</button>
                  <button onClick={() => setBetAmount(userData.balance || 10)} className="text-[10px] px-2 py-1 bg-slate-800 rounded font-bold hover:bg-slate-700 text-slate-300 uppercase">最大</button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="font-mono text-red-500 font-bold">$</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max={userData.balance || 0}
                  value={betAmount || ''}
                  onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 text-red-400 font-bold rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-red-500 font-mono text-lg transition-colors"
                />
              </div>
            </div>

            {/* Selection */}
            <div className="w-full max-w-sm grid grid-cols-3 gap-2 mb-8">
              <button
                onClick={() => setSelectedGuess('red')}
                className={`py-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${
                  selectedGuess === 'red'
                    ? 'border-red-500 bg-red-500/20 text-red-400'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-red-500 mb-2"></div>
                <div className="font-black text-sm">RED</div>
                <div className="text-[9px] font-bold uppercase opacity-70">2x</div>
              </button>
              <button
                onClick={() => setSelectedGuess('green')}
                className={`py-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${
                  selectedGuess === 'green'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-emerald-500 mb-2"></div>
                <div className="font-black text-sm">ZERO</div>
                <div className="text-[9px] font-bold uppercase opacity-70">15x</div>
              </button>
              <button
                onClick={() => setSelectedGuess('black')}
                className={`py-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${
                  selectedGuess === 'black'
                    ? 'border-slate-500 bg-slate-700/50 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-700 mb-2"></div>
                <div className="font-black text-sm">BLACK</div>
                <div className="text-[9px] font-bold uppercase opacity-70">2x</div>
              </button>
            </div>

            {/* Action */}
            <button
              onClick={playTurn}
              disabled={!selectedGuess || rolling || betAmount <= 0 || betAmount > userData.balance}
              className="w-full max-w-sm bg-white text-red-700 font-black text-lg py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl active:scale-95 uppercase tracking-wider"
            >
              {rolling ? 'スピン中...' : 'スピン'}
            </button>
            
            {betAmount > userData.balance && (
              <p className="text-rose-400 text-xs font-bold uppercase tracking-widest mt-4 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> 残高不足
              </p>
            )}
            
            {/* Result Area */}
            <AnimatePresence mode="wait">
              {rolling && tempResult !== null && (
                <motion.div
                  key="rolling"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-8 w-full max-w-sm p-4 rounded-xl flex flex-col items-center text-center bg-slate-950 border-slate-700 border"
                >
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className={`text-4xl font-black mb-1 ${tempResult.color === 'red' ? 'text-red-500' : tempResult.color === 'green' ? 'text-emerald-500' : 'text-slate-300'}`}
                  >
                    {tempResult.number}
                  </motion.div>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">
                    スピン中...
                  </div>
                </motion.div>
              )}
              {rollResult && !rolling && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className={`mt-8 w-full max-w-sm p-4 rounded-xl border-l-4 flex flex-col items-center text-center ${
                    winStatus === 'win' 
                      ? 'bg-slate-950 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                      : 'bg-slate-950 border-rose-500 text-rose-400'
                  }`}
                >
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: 720 }}
                    transition={{ type: 'spring', duration: 1 }}
                    className={`text-4xl font-black mb-1 ${rollResult.color === 'red' ? 'text-red-500' : rollResult.color === 'green' ? 'text-emerald-500' : 'text-slate-300'}`}
                  >
                    {rollResult.number}
                  </motion.div>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-1">
                    {winStatus === 'win' ? 'あなたの勝ち！' : 'ディーラーの勝ち'}
                  </div>
                  <div className="font-mono text-sm font-bold flex items-center gap-1">
                    {winStatus === 'win' ? '+' : '-'}${selectedGuess === 'green' && winStatus === 'win' ? betAmount * 14 : betAmount}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
         </div>
      </div>
    </div>
  );
}
