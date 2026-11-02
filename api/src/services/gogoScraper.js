import { load } from 'cheerio';
import { validationError, NotFoundError } from '../utils/errors.js';
import { hiAnimeService } from './hiAnimeService.js';

const BASE_URL = 'https://anitaku.to';

export const gogoScraper = {
    search: async (keyword, page = 1) => {
        try {
            const html = await hiAnimeService.fetchWithCurl(`${BASE_URL}/search.html?keyword=${encodeURIComponent(keyword)}&page=${page}`);
            const $ = load(html);
            const results = [];

            $('.last_episodes .items li').each((i, el) => {
                const link = $(el).find('.name a');
                const id = link.attr('href')?.split('/category/')[1];
                const title = link.attr('title');
                const img = $(el).find('.img a img').attr('src');
                const releaseDate = $(el).find('.released').text().trim();

                if (id && title) {
                    results.push({ id, title, img, releaseDate });
                }
            });

            const hasNextPage = $('.pagination li.active').next().length > 0;

            return { results, hasNextPage };
        } catch (err) {
            console.error('Gogo Search Error:', err.message);
            return { results: [], hasNextPage: false };
        }
    },

    getAnimeInfo: async (id) => {
        try {
            let url = `${BASE_URL}/category/${id}`;
            let html = await hiAnimeService.fetchWithCurl(url);
            let $ = load(html);

            const title = $('.anime_info_body_bg h1').text().trim() || $('.anime-info h1').text().trim();
            const img = $('.anime_info_body_bg img').attr('src');
            const desc = $('.description').text().trim();

            const episodes = [];
            $('#load_ep li').each((i, el) => {
                const a = $(el).find('a');
                const epUrl = a.attr('href').trim(); // /id-episode-N
                const epNumStr = $(el).find('.name').text().replace('EP ', '').trim();
                const epNum = Number(epNumStr);

                if (epUrl) {
                    episodes.push({
                        id: epUrl.replace('/', '').trim(), // e.g. naruto-episode-1
                        number: isNaN(epNum) ? epNumStr : epNum,
                        url: `${BASE_URL}${epUrl}`
                    });
                }
            });

            if (episodes.length === 0) {
                $('#episode_related li').each((i, el) => {
                    const a = $(el).find('a');
                    const epUrl = a.attr('href').trim();
                    const epNumStr = $(el).find('.name').text().replace('EP ', '').trim();

                    if (epUrl) {
                        episodes.push({
                            id: epUrl.replace('/', '').trim(),
                            number: Number(epNumStr) || epNumStr,
                            url: `${BASE_URL}${epUrl}`
                        });
                    }
                });
            }

            return {
                id,
                title,
                img,
                description: desc,
                episodes: episodes.reverse()
            };
        } catch (err) {
            console.error('Gogo Info Error:', err.message);
            throw new NotFoundError('Failed to fetch anime details');
        }
    },

    getHome: async () => {
        try {
            const html = await hiAnimeService.fetchWithCurl(BASE_URL);
            const $ = load(html);
            const homeData = {
                popular: [],
                recent: []
            };

            // Recent Release (Episode updates)
            $('.last_episodes.loaddub ul.items li').each((i, el) => {
                const link = $(el).find('a').attr('href');
                const title = $(el).find('.name a').attr('title');
                const img = $(el).find('.img a img').attr('src');
                const ep = $(el).find('.episode').text().trim();

                if (link && title) {
                    homeData.recent.push({
                        id: link.substring(1), // remove leading /
                        title: title.trim(),
                        img: img || '',
                        ep: ep
                    });
                }
            });

            // Popular Ongoing
            $('.added_series_body.popular ul li').each((i, el) => {
                const link = $(el).find('a').first().attr('href');
                const title = $(el).find('a').first().attr('title');
                const style = $(el).find('.thumbnail-popular').attr('style');
                let img = '';
                if (style) {
                    const match = style.match(/url\(['"]?(.*?)['"]?\)/);
                    if (match) img = match[1];
                }

                if (link && title) {
                    homeData.popular.push({
                        id: link.replace('/category/', '').trim(),
                        title: title.trim(),
                        img: img || '',
                        releaseDate: $(el).find('p').last().text().replace('Lastest:', '').trim()
                    });
                }
            });

            return homeData;

        } catch (err) {
            console.error('Gogo Home Error:', err.message);
            return { popular: [], recent: [] };
        }
    },

    getServers: async (episodeId) => {
        try {
            const url = `${BASE_URL}/${episodeId}`;
            const html = await hiAnimeService.fetchWithCurl(url);
            const $ = load(html);

            const servers = {
                sub: [],
                dub: []
            };
            const seenNames = { sub: {}, dub: {} };

            $('.server-items').each((_, container) => {
                const type = $(container).attr('data-type'); // SUB, DUB, HSUB
                const isDub = type === 'DUB';
                const key = isDub ? 'dub' : 'sub';

                $(container).find('li.server').each((i, el) => {
                    let name = $(el).text().replace('Choose this server', '').trim();
                    const videoUrl = $(el).find('a').attr('data-video');

                    if (videoUrl) {
                        let serverName = name || `Server ${i + 1}`;

                        if (seenNames[key][serverName]) {
                            seenNames[key][serverName]++;
                            serverName = `${serverName} (${seenNames[key][serverName]})`;
                        } else {
                            seenNames[key][serverName] = 1;
                        }

                        servers[key].push({
                            name: serverName,
                            url: videoUrl.startsWith('//') ? `https:${videoUrl}` : videoUrl
                        });
                    }
                });
            });

            // If no categorized servers found, try the old way (fallback)
            if (servers.sub.length === 0 && servers.dub.length === 0) {
                $('.anime_muti_link ul li').each((i, el) => {
                    let name = $(el).text().replace('Choose this server', '').trim();
                    const videoUrl = $(el).find('a').attr('data-video');
                    if (videoUrl) {
                        servers.sub.push({
                            name: name || `Server ${i + 1}`,
                            url: videoUrl.startsWith('//') ? `https:${videoUrl}` : videoUrl
                        });
                    }
                });
            }

            return servers;
        } catch (err) {
            console.error('Gogo Server Error:', err.message);
            throw new NotFoundError('Servers not found');
        }
    },

    getAZList: async (letter, page = 1) => {
        try {
            const url = `${BASE_URL}/anime-list-${letter}?page=${page}`;
            const html = await hiAnimeService.fetchWithCurl(url);
            const $ = load(html);
            const results = [];

            $('.anime_list_body .listing li').each((i, el) => {
                const link = $(el).find('a').attr('href');
                const title = $(el).find('a').text().trim();

                if (link && title) {
                    results.push({
                        id: link.replace('/category/', '').trim(),
                        title: title
                    });
                }
            });

            const hasNextPage = $('.pagination li.active').next().length > 0;
            return { results, hasNextPage };

        } catch (err) {
            console.error('Gogo AZ List Error:', err.message);
            return { results: [], hasNextPage: false };
        }
    }
};
