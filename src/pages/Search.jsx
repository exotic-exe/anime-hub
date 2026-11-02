import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AnimeCard from '../components/AnimeCard';
import Footer from '../components/Footer';
import SearchAutocomplete from '../components/SearchAutocomplete';
import { searchAnime } from '../api';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      document.title = 'Search Anime — ExoticHub';
      return;
    }
    document.title = `Search "${query.trim()}" — ExoticHub`;
    async function perform() {
      try {
        setLoading(true);
        const list = await searchAnime(query.trim(), 1, 30);
        setResults(list || []);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    }
    perform();
  }, [query]);

  return (
    <div className="min-h-screen bg-black text-[#ededed]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Search header & input */}
        <div className="max-w-xl mx-auto text-center space-y-4 mb-10">
          <h1 className="text-2xl sm:text-3xl font-black text-white">Search ExoticHub</h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-semibold">
            Discover thousands of anime series, movies, and specials with live instant suggestions
          </p>
          <SearchAutocomplete
            className="w-full text-left"
            inputClassName="py-3 pl-11 pr-10 text-sm rounded-full shadow-lg"
            placeholder="Search by title, character, or genre..."
          />
        </div>

        {/* Results title */}
        {query && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-zinc-300">
              Results for: <span className="text-white">"{query}"</span>
            </h2>
          </div>
        )}

        {/* Grid or Loader */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        ) : query ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-lg font-semibold text-zinc-400">No anime found matching "{query}"</p>
            <p className="text-xs mt-1 text-zinc-600">Try another title or keyword</p>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
