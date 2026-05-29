import type { Student } from '@/shared/types/types';

/** One search box matches student ID, name, phone, and group (sub_section). */
export function matchesStudentDirectorySearch(student: Student, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const id = student.student_id.toLowerCase();
  const name = student.name.toLowerCase();
  const phone = student.phone?.toLowerCase() ?? '';
  const group = student.sub_section?.trim() ?? '';
  const groupLower = group.toLowerCase();

  if (id.includes(q) || name.includes(q) || phone.includes(q)) return true;
  if (!group) return false;

  return (
    groupLower.includes(q) ||
    `g${groupLower}`.includes(q) ||
    `group ${groupLower}`.includes(q) ||
    `group${groupLower}`.includes(q)
  );
}
