/* =========================================================
   AnimeHub — AniList GraphQL client  (vanilla JS, zero deps)
   ========================================================= */

const API = 'https://graphql.anilist.co';
let heroAnimeId = null;
let currentSection = 'trending';
let searchTimeout = null;
let currentMedia = null;
let artInstance = null;
const SAMPLE_HLS_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
const DEFAULT_SUBTITLE = '/subtitles/demo.vtt';

// ── GraphQL fragments ──────────────────────────────────────
const MEDIA_FRAGMENT = `
  fragment media on Media {
    id
    title { romaji english }
    coverImage { extraLarge large color }
    bannerImage
    description(asHtml: false)
    averageScore
    meanScore
    popularity
    episodes
    duration
    format
    status
    season
    seasonYear
    startDate { year month }
    genres
    studios(isMain: true) { nodes { name } }
    trailer { id site }
    nextAiringEpisode { episode timeUntilAiring }
  }
`;

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      ...media
      externalLinks {
        url
        site
        icon
        color
        type
      }
      streamingEpisodes {
        title
        thumbnail
        url
        site
      }
      characters(sort: FAVOURITES_DESC, perPage: 12) {
        edges {
          node { name { full } image { medium } }
          role
        }
      }
      recommendations(sort: RATING_DESC, perPage: 8) {
        nodes {
          mediaRecommendation {
            id
            title { romaji }
            coverImage { large }
          }
        }
      }
    }
  }
  ${MEDIA_FRAGMENT}
`;

// ── Fetcher ────────────────────────────────────────────────
async function gql(query, variables = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList API ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

// ── Section queries ────────────────────────────────────────
function buildListQuery(sort, status, season, seasonYear) {
  let filters = 'type: ANIME';
  if (sort)       filters += `, sort: ${sort}`;
  if (status)     filters += `, status: ${status}`;
  if (season)     filters += `, season: ${season}`;
  if (seasonYear) filters += `, seasonYear: ${seasonYear}`;
  return `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(${filters}) { ...media }
      }
    }
    ${MEDIA_FRAGMENT}
  `;
}

function getNextSeason() {
  const now = new Date();
  const m = now.getMonth();
  let year = now.getFullYear();
  let season;
  if (m < 3)       season = 'SPRING';
  else if (m < 6)  season = 'SUMMER';
  else if (m < 9)  season = 'FALL';
  else             { season = 'WINTER'; year++; }
  return { season, year };
}

const sectionConfig = {
  trending:  () => ({ query: buildListQuery('TRENDING_DESC'),                    title: '🔥 Trending Now' }),
  popular:   () => ({ query: buildListQuery('POPULARITY_DESC'),                  title: '⭐ Most Popular' }),
  top:       () => ({ query: buildListQuery('SCORE_DESC'),                       title: '🏆 Top Rated' }),
  upcoming:  () => {
    const { season, year } = getNextSeason();
    return { query: buildListQuery('POPULARITY_DESC', 'NOT_YET_RELEASED', season, year), title: '📅 Upcoming' };
  },
};

const searchQuery = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) { ...media }
    }
  }
  ${MEDIA_FRAGMENT}
`;

// ── DOM refs ───────────────────────────────────────────────
const grid         = document.getElementById('animeGrid');
const loader       = document.getElementById('loader');
const noResults    = document.getElementById('noResults');
const sectionTitle = document.getElementById('sectionTitle');
const searchInput  = document.getElementById('searchInput');
const hero         = document.getElementById('hero');

// ── Render helpers ─────────────────────────────────────────
function scoreClass(s) { return s >= 75 ? 'high' : s >= 55 ? 'mid' : 'low'; }

