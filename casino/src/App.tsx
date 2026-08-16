/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { LogOut, ArrowRight, AlertCircle, Dices, CircleDashed, Spade, ShieldAlert, Landmark, Target, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType, loginWithEmail, registerWithEmail, loginAsGuest } from './lib/firebase';
import { UserData } from './types';
import DiceGame from './components/DiceGame';
import RouletteGame from './components/RouletteGame';
import PokerGame from './components/PokerGame';
import AdminPanel from './components/AdminPanel';
import Bank from './components/Bank';
import Missions from './components/Missions';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginBonusAmount, setLoginBonusAmount] = useState<number>(0);
  const [showBonusModal, setShowBonusModal] = useState(false);

  const [activeTab, setActiveTab] = useState<'dice' | 'roulette' | 'poker' | 'bank' | 'missions' | 'admin'>('dice');

  useEffect(() => {
    let unsubSnapshot: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        unsubSnapshot = setupUserSnapshot(currentUser);
      } else {
        if (unsubSnapshot) unsubSnapshot();
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  const setupUserSnapshot = (currentUser: User) => {
    const userRef = doc(db, 'users', currentUser.uid);
    const today = new Date().toISOString().split('T')[0];
    const isAdminEmail = currentUser.email === '1919114514yasenpai@gmail.com';

    return onSnapshot(userRef, async (docSnap) => {
      if (docSnap && docSnap.exists()) {
        const data = docSnap.data() as UserData;
        
        let needsUpdate = false;
        let updatePayload: any = {};

        if (data.lastLoginDate !== today) {
          updatePayload.balance = data.balance + 100;
          updatePayload.lastLoginDate = today;
          updatePayload.updatedAt = serverTimestamp();
          needsUpdate = true;
          setLoginBonusAmount(100);
          setShowBonusModal(true);
        }

        if (isAdminEmail && data.role !== 'admin') {
          updatePayload.role = 'admin';
          updatePayload.updatedAt = serverTimestamp();
          needsUpdate = true;
        }

        if (needsUpdate) {
          await updateDoc(userRef, updatePayload).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}`));
          // Snapshot will fire again after update, so we don't need to setUserData manually
        } else {
          setUserData(data);
          setLoading(false);
        }
      } else {
        // Create new user
        const initialBonus = 500;
        const newUserData: UserData = {
          balance: initialBonus,
          debt: 0,
          lastLoginDate: today,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
          email: currentUser.email || 'unknown@example.com',
          role: isAdminEmail ? 'admin' : 'user'
        };
        
        await setDoc(userRef, newUserData).catch(e => handleFirestoreError(e, OperationType.CREATE, `users/${currentUser.uid}`));
        setLoginBonusAmount(initialBonus);
        setShowBonusModal(true);
      }
    }, (error) => {
      console.error("Snapshot error:", error);
      setLoading(false);
    });
  };

  const handleEmailLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (error: any) {
      console.error("Auth failed:", error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('このメールアドレスは既に使用されています。');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('パスワードは6文字以上で入力してください。');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError('メールアドレスまたはパスワードが間違っています。');
      } else {
        setAuthError(error.message || '認証に失敗しました。');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      console.error("ログインに失敗しました:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('user-cancelled')) {
         setAuthError('ログインがキャンセルされました。もう一度お試しください。');
      } else {
         setAuthError(error.message || 'ログインに失敗しました。');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await loginAsGuest();
    } catch (error: any) {
      console.error("ゲストログインに失敗しました:", error);
      setAuthError(error.message || 'ゲストログインに失敗しました。');
    } finally {
      setAuthLoading(false);
    }
  };

  const updateBalance = async (amount: number, statsUpdate?: { wonAmount?: number, gamePlayed?: boolean, debtAmount?: number }) => {
    if (!user || !userData) return;
    const newBalance = userData.balance + amount;
    const newDebt = (userData.debt || 0) + (statsUpdate?.debtAmount || 0);
    const today = new Date().toISOString().split('T')[0];
    
    const updatePayload: any = {
      balance: newBalance,
      debt: newDebt,
      updatedAt: serverTimestamp()
    };

    if (statsUpdate?.gamePlayed) {
      const currentDaily = userData.missions?.daily || {};
      const currentStats = userData.stats || { gamesPlayed: 0, totalWon: 0 };
      
      const isToday = currentDaily.games_played_date === today;
      const newGamesPlayed = isToday ? (currentDaily.games_played || 0) + 1 : 1;
      
      updatePayload['missions.daily.games_played'] = newGamesPlayed;
      updatePayload['missions.daily.games_played_date'] = today;
      updatePayload['stats.gamesPlayed'] = (currentStats.gamesPlayed || 0) + 1;
    }

    if (statsUpdate?.wonAmount && statsUpdate.wonAmount > 0) {
      const currentStats = userData.stats || { gamesPlayed: 0, totalWon: 0 };
      updatePayload['stats.totalWon'] = (currentStats.totalWon || 0) + statsUpdate.wonAmount;
    }

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, updatePayload).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`));

    setUserData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, balance: newBalance, debt: newDebt };
      if (statsUpdate?.gamePlayed || statsUpdate?.wonAmount) {
         if (!next.missions) next.missions = {};
         if (!next.missions.daily) next.missions.daily = {};
         if (!next.stats) next.stats = { gamesPlayed: 0, totalWon: 0 };
         
         if (statsUpdate.gamePlayed) {
            next.missions.daily.games_played = updatePayload['missions.daily.games_played'];
            next.missions.daily.games_played_date = today as any;
            next.stats.gamesPlayed = updatePayload['stats.gamesPlayed'];
         }
         if (statsUpdate.wonAmount && statsUpdate.wonAmount > 0) {
            next.stats.totalWon = updatePayload['stats.totalWon'];
         }
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col bg-[#0f172a] text-slate-200 overflow-hidden font-sans border-[8px] md:border-[12px] border-slate-900">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden m-auto"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="w-12 h-12 bg-emerald-500 rounded-sm rotate-45 flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto mb-8 relative z-10">
            <div className="w-6 h-6 bg-slate-900 rounded-sm"></div>
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase text-white mb-2 relative z-10">ハイローラー <span className="text-emerald-400">カジノ</span></h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8 relative z-10">セキュアログイン</p>
          
          {authError && (
            <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-bold flex items-center justify-center gap-2 relative z-10 text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <div className="space-y-4 mb-8 relative z-10">
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-bold rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-bold rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-3 relative z-10">
            <button
              onClick={handleEmailLogin}
              disabled={authLoading || !email || !password}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              {authLoading ? '接続中...' : (isRegistering ? '新規登録' : 'ログイン')}
              {!authLoading && <ArrowRight className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-xs font-bold text-slate-400 hover:text-emerald-400 uppercase tracking-widest"
            >
              {isRegistering ? 'すでにアカウントをお持ちの方はこちら' : '新規登録はこちら'}
            </button>
            <div className="flex items-center gap-4 my-2">
              <div className="h-px bg-slate-800 flex-1"></div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">OR</span>
              <div className="h-px bg-slate-800 flex-1"></div>
            </div>
            <button
              onClick={handleLogin}
              disabled={authLoading}
              className="w-full bg-white hover:bg-slate-200 text-slate-900 font-black py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
            >
              Googleでログイン
            </button>
            <button
              onClick={handleGuestLogin}
              disabled={authLoading}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
            >
              <UserIcon className="w-4 h-4" /> ゲストとしてお試し
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] text-slate-200">
        <div className="text-rose-400 mb-4 font-bold flex items-center gap-2">
           <AlertCircle className="w-5 h-5" />
           ユーザーデータの取得に失敗しました。
        </div>
        <button onClick={logout} className="bg-slate-800 px-4 py-2 rounded-lg font-bold hover:bg-slate-700">
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#0f172a] text-slate-200 overflow-hidden font-sans border-[8px] md:border-[12px] border-slate-900">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-sm rotate-45 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <div className="w-4 h-4 bg-slate-900 rounded-sm"></div>
          </div>
          <span className="hidden md:inline text-xl font-black tracking-tighter uppercase text-white">ハイローラー <span className="text-emerald-400">カジノ</span></span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-tight">残高</span>
            <span className="text-lg font-mono font-bold text-emerald-400">${userData?.balance.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center gap-3 pl-4 md:pl-6 border-l border-slate-700">
            <button onClick={logout} className="w-10 h-10 rounded-full bg-slate-700 border-2 border-emerald-500 flex items-center justify-center font-bold text-white hover:bg-slate-600 transition-colors" title="ログアウト">
              <LogOut className="w-4 h-4 ml-1" />
            </button>
            <div className="hidden md:flex flex-col">
              <span className="text-sm font-bold text-white leading-none truncate max-w-[120px]">{user.email?.split('@')[0]}</span>
              <span className="text-[10px] text-slate-500 uppercase">プロメンバー</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Viewport Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">
        <div className="flex-1 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Sidebar / Stats */}
          <aside className="md:col-span-4 flex flex-col gap-6">
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">ゲームロビー</h3>
              </div>
              <div className="flex flex-col p-2 space-y-1">
                <button 
                  onClick={() => setActiveTab('dice')}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'dice' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  <Dices className="w-5 h-5" />
                  ハイ/ロー ダイス
                </button>
                <button 
                  onClick={() => setActiveTab('roulette')}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'roulette' ? 'bg-red-500/20 text-red-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  <CircleDashed className="w-5 h-5" />
                  サイバー ルーレット
                </button>
                <button 
                  onClick={() => setActiveTab('poker')}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'poker' ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  <Spade className="w-5 h-5" />
                  ビデオポーカー
                </button>
                
                <button 
                  onClick={() => setActiveTab('bank')}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'bank' ? 'bg-indigo-500/20 text-indigo-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  <Landmark className="w-5 h-5" />
                  中央銀行
                </button>
                <button 
                  onClick={() => setActiveTab('missions')}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'missions' ? 'bg-pink-500/20 text-pink-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  <Target className="w-5 h-5" />
                  ミッション
                </button>
                
                {userData?.role === 'admin' && (
                  <>
                    <div className="h-px bg-slate-800 my-2"></div>
                    <button 
                      onClick={() => setActiveTab('admin')}
                      className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'admin' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                    >
                      <ShieldAlert className="w-5 h-5" />
                      管理者パネル
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">アカウント概要</h3>
              <div className="space-y-4">
                 <div className="p-3 bg-slate-900 border-l-4 border-emerald-500 rounded-r-md flex justify-between items-center">
                   <p className="text-[10px] text-slate-500 uppercase">ステータス</p>
                   <p className="text-sm font-bold text-emerald-400">{userData?.role === 'admin' ? 'ADMIN' : 'MEMBER'}</p>
                 </div>
                 {userData?.debt > 0 && (
                   <div className="p-3 bg-slate-900 border-l-4 border-rose-500 rounded-r-md flex justify-between items-center">
                     <p className="text-[10px] text-slate-500 uppercase">借入残高</p>
                     <p className="text-sm font-bold font-mono text-rose-400">${userData?.debt.toLocaleString()}</p>
                   </div>
                 )}
              </div>
            </div>
            
          </aside>

          {/* Central Game Area */}
          <section className="md:col-span-8 flex flex-col gap-6">
            {activeTab === 'dice' && <DiceGame userData={userData!} updateBalance={updateBalance} />}
            {activeTab === 'roulette' && <RouletteGame userData={userData!} updateBalance={updateBalance} />}
            {activeTab === 'poker' && <PokerGame userData={userData!} updateBalance={updateBalance} />}
            {activeTab === 'bank' && <Bank userData={userData!} updateBalance={updateBalance} />}
            {activeTab === 'missions' && <Missions userData={userData!} updateBalance={updateBalance} />}
            {activeTab === 'admin' && userData?.role === 'admin' && <AdminPanel userData={userData!} updateBalance={updateBalance} />}
          </section>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="h-10 px-4 md:px-8 flex items-center justify-between bg-slate-950 text-[10px] text-slate-600 uppercase font-bold tracking-widest border-t border-slate-900 shrink-0">
        <div className="flex gap-4 md:gap-8">
          <span>Version 2.4.0-Stable</span>
          <span className="hidden md:inline">応答速度: 24ms</span>
        </div>
        <div className="flex gap-4 md:gap-8">
          <span className="hidden md:inline">セキュリティ認証済</span>
          <span className="text-slate-400 italic">健全なプレイを</span>
        </div>
      </footer>

      {/* Login Bonus Modal */}
      <AnimatePresence>
        {showBonusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
              
              <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2 relative z-10">システム報酬</h3>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-tight mb-6 relative z-10">ログインボーナスを獲得しました</p>
              
              <div className="bg-slate-950 rounded-xl py-4 mb-8 border border-slate-800 flex justify-center items-center gap-2 relative z-10">
                <span className="text-3xl font-mono font-bold text-emerald-400">+${loginBonusAmount}</span>
              </div>
              
              <button
                onClick={() => setShowBonusModal(false)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-colors relative z-10"
              >
                確認
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

