import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AnimeCard from '../components/AnimeCard';
import { fetchAnimeDetails } from '../api';
import { Play, Star, Calendar, Clock, Film } from 'lucide-react';

export default function Details() {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchAnimeDetails(id);
        setAnime(data);
        const animeTitle = data?.title?.english || data?.title?.romaji || 'Anime';
        document.title = `${animeTitle} — Details, Episodes & Synopsis | AnimeHub`;
        document.querySelector('meta[name="description"]')?.setAttribute(
          'content',
          `Discover ${animeTitle}: episodes, characters, ratings, and synopsis on AnimeHub.`
        );
      } catch (err) {
        console.error('Failed to load anime details', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0d13] text-[#e4e6ed]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-2 border-gray-600 border-t-[#cae962] rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-[#0b0d13] text-[#e4e6ed]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-400">Anime not found.</p>
          <Link to="/" className="inline-block mt-4 text-[#cae962] font-bold">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const title = anime.title?.english || anime.title?.romaji;
  const banner = anime.bannerImage || anime.coverImage?.extraLarge;
  const poster = anime.coverImage?.extraLarge || anime.coverImage?.large;
  const recommendations = anime.recommendations?.nodes
    ?.map((n) => n.mediaRecommendation)
    .filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-[#0b0d13] text-[#e4e6ed]">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative w-full h-[320px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center filter brightness-50"
          style={{ backgroundImage: `url(${banner})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d13] via-[#0b0d13]/40 to-transparent" />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 -mt-36">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Poster */}
          <div className="w-48 sm:w-60 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 border-2 border-[#1f2437] bg-[#161a27]">
            <img src={poster} alt={title} className="w-full aspect-[3/4.2] object-cover" />
            <div className="p-3">
              <Link
                to={`/watch/${anime.id}`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#cae962] hover:bg-[#b5d64e] text-black font-extrabold text-sm transition shadow-lg shadow-[#cae962]/20"
              >
                <Play className="w-4 h-4 fill-current" />
                Watch Now
              </Link>
            </div>
          </div>

          {/* Details Info */}
          <div className="flex-1 space-y-4">
            <h1 className="text-3xl sm:text-4xl font-black text-white">{title}</h1>

            <div className="flex flex-wrap gap-2">
              {anime.genres?.map((g) => (
                <span
                  key={g}
                  className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#cae962]"
                >
                  {g}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-gray-400 font-semibold pt-2">
              {anime.averageScore && (
                <span className="flex items-center gap-1.5 text-[#cae962]">
                  <Star className="w-4 h-4 fill-current" />
                  {anime.averageScore}% Score
                </span>
              )}
              {anime.format && (
                <span className="flex items-center gap-1.5">
                  <Film className="w-4 h-4" />
                  {anime.format}
                </span>
              )}
              {anime.seasonYear && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {anime.seasonYear}
                </span>
              )}
              {anime.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {anime.duration} min
                </span>
              )}
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Synopsis</h3>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                {anime.description?.replace(/<[^>]*>/g, '')}
              </p>
            </div>

            {/* Characters */}
            {anime.characters?.edges?.length > 0 && (
              <div className="pt-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Characters</h3>
                <div className="flex gap-4 overflow-x-auto pb-2 custom-scroll">
                  {anime.characters.edges.map((c) => (
                    <div key={c.node.id} className="w-16 flex-shrink-0 text-center space-y-1">
                      <img
                        src={c.node.image?.medium}
                        alt={c.node.name?.full}
                        className="w-14 h-14 rounded-full mx-auto object-cover border border-[#1f2437]"
                      />
                      <div className="text-[10px] text-gray-300 font-semibold truncate">
                        {c.node.name?.full}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section className="mt-16 mb-12">
            <h2 className="text-xl font-black text-white mb-6">You Might Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {recommendations.map((rec) => (
                <AnimeCard key={rec.id} anime={rec} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
