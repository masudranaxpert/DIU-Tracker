import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
}

const DirectoryPagination: React.FC<Props> = ({
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  onPageChange,
}) => {
  if (total === 0) return null;

  const pages: number[] = [];
  const window = 2;
  for (let p = Math.max(1, page - window); p <= Math.min(totalPages, page + window); p++) {
    pages.push(p);
  }

  return (
    <nav
      className="sticky bottom-0 z-10 mt-6 -mx-1 px-1 py-3 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800"
      aria-label="Pagination"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center sm:text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider tabular-nums">
          {rangeStart}–{rangeEnd} of {total}
        </p>
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {pages[0] > 1 && (
            <>
              <PageBtn n={1} active={page === 1} onClick={() => onPageChange(1)} />
              {pages[0] > 2 && <span className="px-1 text-slate-400 font-bold">…</span>}
            </>
          )}
          {pages.map((p) => (
            <PageBtn key={p} n={p} active={page === p} onClick={() => onPageChange(p)} />
          ))}
          {pages[pages.length - 1] < totalPages && (
            <>
              {pages[pages.length - 1] < totalPages - 1 && (
                <span className="px-1 text-slate-400 font-bold">…</span>
              )}
              <PageBtn n={totalPages} active={page === totalPages} onClick={() => onPageChange(totalPages)} />
            </>
          )}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] min-w-[44px] rounded-xl text-sm font-black tabular-nums transition-all cursor-pointer ${
        active
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
          : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      {n}
    </button>
  );
}

export default DirectoryPagination;
