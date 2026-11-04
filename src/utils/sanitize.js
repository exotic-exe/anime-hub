/**
 * Security & Sanitization utilities for ExoticHub
 * Defends against XSS, HTML injection, URL spoofing, and control character exploits.
 */

// Strip HTML tags and entities to prevent XSS injection
export function stripHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Strip ASCII control chars
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

// Strictly validates that a URL is safe for embedding, media playback, or image display
export function isSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();

  // Block null bytes, CRLF, and ASCII control characters
  if (/[\u0000-\u001F\u007F-\u009F]/.test(trimmed)) return false;

  // Allow relative URLs starting with / (e.g. /media/...), but block protocol-relative //
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);

    // Only allow http: and https: protocols (blocks javascript:, data:, vbscript:, file:, blob:, etc.)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    // Block embedded credentials in URLs (e.g. https://user:pass@evil.com/)
    if (parsed.username || parsed.password) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

// Sanitize user search queries or anime titles
export function sanitizeSearchQuery(query) {
  if (!query || typeof query !== 'string') return '';
  return query
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .slice(0, 150) // Enforce maximum safe query length
    .trim();
}
