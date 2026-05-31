import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, FileText, FlaskConical, FileCheck2, ListOrdered, GraduationCap } from 'lucide-react';
import { COVER_KINDS, type CoverKind } from '@/shared/services/coverPage/coverTypes';
import { toolsHeaderAccent, toolsHeaderCard, toolsIconBox, toolsPageWrap } from '@/shared/components/tools/toolsUi';
import CoverForm, { type CoverStudentAutofill } from './CoverForm';
import type { CourseOption } from './CourseSelect';

interface CoverPageViewProps {
  courses: CourseOption[];
  autofill: CoverStudentAutofill;
}

const KIND_ICON: Record<CoverKind, React.ReactNode> = {
  assignment: <FileText size={20} />,
  lab: <FlaskConical size={20} />,
  final: <FileCheck2 size={20} />,
  index: <ListOrdered size={20} />,
};

function isCoverKind(value?: string): value is CoverKind {
  return value === 'assignment' || value === 'lab' || value === 'final' || value === 'index';
}

const CoverPageView: React.FC<CoverPageViewProps> = ({ courses, autofill }) => {
  const navigate = useNavigate();
  const { subId } = useParams<{ subId?: string }>();

  if (isCoverKind(subId)) {
    return (
      <CoverForm
        kind={subId}
        courses={courses}
        autofill={autofill}
        onBack={() => navigate('/dashboard/cover')}
      />
    );
  }

  return (
    <div className={toolsPageWrap}>
      <div className={toolsHeaderCard}>
        <div className={toolsHeaderAccent} />
        <div className="px-5 py-6">
          <div className="flex items-start gap-3">
            <div className={`${toolsIconBox} mx-0 mb-0 shrink-0`}>
              <GraduationCap size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">DIU standard</p>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Cover Page</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Generate clean assignment & lab report covers, ready to download.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-6 mt-5 space-y-2.5 max-w-3xl">
        {COVER_KINDS.map((kind, i) => (
          <motion.button
            key={kind.id}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * (i + 1), duration: 0.25 }}
            onClick={() => navigate(`/dashboard/cover/${kind.id}`)}
            className="w-full text-left rounded-xl p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm cursor-pointer transition-colors hover:border-indigo-200 dark:hover:border-indigo-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                {KIND_ICON[kind.id]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{kind.label}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{kind.description}</p>
              </div>
              <ChevronRight className="text-slate-400 shrink-0" size={18} />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default CoverPageView;
