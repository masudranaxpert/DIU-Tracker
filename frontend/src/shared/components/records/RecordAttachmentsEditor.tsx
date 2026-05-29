import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CloudOff,
  Link2,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import NativeSelect from '../NativeSelect';
import {
  deleteStagedDriveFile,
  extractDriveFileId,
  fetchDriveStatus,
  formatFileSize,
  mapDriveErrorMessage,
  uploadPhaseLabel,
  uploadToDrive,
  type DriveStatus,
  type DriveUploadPhase,
} from '@/shared/services/driveUploadService';
import { recordService } from '@/shared/services/recordService';

export type RecordAttachmentDraft = {
  id?: string;
  name: string;
  type: string;
  url: string;
  uploadMode?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  fileName?: string;
  fileSize?: number;
  drive_file_id?: string;
  public_id?: string;
  rclone_account_id?: string | null;
  uploadPhase?: DriveUploadPhase;
};

const MAX_FILE_BYTES = 100 * 1024 * 1024;

function attachmentDriveRef(att: RecordAttachmentDraft): {
  fileId: string | null;
  hasDrive: boolean;
} {
  const url = att.url || '';
  if (url.includes('t.me/')) {
    return { fileId: null, hasDrive: false };
  }
  const fileId =
    extractDriveFileId(att.drive_file_id) ||
    extractDriveFileId(att.public_id) ||
    extractDriveFileId(url);
  return { fileId, hasDrive: !!fileId || url.includes('drive.google.com') };
}

const FILE_TYPE_OPTIONS = [
  { id: 'link', name: 'Link (URL)' },
  { id: 'pdf', name: 'PDF Document' },
  { id: 'word', name: 'Word (Docx)' },
  { id: 'excel', name: 'Excel (Sheet)' },
  { id: 'pptx', name: 'PowerPoint' },
  { id: 'image', name: 'Image / Photo' },
  { id: 'video', name: 'Video File' },
  { id: 'zip', name: 'Archive (Zip)' },
  { id: 'other', name: 'Other File' },
];

interface Props {
  attachments: RecordAttachmentDraft[];
  onChange: (next: RecordAttachmentDraft[]) => void;
  onOversize?: (size: number) => void;
}

