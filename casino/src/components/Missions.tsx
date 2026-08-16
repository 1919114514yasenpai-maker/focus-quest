import { useState, useEffect } from 'react';
import { Target, Gift, CheckCircle2 } from 'lucide-react';
import { UserData } from '../types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface Props {
  userData: UserData;
  updateBalance: (amount: number) => Promise<void>;
}

export default function Missions({ userData, updateBalance }: Props) {
  const [loading, setLoading] = useState(false);

  const missionsData = userData.missions || {};
  const stats = userData.stats || { gamesPlayed: 0, totalWon: 0 };
  const daily = missionsData.daily || {};
  
  const today = new Date().toISOString().split('T')[0];
  const dailyGamesPlayed = daily.games_played_date === today ? (Number(daily.games_played) || 0) : 0;
  const isDailyGamesCompleted = dailyGamesPlayed >= 10;
  const isDailyGamesClaimed = String(daily.games_played_claimed) === today;

  const isWeeklyWonCompleted = (stats.totalWon || 0) >= 10000;
  const isWeeklyWonClaimed = Boolean(missionsData.weekly?.won_10k_claimed);

  const handleClaim = async (type: string, reward: number) => {
    if (!auth.currentUser) return;
    setLoading(true);
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const updatePayload: any = {
        balance: userData.balance + reward,
        updatedAt: serverTimestamp()
      };

      if (type === 'daily_games') {
        updatePayload['missions.daily.games_played_claimed'] = today;
      } else if (type === 'weekly_won') {
        updatePayload['missions.weekly.won_10k_claimed'] = true;
      }
      
      await updateDoc(userRef, updatePayload);
    } catch (e) {
      console.error("Error claiming reward:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end border-b border-slate-800 pb-2">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">ミッション</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Daily Missions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
          <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
            <Target className="w-4 h-4" /> デイリーミッション
          </h3>
          
          <div className="space-y-4 relative z-10">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-sm font-bold text-white">ゲームを10回プレイする</h4>
                  <p className="text-[10px] text-slate-500">報酬: $500</p>
                </div>
                {isDailyGamesClaimed ? (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> 受取済</span>
                ) : isDailyGamesCompleted ? (
                  <button 
                    onClick={() => handleClaim('daily_games', 500)}
                    disabled={loading}
                    className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded transition-colors flex items-center gap-1"
                  >
                    <Gift className="w-3 h-3"/> 受け取る
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">未達成</span>
                )}
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (dailyGamesPlayed / 10) * 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-right text-slate-500 mt-1">{dailyGamesPlayed} / 10</p>
            </div>
          </div>
        </div>

        {/* Weekly/Monthly Missions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
          <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
            <Target className="w-4 h-4" /> 累積ミッション
          </h3>
          
          <div className="space-y-4 relative z-10">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-sm font-bold text-white">累計 $10,000 勝利する</h4>
                  <p className="text-[10px] text-slate-500">報酬: $5,000</p>
                </div>
                {isWeeklyWonClaimed ? (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> 受取済</span>
                ) : isWeeklyWonCompleted ? (
                  <button 
                    onClick={() => handleClaim('weekly_won', 5000)}
                    disabled={loading}
                    className="text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded transition-colors flex items-center gap-1"
                  >
                    <Gift className="w-3 h-3"/> 受け取る
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">未達成</span>
                )}
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2">
                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, ((stats.totalWon || 0) / 10000) * 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-right text-slate-500 mt-1">${(stats.totalWon || 0).toLocaleString()} / $10,000</p>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
