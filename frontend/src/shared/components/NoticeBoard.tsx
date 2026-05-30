import React, { useState } from 'react';
import { Notice, Course, Section } from '@/shared/types/types';
import { format, parseISO, isPast, isToday } from 'date-fns';
import {
  Bell,
  Info,
  AlertTriangle,
  Zap,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { useSectionAccess } from '@/shared/hooks/useSectionAccess';
import ProtectedBlurShell from '@/shared/components/security/ProtectedBlurShell';
import NoticeDetailModal from './NoticeDetailModal';
import { sortNoticesByPriority } from '@/shared/lib/noticeUtils';

const DASHBOARD_LIMIT = 5;

interface Props {
  notices: Notice[];
  courses: Course[];
  onDateSelect?: (date: Date | string) => void;
  onAction?: (type: string) => void;
  batchId: string;
  section: Section;
  subSection?: string | null;
}

type Priority = 'low' | 'normal' | 'high' | 'urgent';

const PRIORITY: Record<
  Priority,
  { dot: string; chip: string; label: string; icon: React.ReactNode }
> = {
  low: {
    dot: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    label: 'Low',
    icon: <Info size={13} />,
  },
  normal: {
    dot: 'bg-indigo-500',
    chip: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300',
    label: 'Notice',
    icon: <Bell size={13} />,
  },
  high: {
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    label: 'Important',
    icon: <AlertTriangle size={13} />,
  },
  urgent: {
    dot: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
    label: 'Urgent',
    icon: <Zap size={13} className="fill-current" />,
  },
};

const NoticeBoard: React.FC<Props> = ({
  notices,
  courses,
  onAction,
  batchId,
  section,
  subSection,
}) => {
  const { locked, verifying } = useSectionAccess(batchId, section);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  const activeNotices = React.useMemo(() => {
    const active = notices.filter((n) => {
      if (!n.expires_at) return true;
      const expDate = parseISO(n.expires_at);
      return !isPast(expDate) || isToday(expDate);
    });
    return sortNoticesByPriority(active);
  }, [notices]);

  const visibleNotices = activeNotices.slice(0, DASHBOARD_LIMIT);
  const hasMore = activeNotices.length > DASHBOARD_LIMIT;

  const selectedCourse = selectedNotice?.course_id
    ? courses.find((c) => c.id === selectedNotice.course_id) ?? null
    : null;

  if (activeNotices.length === 0) return null;

  const noticeList = (
    <div className="space-y-2.5">
      {visibleNotices.map((notice) => {
        const courseCode = notice.course_id
          ? courses.find((c) => c.id === notice.course_id)?.code
          : null;
        const p = PRIORITY[(notice.priority as Priority) || 'normal'];
        const preview = notice.content?.trim();

        return (
          <div
            key={notice.id}
            className="relative rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors overflow-hidden group"
          >
            <span className={`absolute left-0 top-0 bottom-0 w-1 ${p.dot}`} aria-hidden />

            <button
              type="button"
              onClick={() => !locked && setSelectedNotice(notice)}
              className="w-full text-left pl-4 pr-3.5 py-3 cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${p.chip}`}
                >
                  {p.icon}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white leading-snug line-clamp-1 min-w-0">
                      {notice.title}
                    </h3>
                    <ArrowRight
                      size={15}
                      className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 shrink-0 transition-all duration-200"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${p.chip}`}
                    >
                      {p.label}
                    </span>
                    {courseCode && (
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        <BookOpen size={12} /> {courseCode}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {format(parseISO(notice.created_at), 'MMM dd')}
                    </span>
                  </div>

                  {preview ? (
                    <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-snug mt-1.5 line-clamp-1">
                      {preview}
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/10">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Notice board</h2>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                {locked
                  ? `${activeNotices.length} protected ${activeNotices.length === 1 ? 'announcement' : 'announcements'}`
                  : hasMore
                    ? `Top ${DASHBOARD_LIMIT} of ${activeNotices.length} active`
                    : `${activeNotices.length} active ${activeNotices.length === 1 ? 'announcement' : 'announcements'}`}
              </p>
            </div>
          </div>
          {onAction && !locked && (
            <button
              type="button"
              onClick={() => onAction('notices')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors cursor-pointer"
            >
              View all <ArrowRight size={14} />
            </button>
          )}
        </div>

        <ProtectedBlurShell
          locked={locked}
          verifying={verifying}
          batchId={batchId}
          section={section}
          subSection={subSection}
          hint="Tap to unlock notices"
          modalTitle="Unlock announcements"
          modalDescription={`Announcements for Section ${section} are protected. Enter your student ID and section PIN from your CR.`}
          submitLabel="Unlock announcements"
        >
          {noticeList}
        </ProtectedBlurShell>
      </section>

      <NoticeDetailModal
        notice={selectedNotice}
        course={selectedCourse}
        onClose={() => setSelectedNotice(null)}
      />
    </>
  );
};

export default NoticeBoard;
