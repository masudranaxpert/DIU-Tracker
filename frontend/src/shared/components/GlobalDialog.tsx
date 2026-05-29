import React from 'react';
import { useDialogStore } from '@/shared/hooks/useDialog';
import { AlertCircle, HelpCircle, CheckCircle2, X } from 'lucide-react';

const GlobalDialog: React.FC = () => {
  const { isOpen, type, title, message, confirmLabel, cancelLabel, onConfirm, onCancel } = useDialogStore();

  if (!isOpen) return null;

  const isAlert = type === 'alert';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 animate-in fade-in duration-200">
      {/* Backdrop - High Opacity for Performance (No Blur) */}
      <div 
        className="absolute inset-0 bg-slate-950/80"
        onClick={isAlert ? onConfirm : onCancel}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Header/Icon */}
        <div className="pt-10 pb-6 flex flex-col items-center text-center px-8">
          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 shadow-lg ${
            isAlert 
              ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 shadow-indigo-500/10' 
              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-500 shadow-amber-500/10'
          }`}>
            {isAlert ? <AlertCircle size={40} strokeWidth={2.5} /> : <HelpCircle size={40} strokeWidth={2.5} />}
          </div>
          
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">
            {title}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed px-2">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="p-8 pt-2 grid grid-cols-1 gap-3">
          <button
            onClick={onConfirm}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
              isAlert 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' 
                : 'bg-emerald-500 text-white shadow-emerald-500/20'
            }`}
          >
            {confirmLabel}
          </button>
          
          {!isAlert && (
            <button
              onClick={onCancel}
              className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95"
            >
              {cancelLabel}
            </button>
          )}
        </div>

        {/* Close Button (Top Right) */}
        <button 
          onClick={isAlert ? onConfirm : onCancel}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default GlobalDialog;
