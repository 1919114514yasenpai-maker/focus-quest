import { useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { 
  signInWithGoogle, 
  checkRedirectAuthResult, 
  logoutUser 
} from './auth';
import { 
  testConnection, 
  handleFirestoreError, 
  OperationType 
} from './error';
import { SaveData } from '../types';
import { compressSaveDataForCloud, decompressCloudSave } from '../compression';

// Timeout promise helper to prevent hanging when Firestore endpoint is blocked by MDM/firewall
function withTimeout<T>(promise: Promise<T>, timeoutMs = 10000, errorMsg = 'タイムアウトしました'): Promise<T> {
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
            25000, 
            'Firestoreサーバーへの接続がタイムアウトしました。'
          );

          if (snapshot.exists()) {
            const data = snapshot.data();
            // 自動解凍（新旧両形式に対応）
            const sanitized = decompressCloudSave(data);
            onLoadedRef.current(sanitized);
            setLastSyncedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : 'クラウドから同期済み');
          } else {
            // First time user logged in: upload compressed local save data to cloud
            const currentData = currentSaveRef.current;
            const compressedPayload = compressSaveDataForCloud(currentData);
            await withTimeout(
              setDoc(saveDocRef, compressedPayload),
              25000,
              'クラウドへのデータ保存がタイムアウトしました。'
            );
            setLastSyncedAt(new Date().toLocaleTimeString());
          }
        } catch (err: any) {
          console.error("Cloud sync load error:", err);
          const msg = err?.message || '';
          if (msg.includes('タイムアウト') || msg.includes('timeout')) {
            setSyncError("⚠️ 通信タイムアウト：ネットワーク制限または電波状況をご確認ください。「引継ぎコード」での移行も可能です。");
          } else if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
            setSyncError("⚠️ Firestore権限エラー：しばらく待ってから「☁️ 今すぐ保存」をお試しください。");
          } else {
            setSyncError("⚠️ クラウドデータ取得に失敗しました。ローカルデータを使用します。");
          }
        } finally {
          setSyncing(false);
        }
      } else {
        setLastSyncedAt(null);
        setSyncError(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Manual or automatic sync save to cloud
  const saveToCloud = useCallback(async (dataToSave?: SaveData) => {
    if (!auth.currentUser) return;
    try {
      setSyncing(true);
      setSyncError(null);
      const data = dataToSave || currentSaveRef.current;
      const saveDocRef = doc(db, 'users', auth.currentUser.uid, 'saves', 'default');
      
      const compressedPayload = compressSaveDataForCloud(data);

      await withTimeout(
        setDoc(saveDocRef, compressedPayload),
        25000,
        'クラウドへの保存がタイムアウトしました。'
      );
      setLastSyncedAt(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Manual cloud sync error:", err);
      const msg = err?.message || '';
      if (msg.includes('タイムアウト') || msg.includes('timeout')) {
        setSyncError("⚠️ 保存タイムアウト：ネットワーク制限または電波状況をご確認ください。");
      } else if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
        setSyncError("⚠️ Firestore権限エラー：しばらく待ってからもう一度お試しください。");
      } else {
        setSyncError("⚠️ クラウド保存に失敗しました。");
      }
    } finally {
      setSyncing(false);
    }
  }, []);

  // Force pull from cloud
  const pullFromCloud = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      setSyncing(true);
      setSyncError(null);
      const saveDocRef = doc(db, 'users', auth.currentUser.uid, 'saves', 'default');
      const snapshot = await withTimeout(
        getDoc(saveDocRef),
        25000,
        'Firestoreサーバーへの接続がタイムアウトしました。'
      );
      if (snapshot.exists()) {
        const data = snapshot.data();
        const sanitized = decompressCloudSave(data);
        onLoadedRef.current(sanitized);
        setLastSyncedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : 'クラウドから再取得済み');
      } else {
        setSyncError("⚠️ クラウド上にセーブデータが見つかりませんでした。");
      }
    } catch (err: any) {
      console.error("Force pull error:", err);
      const msg = err?.message || '';
      if (msg.includes('タイムアウト') || msg.includes('timeout')) {
        setSyncError("⚠️ 取得タイムアウト：ネットワーク状況をご確認ください。");
      } else {
        setSyncError("⚠️ クラウドデータの取得に失敗しました。");
      }
    } finally {
      setSyncing(false);
    }
  }, []);

  const login = async () => {
    try {
      setIsLoggingIn(true);
      setSyncError(null);
      const loggedUser = await signInWithGoogle();
      if (loggedUser) {
        setUser(loggedUser);
      }
    } catch (err: any) {
      console.error("Login attempt error:", err);
      setIsLoggingIn(false);
      const msg = err?.message || '';
      if (msg.includes('popup-blocked')) {
        setSyncError("⚠️ ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。");
      } else if (msg.includes('network-request-failed')) {
        setSyncError("⚠️ ネットワーク接続エラー：インターネット接続をご確認ください。");
      } else {
        setSyncError("⚠️ ログインに失敗しました。");
      }
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setLastSyncedAt(null);
      setSyncError(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return {
    user,
    loadingAuth,
    isLoggingIn,
    syncing,
    lastSyncedAt,
    syncError,
    saveToCloud,
    pullFromCloud,
    loadFromCloud: pullFromCloud,
    login,
    logout,
    handleLogin: login,
    handleLogout: logout,
    clearSyncError: () => setSyncError(null),
  };
}
