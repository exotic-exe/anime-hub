const API_URL = 'https://graphql.anilist.co';

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

export async function fetchGraphQL(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
  return data.data;
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
  return data.Page.media;
}

export async function fetchPopular(page = 1, perPage = 20) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { page, perPage });
  return data.Page.media;
}

export async function fetchTopRated(page = 1, perPage = 20) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: SCORE_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { page, perPage });
  return data.Page.media;
}

export async function fetchAnimeDetails(id) {
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
  const data = await fetchGraphQL(query, { id: parseInt(id) });
  return data.Media;
}

export async function searchAnime(keyword, page = 1, perPage = 24) {
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
  const data = await fetchGraphQL(query, { search: keyword, page, perPage });
  return data.Page.media;
}
