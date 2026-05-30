import { offlineCache, offlineCacheKey } from '@/shared/lib/offlineCache';

/** Remove cached academic data for a section (on student logout). */
export async function clearSectionOfflineData(
  batchId: string,
  section: string,
  subSection?: string,
): Promise<void> {
  const keys = [
    offlineCacheKey('records', { batchId, section, subSection }),
    offlineCacheKey('notices', { batchId, section, subSection }),
    offlineCacheKey('deadlines', { batchId, section, subSection }),
    offlineCacheKey('courses', { batchId, section }),
  ];
  await Promise.all(keys.map((key) => offlineCache.remove(key)));
}
