import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toolsContent, toolsHeaderAccent, toolsHeaderCard, toolsPageWrap } from './toolsUi';

interface ToolsShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backTo?: string;
  engineBadge?: React.ReactNode;
}

const ToolsShell: React.FC<ToolsShellProps> = ({
  title,
  subtitle,
  children,
  backTo = '/dashboard/tools',
  engineBadge,
}) => {
  const navigate = useNavigate();

  return (
    <div className={toolsPageWrap}>
      <div className={toolsHeaderCard}>
        <div className={toolsHeaderAccent} />
        <div className="px-5 py-5">
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-4 cursor-pointer transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md leading-relaxed">{subtitle}</p>
          )}
          {engineBadge && <div className="mt-3 flex flex-wrap gap-2">{engineBadge}</div>}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={toolsContent}
      >
        {children}
      </motion.div>
    </div>
  );
};

export function ToolsStatusBadge({
  ready,
  loading,
}: {
  ready: boolean;
  loading: boolean;
}) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
        <Loader2 size={12} className="animate-spin" />
        Almost ready
      </span>
    );
  }
  if (ready) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        All set
      </span>
    );
  }
  return null;
}

export default ToolsShell;
