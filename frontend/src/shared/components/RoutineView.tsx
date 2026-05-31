import React, { useState, useEffect, useMemo } from 'react';
import { routineService } from '@/shared/services/routineService';
import { RoutineItem } from '@/shared/types/types';
import { Clock, Coffee, MapPin, User, Loader2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  batchId: string;
  section: string;
  subSection?: string;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getWeekDates() {
  const today = new Date();
  const currentDayIndex = today.getDay();
  const diffToSaturday = (currentDayIndex + 1) % 7;
  const saturday = new Date(today);
  saturday.setDate(today.getDate() - diffToSaturday);

  const weekDays = [];
  const dayNames = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const fullDayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(saturday);
    d.setDate(saturday.getDate() + i);
    weekDays.push({
      date: d,
      dayNum: d.getDate(),
      dayName: dayNames[i],
      fullDayName: fullDayNames[i]
    });
  }
  return weekDays;
}

const RoutineView: React.FC<Props> = ({ batchId, section, subSection }) => {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const weekDays = useMemo(() => getWeekDates(), []);

  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[today.getDay()];
    const validDays = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return validDays.includes(todayName) ? todayName : 'Saturday';
  });

  useEffect(() => {
    const loadRoutine = async () => {
      setIsLoading(true);
      try {
        const res = await routineService.fetchRoutine(batchId, section);
        setRoutines(res);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    loadRoutine();
  }, [batchId, section]);

  const filteredRoutines = useMemo(() => {
    return routines.filter((r) => {
      if (r.sub_section && subSection && r.sub_section.trim().toUpperCase() !== subSection.trim().toUpperCase()) {
        return false;
      }
      return true;
    });
  }, [routines, subSection]);

  const dayTimelineItems = useMemo(() => {
    const dayClasses = filteredRoutines
      .filter((r) => r.day === selectedDay)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    const timeline: (
      | { type: 'class'; data: RoutineItem }
      | { type: 'break'; start_time: string; end_time: string; duration: number }
    )[] = [];

    for (let i = 0; i < dayClasses.length; i++) {
      if (i > 0) {
        const prevEnd = timeToMinutes(dayClasses[i - 1].end_time);
        const currStart = timeToMinutes(dayClasses[i].start_time);
        const gap = currStart - prevEnd;
        if (gap > 10) {
          const hours = Math.floor(gap / 60);
          const mins = gap % 60;
          timeline.push({
            type: 'break',
            start_time: dayClasses[i - 1].end_time,
            end_time: dayClasses[i].start_time,
            duration: gap
          });
        }
      }
      timeline.push({ type: 'class', data: dayClasses[i] });
    }

    return timeline;
  }, [filteredRoutines, selectedDay]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-3">
        <Loader2 size={40} className="animate-spin text-indigo-600 dark:text-indigo-400" />
        <span className="font-bold text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Loading Routine…</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1000px] mx-auto px-1 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Class Routine</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
            Routine for Batch {batchId} &bull; Section {section} {subSection ? `&bull; Sub-Sec ${subSection}` : ''}
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('day')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'day'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-white shadow-lg'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar size={14} /> Day View
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'week'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-white shadow-lg'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar size={14} /> Week View
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'day' ? (
          <motion.div
            key="day-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            <div className="flex gap-2.5 overflow-x-auto py-2 px-1 -mx-4 sm:mx-0 no-scrollbar touch-pan-x">
              {weekDays.map((wd) => {
                const isActive = wd.fullDayName === selectedDay;
                const hasClasses = filteredRoutines.some((r) => r.day === wd.fullDayName);
                return (
                  <button
                    key={wd.fullDayName}
                    onClick={() => setSelectedDay(wd.fullDayName)}
                    className={`flex-shrink-0 w-[72px] p-3.5 rounded-2xl transition-all cursor-pointer border flex flex-col items-center gap-1.5 relative ${
                      isActive
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-500/20 scale-[1.03]'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                      {wd.dayName}
                    </span>
                    <span className="text-lg font-black leading-none">{wd.dayNum}</span>
                    {hasClasses && (
                      <span className={`absolute bottom-2.5 w-1 h-1 rounded-full ${isActive ? 'bg-white' : 'bg-indigo-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative pl-10 sm:pl-16 pr-1 space-y-8">
              {dayTimelineItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center gap-4">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/40 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-800/80">
                    <Calendar size={24} className="text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">No Classes Scheduled</h4>
                    <p className="text-xs text-slate-400 font-medium max-w-[280px]">
                      Enjoy your day! There are no classes scheduled for {selectedDay}.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="absolute top-0 bottom-0 left-[49px] sm:left-[73px] w-0.5 bg-indigo-100 dark:bg-slate-800/60" />

                  {dayTimelineItems.map((item, idx) => {
                    if (item.type === 'break') {
                      const durationStr = item.duration >= 60
                        ? `${Math.floor(item.duration / 60)}h ${item.duration % 60}m`
                        : `${item.duration}m`;
                      return (
                        <div key={`break-${idx}`} className="relative flex items-center">
                          <div className="absolute left-[-26px] sm:left-[-34px] w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center z-10 text-slate-400 dark:text-slate-500 shadow-sm">
                            <Coffee size={14} className="animate-pulse text-amber-500" />
                          </div>

                          <div className="w-full p-4 bg-stripes bg-slate-100/60 dark:bg-slate-800/20 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl flex items-center justify-between text-slate-500 dark:text-slate-400 gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                              Break Time
                            </span>
                            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                              {item.start_time} - {item.end_time} ({durationStr})
                            </span>
                          </div>
                        </div>
                      );
                    }

                    const val = item.data;
                    return (
                      <div key={val.id} className="relative flex items-start group">
                        <div className="absolute left-[-26px] sm:left-[-34px] w-8 h-8 rounded-full bg-indigo-50 dark:bg-slate-800 border-2 border-indigo-500 dark:border-slate-600 flex items-center justify-center z-10 shadow-md">
                          <Clock size={12} className="text-indigo-600 dark:text-indigo-400" />
                        </div>

                        <div className="absolute left-[-110px] sm:left-[-150px] w-[80px] sm:w-[120px] text-right pr-4 pt-1 hidden md:block">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {val.start_time}
                          </span>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            To {val.end_time}
                          </span>
                        </div>

                        <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-xl dark:hover:shadow-none hover:scale-[1.01] transition-all duration-300">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-2">
                              <span className="md:hidden inline-block text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
                                {val.start_time} - {val.end_time}
                              </span>
                              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                                {val.course_name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pt-1">
                                <span className="bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-md text-slate-500 dark:text-slate-400 border border-slate-100/50 dark:border-slate-800">
                                  {val.course_code}
                                </span>
                                {val.sub_section && (
                                  <span className="bg-indigo-50 dark:bg-indigo-950/20 px-2 py-1 rounded-md text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/30">
                                    Sec {val.sub_section}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2.5 text-right self-stretch justify-between shrink-0">
                              {val.room && (
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                  <MapPin size={12} className="text-slate-400 dark:text-slate-500" />
                                  <span className="text-[10px] font-black uppercase tracking-wider">Room {val.room}</span>
                                </div>
                              )}
                              {val.teacher && (
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 bg-indigo-50/40 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-indigo-100/10 dark:border-slate-700/50">
                                  <User size={12} className="text-indigo-500 dark:text-indigo-400" />
                                  <span className="text-[10px] font-black uppercase tracking-wider">{val.teacher}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="week-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => {
              const dayClasses = filteredRoutines
                .filter((r) => r.day === day)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));
              return (
                <div
                  key={day}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col"
                >
                  <h3 className="text-xs font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    {day}
                  </h3>

                  <div className="flex-1 space-y-3">
                    {dayClasses.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl h-full min-h-[80px]">
                        No classes 🎉
                      </div>
                    ) : (
                      dayClasses.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/40 rounded-2xl flex justify-between items-center gap-4 hover:scale-[1.01] transition-transform"
                        >
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs leading-tight">
                              {item.course_name}
                            </h4>
                            <div className="flex items-center gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              <span>{item.course_code}</span>
                              {item.teacher && (
                                <>
                                  <span className="w-0.5 h-0.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                  <span>{item.teacher}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 block">
                              {item.start_time} - {item.end_time}
                            </span>
                            {item.room && (
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                                Room {item.room}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoutineView;
