import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AnimeCard from '../components/AnimeCard';
import Footer from '../components/Footer';
import { fetchAnimeDetails } from '../api';
import { Play, Star, Calendar, Clock, Film } from 'lucide-react';
import { stripHtml } from '../utils/sanitize';

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
      <div className="min-h-screen bg-black text-[#ededed]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-black text-[#ededed]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-zinc-400">Anime not found.</p>
          <Link to="/" className="inline-block mt-4 text-zinc-300 hover:text-white font-bold">
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
    <div className="min-h-screen bg-black text-[#ededed]">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative w-full h-[320px] overflow-hidden border-b border-zinc-800">
        <div
          className="absolute inset-0 bg-cover bg-center filter brightness-[0.25]"
          style={{ backgroundImage: `url(${banner})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 -mt-36 pb-16">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Poster */}
          <div className="w-48 sm:w-60 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 border-2 border-zinc-800 bg-[#0d0d0d]">
            <img src={poster} alt={title} className="w-full aspect-[3/4.2] object-cover" />
            <div className="p-3">
              <Link
                to={`/watch/${anime.id}`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-sm transition shadow-lg shadow-white/10"
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
                  className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300"
                >
                  {g}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-zinc-400 font-semibold pt-2">
              {anime.averageScore && (
                <span className="flex items-center gap-1.5 text-white">
                  <Star className="w-4 h-4 fill-current text-white" />
                  {anime.averageScore}% Score
                </span>
              )}
              {anime.format && (
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Film className="w-4 h-4 text-zinc-300" />
                  {anime.format}
                </span>
              )}
              {anime.seasonYear && (
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Calendar className="w-4 h-4 text-zinc-300" />
                  {anime.seasonYear}
                </span>
              )}
              {anime.duration && (
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Clock className="w-4 h-4 text-zinc-300" />
                  {anime.duration} min
                </span>
              )}
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Synopsis</h3>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                {stripHtml(anime.description)}
              </p>
            </div>

            {/* Characters */}
            {anime.characters?.edges?.length > 0 && (
              <div className="pt-4">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Characters</h3>
                <div className="flex gap-4 overflow-x-auto pb-2 custom-scroll">
                  {anime.characters.edges.map((c) => (
                    <div key={c.node.id} className="w-16 flex-shrink-0 text-center space-y-1">
                      <img
                        src={c.node.image?.medium}
                        alt={c.node.name?.full}
                        className="w-14 h-14 rounded-full mx-auto object-cover border border-zinc-800"
                      />
                      <div className="text-[10px] text-zinc-300 font-semibold truncate">
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
