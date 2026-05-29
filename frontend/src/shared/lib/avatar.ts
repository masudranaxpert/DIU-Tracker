export function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Single muted accent for all avatars (minimal, low-color UI).
export const avatarClass =
  'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300';
