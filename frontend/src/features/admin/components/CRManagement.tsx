import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  TextField,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  Search,
  FilterAltOutlined,
  HourglassTopOutlined,
  VerifiedUserOutlined,
} from '@mui/icons-material';
import { adminPortalService, CRAdminRow } from '@/features/admin/services/adminPortalService';
import {
  cellHiddenSm,
  cellHiddenXs,
  tableContainerSx,
} from '@/shared/theme/adminStyles';
import { useAdminResponsive } from '@/shared/hooks/useAdminResponsive';
import { usePagination } from '@/features/admin/hooks/usePagination';
import AdminPaginationBar from './AdminPaginationBar';
import { SECTION_OPTIONS } from '@/shared/lib/sections';
import { apiClient } from '@/shared/services/apiClient';

const PAGE_SIZE = 8;

const cardSx = {
  borderRadius: '18px',
  border: '1px solid rgba(99,102,241,0.12)',
  bgcolor: 'rgba(255,255,255,0.86)',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 18px 45px rgba(15,23,42,0.08)',
  overflow: 'hidden',
};

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

const CRManagement: React.FC = () => {
  const { dialogFullScreen } = useAdminResponsive();
  const pendingPag = usePagination(PAGE_SIZE);
  const approvedPag = usePagination(PAGE_SIZE);

  const [pendingCRs, setPendingCRs] = useState<CRAdminRow[]>([]);
  const [approvedCRs, setApprovedCRs] = useState<CRAdminRow[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingApproved, setLoadingApproved] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedCR, setSelectedCR] = useState<CRAdminRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    apiClient.adminGet<{ id: string; name: string }[]>('/batches').then((r) => setBatches(r.data || []));
  }, []);

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const data = await adminPortalService.fetchCRs({
        is_active: false,
        page: pendingPag.page,
        limit: pendingPag.limit,
        batch_id: batchFilter || undefined,
        section: sectionFilter || undefined,
        q: debouncedSearch.trim() || undefined,
      });
      setPendingCRs(data.items);
      setPendingTotal(data.total);
      pendingPag.applyMeta({
        total: data.total,
        total_pages: data.total_pages,
        page: data.page,
      });
    } finally {
      setLoadingPending(false);
    }
  }, [
    pendingPag.page,
    pendingPag.limit,
    batchFilter,
    sectionFilter,
    debouncedSearch,
    pendingPag.applyMeta,
  ]);

  const loadApproved = useCallback(async () => {
    setLoadingApproved(true);
    try {
      const data = await adminPortalService.fetchCRs({
        is_active: true,
        page: approvedPag.page,
        limit: approvedPag.limit,
        batch_id: batchFilter || undefined,
        section: sectionFilter || undefined,
        q: debouncedSearch.trim() || undefined,
      });
      setApprovedCRs(data.items);
      setApprovedTotal(data.total);
      approvedPag.applyMeta({
        total: data.total,
        total_pages: data.total_pages,
        page: data.page,
      });
    } finally {
      setLoadingApproved(false);
    }
  }, [
    approvedPag.page,
    approvedPag.limit,
    batchFilter,
    sectionFilter,
    debouncedSearch,
    approvedPag.applyMeta,
  ]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  useEffect(() => {
    loadApproved();
  }, [loadApproved]);

  const refreshAll = () => {
    loadPending();
    loadApproved();
  };

  const handleApprove = async (cr: CRAdminRow) => {
    setActionLoading(cr.id);
    try {
      await apiClient.adminPut(`/users/${cr.id}`, { is_active: true });
      refreshAll();
    } catch (err) {
      console.error('Error approving CR:', err);
    }
    setActionLoading(null);
  };

  const handleReject = async (cr: CRAdminRow) => {
    if (!confirm('Reject and remove this CR request?')) return;
    setActionLoading(cr.id);
    try {
      await apiClient.adminDelete(`/users/${cr.id}`);
      refreshAll();
    } catch (err) {
      console.error('Error rejecting CR:', err);
    }
    setActionLoading(null);
  };

  const getBatchName = (id: string | null | undefined) =>
    batches.find((b) => b.id === id)?.name || '—';

  const renderCRRow = (cr: CRAdminRow, isPending: boolean) => (
    <TableRow key={cr.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {cr.full_name || 'N/A'}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: { md: 'none' } }}>
          {cr.email}
        </Typography>
      </TableCell>
      <TableCell sx={cellHiddenSm}>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
          {cr.email}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={cr.batch_name || getBatchName(cr.batch_id)}
          size="small"
          sx={{ bgcolor: 'primary.50', color: 'primary.main', fontWeight: 600 }}
        />
      </TableCell>
      <TableCell sx={cellHiddenXs}>
        <Chip label={`Sec ${cr.section || '—'}`} size="small" variant="outlined" />
      </TableCell>
      <TableCell sx={cellHiddenXs}>
        <Chip
          label={cr.is_active ? 'Approved' : 'Pending'}
          size="small"
          color={cr.is_active ? 'success' : 'warning'}
          variant="outlined"
        />
      </TableCell>
      <TableCell align="right">
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.25 }}>
          <Tooltip title="Details">
            <IconButton size="small" onClick={() => { setSelectedCR(cr); setDetailsOpen(true); }}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {isPending && (
            <>
              <Tooltip title="Approve">
                <IconButton
                  size="small"
                  onClick={() => handleApprove(cr)}
                  disabled={actionLoading === cr.id}
                  sx={{ color: 'success.main' }}
                >
                  {actionLoading === cr.id ? (
                    <CircularProgress size={18} />
                  ) : (
                    <CheckCircle fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton
                  size="small"
                  onClick={() => handleReject(cr)}
                  disabled={actionLoading === cr.id}
                  sx={{ color: 'error.main' }}
                >
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );

  const filterBar = (
    <Box sx={{ p: { xs: 1.5, sm: 1.75 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <FilterAltOutlined sx={{ color: '#4f46e5', fontSize: 19 }} />
        <Typography sx={{ color: '#0f172a', fontWeight: 900, fontSize: '0.95rem' }}>Filter CRs</Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr' },
        }}
      >
        <TextField
          size="small"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            pendingPag.resetPage();
            approvedPag.resetPage();
          }}
          sx={filterInputSx}
          slotProps={{ input: { startAdornment: <Search sx={{ mr: 1, color: '#94a3b8', fontSize: 18 }} /> } }}
        />
        <TextField
          select
          size="small"
          label="Batch"
          value={batchFilter}
          onChange={(e) => {
            setBatchFilter(e.target.value);
            pendingPag.resetPage();
            approvedPag.resetPage();
          }}
          sx={filterInputSx}
        >
          <MenuItem value="">All batches</MenuItem>
          {batches.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Section"
          value={sectionFilter}
          onChange={(e) => {
            setSectionFilter(e.target.value);
            pendingPag.resetPage();
            approvedPag.resetPage();
          }}
          sx={filterInputSx}
        >
          <MenuItem value="">All sections</MenuItem>
          {SECTION_OPTIONS.map((s) => (
            <MenuItem key={s.value} value={s.value}>
              {s.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    </Box>
  );

  const pendingStart =
    pendingTotal === 0 ? 0 : (pendingPag.page - 1) * pendingPag.limit + 1;
  const pendingEnd = Math.min(pendingPag.page * pendingPag.limit, pendingTotal);
  const approvedStart =
    approvedTotal === 0 ? 0 : (approvedPag.page - 1) * approvedPag.limit + 1;
  const approvedEnd = Math.min(approvedPag.page * approvedPag.limit, approvedTotal);

  const sectionHeadSx = (accent: string, tint: string) => ({
    p: { xs: 1.5, sm: 2 },
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    borderBottom: '1px solid rgba(99,102,241,0.1)',
    background: tint,
    color: accent,
  });

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
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ color: '#0f172a', fontWeight: 900, letterSpacing: '-0.04em', mb: 0.5 }}>
            CR Management
          </Typography>
          <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>
            Review, approve, or reject class representative access requests.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Chip
            icon={<HourglassTopOutlined sx={{ fontSize: 16 }} />}
            label={`${pendingTotal} pending`}
            sx={{ bgcolor: '#fffbeb', color: '#b45309', fontWeight: 900, px: 0.5 }}
          />
          <Chip
            icon={<VerifiedUserOutlined sx={{ fontSize: 16 }} />}
            label={`${approvedTotal} approved`}
            sx={{ bgcolor: '#f0fdf4', color: '#15803d', fontWeight: 900, px: 0.5 }}
          />
        </Stack>
      </Box>

      <Card elevation={0} sx={{ ...cardSx, mb: 2 }}>
        <CardContent sx={{ p: 0 }}>
          {filterBar}
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ ...cardSx, mb: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={sectionHeadSx('#b45309', 'rgba(254,243,199,0.5)')}>
            <HourglassTopOutlined sx={{ fontSize: 18 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Pending approvals ({pendingTotal})
            </Typography>
          </Box>
          <TableContainer sx={tableContainerSx}>
            <Table size="small" sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, ...cellHiddenSm }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Batch</TableCell>
                  <TableCell sx={{ fontWeight: 600, ...cellHiddenXs }}>Section</TableCell>
                  <TableCell sx={{ fontWeight: 600, ...cellHiddenXs }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingPending ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : pendingCRs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No pending CR requests</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingCRs.map((cr) => renderCRRow(cr, true))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <AdminPaginationBar
            page={pendingPag.page}
            totalPages={pendingPag.totalPages}
            total={pendingTotal}
            rangeStart={pendingStart}
            rangeEnd={pendingEnd}
            onPageChange={pendingPag.goToPage}
          />
        </CardContent>
      </Card>

      <Card elevation={0} sx={cardSx}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={sectionHeadSx('#15803d', 'rgba(220,252,231,0.5)')}>
            <VerifiedUserOutlined sx={{ fontSize: 18 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Approved CRs ({approvedTotal})
            </Typography>
          </Box>
          <TableContainer sx={tableContainerSx}>
            <Table size="small" sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, ...cellHiddenSm }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Batch</TableCell>
                  <TableCell sx={{ fontWeight: 600, ...cellHiddenXs }}>Section</TableCell>
                  <TableCell sx={{ fontWeight: 600, ...cellHiddenXs }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingApproved ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : approvedCRs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No approved CRs yet</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  approvedCRs.map((cr) => renderCRRow(cr, false))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <AdminPaginationBar
            page={approvedPag.page}
            totalPages={approvedPag.totalPages}
            total={approvedTotal}
            rangeStart={approvedStart}
            rangeEnd={approvedEnd}
            onPageChange={approvedPag.goToPage}
          />
        </CardContent>
      </Card>

      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={dialogFullScreen}
      >
        <DialogTitle>CR details</DialogTitle>
        <DialogContent dividers>
          {selectedCR && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Full name
                </Typography>
                <Typography fontWeight={600}>{selectedCR.full_name || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography>{selectedCR.email}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Batch
                </Typography>
                <Typography>{selectedCR.batch_name || getBatchName(selectedCR.batch_id)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Section
                </Typography>
                <Typography>{selectedCR.section}</Typography>
              </Box>
              {selectedCR.created_at && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Registered
                  </Typography>
                  <Typography>
                    {new Date(selectedCR.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CRManagement;
