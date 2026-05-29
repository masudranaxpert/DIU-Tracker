import { apiClient } from './apiClient';
import { AcademicRecord } from '@/shared/types/types';

export const recordService = {
  async fetchRecords(
    batchId: string,
    section: string,
    subSection?: string
  ): Promise<AcademicRecord[]> {
    try {
      let endpoint = `/records?batch_id=${batchId}&section=${section}`;
      if (subSection) endpoint += `&sub_section=${subSection}`;
      
      const result = await apiClient.get<AcademicRecord[]>(endpoint);
      return result.data || [];
    } catch (e) {
      console.error('Error fetching records:', e);
      return [];
    }
  },

  async incrementRecordViews(recordId: string): Promise<void> {
    try {
      await apiClient.post(`/records/${recordId}/views/increment`, {});
    } catch (e) {
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
  }
};