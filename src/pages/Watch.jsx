import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VideoPlayer from '../components/VideoPlayer';
import Footer from '../components/Footer';
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
} from 'lucide-react';
import { stripHtml } from '../utils/sanitize';

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
    badge: 'Reliable',
    icon: Server,
  },
  {
    id: 'server-3',
    name: 'Server 3 (English Dub)',
    shortName: 'Server 3 (Dub)',
    badge: 'Dubbed',
    icon: Film,
  },
];

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [anime, setAnime] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEp, setSelectedEp] = useState(1);
  const [streamUrl, setStreamUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');
  const [streamHeaders, setStreamHeaders] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [streamEpisodes, setStreamEpisodes] = useState([]);
  const [resumedFromHistory, setResumedFromHistory] = useState(false);

  // Auto-Switcher & Multi-Server State
  const [activeServerId, setActiveServerId] = useState('auto');
  const [currentResolvedServer, setCurrentResolvedServer] = useState('server-1');
  const [autoSwitchNotice, setAutoSwitchNotice] = useState(null);
  const noticeTimerRef = useRef(null);

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

  // Load stream for an episode based on target server
  async function loadEpisodeStream(ep, epNumber, targetServerId = activeServerId) {
    const num = epNumber || ep?.number || selectedEp || 1;
    setStreamLoading(true);
    setStreamError(null);

    const ts = Date.now();

    try {
      if (targetServerId === 'auto') {
        // Step 1: In Auto mode, try direct HD stream if episode id exists
        if (ep?.id) {
          try {
            const stream = await fetchEpisodeStream(ep.id);
            const directUrl = getBestStreamUrl(stream?.sources);
            const embedIframe = stream?.iframe;

            setStreamHeaders(stream?.headers || null);

            if (directUrl) {
              setIframeUrl('');
              setStreamUrl(directUrl);
              setCurrentResolvedServer('direct');
              return;
            } else if (embedIframe) {
              setStreamUrl('');
              setIframeUrl(embedIframe);
              setCurrentResolvedServer('direct-embed');
              return;
            }
          } catch (scraperErr) {
            console.warn('Auto mode direct stream scraper failed, auto-falling back to Server 1', scraperErr);
          }
        }

        // Step 2: Auto fallback to dedicated Server 1 (Sub)
        if (id) {
          setStreamUrl('');
          setIframeUrl(`https://www.animeembed.com/embed/ani/${id}/${num}?track=sub&_t=${ts}`);
          setCurrentResolvedServer('server-1');
          return;
        }
      } else if (targetServerId === 'server-1') {
        setStreamUrl('');
        setIframeUrl(`https://www.animeembed.com/embed/ani/${id}/${num}?track=sub&_t=${ts}`);
        setCurrentResolvedServer('server-1');
        return;
      } else if (targetServerId === 'server-2') {
        setStreamUrl('');
        setIframeUrl(`https://www.animeembed.com/embed/ani/${id}/${num}?_t=${ts}`);
        setCurrentResolvedServer('server-2');
        return;
      } else if (targetServerId === 'server-3') {
        setStreamUrl('');
        setIframeUrl(`https://www.animeembed.com/embed/ani/${id}/${num}?track=dub&_t=${ts}`);
        setCurrentResolvedServer('server-3');
        return;
      }

      setStreamError('No stream source found for this episode.');
    } catch (err) {
      console.warn('Episode stream loading failed, cycling to fallback server', err);
      if (id) {
        setStreamUrl('');
        setIframeUrl(`https://www.animeembed.com/embed/ani/${id}/${num}?_t=${ts}`);
        setCurrentResolvedServer('server-2');
      } else {
        setStreamError('Failed to load stream for this episode.');
      }
    } finally {
      setStreamLoading(false);
    }
  }

  // Handle episode click
  async function handleEpClick(ep) {
    const num = ep.number;
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
    await loadEpisodeStream(ep, num, activeServerId);
  }

  // Quick jump by episode number
  async function selectEpisodeNumber(epNum) {
    if (epNum < 1 || epNum > totalEpisodes) return;
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
    await loadEpisodeStream(epObj, epNum, activeServerId);
  }

  // User manually selects a server
  function handleSelectServer(serverId) {
    setActiveServerId(serverId);
    const target = SERVERS.find((s) => s.id === serverId);
    showNotice(`Switched to ${target?.name || serverId}`);
    const epObj = episodesList.find((e) => e.number === selectedEp) || { number: selectedEp };
    loadEpisodeStream(epObj, selectedEp, serverId);
  }

  // Auto-switch to next server in the failover ring
  function handleAutoSwitchNext() {
    let nextServer = 'server-2';
    if (currentResolvedServer === 'server-2') {
      nextServer = 'server-3';
    } else if (currentResolvedServer === 'server-3') {
      nextServer = 'server-1';
    } else {
      nextServer = 'server-2';
    }

    setCurrentResolvedServer(nextServer);
    const serverObj = SERVERS.find((s) => s.id === nextServer);
    showNotice(`Auto-switched to ${serverObj?.name || nextServer}`);

    if (id) {
      setStreamUrl('');
      const ts = Date.now();
      const nextUrl =
        nextServer === 'server-1'
          ? `https://www.animeembed.com/embed/ani/${id}/${selectedEp}?track=sub&_t=${ts}`
          : nextServer === 'server-2'
          ? `https://www.animeembed.com/embed/ani/${id}/${selectedEp}?_t=${ts}`
          : `https://www.animeembed.com/embed/ani/${id}/${selectedEp}?track=dub&_t=${ts}`;
      setIframeUrl(nextUrl);
    }
  }

  // Refresh and reload current stream / renew CDN token
  function handleReloadCurrentStream() {
    showNotice('Reloading stream & renewing connection...');
    if (streamUrl && !iframeUrl) {
      const current = streamUrl;
      setStreamUrl('');
      setTimeout(() => {
        setStreamUrl(current);
        showNotice('Stream reloaded');
      }, 150);
    } else if (iframeUrl) {
      const base = iframeUrl.split('&_t=')[0].split('?_t=')[0];
      const sep = base.includes('?') ? '&' : '?';
      const refreshed = `${base}${sep}_t=${Date.now()}`;
      setIframeUrl('');
      setTimeout(() => {
        setIframeUrl(refreshed);
        showNotice('Stream connection refreshed');
      }, 150);
    } else {
      const epObj = episodesList.find((e) => e.number === selectedEp) || { number: selectedEp };
      loadEpisodeStream(epObj, selectedEp, activeServerId);
    }
  }

  // Dynamic server badge for player header
  const serverLabel = useMemo(() => {
    if (activeServerId === 'auto') {
      if (currentResolvedServer === 'direct') return 'Auto: HD Direct';
      if (currentResolvedServer === 'server-1') return 'Auto: Server 1 (Sub)';
      if (currentResolvedServer === 'server-2') return 'Auto: Server 2 (Mirror)';
      if (currentResolvedServer === 'server-3') return 'Auto: Server 3 (Dub)';
      return 'Auto: Best Server';
    }
    const match = SERVERS.find((s) => s.id === activeServerId);
    return match?.shortName || activeServerId;
  }, [activeServerId, currentResolvedServer]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setStreamUrl('');
        setIframeUrl('');
        setStreamError(null);
        setStreamEpisodes([]);

        const data = await fetchAnimeDetails(id);
        setAnime(data);

        // Fetch franchise seasons for the season changer
        try {
          const s = await fetchAnimeSeasons(data);
          setSeasons(s || []);
        } catch (seasonErr) {
          console.warn('Seasons fetch error', seasonErr);
        }

        const animeTitle = data?.title?.english || data?.title?.romaji || 'Anime';
        document.title = `Watch ${animeTitle} Online — ExoticHub`;
        document.querySelector('meta[name="description"]')?.setAttribute(
          'content',
          `Watch ${animeTitle} online in HD with Artplayer, custom subtitles (CC), and skip intro on ExoticHub.`
        );

        // Streaming provider: try english title, then romaji, then clean title prefix
        let loadedEpisodes = [];
        try {
          let match = null;
          const candidates = [
            data?.title?.english,
            data?.title?.romaji,
            data?.title?.english?.split(/[:–—\-]/)[0]?.trim(),
            data?.title?.romaji?.split(/[:–—\-]/)[0]?.trim(),
          ].filter(Boolean);

          for (const cand of [...new Set(candidates)]) {
            const search = await searchStreamAnime(cand);
            if (search?.results && search.results.length > 0) {
              match = search.results[0];
              break;
            }
          }

          if (match?.id) {
            const epData = await fetchStreamEpisodes(match.id);
            const eps = epData?.episodes || [];
            if (eps.length > 0) {
              setStreamEpisodes(eps);
              loadedEpisodes = eps;
            }
          }
        } catch (streamErr) {
          console.warn('Streaming setup fallback to embed player', streamErr);
        }

        // Determine starting episode: URL param ?ep=N > saved Watch History > Episode 1
        let startEp = 1;
        const paramEp = parseInt(searchParams.get('ep'), 10);
        const savedHistory = getAnimeHistory(id);

        if (!isNaN(paramEp) && paramEp > 0) {
          startEp = paramEp;
        } else if (savedHistory && savedHistory.episode > 0) {
          startEp = savedHistory.episode;
          setResumedFromHistory(true);
        }

        const explicit = Number(data.episodes);
        const computedMax = Math.max(
          explicit || 0,
          data.nextAiringEpisode?.episode ? data.nextAiringEpisode.episode - 1 : 0,
          loadedEpisodes.length || 0,
          data.streamingEpisodes?.length || 0,
          1
        );
        const safeEp = Math.min(Math.max(1, startEp), computedMax);

        setSelectedEp(safeEp);
        setSearchParams({ ep: safeEp }, { replace: true });

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

        const targetEp = loadedEpisodes.find((e) => e.number === safeEp) || { number: safeEp };
        await loadEpisodeStream(targetEp, safeEp);
      } catch (err) {
        console.error('Failed to load anime for watch', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-[#ededed]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!anime) {
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

  const title = anime.title?.english || anime.title?.romaji;

  return (
    <div className="min-h-screen bg-black text-[#ededed]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Main Grid: Player on left, Episode list on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Container */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <VideoPlayer
                url={streamUrl}
                iframe={iframeUrl}
                streamHeaders={streamHeaders}
                poster={anime.bannerImage || anime.coverImage?.extraLarge}
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
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>Auto-Switch Next</span>
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

              <div className="text-xs font-extrabold text-zinc-300">
                Episode <span className="text-white font-black">{selectedEp}</span> of{' '}
                <span className="text-white font-black">{totalEpisodes}</span>
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
                {anime.averageScore && (
                  <span className="flex items-center gap-1 text-white">
                    <Star className="w-4 h-4 fill-current text-white" />
                    {anime.averageScore}% Score
                  </span>
                )}
                <span>• {anime.format || 'TV'}</span>
                <span>• {anime.status}</span>
                <span className="text-white font-bold">• {totalEpisodes} Total Episodes</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed pt-2">
                {stripHtml(anime.description)}
              </p>
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
              {displayedEpisodes.length === 0 ? (
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
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
