import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { isNativeApp } from '@/shared/lib/nativeApp';
import { TOOLS_FOLDER_NAME } from '@/shared/lib/toolsStorage';
import { ensureGhostscriptReady } from '@/shared/services/pdfTools/ghostscriptClient';
import ToolsHub from './ToolsHub';
import ToolsCompressScreen from './ToolsCompressScreen';
import ToolsMergeScreen from './ToolsMergeScreen';
import ToolsSplitScreen from './ToolsSplitScreen';

type ToolRoute = 'compress' | 'merge' | 'split';

function isToolRoute(value?: string): value is ToolRoute {
  return value === 'compress' || value === 'merge' || value === 'split';
}

const ToolsView: React.FC = () => {
  const { subId } = useParams<{ subId?: string }>();
  const toolRoute = isToolRoute(subId) ? subId : null;

  const [engineReady, setEngineReady] = useState(false);
  const [engineLoading, setEngineLoading] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    setEngineLoading(true);
    ensureGhostscriptReady()
      .then(() => {
        if (!cancelled) {
          setEngineReady(true);
          setEngineLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEngineReady(false);
          setEngineLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isNativeApp()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center mb-4">
          <Smartphone className="text-indigo-600 dark:text-indigo-400" size={28} />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">App-only tools</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          PDF Tools run on-device in the Android app. Output: {TOOLS_FOLDER_NAME}
        </p>
      </div>
    );
  }

  if (toolRoute === 'compress') {
    return <ToolsCompressScreen engineReady={engineReady} engineLoading={engineLoading} />;
  }
  if (toolRoute === 'merge') {
    return <ToolsMergeScreen engineReady={engineReady} engineLoading={engineLoading} />;
  }
  if (toolRoute === 'split') {
    return <ToolsSplitScreen engineReady={engineReady} engineLoading={engineLoading} />;
  }

  return <ToolsHub engineReady={engineReady} engineLoading={engineLoading} />;
};

export default ToolsView;
