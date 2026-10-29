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
    <header className="sticky top-0 z-50 bg-[#0b0d13]/90 backdrop-blur-md border-b border-[#1f2437]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 text-xl font-black text-white hover:opacity-90">
          <span className="text-2xl">⛩️</span>
          <span>Anime<span className="text-[#cae962]">Hub</span></span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative hidden sm:block">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime..."
            className="w-full bg-[#12151f] border border-[#1f2437] rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#cae962]"
          />
        </form>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            <Flame className="w-3.5 h-3.5 text-[#ff6b6b]" />
            Trending
          </Link>
          <Link
            to="/most-popular"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            <Star className="w-3.5 h-3.5 text-[#cae962]" />
            Popular
          </Link>
          <Link
            to="/az-list"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            <Trophy className="w-3.5 h-3.5 text-[#ffa502]" />
            Top Rated
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-400 hover:text-white focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#12151f] border-b border-[#1f2437] px-4 py-4 space-y-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anime..."
              className="w-full bg-[#161a27] border border-[#1f2437] rounded-full pl-9 pr-4 py-2 text-xs text-white"
            />
          </form>
          <div className="flex flex-col gap-1 pt-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-semibold text-gray-300 hover:text-white rounded-lg hover:bg-white/5"
            >
              🔥 Trending
            </Link>
            <Link
              to="/most-popular"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-semibold text-gray-300 hover:text-white rounded-lg hover:bg-white/5"
            >
              ⭐ Most Popular
            </Link>
            <Link
              to="/az-list"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-semibold text-gray-300 hover:text-white rounded-lg hover:bg-white/5"
            >
              🏆 Top Rated
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
