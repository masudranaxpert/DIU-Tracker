import React from 'react';
import { Deadline, Course } from '@/shared/types/types';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { format, isToday, parseISO, differenceInCalendarDays } from 'date-fns';

interface Props {
  upcoming: Deadline[];
  past: Deadline[];
  courses: Course[];
  onSelect: (deadline: Deadline) => void;
}

const VISIBLE = 6;

function dueLabel(dateStr: string): string | null {
  const date = parseISO(dateStr);
  const days = differenceInCalendarDays(date, new Date());
  if (days < 0) return null;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `${days}d left`;
  return null;
}

const DeadlinesPanel: React.FC<Props> = ({ upcoming, past, courses, onSelect }) => {
  const [showAll, setShowAll] = React.useState(false);
  const displayed = showAll ? upcoming : upcoming.slice(0, VISIBLE);

  return (
    <aside className="xl:col-span-4 tour-deadlines">
      <div className="sticky top-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-[420px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <CalendarClock size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Deadlines</h2>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
                Upcoming & recent
              </p>
            </div>
          </div>
          {upcoming.length > 0 && (
            <span className="text-xs font-bold tabular-nums px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 shrink-0">
              {upcoming.length}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 lg:px-5 space-y-5">
          {/* Upcoming */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5 px-0.5">
              Upcoming
            </p>

            {displayed.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 py-10 px-4 text-center">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Nothing due soon
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  New deadlines will show here
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {displayed.map((deadline) => {
                  const course = courses.find((c) => c.id === deadline.course_id);
                  const dueToday = isToday(parseISO(deadline.date));
                  const soon = dueLabel(deadline.date);

                  return (
                    <li key={deadline.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(deadline)}
                        className={`group w-full flex items-stretch gap-3 rounded-lg border text-left transition-colors cursor-pointer overflow-hidden ${
                          dueToday
                            ? 'border-indigo-200 bg-indigo-50/60 dark:border-indigo-800/60 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                            : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Date column */}
                        <div
                          className={`flex flex-col items-center justify-center w-14 shrink-0 py-3 border-r ${
                            dueToday
                              ? 'border-indigo-100 bg-indigo-100/50 dark:border-indigo-900/50 dark:bg-indigo-900/20'
                              : 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50'
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            {format(parseISO(deadline.date), 'MMM')}
                          </span>
                          <span className="text-lg font-bold leading-none text-slate-900 dark:text-white tabular-nums mt-0.5">
                            {format(parseISO(deadline.date), 'd')}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 py-2.5 pr-2 flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {deadline.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                {deadline.type}
                              </span>
                              {course?.code && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-600">·</span>
                                  <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                                    {course.code}
                                  </span>
                                </>
                              )}
                              {soon && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-600">·</span>
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wide ${
                                      dueToday
                                        ? 'text-indigo-600 dark:text-indigo-400'
                                        : 'text-slate-400 dark:text-slate-500'
                                    }`}
                                  >
                                    {soon}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRight
                            size={16}
                            className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors"
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {upcoming.length > VISIBLE && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="w-full mt-2 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                {showAll ? 'Show less' : `Show ${upcoming.length - VISIBLE} more`}
              </button>
            )}
          </section>

          {/* Recent */}
          {past.length > 0 && (
            <section className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5 px-0.5">
                Recent
              </p>
              <ul className="space-y-0.5">
                {past.slice(0, 3).map((deadline) => {
                  const course = courses.find((c) => c.id === deadline.course_id);
                  return (
                    <li key={deadline.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(deadline)}
                        className="group w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
                      >
                        <span className="text-xs font-semibold text-slate-400 w-14 shrink-0 tabular-nums">
                          {format(parseISO(deadline.date), 'MMM d')}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400 truncate flex-1 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                          {deadline.title}
                        </span>
                        {course?.code && (
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0 hidden sm:inline">
                            {course.code}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </aside>
  );
};

export default DeadlinesPanel;
