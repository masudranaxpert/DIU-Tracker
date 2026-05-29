// Notices Management - View/Delete notices
import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, List, ListItem, ListItemText,
  ListItemSecondaryAction, IconButton, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField
} from '@mui/material';
import { Delete, NotificationImportant } from '@mui/icons-material';
import { apiClient } from '@/shared/services/apiClient';
import { adminCardSx, pageHeaderSx, pageTitleSx } from '@/shared/theme/adminStyles';
import { useAdminResponsive } from '@/shared/hooks/useAdminResponsive';
import { createBatchNameLookup } from '@/shared/utils/batchHelpers';

interface Notice {
  id: string;
  title: string;
  content: string;
  batch_id: string | null;
  section: string | null;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

interface NoticesManagementProps {
  onRefresh?: () => void;
}

const NoticesManagement: React.FC<NoticesManagementProps> = ({ onRefresh }) => {
  const { dialogFullScreen } = useAdminResponsive();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const getBatchName = createBatchNameLookup(batches);

  useEffect(() => {
    fetchNotices();
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    const result = await apiClient.adminGet<{ id: string; name: string }[]>('/batches');
    setBatches(result.data || []);
  };

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const result = await apiClient.adminGet<Notice[]>('/notices');
      setNotices(result.data || []);
    } catch (err) {
      console.error('Error fetching notices:', err);
    }
    setLoading(false);
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
      await apiClient.adminDelete(`/notices/${id}`);
      await fetchNotices();
      onRefresh?.();
    } catch (err) {
      console.error('Error deleting notice:', err);
    }
  };

  const openDetails = (notice: Notice) => {
    setSelectedNotice(notice);
    setDetailsOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' };
      case 'medium': return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' };
      default: return { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' };
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={pageHeaderSx}>
        <Typography variant="h6" sx={pageTitleSx}>
          Notices ({notices.length})
        </Typography>
      </Box>

      <Card elevation={0} sx={adminCardSx}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : notices.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <NotificationImportant sx={{ fontSize: { xs: 36, sm: 48 }, color: 'text.secondary', mb: 1 }} />
              <Typography color="text.secondary" variant="body2">No notices found</Typography>
            </Box>
          ) : (
            <List>
              {notices.map((notice, index) => {
                const priorityStyle = getPriorityColor(notice.priority);
                return (
                  <ListItem
                    key={notice.id}
                    sx={{
                      borderBottom: index < notices.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: { xs: 1, sm: 0 }
                    }}
                    onClick={() => openDetails(notice)}
                  >
                    <Box sx={{ 
                      width: 40, height: 40, borderRadius: 2, mr: 2, mb: { xs: 1, sm: 0 },
                      bgcolor: 'rgba(239,68,68,0.1)', display: { xs: 'none', sm: 'flex' },
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      <NotificationImportant sx={{ color: '#ef4444' }} />
                    </Box>
                    <ListItemText
                      primary={
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {notice.title}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="caption" color="text.secondary">
                            {notice.content?.trim()
                              ? `${notice.content.substring(0, 50)}${notice.content.length > 50 ? '…' : ''}`
                              : '—'}
                          </Typography>
                          {notice.batch_id && (
                            <Chip label={getBatchName(notice.batch_id)} size="small" sx={{ height: 20 }} />
                          )}
                          {notice.section && (
                            <Chip label={`Sec ${notice.section}`} size="small" variant="outlined" sx={{ height: 20 }} />
                          )}
                        </Box>
                      }
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    />
                    <ListItemSecondaryAction 
                      onClick={(e) => e.stopPropagation()}
                      sx={{ position: 'relative', transform: 'none', top: 'auto', right: 'auto', mt: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' }, display: 'flex', alignItems: 'center' }}
                    >
                      <Chip 
                        label={notice.priority} 
                        size="small"
                        sx={{ ...priorityStyle, mr: 1, textTransform: 'capitalize' }}
                      />
                      <IconButton 
                        edge="end" 
                        onClick={() => handleDeleteNotice(notice.id)}
                        sx={{ color: '#ef4444' }}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={dialogFullScreen}
      >
        <DialogTitle>{selectedNotice?.title}</DialogTitle>
        <DialogContent dividers>
          {selectedNotice && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Content</Typography>
                <Typography variant="body1">{selectedNotice.content}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {selectedNotice.batch_id && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Batch</Typography>
                    <Typography variant="body2">{getBatchName(selectedNotice.batch_id)}</Typography>
                  </Box>
                )}
                {selectedNotice.section && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Section</Typography>
                    <Typography variant="body2">{selectedNotice.section}</Typography>
                  </Box>
                )}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Priority</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip 
                    label={selectedNotice.priority} 
                    size="small"
                    sx={{ ...getPriorityColor(selectedNotice.priority), textTransform: 'capitalize' }}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Created On</Typography>
                <Typography variant="body2">
                  {new Date(selectedNotice.created_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </Typography>
              </Box>
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

export default NoticesManagement;