import { offlineCacheKey } from '@/shared/lib/offlineCache';
import { fetchWithOfflineCache, peekOfflineCache } from '@/shared/lib/offlineFetch';
import { apiClient } from './apiClient';
import { Course } from '@/shared/types/types';

function coursesCacheKey(batchId: string, section?: string) {
  return offlineCacheKey('courses', { batchId, section });
}

export const courseService = {
  peekCached(batchId: string, section?: string) {
    return peekOfflineCache<Course[]>(coursesCacheKey(batchId, section));
  },

  async fetchCourses(batchId: string, section?: string): Promise<Course[]> {
    const cacheKey = coursesCacheKey(batchId, section);
    const data = await fetchWithOfflineCache<Course[]>({
      cacheKey,
      fetcher: async () => {
        let endpoint = `/courses?batch_id=${batchId}`;
        if (section) endpoint += `&section=${section}`;
        const result = await apiClient.get<Course[]>(endpoint);
        if (result.error) throw new Error(result.error);
        return result.data ?? [];
      },
    });
    return data ?? [];
  },

  async getCoursesByBatch(batchId: string): Promise<Course[]> {
    return this.fetchCourses(batchId);
  },
};
