import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar,
    Gift,
    Backpack,
    GraduationCap,
    Coffee,
    BookOpen,
    Clock,
    ChevronRight,
    Star,
    Share2,
    Download,
    FileText,
    ExternalLink,
    ZoomIn,
    ZoomOut,
    RefreshCw
} from 'lucide-react';
import { format, parseISO, isPast, isFuture, isToday } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// PDF URL - stored in backend or use direct link
const ACADEMIC_CALENDAR_PDF = 'https://firebasestorage.googleapis.com/v0/b/diu-cse-tracker.appspot.com/o/academic-docs%2Facademic-calendar-2026.pdf?alt=media';

interface AcademicEvent {
    id: string;
    title: string;
    date: string;
    endDate?: string;
    type: 'holiday' | 'exam' | 'admin' | 'event';
    description?: string;
}

const TYPE_CONFIG = {
    holiday: { icon: <Gift size={16} />, color: 'bg-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-600 dark:text-rose-400' },
    exam: { icon: <Backpack size={16} />, color: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400' },
    admin: { icon: <GraduationCap size={16} />, color: 'bg-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/20', text: 'text-indigo-600 dark:text-indigo-400' },
    event: { icon: <Star size={16} />, color: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400' }
};

const AcademicYearView: React.FC = () => {
    const pdfUrl = useMemo(() => ACADEMIC_CALENDAR_PDF, []);
    const [zoomLevel, setZoomLevel] = React.useState(1);

    const handleZoom = (type: 'in' | 'out' | 'reset') => {
        if (type === 'in') setZoomLevel(prev => Math.min(prev + 0.2, 3));
        if (type === 'out') setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
        if (type === 'reset') setZoomLevel(1);
    };

    const handleShare = async () => {
        const shareMessage = `📅 Check out the DIU Academic Calendar 2026!\n\nI'm using the DIU Class Tracker app to stay updated. Access class schedules, notices, and the full academic year in one place.\n\n🔗 View Calendar: ${window.origin}/dashboard/academic_year\n\n#DIUClassTracker #AcademicSuccess`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'DIU Academic Calendar 2026',
                    text: shareMessage,
                    url: `${window.origin}/dashboard/academic_year`
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            // Fallback: Copy to clipboard
            try {
                await navigator.clipboard.writeText(shareMessage);
                alert('Share message copied to clipboard!');
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        }
    };

    const handleDownload = async () => {
        const fileName = 'DIU-Academic-Calendar-2026.pdf';
        
        if (Capacitor.isNativePlatform()) {
            try {
                // Fetch the file from the remote URL
                const response = await fetch(pdfUrl);
                const blob = await response.blob();
                
                // Convert blob to base64
                const reader = new FileReader();
                const base64Data = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });

                // Write to filesystem
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Documents,
                    recursive: true
                });

                // Share/Open
                await Share.share({
                    title: 'DIU Academic Calendar 2026',
                    url: result.uri
                });
            } catch (error) {
                console.error('Error downloading PDF on native:', error);
                window.open(pdfUrl, '_blank');
            }
        } else {
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = fileName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const isMobile = useMemo(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent), []);
    const mobilePdfUrl = useMemo(() => `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`, [pdfUrl]);

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col gap-6">
            {/* Minimal Control Header */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Academic Calendar</h1>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Official 2026 Schedule</p>
                    </div>
                </div>

                <div className="tour-ay-controls flex flex-wrap items-center gap-3">
                    {/* Zoom Controls (Hide on mobile as they don't work well with Google Viewer) */}
                    {!isMobile && (
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 px-3 gap-2">
                            <button onClick={() => handleZoom('out')} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all" title="Zoom Out"><ZoomOut size={14} /></button>
                            <span className="text-[10px] font-black w-10 text-center uppercase tracking-tighter text-slate-600 dark:text-slate-400">{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={() => handleZoom('in')} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all" title="Zoom In"><ZoomIn size={14} /></button>
                            <button onClick={() => handleZoom('reset')} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg border-l border-slate-200 dark:border-slate-700 ml-1 pl-3" title="Reset"><RefreshCw size={12} /></button>
                        </div>
                    )}

                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block" />

                    <button
                        onClick={handleShare}
                        className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Share2 size={14} /> Share
                    </button>
                    <button
                        onClick={handleDownload}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                        <Download size={14} /> Download
                    </button>
                </div>
            </div>

            {/* Full Space PDF Canvas */}
            <div className="tour-ay-canvas flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl relative">
                <motion.div
                    animate={{ scale: isMobile ? 1 : zoomLevel }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full h-full origin-top"
                >
                    {isMobile ? (
                        <div className="w-full h-full flex flex-col">
                            <iframe
                                src={mobilePdfUrl}
                                className="w-full flex-1 border-0"
                                title="Academic Calendar"
                            />
                            {/* Fallback button for mobile if iframe is blocked */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex justify-center">
                                <a
                                    href={pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
                                >
                                    <ExternalLink size={14} /> Open PDF in New Tab
                                </a>
                            </div>
                        </div>
                    ) : (
                        <iframe
                            src={`${pdfUrl}#toolbar=0`}
                            className="w-full h-full border-0"
                            title="Academic Calendar"
                        />
                    )}
                </motion.div>

                {/* Mobile Hint */}
                {!isMobile && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:hidden pointer-events-none">
                        <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-[8px] font-black text-white uppercase tracking-widest border border-white/10 opacity-60">
                            Use Zoom Controls to Resize
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AcademicYearView;
