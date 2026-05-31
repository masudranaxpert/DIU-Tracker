import React, { useCallback, useState } from 'react';
import { FileStack } from 'lucide-react';
import { gsMergePdfs } from '@/shared/services/pdfTools/ghostscriptClient';
import { readFileAsBytes, timestampSuffix } from '@/shared/services/pdfTools/pdfBytes';
import { savePdfToToolsFolder, type SaveResult } from '@/shared/lib/toolsStorage';
import { openPdfWithSystemViewer, openToolsFolder } from '@/shared/lib/toolsFileActions';
import { showToolsAlert } from '@/shared/lib/toolsDialog';
import ToolsShell, { ToolsStatusBadge } from './ToolsShell';
import { ToolsProgressOverlay } from './ToolsProgressOverlay';
import { ToolsSimpleResultPanel } from './ToolsResultPanel';
import MergeFileList, { type MergeListEntry } from './MergeFileList';
import { toolsBtnOutline, toolsBtnPrimary } from './toolsUi';

interface MergeEntry {
  id: string;
  file: File;
  bytes: Uint8Array;
}

interface ToolsMergeScreenProps {
  engineReady: boolean;
  engineLoading: boolean;
}

const ToolsMergeScreen: React.FC<ToolsMergeScreenProps> = ({ engineReady, engineLoading }) => {
  const [entries, setEntries] = useState<MergeEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [progressLabel, setProgressLabel] = useState('Merging…');
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    const next: MergeEntry[] = [];
    for (const f of files) {
      next.push({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        bytes: await readFileAsBytes(f),
      });
    }
    setEntries((prev) => [...prev, ...next]);
    setSaveResult(null);
  };

  const handleReorder = useCallback((ordered: MergeListEntry[]) => {
    setEntries((prev) => {
      const byId = new Map(prev.map((entry) => [entry.id, entry]));
      return ordered
        .map((item) => byId.get(item.id))
        .filter((entry): entry is MergeEntry => !!entry);
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const runMerge = useCallback(async () => {
    if (entries.length < 2) return;
    setBusy(true);
    try {
      const output = await gsMergePdfs(
        entries.map((e) => e.bytes),
        (p) => setProgressLabel(p.label ?? 'Merging…')
      );
      const saved = await savePdfToToolsFolder(output, `merged_${timestampSuffix()}.pdf`);
      setSaveResult(saved);
    } catch (e) {
      await showToolsAlert(e instanceof Error ? e.message : 'Merge failed');
    } finally {
      setBusy(false);
    }
  }, [entries]);

  const listEntries: MergeListEntry[] = entries.map(({ id, file }) => ({ id, file }));

  return (
    <>
      <ToolsShell
        title="Merge PDFs"
        subtitle="Combine multiple PDFs in the order you choose"
        engineBadge={<ToolsStatusBadge ready={engineReady} loading={engineLoading} />}
      >
        {!saveResult ? (
          <>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={addFiles} />
            <button type="button" onClick={() => inputRef.current?.click()} className={toolsBtnOutline}>
              <FileStack size={18} />
              Add PDF files
            </button>

            <MergeFileList entries={listEntries} onReorder={handleReorder} onRemove={handleRemove} />

            <button
              type="button"
              disabled={entries.length < 2 || busy || engineLoading}
              onClick={runMerge}
              className={toolsBtnPrimary}
            >
              Merge & Save
            </button>
          </>
        ) : (
          <ToolsSimpleResultPanel
            title="Merged"
            lines={[saveResult.displayPath]}
            onOpenPdf={async () => {
              try {
                await openPdfWithSystemViewer(saveResult.fileName);
              } catch (e) {
                await showToolsAlert(e instanceof Error ? e.message : 'Could not open PDF');
              }
            }}
            onOpenFolder={async () => {
              try {
                await openToolsFolder();
              } catch (e) {
                await showToolsAlert(e instanceof Error ? e.message : 'Could not open folder');
              }
            }}
            onDone={() => { setSaveResult(null); setEntries([]); }}
          />
        )}
      </ToolsShell>

      <ToolsProgressOverlay open={busy} label={progressLabel} current={1} total={1} />
    </>
  );
};

export default ToolsMergeScreen;
