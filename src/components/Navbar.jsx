import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Star, Trophy, Tv, Compass, History, Menu, X } from 'lucide-react';
import SearchAutocomplete from './SearchAutocomplete';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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


