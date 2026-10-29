/**
 * Streaming API Client for oni-chan backend
 * Handles anime search, episode list, and stream URL fetching
 */

import { sanitizeInput } from './index';

const STREAM_API_URL = import.meta.env.VITE_STREAM_API_URL || 'http://localhost:3030/api/v1';

// Cache for stream data
const streamCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getStreamCache(key) {
  const item = streamCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    streamCache.delete(key);
    return null;
  }
  return item.data;
}

function setStreamCache(key, data) {
  if (streamCache.size > 50) {
    const firstKey = streamCache.keys().next().value;
    streamCache.delete(firstKey);
  }
  streamCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Search for anime on streaming provider
 * @param {string} keyword - Search query
 * @param {number} page - Page number (default 1)
 * @returns {Promise<{results: Array, currentPage: number, hasNextPage: boolean, totalPages: number}>}
 */
export async function searchStreamAnime(keyword, page = 1) {
  const sanitized = sanitizeInput(keyword);
  if (!sanitized) return { results: [], currentPage: 1, hasNextPage: false, totalPages: 1 };

  const cacheKey = `search:${sanitized}:${page}`;
  const cached = getStreamCache(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${STREAM_API_URL}/search?keyword=${encodeURIComponent(sanitized)}&page=${page}`);
    const data = await response.json();

    const result = data?.data || data || { results: [], currentPage: 1, hasNextPage: false, totalPages: 1 };
    setStreamCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Stream search failed:', error);
    return { results: [], currentPage: 1, hasNextPage: false, totalPages: 1 };
  }
}

/**
 * Fetch episode list for an anime
 * @param {string} animeId - Anime ID from search results
 * @returns {Promise<{totalEpisodes: number, episodes: Array}>}
 */
export async function fetchStreamEpisodes(animeId) {
  if (!animeId) return { totalEpisodes: 0, episodes: [] };

  const cacheKey = `episodes:${animeId}`;
  const cached = getStreamCache(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${STREAM_API_URL}/episodes/${encodeURIComponent(animeId)}`);
    const data = await response.json();

    const result = data?.data || data || { totalEpisodes: 0, episodes: [] };
    setStreamCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Fetch episodes failed:', error);
    return { totalEpisodes: 0, episodes: [] };
  }
}

/**
 * Get stream URL for a specific episode
 * @param {string} episodeId - Episode ID from episodes list
 * @param {string} server - Server name (default 'HD-1')
 * @returns {Promise<{headers: object, sources: Array, iframe: string|null, server: string}>}
 */
export async function fetchEpisodeStream(episodeId, server = 'HD-1') {
  if (!episodeId) return { headers: {}, sources: [], iframe: null, server: '' };

  // Don't cache stream URLs - they may change
  try {
    const response = await fetch(`${STREAM_API_URL}/stream?id=${encodeURIComponent(episodeId)}&server=${encodeURIComponent(server)}`);
    const data = await response.json();

    return data?.data || data || { headers: {}, sources: [], iframe: null, server: '' };
  } catch (error) {
    console.error('Fetch stream failed:', error);
    return { headers: {}, sources: [], iframe: null, server: '' };
  }
}

/**
 * Get available servers for an episode
 * @param {string} episodeId - Episode ID
 * @returns {Promise<Array>}
 */
export async function getStreamServers(episodeId) {
  if (!episodeId) return [];

  try {
    const response = await fetch(`${STREAM_API_URL}/servers?id=${encodeURIComponent(episodeId)}`);
    const data = await response.json();

    return data?.data || data || [];
  } catch (error) {
    console.error('Fetch servers failed:', error);
    return [];
  }
}

/**
 * Find best stream URL from sources
 * @param {Array} sources - Array of {url, isM3U8, quality}
 * @returns {string|null} - Best stream URL or null
 */
export function getBestStreamUrl(sources = []) {
  if (!sources.length) return null;

  // Prefer m3u8 streams
  const m3u8Sources = sources.filter(s => s.isM3U8);
  if (m3u8Sources.length) {
    // Return auto quality or highest
    const auto = m3u8Sources.find(s => s.quality === 'auto');
    return auto?.url || m3u8Sources[0]?.url;
  }

  // Fall back to any direct URL
  return sources[0]?.url || null;
}