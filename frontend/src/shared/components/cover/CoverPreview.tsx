import React, { useEffect, useRef, useState } from 'react';
import type { CoverData } from '@/shared/services/coverPage/coverTypes';
import CoverDocument, { COVER_DOC_HEIGHT, COVER_DOC_WIDTH } from './CoverDocument';

interface CoverPreviewProps {
  data: CoverData;
}

const CoverPreview: React.FC<CoverPreviewProps> = ({ data }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / COVER_DOC_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="w-full rounded-lg shadow-lg ring-1 ring-slate-300 overflow-hidden bg-white"
      style={{ height: COVER_DOC_HEIGHT * scale, position: 'relative' }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: COVER_DOC_WIDTH, height: COVER_DOC_HEIGHT, position: 'absolute', left: 0, top: 0 }}>
        <CoverDocument data={data} />
      </div>
    </div>
  );
};

export default CoverPreview;
