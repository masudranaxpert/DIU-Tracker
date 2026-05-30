import React from 'react';
import { Deadline, Course, Section } from '@/shared/types/types';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ProtectedBlurShell from '@/shared/components/security/ProtectedBlurShell';
import {
  getCardBorderClass,
  getCountdownBadge,
  getDateBlockStyle,
  getDeadlineDaysLeft,
  getTypeBadgeClass,
} from './dashboardUtils';

interface Props {
  upcoming: Deadline[];
  past: Deadline[];
  courses: Course[];
  onSelect: (deadline: Deadline) => void;
  locked?: boolean;
  verifying?: boolean;
  batchId: string;
  section: Section;
  subSection?: string | null;
}

const UPCOMING_LIMIT = 10;

function DateBadge({ dateStr, daysLeft }: { dateStr: string; daysLeft: number }) {
  const date = parseISO(dateStr);
  const blockStyle = getDateBlockStyle(daysLeft);
  const isMuted = daysLeft > 3;

  return (
    <div
      className={`flex flex-col items-center justify-center w-[3.75rem] sm:w-[4.25rem] shrink-0 py-2.5 sm:py-3 ${blockStyle}`}
    >
      <span
        className={`text-[9px] font-bold uppercase tracking-widest ${
          isMuted ? 'text-slate-500 dark:text-slate-400' : 'opacity-90'
        }`}
      >
        {format(date, 'MMM')}
      </span>
      <span
        className={`text-xl sm:text-2xl font-bold leading-none tabular-nums my-0.5 ${
          isMuted ? 'text-slate-900 dark:text-white' : ''
        }`}
      >
        {format(date, 'd')}
      </span>
      <span
        className={`text-[9px] font-semibold uppercase tracking-wide ${
          isMuted ? 'text-slate-400 dark:text-slate-500' : 'opacity-80'
        }`}
      >
        {format(date, 'EEE')}
      </span>
    </div>
  );
}

function DeadlineListContent({
  displayed,
  past,
  courses,
  overflowCount,
  onSelect,
}: {
  displayed: Deadline[];
  past: Deadline[];
  courses: Course[];
  overflowCount: number;
  onSelect: (deadline: Deadline) => void;
}) {
  return (
    <>
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5 px-0.5">
          Upcoming
        </p>

        {displayed.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 py-10 px-4 text-center">
            <CalendarClock size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nothing due soon</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">New deadlines will show here</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {displayed.map((deadline) => {
              const course = courses.find((c) => c.id === deadline.course_id);
              const daysLeft = getDeadlineDaysLeft(deadline.date);
              const countdown = getCountdownBadge(daysLeft);

              return (
                <li key={deadline.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(deadline)}
                    className={`group w-full flex items-stretch rounded-lg border text-left transition-colors duration-200 cursor-pointer overflow-hidden hover:shadow-sm ${getCardBorderClass(daysLeft)}`}
                  >
                    <DateBadge dateStr={deadline.date} daysLeft={daysLeft} />

                    <div className="flex-1 min-w-0 py-2.5 px-2.5 sm:py-3 sm:px-3 flex items-center gap-2 bg-white dark:bg-slate-900 group-hover:bg-slate-50/90 dark:group-hover:bg-slate-800/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] sm:text-[14px] font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-slate-700 dark:group-hover:text-slate-100 transition-colors">
                          {deadline.title}
                        </p>

                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          <span
                            className={`inline-flex text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${getTypeBadgeClass(deadline.type)}`}
                          >
                            {deadline.type}
                          </span>

                          {course?.code && (
                            <span className="inline-flex text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                              {course.code}
                            </span>
                          )}

                          {countdown && (
                            <span
                              className={`inline-flex text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${countdown.className}`}
                            >
                              {countdown.label}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        size={15}
                        className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors"
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {overflowCount > 0 && (
          <p className="mt-2.5 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            +{overflowCount} more in calendar
          </p>
        )}
      </section>

      {past.length > 0 && (
        <section className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-0.5">
            Recent
          </p>
          <ul className="space-y-0.5">
            {past.slice(0, 3).map((deadline) => {
              const course = courses.find((c) => c.id === deadline.course_id);
              return (
                <li key={deadline.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(deadline)}
                    className="group w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-400 w-12 shrink-0 tabular-nums text-center">
                      {format(parseISO(deadline.date), 'd')}
                      <span className="block text-[9px] font-semibold uppercase">
                        {format(parseISO(deadline.date), 'MMM')}
                      </span>
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400 truncate flex-1 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                      {deadline.title}
                    </span>
                    {course?.code && (
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 hidden sm:inline">
                        {course.code}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

const DeadlinesPanel: React.FC<Props> = ({
  upcoming,
  past,
  courses,
  onSelect,
  locked = false,
  verifying = false,
  batchId,
  section,
  subSection,
}) => {
  const displayed = upcoming.slice(0, UPCOMING_LIMIT);
  const overflowCount = upcoming.length - UPCOMING_LIMIT;
  const totalCount = upcoming.length + past.length;
  const hasAny = totalCount > 0;

  return (
    <aside className="xl:col-span-4 tour-deadlines">
      <div className="sticky top-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden shadow-sm">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:px-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 ring-1 ring-indigo-500/10">
              <CalendarClock size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Deadlines</h2>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
                {locked
                  ? `${totalCount} item${totalCount === 1 ? '' : 's'} · protected`
                  : upcoming.length > UPCOMING_LIMIT
                    ? `Next ${UPCOMING_LIMIT} of ${upcoming.length}`
                    : 'Upcoming & recent'}
              </p>
            </div>
          </div>
          {upcoming.length > 0 && (
            <span className="text-xs font-bold tabular-nums min-w-[1.75rem] h-7 flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/25 shrink-0">
              {upcoming.length}
            </span>
          )}
        </div>

        <div className="px-4 py-4 lg:px-5 space-y-4">
          {!hasAny ? (
            <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 py-10 px-4 text-center">
              <CalendarClock size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nothing due soon</p>
            </div>
          ) : (
            <ProtectedBlurShell
              locked={locked}
              verifying={verifying}
              batchId={batchId}
              section={section}
              subSection={subSection}
              hint="Tap to unlock deadlines"
              modalTitle="Unlock deadlines"
              modalDescription={`Deadlines for Section ${section} are protected. Enter your student ID and section PIN from your CR.`}
              submitLabel="Unlock deadlines"
            >
              <DeadlineListContent
                displayed={displayed}
                past={past}
                courses={courses}
                overflowCount={overflowCount}
                onSelect={onSelect}
              />
            </ProtectedBlurShell>
          )}
        </div>
      </div>
    </aside>
  );
};

export default DeadlinesPanel;
