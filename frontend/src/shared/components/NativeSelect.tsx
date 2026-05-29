
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  id: string | number;
  name: string;
}

interface NativeSelectProps {
  label?: string;
  placeholder?: string;
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  icon?: React.ReactNode;
  showSearch?: boolean;
  className?: string;
  isClearable?: boolean;
  /** Higher z-index for dropdowns inside overflow containers */
  menuZIndex?: number;
}

const NativeSelect: React.FC<NativeSelectProps> = ({
  label,
  placeholder,
  options,
  value,
  onChange,
  icon,
  className = "",
  isClearable = false,
  menuZIndex = 9999,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value || opt.id.toString() === value.toString());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`space-y-1.5 w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1 flex items-center gap-1.5">
          {label}
        </label>
      )}
      <div className="relative group">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center text-left ${icon ? 'pl-12' : 'pl-4'} pr-10 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700 dark:text-white text-sm cursor-pointer relative z-10`}
        >
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
              {icon}
            </div>
          )}
          
          <span className={`truncate ${!selectedOption ? 'text-slate-400' : ''}`}>
            {selectedOption ? selectedOption.name : placeholder || 'Select option'}
          </span>

          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform duration-200" style={{ transform: `translateY(-50%) rotate(${isOpen ? 180 : 0}deg)` }}>
            <ChevronDown size={16} />
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-0 right-0 mt-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto no-scrollbar"
              style={{ zIndex: menuZIndex }}
            >
              <div className="space-y-0.5">
                {isClearable && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      !value
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <span className="truncate italic">{placeholder || 'None'}</span>
                    {!value && (
                      <Check size={14} strokeWidth={3} />
                    )}
                  </button>
                )}

                {options.length === 0 && !isClearable ? (
                  <div className="px-4 py-3 text-xs font-bold text-slate-400 uppercase text-center">
                    No options available
                  </div>
                ) : (
                  options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        onChange(option.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                        (value === option.id || value.toString() === option.id.toString())
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="truncate">{option.name}</span>
                      {(value === option.id || value.toString() === option.id.toString()) && (
                        <Check size={14} strokeWidth={3} />
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NativeSelect;

