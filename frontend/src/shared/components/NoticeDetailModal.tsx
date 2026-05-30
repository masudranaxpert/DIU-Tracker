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
  { hero: string; glow: string; badge: string; label: string; icon: React.ReactNode }
> = {
  low: {
    hero: 'from-slate-600 via-slate-700 to-slate-900',
    glow: 'bg-white/10',
    badge: 'bg-white/20 text-white ring-1 ring-white/25',
    label: 'Low',
    icon: <Info size={18} strokeWidth={2.25} />,
  },
  normal: {
    hero: 'from-indigo-600 via-indigo-700 to-violet-800',
    glow: 'bg-indigo-400/20',
    badge: 'bg-white/20 text-white ring-1 ring-white/25',
    label: 'Notice',
    icon: <Bell size={18} strokeWidth={2.25} />,
  },
  high: {
    hero: 'from-amber-500 via-orange-500 to-orange-700',
    glow: 'bg-amber-300/25',
    badge: 'bg-black/15 text-white ring-1 ring-white/30',
    label: 'Important',
    icon: <AlertTriangle size={18} strokeWidth={2.25} />,
  },
  urgent: {
    hero: 'from-rose-600 via-red-600 to-rose-900',
    glow: 'bg-rose-400/20',
    badge: 'bg-white/20 text-white ring-1 ring-white/25',
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
      className="fixed inset-0 z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notice-modal-title"
    >
      {/* Mobile: tap dim area above sheet to close — no empty gap inside the sheet */}
      <div
        className="w-full sm:max-w-md flex flex-col max-h-[92dvh] sm:max-h-[90vh] bg-white dark:bg-slate-900 sm:rounded-2xl rounded-t-[1.35rem] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:shadow-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — gradient starts at very top; handle lives inside (no white strip) */}
        <div className={`relative shrink-0 bg-gradient-to-br ${meta.hero} text-white overflow-hidden`}>
          <div className={`pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl ${meta.glow}`} />
          <div className={`pointer-events-none absolute -bottom-6 -left-6 w-24 h-24 rounded-full blur-xl ${meta.glow}`} />

          {/* Drag handle — on gradient, not separate white bar */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1 relative z-10">
            <span className="w-10 h-1 rounded-full bg-white/45" aria-hidden />
          </div>

          <div className="relative z-10 px-4 sm:px-5 pt-1 sm:pt-4 pb-4 sm:pb-5">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-0 right-3 sm:top-3 sm:right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/30 active:bg-black/35 transition-colors duration-200 cursor-pointer backdrop-blur-sm"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-3 pr-11">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center shrink-0 shadow-sm">
                {meta.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={`inline-flex text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${meta.badge}`}
                >
                  {meta.label}
                </span>
                <h2
                  id="notice-modal-title"
                  className="text-base sm:text-lg font-bold leading-snug mt-2 text-white drop-shadow-sm"
                >
                  {notice.title}
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-4 sm:px-5 py-4 space-y-3.5 min-h-0">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg">
              <Calendar size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              {format(created, 'MMM d, yyyy')}
            </span>
            {notice.expires_at && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg ${
                  isExpired
                    ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
                    : 'text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40'
                }`}
              >
                <Clock size={13} className="shrink-0" />
                {isExpired
                  ? `Expired ${format(parseISO(notice.expires_at), 'MMM d')}`
                  : `Until ${format(parseISO(notice.expires_at), 'MMM d')}`}
              </span>
            )}
          </div>

          {course && (
            <div className="flex items-center gap-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30 px-3 py-2.5">
              <BookOpen size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="min-w-0 text-xs">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 font-mono">{course.code}</span>
                <span className="text-slate-500 dark:text-slate-400 mx-1.5">·</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{course.name}</span>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-4 py-3.5 shadow-sm">
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
            <div className="flex items-center gap-2.5 pb-1">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-slate-100 dark:ring-slate-700">
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

        {/* Footer */}
        <div className="shrink-0 px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer active:scale-[0.99] shadow-md shadow-indigo-500/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoticeDetailModal;
