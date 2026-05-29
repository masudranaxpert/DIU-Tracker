// API Client for FastAPI backend with FastAPI Users auth
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

type AuthMode = 'user' | 'admin';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('auth_token') || null;
  }

  getAdminToken(): string | null {
    return localStorage.getItem('admin_token');
  }

  setAdminToken(token: string | null) {
    if (token) {
      localStorage.setItem('admin_token', token);
    } else {
      localStorage.removeItem('admin_token');
    }
  }

  private resolveToken(authMode: AuthMode): string | null {
    return authMode === 'admin' ? this.getAdminToken() : this.getToken();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    authMode: AuthMode = 'user'
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint}`;
    const token = this.resolveToken(authMode);

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    const isForm = options.body instanceof URLSearchParams;
    if (!isForm && !(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      let data: any = null;
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        const detail = data?.detail;
        const errorMsg = typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
            : 'Request failed';
        return { data: null, error: errorMsg };
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message || 'Network error' };
    }
  }

  // FastAPI Users: POST /auth/jwt/login
  async login(email: string, password: string): Promise<ApiResponse<{ access_token: string; token_type: string }>> {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const result = await this.request<{ access_token: string; token_type: string }>(
      '/auth/jwt/login',
      { method: 'POST', body: formData },
      'user'
    );

    if (result.data?.access_token) {
      this.setToken(result.data.access_token);
    }
    return result;
  }

  // FastAPI Users: POST /auth/register
  async register(body: {
    email: string;
    password: string;
    full_name?: string;
    student_id?: string;
    batch_id?: string;
    section?: string;
    sub_section?: string;
    is_cr?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // FastAPI Users: GET /users/me
  async getCurrentUser(): Promise<ApiResponse<any>> {
    if (!this.getToken()) {
      return { data: null, error: 'Not authenticated' };
    }
    return this.request('/users/me');
  }

  // FastAPI Users: PATCH /users/me
  async patchCurrentUser(body: any): Promise<ApiResponse<any>> {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async uploadAvatar(file: File): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ url: string }>('/upload/avatar', {
      method: 'POST',
      body: formData,
    });
  }

  // FastAPI Users: POST /auth/forgot-password
  async forgotPassword(email: string): Promise<ApiResponse<any>> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // FastAPI Users: POST /auth/request-verify-token
  async requestVerifyToken(): Promise<ApiResponse<any>> {
    return this.request('/auth/request-verify-token', { method: 'POST', body: JSON.stringify({}) });
  }

  // FastAPI Users: POST /auth/verify
  async verifyEmail(token: string): Promise<ApiResponse<any>> {
    return this.request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // Public auth config: GET /auth/jwt/config
  async getAuthConfig(): Promise<ApiResponse<{ email_verification_enabled: boolean }>> {
    return this.request('/auth/jwt/config', { method: 'GET' });
  }

  // Resend verification email: POST /auth/jwt/resend-verify
  async resendVerify(email: string): Promise<ApiResponse<any>> {
    return this.request('/auth/jwt/resend-verify', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // FastAPI Users: POST /auth/reset-password
  async resetPasswordWithToken(token: string, password: string): Promise<ApiResponse<any>> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async logout() {
    this.setToken(null);
    await this.request('/auth/jwt/logout', { method: 'POST' });
  }

  logoutAdmin() {
    this.setAdminToken(null);
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint);
  }

  async getOne<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request(endpoint);
  }

  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  async patch<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  }

  async delete(endpoint: string): Promise<ApiResponse<null>> {
    return this.request(endpoint, { method: 'DELETE' });
  }

  async adminGet<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {}, 'admin');
  }

  async adminPost<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }, 'admin');
  }

  async adminPut<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }, 'admin');
  }

  async adminDelete(endpoint: string): Promise<ApiResponse<null>> {
    return this.request(endpoint, { method: 'DELETE' }, 'admin');
  }

  async adminUploadTeacherPhoto(teacherId: string, file: File): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('teacher_id', teacherId);
    return this.request<{ url: string }>('/upload/teacher', { method: 'POST', body: formData }, 'admin');
  }
}

export const apiClient = new ApiClient();

export function clearAuth() {
  apiClient.setToken(null);
  localStorage.removeItem('user_profile');
}

export function clearAdminAuth() {
  apiClient.logoutAdmin();
  localStorage.removeItem('admin_user');
}
