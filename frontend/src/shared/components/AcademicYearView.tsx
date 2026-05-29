import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Share2,
  Sparkles,
  Clock,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Share } from '@capacitor/share';
import AcademicCalendarMarkdown from './AcademicCalendarMarkdown';
import type { AcademicCalendarData } from '@/shared/lib/academicCalendarUtils';
import {
  ACADEMIC_EVENT_TYPE_LABELS,
  getAcademicEventStyle,
  parseLocalCalendarDate,
} from '@/shared/lib/academicCalendarUtils';

interface Props {
  calendar?: AcademicCalendarData | null;
}

const AcademicYearView: React.FC<Props> = ({ calendar }) => {
  const hasContent = Boolean(calendar?.display_markdown?.trim());

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
        await navigator.share({ title: calendar?.title || 'DIU Academic Calendar', text: shareMessage, url: `${window.origin}/dashboard/academic_year` });
      } catch { /* ignore */ }
    } else {
      await navigator.clipboard.writeText(shareMessage);
      alert('Link copied to clipboard!');
    }
  };

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center mb-5">
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
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-indigo-50/40 to-amber-50/30 dark:from-slate-900 dark:via-indigo-950/20 dark:to-amber-950/10 p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-widest mb-2">
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
        {/* Main markdown document */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:p-8 shadow-sm"
        >
          <AcademicCalendarMarkdown markdown={calendar!.display_markdown || calendar!.markdown} />
        </motion.div>

        {/* Upcoming highlights */}
        {upcomingEvents.length > 0 && (
          <aside className="space-y-3">
            <div className="rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300">
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
                      className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-amber-100 dark:border-amber-900/30"
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
            <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1 flex items-center gap-1">
              <ChevronRight size={12} /> Also marked on Calendar View with amber badges
            </p>
          </aside>
        )}
      </div>
    </div>
  );
};

export default AcademicYearView;
