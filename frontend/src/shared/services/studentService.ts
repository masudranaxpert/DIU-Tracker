import { apiClient } from './apiClient';
import { UserProfile } from '@/shared/types/types';

export type CrProfileForLock = {
  is_cr?: boolean;
  is_active?: boolean;
  batch_id?: string;
  section?: string;
} | null;

const STUDENT_SESSION_KEY = 'student_session';
const SESSION_EVENT = 'student-session-changed';

export interface StudentSession {
  id: string;
  student_id: string;
  name: string;
  phone?: string | null;
  batch_id: string | null;
  section: string | null;
  sub_section?: string | null;
  section_pin: string | null;
}

export interface StudentUnlockPayload {
  batch_id: string;
  section: string;
  pin: string;
  student_id: string;
  name?: string;
  phone?: string;
  sub_section?: string;
}

interface Batch {
  id: string;
  name: string;
  year?: number;
}

interface GroupMember {
  id: string;
  student_id: string;
  name: string;
}

interface CourseGroup {
  id: string;
  course_id: string;
  section: string;
  sub_section: string;
  group_number: number;
  members: GroupMember[];
}

function dispatchSessionChange() {
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

function readSession(): StudentSession | null {
  try {
    const raw = localStorage.getItem(STUDENT_SESSION_KEY);
    return raw ? (JSON.parse(raw) as StudentSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: StudentSession | null) {
  if (session) {
    localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STUDENT_SESSION_KEY);
  }
  dispatchSessionChange();
}

function clearPinStorage(batchId: string, section: string) {
  localStorage.removeItem(`section_pin_${batchId}_${section}`);
  localStorage.removeItem(`pin_attempts_${batchId}_${section}`);
  localStorage.removeItem(`pin_lockout_${batchId}_${section}`);
}

export const studentService = {
  subscribeSession(listener: () => void) {
    const handler = () => listener();
    window.addEventListener(SESSION_EVENT, handler);
    return () => window.removeEventListener(SESSION_EVENT, handler);
  },

  getSession(): StudentSession | null {
    return readSession();
  },

  isLoggedIn(): boolean {
    return !!readSession();
  },

  hasAccessToSection(batchId: string, section: string): boolean {
    const s = readSession();
    return !!(
      s &&
      s.batch_id === batchId &&
      s.section === section &&
      s.section_pin
    );
  },

  async fetchBatches(): Promise<Batch[]> {
    try {
      const result = await apiClient.get<Batch[]>('/batches');
      return result.data || [];
    } catch (e) {
      console.error('Error fetching batches:', e);
      return [];
    }
  },

  async addBatch(name: string): Promise<Batch | null> {
    const result = await apiClient.post<Batch>('/batches', { name });
    return result.data;
  },

  async getSectionCRs(batchId: string, section: string): Promise<UserProfile[]> {
    try {
      const result = await apiClient.get<UserProfile[]>(`/batches/${batchId}/sections/${section}/crs`);
      return result.data || [];
    } catch (e) {
      console.error('Error fetching section CRs:', e);
      return [];
    }
  },

  async fetchSectionPinStatus(batchId: string, section: string): Promise<{ pin_required: boolean }> {
    try {
      const result = await apiClient.get<{ pin_required: boolean }>(
        `/section-pin?batch_id=${encodeURIComponent(batchId)}&section=${encodeURIComponent(section)}`
      );
      return { pin_required: result.data?.pin_required ?? false };
    } catch (e) {
      console.error('Error fetching section pin status:', e);
      return { pin_required: false };
    }
  },

  async verifySectionPin(batchId: string, section: string, pin: string): Promise<boolean> {
    try {
      const result = await apiClient.post<{ valid: boolean }>('/section-pin/verify', {
        batch_id: batchId,
        section,
        pin,
      });
      return result.data?.valid ?? false;
    } catch (e) {
      console.error('Error verifying section pin:', e);
      return false;
    }
  },

  async lookupStudent(studentId: string): Promise<{ found: boolean; name?: string; phone?: string }> {
    const sid = studentId.trim();
    if (!sid) return { found: false };

    const post = await apiClient.post<{ found: boolean; name?: string; phone?: string }>(
      '/students/lookup',
      { student_id: sid }
    );
    if (!post.error && post.data) return post.data;

    const get = await apiClient.get<{ found: boolean; name?: string; phone?: string }>(
      `/students/lookup?student_id=${encodeURIComponent(sid)}`
    );
    if (!get.error && get.data) return get.data;

    return { found: false };
  },

  async unlockSection(payload: StudentUnlockPayload): Promise<{
    session: StudentSession | null;
    error?: string;
    errorCode?: string;
  }> {
    const body = {
      batch_id: String(payload.batch_id),
      section: String(payload.section).trim().toUpperCase(),
      pin: String(payload.pin).replace(/\D/g, '').slice(0, 4),
      student_id: String(payload.student_id).trim(),
      ...(payload.name ? { name: String(payload.name).trim() } : {}),
      ...(payload.phone !== undefined && payload.phone !== '' ? { phone: String(payload.phone).trim() } : {}),
      ...(payload.sub_section ? { sub_section: payload.sub_section } : {}),
    };

    const result = await apiClient.post<{
      valid: boolean;
      error?: string;
      message?: string;
      student?: {
        id: string;
        student_id: string;
        name: string;
        phone?: string | null;
        batch_id?: string | null;
        section?: string | null;
        sub_section?: string | null;
        section_pin?: string | null;
      };
    }>('/students/unlock', body);

    if (result.error) {
      return { session: null, error: result.error, errorCode: 'network' };
    }

    if (!result.data?.valid || !result.data.student) {
      return {
        session: null,
        error: result.data?.message || 'Unlock failed',
        errorCode: result.data?.error || 'unknown',
      };
    }

    const st = result.data.student;
    const session: StudentSession = {
      id: st.id,
      student_id: st.student_id,
      name: st.name,
      phone: st.phone,
      batch_id: st.batch_id ?? payload.batch_id,
      section: st.section ?? payload.section,
      sub_section: st.sub_section ?? payload.sub_section ?? null,
      section_pin: st.section_pin ?? payload.pin,
    };

    writeSession(session);
    localStorage.setItem(`section_pin_${payload.batch_id}_${payload.section}`, payload.pin);
    return { session };
  },

  isCrForSection(batchId: string, section: string, crProfile?: CrProfileForLock): boolean {
    if (!crProfile?.is_cr) return false;
    const sec = String(section).trim().toUpperCase();
    const crSec = String(crProfile.section || '').trim().toUpperCase();
    return crProfile.batch_id === batchId && crSec === sec;
  },

  async isSectionLocked(
    batchId: string,
    section: string,
    crProfile?: CrProfileForLock
  ): Promise<boolean> {
    if (this.isCrForSection(batchId, section, crProfile)) {
      return false;
    }

    const { pin_required } = await this.fetchSectionPinStatus(batchId, section);
    if (!pin_required) return false;

    if (this.hasAccessToSection(batchId, section)) {
      const session = readSession()!;
      const valid = await this.verifySectionPin(batchId, section, session.section_pin!);
      if (valid) return false;
      this.logout();
      return true;
    }

    const saved = localStorage.getItem(`section_pin_${batchId}_${section}`);
    if (!saved) return true;
    const valid = await this.verifySectionPin(batchId, section, saved);
    return !valid;
  },

  async logout(): Promise<void> {
    const session = readSession();
    if (session?.id) {
      try {
        await apiClient.post(`/section-pin/student-logout?student_db_id=${encodeURIComponent(session.id)}`, {});
      } catch (e) {
        console.warn('Student logout API:', e);
      }
      if (session.batch_id && session.section) {
        clearPinStorage(session.batch_id, session.section);
      }
    }
    writeSession(null);
  },

  async fetchGroups(
    batchId: string,
    courseId: string,
    section: string
  ): Promise<CourseGroup[]> {
    try {
      const result = await apiClient.get<CourseGroup[]>(
        `/groups?batch_id=${batchId}&course_id=${courseId}&section=${section}`
      );
      return result.data || [];
    } catch (e) {
      console.error('Error fetching groups:', e);
      return [];
    }
  },
};
