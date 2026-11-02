import { gogoScraper } from '#services/gogoScraper.js';
import { NotFoundError, validationError } from '#utils/errors';

export default async function searchHandler(c) {
  const { page, keyword } = c.req.valid('query');

  try {
    const cleanKeyword = keyword.replaceAll('+', ' ');
    let { results, hasNextPage } = await gogoScraper.search(cleanKeyword, page);

    // Spelling insensitivity: If no results found, try suggestions
    // Spelling insensitivity: If no results found, try suggestions/prefix
    if ((!results || results.length < 1) && page === 1) {
      if (cleanKeyword.length > 5) {
        const prefix = cleanKeyword.substring(0, 5);
        console.log(`No results for '${cleanKeyword}', trying prefix '${prefix}'`);
        const fallback = await gogoScraper.search(prefix, 1);
        if (fallback.results && fallback.results.length > 0) {
          results = fallback.results;
          hasNextPage = fallback.hasNextPage;
        }
      }
    }

    const mappedResults = (results || []).map(item => ({
      id: item.id,
      name: item.name || item.title,
      poster: item.img || item.poster,
      duration: null,
      type: 'TV', // Default to TV
      rating: null,
      episodes: { sub: null, dub: null } // Details not available in search
    }));

    return {
      results: mappedResults,
      currentPage: Number(page) || 1,
      hasNextPage: hasNextPage,
      totalPages: hasNextPage ? (Number(page) || 1) + 1 : (Number(page) || 1) // Estimate
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return {
        results: [],
        currentPage: Number(page) || 1,
        hasNextPage: false,
        totalPages: 1
      };
    }
    console.error('Gogo Search Handler Error:', error);
    throw new validationError('Failed to fetch search results from GogoAnime');
  }
}
