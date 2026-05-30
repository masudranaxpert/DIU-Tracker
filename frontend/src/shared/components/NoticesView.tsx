import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Info,
  AlertTriangle,
  Zap,
  Clock,
  BookOpen,
  Calendar,
  Filter,
  ArrowRight,
} from 'lucide-react';
import NativeSelect from './NativeSelect';
import NoticeDetailModal from './NoticeDetailModal';
import { useAuth } from '@/app/providers/AuthProvider';
import { studentService, StudentSession } from '@/shared/services/studentService';
import SectionAccessUnlock from './SectionAccessUnlock';
import { Notice, Course, Section } from '@/shared/types/types';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { resolveMediaUrl } from '@/shared/utils/mediaUrl';
import { useClientPagination } from '@/shared/hooks/useClientPagination';
import DirectoryPagination from './ui/DirectoryPagination';
import { sortNoticesByPriority } from '@/shared/lib/noticeUtils';

const PAGE_SIZE = 10;

interface Props {
  notices: Notice[];
  courses: Course[];
  onDateSelect?: (date: Date | string) => void;
  batchId: string;
  section: Section;
  subSection?: string | null;
}

type Priority = 'low' | 'normal' | 'high' | 'urgent';

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  normal: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
  high: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  urgent: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
};

const PRIORITY_STRIP: Record<Priority, string> = {
  low: 'bg-slate-400',
  normal: 'bg-indigo-500',
  high: 'bg-amber-500',
  urgent: 'bg-rose-500',
};

const PRIORITY_ICONS: Record<Priority, React.ReactNode> = {
  low: <Info size={16} />,
  normal: <Bell size={16} />,
  high: <AlertTriangle size={16} />,
  urgent: <Zap size={16} className="fill-current" />,
};

