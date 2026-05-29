// Batches Management — pagination, purge data, purge + Google Drive
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Chip,
  LinearProgress,
  Alert,
  Stack,
} from '@mui/material';
import { Add, Delete, School, Storage, CloudOff } from '@mui/icons-material';
import { adminCardSx, pageHeaderSx, pageTitleSx } from '@/shared/theme/adminStyles';
import { useAdminResponsive } from '@/shared/hooks/useAdminResponsive';
import { usePagination } from '@/features/admin/hooks/usePagination';
import AdminPaginationBar from './AdminPaginationBar';
import {
  adminPortalService,
  BatchAdminRow,
  BatchPurgeJob,
} from '@/features/admin/services/adminPortalService';

interface BatchesManagementProps {
  onRefresh?: () => void;
}

const POLL_MS = 900;

const BatchesManagement: React.FC<BatchesManagementProps> = ({ onRefresh }) => {
  const { dialogFullScreen } = useAdminResponsive();
  const { page, limit, totalPages, total, applyMeta, goToPage } = usePagination(10);
  const [batches, setBatches] = useState<BatchAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [saving, setSaving] = useState(false);
  const [purgeJob, setPurgeJob] = useState<BatchPurgeJob | null>(null);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminPortalService.fetchBatches({ page, limit });
      setBatches(data.items);
      applyMeta({ total: data.total, total_pages: data.total_pages, page: data.page });
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
    setLoading(false);
  }, [page, limit, applyMeta]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollJob = useCallback(
    (jobId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const job = await adminPortalService.getBatchPurgeJob(jobId);
          setPurgeJob(job);
          if (job.status === 'completed' || job.status === 'failed') {
            stopPolling();
            await fetchBatches();
            onRefresh?.();
          }
        } catch {
          stopPolling();
        }
      }, POLL_MS);
    },
    [stopPolling, fetchBatches, onRefresh]
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  const progressPercent = purgeJob
    ? purgeJob.total > 0
      ? Math.min(100, Math.round((purgeJob.current / purgeJob.total) * 100))
      : purgeJob.status === 'completed'
        ? 100
        : 5
    : 0;

  const handleAddBatch = async () => {
    if (!newBatchName.trim()) return;
    setSaving(true);
    try {
      await adminPortalService.createBatch(newBatchName.trim());
      setAddDialogOpen(false);
      setNewBatchName('');
      await fetchBatches();
      onRefresh?.();
    } catch (err) {
      console.error('Error adding batch:', err);
      alert(err instanceof Error ? err.message : 'Could not create batch');
    }
    setSaving(false);
  };

  const handleDeleteBatch = async (id: string, name: string) => {
    if (
      !confirm(
        `Delete batch "${name}" and ALL related database rows? This cannot be undone. Use "Clear data" first if you only want to empty content.`
      )
    ) {
      return;
    }
    try {
      await adminPortalService.deleteBatch(id);
      await fetchBatches();
      onRefresh?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete batch');
    }
  };

  const startPurge = async (batch: BatchAdminRow, includeDrive: boolean) => {
    const label = includeDrive ? 'database + Google Drive' : 'database only';
    if (
      !confirm(
        `Clear ALL content for batch "${batch.name}" (${label})?\n\nRecords, deadlines, groups, notices, courses, students, and uploads will be removed.\nCR accounts will stay but go to PENDING (not deleted). The batch name will stay.`
      )
    ) {
      return;
    }
    try {
      const job = await adminPortalService.startBatchPurge(batch.id, includeDrive);
      setPurgeJob(job);
      setPurgeDialogOpen(true);
      pollJob(job.job_id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not start cleanup');
    }
  };

  const closePurgeDialog = () => {
    if (purgeJob?.status === 'running' || purgeJob?.status === 'queued') {
      if (!confirm('Cleanup is still running in the background. Close this window?')) return;
    }
    stopPolling();
    setPurgeDialogOpen(false);
    setPurgeJob(null);
  };

  const jobRunning = purgeJob?.status === 'running' || purgeJob?.status === 'queued';

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={pageHeaderSx}>
        <Typography variant="h6" sx={pageTitleSx}>
          Batches ({total})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setAddDialogOpen(true)}
          disabled={jobRunning}
          sx={{ width: { xs: '100%', sm: 'auto' }, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
        >
          Add Batch
        </Button>
      </Box>

      <Card elevation={0} sx={adminCardSx}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : batches.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <School sx={{ fontSize: { xs: 36, sm: 48 }, color: 'text.secondary', mb: 1 }} />
              <Typography color="text.secondary" variant="body2">
                No batches found
              </Typography>
            </Box>
          ) : (
            <>
              <List>
                {batches.map((batch, index) => (
                  <ListItem
                    key={batch.id}
                    sx={{
                      borderBottom: index < batches.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      py: 2,
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 1,
                        width: '100%',
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          bgcolor: 'rgba(16,185,129,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <School sx={{ color: '#10b981' }} />
                      </Box>
                      <ListItemText
                        primary={
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {batch.name}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            Created {new Date(batch.created_at).toLocaleDateString()} ·{' '}
                            {batch.stats.records} records · {batch.stats.deadlines} deadlines ·{' '}
                            {batch.stats.groups} groups · {batch.stats.attachments} files
                            {batch.stats.drive_attachments > 0
                              ? ` · ${batch.stats.drive_attachments} on Drive`
                              : ''}
                          </Typography>
                        }
                      />
                      <IconButton
                        onClick={() => handleDeleteBatch(batch.id, batch.name)}
                        disabled={jobRunning}
                        sx={{ color: '#ef4444', alignSelf: { xs: 'flex-end', sm: 'center' } }}
                        title="Delete batch row"
                      >
                        <Delete />
                      </IconButton>
                    </Box>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={`${batch.stats.courses} courses`} />
                      <Chip size="small" label={`${batch.stats.notices} notices`} />
                      <Chip size="small" label={`${batch.stats.students} students`} />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<Storage />}
                        disabled={jobRunning}
                        onClick={() => startPurge(batch, false)}
                        sx={{ textTransform: 'none' }}
                      >
                        Clear batch data
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        startIcon={<CloudOff />}
                        disabled={jobRunning}
                        onClick={() => startPurge(batch, true)}
                        sx={{ textTransform: 'none' }}
                      >
                        Clear data + Google Drive
                      </Button>
                    </Stack>
                  </ListItem>
                ))}
              </List>
              <AdminPaginationBar
                page={page}
                totalPages={totalPages}
                total={total}
                rangeStart={total === 0 ? 0 : (page - 1) * limit + 1}
                rangeEnd={Math.min(page * limit, total)}
                onPageChange={goToPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={dialogFullScreen}>
        <DialogTitle>Add New Batch</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Batch Name"
              fullWidth
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              placeholder="e.g., 2024"
              helperText="Enter a unique batch identifier (year or name)"
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddBatch} disabled={!newBatchName.trim() || saving}>
            {saving ? 'Creating...' : 'Create Batch'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={purgeDialogOpen}
        onClose={closePurgeDialog}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={jobRunning}
      >
        <DialogTitle>
          {purgeJob?.include_drive ? 'Clear data + Google Drive' : 'Clear batch data'}
          {purgeJob?.batch_name ? ` — ${purgeJob.batch_name}` : ''}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {purgeJob?.message || 'Preparing…'}
            </Typography>
            <LinearProgress
              variant={purgeJob?.total ? 'determinate' : 'indeterminate'}
              value={progressPercent}
              sx={{ mb: 2, height: 8, borderRadius: 1 }}
            />
            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
              Phase: {purgeJob?.phase || '—'}
              {purgeJob?.total ? ` · ${purgeJob.current} / ${purgeJob.total}` : ''}
            </Typography>
            {purgeJob?.include_drive && (
              <Typography variant="caption" color="text.secondary" display="block">
                Drive: {purgeJob.drive_deleted} deleted · {purgeJob.drive_skipped} skipped ·{' '}
                {purgeJob.drive_failed} failed
              </Typography>
            )}
            {purgeJob?.status === 'completed' && purgeJob.db_stats && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Removed {purgeJob.db_stats.records ?? 0} records, {purgeJob.db_stats.deadlines ?? 0}{' '}
                deadlines, {purgeJob.db_stats.course_groups ?? 0} groups (
                {purgeJob.db_stats.group_members ?? 0} members).{' '}
                {purgeJob.db_stats.crs_set_pending ?? 0} CR(s) set to pending.
              </Alert>
            )}
            {purgeJob?.status === 'failed' && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {purgeJob.message}
              </Alert>
            )}
            {purgeJob?.errors && purgeJob.errors.length > 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                {purgeJob.errors.slice(0, 3).join(' · ')}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePurgeDialog} disabled={jobRunning}>
            {jobRunning ? 'Running in background…' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BatchesManagement;
