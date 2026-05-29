import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { courseListService } from '@/shared/services/courseListService';
import type { CourseListItem } from '@/shared/types/types';

export interface CourseCatalogSelectProps {
  value: string;
  onChange: (courseListId: string, course: CourseListItem | null) => void;
  /** When editing, pass labels so selection shows before search loads */
  selectedCode?: string;
  selectedName?: string;
  placeholder?: string;
  disabled?: boolean;
}

const CourseCatalogSelect: React.FC<CourseCatalogSelectProps> = ({
  value,
  onChange,
  selectedCode,
  selectedName,
  placeholder = 'Search code or name, then select…',
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<CourseListItem | null>(null);

  const displayCourse =
    picked ||
    (value && selectedCode
      ? ({ id: value, code: selectedCode, name: selectedName || '', default_credit: 3 } as CourseListItem)
      : options.find(c => c.id === value) || null);

  const loadOptions = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await courseListService.fetchCatalog(q);
      setOptions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => loadOptions(search), search ? 280 : 0);
    return () => clearTimeout(t);
  }, [isOpen, search, loadOptions]);

  useEffect(() => {
    if (!value) {
      setPicked(null);
      return;
    }
    const inList = options.find(c => c.id === value);
    if (inList) setPicked(inList);
  }, [value, options]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const handleSelect = (course: CourseListItem) => {
    setPicked(course);
    onChange(course.id, course);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPicked(null);
    onChange('', null);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(o => !o)}
        className={`w-full flex items-center gap-3 text-left pl-12 pr-10 py-3.5 rounded-2xl border transition-all font-bold text-sm relative ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
            : isOpen
              ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-4 ring-emerald-500/10 shadow-lg shadow-emerald-500/5'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-400/60'
        }`}
      >
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
          <BookOpen size={18} />
        </div>

        {displayCourse ? (
          <div className="flex-1 min-w-0 pr-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 truncate">
              {displayCourse.code}
            </p>
            <p className="text-slate-800 dark:text-white truncate font-bold">{displayCourse.name}</p>
          </div>
        ) : (
          <span className="text-slate-400 truncate">{placeholder}</span>
        )}

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {displayCourse && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={e => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-[200] left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Type course code or name…"
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-emerald-500" size={16} />
                )}
              </div>
            </div>

            <ul className="max-h-[280px] overflow-y-auto custom-scrollbar p-2">
              {!loading && options.length === 0 && (
                <li className="px-4 py-8 text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No courses found</p>
                  <p className="text-[10px] text-slate-400 mt-1">Try a different search</p>
                </li>
              )}
              {options.map(course => {
                const isSelected = value === course.id;
                return (
                  <li key={course.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(course)}
                      className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <div
                        className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isSelected ? <Check size={14} strokeWidth={3} /> : course.code.split(' ').pop()?.slice(0, 3)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-[10px] font-black uppercase tracking-wider ${
                            isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {course.code}
                        </p>
                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-800 dark:text-white'}`}>
                          {course.name}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CourseCatalogSelect;
