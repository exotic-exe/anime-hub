/**
 * Scraper API Client (oni-chan backend)
 * Direct access to the scraping backend in /api
 */

const API_BASE = import.meta.env.VITE_STREAM_API_URL || 'http://localhost:3030/api/v1';

async function request(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const json = await res.json();
    return json?.data ?? json;
  } catch (err) {
    console.error(`Scraper API error on ${endpoint}:`, err);
    throw err;
  }
}

export const fetchHome = () => request('/home');
export const fetchSpotlight = () => request('/spotlight');
export const fetchTopTen = () => request('/topten');
export const searchAnime = (keyword, page = 1) =>
  request(`/search?keyword=${encodeURIComponent(keyword)}&page=${page}`);
export const fetchSuggestions = (keyword) =>
  request(`/suggestion?keyword=${encodeURIComponent(keyword)}`);
export const fetchAnimeDetails = (id) => request(`/anime/${encodeURIComponent(id)}`);
export const fetchEpisodes = (id) => request(`/episodes/${encodeURIComponent(id)}`);
export const fetchServers = (episodeId) => request(`/servers?id=${encodeURIComponent(episodeId)}`);
export const fetchStream = (episodeId, server = '', type = 'sub') =>
  request(`/stream?id=${encodeURIComponent(episodeId)}&server=${encodeURIComponent(server)}&type=${type}`);

export default {
  fetchHome,
  fetchSpotlight,
  fetchTopTen,
  searchAnime,
  fetchSuggestions,
  fetchAnimeDetails,
  fetchEpisodes,
  fetchServers,
  fetchStream,
};
