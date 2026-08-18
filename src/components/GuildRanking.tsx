import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, setDoc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { generateUid } from '../gameData';

interface Guild {
  id: string;
  name: string;
  leaderId: string;
  weeklyFocusTime: number;
  weekId: string;
  createdAt?: string;
  memberCount: number;
}

interface UserProfile {
  id: string;
  displayName: string;
  guildId: string;
  weeklyFocusTime: number;
  totalFocusTime: number;
}

export const GuildRanking: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newGuildName, setNewGuildName] = useState('');

  const currentWeekId = `2026-W${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`;

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'guilds'), orderBy('weeklyFocusTime', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      const fetchedGuilds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guild));
      
      // Reset out-of-date week guilds locally for display
      const displayGuilds = fetchedGuilds.map(g => 
        g.weekId === currentWeekId ? g : { ...g, weeklyFocusTime: 0, weekId: currentWeekId }
      ).sort((a, b) => b.weeklyFocusTime - a.weeklyFocusTime);
      
      setGuilds(displayGuilds);

      if (auth.currentUser) {
        const profileDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (profileDoc.exists()) {
          setUserProfile({ id: profileDoc.id, ...profileDoc.data() } as UserProfile);
        }
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateGuild = async () => {
    if (!auth.currentUser || !newGuildName.trim()) return;
    const guildId = generateUid();
    const newGuild: Guild = {
      id: guildId,
      name: newGuildName.trim(),
      leaderId: auth.currentUser.uid,
      weeklyFocusTime: 0,
      weekId: currentWeekId,
      memberCount: 1,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'guilds', guildId), newGuild);
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        guildId: guildId,
        displayName: auth.currentUser.displayName || '名無し勇者'
      }, { merge: true });
      fetchData();
      setNewGuildName('');
    } catch (e) {
      console.error(e);
      alert('ギルド作成に失敗しました');
    }
  };

  const handleJoinGuild = async (guildId: string) => {
    if (!auth.currentUser) return;
    try {
      if (userProfile?.guildId) {
        await updateDoc(doc(db, 'guilds', userProfile.guildId), {
          memberCount: increment(-1)
        });
      }
      await updateDoc(doc(db, 'guilds', guildId), {
        memberCount: increment(1)
      });
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        guildId: guildId,
        displayName: auth.currentUser.displayName || '名無し勇者'
      }, { merge: true });
      fetchData();
    } catch (e) {
      console.error(e);
      alert('ギルド加入に失敗しました');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="pixel-panel max-w-xl w-full bg-slate-900 border-2 border-indigo-500 p-5 relative text-slate-100 shadow-[0_0_25px_rgba(99,102,241,0.3)]">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
          <h2 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
            <span>🛡️</span> ギルドランキング (週間集中時間)
          </h2>
          <button onClick={onClose} className="pixel-btn text-xs !bg-slate-800 !py-1 !px-2">閉じる</button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-indigo-400 animate-pulse">読み込み中...</div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {guilds.length === 0 ? (
              <div className="text-center py-10 text-slate-500">まだギルドがありません</div>
            ) : (
              <div className="space-y-2">
                {guilds.map((g, index) => (
                  <div key={g.id} className="flex items-center justify-between bg-slate-950 p-3 border border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 text-center font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-indigo-200">{g.name}</div>
                        <div className="text-[10px] text-slate-400">メンバー: {g.memberCount}人</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-amber-300">{g.weeklyFocusTime} 分</div>
                        <div className="text-[10px] text-slate-500">今週の集中</div>
                      </div>
                      {userProfile?.guildId !== g.id && (
                        <button 
                          onClick={() => handleJoinGuild(g.id)}
                          className="pixel-btn text-[10px] !py-1 !px-2 !bg-emerald-800 !border-emerald-600 hover:!bg-emerald-700"
                        >
                          加入
                        </button>
                      )}
                      {userProfile?.guildId === g.id && (
                        <div className="text-[10px] bg-indigo-900 text-indigo-200 px-2 py-1 border border-indigo-700">
                          所属中
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!userProfile?.guildId && (
              <div className="mt-6 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-slate-300 mb-2">ギルドを設立する</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newGuildName}
                    onChange={(e) => setNewGuildName(e.target.value)}
                    placeholder="ギルド名"
                    maxLength={20}
                    className="pixel-input flex-1 text-sm p-2 bg-slate-950 border border-slate-700 text-slate-200"
                  />
                  <button 
                    onClick={handleCreateGuild}
                    disabled={!newGuildName.trim()}
                    className="pixel-btn text-xs !bg-indigo-700 !border-indigo-500 hover:!bg-indigo-600 disabled:opacity-50"
                  >
                    設立
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
