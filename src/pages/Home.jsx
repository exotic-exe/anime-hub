import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import AnimeCard from '../components/AnimeCard';
import { fetchTrending, fetchPopular, fetchTopRated } from '../api';
import { Flame, Star, Trophy } from 'lucide-react';

export default function Home() {
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [t, p, tr] = await Promise.all([
          fetchTrending(1, 16),
          fetchPopular(1, 12),
          fetchTopRated(1, 12),
        ]);
        setTrending(t || []);
        setPopular(p || []);
        setTopRated(tr || []);
      } catch (err) {
        console.error('Failed to load anime data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0d13] text-[#e4e6ed]">
      <Navbar />

      {/* Hero with #1 Trending Anime */}
      {trending.length > 0 && <Hero anime={trending[0]} />}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-12">
        {/* Trending Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Flame className="w-5 h-5 text-[#ff6b6b]" />
            <h2 className="text-xl sm:text-2xl font-black text-white">Trending Now</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-600 border-t-[#cae962] rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {trending.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          )}
        </section>

        {/* Most Popular Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Star className="w-5 h-5 text-[#cae962]" />
            <h2 className="text-xl sm:text-2xl font-black text-white">Most Popular</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {popular.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        </section>

        {/* Top Rated Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-[#ffa502]" />
            <h2 className="text-xl sm:text-2xl font-black text-white">Top Rated</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {topRated.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1f2437] py-8 text-center text-xs text-gray-500 mt-16">
        <p>Powered by AniList GraphQL &bull; Built with React &amp; Vite by exotic-exe</p>
      </footer>
    </div>
  );
}
