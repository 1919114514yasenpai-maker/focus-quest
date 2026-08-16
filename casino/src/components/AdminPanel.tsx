import { useState, useEffect } from 'react';
import { ShieldAlert, Coins, Users, UserCog } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserData } from '../types';

interface Props {
  userData: UserData;
  updateBalance: (amount: number) => Promise<void>;
}

export default function AdminPanel({ userData, updateBalance }: Props) {
  const [users, setUsers] = useState<(UserData & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map(d => ({ ...d.data() as UserData, id: d.id }));
      setUsers(usersData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateBalance = async (userId: string, currentBalance: number, amount: number) => {
    setActionLoading(`balance-${userId}`);
    try {
      await updateDoc(doc(db, 'users', userId), {
        balance: currentBalance + amount,
        updatedAt: serverTimestamp()
      });
      await fetchUsers(); // Refresh
      if (userId === 'me') { // If it was their own updateBalance from props... actually we don't have user ID in props. Let's just rely on fetchUsers for UI.
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setActionLoading(`role-${userId}`);
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
      await fetchUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end border-b border-slate-800 pb-2">
        <h2 className="text-sm font-black uppercase tracking-widest text-amber-500">管理者コントロールパネル</h2>
        <button onClick={fetchUsers} className="text-xs bg-slate-800 px-3 py-1 rounded text-slate-300 hover:text-white">更新</button>
      </div>
      
      <div className="group relative bg-slate-900 border border-amber-500/30 rounded-2xl p-6 flex flex-col overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl"></div>
         
         <div className="z-10 flex items-start gap-4 mb-8">
           <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500 border border-amber-500/30">
             <ShieldAlert className="w-8 h-8" />
           </div>
           <div>
             <h3 className="text-lg font-bold text-amber-400">システム権限: ADMIN</h3>
             <p className="text-xs text-slate-400 mt-1">他のユーザーの残高調整や権限の変更が可能です。</p>
           </div>
         </div>

         <div className="z-10 space-y-4">
           {loading ? (
             <div className="text-center text-amber-400 font-bold py-8">読み込み中...</div>
           ) : (
             users.map(u => (
               <div key={u.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between gap-4">
                 <div>
                   <h4 className="text-sm font-bold text-white truncate max-w-[200px]">{u.email}</h4>
                   <p className="text-[10px] text-slate-500 font-mono mt-1">ID: {u.id}</p>
                   <div className="flex gap-2 mt-2">
                     <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-widest ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                       {u.role || 'user'}
                     </span>
                     <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono">
                       ${u.balance?.toLocaleString() || 0}
                     </span>
                     <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold font-mono">
                       借金: ${u.debt?.toLocaleString() || 0}
                     </span>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={() => handleUpdateBalance(u.id, u.balance || 0, 10000)}
                     disabled={actionLoading === `balance-${u.id}`}
                     className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                   >
                     <Coins className="w-3 h-3" />
                     +10k
                   </button>
                   <button 
                     onClick={() => handleUpdateRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                     disabled={actionLoading === `role-${u.id}`}
                     className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-500/30 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                   >
                     <UserCog className="w-3 h-3" />
                     {u.role === 'admin' ? '降格' : '昇格'}
                   </button>
                 </div>
               </div>
             ))
           )}
         </div>
      </div>
    </div>
  );
}
