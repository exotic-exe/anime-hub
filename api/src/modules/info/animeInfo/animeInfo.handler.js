import connectRedis from '#utils/connectRedis';
import { gogoScraper } from '#services/gogoScraper.js';
import { NotFoundError, validationError } from '#utils/errors';

export default async function animeInfoHandler(c) {
  const { id } = c.req.param();

  const isHiAnimeId = id.startsWith('hi:') || id.includes('::');
  const cleanId = id.startsWith('hi:') ? id.replace('hi:', '') : id;

  try {
    if (isHiAnimeId) {
      const { hiAnimeService } = await import('#services/hiAnimeService.js');
      const animeInfoExtract = (await import('./animeInfo.extract.js')).default;

      const html = await hiAnimeService.fetchPage(`/${cleanId}`);
      const info = animeInfoExtract(html);

      // Ensure the ID is set correctly
      if (info.anime && info.anime.info) {
        info.anime.info.id = id;
      }

      return {
        ...info,
        seasons: info.seasons || [],
        mostPopularAnimes: info.mostPopular || [],
        relatedAnimes: info.related || [],
        recommendedAnimes: info.recommended || []
      };
    }

    // Fallback to GogoAnime
    const info = await gogoScraper.getAnimeInfo(id);

    return {
      anime: {
        info: {
          id: info.id,
          name: info.title,
          poster: info.img,
          description: info.description,
          stats: {
            rating: 'N/A',
            quality: 'HD',
            episodes: {
              sub: info.episodes.length,
              dub: null
            },
            type: 'TV',
            duration: '24m'
          },
          promotionalVideos: [],
          charactersVoiceActors: []
        },
        moreInfo: {
          japanese: info.title,
          synonyms: [],
          aired: 'N/A',
          premiered: 'N/A',
          duration: '24m',
          status: 'Finished Airing',
          malscore: 'N/A',
          genres: ['Action', 'Adventure'],
          studios: 'Pierrot',
          producers: []
        }
      },
      seasons: [],
      mostPopularAnimes: [],
      relatedAnimes: [],
      recommendedAnimes: []
    };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error('Anime Info Handler Error:', error);
    throw new validationError('Failed to fetch anime info');
  }
}
