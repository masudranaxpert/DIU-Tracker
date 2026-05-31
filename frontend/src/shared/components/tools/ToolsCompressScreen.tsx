import React, { useCallback, useState, useEffect } from 'react';
import { FileUp } from 'lucide-react';
import { gsCompressPdf, forceWorkerCleanup } from '@/shared/services/pdfTools/ghostscriptClient';
import { GHOSTSCRIPT_PRESETS, type GhostscriptQuality } from '@/shared/services/pdfTools/ghostscriptPresets';
import { getPdfPageCount } from '@/shared/services/pdfTools/splitPdf';
import { readFileAsBytes, stripPdfExtension } from '@/shared/services/pdfTools/pdfBytes';
import { savePdfToToolsFolder, type SaveResult } from '@/shared/lib/toolsStorage';
import { openPdfWithSystemViewer, openToolsFolder } from '@/shared/lib/toolsFileActions';
import { showToolsAlert } from '@/shared/lib/toolsDialog';
import ToolsShell, { ToolsStatusBadge } from './ToolsShell';
import { ToolsProgressOverlay } from './ToolsProgressOverlay';
import ToolsResultPanel, { type CompressStats } from './ToolsResultPanel';
import {
  toolsBtnPrimary,
  toolsDropzone,
  toolsIconBox,
  toolsLabel,
  toolsRadioCard,
} from './toolsUi';

interface ToolsCompressScreenProps {
  engineReady: boolean;
  engineLoading: boolean;
}

const ToolsCompressScreen: React.FC<ToolsCompressScreenProps> = ({
  engineReady,
  engineLoading,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<GhostscriptQuality>('ebook');
  const [busy, setBusy] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [result, setResult] = useState<{ stats: CompressStats; save: SaveResult } | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Cleanup worker on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      forceWorkerCleanup();
    };
  }, []);

  const resetJob = () => {
    setFile(null);
    setResult(null);
    // Force cleanup when resetting to free memory
    forceWorkerCleanup();
  };

  const runCompress = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setProgressLabel('Reading PDF…');
    setProgressCurrent(0);
    setProgressTotal(0);

    try {
      const input = await readFileAsBytes(file);
      const originalSize = input.byteLength;

      // Check file size and warn if too large
      const fileSizeMB = originalSize / (1024 * 1024);
      if (fileSizeMB > 100) {
        const proceed = confirm(
          `This PDF is ${fileSizeMB.toFixed(1)} MB. Large files may use significant memory. Continue?`
        );
        if (!proceed) {
          setBusy(false);
          return;
        }
      }

      let pages = 0;
      try {
        pages = await getPdfPageCount(input);
        setProgressTotal(pages);
        setProgressLabel(`Starting compression (${pages} pages)…`);
      } catch {
        setProgressTotal(1);
        setProgressLabel('Starting compression…');
      }

      const output = await gsCompressPdf(
        input,
        quality,
        (p) => {
          setProgressCurrent(p.current);
          setProgressTotal(p.total || pages || 1);
          if (p.label) setProgressLabel(p.label);
        },
        pages
      );

      setProgressCurrent(pages || 1);
      setProgressTotal(pages || 1);
      setProgressLabel('Saving…');

      const base = stripPdfExtension(file.name);
      const saved = await savePdfToToolsFolder(output, `${base}_compressed.pdf`);

      setResult({
        stats: {
          originalBytes: originalSize,
          outputBytes: output.byteLength,
          fileName: saved.fileName,
          displayPath: saved.displayPath,
        },
        save: saved,
      });

      // Force cleanup after successful compression to free memory immediately
      forceWorkerCleanup();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Compression failed';
      await showToolsAlert(msg);
      // Force cleanup on error to prevent memory leaks
      forceWorkerCleanup();
    } finally {
      setBusy(false);
      setProgressLabel('');
      setProgressCurrent(0);
      setProgressTotal(0);
    }
  }, [file, quality]);

  const handleOpenPdf = async () => {
    if (!result) return;
    try {
      await openPdfWithSystemViewer(result.save.fileName);
    } catch (e) {
      await showToolsAlert(e instanceof Error ? e.message : 'Could not open PDF');
    }
  };

  const handleOpenFolder = async () => {
    if (!result) return;
    try {
      await openToolsFolder();
    } catch (e) {
      await showToolsAlert(e instanceof Error ? e.message : 'Could not open folder');
    }
  };

  return (
    <>
      <ToolsShell
        title="Compress PDF"
        subtitle="Shrink file size while keeping text sharp and readable"
        engineBadge={<ToolsStatusBadge ready={engineReady} loading={engineLoading} />}
      >
        {!result ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <button type="button" onClick={() => inputRef.current?.click()} className={toolsDropzone}>
              <div className={toolsIconBox}>
                <FileUp size={20} />
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {file ? file.name : 'Tap to select PDF'}
              </p>
              {file && (
                <p className="text-xs text-slate-500 mt-1 tabular-nums">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              )}
            </button>

            <div className="space-y-2">
              <p className={toolsLabel}>Quality</p>
              {GHOSTSCRIPT_PRESETS.map((preset) => (
                <label key={preset.id} className={toolsRadioCard(quality === preset.id)}>
                  <input
                    type="radio"
                    name="compress-quality"
                    checked={quality === preset.id}
                    onChange={() => setQuality(preset.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{preset.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{preset.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <button
              type="button"
              disabled={!file || busy || engineLoading}
              onClick={runCompress}
              className={toolsBtnPrimary}
            >
              Compress & Save
            </button>
          </>
        ) : (
          <ToolsResultPanel
            stats={result.stats}
            onOpenPdf={handleOpenPdf}
            onOpenFolder={handleOpenFolder}
            onCompressAnother={resetJob}
          />
        )}
      </ToolsShell>

      <ToolsProgressOverlay
        open={busy}
        label={progressLabel}
        current={progressCurrent}
        total={progressTotal}
      />
    </>
  );
};

export default ToolsCompressScreen;
