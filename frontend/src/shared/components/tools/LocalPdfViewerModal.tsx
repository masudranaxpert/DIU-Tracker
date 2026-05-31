import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

type LocalPdfViewerModalProps = {
  open: boolean;
  pdfUrl: string;
  title?: string;
  onClose: () => void;
};

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function touchDistance(touches: TouchList | React.TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

const LocalPdfViewerModal: React.FC<LocalPdfViewerModalProps> = ({
  open,
  pdfUrl,
  title = 'PDF',
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  const zoomIn = useCallback(() => setScale((c) => clampZoom(c + ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setScale((c) => clampZoom(c - ZOOM_STEP)), []);
  const resetZoom = useCallback(() => {
    setScale(1);
    scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!open) {
      setScale(1);
      pinchRef.current = null;
    }
  }, [open, pdfUrl]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!open || !node) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = { distance: touchDistance(e.touches), scale };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const dist = touchDistance(e.touches);
        if (pinchRef.current.distance > 0) {
          const ratio = dist / pinchRef.current.distance;
          setScale(clampZoom(pinchRef.current.scale * ratio));
        }
      }
    };
    const onTouchEnd = () => {
      pinchRef.current = null;
    };

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd);
    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
    };
  }, [open, scale]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && pdfUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] flex flex-col bg-slate-100 dark:bg-slate-950"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 safe-area-top">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <p className="flex-1 text-sm font-medium text-slate-900 dark:text-white truncate text-center">{title}</p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={zoomOut} className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Zoom out">
                <ZoomOut size={16} />
              </button>
              <button type="button" onClick={resetZoom} className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Reset zoom">
                <RotateCcw size={15} />
              </button>
              <button type="button" onClick={zoomIn} className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Zoom in">
                <ZoomIn size={16} />
              </button>
            </div>
          </div>
          <div
            ref={scrollRef}
            className="flex-1 overflow-auto overscroll-contain bg-slate-100 dark:bg-slate-900 custom-scrollbar"
          >
            <div
              className="min-h-full flex justify-center p-2"
              style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
            >
              <iframe
                title={title}
                src={pdfUrl}
                className="w-full max-w-3xl min-h-[80vh] rounded-lg bg-white shadow-2xl border-0"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default LocalPdfViewerModal;
