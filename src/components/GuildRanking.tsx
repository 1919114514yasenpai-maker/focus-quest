import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, setDoc, updateDoc, increment, getDoc, where, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { generateUid } from '../gameData';
import { ItemIcon } from './Inventory';
import { ITEMS } from '../gameData';
import { PlayerItem } from '../types';
import { getCompiledItem } from '../itemUtils';

interface Guild {
  id: string;
  name: string;
  leaderId: string;
  weeklyFocusTime: number;
  weekId: string;
  memberCount: number;
  createdAt?: string;
  isPrivate?: boolean;
  inviteCode?: string;
  electionEndTime?: number;
}

interface UserProfile {
  id: string;
  displayName: string;
  guildId: string;
  weeklyFocusTime: number;
  totalFocusTime: number;
}

interface Vote {
  candidateId: string;
}

interface GuildRankingProps {
  onClose: () => void;
  inventory: PlayerItem[];
  onEngrave: (uid: string, text: string) => void;
}

export const GuildRanking: React.FC<GuildRankingProps> = ({ onClose, inventory, onEngrave }) => {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newGuildName, setNewGuildName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  
  const [myGuild, setMyGuild] = useState<Guild | null>(null);
  const [myGuildMembers, setMyGuildMembers] = useState<UserProfile[]>([]);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [iVotedFor, setIVotedFor] = useState<string | null>(null);
  const [showEngraveModal, setShowEngraveModal] = useState(false);

  const currentWeekId = `2026-W${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`;

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'guilds'), orderBy('weeklyFocusTime', 'desc'), limit(15));
      const snapshot = await getDocs(q);
      const fetchedGuilds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guild));
      
      const displayGuilds = fetchedGuilds.map(g => 
        g.weekId === currentWeekId ? g : { ...g, weeklyFocusTime: 0, weekId: currentWeekId }
      ).filter(g => !g.isPrivate).sort((a, b) => b.weeklyFocusTime - a.weeklyFocusTime).slice(0, 10);
      
      setGuilds(displayGuilds);

      if (auth.currentUser) {
        const profileDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (profileDoc.exists()) {
          const profile = { id: profileDoc.id, ...profileDoc.data() } as UserProfile;
          setUserProfile(profile);

          if (profile.guildId) {
            const mgDoc = await getDoc(doc(db, 'guilds', profile.guildId));
            if (mgDoc.exists()) {
              const mg = { id: mgDoc.id, ...mgDoc.data() } as Guild;
              setMyGuild(mg);
              
              const memQ = query(collection(db, 'users'), where('guildId', '==', profile.guildId));
              const memSnap = await getDocs(memQ);
              setMyGuildMembers(memSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));

              if (mg.electionEndTime && mg.electionEndTime > Date.now()) {
                const votesQ = query(collection(db, 'guilds', profile.guildId, 'votes'));
                const votesSnap = await getDocs(votesQ);
                const voteCounts: Record<string, number> = {};
                let myVote = null;
                votesSnap.forEach(v => {
                  const data = v.data() as Vote;
                  voteCounts[data.candidateId] = (voteCounts[data.candidateId] || 0) + 1;
                  if (v.id === auth.currentUser?.uid) myVote = data.candidateId;
                });
                setMyVotes(voteCounts);
                setIVotedFor(myVote);
              } else if (mg.electionEndTime && mg.electionEndTime <= Date.now()) {
                // Election over, resolve it if possible
                resolveElection(profile.guildId);
              }
            } else {
              // Guild document was deleted in Firestore, reset user profile
              await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                guildId: ''
              });
              setUserProfile(prev => prev ? { ...prev, guildId: '' } : null);
              setMyGuild(null);
              setMyGuildMembers([]);
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const resolveElection = async (gId: string) => {
    try {
      const votesQ = query(collection(db, 'guilds', gId, 'votes'));
      const votesSnap = await getDocs(votesQ);
      const voteCounts: Record<string, number> = {};
      votesSnap.forEach(v => {
        const data = v.data() as Vote;
        voteCounts[data.candidateId] = (voteCounts[data.candidateId] || 0) + 1;
      });
      let winner = '';
      let maxVotes = -1;
      for (const [candId, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
          maxVotes = count;
          winner = candId;
        }
      }
      if (winner) {
        await updateDoc(doc(db, 'guilds', gId), {
          leaderId: winner,
          electionEndTime: 0
        });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateGuild = async () => {
    if (!auth.currentUser) {
      alert('ギルドを作成するにはログインが必要です');
      return;
    }
    if (!newGuildName.trim()) {
      alert('ギルド名を入力してください');
      return;
    }
    if (isPrivate && !inviteCode.trim()) {
      alert('プライベートギルドには招待コードが必要です');
      return;
    }
    const guildId = generateUid();
    const newGuild: Guild = {
      id: guildId,
      name: newGuildName.trim(),
      leaderId: auth.currentUser.uid,
      weeklyFocusTime: 0,
      weekId: currentWeekId,
      memberCount: 1,
      createdAt: new Date().toISOString(),
      isPrivate,
      inviteCode: isPrivate ? inviteCode.trim() : ''
    };
    try {
      // 1. Create the guild document
      await setDoc(doc(db, 'guilds', guildId), newGuild);

      // 2. Decrement old guild if changing from another guild
      if (userProfile?.guildId && userProfile.guildId !== guildId) {
        try {
          const oldGuildRef = doc(db, 'guilds', userProfile.guildId);
          const oldSnap = await getDoc(oldGuildRef);
          if (oldSnap.exists()) {
            const count = oldSnap.data()?.memberCount || 1;
            await updateDoc(oldGuildRef, {
              memberCount: Math.max(0, count - 1)
            });
          }
        } catch (err) {
          console.warn('Failed to decrement old guild:', err);
        }
      }

      // 3. Ensure user document is properly created/merged
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          displayName: auth.currentUser.displayName || '名無し勇者',
          weeklyFocusTime: 0,
          weekId: currentWeekId,
          totalFocusTime: 0,
          guildId: guildId
        });
      } else {
        await setDoc(userRef, {
          displayName: auth.currentUser.displayName || userSnap.data()?.displayName || '名無し勇者',
          guildId: guildId
        }, { merge: true });
      }

      setNewGuildName('');
      setInviteCode('');
      await fetchData();
      alert(`✨ ギルド「${newGuild.name}」を設立しました！`);
    } catch (e: any) {
      console.error('Guild create error:', e);
      alert(`ギルド作成に失敗しました: ${e?.message || e}`);
    }
  };

  const handleJoinGuild = async (guildId: string, checkCode?: string) => {
    if (!auth.currentUser) {
      alert('ギルドに加入するにはログインが必要です');
      return;
    }
    try {
      const targetGuildDoc = await getDoc(doc(db, 'guilds', guildId));
      if (!targetGuildDoc.exists()) {
        alert('ギルドが見つかりませんでした');
        return;
      }
      const tg = targetGuildDoc.data() as Guild;
      
      if (tg.memberCount >= 10) {
        alert('このギルドは満員(10人)です！');
        return;
      }
      if (tg.isPrivate && tg.inviteCode !== checkCode) {
        alert('招待コードが間違っています！');
        return;
      }

      if (userProfile?.guildId === guildId) {
        alert('既にこのギルドに加入しています');
        return;
      }

      // 1. Decrement old guild if changing
      if (userProfile?.guildId) {
        try {
          const oldGuildRef = doc(db, 'guilds', userProfile.guildId);
          const oldSnap = await getDoc(oldGuildRef);
          if (oldSnap.exists()) {
            const count = oldSnap.data()?.memberCount || 1;
            await updateDoc(oldGuildRef, {
              memberCount: Math.max(0, count - 1)
            });
          }
        } catch (err) {
          console.warn('Failed to decrement old guild:', err);
        }
      }

      // 2. Increment new guild
      const currentCount = tg.memberCount || 0;
      const updateData: any = {
        memberCount: currentCount + 1
      };
      if (!tg.leaderId) {
        updateData.leaderId = auth.currentUser.uid;
      }
      await updateDoc(doc(db, 'guilds', guildId), updateData);

      // 3. Update user document
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          displayName: auth.currentUser.displayName || '名無し勇者',
          weeklyFocusTime: 0,
          weekId: currentWeekId,
          totalFocusTime: 0,
          guildId: guildId
        });
      } else {
        await setDoc(userRef, {
          displayName: auth.currentUser.displayName || userSnap.data()?.displayName || '名無し勇者',
          guildId: guildId
        }, { merge: true });
      }

      await fetchData();
      alert(`✨ ギルド「${tg.name}」に加入しました！`);
    } catch (e: any) {
      console.error('Guild join error:', e);
      alert(`ギルド加入に失敗しました: ${e?.message || e}`);
    }
  };

  const handleJoinPrivate = async () => {
    if (!joinCodeInput.trim()) return;
    try {
      const q = query(collection(db, 'guilds'), where('inviteCode', '==', joinCodeInput.trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert('該当するギルドが見つかりません');
        return;
      }
      const g = snap.docs[0];
      handleJoinGuild(g.id, joinCodeInput.trim());
    } catch(e) {
      console.error(e);
    }
  };

  const handleLeaveGuild = async () => {
    if (!auth.currentUser || !userProfile?.guildId || !myGuild) return;
    
    try {
      if (myGuild.leaderId === auth.currentUser.uid) {
        if (myGuildMembers.length <= 1) {
          // Dissolve
          await deleteDoc(doc(db, 'guilds', myGuild.id));
        } else {
          // Trigger election
          await updateDoc(doc(db, 'guilds', myGuild.id), {
            electionEndTime: Date.now() + 24 * 60 * 60 * 1000,
            memberCount: increment(-1)
          });
        }
      } else {
        await updateDoc(doc(db, 'guilds', myGuild.id), {
          memberCount: increment(-1)
        });
      }
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        guildId: ''
      }, { merge: true });
      setMyGuild(null);
      setMyGuildMembers([]);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleKickMember = async (memberId: string) => {
    if (!myGuild || myGuild.leaderId !== auth.currentUser?.uid) return;
    if (confirm('本当にこのメンバーを追放しますか？')) {
      try {
        await updateDoc(doc(db, 'guilds', myGuild.id), {
          memberCount: increment(-1)
        });
        await setDoc(doc(db, 'users', memberId), {
          guildId: ''
        }, { merge: true });
        fetchData();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleVote = async (candidateId: string) => {
    if (!myGuild || !auth.currentUser) return;
    try {
      await setDoc(doc(db, 'guilds', myGuild.id, 'votes', auth.currentUser.uid), {
        candidateId
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="pixel-panel max-w-4xl w-full bg-slate-900 border-2 border-indigo-500 p-3 sm:p-5 relative text-slate-100 shadow-[0_0_25px_rgba(99,102,241,0.3)] h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2 flex-shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-indigo-300 flex items-center gap-2">
            <span>🛡️</span> ギルド (上限10人)
          </h2>
          <button onClick={onClose} className="pixel-btn text-xs !bg-slate-800 !py-1 !px-2">閉じる</button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-indigo-400 animate-pulse flex-1">読み込み中...</div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 flex-1 overflow-hidden">
            {/* Left Col: Rankings / Create */}
            <div className="flex-1 flex flex-col overflow-y-auto pr-2 border-b sm:border-b-0 sm:border-r border-slate-700 pb-4 sm:pb-0 sm:pr-4">
              <h3 className="text-sm font-bold text-slate-300 mb-2">🏆 トップギルド</h3>
              {guilds.length === 0 ? (
                <div className="text-center py-6 px-4 bg-slate-950/60 border border-slate-800 rounded text-slate-400 text-xs mb-4">
                  まだ公開ギルドがありません。<br/>
                  <span className="text-[11px] text-indigo-300 mt-1 inline-block">左下から最初のギルドを設立してみましょう！</span>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {guilds.map((g, index) => (
                    <div key={g.id} className="flex items-center justify-between bg-slate-950 p-2 sm:p-3 border border-slate-700">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-4 sm:w-6 text-center font-bold text-xs sm:text-sm ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-indigo-200">{g.name}</div>
                          <div className="text-[9px] sm:text-[10px] text-slate-400">メンバー: {g.memberCount}/10</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <div className="text-right">
                          <div className="font-bold text-amber-300 text-xs sm:text-sm">{g.weeklyFocusTime} 分</div>
                        </div>
                        {userProfile?.guildId !== g.id && (
                          <button 
                            onClick={() => handleJoinGuild(g.id)}
                            className="pixel-btn text-[9px] sm:text-[10px] !py-1 !px-2 !bg-emerald-800 !border-emerald-600 hover:!bg-emerald-700"
                          >
                            加入
                          </button>
                        )}
                        {userProfile?.guildId === g.id && (
                          <div className="text-[9px] sm:text-[10px] bg-indigo-900 text-indigo-200 px-1 sm:px-2 py-1 border border-indigo-700">
                            所属中
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!userProfile?.guildId && (
                <div className="mt-auto pt-4 border-t border-slate-800">
                  <h3 className="text-sm font-bold text-slate-300 mb-2">コードで加入</h3>
                  <div className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      placeholder="招待コード"
                      className="pixel-input flex-1 text-xs sm:text-sm p-1.5 sm:p-2 bg-slate-950 border border-slate-700 text-slate-200"
                    />
                    <button 
                      onClick={handleJoinPrivate}
                      disabled={!joinCodeInput.trim()}
                      className="pixel-btn text-xs !bg-emerald-700 !border-emerald-500 hover:!bg-emerald-600 disabled:opacity-50"
                    >
                      加入
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-300 mb-2">ギルド設立</h3>
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      value={newGuildName}
                      onChange={(e) => setNewGuildName(e.target.value)}
                      placeholder="ギルド名"
                      maxLength={20}
                      className="pixel-input w-full text-xs sm:text-sm p-1.5 sm:p-2 bg-slate-950 border border-slate-700 text-slate-200"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-xs flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
                        非公開
                      </label>
                      {isPrivate && (
                        <input 
                          type="text" 
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          placeholder="招待コード設定"
                          maxLength={20}
                          className="pixel-input flex-1 text-xs p-1 sm:p-1.5 bg-slate-950 border border-slate-700 text-slate-200"
                        />
                      )}
                    </div>
                    <button 
                      onClick={handleCreateGuild}
                      disabled={!newGuildName.trim() || (isPrivate && !inviteCode.trim())}
                      className="pixel-btn text-xs w-full !bg-indigo-700 !border-indigo-500 hover:!bg-indigo-600 disabled:opacity-50"
                    >
                      設立
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: My Guild */}
            <div className="flex-1 flex flex-col overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-300 mb-2">👤 あなたのギルド</h3>
              {!myGuild ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  ギルドに所属していません。<br/>左から加入するか設立してください。
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-3 sm:p-4 border border-indigo-900 rounded-lg shadow-inner">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-indigo-300 text-sm sm:text-base">{myGuild.name}</h4>
                        <p className="text-[10px] sm:text-xs text-slate-400">
                          {myGuild.isPrivate ? `🔒 非公開 (コード: ${myGuild.inviteCode})` : '🌐 公開ギルド'}
                        </p>
                      </div>
                      <button onClick={handleLeaveGuild} className="pixel-btn text-[10px] !py-1 !px-2 !bg-rose-900 !border-rose-700 hover:!bg-rose-800">
                        {myGuild.leaderId === auth.currentUser?.uid && myGuildMembers.length > 1 ? '解散・引退する' : '脱退する'}
                      </button>
                    </div>
                    <div className="mt-2 text-right">
                      <button 
                        onClick={() => setShowEngraveModal(true)} 
                        className="pixel-btn text-[10px] !py-1 !px-2 !bg-indigo-700 hover:!bg-indigo-600"
                      >
                        🛡️ 武具にギルド名を刻印する
                      </button>
                    </div>
                    
                    {myGuild.electionEndTime && myGuild.electionEndTime > Date.now() && (
                      <div className="mt-2 p-2 bg-amber-950/50 border border-amber-700 rounded text-xs text-amber-200">
                        <p className="font-bold mb-1">📢 リーダー選出投票中！</p>
                        <p className="text-[10px] opacity-80 mb-2">前リーダーが引退しました。新たなリーダーに投票してください。</p>
                      </div>
                    )}

                    <div className="mt-4">
                      <p className="text-xs font-bold text-slate-300 mb-2">メンバー ({myGuildMembers.length}/10)</p>
                      <div className="space-y-1">
                        {myGuildMembers.map(m => {
                          const isLeader = m.id === myGuild.leaderId;
                          const isMe = m.id === auth.currentUser?.uid;
                          const votes = myVotes[m.id] || 0;
                          const isElection = myGuild.electionEndTime && myGuild.electionEndTime > Date.now();
                          
                          return (
                            <div key={m.id} className={`flex items-center justify-between p-2 text-xs border ${isMe ? 'bg-indigo-950/30 border-indigo-800/50' : 'bg-slate-900/50 border-slate-800/50'}`}>
                              <div className="flex items-center gap-2">
                                {isLeader && <span title="リーダー">👑</span>}
                                <span className={isMe ? 'text-indigo-200 font-bold' : 'text-slate-300'}>{m.displayName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-amber-300/80">{m.weeklyFocusTime}分</span>
                                
                                {isElection && !isLeader && (
                                  <div className="flex items-center gap-1 ml-2">
                                    <span className="text-[9px] text-slate-400">票:{votes}</span>
                                    {iVotedFor !== m.id && (
                                      <button onClick={() => handleVote(m.id)} className="pixel-btn text-[9px] !py-0.5 !px-1.5 !bg-sky-800 hover:!bg-sky-700">投票</button>
                                    )}
                                    {iVotedFor === m.id && <span className="text-[9px] text-sky-300 border border-sky-700 px-1 rounded">投票済</span>}
                                  </div>
                                )}
                                
                                {myGuild.leaderId === auth.currentUser?.uid && !isMe && !isElection && (
                                  <button onClick={() => handleKickMember(m.id)} className="text-[10px] text-rose-500 hover:text-rose-400 ml-2">追放</button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showEngraveModal && myGuild && (
        <div className="absolute inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="pixel-panel border-indigo-500 bg-slate-900 p-4 max-w-md w-full max-h-[80vh] flex flex-col">
            <h3 className="text-sm font-bold text-indigo-300 mb-2">🛡️ 刻印するアイテムを選択</h3>
            <p className="text-[10px] text-slate-400 mb-4">現在所持している装備にギルド名を刻印できます。</p>
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {inventory.filter(i => {
                const b = ITEMS[i.baseId];
                return b && (b.type === 'weapon' || b.type === 'armor');
              }).length === 0 && (
                <div className="text-center text-slate-500 text-xs py-4">刻印可能な装備（武器・防具）を持っていません</div>
              )}
              {inventory
                .filter(i => {
                  const b = ITEMS[i.baseId];
                  return b && (b.type === 'weapon' || b.type === 'armor');
                })
                .map(item => {
                  const myRankIndex = guilds.findIndex(g => g.id === myGuild.id);
                  const rankText = myRankIndex !== -1 ? ` (${myRankIndex + 1}位)` : '';
                  const engraveText = `${myGuild.name}${rankText}`;
                  const isAlreadyEngraved = item.engraving === engraveText;
                  const compiled = getCompiledItem(item) || {
                    ...ITEMS[item.baseId],
                    id: item.baseId,
                    name: ITEMS[item.baseId]?.name || '装備',
                    power: 0,
                    price: 0,
                    color: '#94a3b8',
                    type: 'weapon' as const,
                  };

                  return (
                    <div key={item.uid} className="bg-slate-950 border border-slate-700 p-2 flex items-center justify-between gap-2 rounded">
                      <div className="flex items-center gap-2 min-w-0">
                        <ItemIcon item={{ ...compiled, id: item.baseId }} />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-200 truncate">{compiled.name}</div>
                          {item.engraving ? (
                            <div className="text-[9px] text-indigo-400 truncate">現在の刻印: {item.engraving}</div>
                          ) : (
                            <div className="text-[9px] text-slate-500">未刻印</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onEngrave(item.uid, engraveText);
                          setShowEngraveModal(false);
                        }}
                        disabled={isAlreadyEngraved}
                        className={`pixel-btn text-[10px] !py-1 !px-2.5 flex-shrink-0 ${
                          isAlreadyEngraved ? 'opacity-50 !bg-slate-800' : '!bg-indigo-700 hover:!bg-indigo-600'
                        }`}
                      >
                        {isAlreadyEngraved ? '刻印済' : '刻印する'}
                      </button>
                    </div>
                  );
                })}
            </div>
            <button onClick={() => setShowEngraveModal(false)} className="pixel-btn !bg-slate-800">閉じる</button>
          </div>
        </div>
      )}

    </div>
  );
};
