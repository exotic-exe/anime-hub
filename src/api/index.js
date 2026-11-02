const API_URL = 'https://graphql.anilist.co';

// --- Client-Side In-Memory Cache (TTL: 3 minutes) ---
const queryCache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000;

function getCache(key) {
  const item = queryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    queryCache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data) {
  if (queryCache.size > 100) {
    const firstKey = queryCache.keys().next().value;
    queryCache.delete(firstKey);
  }
  queryCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// --- Client-Side Rate Limiter & Sliding Window Throttler ---
// AniList limits requests to 90 per minute. We throttle locally to 30 requests per 10 seconds.
const requestTimestamps = [];
const WINDOW_MS = 10000;
const MAX_REQUESTS_PER_WINDOW = 30;

async function throttleRequest() {
  const now = Date.now();
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = requestTimestamps[0];
    const delay = Math.max(0, oldest + WINDOW_MS - now + 50);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return throttleRequest();
  }
  requestTimestamps.push(Date.now());
}

// --- Input Sanitizer (Prevents query abuse and control character injection) ---
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, 80)
    .replace(/[\x00-\x1F\x7F]/g, '');
}

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { extraLarge large medium color }
  bannerImage
  description(asHtml: false)
  averageScore
  meanScore
  popularity
  favourites
  episodes
  duration
  format
  status
  season
  seasonYear
  genres
  studios(isMain: true) { nodes { name } }
  nextAiringEpisode { episode timeUntilAiring }
`;

export async function fetchGraphQL(query, variables = {}, retries = 2) {
  const cacheKey = JSON.stringify({ query, variables });
  const cached = getCache(cacheKey);
  if (cached) return cached;

  await throttleRequest();

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 429 && retries > 0) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10);
      const backoff = (retryAfter || 2) * 1000 + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchGraphQL(query, variables, retries - 1);
    }

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    if (data.errors && data.errors.length > 0) {
      throw new Error(data.errors[0].message);
    }

    setCache(cacheKey, data.data);
    return data.data;
  } catch (err) {
    if (retries > 0 && err.message.includes('429')) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return fetchGraphQL(query, variables, retries - 1);
    }
    throw err;
  }
}

export async function fetchTrending(page = 1, perPage = 20) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(type: ANIME, sort: TRENDING_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { page, perPage });
  return data?.Page?.media || [];
}

/**
 * Single optimized query that retrieves all major home categories in 1 roundtrip
 */
export async function fetchHomePageData() {
  const query = `
    query {
      trending: Page(page: 1, perPage: 18) {
        media(type: ANIME, sort: TRENDING_DESC) {
          ${MEDIA_FIELDS}
        }
      }
      airing: Page(page: 1, perPage: 12) {
        media(type: ANIME, status: RELEASING, sort: [POPULARITY_DESC, SCORE_DESC]) {
          ${MEDIA_FIELDS}
        }
      }
      popular: Page(page: 1, perPage: 12) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
      topRated: Page(page: 1, perPage: 12) {
        media(type: ANIME, sort: SCORE_DESC) {
          ${MEDIA_FIELDS}
        }
      }
      movies: Page(page: 1, perPage: 12) {
        media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
      upcoming: Page(page: 1, perPage: 12) {
        media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(query);
    return {
      trending: data?.trending?.media || [],
      airing: data?.airing?.media || [],
      popular: data?.popular?.media || [],
      topRated: data?.topRated?.media || [],
      movies: data?.movies?.media || [],
      upcoming: data?.upcoming?.media || [],
    };
  } catch (err) {
    console.error('Failed to fetch home page data', err);
    return {
      trending: [],
      airing: [],
      popular: [],
      topRated: [],
      movies: [],
      upcoming: [],
    };
  }
}


export async function fetchPopular(page = 1, perPage = 20) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(type: ANIME, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { page, perPage });
  return data?.Page?.media || [];
}

export async function fetchTopRated(page = 1, perPage = 20) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(type: ANIME, sort: SCORE_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { page, perPage });
  return data?.Page?.media || [];
}

export async function fetchTopAiring(page = 1, perPage = 20) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(type: ANIME, status: RELEASING, sort: [POPULARITY_DESC, SCORE_DESC]) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { page, perPage });
  return data?.Page?.media || [];
}

export async function fetchUpcoming(page = 1, perPage = 20) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { page, perPage });
  return data?.Page?.media || [];
}

export async function fetchMovies(page = 1, perPage = 20) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { page, perPage });
  return data?.Page?.media || [];
}

