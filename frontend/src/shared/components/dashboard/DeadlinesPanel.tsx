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

function DateBadge({ dateStr, urgent }: { dateStr: string; urgent: boolean }) {
  const date = parseISO(dateStr);
  const day = format(date, 'd');
  const month = format(date, 'MMM');
  const weekday = format(date, 'EEE');

  if (urgent) {
    return (
      <div className="flex flex-col items-center justify-center w-[4.25rem] shrink-0 py-3 bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-90">{month}</span>
        <span className="text-2xl font-bold leading-none tabular-nums my-0.5">{day}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">{weekday}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-[4.25rem] shrink-0 py-3 bg-indigo-50 dark:bg-indigo-950/40 border-r-2 border-indigo-200 dark:border-indigo-800/60">
      <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
        {month}
      </span>
      <span className="text-2xl font-bold leading-none tabular-nums my-0.5 text-indigo-700 dark:text-indigo-300">
        {day}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-indigo-400/80 dark:text-indigo-500">
        {weekday}
      </span>
    </div>
  );
}

const DeadlinesPanel: React.FC<Props> = ({ upcoming, past, courses, onSelect }) => {
  const [showAll, setShowAll] = React.useState(false);
  const displayed = showAll ? upcoming : upcoming.slice(0, VISIBLE);

  return (
    <aside className="xl:col-span-4 tour-deadlines">
      <div className="sticky top-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-[420px] flex flex-col overflow-hidden shadow-sm">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <CalendarClock size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Deadlines</h2>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">Upcoming & recent</p>
            </div>
          </div>
          {upcoming.length > 0 && (
            <span className="text-xs font-bold tabular-nums min-w-[1.75rem] h-7 flex items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0">
              {upcoming.length}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 lg:px-5 space-y-5">
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5 px-0.5">
              Upcoming
            </p>

            {displayed.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 py-10 px-4 text-center">
                <CalendarClock size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nothing due soon</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">New deadlines will show here</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {displayed.map((deadline) => {
                  const course = courses.find((c) => c.id === deadline.course_id);
                  const dueToday = isToday(parseISO(deadline.date));
                  const daysLeft = differenceInCalendarDays(parseISO(deadline.date), new Date());
                  const urgent = dueToday || daysLeft <= 3;
                  const soon = dueLabel(deadline.date);

                  return (
                    <li key={deadline.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(deadline)}
                        className={`group w-full flex items-stretch rounded-lg border text-left transition-all duration-200 cursor-pointer overflow-hidden ${
                          urgent
                            ? 'border-indigo-300 dark:border-indigo-700 shadow-sm shadow-indigo-500/10 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md hover:shadow-indigo-500/15'
                            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800/60 hover:shadow-sm'
                        }`}
                      >
                        <DateBadge dateStr={deadline.date} urgent={urgent} />

                        <div className="flex-1 min-w-0 py-3 px-3 flex items-center gap-2 bg-white dark:bg-slate-900 group-hover:bg-slate-50/80 dark:group-hover:bg-slate-800/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {deadline.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                              <span className="inline-flex text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                {deadline.type}
                              </span>
                              {course?.code && (
                                <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                                  {course.code}
                                </span>
                              )}
                              {soon && (
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wide ${
                                    dueToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                                  }`}
                                >
                                  · {soon}
                                </span>
                              )}
                            </div>
                            {deadline.description?.trim() && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-1">
                                {deadline.description.trim()}
                              </p>
                            )}
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
                        className="group w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
                      >
                        <span className="text-xs font-bold text-slate-400 w-12 shrink-0 tabular-nums text-center">
                          {format(parseISO(deadline.date), 'd')}
                          <span className="block text-[9px] font-semibold uppercase">{format(parseISO(deadline.date), 'MMM')}</span>
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400 truncate flex-1 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                          {deadline.title}
                        </span>
                        {course?.code && (
                          <span className="text-[10px] font-mono text-slate-400 shrink-0 hidden sm:inline">
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
