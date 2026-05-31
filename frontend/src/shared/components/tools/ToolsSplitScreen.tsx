import React, { useCallback, useState } from 'react';
import { FileUp, Plus, Trash2 } from 'lucide-react';
import { gsExtractPages, gsMergePdfs } from '@/shared/services/pdfTools/ghostscriptClient';
import { getPdfPageCount } from '@/shared/services/pdfTools/splitPdf';
import { readFileAsBytes, stripPdfExtension } from '@/shared/services/pdfTools/pdfBytes';
import {
  saveMultiplePdfsToToolsFolder,
  savePdfToToolsFolder,
  type SaveResult,
} from '@/shared/lib/toolsStorage';
import { openPdfWithSystemViewer, openToolsFolder } from '@/shared/lib/toolsFileActions';
import { showToolsAlert } from '@/shared/lib/toolsDialog';
import ToolsShell, { ToolsStatusBadge } from './ToolsShell';
import { ToolsProgressOverlay } from './ToolsProgressOverlay';
import { ToolsSimpleResultPanel } from './ToolsResultPanel';
import { toolsBtnOutline, toolsBtnPrimary, toolsDropzone, toolsIconBox, toolsInput, toolsLabel } from './toolsUi';

interface PageRangeRow {
  id: string;
  start: string;
  end: string;
}

interface ToolsSplitScreenProps {
  engineReady: boolean;
  engineLoading: boolean;
}

function newRange(start = '1', end = '1'): PageRangeRow {
  return { id: `${Date.now()}-${Math.random()}`, start, end };
}

function parseRange(row: PageRangeRow, maxPages: number): { start: number; end: number } | null {
  const start = Number(row.start);
  const end = Number(row.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 1 || end < 1 || start > maxPages || end > maxPages) return null;
  return start <= end ? { start, end } : { start: end, end: start };
}

