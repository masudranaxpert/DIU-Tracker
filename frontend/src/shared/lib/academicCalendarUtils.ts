export interface AcademicCalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  type: string;
  semester?: string;
}

export interface AcademicCalendarData {
  id: string;
  title: string;
  markdown: string;
  display_markdown: string;
  events: AcademicCalendarEvent[];
  show_on_calendar_view?: boolean;
  updated_at?: string;
  updated_by?: string | null;
}

const EVENTS_BLOCK_RE = /```calendar-events\s*\n([\s\S]*?)\n```/i;

export function stripEventsBlock(markdown: string): string {
  return (markdown || '').replace(EVENTS_BLOCK_RE, '').trim();
}

export function parseCalendarEvents(markdown: string): AcademicCalendarEvent[] {
  const match = (markdown || '').match(EVENTS_BLOCK_RE);
  if (!match?.[1]) return [];
  try {
    const data = JSON.parse(match[1].trim());
    if (!Array.isArray(data)) return [];
    return data
      .filter((item) => item && item.title && item.start)
      .map((item) => ({
        id: String(item.id || `${item.start}-${String(item.title).slice(0, 30)}`),
        title: String(item.title),
        start: String(item.start),
        end: item.end ? String(item.end) : String(item.start),
        type: String(item.type || 'other').toLowerCase(),
        semester: item.semester ? String(item.semester).toLowerCase() : undefined,
      }));
  } catch {
    return [];
  }
}

export function parseLocalCalendarDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
}

export function eventOccursOnDay(event: AcademicCalendarEvent, day: Date): boolean {
  const start = parseLocalCalendarDate(event.start);
  const end = parseLocalCalendarDate(event.end || event.start);
  if (Number.isNaN(start.getTime())) return false;
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const rangeEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return dayStart >= rangeStart && dayStart <= rangeEnd;
}

export const ACADEMIC_EVENT_TYPE_LABELS: Record<string, string> = {
  registration: 'Registration',
  orientation: 'Orientation',
  classes_start: 'Classes Start',
  mid_exam: 'Mid Exam',
  final_exam: 'Final Exam',
  exam: 'Exam',
  holiday: 'Holiday',
  vacation: 'Vacation',
  break: 'Break',
  results: 'Results',
  grade_submission: 'Grade Submission',
  semester_break: 'Semester Break',
  other: 'Academic',
};

export const ACADEMIC_EVENT_COLORS: Record<string, { chip: string; dot: string; gradient: string }> = {
  registration: {
    chip: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    dot: 'bg-indigo-500',
    gradient: 'from-indigo-500 to-indigo-700',
  },
  orientation: {
    chip: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    dot: 'bg-violet-500',
    gradient: 'from-violet-500 to-violet-700',
  },
  classes_start: {
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    gradient: 'from-emerald-500 to-emerald-700',
  },
  mid_exam: {
    chip: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    dot: 'bg-amber-500',
    gradient: 'from-amber-500 to-orange-600',
  },
  final_exam: {
    chip: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    dot: 'bg-rose-500',
    gradient: 'from-rose-500 to-rose-700',
  },
  exam: {
    chip: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    dot: 'bg-orange-500',
    gradient: 'from-orange-500 to-orange-700',
  },
  holiday: {
    chip: 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',
    dot: 'bg-pink-500',
    gradient: 'from-pink-500 to-rose-600',
  },
  vacation: {
    chip: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300',
    dot: 'bg-fuchsia-500',
    gradient: 'from-fuchsia-500 to-pink-600',
  },
  break: {
    chip: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    dot: 'bg-sky-500',
    gradient: 'from-sky-500 to-cyan-600',
  },
  results: {
    chip: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
    dot: 'bg-teal-500',
    gradient: 'from-teal-500 to-emerald-600',
  },
  grade_submission: {
    chip: 'bg-lime-50 text-lime-800 dark:bg-lime-950/40 dark:text-lime-300',
    dot: 'bg-lime-500',
    gradient: 'from-lime-500 to-green-600',
  },
  semester_break: {
    chip: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
    dot: 'bg-cyan-500',
    gradient: 'from-cyan-500 to-sky-600',
  },
  other: {
    chip: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    dot: 'bg-amber-400',
    gradient: 'from-amber-400 to-yellow-600',
  },
};

