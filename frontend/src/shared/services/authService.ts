import { apiClient } from './apiClient';
import { UserProfile } from '@/shared/types/types';

let currentUser: UserProfile | null = null;

function mapUser(data: any): UserProfile {
  return {
    id: String(data.id),
    email: data.email,
    full_name: data.full_name || '',
    is_cr: data.is_cr ?? false,
    is_active: data.is_active ?? true,
    is_verified: data.is_verified ?? false,
    batch_id: data.batch_id || '',
    student_id: data.student_id || undefined,
    section: (data.section || 'A') as UserProfile['section'],
    sub_section: data.sub_section,
    avatar_url: data.avatar_url,
    facebook_url: data.facebook_url,
    whatsapp_number: data.whatsapp_number,
    telegram_username: data.telegram_username,
    telegram_chat_id: data.telegram_chat_id,
  };
}

export const authService = {
  async login(email: string, password: string): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    const result = await apiClient.login(email, password);
    if (result.error || !result.data) {
      return { success: false, error: result.error || 'Login failed' };
    }

    const userResult = await apiClient.getCurrentUser();
    if (userResult.data) {
      currentUser = mapUser(userResult.data);
      localStorage.setItem('user_profile', JSON.stringify(currentUser));
    }

    return { success: true, user: currentUser || undefined };
  },

  async register(data: {
    email: string;
    password: string;
    fullName: string;
    student_id: string;
    batch_id?: string;
    section?: string;
    sub_section?: string;
    is_cr?: boolean;
  }): Promise<{ success: boolean; error?: string; updated?: boolean }> {
    const result = await apiClient.register({
      email: data.email,
      password: data.password,
      full_name: data.fullName,
      student_id: data.student_id.trim().toUpperCase(),
      batch_id: data.batch_id,
      section: data.section,
      sub_section: data.sub_section,
      is_cr: data.is_cr ?? false,
    });

    if (result.error) {
      const lower = result.error.toLowerCase();
      if (lower.includes('already exists') || lower.includes('register_user_already_exists')) {
        return {
          success: false,
          error:
            'This Student ID or email is already active. Contact admin if you need changes.',
        };
      }
      return { success: false, error: result.error };
    }
    return { success: true };
  },

  async getProfile(forceRefresh = false): Promise<UserProfile | null> {
    if (!apiClient.getToken()) return null;

    if (!forceRefresh) {
      const cached = localStorage.getItem('user_profile');
      if (cached) {
        try {
          return JSON.parse(cached) as UserProfile;
        } catch { /* ignore */ }
      }
    }

    const result = await apiClient.getCurrentUser();
    if (result.data) {
      currentUser = mapUser(result.data);
      localStorage.setItem('user_profile', JSON.stringify(currentUser));
      return currentUser;
    }
    return null;
  },

  async getProfileById(userId: string): Promise<UserProfile | null> {
    const result = await apiClient.getOne<any>(`/users/${userId}`);
    return result.data ? mapUser(result.data) : null;
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const result = await apiClient.patchCurrentUser(updates);
    if (result.data) {
      currentUser = mapUser(result.data);
      localStorage.setItem('user_profile', JSON.stringify(currentUser));
      return currentUser;
    }
    return null;
  },

  async signOut(): Promise<void> {
    await apiClient.logout();
    currentUser = null;
    localStorage.removeItem('user_profile');
    localStorage.removeItem('auth_token');
  },

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    const result = await apiClient.forgotPassword(email);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true };
  },

  async requestVerifyEmail(): Promise<{ success: boolean; error?: string }> {
    const result = await apiClient.requestVerifyToken();
    return result.error ? { success: false, error: result.error } : { success: true };
  },

  async isEmailVerificationEnabled(): Promise<boolean> {
    const result = await apiClient.getAuthConfig();
    return result.data?.email_verification_enabled ?? false;
  },

  async resendVerifyEmail(email: string): Promise<{ success: boolean; error?: string }> {
    const result = await apiClient.resendVerify(email);
    return result.error ? { success: false, error: result.error } : { success: true };
  },

  async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    const result = await apiClient.verifyEmail(token);
    return result.error ? { success: false, error: result.error } : { success: true };
  },

  async resetPasswordWithToken(token: string, password: string): Promise<{ success: boolean; error?: string }> {
    const result = await apiClient.resetPasswordWithToken(token, password);
    return result.error ? { success: false, error: result.error } : { success: true };
  },

  getCurrentUser(): UserProfile | null {
    if (currentUser) return currentUser;
    const stored = localStorage.getItem('user_profile');
    if (stored) {
      try {
        currentUser = JSON.parse(stored);
        return currentUser;
      } catch { /* ignore */ }
    }
    return null;
  },

  isAuthenticated(): boolean {
    return !!apiClient.getToken();
  },
};
