import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, FileStack, FolderOpen, Minimize2, Scissors, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TOOLS_FOLDER_NAME } from '@/shared/lib/toolsStorage';
import { ToolsStatusBadge } from './ToolsShell';
import { toolsHeaderAccent, toolsHeaderCard, toolsIconBox, toolsPageWrap } from './toolsUi';

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  delay: number;
}

function ToolCard({ title, description, icon, onClick, delay }: ToolCardProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm cursor-pointer transition-colors hover:border-indigo-200 dark:hover:border-indigo-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 active:bg-slate-100 dark:active:bg-slate-900"
    >
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{description}</p>
        </div>
        <ChevronRight className="text-slate-400 shrink-0" size={18} />
      </div>
    </motion.button>
  );
}

interface ToolsHubProps {
  engineReady: boolean;
  engineLoading: boolean;
}

const ToolsHub: React.FC<ToolsHubProps> = ({ engineReady, engineLoading }) => {
  const navigate = useNavigate();

  return (
    <div className={toolsPageWrap}>
      <div className={toolsHeaderCard}>
        <div className={toolsHeaderAccent} />
        <div className="px-5 py-6">
          <div className="flex items-start gap-3">
            <div className={`${toolsIconBox} mx-0 mb-0 shrink-0`}>
              <FileStack size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                <ShieldCheck size={13} />
                Private & offline
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">PDF Tools</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Compress, merge, and split PDFs on your device.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ToolsStatusBadge ready={engineReady} loading={engineLoading} />
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              <FolderOpen size={12} />
              {TOOLS_FOLDER_NAME}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-6 mt-5 space-y-2.5">
        <ToolCard
          title="Compress"
          description="Make files smaller while keeping text sharp"
          icon={<Minimize2 size={20} />}
          onClick={() => navigate('/dashboard/tools/compress')}
          delay={0.04}
        />
        <ToolCard
          title="Merge"
          description="Combine multiple PDFs into one file"
          icon={<FileStack size={20} />}
          onClick={() => navigate('/dashboard/tools/merge')}
          delay={0.08}
        />
        <ToolCard
          title="Split"
          description="Extract pages or split every page"
          icon={<Scissors size={20} />}
          onClick={() => navigate('/dashboard/tools/split')}
          delay={0.12}
        />
      </div>
    </div>
  );
};

export default ToolsHub;