const NoticesView: React.FC<Props> = ({ notices, courses, batchId, section, subSection }) => {
  const { profile: crProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'active' | 'expired'>('overview');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [isLocked, setIsLocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

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

  const { activeNotices, expiredNotices, noticesCourses } = useMemo(() => {
    const active = notices.filter((n) => {
      if (!n.expires_at) return true;
      const expDate = parseISO(n.expires_at);
      return !isPast(expDate) || isToday(expDate);
    });
    const expired = notices.filter((n) => {
      if (!n.expires_at) return false;
      const expDate = parseISO(n.expires_at);
      return isPast(expDate) && !isToday(expDate);
    });
    const uniqueCourseIds = Array.from(new Set(notices.map((n) => n.course_id).filter(Boolean)));
    const relevantCourses = uniqueCourseIds
      .map((id) => courses.find((c) => c.id === id))
      .filter(Boolean) as Course[];

    return { activeNotices: active, expiredNotices: expired, noticesCourses: relevantCourses };
  }, [notices, courses]);

  const displayedNotices = useMemo(() => {
    let base = activeTab === 'active' ? activeNotices : activeTab === 'expired' ? expiredNotices : notices;
    if (courseFilter !== 'all') {
      base = base.filter((n) => n.course_id === courseFilter);
    }
    return sortNoticesByPriority(base);
  }, [activeTab, activeNotices, expiredNotices, notices, courseFilter]);

  const {
    page,
    total,
    totalPages,
    pageItems,
    rangeStart,
    rangeEnd,
    goToPage,
    resetPage,
  } = useClientPagination(displayedNotices, PAGE_SIZE);

  const prevFilterKey = useRef(`${activeTab}:${courseFilter}`);
  useEffect(() => {
    const key = `${activeTab}:${courseFilter}`;
    if (prevFilterKey.current !== key) {
      resetPage();
      prevFilterKey.current = key;
    }
  }, [activeTab, courseFilter, resetPage]);

  const handlePageChange = (next: number) => {
    goToPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedCourse = selectedNotice?.course_id
    ? courses.find((c) => c.id === selectedNotice.course_id) ?? null
    : null;

  return (
    <div className="space-y-6 pb-28 lg:pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-[0.04] dark:opacity-[0.06] pointer-events-none">
          <Bell size={120} />
        </div>

        <div className="flex flex-col gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
              <Bell size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Notice Board
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Updates & announcements for your section
              </p>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            <div className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex-shrink-0 border border-indigo-100/80 dark:border-indigo-900/40">
              <span className="block text-lg font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {notices.length}
              </span>
              <span className="text-[10px] font-semibold text-indigo-500/80 uppercase tracking-wider">Total</span>
            </div>
            <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex-shrink-0 border border-emerald-100/80 dark:border-emerald-900/40">
              <span className="block text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {activeNotices.length}
              </span>
              <span className="text-[10px] font-semibold text-emerald-500/80 uppercase tracking-wider">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="tour-notices-tabs bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl flex items-center">
          {(['overview', 'active', 'expired'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold capitalize transition-colors duration-200 cursor-pointer ${
                activeTab === tab
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab === 'overview' ? 'All' : tab}
            </button>
          ))}
        </div>

        {noticesCourses.length > 0 && (
          <div className="tour-notices-filters">
            <NativeSelect
              placeholder="All Courses"
              options={[
                { id: 'all', name: 'All Courses' },
                ...noticesCourses.map((course) => ({ id: course.id, name: course.code })),
              ]}
              value={courseFilter}
              onChange={(val) => setCourseFilter(String(val))}
              icon={<Filter size={18} />}
            />
          </div>
        )}
      </div>

      {isVerifying ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-[3px] border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">Verifying access…</p>
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
        <div className="tour-notices-list space-y-3">
          <AnimatePresence mode="popLayout">
            {displayedNotices.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center"
              >
                <Bell size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-500">No notices found</p>
              </motion.div>
            ) : (
              pageItems.map((notice, index) => {
                const courseCode = notice.course_id
                  ? courses.find((c) => c.id === notice.course_id)?.code
                  : null;
                const priority = (notice.priority as Priority) || 'normal';
                const isExpired =
                  notice.expires_at && isPast(parseISO(notice.expires_at)) && !isToday(parseISO(notice.expires_at));
                const preview = notice.content?.trim();

                return (
                  <motion.button
                    type="button"
                    layout
                    key={notice.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => setSelectedNotice(notice)}
                    className={`w-full text-left relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md transition-all duration-200 group ${isExpired ? 'opacity-70' : ''}`}
                  >
                    <span
                      className={`absolute left-0 top-0 bottom-0 w-1 ${PRIORITY_STRIP[priority]}`}
                      aria-hidden
                    />

                    {courseCode && (
                      <div className="pl-4 pr-4 pt-3 pb-0 flex items-center gap-1.5">
                        <BookOpen size={12} className="text-indigo-500" />
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {courseCode}
                        </span>
                      </div>
                    )}

                    <div className="p-3 sm:p-4 pl-3.5 sm:pl-4 flex gap-3">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex-shrink-0 flex items-center justify-center border ${PRIORITY_COLORS[priority]}`}
                      >
                        {PRIORITY_ICONS[priority]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug line-clamp-1 min-w-0">
                            {notice.title}
                          </h3>
                          <ArrowRight
                            size={15}
                            className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 shrink-0 transition-all duration-200"
                          />
                        </div>

                        {preview && (
                          <p className="text-[13px] font-normal text-slate-600 dark:text-slate-300 leading-snug mt-1 line-clamp-1">
                            {preview}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={12} />
                            {format(parseISO(notice.created_at), 'MMM d, yyyy')}
                          </span>
                          {notice.expires_at && (
                            <span
                              className={`inline-flex items-center gap-1 ${isExpired ? 'text-rose-500' : 'text-amber-600 dark:text-amber-400'}`}
                            >
                              <Clock size={12} />
                              {isExpired ? 'Expired' : `Until ${format(parseISO(notice.expires_at), 'MMM d')}`}
                            </span>
                          )}
                          {notice.uploader && (
                            <span className="inline-flex items-center gap-1 ml-auto min-w-0">
                              <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                                {notice.uploader.avatar_url ? (
                                  <img
                                    src={resolveMediaUrl(notice.uploader.avatar_url)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="w-full h-full flex items-center justify-center text-[7px] font-bold text-slate-600 dark:text-slate-300">
                                    {notice.uploader.full_name?.charAt(0) || 'A'}
                                  </span>
                                )}
                              </span>
                              <span className="truncate max-w-[72px] text-slate-600 dark:text-slate-300">
                                {notice.uploader.full_name}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </AnimatePresence>

          {displayedNotices.length > 0 && (
            <DirectoryPagination
              page={page}
              totalPages={totalPages}
              total={total}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}

      <NoticeDetailModal
        notice={selectedNotice}
        course={selectedCourse}
        onClose={() => setSelectedNotice(null)}
      />
    </div>
  );
};

export default NoticesView;
