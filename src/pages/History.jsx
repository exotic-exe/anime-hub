import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  History as HistoryIcon,
  Play,
  Trash2,
  X,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  getWatchHistory,
  removeHistoryItem,
  clearWatchHistory,
  formatRelativeTime
} from '../utils/history';

export default function History() {
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();

  function loadHistory() {
    setHistory(getWatchHistory());
  }

  useEffect(() => {
    document.title = 'Watch History — ExoticHub';
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      'View your watch history and pick up anime episodes right where you left off on ExoticHub.'
    );
    loadHistory();
    window.addEventListener('exotichub_history_updated', loadHistory);
    return () => window.removeEventListener('exotichub_history_updated', loadHistory);
  }, []);

  function handleClearAll() {
    if (window.confirm('Are you sure you want to clear your entire watch history?')) {
      clearWatchHistory();
    }
  }

  return (
    <div className="min-h-screen bg-black text-[#ededed]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-zinc-800 gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <HistoryIcon className="w-6 h-6 text-white" />
              <h1 className="text-2xl sm:text-3xl font-black text-white">Watch History</h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-semibold">
              Pick up right where you left off across all your devices
            </p>
          </div>

          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-red-950 text-zinc-300 hover:text-red-300 font-bold text-xs border border-zinc-800 transition shadow-sm w-fit"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {/* Empty State */}
        {history.length === 0 ? (
          <div className="text-center py-20 px-4 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shadow-xl">
              <HistoryIcon className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-white">No Watch History Yet</h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              When you stream anime on ExoticHub, your episodes and resume points are saved automatically so you can resume anytime.
            </p>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs transition shadow-lg shadow-white/5"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>Explore Trending Anime</span>
              </Link>
            </div>
          </div>
        ) : (
          /* History Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {history.map((item) => (
              <div
                key={item.animeId}
                onClick={() => navigate(`/watch/${item.animeId}?ep=${item.episode}`)}
                className="group relative bg-[#0e0e0e] rounded-2xl overflow-hidden border border-zinc-800/80 hover:border-zinc-500 transition duration-300 cursor-pointer flex flex-col shadow-lg shadow-black/40 hover:-translate-y-1"
              >
                {/* Poster */}
                <div className="relative aspect-[3/4.2] overflow-hidden bg-zinc-950">
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600 font-bold text-xs">
                      No Image
                    </div>
                  )}

                  {/* Episode Badge */}
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-[10px] font-black text-white border border-zinc-700 flex items-center gap-1 shadow">
                    <span>EP {item.episode}</span>
                    {item.totalEpisodes > 1 && (
                      <span className="text-zinc-400 font-normal">/ {item.totalEpisodes}</span>
                    )}
                  </div>

                  {/* Remove Item Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeHistoryItem(item.animeId);
                    }}
                    title="Remove from history"
                    className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/80 hover:bg-red-950 text-zinc-400 hover:text-red-400 border border-zinc-700/80 flex items-center justify-center transition opacity-0 group-hover:opacity-100 shadow"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                    <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl shadow-black transform scale-90 group-hover:scale-100 transition duration-300">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(10, (item.episode / (item.totalEpisodes || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white group-hover:text-zinc-200 line-clamp-1">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-400">
                      <span className="font-semibold text-zinc-300">
                        Episode {item.episode}
                      </span>
                      <span>{formatRelativeTime(item.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-bold text-zinc-300 group-hover:text-white">
                    <span className="flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      Resume
                    </span>
                    <span className="text-zinc-500 font-semibold">{item.format || 'TV'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
