export const API_MEDIA_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

/** Extract /static/... path from stored media URLs (relative or absolute). */
function toStaticPath(url: string): string | null {
  const match = url.match(/\/static\/(?:avatars|teachers)\/[^\s?#]+/);
  return match ? match[0] : null;
}

/**
 * Resolve avatar/media URLs for <img src>.
 * In the browser we prefer same-origin /static/... (Vite proxy in dev) so CSP img-src 'self' allows them.
 */
export function resolveMediaUrl(url?: string | null, cacheBuster?: number): string {
  if (!url) return '';

  const staticPath = toStaticPath(url);
  let resolved: string;

  if (staticPath && typeof window !== 'undefined') {
    resolved = `${window.location.origin}${staticPath}`;
  } else if (url.startsWith('http://127.0.0.1:') || url.startsWith('http://localhost:')) {
    resolved = url
      .replace('http://127.0.0.1:8000', API_MEDIA_BASE)
      .replace('http://localhost:8000', API_MEDIA_BASE);
  } else if (url.startsWith('http')) {
    resolved = url;
  } else if (url.startsWith('/')) {
    resolved =
      typeof window !== 'undefined'
        ? `${window.location.origin}${url}`
        : `${API_MEDIA_BASE}${url}`;
  } else {
    resolved = `${API_MEDIA_BASE}/${url}`;
  }

  if (cacheBuster) {
    const sep = resolved.includes('?') ? '&' : '?';
    return `${resolved}${sep}v=${cacheBuster}`;
  }
  return resolved;
}
