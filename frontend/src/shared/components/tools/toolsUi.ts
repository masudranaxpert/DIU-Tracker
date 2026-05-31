/** Shared shadcn-inspired styles for PDF Tools screens */

export const toolsPageWrap = 'min-h-full pb-28 lg:pb-8';

export const toolsHeaderCard =
  'mx-4 mt-4 lg:mx-6 lg:mt-6 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden';

export const toolsHeaderAccent =
  'h-px bg-gradient-to-r from-indigo-500 via-indigo-400/70 to-transparent';

export const toolsContent = 'px-4 lg:px-6 mt-5 space-y-4';

export const toolsCard =
  'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm';

export const toolsBtnPrimary =
  'w-full h-11 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer flex items-center justify-center gap-2';

export const toolsBtnOutline =
  'w-full h-11 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors cursor-pointer flex items-center justify-center gap-2';

export const toolsBtnGhost =
  'w-full h-9 rounded-lg text-slate-500 text-sm font-medium hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-2';

export const toolsDropzone =
  'w-full rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 py-10 px-4 text-center cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700/80 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors';

export const toolsIconBox =
  'w-11 h-11 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3';

export const toolsLabel = 'text-xs font-medium text-slate-500 dark:text-slate-400';

export function toolsRadioCard(selected: boolean): string {
  return `flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
    selected
      ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/25 ring-1 ring-indigo-500/15'
      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50'
  }`;
}

export const toolsSegmentBtn = (active: boolean) =>
  `py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
    active
      ? 'bg-indigo-600 text-white shadow-sm'
      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
  }`;

export const toolsInput =
  'w-full h-11 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/15 transition-all';
