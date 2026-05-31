import React from 'react';
import { Loader2 } from 'lucide-react';
import { toolsCard } from './toolsUi';

export function ToolsProgressOverlay({
  open,
  label,
  current,
  total,
}: {
  open: boolean;
  label: string;
  current: number;
  total: number;
}) {
  if (!open) return null;

  const hasTotal = total > 0;
  const pct = hasTotal
    ? Math.min(100, Math.max(Math.round((current / total) * 100), current > 0 ? 4 : 8))
    : 12;
  const showCount = hasTotal && total > 1;

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center p-6 bg-slate-950/50 backdrop-blur-sm">
      <div className={`w-full max-w-sm ${toolsCard} p-5 shadow-lg`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white">{label || 'Working…'}</p>
            {showCount && (
              <p className="text-xs text-slate-500 tabular-nums">
                {current} / {total}
              </p>
            )}
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${pct}%`, transition: 'width 0.25s ease-out' }}
          />
        </div>
        <p className="text-center text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-2 tabular-nums">
          {pct}%
        </p>
      </div>
    </div>
  );
}
