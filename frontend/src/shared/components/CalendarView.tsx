import React, { useState, useMemo, useEffect } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  eachDayOfInterval,
  isToday
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  AlertCircle,
  BookOpen,
  ArrowRight,
  LayoutGrid,
  List as ListIcon,
  Flag,
  Download,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AcademicRecord, Deadline, Course, Section } from '@/shared/types/types';
import type { AcademicCalendarEvent } from '@/shared/lib/academicCalendarUtils';
import {
  ACADEMIC_EVENT_TYPE_LABELS,
  eventOccursOnDay,
  parseLocalCalendarDate,
} from '@/shared/lib/academicCalendarUtils';
// jspdf + autotable are heavy — load only when exporting a PDF.
const loadPdfLibs = async (): Promise<{
  jsPDF: typeof import('jspdf').jsPDF;
  autoTable: typeof import('jspdf-autotable').default;
}> => {
  const [jspdf, autotable] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  return { jsPDF: jspdf.jsPDF, autoTable: autotable.default };
};
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useDialogStore } from '@/shared/hooks/useDialog';

function displayRoom(room?: string | null): string | null {
  const value = room?.trim();
  if (!value || value.toUpperCase() === 'TBA') return null;
  return value;
}

function formatRecordDetails(time?: string | null, room?: string | null): string {
  const timeLabel = time?.trim() || '';
  const roomLabel = displayRoom(room);
  if (timeLabel && roomLabel) return `${timeLabel} (Room: ${roomLabel})`;
  if (timeLabel) return timeLabel;
  if (roomLabel) return `Room: ${roomLabel}`;
  return '--';
}

interface CalendarViewProps {
  records: AcademicRecord[];
  deadlines: Deadline[];
  courses: Course[];
  academicEvents?: AcademicCalendarEvent[];
  onNavigateToAcademicCalendar?: () => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onAction: (type: string, id: string) => void;
  section?: Section;
  batchId?: string;
  isDayDetailOpen?: boolean;
  setIsDayDetailOpen?: (open: boolean) => void;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  'CLASS': 'bg-indigo-50/50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
  'LAB': 'bg-emerald-50/50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  'EXAM': 'bg-rose-50/50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
  'CT': 'bg-amber-50/50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  'MID': 'bg-orange-50/50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  'FINAL': 'bg-rose-600 text-white shadow-lg shadow-rose-500/30',
  'ASSIGNMENT': 'bg-sky-50/50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
};

const DEADLINE_COLORS: Record<string, string> = {
  'CT': 'from-amber-400 to-amber-600',
  'MID': 'from-orange-500 to-orange-700',
  'FINAL': 'from-rose-500 to-rose-700',
  'ASSIGNMENT': 'from-indigo-500 to-indigo-700',
  'PROJECT': 'from-emerald-500 to-emerald-700',
  'LAB_FINAL': 'from-violet-500 to-violet-700',
};

/** Teal = university academic calendar (distinct from indigo records & deadline gradients) */
const ACADEMIC_TEAL = {
  gridChip: 'bg-gradient-to-br from-teal-400 to-teal-600 text-white',
  panelBg: 'bg-teal-50/80 dark:bg-teal-950/25',
  panelBorder: 'border-teal-200/70 dark:border-teal-800/50',
  label: 'text-teal-700 dark:text-teal-300',
  header: 'text-teal-800 dark:text-teal-300',
  headerBorder: 'border-teal-200 dark:border-teal-800/50',
  typeChip: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
  iconGrad: 'from-teal-500 to-cyan-600',
  btn: 'border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 hover:bg-teal-100/70 dark:hover:bg-teal-950/40',
};

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date(NaN);
  const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
};

