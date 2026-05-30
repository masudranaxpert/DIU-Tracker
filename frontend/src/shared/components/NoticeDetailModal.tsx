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
  FileText,
  X,
} from 'lucide-react';
import { Notice, Course } from '@/shared/types/types';
import { resolveMediaUrl } from '@/shared/utils/mediaUrl';

type Priority = 'low' | 'normal' | 'high' | 'urgent';

const PRIORITY_META: Record<
  Priority,
  { hero: string; chip: string; label: string; icon: React.ReactNode }
> = {
  low: {
    hero: 'bg-gradient-to-br from-slate-600 to-slate-800',
    chip: 'bg-white/20 text-white ring-white/30',
    label: 'Low priority',
    icon: <Info size={16} />,
  },
  normal: {
    hero: 'bg-gradient-to-br from-indigo-600 to-indigo-800',
    chip: 'bg-white/20 text-white ring-white/30',
    label: 'Notice',
    icon: <Bell size={16} />,
  },
  high: {
    hero: 'bg-gradient-to-br from-amber-500 to-orange-600',
    chip: 'bg-white/20 text-white ring-white/30',
    label: 'Important',
    icon: <AlertTriangle size={16} />,
  },
  urgent: {
    hero: 'bg-gradient-to-br from-rose-600 to-red-700',
    chip: 'bg-white/20 text-white ring-white/30',
    label: 'Urgent',
    icon: <Zap size={16} className="fill-current" />,
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notice-modal-title"
    >
      <div
        className="bg-white dark:bg-slate-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero */}
        <div className={`relative px-5 pt-5 pb-6 text-white ${meta.hero}`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 transition-colors duration-200 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-4 pr-10">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0">
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span
                className={`inline-flex text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ring-1 ${meta.chip}`}
              >
                {meta.label}
              </span>
              <h2
                id="notice-modal-title"
                className="text-lg sm:text-xl font-semibold leading-snug mt-2.5 line-clamp-4"
              >
                {notice.title}
              </h2>
              {isExpired && (
                <span className="inline-flex mt-2.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/20 text-white/90 ring-1 ring-white/25">
                  Expired
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-2 font-medium">
              <Calendar size={15} className="text-indigo-500 shrink-0" />
              Posted {format(created, 'EEEE, MMM d, yyyy')}
            </span>
            {notice.expires_at && (
              <span
                className={`inline-flex items-center gap-2 font-medium ${isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}
              >
                <Clock size={15} className="shrink-0" />
                {isExpired
                  ? `Expired ${format(parseISO(notice.expires_at), 'MMM d, yyyy')}`
                  : `Expires ${format(parseISO(notice.expires_at), 'MMM d, yyyy')}`}
              </span>
            )}
          </div>

          {course && (
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-3.5 py-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <BookOpen size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {course.code}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 leading-snug">
                  {course.name}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <FileText size={14} className="text-slate-400 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Details
              </span>
            </div>
            <div className="px-3.5 py-3.5">
              {content ? (
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                  {content}
                </p>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                  No additional details — title only announcement.
                </p>
              )}
            </div>
          </div>

          {notice.uploader && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 px-3.5 py-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 ring-2 ring-white dark:ring-slate-900">
                {notice.uploader.avatar_url ? (
                  <img
                    src={resolveMediaUrl(notice.uploader.avatar_url)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                    {notice.uploader.full_name?.charAt(0) || 'A'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Posted by
                </p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {notice.uploader.full_name || 'Official Admin'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors duration-200 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoticeDetailModal;
