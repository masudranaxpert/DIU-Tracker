import { apiClient } from '@/shared/services/apiClient';
import type { AcademicCalendarData } from '@/shared/lib/academicCalendarUtils';

const CACHE_KEY = 'diu_tracker_academic_calendar_v2';

export const academicCalendarService = {
  async fetch(): Promise<AcademicCalendarData | null> {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as AcademicCalendarData;
          if (parsed?.display_markdown) return parsed;
        } catch {
          /* ignore */
        }
      }
      const result = await apiClient.get<AcademicCalendarData>('/academic-calendar');
      if (result.data) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(result.data));
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  async save(payload: { title?: string; markdown: string }): Promise<AcademicCalendarData | null> {
    const result = await apiClient.adminPut<AcademicCalendarData>('/admin/portal/academic-calendar', payload);
    if (result.data) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result.data));
      return result.data;
    }
    throw new Error(result.error || 'Failed to save academic calendar');
  },

  async updateSettings(payload: { show_on_calendar_view: boolean }): Promise<AcademicCalendarData | null> {
    const result = await apiClient.adminPut<AcademicCalendarData>('/admin/portal/academic-calendar', payload);
    if (result.data) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result.data));
      return result.data;
    }
    throw new Error(result.error || 'Failed to update calendar settings');
  },

  clearCache() {
    localStorage.removeItem(CACHE_KEY);
  },
};
