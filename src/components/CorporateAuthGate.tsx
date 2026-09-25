import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Share2,
  Check,
  Info,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { User } from '../types';
import {
  signInWithGoogle,
  signInWithGoogleRedirect,
  checkRedirectAuthResult,
  signInAsGuestOrAnonymous,
  saveUserProfileToFirestore,
} from '../lib/firebase';

interface CorporateAuthGateProps {
  onAuthenticated: (user: User) => void;
}

export const CorporateAuthGate: React.FC<CorporateAuthGateProps> = ({ onAuthenticated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [showShareGuide, setShowShareGuide] = useState(false);

  // Handle redirect sign-in results on component mount
  useEffect(() => {
    async function handleRedirectResult() {
      try {
        setIsLoading(true);
        const fbUser = await checkRedirectAuthResult();
        if (fbUser) {
          const email = fbUser.email || '';
          const isSystemAdmin = email.toLowerCase() === 'aimutsu0120@gmail.com';

          const userRecord: User = {
            id: fbUser.uid,
            name: fbUser.displayName || email.split('@')[0] || 'ユーザー',
            avatar:
              (fbUser.displayName ? fbUser.displayName.slice(0, 2).toUpperCase() : email.slice(0, 2).toUpperCase()) ||
              'US',
            role: isSystemAdmin ? 'admin' : 'member',
            roleTitle: isSystemAdmin ? 'システム全体管理者' : 'メンバー',
            status: 'online',
            companyName: '株式会社Waseapp',
            email,
            isSystemAdmin,
          };

          await saveUserProfileToFirestore(userRecord, email);
          onAuthenticated(userRecord);
        }
      } catch (err: any) {
        console.error('Redirect result error:', err);
        setErrorMsg(err.message || 'リダイレクト認証に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    }

    handleRedirectResult();
  }, [onAuthenticated]);

  // Derive public share URL from dev URL if needed
  const getShareableUrl = () => {
    const currentOrigin = window.location.origin;
    if (currentOrigin.includes('ais-dev-')) {
      return currentOrigin.replace('ais-dev-', 'ais-pre-');
    }
    return 'https://ais-pre-eid6edxtqoljoz4grdmor2-554926909913.asia-northeast1.run.app';
  };

  const handleCopyShareLink = () => {
    const url = getShareableUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    });
  };

  // Google Authentication Handler via Popup
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const fbUser = await signInWithGoogle();
      const email = fbUser.email || '';
      const isSystemAdmin = email.toLowerCase() === 'aimutsu0120@gmail.com';

      const userRecord: User = {
        id: fbUser.uid,
        name: fbUser.displayName || email.split('@')[0] || 'ユーザー',
        avatar: (fbUser.displayName ? fbUser.displayName.slice(0, 2).toUpperCase() : email.slice(0, 2).toUpperCase()) || 'US',
        role: isSystemAdmin ? 'admin' : 'member',
        roleTitle: isSystemAdmin ? 'システム全体管理者' : 'メンバー',
        status: 'online',
        companyName: '株式会社Waseapp',
        email,
        isSystemAdmin,
      };

      await saveUserProfileToFirestore(userRecord, email);
      onAuthenticated(userRecord);
    } catch (err: any) {
      console.error('Google auth error:', err);
      setErrorMsg(
        err.message ||
          'Google 認証ポップアップがブロックされました。下の「ページ移動でGoogleログイン (Safari/iPad推奨)」をお試しください。'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Google Authentication Handler via Redirect (Page Navigation)
  const handleGoogleLoginRedirect = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogleRedirect();
    } catch (err: any) {
      console.error('Google redirect auth error:', err);
      setErrorMsg(err.message || 'Google ページ移動ログインでエラーが発生しました。');
      setIsLoading(false);
    }
  };

  // Guest / Friend Instant Join
  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = guestName.trim() || '招待メンバー';
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const session = await signInAsGuestOrAnonymous(finalName);
      const userRecord: User = {
        id: session.uid,
        name: session.displayName,
        avatar: finalName.slice(0, 2).toUpperCase() || 'GS',
        role: 'member',
        roleTitle: '招待メンバー (即時参加)',
        status: 'online',
        companyName: '株式会社Waseapp',
      };

      await saveUserProfileToFirestore(userRecord);
      onAuthenticated(userRecord);
    } catch (err: any) {
      console.error('Guest login error:', err);
      // Fallback local user
      const fallbackUser: User = {
        id: `guest_${Date.now()}`,
        name: finalName,
        avatar: finalName.slice(0, 2).toUpperCase() || 'GS',
        role: 'member',
        roleTitle: '招待メンバー',
        status: 'online',
      };
      onAuthenticated(fallbackUser);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Top Nav */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span>Secure Workspace Platform</span>
            </div>
            <p className="text-[11px] text-slate-400">E2EE暗号化 & P2Pコラボレーション</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <button
            id="btn-copy-share-top"
            onClick={handleCopyShareLink}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 transition"
          >
            {copiedShareLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">共有URLコピー完了</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>友達招待用URLをコピー</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Form Center */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative">
          {/* Header Description */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">ワークスペース ログイン</h1>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Google アカウントまたはお名前入力ですぐに参加できます
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 401 Info Alert / Solution */}
          <div className="mb-5 p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-indigo-300">
              <span className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-400" />
                友達が401エラーになる場合の原因と対策
              </span>
              <button
                type="button"
                onClick={() => setShowShareGuide(!showShareGuide)}
                className="text-[11px] text-indigo-400 hover:text-indigo-200 underline"
              >
                {showShareGuide ? '閉じる' : '詳細'}
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              開発者専用URL（<code className="text-amber-400 font-mono">ais-dev-</code>）は所有者以外アクセス制限（401）されます。友達には必ず<strong>共有用URL</strong>をお送りください。
            </p>

            {showShareGuide && (
              <div className="pt-2 border-t border-indigo-500/20 space-y-2 text-[11px] text-slate-300">
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] break-all">
                  {getShareableUrl()}
                </div>
                <button
                  id="btn-copy-public-link"
                  onClick={handleCopyShareLink}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow cursor-pointer"
                >
                  {copiedShareLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>共有用URLをクリップボードにコピーしました！</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>友達に送る共有URLをコピー</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Google Sign In Buttons */}
          <div className="space-y-2.5">
            <button
              id="btn-google-login-only"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? '認証中...' : 'Google アカウントでログイン'}</span>
            </button>

            <button
              id="btn-google-login-redirect"
              onClick={handleGoogleLoginRedirect}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700/80 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>ページ移動でGoogleログイン (Safari / iPad 推奨)</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider font-medium">または</span>
            </div>

            {/* Guest / Friend Instant Join Form */}
            <form onSubmit={handleGuestLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  表示名を入力して参加（Google連携なし）
                </label>
                <div className="relative">
                  <input
                    id="input-guest-name"
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="例: 山田 / Friend"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <button
                id="btn-guest-instant-login"
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>ゲスト / 招待メンバーとして即座に参加</span>
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-slate-800/80 text-center text-[11px] text-slate-500 z-10 flex items-center justify-center gap-2">
        <Lock className="w-3 h-3 text-emerald-400" />
        <span>エンドツーエンド暗号化 (AES-256-GCM) 接続</span>
      </footer>
    </div>
  );
};

