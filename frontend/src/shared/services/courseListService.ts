import { apiClient } from './apiClient';
import { CourseListItem } from '@/shared/types/types';

export const courseListService = {
  async fetchCatalog(q?: string): Promise<CourseListItem[]> {
    const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    const result = await apiClient.get<CourseListItem[]>(`/course-list${qs}`);
    return result.data || [];
  },
};
