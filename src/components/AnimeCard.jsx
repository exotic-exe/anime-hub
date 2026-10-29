import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Star } from 'lucide-react';

export default function AnimeCard({ anime }) {
  if (!anime) return null;

  const title = anime.title?.english || anime.title?.romaji;
  const image = anime.coverImage?.extraLarge || anime.coverImage?.large;
  const score = anime.averageScore;
  const genres = anime.genres?.slice(0, 2) || [];

  return (
    <div className="group relative bg-[#0a101f] border border-[#1e293b]/70 rounded-xl overflow-hidden shadow-lg hover:-translate-y-1.5 hover:border-[#0284c7]/50 hover:shadow-xl hover:shadow-[#0284c7]/10 transition-all duration-300">
      <Link to={`/details/${anime.id}`} className="block relative aspect-[3/4.2] overflow-hidden">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Score Badge */}
        {score && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[11px] font-bold text-[#38bdf8] flex items-center gap-1 border border-white/5">
            <Star className="w-3 h-3 fill-current text-[#38bdf8]" />
            {score}%
          </div>
        )}

        {/* Format / Episodes Badge */}
        {anime.episodes && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[#1d4ed8] text-[10px] font-extrabold text-white uppercase tracking-wider shadow">
            {anime.episodes} EP
          </div>
        )}

        {/* Overlay Play Button */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
          <Link
            to={`/watch/${anime.id}`}
            onClick={(e) => e.stopPropagation()}
            className="w-12 h-12 rounded-full bg-[#0284c7] text-white flex items-center justify-center shadow-lg shadow-[#0284c7]/50 transform scale-90 group-hover:scale-100 transition duration-300 hover:bg-[#0369a1]"
            title="Watch Now"
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </Link>
        </div>
      </Link>

      {/* Info Body */}
      <div className="p-3">
        <Link
          to={`/details/${anime.id}`}
          className="text-xs sm:text-sm font-bold text-gray-200 hover:text-[#38bdf8] line-clamp-2 transition"
          title={title}
        >
          {title}
        </Link>
        <div className="flex flex-wrap gap-1 mt-2">
          {genres.map((g) => (
            <span
              key={g}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.04] text-[#93c5fd]"
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