function stripHtml(str) {
  if (!str) return '';
  return str.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function createCard(m) {
  const title = m.title.english || m.title.romaji;
  const img = m.coverImage.extraLarge || m.coverImage.large;
  const score = m.averageScore;
  const genres = (m.genres || []).slice(0, 2);
  const studio = m.studios?.nodes?.[0]?.name || '';
  const eps = m.episodes;
  const airing = m.nextAiringEpisode;

  let epBadge = '';
  if (airing) {
    epBadge = `EP ${airing.episode}`;
  } else if (eps) {
    epBadge = `${eps} EP`;
  }

  const card = document.createElement('div');
  card.className = 'anime-card';
  card.onclick = () => openDetail(m.id, false);

  card.innerHTML = `
    <img class="card-img" src="${img}" alt="${title}" loading="lazy">
    ${score ? `<span class="card-score ${scoreClass(score)}">★ ${score}%</span>` : ''}
    ${epBadge ? `<span class="card-ep">${epBadge}</span>` : ''}
    <div class="card-play-btn" title="Watch Now" onclick="event.stopPropagation(); openDetail(${m.id}, true)">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
    </div>
    <div class="card-body">
      <div class="card-title">${title}</div>
      <div class="card-genres">
        ${genres.map(g => `<span class="card-genre">${g}</span>`).join('')}
      </div>
      ${studio ? `<div class="card-studio">${studio}</div>` : ''}
    </div>
  `;
  return card;
}

// ── Hero ───────────────────────────────────────────────────
function setHero(m) {
  if (!m) { hero.style.display = 'none'; return; }
  hero.style.display = 'flex';
  heroAnimeId = m.id;
  const bg = m.bannerImage || m.coverImage.extraLarge;
  document.getElementById('heroBg').style.backgroundImage = `url(${bg})`;
  document.getElementById('heroBadge').textContent = m.format || 'TV';
  document.getElementById('heroTitle').textContent = m.title.english || m.title.romaji;
  document.getElementById('heroDesc').textContent = stripHtml(m.description);

  const parts = [];
  if (m.seasonYear) parts.push(`<span>📅 ${m.season ? m.season.charAt(0) + m.season.slice(1).toLowerCase() : ''} ${m.seasonYear}</span>`);
  if (m.episodes)   parts.push(`<span>🎞️ ${m.episodes} episodes</span>`);
  if (m.averageScore) parts.push(`<span>★ ${m.averageScore}%</span>`);
  document.getElementById('heroMeta').innerHTML = parts.join('');
}

// ── Load section ───────────────────────────────────────────
async function loadSection(section) {
  currentSection = section;
  searchInput.value = '';

  // update active nav
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.section === section);
  });

  const config = sectionConfig[section]();
  sectionTitle.textContent = config.title;
  grid.innerHTML = '';
  noResults.style.display = 'none';
  loader.style.display = 'flex';
  hero.style.display = 'flex';

  try {
    const data = await gql(config.query, { page: 1, perPage: 24 });
    const list = data.Page.media;
    loader.style.display = 'none';

    if (!list.length) { noResults.style.display = 'block'; hero.style.display = 'none'; return; }
    setHero(list[0]);
    list.forEach(m => grid.appendChild(createCard(m)));
  } catch (err) {
    loader.style.display = 'none';
    noResults.style.display = 'block';
    noResults.querySelector('p').textContent = `⚠️ ${err.message}`;
    hero.style.display = 'none';
  }
}

// ── Search ─────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();
  if (!q) { loadSection(currentSection); return; }
  searchTimeout = setTimeout(() => performSearch(q), 350);
});

async function performSearch(q) {
  sectionTitle.textContent = `🔍 Results for "${q}"`;
  grid.innerHTML = '';
  noResults.style.display = 'none';
  loader.style.display = 'flex';
  hero.style.display = 'none';

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  try {
    const data = await gql(searchQuery, { search: q, page: 1, perPage: 24 });
    const list = data.Page.media;
    loader.style.display = 'none';
    if (!list.length) { noResults.style.display = 'block'; return; }
    list.forEach(m => grid.appendChild(createCard(m)));
  } catch (err) {
    loader.style.display = 'none';
    noResults.style.display = 'block';
    noResults.querySelector('p').textContent = `⚠️ ${err.message}`;
  }
}

// ── Video Player Helpers (Artplayer + Captions Engine) ────
function destroyArtplayer() {
  if (artInstance && typeof artInstance.destroy === 'function') {
    try { artInstance.destroy(false); } catch(e){}
  }
  artInstance = null;
  const container = document.getElementById('artplayerContainer');
  if (container) {
    container.innerHTML = '';
    container.classList.remove('active');
  }
}

