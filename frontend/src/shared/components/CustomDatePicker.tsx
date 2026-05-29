import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval } from 'date-fns';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, label, placeholder = "Select date", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleDateClick = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800">
      <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
        <ChevronLeft size={16} />
      </button>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
        {format(currentMonth, 'MMMM yyyy')}
      </span>
      <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
        <ChevronRight size={16} />
      </button>
    </div>
  );

  const renderDays = () => {
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    return (
      <div className="grid grid-cols-7 mb-1">
        {days.map((day) => (
          <div key={day} className="text-center text-[9px] font-black text-slate-400 uppercase py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const interval = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-1">
        {interval.map((d, i) => {
          const isSelected = value && isSameDay(d, new Date(value));
          const isCurrentMonth = isSameMonth(d, monthStart);
          
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleDateClick(d)}
              className={`aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                isSelected 
                  ? 'bg-indigo-600 text-white' 
                  : isCurrentMonth 
                    ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800' 
                    : 'text-slate-300 dark:text-slate-600'
              }`}
            >
              {format(d, 'd')}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1 flex items-center gap-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all font-bold text-sm"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <CalendarIcon size={16} className="text-slate-400 flex-shrink-0" />
          <span className={`text-sm truncate ${value ? 'text-slate-700 dark:text-white' : 'text-slate-400'}`}>
            {value ? format(new Date(value), 'MMM dd, yyyy') : placeholder}
          </span>
        </div>
        <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
      </button>


      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="relative w-full max-w-[320px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label || "Select Date"}</span>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            {renderHeader()}
            <div className="p-3">
              {renderDays()}
              {renderCells()}
            </div>
            
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <button 
                type="button" 
                onClick={() => handleDateClick(new Date())}
                className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
