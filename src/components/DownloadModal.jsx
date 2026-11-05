import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  HardDriveDownload,
  Film,
  CheckCircle,
  Copy,
} from 'lucide-react';
import {
  generateDirectDownload,
  getCleanAnimeTitle,
  fetchLiveDownloads,
  getOneClickDownloadUrl,
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
  const [liveData, setLiveData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);

  useEffect(() => {
    setSelectedEp(currentEpisode);
  }, [currentEpisode]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
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

  const handle1ClickDownload = () => {
    markInternalNavigation();
    const downloadUrl =
      liveData?.torrents?.[0]?.torrentUrl ||
      getOneClickDownloadUrl(title, selectedEp);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.setAttribute('download', `${title.replace(/\s+/g, '_')}_Ep_${selectedEp}.torrent`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenLink = (url) => {
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
        .catch(() => {});
    }
  };

  const primaryTorrent = liveData?.torrents?.[0] || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md bg-[#0e0e0e] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {poster && (
              <img
                src={poster}
                alt={title}
                className="w-10 h-12 object-cover rounded-xl border border-zinc-800 flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400">
                1-Click Downloader
              </span>
              <h2 className="text-sm font-extrabold text-white truncate">
                {title}
              </h2>
              <p className="text-xs text-zinc-400">
                Episode {selectedEp} of {maxEp}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition active:scale-95"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Episode Quick Selector */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-xs font-bold text-zinc-300 pl-2">Episode:</span>
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
                className="bg-black border border-zinc-700 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                {Array.from({ length: maxEp }, (_, i) => i + 1).map((ep) => (
                  <option key={ep} value={ep}>
                    Ep {ep}
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

          {/* PRIMARY 1-CLICK DOWNLOAD ACTION */}
          <button
            type="button"
            onClick={handle1ClickDownload}
            className="w-full py-4 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>Download Episode {selectedEp} (1-Click)</span>
          </button>

          {primaryTorrent?.size && (
            <p className="text-[11px] text-zinc-400 text-center font-medium">
              File Size: {primaryTorrent.size} • Seeders: {primaryTorrent.seeders} • 1080p
            </p>
          )}

          {/* 1-CLICK RESOLUTION MAGNETS */}
          {liveData?.subsplease?.downloads?.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Instant Magnets (1DM / Torrents)
              </span>
              <div className="grid grid-cols-3 gap-2">
                {liveData.subsplease.downloads.map((dl) => (
                  <button
                    key={dl.resolution}
                    type="button"
                    onClick={() => {
                      markInternalNavigation();
                      window.location.href = dl.magnet;
                    }}
                    className="py-2.5 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs transition flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{dl.resolution}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CLOUD & MP4 MIRRORS */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Direct Cloud &amp; MP4
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOpenLink(directInfo.kayoUrl)}
                className="py-3 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <HardDriveDownload className="w-4 h-4 text-emerald-400" />
                <span>Drive &amp; Mega</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenLink(directInfo.paheUrl)}
                className="py-3 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Film className="w-4 h-4 text-emerald-400" />
                <span>AnimePahe MP4</span>
              </button>
            </div>
          </div>

          {/* Quick Copy Link for 1DM (Android) */}
          {primaryTorrent?.magnet && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleCopy(primaryTorrent.magnet, 'magnet')}
                className="w-full py-2.5 px-3 rounded-xl bg-black border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                {copiedLink === 'magnet' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied Magnet Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Magnet Link (for 1DM / IDM)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-500">
          <span>1-Click Episode Download</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-bold transition active:scale-95 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
