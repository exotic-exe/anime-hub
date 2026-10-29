import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

// Direct scraping - no external library dependencies that might break
const BASE_URL = 'https://anitaku.in';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://anitaku.in/',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

async function fetchWithCurl(url) {
  const { spawn } = await import('child_process');
  return new Promise((resolve, reject) => {
    const child = spawn('curl.exe', ['-s', '-L', '-k', '--connect-timeout', '15', '--max-time', '30', '-H', 'User-Agent: ' + HEADERS['User-Agent'], '-H', 'Referer: ' + HEADERS['Referer'], url]);
    let stdout = '', stderr = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(stderr || `curl code ${code}`)));
    child.on('error', reject);
  });
}

// Search anime
app.get('/api/v1/search', async (req, res) => {
  try {
    const { keyword, page = 1 } = req.query;
    if (!keyword) return res.json({ results: [], currentPage: 1, hasNextPage: false });

    const url = `${BASE_URL}/search.html?keyword=${encodeURIComponent(keyword)}&page=${page}`;
    const html = await fetchWithCurl(url);

    // Simple regex-based parsing (no cheerio dependency)
    const results = [];
    const itemRegex = /<li>\s*<a href="\/category\/([^"]+)">\s*<img src="([^"]+)"[^>]*>\s*<div class="name">\s*([^<]+)/g;
    let match;
    while ((match = itemRegex.exec(html)) !== null && results.length < 15) {
      results.push({ id: match[1], name: match[3].trim(), poster: match[2] });
    }

    res.json({ results, currentPage: parseInt(page), hasNextPage: results.length > 0, totalPages: 1 });
  } catch (err) {
    console.error('Search error:', err.message);
    res.json({ results: [], currentPage: 1, hasNextPage: false });
  }
});

// Get episodes
app.get('/api/v1/episodes/:id', async (req, res) => {
  try {
    const url = `${BASE_URL}/category/${req.params.id}`;
    const html = await fetchWithCurl(url);

    const episodes = [];
    const epRegex = /<li>\s*<a href="(\/[^"]+-episode-\d+)"[^>]*>.*?<span class="name">([^<]+)/g;
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
    const html = await fetchWithCurl(url);

    // Extract video URL from data-video attribute
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

// Health check
app.get('/api/v1/home', (req, res) => res.json({ spotlightAnimes: [], trendingAnimes: [], latestEpisodeAnimes: [], topAiringAnimes: [], status: true }));

const PORT = process.env.PORT || 3030;
app.listen(PORT, () => console.log(`Streaming server on http://localhost:${PORT}/api/v1`));