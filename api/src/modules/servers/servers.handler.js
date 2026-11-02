import { gogoScraper } from '#services/gogoScraper.js';
import { NotFoundError } from '#utils/errors.js';

export default async function (c) {
  const { id } = c.req.valid('query');
  const isHiAnimeId = id.startsWith('hi:') || id.includes('::');
  const cleanId = id.startsWith('hi:') ? id.replace('hi:', '') : id;

  try {
    if (isHiAnimeId) {
      const { streamService } = await import('#services/streamService.js');
      const servers = await streamService.getServers(cleanId);
      return servers;
    }

    const servers = await gogoScraper.getServers(id);
    // Gogo servers are usually dubbed/subbed mixed or depending on the video.
    // For now, put them all in 'sub' to ensure they show up.
    // Map them to have `serverName` as `name` for frontend compatibility if needed.
    // Watch.jsx uses `s.serverName` (line 27) and `s.name` (line 106).
    // GogoScraper returns `name` and `url`.
    // I should map `name` to `serverName` as well.

    const mapServer = s => ({
      ...s,
      serverName: s.name,
      serverId: s.name
    });

    return {
      sub: (servers.sub || []).map(mapServer),
      dub: (servers.dub || []).map(mapServer),
      raw: []
    };
  } catch (err) {
    console.error('Servers Handler Error:', err.message);
    throw new NotFoundError('Servers not found');
  }
}
