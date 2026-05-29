import React from 'react';
import { Deadline, Course } from '@/shared/types/types';
import { format, parseISO, isToday, differenceInCalendarDays } from 'date-fns';
import { CalendarClock, X } from 'lucide-react';

interface Props {
  deadline: Deadline | null;
  courses: Course[];
  onClose: () => void;
}

const DeadlineDetailModal: React.FC<Props> = ({ deadline, courses, onClose }) => {
  if (!deadline) return null;
  const course = courses.find((c) => c.id === deadline.course_id);
  const date = parseISO(deadline.date);
  const daysLeft = differenceInCalendarDays(date, new Date());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex flex-col items-center justify-center shrink-0">
              <span className="text-[8px] font-bold uppercase leading-none opacity-90">
                {format(date, 'MMM')}
              </span>
              <span className="text-sm font-bold leading-none">{format(date, 'd')}</span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {deadline.type}
              </span>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5 line-clamp-2">
                {deadline.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <CalendarClock size={16} className="text-slate-400 shrink-0" />
            <span className="font-medium">{format(date, 'EEEE, MMMM d, yyyy')}</span>
          </div>

          {isToday(date) && (
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Due today
            </p>
          )}
          {!isToday(date) && daysLeft > 0 && daysLeft <= 14 && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {daysLeft === 1 ? 'Due tomorrow' : `${daysLeft} days remaining`}
            </p>
          )}

          {course && (
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2.5">
              <p className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                {course.code}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{course.name}</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeadlineDetailModal;
