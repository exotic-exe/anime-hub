import { gogoScraper } from '#services/gogoScraper.js';
import { NotFoundError, validationError } from '#utils/errors';

export default async function episodesHandler(c) {
  const { id } = c.req.param();

  const isHiAnimeId = id.startsWith('hi:') || id.includes('::');
  const cleanId = id.startsWith('hi:') ? id.replace('hi:', '') : id;

  try {
    if (isHiAnimeId) {
      const { hiAnimeService } = await import('#services/hiAnimeService.js');
      const episodesExtract = (await import('./episodes.extract.js')).default;

      const numericId = cleanId.split('-').pop();
      const data = await hiAnimeService.fetchAjax(`episode/list/${numericId}`);

      if (!data || !data.status) {
        throw new NotFoundError('Episodes not found');
      }

      const episodes = episodesExtract(data.html).map(ep => ({
        ...ep,
        episodeNumber: ep.episodeNumber,
        number: ep.episodeNumber, // Standardize on number
      }));

      return {
        totalEpisodes: episodes.length,
        episodes: episodes
      };
    }

    const info = await gogoScraper.getAnimeInfo(id);

    if (!info || !info.episodes) {
      throw new NotFoundError('Episodes not found');
    }

    const episodes = info.episodes.map(ep => ({
      id: ep.id,
      number: ep.number,
      title: `Episode ${ep.number}`,
      isFiller: false,
      url: ep.url
    }));

    return {
      totalEpisodes: episodes.length,
      episodes: episodes
    };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error('Episodes Handler Error:', error);
    throw new validationError('Failed to fetch episodes');
  }
}
