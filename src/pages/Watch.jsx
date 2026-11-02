import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VideoPlayer from '../components/VideoPlayer';
import Footer from '../components/Footer';
import { fetchAnimeDetails } from '../api';
import { searchStreamAnime, fetchStreamEpisodes, fetchEpisodeStream, getBestStreamUrl } from '../api/streaming';
import {
  Star,
  Play,
  Layers,
  LayoutGrid,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { stripHtml } from '../utils/sanitize';

const CHUNK_SIZE = 100;

export default function Watch() {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEp, setSelectedEp] = useState(1);
  const [streamUrl, setStreamUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');
  const [streamHeaders, setStreamHeaders] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [streamEpisodes, setStreamEpisodes] = useState([]);

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

  // Load stream for an episode
  async function loadEpisodeStream(ep, epNumber) {
    const num = epNumber || ep?.number || selectedEp || 1;
    setStreamLoading(true);
    setStreamError(null);
    try {
      if (ep?.id) {
        const stream = await fetchEpisodeStream(ep.id);
        const directUrl = getBestStreamUrl(stream?.sources);
        const embedIframe = stream?.iframe;

        setStreamHeaders(stream?.headers || null);

        if (directUrl) {
          setIframeUrl('');
          setStreamUrl(directUrl);
          return;
        } else if (embedIframe) {
          setStreamUrl('');
          setIframeUrl(embedIframe);
          return;
        }
      }

      // Universal dedicated anime player fallback for AniList ID
      if (id) {
        setStreamUrl('');
        setIframeUrl(`https://www.animeembed.com/embed/ani/${id}/${num}?track=sub`);
        return;
      }

      setStreamError('No stream source found for this episode.');
    } catch (err) {
      console.warn('Episode stream scraper failed, using embed player', err);
      if (id) {
        setStreamUrl('');
        setIframeUrl(`https://www.animeembed.com/embed/ani/${id}/${num}?track=sub`);
      } else {
        setStreamError('Failed to load stream for this episode.');
      }
    } finally {
      setStreamLoading(false);
    }
  }

  // Handle episode click
  async function handleEpClick(ep) {
    setSelectedEp(ep.number);
    await loadEpisodeStream(ep, ep.number);
  }

  // Quick jump by episode number
  async function selectEpisodeNumber(epNum) {
    if (epNum < 1 || epNum > totalEpisodes) return;
    setSelectedEp(epNum);
    const epObj = episodesList.find((e) => e.number === epNum) || { number: epNum };
    await loadEpisodeStream(epObj, epNum);
  }

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
        const animeTitle = data?.title?.english || data?.title?.romaji || 'Anime';
        document.title = `Watch ${animeTitle} Online — ExoticHub`;
        document.querySelector('meta[name="description"]')?.setAttribute(
          'content',
          `Watch ${animeTitle} online in HD with Artplayer, custom subtitles (CC), and skip intro on ExoticHub.`
        );

        // Streaming provider: try english title, then romaji, then clean title prefix
        let firstEpisode = null;
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
              firstEpisode = eps[0];
            }
          }
        } catch (streamErr) {
          console.warn('Streaming setup fallback to embed player', streamErr);
        }

        // Always automatically start playing Episode 1!
        const epNum = firstEpisode?.number || 1;
        setSelectedEp(epNum);
        await loadEpisodeStream(firstEpisode || { number: 1 }, epNum);
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
              />
              {streamLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl z-10">
                  <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </div>

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
