import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import AnimeCard from '../components/AnimeCard';
import Footer from '../components/Footer';
import { fetchTrending, fetchPopular, fetchTopRated } from '../api';
import { Flame, Star, Trophy } from 'lucide-react';

export default function Home() {
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'ExoticHub — Watch, Track & Discover Anime Online | Stream Anime';
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      'ExoticHub: The fastest lightweight anime platform. Discover trending anime, track series, watch high-definition streams with Artplayer, custom subtitles (CC), and skip intro.'
    );

    async function loadData() {
      try {
        const [t, p, tr] = await Promise.all([
          fetchTrending(1, 18),
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
    <div className="min-h-screen bg-black text-[#ededed]">
      <Navbar />

      {/* Hero with #1 Trending Anime */}
      {trending.length > 0 && <Hero anime={trending[0]} />}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-12">
        {/* Trending Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Flame className="w-5 h-5 text-zinc-300" />
            <h2 className="text-xl sm:text-2xl font-black text-white">Trending Now</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
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
            <Star className="w-5 h-5 text-zinc-300" />
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
            <Trophy className="w-5 h-5 text-zinc-300" />
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
      <Footer />
    </div>
  );
}
