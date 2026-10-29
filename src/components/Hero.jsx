import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, Star } from 'lucide-react';
import { stripHtml } from '../utils/sanitize';

export default function Hero({ anime }) {
  if (!anime) return null;

  const title = anime.title?.english || anime.title?.romaji;
  const banner = anime.bannerImage || anime.coverImage?.extraLarge;
  const description = stripHtml(anime.description);

  return (
    <div className="relative w-full min-h-[440px] flex items-end overflow-hidden mb-8 border-b border-zinc-800">
      {/* Background with blur and gradient */}
      <div
        className="absolute inset-0 bg-cover bg-center filter brightness-[0.25]"
        style={{ backgroundImage: `url(${banner})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-black tracking-wider uppercase shadow-md">
            <span>SPOTLIGHT</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            {title}
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 line-clamp-3 leading-relaxed">
            {description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-zinc-400 font-medium pt-1">
            {anime.averageScore && (
              <span className="flex items-center gap-1 text-white font-bold">
                <Star className="w-4 h-4 fill-current text-white" />
                {anime.averageScore}% Score
              </span>
            )}
            {anime.format && <span className="text-zinc-500">• {anime.format}</span>}
            {anime.seasonYear && <span className="text-zinc-500">• {anime.seasonYear}</span>}
            {anime.episodes && <span className="text-zinc-500">• {anime.episodes} Episodes</span>}
          </div>

          <div className="flex items-center gap-3 pt-3">
            <Link
              to={`/watch/${anime.id}`}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white hover:bg-zinc-200 text-black font-extrabold text-sm transition transform hover:-translate-y-0.5 shadow-xl shadow-white/5"
            >
              <Play className="w-4 h-4 fill-current" />
              Watch Now
            </Link>
            <Link
              to={`/details/${anime.id}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-bold text-sm backdrop-blur-sm transition"
            >
              <Info className="w-4 h-4" />
              Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
