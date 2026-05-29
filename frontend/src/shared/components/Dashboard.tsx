import React from 'react';
import { AcademicRecord, Course, EntryType, Notice, Deadline } from '@/shared/types/types';
import { motion } from 'framer-motion';
import {
  Terminal,
  Activity,
  Layers,
  Clock,
  ChevronRight,
  BookOpen,
  Calendar,
  Users,
  Zap,
  GraduationCap,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import QuickPreviewModal from './QuickPreviewModal';
import NoticeBoard from './NoticeBoard';
import { format, isToday, isFuture, isBefore, parseISO, startOfToday } from 'date-fns';

interface Props {
  records: AcademicRecord[];
  courses: Course[];
  notices: Notice[];
  deadlines: Deadline[];
  onAction: (tab: string, subId?: string) => void;
  onDateSelect?: (date: Date | string) => void;
  userProfile?: { sub_section?: string; section: string };
  batchId: string;
  section: string;
}

const Dashboard: React.FC<Props> = ({
  records,
  courses,
  notices,
  deadlines,
  onAction,
  onDateSelect,
  userProfile,
  batchId,
  section,
}) => {
  const [selectedRecord, setSelectedRecord] = React.useState<AcademicRecord | null>(null);
  const [selectedDeadline, setSelectedDeadline] = React.useState<Deadline | null>(null);
  const [showAllUpcoming, setShowAllUpcoming] = React.useState(false);

  const activeNotices = React.useMemo(() => {
    const now = new Date();
    return notices.filter((n) => !n.expires_at || new Date(n.expires_at) > now);
  }, [notices]);

  const todayRecords = records.filter((r) => isToday(parseISO(r.date)));
  const todayActivityRecords = todayRecords.filter((r) => r.type !== EntryType.MATERIAL);

  const upcomingDeadlines = (deadlines || [])
    .filter((d) => d?.date && (isFuture(parseISO(d.date)) || isToday(parseISO(d.date))))
    .sort((a, b) => a.date.localeCompare(b.date));

  const pastDeadlines = (deadlines || [])
    .filter((d) => d?.date && isBefore(parseISO(d.date), startOfToday()))
    .sort((a, b) => b.date.localeCompare(a.date));

  const displayedUpcoming = showAllUpcoming ? upcomingDeadlines : upcomingDeadlines.slice(0, 6);

  const totalCredits = courses.reduce((acc, c) => acc + (c.credit || 0), 0);
  const theoryCourses = courses.filter((c) => !c.name.toLowerCase().includes('lab'));
  const labCourses = courses.filter((c) => c.name.toLowerCase().includes('lab'));

  const getDeadlineColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('ct')) return 'bg-amber-500';
    if (t.includes('mid')) return 'bg-indigo-600';
    if (t.includes('final')) return 'bg-rose-600';
    if (t.includes('presentation')) return 'bg-emerald-500';
    if (t.includes('project')) return 'bg-violet-600';
    if (t.includes('assignment')) return 'bg-blue-500';
    if (t.includes('lab')) return 'bg-cyan-600';
    return 'bg-slate-600';
  };

  const subLabel = userProfile?.sub_section
    ? `${userProfile.section}${userProfile.sub_section}`
    : 'Theory';

  const quickLinks = [
    {
      id: 'calendar',
      label: 'Calendar',
      desc: 'Full schedule',
      icon: Calendar,
      color: 'from-indigo-500 to-violet-600',
      action: () => onAction('calendar'),
    },
    {
      id: 'courses',
      label: 'Courses',
      desc: `${courses.length} enrolled`,
      icon: BookOpen,
      color: 'from-emerald-500 to-teal-600',
      action: () => onAction('courses'),
    },
    {
      id: 'groups',
      label: 'Group List',
      desc: 'PIN protected',
      icon: Users,
      color: 'from-amber-500 to-orange-600',
      action: () => onAction('groups'),
    },
    {
      id: 'notices',
      label: 'Notices',
      desc: `${activeNotices.length} active`,
      icon: Sparkles,
      color: 'from-rose-500 to-pink-600',
      action: () => onAction('notices'),
    },
  ];

  return (
    <div className="space-y-6 pb-28">
      <QuickPreviewModal
        record={selectedRecord}
        courseName={courses.find((c) => c.id === selectedRecord?.course_id)?.name}
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onNavigateToRecord={(record) => setSelectedRecord(record)}
        onNavigateToDate={(date) => {
          setSelectedRecord(null);
          onDateSelect?.(date);
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] lg:rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 lg:p-10 text-white shadow-xl shadow-indigo-900/20 tour-stats">
        <div className="absolute -top-20 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-violet-400/20 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-200 mb-2">
              Section {section} Overview
            </p>
            <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight leading-tight">
              {format(new Date(), 'EEEE')}
            </h1>
            <p className="text-sm font-bold text-indigo-100/90 mt-1">
              {format(new Date(), 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto lg:min-w-[420px]">
            {[
              { label: 'Today', val: todayRecords.length, icon: Activity },
              { label: 'Sub', val: subLabel, icon: Layers },
              { label: 'Credits', val: totalCredits, icon: GraduationCap },
              { label: 'Due Soon', val: upcomingDeadlines.length, icon: Clock },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <item.icon size={14} className="text-indigo-200" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-indigo-200">
                    {item.label}
                  </span>
                </div>
                <p className="text-lg font-black truncate">{item.val}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {quickLinks.map((link) => (
          <button
            key={link.id}
            type="button"
            onClick={link.action}
            className="group relative overflow-hidden rounded-2xl p-4 lg:p-5 text-left border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all"
          >
            <div
              className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${link.color}`}
            />
            <div className="relative z-10 flex items-start justify-between">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${link.color} text-white flex items-center justify-center shadow-lg group-hover:bg-white/20 transition-colors`}
              >
                <link.icon size={18} />
              </div>
              <ArrowUpRight
                size={16}
                className="text-slate-300 group-hover:text-white transition-colors"
              />
            </div>
            <div className="relative z-10 mt-4">
              <p className="text-[11px] font-black uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-white transition-colors">
                {link.label}
              </p>
              <p className="text-[9px] font-bold text-slate-400 group-hover:text-white/80 transition-colors mt-0.5">
                {link.desc}
              </p>
            </div>
          </button>
        ))}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
        {/* Main column */}
        <div className="xl:col-span-8 space-y-6 lg:space-y-8">
          {/* Today */}
          <section className="tour-schedule rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 lg:p-8 shadow-sm">
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
                    {todayActivityRecords.length} activities
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onAction('calendar')}
                className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-500"
              >
                Open Calendar
              </button>
            </div>
            {todayActivityRecords.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  No classes or events today
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayActivityRecords.slice(0, 5).map((record) => {
                  const course = courses.find((c) => c.id === record.course_id);
                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => setSelectedRecord(record)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all text-left group"
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
                      <ChevronRight
                        size={16}
                        className="text-slate-300 group-hover:text-indigo-500 shrink-0"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {activeNotices.length > 0 && (
            <div className="tour-notices">
              <NoticeBoard
                notices={activeNotices}
                courses={courses}
                onDateSelect={onDateSelect}
                onAction={onAction}
                batchId={batchId}
                section={section as any}
              />
            </div>
          )}

          {/* Courses */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 lg:p-7 shadow-sm">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-indigo-600" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                    Theory
                  </h3>
                </div>
                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-lg">
                  {theoryCourses.length}
                </span>
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                {theoryCourses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => onAction('courses', course.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <span className="text-[10px] font-black">{course.credit}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase truncate flex-1">
                      {course.name}
                    </span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 lg:p-7 shadow-sm">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal size={16} className="text-emerald-600" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                    Lab
                  </h3>
                </div>
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg">
                  {labCourses.length}
                </span>
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                {labCourses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => onAction('courses', course.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <span className="text-[10px] font-black">{course.credit}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase truncate flex-1">
                      {course.name}
                    </span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500" />
                  </button>
                ))}
              </div>
              {labCourses.length > 0 && (
                <button
                  type="button"
                  onClick={() => onAction('groups')}
                  className="mt-4 w-full py-3 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                >
                  View Lab Group Lists
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar — deadlines */}
        <aside className="xl:col-span-4 tour-deadlines">
          <div className="sticky top-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 lg:p-7 shadow-sm min-h-[420px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                    Deadlines
                  </h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Upcoming & history
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Upcoming
                  </span>
                </div>
                {displayedUpcoming.length === 0 ? (
                  <p className="text-[10px] font-bold text-slate-400 uppercase py-4 text-center">
                    Nothing due soon
                  </p>
                ) : (
                  <div className="space-y-3">
                    {displayedUpcoming.map((deadline) => {
                      const course = courses.find((c) => c.id === deadline.course_id);
                      const color = getDeadlineColor(deadline.type);
                      const isDueToday = isToday(parseISO(deadline.date));
                      return (
                        <motion.button
                          key={deadline.id}
                          type="button"
                          whileHover={{ x: 4 }}
                          onClick={() => setSelectedDeadline(deadline)}
                          className="w-full flex gap-3 items-start p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left group"
                        >
                          <div
                            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 text-white ${color} ${isDueToday ? 'ring-2 ring-offset-2 ring-emerald-400 dark:ring-offset-slate-900' : ''}`}
                          >
                            <span className="text-[7px] font-black uppercase opacity-90">
                              {format(parseISO(deadline.date), 'MMM')}
                            </span>
                            <span className="text-sm font-black leading-none">
                              {format(parseISO(deadline.date), 'dd')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase truncate group-hover:text-indigo-600 transition-colors">
                              {deadline.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span
                                className={`text-[7px] font-black text-white px-1.5 py-0.5 rounded uppercase ${color}`}
                              >
                                {deadline.type}
                              </span>
                              <span className="text-[8px] font-bold text-slate-400 uppercase truncate">
                                {course?.code || 'General'}
                              </span>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
                {upcomingDeadlines.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                    className="w-full mt-3 py-2.5 text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
                  >
                    {showAllUpcoming ? 'Show less' : `+${upcomingDeadlines.length - 6} more`}
                  </button>
                )}
              </div>

              {pastDeadlines.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Recent
                  </p>
                  <div className="space-y-2 opacity-70">
                    {pastDeadlines.slice(0, 3).map((deadline) => (
                      <div
                        key={deadline.id}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-lg"
                      >
                        <span className="text-[9px] font-black text-slate-400 w-10">
                          {format(parseISO(deadline.date), 'MMM dd')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase truncate flex-1">
                          {deadline.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {selectedDeadline && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedDeadline(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">
              {selectedDeadline.type}
            </p>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-2">
              {selectedDeadline.title}
            </h3>
            <p className="text-sm font-bold text-slate-500">
              {format(parseISO(selectedDeadline.date), 'EEEE, MMMM d, yyyy')}
            </p>
            <button
              type="button"
              onClick={() => setSelectedDeadline(null)}
              className="mt-6 w-full py-3 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
