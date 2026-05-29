import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isFuture, parseISO, addDays, isWithinInterval } from 'date-fns';
import {
    LayoutDashboard,
    Calendar as CalendarIcon,
    BookMarked,
    Users,
    ShieldCheck,
    UserCircle,
    Moon,
    Sun,
    LogOut,
    Bell,
    Inbox,
    CogIcon,
    Zap,
    ArrowLeftRight,
    Menu,
    X,
    WifiOff,
    ChevronRight,
    FileQuestion,
    Clock,
    MapPin,
    UserCheck,
    MessageSquare,
    UserSquare2,
    PanelLeftClose,
    PanelLeft,
    GraduationCap
} from 'lucide-react';
import { Section, AcademicRecord, Theme, AppNotification, Course, Batch, Notice, Deadline } from '@/shared/types/types';
import Dashboard from './Dashboard';
import CalendarView from './CalendarView';
import CourseView from './CourseView';
import GroupRegisterView from './GroupRegisterView';
import AdminPanel from './AdminPanel';
import NoticesView from './NoticesView';
import CRProfilesView from './CRProfilesView';
import FeedbackView from './FeedbackView';
import AcademicYearView from './AcademicYearView';
import QuestionBankView from './QuestionBankView';
import SettingsOverlay from './SettingsOverlay';
import QuickPreviewModal from './QuickPreviewModal';
import TutorialHelper from './TutorialHelper';
import StudentProfilesView from './StudentProfilesView';
import { SECTIONS } from '@/shared/utils/constants';
import { recordService } from '@/shared/services/recordService';
import { adminService } from '@/shared/services/adminService';
import { noticeService } from '@/shared/services/noticeService';
import { deadlineService } from '@/shared/services/deadlineService';
import { useAuth } from '@/app/providers/AuthProvider';
import { studentService, StudentSession } from '@/shared/services/studentService';

interface Props {
    batches: Batch[];
    selectedBatch: string | null;
    onBatchChange: (b: string | null) => void;
    selectedSection: Section | null;
    setSelectedSection: (s: Section | null) => void;
    selectedSubSection: string | null;
    setSelectedSubSection: (s: string | null) => void;
    courses: Course[];
    setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
    records: AcademicRecord[];
    setRecords: React.Dispatch<React.SetStateAction<AcademicRecord[]>>;
    notices: Notice[];
    setNotices: React.Dispatch<React.SetStateAction<Notice[]>>;
    theme: Theme;
    toggleTheme: () => void;
    fontScale: number;
    setFontScale: React.Dispatch<React.SetStateAction<number>>;
    handleLogout: () => void;
    notifications: AppNotification[];
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    deadlines: Deadline[];
    setDeadlines: React.Dispatch<React.SetStateAction<Deadline[]>>;
    initialTab?: 'dashboard' | 'calendar' | 'courses' | 'groups' | 'notices' | 'academic_year' | 'admin';
    isOffline?: boolean;
}

type AdminPanelTab = 'OVERVIEW' | 'ACADEMIC' | 'COURSES' | 'GROUPS' | 'NOTICES' | 'DEADLINES' | 'PROFILE' | 'STUDENTS';

// CR admin sub-tabs <-> URL segments, so each sub-tab is a real, shareable route.
const ADMIN_TAB_TO_URL: Record<AdminPanelTab, string> = {
    OVERVIEW: 'overview',
    ACADEMIC: 'records',
    COURSES: 'courses',
    GROUPS: 'groups',
    NOTICES: 'notices',
    DEADLINES: 'deadlines',
    PROFILE: 'profile',
    STUDENTS: 'students',
};

const URL_TO_ADMIN_TAB: Record<string, AdminPanelTab> = Object.fromEntries(
    Object.entries(ADMIN_TAB_TO_URL).map(([tab, url]) => [url, tab as AdminPanelTab])
);

