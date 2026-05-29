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
    <section className="tour-schedule rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 lg:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
            <Zap size={18} />
          </div>
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
              Today&apos;s Schedule
            </h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {records.length} {records.length === 1 ? 'activity' : 'activities'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenCalendar}
          className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-500 transition-colors cursor-pointer"
        >
          Open Calendar
        </button>
      </div>

      {records.length === 0 ? (
        <div className="py-10 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            No classes or events today
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.slice(0, 5).map((record) => {
            const course = courses.find((c) => c.id === record.course_id);
            return (
              <button
                key={record.id}
                type="button"
                onClick={() => onOpenRecord(record)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors text-left group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center shrink-0">
                  <Activity size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">
                    {record.title}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                    {course?.code || 'General'} • {record.type.replace(/_/g, ' ')}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default TodaySchedule;
