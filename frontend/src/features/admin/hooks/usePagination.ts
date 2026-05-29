import { useCallback, useState } from 'react';

export function usePagination(initialLimit = 20) {
  const [page, setPage] = useState(1);
  const [limit] = useState(initialLimit);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const applyMeta = useCallback((meta: { total: number; total_pages: number; page: number }) => {
    setTotal(meta.total);
    setTotalPages(meta.total_pages);
    setPage(meta.page);
  }, []);

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(1, p));
  }, []);

  const resetPage = useCallback(() => setPage(1), []);

  return { page, limit, totalPages, total, setTotalPages, setTotal, applyMeta, goToPage, resetPage };
}
