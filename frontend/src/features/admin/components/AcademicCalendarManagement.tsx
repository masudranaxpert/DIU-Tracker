import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
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
} from '@mui/icons-material';
import {
  ACADEMIC_CALENDAR_AI_PROMPT,
  ACADEMIC_CALENDAR_PROMPT_STEPS,
} from '@/shared/lib/academicCalendarPrompt';
import { parseCalendarEvents } from '@/shared/lib/academicCalendarUtils';
import { academicCalendarService } from '@/shared/services/academicCalendarService';
import AcademicCalendarMarkdown from '@/shared/components/AcademicCalendarMarkdown';

const cardSx = {
  borderRadius: '18px',
  border: '1px solid rgba(99,102,241,0.12)',
  bgcolor: 'rgba(255,255,255,0.86)',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 18px 45px rgba(15,23,42,0.08)',
  p: { xs: 2, md: 3 },
};

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
      setToast('Prompt copied — paste it into ChatGPT/Claude with your calendar image.');
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
      setToast(next ? 'Academic events will show on Calendar View.' : 'Hidden from Calendar View — still visible on Academic Calendar page.');
    } catch (e: any) {
      setShowOnCalendarView(!next);
      setToast(e?.message || 'Could not update visibility');
    } finally {
      setTogglingVisibility(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.03em', mb: 0.5 }}>
          Academic Calendar
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
          Upload the official calendar image to any AI, use our prompt, then paste the markdown response here.
          Students see a formatted calendar; dates also appear on the main Calendar View.
        </Typography>
      </Box>

      <Card sx={cardSx}>
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
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: showOnCalendarView ? 'rgba(20,184,166,0.12)' : 'rgba(15,23,42,0.06)',
                color: showOnCalendarView ? 'teal.700' : 'text.secondary',
                flexShrink: 0,
              }}
            >
              <ViewWeekOutlined fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.25 }}>
                Show on Calendar View
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, lineHeight: 1.5 }}>
                When enabled, parsed academic dates appear as teal events on the main Calendar View.
                The Academic Calendar page is always available to students.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pl: { xs: 6.5, sm: 0 } }}>
            <Chip
              size="small"
              label={showOnCalendarView ? 'Visible' : 'Hidden'}
              color={showOnCalendarView ? 'success' : 'default'}
              variant="outlined"
              sx={{ fontWeight: 700 }}
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

      <Card sx={cardSx}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <AutoAwesomeOutlined color="primary" fontSize="small" />
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Step 1 — Copy AI prompt
          </Typography>
        </Stack>
        <Stack spacing={1.25} sx={{ mb: 2 }}>
          {ACADEMIC_CALENDAR_PROMPT_STEPS.map((step, idx) => (
            <Typography key={step} variant="body2" color="text.secondary">
              {idx + 1}. {step}
            </Typography>
          ))}
        </Stack>
        <Box
          sx={{
            p: 2,
            borderRadius: '12px',
            bgcolor: 'rgba(15,23,42,0.04)',
            border: '1px solid rgba(99,102,241,0.12)',
            maxHeight: 220,
            overflow: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.72rem',
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            color: 'text.secondary',
          }}
        >
          {ACADEMIC_CALENDAR_AI_PROMPT}
        </Box>
        <Button
          startIcon={<ContentCopy />}
          variant="contained"
          onClick={copyPrompt}
          sx={{ mt: 2, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
        >
          Copy prompt
        </Button>
      </Card>

      <Card sx={cardSx}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CalendarMonthOutlined color="primary" fontSize="small" />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Step 2 — Paste & save
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              size="small"
              icon={<EventAvailableOutlined />}
              label={`${parsedEvents.length} events parsed`}
              color={parsedEvents.length > 0 ? 'success' : 'default'}
              variant="outlined"
            />
            {updatedAt && (
              <Chip size="small" label={`Updated ${new Date(updatedAt).toLocaleString()}`} variant="outlined" />
            )}
          </Stack>
        </Stack>

        <TextField
          fullWidth
          label="Calendar title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={{ mb: 2 }}
          size="small"
        />

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, minHeight: 36 }}>
          <Tab value="edit" label="Markdown input" sx={{ textTransform: 'none', fontWeight: 700, minHeight: 36 }} />
          <Tab value="preview" icon={<PreviewOutlined sx={{ fontSize: 16 }} />} iconPosition="start" label="Preview" sx={{ textTransform: 'none', fontWeight: 700, minHeight: 36 }} />
        </Tabs>

        {tab === 'edit' ? (
          <TextField
            fullWidth
            multiline
            minRows={16}
            maxRows={28}
            placeholder="Paste the full markdown response from ChatGPT / Claude here…"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            sx={{
              '& textarea': {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '0.78rem',
                lineHeight: 1.55,
              },
            }}
          />
        ) : (
          <Box
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: '14px',
              border: '1px solid rgba(99,102,241,0.12)',
              bgcolor: 'rgba(248,250,252,0.9)',
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

        <Divider sx={{ my: 2.5 }} />

        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            size="large"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveOutlined />}
            disabled={saving || !markdown.trim()}
            onClick={handleSave}
            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 800, px: 3 }}
          >
            {saving ? 'Saving…' : 'Save calendar'}
          </Button>
        </Stack>
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
