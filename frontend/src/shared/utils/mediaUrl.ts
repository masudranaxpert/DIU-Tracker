export const API_MEDIA_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const LOCAL_ORIGIN_REGEX = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/;

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

  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;

  if (staticPath && typeof window !== 'undefined' && !isCapacitor) {
    resolved = `${window.location.origin}${staticPath}`;
  } else if (staticPath) {
    resolved = `${API_MEDIA_BASE}${staticPath}`;
  } else if (LOCAL_ORIGIN_REGEX.test(url)) {
    resolved = url.replace(LOCAL_ORIGIN_REGEX, API_MEDIA_BASE);
  } else if (url.startsWith('http')) {
    resolved = url;
  } else if (url.startsWith('/')) {
    resolved =
      typeof window !== 'undefined' && !isCapacitor
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
