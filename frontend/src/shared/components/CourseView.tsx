import React, { useState, useMemo, useEffect } from 'react';
import { Course, AcademicRecord, EntryType, Section, Deadline } from '@/shared/types/types';
import {
  BookOpen,
  FileText,
  ChevronRight,
  ChevronLeft,
  Search,
  Users,
  Layers,
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  FolderOpen,
  LayoutGrid,
} from 'lucide-react';
import { ENTRY_TYPE_COLORS } from '@/shared/utils/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { isFuture, isToday, isBefore, parseISO, startOfToday, format } from 'date-fns';
import { studentService } from '@/shared/services/studentService';

interface Props {
  courses: Course[];
  records: AcademicRecord[];
  section: Section;
  batchId: string;
  userSubSection?: string;
  onAction?: (type: 'record' | 'notice', id: string) => void;
  deadlines?: Deadline[];
  subId?: string;
  onCourseSelect?: (id: string | null) => void;
}

type DetailTab = 'overview' | 'timeline' | 'materials';

const DEADLINE_COLORS: Record<string, string> = {
  ct: 'bg-amber-500',
  mid: 'bg-indigo-600',
  final: 'bg-rose-600',
  presentation: 'bg-emerald-500',
  project: 'bg-violet-600',
  assignment: 'bg-blue-500',
  lab: 'bg-cyan-600',
};

function deadlineColor(type: string): string {
  const t = type.toLowerCase();
  for (const [key, cls] of Object.entries(DEADLINE_COLORS)) {
    if (t.includes(key)) return cls;
  }
  return 'bg-slate-600';
}