const ToolsSplitScreen: React.FC<ToolsSplitScreenProps> = ({ engineReady, engineLoading }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [ranges, setRanges] = useState<PageRangeRow[]>([newRange('1', '1')]);
  const [mergeOutput, setMergeOutput] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [results, setResults] = useState<SaveResult[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    setFile(f);
    setResults([]);
    setPageCount(null);
    if (f) {
      try {
        const bytes = await readFileAsBytes(f);
        const count = await getPdfPageCount(bytes);
        setPageCount(count);
        setRanges([newRange('1', String(count))]);
      } catch {
        setPageCount(null);
      }
    }
  };

  const updateRange = (id: string, field: 'start' | 'end', value: string) => {
    setRanges((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value.replace(/\D/g, '') } : r)));
  };

  const runSplit = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setProgressCurrent(0);
    setProgressTotal(0);

    try {
      const input = await readFileAsBytes(file);
      const base = stripPdfExtension(file.name);
      const total = pageCount ?? (await getPdfPageCount(input));

      const parsed = ranges
        .map((row) => parseRange(row, total))
        .filter((r): r is { start: number; end: number } => r != null);

      if (!parsed.length) {
        throw new Error(`Enter valid page numbers between 1 and ${total}`);
      }

      const steps = parsed.length + (mergeOutput && parsed.length > 1 ? 1 : 0);
      setProgressTotal(steps);

      const parts: Uint8Array[] = [];
      for (let i = 0; i < parsed.length; i += 1) {
        const { start, end } = parsed[i];
        setProgressCurrent(i);
        setProgressLabel(`Extracting pages ${start}–${end}…`);

        const part = await gsExtractPages(input, [{ start, end }], (p) => {
          setProgressLabel(p.label ?? `Extracting pages ${start}–${end}…`);
        });
        parts.push(part);
      }

      if (mergeOutput) {
        if (parts.length === 1) {
          const saved = await savePdfToToolsFolder(
            parts[0],
            `${base}_pages_${parsed[0].start}-${parsed[0].end}.pdf`
          );
          setResults([saved]);
          return;
        }

        setProgressCurrent(parsed.length);
        setProgressLabel('Merging split parts…');
        const merged = await gsMergePdfs(parts, (p) => setProgressLabel(p.label ?? 'Merging…'));
        const rangeLabel = parsed.map((r) => `${r.start}-${r.end}`).join('_');
        const saved = await savePdfToToolsFolder(merged, `${base}_split_${rangeLabel}.pdf`);
        setResults([saved]);
        return;
      }

      const saved = await saveMultiplePdfsToToolsFolder(
        parts.map((bytes, i) => ({
          bytes,
          fileName: `${base}_pages_${parsed[i].start}-${parsed[i].end}.pdf`,
        }))
      );
      setResults(saved);
    } catch (e) {
      await showToolsAlert(e instanceof Error ? e.message : 'Split failed');
    } finally {
      setBusy(false);
      setProgressLabel('');
    }
  }, [file, mergeOutput, pageCount, ranges]);

  const firstResult = results[0];

  return (
    <>
      <ToolsShell
        title="Split PDF"
        subtitle="Extract one or more page ranges from your PDF"
        engineBadge={<ToolsStatusBadge ready={engineReady} loading={engineLoading} />}
      >
        {!results.length ? (
          <>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={pickFile} />
            <button type="button" onClick={() => inputRef.current?.click()} className={toolsDropzone}>
              <div className={toolsIconBox}>
                <FileUp size={20} />
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-white">
                {file ? file.name : 'Tap to select PDF'}
              </p>
              {pageCount != null && (
                <p className="text-xs text-slate-500 mt-1 tabular-nums">{pageCount} pages</p>
              )}
            </button>

            {file && (
              <div className="space-y-3">
                <p className={toolsLabel}>Page ranges</p>
                {ranges.map((row, index) => (
                  <div key={row.id} className="flex items-end gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        {index === 0 && (
                          <label className="text-xs font-medium text-slate-500 mb-1 block">From page</label>
                        )}
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.start}
                          onChange={(e) => updateRange(row.id, 'start', e.target.value)}
                          placeholder="1"
                          className={toolsInput}
                        />
                      </div>
                      <div>
                        {index === 0 && (
                          <label className="text-xs font-medium text-slate-500 mb-1 block">To page</label>
                        )}
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.end}
                          onChange={(e) => updateRange(row.id, 'end', e.target.value)}
                          placeholder={pageCount ? String(pageCount) : '10'}
                          className={toolsInput}
                        />
                      </div>
                    </div>
                    {ranges.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRanges((prev) => prev.filter((r) => r.id !== row.id))}
                        className="w-11 h-11 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                        aria-label="Remove range"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setRanges((prev) => [...prev, newRange('1', pageCount ? String(pageCount) : '1')])}
                  className={toolsBtnOutline}
                >
                  <Plus size={16} />
                  Add another range
                </button>

                <label className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mergeOutput}
                    onChange={(e) => setMergeOutput(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Merge into one PDF</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {mergeOutput
                        ? 'All ranges will be combined into a single file'
                        : 'Each range saves as a separate PDF'}
                    </p>
                  </div>
                </label>
              </div>
            )}

            <button
              type="button"
              disabled={!file || busy || engineLoading}
              onClick={runSplit}
              className={toolsBtnPrimary}
            >
              Split & Save
            </button>
          </>
        ) : (
          <ToolsSimpleResultPanel
            title={`${results.length} file${results.length > 1 ? 's' : ''} saved`}
            lines={results.map((r) => r.displayPath)}
            onOpenPdf={
              results.length === 1 && firstResult?.webViewUrl
                ? async () => {
                    try {
                      await openPdfWithSystemViewer(firstResult.fileName);
                    } catch (e) {
                      await showToolsAlert(e instanceof Error ? e.message : 'Could not open PDF');
                    }
                  }
                : undefined
            }
            onOpenFolder={async () => {
              try {
                await openToolsFolder();
              } catch (e) {
                await showToolsAlert(e instanceof Error ? e.message : 'Could not open folder');
              }
            }}
            onDone={() => {
              setResults([]);
              setFile(null);
              setPageCount(null);
              setRanges([newRange('1', '1')]);
              setMergeOutput(false);
            }}
            openLabel="Open PDF"
          />
        )}
      </ToolsShell>

      <ToolsProgressOverlay open={busy} label={progressLabel || 'Working…'} current={progressCurrent} total={progressTotal} />
    </>
  );
};

export default ToolsSplitScreen;
