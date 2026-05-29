import { apiClient } from './apiClient';
import { Feedback } from '@/shared/types/types';

export const feedbackService = {
  async submitFeedback(feedback: Partial<Feedback>): Promise<{ ok: boolean; error?: string }> {
    const result = await apiClient.post<Feedback>('/feedbacks', feedback);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true };
  },
};