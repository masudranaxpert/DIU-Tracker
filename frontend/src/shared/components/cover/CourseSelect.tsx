import React, { useMemo, useState } from 'react';
import { BookMarked } from 'lucide-react';

export interface CourseOption {
  code: string;
  name: string;
  teacher?: string;
  teacher2?: string;
}

interface CourseSelectProps {
  courses: CourseOption[];
  value: string;
  onTextChange: (text: string) => void;
  onSelectCourse: (course: CourseOption) => void;
  placeholder?: string;
  inputClassName: string;
}

const CourseSelect: React.FC<CourseSelectProps> = ({
  courses,
  value,
  onTextChange,
  onSelectCourse,
  placeholder = 'Search or type course title…',
  inputClassName,
}) => {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q
      ? courses.filter((c) => `${c.code} ${c.name}`.toLowerCase().includes(q))
      : courses;
    const seen = new Set<string>();
    return list
      .filter((c) => {
        const key = `${c.code}|${c.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 30);
  }, [courses, value]);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        className={inputClassName}
        onChange={(e) => {
          onTextChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 130)}
      />

      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
          <div className="p-1.5 space-y-0.5">
            {filtered.map((c, i) => (
              <button
                key={`${c.code}-${c.name}-${i}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelectCourse(c);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
              >
                <span className="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <BookMarked size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {c.name || c.code}
                  </span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {c.code}
                    {c.teacher ? ` • ${c.teacher}` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseSelect;
