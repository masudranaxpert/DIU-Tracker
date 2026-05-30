import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Share2,
  Sparkles,
  Clock,
  ChevronDown,
  GraduationCap,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Share } from '@capacitor/share';
import AcademicCalendarMarkdown from './AcademicCalendarMarkdown';
import type { AcademicCalendarData } from '@/shared/lib/academicCalendarUtils';
import {
  ACADEMIC_EVENT_TYPE_LABELS,
  detectActiveSemester,
  getAcademicEventStyle,
  parseCalendarSections,
  parseLocalCalendarDate,
  SEMESTER_ACCENTS,
  type SemesterKey,
} from '@/shared/lib/academicCalendarUtils';

interface Props {
  calendar?: AcademicCalendarData | null;
}

const AcademicYearView: React.FC<Props> = ({ calendar }) => {
  const source = calendar?.display_markdown || calendar?.markdown || '';
  const hasContent = Boolean(source.trim());
  const parsed = useMemo(() => parseCalendarSections(source), [source]);
  const activeSemester = useMemo(
    () => detectActiveSemester(calendar?.events || []),
    [calendar?.events],
  );

  const [openSemesters, setOpenSemesters] = useState<Set<SemesterKey>>(new Set());

  useEffect(() => {
    if (activeSemester) {
      setOpenSemesters(new Set([activeSemester]));
    } else if (parsed.semesters[0]) {
      setOpenSemesters(new Set([parsed.semesters[0].key]));
    }
  }, [activeSemester, parsed.semesters]);

  const toggleSemester = (key: SemesterKey) => {
    setOpenSemesters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const upcomingEvents = useMemo(() => {
    if (!calendar?.events?.length) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...calendar.events]
      .filter((e) => {
        const end = parseLocalCalendarDate(e.end || e.start);
        return !Number.isNaN(end.getTime()) && end >= today;
      })
      .sort((a, b) => parseLocalCalendarDate(a.start).getTime() - parseLocalCalendarDate(b.start).getTime())
      .slice(0, 6);
  }, [calendar?.events]);

  const handleShare = async () => {
    const shareMessage = `📅 DIU Academic Calendar\n\nView the full schedule in DIU Tracker:\n${window.origin}/dashboard/academic_year`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: calendar?.title || 'DIU Academic Calendar',
          text: shareMessage,
          url: `${window.origin}/dashboard/academic_year`,
        });
      } catch {
        /* ignore */
      }
    } else {
      await navigator.clipboard.writeText(shareMessage);
      alert('Link copied to clipboard!');
    }
  };

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/30 text-teal-600 flex items-center justify-center mb-5">
          <Calendar size={28} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Academic Calendar</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
          The official university calendar has not been published yet. Check back soon — your admin will update it from the admin panel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      {/* Hero header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-indigo-50/40 to-teal-50/30 dark:from-slate-900 dark:via-indigo-950/20 dark:to-teal-950/10 p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/25 shrink-0">
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 text-[10px] font-bold uppercase tracking-widest mb-2">
                <Sparkles size={11} /> Official Schedule
              </div>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {calendar?.title || 'Academic Calendar'}
              </h1>
              {calendar?.updated_at && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Last updated {format(parseISO(calendar.updated_at), 'MMM d, yyyy · h:mm a')}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleShare}
            className="self-start lg:self-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:border-indigo-300 transition-colors cursor-pointer"
          >
            <Share2 size={14} /> Share
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-4">
          {/* Intro (title + university line) */}
          {parsed.intro && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:p-6 shadow-sm">
              <AcademicCalendarMarkdown markdown={parsed.intro} />
            </div>
          )}

          {/* Semester accordions */}
          <div className="space-y-3">
            {parsed.semesters.map((section) => {
              const accent = SEMESTER_ACCENTS[section.key];
              const isOpen = openSemesters.has(section.key);
              const isCurrent = activeSemester === section.key;

              return (
                <div
                  key={section.key}
                  className={`rounded-2xl border overflow-hidden shadow-sm transition-colors ${accent.border} ${isOpen ? accent.bg : 'bg-white dark:bg-slate-900'}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSemester(section.key)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-4 lg:px-5 lg:py-4 text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${accent.dot}`} />
                      <span className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {section.title}
                      </span>
                      {isCurrent && (
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${accent.badge}`}>
                          Current
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-5 lg:px-5 lg:pb-6 pt-0 border-t border-slate-200/70 dark:border-slate-800/70">
                          <AcademicCalendarMarkdown markdown={section.markdown} className="pt-4" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Footnotes — clean note, no raw \* */}
          {parsed.footnotes && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-3 lg:px-5 lg:py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Note</p>
              <AcademicCalendarMarkdown markdown={parsed.footnotes} variant="footnotes" />
            </div>
          )}
        </div>

        {/* Upcoming highlights */}
        {upcomingEvents.length > 0 && (
          <aside className="space-y-3 xl:sticky xl:top-4 self-start">
            <div className="rounded-2xl border border-teal-200/60 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-teal-600" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-teal-800 dark:text-teal-300">
                  Coming Up
                </h3>
              </div>
              <div className="space-y-2.5">
                {upcomingEvents.map((event) => {
                  const style = getAcademicEventStyle(event.type);
                  const start = parseLocalCalendarDate(event.start);
                  const end = parseLocalCalendarDate(event.end || event.start);
                  const isRange = event.end && event.end !== event.start;
                  return (
                    <div
                      key={event.id}
                      className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-teal-100 dark:border-teal-900/30"
                    >
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mb-1.5 ${style.chip}`}>
                        {ACADEMIC_EVENT_TYPE_LABELS[event.type] || event.type}
                      </span>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                        {event.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {isRange
                          ? `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
                          : format(start, 'MMM d, yyyy')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
              Current semester opens automatically · tap others to expand
            </p>
          </aside>
        )}
      </div>
    </div>
  );
};

export default AcademicYearView;
