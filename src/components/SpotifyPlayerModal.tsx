import React, { useState } from 'react';

export interface BgmPreset {
  id: string;
  name: string;
  category: 'lofi' | 'rpg' | 'ambient' | 'piano' | 'chill' | 'jpop' | 'anime';
  icon: string;
  description: string;
  spotifyId: string;
  type: 'playlist' | 'album' | 'track';
}

export interface CustomTrack {
  id: string;
  title: string;
  embedUrl: string;
  webUrl: string;
  addedAt: number;
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
    id: 'jpop-hits',
    name: 'Tokyo Super Hits',
    category: 'jpop',
    icon: '🎤',
    description: '今聴くべき話題の最新J-POPヒット曲まとめ',
    spotifyId: '37i9dQZF1DXdbXrPNafg9d',
    type: 'playlist',
  },
  {
    id: 'anime-now',
    name: 'Anime Now!',
    category: 'anime',
    icon: '⚡',
    description: '人気アニメの主題歌・オープニング・名曲集',
    spotifyId: '37i9dQZF1DX6XceWZP1Ap4',
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
    id: 'gaming-beats',
    name: 'Gaming Lounge',
    category: 'rpg',
    icon: '🎮',
    description: 'テンションを上げて集中するゲーム・エレクトロサウンド',
    spotifyId: '37i9dQZF1DWTyiBJ6yCQ2C',
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

const SEARCH_SUGGESTIONS = [
  'YOASOBI',
  '米津玄師',
  'Ado',
  'Official髭男dism',
  'ゼルダの伝説 BGM',
  'ジブリ BGM',
  'スタジオジブリ ピアノ',
  'アニソン 集中',
  'ボカロ 作業用',
  'クラシック 集中',
  'Lofi Girl',
  'EDM Gaming'
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

export function convertToSpotifyWebUrl(embedUrl: string): string {
  if (!embedUrl) return 'https://open.spotify.com';
  const match = embedUrl.match(/open\.spotify\.com\/embed\/(playlist|album|track|artist|episode)\/([a-zA-Z0-9]+)/);
  if (match) {
    const [, type, id] = match;
    return `https://open.spotify.com/${type}/${id}`;
  }
  return embedUrl.replace('/embed/', '/');
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
  const [activeTab, setActiveTab] = useState<'search' | 'my-library' | 'presets' | 'help'>('search');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Custom tracks (My Library)
  const [customTracks, setCustomTracks] = useState<CustomTrack[]>(() => {
    try {
      const saved = localStorage.getItem('focus_quest_custom_bgm_list');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'sample-track-1',
        title: 'お気に入り曲（サンプル）',
        embedUrl: 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT?utm_source=generator&theme=0',
        webUrl: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        addedAt: Date.now()
      }
    ];
  });

  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const saveCustomTracks = (updated: CustomTrack[]) => {
    setCustomTracks(updated);
    try {
      localStorage.setItem('focus_quest_custom_bgm_list', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleAddCustomTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!inputUrl.trim()) {
      setAddError('SpotifyのURLまたは共有リンクを入力してください');
      return;
    }

    const embedUrl = convertToSpotifyEmbedUrl(inputUrl);
    if (!embedUrl) {
      setAddError('有効なSpotifyリンクではありません（例: https://open.spotify.com/track/〇〇 または playlist / album）');
      return;
    }

    const webUrl = convertToSpotifyWebUrl(embedUrl);
    const title = inputTitle.trim() || `マイ音楽 (${customTracks.length + 1})`;

    const newTrack: CustomTrack = {
      id: `custom-${Date.now()}`,
      title,
      embedUrl,
      webUrl,
      addedAt: Date.now()
    };

    const updated = [newTrack, ...customTracks];
    saveCustomTracks(updated);
    onSelectTrack(title, embedUrl);
    setInputUrl('');
    setInputTitle('');
    setActiveTab('my-library');
  };

  const handleDeleteCustomTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customTracks.filter(t => t.id !== id);
    saveCustomTracks(updated);
  };

  const handleSearchSpotify = (query: string) => {
    if (!query.trim()) return;
    const url = `https://open.spotify.com/search/${encodeURIComponent(query.trim())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const directSpotifyWebUrl = convertToSpotifyWebUrl(currentEmbedUrl);

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
                  Spotify 好きな曲・BGMプレイヤー
                </h3>
                <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-700/80 px-1 py-0.2 rounded font-mono">
                  Custom Music
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                好きな曲・アーティスト検索 & プレイリスト登録
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="pixel-btn text-xs !py-1 !px-2.5 !border-slate-600 !text-slate-400 hover:!bg-slate-800 hover:!text-white"
          >
            ✕
          </button>
        </div>

        {/* Current Playing Bar & Spotify Direct Launch */}
        <div className="px-3 sm:px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 truncate">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="truncate">セット中: {currentTrackTitle}</span>
            </div>
            <div className="text-[9px] text-slate-400 truncate">
              Spotifyアプリ/ブラウザで開くと、あなたのアカウントでフル尺再生できます
            </div>
          </div>

          <a
            href={directSpotifyWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pixel-btn active text-[10px] !py-1 !px-2.5 !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-400 text-white font-bold flex items-center gap-1 shadow-sm whitespace-nowrap flex-shrink-0"
            title="SpotifyアプリまたはWeb版でフル再生"
          >
            <span>🚀 Spotifyで開く</span>
            <span>↗</span>
          </a>
        </div>

        {/* Embedded Mini Player */}
        <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800 flex-shrink-0">
          <div className="w-full rounded-lg overflow-hidden shadow border border-emerald-500/30 bg-black/60">
            <iframe
              key={currentEmbedUrl}
              src={currentEmbedUrl}
              width="100%"
              height="80"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify Web Player"
              className="w-full block"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-3 pt-2 bg-slate-900 border-b border-slate-800 flex-shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg border-t-2 border-x-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'search'
                ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                : 'bg-slate-950/40 border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🔍</span>
            <span>好きな曲を検索</span>
          </button>
          <button
            onClick={() => setActiveTab('my-library')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg border-t-2 border-x-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'my-library'
                ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                : 'bg-slate-950/40 border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⭐</span>
            <span>マイ保存リスト ({customTracks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg border-t-2 border-x-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'presets'
                ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                : 'bg-slate-950/40 border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📜</span>
            <span>おすすめBGM</span>
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg border-t-2 border-x-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'help'
                ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                : 'bg-slate-950/40 border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>❓</span>
            <span>使い方</span>
          </button>
        </div>

        {/* Tab Contents (Scrollable) */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-3">
          {/* TAB 1: SEARCH FAVORITE SONGS */}
          {activeTab === 'search' && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 rounded-lg space-y-1.5 text-xs text-slate-300">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                  <span>🎧</span>
                  <span>好きな曲・アーティスト名でSpotifyを開く</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  好きな曲名、歌手名、アニメ・ゲームタイトルを入力すると、Spotifyの公式検索画面に直結してすぐ再生できます。
                </p>
              </div>

              {/* Search Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearchSpotify(searchQuery);
                }}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="例: YOASOBI、ゼルダの伝説、チルい曲、作業用BGMなど..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!searchQuery.trim()}
                    className="pixel-btn active !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-400 text-white font-bold text-xs !py-2 !px-4 flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
                  >
                    <span>🔍 検索・再生</span>
                  </button>
                </div>
              </form>

              {/* Search Suggestions Chips */}
              <div className="space-y-1.5">
                <div className="text-[10px] text-slate-400 font-bold">人気の検索ワード（タップですぐ検索）：</div>
                <div className="flex flex-wrap gap-1.5">
                  {SEARCH_SUGGESTIONS.map((word) => (
                    <button
                      key={word}
                      onClick={() => {
                        setSearchQuery(word);
                        handleSearchSpotify(word);
                      }}
                      className="text-[10px] bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-emerald-300 px-2 py-1 rounded transition-colors"
                    >
                      {word} ↗
                    </button>
                  ))}
                </div>
              </div>

              {/* How to add to My Library prompt */}
              <div className="mt-4 p-3 bg-slate-950/70 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-bold text-slate-200 flex items-center gap-1">
                  <span>💡</span> <span>特定の曲をアプリ内にセット・保存したい場合</span>
                </div>
                <p>
                  Spotifyで好きな曲の「…」メニューから「共有」→「曲のリンクをコピー」して、隣の「⭐ マイ保存リスト」タブから登録すると、いつでもこの画面からワンタップで呼び出せます！
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: MY SAVED LIBRARY (CUSTOM URLS) */}
          {activeTab === 'my-library' && (
            <div className="space-y-3">
              {/* Add New Custom Track Form */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2.5">
                <div className="font-bold text-emerald-300 text-xs flex items-center gap-1">
                  <span>➕</span> <span>お気に入りの曲・アルバム・プレイリストを登録</span>
                </div>

                <form onSubmit={handleAddCustomTrack} className="space-y-2">
                  <div>
                    <input
                      type="text"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="Spotifyリンクを貼り付け (例: https://open.spotify.com/track/...)"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    {addError && (
                      <p className="text-rose-400 text-[10px] mt-1 font-bold">⚠️ {addError}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputTitle}
                      onChange={(e) => setInputTitle(e.target.value)}
                      placeholder="曲名やメモ（例: お気に入りサントラ）"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="pixel-btn active !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-400 text-white font-bold text-xs !py-1.5 !px-3 whitespace-nowrap"
                    >
                      ＋ 登録する
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Custom Tracks */}
              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-400 font-bold">保存したマイ曲リスト：</div>
                
                {customTracks.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                    まだ曲が登録されていません。上の入力欄から好きなSpotifyリンクを登録してください。
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customTracks.map((track) => {
                      const isCurrent = currentEmbedUrl === track.embedUrl;
                      return (
                        <div
                          key={track.id}
                          className={`p-2.5 rounded-lg border-2 transition-all flex items-center justify-between gap-2 ${
                            isCurrent
                              ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                              : 'bg-slate-800/80 border-slate-700 hover:border-emerald-600/70'
                          }`}
                        >
                          <div 
                            onClick={() => onSelectTrack(track.title, track.embedUrl)}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">🎵</span>
                              <span className={`text-xs font-bold truncate ${isCurrent ? 'text-emerald-300' : 'text-slate-200'}`}>
                                {track.title}
                              </span>
                              {isCurrent && (
                                <span className="text-[8px] bg-emerald-500 text-slate-950 font-bold px-1 rounded whitespace-nowrap">
                                  再生中
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-400 truncate mt-0.5 font-mono">
                              {track.webUrl}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => onSelectTrack(track.title, track.embedUrl)}
                              className="pixel-btn text-[9px] !py-0.5 !px-2 !border-emerald-600 !text-emerald-300 hover:!bg-emerald-950"
                            >
                              セット
                            </button>
                            <a
                              href={track.webUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500 px-2 py-1 rounded flex items-center gap-0.5"
                            >
                              <span>Spotify</span>
                              <span>↗</span>
                            </a>
                            <button
                              onClick={(e) => handleDeleteCustomTrack(track.id, e)}
                              className="text-slate-500 hover:text-rose-400 p-1 text-xs"
                              title="削除"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RECOMMENDED PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400 mb-1">
                定番の集中・作業用Spotify公式プレイリストです。タップして選択できます：
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BGM_PRESETS.map((preset) => {
                  const isCurrent = currentTrackTitle === preset.name;
                  const embedUrl = `https://open.spotify.com/embed/${preset.type}/${preset.spotifyId}?utm_source=generator&theme=0`;
                  const webUrl = `https://open.spotify.com/${preset.type}/${preset.spotifyId}`;

                  return (
                    <div
                      key={preset.id}
                      className={`p-2.5 rounded-lg border-2 transition-all flex flex-col justify-between gap-2 ${
                        isCurrent
                          ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                          : 'bg-slate-800/80 border-slate-700 hover:border-emerald-600/70'
                      }`}
                    >
                      <div 
                        onClick={() => onSelectTrack(preset.name, embedUrl)}
                        className="flex items-start gap-2.5 cursor-pointer"
                      >
                        <span className="text-2xl p-1 bg-slate-900/90 rounded border border-slate-700/60 flex-shrink-0">
                          {preset.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-emerald-300' : 'text-slate-200'}`}>
                              {preset.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] bg-emerald-500 text-slate-950 font-bold px-1 rounded-sm whitespace-nowrap">
                                選択中
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                            {preset.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-700/60 text-[10px]">
                        <button
                          onClick={() => onSelectTrack(preset.name, embedUrl)}
                          className="text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <span>▶ 埋め込みにセット</span>
                        </button>
                        <a
                          href={webUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-300 hover:text-emerald-300 flex items-center gap-0.5 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 hover:border-emerald-500"
                        >
                          <span>Spotifyで開く</span>
                          <span>↗</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: HELP & TIPS */}
          {activeTab === 'help' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                  <span>🎧</span>
                  <span>Spotifyで好きな曲を流しながら集中する方法</span>
                </div>
                <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
                  <p>
                    <strong className="text-emerald-300">方法 1: 曲名やアーティスト名で検索（一番おすすめ！）</strong><br />
                    「🔍 好きな曲を検索」タブに聴きたい曲名や歌手名（例: YOASOBI、ゼルダの伝説など）を入力して「検索・再生」を押すと、ご自身のSpotifyアプリ/Web版が開き、フル尺で再生がスタートします。
                  </p>
                  <p>
                    <strong className="text-emerald-300">方法 2: お気に入りの曲やプレイリストをマイ保存リストに登録</strong><br />
                    Spotifyアプリの曲やプレイリストの「共有」→「リンクをコピー」したURLを「⭐ マイ保存リスト」に貼り付けると、アプリ内にいつでも呼び出せるように登録できます。
                  </p>
                  <p>
                    <strong className="text-emerald-300">方法 3: おすすめBGMからワンタップで選択</strong><br />
                    「📜 おすすめBGM」タブから定番のLofi BeatsやJ-POP、ゲームBGMなどをいつでも一発でセットして聴くことができます。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="text-[9px] text-slate-500">
            Focus Quest Audio Engine
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
