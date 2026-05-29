import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  CircularProgress,
  Link,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
} from '@mui/material';
import { Add, CloudDownload, Delete, Edit, PhotoCamera, Search } from '@mui/icons-material';
import { resolveMediaUrl } from '@/shared/utils/mediaUrl';
import {
  adminPortalService,
  TeacherAdminRow,
  TeacherScrapeJobStatus,
} from '@/features/admin/services/adminPortalService';
import { adminCardSx, cellHiddenSm, cellHiddenXs, pageHeaderSx, pageTitleSx, tableContainerSx } from '@/shared/theme/adminStyles';
import { usePagination } from '@/features/admin/hooks/usePagination';
import AdminPaginationBar from './AdminPaginationBar';
import { useAdminResponsive } from '@/shared/hooks/useAdminResponsive';

const emptyForm = {
  name: '',
  designation: '',
  department: '',
  contact_number: '',
  email: '',
  room_no: '',
};

const TeachersManagement: React.FC = () => {
  const { dialogFullScreen } = useAdminResponsive();
  const { page, limit, totalPages, total, applyMeta, goToPage, resetPage } = usePagination(20);
  const [teachers, setTeachers] = useState<TeacherAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherAdminRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [scrapeJob, setScrapeJob] = useState<TeacherScrapeJobStatus | null>(null);
  const [scrapeStarting, setScrapeStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminPortalService.fetchTeachers({
        page,
        limit,
        q: debouncedSearch.trim() || undefined,
      });
      setTeachers(data.items);
      applyMeta({ total: data.total, total_pages: data.total_pages, page: data.page });
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, applyMeta]);

  useEffect(() => {
    load();
  }, [load]);

  const pollScrapeStatus = useCallback(async () => {
    try {
      const status = await adminPortalService.getTeacherScrapeStatus();
      setScrapeJob(status);
      if (status.status === 'completed' || status.status === 'failed') {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        if (status.status === 'completed') {
          load();
        }
      }
    } catch {
      /* ignore transient poll errors */
    }
  }, [load]);

  useEffect(() => {
    adminPortalService.getTeacherScrapeStatus().then(setScrapeJob);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (scrapeJob?.status === 'running' && !pollRef.current) {
      pollRef.current = setInterval(pollScrapeStatus, 2000);
    }
  }, [scrapeJob?.status, pollScrapeStatus]);

  const handleStartScrape = async () => {
    setScrapeStarting(true);
    try {
      await adminPortalService.startTeacherScrape();
      await pollScrapeStatus();
      if (!pollRef.current) {
        pollRef.current = setInterval(pollScrapeStatus, 2000);
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to start scrape');
    } finally {
      setScrapeStarting(false);
    }
  };

  const scrapeRunning = scrapeJob?.status === 'running';
  const scrapeProgress =
    scrapeJob && scrapeJob.total > 0 ? Math.round((scrapeJob.current / scrapeJob.total) * 100) : undefined;

  const resetPhotoState = () => {
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    resetPhotoState();
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (t: TeacherAdminRow) => {
    setEditing(t);
    setForm({
      name: t.name,
      designation: t.designation || '',
      department: t.department || '',
      contact_number: t.contact_number || '',
      email: t.email || '',
      room_no: t.room_no || '',
    });
    resetPhotoState();
    setPhotoPreview(t.avatar_url ? resolveMediaUrl(t.avatar_url) : null);
    setFormError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
    resetPhotoState();
    setFormError(null);
  };

  const handlePhotoPick = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Please choose an image file.');
      return;
    }
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setFormError(null);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      setFormError('Teacher name is required.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name,
        designation: form.designation.trim() || null,
        department: form.department.trim() || null,
        contact_number: form.contact_number.trim() || null,
        email: form.email.trim() || null,
        room_no: form.room_no.trim() || null,
      };

      if (editing) {
        await adminPortalService.updateTeacher(editing.id, payload);
        if (photoFile) {
          await adminPortalService.uploadTeacherPhoto(editing.id, photoFile);
        }
      } else {
        const created = await adminPortalService.createTeacher(payload);
        if (photoFile && created?.id) {
          await adminPortalService.uploadTeacherPhoto(created.id, photoFile);
        }
      }
      closeDialog();
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save teacher profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: TeacherAdminRow) => {
    if (!window.confirm(`Delete teacher profile for "${t.name}"?`)) return;
    setDeleteLoading(t.id);
    try {
      await adminPortalService.deleteTeacher(t.id);
      load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDeleteAll = async () => {
    const msg =
      'Delete ALL teacher profiles?\n\nThis will remove every teacher row and also delete downloaded photos from the server.';
    if (!window.confirm(msg)) return;
    setLoading(true);
    try {
      await adminPortalService.deleteAllTeachers();
      resetPage();
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to delete all teachers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ ...pageHeaderSx, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="h6" sx={pageTitleSx}>
          Teacher Profiles ({total})
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={scrapeStarting || scrapeRunning ? <CircularProgress size={16} /> : <CloudDownload />}
            onClick={handleStartScrape}
            disabled={scrapeStarting || scrapeRunning}
          >
            {scrapeRunning ? 'Scraping…' : 'Scrape from DIU'}
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<Delete />}
            onClick={handleDeleteAll}
            disabled={scrapeStarting || scrapeRunning || saving}
          >
            Delete all
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate} size="small">
            Add teacher
          </Button>
        </Box>
      </Box>

      {(scrapeRunning || scrapeJob?.status === 'completed' || scrapeJob?.status === 'failed') && scrapeJob && (
        <Alert
          severity={scrapeJob.status === 'failed' ? 'error' : scrapeJob.status === 'completed' ? 'success' : 'info'}
          sx={{ mb: 2 }}
        >
          <Typography variant="body2" fontWeight={700}>
            {scrapeJob.message}
          </Typography>
          {scrapeRunning && scrapeJob.total > 0 && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress variant={scrapeProgress !== undefined ? 'determinate' : 'indeterminate'} value={scrapeProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {scrapeJob.phase}: {scrapeJob.current} / {scrapeJob.total}
              </Typography>
            </Box>
          )}
          {scrapeJob.status === 'completed' && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              Added {scrapeJob.created}, updated {scrapeJob.updated}
            </Typography>
          )}
        </Alert>
      )}

      <Card elevation={0} sx={adminCardSx}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search name, email, department, designation…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              slotProps={{ input: { startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> } }}
            />
          </Box>

          <TableContainer sx={tableContainerSx}>
            <Table size="small" sx={{ minWidth: { xs: 360, sm: 900 }, width: '100%' }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableCell sx={{ fontWeight: 600, width: 56 }} />
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, ...cellHiddenSm }}>Designation</TableCell>
                  <TableCell sx={{ fontWeight: 600, ...cellHiddenSm }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 600, ...cellHiddenXs }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 600, ...cellHiddenSm }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : teachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No teacher profiles found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  teachers.map((t) => (
                    <TableRow key={t.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>
                        {t.avatar_url ? (
                          <Box
                            component="img"
                            src={resolveMediaUrl(t.avatar_url)}
                            alt=""
                            sx={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              bgcolor: 'action.selected',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              fontWeight: 700,
                              color: 'text.secondary',
                            }}
                          >
                            {t.name.charAt(0)}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {t.name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={cellHiddenSm}>
                        <Chip label={t.designation || '—'} size="small" sx={{ bgcolor: 'secondary.50', color: 'secondary.main' }} />
                      </TableCell>
                      <TableCell sx={cellHiddenSm}>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>
                          {t.department || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={cellHiddenXs}>
                        {t.contact_number ? (
                          <Link href={`tel:${t.contact_number}`} underline="hover" variant="body2">
                            {t.contact_number}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell sx={cellHiddenSm}>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 180 }}>
                          {t.email || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(t)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={deleteLoading === t.id}
                              onClick={() => handleDelete(t)}
                            >
                              {deleteLoading === t.id ? <CircularProgress size={18} /> : <Delete fontSize="small" />}
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

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm" fullScreen={dialogFullScreen}>
        <DialogTitle>{editing ? 'Edit teacher profile' : 'Add teacher profile'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {formError && (
            <Alert severity="error" onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {photoPreview ? (
              <Box
                component="img"
                src={photoPreview}
                alt=""
                sx={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '1px solid', borderColor: 'divider' }}
              />
            ) : (
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  bgcolor: 'action.selected',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PhotoCamera color="disabled" />
              </Box>
            )}
            <Button variant="outlined" size="small" onClick={() => photoInputRef.current?.click()}>
              {photoPreview ? 'Change photo' : 'Upload photo'}
            </Button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(e) => handlePhotoPick(e.target.files?.[0] ?? null)}
            />
          </Box>
          <TextField label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <TextField label="Designation" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
          <TextField
            label="Department"
            placeholder="CSE"
            helperText='Use "CSE" for Computer Science and Engineering'
            value={form.department}
            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
          />
          <TextField label="Contact number" value={form.contact_number} onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value }))} />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <TextField label="Room" value={form.room_no} onChange={(e) => setForm((f) => ({ ...f, room_no: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeachersManagement;
