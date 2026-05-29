import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AccountTreeOutlined,
  CalendarMonthOutlined,
  Delete,
  DescriptionOutlined,
  FilterAltOutlined,
  OpenInNewOutlined,
  SchoolOutlined,
  Sync,
  UploadFileOutlined,
} from '@mui/icons-material';

import {
  adminPortalService,
  QbankPdfFilters,
  QbankPdfRow,
  QbankScrapeJobStatus,
} from '@/features/admin/services/adminPortalService';
import { usePagination } from '@/features/admin/hooks/usePagination';
import AdminPaginationBar from './AdminPaginationBar';

const filterInputSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 42,
    bgcolor: 'rgba(255,255,255,0.86)',
    borderRadius: '12px',
    fontSize: '0.82rem',
    fontWeight: 700,
    '& fieldset': { borderColor: 'rgba(99,102,241,0.16)' },
    '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.34)' },
    '&.Mui-focused fieldset': { borderColor: '#6366f1' },
  },
};

const cardSx = {
  borderRadius: '18px',
  border: '1px solid rgba(99,102,241,0.12)',
  bgcolor: 'rgba(255,255,255,0.86)',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 18px 45px rgba(15,23,42,0.08)',
};

const chipSx = {
  height: 22,
  borderRadius: '7px',
  fontSize: '0.66rem',
  fontWeight: 800,
  '& .MuiChip-icon': { fontSize: 14 },
};

function SearchableFilter({
  icon,
  placeholder,
  options,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const getInputProps = (inputProps?: { startAdornment?: React.ReactNode }) => ({
    ...(inputProps ?? {}),
    startAdornment: (
      <>
        <Box sx={{ mr: 1, display: 'inline-flex', alignItems: 'center' }}>{icon}</Box>
        {inputProps?.startAdornment ?? null}
      </>
    ),
  });

  return (
    <Autocomplete
      size="small"
      options={options}
      value={value || null}
      onChange={(_, nextValue) => onChange(nextValue || '')}
      clearOnEscape
      autoHighlight
      noOptionsText="No option found"
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          sx={filterInputSx}
          InputProps={getInputProps(params.InputProps)}
        />
      )}
    />
  );
}

function formatDate(value?: string | null) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

