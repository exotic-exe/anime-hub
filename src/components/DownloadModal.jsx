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
  Zap,
  Terminal,
  Play,
  Layers,
} from 'lucide-react';
import {
  generateDownloadMirrors,
  generateDirectDownload,
  getCleanAnimeTitle,
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

  if (!isOpen || !anime) return null;

  const title = getCleanAnimeTitle(anime.title) || 'Anime';
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-[#0e0e0e] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Download Anime</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold border border-emerald-500/30">
                  Ep {selectedEp}
                </span>
              </h2>
              <p className="text-xs text-zinc-400 truncate max-w-[260px] sm:max-w-md">
                {title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 flex items-center justify-center transition active:scale-95"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-[#121212] px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'direct'
                ? 'bg-zinc-900 text-emerald-400 border-emerald-500'
                : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Direct Download</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mirrors')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'mirrors'
                ? 'bg-zinc-900 text-white border-white'
                : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Storage Mirrors &amp; Batches</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scroll">
          {/* Episode Selector Bar */}
          <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {poster && (
                <img
                  src={poster}
                  alt={title}
                  className="w-10 h-14 object-cover rounded-lg border border-zinc-800 flex-shrink-0"
                />
              )}
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Selected Episode
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-black text-white">
                    Episode {selectedEp}
                  </span>
                  <span className="text-xs text-zinc-500">of {maxEp}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(1, selectedEp - 1);
                  setSelectedEp(next);
                  if (onSelectEpisode) onSelectEpisode(next);
                }}
                disabled={selectedEp <= 1}
                className={`p-2 rounded-xl border border-zinc-800 text-xs font-bold transition flex items-center ${
                  selectedEp <= 1
                    ? 'opacity-30 cursor-not-allowed bg-zinc-950 text-zinc-600'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white active:scale-95'
                }`}
                title="Previous Episode"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedEp}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setSelectedEp(num);
                  if (onSelectEpisode) onSelectEpisode(num);
                }}
                className="bg-black hover:bg-zinc-900 text-white font-bold text-xs rounded-xl px-3 py-2 border border-zinc-700 focus:outline-none focus:border-white transition cursor-pointer"
              >
                {Array.from({ length: maxEp }, (_, i) => i + 1).map((ep) => (
                  <option key={ep} value={ep}>
                    Ep {ep}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  const next = Math.min(maxEp, selectedEp + 1);
                  setSelectedEp(next);
                  if (onSelectEpisode) onSelectEpisode(next);
                }}
                disabled={selectedEp >= maxEp}
                className={`p-2 rounded-xl border border-zinc-800 text-xs font-bold transition flex items-center ${
                  selectedEp >= maxEp
                    ? 'opacity-30 cursor-not-allowed bg-zinc-950 text-zinc-600'
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
                      Instant Direct Stream &amp; Download
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
                    1080p Full HD
                  </span>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    {directInfo.filename}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Streamed from high-speed edge CDN with uncompressed audio &amp; soft subtitles.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenDirect(directInfo.standaloneUrl)}
                    className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Direct Download (Sub)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDirect(directInfo.dubStandaloneUrl)}
                    className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs transition flex items-center justify-center gap-2 border border-zinc-700 active:scale-95 cursor-pointer"
                  >
                    <Film className="w-4 h-4 text-emerald-400" />
                    <span>Direct Download (Dub)</span>
                  </button>
                </div>
              </div>

              {/* 1-Click CLI & Download Manager Command Card */}
              <div className="p-3.5 rounded-2xl bg-black/60 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>1-Click Downloader Command (VLC / 1DM / FFmpeg)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(directInfo.ffmpegCommand, 'ffmpeg')}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-[11px] font-bold transition flex items-center gap-1 active:scale-95"
                  >
                    {copiedLink === 'ffmpeg' ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-extrabold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Command</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-nowrap">
                  {directInfo.ffmpegCommand}
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  Paste into terminal to download the entire uncompressed 1080p episode directly into your current folder.
                </p>
              </div>

              {/* Direct MP4 Servers & Torrent Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Direct MP4 Mirror */}
                <div className="p-3 rounded-2xl bg-[#141414] border border-zinc-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      Direct MP4 Mirror
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Mp4Upload / Vidstreaming
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDirect(directInfo.directMp4Url)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition flex items-center gap-1 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Open MP4</span>
                  </button>
                </div>

                {/* 1080p Torrent File */}
                <div className="p-3 rounded-2xl bg-[#141414] border border-zinc-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      1080p BDRip Torrent
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Nyaa Dual-Audio MKV
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDirect(directInfo.torrentUrl)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition flex items-center gap-1 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download .torrent</span>
                  </button>
                </div>
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
                    <strong className="text-zinc-200">1-Click Direct Download:</strong> Click{' '}
                    <span className="text-emerald-400 font-semibold">Direct Download</span> above. It launches the direct video player. You can then press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white">Ctrl + S</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white">Cmd + S</kbd> to save the entire episode directly to your device storage.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    2
                  </span>
                  <p>
                    <strong className="text-zinc-200">Mobile (Android / iOS):</strong> Open the link in Chrome/Safari, tap the three dots or video controls, and select <span className="text-white font-semibold">Download Video</span>, or share the link with <span className="text-white font-semibold">1DM (Android)</span>.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    3
                  </span>
                  <p>
                    <strong className="text-zinc-200">Fast FFmpeg Lossless Save:</strong> Click <span className="text-white font-semibold">Copy Command</span> above and run it in your terminal. It downloads and multiplexes the full 1080p stream in seconds without quality degradation.
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
