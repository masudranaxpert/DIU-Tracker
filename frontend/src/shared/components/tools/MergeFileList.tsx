import React, { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { toolsCard } from './toolsUi';

export interface MergeListEntry {
  id: string;
  file: File;
}

interface MergeFileListProps {
  entries: MergeListEntry[];
  onReorder: (next: MergeListEntry[]) => void;
  onRemove: (id: string) => void;
}

function reorderList<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

const LONG_PRESS_MS = 320;

const MergeFileList: React.FC<MergeFileListProps> = ({ entries, onReorder, onRemove }) => {
  const listRef = useRef<HTMLUListElement>(null);
  const dragIndex = useRef<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const clearLongPress = () => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const resolveDropIndex = useCallback((clientY: number): number => {
    const list = listRef.current;
    if (!list) return 0;
    const rows = list.querySelectorAll<HTMLElement>('[data-merge-row]');
    if (!rows.length) return 0;

    for (let i = 0; i < rows.length; i += 1) {
      const rect = rows[i].getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (clientY < midpoint) return i;
    }
    return rows.length - 1;
  }, []);

  const applyReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      onReorder(reorderList(entries, fromIndex, toIndex));
      dragIndex.current = toIndex;
    },
    [entries, onReorder]
  );

  const endDrag = () => {
    clearLongPress();
    dragIndex.current = null;
    setDraggingId(null);
    setOverIndex(null);
  };

  const handleRowPointerDown = (e: React.PointerEvent, index: number, id: string) => {
    if ((e.target as HTMLElement).closest('[data-merge-remove]')) return;

    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      dragIndex.current = index;
      setDraggingId(id);
      setOverIndex(index);
      e.currentTarget.setPointerCapture(e.pointerId);
    }, LONG_PRESS_MS);
  };

  const handleRowPointerMove = (e: React.PointerEvent) => {
    if (dragIndex.current === null) return;
    const targetIndex = resolveDropIndex(e.clientY);
    setOverIndex(targetIndex);
    if (targetIndex !== dragIndex.current) {
      applyReorder(dragIndex.current, targetIndex);
    }
  };

  const handleRowPointerUp = (e: React.PointerEvent) => {
    clearLongPress();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endDrag();
  };

  if (!entries.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 px-0.5">
        Press and hold a file, then drag up or down
      </p>
      <ul ref={listRef} className="space-y-2">
        {entries.map((entry, index) => {
          const isDragging = draggingId === entry.id;
          const isOver = overIndex === index && draggingId !== null && !isDragging;

          return (
            <li
              key={entry.id}
              data-merge-row
              onPointerDown={(e) => handleRowPointerDown(e, index, entry.id)}
              onPointerMove={handleRowPointerMove}
              onPointerUp={handleRowPointerUp}
              onPointerCancel={handleRowPointerUp}
              className={`flex items-center gap-2.5 p-3 select-none touch-none ${toolsCard} transition-all duration-150 ${
                isDragging
                  ? 'opacity-90 shadow-lg ring-2 ring-indigo-500/50 scale-[1.02] z-10'
                  : 'active:bg-slate-50 dark:active:bg-slate-900/60'
              } ${isOver ? 'ring-2 ring-indigo-300/70 dark:ring-indigo-700/70' : ''}`}
            >
              <span className="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center justify-center tabular-nums shrink-0">
                {index + 1}
              </span>
              <span className="flex-1 text-sm font-medium truncate text-slate-800 dark:text-slate-200 min-w-0">
                {entry.file.name}
              </span>
              <button
                type="button"
                data-merge-remove
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(entry.id);
                }}
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer shrink-0"
                aria-label="Remove file"
              >
                <X size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default MergeFileList;
