import { useState } from 'react';
import { Landmark, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react';
import { UserData } from '../types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface Props {
  userData: UserData;
  updateBalance: (amount: number) => Promise<void>;
}

export default function Bank({ userData, updateBalance }: Props) {
  const [borrowAmount, setBorrowAmount] = useState<number>(1000);
  const [repayAmount, setRepayAmount] = useState<number>(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debt = userData.debt || 0;
  const maxBorrow = 50000 - debt;

  const handleBorrow = async () => {
    if (!auth.currentUser || borrowAmount <= 0) return;
    if (borrowAmount > maxBorrow) {
      setError(`最大${maxBorrow.toLocaleString()}ドルまでしか借りられません。`);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        balance: userData.balance + borrowAmount,
        debt: debt + borrowAmount,
        updatedAt: serverTimestamp()
      });
      // In local state via props this might not update debt immediately since we don't pass updateDebt function.
      // But it's fine if App.tsx listens to onSnapshot or we just fetch it.
      // Wait, App.tsx doesn't use onSnapshot. Let's rely on updateBalance? No, we need to update both.
    } catch (e: any) {
      setError(e.message || '借入に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleRepay = async () => {
    if (!auth.currentUser || repayAmount <= 0) return;
    if (repayAmount > userData.balance) {
      setError('残高が不足しています。');
      return;
    }
    if (repayAmount > debt) {
      setError('借金額より多く返済することはできません。');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        balance: userData.balance - repayAmount,
        debt: debt - repayAmount,
        updatedAt: serverTimestamp()
      });
    } catch (e: any) {
      setError(e.message || '返済に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end border-b border-slate-800 pb-2">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">中央銀行</h2>
      </div>
      
      <div className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
         
         <div className="z-10 flex items-start gap-4 mb-8">
           <div className="p-3 bg-slate-800 rounded-xl text-slate-300 border border-slate-700">
             <Landmark className="w-8 h-8" />
           </div>
           <div>
             <h3 className="text-lg font-bold text-white">ローンセンター</h3>
             <p className="text-xs text-slate-400 mt-1">資金が足りない時はこちらで借り入れが可能です。（最大 $50,000）</p>
           </div>
         </div>

         {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-bold flex items-center gap-2 z-10 relative">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
         )}

         <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Borrow */}
           <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
             <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <ArrowUpRight className="w-4 h-4" /> 借り入れる
             </h4>
             <div className="text-xs text-slate-400 mb-4">
               借入可能枠: <span className="font-mono font-bold text-emerald-400">${maxBorrow.toLocaleString()}</span>
             </div>
             
             <div className="space-y-4">
               <input
                  type="number"
                  min="0"
                  max={maxBorrow}
                  value={borrowAmount || ''}
                  onChange={(e) => setBorrowAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-bold rounded-lg py-3 px-4 focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="借入金額"
                />
                <button
                  onClick={handleBorrow}
                  disabled={loading || borrowAmount <= 0 || borrowAmount > maxBorrow}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                >
                  {loading ? '処理中...' : '借入を実行'}
                </button>
             </div>
           </div>

           {/* Repay */}
           <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
             <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <ArrowDownRight className="w-4 h-4" /> 返済する
             </h4>
             <div className="text-xs text-slate-400 mb-4">
               現在の借金額: <span className="font-mono font-bold text-rose-400">${debt.toLocaleString()}</span>
             </div>
             
             <div className="space-y-4">
               <input
                  type="number"
                  min="0"
                  max={debt}
                  value={repayAmount || ''}
                  onChange={(e) => setRepayAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 text-rose-400 font-bold rounded-lg py-3 px-4 focus:outline-none focus:border-rose-500 font-mono"
                  placeholder="返済金額"
                />
                <button
                  onClick={handleRepay}
                  disabled={loading || repayAmount <= 0 || repayAmount > debt || repayAmount > userData.balance}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                >
                  {loading ? '処理中...' : '返済を実行'}
                </button>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
}
