import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  Cloud,
  CloudOff,
  ContentCopy,
  DeleteOutlined,
  OpenInNew,
  Refresh,
  Link as LinkIcon,
  CheckCircle,
  ErrorOutlined,
  HourglassEmpty,
  Storage,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { adminCardSx, pageHeaderSx, pageTitleSx } from '@/shared/theme/adminStyles';
import { rcloneService, RcloneAccount } from '@/features/admin/services/rcloneService';
import {
  clearRcloneAccountsCache,
  readRcloneAccountsCache,
  writeRcloneAccountsCache,
} from '@/shared/lib/rcloneQuotaCache';

function statusChip(status: string, hasRefresh: boolean) {
  if (status === 'connected' && hasRefresh) {
    return <Chip size="small" color="success" icon={<CheckCircle />} label="Active" />;
  }
  if (status === 'expired') {
    return <Chip size="small" color="error" icon={<ErrorOutlined />} label="Re-setup" />;
  }
  if (status === 'pending') {
    return <Chip size="small" color="warning" icon={<HourglassEmpty />} label="Pending" />;
  }
  return <Chip size="small" color="default" label={status} />;
}

function formatGb(gb: number | null | undefined) {
  if (gb == null) return '—';
  return `${gb.toFixed(2)} GB`;
}

