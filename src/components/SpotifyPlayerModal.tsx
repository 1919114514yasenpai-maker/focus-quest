import React, { useState, useEffect } from 'react';

export interface BgmPreset {
  id: string;
  name: string;
  category: 'lofi' | 'rpg' | 'ambient' | 'piano' | 'chill';
  icon: string;
  description: string;
  spotifyId: string;
  type: 'playlist' | 'album' | 'track';
}

export const BGM_PRESETS: BgmPreset[] = [
  {
    id: 'lofi-beats',
    name: 'Lofi Beats',
    category: 'lofi',
    icon: '🎧',
    description: '定番の勉強・集中用ローファイビーツ',
    spotifyId: '37i9dQZF1DXdLEN7aqioXM',
    type: 'playlist',
  },
  {
    id: 'rpg-tavern',
    name: 'RPG 冒険と酒場',
    category: 'rpg',
    icon: '⚔️',
    description: 'ファンタジーRPGの世界に没入する酒場・冒険BGM',
    spotifyId: '37i9dQZF1DX1n9whJhb1hd',
    type: 'playlist',
  },
  {
    id: 'deep-focus',
    name: 'Deep Focus',
    category: 'ambient',
    icon: '🧠',
    description: '深いゾーンに入るためのアンビエント・環境音',
    spotifyId: '37i9dQZF1DWZeKCadgRdKQ',
    type: 'playlist',
  },
  {
    id: 'peaceful-piano',
    name: 'Peaceful Piano',
    category: 'piano',
    icon: '🎹',
    description: '心を落ち着かせる美しいピアノソロ旋律',
    spotifyId: '37i9dQZF1DX8Uebhn9wzrS',
    type: 'playlist',
  },
  {
    id: 'chill-study',
    name: 'Cafe Lofi Study',
    category: 'chill',
    icon: '☕',
    description: '静かなカフェの窓辺で勉強しているようなリラックス感',
    spotifyId: '37i9dQZF1DWWQRwui0ExPn',
    type: 'playlist',
  },
  {
    id: 'synthwave-focus',
    name: 'Retro Synth Chill',
    category: 'lofi',
    icon: '🌌',
    description: 'サイバーパンク・80sレトロフューチャーな疾走感',
    spotifyId: '37i9dQZF1DXd9rSDyQguIk',
    type: 'playlist',
  },
  {
    id: 'nature-rain',
    name: '雨音・ホワイトノイズ',
    category: 'ambient',
    icon: '🌧️',
    description: '雑音を消し去る雨の音とホワイトノイズ',
    spotifyId: '37i9dQZF1DX8ymr6UES72f',
    type: 'playlist',
  }
];

export function convertToSpotifyEmbedUrl(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Already an embed URL
  if (trimmed.includes('open.spotify.com/embed/')) {
    return trimmed;
  }

  // Standard web URL: https://open.spotify.com/(playlist|album|track|artist|episode)/ID...
  const matchWeb = trimmed.match(/open\.spotify\.com\/(playlist|album|track|artist|episode)\/([a-zA-Z0-9]+)/);
  if (matchWeb) {
    const [, type, id] = matchWeb;
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
  }

  // Spotify URI: spotify:(playlist|album|track|artist):ID
  const matchUri = trimmed.match(/spotify:(playlist|album|track|artist|episode):([a-zA-Z0-9]+)/);
  if (matchUri) {
    const [, type, id] = matchUri;
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
  }

  return null;
}

interface SpotifyPlayerModalProps {
  onClose: () => void;
  currentTrackTitle: string;
  currentEmbedUrl: string;
  onSelectTrack: (title: string, embedUrl: string) => void;
}

