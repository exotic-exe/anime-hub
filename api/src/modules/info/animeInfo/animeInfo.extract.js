import { load } from 'cheerio';

export default function animeInfoExtract(html) {
    const $ = load(html);

    const $info = $('#ani_detail');
    const response = {
        anime: {
            info: {
                id: null,
                name: null,
                poster: null,
                description: null,
                stats: {
                    rating: null,
                    quality: null,
                    type: null,
                    episodes: {
                        sub: 0,
                        dub: 0,
                        eps: 0
                    }
                }
            },
            moreInfo: {
                aired: null,
                status: null,
                genres: [],
                duration: null
            }
        }
    };

    if ($info.length) {
        const detail = $info.find('.anis-content');
        response.anime.info.name = detail.find('.film-name.dynamic-name').text().trim();
        response.anime.info.poster = detail.find('.film-poster-img').attr('src') || detail.find('.film-poster-img').attr('data-src');
        response.anime.info.description = detail.find('.film-description .text').text().trim();

        const stats = detail.find('.film-stats');
        response.anime.info.stats.rating = stats.find('.tick-pg').text().trim();
        response.anime.info.stats.quality = stats.find('.tick-quality').text().trim();
        response.anime.info.stats.type = stats.find('.item').eq(0).text().trim() || stats.find('.item').eq(1).text().trim();

        response.anime.info.stats.episodes.sub = Number(stats.find('.tick-sub').text().trim()) || 0;
        response.anime.info.stats.episodes.dub = Number(stats.find('.tick-dub').text().trim()) || 0;
        response.anime.info.stats.episodes.eps = Number(stats.find('.tick-eps').text().trim()) || response.anime.info.stats.episodes.sub;

        detail.find('.anisc-info .item').each((i, el) => {
            const title = $(el).find('.item-head').text().trim().toLowerCase();
            const value = $(el).find('.name').text().trim();

            if (title.includes('aired')) response.anime.moreInfo.aired = value;
            if (title.includes('status')) response.anime.moreInfo.status = value;
            if (title.includes('duration')) response.anime.moreInfo.duration = value;
            if (title.includes('genres')) {
                $(el).find('a').each((i, gen) => {
                    response.anime.moreInfo.genres.push($(gen).text().trim());
                });
            }
        });
    }

    // Extract seasons
    const $seasons = $('#main-content .block_area-seasons');
    if ($seasons.length) {
        $seasons.find('.os-list .os-item').each((i, el) => {
            const seasonObj = {
                id: 'hi:' + $(el).attr('href').split('/').pop(),
                name: $(el).attr('title'),
                title: $(el).find('.title').text().trim(),
                isActive: $(el).hasClass('active'),
                poster: null
            };

            const posterStyle = $(el).find('.season-poster').attr('style');
            if (posterStyle) {
                const match = posterStyle.match(/url\((['"])?(.*?)\1\)/);
                if (match) seasonObj.poster = match[2];
            }

            if (!response.seasons) response.seasons = [];
            response.seasons.push(seasonObj);
        });
    }

    return response;
}
