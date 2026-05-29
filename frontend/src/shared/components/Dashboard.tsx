import React from 'react';
import { AcademicRecord, Course, EntryType, Notice, Deadline } from '@/shared/types/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Activity,
  Layers,
  Clock,
  MapPin,
  ChevronRight,
  Calendar,
  BookOpen,
  AlertCircle,
  Zap,
  CheckCircle2,
  Filter,
  Users,
  ExternalLink
} from 'lucide-react';
import QuickPreviewModal from './QuickPreviewModal';
import NoticeBoard from './NoticeBoard';
import { ENTRY_TYPE_COLORS } from '@/shared/utils/constants';
import { format, isToday, isFuture, isBefore, parseISO, addDays, isWithinInterval, startOfToday } from 'date-fns';

interface Props {
  records: AcademicRecord[];
  courses: Course[];
  notices: Notice[];
  deadlines: Deadline[];
  onAction: (tab: any) => void;
  onDateSelect?: (date: Date | string) => void;
  userProfile?: { sub_section?: string; section: string };
  batchId: string;
  section: string;
}

const Dashboard: React.FC<Props> = ({ records, courses, notices, deadlines, onAction, onDateSelect, userProfile, batchId, section }) => {
  const [selectedRecord, setSelectedRecord] = React.useState<AcademicRecord | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [selectedDeadline, setSelectedDeadline] = React.useState<Deadline | null>(null);

  const activeNotices = React.useMemo(() => {
    const now = new Date();
    return notices.filter(n => !n.expires_at || new Date(n.expires_at) > now);
  }, [notices]);

  const todayRecords = records.filter(r => isToday(parseISO(r.date)));
  const todayActivityRecords = todayRecords.filter(r => r.type !== EntryType.MATERIAL);
  const todayDeadlines = (deadlines || []).filter(d => d && d.date && isToday(parseISO(d.date)));
  
  const upcomingDeadlines = (deadlines || [])
    .filter(d => d && d.date && (isFuture(parseISO(d.date)) || isToday(parseISO(d.date))))
    .sort((a, b) => a.date.localeCompare(b.date));

  const pastDeadlines = (deadlines || [])
    .filter(d => d && d.date && isBefore(parseISO(d.date), startOfToday()))
    .sort((a, b) => b.date.localeCompare(a.date));

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

  const [showAllUpcoming, setShowAllUpcoming] = React.useState(false);
  const [showAllHistory, setShowAllHistory] = React.useState(false);

  const displayedUpcoming = showAllUpcoming ? upcomingDeadlines : upcomingDeadlines.slice(0, 5);
  const displayedPast = showAllHistory ? pastDeadlines : pastDeadlines.slice(0, 3);

  const totalCredits = courses.reduce((acc, c) => acc + (c.credit || 0), 0);
  const theoryCourses = courses.filter(c => !c.name.toLowerCase().includes('lab'));
  const labCourses = courses.filter(c => c.name.toLowerCase().includes('lab'));

  return (
    <div className="space-y-8 pb-32">
      <QuickPreviewModal
        record={selectedRecord}
        courseName={courses.find(c => c.id === selectedRecord?.course_id)?.name}
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onNavigateToRecord={(record) => setSelectedRecord(record)}
        onNavigateToDate={(date) => {
          setSelectedRecord(null);
          onDateSelect?.(date);
        }}
      />

      <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
        <div className="contents lg:flex lg:flex-col lg:w-[65%] xl:w-[70%] gap-8">
          {activeNotices.length > 0 && (
            <div className="order-2 lg:order-none w-full tour-notices">
              <NoticeBoard notices={activeNotices} courses={courses} onDateSelect={onDateSelect} onAction={onAction} batchId={batchId} section={section as any} />
            </div>
          )}

          <div className="contents lg:grid lg:grid-cols-2 lg:gap-8 w-full">
            <div className="order-3 lg:order-none w-full tour-schedule">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800/60 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-pro relative overflow-hidden group/card h-full">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
                      <BookOpen size={16} />
                    </div>
                    <h3 className="text-[11px] font-bold text-slate-900 dark:text-white tracking-widest uppercase">Theory Classes</h3>
                  </div>
                  <div className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded text-[9px] font-bold">{theoryCourses.length} COURSES</div>
                </div>
                <div className="space-y-4">
                  {theoryCourses.map(course => (
                    <div key={course.id} onClick={() => onAction('courses')} className="group flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-800/50 rounded-2xl cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center shadow-sm group-hover:bg-indigo-600 group-hover:border-indigo-500 group-hover:text-white transition-all">
                          <span className="text-[8px] font-black opacity-60">CR</span>
                          <span className="text-xs font-black leading-none">{course.credit}</span>
                        </div>
                        <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors uppercase tracking-tight truncate max-w-[150px]">{course.name}</h4>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-4 lg:order-none w-full">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-pro dark:shadow-2xl relative overflow-hidden group/group h-full">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                      <Terminal size={16} />
                    </div>
                    <h3 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-widest">Lab Classes</h3>
                  </div>
                  <div className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[9px] font-black uppercase">{labCourses.length} COURSES</div>
                </div>
                <div className="space-y-4">
                  {labCourses.map(course => (
                    <div key={course.id} onClick={() => onAction('courses')} className="group flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-700/50 rounded-2xl cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-all">
                          <span className="text-[8px] font-black opacity-60">CR</span>
                          <span className="text-xs font-black leading-none">{course.credit}</span>
                        </div>
                        <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 transition-colors uppercase tracking-tight truncate max-w-[150px]">{course.name}</h4>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="order-6 lg:order-none w-full">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800/60 rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 shadow-pro">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50 dark:border-slate-800/60">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <h3 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-widest">Lab Groups</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.filter(c => c.name.toLowerCase().includes('lab')).map(course => (
                  <div key={course.id} className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:border-indigo-100 transition-all">
                    <h4 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase pb-3 mb-4">{course.code} Group</h4>
                    <button onClick={() => onAction('groups')} className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-[9px] font-bold uppercase hover:bg-slate-900 hover:text-white transition-all shadow-sm">View Members</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="contents lg:flex lg:flex-col lg:w-[35%] xl:w-[30%] gap-8">
          <div className="order-1 lg:order-none w-full space-y-6">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800/60 rounded-[2.5rem] p-6 shadow-pro relative overflow-hidden group/stats tour-stats">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover/stats:opacity-[0.07] transition-opacity">
                <Activity size={40} className="text-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-6 relative z-10">
                {[
                  { label: 'Schedule', val: todayRecords.length, icon: <Activity size={14} />, color: 'bg-indigo-500' },
                  { label: 'Group', val: userProfile?.sub_section ? `${userProfile.section}${userProfile.sub_section}` : 'Theory', icon: <Users size={14} />, color: 'bg-emerald-500' },
                  { label: 'Credits', val: totalCredits, icon: <BookOpen size={14} />, color: 'bg-amber-500' },
                  { label: 'Section', val: userProfile?.section || '?', icon: <Layers size={14} />, color: 'bg-violet-500' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 group/item cursor-default">
                    <div className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center text-white shadow-lg shadow-black/5 group-hover/item:scale-110 transition-transform`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{item.label}</p>
                      <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">{item.val}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="order-5 lg:order-none w-full flex-1 tour-deadlines">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[3rem] p-8 min-h-[600px] shadow-pro dark:shadow-2xl relative overflow-hidden flex flex-col h-full">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 dark:bg-indigo-600/10 blur-[80px] rounded-full" />
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h3 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                  <Clock size={18} className="text-indigo-500" /> Timeline
                </h3>
              </div>
              <div className="space-y-8 relative z-10 flex-1 overflow-y-auto no-scrollbar">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Upcoming</span>
                  </div>
                  {displayedUpcoming.map(deadline => {
                    const course = courses.find(c => c.id === deadline.course_id);
                    const color = getDeadlineColor(deadline.type);
                    return (
                      <div key={deadline.id} onClick={() => setSelectedDeadline(deadline)} className="group cursor-pointer flex gap-5 items-start hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-2xl px-3 py-2 -mx-3 transition-all">
                        <div className={`w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center transition-all duration-500 shadow-sm dark:shadow-xl group-hover:scale-110 flex-shrink-0`}>
                          <span className="text-[8px] font-black text-slate-500 uppercase">{format(parseISO(deadline.date), 'MMM')}</span>
                          <span className="text-lg font-black text-slate-800 dark:text-white leading-none mt-1">{format(parseISO(deadline.date), 'dd')}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[12px] font-black text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white uppercase truncate mb-0.5 transition-colors">{deadline.title}</h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[7px] font-black text-white px-1.5 py-0.5 rounded ${color} uppercase tracking-widest`}>{deadline.type}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-700 dark:bg-slate-500" />
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest truncate">{course ? course.name : 'General'}</p>
                            {(deadline.section || deadline.sub_section) && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-slate-700 dark:bg-slate-500" />
                                <span className="text-[7px] font-black bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded uppercase">
                                  {deadline.section}{deadline.sub_section || ''}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={12} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 flex-shrink-0 self-center transition-colors" />
                      </div>
                    );
                  })}
                  {upcomingDeadlines.length > 5 && (
                    <button
                      onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                      className="w-full py-3 mt-2 border border-slate-800/50 rounded-xl text-[8px] font-black text-slate-500 uppercase tracking-widest hover:bg-indigo-600/10 hover:text-indigo-400 transition-all"
                    >
                      {showAllUpcoming ? 'Collapse List' : `See ${upcomingDeadlines.length - 5} More Upcoming`}
                    </button>
                  )}
                </div>

                {displayedPast.length > 0 && (
                  <div className="space-y-6 pt-6 border-t border-slate-800/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock size={12} className="text-slate-500" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">History</span>
                    </div>
                    <div className="space-y-5 opacity-60 hover:opacity-100 transition-opacity">
                      {displayedPast.map(deadline => {
                        if (!deadline?.date) return null;
                        const course = courses.find(c => c.id === deadline.course_id);
                        return (
                          <div key={deadline.id} onClick={() => setSelectedDeadline(deadline)} className="group cursor-pointer flex gap-4 items-center grayscale hover:grayscale-0 transition-all hover:bg-slate-800/40 rounded-xl px-2 py-1.5 -mx-2">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center flex-shrink-0">
                              <span className="text-[7px] font-bold text-slate-500 uppercase leading-none">{format(parseISO(deadline.date), 'MMM')}</span>
                              <span className="text-sm font-black text-slate-400 leading-none mt-0.5">{format(parseISO(deadline.date), 'dd')}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] font-bold text-slate-400 group-hover:text-slate-200 uppercase truncate tracking-tight">{deadline.title}</h4>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">{deadline.type}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-700 dark:bg-slate-500" />
                                <span className="text-[7px] font-bold text-slate-600 uppercase truncate">{course?.code || 'GEN'}</span>
                                {(deadline.section || deadline.sub_section) && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-slate-700 dark:bg-slate-500" />
                                    <span className="text-[6.5px] font-black bg-slate-800 dark:bg-slate-750 text-slate-400 px-1 py-0.5 rounded uppercase">
                                      {deadline.section}{deadline.sub_section || ''}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <ChevronRight size={11} className="text-slate-700 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                          </div>
                        );
                      })}
                    </div>
                    {pastDeadlines.length > 3 && (
                      <button
                        onClick={() => setShowAllHistory(!showAllHistory)}
                        className="w-full py-3 mt-2 border border-slate-800/50 rounded-xl text-[8px] font-black text-slate-500 uppercase tracking-widest hover:bg-indigo-600/10 hover:text-indigo-400 transition-all"
                      >
                        {showAllHistory ? 'Collapse History' : `See ${pastDeadlines.length - 3} More History`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
