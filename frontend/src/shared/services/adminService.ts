import { apiClient } from './apiClient';
import { UserProfile, Student, Course, Notice, Deadline, AcademicRecord, CourseGroup, Batch, TeacherProfile } from '@/shared/types/types';

export const adminService = {
  // Batches
  async fetchBatches(): Promise<Batch[]> {
    try {
      const result = await apiClient.get<Batch[]>('/batches');
      return result.data || [];
    } catch (e) {
      console.error('Error fetching batches:', e);
      return [];
    }
  },

  // Teacher Profiles
  /** Read-only global faculty directory. */
  async fetchTeacherProfiles(): Promise<TeacherProfile[]> {
    try {
      const result = await apiClient.get<TeacherProfile[]>('/teachers');
      return result.data || [];
    } catch (e) {
      console.error('Error fetching teacher profiles:', e);
      return [];
    }
  },

  // Section Pins
  async fetchSectionPin(batchId: string, section: string): Promise<string | null> {
    try {
      const result = await apiClient.get<{ pin_required: boolean; section_pin?: string | null }>(
        `/section-pin?batch_id=${encodeURIComponent(batchId)}&section=${encodeURIComponent(section)}`
      );
      return result.data?.section_pin ?? null;
    } catch (e) {
      console.error('Error fetching section pin:', e);
      return null;
    }
  },

  async updateSectionPin(
    batchId: string,
    section: string,
    pin: string
  ): Promise<{ ok: boolean; error?: string; section_pin?: string | null; pin_required?: boolean }> {
    const result = await apiClient.put<{ pin_required: boolean; section_pin?: string | null }>('/section-pin', {
      batch_id: batchId,
      section: String(section).trim().toUpperCase(),
      section_pin: pin.trim() || null,
    });
    return {
      ok: !result.error,
      error: result.error || undefined,
      section_pin: result.data?.section_pin,
      pin_required: result.data?.pin_required,
    };
  },

  async updateMyProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const { authService } = await import('./authService');
    return authService.updateProfile(updates);
  },

  async uploadAvatar(file: File): Promise<string> {
    const result = await apiClient.uploadAvatar(file);
    if (result.data?.url) return result.data.url;
    throw new Error(result.error || 'Upload failed');
  },

  // Courses
  async addCourse(course: Partial<Course>): Promise<Course | null> {
    const result = await apiClient.post<Course>('/courses', course);
    return result.data;
  },

  async updateCourse(id: string, updates: Partial<Course>): Promise<boolean> {
    const result = await apiClient.put(`/courses/${id}`, updates);
    return !result.error;
  },

  async deleteCourse(id: string): Promise<boolean> {
    const result = await apiClient.delete(`/courses/${id}`);
    return !result.error;
  },

  // Records
  async addRecord(record: Partial<AcademicRecord>): Promise<AcademicRecord | null> {
    const result = await apiClient.post<AcademicRecord>('/records', record);
    return result.data;
  },

  async updateRecord(id: string, updates: Partial<AcademicRecord>): Promise<boolean> {
    const result = await apiClient.put(`/records/${id}`, updates);
    return !result.error;
  },

  async deleteRecord(id: string): Promise<boolean> {
    const result = await apiClient.delete(`/records/${id}`);
    return !result.error;
  },

  // Attachments
  async addAttachment(attachment: any): Promise<boolean> {
    const result = await apiClient.post('/records/attachments', attachment);
    return !result.error;
  },

  async deleteAttachment(id: string): Promise<boolean> {
    const result = await apiClient.delete(`/attachments/${id}`);
    return !result.error;
  },

  // Notices
  async addNotice(notice: Partial<Notice>): Promise<Notice | null> {
    const result = await apiClient.post<Notice>('/notices', notice);
    return result.data;
  },

  async updateNotice(id: string, updates: Partial<Notice>): Promise<boolean> {
    const result = await apiClient.put(`/notices/${id}`, updates);
    return !result.error;
  },

  async deleteNotice(id: string): Promise<boolean> {
    const result = await apiClient.delete(`/notices/${id}`);
    return !result.error;
  },

  // Deadlines
  async addDeadline(deadline: Partial<Deadline>): Promise<Deadline | null> {
    const result = await apiClient.post<Deadline>('/deadlines', deadline);
    return result.data;
  },

  async updateDeadline(id: string, updates: Partial<Deadline>): Promise<boolean> {
    const result = await apiClient.put(`/deadlines/${id}`, updates);
    return !result.error;
  },

  async deleteDeadline(id: string): Promise<boolean> {
    const result = await apiClient.delete(`/deadlines/${id}`);
    return !result.error;
  },

  // Groups
  async updateGroups(batchId: string, courseId: string, section: string, groups: CourseGroup[]): Promise<boolean> {
    const qs = new URLSearchParams({
      batch_id: batchId,
      course_id: courseId,
      section: String(section).trim().toUpperCase(),
    });
    const payload = groups.map((g) => ({
      batch_id: batchId,
      course_id: courseId,
      section: String(section).trim().toUpperCase(),
      sub_section: g.sub_section,
      group_number: g.group_number,
      members: (g.members || [])
        .filter((m) => m.student_id?.trim() || m.name?.trim())
        .map((m) => ({
          student_id: (m.student_id || '').trim(),
          name: (m.name || '').trim(),
        })),
    }));
    const result = await apiClient.post(`/groups/upsert?${qs.toString()}`, payload);
    return !result.error;
  },

  // Students (PIN unlock + CR directory — `students` table, not `users`)
  async fetchSectionStudents(batchId: string, section: string): Promise<Student[]> {
    const sec = String(section).trim().toUpperCase();
    const result = await apiClient.get<Student[]>(
      `/students?batch_id=${encodeURIComponent(batchId)}&section=${encodeURIComponent(sec)}`
    );
    if (result.error) {
      throw new Error(result.error);
    }
    return result.data || [];
  },

  /** @deprecated Use fetchSectionStudents — kept for compatibility */
  async fetchStudents(batchId: string, section?: string): Promise<Student[]> {
    if (section) return this.fetchSectionStudents(batchId, section);
    try {
      const result = await apiClient.get<Student[]>(`/students?batch_id=${encodeURIComponent(batchId)}&section=A`);
      return result.data || [];
    } catch {
      return [];
    }
  },

  async addSectionStudent(student: {
    student_id: string;
    name: string;
    phone?: string;
    batch_id: string;
    section: string;
    sub_section?: string;
  }): Promise<Student | null> {
    const result = await apiClient.post<Student>('/students', {
      ...student,
      section: String(student.section).trim().toUpperCase(),
    });
    return result.error ? null : result.data;
  },

  async updateSectionStudent(id: string, updates: Partial<Student>): Promise<boolean> {
    const result = await apiClient.put(`/students/${id}`, updates);
    return !result.error;
  },

  async deleteSectionStudent(id: string): Promise<boolean> {
    const result = await apiClient.delete(`/students/${id}`);
    return !result.error;
  },

  async upsertSectionStudents(students: Partial<Student>[]): Promise<Student[]> {
    const payload = students.map((s) => ({
      student_id: s.student_id!,
      name: s.name!,
      phone: s.phone,
      batch_id: s.batch_id!,
      section: String(s.section).trim().toUpperCase(),
      sub_section: s.sub_section,
    }));
    const result = await apiClient.post<Student[]>('/students/upsert', payload);
    return result.data || [];
  },

  // Database Export/Import - TODO: Add backend endpoints
  async exportFullDatabase(batchId: string, section: string): Promise<any> {
    console.warn('Database export not implemented');
    return null;
  },

  async restoreFullDatabase(data: any): Promise<boolean> {
    console.warn('Database restore not implemented');
    return false;
  },
};