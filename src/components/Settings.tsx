import React, { useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { generateUid } from '../gameData';
import { SaveData } from '../types';
import { sanitizeSaveData, parseSaveText } from '../saveManager';

interface SettingsProps {
  onClose: () => void;
  onImport: (data: SaveData) => void;
  saveData: SaveData;
  user?: User | null;
  syncing?: boolean;
  isLoggingIn?: boolean;
  lastSyncedAt?: string | null;
  syncError?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onSaveToCloud?: () => void;
  onLoadFromCloud?: () => void;
  onClearSyncError?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  onClose,
  onImport,
  saveData,
  user,
  syncing,
  isLoggingIn,
  lastSyncedAt,
  syncError,
  onLogin,
  onLogout,
  onSaveToCloud,
  onLoadFromCloud,
  onClearSyncError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingData, setPendingData] = useState<SaveData | null>(null);
  const [isRegeneratingGuilds, setIsRegeneratingGuilds] = useState(false);
  const [adminSuccessMsg, setAdminSuccessMsg] = useState<string | null>(null);

  const isAdminAccount = user && (user.email?.toLowerCase().trim() === '1919114514yasenpai@gmail.com');

  const handleRegenerateGuilds = async () => {
    if (!user) return;
    setIsRegeneratingGuilds(true);
    setAdminSuccessMsg(null);
    setErrorMessage(null);
    try {
      const currentWeekId = `2026-W${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`;
      const starters = [
        { name: '🛡️ 暁の集中騎士団', focus: 150 },
        { name: '🧙‍♂️ ポモドーロ魔導院', focus: 90 },
        { name: '⚔️ 冒険者ギルド「黎明」', focus: 45 }
      ];

      for (const st of starters) {
        const gid = generateUid();
        const guildData = {
          id: gid,
          name: st.name,
          leaderId: '',
          weeklyFocusTime: st.focus,
          weekId: currentWeekId,
          memberCount: 0,
          createdAt: new Date().toISOString(),
          isPrivate: false,
          inviteCode: ''
        };
        await setDoc(doc(db, 'guilds', gid), guildData);
      }
      setAdminSuccessMsg('✨ Firestoreに初期ギルドデータを再生成しました！');
    } catch (e: any) {
      console.error(e);
      setErrorMessage(`ギルド再生成に失敗しました: ${e?.message || e}`);
    } finally {
      setIsRegeneratingGuilds(false);
    }
  };

  const handleExport = () => {
    const json = JSON.stringify(saveData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus_quest_save_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = async () => {
    try {
      const json = JSON.stringify(saveData);
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setErrorMessage('クリップボードへのコピーに失敗しました。');
    }
  };

  const processAndPrepareImport = (parsedJson: any) => {
    try {
      setErrorMessage(null);
      const sanitized = sanitizeSaveData(parsedJson);
      setPendingData(sanitized);
    } catch (err) {
      console.error('Import error:', err);
      setErrorMessage('データの変換中にエラーが発生しました。セーブデータ形式を確認してください。');
    }
  };

  const confirmImport = () => {
    if (!pendingData) return;
    onImport(pendingData);
    setPendingData(null);
    onClose();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseSaveText(text);
        processAndPrepareImport(parsed);
      } catch (err) {
        setErrorMessage('ファイルのパースに失敗しました。正しいJSONファイルを選択してください。');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportText = () => {
    if (!pasteText.trim()) return;
    setErrorMessage(null);
    try {
      const parsed = parseSaveText(pasteText);
      processAndPrepareImport(parsed);
    } catch (err) {
      setErrorMessage('無効なテキストデータです。JSON形式のセーブコードを正しい形で貼り付けてください。');
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="pixel-panel max-w-sm w-full space-y-4 bg-slate-900/95 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-100 text-center mb-2 border-b border-slate-700 pb-2">⚙️ 設定・データ引継ぎ</h2>

        {/* 読み込み確認モーダル */}
        {pendingData ? (
          <div className="space-y-4 bg-slate-950 p-4 border-2 border-amber-500 rounded text-slate-200">
            <div className="text-sm font-bold text-amber-400 text-center border-b border-slate-800 pb-2">
              📜 データを読み込みますか？
            </div>
            <div className="text-xs space-y-1.5 bg-slate-900 p-3 rounded border border-slate-800">
              <p>👤 <strong>勇者レベル:</strong> Lv.{pendingData.stats.level}</p>
              <p>⚔️ <strong>到達階層:</strong> 地下{pendingData.stats.stage}階</p>
              <p>🪙 <strong>所持金:</strong> {pendingData.stats.gold} G</p>
              <p>🎒 <strong>所持アイテム:</strong> {pendingData.inventory?.length || 0} 個</p>
            </div>
            <p className="text-[11px] text-rose-300 font-bold text-center">
              ※現在の進行データは上書きされます。
            </p>
            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setPendingData(null)} 
                className="pixel-btn flex-1 py-2 text-xs"
              >
                キャンセル
              </button>
              <button 
                onClick={confirmImport} 
                className="pixel-btn flex-1 py-2 text-xs active !border-emerald-500 !text-emerald-300"
              >
                決定（読み込む）
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Firebase クラウドセーブ & Google ログイン */}
            <div className="p-3 bg-indigo-950/60 border border-indigo-700/80 rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-200 flex items-center gap-1">
                  ☁️ クラウド同期 (Firebase)
                </span>
                {syncing && <span className="text-[10px] text-amber-300 animate-pulse">同期中...</span>}
              </div>

              {user ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div className="truncate max-w-[180px]">
                      <p className="font-bold text-amber-300 truncate">{user.displayName || 'ログイン維持中'}</p>
                      <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={onLogout}
                      className="pixel-btn text-[10px] py-1 px-2 !bg-rose-950 !text-rose-300 !border-rose-600 hover:!bg-rose-900"
                    >
                      ログアウト
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-indigo-300">
                    <span>最終同期: {lastSyncedAt || '未同期'}</span>
                    <div className="flex items-center gap-1.5">
                      {onLoadFromCloud && (
                        <button
                          onClick={onLoadFromCloud}
                          disabled={syncing}
                          className="pixel-btn text-[9px] py-1 px-1.5 !bg-slate-800 !border-slate-600 !text-slate-300 hover:!text-white"
                          title="クラウドから最新データを強制再読み込み"
                        >
                          🔄 再読込
                        </button>
                      )}
                      <button
                        onClick={onSaveToCloud}
                        disabled={syncing}
                        className="pixel-btn text-[10px] py-1 px-2 active !border-indigo-400 !text-indigo-200"
                      >
                        ☁️ 今すぐ保存
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-emerald-400/90 bg-emerald-950/40 p-1.5 rounded border border-emerald-800/60">
                    ✅ ログイン中：5分おきに自動保存されます。「☁️ 今すぐ保存」で即時同期も可能です。
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-indigo-200 leading-tight">
                    スマホや別端末とセーブデータを共有したい場合のみログインしてください（1度ログインすれば次回以降も自動維持されます）。
                  </p>
                  <button
                    onClick={onLogin}
                    disabled={isLoggingIn}
                    className="pixel-btn w-full py-2.5 text-xs flex items-center justify-center gap-2 active !bg-indigo-900 !border-indigo-400 !text-indigo-100 disabled:opacity-50"
                  >
                    <span>{isLoggingIn ? '⏳ ログイン認証中...' : '🌐 Googleアカウントでログイン'}</span>
                  </button>
                </div>
              )}

              {syncError && (
                <div className="text-[11px] text-rose-300 bg-rose-950/90 p-2 border border-rose-600 rounded flex items-start justify-between gap-1 mt-1">
                  <span>{syncError}</span>
                  {onClearSyncError && (
                    <button onClick={onClearSyncError} className="text-rose-400 font-bold px-1">✕</button>
                  )}
                </div>
              )}
            </div>

            {/* 管理者専用メニュー (指定アカウントのみ表示) */}
            {isAdminAccount && (
              <div className="p-3 bg-amber-950/40 border border-amber-600/80 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    🛠️ 管理者メニュー
                  </span>
                  <span className="text-[9px] bg-amber-900 text-amber-200 px-1.5 py-0.5 rounded border border-amber-600 font-bold">
                    Admin
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 leading-tight">
                  Firestoreのギルドコレクションを再構築し、初期ギルドデータを生成します。
                </p>
                {adminSuccessMsg && (
                  <div className="text-[10px] text-emerald-300 bg-emerald-950/80 p-2 border border-emerald-600 rounded">
                    {adminSuccessMsg}
                  </div>
                )}
                <button
                  onClick={handleRegenerateGuilds}
                  disabled={isRegeneratingGuilds}
                  className="pixel-btn w-full py-2 text-xs active !bg-amber-700 !border-amber-400 !text-amber-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span>{isRegeneratingGuilds ? '⏳ 生成中...' : '✨ 初期ギルドデータを再生成する'}</span>
                </button>
              </div>
            )}

            <div className="text-xs text-slate-300 leading-relaxed p-2.5 bg-slate-950 border border-slate-800 rounded">
              <p className="text-[11px] text-amber-200/90 font-medium">
                💡 <strong>MDM環境・制限端末の方へ:</strong><br />
                学校や組織の制限でGoogleログインが通らない場合でも、下の<strong>「引継ぎコード」</strong>を使えば確実に別端末へデータをコピーできます。
              </p>
            </div>

            {errorMessage && (
              <div className="text-xs text-rose-300 bg-rose-950/80 p-2.5 border border-rose-600 rounded">
                ⚠️ {errorMessage}
              </div>
            )}

            {!showPasteModal ? (
              <div className="space-y-2.5">
                <button onClick={handleExport} className="pixel-btn w-full py-2.5 text-xs">
                  💾 ファイルとして保存 (.json)
                </button>

                <button onClick={handleCopyText} className="pixel-btn w-full py-2.5 text-xs !border-sky-500 !text-sky-300">
                  {copied ? '✅ コピー完了！' : '📋 セーブコードをクリップボードにコピー'}
                </button>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportFile}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="pixel-btn w-full py-2 text-xs !border-amber-600 !text-amber-300 hover:!bg-amber-950/50"
                  >
                    📂 ファイルから読み込む
                  </button>

                  <button
                    onClick={() => setShowPasteModal(true)}
                    className="pixel-btn w-full py-2 text-xs !border-amber-600 !text-amber-300 hover:!bg-amber-950/50"
                  >
                    📝 セーブコードを直接貼り付けて読み込む
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-950 p-3 rounded border border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                  <span>セーブコードの貼り付け</span>
                  <button onClick={() => setShowPasteModal(false)} className="text-slate-400 hover:text-slate-200">
                    ✕ 閉じる
                  </button>
                </div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder='ここにコピーしたセーブデータ（JSON）を貼り付け...'
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono resize-none"
                />
                <button
                  onClick={handleImportText}
                  className="pixel-btn w-full py-2 text-xs active !border-emerald-500 !text-emerald-300"
                >
                  読み込み確認へ進む
                </button>
              </div>
            )}

            <button onClick={onClose} className="pixel-btn w-full py-2.5 text-xs mt-2 text-slate-400 hover:text-slate-200">
              とじる
            </button>
          </>
        )}
      </div>
    </div>
  );
};
