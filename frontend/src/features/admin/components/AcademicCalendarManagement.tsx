import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  ContentCopy,
  SaveOutlined,
  CalendarMonthOutlined,
  AutoAwesomeOutlined,
  PreviewOutlined,
  EventAvailableOutlined,
  ViewWeekOutlined,
  CheckCircleOutlined,
} from '@mui/icons-material';
import {
  ACADEMIC_CALENDAR_AI_PROMPT,
  ACADEMIC_CALENDAR_PROMPT_STEPS,
} from '@/shared/lib/academicCalendarPrompt';
import { parseCalendarEvents } from '@/shared/lib/academicCalendarUtils';
import { academicCalendarService } from '@/shared/services/academicCalendarService';
import AcademicCalendarMarkdown from '@/shared/components/AcademicCalendarMarkdown';
import { pageHeaderSx, pageTitleSx } from '@/shared/theme/adminStyles';

const cardSx = {
  borderRadius: '16px',
  border: '1px solid rgba(99,102,241,0.14)',
  bgcolor: '#fff',
  boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(99,102,241,0.06)',
  overflow: 'hidden',
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    bgcolor: '#f8fafc',
    fontSize: '0.875rem',
    '& fieldset': { borderColor: 'rgba(99,102,241,0.18)' },
    '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.35)' },
    '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: '1.5px' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
};

const monoInputSx = {
  ...inputSx,
  '& textarea': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '0.78rem',
    lineHeight: 1.6,
  },
};

function StepBadge({ n }: { n: number }) {
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: '8px',
        bgcolor: '#6366f1',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8rem',
        fontWeight: 800,
        flexShrink: 0,
      }}
    >
      {n}
    </Box>
  );
}

