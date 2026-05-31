import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowLeft, FileText, Image as ImageIcon, Loader2, Plus, Trash2, CheckCircle2, Eye, FolderOpen } from 'lucide-react';
import TeacherDirectorySelect from '@/shared/components/TeacherDirectorySelect';
import { openToolsFile, openToolsFolder } from '@/shared/lib/toolsFileActions';
import {
  type CoverData,
  type CoverKind,
  createEmptyCoverData,
  getCoverKindInfo,
} from '@/shared/services/coverPage/coverTypes';
import { exportCoverPdf, exportCoverPng, type CoverExportFormat } from '@/shared/services/coverPage/coverExport';
import { saveCoverFile } from '@/shared/services/coverPage/coverSave';
import { toolsInput, toolsLabel, toolsBtnPrimary, toolsBtnOutline } from '@/shared/components/tools/toolsUi';
import CourseSelect, { type CourseOption } from './CourseSelect';
import CoverPreview from './CoverPreview';
import CoverDocument, { COVER_DOC_HEIGHT, COVER_DOC_WIDTH } from './CoverDocument';

export interface CoverStudentAutofill {
  name?: string;
  studentId?: string;
  section?: string;
}

interface CoverFormProps {
  kind: CoverKind;
  courses: CourseOption[];
  autofill: CoverStudentAutofill;
  onBack: () => void;
}

function buildFileName(data: CoverData): string {
  const parts = [data.kind, data.courseCode || data.courseTitle || 'cover', data.submittedBy.studentId]
    .filter(Boolean)
    .map((p) => p.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, ''));
  return `${parts.join('_') || 'cover'}.pdf`;
}

