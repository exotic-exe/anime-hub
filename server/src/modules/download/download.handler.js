/**
 * Download handler for real anime episode downloads
 * Aggregates verified Nyaa torrents, SubsPlease magnets, and direct cloud links
 */

const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 mins

export default async function downloadHandler(c) {
  const { title, episode } = c.req.valid('query');
  const epNum = parseInt(episode, 10) || 1;
  const epPad = epNum < 10 ? `0${epNum}` : `${epNum}`;
  const cleanTitle = (title || '').replace(/[\\/:*?"<>|]/g, '').trim();

  const cacheKey = `${cleanTitle.toLowerCase()}:${epNum}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const results = {
    title: cleanTitle,
    episode: epNum,
    torrents: [],
    subsplease: null,
    direct: {
      kayoanime: `https://kayoanime.com/?s=${encodeURIComponent(cleanTitle)}`,
      animepahe: `https://animepahe.ru/anime?q=${encodeURIComponent(cleanTitle)}`,
      nyaa: `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(cleanTitle + ' ' + epPad)}`,
    },
  };

  // 1. Fetch Nyaa RSS feed for exact episode
  try {
    const nyaaUrl = `https://nyaa.si/?page=rss&c=1_2&q=${encodeURIComponent(cleanTitle + ' ' + epPad)}`;
    const res = await fetch(nyaaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const xml = await res.text();
      const itemRegex = /<item>[\s\S]*?<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && results.torrents.length < 5) {
        const itemXml = match[0];
        const titleMatch = itemXml.match(/<title>([^<]+)<\/title>/);
        const linkMatch = itemXml.match(/<link>([^<]+)<\/link>/);
        const hashMatch = itemXml.match(/<nyaa:infoHash>([^<]+)<\/nyaa:infoHash>/);
        const sizeMatch = itemXml.match(/<nyaa:size>([^<]+)<\/nyaa:size>/);
        const seedersMatch = itemXml.match(/<nyaa:seeders>([^<]+)<\/nyaa:seeders>/);

        if (titleMatch && (linkMatch || hashMatch)) {
          const itemTitle = titleMatch[1];
          const torrentUrl = linkMatch ? linkMatch[1] : '';
          const infoHash = hashMatch ? hashMatch[1] : '';
          const magnet = infoHash
            ? `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(itemTitle)}&tr=http%3A%2F%2Fnyaa.tracker.wf%3A7777%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce`
            : '';

          results.torrents.push({
            title: itemTitle,
            torrentUrl,
            magnet,
            size: sizeMatch ? sizeMatch[1] : 'Unknown',
            seeders: seedersMatch ? parseInt(seedersMatch[1], 10) || 0 : 0,
          });
        }
      }
    }
  } catch (err) {
    // Non-fatal, fallback to direct links
  }

  // 2. Fetch SubsPlease API for exact episode magnet releases
  try {
    const spUrl = `https://subsplease.org/api/?f=search&tz=UTC&s=${encodeURIComponent(cleanTitle)}`;
    const res = await fetch(spUrl, {
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const data = await res.json();
      for (const [key, val] of Object.entries(data)) {
        if (val.episode === `${epNum}` || val.episode === epPad) {
          results.subsplease = {
            releaseTitle: key,
            episode: val.episode,
            downloads: (val.downloads || []).map((d) => ({
              resolution: `${d.res}p`,
              magnet: d.magnet,
            })),
          };
          break;
        }
      }
    }
  } catch (err) {
    // Non-fatal
  }

  // Cache results
  cache.set(cacheKey, {
    timestamp: Date.now(),
    data: results,
  });

  return results;
}
