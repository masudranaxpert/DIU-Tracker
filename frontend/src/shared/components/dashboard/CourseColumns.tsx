import React from 'react';
import { Course } from '@/shared/types/types';
import { BookOpen, ChevronRight, LucideIcon, Terminal } from 'lucide-react';

interface ColumnProps {
  title: string;
  icon: LucideIcon;
  accent: 'indigo' | 'emerald';
  courses: Course[];
  onSelectCourse: (courseId: string) => void;
  footer?: React.ReactNode;
}

const accentMap = {
  indigo: {
    icon: 'text-indigo-600 dark:text-indigo-400',
    badge: 'text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-900/30',
    credit: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white',
    chevron: 'group-hover:text-indigo-600',
    code: 'text-indigo-600 dark:text-indigo-400',
  },
  emerald: {
    icon: 'text-emerald-600 dark:text-emerald-400',
    badge: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30',
    credit: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white',
    chevron: 'group-hover:text-emerald-600',
    code: 'text-emerald-600 dark:text-emerald-400',
  },
};

const CourseColumn: React.FC<ColumnProps> = ({
  title,
  icon: Icon,
  accent,
  courses,
  onSelectCourse,
  footer,
}) => {
  const a = accentMap[accent];
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${a.icon}`}>
            <Icon size={18} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-md tabular-nums ${a.badge}`}>
          {courses.length}
        </span>
      </div>

      {courses.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
          No courses enrolled
        </p>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
          {courses.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => onSelectCourse(course.id)}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group text-left cursor-pointer"
            >
              <div
                className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 font-bold transition-colors ${a.credit}`}
              >
                <span className="text-[10px] uppercase opacity-80 leading-none">Cr</span>
                <span className="text-sm leading-none mt-0.5 tabular-nums">{course.credit}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold font-mono tracking-wide ${a.code}`}>
                  {course.code}
                </p>
                <p className="text-sm lg:text-[15px] font-semibold text-slate-900 dark:text-white leading-snug mt-1 line-clamp-2">
                  {course.name}
                </p>
                {course.teacher && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {course.teacher}
                  </p>
                )}
              </div>
              <ChevronRight
                size={18}
                className={`text-slate-300 shrink-0 transition-colors ${a.chevron}`}
              />
            </button>
          ))}
        </div>
      )}
      {footer}
    </div>
  );
};

interface Props {
  theoryCourses: Course[];
  labCourses: Course[];
  onSelectCourse: (courseId: string) => void;
  onViewGroups: () => void;
}

const CourseColumns: React.FC<Props> = ({
  theoryCourses,
  labCourses,
  onSelectCourse,
  onViewGroups,
}) => {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
      <CourseColumn
        title="Theory"
        icon={BookOpen}
        accent="indigo"
        courses={theoryCourses}
        onSelectCourse={onSelectCourse}
      />
      <CourseColumn
        title="Lab"
        icon={Terminal}
        accent="emerald"
        courses={labCourses}
        onSelectCourse={onSelectCourse}
        footer={
          labCourses.length > 0 ? (
            <button
              type="button"
              onClick={onViewGroups}
              className="mt-4 w-full py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer"
            >
              View lab group lists
            </button>
          ) : undefined
        }
      />
    </section>
  );
};

export default CourseColumns;