export const SpotifyPlayerModal: React.FC<SpotifyPlayerModalProps> = ({
  onClose,
  currentTrackTitle,
  currentEmbedUrl,
  onSelectTrack,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'guide'>('presets');
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [isLargePlayer, setIsLargePlayer] = useState(() => {
    return localStorage.getItem('focusquest_spotify_player_size') === 'large';
  });

  const handleTogglePlayerSize = () => {
    const next = !isLargePlayer;
    setIsLargePlayer(next);
    localStorage.setItem('focusquest_spotify_player_size', next ? 'large' : 'compact');
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);
    if (!customInputUrl.trim()) {
      setCustomError('SpotifyのURLまたは共有リンクを入力してください');
      return;
    }

    const embedUrl = convertToSpotifyEmbedUrl(customInputUrl);
    if (!embedUrl) {
      setCustomError('有効なSpotifyのURLではありません。（例: https://open.spotify.com/playlist/...）');
      return;
    }

    const title = customTitle.trim() || 'マイ プレイリスト';
    onSelectTrack(title, embedUrl);
    setCustomInputUrl('');
    setCustomTitle('');
    setActiveTab('presets');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-['DotGothic16'] select-none">
      <div 
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-slate-900 border-2 border-emerald-500 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-slate-950/90 border-b border-emerald-900/60 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl sm:text-2xl">🎵</span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm sm:text-base font-bold text-emerald-300 truncate">
                  Spotify BGM プレイヤー
                </h3>
                <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-700/80 px-1 py-0.2 rounded font-mono">
                  Official Embed
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                クエスト中の作業BGM・あなたのアカウントで直接再生
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleTogglePlayerSize}
              className="pixel-btn text-[10px] !py-1 !px-2 flex items-center gap-1 !border-emerald-700 !text-emerald-300 hover:!bg-emerald-950"
              title={isLargePlayer ? 'コンパクト表示にする' : 'リストを大きく表示する'}
            >
              <span>{isLargePlayer ? '🔽 ミニ' : '🔼 展開'}</span>
            </button>
            <button
              onClick={onClose}
              className="pixel-btn text-xs !py-1 !px-2.5 !border-slate-600 !text-slate-400 hover:!bg-slate-800 hover:!text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Embedded Spotify Player Card (Always Visible at Top) */}
        <div className="p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400 text-[10px] sm:text-xs">再生中:</span>
              <span className="font-bold text-emerald-300 truncate text-[11px] sm:text-xs">
                {currentTrackTitle}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 flex items-center gap-1">
              🔑 <span>プレイヤー内でSpotifyログイン可能</span>
            </span>
          </div>

          {/* Spotify iframe */}
          <div className="w-full rounded-xl overflow-hidden shadow-lg border border-emerald-500/30 bg-black/60 transition-all duration-300">
            <iframe
              key={currentEmbedUrl}
              src={currentEmbedUrl}
              width="100%"
              height={isLargePlayer ? "352" : "152"}
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify Web Player"
              className="w-full block"
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-1">
              <span className="text-emerald-400">💡</span>
              <span>プレイヤー右上の「Log in」からログインするとフル再生できます</span>
            </div>
            <button
              onClick={() => setActiveTab('guide')}
              className="text-emerald-400 hover:underline flex items-center gap-0.5 ml-2 whitespace-nowrap"
            >
              <span>ログイン方法</span>
              <span>›</span>
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 px-3 pt-2 bg-slate-900 border-b border-slate-800 flex-shrink-0">
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg border-t-2 border-x-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'presets'
                ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                : 'bg-slate-950/40 border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📜</span>
            <span>集中用おすすめBGM</span>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg border-t-2 border-x-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'custom'
                ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                : 'bg-slate-950/40 border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🔗</span>
            <span>自分のURLを追加</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg border-t-2 border-x-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                : 'bg-slate-950/40 border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>❓</span>
            <span>アカウント解説</span>
          </button>
        </div>

        {/* Tab Contents (Scrollable) */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-3">
          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400 mb-1">
                勉強や集中、RPGの世界観にぴったりのSpotify厳選プレイリストです。タップして切り替えられます：
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BGM_PRESETS.map((preset) => {
                  const isCurrent = currentTrackTitle === preset.name;
                  const embedUrl = `https://open.spotify.com/embed/${preset.type}/${preset.spotifyId}?utm_source=generator&theme=0`;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => onSelectTrack(preset.name, embedUrl)}
                      className={`text-left p-2.5 rounded-lg border-2 transition-all flex items-start gap-2.5 ${
                        isCurrent
                          ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-[1.01]'
                          : 'bg-slate-800/80 border-slate-700 hover:border-emerald-600/70 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-2xl sm:text-3xl p-1 bg-slate-900/90 rounded border border-slate-700/60 flex-shrink-0">
                        {preset.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-emerald-300' : 'text-slate-200'}`}>
                            {preset.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] bg-emerald-500 text-slate-950 font-bold px-1 rounded-sm whitespace-nowrap">
                              再生中
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM URL */}
          {activeTab === 'custom' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-700 text-xs leading-relaxed space-y-1 text-slate-300">
                <div className="font-bold text-emerald-300 flex items-center gap-1">
                  <span>🎧</span> <span>自分のお気に入りのSpotify楽曲やプレイリストを再生</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  SpotifyアプリやWeb版から「共有」→「リンクをコピー」して、下の入力欄に貼り付けてください。
                </p>
              </div>

              <form onSubmit={handleApplyCustomUrl} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Spotify URL または共有リンク <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={customInputUrl}
                    onChange={(e) => setCustomInputUrl(e.target.value)}
                    placeholder="https://open.spotify.com/playlist/... または album / track"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  {customError && (
                    <p className="text-rose-400 text-[10px] mt-1 font-bold">⚠️ {customError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    プレイリストの名前（任意）
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="例: お気に入り作業BGM、ゲームサントラなど"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="pixel-btn active w-full py-2 !border-emerald-500 !bg-emerald-600 hover:!bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                >
                  <span>▶️</span>
                  <span>このSpotifyリンクをプレイヤーにセットする</span>
                </button>
              </form>

              <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-2 space-y-0.5">
                <p>・プレイリスト (playlist)、アルバム (album)、楽曲 (track)、ポッドキャスト (episode) に対応しています。</p>
                <p>・埋め込みプレイヤー上でログインすることで、フル尺での再生が可能になります。</p>
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT & GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 rounded-lg space-y-2">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                  <span>✨</span>
                  <span>Spotifyアカウントでログインしてフル再生する方法</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  本アプリのプレイヤーはSpotify公式の公式埋め込みシステムを使用しています。
                  そのため、特別なOAuth設定や開発者登録は不要で、<span className="text-emerald-300 font-bold">普段使っているSpotifyアカウントでそのまま安全に聴くことができます</span>。
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 flex items-start gap-2.5">
                  <span className="text-lg bg-emerald-950 text-emerald-400 font-bold w-6 h-6 flex items-center justify-center rounded-full border border-emerald-700 flex-shrink-0">
                    1
                  </span>
                  <div>
                    <div className="font-bold text-slate-200">プレイヤー内の「Log in」をクリック</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      上のプレイヤーの右上にある「Log in」（または「Spotifyで開く」）を押すと、Spotifyの公式ログイン画面が開きます。
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 flex items-start gap-2.5">
                  <span className="text-lg bg-emerald-950 text-emerald-400 font-bold w-6 h-6 flex items-center justify-center rounded-full border border-emerald-700 flex-shrink-0">
                    2
                  </span>
                  <div>
                    <div className="font-bold text-slate-200">ログイン後にフル再生スタート</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      ログインするとブラウザにSpotifyのセッションが記憶され、この画面内でも制限なしでフル楽曲が流れるようになります。
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 flex items-start gap-2.5">
                  <span className="text-lg bg-emerald-950 text-emerald-400 font-bold w-6 h-6 flex items-center justify-center rounded-full border border-emerald-700 flex-shrink-0">
                    3
                  </span>
                  <div>
                    <div className="font-bold text-slate-200">FreeプランとPremiumプランの違い</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      <span className="text-amber-300 font-medium">Spotify Premium:</span> 全曲フル尺再生・曲飛ばし無制限・高音質。<br />
                      <span className="text-slate-300 font-medium">Spotify Free:</span> 30秒プレビューまたはシャッフル再生に対応します。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="text-[9px] text-slate-500">
            Powered by Spotify Embed API • Focus Quest BGM
          </div>
          <button
            onClick={onClose}
            className="pixel-btn text-xs !py-1 !px-4 !border-emerald-600 !text-emerald-300 hover:!bg-emerald-950"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
