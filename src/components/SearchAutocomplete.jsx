import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Play, Star, X, ArrowRight, Film } from 'lucide-react';
import { fetchSearchSuggestions, sanitizeInput } from '../api';

// Bounded in-memory cache for search suggestions (max 100 entries)
const suggestionsCache = new Map();
function setSuggestionsCache(key, val) {
  if (suggestionsCache.size > 100) {
    const oldestKey = suggestionsCache.keys().next().value;
    suggestionsCache.delete(oldestKey);
  }
  suggestionsCache.set(key, val);
}

export default function SearchAutocomplete({
  initialQuery = '',
  placeholder = 'Search anime on ExoticHub...',
  className = '',
  inputClassName = '',
  onAfterSelect,
  autoFocus = false,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const activeReqIdRef = useRef(0);
  const navigate = useNavigate();

  // Sync internal state if initialQuery prop updates from outside (e.g., URL change)
  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Click outside listener to dismiss dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Fetch suggestions with race-condition protection and snappy debounce
  useEffect(() => {
    const clean = sanitizeInput(query);

    if (!clean || clean.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    // Check memory cache first for zero-latency instant display
    const cacheKey = clean.toLowerCase();
    if (suggestionsCache.has(cacheKey)) {
      setSuggestions(suggestionsCache.get(cacheKey));
      setIsOpen(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const currentReqId = ++activeReqIdRef.current;

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await fetchSearchSuggestions(clean, 6);
        // Ensure this response matches the most recent keystroke to prevent race condition bugs
        if (currentReqId === activeReqIdRef.current) {
          const list = results || [];
          setSuggestionsCache(cacheKey, list);
          setSuggestions(list);
          setIsOpen(true);
          setLoading(false);
        }
      } catch (err) {
        if (currentReqId === activeReqIdRef.current) {
          setSuggestions([]);
          setLoading(false);
        }
      }
    }, 160);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Navigate to anime details
  function handleSelectAnime(anime) {
    if (!anime?.id) return;
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
    navigate(`/details/${anime.id}`);
    if (onAfterSelect) onAfterSelect();
  }

  // Navigate directly to watch page
  function handleQuickWatch(e, anime) {
    e.stopPropagation();
    if (!anime?.id) return;
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
    navigate(`/watch/${anime.id}`);
    if (onAfterSelect) onAfterSelect();
  }

  // Submit full search
  function handleSubmitSearch(e) {
    if (e) e.preventDefault();
    const clean = sanitizeInput(query);
    if (!clean) return;

    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      handleSelectAnime(suggestions[selectedIndex]);
      return;
    }

    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
    navigate(`/search?q=${encodeURIComponent(clean)}`);
    if (onAfterSelect) onAfterSelect();
  }

  // Keyboard navigation (Arrow keys, Enter, Escape)
  function handleKeyDown(e) {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  }

  function handleClear() {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Form */}
      <form onSubmit={handleSubmitSearch} className="relative w-full">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full bg-[#121212] border border-zinc-800 rounded-full pl-10 pr-9 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition ${inputClassName}`}
        />

        {/* Loading Indicator or Clear Button */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {loading ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-zinc-400 hover:text-white transition rounded-full hover:bg-zinc-800 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </form>

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[#0d0d0d] border border-zinc-800/90 rounded-2xl shadow-2xl backdrop-blur-xl z-[60] overflow-hidden divide-y divide-zinc-900 max-h-[75vh] sm:max-h-[460px] flex flex-col">
          {suggestions.length > 0 ? (
            <>
              {/* Header Label */}
              <div className="px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-950/60 flex items-center justify-between">
                <span>Top Suggestions</span>
                <span className="text-[9px] font-semibold text-zinc-400">↑↓ to navigate • ↵ to select</span>
              </div>

              {/* Suggestions List */}
              <div className="overflow-y-auto custom-scroll divide-y divide-zinc-900/80">
                {suggestions.map((anime, idx) => {
                  const title = anime.title?.english || anime.title?.romaji || anime.title?.native;
                  const poster = anime.coverImage?.medium || anime.coverImage?.large;
                  const isSelected = selectedIndex === idx;

                  return (
                    <div
                      key={anime.id}
                      onClick={() => handleSelectAnime(anime)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center gap-3 p-2.5 sm:p-3 cursor-pointer transition ${
                        isSelected
                          ? 'bg-zinc-800/90 text-white'
                          : 'hover:bg-zinc-900/80 text-zinc-300'
                      }`}
                    >
                      {/* Thumbnail Poster */}
                      <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900 relative shadow-sm">
                        {poster ? (
                          <img
                            src={poster}
                            alt={title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <Film className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Title & Metadata */}
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-xs sm:text-sm font-bold truncate ${
                            isSelected ? 'text-white' : 'text-zinc-200'
                          }`}
                        >
                          {title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-semibold text-zinc-400">
                          {anime.format && (
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase font-black text-[9px] border border-zinc-700/60">
                              {anime.format}
                            </span>
                          )}

                          {anime.seasonYear && <span>{anime.seasonYear}</span>}

                          {anime.episodes && <span>• {anime.episodes} eps</span>}

                          {anime.averageScore && (
                            <span className="flex items-center gap-0.5 text-zinc-200 font-bold ml-1">
                              <Star className="w-3 h-3 fill-current text-white" />
                              {anime.averageScore}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Watch Button */}
                      <button
                        type="button"
                        onClick={(e) => handleQuickWatch(e, anime)}
                        title="Watch now"
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black transition shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span className="hidden sm:inline">Watch</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer row: View All Results */}
              <button
                type="button"
                onClick={handleSubmitSearch}
                className="w-full px-4 py-2.5 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-950 hover:bg-zinc-900 transition flex items-center justify-between group border-t border-zinc-800 cursor-pointer"
              >
                <span>
                  View all results for <span className="text-white font-extrabold">"{query}"</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-1 group-hover:text-white transition-all" />
              </button>
            </>
          ) : !loading && query.trim().length >= 2 ? (
            <div className="p-6 text-center">
              <p className="text-xs font-bold text-zinc-300">
                No suggestions found for <span className="text-white">"{query}"</span>
              </p>
              <button
                type="button"
                onClick={handleSubmitSearch}
                className="mt-2 text-[11px] font-semibold text-zinc-400 hover:text-white inline-flex items-center gap-1 transition cursor-pointer"
              >
                <span>Search full library</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
