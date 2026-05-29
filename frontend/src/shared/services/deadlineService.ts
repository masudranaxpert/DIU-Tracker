import { apiClient } from './apiClient';
import { Deadline } from '@/shared/types/types';

export const deadlineService = {
  async fetchDeadlines(
    batchId: string,
    section?: string,
    subSection?: string
  ): Promise<Deadline[]> {
    try {
      let endpoint = `/deadlines?batch_id=${batchId}`;
      if (section) endpoint += `&section=${section}`;
      if (subSection) endpoint += `&sub_section=${subSection}`;
      
      const result = await apiClient.get<Deadline[]>(endpoint);
      return result.data || [];
    } catch (e) {
      console.error('Error fetching deadlines:', e);
      return [];
    }
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
  }
};