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
          aria-labelledby="section-unlock-title"
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-white/20 dark:border-white/10 bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/30 dark:from-slate-900 dark:via-indigo-950/40 dark:to-violet-950/30 shadow-2xl shadow-indigo-900/20"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <div>
                <p id="section-unlock-title" className="text-base font-semibold text-slate-900 dark:text-white">
                  {title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Section {section}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 pb-6 pt-2 sm:px-5">
              <SectionAccessUnlock
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
