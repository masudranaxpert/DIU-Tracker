import { useCallback, useEffect, useMemo, useState } from 'react';

export function useClientPagination<T>(items: T[], pageSize = 12) {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const resetPage = useCallback(() => setPage(1), []);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return {
    page,
    pageSize,
    total,
    totalPages,
    pageItems,
    rangeStart,
    rangeEnd,
    setPage,
    resetPage,
    goToPage: setPage,
  };
}
