/**
 * Offline data cache for mobile (Capacitor WebView).
 * IndexedDB + LRU eviction, max ~100MB. Stale-while-revalidate via services.
 */

const DB_NAME = 'diu_tracker_offline_v1';
const DB_VERSION = 1;
const STORE = 'entries';
const META_KEY = '__meta__';
const MAX_BYTES = 100 * 1024 * 1024;

export type OfflineResource =
  | 'records'
  | 'courses'
  | 'notices'
  | 'deadlines'
  | 'academic_calendar'
  | 'batches'
  | 'teachers';

interface CacheEntry {
  key: string;
  payload: string;
  byteSize: number;
  updatedAt: number;
  lastAccessedAt: number;
}

interface CacheMeta {
  totalBytes: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;
let migratePromise: Promise<void> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' });
        store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
  return dbPromise;
}

function stableParams(params: Record<string, unknown>): string {
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(params).sort()) {
    const v = params[k];
    if (v !== undefined && v !== null && v !== '') {
      sorted[k] = v;
    }
  }
  return JSON.stringify(sorted);
}

export function offlineCacheKey(resource: OfflineResource, params: Record<string, unknown> = {}): string {
  if (resource === 'academic_calendar') return 'academic_calendar:global';
  if (resource === 'batches') return 'batches:all';
  if (resource === 'teachers') return 'teachers:all';
  return `${resource}:${stableParams(params)}`;
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
}

async function readMeta(): Promise<CacheMeta> {
  const row = await withStore<CacheEntry | undefined>('readonly', (s) => s.get(META_KEY));
  if (row && typeof row.payload === 'string') {
    try {
      return JSON.parse(row.payload) as CacheMeta;
    } catch {
      /* fall through */
    }
  }
  return { totalBytes: 0 };
}

async function writeMeta(meta: CacheMeta): Promise<void> {
  const payload = JSON.stringify(meta);
  const entry: CacheEntry = {
    key: META_KEY,
    payload,
    byteSize: new Blob([payload]).size,
    updatedAt: Date.now(),
    lastAccessedAt: Date.now(),
  };
  await withStore('readwrite', (s) => s.put(entry));
}

async function listEntries(): Promise<CacheEntry[]> {
  const all = await withStore<CacheEntry[]>('readonly', (s) => s.getAll());
  return all.filter((e) => e.key !== META_KEY);
}

async function recalculateMeta(): Promise<void> {
  const entries = await listEntries();
  const totalBytes = entries.reduce((sum, e) => sum + e.byteSize, 0);
  await writeMeta({ totalBytes });
}

async function evictIfNeeded(incomingBytes: number): Promise<void> {
  const meta = await readMeta();
  if (meta.totalBytes + incomingBytes <= MAX_BYTES) return;

  const entries = await listEntries();
  entries.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

  let total = meta.totalBytes;
  const toRemove: string[] = [];
  for (const entry of entries) {
    if (total + incomingBytes <= MAX_BYTES) break;
    toRemove.push(entry.key);
    total -= entry.byteSize;
  }

  if (!toRemove.length) return;

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const key of toRemove) store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  await recalculateMeta();
}

const LEGACY_PREFIX = 'diu_tracker_cache_';

function legacyToKey(legacyKey: string): string | null {
  if (legacyKey === 'diu_tracker_academic_calendar_v2') return offlineCacheKey('academic_calendar');
  if (!legacyKey.startsWith(LEGACY_PREFIX)) return null;
  const rest = legacyKey.slice(LEGACY_PREFIX.length);
  const sep = rest.indexOf('_');
  if (sep < 0) return null;
  const resource = rest.slice(0, sep) as OfflineResource;
  const jsonPart = rest.slice(sep + 1);
  if (!['records', 'courses', 'notices', 'deadlines'].includes(resource)) return null;
  try {
    const params = JSON.parse(jsonPart) as Record<string, unknown>;
    return offlineCacheKey(resource, params);
  } catch {
    return null;
  }
}

async function migrateFromLocalStorage(): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith(LEGACY_PREFIX) || k === 'diu_tracker_academic_calendar_v2')) {
      keys.push(k);
    }
  }
  for (const legacyKey of keys) {
    const newKey = legacyToKey(legacyKey);
    const raw = localStorage.getItem(legacyKey);
    if (!newKey || !raw) continue;
    try {
      const data = JSON.parse(raw);
      await offlineCache.set(newKey, data);
      localStorage.removeItem(legacyKey);
    } catch {
      /* skip corrupt legacy entries */
    }
  }
}

export const offlineCache = {
  async init(): Promise<void> {
    try {
      await openDb();
      if (!migratePromise) {
        migratePromise = migrateFromLocalStorage();
      }
      await migratePromise;
    } catch (err) {
      console.warn('Offline cache init failed:', err);
    }
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = await withStore<CacheEntry | undefined>('readonly', (s) => s.get(key));
      if (!entry?.payload) return null;

      entry.lastAccessedAt = Date.now();
      await withStore('readwrite', (s) => s.put(entry));

      return JSON.parse(entry.payload) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, data: T): Promise<void> {
    try {
      const payload = JSON.stringify(data);
      const byteSize = new Blob([payload]).size;
      if (byteSize > MAX_BYTES) {
        console.warn('Offline cache: entry too large, skipped', key);
        return;
      }

      const existing = await withStore<CacheEntry | undefined>('readonly', (s) => s.get(key));
      const delta = byteSize - (existing?.byteSize ?? 0);

      await evictIfNeeded(Math.max(0, delta));

      const entry: CacheEntry = {
        key,
        payload,
        byteSize,
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
      };
      await withStore('readwrite', (s) => s.put(entry));
      await recalculateMeta();
    } catch (err) {
      console.warn('Offline cache write failed:', err);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      const existing = await withStore<CacheEntry | undefined>('readonly', (s) => s.get(key));
      if (!existing) return;
      await withStore('readwrite', (s) => s.delete(key));
      await recalculateMeta();
    } catch {
      /* ignore */
    }
  },

  async clear(): Promise<void> {
    try {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      await writeMeta({ totalBytes: 0 });
    } catch {
      /* ignore */
    }
  },

  async getUsage(): Promise<{ bytes: number; maxBytes: number }> {
    const meta = await readMeta();
    return { bytes: meta.totalBytes, maxBytes: MAX_BYTES };
  },
};