const RcloneManagement: React.FC = () => {
  const [accounts, setAccounts] = useState<RcloneAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('http://localhost');
  const [label, setLabel] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [redirectPaste, setRedirectPaste] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [reauthId, setReauthId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async (refresh = false, force = false) => {
    setRefreshing(true);
    setError(null);
    try {
      if (!refresh && !force) {
        const cached = readRcloneAccountsCache();
        if (cached?.length) {
          setAccounts(cached);
          return;
        }
      }
      const data = await rcloneService.listAccounts(refresh, force);
      setAccounts(data);
      if (data.length) {
        writeRcloneAccountsCache(data);
      } else {
        clearRcloneAccountsCache();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAuthorize = async (reauthAccountId?: string) => {
    setError(null);
    setSuccess(null);
    setSetupLoading(true);
    try {
      let start;
      if (reauthAccountId) {
        setReauthId(reauthAccountId);
        start = await rcloneService.reauthUrl(reauthAccountId);
      } else {
        if (!clientId.trim() || !clientSecret.trim()) {
          setError('Client ID and Client Secret are required.');
          setSetupLoading(false);
          return;
        }
        start = await rcloneService.startAuth({
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
          redirect_uri: redirectUri.trim() || 'http://localhost',
          label: label.trim() || undefined,
        });
      }
      setPendingAccountId(start.account_id);
      setAuthUrl(start.authorization_url);
      window.open(start.authorization_url, '_blank', 'noopener,noreferrer');
      setAddOpen(true);
      setSuccess('Google opened in a new tab. After allowing access, paste the full localhost URL below.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Authorization failed');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSetup = async () => {
    const accountId = pendingAccountId || reauthId;
    if (!accountId || !redirectPaste.trim()) {
      setError('Paste the full redirect URL from your browser.');
      return;
    }
    setSetupLoading(true);
    setError(null);
    try {
      const acc = await rcloneService.completeAuth(accountId, redirectPaste.trim());
      setSuccess(`Connected: ${acc.authorized_email || acc.label || 'Drive account'}`);
      setRedirectPaste('');
      setPendingAccountId(null);
      setReauthId(null);
      setAuthUrl(null);
      setClientId('');
      setClientSecret('');
      setLabel('');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Setup failed');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleRefreshOne = async (id: string) => {
    try {
      await rcloneService.refreshAccount(id);
      await load(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Refresh failed');
    }
  };

  const handleToggleActive = async (acc: RcloneAccount) => {
    try {
      await rcloneService.setActive(acc.id, !acc.is_active);
      await load(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this Google Drive account from the database?')) return;
    try {
      await rcloneService.deleteAccount(id);
      clearRcloneAccountsCache();
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setSuccess('Account removed.');
      await load(true, true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const storagePercent = (acc: RcloneAccount) => {
    if (acc.storage_total_gb == null || acc.storage_total_gb <= 0) return 0;
    return Math.min(100, ((acc.storage_used_gb ?? 0) / acc.storage_total_gb) * 100);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 960,
        mx: 'auto',
        px: { xs: 0.5, sm: 1 },
      }}
    >
      <Box
        sx={{
          ...pageHeaderSx,
          mb: 2,
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Box sx={{ minWidth: 0, width: '100%' }}>
          <Typography variant="h6" sx={pageTitleSx}>
            Rclone · Google Drive
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {accounts.length} account{accounts.length === 1 ? '' : 's'} · tokens stored as JSON in DB
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={16} /> : <Refresh />}
            onClick={() => load(true)}
            disabled={refreshing}
            fullWidth={false}
            sx={{ flex: { xs: 1, sm: 'none' } }}
          >
            Refresh all
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddOpen((v) => !v)}
            sx={{ flex: { xs: 1, sm: 'none' } }}
          >
            Add account
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Account list */}
      {accounts.length === 0 ? (
        <Card elevation={0} sx={{ ...adminCardSx, mb: 2, textAlign: 'center', py: 6 }}>
          <CloudOff sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary" fontWeight={600}>
            No Google Drive accounts yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Tap Add account to connect your first Drive
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2} sx={{ mb: 2, justifyContent: 'center' }}>
          {accounts.map((acc) => (
            <Grid size={{ xs: 12, md: 6 }} key={acc.id} sx={{ maxWidth: 520 }}>
              <Card
                elevation={0}
                sx={{
                  ...adminCardSx,
                  height: '100%',
                  opacity: acc.is_active ? 1 : 0.72,
                  borderColor: acc.token_status === 'expired' ? 'error.light' : undefined,
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={700} noWrap>
                        {acc.label || acc.authorized_email || 'Google Drive'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {acc.authorized_email || acc.client_id}
                      </Typography>
                    </Box>
                    {statusChip(acc.token_status, acc.has_refresh_token)}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Storage fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight={600}>
                      {formatGb(acc.storage_free_gb)} free
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      / {formatGb(acc.storage_total_gb)} total
                    </Typography>
                  </Box>

                  {acc.storage_total_gb != null && acc.storage_total_gb > 0 && (
                    <LinearProgress
                      variant="determinate"
                      value={storagePercent(acc)}
                      sx={{ height: 8, borderRadius: 4, mb: 1.5 }}
                    />
                  )}

                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                    Used {formatGb(acc.storage_used_gb)}
                    {acc.has_refresh_token ? ' · Refresh token OK' : ' · No refresh token'}
                    {acc.quota_checked_at &&
                      ` · Checked ${new Date(acc.quota_checked_at).toLocaleString()}`}
                  </Typography>

                  {acc.last_error && (
                    <Alert severity="warning" sx={{ mb: 1.5, py: 0 }}>
                      <Typography variant="caption">{acc.last_error}</Typography>
                    </Alert>
                  )}

                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 1,
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Switch
                        size="small"
                        checked={acc.is_active}
                        onChange={() => handleToggleActive(acc)}
                        disabled={acc.token_status !== 'connected'}
                      />
                      <Typography variant="caption">Active</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Refresh quota & token">
                        <IconButton size="small" onClick={() => handleRefreshOne(acc.id)}>
                          <Refresh fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {acc.token_status === 'expired' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          onClick={() => {
                            setRedirectPaste('');
                            handleAuthorize(acc.id);
                          }}
                        >
                          Re-setup
                        </Button>
                      )}
                      <IconButton size="small" color="error" onClick={() => handleDelete(acc.id)}>
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add / setup panel */}
      <Collapse in={addOpen}>
        <Card elevation={0} sx={adminCardSx}>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Cloud color="primary" />
              <Typography sx={{ fontWeight: 700 }}>
                {reauthId ? 'Re-authorize account' : 'Add Google Drive account'}
              </Typography>
            </Box>

            {!reauthId && (
              <>
                <TextField
                  label="Label (optional)"
                  size="small"
                  fullWidth
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Backup Drive 1"
                />
                <TextField
                  label="Client ID"
                  size="small"
                  fullWidth
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                />
                <TextField
                  label="Client Secret"
                  size="small"
                  fullWidth
                  type={showSecret ? 'text' : 'password'}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowSecret((v) => !v)} edge="end">
                            {showSecret ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  label="Redirect URI"
                  size="small"
                  fullWidth
                  value={redirectUri}
                  onChange={(e) => setRedirectUri(e.target.value)}
                  helperText="Desktop app — use http://localhost in Google Console"
                />
              </>
            )}

            <Button
              variant="contained"
              size="large"
              startIcon={setupLoading ? <CircularProgress size={20} color="inherit" /> : <OpenInNew />}
              onClick={() => handleAuthorize(reauthId || undefined)}
              disabled={setupLoading || (!reauthId && (!clientId.trim() || !clientSecret.trim()))}
              fullWidth
            >
              Authorize with Google
            </Button>

            {authUrl && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  size="small"
                  startIcon={<ContentCopy />}
                  onClick={() => {
                    navigator.clipboard.writeText(authUrl);
                    setSuccess('Link copied.');
                  }}
                >
                  Copy auth link
                </Button>
                <Button
                  size="small"
                  component="a"
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<LinkIcon />}
                >
                  Open again
                </Button>
              </Box>
            )}

            <Divider />

            <Typography variant="body2" color="text.secondary">
              After Google redirects to localhost, copy the <strong>entire URL</strong> from the address bar
              and paste below, then click Setup.
            </Typography>

            <TextField
              label="Paste redirect URL"
              fullWidth
              multiline
              minRows={3}
              value={redirectPaste}
              onChange={(e) => setRedirectPaste(e.target.value)}
              placeholder="http://localhost/?code=4/0A...&scope=..."
              size="small"
            />

            <Button
              variant="contained"
              color="secondary"
              size="large"
              fullWidth
              disabled={!pendingAccountId && !reauthId ? true : setupLoading || !redirectPaste.trim()}
              onClick={handleSetup}
              startIcon={setupLoading ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
            >
              Setup · save to database
            </Button>
          </CardContent>
        </Card>
      </Collapse>
    </Box>
  );
};

export default RcloneManagement;
