import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AnimeCard from '../components/AnimeCard';
import Footer from '../components/Footer';
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
        document.title = `${animeTitle} — Details & Synopsis | ExoticHub`;
        document.querySelector('meta[name="description"]')?.setAttribute(
          'content',
          `Discover ${animeTitle}: episodes, characters, ratings, and synopsis on ExoticHub.`
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
      <div className="min-h-screen bg-[#030712] text-[#e2e8f0]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-2 border-gray-600 border-t-[#0284c7] rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-[#030712] text-[#e2e8f0]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-400">Anime not found.</p>
          <Link to="/" className="inline-block mt-4 text-[#38bdf8] font-bold">
            ← Back to ExoticHub Home
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
    <div className="min-h-screen bg-[#030712] text-[#e2e8f0]">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative w-full h-[320px] overflow-hidden border-b border-[#1e293b]">
        <div
          className="absolute inset-0 bg-cover bg-center filter brightness-[0.35]"
          style={{ backgroundImage: `url(${banner})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/50 to-transparent" />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 -mt-36 pb-16">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Poster */}
          <div className="w-48 sm:w-60 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 border-2 border-[#1e293b] bg-[#0a101f]">
            <img src={poster} alt={title} className="w-full aspect-[3/4.2] object-cover" />
            <div className="p-3">
              <Link
                to={`/watch/${anime.id}`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] hover:from-[#0369a1] hover:to-[#0284c7] text-white font-extrabold text-sm transition shadow-lg shadow-[#0284c7]/30"
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
                  className="px-3 py-1 rounded-full bg-[#0284c7]/15 border border-[#0284c7]/30 text-xs font-semibold text-[#38bdf8]"
                >
                  {g}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-gray-400 font-semibold pt-2">
              {anime.averageScore && (
                <span className="flex items-center gap-1.5 text-[#38bdf8]">
                  <Star className="w-4 h-4 fill-current" />
                  {anime.averageScore}% Score
                </span>
              )}
              {anime.format && (
                <span className="flex items-center gap-1.5 text-gray-300">
                  <Film className="w-4 h-4 text-[#38bdf8]" />
                  {anime.format}
                </span>
              )}
              {anime.seasonYear && (
                <span className="flex items-center gap-1.5 text-gray-300">
                  <Calendar className="w-4 h-4 text-[#38bdf8]" />
                  {anime.seasonYear}
                </span>
              )}
              {anime.duration && (
                <span className="flex items-center gap-1.5 text-gray-300">
                  <Clock className="w-4 h-4 text-[#38bdf8]" />
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
                        className="w-14 h-14 rounded-full mx-auto object-cover border border-[#1e293b]"
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

      <Footer />
    </div>
  );
}
