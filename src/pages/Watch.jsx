import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VideoPlayer from '../components/VideoPlayer';
import Footer from '../components/Footer';
import DownloadModal from '../components/DownloadModal';
import { fetchAnimeDetails, fetchAnimeSeasons } from '../api';
import { searchStreamAnime, fetchStreamEpisodes, fetchEpisodeStream, getBestStreamUrl } from '../api/streaming';
import { getAnimeHistory, saveWatchHistory } from '../utils/history';
import {
  Star,
  Play,
  Layers,
  LayoutGrid,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  History as HistoryIcon,
  Server,
  X,
  Zap,
  RefreshCw,
  CheckCircle2,
  Film,
  Download,
} from 'lucide-react';
import { stripHtml } from '../utils/sanitize';
import { markInternalNavigation } from '../utils/antiRedirect';

const CHUNK_SIZE = 100;

const SERVERS = [
  {
    id: 'auto',
    name: 'Auto (Best Server)',
    shortName: 'Auto (Best)',
    badge: 'Recommended',
    icon: Zap,
    description: 'Auto-selects fastest working server & auto-switches if interrupted',
  },
  {
    id: 'server-1',
    name: 'Server 1 (HD Sub)',
    shortName: 'Server 1 (Sub)',
    badge: 'Fast HD',
    icon: Play,
  },
  {
    id: 'server-2',
    name: 'Server 2 (HD Mirror)',
    shortName: 'Server 2 (Mirror)',
    badge: 'Backup',
    icon: Server,
  },
  {
    id: 'server-3',
    name: 'Server 3 (English Dub)',
    shortName: 'Server 3 (Dub)',
    badge: 'Dubbed',
    icon: Film,
  },
  {
    id: 'server-4',
    name: 'Server 4 (Dub Mirror)',
    shortName: 'Server 4 (Dub 2)',
    badge: 'Dub Backup',
    icon: Film,
  },
];

// Helper to generate clean, high-speed direct CDN embed URLs with autoPlay and auto-skip
function getEmbedUrlForServer(animeId, epNum, serverId, startTime = 0) {
  if (!animeId) return '';
  const num = Math.max(1, Number(epNum) || 1);
  const startSec = Math.floor(Number(startTime) || 0);
  const startParam = startSec > 3 ? `&start=${startSec}` : '';

  let track = 'sub';
  let server = '1';

  if (serverId === 'server-2') {
    track = 'sub';
    server = '2';
  } else if (serverId === 'server-3') {
    track = 'dub';
    server = '1';
  } else if (serverId === 'server-4') {
    track = 'dub';
    server = '2';
  }

  return `https://www.animeembed.com/embed/ani/${animeId}/${num}?track=${track}&server=${server}&autoPlay=1${startParam}`;
}

