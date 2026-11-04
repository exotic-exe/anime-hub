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
} from 'lucide-react';
import { generateDownloadMirrors, getCleanAnimeTitle } from '../utils/downloadHelper';
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

  const mirrors = generateDownloadMirrors({
    title,
    episode: selectedEp,
    totalEpisodes: maxEp,
    animeId: anime.id,
  });

  const handleOpenMirror = (url) => {
    markInternalNavigation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = (url, id) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setCopiedLink(id);
          setTimeout(() => setCopiedLink(null), 2500);
        })
        .catch(() => fallbackCopy(url, id));
    } else {
      fallbackCopy(url, id);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-[#0e0e0e] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Download Episode</span>
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
                  Select Episode to Download
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

          {/* Download Mirrors List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Verified Download Mirrors
              </span>
              <span className="text-[11px] text-zinc-500">100% Ad-Shielded</span>
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
                      onClick={() => handleCopyLink(mirror.url, mirror.id)}
                      title="Copy download link"
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
                      onClick={() => handleOpenMirror(mirror.url)}
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

          {/* Offline & App Download Guide Accordion */}
          <div className="border border-zinc-800/80 rounded-2xl overflow-hidden bg-zinc-950/40">
            <button
              type="button"
              onClick={() => setShowTips((prev) => !prev)}
              className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-zinc-300 hover:text-white transition"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>How to Download Anime for Offline Viewing (PC & Mobile)</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-normal">
                {showTips ? 'Hide Tips' : 'Show Tips'}
              </span>
            </button>

            {showTips && (
              <div className="p-3.5 pt-0 text-xs text-zinc-400 space-y-2 border-t border-zinc-800/60 leading-relaxed animate-in fade-in">
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    1
                  </span>
                  <p>
                    <strong className="text-zinc-200">Browser Download Extensions (PC/Mac):</strong> Install free extensions like{' '}
                    <span className="text-white font-semibold">Video DownloadHelper</span> or{' '}
                    <span className="text-white font-semibold">CocoCut</span>. When you start video playback on ExoticHub, the extension detects the stream and lets you save the full 1080p MP4 file with 1 click.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    2
                  </span>
                  <p>
                    <strong className="text-zinc-200">Mobile Download (Android / iOS):</strong> Use{' '}
                    <span className="text-white font-semibold">1DM (Android)</span> or browser downloaders to download the high-speed mirrors listed above directly to your device storage.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    3
                  </span>
                  <p>
                    <strong className="text-zinc-200">Fast MP4 Direct Mirrors:</strong> Click the green{' '}
                    <span className="text-emerald-400 font-semibold">Direct Fast CDN Mirror</span> button above. It opens the episode page with ready-to-download servers (Vidstreaming, Mp4Upload) in multiple qualities (360p, 480p, 720p, 1080p).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-500">
          <span>Safe & High-Speed Anime Downloads on ExoticHub</span>
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
