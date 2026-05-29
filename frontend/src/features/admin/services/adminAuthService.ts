// Admin authentication service - separate from CR/student auth
import { apiClient, clearAdminAuth } from '@/shared/services/apiClient';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
}

const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_USER_KEY = 'admin_user';

export const adminAuthService = {
  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.adminPost<{ token: string; admin: AdminUser }>('/auth/admin/login', {
        email,
        password,
      });

      if (response.data?.token) {
        apiClient.setAdminToken(response.data.token);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(response.data.admin));
        return { success: true };
      }

      return { success: false, error: response.error || 'Invalid response' };
    } catch (error: any) {
      console.error('Admin login error:', error);
      return { success: false, error: error.detail || 'Login failed' };
    }
  },

  async logout(): Promise<void> {
    clearAdminAuth();
  },

  async getAdmin(): Promise<AdminUser | null> {
    if (!apiClient.getAdminToken()) return null;
    const response = await apiClient.adminGet<AdminUser>('/auth/admin/me');
    return response.data;
  },

  getToken(): string | null {
    return apiClient.getAdminToken();
  },

  getCachedAdmin(): AdminUser | null {
    try {
      const raw = localStorage.getItem(ADMIN_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!apiClient.getAdminToken();
  },
};
