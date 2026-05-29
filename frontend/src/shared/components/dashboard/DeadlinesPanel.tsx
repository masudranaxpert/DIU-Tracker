import React from 'react';
import { Deadline, Course } from '@/shared/types/types';
import { Clock } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { getDeadlineColor } from './dashboardUtils';

interface Props {
  upcoming: Deadline[];
  past: Deadline[];
  courses: Course[];
  onSelect: (deadline: Deadline) => void;
}

const VISIBLE = 6;

const DeadlinesPanel: React.FC<Props> = ({ upcoming, past, courses, onSelect }) => {
  const [showAll, setShowAll] = React.useState(false);
  const displayed = showAll ? upcoming : upcoming.slice(0, VISIBLE);

  return (
    <aside className="xl:col-span-4 tour-deadlines">
      <div className="sticky top-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:p-6 min-h-[420px] flex flex-col">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Deadlines</h2>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Upcoming & history</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Upcoming</span>
            </div>
            {displayed.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                Nothing due soon
              </p>
            ) : (
              <div className="space-y-2">
                {displayed.map((deadline) => {
                  const course = courses.find((c) => c.id === deadline.course_id);
                  const color = getDeadlineColor(deadline.type);
                  const dueToday = isToday(parseISO(deadline.date));
                  return (
                    <button
                      key={deadline.id}
                      type="button"
                      onClick={() => onSelect(deadline)}
                      className="w-full flex gap-3 items-start p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group cursor-pointer"
                    >
                      <div
                        className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 text-white ${color} ${dueToday ? 'ring-2 ring-offset-2 ring-emerald-400 dark:ring-offset-slate-900' : ''}`}
                      >
                        <span className="text-[9px] font-bold uppercase opacity-90">
                          {format(parseISO(deadline.date), 'MMM')}
                        </span>
                        <span className="text-base font-bold leading-none">
                          {format(parseISO(deadline.date), 'dd')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 transition-colors">
                          {deadline.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span
                            className={`text-[11px] font-bold text-white px-2 py-0.5 rounded uppercase ${color}`}
                          >
                            {deadline.type}
                          </span>
                          {course?.code && (
                            <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                              {course.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {upcoming.length > VISIBLE && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="w-full mt-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                {showAll ? 'Show less' : `+${upcoming.length - VISIBLE} more`}
              </button>
            )}
          </div>

          {past.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3">Recent</p>
              <div className="space-y-2 opacity-80">
                {past.slice(0, 3).map((deadline) => (
                  <div
                    key={deadline.id}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg"
                  >
                    <span className="text-xs font-semibold text-slate-400 w-12 shrink-0 tabular-nums">
                      {format(parseISO(deadline.date), 'MMM dd')}
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400 truncate flex-1">
                      {deadline.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default DeadlinesPanel;
