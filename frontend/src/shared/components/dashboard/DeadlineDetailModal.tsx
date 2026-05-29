import React from 'react';
import { Deadline, Course } from '@/shared/types/types';
import { format, parseISO } from 'date-fns';
import { getDeadlineColor } from './dashboardUtils';

interface Props {
  deadline: Deadline | null;
  courses: Course[];
  onClose: () => void;
}

const DeadlineDetailModal: React.FC<Props> = ({ deadline, courses, onClose }) => {
  if (!deadline) return null;
  const course = courses.find((c) => c.id === deadline.course_id);
  const color = getDeadlineColor(deadline.type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <span className={`inline-block text-[8px] font-black text-white px-2 py-1 rounded uppercase tracking-widest ${color}`}>
          {deadline.type}
        </span>
        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-2 mt-3">
          {deadline.title}
        </h3>
        <p className="text-sm font-bold text-slate-500">
          {format(parseISO(deadline.date), 'EEEE, MMMM d, yyyy')}
        </p>
        {course && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {course.code} • {course.name}
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default DeadlineDetailModal;
