import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Flame, Star, Trophy, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [query, setQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
        {/* Brand without the 'E' */}
        <Link to="/" className="text-xl font-black text-white hover:opacity-85 transition tracking-tight">
          Exotic<span className="text-zinc-400">Hub</span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative hidden sm:block">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime on ExoticHub..."
            className="w-full bg-[#121212] border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          />
        </form>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <Flame className="w-3.5 h-3.5 text-zinc-300" />
            Trending
          </Link>
          <Link
            to="/most-popular"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <Star className="w-3.5 h-3.5 text-zinc-300" />
            Popular
          </Link>
          <Link
            to="/az-list"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <Trophy className="w-3.5 h-3.5 text-zinc-300" />
            Top Rated
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
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anime on ExoticHub..."
              className="w-full bg-[#141414] border border-zinc-800 rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </form>
          <div className="flex flex-col gap-1 pt-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-900"
            >
              <Flame className="w-4 h-4 text-zinc-300" />
              Trending
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
              to="/az-list"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-900"
            >
              <Trophy className="w-4 h-4 text-zinc-300" />
              Top Rated
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
