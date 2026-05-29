import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import { Add, Delete, Search } from '@mui/icons-material';
import { adminPortalService, CourseListAdminRow } from '@/features/admin/services/adminPortalService';
import { adminCardSx, pageHeaderSx, pageTitleSx, tableContainerSx } from '@/shared/theme/adminStyles';
import { useAdminResponsive } from '@/shared/hooks/useAdminResponsive';
import { usePagination } from '@/features/admin/hooks/usePagination';
import AdminPaginationBar from './AdminPaginationBar';

const CourseListManagement: React.FC = () => {
  const { dialogFullScreen } = useAdminResponsive();
  const { page, limit, totalPages, total, applyMeta, goToPage, resetPage } = usePagination(20);
  const [items, setItems] = useState<CourseListAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminPortalService.fetchCourseCatalog({
        page,
        limit,
        q: debouncedSearch.trim() || undefined,
      });
      setItems(data.items);
      applyMeta({ total: data.total, total_pages: data.total_pages, page: data.page });
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, applyMeta]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code || !name) {
      setError('Code and name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminPortalService.createCourseCatalogItem({ code, name });
      setDialogOpen(false);
      setForm({ code: '', name: '' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add course');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: CourseListAdminRow) => {
    if (!window.confirm(`Remove "${row.code}" from catalog?`)) return;
    setDeleteLoading(row.id);
    try {
      await adminPortalService.deleteCourseCatalogItem(row.id);
      load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ ...pageHeaderSx, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Typography variant="h6" sx={pageTitleSx}>
          CSE Course Catalog ({total})
        </Typography>
        <Button variant="contained" size="small" startIcon={<Add />} onClick={() => { setError(null); setDialogOpen(true); }}>
          Add course
        </Button>
      </Box>

      <Card elevation={0} sx={adminCardSx}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search code or name…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              slotProps={{ input: { startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> } }}
            />
          </Box>
          <TableContainer sx={tableContainerSx}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No courses in catalog</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {row.code}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Delete">
                          <span>
                            <IconButton size="small" color="error" disabled={deleteLoading === row.id} onClick={() => handleDelete(row)}>
                              {deleteLoading === row.id ? <CircularProgress size={18} /> : <Delete fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
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

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm" fullScreen={dialogFullScreen}>
        <DialogTitle>Add catalog course</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Course code" required placeholder="CSE 112" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <TextField label="Course name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? 'Saving…' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CourseListManagement;
