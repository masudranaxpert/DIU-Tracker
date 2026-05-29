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
    icon: 'text-indigo-600',
    badge: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',
    hover: 'group-hover:bg-indigo-600',
    chevron: 'group-hover:text-indigo-500',
  },
  emerald: {
    icon: 'text-emerald-600',
    badge: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
    hover: 'group-hover:bg-emerald-600',
    chevron: 'group-hover:text-emerald-500',
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
        <div className="flex items-center gap-2">
          <Icon size={16} className={a.icon} />
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-900 dark:text-white">
            {title}
          </h3>
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${a.badge}`}>
          {courses.length}
        </span>
      </div>
      {courses.length === 0 ? (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-6 text-center">
          No courses
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
          {courses.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => onSelectCourse(course.id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group text-left cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center ${a.hover} group-hover:text-white transition-colors`}
              >
                <span className="text-[10px] font-black">{course.credit}</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate flex-1">
                {course.name}
              </span>
              <ChevronRight size={14} className={`text-slate-300 ${a.chevron}`} />
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
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              className="mt-4 w-full py-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer"
            >
              View Lab Group Lists
            </button>
          ) : undefined
        }
      />
    </section>
  );
};

export default CourseColumns;
