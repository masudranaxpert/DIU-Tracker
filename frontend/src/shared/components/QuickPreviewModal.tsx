import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AcademicRecord, EntryType } from '@/shared/types/types';
import {
    X,
    Clock,
    FileText,
    Link as LinkIcon,
    ExternalLink,
    Calendar,
    Layers,
    Activity,
    UserCircle,
    Eye,
    Maximize2,
    Minimize2,
    ZoomIn,
    ZoomOut,
    RefreshCw,
    FileCode
} from 'lucide-react';
import { ENTRY_TYPE_COLORS } from '@/shared/utils/constants';
import { format, parseISO } from 'date-fns';
import { resolveMediaUrl } from '@/shared/utils/mediaUrl';
import { resolveAttachmentPreview } from '@/shared/utils/attachmentPreview';
import { recordService } from '@/shared/services/recordService';

interface Props {
    record: AcademicRecord | null;
    courseName?: string;
    isOpen: boolean;
    onClose: () => void;
    onNavigateToRecord?: (record: AcademicRecord) => void;
    onNavigateToDate?: (date: string) => void;
}

const QuickPreviewModal: React.FC<Props> = ({ record, courseName, isOpen, onClose, onNavigateToRecord, onNavigateToDate }) => {
    const [activeAttachment, setActiveAttachment] = React.useState<any | null>(null);
    const [isExpandedMode, setIsExpandedMode] = React.useState(false);
    const [zoomLevel, setZoomLevel] = React.useState(1);
    const [showExternalLinkBar, setShowExternalLinkBar] = React.useState(false);
    const [isContributorModalOpen, setIsContributorModalOpen] = React.useState(false);
    const previewContainerRef = React.useRef<HTMLDivElement>(null);
    // Reset active attachment when record changes or modal closes
    React.useEffect(() => {
        if (!isOpen) {
            setActiveAttachment(null);
            setIsExpandedMode(false);
            setZoomLevel(1);
            setShowExternalLinkBar(false);
        } else if (record?.id) {
            // Increment views when opened
            recordService.incrementRecordViews(record.id);
        }
    }, [isOpen, record?.id]);

    // Handle Escape key
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isExpandedMode) {
                    setIsExpandedMode(false);
                } else if (isOpen) {
                    onClose();
                }
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isExpandedMode, isOpen, onClose]);

    // Handle Native Fullscreen State Sync
    React.useEffect(() => {
        const handleFullscreenChange = () => {
            setIsExpandedMode(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!previewContainerRef.current) return;

        if (!document.fullscreenElement) {
            previewContainerRef.current.requestFullscreen().catch(err => {
                console.error(`Error enabling fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const handleZoom = (type: 'in' | 'out' | 'reset') => {
        if (type === 'in') setZoomLevel(prev => Math.min(prev + 0.25, 3));
        if (type === 'out') setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
        if (type === 'reset') setZoomLevel(1);
    };

    if (!record) return null;

    const attachmentPreview = activeAttachment
        ? resolveAttachmentPreview(activeAttachment)
        : null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-0 md:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md pointer-events-auto"
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className={`bg-white dark:bg-slate-800 w-full ${activeAttachment ? 'max-w-7xl h-full md:h-[95vh]' : 'max-w-xl max-h-[100dvh] md:max-h-[85vh]'} rounded-none md:rounded-[2.5rem] shadow-2xl relative z-[500] overflow-hidden border-0 md:border border-slate-200 dark:border-slate-800/60 transition-all duration-500 flex flex-col`}
                    >
                {/* Split View Container */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

                    {/* Left Panel: Record Details (Scrollable) */}
                    <div className={`flex flex-col ${activeAttachment ? (isExpandedMode ? 'hidden' : 'w-full md:w-1/3 border-r border-slate-100 dark:border-slate-800/60 h-[35vh] md:h-full shrink-0') : 'w-full flex-1 min-h-0'} bg-white dark:bg-slate-800 overflow-y-auto custom-scrollbar duration-300`}>
                        {/* Header */}
                        <div className="p-8 pb-4 shrink-0">
                            <div className="flex justify-between items-start mb-6">
                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${ENTRY_TYPE_COLORS[record.type as EntryType] || 'bg-slate-100 text-slate-500'}`}>
                                    {record.type}
                                </span>
                                <button
                                    onClick={onClose}
                                    className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-rose-500 transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tighter">
                                {record.title}
                            </h2>

                            {courseName && (
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/60">
                                        {courseName}
                                    </span>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-4 mt-6">
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <Calendar size={14} className="text-indigo-600" />
                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">
                                        {format(parseISO(record.date), 'EEEE, MMM dd')}
                                    </span>
                                </div>
                                {record.time && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <Clock size={14} className="text-emerald-500" />
                                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">{record.time}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8 pt-4 space-y-8 flex-grow">
                            {/* File List */}
                            {record.attachments && record.attachments.length > 0 && (
                                <div className="mb-6">
                                    <div className="space-y-2">
                                        {record.attachments.map((file, idx) => (
                                            <button
                                                key={file.id || idx}
                                                onClick={() => setActiveAttachment(file)}
                                                className="w-full flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
                                            >
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                    file.type === 'pdf' ? 'bg-red-100 text-red-600' :
                                                    file.type === 'image' ? 'bg-blue-100 text-blue-600' :
                                                    file.type === 'video' ? 'bg-purple-100 text-purple-600' :
                                                    file.type === 'link' ? 'bg-green-100 text-green-600' :
                                                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                }`}>
                                                    <FileText size={18} />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase">{file.type}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(record.topics || record.description) && (
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Activity size={12} className="text-indigo-600" />
                                        {record.topics ? 'Topics Covered' : 'Description'}
                                    </h3>
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed uppercase tracking-tight whitespace-pre-line">
                                            {record.topics || record.description}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {record.topics && record.description && (
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <FileText size={12} className="text-slate-500" /> Additional Notes
                                    </h3>
                                    <div className="p-6 bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl border border-slate-100 dark:border-slate-800 border-dashed">
                                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                                            {record.description}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {record.sub_section && (
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Layers size={12} className="text-emerald-500" /> Lab Group
                                    </h3>
                                    <p className="text-sm font-bold text-emerald-500 uppercase tracking-tight">Group {record.sub_section}</p>
                                </div>
                            )}

                            {/* Uploader info & Analytics Row */}
                            <div className="flex items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                        {record.uploader?.avatar_url ? (
                                            <img src={resolveMediaUrl(record.uploader.avatar_url)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserCircle size={22} className="text-slate-400/50" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Uploader Info</p>
                                        <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate mb-0.5">{record.uploader?.full_name || 'Official Admin'}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                            {record.created_at ? format(parseISO(record.created_at), 'MMM dd, yyyy · hh:mm a') : 'Legacy Record'}
                                        </p>
                                    </div>
                                </div>

                                <div className="shrink-0 flex flex-col items-end">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Total Views</p>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl border border-indigo-100 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 font-black">
                                        <Eye size={12} />
                                        <span className="text-[11px] tracking-tighter">{record.views || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Legacy Resource Link Support */}
                            {(record.link || record.link_two) && (
                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Materials & Links</h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        {record.link && (
                                            <a href={record.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <LinkIcon size={16} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 group-hover:text-white">Lectures Link</span>
                                                </div>
                                                <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        )}
                                        {record.link_two && (
                                            <a href={record.link_two} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <FileText size={16} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 group-hover:text-white">Materials Link</span>
                                                </div>
                                                <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Preview Area */}
                    {activeAttachment && (
                        <div
                            ref={previewContainerRef}
                            className="flex-1 bg-slate-900 flex flex-col h-full relative overflow-hidden group"
                        >
                            {/* Reader Mode Header Controls - Show on Hover (Desktop Only) */}
                            <div className="absolute top-4 right-4 z-20 hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <button
                                    onClick={toggleFullscreen}
                                    className={`p-2.5 ${isExpandedMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-black/50 text-slate-200'} hover:bg-indigo-500 rounded-xl transition-all`}
                                    title={isExpandedMode ? "Exit Fullscreen" : "Fullscreen Mode"}
                                >
                                    {isExpandedMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>

                                <button onClick={() => setActiveAttachment(null)} className="p-2.5 bg-black/50 hover:bg-rose-500/70 text-white rounded-xl transition-all" title="Close Preview">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Zoom Controls at Bottom - Show on Hover (Desktop Only) */}
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 hidden md:block opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
                                <div className="flex items-center bg-black/60 rounded-[1.25rem] border border-white/10 p-1.5 px-4 gap-3 shadow-2xl scale-90 group-hover:scale-100 transition-all duration-300">
                                    <button onClick={() => handleZoom('out')} className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-all" title="Zoom Out"><ZoomOut size={16} /></button>
                                    <span className="text-[11px] font-black text-white w-12 text-center uppercase tracking-tighter">{Math.round(zoomLevel * 100)}%</span>
                                    <button onClick={() => handleZoom('in')} className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-all" title="Zoom In"><ZoomIn size={16} /></button>
                                    <div className="w-px h-4 bg-white/10 ml-1" />
                                    <button onClick={() => handleZoom('reset')} className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-all" title="Reset View"><RefreshCw size={14} /></button>
                                </div>
                            </div>

                            {/* Minimalist Mobile Top Bar */}
                            <div className="absolute top-0 left-0 right-0 z-[999] h-12 bg-black border-b border-white/5 flex items-center justify-between px-4 md:hidden">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Preview Mode</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleFullscreen();
                                        }}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90 ${isExpandedMode ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-400'}`}
                                        aria-label={isExpandedMode ? "Minimize" : "Expand"}
                                    >
                                        {isExpandedMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                    </button>

                                    <div className="w-px h-4 bg-white/10 mx-1" />

                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onClose();
                                        }}
                                        className="w-8 h-8 flex items-center justify-center bg-rose-500/80 text-white rounded-lg active:scale-90 active:bg-rose-600 transition-all"
                                        aria-label="Close"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Preview Content */}
                            <div className="flex-1 flex items-center justify-center p-0 pt-12 md:p-4 overflow-hidden relative bg-[#0b0f1a]">
                                <motion.div
                                    animate={{ scale: zoomLevel }}
                                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                    className="w-full h-full flex items-center justify-center origin-center"
                                    style={{
                                        backfaceVisibility: 'hidden',
                                        WebkitFontSmoothing: 'antialiased',
                                        transformStyle: 'preserve-3d'
                                    }}
                                >
                                    {attachmentPreview?.mode === 'image' && (
                                        <img src={attachmentPreview.src} alt={activeAttachment.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" style={{ imageRendering: 'high' }} />
                                    )}
                                    {attachmentPreview?.mode === 'video' && (
                                        <video src={attachmentPreview.src} controls className="max-w-full max-h-full rounded-lg shadow-2xl" />
                                    )}
                                    {attachmentPreview?.mode === 'iframe' && (
                                        <div className="w-full h-full relative group bg-slate-900/50 flex flex-col">
                                            <iframe
                                                src={attachmentPreview.src}
                                                className="flex-1 w-full rounded-lg bg-white"
                                                title={activeAttachment.name || 'Document Preview'}
                                                allow="autoplay"
                                            />
                                            <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none z-30">
                                                <div className={`pointer-events-auto bg-slate-900 border border-slate-700 p-2 pl-4 pr-2 rounded-2xl flex items-center gap-4 shadow-2xl transition-all duration-300 transform ${showExternalLinkBar ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100'}`}>
                                                    <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wider hidden sm:block">
                                                        {attachmentPreview.isDrive ? 'Open in Google Drive' : 'Content blocked?'}
                                                    </span>
                                                    <a href={attachmentPreview.openUrl} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95">
                                                        Open in Drive <ExternalLink size={12} />
                                                    </a>
                                                    <button
                                                        onClick={() => setShowExternalLinkBar(false)}
                                                        className="md:hidden p-2 text-slate-400 hover:text-white"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowExternalLinkBar(!showExternalLinkBar)}
                                                className="md:hidden absolute bottom-4 right-4 z-40 p-3 bg-indigo-600 text-white rounded-full shadow-lg border border-indigo-400/30"
                                            >
                                                <LinkIcon size={18} />
                                            </button>
                                        </div>
                                    )}
                                    {attachmentPreview?.mode === 'none' && (
                                        <div className="text-center text-white p-8">
                                            <div className="w-24 h-24 bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-slate-500 mx-auto mb-6 shadow-2xl border border-slate-700">
                                                <FileCode size={40} />
                                            </div>
                                            <h3 className="text-xl font-black mb-2 uppercase tracking-tight">Direct Preview Unavailable</h3>
                                            <p className="text-slate-400 mb-8 max-w-xs mx-auto text-xs font-bold uppercase tracking-wide">This file type cannot be rendered in the app. Open it externally instead.</p>
                                            <a href={attachmentPreview.openUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95">
                                                Download / Open <ExternalLink size={16} />
                                            </a>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    )}
                </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default QuickPreviewModal;
