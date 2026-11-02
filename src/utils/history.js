/**
 * Watch History Utility for ExoticHub
 * Persists anime watching progress to localStorage
 */

const HISTORY_KEY = 'exotichub_watch_history';
const MAX_HISTORY_ITEMS = 50;

/**
 * Retrieve all watch history items sorted by last watched timestamp
 * @returns {Array} Array of history objects
 */
export function getWatchHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to read watch history from localStorage:', err);
    return [];
  }
}

/**
 * Retrieve watch history for a specific anime ID
 * @param {string|number} animeId
 * @returns {Object|null}
 */
export function getAnimeHistory(animeId) {
  if (!animeId) return null;
  const history = getWatchHistory();
  return history.find((item) => String(item.animeId) === String(animeId)) || null;
}

/**
 * Save or update watch history for an anime
 * @param {Object} entry - { animeId, title, episode, totalEpisodes, poster, banner, format }
 */
export function saveWatchHistory(entry) {
  if (typeof window === 'undefined' || !entry?.animeId) return;
  try {
    const history = getWatchHistory();
    const existingIndex = history.findIndex(
      (item) => String(item.animeId) === String(entry.animeId)
    );

    const updatedItem = {
      animeId: entry.animeId,
      title: entry.title || 'Anime',
      episode: Number(entry.episode) || 1,
      totalEpisodes: Number(entry.totalEpisodes) || 1,
      poster: entry.poster || '',
      banner: entry.banner || '',
      format: entry.format || 'TV',
      updatedAt: Date.now(),
    };

    if (existingIndex > -1) {
      history.splice(existingIndex, 1);
    }

    history.unshift(updatedItem);

    if (history.length > MAX_HISTORY_ITEMS) {
      history.length = MAX_HISTORY_ITEMS;
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    // Dispatch custom event so other components (like Home/Navbar) update instantly
    window.dispatchEvent(new Event('exotichub_history_updated'));
  } catch (err) {
    console.warn('Failed to save watch history to localStorage:', err);
  }
}

/**
 * Remove an anime from watch history
 * @param {string|number} animeId
 */
export function removeHistoryItem(animeId) {
  if (typeof window === 'undefined' || !animeId) return;
  try {
    const history = getWatchHistory().filter(
      (item) => String(item.animeId) !== String(animeId)
    );
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    window.dispatchEvent(new Event('exotichub_history_updated'));
  } catch (err) {
    console.warn('Failed to remove history item:', err);
  }
}

/**
 * Clear all watch history
 */
export function clearWatchHistory() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(new Event('exotichub_history_updated'));
  } catch (err) {
    console.warn('Failed to clear watch history:', err);
  }
}

/**
 * Format relative time (e.g. "Just now", "5m ago", "2h ago", "Yesterday")
 * @param {number} timestamp
 * @returns {string}
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
