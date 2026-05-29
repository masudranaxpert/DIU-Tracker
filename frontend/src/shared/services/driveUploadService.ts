const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/** Browser → API (multipart). Rest is server → Google Drive (no byte events). */
const PROGRESS_NETWORK_MAX = 38;
const PROGRESS_SERVER_MAX = 92;

export interface DriveStatus {
  ready: boolean;
  active_accounts: number;
  connected_accounts?: number;
  message: string | null;
}

export interface DriveUploadResult {
  url: string;
  type: string;
  drive_file_id?: string;
  account_id?: string;
  filename?: string;
}

export type DriveUploadPhase = 'sending' | 'drive' | 'finishing';

export function mapDriveErrorMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('quota exceeded') && (lower.includes('queries') || lower.includes('per minute'))) {
    return 'Upload service is busy. Please wait a minute and try again, or contact your admin.';
  }
  if (lower.includes('storage') && (lower.includes('full') || lower.includes('quota'))) {
    return 'Google Drive storage is full. Please contact your super admin.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many requests. Please try again in a few minutes.';
  }
  if (lower.includes('no active google drive') || lower.includes('not configured')) {
    return 'File upload is not set up yet. Ask your super admin to configure Rclone.';
  }
  if (lower.includes('all connected') && lower.includes('full')) {
    return 'All Drive accounts are full. Please contact your super admin.';
  }
  if (raw.length > 120 || lower.includes('googleapis') || lower.includes('project_number')) {
    return 'Upload failed. Please try again later or contact your admin.';
  }
  return raw;
}

export async function fetchDriveStatus(): Promise<DriveStatus> {
  try {
    localStorage.removeItem('dct_drive_status_v1');
  } catch {
    /* legacy cache cleanup */
  }

  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_BASE}/drive/status`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(mapDriveErrorMessage(err.detail || 'Could not check Drive status'));
  }
  return res.json();
}

export function extractDriveFileId(urlOrId?: string | null): string | null {
  if (!urlOrId?.trim()) return null;
  const s = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{10,}$/.test(s) && !s.includes('/')) return s;
  const m1 = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  return null;
}

export async function deleteStagedDriveFile(payload: {
  driveFileId?: string | null;
  rcloneAccountId?: string | null;
  fileUrl?: string | null;
}): Promise<void> {
  const drive_file_id =
    extractDriveFileId(payload.driveFileId) ||
    extractDriveFileId(payload.fileUrl) ||
    payload.driveFileId ||
    null;

  if (!drive_file_id && !payload.fileUrl) return;
  if (payload.fileUrl?.includes('t.me/')) return;

  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_BASE}/drive/staged-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      drive_file_id,
      rclone_account_id: payload.rcloneAccountId || null,
      file_url: payload.fileUrl || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(mapDriveErrorMessage(err.detail || 'Could not remove file from Google Drive'));
  }
}

/** Smooth 0→100 display; optional phase for UI labels */
function createUploadProgress(
  onProgress: (percent: number, phase: DriveUploadPhase) => void
) {
  let shown = 0;
  let goal = 0;
  let phase: DriveUploadPhase = 'sending';
  let serverTimer: ReturnType<typeof setInterval> | null = null;

  const emit = () => onProgress(shown, phase);

  const tickTimer = setInterval(() => {
    if (shown < goal) {
      const gap = goal - shown;
      const step = gap > 15 ? 2 : 1;
      shown = Math.min(goal, shown + step);
      emit();
    }
  }, 45);

  const setGoal = (g: number, nextPhase?: DriveUploadPhase) => {
    goal = Math.min(100, Math.max(goal, g));
    if (nextPhase) phase = nextPhase;
    emit();
  };

  const startServerPhase = (fileSize: number) => {
    phase = 'drive';
    const base = Math.max(shown, PROGRESS_NETWORK_MAX + 2);
    setGoal(base);
    let serverGoal = base;
    const msPerStep = Math.min(
      400,
      Math.max(120, Math.round(fileSize / 80000))
    );
    if (serverTimer) clearInterval(serverTimer);
    serverTimer = setInterval(() => {
      if (serverGoal < PROGRESS_SERVER_MAX) {
        serverGoal += 1;
        setGoal(serverGoal);
      }
    }, msPerStep);
  };

  const stop = () => {
    clearInterval(tickTimer);
    if (serverTimer) clearInterval(serverTimer);
  };

  const complete = () =>
    new Promise<void>((resolve) => {
      phase = 'finishing';
      setGoal(100);
      const wait = setInterval(() => {
        if (shown >= 100) {
          clearInterval(wait);
          stop();
          resolve();
        }
      }, 45);
    });

  setGoal(0, 'sending');
  return { setGoal, startServerPhase, complete, stop };
}

export function uploadToDrive(
  file: File,
  onProgress: (percent: number, phase?: DriveUploadPhase) => void
): Promise<DriveUploadResult> {
  return new Promise((resolve, reject) => {
    const token = localStorage.getItem('auth_token');
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    const reporter = createUploadProgress((pct, phase) => onProgress(pct, phase));

    xhr.upload.addEventListener('loadstart', () => {
      reporter.setGoal(3, 'sending');
    });

    xhr.upload.addEventListener('progress', (e) => {
      if (!e.lengthComputable || e.total <= 0) return;
      const ratio = e.loaded / e.total;
      const networkPct = Math.round(ratio * PROGRESS_NETWORK_MAX);
      reporter.setGoal(Math.max(3, networkPct), 'sending');
    });

    xhr.upload.addEventListener('loadend', () => {
      reporter.startServerPhase(file.size);
    });

    xhr.addEventListener('load', () => {
      let data: { detail?: string } & DriveUploadResult = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reporter.stop();
        reject(new Error('Invalid server response'));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.url) {
        void reporter.complete().then(() => resolve(data));
        return;
      }
      reporter.stop();
      reject(new Error(mapDriveErrorMessage(data.detail || 'Upload failed')));
    });

    xhr.addEventListener('error', () => {
      reporter.stop();
      reject(new Error('Network error during upload. Check your connection and try again.'));
    });
    xhr.addEventListener('abort', () => {
      reporter.stop();
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', `${API_BASE}/drive/upload`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

export function uploadPhaseLabel(phase: DriveUploadPhase | undefined): string {
  switch (phase) {
    case 'sending':
      return 'Sending file to server…';
    case 'drive':
      return 'Uploading to Google Drive…';
    case 'finishing':
      return 'Almost done…';
    default:
      return 'Uploading…';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
