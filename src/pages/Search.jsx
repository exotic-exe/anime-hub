import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AnimeCard from '../components/AnimeCard';
import { searchAnime } from '../api';
import { Search as SearchIcon } from 'lucide-react';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [inputVal, setInputVal] = useState(query);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setSearchParams({ q: inputVal.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d13] text-[#e4e6ed]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Search header & input */}
        <div className="max-w-xl mx-auto text-center space-y-4 mb-10">
          <h1 className="text-2xl sm:text-3xl font-black text-white">Search Anime</h1>
          <form onSubmit={handleSubmit} className="relative">
            <SearchIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Search by title, character, or studio..."
              className="w-full bg-[#12151f] border border-[#1f2437] rounded-full pl-12 pr-28 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#cae962]"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-1.5 rounded-full bg-[#cae962] text-black font-bold text-xs hover:bg-[#b5d64e]"
            >
              Search
            </button>
          </form>
        </div>

        {/* Results title */}
        {query && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-300">
              Results for: <span className="text-white">"{query}"</span>
            </h2>
          </div>
        )}

        {/* Grid or Loader */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-gray-600 border-t-[#cae962] rounded-full animate-spin"></div>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        ) : query ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-semibold">No anime found matching "{query}"</p>
            <p className="text-xs mt-1">Try another title or keyword</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
