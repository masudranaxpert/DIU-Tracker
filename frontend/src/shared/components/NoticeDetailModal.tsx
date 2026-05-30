import React from 'react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import {
  Bell,
  Info,
  AlertTriangle,
  Zap,
  BookOpen,
  Calendar,
  Clock,
  X,
} from 'lucide-react';
import { Notice, Course } from '@/shared/types/types';
import { resolveMediaUrl } from '@/shared/utils/mediaUrl';

type Priority = 'low' | 'normal' | 'high' | 'urgent';

const PRIORITY_META: Record<
  Priority,
  { hero: string; badge: string; label: string; icon: React.ReactNode }
> = {
  low: {
    hero: 'bg-slate-800',
    badge: 'bg-slate-700/80 text-slate-100',
    label: 'Low',
    icon: <Info size={18} strokeWidth={2.25} />,
  },
  normal: {
    hero: 'bg-indigo-700',
    badge: 'bg-indigo-600/90 text-white',
    label: 'Notice',
    icon: <Bell size={18} strokeWidth={2.25} />,
  },
  high: {
    hero: 'bg-amber-600',
    badge: 'bg-amber-700/90 text-white',
    label: 'Important',
    icon: <AlertTriangle size={18} strokeWidth={2.25} />,
  },
  urgent: {
    hero: 'bg-rose-700',
    badge: 'bg-rose-800/90 text-white',
    label: 'Urgent',
    icon: <Zap size={18} strokeWidth={2.25} className="fill-current" />,
  },
};

interface Props {
  notice: Notice | null;
  course?: Course | null;
  onClose: () => void;
}

const NoticeDetailModal: React.FC<Props> = ({ notice, course, onClose }) => {
  React.useEffect(() => {
    if (!notice) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [notice, onClose]);

  if (!notice) return null;

  const priority = (notice.priority as Priority) || 'normal';
  const meta = PRIORITY_META[priority];
  const created = parseISO(notice.created_at);
  const isExpired =
    notice.expires_at &&
    isPast(parseISO(notice.expires_at)) &&
    !isToday(parseISO(notice.expires_at));
  const content = notice.content?.trim() || '';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/55 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notice-modal-title"
    >
      <div
        className="bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-[1.25rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[min(88dvh,100dvh)] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-0 bg-white dark:bg-slate-900">
          <span className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden />
        </div>

        {/* Header — compact on mobile */}
        <div className={`relative px-4 sm:px-5 pt-3 sm:pt-4 pb-4 text-white ${meta.hero}`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/15 hover:bg-black/25 active:bg-black/30 transition-colors duration-200 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-3 pr-11">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span
                className={`inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${meta.badge}`}
              >
                {meta.label}
              </span>
              <h2
                id="notice-modal-title"
                className="text-base sm:text-lg font-bold leading-snug mt-2 text-white"
              >
                {notice.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-4 sm:px-5 py-4 space-y-4 min-h-0">
          {/* Meta row */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg">
              <Calendar size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              {format(created, 'MMM d, yyyy')}
            </span>
            {notice.expires_at && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg ${
                  isExpired
                    ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
                    : 'text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40'
                }`}
              >
                <Clock size={13} className="shrink-0" />
                {isExpired
                  ? `Expired ${format(parseISO(notice.expires_at), 'MMM d')}`
                  : `Until ${format(parseISO(notice.expires_at), 'MMM d')}`}
              </span>
            )}
            {isExpired && (
              <span className="inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                Expired
              </span>
            )}
          </div>

          {course && (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
              <BookOpen size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 font-mono">
                  {course.code}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400 mx-1.5">·</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {course.name}
                </span>
              </div>
            </div>
          )}

          {/* Description — readable weight & size, not oversized */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 px-4 py-3.5">
            {content ? (
              <p className="text-[15px] font-medium text-slate-800 dark:text-slate-100 leading-[1.65] whitespace-pre-wrap break-words">
                {content}
              </p>
            ) : (
              <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400 italic">
                No additional details.
              </p>
            )}
          </div>

          {notice.uploader && (
            <div className="flex items-center gap-2.5 pt-1">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                {notice.uploader.avatar_url ? (
                  <img
                    src={resolveMediaUrl(notice.uploader.avatar_url)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                    {notice.uploader.full_name?.charAt(0) || 'A'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Posted by
                </p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {notice.uploader.full_name || 'Official Admin'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer — safe area for home indicator; sits above mobile nav when modal is full overlay */}
        <div className="shrink-0 px-4 sm:px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl text-sm transition-colors duration-200 cursor-pointer active:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoticeDetailModal;
