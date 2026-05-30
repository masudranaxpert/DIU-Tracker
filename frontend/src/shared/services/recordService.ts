import { offlineCacheKey } from '@/shared/lib/offlineCache';
import { fetchWithOfflineCache, peekOfflineCache } from '@/shared/lib/offlineFetch';
import { apiClient } from './apiClient';
import { AcademicRecord } from '@/shared/types/types';

function recordsCacheKey(batchId: string, section: string, subSection?: string) {
  return offlineCacheKey('records', { batchId, section, subSection });
}

export const recordService = {
  peekCached(batchId: string, section: string, subSection?: string) {
    return peekOfflineCache<AcademicRecord[]>(recordsCacheKey(batchId, section, subSection));
  },

  async fetchRecords(
    batchId: string,
    section: string,
    subSection?: string,
  ): Promise<AcademicRecord[]> {
    const cacheKey = recordsCacheKey(batchId, section, subSection);
    const data = await fetchWithOfflineCache<AcademicRecord[]>({
      cacheKey,
      fetcher: async () => {
        let endpoint = `/records?batch_id=${batchId}&section=${section}`;
        if (subSection) endpoint += `&sub_section=${subSection}`;
        const result = await apiClient.get<AcademicRecord[]>(endpoint);
        if (result.error) throw new Error(result.error);
        return result.data ?? [];
      },
    });
    return data ?? [];
  },

  async incrementRecordViews(recordId: string): Promise<void> {
    try {
      await apiClient.post(`/records/${recordId}/views/increment`, {});
    } catch {
      // Silently fail for view tracking
    }
  },

  async addRecord(record: Partial<AcademicRecord>): Promise<AcademicRecord | null> {
    const result = await apiClient.post<AcademicRecord>('/records', record);
    return result.data;
  },

  async updateRecord(id: string, updates: Partial<AcademicRecord>): Promise<boolean> {
    const result = await apiClient.put(`/records/${id}`, updates);
    return !result.error;
  },

  async deleteRecord(id: string): Promise<boolean> {
    const result = await apiClient.delete(`/records/${id}`);
    return !result.error;
  },

  async addAttachment(attachment: {
    record_id: string;
    name: string;
    type: string;
    url: string;
    public_id?: string | null;
    telegram_message_id?: number | null;
    telegram_chat_id?: string | null;
  }): Promise<any> {
    const { record_id, ...body } = attachment;
    const result = await apiClient.post(`/records/${record_id}/attachments`, body);
    return result.data;
  },

  async deleteAttachment(id: string): Promise<boolean> {
    const result = await apiClient.delete(`/attachments/${id}`);
    if (result.error) {
      throw new Error(result.error);
    }
    return true;
  },
};
