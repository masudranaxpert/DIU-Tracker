import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AdminThemeProvider from '@/features/admin/components/AdminThemeProvider';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminDashboard from '@/features/admin/components/AdminDashboard';
import CRManagement from '@/features/admin/components/CRManagement';
import StudentsManagement from '@/features/admin/components/StudentsManagement';
import TeachersManagement from '@/features/admin/components/TeachersManagement';
import CourseListManagement from '@/features/admin/components/CourseListManagement';
import BatchesManagement from '@/features/admin/components/BatchesManagement';
import FeedbackManagement from '@/features/admin/components/FeedbackManagement';
import RcloneManagement from '@/features/admin/components/RcloneManagement';
import QuestionBankManagement from '@/features/admin/components/QuestionBankManagement';
import AcademicCalendarManagement from '@/features/admin/components/AcademicCalendarManagement';
import { adminAuthService } from '@/features/admin/services/adminAuthService';
import { useAdminTab } from '@/features/admin/hooks/useAdminTab';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { currentTab } = useAdminTab();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminAuthService.isAuthenticated()) {
      navigate('/admin-login');
      return;
    }
    setLoading(false);
  }, [navigate]);

  if (loading) {
    return (
      <AdminThemeProvider>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            bgcolor: 'background.default',
            gap: 2,
          }}
        >
          <CircularProgress color="primary" size={36} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Loading admin panel…
          </Typography>
        </Box>
      </AdminThemeProvider>
    );
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'cr_management':
        return <CRManagement />;
      case 'students':
        return <StudentsManagement />;
      case 'teachers':
        return <TeachersManagement />;
      case 'course_list':
        return <CourseListManagement />;
      case 'question_bank':
        return <QuestionBankManagement />;
      case 'batches':
        return <BatchesManagement />;
      case 'feedback':
        return <FeedbackManagement />;
      case 'rclone':
        return <RcloneManagement />;
      case 'academic_calendar':
        return <AcademicCalendarManagement />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AdminThemeProvider>
      <AdminLayout>{renderContent()}</AdminLayout>
    </AdminThemeProvider>
  );
};

export default AdminPanel;
