import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, FileText, Loader2, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { resolveAttachmentPreview } from '@/shared/utils/attachmentPreview';
import { ensurePdfJsWorker, getPdfJsDocumentInit } from '@/shared/services/pdfTools/pdfjsSetup';

type QbankPdfViewerModalProps = {
  open: boolean;
  pdfUrl: string;
  title?: string;
  onClose: () => void;
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
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

const QbankPdfViewerModal: React.FC<QbankPdfViewerModalProps> = ({
  open,
  pdfUrl,
  title = 'Question PDF',
  onClose,
}) => {
  const preview = pdfUrl ? resolveAttachmentPreview({ url: pdfUrl, type: 'pdf' }) : null;
  const [scale, setScale] = useState(0.9);
  const [totalPages, setTotalPages] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const scaleRef = useRef(scale);

  scaleRef.current = scale;

  const zoomIn = useCallback(() => {
    setScale((current) => clampZoom(current + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((current) => clampZoom(current - ZOOM_STEP));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(0.9);
    scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!open) {
      setScale(0.9);
      setTotalPages(0);
      pinchRef.current = null;
    }
  }, [open, pdfUrl]);

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

  useEffect(() => {
    const node = scrollRef.current;
    if (!open || !node) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = {
          distance: touchDistance(e.touches),
          scale: scaleRef.current,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchRef.current) return;
      e.preventDefault();
      const distance = touchDistance(e.touches);
      if (!distance || !pinchRef.current.distance) return;
      const next = pinchRef.current.scale * (distance / pinchRef.current.distance);
      setScale(clampZoom(next));
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchRef.current = null;
      }
    };

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd, { passive: true });
    node.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  const zoomPercent = Math.round(scale * 100);

  return createPortal(
    <AnimatePresence>
      {open && pdfUrl && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-[250] flex flex-col bg-slate-950"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <header className="relative z-10 flex shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-900/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:gap-3 sm:px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-300">
              <FileText size={18} strokeWidth={2.25} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{title}</p>
              <p className="text-[11px] text-slate-400">
                {zoomPercent}% · {totalPages ? `${totalPages} pages` : 'PDF Engine'} · Pinch to zoom
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-700/80 bg-slate-800/80 p-0.5">
              <button
                type="button"
                onClick={zoomOut}
                disabled={scale <= MIN_ZOOM}
                aria-label="Zoom out"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-300 transition-colors duration-200 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ZoomOut size={16} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                aria-label="Reset zoom"
                className="hidden h-8 min-w-[2.5rem] cursor-pointer items-center justify-center rounded-md px-1 text-[10px] font-semibold tabular-nums text-slate-400 transition-colors duration-200 hover:bg-slate-700 hover:text-white sm:flex"
              >
                {zoomPercent}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={scale >= MAX_ZOOM}
                aria-label="Zoom in"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-300 transition-colors duration-200 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ZoomIn size={16} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                aria-label="Reset zoom"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-300 transition-colors duration-200 hover:bg-slate-700 hover:text-white sm:hidden"
              >
                <RotateCcw size={15} strokeWidth={2.25} />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close PDF preview"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors duration-200 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <X size={18} strokeWidth={2.25} />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="relative min-h-0 flex-1 overflow-auto overscroll-contain bg-[#0b0f1a] touch-pan-x touch-pan-y custom-scrollbar"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {pdfUrl ? (
              <PdfPagesViewer
                pdfUrl={pdfUrl}
                scale={scale}
                onPageCount={setTotalPages}
              />
            ) : (
              <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm text-slate-300">No PDF URL provided.</p>
              </div>
            )}
          </div>

          {preview?.openUrl ? (
            <div className="shrink-0 border-t border-slate-800 bg-slate-900/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-top))]">
              <a
                href={preview.openUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 py-2.5 text-xs font-medium text-slate-200 transition-colors duration-200 hover:bg-slate-800"
              >
                Open original link
                <ExternalLink size={14} />
              </a>
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

interface PdfPagesViewerProps {
  pdfUrl: string;
  scale: number;
  onPageCount?: (count: number) => void;
}

const PdfPagesViewer: React.FC<PdfPagesViewerProps> = ({ pdfUrl, scale, onPageCount }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [progress, setProgress] = useState(0);
  const pdfRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setNumPages(0);
    setProgress(0);

    const loadPdf = async () => {
      try {
        const pdfjs = ensurePdfJsWorker();
        const docInit = getPdfJsDocumentInit();

        let resolvedUrl = pdfUrl;
        if (pdfUrl.includes('diuqbank.com')) {
          const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
          resolvedUrl = `${apiBase}/qbank/proxy-pdf?url=${encodeURIComponent(pdfUrl)}`;
        }

        const loadingTask = pdfjs.getDocument({
          url: resolvedUrl,
          ...docInit,
        });

        loadingTask.onProgress = (progressData: { loaded: number; total: number }) => {
          if (progressData.total > 0 && active) {
            setProgress(Math.round((progressData.loaded / progressData.total) * 100));
          }
        };

        const pdf = await loadingTask.promise;
        if (!active) return;

        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        onPageCount?.(pdf.numPages);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        console.error('Error loading PDF:', err);
        setError(err instanceof Error ? err.message : 'Could not load PDF document');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      active = false;
      if (pdfRef.current) {
        pdfRef.current.destroy();
        pdfRef.current = null;
      }
    };
  }, [pdfUrl]);

  return (
    <div className="flex flex-col items-center gap-4 py-6 px-4">
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
          <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Loading document {progress > 0 ? `(${progress}%)` : ''}…
          </p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2 text-red-400 p-6 text-center">
          <p className="text-sm font-bold">{error}</p>
          <p className="text-xs text-slate-500">Failed to render PDF using PDF.js engine.</p>
        </div>
      )}

      {!loading && !error && numPages > 0 && (
        Array.from({ length: numPages }).map((_, index) => (
          <PdfPageItem
            key={index}
            pdf={pdfRef.current}
            pageNumber={index + 1}
            scale={scale}
          />
        ))
      )}
    </div>
  );
};

interface PdfPageItemProps {
  pdf: any;
  pageNumber: number;
  scale: number;
}

const PdfPageItem: React.FC<PdfPageItemProps> = ({ pdf, pageNumber, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(true);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let active = true;

    const renderPage = async () => {
      if (!canvasRef.current || !pdf) return;
      setRendering(true);

      // Cancel previous render task if active
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      try {
        const page = await pdf.getPage(pageNumber);
        if (!active) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * dpr });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!active) return;
        setRendering(false);
      } catch (err: any) {
        if (err.name === 'HeadingStatusPending' || err.name === 'RenderingCancelledException') {
          return;
        }
        console.error('Error rendering page:', err);
        setRendering(false);
      }
    };

    renderPage();

    return () => {
      active = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdf, pageNumber, scale]);

  return (
    <div className="relative rounded-lg shadow-2xl border border-slate-800 bg-[#0b0f1a] overflow-hidden max-w-full">
      <canvas ref={canvasRef} className="block max-w-full" />
      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px]">
          <Loader2 className="animate-spin text-indigo-500" size={24} />
        </div>
      )}
      <div className="absolute bottom-2.5 right-3.5 px-2 py-1 bg-slate-900/90 text-slate-400 text-[10px] font-bold rounded border border-slate-800 pointer-events-none select-none">
        Page {pageNumber}
      </div>
    </div>
  );
};

export default QbankPdfViewerModal;
