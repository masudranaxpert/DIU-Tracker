import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { saveAs } from 'file-saver';
import { TOOLS_FOLDER_NAME, uniqueToolsDownloadName } from '@/shared/lib/toolsStorage';

export interface CoverSaveResult {
  fileName: string;
  native: boolean;
  displayPath?: string;
}

function sanitize(name: string, ext: string): string {
  const trimmed = name.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
  const base = trimmed || 'cover';
  return base.toLowerCase().endsWith(`.${ext}`) ? base : `${base}.${ext}`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function saveCoverFile(blob: Blob, fileName: string, ext: 'pdf' | 'png'): Promise<CoverSaveResult> {
  const safeName = sanitize(fileName, ext);

  if (!Capacitor.isNativePlatform()) {
    saveAs(blob, safeName);
    return { fileName: safeName, native: false };
  }

  const uniqueName = await uniqueToolsDownloadName(safeName);
  const base64 = await blobToBase64(blob);
  const cacheFile = await Filesystem.writeFile({
    path: uniqueName,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });

  const displayPath = `${TOOLS_FOLDER_NAME}/${uniqueName}`;
  try {
    await Filesystem.writeFile({
      path: `Download/${TOOLS_FOLDER_NAME}/${uniqueName}`,
      data: base64,
      directory: Directory.ExternalStorage,
      recursive: true,
    });
    try {
      await LocalNotifications.schedule({
        notifications: [{ title: 'Cover page saved', body: `Saved to ${displayPath}`, id: Date.now() % 2147483647 }],
      });
    } catch {
      /* notification permission may be denied */
    }
    return { fileName: uniqueName, native: true, displayPath };
  } catch {
    await Share.share({ title: 'Save cover page', files: [cacheFile.uri], dialogTitle: `Save to ${TOOLS_FOLDER_NAME}` });
    return { fileName: uniqueName, native: true, displayPath: TOOLS_FOLDER_NAME };
  }
}
