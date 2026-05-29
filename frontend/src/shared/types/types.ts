export type Section = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';
export type Theme = 'light' | 'dark';

export interface Batch {
  id: string;
  name: string;
  created_at?: string;
}

export enum EntryType {
  EXTRA_CLASS = 'EXTRA CLASS',
  MATERIAL = 'MATERIAL',
  CT = 'CT-Resources',
  MID = 'MID-Resources',
  FINAL = 'FINAL-Resources',
  ASSIGNMENT = 'ASSIGNMENT-Resources',
  LAB_REPORT = 'LAB REPORT-Resources',
  PROJECT_REPORT = 'PROJECT REPORT-Resources'
}

export interface GroupMember {
  id: string;
  student_id: string;
  name: string;
}

export interface CourseGroup {
  id: string;
  course_id: string;
  section: Section;
  sub_section: string; // '1' or '2'
  group_number: number; // 1-5
  members: GroupMember[];
}

export interface UserProfile {
  id: string;
  email: string;
  student_id?: string;
  is_cr: boolean;
  is_active: boolean;
  is_verified: boolean;
  batch_id: string;
  section: Section;
  sub_section?: string;
  full_name?: string;
  avatar_url?: string;
  facebook_url?: string;
  whatsapp_number?: string;
  telegram_username?: string;
  telegram_chat_id?: string;
}

export interface CourseListItem {
  id: string;
  code: string;
  name: string;
  default_credit: number;
  created_at?: string;
}

export interface Course {
  id: string;
  batch_id: string;
  course_list_id: string;
  code: string;
  name: string;
  teacher: string;
  teacher2?: string;
  section?: Section;
  sub_section?: string;
  credit: number;
}

export interface AcademicRecord {
  id: string;
  batch_id: string;
  course_id: string;
  section: Section;
  sub_section?: string;
  date: string;
  type: EntryType;
  title: string;
  description?: string;
  link?: string;
  link_two?: string;
  topics?: string;
  time?: string;
  room?: string;
  created_by?: string;
  created_at?: string;
  attachments?: Attachment[];
  views?: number;
  uploader?: {
    full_name: string;
    avatar_url: string;
  };
}

export interface Attachment {
  id: string;
  record_id: string;
  name: string;
  type: 'pdf' | 'image' | 'video' | 'link' | 'word' | 'excel' | 'pptx' | 'zip' | 'other';
  url: string;
  public_id?: string;
  rclone_account_id?: string | null;
  created_at?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'urgent';
  timestamp: string;
  sortDate: number;
  isRead: boolean;
  courseId?: string;
  courseName?: string;
  courseCode?: string;
  recordType?: EntryType | string;
  time?: string;
  room?: string;
}

export interface Notice {
  id: string;
  batch_id: string;
  course_id?: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  expires_at?: string;
  created_by?: string;
  section?: Section;
  sub_section?: string;
  uploader?: {
    full_name: string;
    avatar_url: string;
  };
}

export interface Deadline {
  id: string;
  batch_id: string;
  course_id: string | null;
  type: string;
  title: string;
  date: string;
  description?: string;
  section?: Section;
  sub_section?: string;
  created_at?: string;
  created_by?: string;
}

export interface AppState {
  batches: Batch[];
  courses: Course[];
  records: AcademicRecord[];
  notices: Notice[];
  deadlines: Deadline[];
  selectedBatch: string | null;
  selectedSection: Section | null;
  user: UserProfile | null;
  isLoading: boolean;
  theme: Theme;
}

export interface TeacherProfile {
  id: string;
  name: string;
  designation?: string;
  contact_number?: string;
  email?: string;
  room_no?: string;
  created_at?: string;
}

export interface Student {
  id: string;
  student_id: string;
  name: string;
  phone?: string;
  batch_id?: string | null;
  section?: Section | string | null;
  sub_section?: string | null;
  section_pin?: string | null;
  created_at?: string;
}

export interface Feedback {
  id: string;
  batch_id: string;
  section: Section;
  sub_section?: string;
  course_id?: string;
  type: 'course' | 'general';
  rating: number;
  comment?: string;
  message?: string;
  category?: string;
  is_anonymous?: boolean;
  author_name?: string;
  author_session?: string;
  student_id?: string;
  created_at: string;
}
