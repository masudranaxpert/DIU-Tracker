import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';

export const TOOLS_FOLDER_NAME = 'DIU Tracker Tools';

export interface SaveResult {
  fileName: string;
  displayPath: string;
  uri?: string;
  webViewUrl?: string;
  usedShareFallback: boolean;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
  if (!trimmed) return 'output.pdf';
  return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function downloadFileExists(name: string): Promise<boolean> {
  try {
    await Filesystem.stat({
      path: `Download/${TOOLS_FOLDER_NAME}/${name}`,
      directory: Directory.ExternalStorage,
    });
    return true;
  } catch {
    return false;
  }
}

/** Returns a non-colliding file name in the tools folder (adds _1, _2, … if needed). */
export async function uniqueToolsDownloadName(fileName: string): Promise<string> {
  if (!Capacitor.isNativePlatform()) return fileName;
  const dot = fileName.lastIndexOf('.');
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : '';
  let candidate = fileName;
  let n = 0;
  while (n < 1000 && (await downloadFileExists(candidate))) {
    n += 1;
    candidate = `${base}_${n}${ext}`;
  }
  return candidate;
}

export async function savePdfToToolsFolder(
  bytes: Uint8Array,
  fileName: string
): Promise<SaveResult> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Tools storage is only available in the native app.');
  }

  const safeName = await uniqueToolsDownloadName(sanitizeFileName(fileName));
  const base64 = uint8ArrayToBase64(bytes);

  const cacheFile = await Filesystem.writeFile({
    path: safeName,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });

  const downloadRelative = `Download/${TOOLS_FOLDER_NAME}/${safeName}`;

  try {
    await Filesystem.writeFile({
      path: downloadRelative,
      data: base64,
      directory: Directory.ExternalStorage,
      recursive: true,
    });

    const displayPath = `${TOOLS_FOLDER_NAME}/${safeName}`;

    let nativeUri: string | undefined;
    let webViewUrl: string | undefined;
    try {
      const uriResult = await Filesystem.getUri({
        path: downloadRelative,
        directory: Directory.ExternalStorage,
      });
      nativeUri = uriResult.uri;
      webViewUrl = Capacitor.convertFileSrc(uriResult.uri);
    } catch {
      // Uri lookup failed; open actions may use cache fallback.
    }

    try {
      await LocalNotifications.schedule({
        notifications: [{
          title: 'PDF saved',
          body: `Saved to ${displayPath}`,
          id: Date.now() % 2147483647,
        }],
      });
    } catch {
      // Notification permission may be denied; save still succeeded.
    }

    return {
      fileName: safeName,
      displayPath,
      uri: nativeUri ?? cacheFile.uri,
      webViewUrl: webViewUrl ?? Capacitor.convertFileSrc(cacheFile.uri),
      usedShareFallback: false,
    };
  } catch {
    await Share.share({
      title: 'Save PDF',
      files: [cacheFile.uri],
      dialogTitle: `Save to ${TOOLS_FOLDER_NAME}`,
    });

    return {
      fileName: safeName,
      displayPath: TOOLS_FOLDER_NAME,
      uri: cacheFile.uri,
      webViewUrl: Capacitor.convertFileSrc(cacheFile.uri),
      usedShareFallback: true,
    };
  }
}

export async function saveMultiplePdfsToToolsFolder(
  files: { bytes: Uint8Array; fileName: string }[]
): Promise<SaveResult[]> {
  const results: SaveResult[] = [];
  for (const file of files) {
    results.push(await savePdfToToolsFolder(file.bytes, file.fileName));
  }
  return results;
}
