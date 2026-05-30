import React from 'react';
import { Deadline, Course } from '@/shared/types/types';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { BookOpen, Calendar, Clock, X } from 'lucide-react';
import { getCountdownBadge, getModalHeroClass } from './dashboardUtils';

interface Props {
  deadline: Deadline | null;
  courses: Course[];
  onClose: () => void;
}

const HERO_GLOW: Record<string, string> = {
  today: 'bg-rose-400/25',
  tomorrow: 'bg-amber-300/25',
  soon: 'bg-indigo-400/20',
  default: 'bg-white/10',
};

function getHeroGlow(daysLeft: number): string {
  if (daysLeft === 0) return HERO_GLOW.today;
  if (daysLeft === 1) return HERO_GLOW.tomorrow;
  if (daysLeft <= 3) return HERO_GLOW.soon;
  return HERO_GLOW.default;
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
  const countdown = getCountdownBadge(daysLeft);
  const heroClass = getModalHeroClass(daysLeft);
  const glowClass = getHeroGlow(daysLeft);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col sm:items-center sm:justify-center sm:p-4 sm:bg-slate-950/60 sm:backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="deadline-modal-title"
    >
      <div
        className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md flex flex-col bg-white dark:bg-slate-900 sm:rounded-2xl sm:shadow-2xl sm:border border-slate-200/80 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero header — gradient from top; drag handle inside (no white strip) */}
        <div className={`relative shrink-0 text-white ${heroClass} overflow-hidden`}>
          <div className={`pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl ${glowClass}`} />
          <div className={`pointer-events-none absolute -bottom-6 -left-6 w-24 h-24 rounded-full blur-xl ${glowClass}`} />

          <div className="sm:hidden flex justify-center pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 relative z-10">
            <span className="w-10 h-1 rounded-full bg-white/45" aria-hidden />
          </div>

          <div className="relative z-10 px-4 sm:px-5 pt-1 sm:pt-4 pb-4 sm:pb-5">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-2 right-3 sm:top-3 sm:right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/30 hover:bg-white/45 active:bg-white/50 text-white ring-1 ring-white/50 backdrop-blur-md transition-colors duration-200 cursor-pointer shadow-sm"
              aria-label="Close"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            <div className="flex items-end gap-3 sm:gap-4 pr-11">
              <div className="flex flex-col items-center justify-center min-w-[4rem] sm:min-w-[4.5rem] py-2 px-2.5 sm:px-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 shadow-sm shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">
                  {format(date, 'MMM')}
                </span>
                <span className="text-3xl sm:text-4xl font-bold leading-none tabular-nums my-1">
                  {format(date, 'd')}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  {format(date, 'EEE')}
                </span>
              </div>

              <div className="flex-1 min-w-0 pb-0.5">
                <span className="inline-flex text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white ring-1 ring-white/25">
                  {deadline.type}
                </span>
                <h2
                  id="deadline-modal-title"
                  className="text-base sm:text-lg font-bold leading-snug mt-2 text-white drop-shadow-sm"
                >
                  {deadline.title}
                </h2>
                {countdown && (
                  <span className="inline-flex mt-2.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/25 text-white ring-1 ring-white/35 backdrop-blur-sm">
                    {countdown.label}
                  </span>
                )}
                {!countdown && daysLeft < 0 && (
                  <span className="inline-flex mt-2.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 text-white/90 ring-1 ring-white/25">
                    Past deadline
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-4 sm:px-5 py-4 space-y-3.5 min-h-0">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg">
              <Calendar size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              {format(date, 'EEEE, MMM d, yyyy')}
            </span>
            {countdown && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg">
                <Clock size={13} className="shrink-0" />
                {countdown.label}
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
            {description ? (
              <p className="text-[15px] font-medium text-slate-800 dark:text-slate-100 leading-[1.65] whitespace-pre-wrap break-words">
                {description}
              </p>
            ) : (
              <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400 italic">
                No additional details provided.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 mt-auto px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-xl text-sm transition-colors duration-200 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeadlineDetailModal;