const CoverForm: React.FC<CoverFormProps> = ({ kind, courses, autofill, onBack }) => {
  const info = getCoverKindInfo(kind);
  const isIndex = kind === 'index';

  const [data, setData] = useState<CoverData>(() => {
    const base = createEmptyCoverData(kind);
    base.submittedBy.name = autofill.name ?? '';
    base.submittedBy.studentId = autofill.studentId ?? '';
    base.submittedBy.section = autofill.section ?? '';
    return base;
  });

  const [busy, setBusy] = useState<CoverExportFormat | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<{ fileName: string; native: boolean } | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const update = useCallback((patch: Partial<CoverData>) => {
    setData((prev) => ({ ...prev, ...patch }));
    setSavedMsg(null);
  }, []);

  const updateParty = useCallback((patch: Partial<CoverData['submittedTo']>) => {
    setData((prev) => ({ ...prev, submittedTo: { ...prev.submittedTo, ...patch } }));
    setSavedMsg(null);
  }, []);

  const updateStudent = useCallback((patch: Partial<CoverData['submittedBy']>) => {
    setData((prev) => ({ ...prev, submittedBy: { ...prev.submittedBy, ...patch } }));
    setSavedMsg(null);
  }, []);

  const setExperiment = useCallback((idx: number, patch: Partial<CoverData['experiments'][number]>) => {
    setData((prev) => ({
      ...prev,
      experiments: prev.experiments.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));
    setSavedMsg(null);
  }, []);

  const addExperiment = useCallback(() => {
    setData((prev) => ({
      ...prev,
      experiments: [...prev.experiments, { no: String(prev.experiments.length + 1), name: '', date: '', remarks: '' }],
    }));
  }, []);

  const removeExperiment = useCallback((idx: number) => {
    setData((prev) => ({
      ...prev,
      experiments: prev.experiments.length > 1 ? prev.experiments.filter((_, i) => i !== idx) : prev.experiments,
    }));
  }, []);

  const onSelectCourse = useCallback((course: CourseOption) => {
    setData((prev) => ({
      ...prev,
      courseTitle: course.name || prev.courseTitle,
      courseCode: course.code || prev.courseCode,
      submittedTo: { ...prev.submittedTo, name: prev.submittedTo.name },
    }));
    setSavedMsg(null);
  }, []);

  const canGenerate = useMemo(() => data.courseTitle.trim().length > 0 || data.courseCode.trim().length > 0, [data]);

  const handleExport = useCallback(
    async (format: CoverExportFormat) => {
      const node = captureRef.current;
      if (!node) return;
      setBusy(format);
      setError(null);
      setSavedMsg(null);
      try {
        const blob = format === 'pdf' ? await exportCoverPdf(node) : await exportCoverPng(node);
        const result = await saveCoverFile(blob, buildFileName(data), format);
        setLastSaved({ fileName: result.fileName, native: result.native });
        setSavedMsg(
          result.native ? `Saved to ${result.displayPath ?? result.fileName}` : `Downloaded ${result.fileName}`
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not generate the cover page.');
      } finally {
        setBusy(null);
      }
    },
    [data]
  );

  const handleOpen = useCallback(async () => {
    if (!lastSaved) return;
    try {
      await openToolsFile(lastSaved.fileName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the file.');
    }
  }, [lastSaved]);

  const handleOpenFolder = useCallback(async () => {
    try {
      await openToolsFolder();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the folder.');
    }
  }, []);

  return (
    <div className="px-4 lg:px-6 py-4 pb-28 lg:pb-8 max-w-6xl mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 cursor-pointer"
      >
        <ArrowLeft size={16} />
        All cover pages
      </button>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-5 order-2 lg:order-1">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{info.label}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{info.description}</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className={toolsLabel}>Course title</label>
              <div className="mt-1">
                <CourseSelect
                  courses={courses}
                  value={data.courseTitle}
                  onTextChange={(text) => update({ courseTitle: text })}
                  onSelectCourse={onSelectCourse}
                  inputClassName={toolsInput}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={toolsLabel}>Course code</label>
                <input
                  className={`${toolsInput} mt-1`}
                  value={data.courseCode}
                  onChange={(e) => update({ courseCode: e.target.value })}
                  placeholder="CSE 123"
                />
              </div>
              {info.workNoLabel && (
                <div>
                  <label className={toolsLabel}>{info.workNoLabel}</label>
                  <input
                    className={`${toolsInput} mt-1`}
                    value={data.workNo}
                    onChange={(e) => update({ workNo: e.target.value })}
                    placeholder="1"
                  />
                </div>
              )}
            </div>

            {info.workTitleLabel && (
              <div>
                <label className={toolsLabel}>{info.workTitleLabel}</label>
                <input
                  className={`${toolsInput} mt-1`}
                  value={data.workTitle}
                  onChange={(e) => update({ workTitle: e.target.value })}
                  placeholder={info.workTitleLabel}
                />
              </div>
            )}
          </div>

          {!isIndex && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                Submitted To
              </p>
              <div>
                <label className={toolsLabel}>Teacher name</label>
                <div className="mt-1">
                  <TeacherDirectorySelect
                    value={data.submittedTo.name}
                    onChange={(name) => updateParty({ name })}
                    onSelect={(t) =>
                      updateParty({
                        name: t.name,
                        designation: t.designation || '',
                        department: t.department || data.submittedTo.department,
                      })
                    }
                    allowCustom
                    placeholder="Search or type teacher name…"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={toolsLabel}>Designation</label>
                  <input
                    className={`${toolsInput} mt-1`}
                    value={data.submittedTo.designation}
                    onChange={(e) => updateParty({ designation: e.target.value })}
                    placeholder="Lecturer"
                  />
                </div>
                <div>
                  <label className={toolsLabel}>Department</label>
                  <input
                    className={`${toolsInput} mt-1`}
                    value={data.submittedTo.department}
                    onChange={(e) => updateParty({ department: e.target.value })}
                    placeholder="Computer Science and Engineering"
                  />
                </div>
              </div>
            </div>
          )}

          {isIndex && (
            <div>
              <label className={toolsLabel}>Teacher name</label>
              <div className="mt-1">
                <TeacherDirectorySelect
                  value={data.submittedTo.name}
                  onChange={(name) => updateParty({ name })}
                  onSelect={(t) =>
                    updateParty({
                      name: t.name,
                      designation: t.designation || data.submittedTo.designation,
                      department: t.department || data.submittedTo.department,
                    })
                  }
                  allowCustom
                  placeholder="Search or type teacher name…"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              Submitted By
            </p>
            <div>
              <label className={toolsLabel}>Student name</label>
              <input
                className={`${toolsInput} mt-1`}
                value={data.submittedBy.name}
                onChange={(e) => updateStudent({ name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={toolsLabel}>Student ID</label>
                <input
                  className={`${toolsInput} mt-1`}
                  value={data.submittedBy.studentId}
                  onChange={(e) => updateStudent({ studentId: e.target.value })}
                  placeholder="0112…"
                />
              </div>
              <div>
                <label className={toolsLabel}>Section</label>
                <input
                  className={`${toolsInput} mt-1`}
                  value={data.submittedBy.section}
                  onChange={(e) => updateStudent({ section: e.target.value })}
                  placeholder="A"
                />
              </div>
            </div>
            {!isIndex && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={toolsLabel}>Semester</label>
                  <input
                    className={`${toolsInput} mt-1`}
                    value={data.submittedBy.semester}
                    onChange={(e) => updateStudent({ semester: e.target.value })}
                    placeholder="Spring 2026"
                  />
                </div>
                <div>
                  <label className={toolsLabel}>Department</label>
                  <input
                    className={`${toolsInput} mt-1`}
                    value={data.submittedBy.department}
                    onChange={(e) => updateStudent({ department: e.target.value })}
                    placeholder="Computer Science and Engineering"
                  />
                </div>
              </div>
            )}
          </div>

          {!isIndex && (
            <div>
              <label className={toolsLabel}>Date of submission</label>
              <input
                type="date"
                className={`${toolsInput} mt-1`}
                value={data.dateOfSubmission}
                onChange={(e) => update({ dateOfSubmission: e.target.value })}
              />
            </div>
          )}

          {isIndex && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                Experiments
              </p>
              {data.experiments.map((row, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      className={`${toolsInput} w-14 text-center`}
                      value={row.no}
                      onChange={(e) => setExperiment(idx, { no: e.target.value })}
                      placeholder="#"
                    />
                    <input
                      className={`${toolsInput} flex-1`}
                      value={row.name}
                      onChange={(e) => setExperiment(idx, { name: e.target.value })}
                      placeholder="Experiment name"
                    />
                    <button
                      type="button"
                      onClick={() => removeExperiment(idx)}
                      className="w-9 h-9 shrink-0 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-red-600 cursor-pointer"
                      aria-label="Remove experiment"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className={toolsInput}
                      value={row.date}
                      onChange={(e) => setExperiment(idx, { date: e.target.value })}
                    />
                    <input
                      className={toolsInput}
                      value={row.remarks}
                      onChange={(e) => setExperiment(idx, { remarks: e.target.value })}
                      placeholder="Remarks"
                    />
                  </div>
                </div>
              ))}
              <button type="button" onClick={addExperiment} className={toolsBtnOutline}>
                <Plus size={16} />
                Add experiment
              </button>
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {savedMsg && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} />
              {savedMsg}
            </p>
          )}
          {savedMsg && lastSaved?.native && (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={handleOpen} className={toolsBtnOutline}>
                <Eye size={16} />
                View
              </button>
              <button type="button" onClick={handleOpenFolder} className={toolsBtnOutline}>
                <FolderOpen size={16} />
                Open folder
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              disabled={!canGenerate || busy !== null}
              className={toolsBtnPrimary}
            >
              {busy === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              {busy === 'pdf' ? 'Saving…' : 'Save PDF'}
            </button>
            <button
              type="button"
              onClick={() => handleExport('png')}
              disabled={!canGenerate || busy !== null}
              className={toolsBtnOutline}
            >
              {busy === 'png' ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              {busy === 'png' ? 'Saving…' : 'Save Image'}
            </button>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-4">
            <p className={`${toolsLabel} mb-2`}>Live preview</p>
            <div className="max-w-md mx-auto lg:mx-0">
              <CoverPreview data={data} />
            </div>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        style={{ position: 'fixed', left: 0, top: 0, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }}
      >
        <div style={{ width: COVER_DOC_WIDTH, height: COVER_DOC_HEIGHT }}>
          <CoverDocument ref={captureRef} data={data} />
        </div>
      </div>
    </div>
  );
};

export default CoverForm;