const MainDashboard: React.FC<Props> = ({
    batches,
    selectedBatch,
    onBatchChange,
    selectedSection,
    setSelectedSection,
    selectedSubSection,
    setSelectedSubSection,
    courses,
    setCourses,
    records,
    setRecords,
    theme,
    toggleTheme,
    fontScale,
    setFontScale,
    handleLogout,
    notifications,
    markAsRead,
    markAllAsRead,
    notices,
    setNotices,
    deadlines,
    setDeadlines,
    isOffline = false
}) => {
    const navigate = useNavigate();
    const { tab, subId } = useParams<{ tab: string; subId?: string }>();
    const location = useLocation();
    const lastPathRef = useRef<string>('/dashboard/overview');

    // CR admin lives exclusively under /admin/*; student content under /dashboard/*.
    const isAdminRoute = location.pathname.startsWith('/admin');

    // Determine base active tab from URL or fallback
    const activeTab = useMemo(() => {
        if (isAdminRoute) return 'admin';
        const t = tab || 'dashboard';
        return t === 'overview' ? 'dashboard' : t;
    }, [tab, isAdminRoute]);

    // The CR admin panel's sub-tab is driven by the URL segment (/admin/courses → COURSES).
    const adminSubTab = useMemo<AdminPanelTab>(() => {
        if (!isAdminRoute) return 'OVERVIEW';
        return URL_TO_ADMIN_TAB[(tab || 'overview').toLowerCase()] || 'OVERVIEW';
    }, [isAdminRoute, tab]);

    // SEO: Dynamic Page Titles
    useEffect(() => {
        const baseTitle = "DIU Tracker";
        const tabTitles: Record<string, string> = {
            dashboard: "Dashboard Overview",
            calendar: "Academic Calendar",
            courses: "Course Resources",
            groups: "Lab Groups",
            question_bank: "Question Bank",
            cr_profiles: "CR Profiles",
            notices: "Announcements",
            feedback: "User Feedback",
            academic_year: "Academic Year View",
            admin: "CR Admin Panel",
            student_profiles: "Student Directory"
        };

        const pageTitle = tabTitles[activeTab] || "Student Platform";
        document.title = `${pageTitle} | ${baseTitle}`;
    }, [activeTab]);


    const { profile: userProfile } = useAuth();
    const [studentSession, setStudentSession] = useState<StudentSession | null>(() => studentService.getSession());

    useEffect(() => {
        return studentService.subscribeSession(() => {
            setStudentSession(studentService.getSession());
        });
    }, []);

    const isLoggedIn = !!userProfile || !!studentSession;
    const greetingName = userProfile?.full_name?.split(' ')[0] || studentSession?.name?.split(' ')[0];
    const [showNotifications, setShowNotifications] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSectionSwitcherOpen, setIsSectionSwitcherOpen] = useState(false);
    const [isBatchSwitcherOpen, setIsBatchSwitcherOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
    const [previewRecord, setPreviewRecord] = useState<AcademicRecord | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [runTutorial, setRunTutorial] = useState(false);
    const [isAutoTour, setIsAutoTour] = useState(false);
    const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);

    const tourSequence = ['dashboard', 'calendar', 'courses', 'groups', 'question_bank', 'academic_year', 'notices'];

    useEffect(() => {
        const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
        if (!hasSeenTutorial) {
            setTimeout(() => {
                setShowTutorialPrompt(true);
            }, 1500);
        }
    }, []);

    const startTutorial = () => {
        localStorage.setItem('hasSeenTutorial', 'true');
        setShowTutorialPrompt(false);
        setIsAutoTour(true);
        setRunTutorial(true);
    };

    const skipTutorial = () => {
        localStorage.setItem('hasSeenTutorial', 'true');
        setShowTutorialPrompt(false);
    };

    const hasAdminRole = userProfile?.is_cr && userProfile?.is_active;
    const canAccessAdmin = hasAdminRole &&
        userProfile?.batch_id === selectedBatch &&
        userProfile?.section === selectedSection;

    /** Student directory is scoped to the signed-in user's section; CRs cannot browse other sections. */
    const profileSection = userProfile?.section
        ? (userProfile.section.trim().toUpperCase() as Section)
        : null;
    const isActiveCr = Boolean(userProfile?.is_cr && userProfile?.is_active);
    const studentDirectorySection = profileSection || selectedSection!;
    const isCrDirectoryLocked = isActiveCr && Boolean(profileSection);

    useEffect(() => {
        if (!isCrDirectoryLocked || !profileSection || activeTab !== 'student_profiles') return;
        if (selectedSection !== profileSection) {
            setSelectedSection(profileSection);
        }
        if (userProfile?.batch_id && selectedBatch !== userProfile.batch_id) {
            onBatchChange(userProfile.batch_id);
        }
    }, [
        isCrDirectoryLocked,
        profileSection,
        activeTab,
        selectedSection,
        selectedBatch,
        setSelectedSection,
        onBatchChange,
        userProfile?.batch_id,
    ]);

    // Automatically restart tutorial when tab changes during an auto-tour session
    useEffect(() => {
        if (isAutoTour && runTutorial) {
            setRunTutorial(false);
            const timer = setTimeout(() => setRunTutorial(true), 600);
            return () => clearTimeout(timer);
        }
    }, [activeTab, isAutoTour]);

    const handleTutorialFinish = (skipped: boolean = false) => {
        if (skipped) {
            setRunTutorial(false);
            setIsAutoTour(false);
            return;
        }

        // If they completed the tour on the last page, we're done
        const isLastTab = activeTab === 'notices';
        if (isLastTab) {
            setRunTutorial(false);
            setIsAutoTour(false);
        }
    };


    // Sync subId to state for modals
    useEffect(() => {
        if (activeTab === 'calendar' && subId) {
            const date = new Date(subId);
            if (!isNaN(date.getTime())) {
                setSelectedDate(date);
                setIsDayDetailOpen(true);
            }
        } else if (activeTab === 'record' && subId) {
            const record = records.find(r => r.id === subId);
            if (record) setPreviewRecord(record);
        } else {
            setIsDayDetailOpen(false);
            setPreviewRecord(null);
        }
    }, [activeTab, subId, records]);

    const handleDateNavigation = (date: Date | string) => {
        const targetDate = typeof date === 'string' ? new Date(date) : date;
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        const basePath = '/dashboard';
        navigate(`${basePath}/calendar/${dateStr}`);
        setIsNotificationsOpen(false);
        setIsMobileSidebarOpen(false);
    };

    const handleNotificationClick = (n: AppNotification) => {
        markAsRead(n.id);
        const basePath = '/dashboard';
        if (n.recordType === 'Announcement') {
            navigate(`${basePath}/notices`);
        } else if (n.recordType?.includes('Deadline')) {
            navigate(`${basePath}/overview`);
        } else {
            if (n.courseId) {
                navigate(`${basePath}/courses/${n.courseId}`);
            } else {
                navigate(`${basePath}/courses`);
            }
        }
        setIsNotificationsOpen(false);
        setIsMobileSidebarOpen(false);
    };

    // Track navigation history to return to previous context after closing modals
    useEffect(() => {
        // We only save the path if it's NOT a modal route (record or notice)
        const isModalPath = activeTab === 'record' || activeTab === 'notice';
        if (!isModalPath) {
            lastPathRef.current = location.pathname;
        }
    }, [location.pathname, activeTab]);

    const handleAction = useCallback((type: 'record' | 'notice', id: string) => {
        const basePath = '/dashboard';
        navigate(`${basePath}/${type}/${id}`);
    }, [navigate, location.pathname]);

    const handleTabChange = useCallback((newTab: string) => {
        const basePath = '/dashboard';
        const routeTab = newTab === 'dashboard' ? 'overview' : newTab;

        // Always navigate to the tab root (strip sub-routes like /courses/:id).
        navigate(`${basePath}/${routeTab}`, { replace: tab === routeTab && !!subId });

        setIsNotificationsOpen(false);
        setIsBatchSwitcherOpen(false);
        setIsSectionSwitcherOpen(false);
    }, [navigate, tab, subId]);

    const handleBatchChange = useCallback((batchId: string) => {
        console.log('[MainDashboard] handleBatchChange invoked for:', batchId);
        const batchName = batches.find(b => b.id === batchId)?.name || '';
        onBatchChange(batchId);
        localStorage.setItem('selectedBatch', batchId);
        localStorage.setItem('selectedBatchName', batchName);
        setIsBatchSwitcherOpen(false);
    }, [batches, onBatchChange]);

    const navGroups = useMemo(() => [
        {
            title: 'General',
            items: [
                { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Overview', color: 'text-indigo-500', activeBg: 'bg-indigo-600' },
                { id: 'calendar', icon: <CalendarIcon size={20} />, label: 'Calendar View', color: 'text-indigo-500', activeBg: 'bg-indigo-600' },
            ]
        },
        {
            title: 'Academic',
            items: [
                { id: 'courses', icon: <BookMarked size={20} />, label: 'Course View', color: 'text-emerald-500', activeBg: 'bg-emerald-600' },
                { id: 'groups', icon: <Users size={20} />, label: 'Group List', color: 'text-emerald-500', activeBg: 'bg-emerald-600' },
                { id: 'question_bank', icon: <FileQuestion size={20} />, label: 'QuestionBank', color: 'text-emerald-500', activeBg: 'bg-emerald-600' },
            ]
        },
        {
            title: 'Officials',
            items: [
                { id: 'cr_profiles', icon: <UserCheck size={20} />, label: 'CR Profiles', color: 'text-violet-500', activeBg: 'bg-indigo-600' },
                // Only show student profiles to logged in users
                ...(userProfile ? [{ id: 'student_profiles', icon: <GraduationCap size={20} />, label: 'Student Profiles', color: 'text-violet-500', activeBg: 'bg-indigo-600' }] : []),
                { id: 'academic_year', icon: <CalendarIcon size={20} />, label: 'Academic Year', color: 'text-violet-500', activeBg: 'bg-indigo-600' },
            ]
        },
        {
            title: 'Announcements',
            items: [
                { id: 'notices', icon: <Bell size={20} />, label: 'Announcement', color: 'text-amber-500', activeBg: 'bg-amber-600' },
                { id: 'feedback', icon: <MessageSquare size={20} />, label: 'Feedback', color: 'text-amber-500', activeBg: 'bg-amber-600' },
            ]
        }

    ], []);

    // Flat version for mobile nav and lookups
    const navItems = useMemo(() => navGroups.flatMap(g => g.items), [navGroups]);



    return (
        <div className="flex h-screen h-[100dvh] bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-500 font-outfit text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30">
            {/* Mobile Sidebar Overlay (Simplified) */}
            {isMobileSidebarOpen && (
                <div
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
                />
            )}

            <SettingsOverlay
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onAdminClick={() => { setIsSettingsOpen(false); navigate('/admin/overview'); }}
                theme={theme}
                toggleTheme={toggleTheme}
                fontScale={fontScale}
                setFontScale={setFontScale}
                onLogout={handleLogout}
                isLoggedIn={isLoggedIn}
                userProfile={userProfile}
            />
            {/* Tutorial Welcome Prompt */}
            {showTutorialPrompt && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
                    <div
                        onClick={skipTutorial}
                        className="absolute inset-0 bg-slate-900/60"
                    />
                    <div
                        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-800 p-8 text-center"
                    >
                        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-4xl animate-bounce">
                            👋
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Welcome to DIU Tracker!</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed mb-8">
                            New here? We've prepared a quick 60-second interactive tour to help you master the system. Would you like to see it?
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={startTutorial}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2"
                            >
                                Need tutorial  ➔
                            </button>
                            <button
                                onClick={skipTutorial}
                                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                            >
                                Skip
                            </button>
                        </div>

                    </div>
                </div>
            )}

            <TutorialHelper
                run={runTutorial}
                onFinish={handleTutorialFinish}
                activeTab={activeTab}
                isLastPage={activeTab === 'notices' || activeTab === 'admin'}
            />

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-[150] bg-white dark:bg-slate-800 border-r border-indigo-100/30 dark:border-slate-800/80 p-6 pb-0 flex flex-col transition-all duration-300 ease-out lg:translate-x-0 lg:static shadow-2xl ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-[300px] ${isSidebarCollapsed ? 'lg:w-[100px]' : 'lg:w-[280px]'}`}>

                <div className={`flex items-center gap-4 mb-10 px-2 justify-between ${isSidebarCollapsed ? 'lg:flex-col lg:gap-8' : 'lg:justify-between'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 dark:bg-white/5 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm flex-shrink-0">
                            <img
                                src="/logo.png"
                                alt="Logo"
                                className="w-full h-full object-contain scale-110"
                            />
                        </div>

                        {!isSidebarCollapsed && (
                            <div className="hidden lg:block">
                                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">DIU</h1>
                                <p className="text-[10px] font-black text-indigo-500 tracking-[0.3em] uppercase">TRACKER</p>
                            </div>
                        )}

                        <div className="lg:hidden">
                            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">DIU</h1>
                            <p className="text-[10px] font-black text-indigo-500 tracking-[0.3em] uppercase">TRACKER</p>
                        </div>
                    </div>

                    {/* Desktop Collapse Toggle */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="hidden lg:flex p-2.5 text-slate-900 dark:text-white hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all active:scale-90"
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
                    </button>

                    {/* Close Button for Mobile */}
                    <button onClick={() => setIsMobileSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 relative min-h-0">
                    <nav className="h-full tour-sidebar overflow-y-auto pr-2 -mr-2 space-y-8 pb-10 custom-scrollbar">

                        {navGroups.map((group, gIdx) => (
                            <div key={gIdx} className="space-y-2">
                                {!isSidebarCollapsed && (
                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] px-4 mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                                        {group.title}
                                    </p>
                                )}
                                <div className="space-y-1">
                                    {group.items.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleTabChange(item.id as any)}
                                            className={`w-full flex items-center gap-4 py-3.5 px-4 rounded-2xl transition-all duration-200 group relative cursor-pointer ${activeTab === item.id ? `${item.activeBg} text-white shadow-lg` : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'} ${isSidebarCollapsed ? 'justify-center lg:px-0' : ''}`}
                                            title={isSidebarCollapsed ? item.label : ''}
                                        >
                                            <div className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'} ${activeTab !== item.id ? item.color : ''}`}>
                                                {item.icon}
                                            </div>
                                            {!isSidebarCollapsed && <span className="font-bold text-xs tracking-wide uppercase">{item.label}</span>}
                                            {activeTab === item.id && !isSidebarCollapsed && (
                                                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/40" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}


                    </nav>
                    {/* Gradient Fade to indicate scroll */}
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white dark:from-slate-800 to-transparent pointer-events-none z-10" />
                </div>
                <div className="mt-auto -mx-6 px-6 pt-6 pb-8 space-y-4 bg-slate-100/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/60 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.03)] dark:shadow-none">
                    {isSidebarCollapsed ? (
                        /* Collapsed State: Stack all buttons vertically as icon-only */
                        <div className="flex flex-col gap-3 items-center">
                            {hasAdminRole && (
                                <button
                                    onClick={() => navigate('/admin/overview')}
                                    className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] ${activeTab === 'admin' ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-lg' : 'bg-slate-900 dark:bg-slate-800 text-white shadow-sm hover:bg-slate-950 dark:hover:bg-slate-700'}`}
                                    title={canAccessAdmin ? 'Admin Panel' : 'Switch to Edit'}
                                >
                                    <ShieldCheck size={20} className={activeTab === 'admin' ? 'text-white dark:text-slate-950' : 'text-slate-200 dark:text-slate-300'} />
                                    {!canAccessAdmin && activeTab !== 'admin' && (
                                        <div className="absolute w-2 h-2 bg-amber-500 rounded-full border-2 border-white dark:border-slate-800 top-2 right-2" />
                                    )}
                                </button>
                            )}
                            <button
                                onClick={toggleTheme}
                                title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                                className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 border hover:scale-[1.05] active:scale-[0.95] ${theme === 'dark' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'}`}
                            >
                                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} className="animate-pulse" />}
                            </button>
                            {isLoggedIn ? (
                                <button
                                    onClick={handleLogout}
                                    title="Logout"
                                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-rose-500/10 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 dark:border-rose-500/30 hover:bg-rose-500/20 dark:hover:bg-rose-500/20 hover:scale-[1.05] active:scale-[0.95] transition-all duration-300"
                                >
                                    <LogOut size={20} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate('/login')}
                                    title="Login"
                                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/20 hover:scale-[1.05] active:scale-[0.95] transition-all duration-300"
                                >
                                    <ShieldCheck size={20} />
                                </button>
                            )}
                        </div>
                    ) : (
                        /* Expanded State: 2 Rows */
                        <div className="space-y-3">
                            {/* Row 1: Admin Panel (flex-1) + Theme Toggle (aspect-square) */}
                            <div className="flex gap-2 items-center">
                                {hasAdminRole ? (
                                    <>
                                        <button
                                            onClick={() => navigate('/admin/overview')}
                                            className={`flex-1 h-12 flex items-center gap-4 px-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group relative ${activeTab === 'admin' ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-lg' : 'bg-slate-900 dark:bg-slate-800 text-white shadow-md hover:bg-slate-950 dark:hover:bg-slate-700'}`}
                                        >
                                            <ShieldCheck size={20} className={activeTab === 'admin' ? 'text-white dark:text-slate-950' : 'text-slate-200 dark:text-slate-300'} />
                                            <span className="font-black text-[10px] tracking-widest uppercase truncate">
                                                {canAccessAdmin ? 'Admin Panel' : 'Switch to Edit'}
                                            </span>
                                            {!canAccessAdmin && activeTab !== 'admin' && (
                                                <div className="absolute w-2 h-2 bg-amber-500 rounded-full border-2 border-white dark:border-slate-800 top-2 right-2" />
                                            )}
                                        </button>
                                        <button
                                            onClick={toggleTheme}
                                            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                                            className={`h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-300 border hover:scale-[1.02] active:scale-[0.98] ${theme === 'dark' ? 'bg-slate-800/40 dark:bg-slate-900/50 border-slate-700/50 text-amber-500 dark:text-amber-400 hover:text-amber-300 hover:bg-slate-800/80 hover:border-slate-600' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:border-slate-300'}`}
                                        >
                                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} className="animate-pulse" />}
                                        </button>
                                    </>
                                ) : (
                                    /* If not admin role, just show Theme Toggle full-width in Row 1 */
                                    <button
                                        onClick={toggleTheme}
                                        title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                                        className={`w-full h-12 flex items-center gap-4 px-4 rounded-xl transition-all duration-300 border hover:scale-[1.02] active:scale-[0.98] ${theme === 'dark' ? 'bg-slate-800/40 dark:bg-slate-900/50 border-slate-700/50 text-amber-500 dark:text-amber-400 hover:text-amber-300 hover:bg-slate-800/80 hover:border-slate-600' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:border-slate-300'}`}
                                    >
                                        <div className="flex-shrink-0">
                                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} className="animate-pulse" />}
                                        </div>
                                        <span className="text-[10px] font-black tracking-widest uppercase truncate">
                                            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                                        </span>
                                    </button>
                                )}
                            </div>

                            {/* Row 2: Logout / Login Button (Full Width) */}
                            {isLoggedIn ? (
                                <button
                                    onClick={handleLogout}
                                    className="w-full h-12 flex items-center gap-4 px-4 rounded-xl bg-rose-500/10 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 dark:border-rose-500/30 hover:bg-rose-500/20 dark:hover:bg-rose-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                                >
                                    <LogOut size={20} />
                                    <span className="text-[10px] font-black tracking-widest uppercase truncate">
                                        {studentSession && !userProfile ? `Logout (${studentSession.name.split(' ')[0]})` : 'Logout'}
                                    </span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full h-12 flex items-center gap-4 px-4 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                                >
                                    <ShieldCheck size={20} />
                                    <span className="text-[10px] font-black tracking-widest uppercase truncate">Login</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Surface */}
            <div className="flex-1 flex flex-col min-w-0 h-screen h-[100dvh] overflow-y-auto no-scrollbar pb-32 lg:pb-0 relative">
                <header className="px-4 lg:px-8 pb-4 lg:pb-6 pt-[calc(1rem+env(safe-area-inset-top))] lg:pt-[calc(1.5rem+env(safe-area-inset-top))] flex items-center justify-between glass sticky top-0 z-50 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/90 dark:bg-slate-900/90">
                    <div className="flex items-center gap-3">
                        {/* Profile Picture / Menu Trigger */}
                        <button onClick={() => setIsMobileSidebarOpen(true)} className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all relative border border-slate-200 dark:border-slate-700">
                            <Menu size={20} />
                        </button>

                        {/* Desktop Logo */}


                        <div className="flex flex-col">
                            <h2 className="text-base lg:text-xl font-black text-slate-900 dark:text-white tracking-tight capitalize leading-none mb-1.5 pt-1">
                                {greetingName ? `Hi, ${greetingName}` : ' Dashboard'}
                            </h2>
                            <div className="flex items-center gap-3 tour-switcher">
                                {/* Batch Switcher */}
                                <div className="relative">
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsBatchSwitcherOpen(!isBatchSwitcherOpen);
                                            setIsSectionSwitcherOpen(false);
                                            setIsNotificationsOpen(false);
                                        }}
                                        className={`flex items-center gap-1 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2 py-1 -ml-2 rounded-lg transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/40`}
                                    >
                                        {batches.find(b => b.id === selectedBatch)?.name || 'Select Batch'} <ArrowLeftRight size={10} className="ml-1 opacity-50" />
                                    </div>
                                    {isBatchSwitcherOpen && (
                                        <div className="absolute left-0 mt-2 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 z-50 min-w-[160px] shadow-pro" >
                                            {batches.length === 0 ? (
                                                <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading...</div>
                                            ) : (
                                                batches.map(b => (
                                                    <button
                                                        key={b.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleBatchChange(b.id);
                                                        }}
                                                        className={`px-4 py-2 text-left rounded-xl text-xs font-black transition-all ${selectedBatch === b.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                                    >
                                                        {b.name}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                <span className="text-slate-300 dark:text-slate-700 font-light">/</span>

                                {/* Section Switcher */}
                                <div className="relative">
                                    <div
                                        onClick={() => {
                                            setIsSectionSwitcherOpen(!isSectionSwitcherOpen);
                                            setIsBatchSwitcherOpen(false);
                                            setIsNotificationsOpen(false);
                                        }}
                                        className={`flex items-center gap-1 text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] px-2 py-1 -ml-2 rounded-lg transition-all cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/30`}
                                    >
                                        Sec {selectedSection}{selectedSubSection ? ` - ${selectedSection}${selectedSubSection}` : ''} <ArrowLeftRight size={10} className="ml-1" />
                                    </div>

                                    {isSectionSwitcherOpen && (
                                        <div className="absolute left-0 mt-2 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-100 dark:border-slate-800 p-3 flex flex-col gap-3 z-50 min-w-[200px] shadow-pro">
                                            <div className="flex flex-wrap gap-1">
                                                {(isCrDirectoryLocked && profileSection
                                                    ? [profileSection]
                                                    : SECTIONS
                                                ).map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!isCrDirectoryLocked) setSelectedSection(s);
                                                        }}
                                                        disabled={isCrDirectoryLocked}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all ${selectedSection === s ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'} ${isCrDirectoryLocked ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                            {isCrDirectoryLocked && activeTab === 'student_profiles' && (
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">
                                                    CR directory: your section only
                                                </p>
                                            )}
                                            <div className="h-px bg-slate-100 dark:bg-slate-800" />
                                            <div className="flex gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedSubSection(null); setIsSectionSwitcherOpen(false); }} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!selectedSubSection ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`} > Theory </button>
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedSubSection('1'); setIsSectionSwitcherOpen(false); }} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedSubSection === '1' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`} > G1 </button>
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedSubSection('2'); setIsSectionSwitcherOpen(false); }} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedSubSection === '2' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`} > G2 </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-4">
                        {isOffline && (
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20 shadow-sm">
                                <WifiOff size={14} />
                                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Offline</span>
                            </div>
                        )}
                        <div className="relative z-[100]">
                            <button onClick={() => {
                                setIsNotificationsOpen(!isNotificationsOpen);
                                setIsBatchSwitcherOpen(false);
                                setIsSectionSwitcherOpen(false);
                            }} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all relative group" >
                                <Bell size={20} />
                                {notifications.filter(n => !n.isRead).length > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full border-2 border-white dark:border-[#020617] text-[10px] font-black flex items-center justify-center shadow-lg animate-bounce" >
                                        {notifications.filter(n => !n.isRead).length}
                                    </span>
                                )}
                            </button>
                            {isNotificationsOpen && (
                                <div
                                    className="absolute right-[-3.5rem] sm:right-0 top-full mt-4 w-[85vw] sm:w-[24rem] bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-slate-200/80 dark:border-slate-800/80 p-1.5 z-[110] overflow-hidden backdrop-blur-xl"
                                >
                                    <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20 rounded-t-[1.5rem] mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.8)]" />
                                            <h4 className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-[0.2em]">Live Feed</h4>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                                            className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-colors"
                                        >
                                            Mark all read
                                        </button>
                                    </div>
                                    <div className="max-h-[28rem] overflow-y-auto custom-scrollbar p-1.5 space-y-1.5">
                                        {notifications.length === 0 ? (
                                            <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wide flex flex-col items-center gap-3">
                                                <Bell size={24} className="text-slate-300 dark:text-slate-600" />
                                                No new notifications
                                            </div>
                                        ) : (
                                            notifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    className={`p-4 rounded-[1.25rem] transition-all cursor-pointer relative group/item border flex gap-4 overflow-hidden ${n.isRead ? 'bg-slate-50 dark:bg-slate-900/40 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800' : 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-500/20 shadow-lg shadow-indigo-500/5'}`}
                                                    onClick={() => {
                                                        handleNotificationClick(n);
                                                    }}
                                                >
                                                    {!n.isRead && (
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_12px_rgba(79,70,229,0.8)]" />
                                                    )}

                                                    <div className={`w-12 h-12 rounded-[1.1rem] flex items-center justify-center flex-shrink-0 transition-colors ${n.isRead ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 border border-indigo-100 dark:border-indigo-500/20'}`}>
                                                        {n.recordType === 'Announcement' ? <Bell size={20} /> : n.recordType?.includes('Deadline') ? <CalendarIcon size={20} /> : <BookMarked size={20} />}
                                                    </div>

                                                    <div className="flex-1 min-w-0 py-0.5">
                                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${n.isRead ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : 'bg-indigo-500 text-white shadow-sm'}`}>
                                                                {n.recordType}
                                                            </span>
                                                            <span className={`text-[9px] font-bold uppercase tracking-widest whitespace-nowrap ${n.isRead ? 'text-slate-400' : 'text-indigo-400'}`}>
                                                                {n.timestamp}
                                                            </span>
                                                        </div>

                                                        <p className={`text-xs sm:text-sm font-black truncate leading-tight ${n.isRead ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                                            {n.title}
                                                        </p>

                                                        {(n.courseName || n.courseCode || n.time || n.room) && (
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
                                                                {(n.courseName || n.courseCode) && (
                                                                    <div className="flex items-center gap-1 min-w-0">
                                                                        <BookMarked size={10} className="text-slate-400 flex-shrink-0" />
                                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{n.courseName || n.courseCode}</span>
                                                                    </div>
                                                                )}
                                                                {n.time && (
                                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                                        <Clock size={10} className="text-indigo-400" />
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase">{n.time}</span>
                                                                    </div>
                                                                )}
                                                                {n.room && (
                                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                                        <MapPin size={10} className="text-rose-400" />
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase">Room {n.room}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button onClick={() => setIsSettingsOpen(true)} className="tour-settings w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all group" >
                            <CogIcon size={20} />
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${activeTab}_${selectedSection}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'dashboard' && (
                                <Dashboard
                                    courses={courses}
                                    notices={notices}
                                    deadlines={deadlines}
                                    onAction={(tab, subId) => {
                                        const basePath = '/dashboard';
                                        const routeTab = tab === 'dashboard' ? 'overview' : tab;
                                        if (subId && tab === 'courses') {
                                            navigate(`${basePath}/courses/${subId}`);
                                        } else {
                                            navigate(`${basePath}/${routeTab}`);
                                        }
                                    }}
                                    onDateSelect={handleDateNavigation}
                                    userProfile={userProfile ? { section: userProfile.section, sub_section: userProfile.sub_section || undefined } : (selectedSection ? { section: selectedSection, sub_section: selectedSubSection || undefined } : undefined)}
                                    batchId={selectedBatch!}
                                    section={selectedSection!}
                                />
                            )}
                            {activeTab === 'calendar' && (
                                <CalendarView
                                    records={records}
                                    courses={courses}
                                    deadlines={deadlines}
                                    section={selectedSection!}
                                    batchId={selectedBatch!}
                                    selectedDate={selectedDate}
                                    onDateSelect={handleDateNavigation}
                                    isDayDetailOpen={isDayDetailOpen}
                                    setIsDayDetailOpen={(open) => {
                                        if (!open) {
                                            const basePath = '/dashboard';
                                            navigate(`${basePath}/calendar`);
                                        }
                                        setIsDayDetailOpen(open);
                                    }}
                                    onAction={handleAction}
                                />
                            )}
                            {activeTab === 'courses' && (
                                <CourseView
                                    courses={courses}
                                    records={records}
                                    section={selectedSection!}
                                    batchId={selectedBatch!}
                                    userSubSection={selectedSubSection || undefined}
                                    onAction={handleAction}
                                    deadlines={deadlines}
                                    subId={subId}
                                    onCourseSelect={(courseId) => {
                                        const basePath = '/dashboard';
                                        if (courseId) {
                                            navigate(`${basePath}/courses/${courseId}`);
                                        } else {
                                            navigate(`${basePath}/courses`);
                                        }
                                    }}
                                />
                            )}
                            {activeTab === 'groups' && <GroupRegisterView courses={courses} section={selectedSection} userSubSection={selectedSubSection || undefined} batchId={selectedBatch!} />}
                            {activeTab === 'question_bank' && <QuestionBankView />}
                            {activeTab === 'cr_profiles' && (
                                <CRProfilesView
                                    batchId={selectedBatch!}
                                    section={selectedSection!}
                                />
                            )}
                            {activeTab === 'notices' && (
                                <NoticesView
                                    notices={notices}
                                    courses={courses}
                                    onDateSelect={handleDateNavigation}
                                    batchId={selectedBatch!}
                                    section={selectedSection!}
                                    subSection={selectedSubSection}
                                />
                            )}
                            {activeTab === 'feedback' && (
                                <FeedbackView
                                    batchId={selectedBatch!}
                                    section={selectedSection!}
                                    userProfile={userProfile}
                                    isCr={Boolean(userProfile?.is_cr && userProfile?.is_active)}
                                />
                            )}
                            {activeTab === 'academic_year' && (
                                <AcademicYearView />
                            )}
                            {activeTab === 'student_profiles' && userProfile && (
                                <StudentProfilesView
                                    batchId={userProfile.batch_id || selectedBatch!}
                                    section={studentDirectorySection}
                                    isSectionLocked={isCrDirectoryLocked}
                                />
                            )}
                            {activeTab === 'admin' && (
                                canAccessAdmin ? (
                                    <AdminPanel
                                        courses={courses}
                                        records={records}
                                        notices={notices}
                                        deadlines={deadlines}
                                        section={selectedSection!}
                                        batchId={selectedBatch!}
                                        initialTab={adminSubTab}
                                        onTabChange={(t) => navigate(`/admin/${ADMIN_TAB_TO_URL[t as AdminPanelTab] || 'overview'}`)}
                                        onAddRecord={async (r: any) => {
                                            // 1. Separate attachments from the record data
                                            const { attachments, ...recordData } = r;

                                            // 2. Add the record
                                            const newRecord = await recordService.addRecord({
                                                ...recordData,
                                                created_by: userProfile?.id
                                            });

                                            // 3. Add Attachments if present
                                            let addedAttachments: any[] = [];
                                            if (attachments && attachments.length > 0) {
                                                const attachmentPromises = attachments
                                                    .filter((att: any) => att.url && att.name)
                                                    .map((att: any) =>
                                                        recordService.addAttachment({
                                                            record_id: newRecord.id,
                                                            name: att.name,
                                                            type: att.type,
                                                            url: att.url,
                                                            public_id: att.drive_file_id || att.public_id,
                                                            rclone_account_id: att.rclone_account_id ?? null,
                                                        })
                                                    );
                                                addedAttachments = await Promise.all(attachmentPromises);
                                            }

                                            // 4. Update local state with the complete record
                                            const completeRecord = { ...newRecord, attachments: addedAttachments };
                                            setRecords(prev => [completeRecord, ...prev]);
                                        }}
                                        onUpdateRecord={async (id, updates: any) => {
                                            const { attachments, ...recordData } = updates;
                                            await recordService.updateRecord(id, recordData);

                                            if (attachments) {
                                                const currentRecord = records.find(r => r.id === id);
                                                const currentAtts = currentRecord?.attachments || [];

                                                // 1. Delete removed attachments concurrently
                                                const deletePromises = currentAtts
                                                    .filter(oldAtt => !attachments.find((a: any) => a.url === oldAtt.url))
                                                    .map(oldAtt => recordService.deleteAttachment(oldAtt.id));

                                                // 2. Add new attachments concurrently
                                                const addPromises = attachments
                                                    .filter((newAtt: any) => !currentAtts.find(a => a.url === newAtt.url))
                                                    .map((newAtt: any) =>
                                                        recordService.addAttachment({
                                                            record_id: id,
                                                            name: newAtt.name,
                                                            type: newAtt.type,
                                                            url: newAtt.url,
                                                            public_id: newAtt.drive_file_id || newAtt.public_id,
                                                            rclone_account_id: newAtt.rclone_account_id ?? null,
                                                        })
                                                    );

                                                await Promise.all([...deletePromises, ...addPromises]);
                                            }
                                            const data = await recordService.fetchRecords(selectedBatch!, selectedSection!, selectedSubSection || undefined);
                                            setRecords(data);
                                        }}
                                        onDeleteRecord={async (id) => {
                                            await recordService.deleteRecord(id);
                                            setRecords(prev => prev.filter(r => r.id !== id));
                                        }}
                                        onAddCourse={(c) => {
                                            setCourses(prev => [...prev, c]);
                                        }}
                                        onUpdateCourse={async (id, updates) => {
                                            await adminService.updateCourse(id, updates);
                                            setCourses(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
                                        }}
                                        onDeleteCourse={async (id) => {
                                            await adminService.deleteCourse(id);
                                            setCourses(prev => prev.filter(c => c.id !== id));
                                        }}
                                        onAddNotice={async (n) => {
                                            const added = await noticeService.addNotice({
                                                ...n,
                                                created_by: userProfile?.id
                                            });
                                            setNotices(prev => [added, ...prev]);
                                        }}
                                        onUpdateNotice={async (id, updates) => {
                                            await noticeService.updateNotice(id, updates);
                                            setNotices(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
                                        }}
                                        onDeleteNotice={async (id) => {
                                            await noticeService.deleteNotice(id);
                                            setNotices(prev => prev.filter(n => n.id !== id));
                                        }}
                                        onAddDeadline={async (d) => {
                                            const added = await deadlineService.addDeadline({
                                                ...d,
                                                batch_id: selectedBatch!,
                                                section: selectedSection || undefined,
                                                sub_section: selectedSubSection || undefined,
                                                created_by: userProfile?.id
                                            });
                                            setDeadlines(prev => [...prev, added].sort((a, b) => a.date.localeCompare(b.date)));
                                        }}
                                        onUpdateDeadline={async (id, updates) => {
                                            await deadlineService.updateDeadline(id, updates);
                                            setDeadlines(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d).sort((a, b) => a.date.localeCompare(b.date)));
                                        }}
                                        onDeleteDeadline={async (id) => {
                                            await deadlineService.deleteDeadline(id);
                                            setDeadlines(prev => prev.filter(d => d.id !== id));
                                        }}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[3rem]">
                                        <div className="relative mb-6">
                                            <ShieldCheck size={64} className="text-slate-200 dark:text-slate-800" />
                                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full border-4 border-white dark:border-[#0b0f1a] flex items-center justify-center shadow-lg" >
                                                <CogIcon size={10} className="text-white animate-spin-slow" />
                                            </motion.div>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Access Restricted</h3>
                                        <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">
                                            {userProfile?.batch_id && userProfile.batch_id !== selectedBatch ? (
                                                <>You are viewing a different batch than your assigned batch. Switch to your batch and section to edit.</>
                                            ) : (
                                                <>You are viewing <span className="text-indigo-500 font-bold">Section {selectedSection}</span>, but you only have editing rights for <span className="text-emerald-500 font-bold">Section {userProfile?.section || '—'}</span>.</>
                                            )}
                                        </p>
                                        <div className="flex flex-col gap-3 w-full max-w-[200px]">
                                            <button
                                                onClick={() => {
                                                    if (userProfile?.section) setSelectedSection(userProfile.section);
                                                    if (userProfile?.batch_id) onBatchChange(userProfile.batch_id);
                                                }}
                                                className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 active-glow"
                                            >
                                                Return to my section
                                            </button>
                                            <button onClick={() => handleTabChange('dashboard')} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Go to Overview</button>
                                        </div>
                                    </div>
                                )
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            <nav className="lg:hidden fixed bottom-6 left-6 right-6 z-[100] bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2rem] p-2 flex items-center justify-between shadow-2xl shadow-slate-900/10">
                {navItems.filter(item => item.id !== 'academic_year' && item.id !== 'groups' && item.id !== 'cr_profiles' && item.id !== 'feedback' && item.id !== 'teacher_profiles' && item.id !== 'student_profiles').map(item => (
                    <button
                        key={item.id}
                        onClick={() => handleTabChange(item.id as any)}
                        className={`flex-1 relative flex flex-col items-center justify-center gap-1 py-3 rounded-[1.5rem] transition-all duration-300 cursor-pointer ${activeTab === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
                    >
                        {activeTab === item.id && (
                            <motion.div
                                layoutId="mobileTabBg"
                                className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-[1.5rem]"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">
                            {React.cloneElement(item.icon as any, { size: 20, strokeWidth: activeTab === item.id ? 2.5 : 2 })}
                        </span>
                    </button>
                ))}

                {hasAdminRole ? (
                    <button
                        onClick={() => navigate('/admin/overview')}
                        className={`flex-1 relative flex flex-col items-center justify-center gap-1 py-3 rounded-[1.5rem] transition-all duration-300 cursor-pointer ${activeTab === 'admin' ? 'text-emerald-600' : 'text-slate-400 dark:text-slate-500'}`}
                    >
                        {activeTab === 'admin' && (
                            <motion.div
                                layoutId="mobileTabBg"
                                className="absolute inset-0 bg-emerald-50 dark:bg-emerald-500/10 rounded-[1.5rem]"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <ShieldCheck size={20} className="relative z-10" strokeWidth={activeTab === 'admin' ? 2.5 : 2} />
                    </button>
                ) : (
                    <button
                        onClick={() => navigate('/login')}
                        className="flex-1 relative flex flex-col items-center justify-center gap-1 py-3 rounded-[1.5rem] text-slate-400 dark:text-slate-500 hover:text-indigo-500 transition-colors"
                    >
                        <UserCircle size={20} />
                    </button>
                )}
            </nav>

            {/* Quick Record Preview for deep-linked records */}
            <AnimatePresence>
                {previewRecord && (
                    <QuickPreviewModal
                        record={previewRecord}
                        courseName={courses.find(c => c.id === previewRecord?.course_id)?.name}
                        isOpen={!!previewRecord}
                        onClose={() => {
                            setPreviewRecord(null);
                            const currentTab = activeTab; // Capture current tab state

                            // If we have a stored last path, go there
                            if (lastPathRef.current && lastPathRef.current !== location.pathname) {
                                navigate(lastPathRef.current);
                            } else {
                                // Fallback: just go back to the base tab
                                const basePath = '/dashboard';
                                const fallbackTab = (currentTab === 'record' || currentTab === 'notice') ? 'overview' : currentTab;
                                navigate(`${basePath}/${fallbackTab}`);
                            }
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default MainDashboard;
