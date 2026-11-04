/**
 * Download Helper for ExoticHub
 * Generates verified direct anime download sources, commands, and high-speed mirrors
 */

import { stripHtml } from './sanitize';

/**
 * Convert an anime title to a URL-friendly slug
 * @param {string} title
 * @returns {string}
 */
export function toAnimeSlug(title) {
  if (!title || typeof title !== 'string') return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract clean string title from anime title object or string
 * @param {string|object} titleObjOrStr
 * @returns {string}
 */
export function getCleanAnimeTitle(titleObjOrStr) {
  if (!titleObjOrStr) return '';
  if (typeof titleObjOrStr === 'string') return stripHtml(titleObjOrStr);
  const clean = titleObjOrStr.english || titleObjOrStr.romaji || titleObjOrStr.native || '';
  return stripHtml(clean);
}

/**
 * Generate direct download options and instant commands for an episode
 * @param {object} params
 * @param {string|object} params.title
 * @param {number} params.episode
 * @param {string|number} params.animeId
 * @returns {object}
 */
export function generateDirectDownload({ title, episode = 1, animeId = null }) {
  const cleanTitle = getCleanAnimeTitle(title) || 'Anime';
  const epNum = Math.max(1, Number(episode) || 1);
  const safeId = animeId || '';
  const slug = toAnimeSlug(cleanTitle);
  const epPad = epNum < 10 ? `0${epNum}` : `${epNum}`;
  const filename = `${cleanTitle.replace(/[\\/:*?"<>|]/g, '')}_Ep_${epNum}.mp4`;

  // Direct standalone player URL (Native browser video player with Save Video As support)
  const standaloneUrl = safeId
    ? `https://www.animeembed.com/embed/ani/${safeId}/${epNum}?track=sub&server=1`
    : `https://anitaku.bz/${slug}-episode-${epNum}`;

  // Direct dub standalone URL
  const dubStandaloneUrl = safeId
    ? `https://www.animeembed.com/embed/ani/${safeId}/${epNum}?track=dub&server=1`
    : `https://anitaku.bz/${slug}-dub-episode-${epNum}`;

  // Direct lossless ffmpeg command
  const ffmpegCommand = `ffmpeg -i "${standaloneUrl}" -c copy "${filename}"`;

  // Direct MP4 episode mirror
  const directMp4Url = slug
    ? `https://anitaku.bz/${slug}-episode-${epNum}`
    : `https://anitaku.bz/search.html?keyword=${encodeURIComponent(cleanTitle)}`;

  // Direct torrent search for 1080p
  const torrentUrl = `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(cleanTitle + ' ' + epPad)}`;

  return {
    filename,
    cleanTitle,
    epNum,
    standaloneUrl,
    dubStandaloneUrl,
    ffmpegCommand,
    directMp4Url,
    torrentUrl,
  };
}

/**
 * Generate comprehensive download options for an anime episode
 * @param {object} params
 * @param {string|object} params.title - Anime title
 * @param {number} params.episode - Episode number
 * @param {number} params.totalEpisodes - Total episode count
 * @param {string|number} params.animeId - AniList ID
 * @returns {Array<object>}
 */
export function generateDownloadMirrors({ title, episode = 1, totalEpisodes = 1, animeId = null }) {
  const cleanTitle = getCleanAnimeTitle(title);
  const epNum = Math.max(1, Number(episode) || 1);
  const slug = toAnimeSlug(cleanTitle);
  const epPad = epNum < 10 ? `0${epNum}` : `${epNum}`;
  const total = Math.max(epNum, Number(totalEpisodes) || 1);

  return [
    {
      id: 'gogo-direct',
      name: 'Direct Fast CDN Mirror (GogoAnime / Anitaku)',
      type: 'Direct MP4 Stream & Download',
      quality: '360p • 480p • 720p • 1080p',
      badge: 'Fast Direct CDN',
      recommended: true,
      url: slug
        ? `https://anitaku.bz/${slug}-episode-${epNum}`
        : `https://anitaku.bz/search.html?keyword=${encodeURIComponent(cleanTitle)}`,
      searchUrl: `https://anitaku.bz/search.html?keyword=${encodeURIComponent(cleanTitle)}`,
      description: `Direct MP4 downloads with multiple fast servers (Vidstreaming, Mp4Upload, StreamWish) for Episode ${epNum}.`,
    },
    {
      id: 'pahe',
      name: 'AnimePahe Compact HD Encode',
      type: 'Compressed High-Definition (H.264/H.265)',
      quality: '720p • 1080p',
      badge: 'High Quality & Low Data',
      recommended: false,
      url: `https://animepahe.ru/anime?q=${encodeURIComponent(cleanTitle)}`,
      searchUrl: `https://animepahe.ru/anime?q=${encodeURIComponent(cleanTitle)}`,
      description: 'Crystal-clear encodes with small file sizes (~100-250MB per episode). Perfect for mobile & limited storage.',
    },
    {
      id: 'dub-mirror',
      name: 'English Dubbed Episode Mirror',
      type: 'English Audio Dubbed Version',
      quality: '720p • 1080p',
      badge: 'English Dub',
      recommended: false,
      url: slug
        ? `https://anitaku.bz/${slug}-dub-episode-${epNum}`
        : `https://anitaku.bz/search.html?keyword=${encodeURIComponent(cleanTitle + ' dub')}`,
      searchUrl: `https://anitaku.bz/search.html?keyword=${encodeURIComponent(cleanTitle + ' dub')}`,
      description: `English voiceover audio release for Episode ${epNum}.`,
    },
    {
      id: 'nyaa-ep',
      name: 'Nyaa Lossless BDRip / Multi-Sub',
      type: 'Dual-Audio / High Bitrate MKV',
      quality: '1080p Blu-Ray',
      badge: 'Lossless 1080p',
      recommended: false,
      url: `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(cleanTitle + ' ' + epPad)}`,
      searchUrl: `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(cleanTitle + ' ' + epPad)}`,
      description: `Pristine uncompressed 1080p episode download with dual audio & soft subtitles for collectors.`,
    },
    {
      id: 'nyaa-batch',
      name: 'Complete Season / Batch Download',
      type: 'Full Season Archive',
      quality: '1080p / 720p Batch',
      badge: 'Batch Download',
      recommended: false,
      url: `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(cleanTitle + ' batch')}`,
      searchUrl: `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(cleanTitle + ' batch')}`,
      description: `Download all ${total} episodes of ${cleanTitle} in a single complete batch.`,
    },
  ];
}
