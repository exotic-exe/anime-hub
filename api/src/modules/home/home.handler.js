import { gogoScraper } from '#services/gogoScraper.js';

export default async function homeHandler(c) {
  try {
    const data = await gogoScraper.getHome();

    const mapToCard = (item) => ({
      id: item.id,
      name: item.title,
      poster: item.img,
      duration: item.ep || item.releaseDate || 'N/A',
      type: 'TV',
      rating: null,
      episodes: { sub: null, dub: null }
    });

    const popularMapped = data.popular.map(mapToCard);
    const recentMapped = data.recent.map(mapToCard);

    const response = {
      spotlightAnimes: popularMapped.slice(0, 10),
      trendingAnimes: popularMapped.slice(0, 15),
      latestEpisodeAnimes: recentMapped,
      topAiringAnimes: popularMapped.slice(0, 10),
      status: true
    };

    return response;
  } catch (error) {
    console.error('Home Handler Error:', error);
    // Return empty structure to avoid frontend crash
    return {
      spotlightAnimes: [],
      trendingAnimes: [],
      latestEpisodeAnimes: [],
      topAiringAnimes: [],
      status: false,
      message: error.message
    };
  }
}
