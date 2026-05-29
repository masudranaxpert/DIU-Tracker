import { apiClient } from '@/shared/services/apiClient';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface StudentAdminRow {
  id: string;
  student_id: string;
  name: string;
  phone?: string | null;
  batch_id?: string | null;
  section?: string | null;
  sub_section?: string | null;
  batch_name?: string | null;
  cr_names: string[];
  created_at: string;
}

export interface TeacherAdminRow {
  id: string;
  name: string;
  designation?: string | null;
  department?: string | null;
  contact_number?: string | null;
  email?: string | null;
  room_no?: string | null;
  profile_url?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

export interface TeacherScrapeJobStatus {
  job_id?: string | null;
  status: string;
  phase: string;
  current: number;
  total: number;
  created: number;
  updated: number;
  message: string;
  errors: string[];
  started_at?: string | null;
  finished_at?: string | null;
}

export interface QbankPdfRow {
  question_external_id: number;
  pdf_url: string;
  department?: string | null;
  course_name?: string | null;
  semester_name?: string | null;
  exam_type?: string | null;
  submissions_count?: number;
  scraped_at?: string | null;
}

export interface QbankPdfFilters {
  departments: string[];
  courses: string[];
  semesters: string[];
  exam_types: string[];
}

export interface QbankScrapeJobStatus {
  job_id?: string | null;
  status: string;
  phase: string;
  current: number;
  total: number;
  created: number;
  updated: number;
  message: string;
  errors: string[];
  started_at?: string | null;
  finished_at?: string | null;
}

export interface CourseListAdminRow {
  id: string;
  code: string;
  name: string;
  default_credit: number;
  created_at: string;
}

export interface CRAdminRow {
  id: string;
  email: string;
  full_name: string | null;
  batch_id: string | null;
  section: string | null;
  is_active: boolean;
  created_at?: string | null;
  batch_name?: string | null;
}

export interface FeedbackAdminRow {
  id: string;
  batch_id: string;
  section: string;
  message: string;
  category: string;
  rating?: number | null;
  is_anonymous?: boolean;
  author_name?: string | null;
  author_session?: string | null;
  batch_name?: string | null;
  created_at: string;
}

type ListParams = {
  batch_id?: string;
  section?: string;
  q?: string;
  page?: number;
  limit?: number;
};

function buildQuery(params: ListParams): string {
  const q = new URLSearchParams();
  if (params.batch_id) q.set('batch_id', params.batch_id);
  if (params.section) q.set('section', params.section);
  if (params.q) q.set('q', params.q);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export interface BatchAdminStats {
  records: number;
  attachments: number;
  drive_attachments: number;
  courses: number;
  groups: number;
  group_members: number;
  notices: number;
  deadlines: number;
  students: number;
  feedbacks: number;
}

export interface BatchAdminRow {
  id: string;
  name: string;
  created_at: string;
  stats: BatchAdminStats;
}

export interface BatchPurgeJob {
  job_id: string;
  batch_id: string;
  batch_name: string;
  include_drive: boolean;
  status: 'queued' | 'running' | 'completed' | 'failed' | string;
  phase: string;
  current: number;
  total: number;
  drive_deleted: number;
  drive_skipped: number;
  drive_failed: number;
  db_stats?: Record<string, number> | null;
  message: string;
  errors: string[];
  started_at?: string | null;
  finished_at?: string | null;
}

export const adminPortalService = {
  async fetchBatches(params: { page?: number; limit?: number } = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    const result = await apiClient.adminGet<Paginated<BatchAdminRow>>(
      `/admin/portal/batches${qs ? `?${qs}` : ''}`
    );
    return result.data ?? { items: [], total: 0, page: 1, limit: 10, total_pages: 1 };
  },

  async createBatch(name: string) {
    const result = await apiClient.adminPost<BatchAdminRow>('/admin/portal/batches', { name });
    if (result.error) throw new Error(result.error);
    return result.data;
  },

  async deleteBatch(batchId: string) {
    const result = await apiClient.adminDelete(`/admin/portal/batches/${batchId}`);
    if (result.error) throw new Error(result.error);
  },

  async startBatchPurge(batchId: string, includeDrive: boolean) {
    const result = await apiClient.adminPost<BatchPurgeJob>(
      `/admin/portal/batches/${batchId}/purge`,
      { include_drive: includeDrive }
    );
    if (result.error || !result.data) throw new Error(result.error || 'Failed to start purge');
    return result.data;
  },

  async getBatchPurgeJob(jobId: string) {
    const result = await apiClient.adminGet<BatchPurgeJob>(
      `/admin/portal/batches/purge-jobs/${jobId}`
    );
    if (result.error || !result.data) throw new Error(result.error || 'Job not found');
    return result.data;
  },
  async fetchStudents(params: ListParams = {}) {
    const result = await apiClient.adminGet<Paginated<StudentAdminRow>>(
      `/admin/portal/students${buildQuery(params)}`
    );
    return result.data ?? { items: [], total: 0, page: 1, limit: 20, total_pages: 1 };
  },

  async fetchTeachers(params: ListParams = {}) {
    const result = await apiClient.adminGet<Paginated<TeacherAdminRow>>(
      `/admin/portal/teacher-profiles${buildQuery(params)}`
    );
    return result.data ?? { items: [], total: 0, page: 1, limit: 20, total_pages: 1 };
  },

  async deleteAllTeachers() {
    const result = await apiClient.adminDelete('/admin/portal/teacher-profiles');
    if (result.error) throw new Error(result.error);
    return result.data;
  },

  async startTeacherScrape() {
    const result = await apiClient.adminPost<{ job_id: string; message: string }>(
      '/admin/portal/teacher-profiles/scrape',
      {}
    );
    if (result.error) throw new Error(result.error);
    return result.data;
  },

  async getTeacherScrapeStatus() {
    const result = await apiClient.adminGet<TeacherScrapeJobStatus>(
      '/admin/portal/teacher-profiles/scrape/status'
    );
    return result.data ?? { status: 'idle', phase: '', current: 0, total: 0, created: 0, updated: 0, message: '', errors: [] };
  },

  async fetchQbankPdfFilters() {
    const result = await apiClient.adminGet<QbankPdfFilters>('/qbank/pdf-filters');
    if (result.error) throw new Error(result.error);
    return result.data ?? { departments: [], courses: [], semesters: [], exam_types: [] };
  },

  async fetchQbankPdfs(params: { q?: string; page?: number; limit?: number; department?: string; course?: string; semester?: string; exam_type?: string } = {}) {
    const q = new URLSearchParams();
    if (params.q?.trim()) q.set('q', params.q.trim());
    if (params.department) q.set('department', params.department);
    if (params.course) q.set('course', params.course);
    if (params.semester) q.set('semester', params.semester);
    if (params.exam_type) q.set('exam_type', params.exam_type);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    const result = await apiClient.adminGet<Paginated<QbankPdfRow>>(`/qbank/pdfs${qs ? `?${qs}` : ''}`);
    if (result.error) throw new Error(result.error);
    return result.data ?? { items: [], total: 0, page: 1, limit: 12, total_pages: 1 };
  },

  async startQbankScrape(maxPages = 60) {
    const result = await apiClient.adminPost<{ job_id: string; message: string }>(
      `/admin/portal/qbank/scrape?max_pages=${maxPages}`,
      {}
    );
    if (result.error) throw new Error(result.error);
    return result.data;
  },

  async getQbankScrapeStatus() {
    const result = await apiClient.adminGet<QbankScrapeJobStatus>('/admin/portal/qbank/scrape/status');
    if (result.error) throw new Error(result.error);
    return result.data ?? {
      status: 'idle',
      phase: '',
      current: 0,
      total: 0,
      created: 0,
      updated: 0,
      message: 'No sync running',
      errors: [],
    };
  },

  async deleteAllQbankPdfs() {
    const result = await apiClient.adminDelete('/admin/portal/qbank/pdfs');
    if (result.error) throw new Error(result.error);
    return result.data;
  },

  async createTeacher(payload: {
    name: string;
    designation?: string | null;
    department?: string | null;
    contact_number?: string | null;
    email?: string | null;
    room_no?: string | null;
  }) {
    const result = await apiClient.adminPost<TeacherAdminRow>('/teachers', payload);
    if (result.error) throw new Error(result.error);
    return result.data;
  },

  async updateTeacher(
    id: string,
    updates: {
      name?: string;
      designation?: string | null;
      department?: string | null;
      contact_number?: string | null;
      email?: string | null;
      room_no?: string | null;
    }
  ) {
    const result = await apiClient.adminPut<TeacherAdminRow>(`/teachers/${id}`, updates);
    if (result.error) throw new Error(result.error);
    return result.data;
  },

  async deleteTeacher(id: string) {
    const result = await apiClient.adminDelete(`/teachers/${id}`);
    if (result.error) throw new Error(result.error);
  },

  async uploadTeacherPhoto(teacherId: string, file: File) {
    const result = await apiClient.adminUploadTeacherPhoto(teacherId, file);
    if (result.error) throw new Error(result.error);
    return result.data?.url ?? '';
  },

  async fetchCourseCatalog(params: { q?: string; page?: number; limit?: number } = {}) {
    const q = new URLSearchParams();
    if (params.q?.trim()) q.set('q', params.q.trim());
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    const result = await apiClient.adminGet<Paginated<CourseListAdminRow>>(
      `/admin/portal/course-list${qs ? `?${qs}` : ''}`
    );
    return result.data ?? { items: [], total: 0, page: 1, limit: 20, total_pages: 1 };
  },

  async createCourseCatalogItem(payload: { code: string; name: string; default_credit?: number }) {
    const result = await apiClient.adminPost<CourseListAdminRow>('/admin/portal/course-list', payload);
    if (result.error) throw new Error(result.error);
    return result.data;
  },

  async deleteCourseCatalogItem(id: string) {
    const result = await apiClient.adminDelete(`/admin/portal/course-list/${id}`);
    if (result.error) throw new Error(result.error);
  },

  async fetchCRs(params: ListParams & { is_active?: boolean } = {}) {
    const q = new URLSearchParams();
    if (params.batch_id) q.set('batch_id', params.batch_id);
    if (params.section) q.set('section', params.section);
    if (params.q) q.set('q', params.q);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.is_active !== undefined) q.set('is_active', String(params.is_active));
    const qs = q.toString();
    const result = await apiClient.adminGet<Paginated<CRAdminRow>>(
      `/admin/portal/crs${qs ? `?${qs}` : ''}`
    );
    return result.data ?? { items: [], total: 0, page: 1, limit: 10, total_pages: 1 };
  },

  async fetchFeedbacks(params: ListParams = {}) {
    const result = await apiClient.adminGet<Paginated<FeedbackAdminRow>>(
      `/admin/portal/feedbacks${buildQuery(params)}`
    );
    return result.data ?? { items: [], total: 0, page: 1, limit: 20, total_pages: 1 };
  },
};
