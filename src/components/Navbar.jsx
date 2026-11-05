import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Star,
  Trophy,
  Tv,
  Compass,
  History,
  Menu,
  X,
  Layers,
  ChevronDown
} from 'lucide-react';
import SearchAutocomplete from './SearchAutocomplete';

const NAVBAR_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mecha',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const [mobileGenreOpen, setMobileGenreOpen] = useState(false);
  const genreRef = useRef(null);

  // Close genre dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (genreRef.current && !genreRef.current.contains(e.target)) {
        setGenreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
        {/* Brand with Logo */}
        <Link to="/" className="flex items-center gap-2.5 text-xl font-black text-white hover:opacity-85 transition tracking-tight flex-shrink-0">
          <img
            src="/logo.jpg"
            alt="ExoticHub Logo"
            className="w-9 h-9 rounded-full object-cover border border-zinc-700 shadow-md ring-1 ring-white/10"
          />
          <span>Exotic<span className="text-zinc-400">Hub</span></span>
        </Link>

        {/* Live Search Autocomplete (Desktop) */}
        <SearchAutocomplete
          className="flex-1 max-w-md hidden sm:block"
          placeholder="Search anime on ExoticHub..."
        />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          <Link
            to="/trending"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <Flame className="w-3.5 h-3.5 text-zinc-300" />
            Trending
          </Link>
          <Link
            to="/airing"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <Tv className="w-3.5 h-3.5 text-zinc-300" />
            Top Airing
          </Link>
          <Link
            to="/most-popular"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <Star className="w-3.5 h-3.5 text-zinc-300" />
            Popular
          </Link>
          <Link
            to="/top-rated"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <Trophy className="w-3.5 h-3.5 text-zinc-300" />
            Top Rated
          </Link>

          {/* Select Genre Dropdown Menu */}
          <div className="relative" ref={genreRef}>
            <button
              type="button"
              onClick={() => setGenreOpen(!genreOpen)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                genreOpen
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-zinc-300" />
              <span>Genres</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${
                  genreOpen ? 'rotate-180 text-black' : 'text-zinc-500'
                }`}
              />
            </button>

            {/* Dropdown Floating Panel */}
            {genreOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-3 shadow-2xl z-50 backdrop-blur-xl">
                <div className="text-[10px] font-black uppercase text-zinc-400 tracking-wider px-2 pb-2 border-b border-zinc-800 mb-2 flex items-center justify-between">
                  <span>Select Genre</span>
                  <span className="text-[9px] text-zinc-400 font-bold">15 Genres</span>
                </div>
                <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto custom-scroll pr-1">
                  {NAVBAR_GENRES.map((g) => (
                    <Link
                      key={g}
                      to={`/genre/${g}`}
                      onClick={() => setGenreOpen(false)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition flex items-center justify-between group"
                    >
                      <span>{g}</span>
                      <span className="text-[10px] text-zinc-400 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            to="/az-list"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <Compass className="w-3.5 h-3.5 text-zinc-300" />
            A-Z List
          </Link>
          <Link
            to="/history"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <History className="w-3.5 h-3.5 text-zinc-300" />
            History
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-zinc-400 hover:text-white focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0a0a0a] border-b border-zinc-800 px-4 py-4 space-y-3">
          {/* Live Search Autocomplete (Mobile) */}
          <SearchAutocomplete
            className="w-full"
            placeholder="Search anime on ExoticHub..."
            onAfterSelect={() => setMobileMenuOpen(false)}
          />

          <div className="flex flex-col gap-1 pt-2">
            <Link
              to="/trending"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-900"
            >
              <Flame className="w-4 h-4 text-zinc-300" />
              Trending
            </Link>
            <Link
              to="/airing"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-900"
            >
              <Tv className="w-4 h-4 text-zinc-300" />
              Top Airing
            </Link>
            <Link
              to="/most-popular"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-900"
            >
              <Star className="w-4 h-4 text-zinc-300" />
              Most Popular
            </Link>
            <Link
              to="/top-rated"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-900"
            >
              <Trophy className="w-4 h-4 text-zinc-300" />
              Top Rated
            </Link>

            {/* Mobile Genre Accordion */}
            <div>
              <button
                type="button"
                onClick={() => setMobileGenreOpen(!mobileGenreOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-zinc-300" />
                  <span>Genres</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    mobileGenreOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {mobileGenreOpen && (
                <div className="grid grid-cols-2 gap-1 pl-4 pt-1 pb-2">
                  {NAVBAR_GENRES.map((g) => (
                    <Link
                      key={g}
                      to={`/genre/${g}`}
                      onClick={() => {
                        setMobileGenreOpen(false);
                        setMobileMenuOpen(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/az-list"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-900"
            >
              <Compass className="w-4 h-4 text-zinc-300" />
              A-Z Directory
            </Link>
            <Link
              to="/history"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-900"
            >
              <History className="w-4 h-4 text-zinc-300" />
              History
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}



