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
 * Get direct 1-click download file URL
 * @param {string|object} title
 * @param {number} episode
 * @returns {string}
 */
export function getOneClickDownloadUrl(title, episode = 1) {
  const cleanTitle = getCleanAnimeTitle(title) || 'Anime';
  const epNum = Math.max(1, Number(episode) || 1);
  return `/api/v1/download/file?title=${encodeURIComponent(cleanTitle)}&episode=${epNum}`;
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
  const epPad = epNum < 10 ? `0${epNum}` : `${epNum}`;
  const filename = `${cleanTitle.replace(/[\\/:*?"<>|]/g, '')}_Ep_${epNum}.mp4`;

  // 1-Click native browser attachment download
  const oneClickDownloadUrl = getOneClickDownloadUrl(cleanTitle, epNum);

  // Primary direct torrent search for 1080p
  const torrentUrl = `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(cleanTitle + ' ' + epPad)}`;
  const batchTorrentUrl = `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(cleanTitle + ' batch')}`;

  // Direct Cloud Storage Downloads (Google Drive & Mega via Kayoanime)
  const kayoUrl = `https://kayoanime.com/?s=${encodeURIComponent(cleanTitle)}`;

  // AnimePahe Direct MP4 Downloads (Compact 720p/1080p, ~150MB)
  const paheUrl = `https://animepahe.ru/anime?q=${encodeURIComponent(cleanTitle)}`;

  // Direct HLS Stream URL for Download Managers (1DM / ADM / IDM / VLC)
  const streamUrl = safeId
    ? `https://www.animeembed.com/embed/ani/${safeId}/${epNum}?track=sub&server=1`
    : torrentUrl;

  // Direct lossless ffmpeg command
  const ffmpegCommand = `ffmpeg -headers "Referer: https://www.animeembed.com/" -i "${streamUrl}" -c copy "${filename}"`;

  return {
    filename,
    cleanTitle,
    epNum,
    oneClickDownloadUrl,
    torrentUrl,
    batchTorrentUrl,
    kayoUrl,
    paheUrl,
    streamUrl,
    ffmpegCommand,
    directDownloadUrl: oneClickDownloadUrl,
    dubDownloadUrl: kayoUrl,
    standaloneUrl: oneClickDownloadUrl,
    dubStandaloneUrl: kayoUrl,
    directMp4Url: paheUrl,
  };
}

/**
 * Fetch live episode download sources (torrents, magnets, cloud mirrors) from backend
 * @param {string} title
 * @param {number} episode
 * @returns {Promise<object|null>}
 */
export async function fetchLiveDownloads(title, episode = 1) {
  const cleanTitle = getCleanAnimeTitle(title);
  if (!cleanTitle) return null;

  try {
    const res = await fetch(`/api/v1/download?title=${encodeURIComponent(cleanTitle)}&episode=${episode}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch (err) {
    return null;
  }
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
  const epPad = epNum < 10 ? `0${epNum}` : `${epNum}`;
  const total = Math.max(epNum, Number(totalEpisodes) || 1);

  return [
    {
      id: 'nyaa-ep',
      name: 'Nyaa Lossless 1080p Release',
      type: 'Dual-Audio / High Bitrate MKV',
      quality: '1080p Blu-Ray',
      badge: 'Lossless 1080p',
      recommended: true,
      url: `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(cleanTitle + ' ' + epPad)}`,
      searchUrl: `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(cleanTitle + ' ' + epPad)}`,
      description: `Pristine uncompressed 1080p episode download with dual audio & soft subtitles for Episode ${epNum}.`,
    },
    {
      id: 'kayo-cloud',
      name: 'Direct Cloud Storage (Google Drive & Mega)',
      type: 'Direct Cloud MP4 / DDL',
      quality: '1080p / 720p DDL',
      badge: 'Google Drive & Mega',
      recommended: false,
      url: `https://kayoanime.com/?s=${encodeURIComponent(cleanTitle)}`,
      searchUrl: `https://kayoanime.com/?s=${encodeURIComponent(cleanTitle)}`,
      description: 'Direct high-speed downloads via Google Drive and Mega folders without ads or torrent clients.',
    },
    {
      id: 'pahe',
      name: 'AnimePahe Compact HD Encode',
      type: 'Compressed High-Definition (H.264/H.265)',
      quality: '720p • 1080p',
      badge: 'Compact & Fast',
      recommended: false,
      url: `https://animepahe.ru/anime?q=${encodeURIComponent(cleanTitle)}`,
      searchUrl: `https://animepahe.ru/anime?q=${encodeURIComponent(cleanTitle)}`,
      description: 'Crystal-clear encodes with small file sizes (~100-250MB per episode). Perfect for mobile & limited storage.',
    },
    {
      id: 'nyaa-batch',
      name: 'Complete Season / Batch Archive',
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
