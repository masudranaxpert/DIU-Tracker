import { SECTIONS } from '@/shared/utils/constants';
import type { Section } from '@/shared/types/types';

/** A–Z section options for filters and forms */
export const SECTION_OPTIONS: { value: Section; label: string }[] = SECTIONS.map((s) => ({
  value: s,
  label: s,
}));
