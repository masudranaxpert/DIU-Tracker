import { offlineCache } from '@/shared/lib/offlineCache';
import { isNetworkAvailable } from '@/shared/lib/networkStatus';

export async function fetchWithOfflineCache<T>(options: {
  cacheKey: string;
  fetcher: () => Promise<T | null | undefined>;
  isValid?: (data: T) => boolean;
}): Promise<T | null> {
  const { cacheKey, fetcher, isValid } = options;
  const cached = await offlineCache.get<T>(cacheKey);
  const validCached = cached != null && (isValid ? isValid(cached) : true);

  const online = await isNetworkAvailable();
  if (!online) {
    return validCached ? cached : null;
  }

  try {
    const fresh = await fetcher();
    if (fresh != null && (isValid ? isValid(fresh) : true)) {
      await offlineCache.set(cacheKey, fresh);
      return fresh;
    }
  } catch (err) {
    console.warn('Network fetch failed, using cache:', cacheKey, err);
  }

  return validCached ? cached : null;
}

export async function peekOfflineCache<T>(cacheKey: string): Promise<T | null> {
  return offlineCache.get<T>(cacheKey);
}
