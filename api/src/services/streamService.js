import { NotFoundError } from '../utils/errors.js';
import { hiAnimeService } from './hiAnimeService.js';
import { load } from 'cheerio';
import config from '#config/config';

const BASE = config.baseurl; // https://hianime.mn

export const streamService = {
    async getServers(episodeId) {
        try {
            const slug = episodeId.split('::')[0];
            const numericId = episodeId.split('ep=').pop();
            const referer = `${BASE}/watch/${slug}`;

            const data = await hiAnimeService.fetchWithCurl(`${BASE}/ajax/v2/episode/servers?episodeId=${numericId}`, {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': referer,
                'Accept': '*/*'
            });

            const parsedData = JSON.parse(data);
            if (!parsedData.html) throw new NotFoundError('No servers found');

            const $ = load(parsedData.html);
            const servers = {
                sub: [],
                dub: [],
                raw: []
            };

            $('.server-item').each((i, el) => {
                const name = $(el).text().trim().toLowerCase();
                const serverId = $(el).attr('data-id');
                const serverType = $(el).closest('.ps-content').find('.ps-type').text().toLowerCase().includes('dub') ? 'dub' : 'sub';

                // Deduplicate by name
                if (!servers[serverType].find(s => s.name === name)) {
                    servers[serverType].push({
                        name,
                        serverId,
                        serverName: name.replace(/\s+/g, '-')
                    });
                }
            });

            return servers;
        } catch (err) {
            console.error('StreamService Servers Error:', err.message);
            throw new NotFoundError('Failed to fetch servers from HiAnime');
        }
    },

    async getStreamUrl(episodeId, server = null) {
        try {
            const slug = episodeId.split('::')[0];
            const referer = `${BASE}/watch/${slug}`;

            const servers = await this.getServers(episodeId);
            const allServers = [...servers.sub, ...servers.dub, ...servers.raw];

            if (allServers.length === 0) throw new NotFoundError('No servers available');

            // 1. Try the requested server first
            let result = null;
            if (server) {
                const matchedServer = allServers.find(s =>
                    s.serverId === server || s.serverName === server || s.name === server.toLowerCase()
                );
                if (matchedServer) {
                    result = await this._fetchSource(matchedServer.serverId, referer);
                }
            }

            // 2. If no requested server result or it's an iframe, search all others for a direct link
            if (!result || result.sources.length === 0) {
                console.log('Searching all servers for a direct link...');
                for (const s of allServers) {
                    // Skip if it was the one we already tried
                    if (server && (s.serverId === server || s.serverName === server)) continue;

                    const potential = await this._fetchSource(s.serverId, referer);
                    if (potential && potential.sources.length > 0) {
                        console.log(`Found direct link on server: ${s.name}`);
                        return potential;
                    }
                    // Keep the first iframe result as fallback if absolutely nothing else works
                    if (!result) result = potential;
                }
            }

            // 3. If we still don't have a direct link, but we have an iframe link from step 1 or 2, return it
            if (result) return result;

            // 4. Ultimate fallback to the very first server if somehow everything failed
            return await this._fetchSource(allServers[0].serverId, referer);
        } catch (err) {
            console.error('StreamService URL Error:', err.message);
            throw new NotFoundError('Failed to fetch stream URL from HiAnime');
        }
    },

    async _fetchSource(serverId, referer) {
        try {
            const data = await hiAnimeService.fetchWithCurl(`${BASE}/ajax/v2/episode/sources?id=${serverId}`, {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': referer,
                'Accept': '*/*'
            });

            const parsedData = JSON.parse(data);
            if (!parsedData.link) return null;

            const isIframe = parsedData.type === 'iframe';
            const link = parsedData.link;

            let sources = isIframe ? [] : [
                {
                    url: link,
                    isM3U8: link.includes('.m3u8'),
                    quality: 'auto'
                }
            ];

            // If it's an iframe but we have an extractor for it, try extracting
            if (isIframe && (link.includes('megacloud') || link.includes('rapidcloud'))) {
                try {
                    const { MegaCloud, RapidCloud } = await import('@consumet/extensions/dist/extractors/index.js');
                    const extractor = link.includes('megacloud') ? new MegaCloud() : new RapidCloud();
                    const extracted = await extractor.extract(new URL(link));
                    if (extracted && extracted.sources.length > 0) {
                        sources = extracted.sources.map(s => ({
                            url: s.url,
                            isM3U8: s.url.includes('.m3u8'),
                            quality: s.quality || 'auto'
                        }));
                    }
                } catch (e) {
                    console.warn('HiAnime Direct Extraction failed:', e.message);
                }
            }

            return {
                sources: sources,
                iframe: sources.length > 0 ? null : (isIframe ? link : null),
                download: null
            };
        } catch (err) {
            return null;
        }
    }
};