export function getAcademicEventStyle(type: string) {
  return ACADEMIC_EVENT_COLORS[type] || ACADEMIC_EVENT_COLORS.other;
}

export type SemesterKey = 'spring' | 'summer' | 'fall';

export interface CalendarSemesterSection {
  key: SemesterKey;
  title: string;
  markdown: string;
}

export interface ParsedCalendarSections {
  intro: string;
  semesters: CalendarSemesterSection[];
  footnotes: string;
}

const SEMESTER_HEADING_RE = /^##\s*(Spring|Summer|Fall)\b/i;
const FOOTNOTE_HEADING_RE = /^##\s*(Footnotes?|Notes?)\b/i;

/** Replace AI meta-commentary with the standard DIU Eid footnote students expect. */
export function normalizeFootnotes(raw: string): string {
  const text = raw.trim();
  if (!text) return '';

  if (
    /no explanatory note is visible in the provided source/i.test(text) ||
    /marks .+ with an asterisk/i.test(text)
  ) {
    return '* Eid-Ul-Adha and Eid-Ul-Fitr vacation dates are subject to moon sighting and may change accordingly.';
  }

  return text;
}

export function parseCalendarSections(markdown: string): ParsedCalendarSections {
  const cleaned = stripEventsBlock(markdown);
  const chunks = cleaned.split(/\n(?=##\s)/);
  let intro = '';
  const semesters: CalendarSemesterSection[] = [];
  let footnotes = '';

  for (const chunk of chunks) {
    const part = chunk.trim();
    if (!part) continue;

    if (FOOTNOTE_HEADING_RE.test(part)) {
      footnotes = normalizeFootnotes(part.replace(/^##\s*(?:Footnotes?|Notes?)\s*\n?/i, '').trim());
      continue;
    }

    const semMatch = part.match(/^##\s*((?:Spring|Summer|Fall)[^\n]*)/i);
    if (semMatch && SEMESTER_HEADING_RE.test(part)) {
      const key = (semMatch[1].match(/(Spring|Summer|Fall)/i)?.[1].toLowerCase() || 'spring') as SemesterKey;
      semesters.push({
        key,
        title: semMatch[1].trim(),
        markdown: part.replace(/^##[^\n]+\n?/, '').trim(),
      });
      continue;
    }

    if (!intro) intro = part;
  }

  return { intro, semesters, footnotes };
}

/** Which tri-semester block is active today (from parsed event date ranges). */
export function detectActiveSemester(
  events: AcademicCalendarEvent[],
  refDate: Date = new Date(),
): SemesterKey | null {
  const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()).getTime();
  const order: SemesterKey[] = ['spring', 'summer', 'fall'];

  for (const sem of order) {
    const semEvents = events.filter((e) => e.semester === sem);
    if (!semEvents.length) continue;
    const starts = semEvents.map((e) => parseLocalCalendarDate(e.start).getTime()).filter((t) => !Number.isNaN(t));
    const ends = semEvents
      .map((e) => parseLocalCalendarDate(e.end || e.start).getTime())
      .filter((t) => !Number.isNaN(t));
    if (!starts.length || !ends.length) continue;
    const rangeStart = Math.min(...starts);
    const rangeEnd = Math.max(...ends);
    if (today >= rangeStart && today <= rangeEnd) return sem;
  }

  // Between semesters: open the next one that hasn't ended yet
  for (const sem of order) {
    const semEvents = events.filter((e) => e.semester === sem);
    if (!semEvents.length) continue;
    const starts = semEvents.map((e) => parseLocalCalendarDate(e.start).getTime());
    const rangeStart = Math.min(...starts.filter((t) => !Number.isNaN(t)));
    if (today < rangeStart) return sem;
  }

  return order.find((sem) => events.some((e) => e.semester === sem)) || null;
}

export const SEMESTER_ACCENTS: Record<
  SemesterKey,
  { border: string; bg: string; badge: string; dot: string }
> = {
  spring: {
    border: 'border-emerald-200 dark:border-emerald-900/50',
    bg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  summer: {
    border: 'border-amber-200 dark:border-amber-900/50',
    bg: 'bg-amber-50/60 dark:bg-amber-950/20',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  fall: {
    border: 'border-indigo-200 dark:border-indigo-900/50',
    bg: 'bg-indigo-50/60 dark:bg-indigo-950/20',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    dot: 'bg-indigo-500',
  },
};
