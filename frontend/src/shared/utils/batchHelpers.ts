export interface BatchRef {
  id: string;
  name: string;
}

/** Resolve batch UUID to human-readable name (e.g. "64_J") for display */
export function createBatchNameLookup(batches: BatchRef[]) {
  const map = new Map(batches.map((batch) => [batch.id, batch.name]));
  return (batchId: string | null | undefined) => {
    if (!batchId) return 'N/A';
    return map.get(batchId) || batchId;
  };
}
