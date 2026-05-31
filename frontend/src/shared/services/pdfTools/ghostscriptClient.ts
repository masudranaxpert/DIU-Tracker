import type { GhostscriptQuality } from './ghostscriptPresets';

export interface GhostscriptProgress {
  current: number;
  total: number;
  label?: string;
}

type WorkerResponse =
  | { type: 'ready' }
  | { type: 'success'; data: ArrayBuffer }
  | { type: 'progress'; current: number; total: number; label?: string }
  | { type: 'error'; error: string };

let worker: Worker | null = null;
let workerBlobUrl: string | null = null;
let readyPromise: Promise<void> | null = null;
let jobCount = 0;

const MAX_JOBS_BEFORE_RECYCLE = 3;

async function prepareWorker(): Promise<Worker> {
  if (worker) return worker;

  const baseUrl = import.meta.env.BASE_URL || '/';
  const workerUrl = `${baseUrl}pdf-compress/pdf-compress.worker.js`;
  const gsUrl = `${baseUrl}pdf-compress/gs.js`;

  try {
    const [workerRes, gsRes] = await Promise.all([
      fetch(workerUrl),
      fetch(gsUrl),
    ]);

    if (!workerRes.ok || !gsRes.ok) {
      throw new Error(`Failed to load PDF worker assets (worker: ${workerRes.status}, gs: ${gsRes.status})`);
    }

    const workerCode = await workerRes.text();
    const gsCode = await gsRes.text();

    const combinedCode = `${gsCode}\n\n${workerCode}`;
    const blob = new Blob([combinedCode], { type: 'application/javascript' });
    
    workerBlobUrl = URL.createObjectURL(blob);
    worker = new Worker(workerBlobUrl);
    jobCount = 0;
    return worker;
  } catch (err) {
    console.error('Failed to initialize isolated offline PDF worker, falling back:', err);
    worker = new Worker(workerUrl);
    jobCount = 0;
    return worker;
  }
}

function getWorker(): Worker {
  if (!worker) {
    throw new Error('Worker not initialized. Call ensureGhostscriptReady first.');
  }
  return worker;
}

function recycleWorkerIfNeeded(): void {
  if (jobCount >= MAX_JOBS_BEFORE_RECYCLE) {
    terminateGhostscriptWorker();
  }
}

export async function ensureGhostscriptReady(): Promise<void> {
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    const w = await prepareWorker();

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('PDF tools took too long to start. Please try again.'));
      }, 300000);

      const onError = (event: ErrorEvent) => {
        cleanup();
        reject(new Error(event.message || 'Something went wrong. Please try again.'));
      };

      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        if (msg.type === 'ready') {
          cleanup();
          resolve();
        } else if (msg.type === 'error') {
          cleanup();
          reject(new Error(msg.error || 'Could not start PDF tools. Please restart the app.'));
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        w.removeEventListener('message', onMessage);
        w.removeEventListener('error', onError);
      };

      w.addEventListener('message', onMessage);
      w.addEventListener('error', onError);
      w.postMessage({ type: 'init' });
    });
  })();

  return readyPromise;
}

function runWorkerJob<T>(
  payload: Record<string, unknown>,
  transfer: Transferable[] | undefined,
  onProgress: ((p: GhostscriptProgress) => void) | undefined,
  parseSuccess: (msg: WorkerResponse) => T
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      await ensureGhostscriptReady();
    } catch (e) {
      reject(e);
      return;
    }

    const w = getWorker();
    const pageCount = typeof payload.pageCount === 'number' ? payload.pageCount : 0;
    const timeoutMs =
      payload.type === 'compress' && pageCount > 50
        ? Math.min(3_600_000, Math.max(900_000, pageCount * 4_000))
        : 600_000;

    const timeout = setTimeout(() => {
      cleanup();
      terminateGhostscriptWorker();
      reject(new Error('PDF operation timed out. Try a smaller file or lower quality.'));
    }, timeoutMs);

    const onError = (event: ErrorEvent) => {
      cleanup();
      terminateGhostscriptWorker();
      reject(new Error(event.message || 'Something went wrong. Please try again.'));
    };

    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;

      if (msg.type === 'progress') {
        onProgress?.({ current: msg.current, total: msg.total, label: msg.label });
        return;
      }

      if (msg.type === 'error') {
        cleanup();
        terminateGhostscriptWorker();
        reject(new Error(msg.error || 'Operation failed. Please try again.'));
        return;
      }

      if (msg.type === 'success') {
        cleanup();
        jobCount++;
        try {
          const result = parseSuccess(msg);
          recycleWorkerIfNeeded();
          resolve(result);
        } catch (e) {
          terminateGhostscriptWorker();
          reject(e);
        }
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
    };

    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);

    try {
      if (transfer?.length) {
        w.postMessage(payload, transfer);
      } else {
        w.postMessage(payload);
      }
    } catch (e) {
      cleanup();
      terminateGhostscriptWorker();
      reject(e instanceof Error ? e : new Error('Could not start. Please try again.'));
    }
  });
}

export async function gsCompressPdf(
  input: Uint8Array,
  quality: GhostscriptQuality = 'ebook',
  onProgress?: (p: GhostscriptProgress) => void,
  pageCount?: number
): Promise<Uint8Array> {
  const buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;

  return runWorkerJob(
    { type: 'compress', data: buffer, quality, pageCount: pageCount ?? 0 },
    [buffer],
    (p) => onProgress?.({ ...p, label: p.label ?? 'Compressing…' }),
    (msg) => {
      if (msg.type !== 'success') throw new Error('Unexpected worker response');
      return new Uint8Array(msg.data);
    }
  );
}

export async function gsMergePdfs(
  inputs: Uint8Array[],
  onProgress?: (p: GhostscriptProgress) => void
): Promise<Uint8Array> {
  const buffers = inputs.map(
    (input) => input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer
  );

  return runWorkerJob(
    { type: 'merge', files: buffers },
    buffers,
    (p) => onProgress?.({ ...p, label: p.label ?? 'Merging PDFs…' }),
    (msg) => {
      if (msg.type !== 'success') throw new Error('Unexpected worker response');
      return new Uint8Array(msg.data);
    }
  );
}

export async function gsExtractPages(
  input: Uint8Array,
  ranges: { start: number; end: number }[],
  onProgress?: (p: GhostscriptProgress) => void
): Promise<Uint8Array> {
  const buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;

  return runWorkerJob(
    { type: 'splitExtract', data: buffer, ranges },
    [buffer],
    onProgress,
    (msg) => {
      if (msg.type !== 'success') throw new Error('Unexpected worker response');
      return new Uint8Array(msg.data);
    }
  );
}

export function terminateGhostscriptWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  if (workerBlobUrl) {
    URL.revokeObjectURL(workerBlobUrl);
    workerBlobUrl = null;
  }
  readyPromise = null;
  jobCount = 0;
}

export function forceWorkerCleanup(): void {
  terminateGhostscriptWorker();
}
