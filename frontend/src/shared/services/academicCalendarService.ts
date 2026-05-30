import { offlineCache, offlineCacheKey } from '@/shared/lib/offlineCache';
import { fetchWithOfflineCache } from '@/shared/lib/offlineFetch';
import { apiClient } from '@/shared/services/apiClient';
import type { AcademicCalendarData } from '@/shared/lib/academicCalendarUtils';

const CACHE_KEY = offlineCacheKey('academic_calendar');

export const academicCalendarService = {
  async peekCached(): Promise<AcademicCalendarData | null> {
    return offlineCache.get<AcademicCalendarData>(CACHE_KEY);
  },

  async fetch(): Promise<AcademicCalendarData | null> {
    return fetchWithOfflineCache<AcademicCalendarData>({
      cacheKey: CACHE_KEY,
      isValid: (data) => Boolean(data?.display_markdown),
      fetcher: async () => {
        const result = await apiClient.get<AcademicCalendarData>('/academic-calendar');
        if (result.error) throw new Error(result.error);
        return result.data;
      },
    });
  },

  async save(payload: { title?: string; markdown: string }): Promise<AcademicCalendarData | null> {
    const result = await apiClient.adminPut<AcademicCalendarData>('/admin/portal/academic-calendar', payload);
    if (result.data) {
      await offlineCache.set(CACHE_KEY, result.data);
      return result.data;
    }
    throw new Error(result.error || 'Failed to save academic calendar');
  },

  async updateSettings(payload: { show_on_calendar_view: boolean }): Promise<AcademicCalendarData | null> {
    const result = await apiClient.adminPut<AcademicCalendarData>('/admin/portal/academic-calendar', payload);
    if (result.data) {
      await offlineCache.set(CACHE_KEY, result.data);
      return result.data;
    }
    throw new Error(result.error || 'Failed to update calendar settings');
  },

  clearCache() {
    void offlineCache.remove(CACHE_KEY);
  },
};
