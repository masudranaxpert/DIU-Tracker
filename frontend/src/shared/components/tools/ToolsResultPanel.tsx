import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ExternalLink, FolderOpen, RotateCcw } from 'lucide-react';
import { formatBytes } from '@/shared/lib/toolsStorage';
import { toolsBtnGhost, toolsBtnOutline, toolsBtnPrimary, toolsCard } from './toolsUi';

export interface CompressStats {
  originalBytes: number;
  outputBytes: number;
  fileName: string;
  displayPath: string;
}

interface ToolsResultPanelProps {
  stats: CompressStats;
  onOpenPdf: () => void;
  onOpenFolder: () => void;
  onCompressAnother: () => void;
}

function SavingsRing({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-100 dark:text-slate-800"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-indigo-600 dark:text-indigo-500 transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{clamped}%</span>
        <span className="text-xs font-medium text-slate-500">smaller</span>
      </div>
    </div>
  );
}

const ToolsResultPanel: React.FC<ToolsResultPanelProps> = ({
  stats,
  onOpenPdf,
  onOpenFolder,
  onCompressAnother,
}) => {
  const saved =
    stats.originalBytes > 0
      ? Math.round((1 - stats.outputBytes / stats.originalBytes) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${toolsCard} p-5 space-y-5`}
    >
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
        <CheckCircle2 size={18} />
        <span className="text-sm font-medium">Complete</span>
      </div>

      <SavingsRing percent={saved} />

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 p-3.5 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 mb-1">Before</p>
          <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">
            {formatBytes(stats.originalBytes)}
          </p>
        </div>
        <div className="rounded-lg bg-indigo-50/80 dark:bg-indigo-950/25 p-3.5 border border-indigo-100 dark:border-indigo-900/50">
          <p className="text-xs font-medium text-indigo-600/80 dark:text-indigo-400 mb-1">After</p>
          <p className="text-base font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">
            {formatBytes(stats.outputBytes)}
          </p>
        </div>
      </div>

      <p className="text-xs text-center text-slate-500 truncate px-1">{stats.displayPath}</p>

      <div className="space-y-2">
        <button type="button" onClick={onOpenPdf} className={toolsBtnPrimary}>
          <ExternalLink size={16} />
          Open PDF
        </button>
        <button type="button" onClick={onOpenFolder} className={toolsBtnOutline}>
          <FolderOpen size={16} />
          Go to folder
        </button>
        <button type="button" onClick={onCompressAnother} className={toolsBtnGhost}>
          <RotateCcw size={14} />
          Compress another
        </button>
      </div>
    </motion.div>
  );
};

export default ToolsResultPanel;

export function ToolsSimpleResultPanel({
  title,
  lines,
  onOpenPdf,
  onOpenFolder,
  onDone,
  openLabel = 'Open PDF',
}: {
  title: string;
  lines: string[];
  onOpenPdf?: () => void;
  onOpenFolder: () => void;
  onDone: () => void;
  openLabel?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${toolsCard} p-5 space-y-4`}
    >
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
        <CheckCircle2 size={18} />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
        {lines.map((line) => (
          <li key={line} className="truncate">
            {line}
          </li>
        ))}
      </ul>
      <div className="space-y-2">
        {onOpenPdf && (
          <button type="button" onClick={onOpenPdf} className={toolsBtnPrimary}>
            <ExternalLink size={16} />
            {openLabel}
          </button>
        )}
        <button type="button" onClick={onOpenFolder} className={toolsBtnOutline}>
          <FolderOpen size={16} />
          Go to folder
        </button>
        <button type="button" onClick={onDone} className={toolsBtnGhost}>
          Done
        </button>
      </div>
    </motion.div>
  );
}
