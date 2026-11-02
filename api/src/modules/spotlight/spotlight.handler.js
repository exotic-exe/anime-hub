export default async function spotlightHandler() {
  try {
    const res = await fetch('https://api.jikan.moe/v4/top/anime');
    const data = await res.json();

    const transform = (item) => ({
      id: item.mal_id.toString(),
      name: item.title,
      poster: item.images.jpg.large_image_url,
      description: item.synopsis,
      otherInfo: [item.type, item.source, item.status],
      rank: item.rank,
      episodes: {
        sub: item.episodes || 0,
        dub: item.episodes || 0,
        eps: item.episodes || 0
      }
    });

    return data.data.slice(0, 5).map((item, i) => ({ ...transform(item), rank: i + 1 }));
  } catch (error) {
    console.error('Jikan Spotlight Error:', error);
    return [];
  }
}
