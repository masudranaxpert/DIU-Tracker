import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  CircularProgress,
  IconButton,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle2,
  Download,
  Layers,
  Loader2,
  Plus,
  Save,
  Shuffle,
  Sparkles,
  Trash2,
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
import { initials, gradientFor } from '@/shared/lib/avatar';

interface Props {
  courses: Course[];
  batchId: string;
  section: Section;
}

const GROUP_COUNT = 5;

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 38,
    bgcolor: 'rgba(255,255,255,0.92)',
    borderRadius: '12px',
    fontSize: '0.72rem',
    fontWeight: 700,
    '& fieldset': { borderColor: 'rgba(99,102,241,0.14)' },
    '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.32)' },
    '&.Mui-focused fieldset': { borderColor: '#6366f1' },
  },
};

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

  const rosterById = useMemo(() => {
    const map = new Map<string, Student>();
    roster.forEach((s) => map.set(s.student_id.toLowerCase(), s));
    return map;
  }, [roster]);

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

  const updateMember = (
    sub: string,
    groupNum: number,
    memberIdx: number,
    patch: Partial<{ student_id: string; name: string }>
  ) => {
    setActiveCourseGroups((prev) => {
      let next = ensureGroup(prev, sub, groupNum);
      const gIdx = next.findIndex((g) => g.sub_section === sub && g.group_number === groupNum);
      const members = [...getGroupMembers(next[gIdx])];
      while (members.length <= memberIdx) {
        members.push({ id: '', student_id: '', name: '' });
      }
      members[memberIdx] = { ...members[memberIdx], ...patch };
      next[gIdx] = { ...next[gIdx], members };
      return next;
    });
  };

  const addMemberSlot = (sub: string, groupNum: number) => {
    setActiveCourseGroups((prev) => {
      let next = ensureGroup(prev, sub, groupNum);
      const gIdx = next.findIndex((g) => g.sub_section === sub && g.group_number === groupNum);
      const members = [...getGroupMembers(next[gIdx]), { id: '', student_id: '', name: '' }];
      next[gIdx] = { ...next[gIdx], members };
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
  const unassignedCount = Math.max(subRoster.length - assignedCount, 0);
  const filledGroups = activeCourseGroups.filter(
    (g) =>
      g.sub_section === groupTargetSub &&
      getGroupMembers(g).some((m) => m.student_id || m.name)
  ).length;

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-[2rem] lg:rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 lg:p-8 text-white shadow-xl shadow-indigo-900/20">
        <div className="absolute -top-16 -right-12 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-44 h-44 bg-violet-400/20 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <Users size={26} />
            </div>
            <div>
              <h2 className="text-lg lg:text-xl font-black uppercase tracking-tight">
                Lab Group Manager
              </h2>
              <p className="text-[10px] font-bold text-indigo-100/90 uppercase tracking-widest mt-1">
                Section {section} • Random • Excel • Autocomplete
              </p>
            </div>
          </div>
          {selectedCourseId && (
            <div className="grid grid-cols-3 gap-2.5 w-full lg:w-auto lg:min-w-[320px]">
              {[
                { label: 'Filled', val: `${filledGroups}/${GROUP_COUNT}` },
                { label: 'Assigned', val: assignedCount },
                { label: 'Left', val: unassignedCount },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2.5 text-center"
                >
                  <p className="text-lg font-black leading-none">{s.val}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200 mt-1">
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
          <div className="flex gap-3">
            {(['1', '2'] as const).map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setGroupTargetSub(sub)}
                className={`flex-1 py-3.5 rounded-2xl font-black text-xs transition-all ${
                  groupTargetSub === sub
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {section}{sub}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!selectedCourseId && (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30">
          <div className="w-16 h-16 rounded-3xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center mb-4">
            <Layers size={30} />
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
          <div className="sticky top-2 z-20 flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm">
            <Tooltip title={`Shuffle ${section}${groupTargetSub} students evenly into 5 groups`}>
              <button
                type="button"
                onClick={handleRandomDistribute}
                className="inline-flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-colors shadow-md cursor-pointer"
              >
                <Shuffle size={16} /> Random
              </button>
            </Tooltip>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`inline-flex items-center gap-2 px-5 py-3 font-black rounded-xl text-[10px] uppercase tracking-widest transition-colors shadow-md cursor-pointer ${
                isSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white'
              }`}
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isSuccess ? (
                <CheckCircle2 size={16} />
              ) : (
                <Save size={16} />
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
              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-600/20 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
            >
              <Upload size={16} /> Import
            </button>
            <button
              type="button"
              onClick={handleDownloadFormat}
              className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Download size={16} /> Template
            </button>
            <span className="ml-auto self-center inline-flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <UserCheck size={13} className="text-indigo-500" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {Array.from({ length: GROUP_COUNT }, (_, i) => i + 1).map((gNum) => {
                const group =
                  activeCourseGroups.find(
                    (g) => g.sub_section === groupTargetSub && g.group_number === gNum
                  ) ?? {
                    sub_section: groupTargetSub,
                    group_number: gNum,
                    members: [] as CourseGroup['members'],
                  };
                const members = getGroupMembers(group as CourseGroup);
                const displayMembers =
                  members.length > 0
                    ? members
                    : [{ id: '', student_id: '', name: '' }];

                const filledCount = members.filter((m) => m.student_id || m.name).length;
                return (
                  <div
                    key={gNum}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg transition-all overflow-hidden flex flex-col"
                  >
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-slate-800 dark:to-slate-800 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center text-xs font-black shadow-md shadow-indigo-600/20">
                          G{gNum}
                        </span>
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                          Group {gNum}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 bg-white/70 dark:bg-slate-900/60 rounded-lg text-[9px] font-black text-indigo-600 dark:text-indigo-300 uppercase">
                        {filledCount}
                      </span>
                    </div>

                    <div className="p-3 space-y-2.5 flex-1">
                      {displayMembers.map((member, mIdx) => {
                        const hasName = !!member.name;
                        return (
                        <Box
                          key={`${gNum}-${mIdx}`}
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={`w-9 h-9 mt-0.5 rounded-xl flex items-center justify-center shrink-0 text-white text-[10px] font-black shadow-sm ${
                                hasName
                                  ? `bg-gradient-to-br ${gradientFor(member.student_id || member.name)}`
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                              }`}
                            >
                              {hasName ? initials(member.name) : mIdx + 1}
                            </div>
                            <div className="flex-1 space-y-2 min-w-0">
                              <TextField
                                size="small"
                                fullWidth
                                placeholder="Student ID"
                                value={member.student_id}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const match = rosterById.get(val.trim().toLowerCase());
                                  updateMember(groupTargetSub, gNum, mIdx, {
                                    student_id: val,
                                    ...(match ? { name: match.name } : {}),
                                  });
                                }}
                                sx={fieldSx}
                              />
                              <Autocomplete
                                size="small"
                                options={subRoster.filter(
                                  (s) =>
                                    !assignedIds.has(s.student_id.toLowerCase()) ||
                                    s.student_id.toLowerCase() ===
                                      member.student_id.toLowerCase()
                                )}
                                getOptionLabel={(o) => o.name}
                                value={
                                  subRoster.find(
                                    (s) =>
                                      s.student_id === member.student_id &&
                                      s.name === member.name
                                  ) ||
                                  (member.name
                                    ? ({ student_id: member.student_id, name: member.name, id: '' } as Student)
                                    : null)
                                }
                                onChange={(_, student) => {
                                  if (student) {
                                    updateMember(groupTargetSub, gNum, mIdx, {
                                      student_id: student.student_id,
                                      name: student.name,
                                    });
                                  } else {
                                    updateMember(groupTargetSub, gNum, mIdx, { name: '' });
                                  }
                                }}
                                isOptionEqualToValue={(a, b) =>
                                  a.student_id === b.student_id
                                }
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="Search name…"
                                    sx={fieldSx}
                                  />
                                )}
                                slotProps={{
                                  paper: {
                                    sx: { fontSize: '0.75rem', fontWeight: 700 },
                                  },
                                }}
                              />
                            </div>
                            {displayMembers.length > 1 && (
                              <IconButton
                                size="small"
                                onClick={() => removeMember(groupTargetSub, gNum, mIdx)}
                                sx={{ mt: 0.5, color: '#94a3b8' }}
                              >
                                <Trash2 size={14} />
                              </IconButton>
                            )}
                          </div>
                        </Box>
                      );
                      })}
                      <button
                        type="button"
                        onClick={() => addMemberSlot(groupTargetSub, gNum)}
                        className="w-full py-2 flex items-center justify-center gap-1.5 text-[9px] font-black text-indigo-500 uppercase tracking-widest rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
                      >
                        <Plus size={12} /> Add member
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
            <Sparkles size={18} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed">
              Students view these lists under <strong>Group List</strong> in the section menu after
              unlocking with the section PIN. Tap <strong>Random</strong> to split {section}
              {groupTargetSub}&apos;s {subRoster.length} students evenly across all 5 groups, tweak with
              the name search, then <strong>Save</strong>.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default GroupManagementView;
