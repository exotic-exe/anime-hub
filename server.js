import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

const BASE_URL = 'https://anitaku.in';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': BASE_URL + '/',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

async function fetchPage(url) {
  const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
  return res.data;
}

// Search anime
app.get('/api/v1/search', async (req, res) => {
  try {
    const { keyword, page = 1 } = req.query;
    if (!keyword) return res.json({ results: [], currentPage: 1, hasNextPage: false });

    const url = `${BASE_URL}/search.html?keyword=${encodeURIComponent(keyword)}&page=${page}`;
    console.log('Search URL:', url);
    const html = await fetchPage(url);

    const results = [];
    // Try to find anime items in the HTML
    const itemRegex = /<a href="\/category\/([^"]+)"[^>]*>\s*<img src="([^"]+)"[^>]*>[\s\S]*?<div class="name">\s*([^<]+)/g;
    let match;
    while ((match = itemRegex.exec(html)) !== null && results.length < 15) {
      results.push({ id: match[1], name: match[3].trim(), poster: match[2] });
    }

    console.log('Found:', results.length);
    res.json({ results, currentPage: parseInt(page), hasNextPage: results.length >= 15, totalPages: 1 });
  } catch (err) {
    console.error('Search error:', err.message);
    res.json({ results: [], currentPage: 1, hasNextPage: false });
  }
});

// Get episodes
app.get('/api/v1/episodes/:id', async (req, res) => {
  try {
    const url = `${BASE_URL}/category/${req.params.id}`;
    const html = await fetchPage(url);

    const episodes = [];
    const epRegex = /<li>\s*<a href="(\/[^"]+-episode-\d+)"[^>]*>[\s\S]*?<span class="name">([^<]+)/g;
    let match;
    while ((match = epRegex.exec(html)) !== null) {
      const epNum = match[2].replace(/[^\d]/g, '') || '1';
      episodes.push({ id: match[1].replace('/', ''), number: parseInt(epNum), title: match[2].trim() });
    }

    res.json({ totalEpisodes: episodes.length, episodes: episodes.reverse() });
  } catch (err) {
    console.error('Episodes error:', err.message);
    res.json({ totalEpisodes: 0, episodes: [] });
  }
});

// Get stream URL
app.get('/api/v1/stream', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.json({ sources: [], iframe: null });

    const url = `${BASE_URL}/${id}`;
    const html = await fetchPage(url);

    const videoMatch = html.match(/data-video="([^"]+)"/);
    const videoUrl = videoMatch ? videoMatch[1].replace('//', 'https://') : null;

    res.json({
      headers: { Referer: BASE_URL + '/' },
      sources: videoUrl ? [{ url: videoUrl, isM3U8: videoUrl.includes('.m3u8'), quality: 'auto' }] : [],
      iframe: videoUrl,
      server: 'gogoanime',
    });
  } catch (err) {
    console.error('Stream error:', err.message);
    res.json({ sources: [], iframe: null });
  }
});

app.get('/api/v1/home', (req, res) => res.json({ spotlightAnimes: [], trendingAnimes: [], latestEpisodeAnimes: [], topAiringAnimes: [], status: true }));

const PORT = process.env.PORT || 3030;
app.listen(PORT, () => console.log(`Streaming server on http://localhost:${PORT}/api/v1`));