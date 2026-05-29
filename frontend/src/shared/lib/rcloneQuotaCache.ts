/** 5-minute browser cache for admin Rclone account list (quota display). */
import type { RcloneAccount } from '@/features/admin/services/rcloneService';

const CACHE_KEY = 'dct_rclone_accounts_v1';
const CACHE_MS = 5 * 60 * 1000;

type Entry = { items: RcloneAccount[]; cachedAt: number };

export function readRcloneAccountsCache(): RcloneAccount[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY) ?? localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry;
    if (Date.now() - entry.cachedAt > CACHE_MS) return null;
    if (!entry.items?.length) return null;
    return entry.items;
  } catch {
    return null;
  }
}

export function writeRcloneAccountsCache(items: RcloneAccount[]) {
  if (!items.length) return;
  const entry: Entry = { items, cachedAt: Date.now() };
  const json = JSON.stringify(entry);
  try {
    sessionStorage.setItem(CACHE_KEY, json);
    localStorage.setItem(CACHE_KEY, json);
  } catch {
    /* ignore */
  }
}

export function clearRcloneAccountsCache() {
  sessionStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_KEY);
}
