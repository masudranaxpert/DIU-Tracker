import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Grid, Typography, CircularProgress, Button } from '@mui/material';
import {
  People,
  School,
  AccountCircle,
  Business,
  CheckCircle,
  Pending,
  Notifications,
  Refresh,
} from '@mui/icons-material';
import { apiClient } from '@/shared/services/apiClient';
import { adminCardSx } from '@/shared/theme/adminStyles';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalBatches: number;
  pendingCRs: number;
  approvedCRs: number;
  totalNotices: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalBatches: 0,
    pendingCRs: 0,
    approvedCRs: 0,
    totalNotices: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [crs, batches, notices, teachers] = await Promise.all([
        apiClient.adminGet<{ is_active: boolean; is_cr?: boolean }[]>('/users?is_cr=true'),
        apiClient.adminGet<unknown[]>('/batches'),
        apiClient.adminGet<unknown[]>('/notices'),
        apiClient.adminGet<unknown[]>('/teacher-profiles').catch(() => ({ data: [] })),
      ]);

      const studentsRes = await apiClient.adminGet<{ is_cr?: boolean }[]>('/users?is_cr=false');
      const crList = crs.data || [];
      const studentList = (studentsRes.data || []).filter((u) => !u.is_cr);

      setStats({
        totalStudents: studentList.length,
        totalTeachers: teachers.data?.length ?? 0,
        totalBatches: batches.data?.length ?? 0,
        pendingCRs: crList.filter((c) => !c.is_active).length,
        approvedCRs: crList.filter((c) => c.is_active).length,
        totalNotices: notices.data?.length ?? 0,
      });
    } catch (e) {
      console.error('Dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const statCards = [
    {
      title: 'Students',
      value: stats.totalStudents,
      icon: <School sx={{ fontSize: 28, color: '#4f46e5' }} />,
      bg: 'rgba(79, 70, 229, 0.08)',
    },
    {
      title: 'Teachers',
      value: stats.totalTeachers,
      icon: <AccountCircle sx={{ fontSize: 28, color: '#7c3aed' }} />,
      bg: 'rgba(124, 58, 237, 0.08)',
    },
    {
      title: 'Batches',
      value: stats.totalBatches,
      icon: <Business sx={{ fontSize: 28, color: '#0891b2' }} />,
      bg: 'rgba(8, 145, 178, 0.08)',
    },
    {
      title: 'Pending CRs',
      value: stats.pendingCRs,
      icon: <Pending sx={{ fontSize: 28, color: '#d97706' }} />,
      bg: 'rgba(217, 119, 6, 0.08)',
      highlight: stats.pendingCRs > 0,
    },
    {
      title: 'Approved CRs',
      value: stats.approvedCRs,
      icon: <CheckCircle sx={{ fontSize: 28, color: '#16a34a' }} />,
      bg: 'rgba(22, 163, 74, 0.08)',
    },
    {
      title: 'Notices',
      value: stats.totalNotices,
      icon: <Notifications sx={{ fontSize: 28, color: '#dc2626' }} />,
      bg: 'rgba(220, 38, 38, 0.08)',
    },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
      <Box
        sx={{
          mb: 3,
          p: { xs: 2, sm: 2.5 },
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
          color: 'white',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85 }}>
            Control center
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.5rem' }, letterSpacing: '-0.02em', mt: 0.5 }}>
            Dashboard Overview
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', opacity: 0.9, mt: 0.5, maxWidth: 420 }}>
            Manage batches, approve class representatives, and monitor platform data.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
          onClick={loadStats}
          disabled={loading}
          sx={{
            alignSelf: { xs: 'stretch', sm: 'center' },
            bgcolor: 'rgba(255,255,255,0.15)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.25)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
          }}
        >
          Refresh
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          {statCards.map((card, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card
                elevation={0}
                sx={{
                  ...adminCardSx,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  ...(card.highlight
                    ? { borderColor: '#fcd34d', boxShadow: '0 0 0 1px rgba(251, 191, 36, 0.3)' }
                    : {}),
                  '&:hover': {
                    borderColor: '#c7d2fe',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.08)',
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 2.25 }, '&:last-child': { pb: { xs: 2, sm: 2.25 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5, fontWeight: 500 }}>
                        {card.title}
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          color: 'text.primary',
                          fontSize: { xs: '1.75rem', sm: '2rem' },
                          letterSpacing: '-0.03em',
                          lineHeight: 1,
                        }}
                      >
                        {card.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 1.25,
                        borderRadius: '8px',
                        bgcolor: card.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {card.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Card elevation={0} sx={{ ...adminCardSx, mt: 2.5, p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <People sx={{ color: 'primary.main', mt: 0.25 }} />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 0.5 }}>Quick tip</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Use <strong>CR Management</strong> to approve new class representatives before they can access the admin
              dashboard for their section.
            </Typography>
          </Box>
        </Box>
      </Card>
    </Box>
  );
};

export default AdminDashboard;
