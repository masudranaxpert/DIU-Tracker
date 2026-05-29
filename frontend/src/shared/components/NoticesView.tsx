import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Info, AlertTriangle, Zap, Clock, ChevronDown, BookOpen, Calendar, Filter, ShieldAlert, Layers } from 'lucide-react';
import NativeSelect from './NativeSelect';
import { useAuth } from '@/app/providers/AuthProvider';
import { studentService, StudentSession } from '@/shared/services/studentService';
import SectionAccessUnlock from './SectionAccessUnlock';
import { Notice, Course, Section } from '@/shared/types/types';
import { format, parseISO, isFuture, isPast, isToday } from 'date-fns';
import { resolveMediaUrl } from '@/shared/utils/mediaUrl';

interface Props {
    notices: Notice[];
    courses: Course[];
    onDateSelect?: (date: Date | string) => void;
    batchId: string;
    section: Section;
    subSection?: string | null;
}

const PRIORITY_COLORS = {
    low: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    normal: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
    high: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    urgent: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
};

const PRIORITY_ICONS = {
    low: <Info size={16} />,
    normal: <Bell size={16} />,
    high: <AlertTriangle size={16} />,
    urgent: <Zap size={16} className="fill-current" />,
};

const NoticesView: React.FC<Props> = ({ notices, courses, onDateSelect, batchId, section, subSection }) => {
    const { profile: crProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'active' | 'expired'>('overview');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [courseFilter, setCourseFilter] = useState<string>('all');
    const [isLocked, setIsLocked] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    // PIN Security Check
    React.useEffect(() => {
        const checkSecurity = async () => {
            setIsVerifying(true);
            try {
                setIsLocked(await studentService.isSectionLocked(batchId, section, crProfile));
            } catch (e) {
                console.error('Security check failed:', e);
            } finally {
                setIsVerifying(false);
            }
        };
        checkSecurity();
        return studentService.subscribeSession(() => {
            checkSecurity();
        });
    }, [batchId, section, crProfile?.id, crProfile?.batch_id, crProfile?.section]);

    const handleUnlocked = (_session: StudentSession) => {
        setIsLocked(false);
    };

    // Performance: Memoize filtered notices
    const { activeNotices, expiredNotices, noticesCourses } = useMemo(() => {
        const active = notices.filter(n => {
            if (!n.expires_at) return true;
            const expDate = parseISO(n.expires_at);
            return !isPast(expDate) || isToday(expDate);
        });
        const expired = notices.filter(n => {
            if (!n.expires_at) return false;
            const expDate = parseISO(n.expires_at);
            return isPast(expDate) && !isToday(expDate);
        });
        const uniqueCourseIds = Array.from(new Set(notices.map(n => n.course_id).filter(Boolean)));
        const relevantCourses = uniqueCourseIds
            .map(id => courses.find(c => c.id === id))
            .filter(Boolean) as Course[];

        return { activeNotices: active, expiredNotices: expired, noticesCourses: relevantCourses };
    }, [notices, courses]);

    const displayedNotices = useMemo(() => {
        let base = activeTab === 'active' ? activeNotices : activeTab === 'expired' ? expiredNotices : notices;
        if (courseFilter !== 'all') {
            base = base.filter(n => n.course_id === courseFilter);
        }
        return base;
    }, [activeTab, activeNotices, expiredNotices, notices, courseFilter]);

    return (
        <div className="space-y-6 pb-24">
            {/* Header Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] dark:opacity-[0.05]">
                    <Bell size={120} />
                </div>

                <div className="flex flex-col gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-amber-500 rounded-[1.2rem] flex items-center justify-center text-white shadow-xl shadow-amber-500/20">
                            <Bell size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Notice Board</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Updates & Announcements</p>
                        </div>
                    </div>

                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                        <div className="px-5 py-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex-shrink-0">
                            <span className="block text-xl font-black text-indigo-600 dark:text-indigo-400">{notices.length}</span>
                            <span className="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest">Total</span>
                        </div>
                        <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex-shrink-0">
                            <span className="block text-xl font-black text-emerald-600 dark:text-emerald-400">{activeNotices.length}</span>
                            <span className="text-[9px] font-black text-emerald-400/80 uppercase tracking-widest">Active</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4">
                {/* Tabs */}
                <div className="tour-notices-tabs bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl flex items-center">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setActiveTab('expired')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'expired' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Expired
                    </button>
                </div>

                {/* Course Filter Dropdown */}
                {noticesCourses.length > 0 && (
                    <div className="tour-notices-filters">
                        <NativeSelect
                            placeholder="All Courses"
                            options={[{ id: 'all', name: 'All Courses' }, ...noticesCourses.map(course => ({ id: course.id, name: course.code }))]}
                            value={courseFilter}
                            onChange={(val) => setCourseFilter(String(val))}
                            icon={<Filter size={18} />}
                        />
                    </div>
                )}
            </div>

            {isVerifying ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verifying Security...</p>
                </div>
            ) : isLocked ? (
                <SectionAccessUnlock
                    batchId={batchId}
                    section={section}
                    subSection={subSection}
                    description={`Announcements for Section ${section} are protected. Enter your student details and the PIN from your CR.`}
                    submitLabel="Unlock Announcements"
                    onUnlocked={handleUnlocked}
                />
            ) : (
                <>
                    {/* Notices List */}
            <div className="tour-notices-list space-y-4">
                <AnimatePresence mode="popLayout">
                    {displayedNotices.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center"
                        >
                            <Bell size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">No notices found</p>
                        </motion.div>
                    ) : (
                        displayedNotices.map((notice, index) => {
                            const courseName = notice.course_id ? courses.find(c => c.id === notice.course_id)?.name : null;
                            const courseCode = notice.course_id ? courses.find(c => c.id === notice.course_id)?.code : null;
                            const isExpanded = expandedId === notice.id;
                            const isExpired = notice.expires_at && isPast(parseISO(notice.expires_at));

                            return (
                                <motion.div
                                    layout
                                    key={notice.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden ${isExpired ? 'opacity-60 grayscale' : ''}`}
                                >
                                    {/* Conditional Header for Course Specific Notices */}
                                    {courseName && (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                                            <BookOpen size={14} className="text-indigo-500" />
                                            <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{courseCode}</span>
                                        </div>
                                    )}

                                    <div
                                        className="p-5 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
                                        onClick={() => setExpandedId(isExpanded ? null : notice.id)}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${PRIORITY_COLORS[notice.priority]}`}>
                                                {PRIORITY_ICONS[notice.priority]}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight mb-2 pr-4">{notice.title}</h3>
                                                    <div className="flex items-center gap-2">

                                                        <ChevronDown
                                                            size={20}
                                                            className={`text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={12} />
                                                        {format(parseISO(notice.created_at), 'MMM dd')}
                                                    </span>
                                                    {notice.expires_at && (
                                                        <span className={`flex items-center gap-1 ${isExpired ? 'text-rose-500' : 'text-amber-500'}`}>
                                                            <Clock size={12} />
                                                            {isExpired ? 'Expired' : `Expires ${format(parseISO(notice.expires_at), 'MMM dd')}`}
                                                        </span>
                                                    )}
                                                    <div className="flex items-center gap-1.5 ml-auto border-l border-slate-100 dark:border-slate-800 pl-3">
                                                        <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                                                            {notice.uploader?.avatar_url ? (
                                                                <img src={resolveMediaUrl(notice.uploader.avatar_url)} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-700">
                                                                    <span className="text-[6px] font-black">{notice.uploader?.full_name?.charAt(0) || 'A'}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-400 truncate max-w-[80px]">
                                                            {notice.uploader?.full_name || 'Official Admin'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && notice.content?.trim() && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                                    animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                                                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                            {notice.content}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
            </>
            )}
        </div >
    );
};

export default NoticesView;