export async function fetchAnimeByGenre(genre, page = 1, perPage = 20) {
  const cleanGenre = sanitizeInput(genre);
  const query = `
    query ($genre: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(type: ANIME, genre: $genre, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { genre: cleanGenre, page, perPage });
  return data?.Page?.media || [];
}

export async function fetchAnimeCatalog({
  page = 1,
  perPage = 24,
  sort = 'POPULARITY_DESC',
  genre = null,
  format = null,
  status = null,
  search = null,
}) {
  const cleanSearch = sanitizeInput(search);
  const cleanGenre = sanitizeInput(genre);

  const variables = {
    page: Number(page) || 1,
    perPage: Number(perPage) || 24,
  };

  if (sort) {
    variables.sort = Array.isArray(sort) ? sort : [sort];
  } else {
    variables.sort = ['POPULARITY_DESC'];
  }

  if (cleanGenre && cleanGenre !== 'All') variables.genre = cleanGenre;
  if (format && format !== 'ALL') variables.format = format;
  if (status && status !== 'ALL') variables.status = status;
  if (cleanSearch) variables.search = cleanSearch;

  const query = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort], $genre: String, $format: MediaFormat, $status: MediaStatus, $search: String) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          perPage
          currentPage
          lastPage
          hasNextPage
        }
        media(type: ANIME, sort: $sort, genre: $genre, format: $format, status: $status, search: $search) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(query, variables);
    return {
      media: data?.Page?.media || [],
      pageInfo: data?.Page?.pageInfo || {
        total: 0,
        perPage,
        currentPage: page,
        lastPage: 1,
        hasNextPage: false,
      },
    };
  } catch (err) {
    console.error('fetchAnimeCatalog error', err);
    return { media: [], pageInfo: { total: 0, perPage, currentPage: 1, lastPage: 1, hasNextPage: false } };
  }
}


export async function fetchAnimeDetails(id) {
  const safeId = parseInt(id, 10);
  if (isNaN(safeId) || safeId <= 0) return null;

  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS}
        streamingEpisodes {
          title
          thumbnail
          url
          site
        }
        characters(sort: FAVOURITES_DESC, perPage: 12) {
          edges {
            role
            node {
              id
              name { full }
              image { medium }
            }
          }
        }
        recommendations(sort: RATING_DESC, perPage: 8) {
          nodes {
            mediaRecommendation {
              id
              title { romaji english }
              coverImage { large }
              averageScore
            }
          }
        }
        relations {
          edges {
            relationType
            node {
              id
              type
              format
              status
              title { romaji english }
              coverImage { medium large extraLarge }
              episodes
              seasonYear
              startDate { year }
              nextAiringEpisode { episode }
            }
          }
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { id: safeId });
  return data?.Media || null;
}

// In-memory cache for franchise seasons
const seasonCache = new Map();

/**
 * Discovers and returns all seasons for a franchise in chronological order.
 * If the anime has only 1 season, returns an array with just that season.
 */
export async function fetchAnimeSeasons(anime) {
  if (!anime?.id) return [];
  if (seasonCache.has(anime.id)) {
    return seasonCache.get(anime.id);
  }

  const current = {
    id: anime.id,
    title: anime.title?.english || anime.title?.romaji,
    format: anime.format,
    year: anime.seasonYear || anime.startDate?.year,
    episodes: anime.episodes,
    coverImage: anime.coverImage?.medium || anime.coverImage?.large,
  };

  const directEdges = (anime.relations?.edges || []).filter(
    (e) => e.node?.type === 'ANIME' && ['PREQUEL', 'SEQUEL', 'PARENT'].includes(e.relationType)
  );

  // If no prequel/sequel relations, return single season
  if (directEdges.length === 0) {
    const res = [current];
    seasonCache.set(anime.id, res);
    return res;
  }

  const seasonMap = new Map();
  seasonMap.set(current.id, current);

  const queue = directEdges.map((e) => e.node.id);
  const visited = new Set([current.id]);

  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { english romaji }
        format
        status
        episodes
        seasonYear
        startDate { year }
        coverImage { medium large }
        relations {
          edges {
            relationType
            node {
              id
              type
              format
              title { english romaji }
              seasonYear
              startDate { year }
              episodes
            }
          }
        }
      }
    }
  `;

  while (queue.length > 0 && visited.size < 12) {
    const nextId = queue.shift();
    if (visited.has(nextId)) continue;
    visited.add(nextId);

    try {
      const data = await fetchGraphQL(query, { id: nextId });
      const m = data?.Media;
      if (!m) continue;

      if (['TV', 'TV_SHORT', 'ONA', 'OVA', 'MOVIE'].includes(m.format)) {
        seasonMap.set(m.id, {
          id: m.id,
          title: m.title?.english || m.title?.romaji,
          format: m.format,
          year: m.seasonYear || m.startDate?.year,
          episodes: m.episodes,
          coverImage: m.coverImage?.medium || m.coverImage?.large,
        });
      }

      (m.relations?.edges || []).forEach((e) => {
        if (e.node?.type === 'ANIME' && ['PREQUEL', 'SEQUEL'].includes(e.relationType)) {
          if (!visited.has(e.node.id) && !queue.includes(e.node.id)) {
            queue.push(e.node.id);
          }
        }
      });
    } catch (err) {
      console.warn('Failed to fetch related season:', nextId, err);
    }
  }

  // Sort chronologically by year / start date
  const sorted = Array.from(seasonMap.values()).sort((a, b) => {
    const yA = a.year || 0;
    const yB = b.year || 0;
    if (yA !== yB) return yA - yB;
    return a.id - b.id;
  });

  // Store in cache for all members of the franchise
  sorted.forEach((s) => {
    seasonCache.set(s.id, sorted);
  });

  return sorted;
}

export async function searchAnime(keyword, page = 1, perPage = 24) {
  const cleanKeyword = sanitizeInput(keyword);
  if (!cleanKeyword) return [];

  const query = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { search: cleanKeyword, page, perPage });
  return data?.Page?.media || [];
}

/**
 * Fast search suggestions with popularity ranking for autocomplete dropdown
 * @param {string} keyword
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function fetchSearchSuggestions(keyword, limit = 6) {
  const cleanKeyword = sanitizeInput(keyword);
  if (!cleanKeyword || cleanKeyword.length < 2) return [];

  const query = `
    query ($search: String, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(search: $search, type: ANIME, sort: [POPULARITY_DESC, SEARCH_MATCH]) {
          id
          title {
            english
            romaji
            native
          }
          coverImage {
            medium
            large
            extraLarge
          }
          format
          status
          episodes
          seasonYear
          averageScore
          genres
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(query, { search: cleanKeyword, perPage: limit });
    return data?.Page?.media || [];
  } catch (err) {
    console.warn('Failed to fetch search suggestions:', err);
    return [];
  }
}

