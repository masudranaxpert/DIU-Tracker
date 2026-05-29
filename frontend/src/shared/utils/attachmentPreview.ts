import { extractDriveFileId } from '@/shared/services/driveUploadService';

export type AttachmentPreviewMode = 'iframe' | 'image' | 'video' | 'none';

export type AttachmentPreview = {
  mode: AttachmentPreviewMode;
  src: string;
  openUrl: string;
  isDrive: boolean;
};

function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function drivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

function isOfficeOrPdfType(type: string, url: string): boolean {
  const lower = url.toLowerCase();
  return (
    type === 'pdf' ||
    type === 'word' ||
    type === 'excel' ||
    type === 'pptx' ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.pptx')
  );
}

/** Resolve how to preview an attachment (Drive uploads, links, direct files). */
export function resolveAttachmentPreview(attachment: {
  url: string;
  type: string;
}): AttachmentPreview {
  const openUrl = attachment.url?.trim() || '';
  if (!openUrl) {
    return { mode: 'none', src: '', openUrl: '', isDrive: false };
  }

  const driveId = extractDriveFileId(openUrl);
  const isDrive = Boolean(driveId) || openUrl.includes('drive.google.com');

  if (driveId) {
    return {
      mode: 'iframe',
      src: drivePreviewUrl(driveId),
      openUrl: openUrl.includes('/view') ? openUrl : drivePreviewUrl(driveId).replace('/preview', '/view'),
      isDrive: true,
    };
  }

  if (attachment.type === 'image') {
    return { mode: 'image', src: openUrl, openUrl, isDrive: false };
  }

  if (attachment.type === 'video') {
    return { mode: 'video', src: openUrl, openUrl, isDrive: false };
  }

  if (isOfficeOrPdfType(attachment.type, openUrl)) {
    if (attachment.type === 'pdf' && openUrl.toLowerCase().endsWith('.pdf') && !isMobileDevice()) {
      return { mode: 'iframe', src: openUrl, openUrl, isDrive: false };
    }
    return {
      mode: 'iframe',
      src: `https://docs.google.com/viewer?url=${encodeURIComponent(openUrl)}&embedded=true`,
      openUrl,
      isDrive: false,
    };
  }

  if (attachment.type === 'link' || isDrive) {
    let src = openUrl;
    if (openUrl.includes('drive.google.com') && openUrl.includes('/view')) {
      src = openUrl.replace('/view', '/preview');
    }
    return { mode: 'iframe', src, openUrl, isDrive: isDrive || openUrl.includes('drive.google.com') };
  }

  return { mode: 'none', src: '', openUrl, isDrive: false };
}
