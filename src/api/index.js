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
      }
    }
  `;
  const data = await fetchGraphQL(query, { id: safeId });
  return data?.Media || null;
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
