import { offlineCacheKey } from '@/shared/lib/offlineCache';
import { fetchWithOfflineCache, peekOfflineCache } from '@/shared/lib/offlineFetch';
import { apiClient } from './apiClient';
import { Deadline } from '@/shared/types/types';

function deadlinesCacheKey(batchId: string, section?: string, subSection?: string) {
  return offlineCacheKey('deadlines', { batchId, section, subSection });
}

export const deadlineService = {
  peekCached(batchId: string, section?: string, subSection?: string) {
    return peekOfflineCache<Deadline[]>(deadlinesCacheKey(batchId, section, subSection));
  },

  async fetchDeadlines(
    batchId: string,
    section?: string,
    subSection?: string,
  ): Promise<Deadline[]> {
    const cacheKey = deadlinesCacheKey(batchId, section, subSection);
    const data = await fetchWithOfflineCache<Deadline[]>({
      cacheKey,
      fetcher: async () => {
        let endpoint = `/deadlines?batch_id=${batchId}`;
        if (section) endpoint += `&section=${section}`;
        if (subSection) endpoint += `&sub_section=${subSection}`;
        const result = await apiClient.get<Deadline[]>(endpoint);
        if (result.error) throw new Error(result.error);
        return result.data ?? [];
      },
    });
    return data ?? [];
  },

  async addDeadline(deadline: Partial<Deadline>): Promise<Deadline | null> {
    const result = await apiClient.post<Deadline>('/deadlines', deadline);
    return result.data;
  },

  async updateDeadline(id: string, updates: Partial<Deadline>): Promise<boolean> {
    const result = await apiClient.put(`/deadlines/${id}`, updates);
    return !result.error;
  },

  async deleteDeadline(id: string): Promise<boolean> {
    const result = await apiClient.delete(`/deadlines/${id}`);
    return !result.error;
  },
};