function initArtplayer(url, poster, animeName, subtitleUrl) {
  destroyArtplayer();
  const empty = document.getElementById('playerEmpty');
  const container = document.getElementById('artplayerContainer');
  const badge = document.getElementById('playerBadgeText');
  const title = document.getElementById('playerTitle');
  const captionBadge = document.getElementById('captionBadge');

  if (empty) { empty.style.display = 'none'; }
  if (container) { container.classList.add('active'); }

  badge.textContent = 'ARTPLAYER ENGINE';
  title.textContent = `${animeName || 'Stream'} — Active Stream`;

  const subUrl = subtitleUrl || DEFAULT_SUBTITLE;
  if (captionBadge) {
    captionBadge.textContent = '💬 CC: English (Active)';
  }

  try {
    const art = new Artplayer({
      container: '#artplayerContainer',
      url: url || SAMPLE_HLS_STREAM,
      poster: poster || (currentMedia ? (currentMedia.bannerImage || currentMedia.coverImage.extraLarge) : ''),
      volume: 0.6,
      isLive: false,
      muted: false,
      autoplay: true,
      pip: true,
      autoSize: true,
      autoMini: true,
      screenshot: true,
      setting: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      miniProgressBar: true,
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: true,
      airplay: true,
      theme: '#cae962', // Lemonish accent from oni-chan
      moreVideoAttr: {
        crossOrigin: 'anonymous',
      },
      subtitle: {
        url: subUrl,
        type: 'vtt',
        style: {
          color: '#ffffff',
          fontSize: '22px',
          textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 2px #000',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: '600',
        },
        encoding: 'utf-8',
      },
      controls: [
        {
          position: 'right',
          html: '💬 CC',
          tooltip: 'Toggle Captions',
          click: function () {
            art.subtitle.show = !art.subtitle.show;
            art.notice.show = art.subtitle.show ? 'Captions: ON' : 'Captions: OFF';
            if (captionBadge) {
              captionBadge.textContent = art.subtitle.show ? '💬 CC: ON' : '💬 CC: OFF';
            }
          },
        },
      ],
      customType: {
        m3u8: function (video, m3u8Url) {
          if (window.Hls && window.Hls.isSupported()) {
            const hls = new window.Hls();
            hls.loadSource(m3u8Url);
            hls.attachMedia(video);
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = m3u8Url;
          }
        },
      },
      highlight: [
        { time: 85, text: 'Intro Ends' },
        { time: 1320, text: 'Outro Starts' },
      ],
    });

    // Skip Intro layer from oni-chan
    art.layers.add({
      name: 'skip-intro',
      html: '<button class="art-skip-btn">Skip Intro (85s)</button>',
      style: { position: 'absolute', bottom: '80px', right: '20px' },
      click: function () {
        art.video.currentTime = 90;
        this.style.display = 'none';
        art.notice.show = 'Intro skipped';
      },
    });

    // Skip Outro layer from oni-chan
    art.layers.add({
      name: 'skip-outro',
      html: '<button class="art-skip-btn">Skip Outro</button>',
      style: { position: 'absolute', bottom: '80px', right: '20px' },
      click: function () {
        art.notice.show = 'Outro skipped';
      },
    });

    art.on('video:timeupdate', () => {
      const current = art.video.currentTime;
      const duration = art.video.duration;
      const skipIntroBtn = art.layers['skip-intro'];
      const skipOutroBtn = art.layers['skip-outro'];

      if (current > 5 && current < 85) {
        if (skipIntroBtn) skipIntroBtn.style.display = 'block';
      } else {
        if (skipIntroBtn) skipIntroBtn.style.display = 'none';
      }

      if (duration > 100 && current > duration - 90 && current < duration - 10) {
        if (skipOutroBtn) skipOutroBtn.style.display = 'block';
      } else {
        if (skipOutroBtn) skipOutroBtn.style.display = 'none';
      }
    });

    artInstance = art;
  } catch (e) {
    console.error('Failed to init Artplayer', e);
  }
}

function toggleCaptions() {
  if (artInstance && artInstance.subtitle) {
    artInstance.subtitle.show = !artInstance.subtitle.show;
    artInstance.notice.show = artInstance.subtitle.show ? 'Captions: ON' : 'Captions: OFF';
    const captionBadge = document.getElementById('captionBadge');
    if (captionBadge) {
      captionBadge.textContent = artInstance.subtitle.show ? '💬 CC: ON' : '💬 CC: OFF';
    }
  } else {
    startArtplayerStream();
  }
}

