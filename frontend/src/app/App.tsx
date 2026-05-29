import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Section, AcademicRecord, Theme, Course, Batch, Notice, Deadline, EntryType } from '@/shared/types/types';
import { recordService } from '@/shared/services/recordService';
import { courseService } from '@/shared/services/courseService';
import { noticeService } from '@/shared/services/noticeService';
import { deadlineService } from '@/shared/services/deadlineService';
import { apiClient } from '@/shared/services/apiClient';
import { useAuth } from '@/app/providers/AuthProvider';
import SplashScreen from '@/shared/components/SplashScreen';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import MainDashboard from '@/shared/components/MainDashboard';
import LoginPage from '@/pages/LoginPage';
import SectionSelector from '@/shared/components/SectionSelector';

// Lazy-loaded routes — keep them out of the initial bundle for faster first paint.
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'));
const PendingApprovalPage = lazy(() => import('@/pages/PendingApprovalPage'));
const AdminLoginPage = lazy(() => import('@/pages/AdminLoginPage'));
const AdminPanel = lazy(() => import('@/pages/AdminPanel'));
import { Network } from '@capacitor/network';
import { App as CapacitorApp } from '@capacitor/app';
import { Dialog } from '@capacitor/dialog';
import ExitConfirmation from '@/shared/components/ExitConfirmation';
import GlobalDialog from '@/shared/components/GlobalDialog';
import { initPushNotifications } from '@/shared/services/PushNotificationService';
import { studentService } from '@/shared/services/studentService';
import { authService } from '@/shared/services/authService';
import { academicCalendarService } from '@/shared/services/academicCalendarService';
import type { AcademicCalendarData } from '@/shared/lib/academicCalendarUtils';
const App: React.FC = () => {
  useEffect(() => {
    // Using dynamic import to prevent build-time resolution errors on Vercel
    import('@vercel/analytics').then(({ inject }) => {
      inject();
    }).catch(err => {
      console.warn('Vercel Analytics could not be loaded during build:', err);
    });
  }, []);

  const { profile, logout: authLogout } = useAuth();
  const [showSplash, setShowSplash] = useState(() => {
    const path = window.location.pathname;
    return path === '/' || path === '/dashboard' || path === '/dashboard/overview';
  });
  const [isOffline, setIsOffline] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(() => {
    return localStorage.getItem('selectedBatch') || null;
  });
  const [selectedSection, setSelectedSection] = useState<Section | null>(() => {
    return (localStorage.getItem('selectedSection') as Section) || null;
  });
  const [selectedSubSection, setSelectedSubSection] = useState<string | null>(() => {
    return localStorage.getItem('selectedSubSection') || null;
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [academicCalendar, setAcademicCalendar] = useState<AcademicCalendarData | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'light';
  });
  const [fontScale, setFontScale] = useState<number>(() => {
    return parseInt(localStorage.getItem('fontScale') || '25', 10);
  });
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('readNotificationIds') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const navigate = useNavigate();

  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.warn('Audio play blocked:', e));
  };

  // Network Status Monitoring
  useEffect(() => {
    const initNetwork = async () => {
      const status = await Network.getStatus();
      setIsOffline(!status.connected);
    };
    initNetwork();

    const handler = Network.addListener('networkStatusChange', status => {
      setIsOffline(!status.connected);
      if (status.connected) {
        // Refresh data when net comes back
        if (selectedBatch) {
          recordService.fetchRecords(selectedBatch, selectedSection || 'A').then(setRecords);
          courseService.fetchCourses(selectedBatch, selectedSection || undefined).then(setCourses);
          noticeService.fetchNotices(selectedBatch, selectedSection || undefined).then(setNotices);
          deadlineService.fetchDeadlines(selectedBatch).then(setDeadlines);
        }
      }
    });

    return () => {
      handler.then(h => h.remove());
    };
  }, [selectedBatch, selectedSection]);

  // Handle Android Hardware Back Button
  const lastBackPress = React.useRef<number>(0);
  useEffect(() => {
    const backButtonListener = CapacitorApp.addListener('backButton', async (event) => {
      const currentPath = window.location.pathname;
      const now = Date.now();
      
      // Determine if we are on a "Root" level page where back should exit
      const isRootLevel = currentPath === '/' || 
                          currentPath.startsWith('/dashboard') || 
                          currentPath.startsWith('/admin') ||
                          currentPath === '/login' || 
                          currentPath === '/admin-login' ||
                          currentPath === '/signup' ||
                          currentPath === '/pending-approval';

      // If user taps twice quickly (within 2 seconds)
      if (now - lastBackPress.current < 2000) {
        setIsExitModalOpen(true);
        lastBackPress.current = 0; // Reset
      } else {
        lastBackPress.current = now;
        
        // If there is history and we are NOT on a main landing page, go back
        if (event.canGoBack && !['/dashboard/overview', '/admin', '/login', '/'].includes(currentPath)) {
          window.history.back();
        } else {
          // If we are on a main page, we just wait for the second tap to exit
          console.log('Press back again to exit DIU Tracker');
        }
      }
    });

    // Handle Deep Links (for Password Recovery)
    const urlOpenListener = CapacitorApp.addListener('appUrlOpen', (data) => {
      // Extract the path and query from the full URL
      // recovery links usually look like: com.diucse.academictracker://reset-password?token=xxx
      // or standard https if using App Links
      try {
        const url = new URL(data.url);
        const path = url.pathname + url.search;
        
        // If it's a reset password link, navigate to it
        if (data.url.includes('reset-password')) {
          navigate('/reset-password' + url.search);
        }
      } catch (e) {
        // Fallback for custom schemes that URL constructor might not handle perfectly
        if (data.url.includes('reset-password')) {
          const searchIndex = data.url.indexOf('?');
          const search = searchIndex !== -1 ? data.url.substring(searchIndex) : '';
          navigate('/reset-password' + search);
        }
      }
    });

    return () => {
      backButtonListener.then(l => l.remove());
      urlOpenListener.then(l => l.remove());
    };
  }, []);

  // Load Initial Data (Batches)
  useEffect(() => {
    apiClient.get<Batch[]>('/batches').then(result => {
      if (result.data) setBatches(result.data);
    });
  }, []);

  // Sync with Profile when it changes
  useEffect(() => {
    if (profile) {
      // For CR/Student: sync their batch/section from profile
      if (profile.is_cr && profile.is_active) {
        setSelectedBatch(profile.batch_id);
        setSelectedSection(profile.section);
        setSelectedSubSection(profile.sub_section || null);
        localStorage.setItem('selectedBatch', profile.batch_id);
        localStorage.setItem('selectedBatchName', (profile as any).batches?.name || '');
        localStorage.setItem('selectedSection', profile.section);
        if (profile.sub_section) localStorage.setItem('selectedSubSection', profile.sub_section);
      }
    }
  }, [profile, batches]);

  // Theme Management
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // 25 is default (100% / 16px). 0 is 80% (12.8px), 100 is 120% (19.2px)
    const scaleFactor = 0.8 + (fontScale / 100) * 0.4;
    document.documentElement.style.fontSize = `${scaleFactor * 100}%`;
    localStorage.setItem('fontScale', fontScale.toString());
  }, [fontScale]);

  useEffect(() => {
    localStorage.setItem('readNotificationIds', JSON.stringify(readIds));
  }, [readIds]);

  // Records Sync
  useEffect(() => {
    if (selectedSection && selectedBatch) {
      // 1. Optimistic Cache Load (Instant UI)
      try {
        const cacheKey = `diu_tracker_cache_records_${JSON.stringify({ batchId: selectedBatch, section: selectedSection, subSection: selectedSubSection || undefined })}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) setRecords(JSON.parse(cachedData));
      } catch (e) { console.warn('Cache read error', e); }

      // 2. Network Fetch
      const load = async () => {
        const data = await recordService.fetchRecords(selectedBatch, selectedSection, selectedSubSection || undefined);
        setRecords(data);
        try {
          const cacheKey = `diu_tracker_cache_records_${JSON.stringify({ batchId: selectedBatch, section: selectedSection, subSection: selectedSubSection || undefined })}`;
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) { console.warn('Cache write error', e); }
      };
      load();
      
      // Initialize Push Notifications
      initPushNotifications(profile?.id, selectedBatch, selectedSection);

      // Realtime disabled for local API - can be added via WebSocket later
    }
  }, [selectedBatch, selectedSection, selectedSubSection]);

  useEffect(() => {
    academicCalendarService.fetch().then(setAcademicCalendar);
  }, []);

  useEffect(() => {
    if (!selectedBatch) return;
      // 1. Optimistic Cache Load (Instant UI)
      try {
        const coursesKey = `diu_tracker_cache_courses_${JSON.stringify({ batchId: selectedBatch, section: selectedSection || undefined })}`;
        const cachedCourses = localStorage.getItem(coursesKey);
        if (cachedCourses) setCourses(JSON.parse(cachedCourses));

        const params = { batchId: selectedBatch, section: selectedSection || undefined, subSection: selectedSubSection || undefined };
        
        const noticesKey = `diu_tracker_cache_notices_${JSON.stringify(params)}`;
        const cachedNotices = localStorage.getItem(noticesKey);
        if (cachedNotices) setNotices(JSON.parse(cachedNotices));

        const deadlinesKey = `diu_tracker_cache_deadlines_${JSON.stringify(params)}`;
        const cachedDeadlines = localStorage.getItem(deadlinesKey);
        if (cachedDeadlines) setDeadlines(JSON.parse(cachedDeadlines));
      } catch (e) { console.warn('Cache read error', e); }

      // 2. Network Fetch (Background Sync)
      courseService.fetchCourses(selectedBatch, selectedSection || undefined).then(setCourses);
      noticeService.fetchNotices(selectedBatch, selectedSection || undefined, selectedSubSection || undefined).then(setNotices);
      deadlineService.fetchDeadlines(selectedBatch, selectedSection || undefined, selectedSubSection || undefined).then(data => {
        setDeadlines(data);
      });
  }, [selectedBatch, selectedSection, selectedSubSection]);

  const notifications = useMemo(() => {
    const recordNotifs = records.map(r => {
      const course = courses.find(c => c.id === r.course_id);
      const originalDate = r.created_at || r.date || new Date().toISOString();
      // Check if record type is CT or MID for urgent notification
      const isUrgentType = r.type === EntryType.CT || r.type === EntryType.MID;
      return {
        id: r.id,
        title: r.title,
        message: r.description || `New ${r.type} published for Section ${selectedSection}.`,
        type: (isUrgentType ? 'urgent' : 'info') as 'info' | 'success' | 'warning' | 'urgent',
        timestamp: r.date,
        sortDate: new Date(originalDate).getTime(),
        isRead: readIds.includes(r.id),
        courseId: r.course_id,
        courseName: course?.name,
        courseCode: course?.code,
        recordType: r.type,
        time: r.time,
        room: r.room
      };
    });

    const noticeNotifs = notices.map(n => {
      const originalDate = n.created_at || new Date().toISOString();
      const formattedDate = originalDate.split('T')[0];
      return {
        id: n.id,
        title: n.title,
        message: n.content || `New Announcement published.`,
        type: (n.priority === 'urgent' || n.priority === 'high' ? 'urgent' : 'info') as 'info' | 'success' | 'warning' | 'urgent',
        timestamp: formattedDate,
        sortDate: new Date(originalDate).getTime(),
        isRead: readIds.includes(n.id),
        courseId: undefined,
        courseName: undefined,
        courseCode: undefined,
        recordType: 'Announcement',
        time: undefined,
        room: undefined
      };
    });

    const deadlineNotifs = deadlines.map(d => {
      const course = courses.find(c => c.id === d.course_id);
      const originalDate = d.created_at || d.date || new Date().toISOString();
      return {
        id: d.id,
        title: d.title,
        message: d.description || `New Deadline added.`,
        type: 'warning' as 'info' | 'success' | 'warning' | 'urgent',
        timestamp: d.date,
        sortDate: new Date(originalDate).getTime(),
        isRead: readIds.includes(d.id),
        courseId: d.course_id || undefined,
        courseName: course?.name,
        courseCode: course?.code,
        recordType: d.type || 'Deadline',
        time: undefined,
        room: undefined
      };
    });

    return [...recordNotifs, ...noticeNotifs, ...deadlineNotifs]
      .sort((a, b) => b.sortDate - a.sortDate)
      .slice(0, 15);
  }, [records, notices, deadlines, selectedSection, readIds, courses]);

  const markAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      setReadIds(prev => [...prev, id]);
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(prev => Array.from(new Set([...prev, ...allIds])));
  };

  const handleLogout = async () => {
    await studentService.logout();
    try {
      if (authService.isAuthenticated()) {
        await authLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      navigate('/dashboard');
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }


  return (
    <>
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      }
    >
    <Routes>
      {/* Auth Public Routes */}
      <Route path="/login" element={profile?.is_cr && profile?.is_active ? <Navigate to="/admin/overview" /> : <LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/pending-approval" element={profile?.is_cr && profile?.is_active ? <Navigate to="/admin/overview" /> : <PendingApprovalPage />} />

      {/* Main App Routes */}
      <Route path="/dashboard" element={
        (!selectedSection || !selectedBatch) ? (
          <SectionSelector
            batches={batches}
            onSelect={(bId, s, sub) => {
              const bName = batches.find(batch => batch.id === bId)?.name || '';
              setSelectedBatch(bId);
              localStorage.setItem('selectedBatch', bId);
              localStorage.setItem('selectedBatchName', bName);
              setSelectedSection(s);
              localStorage.setItem('selectedSection', s);
              if (sub) {
                setSelectedSubSection(sub);
                localStorage.setItem('selectedSubSection', sub);
              }
            }}
          />
        ) : (
          <MainDashboard
            batches={batches}
            selectedBatch={selectedBatch}
            onBatchChange={(b) => {
              setSelectedBatch(b);
              if (b) {
                localStorage.setItem('selectedBatch', b);
                const name = batches.find(item => item.id === b)?.name || '';
                localStorage.setItem('selectedBatchName', name);
              }
            }}
            selectedSection={selectedSection}
            setSelectedSection={(s) => { setSelectedSection(s); if (s) localStorage.setItem('selectedSection', s); }}
            selectedSubSection={selectedSubSection}
            setSelectedSubSection={(s) => { setSelectedSubSection(s); if (s) localStorage.setItem('selectedSubSection', s); else localStorage.removeItem('selectedSubSection'); }}
            courses={courses}
            setCourses={setCourses}
            records={records}
            setRecords={setRecords}
            notices={notices}
            setNotices={setNotices}
            deadlines={deadlines}
            setDeadlines={setDeadlines}
            academicCalendar={academicCalendar}
            theme={theme}
            toggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            fontScale={fontScale}
            setFontScale={setFontScale}
            handleLogout={handleLogout}
            notifications={notifications as any}
            markAsRead={markAsRead}
            markAllAsRead={markAllAsRead}
            isOffline={isOffline}
          />
        )
      }>
        <Route path=":tab" element={<div />} />
        <Route path=":tab/:subId" element={<div />} />
        <Route index element={<Navigate to="overview" replace />} />
      </Route>

      {/* Private Admin Route */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={
          <MainDashboard
            batches={batches}
            selectedBatch={selectedBatch}
            onBatchChange={(b) => {
              setSelectedBatch(b);
              if (b) {
                localStorage.setItem('selectedBatch', b);
                const name = batches.find(item => item.id === b)?.name || '';
                localStorage.setItem('selectedBatchName', name);
              }
            }}
            selectedSection={selectedSection}
            setSelectedSection={(s) => { setSelectedSection(s); if (s) localStorage.setItem('selectedSection', s); }}
            selectedSubSection={selectedSubSection}
            setSelectedSubSection={(s) => { setSelectedSubSection(s); if (s) localStorage.setItem('selectedSubSection', s); else localStorage.removeItem('selectedSubSection'); }}
            courses={courses}
            setCourses={setCourses}
            records={records}
            setRecords={setRecords}
            notices={notices}
            setNotices={setNotices}
            deadlines={deadlines}
            setDeadlines={setDeadlines}
            academicCalendar={academicCalendar}
            theme={theme}
            toggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            fontScale={fontScale}
            setFontScale={setFontScale}
            handleLogout={handleLogout}
            notifications={notifications as any}
            markAsRead={markAsRead}
            markAllAsRead={markAllAsRead}
            isOffline={isOffline}
          />
        }>
          <Route path=":tab" element={<div />} />
          <Route path=":tab/:subId" element={<div />} />
          <Route index element={<Navigate to="overview" replace />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard/overview" replace />} />
      <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />

      {/* Admin Portal Routes */}
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route path="/admin-panel" element={<Navigate to="/admin-panel/dashboard" replace />} />
      <Route path="/admin-panel/:tab" element={<AdminPanel />} />
    </Routes>
    </Suspense>

      <ExitConfirmation 
        isOpen={isExitModalOpen} 
        onConfirm={() => CapacitorApp.exitApp()} 
        onCancel={() => setIsExitModalOpen(false)} 
      />
      <GlobalDialog />
    </>
  );
};

export default App;
