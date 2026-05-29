import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Notice, Course, Section } from '@/shared/types/types';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Bell, Info, AlertTriangle, Zap, Clock, ChevronDown, BookOpen, Calendar, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { studentService } from '@/shared/services/studentService';

interface Props {
    notices: Notice[];
    courses: Course[];
    onDateSelect?: (date: Date | string) => void;
    onAction?: (type: any) => void;
    batchId: string;
    section: Section;
}

const PRIORITY_COLORS = {
    low: 'bg-slate-100 text-slate-500 border-slate-200',
    normal: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
    high: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    urgent: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
};

const PRIORITY_ICONS = {
    low: <Info size={14} />,
    normal: <Bell size={14} />,
    high: <AlertTriangle size={14} />,
    urgent: <Zap size={14} className="fill-current" />,
};

const NoticeBoard: React.FC<Props> = ({ notices, courses, onDateSelect, onAction, batchId, section }) => {
    const { profile: crProfile } = useAuth();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);

    // PIN Security Check
    React.useEffect(() => {
        const checkSecurity = async () => {
            setIsVerifying(true);
            try {
                setIsLocked(await studentService.isSectionLocked(batchId, section, crProfile));
            } catch (e) {
                console.error('Security check failed:', e);
            } finally {
                setIsVerifying(false);
            }
        };
        checkSecurity();
    }, [batchId, section, crProfile?.id, crProfile?.batch_id, crProfile?.section]);

    const activeNotices = notices.filter(n => {
        if (!n.expires_at) return true;
        const expDate = parseISO(n.expires_at);
        return !isPast(expDate) || isToday(expDate);
    });

    if (activeNotices.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800/60 rounded-[2.5rem] p-6 shadow-pro relative overflow-hidden group">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50 dark:border-slate-800/60">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                        <Bell size={16} />
                    </div>
                    <div>
                        <h3 className="text-[11px] font-bold text-slate-900 dark:text-white tracking-widest uppercase">Notice Board</h3>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Latest updates & announcements</p>
                    </div>
                </div>
                <div className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[9px] font-bold uppercase">{activeNotices.length} ACTIVE</div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {activeNotices.map((notice, index) => {
                    const courseName = notice.course_id ? courses.find(c => c.id === notice.course_id)?.name : null;
                    const isExpanded = expandedId === notice.id;

                    return (
                        <motion.div
                            key={notice.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`rounded-2xl border ${PRIORITY_COLORS[notice.priority]} transition-all cursor-pointer overflow-hidden ${isLocked ? 'hover:scale-[1.01]' : ''}`}
                            onClick={() => {
                                if (isLocked) {
                                    if (onAction) onAction('notices');
                                } else {
                                    setExpandedId(isExpanded ? null : notice.id);
                                }
                            }}
                        >
                            {/* Course Header if applicable */}
                            {courseName && (
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 flex items-center gap-2">
                                    <BookOpen size={12} className="text-indigo-100" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-wide">{courseName}</span>
                                </div>
                            )}

                            {/* Notice Content */}
                            <div className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1">
                                        {PRIORITY_ICONS[notice.priority]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-xs font-black uppercase tracking-tight truncate flex-1">{notice.title}</h4>
                                            <div className="flex items-center gap-2 ml-2">
                                                <span className="text-[8px] font-black uppercase opacity-60 flex items-center gap-1">
                                                    <Clock size={8} /> {format(parseISO(notice.created_at), 'MMM dd')}
                                                </span>
                                                <ChevronDown
                                                    size={14}
                                                    className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                                />
                                                {onDateSelect && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onAction) onAction('notices');
                                                            else if (onDateSelect) onDateSelect(notice.created_at);
                                                        }}
                                                        className="ml-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                                        title="View All Announcements"
                                                    >
                                                        <Calendar size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {isLocked ? (
                                            <div className="mt-2 flex items-center gap-2 py-1 px-3 bg-white/50 dark:bg-slate-900/30 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                                                <ShieldAlert size={12} className="text-amber-500" />
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Locked Content • Tap to unlock</p>
                                            </div>
                                        ) : (
                                            <AnimatePresence>
                                                {isExpanded ? (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <p className="text-[11px] font-medium leading-relaxed mt-2 whitespace-pre-wrap">{notice.content}</p>
                                                    </motion.div>
                                                ) : (
                                                    <p className="text-[10px] font-medium leading-relaxed opacity-80 truncate">{notice.content}</p>
                                                )}
                                            </AnimatePresence>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default NoticeBoard;
