/** Browser cache for Rclone quota display only (GB free/total) — not account status. */
import type { RcloneAccount } from '@/features/admin/services/rcloneService';

const CACHE_KEY = 'dct_rclone_quota_v2';
const CACHE_MS = 5 * 60 * 1000;

type QuotaSnapshot = {
  storage_total_gb: number | null;
  storage_used_gb: number | null;
  storage_free_gb: number | null;
  quota_checked_at: string | null;
};

type Entry = {
  quotas: Record<string, QuotaSnapshot>;
  cachedAt: number;
};

function readEntry(): Entry | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY) ?? localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry;
    if (Date.now() - entry.cachedAt > CACHE_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

/** Cached quota numbers for instant display (optional). */
export function readCachedQuotas(): Record<string, QuotaSnapshot> | null {
  return readEntry()?.quotas ?? null;
}

export function writeQuotaCache(accounts: RcloneAccount[]) {
  const quotas: Record<string, QuotaSnapshot> = {};
  for (const acc of accounts) {
    if (
      acc.storage_free_gb != null ||
      acc.storage_total_gb != null ||
      acc.storage_used_gb != null
    ) {
      quotas[acc.id] = {
        storage_total_gb: acc.storage_total_gb,
        storage_used_gb: acc.storage_used_gb,
        storage_free_gb: acc.storage_free_gb,
        quota_checked_at: acc.quota_checked_at,
      };
    }
  }
  if (!Object.keys(quotas).length) return;
  const entry: Entry = { quotas, cachedAt: Date.now() };
  const json = JSON.stringify(entry);
  try {
    sessionStorage.setItem(CACHE_KEY, json);
    localStorage.setItem(CACHE_KEY, json);
  } catch {
    /* ignore */
  }
}

/** Merge cached GB display into fresh DB account rows (status fields stay from API). */
export function mergeQuotaIntoAccounts(accounts: RcloneAccount[]): RcloneAccount[] {
  const cached = readCachedQuotas();
  if (!cached) return accounts;
  return accounts.map((acc) => {
    const q = cached[acc.id];
    if (!q) return acc;
    return {
      ...acc,
      storage_total_gb: q.storage_total_gb ?? acc.storage_total_gb,
      storage_used_gb: q.storage_used_gb ?? acc.storage_used_gb,
      storage_free_gb: q.storage_free_gb ?? acc.storage_free_gb,
      quota_checked_at: q.quota_checked_at ?? acc.quota_checked_at,
    };
  });
}

export function clearQuotaCache() {
  sessionStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_KEY);
  sessionStorage.removeItem('dct_rclone_accounts_v1');
  localStorage.removeItem('dct_rclone_accounts_v1');
  try {
    localStorage.removeItem('dct_drive_status_v1');
  } catch {
    /* ignore */
  }
}

/** @deprecated use clearQuotaCache */
export const clearRcloneAccountsCache = clearQuotaCache;
