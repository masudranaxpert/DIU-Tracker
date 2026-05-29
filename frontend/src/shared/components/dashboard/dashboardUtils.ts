import { differenceInCalendarDays, parseISO } from 'date-fns';

export function getDeadlineColor(type: string): string {
  const t = (type || '').toLowerCase();
  if (t.includes('ct')) return 'bg-amber-500';
  if (t.includes('mid')) return 'bg-indigo-600';
  if (t.includes('final')) return 'bg-rose-600';
  if (t.includes('presentation')) return 'bg-emerald-500';
  if (t.includes('project')) return 'bg-violet-600';
  if (t.includes('assignment')) return 'bg-blue-500';
  if (t.includes('lab')) return 'bg-cyan-600';
  return 'bg-slate-600';
}

/** Pill styles for exam/deadline type (MID, CT, …). */
export function getTypeBadgeClass(type: string): string {
  const t = (type || '').toLowerCase();
  if (t.includes('mid'))
    return 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-800/50';
  if (t.includes('final'))
    return 'bg-rose-100 text-rose-800 ring-1 ring-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800/50';
  if (t.includes('ct') || t.includes('quiz'))
    return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800/50';
  if (t.includes('presentation'))
    return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/50';
  if (t.includes('project'))
    return 'bg-violet-100 text-violet-800 ring-1 ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800/50';
  return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700';
}

export function getDeadlineDaysLeft(dateStr: string): number {
  return differenceInCalendarDays(parseISO(dateStr), new Date());
}

/** Countdown pill: Today, Tomorrow, 2d left, … */
export function getCountdownBadge(daysLeft: number): { label: string; className: string } | null {
  if (daysLeft < 0) return null;
  if (daysLeft === 0) {
    return {
      label: 'Today',
      className:
        'bg-rose-500 text-white ring-1 ring-rose-400/40 shadow-sm shadow-rose-500/30 dark:bg-rose-600 dark:ring-rose-500/30',
    };
  }
  if (daysLeft === 1) {
    return {
      label: 'Tomorrow',
      className:
        'bg-amber-500 text-white ring-1 ring-amber-400/40 shadow-sm shadow-amber-500/25 dark:bg-amber-600 dark:ring-amber-500/30',
    };
  }
  if (daysLeft <= 3) {
    return {
      label: `${daysLeft}d left`,
      className:
        'bg-orange-100 text-orange-800 ring-1 ring-orange-200 dark:bg-orange-950/55 dark:text-orange-300 dark:ring-orange-800/60',
    };
  }
  if (daysLeft <= 7) {
    return {
      label: `${daysLeft}d left`,
      className:
        'bg-sky-100 text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/55 dark:text-sky-300 dark:ring-sky-800/60',
    };
  }
  return null;
}

/** Left date column styling by urgency. */
export function getDateBlockStyle(daysLeft: number): string {
  if (daysLeft === 0) {
    return 'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-inner shadow-rose-700/20';
  }
  if (daysLeft === 1) {
    return 'bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-inner shadow-amber-700/15';
  }
  if (daysLeft <= 3) {
    return 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-inner shadow-indigo-700/15';
  }
  return 'bg-slate-50 dark:bg-slate-800/70 border-r border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100';
}

export function getCardBorderClass(daysLeft: number): string {
  if (daysLeft === 0) return 'border-rose-200 dark:border-rose-900/60 hover:border-rose-300 dark:hover:border-rose-800';
  if (daysLeft === 1) return 'border-amber-200 dark:border-amber-900/50 hover:border-amber-300 dark:hover:border-amber-800';
  if (daysLeft <= 3) return 'border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700';
  return 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700';
}

export function getModalHeroClass(daysLeft: number): string {
  if (daysLeft === 0) return 'bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700';
  if (daysLeft === 1) return 'bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700';
  if (daysLeft <= 3) return 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700';
  return 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-900 dark:to-black';
}

export function getGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function isLabCourse(name: string): boolean {
  return (name || '').toLowerCase().includes('lab');
}
