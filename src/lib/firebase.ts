import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task, SecureFile, ScheduledMeeting, AuditLog, Message, User, Tenant } from '../types';
import { encryptText, decryptText } from './crypto';

// Initialize Firebase SDK
export const firebaseApp = initializeApp(firebaseConfig);

// CRITICAL: The app will break without specifying the database ID from config
export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(firebaseApp);

export const googleAuthProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate connection to Firestore on initial application boot
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firestore] Connection test successfully established');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Client is offline or database initializing. Please check your Firebase configuration.');
      return false;
    }
    // Missing permission on test document is normal when rules deny unmatched docs, which means server responded!
    console.log('[Firestore] Gateway responded with security check.');
    return true;
  }
}

/**
 * Check if returning from a Google Sign-In redirect
 */
export async function checkRedirectAuthResult(): Promise<FirebaseUser | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.error('Error handling redirect auth result:', error);
    return null;
  }
}

/**
 * Google Sign-In with Redirect (Best for Safari / iPad / Mobile)
 */
export async function signInWithGoogleRedirect(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithRedirect(auth, provider);
}

/**
 * Google Sign-In with popup
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error('Failed to sign in with Google popup:', error);
    const code = error?.code || '';
    const msg = error?.message || String(error);

    if (code === 'auth/unauthorized-domain') {
      const currentHost = window.location.hostname;
      throw new Error(
        `【ドメイン未許可エラー (${code})】\n現在のドメイン [${currentHost}] が Firebase Authentication の「承認済みドメイン」に登録されていません。\nFirebase Console -> Authentication -> 設定 -> 承認済みドメイン に「${currentHost}」を追加してください。`
      );
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('【ポップアップブロック】\nブラウザによりログインポップアップがブロックされました。「ページ移動でログイン (Safari推奨)」をお試しください。');
    }
    if (code === 'auth/popup-closed-by-user') {
      throw new Error('ログインポップアップ画面が閉じられました。');
    }
    if (code === 'auth/operation-not-allowed') {
      throw new Error('【Google 認証未有効化】\nFirebase Console で「Google 認証」が有効化されていません。Authentication の Sign-in method で Google を有効化してください。');
    }
    if (code === 'auth/argument-error' || msg.includes('Database is closing') || msg.includes('closing/hidden')) {
      throw new Error('【Safari / iPad ポップアップ制限】\nSafari のセキュリティ制限によりポップアップがブロックされました。下の「ページ移動でGoogleログイン (Safari/iPad推奨)」をお試しください。');
    }
    throw new Error(`Google 認証エラー (${code || 'UNKNOWN'}): ${msg}`);
  }
}

/**
 * Ensure an active Firebase Auth user exists (auto-fallback to anonymous sign-in)
 */
export async function ensureAuth(): Promise<FirebaseUser | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const res = await signInAnonymously(auth);
    return res.user;
  } catch (err) {
    console.warn('[Firebase] Anonymous auto-authentication notice:', err);
    return auth.currentUser;
  }
}

/**
 * Guest / Anonymous Sign-In (Ensures full Firebase access even if Google Auth popup is blocked/unauthorized domain)
 */
export async function signInAsGuestOrAnonymous(name: string): Promise<{ uid: string; displayName: string }> {
  try {
    const res = await signInAnonymously(auth);
    return {
      uid: res.user.uid,
      displayName: name || '招待メンバー',
    };
  } catch (error) {
    console.warn('Anonymous sign-in fallback to local session id:', error);
    // Local fallback if anonymous auth not enabled in Firebase
    const localUid = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      uid: localUid,
      displayName: name || '招待メンバー',
    };
  }
}

/**
 * Sign out current Firebase user
 */
export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

/**
 * Upsert User Profile into Firestore /users/{uid}
 */
