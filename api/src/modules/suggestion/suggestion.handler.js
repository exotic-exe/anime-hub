import { gogoScraper } from '#services/gogoScraper.js';
import { validationError } from '#utils/errors';

export default async function suggestionHandler(c) {
  const { keyword } = c.req.valid('query');

  try {
    const { results } = await gogoScraper.search(keyword, 1);

    if (!results || results.length === 0) {
      return [];
    }

    const response = results.map(item => ({
      id: item.id,
      name: item.title,
      alternativeTitle: item.title, // Gogo doesn't provide alt title in search
      poster: item.img,
      aired: item.releaseDate || 'N/A',
      type: 'TV', // Default as Gogo search doesn't provide type
      duration: 'N/A', // Default as Gogo search doesn't provide duration
      // Extra fields for compatibility if needed
      jname: item.title,
      moreInfo: [item.releaseDate]
    }));

    return response;
  } catch (error) {
    console.error('Suggestion Handler Error:', error);
    return [];
  }
}
