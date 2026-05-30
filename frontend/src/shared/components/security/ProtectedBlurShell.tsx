import React, { useState } from 'react';
import { KeyRound, Lock } from 'lucide-react';
import SectionUnlockModal from '@/shared/components/security/SectionUnlockModal';
import type { StudentSession } from '@/shared/services/studentService';
import type { Section } from '@/shared/types/types';

type ProtectedBlurShellProps = {
  locked: boolean;
  verifying?: boolean;
  batchId: string;
  section: Section;
  subSection?: string | null;
  children: React.ReactNode;
  hint?: string;
  modalTitle?: string;
  modalDescription?: string;
  submitLabel?: string;
  onUnlocked?: (session: StudentSession) => void;
  className?: string;
};

const ProtectedBlurShell: React.FC<ProtectedBlurShellProps> = ({
  locked,
  verifying = false,
  batchId,
  section,
  subSection,
  children,
  hint = 'Tap to enter section code',
  modalTitle = 'Unlock section content',
  modalDescription,
  submitLabel = 'Unlock',
  onUnlocked,
  className = '',
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  if (verifying) {
    return (
      <div className={`py-10 flex justify-center ${className}`}>
        <div className="w-8 h-8 border-[3px] border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!locked) {
    return <div className={className}>{children}</div>;
  }

  return (
    <>
      <div className={`relative rounded-xl ${className}`}>
        <div
          className="blur-[7px] saturate-[1.15] brightness-[0.97] select-none pointer-events-none"
          aria-hidden="true"
        >
          {children}
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl cursor-pointer border border-indigo-200/40 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.08] via-violet-500/[0.06] to-fuchsia-500/[0.08] dark:from-indigo-400/10 dark:via-violet-500/10 dark:to-fuchsia-500/10 backdrop-blur-[3px] transition-colors duration-200 hover:from-indigo-500/[0.12] hover:via-violet-500/[0.10] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30">
            <Lock size={20} strokeWidth={2.25} />
          </span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{hint}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300">
            <KeyRound size={14} />
            Section code required
          </span>
        </button>
      </div>

      <SectionUnlockModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        batchId={batchId}
        section={section}
        subSection={subSection}
        title={modalTitle}
        description={modalDescription}
        submitLabel={submitLabel}
        onUnlocked={(session) => onUnlocked?.(session)}
      />
    </>
  );
};

export default ProtectedBlurShell;