function startArtplayerStream() {
  const animeTitle = currentMedia ? (currentMedia.title.english || currentMedia.title.romaji) : 'Anime';
  const streamUrl = document.getElementById('customStreamInput')?.value.trim();
  const captionUrl = document.getElementById('customCaptionInput')?.value.trim();
  initArtplayer(streamUrl || SAMPLE_HLS_STREAM, currentMedia?.bannerImage, animeTitle, captionUrl || DEFAULT_SUBTITLE);
}

function playCustomStreamUrl() {
  const streamUrl = document.getElementById('customStreamInput')?.value.trim();
  const captionUrl = document.getElementById('customCaptionInput')?.value.trim();
  if (!streamUrl) {
    alert('Please enter a stream URL (.m3u8 or .mp4) to play.');
    return;
  }
  const animeTitle = currentMedia ? (currentMedia.title.english || currentMedia.title.romaji) : 'Custom Stream';
  initArtplayer(streamUrl, currentMedia?.bannerImage, animeTitle, captionUrl || DEFAULT_SUBTITLE);
}

function switchPlayerMode(mode) {
  document.querySelectorAll('.player-tab-btn').forEach(b => b.classList.remove('active'));
  if (mode === 'artplayer') {
    document.getElementById('tabHls')?.classList.add('active');
    startArtplayerStream();
  }
}

