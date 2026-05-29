import React from 'react';
import { LogOut, X, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ExitConfirmation: React.FC<Props> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
          {/* Backdrop - Lightened and simplified */}
          <div
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/60 z-0"
          />

          {/* Modal Container */}
          <div
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10"
          >
            {/* Visual Decoration */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
            
            <div className="p-10 flex flex-col items-center text-center">
              {/* Icon */}
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-tr from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-[2.5rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xl border border-indigo-100/50 dark:border-slate-700/50">
                  <LogOut size={40} />
                </div>
                <div 
                  className="absolute -top-2 -right-2 w-10 h-10 bg-white dark:bg-slate-900 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-lg"
                >
                   <AlertCircle size={20} className="text-amber-500" />
                </div>
              </div>

              {/* Text */}
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">
                Exit Portal?
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                Are you sure you want to close the DIU Class Tracker? You'll lose any unsaved activity filters.
              </p>

              {/* Actions */}
              <div className="grid grid-cols-1 gap-3 w-full mt-10">
                <button
                  onClick={onConfirm}
                  className="w-full py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Confirm Exit
                </button>
                <button
                  onClick={onCancel}
                  className="w-full py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  Stay in App
                </button>
              </div>
            </div>

            {/* Close Button (Small) */}
            <button
              onClick={onCancel}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={24} />
            </button>
            </div>
        </div>
  );
};

export default ExitConfirmation;
