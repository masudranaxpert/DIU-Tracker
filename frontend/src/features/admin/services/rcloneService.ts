import { apiClient } from '@/shared/services/apiClient';

export interface RcloneAccount {
  id: string;
  label: string | null;
  client_id: string;
  redirect_uri: string;
  authorized_email: string | null;
  is_active: boolean;
  token_status: string;
  has_refresh_token: boolean;
  is_authorized: boolean;
  storage_total_gb: number | null;
  storage_used_gb: number | null;
  storage_free_gb: number | null;
  quota_checked_at: string | null;
  token_updated_at: string | null;
  created_at: string;
  last_error: string | null;
}

export interface RcloneAuthStart {
  account_id: string;
  authorization_url: string;
  redirect_uri: string;
  scope: string;
}

export const rcloneService = {
  async listAccounts(refresh = true, force = false): Promise<RcloneAccount[]> {
    const params = new URLSearchParams();
    if (refresh) params.set('refresh', 'true');
    if (force) params.set('force', 'true');
    const q = params.toString() ? `?${params}` : '';
    const res = await apiClient.adminGet<{ items: RcloneAccount[]; total: number }>(
      `/admin/portal/rclone/accounts${q}`
    );
    if (res.error) throw new Error(res.error);
    return res.data?.items ?? [];
  },

  async pruneDuplicates(): Promise<{ removed: number; remaining: number; items: RcloneAccount[] }> {
    const res = await apiClient.adminPost<{
      removed: number;
      remaining: number;
      items: RcloneAccount[];
    }>('/admin/portal/rclone/accounts/prune-duplicates', {});
    if (res.error || !res.data) throw new Error(res.error || 'Prune failed');
    return res.data;
  },

  async startAuth(payload: {
    client_id: string;
    client_secret: string;
    redirect_uri: string;
    label?: string;
  }): Promise<RcloneAuthStart> {
    const res = await apiClient.adminPost<RcloneAuthStart>(
      '/admin/portal/rclone/accounts/auth-url',
      payload
    );
    if (res.error || !res.data) throw new Error(res.error || 'Failed to start authorization');
    return res.data;
  },

  async reauthUrl(accountId: string): Promise<RcloneAuthStart> {
    const res = await apiClient.adminGet<RcloneAuthStart>(
      `/admin/portal/rclone/accounts/${accountId}/auth-url`
    );
    if (res.error || !res.data) throw new Error(res.error || 'Failed to get re-auth URL');
    return res.data;
  },

  async completeAuth(accountId: string, redirectUrl: string): Promise<RcloneAccount> {
    const res = await apiClient.adminPost<{ account: RcloneAccount }>(
      `/admin/portal/rclone/accounts/${accountId}/authorize`,
      { redirect_url: redirectUrl }
    );
    if (res.error || !res.data) throw new Error(res.error || 'Authorization failed');
    return res.data.account;
  },

  async refreshAccount(accountId: string): Promise<RcloneAccount> {
    const res = await apiClient.adminPost<RcloneAccount>(
      `/admin/portal/rclone/accounts/${accountId}/refresh`,
      {}
    );
    if (res.error || !res.data) throw new Error(res.error || 'Refresh failed');
    return res.data;
  },

  async setActive(accountId: string, is_active: boolean): Promise<RcloneAccount> {
    const res = await apiClient.adminPut<RcloneAccount>(
      `/admin/portal/rclone/accounts/${accountId}`,
      { is_active }
    );
    if (res.error || !res.data) throw new Error(res.error || 'Update failed');
    return res.data;
  },

  async deleteAccount(accountId: string): Promise<void> {
    const res = await apiClient.adminDelete(`/admin/portal/rclone/accounts/${accountId}`);
    if (res.error) throw new Error(res.error);
  },
};
