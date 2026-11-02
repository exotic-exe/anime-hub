import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AnimeCard from '../components/AnimeCard';
import Footer from '../components/Footer';
import { fetchAnimeCatalog } from '../api';
import {
  Flame,
  Star,
  Trophy,
  Tv,
  Sparkles,
  Film,
  Filter,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Compass,
  ArrowUpDown
} from 'lucide-react';

const GENRES = [
  'All',
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
];

const FORMATS = [
  { label: 'All Formats', value: 'ALL' },
  { label: 'TV Series', value: 'TV' },
  { label: 'Movies', value: 'MOVIE' },
  { label: 'OVA', value: 'OVA' },
  { label: 'ONA (Web)', value: 'ONA' },
  { label: 'Specials', value: 'SPECIAL' },
];

const STATUSES = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Currently Airing', value: 'RELEASING' },
  { label: 'Completed', value: 'FINISHED' },
  { label: 'Upcoming', value: 'NOT_YET_RELEASED' },
];

const SORTS = [
  { label: 'Most Popular', value: 'POPULARITY_DESC' },
  { label: 'Highest Rated', value: 'SCORE_DESC' },
  { label: 'Trending Now', value: 'TRENDING_DESC' },
  { label: 'Title (A-Z)', value: 'TITLE_ROMAJI' },
];