// Standby silent embed URL for instant zero-latency background pre-buffering
function getStandbyEmbedUrlForServer(animeId, epNum, serverId) {
  if (!animeId) return '';
  const num = Math.max(1, Number(epNum) || 1);
  let track = 'sub';
  let server = '1';

  if (serverId === 'server-2') {
    track = 'sub';
    server = '2';
  } else if (serverId === 'server-3') {
    track = 'dub';
    server = '1';
  } else if (serverId === 'server-4') {
    track = 'dub';
    server = '2';
  }

  return `https://www.animeembed.com/embed/ani/${animeId}/${num}?track=${track}&server=${server}&autoPlay=0&muted=1`;
}

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [anime, setAnime] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Derive starting episode immediately from URL params or local watch history (0ms latency)
  const initialEp = useMemo(() => {
    const paramEp = parseInt(searchParams.get('ep'), 10);
    if (!isNaN(paramEp) && paramEp > 0) return paramEp;
    const saved = getAnimeHistory(id);
    return saved?.episode > 0 ? saved.episode : 1;
  }, [id, searchParams]);

  const initialServer = useMemo(() => {
    return 'server-1';
  }, []);

  const [selectedEp, setSelectedEp] = useState(initialEp);
  const [activeServerId, setActiveServerId] = useState('auto');
  const [currentResolvedServer, setCurrentResolvedServer] = useState(initialServer);
  const [streamUrl, setStreamUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState(() => getEmbedUrlForServer(id, initialEp, initialServer));
  const [streamHeaders, setStreamHeaders] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [streamEpisodes, setStreamEpisodes] = useState([]);
  const [resumedFromHistory, setResumedFromHistory] = useState(false);
  const [autoSwitchNotice, setAutoSwitchNotice] = useState(null);
  const noticeTimerRef = useRef(null);
  const playbackTimeRef = useRef(0);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('download') === 'true') {
      setDownloadModalOpen(true);
    }
  }, [searchParams]);

  function showNotice(msg) {
    setAutoSwitchNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setAutoSwitchNotice(null);
    }, 3500);
  }

  // UI state for episode navigation
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChunk, setActiveChunk] = useState(0);
  const [viewMode, setViewMode] = useState('list');
  const activeEpRef = useRef(null);

  // Calculate true total episodes
  const totalEpisodes = useMemo(() => {
    if (!anime) return 1;
    const explicit = Number(anime.episodes);
    if (explicit && explicit > 0) return explicit;
    if (anime.nextAiringEpisode?.episode) {
      return Math.max(1, anime.nextAiringEpisode.episode - 1);
    }
    if (streamEpisodes && streamEpisodes.length > 0) {
      return streamEpisodes.length;
    }
    if (anime.streamingEpisodes && anime.streamingEpisodes.length > 0) {
      return anime.streamingEpisodes.length;
    }
    return 1;
  }, [anime, streamEpisodes]);

  // Set default view mode based on episode count
  useEffect(() => {
    if (totalEpisodes > 25) {
      setViewMode('grid');
    } else {
      setViewMode('list');
    }
  }, [totalEpisodes]);

  // Construct complete episode list from 1 to totalEpisodes
  const episodesList = useMemo(() => {
    if (!anime) return [];
    const defaultThumb =
      anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large;

    // Index streamingEpisodes by episode number from title (e.g. "Episode 12 - ...")
    const streamingMap = new Map();
    if (Array.isArray(anime.streamingEpisodes)) {
      anime.streamingEpisodes.forEach((se) => {
        const match = se.title?.match(/Episode\s+(\d+)/i) || se.title?.match(/EP\s*(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!streamingMap.has(num)) streamingMap.set(num, se);
        }
      });
    }

    // Index scraper episodes by number
    const streamMap = new Map();
    if (Array.isArray(streamEpisodes)) {
      streamEpisodes.forEach((se, idx) => {
        const num = Number(se.number) || idx + 1;
        streamMap.set(num, se);
      });
    }

    const list = [];
    for (let i = 1; i <= totalEpisodes; i++) {
      const streamEp = streamMap.get(i);
      const streamingEp = streamingMap.get(i);
      list.push({
        number: i,
        title: streamEp?.title || streamingEp?.title || `Episode ${i}`,
        thumbnail:
          streamEp?.thumbnail ||
          streamEp?.image ||
          streamingEp?.thumbnail ||
          defaultThumb,
        id: streamEp?.id || null,
      });
    }
    return list;
  }, [anime, totalEpisodes, streamEpisodes]);

  const chunkCount = Math.ceil(totalEpisodes / CHUNK_SIZE);

  // Sync active chunk whenever selectedEp changes
  useEffect(() => {
    const chunkIdx = Math.floor((selectedEp - 1) / CHUNK_SIZE);
    setActiveChunk(chunkIdx);
  }, [selectedEp]);

  // Filter episodes based on active chunk or search query
  const displayedEpisodes = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return episodesList.filter(
        (ep) =>
          String(ep.number) === q ||
          String(ep.number).startsWith(q) ||
          ep.title.toLowerCase().includes(q)
      );
    }
    if (totalEpisodes > CHUNK_SIZE) {
      const start = activeChunk * CHUNK_SIZE;
      return episodesList.slice(start, start + CHUNK_SIZE);
    }
    return episodesList;
  }, [episodesList, searchQuery, activeChunk, totalEpisodes]);

  // Load stream for an episode instantly without artificial delays
  function loadEpisodeStream(ep, epNumber, targetServerId = activeServerId, startTime = 0) {
    const num = epNumber || ep?.number || selectedEp || 1;
    setStreamError(null);
    setStreamLoading(false);

    let resolvedServer = 'server-1';
    if (targetServerId === 'server-2') {
      resolvedServer = 'server-2';
    } else if (targetServerId === 'server-3') {
      resolvedServer = 'server-3';
    } else if (targetServerId === 'server-4') {
      resolvedServer = 'server-4';
    } else {
      resolvedServer = 'server-1';
    }

    setCurrentResolvedServer(resolvedServer);
    setStreamUrl('');
    setIframeUrl(getEmbedUrlForServer(id, num, resolvedServer, startTime));
  }

  // Handle episode click
  function handleEpClick(ep) {
    markInternalNavigation();
    const num = ep.number;
    playbackTimeRef.current = 0;
    setSelectedEp(num);
    setSearchParams({ ep: num }, { replace: true });
    if (anime) {
      saveWatchHistory({
        animeId: anime.id,
        title: anime.title?.english || anime.title?.romaji,
        episode: num,
        totalEpisodes,
        poster: anime.coverImage?.extraLarge || anime.coverImage?.large,
        banner: anime.bannerImage,
        format: anime.format,
      });
    }
    loadEpisodeStream(ep, num, activeServerId, 0);
  }

  // Quick jump by episode number
  function selectEpisodeNumber(epNum) {
    markInternalNavigation();
    if (epNum < 1 || epNum > totalEpisodes) return;
    playbackTimeRef.current = 0;
    setSelectedEp(epNum);
    setSearchParams({ ep: epNum }, { replace: true });
    const epObj = episodesList.find((e) => e.number === epNum) || { number: epNum };
    if (anime) {
      saveWatchHistory({
        animeId: anime.id,
        title: anime.title?.english || anime.title?.romaji,
        episode: epNum,
        totalEpisodes,
        poster: anime.coverImage?.extraLarge || anime.coverImage?.large,
        banner: anime.bannerImage,
        format: anime.format,
      });
    }
    loadEpisodeStream(epObj, epNum, activeServerId, 0);
  }

  // User manually selects a server
  function handleSelectServer(serverId) {
    markInternalNavigation();
    setActiveServerId(serverId);
    const target = SERVERS.find((s) => s.id === serverId);
    const resumeTime = playbackTimeRef.current;
    showNotice(resumeTime > 5 ? `Switched to ${target?.name || serverId} (Resuming at ${Math.floor(resumeTime)}s)` : `Switched to ${target?.name || serverId}`);
    const epObj = episodesList.find((e) => e.number === selectedEp) || { number: selectedEp };
    loadEpisodeStream(epObj, selectedEp, serverId, resumeTime);
  }

  // Auto-switch to next mirror in the same language track
  function handleAutoSwitchNext(targetTime) {
    const resumeTime = typeof targetTime === 'number' ? targetTime : playbackTimeRef.current;
    
    // Dub mode: toggle between Server 3 and Server 4
    if (activeServerId === 'server-3' || activeServerId === 'server-4' || currentResolvedServer === 'server-3' || currentResolvedServer === 'server-4') {
      const nextServer = currentResolvedServer === 'server-3' ? 'server-4' : 'server-3';
      setCurrentResolvedServer(nextServer);
      const serverObj = SERVERS.find((s) => s.id === nextServer);
      showNotice(resumeTime > 5 ? `Switched to ${serverObj?.name || nextServer} (Resuming at ${Math.floor(resumeTime)}s)` : `Switched to ${serverObj?.name || nextServer}`);
      if (id) {
        setStreamUrl('');
        setIframeUrl(getEmbedUrlForServer(id, selectedEp, nextServer, resumeTime) + '&_t=' + Date.now());
      }
      return;
    }

    // Default / Sub mode: toggle between Server 1 and Server 2 (Never force Dub)
    const nextServer = currentResolvedServer === 'server-1' ? 'server-2' : 'server-1';
    setCurrentResolvedServer(nextServer);
    const serverObj = SERVERS.find((s) => s.id === nextServer);
    showNotice(
      resumeTime > 5
        ? `Switched to ${serverObj?.name || nextServer} (Resuming at ${Math.floor(resumeTime)}s)`
        : `Switched to ${serverObj?.name || nextServer}`
    );

    if (id) {
      setStreamUrl('');
      setIframeUrl(getEmbedUrlForServer(id, selectedEp, nextServer, resumeTime) + '&_t=' + Date.now());
    }
  }

  // Refresh and reload current stream preserving timestamp
  function handleReloadCurrentStream(targetTime) {
    const resumeTime = typeof targetTime === 'number' ? targetTime : playbackTimeRef.current;
    showNotice(resumeTime > 5 ? `Reloading & resuming at ${Math.floor(resumeTime)}s...` : 'Reloading stream connection...');
    if (streamUrl && !iframeUrl) {
      const current = streamUrl;
      setStreamUrl('');
      setTimeout(() => {
        setStreamUrl(current);
        showNotice('Stream reloaded');
      }, 60);
    } else if (id) {
      setIframeUrl('');
      setTimeout(() => {
        setIframeUrl(getEmbedUrlForServer(id, selectedEp, currentResolvedServer, resumeTime) + '&_t=' + Date.now());
        showNotice('Stream reconnected');
      }, 60);
    } else {
      const epObj = episodesList.find((e) => e.number === selectedEp) || { number: selectedEp };
      loadEpisodeStream(epObj, selectedEp, activeServerId, resumeTime);
    }
  }

  // Next episode embed URL for instant zero-latency prefetch
  const nextEpEmbedUrl = useMemo(() => {
    if (!id || selectedEp >= totalEpisodes) return null;
    return getEmbedUrlForServer(id, selectedEp + 1, currentResolvedServer);
  }, [id, selectedEp, totalEpisodes, currentResolvedServer]);

  // Next episode silent standby URL for instant zero-latency background pre-buffering
  const nextEpStandbyUrl = useMemo(() => {
    if (!id || selectedEp >= totalEpisodes) return '';
    return getStandbyEmbedUrlForServer(id, selectedEp + 1, currentResolvedServer);
  }, [id, selectedEp, totalEpisodes, currentResolvedServer]);

  // Dynamic server badge for player header
  const serverLabel = useMemo(() => {
    if (activeServerId === 'auto') {
      if (currentResolvedServer === 'direct') return 'Auto: HD Direct';
      if (currentResolvedServer === 'server-1') return 'Auto: Server 1 (Sub)';
      if (currentResolvedServer === 'server-2') return 'Auto: Server 2 (Mirror)';
      if (currentResolvedServer === 'server-3') return 'Auto: Server 3 (Dub)';
      if (currentResolvedServer === 'server-4') return 'Auto: Server 4 (Dub 2)';
      return 'Auto: Best Server';
    }
    const match = SERVERS.find((s) => s.id === activeServerId);
    return match?.shortName || activeServerId;
  }, [activeServerId, currentResolvedServer]);

  // Listen to postMessage events from AnimeEmbed for progress tracking and auto-next episode.
  // The iframe is now served via /api/embed (same origin), so messages arrive from window.location.origin.
  // We also accept messages from www.animeembed.com for direct embeds (fallback).
  useEffect(() => {
    const ALLOWED_ORIGINS = new Set([
      window.location.origin,
      'https://www.animeembed.com',
    ]);

    function handleMessage(event) {
      if (!ALLOWED_ORIGINS.has(event.origin)) return;
      const data = event.data;
      if (!data || data.channel !== 'animeembed' || data.version !== 1) return;

      // Track playback progress continuously (for seamless reload & server switch)
      if (data.event === 'progress' && typeof data.data?.currentTime === 'number') {
        playbackTimeRef.current = data.data.currentTime;
      }

      // Automatically play next episode when current episode ends
      if (data.event === 'ended') {
        if (selectedEp < totalEpisodes) {
          selectEpisodeNumber(selectedEp + 1);
        }
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedEp, totalEpisodes]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setStreamError(null);

        const data = await fetchAnimeDetails(id);
        if (cancelled) return;
        setAnime(data);
        setLoading(false);

        const animeTitle = data?.title?.english || data?.title?.romaji || 'Anime';
        document.title = `Watch ${animeTitle} Online — ExoticHub`;
        document.querySelector('meta[name="description"]')?.setAttribute(
          'content',
          `Watch ${animeTitle} online in HD with Artplayer, custom subtitles (CC), and skip intro on ExoticHub.`
        );

        const explicit = Number(data?.episodes);
        const computedMax = Math.max(
          explicit || 0,
          data?.nextAiringEpisode?.episode ? data.nextAiringEpisode.episode - 1 : 0,
          data?.streamingEpisodes?.length || 0,
          1
        );
        const safeEp = Math.min(Math.max(1, selectedEp), computedMax);

        if (safeEp !== selectedEp) {
          setSelectedEp(safeEp);
          setSearchParams({ ep: safeEp }, { replace: true });
        }

        // Save progress to watch history
        saveWatchHistory({
          animeId: data.id,
          title: animeTitle,
          episode: safeEp,
          totalEpisodes: computedMax,
          poster: data.coverImage?.extraLarge || data.coverImage?.large,
          banner: data.bannerImage,
          format: data.format,
        });

        // Fetch seasons non-blocking in background
        fetchAnimeSeasons(data)
          .then((s) => {
            if (!cancelled && s) setSeasons(s);
          })
          .catch((seasonErr) => console.warn('Seasons fetch error', seasonErr));

      } catch (err) {
        console.error('Failed to load anime for watch', err);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!loading && !anime) {
    return (
      <div className="min-h-screen bg-black text-[#ededed]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-zinc-400">Anime not found.</p>
          <Link to="/" className="inline-block mt-4 text-zinc-300 hover:text-white font-bold">
            ← Back to ExoticHub Home
          </Link>
        </div>
      </div>
    );
  }

  const title = anime?.title?.english || anime?.title?.romaji || 'Anime Stream';

  return (
    <div className="min-h-screen bg-black text-[#ededed]">
      <Navbar />

      {/* Instant zero-delay background prefetch for next episode */}
      {nextEpEmbedUrl && (
        <link rel="prefetch" href={nextEpEmbedUrl} as="document" />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Main Grid: Player on left, Episode list on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Container */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <VideoPlayer
                url={streamUrl}
                iframe={iframeUrl}
                standbyIframe={nextEpStandbyUrl}
                streamHeaders={streamHeaders}
                poster={anime?.bannerImage || anime?.coverImage?.extraLarge}
                animeName={title}
                episodeTitle={`Episode ${selectedEp}`}
                onEnded={() => {
                  if (selectedEp < totalEpisodes) {
                    selectEpisodeNumber(selectedEp + 1);
                  }
                }}
                onFallbackToIframe={handleAutoSwitchNext}
                onReloadStream={handleReloadCurrentStream}
                onNextServer={handleAutoSwitchNext}
                onDownload={() => setDownloadModalOpen(true)}
                serverLabel={serverLabel}
                autoSwitchNotice={autoSwitchNotice}
              />
              {streamLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl z-10 pointer-events-none">
                  <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Stream Server / Auto Switcher Bar */}
            <div className="p-3 bg-[#0d0d0d] border border-zinc-800 rounded-2xl space-y-2.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 text-amber-400">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-2">
                      <span>Server Auto-Switcher</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Auto-Failover Active
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 hidden sm:block">
                      Automatically picks the best server & reconnects if playback drops
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleReloadCurrentStream}
                    title="Refresh stream connection & renew CDN token"
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reload</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoSwitchNext}
                    title="Force cycle to next working mirror"
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition active:scale-95 cursor-pointer"
                  >
                    <span>Auto-Switch Next</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      markInternalNavigation();
                      setDownloadModalOpen(true);
                    }}
                    title="Direct Download episode with verified mirrors & multi-quality"
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                  >
                    <Download className="w-3 h-3" />
                    <span>Direct Download</span>
                  </button>
                </div>
              </div>

              {/* Server Selection Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-zinc-800/80">
                {SERVERS.map((srv) => {
                  const isSelected = activeServerId === srv.id;
                  const Icon = srv.icon;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => handleSelectServer(srv.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between gap-1.5 cursor-pointer text-left ${
                        isSelected
                          ? 'bg-white text-black font-black shadow-md ring-1 ring-white'
                          : 'bg-[#141414] hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isSelected
                              ? srv.id === 'auto'
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-black fill-current'
                              : 'text-zinc-400'
                          }`}
                        />
                        <span className="truncate">{srv.shortName}</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex-shrink-0 ${
                          isSelected
                            ? 'bg-black/15 text-black'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        {srv.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resumed from watch history notification */}
            {resumedFromHistory && (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold shadow-sm backdrop-blur-sm animate-in fade-in">
                <div className="flex items-center gap-2">
                  <HistoryIcon className="w-4 h-4 text-zinc-300" />
                  <span>Resumed where you left off at Episode {selectedEp}</span>
                </div>
                <button
                  onClick={() => setResumedFromHistory(false)}
                  className="p-1 text-zinc-400 hover:text-white transition rounded-lg hover:bg-white/10"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Episode Navigation Bar */}
            <div className="flex items-center justify-between p-3 bg-[#0d0d0d] border border-zinc-800 rounded-2xl">
              <button
                onClick={() => selectEpisodeNumber(selectedEp - 1)}
                disabled={selectedEp <= 1}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedEp <= 1
                    ? 'opacity-30 cursor-not-allowed text-zinc-600 bg-zinc-900/40'
                    : 'bg-[#181818] hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 active:scale-95'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev Episode</span>
              </button>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-xs font-extrabold text-zinc-300">
                  Episode <span className="text-white font-black">{selectedEp}</span> of{' '}
                  <span className="text-white font-black">{totalEpisodes}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    markInternalNavigation();
                    setDownloadModalOpen(true);
                  }}
                  className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs font-bold transition flex items-center gap-1 active:scale-95"
                  title={`Download Episode ${selectedEp}`}
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span className="hidden sm:inline">Direct Download Ep {selectedEp}</span>
                </button>
              </div>

              <button
                onClick={() => selectEpisodeNumber(selectedEp + 1)}
                disabled={selectedEp >= totalEpisodes}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedEp >= totalEpisodes
                    ? 'opacity-30 cursor-not-allowed text-zinc-600 bg-zinc-900/40'
                    : 'bg-[#181818] hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 active:scale-95'
                }`}
              >
                <span>Next Episode</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {streamError && (
              <p className="text-sm font-bold text-red-400 bg-red-950/40 border border-red-900 rounded-xl px-4 py-3">
                {streamError}
              </p>
            )}

            {/* Anime Title & Meta */}
            <div className="space-y-3 pt-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-zinc-400 font-semibold">
                {anime?.averageScore && (
                  <span className="flex items-center gap-1 text-white">
                    <Star className="w-4 h-4 fill-current text-white" />
                    {anime.averageScore}% Score
                  </span>
                )}
                <span>• {anime?.format || 'TV'}</span>
                <span>• {anime?.status || 'Active'}</span>
                <span className="text-white font-bold">• {totalEpisodes} Total Episodes</span>
              </div>
              {anime?.description ? (
                <p className="text-sm text-zinc-300 leading-relaxed pt-2">
                  {stripHtml(anime.description)}
                </p>
              ) : (
                <p className="text-sm text-zinc-500 leading-relaxed pt-2">
                  Streaming high-definition anime online on ExoticHub with auto-skip and ad protection.
                </p>
              )}
            </div>
          </div>

          {/* Episode Selection Sidebar */}
          <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-4 flex flex-col h-[560px] lg:h-[660px]">
            {/* Header: Title + Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2 font-black text-white text-sm">
                <Layers className="w-4 h-4 text-zinc-300" />
                <span>Episodes ({totalEpisodes})</span>
              </div>
              <div className="flex items-center gap-1 bg-[#141414] p-0.5 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setViewMode('grid')}
                  title="Grid View (Compact Numbers)"
                  className={`p-1.5 rounded-md transition ${
                    viewMode === 'grid'
                      ? 'bg-white text-black font-bold shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="List View (Cards & Titles)"
                  className={`p-1.5 rounded-md transition ${
                    viewMode === 'list'
                      ? 'bg-white text-black font-bold shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Season Changer (visible when anime has > 1 season) */}
            {seasons.length > 1 && (
              <div className="mb-3 bg-[#141414] border border-zinc-800/90 rounded-xl p-2.5">
                <div className="flex items-center justify-between text-[11px] font-black text-zinc-400 uppercase tracking-wider mb-2">
                  <div className="flex items-center gap-1.5 text-zinc-200">
                    <Film className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Seasons</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold border border-zinc-700">
                    {seasons.length} Seasons
                  </span>
                </div>

                {/* Season Dropdown */}
                <div className="relative">
                  <select
                    value={anime.id}
                    onChange={(e) => navigate(`/watch/${e.target.value}`)}
                    className="w-full bg-[#1b1b1b] hover:bg-zinc-800 text-white font-bold text-xs rounded-lg px-3 py-2 border border-zinc-700/80 focus:outline-none focus:border-white transition cursor-pointer appearance-none pr-8 truncate"
                  >
                    {seasons.map((s, idx) => (
                      <option key={s.id} value={s.id} className="bg-[#141414] text-white">
                        Season {idx + 1}: {s.title} ({s.year || ''}) {s.episodes ? `• ${s.episodes} EPs` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                {/* Quick 1-tap Season Switcher Pills */}
                <div className="flex gap-1.5 overflow-x-auto mt-2 pt-1.5 border-t border-zinc-800/60 custom-scroll">
                  {seasons.map((s, idx) => {
                    const isCurrent = Number(anime.id) === Number(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (!isCurrent) navigate(`/watch/${s.id}`);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition duration-150 flex items-center gap-1 ${
                          isCurrent
                            ? 'bg-white text-black font-black shadow'
                            : 'bg-[#1e1e1e] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800'
                        }`}
                        title={s.title}
                      >
                        <span>S{idx + 1}</span>
                        {s.episodes && (
                          <span className="text-[10px] opacity-75 font-normal">({s.episodes})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Filter / Jump Search Bar */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Jump to ep # or title..."
                className="w-full bg-[#141414] border border-zinc-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Range Chunk Tabs (e.g. 1-100, 101-200) for large episode counts */}
            {chunkCount > 1 && !searchQuery && (
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 custom-scroll flex-shrink-0">
                {Array.from({ length: chunkCount }, (_, idx) => {
                  const start = idx * CHUNK_SIZE + 1;
                  const end = Math.min((idx + 1) * CHUNK_SIZE, totalEpisodes);
                  const isCurrent = activeChunk === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveChunk(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition duration-150 ${
                        isCurrent
                          ? 'bg-white text-black font-black shadow'
                          : 'bg-[#181818] hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800/80'
                      }`}
                    >
                      {start} - {end}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Episode List / Grid Content */}
            <div className="flex-1 overflow-y-auto pr-1 custom-scroll">
              {loading && !anime ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3 text-zinc-500">
                  <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold">Loading episodes...</span>
                </div>
              ) : displayedEpisodes.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs font-semibold">
                  No episodes found matching "{searchQuery}"
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-5 gap-2">
                  {displayedEpisodes.map((ep) => {
                    const isSelected = selectedEp === ep.number;
                    return (
                      <button
                        key={ep.number}
                        ref={isSelected ? activeEpRef : null}
                        onClick={() => handleEpClick(ep)}
                        className={`h-11 rounded-xl text-xs font-black transition duration-150 flex items-center justify-center ${
                          isSelected
                            ? 'bg-white text-black shadow-lg shadow-white/20 ring-2 ring-white scale-105'
                            : 'bg-[#141414] hover:bg-zinc-800 text-zinc-300 border border-zinc-800/80 hover:text-white'
                        }`}
                        title={ep.title}
                      >
                        {ep.number}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedEpisodes.map((ep) => {
                    const isSelected = selectedEp === ep.number;
                    return (
                      <button
                        key={ep.number}
                        ref={isSelected ? activeEpRef : null}
                        onClick={() => handleEpClick(ep)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition duration-200 ${
                          isSelected
                            ? 'bg-white text-black font-extrabold border border-white'
                            : 'bg-[#141414] hover:bg-zinc-900 border border-zinc-800/80 text-zinc-300'
                        }`}
                      >
                        <div className="w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 relative bg-black">
                          <img
                            src={ep.thumbnail}
                            alt={ep.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Play
                              className={`w-3.5 h-3.5 fill-current ${
                                isSelected ? 'text-black' : 'text-white'
                              }`}
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-xs font-bold truncate ${
                              isSelected ? 'text-black' : 'text-zinc-200'
                            }`}
                          >
                            {ep.title}
                          </div>
                          <div
                            className={`text-[10px] font-semibold mt-0.5 ${
                              isSelected ? 'text-zinc-700' : 'text-zinc-500'
                            }`}
                          >
                            Episode {ep.number}
                          </div>
                        </div>

                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            markInternalNavigation();
                            setSelectedEp(ep.number);
                            setDownloadModalOpen(true);
                          }}
                          className={`p-1.5 rounded-lg transition flex-shrink-0 ${
                            isSelected
                              ? 'text-black hover:bg-black/10'
                              : 'text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800'
                          }`}
                          title={`Download Episode ${ep.number}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Download Modal */}
      <DownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        anime={anime}
        currentEpisode={selectedEp}
        totalEpisodes={totalEpisodes}
        onSelectEpisode={(ep) => selectEpisodeNumber(ep)}
      />

      <Footer />
    </div>
  );
}
