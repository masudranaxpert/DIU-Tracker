import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  Chip,
  CircularProgress,
  MenuItem,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ChatBubbleOutlined,
  FilterAltOutlined,
  PersonOutlined,
  Search,
  StarRounded,
  VisibilityOffOutlined,
} from '@mui/icons-material';
import { adminPortalService, FeedbackAdminRow } from '@/features/admin/services/adminPortalService';
import { usePagination } from '@/features/admin/hooks/usePagination';
import AdminPaginationBar from './AdminPaginationBar';
import { feedbackCategoryLabel } from '@/shared/lib/admin/feedbackCategories';
import { createBatchNameLookup } from '@/shared/utils/batchHelpers';
import { SECTION_OPTIONS } from '@/shared/lib/sections';
import { apiClient } from '@/shared/services/apiClient';

const cardSx = {
  borderRadius: '18px',
  border: '1px solid rgba(99,102,241,0.12)',
  bgcolor: 'rgba(255,255,255,0.86)',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 18px 45px rgba(15,23,42,0.08)',
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

const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#059669', '#d97706', '#db2777', '#7c3aed', '#dc2626'];

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const FeedbackManagement: React.FC = () => {
  const { page, limit, totalPages, total, applyMeta, goToPage, resetPage } = usePagination(15);
  const [items, setItems] = useState<FeedbackAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const getBatchName = createBatchNameLookup(batches);

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
      const data = await adminPortalService.fetchFeedbacks({
        page,
        limit,
        batch_id: batchFilter || undefined,
        section: sectionFilter || undefined,
        q: debouncedSearch.trim() || undefined,
      });
      setItems(data.items);
      applyMeta({ total: data.total, total_pages: data.total_pages, page: data.page });
    } finally {
      setLoading(false);
    }
  }, [page, limit, batchFilter, sectionFilter, debouncedSearch, applyMeta]);

  useEffect(() => {
    load();
  }, [load]);

  const avgRating = useMemo(() => {
    const rated = items.filter((f) => typeof f.rating === 'number' && (f.rating as number) > 0);
    if (rated.length === 0) return null;
    const sum = rated.reduce((acc, f) => acc + (f.rating as number), 0);
    return sum / rated.length;
  }, [items]);

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
            Feedback
          </Typography>
          <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>
            CR &amp; student submissions, visible to super admins only. Filter by batch, section, or keyword.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Chip
            icon={<ChatBubbleOutlined sx={{ fontSize: 16 }} />}
            label={`${total} total`}
            sx={{ bgcolor: '#eef2ff', color: '#4338ca', fontWeight: 900, px: 0.5 }}
          />
          {avgRating !== null && (
            <Chip
              icon={<StarRounded sx={{ fontSize: 18, color: '#f59e0b !important' }} />}
              label={`${avgRating.toFixed(1)} avg`}
              sx={{ bgcolor: '#fffbeb', color: '#b45309', fontWeight: 900, px: 0.5 }}
            />
          )}
        </Stack>
      </Box>

      <Card sx={{ ...cardSx, mb: 2, p: 1.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <FilterAltOutlined sx={{ color: '#4f46e5', fontSize: 19 }} />
          <Typography sx={{ color: '#0f172a', fontWeight: 900, fontSize: '0.95rem' }}>Filter Feedback</Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr' }, gap: 1.25 }}>
          <TextField
            size="small"
            placeholder="Search message, author, category…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
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
              resetPage();
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
              resetPage();
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
      </Card>

      {loading ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={30} sx={{ color: '#6366f1' }} />
        </Box>
      ) : items.length === 0 ? (
        <Card sx={{ ...cardSx, py: 8, textAlign: 'center' }}>
          <ChatBubbleOutlined sx={{ fontSize: 52, color: '#cbd5e1', mb: 1 }} />
          <Typography sx={{ color: '#475569', fontWeight: 800 }}>No feedback found</Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
            Try clearing the filters — submissions appear here for review.
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 1.5 }}>
          {items.map((fb) => {
            const anon = !!fb.is_anonymous;
            const name = anon ? 'Anonymous' : fb.author_name || 'CR / Student';
            const color = anon ? '#94a3b8' : avatarColor(name);
            return (
              <Card
                key={fb.id}
                sx={{
                  ...cardSx,
                  p: 2,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform .15s ease, box-shadow .15s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 24px 55px rgba(15,23,42,0.12)' },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    bgcolor: color,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
                  <Avatar sx={{ bgcolor: color, width: 40, height: 40, fontWeight: 800, fontSize: '0.85rem' }}>
                    {anon ? <VisibilityOffOutlined sx={{ fontSize: 20 }} /> : initials(name)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem', lineHeight: 1.2 }} noWrap>
                      {name}
                    </Typography>
                    {!anon && fb.author_session && (
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                        <PersonOutlined sx={{ fontSize: 13, verticalAlign: 'text-bottom', mr: 0.25 }} />
                        {fb.author_session}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {new Date(fb.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.25, alignItems: 'center' }}>
                  <Chip
                    size="small"
                    label={getBatchName(fb.batch_id) || fb.batch_name || 'Batch'}
                    sx={{ bgcolor: '#eef2ff', color: '#4338ca', fontWeight: 800, height: 22 }}
                  />
                  <Chip size="small" variant="outlined" label={`Sec ${fb.section}`} sx={{ fontWeight: 700, height: 22 }} />
                  <Chip
                    size="small"
                    label={feedbackCategoryLabel(fb.category)}
                    sx={{ bgcolor: '#f0fdf4', color: '#15803d', fontWeight: 800, height: 22 }}
                  />
                  {typeof fb.rating === 'number' && fb.rating > 0 && (
                    <Rating size="small" readOnly value={fb.rating} sx={{ ml: 'auto' }} />
                  )}
                </Box>

                <Typography
                  variant="body2"
                  sx={{ color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.875rem' }}
                >
                  {fb.message}
                </Typography>
              </Card>
            );
          })}
        </Box>
      )}

      <AdminPaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        rangeStart={total === 0 ? 0 : (page - 1) * limit + 1}
        rangeEnd={Math.min(page * limit, total)}
        onPageChange={goToPage}
      />
    </Box>
  );
};

export default FeedbackManagement;
