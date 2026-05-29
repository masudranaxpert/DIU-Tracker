import { apiClient } from './apiClient';
import { Notice } from '@/shared/types/types';

export const noticeService = {
  async fetchNotices(
    batchId: string,
    section?: string,
    subSection?: string
  ): Promise<Notice[]> {
    try {
      let endpoint = `/notices?batch_id=${batchId}`;
      if (section) endpoint += `&section=${section}`;
      if (subSection) endpoint += `&sub_section=${subSection}`;
      
      const result = await apiClient.get<Notice[]>(endpoint);
      return result.data || [];
    } catch (e) {
      console.error('Error fetching notices:', e);
      return [];
    }
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
  }
};