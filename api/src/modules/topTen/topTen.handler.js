import { gogoScraper } from '#services/gogoScraper.js';

export default async function topTenHandler() {
  try {
    // Reuse getHome as it fetches popular anime
    const { popular } = await gogoScraper.getHome(1);

    const transform = (item, i) => ({
      id: item.id,
      name: item.title,
      poster: item.img,
      rank: i + 1,
      episodes: {
        sub: null,
        dub: null,
        eps: null
      }
    });

    return {
      today: popular.map(transform),
      week: [],
      month: []
    };
  } catch (error) {
    console.error('Gogo TopTen Error:', error);
    return { today: [], week: [], month: [] };
  }
}