const RecordAttachmentsEditor: React.FC<Props> = ({ attachments, onChange, onOversize }) => {
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [clearingIdx, setClearingIdx] = useState<number | null>(null);

  const refreshDriveStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const s = await fetchDriveStatus();
      setDriveStatus(s);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : '';
      setDriveStatus({
        ready: false,
        active_accounts: 0,
        message: detail.includes('Only CR')
          ? 'File upload is only available when logged in as an approved CR account.'
          : detail || 'Could not verify file upload setup.',
      });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDriveStatus();
  }, [refreshDriveStatus]);

  const needsDrive = attachments.some((a) => a.type !== 'link' && a.uploadMode !== false);

  const updateAt = (idx: number, patch: Partial<RecordAttachmentDraft>) => {
    const next = attachmentsRef.current.map((a, i) =>
      i === idx ? { ...a, ...patch } : a
    );
    attachmentsRef.current = next;
    onChange(next);
  };

  const clearUploadedFile = async (idx: number) => {
    const att = attachmentsRef.current[idx];
    const { fileId, hasDrive } = attachmentDriveRef(att);

    if (!att.url && !fileId && !att.id) {
      updateAt(idx, {
        url: '',
        fileName: undefined,
        fileSize: undefined,
        uploadProgress: 0,
        drive_file_id: undefined,
        rclone_account_id: undefined,
      });
      return;
    }

    setClearingIdx(idx);
    setUploadError(null);
    try {
      if (att.id) {
        await recordService.deleteAttachment(att.id);
      } else if (hasDrive || fileId) {
        await deleteStagedDriveFile({
          driveFileId: att.drive_file_id || att.public_id || fileId,
          rcloneAccountId: att.rclone_account_id,
          fileUrl: att.url,
        });
      }
      updateAt(idx, {
        url: '',
        fileName: undefined,
        fileSize: undefined,
        uploadProgress: 0,
        drive_file_id: undefined,
        rclone_account_id: undefined,
        public_id: undefined,
      });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Could not remove file from Drive');
      throw err;
    } finally {
      setClearingIdx(null);
    }
  };

  const handleFileUpload = async (idx: number, file: File) => {
    setUploadError(null);
    if (file.size > MAX_FILE_BYTES) {
      onOversize?.(file.size);
      return;
    }

    if (!driveStatus?.ready) {
      setUploadError(
        driveStatus?.message ||
          'File upload is not available. Ask your super admin to set up Rclone.'
      );
      return;
    }

    updateAt(idx, {
      isUploading: true,
      uploadProgress: 0,
      uploadPhase: 'sending',
      fileName: file.name,
      fileSize: file.size,
      url: '',
      drive_file_id: undefined,
      rclone_account_id: undefined,
    });

    try {
      const result = await uploadToDrive(file, (pct, phase) => {
        updateAt(idx, { uploadProgress: pct, uploadPhase: phase });
      });
      const currentName = attachmentsRef.current[idx]?.name;
      updateAt(idx, {
        url: result.url,
        type: result.type,
        drive_file_id: result.drive_file_id,
        public_id: result.drive_file_id,
        rclone_account_id: result.account_id ?? null,
        name: currentName?.trim() ? currentName : file.name.replace(/\.[^.]+$/, ''),
        isUploading: false,
        uploadProgress: 100,
        fileName: file.name,
        fileSize: file.size,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(mapDriveErrorMessage(msg));
      updateAt(idx, { isUploading: false, uploadProgress: 0 });
    }
  };

  const addRow = () => {
    onChange([...attachments, { name: '', type: 'pdf', url: '', uploadMode: true }]);
  };

  return (
    <div className="space-y-4 pt-6 mt-2 border-t border-slate-100 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
            <Paperclip size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Attachments
            </p>
            <p className="text-[11px] text-slate-400 font-medium">Links or files via Google Drive</p>
          </div>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={12} /> Add attachment
        </button>
      </div>

      {uploadError && (
        <div className="flex gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
          <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">{uploadError}</p>
        </div>
      )}

      {needsDrive && !statusLoading && driveStatus && !driveStatus.ready && (
        <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
          <CloudOff size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">File upload unavailable</p>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed">
              {driveStatus.message ||
                'Ask your super admin to connect Google Drive in Admin Panel → Rclone.'}
            </p>
            <p className="text-[10px] font-bold text-amber-700/80 dark:text-amber-400/80 mt-2 uppercase tracking-wide">
              You can still use Link (URL) attachments
            </p>
            <button
              type="button"
              onClick={() => refreshDriveStatus()}
              className="mt-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Check again
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {attachments.map((att, idx) => {
          const isLink = att.type === 'link';
          const showUpload = !isLink && att.uploadMode !== false;
          const canUploadFile = showUpload && driveStatus?.ready && !att.isUploading && clearingIdx !== idx;

          return (
            <div
              key={att.id ?? `att-${idx}`}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 shadow-sm overflow-visible relative z-0"
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 rounded-t-2xl">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Attachment {idx + 1}
                </span>
                <button
                  type="button"
                  disabled={attachments.length === 1 && !att.url && !att.name}
                  onClick={async () => {
                    const { hasDrive } = attachmentDriveRef(att);
                    try {
                      if (att.url || att.id || hasDrive) {
                        await clearUploadedFile(idx);
                      }
                      if (attachments.length > 1) {
                        onChange(attachments.filter((_, i) => i !== idx));
                      } else {
                        onChange([{ name: '', type: 'link', url: '', uploadMode: false }]);
                      }
                    } catch {
                      /* error in uploadError */
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-30"
                  aria-label="Remove attachment"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-visible">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">
                      Display name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lecture Notes"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold dark:text-white focus:border-indigo-500 outline-none"
                      value={att.name}
                      required={!!att.url}
                      onChange={(e) => updateAt(idx, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 relative z-[50]">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">
                      File type
                    </label>
                    <NativeSelect
                      placeholder="Select type"
                      options={FILE_TYPE_OPTIONS}
                      value={att.type}
                      menuZIndex={10050}
                      onChange={(val) => {
                        const t = String(val);
                        updateAt(idx, {
                          type: t,
                          uploadMode: t !== 'link',
                        });
                      }}
                      showSearch={false}
                    />
                  </div>
                </div>

                {isLink ? (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5 flex items-center gap-1">
                      <Link2 size={10} /> Paste link
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://drive.google.com/..."
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium dark:text-white focus:border-indigo-500 outline-none"
                        value={att.url}
                        onChange={(e) => updateAt(idx, { url: e.target.value })}
                      />
                      <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Upload file
                      </label>
                      <button
                        type="button"
                        className="text-[9px] font-black text-indigo-600 uppercase hover:underline"
                        onClick={() =>
                          updateAt(idx, { uploadMode: false, type: 'link', url: att.url || '' })
                        }
                      >
                        Use link instead
                      </button>
                    </div>

                    {!driveStatus?.ready && !statusLoading ? (
                      <div className="p-4 rounded-xl border-2 border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-center">
                        <AlertCircle size={20} className="mx-auto text-amber-500 mb-2" />
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                          File upload disabled until admin configures Drive
                        </p>
                      </div>
                    ) : att.isUploading ? (
                      <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                        <div className="flex items-center gap-3">
                          <Loader2 size={22} className="animate-spin text-indigo-600 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                              {att.fileName || 'Uploading…'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {uploadPhaseLabel(att.uploadPhase)}
                            </p>
                          </div>
                          <span className="text-sm font-black text-indigo-600 tabular-nums">
                            {att.uploadProgress ?? 0}%
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-white/80 dark:bg-slate-800 overflow-hidden shadow-inner">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 transition-all duration-200 ease-out"
                            style={{ width: `${att.uploadProgress ?? 0}%` }}
                          />
                        </div>
                      </div>
                    ) : att.url ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100 truncate">
                            {att.fileName || att.name || 'Uploaded'}
                          </p>
                          {att.fileSize != null && (
                            <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                              {formatFileSize(att.fileSize)} · Ready to save
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={clearingIdx === idx}
                          className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-500 disabled:opacity-50"
                          onClick={() => void clearUploadedFile(idx)}
                          aria-label="Remove uploaded file"
                        >
                          {clearingIdx === idx ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <X size={14} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <label
                        className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-all ${
                          canUploadFile
                            ? 'border-slate-200 dark:border-slate-600 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 cursor-pointer'
                            : 'border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
                          <Upload size={20} className="text-indigo-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          Tap to select file
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Max {MAX_FILE_BYTES / (1024 * 1024)} MB
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          disabled={!canUploadFile}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) void handleFileUpload(idx, file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecordAttachmentsEditor;

export function attachmentsUploading(list: RecordAttachmentDraft[]): boolean {
  return list.some((a) => a.isUploading);
}
