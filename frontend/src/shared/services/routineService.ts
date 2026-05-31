import { apiClient } from './apiClient';
import { RoutineItem } from '@/shared/types/types';

export const routineService = {
  async fetchRoutine(batchId: string, section: string): Promise<RoutineItem[]> {
    try {
      const result = await apiClient.get<RoutineItem[]>(
        `/routines?batch_id=${encodeURIComponent(batchId)}&section=${encodeURIComponent(section)}`
      );
      return result.data || [];
    } catch (e) {
      console.error('Error fetching routine:', e);
      return [];
    }
  },

  async saveRoutine(
    batchId: string,
    section: string,
    classes: Omit<RoutineItem, 'id' | 'batch_id' | 'section' | 'created_at'>[]
  ): Promise<RoutineItem[]> {
    const result = await apiClient.post<RoutineItem[]>('/routines', {
      batch_id: batchId,
      section: section,
      classes: classes,
    });
    if (result.error) {
      throw new Error(result.error);
    }
    return result.data || [];
  },

  async deleteRoutine(batchId: string, section: string): Promise<boolean> {
    const result = await apiClient.delete(
      `/routines?batch_id=${encodeURIComponent(batchId)}&section=${encodeURIComponent(section)}`
    );
    return !result.error;
  },
};