const CourseView: React.FC<Props> = ({
  courses,
  records,
  section,
  batchId,
  userSubSection,
  onAction,
  deadlines = [],
  subId,
  onCourseSelect,
}) => {
  const [activeCourseId, setActiveCourseId] = useState<string | null>(subId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [recordFilter, setRecordFilter] = useState<'ALL' | EntryType>('ALL');

  useEffect(() => {
    if (subId !== undefined && subId !== activeCourseId) {
      setActiveCourseId(subId);
    }
  }, [subId]);

  useEffect(() => {
    setDetailTab('overview');
    setRecordFilter('ALL');
  }, [activeCourseId]);

  const filteredCourses = useMemo(
    () =>
      courses.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.code.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [courses, searchQuery]
  );

  const activeCourse = courses.find((c) => c.id === activeCourseId);

  const allCourseRecords = useMemo(
    () => records.filter((r) => r.course_id === activeCourseId && r.section === section),
    [records, activeCourseId, section]
  );

  const courseRecords = useMemo(
    () =>
      allCourseRecords.filter((r) => recordFilter === 'ALL' || r.type === recordFilter),
    [allCourseRecords, recordFilter]
  );

  const activeDeadlines = useMemo(
    () => deadlines.filter((d) => d.course_id === activeCourseId),
    [deadlines, activeCourseId]
  );

  const upcomingDeadlines = useMemo(
    () =>
      activeDeadlines
        .filter((d) => isFuture(parseISO(d.date)) || isToday(parseISO(d.date)))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [activeDeadlines]
  );

  const nextDeadline = upcomingDeadlines[0];

  const selectCourse = (id: string) => {
    setActiveCourseId(id);
    onCourseSelect?.(id);
  };

  const clearCourse = () => {
    setActiveCourseId(null);
    onCourseSelect?.(null);
  };

  const recordCountFor = (courseId: string) =>
    records.filter((r) => r.course_id === courseId && r.section === section).length;

  /* ─── Course list (browse) ─── */
  const CourseBrowse = () => (
    <div className="mx-auto w-full max-w-3xl lg:max-w-4xl space-y-6 pb-20">
      <div className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] bg-indigo-600 p-6 sm:p-8 text-white shadow-xl shadow-indigo-600/20">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-200 mb-2">
              Section {section}
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">My Courses</h1>
            <p className="text-indigo-100 text-sm font-medium mt-1">
              Select a course from the list to view materials, exams & schedule
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-center backdrop-blur-md">
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Enrolled</p>
            <p className="text-3xl font-black tabular-nums">{courses.length}</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Search course name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3.5 pl-12 pr-4 text-slate-800 dark:text-slate-100 font-medium shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        />
      </div>

      {filteredCourses.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-black text-slate-500 uppercase tracking-widest">
            {searchQuery ? 'No matching courses' : 'No courses yet'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5 sm:space-y-3 max-w-3xl mx-auto">
          {filteredCourses.map((course, idx) => {
            const count = recordCountFor(course.id);
            const teacher =
              course.teacher2 && userSubSection === '2' ? course.teacher2 : course.teacher || 'TBA';
            return (
              <motion.li
                key={course.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                className="list-none"
              >
                <button
                  type="button"
                  onClick={() => selectCourse(course.id)}
                  className="group w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer active:scale-[0.99] text-left min-h-[4.75rem]"
                >
                  <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex flex-col items-center justify-center">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[8px] sm:text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase mt-0.5 truncate max-w-[3.5rem]">
                      {course.code.split(' ').pop()?.slice(0, 6)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-600 dark:text-indigo-400 truncate">
                      {course.code}
                    </p>
                    <h3 className="text-[15px] sm:text-base font-black text-slate-900 dark:text-white leading-snug line-clamp-2 mt-0.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {course.name}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate mt-1 flex items-center gap-1">
                      <Users className="h-3 w-3 shrink-0" />
                      {teacher}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5 pl-1">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-wider text-slate-500">
                      {count} items
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">{course.credit} cr</span>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );

  /* ─── Record card ─── */
  const RecordCard = ({ task, index }: { task: AcademicRecord; index: number }) => {
    const isUpcoming = isFuture(parseISO(task.date));
    const colorClass = ENTRY_TYPE_COLORS[task.type as EntryType] || 'bg-slate-100 text-slate-500';
    return (
      <motion.button
        type="button"
        key={task.id}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        onClick={() => onAction?.('record', task.id)}
        className="w-full text-left flex gap-4 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all cursor-pointer active:scale-[0.99] group"
      >
        <div className="shrink-0 w-14 flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 py-2">
          <span className="text-lg font-black text-slate-800 dark:text-white leading-none">
            {format(parseISO(task.date), 'dd')}
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
            {format(parseISO(task.date), 'MMM')}
          </span>
        </div>
        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${colorClass}`}>
              {task.type}
            </span>
            {isUpcoming && (
              <span className="flex items-center gap-1 text-[8px] font-black uppercase text-rose-600 dark:text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Upcoming
              </span>
            )}
          </div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {task.title}
          </h4>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 shrink-0 self-center" />
      </motion.button>
    );
  };

  /* ─── Deadline row ─── */
  const DeadlineRow = ({ deadline }: { deadline: Deadline }) => {
    const color = deadlineColor(deadline.type);
    const isPast = isBefore(parseISO(deadline.date), startOfToday());
    const sub = deadline.sub_section || '';
    return (
      <div
        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
          isPast
            ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 opacity-70'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm'
        }`}
      >
        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white shrink-0 ${color}`}>
          <span className="text-sm font-black leading-none">{format(parseISO(deadline.date), 'dd')}</span>
          <span className="text-[8px] font-black uppercase">{format(parseISO(deadline.date), 'MMM')}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 line-clamp-2">{deadline.title}</h4>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white ${color}`}>
              {deadline.type}
            </span>
            {sub !== '' && (
              <span
                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                  sub === '1'
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50'
                }`}
              >
                {section}{sub}
              </span>
            )}
          </div>
        </div>
        {isPast ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        ) : (
          <Clock className="h-5 w-5 text-amber-500 shrink-0 animate-pulse" />
        )}
      </div>
    );
  };

  /* ─── Course detail hub ─── */
  const CourseDetail = () => {
    if (!activeCourse) return null;
    const isLab = activeCourse.name.toLowerCase().includes('lab');

    const tabs: { id: DetailTab; label: string; icon: React.ReactNode; count?: number }[] = [
      { id: 'overview', label: 'Overview', icon: <LayoutGrid size={16} /> },
      { id: 'timeline', label: 'Schedule', icon: <Calendar size={16} />, count: activeDeadlines.length },
      {
        id: 'materials',
        label: 'Materials',
        icon: <FolderOpen size={16} />,
        count: allCourseRecords.length,
      },
    ];

    return (
      <div className="flex flex-col min-h-0 flex-1 w-full">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white shadow-xl mb-4 sm:mb-6 shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_50%)] pointer-events-none" />
          <div className="relative z-10 p-5 sm:p-7">
            <button
              type="button"
              onClick={clearCourse}
              className="mb-4 inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
              Course list
            </button>

            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-200 mb-1">
              {activeCourse.code}
            </p>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black leading-tight tracking-tight">
              {activeCourse.name}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 text-[10px] font-bold">
                <Users size={12} />
                {isLab ? `Sec 1: ${activeCourse.teacher || 'TBA'}` : activeCourse.teacher || 'TBA'}
              </span>
              {isLab && activeCourse.teacher2 && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 text-[10px] font-bold">
                  <Users size={12} />
                  Sec 2: {activeCourse.teacher2}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 text-[10px] font-bold">
                <Layers size={12} />
                {activeCourse.credit} Credits
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 text-[10px] font-bold">
                Section {section}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-center">
                <p className="text-2xl font-black tabular-nums">{upcomingDeadlines.length}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200 mt-0.5">Upcoming</p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-center">
                <p className="text-2xl font-black tabular-nums">{allCourseRecords.length}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200 mt-0.5">Materials</p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-center">
                <p className="text-2xl font-black tabular-nums">{activeDeadlines.length}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200 mt-0.5">Milestones</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-20 -mx-0.5 px-0.5 py-1 mb-4 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl">
          <div className="flex p-1 gap-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDetailTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  detailTab === tab.id
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`min-w-[1.25rem] h-5 px-1 rounded-md text-[9px] font-black flex items-center justify-center ${
                      detailTab === tab.id ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab panels */}
        <div className="flex-1 min-h-0 pb-16">
          <AnimatePresence mode="wait">
            {detailTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {nextDeadline ? (
                  <button
                    type="button"
                    onClick={() => setDetailTab('timeline')}
                    className="w-full text-left p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                        Next on schedule
                      </span>
                    </div>
                    <DeadlineRow deadline={nextDeadline} />
                    <p className="text-[10px] font-bold text-indigo-500 mt-3 text-center uppercase tracking-wider group-hover:underline">
                      View full schedule →
                    </p>
                  </button>
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No milestones yet</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDetailTab('materials')}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-indigo-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <FileText className="h-5 w-5 text-indigo-500" />
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Materials</p>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                      {allCourseRecords.length === 0
                        ? 'No CT, slides, or files yet'
                        : `${allCourseRecords.length} record${allCourseRecords.length === 1 ? '' : 's'}`}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab('timeline')}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-indigo-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Calendar className="h-5 w-5 text-amber-500" />
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Schedule</p>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                      {upcomingDeadlines.length === 0
                        ? activeDeadlines.length === 0
                          ? 'No exam dates or deadlines yet'
                          : 'No upcoming — see completed in tab'
                        : `${upcomingDeadlines.length} upcoming date${upcomingDeadlines.length === 1 ? '' : 's'}`}
                    </p>
                  </button>
                </div>

                {allCourseRecords.slice(0, 3).length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                      Recent materials
                    </h3>
                    <div className="space-y-2">
                      {allCourseRecords
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 3)
                        .map((task, i) => (
                          <RecordCard key={task.id} task={task} index={i} />
                        ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {detailTab === 'timeline' && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {activeDeadlines.length === 0 ? (
                  <div className="p-10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <Calendar className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No schedule for this course</p>
                  </div>
                ) : (
                  <>
                    {upcomingDeadlines.length > 0 && (
                      <section>
                        <h3 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Clock size={14} /> Upcoming
                        </h3>
                        <div className="space-y-2">
                          {upcomingDeadlines.map((d) => (
                            <DeadlineRow key={d.id} deadline={d} />
                          ))}
                        </div>
                      </section>
                    )}
                    {activeDeadlines.filter((d) => isBefore(parseISO(d.date), startOfToday())).length > 0 && (
                      <section>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <CheckCircle2 size={14} /> Completed
                        </h3>
                        <div className="space-y-2 opacity-80">
                          {activeDeadlines
                            .filter((d) => isBefore(parseISO(d.date), startOfToday()))
                            .sort((a, b) => b.date.localeCompare(a.date))
                            .map((d) => (
                              <DeadlineRow key={d.id} deadline={d} />
                            ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {detailTab === 'materials' && (
              <motion.div
                key="materials"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex gap-2 overflow-x-auto snap-x pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setRecordFilter('ALL')}
                    className={`snap-start shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer min-h-[40px] ${
                      recordFilter === 'ALL'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    All
                  </button>
                  {[EntryType.CT, EntryType.MID, EntryType.FINAL, EntryType.ASSIGNMENT, EntryType.MATERIAL].map(
                    (type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setRecordFilter(type)}
                        className={`snap-start shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer min-h-[40px] ${
                          recordFilter === type
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {type}
                      </button>
                    )
                  )}
                </div>

                {['', '1', '2'].map((sub) => {
                  const subRecords = courseRecords.filter((r) => (r.sub_section || '') === sub);
                  if (subRecords.length === 0) return null;
                  return (
                    <section key={`sub-${sub}`} className="space-y-2">
                      <div className="flex items-center gap-2 px-1 py-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            sub === '' ? 'bg-slate-400' : sub === '1' ? 'bg-indigo-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                          {sub === '' ? 'Whole section' : `Sub-section ${section}${sub}`}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {subRecords
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((task, i) => (
                            <RecordCard key={task.id} task={task} index={i} />
                          ))}
                      </div>
                    </section>
                  );
                })}

                {courseRecords.length === 0 && (
                  <div className="p-10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <FolderOpen className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      {recordFilter === 'ALL' ? 'No materials yet' : `No ${recordFilter} items`}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-1 sm:px-0 min-h-0">
      <AnimatePresence mode="wait">
        {!activeCourseId ? (
          <motion.div
            key="course-list"
            className="tour-course-list"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <CourseBrowse />
          </motion.div>
        ) : (
          <motion.div
            key="course-detail"
            className="tour-course-detail mx-auto w-full max-w-3xl lg:max-w-4xl pb-16"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2 }}
          >
            <CourseDetail />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CourseView;
