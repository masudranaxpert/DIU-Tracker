import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircularProgress, Tooltip } from '@mui/material';
import {
  CheckCircle2,
  Download,
  Layers,
  Loader2,
  Save,
  Shuffle,
  Sparkles,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';

import { Course, CourseGroup, Section, Student } from '@/shared/types/types';
import NativeSelect from './NativeSelect';
import { adminService } from '@/shared/services/adminService';
import { studentService } from '@/shared/services/studentService';
import { useDialogStore } from '@/shared/hooks/useDialog';
import {
  distributeStudentsEvenly,
  mergeSubSectionGroups,
  normalizeCourseGroups,
} from '@/shared/lib/groupUtils';
import { initials, avatarClass } from '@/shared/lib/avatar';
import GroupEditorCard from './groups/GroupEditorCard';

interface Props {
  courses: Course[];
  batchId: string;
  section: Section;
}

const GROUP_COUNT = 5;

function getGroupMembers(group: CourseGroup | { members?: CourseGroup['members'] }) {
  return group.members ?? [];
}

const GroupManagementView: React.FC<Props> = ({ courses, batchId, section }) => {
  const dialog = useDialogStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [groupTargetSub, setGroupTargetSub] = useState<'1' | '2'>('1');
  const [activeCourseGroups, setActiveCourseGroups] = useState<CourseGroup[]>([]);
  const [roster, setRoster] = useState<Student[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const labCourses = useMemo(
    () => courses.filter((c) => c.name.toLowerCase().includes('lab') || c.code.toLowerCase().includes('lab')),
    [courses]
  );
  const courseOptions = labCourses.length > 0 ? labCourses : courses;

  const subRoster = useMemo(
    () =>
      roster.filter(
        (s) => !s.sub_section || String(s.sub_section) === groupTargetSub
      ),
    [roster, groupTargetSub]
  );

  const loadRoster = useCallback(async () => {
    const data = await adminService.fetchSectionStudents(batchId, section);
    setRoster(data);
  }, [batchId, section]);

  const loadGroups = useCallback(
    async (courseId: string) => {
      setIsLoadingGroups(true);
      try {
        const groups = await studentService.fetchGroups(batchId, courseId, section);
        setActiveCourseGroups(normalizeCourseGroups(groups));
      } finally {
        setIsLoadingGroups(false);
      }
    },
    [batchId, section]
  );

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    if (selectedCourseId) loadGroups(selectedCourseId);
  }, [selectedCourseId, loadGroups]);

  const ensureGroup = (
    groups: CourseGroup[],
    sub: string,
    groupNum: number
  ): CourseGroup[] => {
    const next = [...groups];
    const idx = next.findIndex((g) => g.sub_section === sub && g.group_number === groupNum);
    if (idx === -1) {
      next.push({
        id: '',
        course_id: selectedCourseId,
        section,
        sub_section: sub,
        group_number: groupNum,
        members: [],
      });
    }
    return next;
  };

  const addMemberToGroup = (
    sub: string,
    groupNum: number,
    student: { student_id: string; name: string }
  ) => {
    setActiveCourseGroups((prev) => {
      // Remove the student from any other group in the same sub-section first.
      let next = prev.map((g) =>
        g.sub_section === sub
          ? {
              ...g,
              members: getGroupMembers(g).filter(
                (m) => m.student_id.toLowerCase() !== student.student_id.toLowerCase()
              ),
            }
          : g
      );
      next = ensureGroup(next, sub, groupNum);
      const gIdx = next.findIndex((g) => g.sub_section === sub && g.group_number === groupNum);
      next[gIdx] = {
        ...next[gIdx],
        members: [
          ...getGroupMembers(next[gIdx]),
          { id: '', student_id: student.student_id, name: student.name },
        ],
      };
      return next;
    });
  };

  const removeMember = (sub: string, groupNum: number, memberIdx: number) => {
    setActiveCourseGroups((prev) => {
      const gIdx = prev.findIndex((g) => g.sub_section === sub && g.group_number === groupNum);
      if (gIdx === -1) return prev;
      const next = [...prev];
      const members = getGroupMembers(next[gIdx]).filter((_, i) => i !== memberIdx);
      next[gIdx] = { ...next[gIdx], members };
      return next;
    });
  };

  const handleRandomDistribute = () => {
    if (subRoster.length === 0) {
      dialog.alert('No students found for this sub-section. Add students in the Students tab first.', 'No Roster');
      return;
    }
    const distributed = distributeStudentsEvenly(subRoster, groupTargetSub, GROUP_COUNT);
    setActiveCourseGroups((prev) => mergeSubSectionGroups(prev, groupTargetSub, distributed));
    dialog.alert(
      `Distributed ${subRoster.length} students evenly across ${GROUP_COUNT} groups for ${section}${groupTargetSub}.`,
      'Random Distribution'
    );
  };

  const handleSave = async () => {
    if (!selectedCourseId) return;
    setIsSaving(true);
    try {
      await adminService.updateGroups(batchId, selectedCourseId, section, activeCourseGroups);
      await loadGroups(selectedCourseId);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      dialog.alert(`Failed to save groups: ${message}`, 'Save Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadFormat = async () => {
    const wsData: (string | number)[][] = [
      ['Sub Section', 'Group Number', 'Student ID', 'Student Name'],
      ['1', '1', '221-15-1234', 'John Doe'],
      ['1', '2', '221-15-1235', 'Jane Doe'],
    ];

    if (activeCourseGroups.length > 0) {
      wsData.length = 1;
      activeCourseGroups.forEach((group) => {
        getGroupMembers(group).forEach((member) => {
          if (member.student_id || member.name) {
            wsData.push([
              group.sub_section,
              group.group_number.toString(),
              member.student_id,
              member.name,
            ]);
          }
        });
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lab Groups');
    const fileName = `Lab_Groups_${section}.xlsx`;

    if (Capacitor.isNativePlatform()) {
      try {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const cacheFile = await Filesystem.writeFile({
          path: fileName,
          data: wbout,
          directory: Directory.Cache,
          recursive: true,
        });
        try {
          await Filesystem.writeFile({
            path: `Download/${fileName}`,
            data: wbout,
            directory: Directory.ExternalStorage,
            recursive: true,
          });
          dialog.alert(`Excel file saved to Download/${fileName}`, 'Export Success');
          try {
            await LocalNotifications.schedule({
              notifications: [{ title: 'Export Successful', body: fileName, id: Date.now() }],
            });
          } catch {
            /* optional */
          }
        } catch {
          await Share.share({ title: 'Save Excel File', files: [cacheFile.uri] });
        }
      } catch {
        XLSX.writeFile(wb, fileName);
      }
    } else {
      XLSX.writeFile(wb, fileName);
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const newGroupsMap = new Map<string, CourseGroup>();

        data.forEach((row) => {
          const sub = row['Sub Section']?.toString();
          const gNum = parseInt(String(row['Group Number'] ?? ''), 10);
          const sId = row['Student ID']?.toString() || '';
          const sName = row['Student Name']?.toString() || '';

          if (sub && !Number.isNaN(gNum) && (sId || sName)) {
            const key = `${sub}-${gNum}`;
            if (!newGroupsMap.has(key)) {
              newGroupsMap.set(key, {
                id: '',
                course_id: selectedCourseId,
                section,
                sub_section: sub,
                group_number: gNum,
                members: [],
              });
            }
            newGroupsMap.get(key)!.members.push({
              id: '',
              student_id: sId,
              name: sName,
            });
          }
        });

        const imported = Array.from(newGroupsMap.values());
        if (imported.length > 0) {
          setActiveCourseGroups(imported);
          dialog.alert('Successfully imported groups from Excel!', 'Import Success');
        } else {
          dialog.alert('No valid group data found. Use the provided format.', 'Data Error');
        }
      } catch {
        dialog.alert('Failed to parse Excel file.', 'Parse Error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    activeCourseGroups
      .filter((g) => g.sub_section === groupTargetSub)
      .forEach((g) =>
        getGroupMembers(g).forEach((m) => {
          if (m.student_id) ids.add(m.student_id.toLowerCase());
        })
      );
    return ids;
  }, [activeCourseGroups, groupTargetSub]);

  const selectedCourse = courseOptions.find((c) => c.id === selectedCourseId);
  const assignedCount = assignedIds.size;
  const availableRoster = useMemo(
    () => subRoster.filter((s) => !assignedIds.has(s.student_id.toLowerCase())),
    [subRoster, assignedIds]
  );
  const unassignedStudents = availableRoster;
  const unassignedCount = availableRoster.length;
  const filledGroups = activeCourseGroups.filter(
    (g) =>
      g.sub_section === groupTargetSub &&
      getGroupMembers(g).some((m) => m.student_id || m.name)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-base lg:text-lg font-bold text-slate-900 dark:text-white">
                Lab Group Manager
              </h2>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                Section {section} — assign students into lab groups
              </p>
            </div>
          </div>
          {selectedCourseId && (
            <div className="flex items-center gap-2.5 w-full lg:w-auto">
              {[
                { label: 'Filled', val: `${filledGroups}/${GROUP_COUNT}` },
                { label: 'Assigned', val: assignedCount },
                { label: 'Left', val: unassignedCount },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex-1 lg:flex-initial lg:min-w-[80px] rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 px-3 py-2 text-center"
                >
                  <p className="text-base font-bold text-slate-900 dark:text-white leading-none tabular-nums">
                    {s.val}
                  </p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NativeSelect
          label="Lab Course"
          placeholder="Select lab course"
          options={courseOptions.map((c) => ({ id: c.id, name: `${c.code} — ${c.name}` }))}
          value={selectedCourseId}
          onChange={(val) => {
            setSelectedCourseId(String(val));
            setActiveCourseGroups([]);
          }}
          icon={<Layers size={16} />}
        />
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
            Sub-Section
          </label>
          <div className="flex gap-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(['1', '2'] as const).map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setGroupTargetSub(sub)}
                className={`flex-1 py-2.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                  groupTargetSub === sub
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {section}{sub}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!selectedCourseId && (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30">
          <div className="w-14 h-14 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center mb-4">
            <Layers size={26} />
          </div>
          <h3 className="text-xs font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">
            Select a lab course to begin
          </h3>
          <p className="text-[10px] font-medium text-slate-400 mt-1.5 max-w-xs">
            Choose a course above, then randomly distribute or manually assign students into 5 groups.
          </p>
        </div>
      )}

      {selectedCourseId && (
        <>
          {/* Sticky action bar */}
          <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700">
            <Tooltip title={`Shuffle ${section}${groupTargetSub} students evenly into 5 groups`}>
              <button
                type="button"
                onClick={handleRandomDistribute}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
              >
                <Shuffle size={15} /> Random
              </button>
            </Tooltip>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold rounded-lg text-[10px] uppercase tracking-widest text-white transition-colors cursor-pointer disabled:opacity-60 ${
                isSuccess ? 'bg-emerald-600' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSaving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : isSuccess ? (
                <CheckCircle2 size={15} />
              ) : (
                <Save size={15} />
              )}
              {isSuccess ? 'Saved' : 'Save Groups'}
            </button>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleExcelImport}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Upload size={15} className="text-indigo-500" /> Import Excel
            </button>
            <button
              type="button"
              onClick={handleDownloadFormat}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Download size={15} className="text-indigo-500" /> Template
            </button>
            <span className="ml-auto self-center inline-flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              <UserCheck size={13} className="text-slate-400" />
              {selectedCourse?.code} • {subRoster.length} in {section}{groupTargetSub}
            </span>
          </div>

          {isLoadingGroups ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <CircularProgress size={36} sx={{ color: '#6366f1' }} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Loading groups…
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: GROUP_COUNT }, (_, i) => i + 1).map((gNum) => {
                const group = activeCourseGroups.find(
                  (g) => g.sub_section === groupTargetSub && g.group_number === gNum
                );
                const members = group ? getGroupMembers(group) : [];
                return (
                  <GroupEditorCard
                    key={gNum}
                    groupNumber={gNum}
                    members={members}
                    available={availableRoster}
                    onAdd={(student) => addMemberToGroup(groupTargetSub, gNum, student)}
                    onRemove={(idx) => removeMember(groupTargetSub, gNum, idx)}
                  />
                );
              })}
            </div>
          )}

          {/* Unassigned pool */}
          {unassignedStudents.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 lg:p-5">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck size={15} className="text-slate-400" />
                <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Unassigned • {unassignedStudents.length}
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {unassignedStudents.map((s) => (
                  <span
                    key={s.student_id}
                    className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <span
                      className={`w-6 h-6 rounded-md ${avatarClass} flex items-center justify-center text-[8px] font-bold`}
                    >
                      {initials(s.name)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                      {s.name}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">{s.student_id}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <Sparkles size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Add students from the roster or manually inside any group — they&apos;re removed from other
              groups automatically. Tap <strong className="text-slate-700 dark:text-slate-200">Random</strong> to auto-split {section}
              {groupTargetSub}&apos;s {subRoster.length} students, then <strong className="text-slate-700 dark:text-slate-200">Save</strong>.
              Students see the result under <strong className="text-slate-700 dark:text-slate-200">Group List</strong> after entering the section PIN.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default GroupManagementView;