const CalendarView: React.FC<CalendarViewProps> = ({
  records,
  deadlines,
  courses,
  academicEvents = [],
  selectedDate,
  onDateSelect,
  onAction,
  onNavigateToAcademicCalendar,
  isDayDetailOpen,
  setIsDayDetailOpen,
}) => {
  const dialog = useDialogStore();
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  useEffect(() => {
    setCurrentDate(selectedDate);
  }, [selectedDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = useMemo(() =>
    eachDayOfInterval({ start: startDate, end: endDate }),
    [startDate, endDate]
  );

  const getDayEvents = (day: Date) => {
    const dayRecords = records.filter(r => isSameDay(parseLocalDate(r.date), day));
    const dayDeadlines = deadlines.filter(d => isSameDay(parseLocalDate(d.date), day));
    const dayAcademic = academicEvents.filter(e => eventOccursOnDay(e, day));
    return { dayRecords, dayDeadlines, dayAcademic };
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    onDateSelect(today);
  };

  const selectDayFromList = (day: Date) => {
    setCurrentDate(day);
    onDateSelect(day);
    setViewMode('GRID');
    setIsDayDetailOpen?.(true);
  };

  const selectedDayEvents = useMemo(() => getDayEvents(selectedDate), [selectedDate, records, deadlines, academicEvents]);

  const activeMonthDaysWithEvents = useMemo(() => {
    return calendarDays
      .filter(day => isSameMonth(day, monthStart))
      .filter(day => {
        const { dayRecords, dayDeadlines, dayAcademic } = getDayEvents(day);
        return dayRecords.length > 0 || dayDeadlines.length > 0 || dayAcademic.length > 0;
      });
  }, [calendarDays, monthStart, records, deadlines, academicEvents]);

  const handleExportPDF = async () => {
    const { jsPDF, autoTable } = await loadPdfLibs();
    const doc = new jsPDF();
    const monthYear = format(currentDate, 'MMMM yyyy');

    // Attempt to add DIU Logo (Crest from local assets)
    try {
      const logoPath = '/diulog.png';
      const img = new Image();
      img.src = logoPath;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      // DIU Crest positioning
      doc.addImage(dataUrl, 'PNG', 172, 10, 24, 24);
    } catch (e) {
      console.warn('Local DIU Logo could not be loaded');
    }

    // Luxury PDF Header
    doc.setFontSize(26);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.setFont('helvetica', 'bold');
    doc.text('ACADEMIC LIFELINE', 14, 25);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFont('helvetica', 'normal');
    doc.text(`Monthly Schedule: ${monthYear.toUpperCase()}`, 14, 32);

    doc.text('Generated by ', 14, 37);
    const textWidth = doc.getTextWidth('Generated by ');
    doc.setTextColor(79, 70, 229);
    doc.text('DIU Tracker', 14 + textWidth, 37);
    const diuWidth = doc.getTextWidth('DIU Tracker');
    doc.setTextColor(100, 116, 139);
    doc.text(' | ', 14 + textWidth + diuWidth, 37);
    const pipeWidth = doc.getTextWidth(' | ');
    doc.setTextColor(79, 70, 229);
    doc.textWithLink('diutracker.com', 14 + textWidth + diuWidth + pipeWidth, 37, { url: 'https://diutracker.com' });

    const tableData: any[] = [];
    const spanMap: Record<string, number> = {};

    // Group and prepare data with span calculation
    calendarDays
      .filter(day => isSameMonth(day, monthStart))
      .forEach(day => {
        const { dayRecords, dayDeadlines } = getDayEvents(day);
        const totalEvents = dayDeadlines.length + dayRecords.length;
        if (totalEvents === 0) return;

        const dateKey = format(day, 'yyyy-MM-dd');
        spanMap[dateKey] = totalEvents;

        dayDeadlines.forEach((d, idx) => {
          tableData.push({
            date: format(day, 'dd MMM'),
            day: format(day, 'EEEE'),
            category: 'DEADLINE',
            type: d.type.toUpperCase(),
            course: courses.find(c => c.id === d.course_id)?.code || 'N/A',
            title: d.title,
            details: '--',
            isFirst: idx === 0,
            dateKey
          });
        });

        dayRecords.forEach((r, idx) => {
          const isFirstOfDate = dayDeadlines.length === 0 && idx === 0;
          tableData.push({
            date: format(day, 'dd MMM'),
            day: format(day, 'EEEE'),
            category: 'RESOURCE',
            type: r.type.toUpperCase(),
            course: courses.find(c => c.id === r.course_id)?.code || 'N/A',
            title: r.title,
            details: formatRecordDetails(r.time, r.room),
            isFirst: isFirstOfDate,
            dateKey
          });
        });
      });

    autoTable(doc, {
      startY: 45,
      head: [['Date', 'Day', 'Category', 'Type', 'Course', 'Title', 'Details']],
      body: tableData.map(row => [row.date, row.day, row.category, row.type, row.course, row.title, row.details]),
      didParseCell: (data) => {
        if (data.section === 'body' && (data.column.index === 0 || data.column.index === 1)) {
          const rowData = tableData[data.row.index];
          if (rowData.isFirst) {
            data.cell.rowSpan = spanMap[rowData.dateKey];
          } else {
            data.cell.content = '';
            // Make sure the cell doesn't render if it's being spanned over
          }
        }
      },
      headStyles: {
        fillColor: [79, 70, 229],
        fontSize: 9,
        fontStyle: 'bold',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'middle'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { top: 45 },
      styles: {
        font: 'helvetica',
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      }
    });

    const fileName = `DIU_Tracker_Schedule_${format(currentDate, 'MMM_yyyy')}.pdf`;

    if (Capacitor.isNativePlatform()) {
      try {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        
        // Write to Cache first as a reliable staging area
        const cacheFile = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache,
          recursive: true
        });

        // Try to save to public Download folder (best UX, "web-like")
        try {
          await Filesystem.writeFile({
            path: `Download/${fileName}`,
            data: pdfBase64,
            directory: Directory.ExternalStorage,
            recursive: true
          });
          
          await dialog.alert(`Schedule saved successfully to your "Download" folder as ${fileName}`, "Download Complete");
          
          // Trigger a notification
          try {
            await LocalNotifications.schedule({
              notifications: [{
                title: "Download Complete",
                body: `${fileName} is now in your Downloads`,
                id: Date.now()
              }]
            });
          } catch (ne) {}
          
        } catch (downloadError) {
          // Fallback to Share sheet if Scoped Storage blocks direct write
          // On modern Android, this is often the ONLY way to reach public folders
          console.warn('Direct download blocked, opening share/save sheet');
          await Share.share({
            title: 'Save Schedule',
            files: [cacheFile.uri],
            dialogTitle: 'Save to Device or Share'
          });
        }
      } catch (error) {
        console.error('Error exporting PDF on native platform:', error);
        await dialog.alert("Failed to save PDF. Please check app permissions in settings.", "Export Error");
      }
    } else {
      doc.save(fileName);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-white dark:bg-slate-950 rounded-2xl lg:rounded-[2rem] border border-slate-200/80 dark:border-slate-800/60 shadow-xl overflow-hidden font-sans">
      {/* Main Calendar Section */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 shadow-2xl z-10 overflow-hidden">
        {/* Luxury Glass Header */}
        <div className="px-4 py-6 lg:px-8 lg:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center justify-between sm:justify-start gap-4 lg:gap-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <h1 className="relative text-2xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                {format(currentDate, 'MMMM')} <span className="text-indigo-600 font-black">{format(currentDate, 'yyyy')}</span>
              </h1>
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl lg:p-1.5 lg:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
              <button
                onClick={() => setViewMode('GRID')}
                className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg lg:rounded-xl text-[8px] lg:text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('LIST')}
                className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg lg:rounded-xl text-[8px] lg:text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                List
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 lg:gap-4">
            <button
              onClick={goToToday}
              className="px-4 py-2.5 lg:px-6 lg:py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl lg:rounded-2xl text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-slate-500/10"
            >
              Today
            </button>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl lg:rounded-2xl p-0.5 lg:p-1 shadow-sm">
              <button onClick={prevMonth} className="p-2 lg:p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg lg:rounded-xl transition-all">
                <ChevronLeft size={20} className="lg:w-6 lg:h-6" />
              </button>
              <button onClick={nextMonth} className="p-2 lg:p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg lg:rounded-xl transition-all">
                <ChevronRight size={20} className="lg:w-6 lg:h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Days Header — grid only */}
        {viewMode === 'GRID' && (
        <div className="grid grid-cols-7 bg-white dark:bg-slate-950 border-b border-slate-200/60 dark:border-slate-800/60">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 lg:py-5 text-center text-[8px] lg:text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] lg:tracking-[0.4em]">
              {day}
            </div>
          ))}
        </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/70 dark:bg-slate-900/10 p-2 lg:p-4">
          <AnimatePresence mode="wait">
            {viewMode === 'GRID' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-7 gap-1 lg:gap-2"
              >
                {calendarDays.map((day, idx) => {
                  const { dayRecords, dayDeadlines, dayAcademic } = getDayEvents(day);
                  const isCurMonth = isSameMonth(day, monthStart);
                  const isSelected = isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  const rowIdx = Math.floor(idx / 7);
                  const isZebra = rowIdx % 2 !== 0;
                  const hasResources = dayRecords.length > 0;

                  return (
                    <div
                      key={idx}
                      onClick={() => onDateSelect(day)}
                      className={`min-h-[55px] sm:min-h-[65px] lg:min-h-[85px] rounded-lg p-1 lg:p-1.5 flex flex-col gap-0.5 transition-all group relative cursor-pointer border ${!isCurMonth
                        ? 'bg-transparent opacity-10 pointer-events-none border-transparent'
                        : isSelected
                          ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/10 z-10'
                          : `${isZebra ? 'bg-slate-100/80 dark:bg-slate-900/60' : 'bg-white dark:bg-slate-950'} border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md`
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-[8px] lg:text-[10px] font-black transition-all ${isSelected ? 'text-indigo-600' :
                          isTodayDate ? 'text-indigo-600 relative after:absolute after:-bottom-0.5 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600 after:rounded-full' :
                            isCurMonth ? 'text-slate-900 dark:text-white' : 'text-slate-200 dark:text-slate-800'
                          }`}>
                          {format(day, 'd')}
                        </span>

                        {hasResources && isCurMonth && (
                          <div className="flex items-center justify-center bg-indigo-600 text-white w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full shadow-sm shadow-indigo-500/20">
                            <span className="text-[5px] lg:text-[6px] font-black uppercase">
                              {dayRecords.length}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-end gap-0.5 lg:gap-1 overflow-hidden">
                        {dayAcademic.slice(0, 1).map(e => (
                          <div
                            key={e.id}
                            className={`px-0.5 lg:px-1 py-0.5 rounded-[2px] lg:rounded-[3px] text-[4.5px] sm:text-[5.5px] lg:text-[6.5px] font-black uppercase truncate shadow-sm ${ACADEMIC_TEAL.gridChip}`}
                            title={e.title}
                          >
                            {e.title}
                          </div>
                        ))}

                        {dayDeadlines.slice(0, 2).map(d => (
                          <div
                            key={d.id}
                            className={`px-0.5 lg:px-1 py-0.5 rounded-[2px] lg:rounded-[3px] text-[4.5px] sm:text-[5.5px] lg:text-[6.5px] font-black uppercase text-white truncate shadow-sm bg-gradient-to-br ${DEADLINE_COLORS[d.type] || 'from-indigo-500 to-indigo-700'}`}
                          >
                            {d.title}
                          </div>
                        ))}

                        <div className="flex flex-wrap gap-0.5 lg:gap-1 px-0.5 pb-0.5">
                          {dayRecords.slice(0, 4).map(r => (
                            <div
                              key={r.id}
                              className={`w-1 lg:w-1.5 h-1 lg:h-1.5 rounded-full shrink-0 shadow-sm border border-white/20 ${(EVENT_TYPE_COLORS[r.type] || 'bg-indigo-500').split(' ')[0]}`}
                              title={r.title}
                            />
                          ))}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="absolute inset-0 rounded-lg bg-indigo-500/5 pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              activeMonthDaysWithEvents.length > 0 ? (
                <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-2 lg:p-8 space-y-8 lg:space-y-12 max-w-4xl mx-auto">
                  {activeMonthDaysWithEvents.map((day) => {
                    const { dayRecords, dayDeadlines, dayAcademic } = getDayEvents(day);
                    const isSelected = isSameDay(day, selectedDate);
                    return (
                      <div key={day.toISOString()} className="flex gap-4 lg:gap-8 relative group/list">
                        <div className="absolute left-[1.1rem] lg:left-[1.5rem] top-8 bottom-0 w-[1px] bg-slate-100 dark:bg-slate-800" />
                        <button
                          type="button"
                          onClick={() => selectDayFromList(day)}
                          className={`w-10 lg:w-12 shrink-0 flex flex-col items-center rounded-xl py-1 transition-colors cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/30 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/30' : ''}`}
                          aria-label={`Go to ${format(day, 'MMMM d, yyyy')}`}
                        >
                          <span className="text-[6px] lg:text-[7px] font-black text-slate-400 uppercase tracking-widest">{format(day, 'EEE')}</span>
                          <span className={`text-xl lg:text-2xl font-black ${isToday(day) ? 'text-indigo-600' : isSelected ? 'text-indigo-600' : 'text-slate-900 dark:text-white'}`}>{format(day, 'dd')}</span>
                        </button>
                        <div className="flex-1 space-y-3 lg:space-y-4">
                          {dayAcademic.map(e => (
                            <button
                              key={e.id}
                              type="button"
                              onClick={() => selectDayFromList(day)}
                              className={`w-full flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl ${ACADEMIC_TEAL.panelBg} border ${ACADEMIC_TEAL.panelBorder} shadow-sm text-left cursor-pointer hover:border-teal-400/60 dark:hover:border-teal-600/50 transition-colors`}
                            >
                              <div className={`w-1 lg:w-1.5 h-6 lg:h-8 rounded-full bg-gradient-to-b ${ACADEMIC_TEAL.iconGrad}`} />
                              <div className="flex-1">
                                <h4 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white leading-snug">{e.title}</h4>
                              </div>
                            </button>
                          ))}
                          {dayDeadlines.map(d => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => selectDayFromList(day)}
                              className="w-full flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm text-left cursor-pointer hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors"
                            >
                              <div className={`w-1 lg:w-1.5 h-6 lg:h-8 rounded-full bg-gradient-to-b ${DEADLINE_COLORS[d.type] || 'from-indigo-500 to-indigo-700'}`} />
                              <div className="flex-1">
                                <span className="text-[6px] lg:text-[7px] font-black text-rose-500 uppercase tracking-widest">{d.type}</span>
                                <h4 className="text-xs lg:text-sm font-black text-slate-900 dark:text-white uppercase leading-none">{d.title}</h4>
                              </div>
                              <Flag size={14} className="text-slate-300 lg:w-4 lg:h-4" />
                            </button>
                          ))}
                          {dayRecords.map(r => (
                            <div key={r.id} onClick={() => onAction('record', r.id)} className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm cursor-pointer hover:border-indigo-200 transition-colors">
                              <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center shrink-0 ${EVENT_TYPE_COLORS[r.type] || 'bg-slate-100'}`}>
                                <Clock size={12} className="text-slate-600 lg:w-3.5 lg:h-3.5" />
                              </div>
                              <div className="flex-1">
                                <span className="text-[6px] lg:text-[7px] font-black text-indigo-500 uppercase tracking-widest">{r.type}</span>
                                <h4 className="text-xs lg:text-sm font-black text-slate-900 dark:text-white uppercase leading-none">{r.title}</h4>
                              </div>
                              <div className="text-right">
                                <span className="text-[8px] lg:text-[9px] font-black text-slate-900 dark:text-white uppercase block">{r.time || 'TBA'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="empty-list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto"
                >
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900/50 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-6 shadow-inner border border-slate-200/40 dark:border-slate-800/40">
                    <CalendarIcon size={28} className="text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">No Schedule Found</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                    There are no classes, exams, or deadlines scheduled for {format(currentDate, 'MMMM yyyy')}.
                  </p>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Luxury Side Agenda - Responsive Bottom Section on Mobile */}
      <div className="w-full lg:w-[320px] xl:w-[380px] bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-3xl flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-800/60 relative min-h-[400px] lg:min-h-0">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

        <div className="p-6 lg:p-8 pb-4 relative z-10">
          <div className="flex items-end gap-3 mb-1">
            <h4 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
              {format(selectedDate, 'dd')}
            </h4>
            <div className="flex flex-col pb-0.5">
              <span className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase leading-none tracking-tight mb-1">
                {format(selectedDate, 'MMMM')}
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">
                {format(selectedDate, 'EEEE')}
              </span>
            </div>
          </div>
          {isToday(selectedDate) && (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[6px] font-black uppercase tracking-widest mt-2">
              Today is Live
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto lg:overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-10 relative z-10">
          {selectedDayEvents.dayAcademic.length > 0 && (
            <section>
              <div className="space-y-3">
                {selectedDayEvents.dayAcademic.map(event => {
                  const start = parseLocalCalendarDate(event.start);
                  const end = parseLocalCalendarDate(event.end || event.start);
                  const isRange = event.end && event.end !== event.start;
                  return (
                    <div
                      key={event.id}
                      className={`p-4 rounded-2xl ${ACADEMIC_TEAL.panelBg} border ${ACADEMIC_TEAL.panelBorder} shadow-sm`}
                    >
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest mb-2 ${ACADEMIC_TEAL.typeChip}`}>
                        {ACADEMIC_EVENT_TYPE_LABELS[event.type] || 'Academic'}
                      </span>
                      <h6 className="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-1.5">{event.title}</h6>
                      <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
                        {isRange
                          ? `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
                          : format(start, 'MMM d, yyyy')}
                        {event.semester ? ` · ${event.semester}` : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
              {onNavigateToAcademicCalendar && (
                <button
                  type="button"
                  onClick={onNavigateToAcademicCalendar}
                  className={`mt-3 w-full py-2.5 rounded-xl border ${ACADEMIC_TEAL.btn} text-[9px] font-bold uppercase tracking-widest transition-colors cursor-pointer`}
                >
                  View full academic calendar
                </button>
              )}
            </section>
          )}

          {selectedDayEvents.dayDeadlines.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                <h5 className="text-[8px] font-black text-slate-900 dark:text-white uppercase tracking-widest">## Deadlines</h5>
                <AlertCircle size={12} className="text-rose-500" />
              </div>
              <div className="space-y-3">
                {selectedDayEvents.dayDeadlines.map(deadline => (
                  <div key={deadline.id} className="group relative">
                    <div className={`absolute -left-2 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b ${DEADLINE_COLORS[deadline.type] || 'bg-indigo-500'}`} />
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-indigo-200 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest text-white bg-gradient-to-br ${DEADLINE_COLORS[deadline.type] || 'from-indigo-500 to-indigo-700'}`}>
                          {deadline.type}
                        </span>
                      </div>
                      <h6 className="text-sm font-black text-slate-900 dark:text-white uppercase leading-tight tracking-tight mb-2">{deadline.title}</h6>
                      <div className="flex items-center gap-2">
                        <BookOpen size={12} className="text-indigo-600 shrink-0" />
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">
                          {courses.find(c => c.id === deadline.course_id)?.name}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
              <h5 className="text-[8px] font-black text-slate-900 dark:text-white uppercase tracking-widest">## Resources</h5>
            </div>
            {selectedDayEvents.dayRecords.length > 0 ? (
              <div className="space-y-6">
                {selectedDayEvents.dayRecords.map(record => {
                  const roomLabel = displayRoom(record.room);
                  return (
                  <div key={record.id} className="flex gap-4 group cursor-pointer" onClick={() => onAction('record', record.id)}>
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-2 h-2 rounded-full border-2 border-slate-200 dark:border-slate-800 group-hover:border-indigo-500 group-hover:bg-indigo-500 transition-all mb-2" />
                      <div className="flex-1 w-[1.5px] bg-slate-100 dark:bg-slate-800 group-last:bg-transparent" />
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">
                          {record.time || 'TBA'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest ${EVENT_TYPE_COLORS[record.type] || 'bg-slate-100'}`}>
                          {record.type}
                        </span>
                      </div>
                      <h6 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 transition-colors leading-tight">
                        {record.title}
                      </h6>
                      <div className="flex items-center gap-3 text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        {roomLabel && (
                          <div className="flex items-center gap-1">
                            <MapPin size={10} className="text-rose-500" /> {roomLabel}
                          </div>
                        )}
                        <span>{courses.find(c => c.id === record.course_id)?.code}</span>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-20 grayscale">
                <CalendarIcon size={32} className="mb-2" />
                <p className="text-[8px] font-black uppercase tracking-widest">Agenda Empty</p>
              </div>
            )}
          </section>
        </div>

        <div className="p-8 pt-0 mt-auto relative z-10 sticky bottom-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
          <button
            onClick={handleExportPDF}
            className="w-full h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[8px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] transition-all shadow-xl shadow-slate-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Export Schedule <Download size={14} />
          </button>
        </div>
      </div>
    </div>
  );

};

export default CalendarView;
