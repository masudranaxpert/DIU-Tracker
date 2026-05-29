import React from 'react';
import { Deadline, Course } from '@/shared/types/types';
import { format, parseISO, isToday, differenceInCalendarDays } from 'date-fns';
import { BookOpen, CalendarClock, FileText, X } from 'lucide-react';

interface Props {
  deadline: Deadline | null;
  courses: Course[];
  onClose: () => void;
}

const DeadlineDetailModal: React.FC<Props> = ({ deadline, courses, onClose }) => {
  React.useEffect(() => {
    if (!deadline) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [deadline, onClose]);

  if (!deadline) return null;

  const course = courses.find((c) => c.id === deadline.course_id);
  const date = parseISO(deadline.date);
  const daysLeft = differenceInCalendarDays(date, new Date());
  const description = deadline.description?.trim() || '';

  const countdown =
    daysLeft === 0
      ? 'Due today'
      : daysLeft === 1
        ? 'Due tomorrow'
        : daysLeft > 0 && daysLeft <= 14
          ? `${daysLeft} days left`
          : daysLeft < 0
            ? 'Past deadline'
            : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="deadline-modal-title"
    >
      <div
        className="bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Date hero */}
        <div className="relative bg-indigo-600 px-5 pt-5 pb-6 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="flex items-end gap-4">
            <div className="flex flex-col items-center justify-center min-w-[4.5rem] py-2 px-3 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">
                {format(date, 'MMM')}
              </span>
              <span className="text-4xl font-bold leading-none tabular-nums my-1">
                {format(date, 'd')}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                {format(date, 'EEE')}
              </span>
            </div>

            <div className="flex-1 min-w-0 pb-0.5">
              <span className="inline-flex text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/20">
                {deadline.type}
              </span>
              <h3
                id="deadline-modal-title"
                className="text-lg font-semibold leading-snug mt-2 line-clamp-3"
              >
                {deadline.title}
              </h3>
              {countdown && (
                <p className="text-xs font-semibold mt-2 text-indigo-100">{countdown}</p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
          <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
            <CalendarClock size={16} className="text-indigo-500 shrink-0" />
            <span className="font-medium">{format(date, 'EEEE, MMMM d, yyyy')}</span>
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
                Description
              </span>
            </div>
            <div className="px-3.5 py-3.5">
              {description ? (
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                  {description}
                </p>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                  No additional details provided.
                </p>
              )}
            </div>
          </div>
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

export default DeadlineDetailModal;