const AZ_LETTERS = ['All', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

export default function Catalog() {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();

  // Determine section type from pathname
  const path = location.pathname;
  const isAZ = path.startsWith('/az-list');
  const isGenre = path.startsWith('/genre');
  const isAiring = path === '/airing';
  const isUpcoming = path === '/upcoming';
  const isMovies = path === '/movies';
  const isTopRated = path === '/top-rated';
  const isTrending = path === '/trending';
  const isPopular = path === '/most-popular';

  // Filters state
  const [selectedGenre, setSelectedGenre] = useState(
    isGenre && params.genre ? params.genre : 'All'
  );
  const [selectedFormat, setSelectedFormat] = useState(isMovies ? 'MOVIE' : 'ALL');
  const [selectedStatus, setSelectedStatus] = useState(
    isAiring ? 'RELEASING' : isUpcoming ? 'NOT_YET_RELEASED' : 'ALL'
  );
  const [selectedSort, setSelectedSort] = useState(
    isTopRated
      ? 'SCORE_DESC'
      : isTrending
      ? 'TRENDING_DESC'
      : isAZ
      ? 'TITLE_ROMAJI'
      : 'POPULARITY_DESC'
  );
  const [selectedLetter, setSelectedLetter] = useState('All');

  // Pagination & data state
  const [page, setPage] = useState(1);
  const [animeList, setAnimeList] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    total: 0,
    perPage: 24,
    currentPage: 1,
    lastPage: 1,
    hasNextPage: false,
  });
  const [loading, setLoading] = useState(true);

  // Sync state if URL route changes
  useEffect(() => {
    setPage(1);
    if (isGenre && params.genre) {
      setSelectedGenre(params.genre);
    } else {
      setSelectedGenre('All');
    }

    if (isMovies) setSelectedFormat('MOVIE');
    else setSelectedFormat('ALL');

    if (isAiring) setSelectedStatus('RELEASING');
    else if (isUpcoming) setSelectedStatus('NOT_YET_RELEASED');
    else setSelectedStatus('ALL');

    if (isTopRated) setSelectedSort('SCORE_DESC');
    else if (isTrending) setSelectedSort('TRENDING_DESC');
    else if (isAZ) setSelectedSort('TITLE_ROMAJI');
    else setSelectedSort('POPULARITY_DESC');
  }, [path, params.genre]);

  // Section title & icon configuration
  const pageHeader = useMemo(() => {
    if (isTrending) {
      return {
        title: 'Trending Anime',
        desc: 'The most talked-about and hyped anime series streaming right now',
        icon: Flame,
      };
    }
    if (isPopular) {
      return {
        title: 'Most Popular Anime',
        desc: 'All-time favorite anime series loved by millions worldwide',
        icon: Star,
      };
    }
    if (isTopRated) {
      return {
        title: 'Top Rated Anime',
        desc: 'Critically acclaimed anime with the highest scores and reviews',
        icon: Trophy,
      };
    }
    if (isAiring) {
      return {
        title: 'Top Airing Anime',
        desc: 'New episodes currently broadcasting in Japan this season',
        icon: Tv,
      };
    }
    if (isUpcoming) {
      return {
        title: 'Top Upcoming Anime',
        desc: 'Anticipated anime seasons and premiere dates coming soon',
        icon: Sparkles,
      };
    }
    if (isMovies) {
      return {
        title: 'Anime Movies',
        desc: 'Top theatrical anime films, standalone movies, and cinematic releases',
        icon: Film,
      };
    }
    if (isAZ) {
      return {
        title: 'A-Z Anime Directory',
        desc: 'Browse complete alphabetical catalog of thousands of anime',
        icon: Compass,
      };
    }
    if (isGenre && params.genre) {
      return {
        title: `${params.genre} Anime`,
        desc: `Explore the top and newest ${params.genre} anime streaming on ExoticHub`,
        icon: Compass,
      };
    }
    return {
      title: 'Anime Catalog',
      desc: 'Discover and stream thousands of anime series and movies on ExoticHub',
      icon: Compass,
    };
  }, [path, params.genre]);

  // Update Page Title
  useEffect(() => {
    document.title = `${pageHeader.title} — ExoticHub`;
  }, [pageHeader.title]);

  // Fetch data whenever filters or page changes
  useEffect(() => {
    let isCancelled = false;

    async function loadCatalog() {
      setLoading(true);
      try {
        let searchParam = null;
        if (isAZ && selectedLetter !== 'All') {
          if (selectedLetter === '#') searchParam = '1';
          else searchParam = selectedLetter;
        }

        const res = await fetchAnimeCatalog({
          page,
          perPage: 24,
          sort: selectedSort,
          genre: selectedGenre !== 'All' ? selectedGenre : null,
          format: selectedFormat !== 'ALL' ? selectedFormat : null,
          status: selectedStatus !== 'ALL' ? selectedStatus : null,
          search: searchParam,
        });

        if (!isCancelled) {
          setAnimeList(res.media || []);
          setPageInfo(res.pageInfo || {});
        }
      } catch (err) {
        console.error('Failed to load anime catalog:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadCatalog();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      isCancelled = true;
    };
  }, [page, selectedGenre, selectedFormat, selectedStatus, selectedSort, selectedLetter, path]);

  const HeaderIcon = pageHeader.icon;

  return (
    <div className="min-h-screen bg-black text-[#ededed]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Page Header */}
        <div className="pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-md">
              <HeaderIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{pageHeader.title}</h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-semibold">
                {pageHeader.desc}
              </p>
            </div>
          </div>
        </div>

        {/* A-Z Alphabet Filter Bar (When on A-Z list page) */}
        {isAZ && (
          <div className="bg-[#0e0e0e] border border-zinc-800 rounded-2xl p-3 shadow-lg">
            <div className="text-[11px] font-black uppercase text-zinc-400 tracking-wider mb-2">
              Alphabetical Filter
            </div>
            <div className="flex flex-wrap gap-1 custom-scroll">
              {AZ_LETTERS.map((letter) => {
                const isActive = selectedLetter === letter;
                return (
                  <button
                    key={letter}
                    onClick={() => {
                      setSelectedLetter(letter);
                      setPage(1);
                    }}
                    className={`w-8 h-8 rounded-lg text-xs font-black transition duration-150 flex items-center justify-center ${
                      isActive
                        ? 'bg-white text-black shadow-md font-black scale-105'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter & Sort Controls Bar */}
        <div className="bg-[#0e0e0e] border border-zinc-800/90 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
              <Filter className="w-4 h-4 text-zinc-300" />
              <span>Filters & Sorting</span>
            </div>
            <div className="text-xs text-zinc-400 font-bold">
              {pageInfo.total ? `${pageInfo.total.toLocaleString()} Anime Found` : 'Catalog'}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Genre Dropdown */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1">
                Genre
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => {
                  setSelectedGenre(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#161616] hover:bg-zinc-800 text-white font-bold text-xs rounded-xl px-3 py-2 border border-zinc-700/80 focus:outline-none focus:border-white transition cursor-pointer"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g} className="bg-zinc-900 text-white">
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Format Dropdown */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1">
                Format
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => {
                  setSelectedFormat(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#161616] hover:bg-zinc-800 text-white font-bold text-xs rounded-xl px-3 py-2 border border-zinc-700/80 focus:outline-none focus:border-white transition cursor-pointer"
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value} className="bg-zinc-900 text-white">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#161616] hover:bg-zinc-800 text-white font-bold text-xs rounded-xl px-3 py-2 border border-zinc-700/80 focus:outline-none focus:border-white transition cursor-pointer"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value} className="bg-zinc-900 text-white">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1">
                Sort By
              </label>
              <select
                value={selectedSort}
                onChange={(e) => {
                  setSelectedSort(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#161616] hover:bg-zinc-800 text-white font-bold text-xs rounded-xl px-3 py-2 border border-zinc-700/80 focus:outline-none focus:border-white transition cursor-pointer"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-zinc-900 text-white">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Anime Cards Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-zinc-400">Loading anime catalog...</p>
          </div>
        ) : animeList.length > 0 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {animeList.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#0d0d0d] border border-zinc-800 rounded-2xl shadow-lg">
              <div className="text-xs font-bold text-zinc-400">
                Page <span className="text-white font-black">{page}</span>
                {pageInfo.lastPage > 1 && (
                  <span> of <span className="text-white font-black">{pageInfo.lastPage}</span></span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition ${
                    page <= 1
                      ? 'opacity-30 cursor-not-allowed text-zinc-600 bg-zinc-900'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 active:scale-95'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {/* Page Jump Numbers */}
                <div className="hidden sm:flex items-center gap-1">
                  {[page - 1, page, page + 1]
                    .filter((pNum) => pNum > 0 && pNum <= (pageInfo.lastPage || 100))
                    .map((pNum) => (
                      <button
                        key={pNum}
                        onClick={() => setPage(pNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-black transition ${
                          pNum === page
                            ? 'bg-white text-black shadow-md'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {pNum}
                      </button>
                    ))}
                </div>

                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pageInfo.hasNextPage}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition ${
                    !pageInfo.hasNextPage
                      ? 'opacity-30 cursor-not-allowed text-zinc-600 bg-zinc-900'
                      : 'bg-white hover:bg-zinc-200 text-black border border-white active:scale-95 shadow-md'
                  }`}
                >
                  <span>Next Page</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-24 space-y-3">
            <p className="text-lg font-bold text-zinc-300">No anime found matching your filters</p>
            <p className="text-xs text-zinc-500">Try adjusting your genre, format, or sort options</p>
            <button
              onClick={() => {
                setSelectedGenre('All');
                setSelectedFormat('ALL');
                setSelectedStatus('ALL');
                setSelectedSort('POPULARITY_DESC');
                setSelectedLetter('All');
                setPage(1);
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-white border border-zinc-700 transition"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
