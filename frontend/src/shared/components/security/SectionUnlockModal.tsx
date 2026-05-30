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
          className="fixed inset-0 z-[120] flex flex-col sm:items-center sm:justify-center sm:p-4 sm:bg-slate-950/60 sm:backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-full w-full flex-col overflow-hidden bg-white dark:bg-slate-900 sm:h-auto sm:max-h-[min(90vh,720px)] sm:max-w-[420px] sm:rounded-2xl sm:border sm:border-slate-200/80 sm:shadow-2xl dark:sm:border-slate-700/80"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-indigo-50/80 to-transparent dark:from-indigo-950/40 sm:rounded-t-2xl" />

            <div className="relative z-10 flex shrink-0 justify-center pt-[max(0.625rem,env(safe-area-inset-top))] pb-1 sm:pt-3">
              <span
                className="h-1 w-10 rounded-full bg-slate-300/90 dark:bg-slate-600 sm:hidden"
                aria-hidden
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-[max(0.625rem,env(safe-area-inset-top))] z-20 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-500 shadow-sm backdrop-blur-sm transition-colors duration-200 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-slate-700/90 dark:bg-slate-900/95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:focus-visible:ring-offset-slate-900 sm:right-5 sm:top-4"
            >
              <X size={18} strokeWidth={2.25} />
            </button>

            <div className="custom-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-6 sm:pt-1">
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default SectionUnlockModal;
