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
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { adminPortalService, StudentAdminRow } from '@/features/admin/services/adminPortalService';
import { adminCardSx, cellHiddenSm, cellHiddenXs, pageHeaderSx, pageTitleSx, tableContainerSx } from '@/shared/theme/adminStyles';
import { usePagination } from '@/features/admin/hooks/usePagination';
import AdminPaginationBar from './AdminPaginationBar';
import { apiClient } from '@/shared/services/apiClient';
import { SECTION_OPTIONS } from '@/shared/lib/sections';

const StudentsManagement: React.FC = () => {
  const { page, limit, totalPages, total, applyMeta, goToPage, resetPage } = usePagination(20);
  const [students, setStudents] = useState<StudentAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminPortalService.fetchStudents({
        page,
        limit,
        batch_id: batchFilter || undefined,
        section: sectionFilter || undefined,
        q: debouncedSearch.trim() || undefined,
      });
      setStudents(data.items);
      applyMeta({ total: data.total, total_pages: data.total_pages, page: data.page });
    } finally {
      setLoading(false);
    }
  }, [page, limit, batchFilter, sectionFilter, debouncedSearch, applyMeta]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={pageHeaderSx}>
        <Typography variant="h6" sx={pageTitleSx}>
          Students ({total})
        </Typography>
      </Box>

      <Card elevation={0} sx={adminCardSx}>
        <CardContent sx={{ p: 0 }}>
          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr' },
            }}
          >
            <TextField
              size="small"
              placeholder="Search ID, name, phone…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              slotProps={{ input: { startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> } }}
            />
            <TextField
              select
              size="small"
              label="Batch"
              value={batchFilter}
              onChange={(e) => {
                setBatchFilter(e.target.value);
                resetPage();
              }}
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
                resetPage();
              }}
            >
              <MenuItem value="">All sections</MenuItem>
              {SECTION_OPTIONS.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <TableContainer sx={tableContainerSx}>
            <Table size="small" sx={{ minWidth: { xs: 360, sm: 720 }, width: '100%' }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Student ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, ...cellHiddenSm }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Batch</TableCell>
                  <TableCell sx={{ fontWeight: 600, ...cellHiddenXs }}>Section</TableCell>
                  <TableCell sx={{ fontWeight: 600, ...cellHiddenXs }}>Sub</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>CR(s)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No students in directory</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((s) => (
                    <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                          {s.student_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {s.name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={cellHiddenSm}>
                        <Typography variant="body2" color="text.secondary">
                          {s.phone || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={s.batch_name || '—'} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell sx={cellHiddenXs}>
                        <Chip label={s.section ? `Sec ${s.section}` : '—'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell sx={cellHiddenXs}>
                        <Typography variant="caption">{s.sub_section || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        {s.cr_names?.length ? (
                          s.cr_names.map((cr) => (
                            <Chip key={cr} label={cr} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <AdminPaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            rangeStart={total === 0 ? 0 : (page - 1) * limit + 1}
            rangeEnd={Math.min(page * limit, total)}
            onPageChange={goToPage}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default StudentsManagement;
