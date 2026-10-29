import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VideoPlayer from '../components/VideoPlayer';
import Footer from '../components/Footer';
import { fetchAnimeDetails } from '../api';
import { Star, Play, Layers } from 'lucide-react';

export default function Watch() {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEp, setSelectedEp] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchAnimeDetails(id);
        setAnime(data);
        const animeTitle = data?.title?.english || data?.title?.romaji || 'Anime';
        document.title = `Watch ${animeTitle} Online — ExoticHub`;
        document.querySelector('meta[name="description"]')?.setAttribute(
          'content',
          `Watch ${animeTitle} online in HD with Artplayer, custom subtitles (CC), and skip intro on ExoticHub.`
        );
      } catch (err) {
        console.error('Failed to load anime for watch', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-[#ededed]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-black text-[#ededed]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-zinc-400">Anime not found.</p>
          <Link to="/" className="inline-block mt-4 text-zinc-300 hover:text-white font-bold">
            ← Back to ExoticHub Home
          </Link>
        </div>
      </div>
    );
  }

  const title = anime.title?.english || anime.title?.romaji;
  const episodesCount = anime.episodes || anime.streamingEpisodes?.length || 12;
  const episodesList = Array.from({ length: episodesCount }, (_, i) => ({
    number: i + 1,
    title: anime.streamingEpisodes?.[i]?.title || `Episode ${i + 1}`,
    thumbnail: anime.streamingEpisodes?.[i]?.thumbnail || anime.coverImage?.large,
  }));

  return (
    <div className="min-h-screen bg-black text-[#ededed]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Main Grid: Player on left, Episode list on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Container */}
          <div className="lg:col-span-2 space-y-4">
            <VideoPlayer
              poster={anime.bannerImage || anime.coverImage?.extraLarge}
              animeName={title}
              episodeTitle={`Episode ${selectedEp}`}
              onEnded={() => {
                if (selectedEp < episodesCount) {
                  setSelectedEp(selectedEp + 1);
                }
              }}
            />

            {/* Anime Title & Meta */}
            <div className="space-y-3 pt-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-zinc-400 font-semibold">
                {anime.averageScore && (
                  <span className="flex items-center gap-1 text-white">
                    <Star className="w-4 h-4 fill-current text-white" />
                    {anime.averageScore}% Score
                  </span>
                )}
                <span>• {anime.format || 'TV'}</span>
                <span>• {anime.status}</span>
                <span>• {episodesCount} Episodes</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed pt-2">
                {anime.description?.replace(/<[^>]*>/g, '')}
              </p>
            </div>
          </div>

          {/* Episode List Sidebar */}
          <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-4 flex flex-col h-[520px] lg:h-[620px]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2 font-black text-white text-sm">
                <Layers className="w-4 h-4 text-zinc-300" />
                Episodes ({episodesCount})
              </div>
              <span className="text-xs text-zinc-300 font-bold">
                Playing EP {selectedEp}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scroll">
              {episodesList.map((ep) => (
                <button
                  key={ep.number}
                  onClick={() => setSelectedEp(ep.number)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition duration-200 ${
                    selectedEp === ep.number
                      ? 'bg-white text-black font-extrabold border border-white'
                      : 'bg-[#141414] hover:bg-zinc-900 border border-zinc-800/80 text-zinc-300'
                  }`}
                >
                  <div className="w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 relative bg-black">
                    <img
                      src={ep.thumbnail}
                      alt={ep.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className={`w-3.5 h-3.5 fill-current ${selectedEp === ep.number ? 'text-black' : 'text-white'}`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold truncate ${selectedEp === ep.number ? 'text-black' : 'text-zinc-200'}`}>
                      {ep.title}
                    </div>
                    <div className={`text-[10px] font-semibold mt-0.5 ${selectedEp === ep.number ? 'text-zinc-700' : 'text-zinc-500'}`}>
                      Episode {ep.number}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
