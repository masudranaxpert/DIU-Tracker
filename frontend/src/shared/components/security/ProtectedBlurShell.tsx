import React, { useState } from 'react';
import SectionUnlockModal from '@/shared/components/security/SectionUnlockModal';
import type { StudentSession } from '@/shared/services/studentService';
import type { Section } from '@/shared/types/types';

type ProtectedBlurShellProps = {
  locked: boolean;
  verifying?: boolean;
  batchId: string;
  section: Section;
  subSection?: string | null;
  batchLabel?: string;
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
  batchLabel,
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
          aria-label={hint}
          className="absolute inset-0 z-10 rounded-xl cursor-pointer bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        />
      </div>

      <SectionUnlockModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        batchId={batchId}
        section={section}
        subSection={subSection}
        batchLabel={batchLabel}
        title={modalTitle}
        description={modalDescription}
        submitLabel={submitLabel}
        onUnlocked={(session) => onUnlocked?.(session)}
      />
    </>
  );
};

export default ProtectedBlurShell;
