import { useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  checkRedirectAuthResult, 
  logoutUser, 
  testConnection, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { SaveData } from './types';
import { sanitizeSaveData } from './saveManager';

// Timeout promise helper to prevent hanging when Firestore endpoint is blocked by MDM/firewall
function withTimeout<T>(promise: Promise<T>, timeoutMs = 12000, errorMsg = 'タイムアウトしました'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs))
  ]);
}

export function useCloudSave(
  saveData: SaveData,
  onCloudDataLoaded: (cloudData: SaveData) => void
) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const onLoadedRef = useRef(onCloudDataLoaded);
  useEffect(() => {
    onLoadedRef.current = onCloudDataLoaded;
  }, [onCloudDataLoaded]);

  const currentSaveRef = useRef<SaveData>(saveData);
  useEffect(() => {
    currentSaveRef.current = saveData;
  }, [saveData]);

  // Test connection on boot and check redirect results
  useEffect(() => {
    testConnection();
    checkRedirectAuthResult().then((redirectUser) => {
      if (redirectUser) {
        setUser(redirectUser);
      }
    });
  }, []);

  // Helper to remove any undefined fields before sending to Firestore
  const cleanForFirestore = (obj: any): any => {
    return JSON.parse(JSON.stringify(obj, (_, value) => (value === undefined ? null : value)));
  };

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      setIsLoggingIn(false);

      if (currentUser) {
        // Attempt to load cloud save on sign in with timeout guard
        try {
          setSyncing(true);
          setSyncError(null);
          const saveDocRef = doc(db, 'users', currentUser.uid, 'saves', 'default');
          
          const snapshot = await withTimeout(
            getDoc(saveDocRef), 
            15000, 
            'Firestoreサーバーへの接続がタイムアウトしました。'
          );

          if (snapshot.exists()) {
            const data = snapshot.data();
            const sanitized = sanitizeSaveData(data);
            onLoadedRef.current(sanitized);
            setLastSyncedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : 'クラウドから同期済み');
          } else {
            // First time user logged in: upload local save data to cloud
            const currentData = currentSaveRef.current;
            const payload = cleanForFirestore({
              stats: currentData.stats,
              equipment: currentData.equipment,
              inventory: currentData.inventory,
              updatedAt: new Date().toISOString(),
            });
            await withTimeout(
              setDoc(saveDocRef, payload),
              15000,
              'クラウドへのデータ保存がタイムアウトしました。'
            );
            setLastSyncedAt(new Date().toLocaleTimeString());
          }
        } catch (err: any) {
          console.error("Cloud sync load error:", err);
          const msg = err?.message || '';
          if (msg.includes('タイムアウト') || msg.includes('timeout')) {
            setSyncError("⚠️ 通信タイムアウト：MDM・ネットワーク制限または電波状況をご確認ください。「引継ぎコード」での移行も可能です。");
          } else if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
            setSyncError("⚠️ Firestore権限エラー：しばらく待ってから「☁️ 今すぐ保存」をお試しください。");
          } else {
            setSyncError(`クラウドデータの同期に失敗しました: ${msg || '通信エラー'}`);
          }
          try {
            handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}/saves/default`);
          } catch {
            // Error logged
          }
        } finally {
          setSyncing(false);
        }
      } else {
        setSyncing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync to cloud
  const saveToCloud = useCallback(async (dataToSave: SaveData) => {
    const targetUser = user || auth.currentUser;
    if (!targetUser) return;

    try {
      setSyncing(true);
      setSyncError(null);
      const saveDocRef = doc(db, 'users', targetUser.uid, 'saves', 'default');
      const now = new Date().toISOString();
      const payload = cleanForFirestore({
        stats: dataToSave.stats,
        equipment: dataToSave.equipment,
        inventory: dataToSave.inventory,
        updatedAt: now,
      });
      await withTimeout(
        setDoc(saveDocRef, payload),
        15000,
        'クラウド同期がタイムアウトしました。'
      );
      setLastSyncedAt(new Date(now).toLocaleTimeString());
    } catch (err: any) {
      console.error("Cloud save error:", err);
      const msg = err?.message || '';
      if (msg.includes('タイムアウト') || msg.includes('timeout')) {
        setSyncError("⚠️ クラウド保存がタイムアウトしました。MDM・学校等のネットワーク制限をご確認ください。");
      } else if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
        setSyncError("⚠️ Firestoreの書き込み権限エラーが発生しました。");
      } else {
        setSyncError(`クラウド同期エラー: ${msg || '通信に失敗しました'}`);
      }
      try {
        handleFirestoreError(err, OperationType.WRITE, `users/${targetUser.uid}/saves/default`);
      } catch {
        // Error logged
      }
    } finally {
      setSyncing(false);
    }
  }, [user]);

  // Manual fetch from cloud
  const loadFromCloud = useCallback(async () => {
    const targetUser = user || auth.currentUser;
    if (!targetUser) return;

    try {
      setSyncing(true);
      setSyncError(null);
      const saveDocRef = doc(db, 'users', targetUser.uid, 'saves', 'default');
      const snapshot = await withTimeout(
        getDoc(saveDocRef), 
        15000, 
        'クラウドからのデータ読み込みがタイムアウトしました。'
      );

      if (snapshot.exists()) {
        const data = snapshot.data();
        const sanitized = sanitizeSaveData(data);
        onLoadedRef.current(sanitized);
        setLastSyncedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : 'クラウドから同期済み');
      } else {
        setSyncError("クラウド上にセーブデータが見つかりませんでした。");
      }
    } catch (err: any) {
      console.error("Manual cloud load error:", err);
      const msg = err?.message || '';
      setSyncError(`クラウドからの読み込みに失敗しました (${msg || '通信エラー'})`);
    } finally {
      setSyncing(false);
    }
  }, [user]);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setSyncError(null);
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        setUser(loggedInUser);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setIsLoggingIn(false);
      const code = err?.code || '';
      if (code === 'auth/popup-blocked') {
        setSyncError("⚠️ ポップアップがSafari/MDMによりブロックされました。Safariの設定で「ポップアップブロック」を解除するか、設定内の引継ぎコードをご利用ください。");
      } else if (code === 'auth/popup-closed-by-user') {
        setSyncError("ログイン画面がキャンセルされました。");
      } else if (code === 'auth/network-request-failed') {
        setSyncError("⚠️ 通信エラー：MDM・学校・組織のネットワーク制限によりGoogle認証サーバーへのアクセスが拒否されました。引継ぎコード機能をご利用ください。");
      } else if (code === 'auth/unauthorized-domain') {
        setSyncError("⚠️ ドメイン制限：Firebaseの承認済みドメインに登録されていない可能性があります。");
      } else {
        setSyncError(`ログインできませんでした (${err?.message || '認証エラー'})`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setLastSyncedAt(null);
      setSyncing(false);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const clearSyncError = () => setSyncError(null);

  return {
    user,
    loadingAuth,
    isLoggingIn,
    syncing,
    lastSyncedAt,
    syncError,
    clearSyncError,
    saveToCloud,
    loadFromCloud,
    handleLogin,
    handleLogout,
  };
}
