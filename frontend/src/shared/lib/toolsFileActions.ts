import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import ToolsFiles from '@/shared/plugins/tools-files';
import { TOOLS_FOLDER_NAME } from '@/shared/lib/toolsStorage';

export function toolsFolderRelativePath(fileName?: string): string {
  const base = `Download/${TOOLS_FOLDER_NAME}`;
  return fileName ? `${base}/${fileName}` : base;
}

async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch {
    // ignore
  }
}

export async function resolveSavedPdfUri(fileName: string): Promise<string> {
  const { uri } = await Filesystem.getUri({
    path: toolsFolderRelativePath(fileName),
    directory: Directory.ExternalStorage,
  });
  return uri;
}

/** WebView-safe URL for in-app PDF iframe (Capacitor convertFileSrc). */
export function toInAppPdfUrl(nativeUri: string): string {
  return Capacitor.convertFileSrc(nativeUri);
}

export async function getInAppPdfUrl(fileName: string): Promise<string> {
  const nativeUri = await resolveSavedPdfUri(fileName);
  return toInAppPdfUrl(nativeUri);
}

/** Open PDF with the device default viewer (Android ACTION_VIEW intent). */
export async function openPdfWithSystemViewer(fileName: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await ToolsFiles.openPdf({ fileName });
    return;
  }

  const url = await getInAppPdfUrl(fileName);
  window.open(url, '_blank');
}

/** Open any saved tools file (pdf/png/…) with the device default viewer. */
export async function openToolsFile(fileName: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await ToolsFiles.openPdf({ fileName });
    return;
  }
  const nativeUri = await resolveSavedPdfUri(fileName);
  window.open(toInAppPdfUrl(nativeUri), '_blank');
}

export async function copyToolsFolderPath(): Promise<void> {
  await copyText(`Download/${TOOLS_FOLDER_NAME}`);
}

/** Open Download/DIU Tracker Tools in the system file manager. */
export async function openToolsFolder(_fileName?: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ToolsFiles.openToolsFolder({ folderName: TOOLS_FOLDER_NAME });
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not open folder';
      throw new Error(msg);
    }
  }

  try {
    await Share.share({
      title: TOOLS_FOLDER_NAME,
      text: `Your PDFs are in: Download/${TOOLS_FOLDER_NAME}`,
      dialogTitle: TOOLS_FOLDER_NAME,
    });
  } catch {
    await copyToolsFolderPath();
  }
}
