import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import AnimeCard from '../components/AnimeCard';
import ContinueWatching from '../components/ContinueWatching';
import Footer from '../components/Footer';
import { fetchHomePageData, getCachedHomePageData, fetchAnimeByGenre } from '../api';
import {
  Flame,
  Star,
  Trophy,
  Tv,
  Film,
  Sparkles,
  ArrowRight,
  Compass,
  Layers,
  ChevronRight
} from 'lucide-react';

const FEATURED_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Romance',
  'Sci-Fi',
  'Supernatural',
  'Mystery',
  'Sports',
  'Thriller',
];

export default function Home() {
  // Synchronous cache check for 0ms instant display without spinners
  const initialCache = getCachedHomePageData();
  const [data, setData] = useState(
    initialCache || {
      trending: [],
      airing: [],
      popular: [],
      topRated: [],
      movies: [],
      upcoming: [],
    }
  );
  const [loading, setLoading] = useState(!initialCache);

  // Genre Showcase State (Placed on Top)
  const [activeGenre, setActiveGenre] = useState('Action');
  const [genreAnime, setGenreAnime] = useState([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreCache, setGenreCache] = useState({});

  useEffect(() => {
    document.title = 'ExoticHub — Watch, Track & Discover Anime Online | Stream Anime';
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      'ExoticHub: Stream thousands of anime series, movies, and episodes in HD with instant search, resume tracking, and custom player.'
    );

    async function loadData() {
      try {
        const homeData = await fetchHomePageData();
        setData(homeData);
      } catch (err) {
        console.error('Failed to load anime data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch genre anime when activeGenre changes with instant memory cache
  useEffect(() => {
    if (genreCache[activeGenre]) {
      setGenreAnime(genreCache[activeGenre]);
      return;
    }

    async function loadGenre() {
      setGenreLoading(true);
      try {
        const list = await fetchAnimeByGenre(activeGenre, 1, 12);
        setGenreCache((prev) => ({ ...prev, [activeGenre]: list || [] }));
        setGenreAnime(list || []);
      } catch (err) {
        console.error('Failed to fetch genre anime:', err);
      } finally {
        setGenreLoading(false);
      }
    }

    loadGenre();
  }, [activeGenre]);

  return (
    <div className="min-h-screen bg-black text-[#ededed]">
      <Navbar />

      {/* Hero Banner with #1 Trending Anime */}
      {data.trending.length > 0 && <Hero anime={data.trending[0]} />}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">
        {/* Continue Watching / Watch History Shelf */}
        <ContinueWatching />

        {/* ============================================================== */}
        {/* FEATURE: SELECT GENRE SECTION ON TOP                           */}
        {/* ============================================================== */}
        <section className="bg-[#0b0b0b] border border-zinc-800/90 rounded-3xl p-5 sm:p-7 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span>Explore By Genre</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold border border-zinc-700">
                    {activeGenre}
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 font-semibold mt-0.5">
                  Select a genre to browse top anime series & movies
                </p>
              </div>
            </div>

            <Link
              to={`/genre/${activeGenre}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs transition shadow-md w-fit active:scale-95"
            >
              <span>View All {activeGenre} Anime</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Quick Genre Selection Pills (Horizontal scroll with smooth snap) */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-5 custom-scroll">
            {FEATURED_GENRES.map((g) => {
              const isActive = activeGenre === g;
              return (
                <button
                  key={g}
                  onClick={() => setActiveGenre(g)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition duration-150 ${
                    isActive
                      ? 'bg-white text-black font-black shadow-lg scale-105 ring-2 ring-white/50'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800'
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>

          {/* Genre Cards Grid */}
          {genreLoading && genreAnime.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {genreAnime.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          )}
        </section>

        {/* Section 1: Trending Now */}
        <section>
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <Flame className="w-5 h-5 text-white" />
              <h2 className="text-xl sm:text-2xl font-black text-white">Trending Now</h2>
            </div>
            <Link
              to="/trending"
              className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-white transition group"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading && data.trending.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {data.trending.slice(0, 18).map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Top Airing Anime (Broadcasting Now) */}
        {data.airing.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <Tv className="w-5 h-5 text-white" />
                <h2 className="text-xl sm:text-2xl font-black text-white">Top Airing Episodes</h2>
              </div>
              <Link
                to="/airing"
                className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-white transition group"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {data.airing.slice(0, 12).map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Most Popular Anime of All Time */}
        {data.popular.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <Star className="w-5 h-5 text-white" />
                <h2 className="text-xl sm:text-2xl font-black text-white">Most Popular Anime</h2>
              </div>
              <Link
                to="/most-popular"
                className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-white transition group"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {data.popular.slice(0, 12).map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </section>
        )}

        {/* Section 4: Top Rated Masterpieces */}
        {data.topRated.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-white" />
                <h2 className="text-xl sm:text-2xl font-black text-white">Top Rated Masterpieces</h2>
              </div>
              <Link
                to="/top-rated"
                className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-white transition group"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {data.topRated.slice(0, 12).map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </section>
        )}

        {/* Section 5: Top Anime Movies */}
        {data.movies.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <Film className="w-5 h-5 text-white" />
                <h2 className="text-xl sm:text-2xl font-black text-white">Top Anime Movies</h2>
              </div>
              <Link
                to="/movies"
                className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-white transition group"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {data.movies.slice(0, 12).map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </section>
        )}

        {/* Section 6: Top Upcoming Anime */}
        {data.upcoming.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-white" />
                <h2 className="text-xl sm:text-2xl font-black text-white">Top Upcoming Anime</h2>
              </div>
              <Link
                to="/upcoming"
                className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-white transition group"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {data.upcoming.slice(0, 12).map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </section>
        )}

        {/* Section 7: Browse Full Catalog Callout Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-zinc-950 via-[#111] to-zinc-950 border border-zinc-800 p-8 sm:p-12 text-center space-y-4 shadow-2xl">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 text-white mb-2 shadow-inner">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-white">
            Discover Over 5,000+ Anime on ExoticHub
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed font-semibold">
            Explore our complete database filtered by genres, formats, releasing status, or browse alphabetically with the A-Z directory.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              to="/catalog"
              className="px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs transition shadow-lg shadow-white/10 flex items-center gap-2"
            >
              <span>Explore Full Catalog</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              to="/az-list"
              className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white font-bold text-xs border border-zinc-700 transition"
            >
              A-Z Directory
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
