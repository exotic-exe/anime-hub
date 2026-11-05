import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HardDriveDownload,
  Film,
  HelpCircle,
  CheckCircle,
  Copy,
  Terminal,
  Layers,
} from 'lucide-react';
import {
  generateDownloadMirrors,
  generateDirectDownload,
  getCleanAnimeTitle,
  fetchLiveDownloads,
} from '../utils/downloadHelper';
import { markInternalNavigation } from '../utils/antiRedirect';

export default function DownloadModal({
  isOpen,
  onClose,
  anime,
  currentEpisode = 1,
  totalEpisodes = 1,
  onSelectEpisode,
}) {
  const [selectedEp, setSelectedEp] = useState(currentEpisode);
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'mirrors'
  const [copiedLink, setCopiedLink] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [liveData, setLiveData] = useState(null);

  useEffect(() => {
    setSelectedEp(currentEpisode);
  }, [currentEpisode]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const title = anime ? getCleanAnimeTitle(anime.title) || 'Anime' : 'Anime';

  // Fetch live episode torrents and magnets dynamically
  useEffect(() => {
    if (!isOpen || !title) return;
    let active = true;

    fetchLiveDownloads(title, selectedEp)
      .then((data) => {
        if (active && data) {
          setLiveData(data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isOpen, title, selectedEp]);

  if (!isOpen || !anime) return null;

  const poster =
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    anime.bannerImage ||
    '';
  const maxEp = Math.max(1, Number(totalEpisodes) || 1);

  const directInfo = generateDirectDownload({
    title,
    episode: selectedEp,
    animeId: anime.id,
  });

  const mirrors = generateDownloadMirrors({
    title,
    episode: selectedEp,
    totalEpisodes: maxEp,
    animeId: anime.id,
  });

  const handleOpenDirect = (url) => {
    markInternalNavigation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = (text, id) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedLink(id);
          setTimeout(() => setCopiedLink(null), 2500);
        })
        .catch(() => fallbackCopy(text, id));
    } else {
      fallbackCopy(text, id);
    }
  };

  const fallbackCopy = (text, id) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedLink(id);
      setTimeout(() => setCopiedLink(null), 2500);
    } catch (_) {}
  };

  const primaryTorrent = liveData?.torrents?.[0] || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#0d0d0d] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {poster && (
              <img
                src={poster}
                alt={title}
                className="w-11 h-14 object-cover rounded-xl border border-zinc-800 flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400">
                Episode Downloader
              </span>
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                {title}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">
                  Episode {selectedEp} of {maxEp}
                </span>
                <span>•</span>
                <span className="text-zinc-500">1080p / 720p Dual Audio</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition active:scale-95"
            aria-label="Close download modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800/80 bg-zinc-950/40 px-4 sm:px-5">
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`py-3 px-4 font-bold text-xs transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'direct'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Direct Downloads</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mirrors')}
            className={`py-3 px-4 font-bold text-xs transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'mirrors'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cloud &amp; Storage Mirrors</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Episode Quick Selector Bar */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-xs font-bold text-zinc-300 pl-2">
              Select Episode:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={selectedEp <= 1}
                onClick={() => {
                  const prev = Math.max(1, selectedEp - 1);
                  setSelectedEp(prev);
                  if (onSelectEpisode) onSelectEpisode(prev);
                }}
                className={`p-1.5 rounded-xl border border-zinc-700/60 transition ${
                  selectedEp <= 1
                    ? 'opacity-30 cursor-not-allowed text-zinc-500'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white active:scale-95'
                }`}
                title="Previous Episode"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedEp}
                onChange={(e) => {
                  const ep = Number(e.target.value);
                  setSelectedEp(ep);
                  if (onSelectEpisode) onSelectEpisode(ep);
                }}
                className="bg-black/80 border border-zinc-700 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                {Array.from({ length: maxEp }, (_, i) => i + 1).map((ep) => (
                  <option key={ep} value={ep}>
                    Episode {ep}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={selectedEp >= maxEp}
                onClick={() => {
                  const next = Math.min(maxEp, selectedEp + 1);
                  setSelectedEp(next);
                  if (onSelectEpisode) onSelectEpisode(next);
                }}
                className={`p-1.5 rounded-xl border border-zinc-700/60 transition ${
                  selectedEp >= maxEp
                    ? 'opacity-30 cursor-not-allowed text-zinc-500'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white active:scale-95'
                }`}
                title="Next Episode"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TAB 1: DIRECT DOWNLOAD */}
          {activeTab === 'direct' && (
            <div className="space-y-3.5">
              {/* Primary Direct Download Hero Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/40 space-y-3 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      Verified Episode Download
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
                    1080p Full HD
                  </span>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    {primaryTorrent?.title || directInfo.filename}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {primaryTorrent?.size
                      ? `File Size: ${primaryTorrent.size} • Seeders: ${primaryTorrent.seeders} • Dual Audio & Soft Subtitles`
                      : 'Download full high-definition video directly with uncompressed audio & soft subtitles.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenDirect(
                        primaryTorrent?.torrentUrl || directInfo.torrentUrl
                      )
                    }
                    className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {primaryTorrent?.torrentUrl
                        ? `Download .torrent (Ep ${selectedEp})`
                        : `Download Episode ${selectedEp} (1080p)`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDirect(directInfo.kayoUrl)}
                    className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs transition flex items-center justify-center gap-2 border border-zinc-700 active:scale-95 cursor-pointer"
                  >
                    <HardDriveDownload className="w-4 h-4 text-emerald-400" />
                    <span>Cloud Download (Drive &amp; Mega)</span>
                  </button>
                </div>
              </div>

              {/* 1-Click Multi-Resolution Magnet Releases (SubsPlease) */}
              {liveData?.subsplease?.downloads?.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#141414] border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">
                      1-Click Fast Magnets ({liveData.subsplease.releaseTitle})
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold flex-shrink-0">
                      High Speed
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {liveData.subsplease.downloads.map((dl) => (
                      <button
                        key={dl.resolution}
                        type="button"
                        onClick={() => {
                          markInternalNavigation();
                          window.location.href = dl.magnet;
                        }}
                        className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{dl.resolution} Magnet</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AnimePahe & Nyaa 1080p Torrent Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* AnimePahe Compact MP4 */}
                <div className="p-3.5 rounded-2xl bg-[#141414] border border-zinc-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      AnimePahe Fast MP4
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      720p / 1080p Compact (~150MB)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDirect(directInfo.paheUrl)}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download</span>
                  </button>
                </div>

                {/* 1080p Torrent File */}
                <div className="p-3.5 rounded-2xl bg-[#141414] border border-zinc-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      1080p Lossless Torrent
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Nyaa Dual-Audio MKV
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDirect(directInfo.torrentUrl)}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>.torrent</span>
                  </button>
                </div>
              </div>

              {/* 1-Click Stream URL & CLI Downloader Command */}
              <div className="p-3.5 rounded-2xl bg-black/60 border border-zinc-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Downloader Links (1DM / IDM / Magnet / FFmpeg)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {primaryTorrent?.magnet && (
                      <button
                        type="button"
                        onClick={() => handleCopy(primaryTorrent.magnet, 'magnet')}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-[11px] font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
                        title="Copy Magnet link for 1DM, qBittorrent, or Flud"
                      >
                        {copiedLink === 'magnet' ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-extrabold">Copied Magnet!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Magnet</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopy(directInfo.streamUrl, 'stream')}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-[11px] font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
                      title="Copy stream link for 1DM (Android) or IDM (PC)"
                    >
                      {copiedLink === 'stream' ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-extrabold">Copied Link!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy 1DM/IDM Link</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(directInfo.ffmpegCommand, 'ffmpeg')}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-[11px] font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
                      title="Copy lossless terminal download command"
                    >
                      {copiedLink === 'ffmpeg' ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-extrabold">Copied Command!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Command</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-nowrap">
                  {directInfo.ffmpegCommand}
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  Paste into 1DM (Android), IDM (Windows), or your terminal to download the full 1080p episode directly to your device storage.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: ALL MIRRORS & BATCHES */}
          {activeTab === 'mirrors' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Storage Mirrors &amp; Archives
                </span>
                <span className="text-[11px] text-zinc-500">Ad-Shielded</span>
              </div>

              {mirrors.map((mirror) => (
                <div
                  key={mirror.id}
                  className={`p-3.5 rounded-2xl border transition relative group ${
                    mirror.recommended
                      ? 'bg-gradient-to-r from-emerald-950/20 via-zinc-900 to-zinc-900/80 border-emerald-500/40 shadow-sm'
                      : 'bg-[#121212] hover:bg-[#161616] border-zinc-800/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition">
                          {mirror.name}
                        </span>
                        {mirror.badge && (
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider ${
                              mirror.recommended
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            {mirror.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug">
                        {mirror.description}
                      </p>
                      <div className="flex items-center gap-2 pt-0.5 text-[10px] font-bold text-zinc-400">
                        <span>{mirror.quality}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(mirror.url, mirror.id)}
                        title="Copy link"
                        className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition active:scale-95"
                      >
                        {copiedLink === mirror.id ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDirect(mirror.url)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm ${
                          mirror.recommended
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/10'
                            : 'bg-white hover:bg-zinc-200 text-black'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                        <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Offline & App Download Guide Accordion */}
          <div className="border border-zinc-800/80 rounded-2xl overflow-hidden bg-zinc-950/40">
            <button
              type="button"
              onClick={() => setShowTips((prev) => !prev)}
              className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-zinc-300 hover:text-white transition"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>How to Download Anime for Offline Viewing (PC &amp; Mobile)</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-normal">
                {showTips ? 'Hide Tips' : 'Show Tips'}
              </span>
            </button>

            {showTips && (
              <div className="p-3.5 pt-0 text-xs text-zinc-400 space-y-2 border-t border-zinc-800/60 leading-relaxed">
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    1
                  </span>
                  <p>
                    <strong className="text-zinc-200">1-Click File Downloads:</strong> Click{' '}
                    <span className="text-emerald-400 font-semibold">Download .torrent</span> to download the torrent file directly to your device, or click <span className="text-white font-semibold">Cloud Download</span> to access high-speed Google Drive and Mega folders.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    2
                  </span>
                  <p>
                    <strong className="text-zinc-200">Mobile Fast Downloader (1DM / ADM / Flud):</strong> Tap <span className="text-white font-semibold">Copy Magnet</span> or <span className="text-white font-semibold">Copy 1DM Link</span> and paste into 1DM (Android) to download the high-speed multi-threaded video stream directly into your gallery.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    3
                  </span>
                  <p>
                    <strong className="text-zinc-200">Lossless 1080p Magnets &amp; FFmpeg:</strong> Click any resolution magnet (1080p, 720p, 480p) to open in your torrent client, or use the 1-click FFmpeg command in your terminal.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-500">
          <span>Safe &amp; Direct Anime Downloads on ExoticHub</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-bold transition active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