function playEpisode(epTitle, epNumber) {
  const animeTitle = currentMedia ? (currentMedia.title.english || currentMedia.title.romaji) : 'Anime';
  const badge = document.getElementById('playerBadgeText');
  const title = document.getElementById('playerTitle');
  badge.textContent = `EPISODE ${epNumber}`;
  title.textContent = `${animeTitle} — ${epTitle}`;

  // Start in-app player for this episode immediately
  const streamUrl = document.getElementById('customStreamInput')?.value.trim();
  const captionUrl = document.getElementById('customCaptionInput')?.value.trim();
  initArtplayer(streamUrl || SAMPLE_HLS_STREAM, currentMedia?.bannerImage, `${animeTitle} - ${epTitle}`, captionUrl || DEFAULT_SUBTITLE);

  // Scroll smoothly to player
  document.getElementById('theaterPlayer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Detail modal ───────────────────────────────────────────
async function openDetail(id, autoPlay = false) {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // reset
  ['modalBanner','modalPoster','modalTitle','modalTags','modalStats','modalDesc','modalCharacters','modalRecs','modalEpisodes']
    .forEach(el => { const d = document.getElementById(el); if (d) d.innerHTML = ''; });
  
  destroyArtplayer();
  const empty = document.getElementById('playerEmpty');
  if (empty) { empty.style.display = 'flex'; }
  document.getElementById('playerBadgeText').textContent = 'ARTPLAYER';
  document.getElementById('playerTitle').textContent = 'Ready to play';
  const captionBadge = document.getElementById('captionBadge');
  if (captionBadge) captionBadge.textContent = '💬 CC: Ready';
  document.getElementById('modalTitle').textContent = 'Loading…';

  try {
    const { Media: m } = await gql(DETAIL_QUERY, { id });
    currentMedia = m;

    // Dynamic SEO — update title and meta for this anime
    const animeTitle = m.title.english || m.title.romaji;
    document.title = `${animeTitle} — AnimeHub | Watch, Discover & Track Anime`;
    document.querySelector('meta[name="description"]')?.setAttribute('content',
      `Watch ${animeTitle} on AnimeHub. ${stripHtml(m.description || '').slice(0, 150)}… Score: ${m.averageScore || 'N/A'}%. Genres: ${(m.genres || []).join(', ')}.`
    );
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${animeTitle} — AnimeHub`);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', stripHtml(m.description || '').slice(0, 200));
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', m.bannerImage || m.coverImage.extraLarge);

    // banner
    const banner = m.bannerImage || m.coverImage.extraLarge;
    document.getElementById('modalBanner').style.backgroundImage = `url(${banner})`;

    // poster
    document.getElementById('modalPoster').src = m.coverImage.extraLarge || m.coverImage.large;

    // title
    document.getElementById('modalTitle').textContent = animeTitle;

    // tags / genres
    document.getElementById('modalTags').innerHTML = (m.genres || [])
      .map(g => `<span class="modal-tag">${g}</span>`).join('');

    // stats
    const stats = [];
    if (m.averageScore)  stats.push(`<span>⭐ <b>${m.averageScore}%</b></span>`);
    if (m.popularity)    stats.push(`<span>❤️ ${m.popularity.toLocaleString()}</span>`);
    if (m.format)        stats.push(`<span><span class="stat-label">Format</span> ${m.format}</span>`);
    if (m.episodes)      stats.push(`<span><span class="stat-label">Episodes</span> ${m.episodes}</span>`);
    if (m.duration)      stats.push(`<span><span class="stat-label">Duration</span> ${m.duration}m</span>`);
    if (m.status)        stats.push(`<span><span class="stat-label">Status</span> ${m.status.replace(/_/g,' ')}</span>`);
    if (m.seasonYear)    stats.push(`<span><span class="stat-label">Season</span> ${(m.season||'').charAt(0)+(m.season||'').slice(1).toLowerCase()} ${m.seasonYear}</span>`);
    document.getElementById('modalStats').innerHTML = stats.join('');

    // theater player setup
    empty.style.backgroundImage = `url(${m.bannerImage || m.coverImage.extraLarge})`;
    document.getElementById('playerTitle').textContent = `${animeTitle} — Artplayer Stream`;
    document.getElementById('playerBadgeText').textContent = 'READY TO STREAM';

    if (autoPlay) {
      startArtplayerStream();
      document.getElementById('theaterPlayer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Streaming Episodes
    const epsList = m.streamingEpisodes || [];
    const episodesContainer = document.getElementById('modalEpisodes');
    const episodesTitle = document.getElementById('episodesTitle');
    if (epsList.length > 0) {
      episodesTitle.textContent = `🎬 Episodes Available (${epsList.length})`;
      episodesContainer.innerHTML = epsList.map((ep, idx) => {
        const safeTitle = (ep.title || `Episode ${idx + 1}`).replace(/'/g, "\\'");
        return `
          <div class="episode-card" onclick="playEpisode('${safeTitle}', ${idx + 1})" title="Play ${ep.title}">
            <img src="${ep.thumbnail || m.coverImage.large}" alt="${ep.title}" loading="lazy">
            <div class="ep-play"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
            <div class="ep-title">${ep.title}</div>
          </div>
        `;
      }).join('');
    } else {
      episodesTitle.textContent = '🎬 Episodes';
      episodesContainer.innerHTML = '<span class="no-episodes">Click "Play Anime Stream" above to start streaming in Artplayer.</span>';
    }

    // desc
    document.getElementById('modalDesc').textContent = stripHtml(m.description);

    // characters
    const chars = m.characters?.edges || [];
    document.getElementById('modalCharacters').innerHTML = chars.map(c => `
      <div class="char-card">
        <img src="${c.node.image.medium}" alt="${c.node.name.full}" loading="lazy">
        <span>${c.node.name.full}</span>
      </div>
    `).join('');

    // recommendations
    const recs = (m.recommendations?.nodes || []).filter(r => r.mediaRecommendation);
    document.getElementById('modalRecs').innerHTML = recs.map(r => {
      const rec = r.mediaRecommendation;
      return `
        <div class="rec-card" onclick="openDetail(${rec.id}, false)">
          <img src="${rec.coverImage.large}" alt="${rec.title.romaji}" loading="lazy">
          <span>${rec.title.romaji}</span>
        </div>
      `;
    }).join('') || '<span style="color:var(--text-muted);font-size:.82rem;">No recommendations yet.</span>';

  } catch (err) {
    document.getElementById('modalTitle').textContent = '⚠️ Failed to load';
    document.getElementById('modalDesc').textContent = err.message;
  }
}

function closeDetail(e) {
  if (e && e.target !== e.currentTarget) return;
  closeModal();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  // Stop video playback completely
  destroyArtplayer();
  const iframe = document.getElementById('videoIframe');
  if (iframe) {
    iframe.src = '';
    iframe.classList.remove('active');
  }
  const empty = document.getElementById('playerEmpty');
  if (empty) empty.style.display = 'flex';

  // Reset SEO to default
  document.title = 'AnimeHub — Watch, Discover & Track Anime Online | Trending, Popular & Top Rated Anime';
  document.querySelector('meta[name="description"]')?.setAttribute('content',
    'AnimeHub by exotic-exe — Discover trending, popular, and top rated anime. Search thousands of anime, view details, characters, trailers, and find where to watch. Your ultimate free anime hub.'
  );
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

function goHome() {
  loadSection('trending');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Init ───────────────────────────────────────────────────
loadSection('trending');
