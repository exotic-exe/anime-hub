import { gogoScraper } from '#services/gogoScraper.js';
import { NotFoundError } from '#utils/errors.js';

export default async function streamHandler(c) {
  let { id, server, type } = c.req.valid('query');

  const isHiAnimeId = id.startsWith('hi:') || id.includes('::');
  const cleanId = id.startsWith('hi:') ? id.replace('hi:', '') : id;

  try {
    if (isHiAnimeId) {
      const { streamService } = await import('#services/streamService.js');
      const data = await streamService.getStreamUrl(cleanId, server);

      return {
        headers: { Referer: 'https://hianime.to/' },
        sources: data.sources,
        iframe: data.iframe,
        server: server || data.sources[0]?.quality || 'Auto'
      };
    }

    const serversObj = await gogoScraper.getServers(id);

    // Default to 'sub' if type is not provided or invalid
    const selectedType = (type === 'dub') ? 'dub' : 'sub';
    const allServers = serversObj[selectedType] || [];

    if (allServers.length === 0) throw new NotFoundError(`No ${selectedType} servers found`);

    // Helper for direct extraction
    const tryExtract = async (s) => {
      const gogoKeywords = ['gogo', 'vidstreaming', 'hd-1', 'hd-2', 'otakuhg', 'otakuvid', 'asian', 'load'];
      const isGogo = gogoKeywords.some(k => s.name.toLowerCase().includes(k) || s.url.toLowerCase().includes(k));
      if (!isGogo) return null;

      try {
        const { GogoCDN, AsianLoad, VidCloud } = await import('@consumet/extensions/dist/extractors/index.js');
        const url = new URL(s.url);

        let extracted = null;

        // Try VidCloud if it's an embed mirror
        if (s.name.toLowerCase().includes('vid') || s.url.includes('vid')) {
          try {
            const vidCloud = new VidCloud();
            extracted = await vidCloud.extract(url);
          } catch (e) {
            console.warn('VidCloud extraction failed:', e.message);
          }
        }

        // Try GogoCDN
        if (!extracted || extracted.sources.length === 0) {
          try {
            const gogoExtractor = new GogoCDN();
            extracted = await gogoExtractor.extract(url);
          } catch (e) {
            console.warn('GogoCDN extraction failed:', e.message);
          }
        }

        // Try AsianLoad as final Gogo mirror fallback
        if (!extracted || extracted.sources.length === 0) {
          try {
            const asianExtractor = new AsianLoad();
            extracted = await asianExtractor.extract(url);
          } catch (e) {
            console.warn('AsianLoad extraction failed:', e.message);
          }
        }

        if (extracted && extracted.sources.length > 0) {
          return extracted.sources.map(src => ({
            url: src.url,
            isM3U8: src.url.includes('.m3u8'),
            quality: src.quality || 'auto'
          }));
        }
      } catch (err) {
        console.warn('Multi-extraction failed for:', s.name, err.message);
      }
      return null;
    };

    // 1. Try the requested server first
    let targetSources = null;
    let targetServer = allServers[0];

    if (server) {
      const matched = allServers.find(s => s.name === server);
      if (matched) {
        targetServer = matched;
        targetSources = await tryExtract(matched);
      }
    } else {
      targetSources = await tryExtract(allServers[0]);
    }

    // 2. If no direct sources yet, search all other GogoAnime servers
    if (!targetSources || targetSources.length === 0) {
      console.log('Searching all GogoAnime servers for a direct link...');
      for (const s of allServers) {
        if (server && s.name === server) continue; // Skip if already tried
        const potential = await tryExtract(s);
        if (potential && potential.length > 0) {
          console.log(`Found direct link on GogoAnime server: ${s.name}`);
          targetSources = potential;
          targetServer = s;
          break;
        }
      }
    }

    // 3. CROSS-PROVIDER FALLBACK: If still no direct sources, try HiAnime by title matching
    if (!targetSources || targetSources.length === 0) {
      console.log('GogoAnime extraction failed. Attempting HiAnime fallback...');
      try {
        // Extract title and episode from Gogo ID
        // naruto-episode-1 -> Naruto, ep: 1
        const parts = id.split('-episode-');
        const titleSlug = parts[0];
        const epNum = parts[1];

        if (titleSlug && epNum) {
          const cleanTitle = titleSlug.replaceAll('-', ' ');
          const { hiAnimeService } = await import('#services/hiAnimeService.js');
          const suggestionExtract = (await import('../suggestion/suggestion.extract.js')).default;

          // Search HiAnime
          const searchData = await hiAnimeService.fetchAjax(`/ajax/search/suggest?keyword=${encodeURIComponent(cleanTitle)}`);
          if (searchData && searchData.status) {
            const suggestions = suggestionExtract(searchData.html);
            if (suggestions && suggestions.length > 0) {
              // Take the first match
              const match = suggestions[0];
              const hiEpisodeId = `${match.id}::ep=${epNum}`;
              console.log(`HiAnime fallback match found: ${match.title} (${hiEpisodeId})`);

              const { streamService } = await import('#services/streamService.js');
              const hiData = await streamService.getStreamUrl(hiEpisodeId);

              if (hiData && hiData.sources && hiData.sources.length > 0) {
                console.log('HiAnime fallback SUCCESS: found direct sources');
                return {
                  headers: { Referer: 'https://hianime.to/' },
                  sources: hiData.sources,
                  iframe: hiData.iframe,
                  server: `HiAnime (${hiData.sources[0].quality})`
                };
              }
            }
          }
        }
      } catch (fallbackErr) {
        console.warn('Cross-provider fallback failed:', fallbackErr.message);
      }
    }

    return {
      headers: { Referer: 'https://anitaku.to/' },
      sources: targetSources || [],
      iframe: (targetSources && targetSources.length > 0) ? null : targetServer.url,
      server: targetServer.name
    };
  } catch (err) {
    console.error('Stream Handler Error:', err.message);
    throw new NotFoundError(err.message || 'Stream not available');
  }
}
