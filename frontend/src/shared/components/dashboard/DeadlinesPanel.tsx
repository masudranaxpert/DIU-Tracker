import React from 'react';
import { Deadline, Course } from '@/shared/types/types';
import { motion } from 'framer-motion';
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
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
            <Clock size={17} />
          </div>
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 dark:text-white">
              Deadlines
            </h2>
            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">
              Upcoming & history
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Upcoming
              </span>
            </div>
            {displayed.length === 0 ? (
              <p className="text-[10px] font-bold text-slate-400 uppercase py-4 text-center">
                Nothing due soon
              </p>
            ) : (
              <div className="space-y-3">
                {displayed.map((deadline) => {
                  const course = courses.find((c) => c.id === deadline.course_id);
                  const color = getDeadlineColor(deadline.type);
                  const dueToday = isToday(parseISO(deadline.date));
                  return (
                    <motion.button
                      key={deadline.id}
                      type="button"
                      whileHover={{ x: 4 }}
                      onClick={() => onSelect(deadline)}
                      className="w-full flex gap-3 items-start p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left group cursor-pointer"
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 text-white ${color} ${dueToday ? 'ring-2 ring-offset-2 ring-emerald-400 dark:ring-offset-slate-900' : ''}`}
                      >
                        <span className="text-[7px] font-bold uppercase opacity-90">
                          {format(parseISO(deadline.date), 'MMM')}
                        </span>
                        <span className="text-sm font-black leading-none">
                          {format(parseISO(deadline.date), 'dd')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 transition-colors">
                          {deadline.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className={`text-[7px] font-bold text-white px-1.5 py-0.5 rounded uppercase ${color}`}>
                            {deadline.type}
                          </span>
                          <span className="text-[8px] font-medium text-slate-400 uppercase truncate">
                            {course?.code || 'General'}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
            {upcoming.length > VISIBLE && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="w-full mt-3 py-2.5 text-[8px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                {showAll ? 'Show less' : `+${upcoming.length - VISIBLE} more`}
              </button>
            )}
          </div>

          {past.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Recent
              </p>
              <div className="space-y-2 opacity-70">
                {past.slice(0, 3).map((deadline) => (
                  <div key={deadline.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg">
                    <span className="text-[9px] font-black text-slate-400 w-10">
                      {format(parseISO(deadline.date), 'MMM dd')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase truncate flex-1">
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
