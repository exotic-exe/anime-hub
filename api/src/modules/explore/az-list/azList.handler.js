import { gogoScraper } from '#services/gogoScraper.js';
import { NotFoundError, validationError } from '#utils/errors';

export default async function azListHandler(c) {
  const { letter } = c.req.valid('param');
  const { page } = c.req.valid('query');

  try {
    const { results, hasNextPage } = await gogoScraper.getAZList(letter, page);
    return {
      results,
      hasNextPage
    };
  } catch (err) {
    console.error('AZ List Handler Error:', err);
    throw new validationError('Failed to fetch AZ list');
  }
}
