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
          aria-labelledby="section-unlock-form-title"
          className="fixed inset-0 z-[120] flex flex-col sm:items-center sm:justify-center sm:bg-slate-950/60 sm:p-4 sm:backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 30, stiffness: 360 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-full w-full flex-col overflow-hidden bg-white dark:bg-slate-950 sm:h-auto sm:max-h-[min(90vh,680px)] sm:w-full sm:max-w-[400px] sm:rounded-2xl sm:border sm:border-slate-200/90 sm:shadow-2xl sm:ring-1 sm:ring-slate-900/5 dark:sm:border-slate-800 dark:sm:ring-white/10"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/90 via-violet-50/40 to-transparent dark:from-indigo-950/70 dark:via-slate-950 dark:to-transparent sm:rounded-t-2xl" />

            <header className="relative z-20 shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:px-5 sm:pt-4">
              <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center">
                <div aria-hidden className="h-9 w-9" />
                <div className="flex justify-center sm:hidden">
                  <span className="h-1 w-10 rounded-full bg-slate-300/90 dark:bg-slate-600" aria-hidden />
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center justify-self-end rounded-full text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:focus-visible:ring-offset-slate-950"
                >
                  <X size={18} strokeWidth={2.25} />
                </button>
              </div>
            </header>

            <div className="custom-scrollbar relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1 sm:px-6 sm:pb-6">
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
