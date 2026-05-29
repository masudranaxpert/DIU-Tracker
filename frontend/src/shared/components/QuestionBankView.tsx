import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  SearchX,
  Sparkles,
  X,
} from 'lucide-react';
import { format } from 'date-fns';

import { apiClient } from '@/shared/services/apiClient';

type QbQuestion = {
  question_external_id: number;
  pdf_url: string;
  department?: string | null;
  course_name?: string | null;
  semester_name?: string | null;
  exam_type?: string | null;
  submissions_count?: number;
  scraped_at?: string | null;
};

type QbFilters = {
  departments: string[];
  courses: string[];
  semesters: string[];
  exam_types: string[];
};

type QbListResponse = {
  items: QbQuestion[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

type QbSubmission = {
  id: number;
  pdf_url: string;
  section?: string | null;
  uploader?: string | null;
};

type QbSubmissionsResponse = {
  submissions: QbSubmission[];
  status?: 'ready' | 'refreshing' | 'error';
  from_cache?: boolean;
  error?: string;
};

type SubmissionState = {
  loading: boolean;
  items: QbSubmission[];
  refreshing?: boolean;
  error?: string;
};

const DEFAULT_DEPARTMENT = 'CSE';
const SUBMISSION_POLL_MS = 2000;

const examBadgeClass = (name: string) => {
  switch ((name || '').toLowerCase()) {
    case 'mid':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
    case 'final':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'quiz':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    default:
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  }
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

type ComboboxProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function Combobox({ icon, label, value, options, onChange }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    const timer = setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      clearTimeout(timer);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, query]);

  const select = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`group flex h-11 w-full items-center justify-between gap-2 rounded-2xl border bg-white/85 px-3 text-sm font-bold text-slate-900 transition-all dark:bg-slate-900/70 dark:text-slate-100 ${
          value
            ? 'border-indigo-300 ring-2 ring-indigo-500/15 dark:border-indigo-700'
            : 'border-indigo-100 hover:border-indigo-300 dark:border-slate-800 dark:hover:border-indigo-700'
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-slate-500 dark:text-slate-400">{icon}</span>
          <span className={`truncate ${value ? '' : 'text-slate-500 dark:text-slate-400'}`}>
            {value || label}
          </span>
        </span>
        <ChevronsUpDown size={15} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl shadow-indigo-900/10 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <Search size={14} className="text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${label.replace('All ', '').toLowerCase()}...`}
              className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => select('')}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-bold text-slate-600 transition-colors hover:bg-indigo-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {label}
              {!value && <Check size={15} className="text-indigo-600 dark:text-indigo-400" />}
            </button>
            {filtered.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => select(option)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-800 transition-colors hover:bg-indigo-50 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <span className="truncate">{option}</span>
                {value === option && <Check size={15} className="text-indigo-600 dark:text-indigo-400" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-xs font-semibold text-slate-400">No match found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const QuestionBankView: React.FC = () => {
  const [items, setItems] = useState<QbQuestion[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<QbFilters>({ departments: [], courses: [], semesters: [], exam_types: [] });
  const [department, setDepartment] = useState(DEFAULT_DEPARTMENT);
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState('');
  const [examType, setExamType] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [subs, setSubs] = useState<Record<number, SubmissionState>>({});
  const pollTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const activeCount = [department, course, semester, examType].filter(
    (value, index) => (index === 0 ? value !== DEFAULT_DEPARTMENT : Boolean(value))
  ).length;

  const clearPoll = useCallback((questionId: number) => {
    const timer = pollTimers.current[questionId];
    if (timer) {
      clearTimeout(timer);
      delete pollTimers.current[questionId];
    }
  }, []);

  const loadSubmissions = useCallback(
    async (questionId: number, options?: { force?: boolean }) => {
      clearPoll(questionId);

      if (options?.force) {
        try {
          await apiClient.post(`/qbank/questions/${questionId}/submissions/refresh`);
        } catch {
          setSubs((current) => ({
            ...current,
            [questionId]: { loading: false, items: [], error: 'Could not refresh PDF links.' },
          }));
          return;
        }
      }

      setSubs((current) => ({
        ...current,
        [questionId]: {
          loading: true,
          items: current[questionId]?.items || [],
          refreshing: Boolean(options?.force),
        },
      }));

      try {
        const response = await apiClient.get<QbSubmissionsResponse>(
          `/qbank/questions/${questionId}/submissions`
        );
        const data = response.data;
        const status = data?.status || 'ready';

        if (status === 'refreshing') {
          setSubs((current) => ({
            ...current,
            [questionId]: { loading: true, items: [], refreshing: true },
          }));
          pollTimers.current[questionId] = setTimeout(() => {
            loadSubmissions(questionId);
          }, SUBMISSION_POLL_MS);
          return;
        }

        if (status === 'error') {
          setSubs((current) => ({
            ...current,
            [questionId]: {
              loading: false,
              items: [],
              error: data?.error || 'Could not load PDF links. Try again.',
            },
          }));
          return;
        }

        setSubs((current) => ({
          ...current,
          [questionId]: { loading: false, items: data?.submissions || [] },
        }));
      } catch {
        setSubs((current) => ({
          ...current,
          [questionId]: { loading: false, items: [], error: 'Could not load PDF links. Try again.' },
        }));
      }
    },
    [clearPoll]
  );

  useEffect(() => {
    return () => {
      Object.values(pollTimers.current).forEach(clearTimeout);
      pollTimers.current = {};
    };
  }, []);

  const toggleView = useCallback(
    (questionId: number) => {
      setOpenId((current) => {
        const next = current === questionId ? null : questionId;
        if (next === null) {
          clearPoll(questionId);
        } else {
          loadSubmissions(questionId);
        }
        return next;
      });
    },
    [clearPoll, loadSubmissions]
  );

  const loadPage = useCallback(async (nextPage: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = buildQuery({
        page: nextPage,
        limit: 12,
        department: department || undefined,
        course: course || undefined,
        semester: semester || undefined,
        exam_type: examType || undefined,
        q: search.trim() || undefined,
      });
      const response = await apiClient.get<QbListResponse>(`/qbank/pdfs${qs}`);
      setItems(response.data?.items || []);
      setTotal(response.data?.total || 0);
      setTotalPages(response.data?.total_pages || 0);
      setPage(response.data?.page || nextPage);
    } catch {
      setError('Failed to load Question Bank. Try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  }, [department, course, semester, examType, search]);

  const loadFilters = useCallback(async () => {
    try {
      const response = await apiClient.get<QbFilters>('/qbank/pdf-filters');
      setFilters({
        departments: response.data?.departments || [],
        courses: response.data?.courses || [],
        semesters: response.data?.semesters || [],
        exam_types: response.data?.exam_types || [],
      });
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    const timer = setTimeout(() => loadPage(page), 250);
    return () => clearTimeout(timer);
  }, [loadPage, page]);

  const updateFilter = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setPage(1);
  };

  const clearAll = () => {
    setDepartment(DEFAULT_DEPARTMENT);
    setCourse('');
    setSemester('');
    setExamType('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="w-full min-h-[calc(100vh-7rem)] rounded-none sm:rounded-3xl p-3 sm:p-5 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_52%,#f0fdf4_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_34%),linear-gradient(135deg,#020617_0%,#0f172a_60%,#052e2b_100%)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/75 dark:bg-slate-900/70 border border-indigo-100 dark:border-slate-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-black uppercase tracking-widest mb-3">
              <Sparkles size={14} />
              Smart Question Archive
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Question Bank
            </h1>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1">
              Browse past exam questions by department, course, semester, and exam type.
            </p>
          </div>

          <button
            onClick={() => loadPage(page)}
            disabled={isLoading}
            className="h-11 px-4 rounded-2xl bg-white/85 dark:bg-slate-900/70 border border-indigo-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="relative z-40 rounded-3xl bg-white/80 dark:bg-slate-950/55 border border-indigo-100 dark:border-slate-800 shadow-xl shadow-indigo-900/5 backdrop-blur-xl p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
              <Filter size={17} className="text-indigo-600 dark:text-indigo-400" />
              Filter Questions
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-black">
                {total} total
              </span>
              {(activeCount > 0 || search) && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-black text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X size={13} />
                  Clear all {activeCount || ''}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search question id or PDF..."
                className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white/85 dark:bg-slate-900/70 border border-indigo-100 dark:border-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold"
              />
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
              <Combobox icon={<GraduationCap size={15} className="text-blue-600 dark:text-blue-400" />} label="All Departments" value={department} options={filters.departments} onChange={(value) => updateFilter(setDepartment, value)} />
              <Combobox icon={<BookOpen size={15} className="text-emerald-600 dark:text-emerald-400" />} label="All Courses" value={course} options={filters.courses} onChange={(value) => updateFilter(setCourse, value)} />
              <Combobox icon={<CalendarDays size={15} className="text-purple-600 dark:text-purple-400" />} label="All Semesters" value={semester} options={filters.semesters} onChange={(value) => updateFilter(setSemester, value)} />
              <Combobox icon={<FileText size={15} className="text-amber-600 dark:text-amber-400" />} label="All Exam Types" value={examType} options={filters.exam_types} onChange={(value) => updateFilter(setExamType, value)} />
            </div>
          </div>
        </div>

        {isLoading && items.length === 0 ? (
          <div className="min-h-[22rem] rounded-3xl bg-white/80 dark:bg-slate-950/55 border border-indigo-100 dark:border-slate-800 shadow-xl shadow-indigo-900/5 backdrop-blur-xl flex flex-col items-center justify-center">
            <Loader2 size={28} className="text-indigo-600 dark:text-indigo-400 animate-spin mb-3" />
            <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-pulse">
              Loading questions...
            </p>
          </div>
        ) : error ? (
          <div className="min-h-[22rem] rounded-3xl bg-white/80 dark:bg-slate-950/55 border border-rose-100 dark:border-rose-900/50 shadow-xl shadow-rose-900/5 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
            <SearchX size={24} className="text-rose-500 mb-3" />
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">{error}</p>
            <button
              onClick={() => loadPage(page)}
              className="mt-5 px-5 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-widest"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="min-h-[22rem] rounded-3xl bg-white/80 dark:bg-slate-950/55 border border-indigo-100 dark:border-slate-800 shadow-xl shadow-indigo-900/5 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
            <SearchX size={26} className="text-slate-400 mb-3" />
            <p className="text-base font-black text-slate-900 dark:text-white">No questions found</p>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Try clearing filters or searching less.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((question) => {
              const title = question.course_name || `Question #${question.question_external_id}`;
              const date = question.scraped_at ? format(new Date(question.scraped_at), 'MMM d, yyyy') : 'Recently indexed';
              const submissions = question.submissions_count ?? 0;
              const state = subs[question.question_external_id];
              return (
                <div
                  key={`${question.question_external_id}:${question.pdf_url}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-indigo-100 dark:border-slate-800 bg-white/86 dark:bg-slate-950/60 shadow-lg shadow-indigo-900/5 backdrop-blur-xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xl hover:shadow-indigo-900/10"
                >
                  <h3 className="line-clamp-2 text-base sm:text-lg font-black text-slate-950 dark:text-white">
                    {title}
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      <GraduationCap size={13} />
                      {question.department || 'CSE'}
                    </span>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-bold ${examBadgeClass(question.exam_type || '')}`}>
                      {question.exam_type || 'Exam'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-1 text-[11px] font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      <CalendarDays size={12} />
                      {question.semester_name || 'Semester'}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={13} />
                      {date}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <FileText size={13} />
                      {submissions} submission{submissions === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleView(question.question_external_id)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-indigo-700"
                    >
                      <Eye size={14} />
                      {openId === question.question_external_id ? 'Hide' : 'View'}
                      {submissions > 1 ? ` (${submissions})` : ''}
                    </button>
                    <a
                      href={`https://diuqbank.com/questions/${question.question_external_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-700"
                    >
                      <ExternalLink size={14} />
                      Credit
                    </a>
                  </div>

                  {openId === question.question_external_id && (
                    <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                      {state?.loading ? (
                        <div className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <Loader2 size={15} className="animate-spin" />
                          {state.refreshing ? 'Fetching fresh PDF links (cached 24h)...' : 'Loading PDF links...'}
                        </div>
                      ) : state?.error ? (
                        <div className="flex items-center justify-between gap-2 py-1">
                          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{state.error}</span>
                          <button
                            type="button"
                            onClick={() => loadSubmissions(question.question_external_id, { force: true })}
                            className="rounded-lg px-2 py-1 text-[11px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-slate-800"
                          >
                            Retry
                          </button>
                        </div>
                      ) : state && state.items.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {state.items.map((submission, index) => (
                            <a
                              key={submission.id}
                              href={submission.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              title={submission.section || submission.uploader || `PDF ${index + 1}`}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-[11px] font-black uppercase tracking-widest text-indigo-700 transition-colors hover:bg-indigo-600 hover:text-white dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white"
                            >
                              <FileText size={13} />
                              View {String(index + 1).padStart(2, '0')}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                          No PDF found for this question.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="rounded-3xl bg-white/80 dark:bg-slate-950/55 border border-indigo-100 dark:border-slate-800 shadow-lg shadow-indigo-900/5 backdrop-blur-xl px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1 || isLoading}
              className="h-10 px-3 rounded-2xl bg-white/85 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 font-black text-[11px] uppercase tracking-widest"
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <span className="text-[11px] sm:text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages || isLoading}
              className="h-10 px-3 rounded-2xl bg-white/85 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 font-black text-[11px] uppercase tracking-widest"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionBankView;
