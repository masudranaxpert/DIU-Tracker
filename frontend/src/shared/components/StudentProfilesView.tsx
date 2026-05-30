import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Phone,
  User,
  GraduationCap,
  PhoneCall,
  RefreshCw,
  Users,
  Hash,
  Loader2,
} from 'lucide-react';
import { adminService } from '@/shared/services/adminService';
import { Student, Section } from '@/shared/types/types';
import { useClientPagination } from '@/shared/hooks/useClientPagination';
import DirectoryPagination from './ui/DirectoryPagination';
import { matchesStudentDirectorySearch } from '@/shared/lib/studentDirectorySearch';

interface Props {
  batchId: string;
  section: Section;
  /** When true (CR), section cannot be changed via the header switcher. */
  isSectionLocked?: boolean;
}

const groupBadgeClass = (sub?: string | null) => {
  if (sub === '1') return 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50';
  if (sub === '2') return 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/50';
  return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
};

const StudentProfilesView: React.FC<Props> = ({ batchId, section, isSectionLocked }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const CACHE_KEY = `student_directory_${batchId}_${section}`;

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setStudents(JSON.parse(cached));
        setIsLoading(false);
      } catch {
        /* ignore bad cache */
      }
    }
    fetchData();
  }, [batchId, section]);

  const fetchData = async () => {
    setIsRefreshing(true);
    setFetchError(null);
    try {
      const data = await adminService.fetchSectionStudents(batchId, section);
      setStudents(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error fetching student directory:', error);
      setFetchError(
        error instanceof Error ? error.message : 'Could not load student directory.'
      );
      setStudents([]);
      localStorage.removeItem(CACHE_KEY);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => matchesStudentDirectorySearch(s, searchQuery))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchQuery]);

  const PAGE_SIZE = 12;
  const {
    page,
    total,
    totalPages,
    pageItems,
    rangeStart,
    rangeEnd,
    goToPage,
    resetPage,
  } = useClientPagination(filteredStudents, PAGE_SIZE);

  const prevSearch = useRef(searchQuery);
  useEffect(() => {
    if (prevSearch.current !== searchQuery) {
      resetPage();
      prevSearch.current = searchQuery;
    }
  }, [searchQuery, resetPage]);

  return (
    <div className="mx-auto w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl px-3 sm:px-4 pb-20 sm:pb-16">
      <div className="relative overflow-hidden bg-indigo-600 rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 text-white shadow-xl shadow-indigo-600/20 mb-6 sm:mb-8">
        <div className="absolute top-0 right-0 w-40 sm:w-48 h-40 sm:h-48 bg-white/10 blur-[80px] rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-black tracking-tight uppercase leading-tight">
                Student Directory
              </h1>
              <p className="text-indigo-100 text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-0.5">
                Section {section}
                {isSectionLocked && ' · your section only'}
              </p>
            </div>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-0 sm:shrink-0 sm:px-4 sm:py-3 sm:bg-white/10 sm:backdrop-blur-md sm:border sm:border-white/20 sm:rounded-2xl self-start sm:self-auto">
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Total students</p>
            <p className="text-2xl sm:text-3xl font-black tabular-nums leading-none">
              {searchQuery.trim() ? total : students.length}
            </p>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 mb-4 sm:mb-6 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="search"
              enterKeyHint="search"
              placeholder="Search ID, name, or phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium text-base sm:text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={fetchData}
            disabled={isRefreshing}
            className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
            title="Refresh"
            aria-label="Refresh directory"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {searchQuery.trim() && (
          <p className="text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {total} result{total === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {fetchError && (
        <div className="mb-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300">
          {fetchError}
        </div>
      )}

      <div className="min-h-[12rem]">
        {isLoading && students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Loading directory...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-2xl sm:rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-10 sm:p-12 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300">
              <Users className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <p className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight text-sm">No students found</p>
            <p className="text-slate-400 text-sm font-medium mt-2 max-w-xs mx-auto">
              {searchQuery ? 'Try a different search term.' : 'No students registered for this section yet.'}
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-2.5 sm:space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-1 lg:gap-3 lg:space-y-0">
              <AnimatePresence mode="popLayout">
                {pageItems.map((student, idx) => (
                  <motion.li
                    key={student.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: Math.min(idx * 0.025, 0.25) }}
                    className="group list-none"
                  >
                    <article className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-5 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-200/80 dark:hover:border-indigo-800/50 transition-all duration-300 min-h-[4.5rem] sm:min-h-[5rem]">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/50 dark:to-slate-800 border border-indigo-100/80 dark:border-indigo-900/50 flex items-center justify-center">
                          <span className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400">
                            {(student.name || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {student.sub_section && (
                          <span
                            className={`absolute -bottom-1 -right-1 min-w-[1.4rem] h-5 sm:h-6 px-1 rounded-md sm:rounded-lg flex items-center justify-center text-[8px] sm:text-[9px] font-black border-2 border-white dark:border-slate-900 shadow-sm ${groupBadgeClass(student.sub_section)}`}
                          >
                            G{student.sub_section}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 text-left py-0.5">
                        <h3 className="font-bold text-slate-900 dark:text-white text-[15px] sm:text-base leading-snug line-clamp-2 sm:truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {student.name}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-0.5 sm:gap-x-3 mt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 tracking-tight">
                            <Hash className="w-3 h-3 text-slate-400 shrink-0 hidden sm:block" />
                            {student.student_id}
                          </span>
                          {student.phone && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <Phone className="w-3 h-3 shrink-0" />
                              <span className="truncate">{student.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {student.phone ? (
                        <a
                          href={`tel:${student.phone}`}
                          className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:hover:bg-emerald-600 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                          title={`Call ${student.name}`}
                          aria-label={`Call ${student.name}`}
                        >
                          <PhoneCall className="w-5 h-5" />
                        </a>
                      ) : (
                        <div
                          className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-300"
                          title="No phone on file"
                          aria-hidden
                        >
                          <User className="w-5 h-5" />
                        </div>
                      )}
                    </article>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {filteredStudents.length > 0 && (
              <DirectoryPagination
                page={page}
                totalPages={totalPages}
                total={total}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onPageChange={(p) => {
                  goToPage(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentProfilesView;
