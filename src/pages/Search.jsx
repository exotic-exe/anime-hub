import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AnimeCard from '../components/AnimeCard';
import Footer from '../components/Footer';
import SearchAutocomplete from '../components/SearchAutocomplete';
import { searchAnimeWithPagination } from '../api';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasNextPage(false);
      setTotal(0);
      document.title = 'Search Anime — ExoticHub';
      return;
    }
    document.title = `Search "${query.trim()}" — ExoticHub`;
    let cancelled = false;

    async function perform() {
      try {
        setLoading(true);
        setPage(1);
        const data = await searchAnimeWithPagination(query.trim(), 1, 24);
        if (!cancelled) {
          setResults(data?.results || []);
          setHasNextPage(Boolean(data?.hasNextPage));
          setTotal(data?.total || 0);
        }
      } catch (err) {
        console.error('Search failed', err);
        if (!cancelled) {
          setResults([]);
          setHasNextPage(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    perform();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasNextPage || !query.trim()) return;
    const nextPage = page + 1;
    try {
      setLoadingMore(true);
      const data = await searchAnimeWithPagination(query.trim(), nextPage, 24);
      setPage(nextPage);
      setResults((prev) => [...prev, ...(data?.results || [])]);
      setHasNextPage(Boolean(data?.hasNextPage));
    } catch (err) {
      console.error('Failed to load more results', err);
    } finally {
      setLoadingMore(false);
    }
  };

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
            initialQuery={query}
            className="w-full text-left"
            inputClassName="py-3 pl-11 pr-10 text-sm rounded-full shadow-lg"
            placeholder="Search by title, character, or genre..."
          />
        </div>

        {/* Results title */}
        {query && (
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-300">
              Results for: <span className="text-white">"{query}"</span>
            </h2>
            {total > 0 && (
              <span className="text-xs font-semibold text-zinc-500">
                {total} {total === 1 ? 'title' : 'titles'} found
              </span>
            )}
          </div>
        )}

        {/* Grid or Loader */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full"></div>
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {results.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center mt-10">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs border border-zinc-700 shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loadingMore ? 'Loading more results...' : 'Load More Results'}
                </button>
              </div>
            )}
          </>
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