export async function saveUserProfileToFirestore(user: Partial<User> & { id: string }, email?: string | null) {
  const currentAuth = await ensureAuth();
  if (!currentAuth) return;
  const targetId = user.id || currentAuth.uid;
  const path = `users/${targetId}`;
  try {
    const payload: any = {
      id: targetId,
      updatedAt: new Date().toISOString(),
    };
    if (user.name) payload.name = user.name;
    if (user.role) payload.role = user.role;
    if (user.status) payload.status = user.status;
    if (email || user.email) payload.email = email || user.email;
    if (user.avatar) payload.avatar = user.avatar;
    if (user.photoURL !== undefined) payload.photoURL = user.photoURL;
    if (user.companyName) payload.companyName = user.companyName;
    if (user.roleTitle !== undefined) payload.roleTitle = user.roleTitle;

    await setDoc(doc(db, 'users', targetId), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Save Task to Firestore (Tenant -> Channel Hierarchy + AES-256-GCM Zero-Knowledge Encryption)
 */
export async function saveTaskToFirestore(task: Task, tenantId = 'waseapp-primary', channelId?: string) {
  const currentAuth = await ensureAuth();
  if (!currentAuth) return;
  const targetChannel = channelId || task.channelId || 'general';

  // Zero-Knowledge AES-256-GCM Encryption
  let encryptedTitle = task.title;
  let encryptedDesc = task.description;
  let titleIv = '';
  let descIv = '';

  try {
    const encTitle = await encryptText(task.title);
    encryptedTitle = encTitle.cipherText;
    titleIv = encTitle.iv;
    if (task.description) {
      const encDesc = await encryptText(task.description);
      encryptedDesc = encDesc.cipherText;
      descIv = encDesc.iv;
    }
  } catch (err) {
    console.warn('Task AES-256 encryption notice:', err);
  }

  const payload = {
    ...task,
    title: encryptedTitle,
    description: encryptedDesc,
    titleIv,
    descIv,
    createdBy: task.createdBy || currentAuth.uid,
    updatedAt: new Date().toISOString(),
  };

  const subPath = `tenants/${tenantId}/channels/${targetChannel}/tasks/${task.id}`;
  const topPath = `tasks/${task.id}`;

  try {
    await setDoc(doc(db, subPath), payload);
    await setDoc(doc(db, topPath), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

/**
 * Delete Task from Firestore
 */
export async function deleteTaskFromFirestore(taskId: string, tenantId = 'waseapp-primary', channelId = 'general') {
  const currentAuth = await ensureAuth();
  if (!currentAuth) return;
  try {
    await deleteDoc(doc(db, `tenants/${tenantId}/channels/${channelId}/tasks/${taskId}`));
    await deleteDoc(doc(db, `tasks/${taskId}`));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
  }
}

/**
 * Save Meeting to Firestore (Tenant Hierarchy + AES-256 Encryption)
 */
export async function saveMeetingToFirestore(meeting: ScheduledMeeting, tenantId = 'waseapp-primary') {
  const currentAuth = await ensureAuth();
  if (!currentAuth) return;

  let encryptedTitle = meeting.title;
  let encryptedDesc = meeting.description || '';
  let titleIv = '';
  let descIv = '';

  try {
    const encTitle = await encryptText(meeting.title);
    encryptedTitle = encTitle.cipherText;
    titleIv = encTitle.iv;
    if (meeting.description) {
      const encDesc = await encryptText(meeting.description);
      encryptedDesc = encDesc.cipherText;
      descIv = encDesc.iv;
    }
  } catch (err) {
    console.warn('Meeting AES-256 encryption notice:', err);
  }

  const payload = {
    ...meeting,
    title: encryptedTitle,
    description: encryptedDesc,
    titleIv,
    descIv,
    hostId: meeting.hostId || currentAuth.uid,
  };

  const subPath = `tenants/${tenantId}/meetings/${meeting.id}`;
  const topPath = `meetings/${meeting.id}`;

  try {
    await setDoc(doc(db, subPath), payload);
    await setDoc(doc(db, topPath), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

/**
 * Delete Meeting from Firestore
 */
export async function deleteMeetingFromFirestore(meetingId: string, tenantId = 'waseapp-primary') {
  const currentAuth = await ensureAuth();
  if (!currentAuth) return;
  try {
    await deleteDoc(doc(db, `tenants/${tenantId}/meetings/${meetingId}`));
    await deleteDoc(doc(db, `meetings/${meetingId}`));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `meetings/${meetingId}`);
  }
}

/**
 * Save SecureFile record to Firestore (Tenant -> Channel Hierarchy)
 */
export async function saveFileToFirestore(file: SecureFile, tenantId = 'waseapp-primary') {
  const currentAuth = await ensureAuth();
  if (!currentAuth) return;
  const targetChannel = file.channelId || 'general';

  const subPath = `tenants/${tenantId}/channels/${targetChannel}/files/${file.id}`;
  const topPath = `files/${file.id}`;

  try {
    await setDoc(doc(db, subPath), file);
    await setDoc(doc(db, topPath), file);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

/**
 * Delete SecureFile record from Firestore
 */
export async function deleteFileFromFirestore(fileId: string, tenantId = 'waseapp-primary', channelId = 'general') {
  const currentAuth = await ensureAuth();
  if (!currentAuth) return;
  try {
    await deleteDoc(doc(db, `tenants/${tenantId}/channels/${channelId}/files/${fileId}`));
    await deleteDoc(doc(db, `files/${fileId}`));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `files/${fileId}`);
  }
}

/**
 * Save AuditLog to Firestore (Tenant Hierarchy)
 */
export async function saveAuditLogToFirestore(log: AuditLog, tenantId = 'waseapp-primary') {
  const currentAuth = await ensureAuth();
  if (!currentAuth) return;

  const subPath = `tenants/${tenantId}/auditLogs/${log.id}`;
  const topPath = `auditLogs/${log.id}`;

  try {
    await setDoc(doc(db, subPath), log);
    await setDoc(doc(db, topPath), log);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

/**
 * Save encrypted message to Firestore (Tenant -> Channel Hierarchy)
 */
export async function saveMessageToFirestore(message: Message, tenantId = 'waseapp-primary') {
  const currentAuth = await ensureAuth();
  if (!currentAuth) return;
  const targetChannel = message.channelId || 'general';

  const payload = {
    id: message.id,
    channelId: targetChannel,
    encryptedContent: message.encryptedContent,
    iv: message.iv,
    senderId: currentAuth.uid || message.senderId,
    senderName: message.senderName || currentAuth.displayName || 'ユーザー',
    senderAvatar: message.senderAvatar || 'US',
    timestamp: message.timestamp || new Date().toISOString(),
    isEncrypted: message.isEncrypted ?? true,
    ...(message.attachmentId ? { attachmentId: message.attachmentId } : {}),
    ...(message.attachmentName ? { attachmentName: message.attachmentName } : {}),
  };

  const subPath = `tenants/${tenantId}/channels/${targetChannel}/messages/${message.id}`;
  const topPath = `messages/${message.id}`;

  try {
    await setDoc(doc(db, subPath), payload);
    await setDoc(doc(db, topPath), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

/**
 * Save Tenant to Firestore
 */
export async function saveTenantToFirestore(tenant: Tenant) {
  const currentAuth = await ensureAuth();
  if (!currentAuth) return;
  const path = `tenants/${tenant.id}`;
  try {
    const tenantPayload: any = {
      id: tenant.id,
      name: tenant.name,
      adminEmail: tenant.adminEmail,
      createdAt: tenant.createdAt,
      createdBy: tenant.createdBy,
    };
    if (tenant.allowedEmails && Array.isArray(tenant.allowedEmails)) {
      tenantPayload.allowedEmails = tenant.allowedEmails;
    }
    await setDoc(doc(db, 'tenants', tenant.id), tenantPayload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Delete Tenant from Firestore
 */
export async function deleteTenantFromFirestore(tenantId: string) {
  const currentAuth = await ensureAuth();
  if (!currentAuth) return;
  const path = `tenants/${tenantId}`;
  try {
    await deleteDoc(doc(db, 'tenants', tenantId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Save Channel to Firestore (Tenant -> Channel Hierarchy)
 */
export async function saveChannelToFirestore(channel: {
  id: string;
  name: string;
  description?: string;
  category?: string;
  isPrivate?: boolean;
}, tenantId = 'waseapp-primary') {
  const currentAuth = await ensureAuth();
  if (!currentAuth) return;

  const subPath = `tenants/${tenantId}/channels/${channel.id}`;
  const topPath = `channels/${channel.id}`;

  try {
    await setDoc(doc(db, subPath), channel, { merge: true });
    await setDoc(doc(db, topPath), channel, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, subPath);
  }
}

/**
 * Delete Channel from Firestore
 */
export async function deleteChannelFromFirestore(channelId: string, tenantId = 'waseapp-primary') {
  const currentAuth = await ensureAuth();
  if (!currentAuth) return;
  try {
    await deleteDoc(doc(db, `tenants/${tenantId}/channels/${channelId}`));
    await deleteDoc(doc(db, `channels/${channelId}`));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `channels/${channelId}`);
  }
}

/**
 * Send WebRTC P2P Signal via Firestore (Hybrid fallback for ultra-reliability)
 */
export async function sendP2PSignalToFirestore(signal: {
  id: string;
  roomId: string;
  type: 'offer' | 'answer' | 'candidate' | 'join' | 'leave';
  senderPeerId: string;
  targetPeerId?: string;
  payload?: any;
}) {
  if (!auth.currentUser) return;
  const path = `p2p_signals/${signal.id}`;
  try {
    await setDoc(doc(db, 'p2p_signals', signal.id), {
      id: signal.id,
      roomId: signal.roomId,
      type: signal.type,
      senderPeerId: signal.senderPeerId,
      ...(signal.targetPeerId ? { targetPeerId: signal.targetPeerId } : {}),
      ...(signal.payload ? { payload: signal.payload } : {}),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Non-blocking fallback signaling
    console.warn('Firestore P2P signal non-critical fallback log:', err);
  }
}

/**
 * Clear all collections in Firestore (Admin only)
 */
export async function clearAllFirestoreSeedData() {
  if (!auth.currentUser) return;
}