const QuestionBankManagement: React.FC = () => {
  const { page, limit, totalPages, total, applyMeta, goToPage, resetPage } = usePagination(12);
  const [filters, setFilters] = useState<QbankPdfFilters>({
    departments: [],
    courses: [],
    semesters: [],
    exam_types: [],
  });
  const [items, setItems] = useState<QbankPdfRow[]>([]);
  const [department, setDepartment] = useState('');
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState('');
  const [examType, setExamType] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [syncJob, setSyncJob] = useState<QbankScrapeJobStatus | null>(null);
  const [syncStarting, setSyncStarting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, data] = await Promise.all([
        adminPortalService.fetchQbankPdfFilters(),
        adminPortalService.fetchQbankPdfs({
          page,
          limit,
          department: department || undefined,
          course: course || undefined,
          semester: semester || undefined,
          exam_type: examType || undefined,
        }),
      ]);
      setFilters(f);
      setItems(data.items);
      applyMeta({ total: data.total, total_pages: data.total_pages, page: data.page });
    } finally {
      setLoading(false);
    }
  }, [page, limit, department, course, semester, examType, applyMeta]);

  const pollSyncStatus = useCallback(async () => {
    try {
      const status = await adminPortalService.getQbankScrapeStatus();
      setSyncJob(status);
      if (status.status === 'completed' || status.status === 'failed') {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        if (status.status === 'completed') {
          await load();
        }
      }
    } catch {
      /* ignore transient polling errors */
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminPortalService.getQbankScrapeStatus().then(setSyncJob).catch(() => undefined);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (syncJob?.status === 'running' && !pollRef.current) {
      pollRef.current = setInterval(pollSyncStatus, 2200);
    }
  }, [syncJob?.status, pollSyncStatus]);

  const updateFilter = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string
  ) => {
    setter(value);
    resetPage();
  };

  const handleSync = async () => {
    setActionError(null);
    setSyncStarting(true);
    try {
      await adminPortalService.startQbankScrape(60);
      await pollSyncStatus();
      if (!pollRef.current) {
        pollRef.current = setInterval(pollSyncStatus, 2200);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to start Question Bank sync');
    } finally {
      setSyncStarting(false);
    }
  };

  const handleDeleteAll = async () => {
    setActionError(null);
    setDeleting(true);
    try {
      await adminPortalService.deleteAllQbankPdfs();
      setDeleteOpen(false);
      resetPage();
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to delete questions');
    } finally {
      setDeleting(false);
    }
  };

  const syncRunning = syncJob?.status === 'running';
  const syncProgress =
    syncJob && syncJob.total > 0 ? Math.min(100, Math.round((syncJob.current / syncJob.total) * 100)) : undefined;

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: 'calc(100vh - 96px)',
        borderRadius: { xs: 0, sm: 3 },
        p: { xs: 1.5, sm: 2.5 },
        background:
          'radial-gradient(circle at top left, rgba(99,102,241,0.18), transparent 34%), linear-gradient(135deg, #f8fafc 0%, #eef2ff 52%, #f0fdf4 100%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ color: '#0f172a', fontWeight: 900, letterSpacing: '-0.04em', mb: 0.5 }}>
            Question Bank
          </Typography>
          <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>
            Browse, sync, and manage past exam questions by department, course, semester, and exam type.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexShrink: 0 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<UploadFileOutlined />}
            sx={{ borderRadius: 2, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.72)' }}
          >
            Upload Question
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={syncRunning || syncStarting ? <CircularProgress size={15} color="inherit" /> : <Sync />}
            onClick={handleSync}
            disabled={syncRunning || syncStarting}
            sx={{ borderRadius: 2, fontWeight: 900, bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
          >
            Sync Questions
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={() => setDeleteOpen(true)}
            disabled={deleting || total === 0}
            sx={{ borderRadius: 2, fontWeight: 900, bgcolor: 'rgba(255,255,255,0.72)' }}
          >
            Delete All
          </Button>
        </Stack>
      </Box>

      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {actionError}
        </Alert>
      )}

      {(syncRunning || syncJob?.status === 'completed' || syncJob?.status === 'failed') && (
        <Card sx={{ ...cardSx, mb: 2, p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: '#0f172a', fontWeight: 900, fontSize: '0.9rem' }}>
                {syncJob?.message || 'Question Bank sync'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                Added {syncJob?.created ?? 0} · Updated {syncJob?.updated ?? 0}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={syncJob?.status || 'idle'}
              color={syncJob?.status === 'failed' ? 'error' : syncJob?.status === 'completed' ? 'success' : 'primary'}
              sx={{ fontWeight: 900, textTransform: 'capitalize' }}
            />
          </Box>
          {syncRunning && <LinearProgress variant={syncProgress ? 'determinate' : 'indeterminate'} value={syncProgress} sx={{ mt: 1.25, borderRadius: 999 }} />}
        </Card>
      )}

      <Card sx={{ ...cardSx, mb: 2, p: 1.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <FilterAltOutlined sx={{ color: '#4f46e5', fontSize: 19 }} />
          <Typography sx={{ color: '#0f172a', fontWeight: 900, fontSize: '0.95rem' }}>
            Filter Questions
          </Typography>
          <Chip size="small" label={`${total} total`} sx={{ ml: 'auto', bgcolor: '#eef2ff', color: '#4338ca', fontWeight: 900 }} />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 1.25 }}>
          <SearchableFilter
            icon={<AccountTreeOutlined sx={{ color: '#4f46e5', fontSize: 16 }} />}
            placeholder="All Departments"
            options={filters.departments}
            value={department}
            onChange={(value) => updateFilter(setDepartment, value)}
          />

          <SearchableFilter
            icon={<SchoolOutlined sx={{ color: '#059669', fontSize: 16 }} />}
            placeholder="All Courses"
            options={filters.courses}
            value={course}
            onChange={(value) => updateFilter(setCourse, value)}
          />

          <SearchableFilter
            icon={<CalendarMonthOutlined sx={{ color: '#7c3aed', fontSize: 16 }} />}
            placeholder="All Semesters"
            options={filters.semesters}
            value={semester}
            onChange={(value) => updateFilter(setSemester, value)}
          />

          <SearchableFilter
            icon={<DescriptionOutlined sx={{ color: '#d97706', fontSize: 16 }} />}
            placeholder="All Exam Types"
            options={filters.exam_types}
            value={examType}
            onChange={(value) => updateFilter(setExamType, value)}
          />
        </Box>
      </Card>

      {loading ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : items.length === 0 ? (
        <Card sx={{ ...cardSx, p: 4, textAlign: 'center' }}>
          <Typography sx={{ color: '#0f172a', fontWeight: 900 }}>No questions found</Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, mb: 2 }}>Run sync or try another filter combination.</Typography>
          <Button variant="contained" startIcon={<Sync />} onClick={handleSync} disabled={syncRunning || syncStarting}>
            Sync Questions
          </Button>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.25 }}>
          {items.map((item) => {
            const title = item.course_name || `Question #${item.question_external_id}`;
            const date = formatDate(item.scraped_at);
            return (
              <Card
                key={`${item.question_external_id}:${item.pdf_url}`}
                sx={{
                  ...cardSx,
                  p: 1.75,
                  transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    borderColor: 'rgba(79,70,229,0.35)',
                    boxShadow: '0 22px 55px rgba(79,70,229,0.13)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: '#0f172a', fontWeight: 900, fontSize: '1rem', mb: 1, lineHeight: 1.25 }}>
                      {title}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                      <Chip size="small" icon={<AccountTreeOutlined />} label={item.department || 'CSE'} sx={{ ...chipSx, bgcolor: '#eef2ff', color: '#4338ca' }} />
                      <Chip size="small" label={item.exam_type || 'Exam'} sx={{ ...chipSx, bgcolor: '#fef3c7', color: '#92400e' }} />
                      <Chip size="small" icon={<CalendarMonthOutlined />} label={item.semester_name || 'Semester'} sx={{ ...chipSx, bgcolor: '#f3e8ff', color: '#6d28d9' }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                      {date || 'Recently indexed'} · {item.submissions_count ?? 0} submission{(item.submissions_count ?? 0) === 1 ? '' : 's'}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={<OpenInNewOutlined />}
                      component="a"
                      href={item.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ borderRadius: 2, fontWeight: 800 }}
                    >
                      Open
                    </Button>
                  </Stack>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      <Box sx={{ mt: 1.5 }}>
        <AdminPaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          rangeStart={total === 0 ? 0 : (page - 1) * limit + 1}
          rangeEnd={Math.min(page * limit, total)}
          onPageChange={goToPage}
        />
      </Box>

      <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Delete all questions?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            This will remove every indexed Question Bank PDF from the local database. You can sync again later.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteAll} disabled={deleting} startIcon={deleting ? <CircularProgress size={15} color="inherit" /> : <Delete />}>
            Delete All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuestionBankManagement;
