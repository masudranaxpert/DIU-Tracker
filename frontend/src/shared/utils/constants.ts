
import { Section, EntryType } from '@/shared/types/types';

export const SECTIONS: Section[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

export const ENTRY_TYPE_COLORS: Record<any, string> = {
  [EntryType.EXTRA_CLASS]: 'bg-blue-100 text-blue-700 border-blue-200',
  [EntryType.MATERIAL]: 'bg-green-100 text-green-700 border-green-200',
  [EntryType.CT]: 'bg-amber-100 text-amber-700 border-amber-200',
  [EntryType.MID]: 'bg-purple-100 text-purple-700 border-purple-200',
  [EntryType.FINAL]: 'bg-red-100 text-red-700 border-red-200',
  [EntryType.ASSIGNMENT]: 'bg-orange-100 text-orange-700 border-orange-200',
  [EntryType.LAB_REPORT]: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  [EntryType.PROJECT_REPORT]: 'bg-rose-100 text-rose-700 border-rose-200',
};
