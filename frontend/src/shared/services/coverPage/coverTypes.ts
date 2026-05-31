export type CoverKind = 'assignment' | 'lab' | 'final' | 'index';

export const UNIVERSITY_NAME = 'Daffodil International University';
export const COVER_FOOTER = 'diutracker.com';

export const COVER_ASSETS = {
  header: `${import.meta.env.BASE_URL}cover/doc-header-logo.png`,
  watermark: `${import.meta.env.BASE_URL}cover/doc-watermark-logo.png`,
};

export const HEADER_LOGO_RATIO = 265 / 1000;

export interface CoverParty {
  name: string;
  designation: string;
  department: string;
}

export interface CoverStudent {
  name: string;
  studentId: string;
  section: string;
  semester: string;
  department: string;
}

export interface IndexRow {
  no: string;
  name: string;
  date: string;
  remarks: string;
}

export interface CoverData {
  kind: CoverKind;
  courseCode: string;
  courseTitle: string;
  workNo: string;
  workTitle: string;
  submittedTo: CoverParty;
  submittedBy: CoverStudent;
  dateOfSubmission: string;
  experiments: IndexRow[];
}

export const COVER_DEFAULTS = {
  department: 'Computer Science and Engineering',
};

export interface CoverKindInfo {
  id: CoverKind;
  label: string;
  description: string;
  title: string;
  workNoLabel: string;
  workTitleLabel: string;
}

export const COVER_KINDS: CoverKindInfo[] = [
  {
    id: 'assignment',
    label: 'Assignment',
    description: 'Clean assignment cover with course details and topic name.',
    title: 'ASSIGNMENT',
    workNoLabel: '',
    workTitleLabel: 'Topic Name',
  },
  {
    id: 'lab',
    label: 'Lab Report',
    description: 'Lab report cover with experiment number and name.',
    title: 'LAB REPORT',
    workNoLabel: 'Experiment No',
    workTitleLabel: 'Experiment Name',
  },
  {
    id: 'final',
    label: 'Final Lab Report',
    description: 'Final lab report cover for end-of-semester submission.',
    title: 'FINAL LAB REPORT',
    workNoLabel: 'Experiment No',
    workTitleLabel: 'Experiment Name',
  },
  {
    id: 'index',
    label: 'Lab Report Index',
    description: 'Numbered index of all experiments for a final report.',
    title: 'LAB REPORT INDEX',
    workNoLabel: '',
    workTitleLabel: '',
  },
];

export function getCoverKindInfo(kind: CoverKind): CoverKindInfo {
  return COVER_KINDS.find((k) => k.id === kind) ?? COVER_KINDS[0];
}

export function createEmptyCoverData(kind: CoverKind): CoverData {
  return {
    kind,
    courseCode: '',
    courseTitle: '',
    workNo: '',
    workTitle: '',
    submittedTo: { name: '', designation: '', department: COVER_DEFAULTS.department },
    submittedBy: { name: '', studentId: '', section: '', semester: '', department: COVER_DEFAULTS.department },
    dateOfSubmission: new Date().toISOString().slice(0, 10),
    experiments: [{ no: '1', name: '', date: '', remarks: '' }],
  };
}

export function formatCoverDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
