import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, Star } from 'lucide-react';

export default function Hero({ anime }) {
  if (!anime) return null;

  const title = anime.title?.english || anime.title?.romaji;
  const banner = anime.bannerImage || anime.coverImage?.extraLarge;
  const description = anime.description?.replace(/<[^>]*>/g, '') || '';

  return (
    <div className="relative w-full min-h-[440px] flex items-end overflow-hidden mb-8">
      {/* Background with blur and gradient */}
      <div
        className="absolute inset-0 bg-cover bg-center filter brightness-[0.4]"
        style={{ backgroundImage: `url(${banner})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d13] via-[#0b0d13]/60 to-transparent" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#cae962] text-black text-xs font-black tracking-wider uppercase">
            <span>🔥 SPOTLIGHT</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            {title}
          </h1>

          <p className="text-sm sm:text-base text-gray-300 line-clamp-3 leading-relaxed">
            {description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-400 font-medium pt-1">
            {anime.averageScore && (
              <span className="flex items-center gap-1 text-[#cae962] font-bold">
                <Star className="w-4 h-4 fill-current" />
                {anime.averageScore}%
              </span>
            )}
            {anime.format && <span>• {anime.format}</span>}
            {anime.seasonYear && <span>• {anime.seasonYear}</span>}
            {anime.episodes && <span>• {anime.episodes} Episodes</span>}
          </div>

          <div className="flex items-center gap-3 pt-3">
            <Link
              to={`/watch/${anime.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#cae962] hover:bg-[#b5d64e] text-black font-extrabold text-sm transition transform hover:-translate-y-0.5 shadow-lg shadow-[#cae962]/20"
            >
              <Play className="w-4 h-4 fill-current" />
              Watch Now
            </Link>
            <Link
              to={`/details/${anime.id}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-sm backdrop-blur-sm transition"
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
