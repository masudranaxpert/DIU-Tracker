import { CourseGroup, GroupMember, Student } from '@/shared/types/types';

export type DraftMember = { student_id: string; name: string };

export function normalizeGroupMembers(group: Record<string, unknown>): GroupMember[] {
  const raw = (group.members ?? group.group_members ?? []) as GroupMember[];
  return raw.map((m) => ({
    id: m.id ?? '',
    student_id: m.student_id ?? '',
    name: m.name ?? '',
  }));
}

export function normalizeCourseGroups(groups: unknown[]): CourseGroup[] {
  return (groups || []).map((g) => {
    const group = g as Record<string, unknown>;
    const members = normalizeGroupMembers(group);
    return {
      ...(group as CourseGroup),
      members,
    };
  });
}

export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Evenly distribute students across `groupCount` lab groups (round-robin after shuffle). */
export function distributeStudentsEvenly(
  students: Student[],
  subSection: string,
  groupCount = 5
): Map<number, DraftMember[]> {
  const filtered = students.filter(
    (s) => !s.sub_section || String(s.sub_section) === String(subSection)
  );
  const shuffled = shuffleArray(filtered);
  const buckets = new Map<number, DraftMember[]>();
  for (let i = 1; i <= groupCount; i++) buckets.set(i, []);

  shuffled.forEach((student, idx) => {
    const groupNum = (idx % groupCount) + 1;
    buckets.get(groupNum)!.push({
      student_id: student.student_id,
      name: student.name,
    });
  });

  return buckets;
}

export function buildGroupsUpsertPayload(
  batchId: string,
  courseId: string,
  section: string,
  groups: Array<{
    sub_section: string;
    group_number: number;
    members?: DraftMember[];
    group_members?: DraftMember[];
  }>
) {
  return groups.map((g) => ({
    batch_id: batchId,
    course_id: courseId,
    section,
    sub_section: g.sub_section,
    group_number: g.group_number,
    members: normalizeGroupMembers(g as Record<string, unknown>)
      .filter((m) => m.student_id.trim() || m.name.trim())
      .map((m) => ({
        student_id: m.student_id.trim(),
        name: m.name.trim(),
      })),
  }));
}

export function mergeSubSectionGroups(
  existing: CourseGroup[],
  subSection: string,
  distributed: Map<number, DraftMember[]>
): CourseGroup[] {
  const kept = existing.filter((g) => g.sub_section !== subSection);
  const created: CourseGroup[] = Array.from(distributed.entries()).map(([groupNum, members]) => ({
    id: '',
    course_id: '',
    section: '' as CourseGroup['section'],
    sub_section: subSection,
    group_number: groupNum,
    members: members.map((m) => ({ id: '', ...m })),
  }));
  return [...kept, ...created];
}
