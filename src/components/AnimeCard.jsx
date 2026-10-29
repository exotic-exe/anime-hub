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
    <div className="group relative bg-[#0d0d0d] border border-zinc-800/80 rounded-xl overflow-hidden shadow-lg hover:-translate-y-1 hover:border-zinc-600 transition-all duration-300">
      <Link to={`/details/${anime.id}`} className="block relative aspect-[3/4.2] overflow-hidden">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Score Badge */}
        {score && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1 border border-zinc-700">
            <Star className="w-3 h-3 fill-current text-white" />
            {score}%
          </div>
        )}

        {/* Format / Episodes Badge */}
        {anime.episodes && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-extrabold text-zinc-200 uppercase tracking-wider border border-zinc-700 shadow">
            {anime.episodes} EP
          </div>
        )}

        {/* Overlay Play Button */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
          <Link
            to={`/watch/${anime.id}`}
            onClick={(e) => e.stopPropagation()}
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl shadow-black transform scale-90 group-hover:scale-100 transition duration-300 hover:bg-zinc-200"
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
          className="text-xs sm:text-sm font-bold text-zinc-200 hover:text-white line-clamp-2 transition"
          title={title}
        >
          {title}
        </Link>
        <div className="flex flex-wrap gap-1 mt-2">
          {genres.map((g) => (
            <span
              key={g}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400"
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
