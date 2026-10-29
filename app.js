/* =========================================================
   AnimeHub — AniList GraphQL client  (vanilla JS, zero deps)
   ========================================================= */

const API = 'https://graphql.anilist.co';
let heroAnimeId = null;
let currentSection = 'trending';
let searchTimeout = null;

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
  card.onclick = () => openDetail(m.id);

  card.innerHTML = `
    <img class="card-img" src="${img}" alt="${title}" loading="lazy">
    ${score ? `<span class="card-score ${scoreClass(score)}">★ ${score}%</span>` : ''}
    ${epBadge ? `<span class="card-ep">${epBadge}</span>` : ''}
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

// ── Detail modal ───────────────────────────────────────────
async function openDetail(id) {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // reset
  ['modalBanner','modalPoster','modalTitle','modalTags','modalStats','modalDesc','modalCharacters','modalRecs','modalTrailer']
    .forEach(el => { const d = document.getElementById(el); d.innerHTML = ''; });
  document.getElementById('modalTitle').textContent = 'Loading…';

  try {
    const { Media: m } = await gql(DETAIL_QUERY, { id });

    // banner
    const banner = m.bannerImage || m.coverImage.extraLarge;
    document.getElementById('modalBanner').style.backgroundImage = `url(${banner})`;

    // poster
    document.getElementById('modalPoster').src = m.coverImage.extraLarge || m.coverImage.large;

    // title
    document.getElementById('modalTitle').textContent = m.title.english || m.title.romaji;

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
        <div class="rec-card" onclick="closeModal(); openDetail(${rec.id})">
          <img src="${rec.coverImage.large}" alt="${rec.title.romaji}" loading="lazy">
          <span>${rec.title.romaji}</span>
        </div>
      `;
    }).join('') || '<span style="color:var(--text-muted);font-size:.82rem;">No recommendations yet.</span>';

    // trailer
    if (m.trailer && m.trailer.site === 'youtube') {
      document.getElementById('modalTrailer').innerHTML = `
        <h3 class="modal-section-heading">Trailer</h3>
        <iframe src="https://www.youtube.com/embed/${m.trailer.id}" allowfullscreen loading="lazy"></iframe>
      `;
    }
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
  // kill trailer playback
  document.getElementById('modalTrailer').innerHTML = '';
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
