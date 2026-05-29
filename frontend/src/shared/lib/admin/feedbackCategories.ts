import type { LucideIcon } from 'lucide-react';
import {
  MessageCircle,
  GraduationCap,
  CalendarDays,
  FolderOpen,
  MonitorSmartphone,
  Lightbulb,
} from 'lucide-react';

export type FeedbackCategoryId =
  | 'general'
  | 'academic'
  | 'schedule'
  | 'resource'
  | 'platform'
  | 'suggestion';

export type FeedbackCategoryMeta = {
  id: FeedbackCategoryId;
  label: string;
  Icon: LucideIcon;
  /** Tailwind classes for icon tile (light + dark) */
  tileClass: string;
  activeClass: string;
};

export const FEEDBACK_CATEGORIES: FeedbackCategoryMeta[] = [
  {
    id: 'general',
    label: 'General',
    Icon: MessageCircle,
    tileClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    activeClass: 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400',
  },
  {
    id: 'academic',
    label: 'Academic',
    Icon: GraduationCap,
    tileClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
    activeClass: 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400',
  },
  {
    id: 'schedule',
    label: 'Schedule',
    Icon: CalendarDays,
    tileClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
    activeClass: 'bg-white text-amber-600 shadow-sm dark:bg-slate-900 dark:text-amber-400',
  },
  {
    id: 'resource',
    label: 'Resources',
    Icon: FolderOpen,
    tileClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
    activeClass: 'bg-white text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-400',
  },
  {
    id: 'platform',
    label: 'Platform',
    Icon: MonitorSmartphone,
    tileClass: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400',
    activeClass: 'bg-white text-violet-600 shadow-sm dark:bg-slate-900 dark:text-violet-400',
  },
  {
    id: 'suggestion',
    label: 'Suggestion',
    Icon: Lightbulb,
    tileClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
    activeClass: 'bg-white text-rose-600 shadow-sm dark:bg-slate-900 dark:text-rose-400',
  },
];

export function getFeedbackCategory(id: string): FeedbackCategoryMeta | undefined {
  return FEEDBACK_CATEGORIES.find((c) => c.id === id);
}

export function feedbackCategoryLabel(id: string): string {
  return getFeedbackCategory(id)?.label ?? id;
}
