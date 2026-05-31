import React, { useState, useEffect, useMemo } from 'react';
import { routineService } from '@/shared/services/routineService';
import { RoutineItem } from '@/shared/types/types';
import { Clock, Coffee, MapPin, User, Loader2, Calendar, Zap } from 'lucide-react';
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

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
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

function useCurrentMinutes() {
  const [now, setNow] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return now;
}

function getTodayFullName(): string {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dayNames[new Date().getDay()];
}

const GRADIENT_PALETTES = [
  'from-violet-500/10 to-indigo-500/10 border-violet-200/40 dark:border-violet-800/30',
  'from-sky-500/10 to-cyan-500/10 border-sky-200/40 dark:border-sky-800/30',
  'from-emerald-500/10 to-teal-500/10 border-emerald-200/40 dark:border-emerald-800/30',
  'from-amber-500/10 to-orange-500/10 border-amber-200/40 dark:border-amber-800/30',
  'from-rose-500/10 to-pink-500/10 border-rose-200/40 dark:border-rose-800/30',
  'from-fuchsia-500/10 to-purple-500/10 border-fuchsia-200/40 dark:border-fuchsia-800/30',
];

const BADGE_GRADIENTS = [
  'bg-gradient-to-r from-violet-600 to-indigo-600',
  'bg-gradient-to-r from-sky-600 to-cyan-600',
  'bg-gradient-to-r from-emerald-600 to-teal-600',
  'bg-gradient-to-r from-amber-600 to-orange-600',
  'bg-gradient-to-r from-rose-600 to-pink-600',
  'bg-gradient-to-r from-fuchsia-600 to-purple-600',
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const RoutineView: React.FC<Props> = ({ batchId, section, subSection }) => {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentMinutes = useCurrentMinutes();
  const todayName = getTodayFullName();

  const weekDays = useMemo(() => getWeekDates(), []);

  const [selectedDay, setSelectedDay] = useState<string>(() => {
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
      | { type: 'class'; data: RoutineItem; status: 'past' | 'active' | 'next' | 'upcoming'; progress?: number }
      | { type: 'break'; start_time: string; end_time: string; duration: number }
    )[] = [];

    const isToday = selectedDay === todayName;
    let foundActive = false;
    let foundNext = false;

    for (let i = 0; i < dayClasses.length; i++) {
      if (i > 0) {
        const prevEnd = timeToMinutes(dayClasses[i - 1].end_time);
        const currStart = timeToMinutes(dayClasses[i].start_time);
        const gap = currStart - prevEnd;
        if (gap > 10) {
          timeline.push({
            type: 'break',
            start_time: dayClasses[i - 1].end_time,
            end_time: dayClasses[i].start_time,
            duration: gap
          });
        }
      }

      let status: 'past' | 'active' | 'next' | 'upcoming' = 'upcoming';
      let progress: number | undefined;

      if (isToday) {
        const start = timeToMinutes(dayClasses[i].start_time);
        const end = timeToMinutes(dayClasses[i].end_time);

        if (currentMinutes >= start && currentMinutes < end) {
          status = 'active';
          progress = Math.round(((currentMinutes - start) / (end - start)) * 100);
          foundActive = true;
        } else if (currentMinutes >= end) {
          status = 'past';
        } else if (!foundActive && !foundNext) {
          status = 'next';
          foundNext = true;
        }
      }

      timeline.push({ type: 'class', data: dayClasses[i], status, progress });
    }

    return timeline;
  }, [filteredRoutines, selectedDay, currentMinutes, todayName]);

  const courseColorIndex = (code: string) => hashCode(code) % GRADIENT_PALETTES.length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-3">
        <Loader2 size={40} className="animate-spin text-indigo-600 dark:text-indigo-400" />
        <span className="font-bold text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Loading Routine…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto px-1 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Class Routine</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Section {section} {subSection ? `· ${subSection}` : ''}
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('day')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              viewMode === 'day'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-lg'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar size={15} /> Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              viewMode === 'week'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-lg'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar size={15} /> Week
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
            className="space-y-6"
          >
            <div className="flex gap-2 overflow-x-auto py-1 px-1 -mx-2 sm:mx-0 no-scrollbar touch-pan-x">
              {weekDays.map((wd) => {
                const isActive = wd.fullDayName === selectedDay;
                const isRealToday = wd.fullDayName === todayName;
                const hasClasses = filteredRoutines.some((r) => r.day === wd.fullDayName);
                return (
                  <button
                    key={wd.fullDayName}
                    onClick={() => setSelectedDay(wd.fullDayName)}
                    className={`flex-shrink-0 w-[68px] p-3 rounded-2xl transition-all cursor-pointer border flex flex-col items-center gap-1 relative ${
                      isActive
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xl shadow-slate-900/15 dark:shadow-white/10 scale-[1.04]'
                        : isRealToday
                        ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-white/70 dark:text-slate-900/60' : 'text-slate-400'}`}>
                      {wd.dayName}
                    </span>
                    <span className="text-lg font-black leading-none">{wd.dayNum}</span>
                    {hasClasses && (
                      <span className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white dark:bg-slate-900' : 'bg-indigo-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDay === todayName && dayTimelineItems.some(i => i.type === 'class' && i.status === 'active') && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 rounded-2xl">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-40" />
                  <span className="relative w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Class in progress right now</span>
              </div>
            )}

            <div className="relative space-y-4">
              {dayTimelineItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center gap-4">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/40 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-800/80">
                    <Calendar size={24} className="text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-800 dark:text-slate-200 text-base">No Classes</h4>
                    <p className="text-sm text-slate-400 font-medium max-w-[280px]">
                      Enjoy your day! Nothing scheduled for {selectedDay}.
                    </p>
                  </div>
                </div>
              ) : (
                dayTimelineItems.map((item, idx) => {
                  if (item.type === 'break') {
                    const durationStr = item.duration >= 60
                      ? `${Math.floor(item.duration / 60)}h ${item.duration % 60}m`
                      : `${item.duration}m`;
                    return (
                      <div key={`break-${idx}`} className="flex items-center gap-3 px-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-full border border-slate-100 dark:border-slate-800">
                            <Coffee size={12} className="text-amber-500" />
                            <span className="text-[11px] font-bold text-slate-400">{durationStr} break</span>
                          </div>
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                        </div>
                      </div>
                    );
                  }

                  const val = item.data;
                  const colorIdx = courseColorIndex(val.course_code);
                  const isActive = item.status === 'active';
                  const isNext = item.status === 'next';
                  const isPast = item.status === 'past';

                  return (
                    <motion.div
                      key={val.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.3 }}
                      className={`relative rounded-2xl border transition-all overflow-hidden ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200/60 dark:border-emerald-800/40 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-300/30 dark:ring-emerald-700/20'
                          : isNext
                          ? 'bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 border-indigo-200/60 dark:border-indigo-800/40 shadow-md'
                          : isPast
                          ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/60 opacity-60'
                          : `bg-gradient-to-r ${GRADIENT_PALETTES[colorIdx]} border`
                      }`}
                    >
                      {isActive && item.progress !== undefined && (
                        <div className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000" style={{ width: `${item.progress}%` }} />
                      )}

                      <div className="p-4 sm:p-5">
                        <div className="flex justify-between items-start gap-3">
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isActive && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-md">
                                  <Zap size={10} /> Now
                                </span>
                              )}
                              {isNext && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider rounded-md">
                                  Up Next
                                </span>
                              )}
                              <span className={`inline-flex px-2 py-0.5 ${BADGE_GRADIENTS[colorIdx]} text-white text-[10px] font-bold uppercase tracking-wider rounded-md`}>
                                {val.course_code}
                              </span>
                              {val.sub_section && (
                                <span className="px-2 py-0.5 bg-slate-200/60 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-md">
                                  {val.sub_section}
                                </span>
                              )}
                            </div>

                            <h3 className={`text-base sm:text-lg font-bold leading-snug ${isPast ? 'text-slate-500 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                              {val.course_name}
                            </h3>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1 font-semibold">
                                <Clock size={12} className="text-slate-400 dark:text-slate-500" />
                                {formatTime12(val.start_time)} – {formatTime12(val.end_time)}
                              </span>
                              {val.teacher && (
                                <span className="flex items-center gap-1 font-semibold">
                                  <User size={12} className="text-slate-400 dark:text-slate-500" />
                                  {val.teacher}
                                </span>
                              )}
                              {val.room && (
                                <span className="flex items-center gap-1 font-semibold">
                                  <MapPin size={12} className="text-slate-400 dark:text-slate-500" />
                                  {val.room}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 text-right hidden sm:block">
                            <div className={`text-lg font-black tabular-nums ${isActive ? 'text-emerald-700 dark:text-emerald-300' : isNext ? 'text-indigo-700 dark:text-indigo-300' : isPast ? 'text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                              {formatTime12(val.start_time)}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                              to {formatTime12(val.end_time)}
                            </div>
                            {isActive && item.progress !== undefined && (
                              <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                {item.progress}% done
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
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
            className="space-y-5"
          >
            {["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => {
              const dayClasses = filteredRoutines
                .filter((r) => r.day === day)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));
              const isToday = day === todayName;

              return (
                <div
                  key={day}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
                    isToday
                      ? 'border-indigo-200/60 dark:border-indigo-800/40 shadow-md'
                      : 'border-slate-100 dark:border-slate-800/80'
                  }`}
                >
                  <div className={`px-5 py-3 flex items-center justify-between ${
                    isToday ? 'bg-indigo-50 dark:bg-indigo-950/20' : 'bg-slate-50 dark:bg-slate-800/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isToday ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      <h3 className={`text-sm font-bold ${isToday ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {day}
                      </h3>
                      {isToday && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded">Today</span>}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                    </span>
                  </div>

                  <div className="p-4">
                    {dayClasses.length === 0 ? (
                      <div className="py-6 text-center text-sm text-slate-400 font-medium">
                        No classes 🎉
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dayClasses.map((item) => {
                          const colorIdx = courseColorIndex(item.course_code);
                          const isActiveNow = isToday && currentMinutes >= timeToMinutes(item.start_time) && currentMinutes < timeToMinutes(item.end_time);

                          return (
                            <div
                              key={item.id}
                              className={`p-3 rounded-xl flex justify-between items-center gap-3 transition-all ${
                                isActiveNow
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40'
                                  : 'bg-slate-50 dark:bg-slate-800/20 border border-slate-100/80 dark:border-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-1 h-8 rounded-full shrink-0 ${BADGE_GRADIENTS[colorIdx]}`} />
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {isActiveNow && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight truncate">
                                      {item.course_name}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">{item.course_code}</span>
                                    {item.teacher && (
                                      <>
                                        <span className="w-0.5 h-0.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                        <span>{item.teacher}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block whitespace-nowrap">
                                  {formatTime12(item.start_time)}
                                </span>
                                <span className="text-[10px] font-medium text-slate-400 block whitespace-nowrap">
                                  {formatTime12(item.end_time)}
                                </span>
                                {item.room && (
                                  <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                                    {item.room}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
