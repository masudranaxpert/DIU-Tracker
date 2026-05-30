import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import SectionAccessUnlock from '@/shared/components/SectionAccessUnlock';
import type { StudentSession } from '@/shared/services/studentService';
import type { Section } from '@/shared/types/types';

export type SectionUnlockModalProps = {
  open: boolean;
  onClose: () => void;
  batchId: string;
  section: Section;
  subSection?: string | null;
  title?: string;
  description?: string;
  submitLabel?: string;
  onUnlocked: (session: StudentSession) => void;
};

const SectionUnlockModal: React.FC<SectionUnlockModalProps> = ({
  open,
  onClose,
  batchId,
  section,
  subSection,
  title = 'Section access',
  description,
  submitLabel = 'Unlock',
  onUnlocked,
}) => {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/40 dark:from-slate-900 dark:via-indigo-950/50 dark:to-violet-950/40 shadow-2xl shadow-indigo-900/15 px-5 py-5 sm:px-6 sm:py-6"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 shadow-sm transition-colors duration-200 cursor-pointer"
            >
              <X size={18} strokeWidth={2.25} />
            </button>

            <SectionAccessUnlock
              embedded
              batchId={batchId}
              section={section}
              subSection={subSection}
              title={title}
              description={description}
              submitLabel={submitLabel}
              onUnlocked={(session) => {
                onUnlocked(session);
                onClose();
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default SectionUnlockModal;
