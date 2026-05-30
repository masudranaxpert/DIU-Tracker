import { offlineCacheKey } from '@/shared/lib/offlineCache';
import { fetchWithOfflineCache, peekOfflineCache } from '@/shared/lib/offlineFetch';
import { apiClient } from './apiClient';
import { Notice } from '@/shared/types/types';

function noticesCacheKey(batchId: string, section?: string, subSection?: string) {
  return offlineCacheKey('notices', { batchId, section, subSection });
}

export const noticeService = {
  peekCached(batchId: string, section?: string, subSection?: string) {
    return peekOfflineCache<Notice[]>(noticesCacheKey(batchId, section, subSection));
  },

  async fetchNotices(
    batchId: string,
    section?: string,
    subSection?: string,
  ): Promise<Notice[]> {
    const cacheKey = noticesCacheKey(batchId, section, subSection);
    const data = await fetchWithOfflineCache<Notice[]>({
      cacheKey,
      fetcher: async () => {
        let endpoint = `/notices?batch_id=${batchId}`;
        if (section) endpoint += `&section=${section}`;
        if (subSection) endpoint += `&sub_section=${subSection}`;
        const result = await apiClient.get<Notice[]>(endpoint);
        if (result.error) throw new Error(result.error);
        return result.data ?? [];
      },
    });
    return data ?? [];
  },

  async addNotice(notice: Partial<Notice>): Promise<Notice | null> {
    const result = await apiClient.post<Notice>('/notices', notice);
    return result.data;
  },

  async updateNotice(id: string, updates: Partial<Notice>): Promise<boolean> {
    const result = await apiClient.put(`/notices/${id}`, updates);
    return !result.error;
  },

  async deleteNotice(id: string): Promise<boolean> {
    const result = await apiClient.delete(`/notices/${id}`);
    return !result.error;
  },
};