const AcademicCalendarManagement: React.FC = () => {
  const [title, setTitle] = useState('Academic Calendar');
  const [markdown, setMarkdown] = useState('');
  const [showOnCalendarView, setShowOnCalendarView] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [toast, setToast] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const parsedEvents = useMemo(() => parseCalendarEvents(markdown), [markdown]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await academicCalendarService.fetch();
      if (data) {
        setTitle(data.title || 'Academic Calendar');
        setMarkdown(data.markdown || '');
        setShowOnCalendarView(data.show_on_calendar_view !== false);
        setUpdatedAt(data.updated_at || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(ACADEMIC_CALENDAR_AI_PROMPT);
      setToast('Prompt copied — paste into ChatGPT or Claude with your calendar image.');
    } catch {
      setToast('Could not copy. Select and copy manually.');
    }
  };

  const handleSave = async () => {
    if (!markdown.trim()) {
      setToast('Paste the AI markdown response before saving.');
      return;
    }
    setSaving(true);
    try {
      const saved = await academicCalendarService.save({ title: title.trim(), markdown });
      setUpdatedAt(saved?.updated_at || null);
      if (saved?.show_on_calendar_view !== undefined) {
        setShowOnCalendarView(saved.show_on_calendar_view !== false);
      }
      setToast(`Saved · ${parsedEvents.length} calendar events detected.`);
      setTab('preview');
    } catch (e: any) {
      setToast(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCalendarView = async () => {
    const next = !showOnCalendarView;
    setShowOnCalendarView(next);
    setTogglingVisibility(true);
    try {
      const saved = await academicCalendarService.updateSettings({ show_on_calendar_view: next });
      setUpdatedAt(saved?.updated_at || null);
      setToast(
        next
          ? 'Academic events will show on Calendar View.'
          : 'Hidden from Calendar View — still visible on Academic Calendar page.',
      );
    } catch (e: any) {
      setShowOnCalendarView(!next);
      setToast(e?.message || 'Could not update visibility');
    } finally {
      setTogglingVisibility(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={32} sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Page header */}
      <Box
        sx={{
          ...pageHeaderSx,
          p: { xs: 2.5, md: 3 },
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(20,184,166,0.06) 100%)',
          border: '1px solid rgba(99,102,241,0.12)',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1 0%, #14b8a6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 20px rgba(99,102,241,0.25)',
              flexShrink: 0,
            }}
          >
            <CalendarMonthOutlined />
          </Box>
          <Box>
            <Typography sx={{ ...pageTitleSx, fontSize: { xs: '1.25rem', md: '1.5rem' }, mb: 0.5 }}>
              Academic Calendar
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640, lineHeight: 1.6 }}>
              Upload the official calendar to AI, paste the markdown response, and publish to all students.
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Stats + visibility row */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card sx={{ ...cardSx, p: 2.5, height: '100%' }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
              <EventAvailableOutlined sx={{ color: '#6366f1', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Parsed events
              </Typography>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, color: parsedEvents.length > 0 ? '#059669' : 'text.secondary' }}>
              {parsedEvents.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              From <code>calendar-events</code> JSON block
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ ...cardSx, p: 2.5, height: '100%' }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    bgcolor: showOnCalendarView ? 'rgba(20,184,166,0.12)' : 'rgba(15,23,42,0.06)',
                    color: showOnCalendarView ? '#0f766e' : 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ViewWeekOutlined fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.25 }}>
                    Show on Calendar View
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, maxWidth: 420 }}>
                    Teal badges on the main calendar when enabled.
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Chip
                  size="small"
                  icon={showOnCalendarView ? <CheckCircleOutlined sx={{ fontSize: '14px !important' }} /> : undefined}
                  label={showOnCalendarView ? 'Visible' : 'Hidden'}
                  sx={{
                    fontWeight: 700,
                    bgcolor: showOnCalendarView ? 'rgba(16,185,129,0.1)' : 'rgba(15,23,42,0.06)',
                    color: showOnCalendarView ? '#047857' : 'text.secondary',
                    border: 'none',
                  }}
                />
                <Switch
                  checked={showOnCalendarView}
                  onChange={handleToggleCalendarView}
                  disabled={togglingVisibility}
                  inputProps={{ 'aria-label': 'Show academic calendar on Calendar View' }}
                />
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Step 1 — Prompt */}
      <Card sx={cardSx}>
        <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <StepBadge n={1} />
            <Stack direction="row" alignItems="center" spacing={1}>
              <AutoAwesomeOutlined sx={{ color: '#6366f1', fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Copy AI prompt
              </Typography>
            </Stack>
          </Stack>

          <Stack spacing={1} sx={{ mb: 2.5, pl: { xs: 0, sm: 5.5 } }}>
            {ACADEMIC_CALENDAR_PROMPT_STEPS.map((step, idx) => (
              <Stack key={step} direction="row" spacing={1.5} alignItems="flex-start">
                <Typography
                  variant="caption"
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '6px',
                    bgcolor: 'rgba(99,102,241,0.1)',
                    color: '#6366f1',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    mt: 0.1,
                  }}
                >
                  {idx + 1}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                  {step}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Box
          sx={{
            mx: { xs: 2, md: 3 },
            mb: 2,
            p: 2,
            borderRadius: '12px',
            bgcolor: '#0f172a',
            border: '1px solid rgba(99,102,241,0.2)',
            maxHeight: 200,
            overflow: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.72rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            color: '#94a3b8',
          }}
        >
          {ACADEMIC_CALENDAR_AI_PROMPT}
        </Box>

        <Box sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 } }}>
          <Button
            startIcon={<ContentCopy />}
            variant="contained"
            onClick={copyPrompt}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
              px: 2.5,
              bgcolor: '#6366f1',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              '&:hover': { bgcolor: '#4f46e5' },
            }}
          >
            Copy prompt
          </Button>
        </Box>
      </Card>

      {/* Step 2 — Paste & save */}
      <Card sx={cardSx}>
        <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
            spacing={1.5}
            sx={{ mb: 2.5 }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <StepBadge n={2} />
              <Stack direction="row" alignItems="center" spacing={1}>
                <CalendarMonthOutlined sx={{ color: '#6366f1', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Paste & publish
                </Typography>
              </Stack>
            </Stack>
            {updatedAt && (
              <Chip
                size="small"
                label={`Last saved ${new Date(updatedAt).toLocaleString()}`}
                variant="outlined"
                sx={{ fontWeight: 600, borderColor: 'rgba(99,102,241,0.25)' }}
              />
            )}
          </Stack>

          <TextField
            fullWidth
            label="Calendar title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ ...inputSx, mb: 2.5 }}
            size="small"
          />

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              mb: 2,
              minHeight: 40,
              '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: '#6366f1' },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                minHeight: 40,
                fontSize: '0.875rem',
                color: 'text.secondary',
                '&.Mui-selected': { color: '#6366f1' },
              },
            }}
          >
            <Tab value="edit" label="Markdown input" />
            <Tab value="preview" icon={<PreviewOutlined sx={{ fontSize: 16 }} />} iconPosition="start" label="Preview" />
          </Tabs>
        </Box>

        <Box sx={{ px: { xs: 2, md: 3 } }}>
          {tab === 'edit' ? (
            <TextField
              fullWidth
              multiline
              minRows={16}
              maxRows={28}
              placeholder="Paste the full markdown response from ChatGPT / Claude here…"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              sx={monoInputSx}
            />
          ) : (
            <Box
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: '12px',
                border: '1px solid rgba(99,102,241,0.12)',
                bgcolor: '#f8fafc',
                maxHeight: 520,
                overflow: 'auto',
              }}
            >
              {markdown.trim() ? (
                <AcademicCalendarMarkdown markdown={markdown} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nothing to preview yet. Paste markdown in the edit tab.
                </Typography>
              )}
            </Box>
          )}

          {parsedEvents.length === 0 && markdown.trim().length > 100 && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: '12px' }}>
              No <code>calendar-events</code> block detected. Re-run the AI with the prompt — the JSON block is required for Calendar View badges.
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 }, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveOutlined />}
            disabled={saving || !markdown.trim()}
            onClick={handleSave}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 800,
              px: 3.5,
              bgcolor: '#6366f1',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              '&:hover': { bgcolor: '#4f46e5' },
              '&:disabled': { bgcolor: 'rgba(99,102,241,0.4)' },
            }}
          >
            {saving ? 'Saving…' : 'Save calendar'}
          </Button>
        </Box>
      </Card>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  );
};

export default AcademicCalendarManagement;
