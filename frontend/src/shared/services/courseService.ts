import { apiClient } from './apiClient';
import { Course } from '@/shared/types/types';

export const courseService = {
  async fetchCourses(batchId: string, section?: string): Promise<Course[]> {
    try {
      let endpoint = `/courses?batch_id=${batchId}`;
      if (section) endpoint += `&section=${section}`;
      
      const result = await apiClient.get<Course[]>(endpoint);
      return result.data || [];
    } catch (e) {
      console.error('Error fetching courses:', e);
      return [];
    }
  },

  async getCoursesByBatch(batchId: string): Promise<Course[]> {
    return this.fetchCourses(batchId);
  }
};