import React from 'react';
import { AcademicRecord, Course } from '@/shared/types/types';
import { Activity, ChevronRight, Zap } from 'lucide-react';

interface Props {
  records: AcademicRecord[];
  courses: Course[];
  onOpenRecord: (record: AcademicRecord) => void;
  onOpenCalendar: () => void;
}

const TodaySchedule: React.FC<Props> = ({ records, courses, onOpenRecord, onOpenCalendar }) => {
  return (
    <section className="tour-schedule rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
            <Zap size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Today&apos;s schedule
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {records.length} {records.length === 1 ? 'activity' : 'activities'} today
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenCalendar}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors cursor-pointer"
        >
          Open calendar
        </button>
      </div>

      {records.length === 0 ? (
        <div className="py-12 text-center rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">No classes or events today</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.slice(0, 5).map((record) => {
            const course = courses.find((c) => c.id === record.course_id);
            return (
              <button
                key={record.id}
                type="button"
                onClick={() => onOpenRecord(record)}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors text-left group cursor-pointer"
              >
                <div className="w-11 h-11 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0">
                  <Activity size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {record.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {course?.code ? (
                      <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {course.code}
                      </span>
                    ) : (
                      'General'
                    )}
                    {' · '}
                    {record.type.replace(/_/g, ' ')}
                  </p>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default TodaySchedule;
