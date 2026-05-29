import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  Download,
  Layers,
  Loader2,
  Plus,
  Save,
  Shuffle,
  Trash2,
  Upload,
  UserPlus,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[2rem] border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
              <Users size={26} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Lab Group Manager
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                Section {section} • Random distribute • Excel • Autocomplete
              </p>
            </div>
          </div>
          {isSuccess && (
            <Chip
              label="Saved successfully"
              color="success"
              size="small"
              sx={{ fontWeight: 800, fontSize: '0.65rem' }}
            />
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

      {selectedCourseId && (
        <>
          {/* Action bar */}
          <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
            <Tooltip title="Shuffle section students evenly into 5 groups">
              <button
                type="button"
                onClick={handleRandomDistribute}
                className="inline-flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-md"
              >
                <Shuffle size={16} /> Random Distribute
              </button>
            </Tooltip>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-md"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Groups
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
              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-600/20 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
            >
              <Upload size={16} /> Import Excel
            </button>
            <button
              type="button"
              onClick={handleDownloadFormat}
              className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              <Download size={16} /> Export Template
            </button>
            <span className="ml-auto self-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {subRoster.length} students in {section}{groupTargetSub}
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

                return (
                  <div
                    key={gNum}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-4 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center text-xs font-black">
                          G{gNum}
                        </span>
                        <span className="text-[10px] font-black text-slate-500 uppercase">
                          Group {gNum}
                        </span>
                      </div>
                      <Chip
                        label={`${members.filter((m) => m.student_id || m.name).length}`}
                        size="small"
                        sx={{ height: 22, fontSize: '0.65rem', fontWeight: 900 }}
                      />
                    </div>

                    <div className="space-y-3">
                      {displayMembers.map((member, mIdx) => (
                        <Box
                          key={`${gNum}-${mIdx}`}
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                        >
                          <div className="flex items-start gap-1">
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
                      ))}
                      <button
                        type="button"
                        onClick={() => addMemberSlot(groupTargetSub, gNum)}
                        className="w-full py-2 flex items-center justify-center gap-1.5 text-[9px] font-black text-indigo-500 uppercase tracking-widest rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                      >
                        <Plus size={12} /> Add member
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
            <UserPlus size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] font-medium text-amber-800 dark:text-amber-200 leading-relaxed">
              Students see group lists under <strong>Groups</strong> in the section menu after
              unlocking with the section PIN. Use <strong>Random Distribute</strong> to split{' '}
              {section}
              {groupTargetSub} students evenly across all 5 groups, then save.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default GroupManagementView;
