
import React, { useState, useRef } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Course, AcademicRecord, EntryType, Section, Deadline, RoutineItem } from '@/shared/types/types';
import { routineService } from '@/shared/services/routineService';
import { SECTIONS } from '@/shared/utils/constants';
import { Plus, Trash2, CheckCircle2, MapPin, Clock, GraduationCap, AlertCircle, Link, Edit2, X, Upload, Loader2, PlusCircle, Bell, Users, LayoutDashboard, Calendar, FileText, Sparkles, ChevronRight, Save, BookOpen, User, Flag, ShieldAlert, Search, Info, Facebook, MessageCircle, Send, Bot, Tag, Layers, UserSquare2, Building2, Phone, Mail, ExternalLink } from 'lucide-react';
import NativeSelect from './NativeSelect';
import CustomDatePicker from './CustomDatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { adminService } from '@/shared/services/adminService';
import { studentService } from '@/shared/services/studentService';
import CourseCatalogSelect from './CourseCatalogSelect';
import TeacherDirectorySelect from './TeacherDirectorySelect';
import RecordAttachmentsEditor, {
  attachmentsUploading,
  type RecordAttachmentDraft,
} from './records/RecordAttachmentsEditor';
import { resolveMediaUrl } from '@/shared/utils/mediaUrl';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { useDialogStore } from '@/shared/hooks/useDialog';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';
import StudentManagementView from './StudentManagementView';
import GroupManagementView from './GroupManagementView';

interface Props {
  courses: Course[];
  records: AcademicRecord[];
  notices: any[];
  section: Section;
  batchId: string;
  onAddRecord: (record: Omit<AcademicRecord, 'id'>) => Promise<void>;
  onUpdateRecord: (id: string, record: Partial<AcademicRecord>) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onAddCourse?: (course: Course) => void;
  onUpdateCourse?: (id: string, course: Partial<Course>) => Promise<void>;
  onDeleteCourse?: (id: string) => Promise<void>;
  onAddNotice?: (notice: any) => Promise<void>;
  onUpdateNotice?: (id: string, notice: any) => Promise<void>;
  onDeleteNotice?: (id: string) => Promise<void>;
  deadlines: Deadline[];
  onAddDeadline: (deadline: Omit<Deadline, 'id' | 'created_at'>) => Promise<void>;
  onUpdateDeadline: (id: string, deadline: Partial<Deadline>) => Promise<void>;
  onDeleteDeadline: (id: string) => Promise<void>;
  initialTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}


type AdminTab = 'OVERVIEW' | 'ACADEMIC' | 'COURSES' | 'GROUPS' | 'NOTICES' | 'DEADLINES' | 'PROFILE' | 'STUDENTS' | 'ROUTINE';

const AdminPanel: React.FC<Props> = ({ courses, records, notices, deadlines, section, batchId, onAddRecord, onUpdateRecord, onDeleteRecord, onAddCourse, onUpdateCourse, onDeleteCourse, onAddNotice, onUpdateNotice, onDeleteNotice, onAddDeadline, onUpdateDeadline, onDeleteDeadline, initialTab, onTabChange }) => {

  const { profile, refreshProfile, mergeProfile } = useAuth();
  const dialog = useDialogStore();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab || 'OVERVIEW');

  // Sync activeTab when initialTab changes (from URL)
  React.useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setSearchQuery('');
    onTabChange?.(tab);
  };
  const [isSuccess, setIsSuccess] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);

  const [routineInput, setRoutineInput] = useState('');
  const [routineClasses, setRoutineClasses] = useState<Omit<RoutineItem, 'id' | 'batch_id' | 'section' | 'created_at'>[]>([]);
  const [routinePreviewError, setRoutinePreviewError] = useState<string | null>(null);
  const [isFetchingRoutine, setIsFetchingRoutine] = useState(false);
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);
  const [existingRoutine, setExistingRoutine] = useState<RoutineItem[]>([]);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const aiPrompt = `Identify all class timings, course codes, course titles, teacher initials, and room numbers for our specific section.
Convert them into a JSON array of class schedule objects.
For each class:
- Identify the day (must be "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", or "Friday")
- Extract course code (e.g. "CSE212", "MAT211")
- Extract course title (e.g. "Discrete Mathematics", "Engineering Mathematics")
- Extract teacher initials (e.g. "RKR", "SAR")
- Extract room number (e.g. "KT-518", "ANX1-207")
- Extract class start time (in 24-hour HH:MM format, e.g. "11:30" or "08:30")
- Extract class end time (in 24-hour HH:MM format, e.g. "13:00" or "11:30")
- Extract sub-section (if it is a lab divided into sub-sections like "J1", "J2", otherwise leave blank or null)

Ensure the output is ONLY a valid JSON array matching the structure:
[
  {
    "day": "Saturday",
    "course_code": "CSE214",
    "course_name": "Algorithms Lab",
    "teacher": "AHAK",
    "room": "G1-003",
    "start_time": "08:30",
    "end_time": "11:30",
    "sub_section": "J2"
  }
]
No markdown wrapping (like \`\`\`json), no conversation, no explanation. Just raw JSON.`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(aiPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  React.useEffect(() => {
    if (activeTab === 'ROUTINE' && batchId && section) {
      const loadRoutine = async () => {
        setIsFetchingRoutine(true);
        try {
          const res = await routineService.fetchRoutine(batchId, section);
          setExistingRoutine(res);
        } catch (e) {
          console.error(e);
        } finally {
          setIsFetchingRoutine(false);
        }
      };
      loadRoutine();
    }
  }, [activeTab, batchId, section]);

  React.useEffect(() => {
    if (!routineInput.trim()) {
      setRoutineClasses([]);
      setRoutinePreviewError(null);
      return;
    }
    try {
      let jsonText = routineInput.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
      }
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('Root element must be a JSON array.');
      }
      const validated: Omit<RoutineItem, 'id' | 'batch_id' | 'section' | 'created_at'>[] = [];
      const validDays = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        if (!item.day || !validDays.includes(item.day)) {
          throw new Error(`Item ${i + 1} has invalid day "${item.day}". Must be one of: ${validDays.join(', ')}`);
        }
        if (!item.course_code || !item.course_name) {
          throw new Error(`Item ${i + 1} is missing course_code or course_name.`);
        }
        if (!item.start_time || !item.end_time) {
          throw new Error(`Item ${i + 1} is missing start_time or end_time.`);
        }
        validated.push({
          day: item.day,
          course_code: String(item.course_code).trim(),
          course_name: String(item.course_name).trim(),
          teacher: item.teacher ? String(item.teacher).trim() : undefined,
          room: item.room ? String(item.room).trim() : undefined,
          start_time: String(item.start_time).trim(),
          end_time: String(item.end_time).trim(),
          sub_section: item.sub_section ? String(item.sub_section).trim() : undefined,
        });
      }
      setRoutineClasses(validated);
      setRoutinePreviewError(null);
    } catch (e: any) {
      setRoutineClasses([]);
      setRoutinePreviewError(e.message || 'Invalid JSON format');
    }
  }, [routineInput]);

  const handleSaveRoutine = async () => {
    if (routineClasses.length === 0) {
      alert('No valid classes found. Please paste the JSON output from AI.');
      return;
    }
    setIsSavingRoutine(true);
    try {
      const res = await routineService.saveRoutine(batchId, section, routineClasses);
      setExistingRoutine(res);
      setRoutineInput('');
      setRoutineClasses([]);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (e: any) {
      console.error(e);
      alert('Failed to save routine: ' + e.message);
    } finally {
      setIsSavingRoutine(false);
    }
  };

  const handleDeleteRoutine = async () => {
    if (!await dialog.confirm('Are you sure you want to clear the entire class routine for this section?', 'Clear Routine')) {
      return;
    }
    setIsSavingRoutine(true);
    try {
      await routineService.deleteRoutine(batchId, section);
      setExistingRoutine([]);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (e: any) {
      console.error(e);
      alert('Failed to delete routine: ' + e.message);
    } finally {
      setIsSavingRoutine(false);
    }
  };

  const [profileName, setProfileName] = useState(profile?.full_name || '');
  const [facebookUrl, setFacebookUrl] = useState(profile?.facebook_url || '');
  const [whatsappNumber, setWhatsappNumber] = useState(profile?.whatsapp_number || '');
  const [telegramUsername, setTelegramUsername] = useState(profile?.telegram_username || '');

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Teacher fields now use the internal teacher directory (search + select)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarCacheBuster, setAvatarCacheBuster] = useState(0);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const displayAvatarUrl = avatarPreviewUrl || profile?.avatar_url || null;

  React.useEffect(() => {
    setAvatarImgError(false);
  }, [displayAvatarUrl, avatarCacheBuster]);

  React.useEffect(() => {
    if (profile?.avatar_url) setAvatarPreviewUrl(null);
  }, [profile?.avatar_url]);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupMode, setBackupMode] = useState<'BACKUP' | 'RESTORE'>('BACKUP');
  const [backupOptions, setBackupOptions] = useState({
    courses: true,
    records: true,
    notices: true,
    deadlines: true,
    groups: true
  });
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Sync profile data when it loads or changes
  React.useEffect(() => {
    if (profile) {
      setProfileName(profile.full_name || '');
      setFacebookUrl(profile.facebook_url || '');
      setWhatsappNumber(profile.whatsapp_number || '');
      setTelegramUsername(profile.telegram_username || '');
    }
  }, [profile]);

  const [newRecord, setNewRecord] = useState<Partial<AcademicRecord>>({
    type: EntryType.EXTRA_CLASS,
    date: new Date().toISOString().split('T')[0],
  });

  const [newCourse, setNewCourse] = useState({
    course_list_id: '',
    teacher: '',
    teacher2: '',
    credit: 3
  });
  const [selectedCatalogCode, setSelectedCatalogCode] = useState('');
  const [selectedCatalogName, setSelectedCatalogName] = useState('');

  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    expires_at: ''
  });

  const [newDeadline, setNewDeadline] = useState<Partial<Deadline>>({
    type: 'CT',
    date: new Date().toISOString().split('T')[0],
    section: section,
  });


  const [sectionPin, setSectionPin] = useState('');
  const [pinIsActive, setPinIsActive] = useState(false);
  const [pinSaveMessage, setPinSaveMessage] = useState<string | null>(null);
  const [isFetchingPin, setIsFetchingPin] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);

  const crBatchId = profile?.batch_id || batchId;
  const crSection = (profile?.section || section) as Section;
  const pinContextMismatch =
    !!profile?.batch_id &&
    !!profile?.section &&
    (profile.batch_id !== batchId || profile.section !== section);
  const formRef = useRef<HTMLDivElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [newAttachments, setNewAttachments] = useState<RecordAttachmentDraft[]>([
    { name: '', type: 'pdf', url: '', uploadMode: true },
  ]);
  const [fileError, setFileError] = useState<{ show: boolean, size: number } | null>(null);

  const handleSubmitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.course_id || !newRecord.title || !newRecord.date) {
      alert('Please fill in Course, Title, and Date.');
      return;
    }

    // Attachment validation: If URL is provided, name must be provided
    for (const att of newAttachments) {
      if (att.url && !att.name.trim()) {
        alert('Please provide a name for all attachments.');
        return;
      }
    }

    try {
      setIsSaving(true);
      if (editingRecordId) {
        // Update existing record
        await onUpdateRecord(editingRecordId, {
          ...newRecord,
          section,
          batch_id: batchId,
          attachments: newAttachments
        } as any);
        setEditingRecordId(null);
      } else {
        // Add new record
        await onAddRecord({
          ...newRecord,
          section,
          batch_id: batchId,
          attachments: newAttachments
        } as any);
      }

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      setNewRecord({ type: EntryType.EXTRA_CLASS, date: new Date().toISOString().split('T')[0] });
      setNewAttachments([{ name: '', type: 'pdf', url: '', uploadMode: true }]);
    } catch (err: any) {
      console.error('Error saving record:', err);
      alert('Failed to save record: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // (removed) old external faculty scraping/suggestions

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    try {
      const updated = await adminService.updateMyProfile({
        full_name: profileName,
        facebook_url: facebookUrl,
        whatsapp_number: whatsappNumber,
        telegram_username: telegramUsername
      });
      if (!updated) throw new Error('Failed to save profile');
      await refreshProfile(true);

      // Also fetch PIN if we are in profile tab
      if (activeTab === 'PROFILE') {
        const pin = await adminService.fetchSectionPin(batchId, section);
        setSectionPin(pin || '');
      }

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: any) {
      console.error('Profile update failed:', err);
      alert('Failed to update profile: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!profile) return;
    setIsUploadingAvatar(true);
    try {
      const url = await adminService.uploadAvatar(file);
      setAvatarPreviewUrl(url);
      mergeProfile({ avatar_url: url });
      setAvatarCacheBuster(Date.now());
      setAvatarImgError(false);
      const updated = await adminService.updateMyProfile({ avatar_url: url });
      if (!updated) throw new Error('Failed to save avatar to profile');
      mergeProfile({ avatar_url: updated.avatar_url || url });
      await refreshProfile(true);
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      alert('Failed to upload avatar: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdatePin = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    setPinSaveMessage(null);

    if (!profile?.batch_id || !profile?.section) {
      alert('Your CR account must have batch and section assigned before setting a PIN.');
      return;
    }
    if (pinContextMismatch) {
      alert(
        `You are viewing Section ${section} but you can only set PIN for your assigned Section ${profile.section}. Use "Switch to Edit" on the dashboard first.`
      );
      return;
    }

    const pin = sectionPin.trim();
    if (pin.length > 0 && pin.length !== 4) {
      alert('Security PIN must be exactly 4 digits (or leave empty to disable).');
      return;
    }
    setIsSavingPin(true);
    try {
      const result = await adminService.updateSectionPin(crBatchId, crSection, pin);
      if (!result.ok) {
        throw new Error(result.error || 'Server rejected PIN update');
      }
      const savedPin = result.section_pin ?? (pin || '');
      setSectionPin(savedPin);
      setPinIsActive(!!result.pin_required && !!savedPin);
      setPinSaveMessage(
        savedPin
          ? `PIN saved for Section ${crSection}. Students must enter it to unlock announcements.`
          : `PIN disabled for Section ${crSection}.`
      );
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setPinSaveMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error('PIN update failed:', err);
      alert('Failed to update PIN: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingPin(false);
    }
  };

  // Fetch PIN when PROFILE tab is opened (always use CR's assigned batch/section)
  React.useEffect(() => {
    if (activeTab === 'PROFILE' && crBatchId && crSection) {
      const getPin = async () => {
        setIsFetchingPin(true);
        try {
          const pin = await adminService.fetchSectionPin(crBatchId, crSection);
          setSectionPin(pin || '');
          setPinIsActive(!!pin);
        } catch (e) {
          console.error('Error fetching pin:', e);
        } finally {
          setIsFetchingPin(false);
        }
      };
      getPin();
    }
  }, [activeTab, crBatchId, crSection]);

  const handleSubmitCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.course_list_id) {
      alert('Please select a course from the catalog.');
      return;
    }
    try {
      setIsSaving(true);
      if (editingCourseId) {
        // Update existing course
        await onUpdateCourse?.(editingCourseId, newCourse);
        setEditingCourseId(null);
      } else {
        // Add new course
        const added = await adminService.addCourse({
          ...newCourse,
          batch_id: batchId,
          section: section // Only add to this section
        });
        onAddCourse?.(added);
      }
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      setNewCourse({ course_list_id: '', teacher: '', teacher2: '', credit: 3 });
      setSelectedCatalogCode('');
      setSelectedCatalogName('');
    } catch (err: any) {
      console.error('Error saving course:', err);
      alert('Failed to save course: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title.trim()) {
      alert('Please enter a notice title.');
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        ...newNotice,
        title: newNotice.title.trim(),
        content: newNotice.content.trim(),
        expires_at: newNotice.expires_at || undefined,
      };
      if (editingNoticeId) {
        // Update existing notice
        await onUpdateNotice?.(editingNoticeId, payload);
        setEditingNoticeId(null);
      } else {
        // Add new notice
        await onAddNotice?.({
          ...payload,
          batch_id: batchId,
          section: section,
        });
      }
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      setNewNotice({ title: '', content: '', priority: 'normal', expires_at: '' });
    } catch (err: any) {
      console.error('Error saving notice:', err);
      alert('Failed to save notice: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeadline.type || !newDeadline.title || !newDeadline.date) {
      alert('Please fill in Category, Title, and Date.');
      return;
    }

    try {
      setIsSaving(true);
      if (editingDeadlineId) {
        await onUpdateDeadline(editingDeadlineId, {
          ...newDeadline,
          batch_id: batchId
        });
        setEditingDeadlineId(null);
      } else {
        await onAddDeadline({
          ...newDeadline,
          batch_id: batchId,
          course_id: newDeadline.course_id || null
        } as any);
      }
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      setNewDeadline({ type: 'CT', date: new Date().toISOString().split('T')[0] });
    } catch (err: any) {
      console.error('Error saving deadline:', err);
      alert('Failed to save deadline: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackupSystem = async () => {
    const hasSelection = Object.values(backupOptions).some(Boolean);
    if (!hasSelection) {
      dialog.alert('Please select at least one item to backup.', 'Empty Backup');
      return;
    }

    setIsBackingUp(true);
    try {
      const zip = new JSZip();
      const exportedAt = new Date().toISOString();

      zip.file(
        '_meta.json',
        JSON.stringify(
          {
            version: 1,
            exportedAt,
            batchId,
            section,
            included: backupOptions,
          },
          null,
          2
        )
      );

      if (backupOptions.courses) {
        zip.file('courses.json', JSON.stringify(courses, null, 2));
      }
      if (backupOptions.records) {
        zip.file('records.json', JSON.stringify(records, null, 2));
      }
      if (backupOptions.notices) {
        zip.file('notices.json', JSON.stringify(notices, null, 2));
      }
      if (backupOptions.deadlines) {
        zip.file('deadlines.json', JSON.stringify(deadlines, null, 2));
      }
      if (backupOptions.groups) {
        const groupsByCourse = await Promise.all(
          courses.map(async (course) => ({
            course_id: course.id,
            course_code: course.code ?? null,
            groups: await studentService.fetchGroups(batchId, course.id, section),
          }))
        );
        zip.file('groups.json', JSON.stringify(groupsByCourse, null, 2));
      }

      // Dynamic filename based on selection
      const selectedTags = Object.entries(backupOptions)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key.substring(0, 3).toLowerCase())
        .join('-');
      const batchName = (profile as any)?.batches?.name || '';
      const batchNum = batchName.match(/\d+/)?.[0] || 'batch';
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `cse${batchNum}-${section}-${selectedTags}-${dateStr}.zip`.toLowerCase().replace(/\s+/g, '-');

      if (Capacitor.isNativePlatform()) {
        const contentBase64 = await zip.generateAsync({ type: 'base64' });
        // Write to Cache first
        const cacheFile = await Filesystem.writeFile({
          path: fileName,
          data: contentBase64,
          directory: Directory.Cache,
          recursive: true
        });

        // Try direct Download folder save
        try {
          await Filesystem.writeFile({
            path: `Download/${fileName}`,
            data: contentBase64,
            directory: Directory.ExternalStorage,
            recursive: true
          });

          dialog.alert(`Backup saved to your Download folder: ${fileName}`, 'Backup Success');

          try {
            await LocalNotifications.schedule({
              notifications: [{
                title: "Backup Complete",
                body: `${fileName} is now in your Downloads`,
                id: Date.now()
              }]
            });
          } catch (ne) { }

        } catch (downloadError) {
          // Fallback for Scoped Storage
          await Share.share({
            title: 'Save Backup File',
            files: [cacheFile.uri]
          });
        }
      } else {
        const content = await zip.generateAsync({ type: 'blob' });
        const url = window.URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
      }

      setIsSuccess(true);
      setIsBackupModalOpen(false);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err) {
      console.error('Backup failed:', err);
      dialog.alert('Backup failed. Check console for details.', 'Backup Failed');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreSystem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const zip = new JSZip();
      const unzipped = await zip.loadAsync(file);
      const parsedData: any = {};

      for (const filename of Object.keys(unzipped.files)) {
        if (!unzipped.files[filename].dir && filename.endsWith('.json')) {
          const key = filename.replace('.json', '');

          // Only parse if selected in options
          if (backupOptions[key as keyof typeof backupOptions]) {
            const fileData = await unzipped.files[filename].async('string');
            parsedData[key] = JSON.parse(fileData);
          }
        }
      }

      if (Object.keys(parsedData).length === 0) {
        dialog.alert('No matching data found in the backup file for your current selections.', 'Restore Empty');
        return;
      }

      // TODO: Implement restoreFullDatabase in adminService
      // For now, just show success and refresh
      dialog.alert('Restore functionality not yet implemented. Please import data manually.', 'Restore Pending');
      await refreshProfile?.();

      setIsSuccess(true);
      setIsBackupModalOpen(false);
      dialog.alert('Selected items restored successfully! Please refresh the page to see changes.', 'Restore Success');
      setTimeout(() => setIsSuccess(false), 3000);

    } catch (err) {
      console.error('Restore failed:', err);
      dialog.alert('Restore failed. Please make sure you are uploading a valid backup ZIP file.', 'Restore Error');
    } finally {
      if (restoreInputRef.current) {
        restoreInputRef.current.value = '';
      }
    }
  };

  // Edit helper functions
  const handleEditRecord = (record: AcademicRecord) => {
    setNewRecord({
      course_id: record.course_id,
      type: record.type,
      title: record.title,
      description: record.description,
      topics: record.topics,
      date: record.date,
      time: record.time,
      room: record.room,
      sub_section: record.sub_section,
      link: record.link,
      link_two: record.link_two
    });

    // Populate existing attachments
    if (record.attachments && record.attachments.length > 0) {
      setNewAttachments(record.attachments.map(att => ({
        id: att.id,
        name: att.name,
        type: att.type,
        url: att.url,
        uploadMode: att.type !== 'link',
        drive_file_id: att.public_id,
        public_id: att.public_id,
        rclone_account_id: att.rclone_account_id ?? null,
        fileName: att.name,
      })));
    } else {
      setNewAttachments([{ name: '', type: 'pdf', url: '', uploadMode: true }]);
    }

    setEditingRecordId(record.id);
    handleTabChange('ACADEMIC');

    // Scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleEditCourse = (course: Course) => {
    setNewCourse({
      course_list_id: course.course_list_id,
      teacher: course.teacher || '',
      teacher2: course.teacher2 || '',
      credit: course.credit || 3
    });
    setSelectedCatalogCode(course.code);
    setSelectedCatalogName(course.name);
    setEditingCourseId(course.id);
    handleTabChange('COURSES');
  };

  const handleEditNotice = (notice: any) => {
    setNewNotice({
      title: notice.title,
      content: notice.content,
      priority: notice.priority,
      expires_at: notice.expires_at ? notice.expires_at.split('T')[0] : ''
    });
    setEditingNoticeId(notice.id);
    handleTabChange('NOTICES');
  };

  const handleEditDeadline = (deadline: Deadline) => {
    setNewDeadline({
      course_id: deadline.course_id,
      type: deadline.type,
      title: deadline.title,
      description: deadline.description,
      date: deadline.date,
      section: deadline.section,
      sub_section: deadline.sub_section
    });
    setEditingDeadlineId(deadline.id);
    handleTabChange('DEADLINES');
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setEditingCourseId(null);
    setEditingNoticeId(null);
    setEditingDeadlineId(null);
    setNewRecord({ type: EntryType.EXTRA_CLASS, date: new Date().toISOString().split('T')[0] });
    setNewCourse({ course_list_id: '', teacher: '', teacher2: '', credit: 3 });
    setSelectedCatalogCode('');
    setSelectedCatalogName('');
    setNewNotice({ title: '', content: '', priority: 'normal', expires_at: '' });
    setNewDeadline({ type: 'CT', date: new Date().toISOString().split('T')[0], section: section, sub_section: undefined });

    setNewAttachments([{ name: '', type: 'pdf', url: '', uploadMode: true }]);
  };

  // Derived state for filtered lists
  const filteredRecords = records.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const course = courses.find(c => c.id === r.course_id);
    return r.title.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      (course && course.name.toLowerCase().includes(q)) ||
      (course && course.code.toLowerCase().includes(q));
  });

  const filteredCourses = courses.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.teacher.toLowerCase().includes(q);
  });

  const filteredNotices = notices.filter(n => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return n.title?.toLowerCase().includes(q) ||
      n.content?.toLowerCase().includes(q);
  });

  const filteredDeadlines = deadlines.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const course = courses.find(c => c.id === d.course_id);
    return d.title?.toLowerCase().includes(q) ||
      d.type?.toLowerCase().includes(q) ||
      (course && course.name.toLowerCase().includes(q)) ||
      (course && course.code.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-20 max-w-[1400px] mx-auto px-2 lg:px-6" ref={formRef}>
      {/* Smart Navigation Hub */}
      <div className="w-full lg:w-72 flex-shrink-0">
        {/* Desktop Sidebar - Hidden on Mobile */}
        <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden sticky top-8">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                <LayoutDashboard size={20} />
              </div>
              <h2 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">Management</h2>
            </div>
          </div>

          <nav className="p-4 space-y-1">


            {[
              { id: 'OVERVIEW', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
              { id: 'ACADEMIC', label: 'Records', icon: <PlusCircle size={18} /> },
              { id: 'COURSES', label: 'Courses', icon: <BookOpen size={18} /> },
              { id: 'GROUPS', label: 'Groups', icon: <Users size={18} /> },
              { id: 'NOTICES', label: 'Notices', icon: <Bell size={18} /> },
              { id: 'DEADLINES', label: 'Deadlines', icon: <Flag size={18} /> },
              { id: 'STUDENTS', label: 'Students', icon: <Users size={18} /> },
              { id: 'ROUTINE', label: 'Class Routine', icon: <Clock size={18} /> },
              { id: 'PROFILE', label: 'Settings', icon: <User size={18} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as AdminTab)}
                className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile Smart Switcher - Improved List Dropdown */}
        <div className="lg:hidden sticky top-0 z-[100] -mx-2 mb-6">
          <div className="relative shadow-xl rounded-2xl">
            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className="w-full flex items-center justify-between bg-white dark:bg-slate-900 text-slate-900 dark:text-white pl-14 pr-5 py-5 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            >
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                {activeTab === 'OVERVIEW' && <LayoutDashboard size={20} className="text-indigo-500" />}
                {activeTab === 'ACADEMIC' && <PlusCircle size={20} className="text-emerald-500" />}
                {activeTab === 'COURSES' && <BookOpen size={20} className="text-blue-500" />}
                {activeTab === 'GROUPS' && <Users size={20} className="text-violet-500" />}
                {activeTab === 'NOTICES' && <Bell size={20} className="text-amber-500" />}
                {activeTab === 'DEADLINES' && <Flag size={20} className="text-rose-500" />}
                {activeTab === 'STUDENTS' && <Users size={20} className="text-indigo-500" />}
                {activeTab === 'ROUTINE' && <Clock size={20} className="text-sky-500" />}
                {activeTab === 'PROFILE' && <User size={20} className="text-slate-500" />}
              </div>
              <span className="font-black text-[11px] uppercase tracking-widest text-left">
                {activeTab === 'OVERVIEW' && 'Dashboard'}
                {activeTab === 'ACADEMIC' && 'Records'}
                {activeTab === 'COURSES' && 'Courses'}
                {activeTab === 'GROUPS' && 'Groups'}
                {activeTab === 'NOTICES' && 'Notice Board'}
                {activeTab === 'DEADLINES' && 'Deadlines'}
                {activeTab === 'STUDENTS' && 'Student Management'}
                {activeTab === 'ROUTINE' && 'Class Routine'}
                {activeTab === 'PROFILE' && 'Settings'}
              </span>
              <div className="flex items-center pointer-events-none">
                <ChevronRight size={18} className={`text-slate-400 transition-transform ${isNavOpen ? 'rotate-[-90deg]' : 'rotate-90'}`} />
              </div>
            </button>

            {isNavOpen && (
              <>
                <div className="fixed inset-0 z-[101] cursor-pointer" onClick={() => setIsNavOpen(false)} aria-hidden />
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[102] overflow-hidden">
                  {[
                    { id: 'OVERVIEW', label: 'Dashboard', icon: <LayoutDashboard size={16} />, color: 'text-indigo-500' },
                    { id: 'ACADEMIC', label: 'Records', icon: <PlusCircle size={16} />, color: 'text-emerald-500' },
                    { id: 'COURSES', label: 'Course ', icon: <BookOpen size={16} />, color: 'text-blue-500' },
                    { id: 'GROUPS', label: 'Groups ', icon: <Users size={16} />, color: 'text-violet-500' },
                    { id: 'NOTICES', label: 'Notice Board ', icon: <Bell size={16} />, color: 'text-amber-500' },
                    { id: 'DEADLINES', label: 'Deadlines ', icon: <Flag size={16} />, color: 'text-rose-500' },
                    { id: 'STUDENTS', label: 'Students ', icon: <Users size={16} />, color: 'text-indigo-500' },
                    { id: 'ROUTINE', label: 'Class Routine', icon: <Clock size={16} />, color: 'text-sky-500' },
                    { id: 'PROFILE', label: 'Settings', icon: <User size={16} />, color: 'text-slate-500' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        handleTabChange(tab.id as AdminTab);
                        setIsNavOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-colors ${activeTab === tab.id
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                    >
                      <div className={activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : tab.color}>
                        {tab.icon}
                      </div>
                      <span className="text-left">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 bg-white dark:bg-slate-900 rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-10 shadow-2xl relative flex flex-col ${activeTab === 'STUDENTS' ? '' : 'min-h-[600px]'}`}>


        {/* Top Header Row — hidden for Students (StudentManagementView has its own header) */}
        {activeTab !== 'STUDENTS' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 lg:mb-10 pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
              {activeTab === 'OVERVIEW' && 'Dashboard'}
              {activeTab === 'ACADEMIC' && 'Records'}
              {activeTab === 'COURSES' && 'Courses'}
              {activeTab === 'GROUPS' && 'Groups'}
              {activeTab === 'NOTICES' && 'Notice Board'}
              {activeTab === 'DEADLINES' && 'Deadlines'}
              {activeTab === 'ROUTINE' && 'Class Routine'}
              {activeTab === 'PROFILE' && 'Settings'}
            </h1>
            <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Section {section} Control Center</p>
          </div>

          <div className="flex items-center gap-2">
            {isSuccess && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-emerald-600 font-bold text-[9px] lg:text-[10px] uppercase bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-xl border border-emerald-100 dark:border-emerald-800">
                <CheckCircle2 size={12} /> Success
              </motion.div>
            )}
          </div>
        </div>
        )}

        {/* Dynamic Content */}
        <div className="flex-1">
          {activeTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {[
                { label: 'Academic Records', count: records.length, icon: <PlusCircle size={20} />, color: 'bg-indigo-500', tab: 'ACADEMIC' },
                { label: 'Active Courses', count: courses.length, icon: <BookOpen size={20} />, color: 'bg-emerald-500', tab: 'COURSES' },
                { label: 'Notices Board', count: notices.length, icon: <Bell size={20} />, color: 'bg-amber-500', tab: 'NOTICES' },
                { label: 'Future Deadlines', count: deadlines.length, icon: <Flag size={20} />, color: 'bg-rose-500', tab: 'DEADLINES' },
              ].map((stat, i) => (
                <button
                  key={i}
                  onClick={() => handleTabChange(stat.tab as AdminTab)}
                  className="group p-5 lg:p-8 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-left hover:scale-[1.02] transition-all flex items-center gap-5 lg:block"
                >
                  <div className={`w-12 h-12 lg:w-14 lg:h-14 ${stat.color} text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform shrink-0`}>
                    {stat.icon}
                  </div>
                  <div className="lg:mt-6">
                    <h3 className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</h3>
                    <p className="text-2xl lg:text-3xl font-black text-slate-800 dark:text-white mt-1">{stat.count}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'ACADEMIC' && (
            <div className="space-y-12">
              <div className="bg-slate-50 dark:bg-slate-800/20 p-8 rounded-2xl border border-slate-100 dark:border-slate-800">

                <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                  <PlusCircle size={18} className="text-indigo-600" /> {editingRecordId ? 'Edit Record' : 'Create New Record'}
                </h2>
                <form onSubmit={handleSubmitRecord} className="flex flex-col md:grid md:grid-cols-3 gap-6 md:gap-8">
                  <div className="space-y-2">
                    <NativeSelect
                      label="Select Course"
                      placeholder="Select Course"
                      options={courses.map(c => ({ id: c.id, name: `${c.code} - ${c.name}` }))}
                      value={newRecord.course_id || ''}
                      onChange={val => setNewRecord({ ...newRecord, course_id: String(val) })}
                      icon={<BookOpen size={16} />}
                    />
                  </div>
                  <div className="space-y-2">
                    <NativeSelect
                      label="Category"
                      options={Object.values(EntryType).map(t => ({ id: t, name: t }))}
                      value={newRecord.type}
                      onChange={val => setNewRecord({ ...newRecord, type: val as EntryType })}
                      icon={<Tag size={16} />}
                      showSearch={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <CustomDatePicker
                      label="Record Date"
                      value={newRecord.date}
                      onChange={val => setNewRecord({ ...newRecord, date: val })}
                    />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      Topic
                    </label>
                    <input type="text" required placeholder="e.g. Recursive Algorithms Implementation" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-sm" value={newRecord.title || ''} onChange={e => setNewRecord({ ...newRecord, title: e.target.value })} />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <FileText size={12} className="text-blue-500" />
                      {newRecord.type === EntryType.CT || newRecord.type === EntryType.MID || newRecord.type === EntryType.FINAL || newRecord.type === EntryType.PROJECT_REPORT ? 'Covered Topics / Syllabus' : 'Description'}
                      <span className="text-slate-300 dark:text-slate-600 font-semibold normal-case tracking-normal">(optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder={newRecord.type === EntryType.CT || newRecord.type === EntryType.MID || newRecord.type === EntryType.FINAL || newRecord.type === EntryType.PROJECT_REPORT ? 'Syllabus / Topics covered...' : 'Detailed description or notes...'}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-medium dark:text-white resize-none text-sm"
                      value={(newRecord.type === EntryType.CT || newRecord.type === EntryType.MID || newRecord.type === EntryType.FINAL || newRecord.type === EntryType.PROJECT_REPORT) ? (newRecord.topics || '') : (newRecord.description || '')}
                      onChange={e => {
                        if (newRecord.type === EntryType.CT || newRecord.type === EntryType.MID || newRecord.type === EntryType.FINAL || newRecord.type === EntryType.PROJECT_REPORT) {
                          setNewRecord({ ...newRecord, topics: e.target.value });
                        } else {
                          setNewRecord({ ...newRecord, description: e.target.value });
                        }
                      }}
                    />
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <NativeSelect
                      label="Section"
                      placeholder="Whole Section"
                      options={[
                        { id: '', name: 'Whole Section' },
                        { id: '1', name: `${section}1 (Lab)` },
                        { id: '2', name: `${section}2 (Lab)` },
                      ]}
                      value={newRecord.sub_section || ''}
                      onChange={val => setNewRecord({ ...newRecord, sub_section: String(val) || undefined })}
                      icon={<Users size={16} />}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <RecordAttachmentsEditor
                      attachments={newAttachments}
                      onChange={setNewAttachments}
                      onOversize={(size) => setFileError({ show: true, size })}
                    />
                  </div>

                  <div className="md:col-span-3 flex flex-col md:flex-row gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={isSaving || attachmentsUploading(newAttachments)}
                      className={`flex-1 px-12 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-xl shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${(isSaving || attachmentsUploading(newAttachments)) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                      {isSaving ? (
                        <><Loader2 size={18} className="animate-spin" /> Saving...</>
                      ) : attachmentsUploading(newAttachments) ? (
                        <><Loader2 size={18} className="animate-spin" /> Uploading...</>
                      ) : (
                        <>
                          {editingRecordId ? <Edit2 size={18} /> : <Save size={18} />}
                          {editingRecordId ? 'Update Record' : `Save to Section ${section}`}
                        </>
                      )}
                    </button>
                    {editingRecordId && (
                      <button type="button" onClick={handleCancelEdit} className="px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                        <X size={18} /> Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
              {/* List View moved to academic sub-page */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Activity</h2>
                  <div className="relative w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" placeholder="Search records..." className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-indigo-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                </div>
                {/* The actual list will follow below */}
              </div>
            </div>
          )}

          {activeTab === 'COURSES' && (
            <div className="space-y-12">
              <div className="bg-slate-50 dark:bg-slate-800/20 p-8 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                  <BookOpen size={18} className="text-emerald-600" /> {editingCourseId ? 'Edit Course' : 'Register New Course'}
                </h2>
                <form onSubmit={handleSubmitCourse} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <BookOpen size={12} className="text-emerald-500" /> Course (from catalog)
                    </label>
                    <CourseCatalogSelect
                      value={newCourse.course_list_id}
                      selectedCode={selectedCatalogCode}
                      selectedName={selectedCatalogName}
                      onChange={(id, course) => {
                        setNewCourse(prev => ({
                          ...prev,
                          course_list_id: id,
                          credit: 3,
                        }));
                        setSelectedCatalogCode(course?.code || '');
                        setSelectedCatalogName(course?.name || '');
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <Users size={12} className="text-violet-500" /> Teacher (Sec 1 / Gen)
                    </label>
                    <TeacherDirectorySelect
                      value={newCourse.teacher}
                      required
                      placeholder="Search & select teacher…"
                      onChange={(name) => setNewCourse({ ...newCourse, teacher: name })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <Users size={12} className="text-blue-500" /> Teacher (Sec 2 - Optional)
                    </label>
                    <TeacherDirectorySelect
                      value={newCourse.teacher2}
                      placeholder="Search & select (optional)…"
                      onChange={(name) => setNewCourse({ ...newCourse, teacher2: name })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-amber-500" /> Credits
                    </label>
                    <input type="number" step="0.25" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold dark:text-white text-sm" value={newCourse.credit} onChange={e => setNewCourse({ ...newCourse, credit: parseFloat(e.target.value) })} />
                  </div>
                  <div className="md:col-span-2 flex gap-4">
                    <button type="submit" disabled={isSaving} className={`px-12 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-xl shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : (editingCourseId ? <Edit2 size={18} /> : <Save size={18} />)}
                      {isSaving ? 'Saving...' : (editingCourseId ? 'Update Course' : 'Save Course')}
                    </button>
                    {editingCourseId && (
                      <button type="button" onClick={handleCancelEdit} className="px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2">
                        <X size={18} /> Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

            </div>
          )}

          {activeTab === 'NOTICES' && (
            <div className="space-y-12">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
                <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Bell size={18} className="text-amber-600" /> {editingNoticeId ? 'Edit Announcement' : 'Publish Announcement'}
                </h2>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-8 max-w-2xl leading-relaxed">
                  Keep announcements short and actionable. Link to a course when needed, set priority, and optionally add an expiry date.
                </p>
                <form onSubmit={handleSubmitNotice} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <Bell size={12} className="text-indigo-500" /> Notice Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Class update / schedule change / important reminder"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-semibold text-slate-900 dark:text-white text-base placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      value={newNotice.title}
                      onChange={e => setNewNotice({ ...newNotice, title: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <NativeSelect
                      label="Related Course (Optional)"
                      placeholder="General notice (no specific course)"
                      options={courses.map(c => ({ id: c.id, name: `${c.code} - ${c.name}` }))}
                      value={(newNotice as any).course_id || ''}
                      onChange={val => setNewNotice({ ...newNotice, course_id: String(val) || undefined } as any)}
                      icon={<GraduationCap size={16} />}
                      isClearable={true}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <FileText size={12} className="text-blue-500" /> Description <span className="text-slate-400 font-semibold normal-case">(optional)</span>
                    </label>
                    <textarea
                      rows={5}
                      placeholder="Add details if needed — title-only notices are fine"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-medium text-slate-900 dark:text-white resize-none text-base placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      value={newNotice.content}
                      onChange={e => setNewNotice({ ...newNotice, content: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-amber-500" /> Priority
                    </label>
                    <NativeSelect
                      label="Priority Level"
                      options={[
                        { id: 'low', name: 'Low Priority' },
                        { id: 'normal', name: 'Normal Priority' },
                        { id: 'high', name: 'High Priority' },
                        { id: 'urgent', name: 'Urgent Alert' }
                      ]}
                      value={newNotice.priority}
                      onChange={val => setNewNotice({ ...newNotice, priority: val as any })}
                      icon={<Sparkles size={16} />}
                    />
                  </div>
                  <div className="space-y-2">
                    <CustomDatePicker
                      label="Expiration (Optional)"
                      value={newNotice.expires_at}
                      onChange={val => setNewNotice({ ...newNotice, expires_at: val })}
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-4">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className={`px-10 py-4 bg-slate-900 dark:bg-slate-100 hover:bg-black dark:hover:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl transition-colors flex items-center justify-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : (editingNoticeId ? <Edit2 size={18} /> : <Save size={18} />)}
                      {isSaving ? 'Saving...' : (editingNoticeId ? 'Update Notice' : 'Publish Notice')}
                    </button>
                    {editingNoticeId && (
                      <button type="button" onClick={handleCancelEdit} className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                        <X size={18} /> Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'DEADLINES' && (
            <div className="space-y-12">
              <div className="bg-slate-50 dark:bg-slate-800/20 p-8 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                  {editingDeadlineId ? 'Edit Deadlines' : 'Set New Deadlines'}
                </h2>
                <form onSubmit={handleSubmitDeadline} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <NativeSelect
                      label="Category"
                      options={[
                        { id: 'CT', name: 'CT (Class Test)' },
                        { id: 'MID', name: 'MID Term' },
                        { id: 'FINAL', name: 'FINAL Exam' },
                        { id: 'LAB FINAL', name: 'LAB FINAL' },
                        { id: 'LAB EVALUATION', name: 'LAB EVALUATION' },
                        { id: 'PRESENTATION', name: 'PRESENTATION' },
                        { id: 'PROJECT SUBMISSION', name: 'PROJECT SUBMISSION' },
                        { id: 'PROJECT REPORT', name: 'PROJECT REPORT' },
                        { id: 'LAB REPORT', name: 'LAB REPORT' },
                        { id: 'ASSIGNMENT', name: 'ASSIGNMENT' },
                        { id: 'OTHER', name: 'OTHER (Milestone)' }
                      ]}
                      value={newDeadline.type}
                      onChange={val => setNewDeadline({ ...newDeadline, type: String(val) })}
                      icon={<Tag size={16} />}
                      showSearch={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <CustomDatePicker
                      label="Deadline Date"
                      value={newDeadline.date}
                      onChange={val => setNewDeadline({ ...newDeadline, date: val })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <NativeSelect
                      label="Related Course (Optional)"
                      placeholder="No Specific Course (General Deadline)"
                      options={courses.map(c => ({ id: c.id, name: `${c.code} - ${c.name}` }))}
                      value={newDeadline.course_id || ''}
                      onChange={val => setNewDeadline({ ...newDeadline, course_id: String(val) || undefined })}
                      icon={<GraduationCap size={16} />}
                      isClearable={true}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <Users size={12} className="text-indigo-500" /> Visibility / Audience
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => setNewDeadline({ ...newDeadline, section: section, sub_section: undefined })} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${newDeadline.section === section && !newDeadline.sub_section ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>Whole Section ({section})</button>
                      <button type="button" onClick={() => setNewDeadline({ ...newDeadline, section: section, sub_section: '1' })} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${newDeadline.sub_section === '1' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{section}1</button>
                      <button type="button" onClick={() => setNewDeadline({ ...newDeadline, section: section, sub_section: '2' })} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${newDeadline.sub_section === '2' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{section}2</button>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <PlusCircle size={12} className="text-indigo-500" /> Deadline Title
                    </label>
                    <input type="text" required placeholder="e.g. Project Phase 1 Submission" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-black dark:text-white text-sm" value={newDeadline.title || ''} onChange={e => setNewDeadline({ ...newDeadline, title: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <FileText size={12} className="text-blue-500" /> Description / Submission Details
                    </label>
                    <textarea rows={2} placeholder="Brief instructions or details..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-medium dark:text-white resize-none text-sm" value={newDeadline.description || ''} onChange={e => setNewDeadline({ ...newDeadline, description: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 flex gap-4">
                    <button type="submit" disabled={isSaving} className={`px-12 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-xl shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : (editingDeadlineId ? <Edit2 size={18} /> : <Save size={18} />)}
                      {isSaving ? 'Saving...' : (editingDeadlineId ? 'Update Deadline' : 'Set Deadline')}
                    </button>
                    {editingDeadlineId && (
                      <button type="button" onClick={handleCancelEdit} className="px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                        <X size={18} /> Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'GROUPS' && (
            <GroupManagementView courses={courses} batchId={batchId} section={section} />
          )}

          {activeTab === 'PROFILE' && profile && (
            <div className="space-y-8 py-4 max-w-[800px] mx-auto">
              {/* Profile Header Card */}
              <div className="bg-slate-50 dark:bg-slate-800/20 p-8 lg:p-12 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start">
                  {/* Avatar Column */}
                  <div className="relative group">
                    <div className="w-56 h-56 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border-8 border-white dark:border-slate-900 shadow-2xl relative transition-all duration-500 group-hover:scale-[1.02]">
                      {displayAvatarUrl && !avatarImgError ? (
                        <img
                          src={resolveMediaUrl(displayAvatarUrl, avatarCacheBuster)}
                          alt={profile.full_name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            console.error('[Avatar] Failed to load:', (e.target as HTMLImageElement).src);
                            setAvatarImgError(true);
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200 dark:text-slate-700">
                          <User size={100} strokeWidth={1.5} />
                        </div>
                      )}
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 bg-indigo-600/40 backdrop-blur-sm flex items-center justify-center">
                          <Loader2 className="animate-spin text-white" size={40} />
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-4 -right-4 w-14 h-14 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-2xl hover:bg-indigo-700 transition-all cursor-pointer border-4 border-white dark:border-slate-900 z-20 hover:scale-110 active:scale-95">
                      <Upload size={24} />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleAvatarUpload(file);
                        }}
                      />
                    </label>
                  </div>

                  <div className="flex-1 space-y-6 text-center lg:text-left">
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{profile.full_name || 'Class Representative'}</h3>
                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/60">Official CR</span>
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black rounded-lg uppercase tracking-widest">{profile.email}</span>
                      </div>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-sm max-w-xl">
                      Manage your profile information and social presence. Your contact details will be visible to your section students for easy communication.
                    </p>
                  </div>
                </div>
              </div>

              {/* Settings sections (single-column, focused) */}
              <div className="space-y-8">
                {/* Identity Settings */}
                <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                      <LayoutDashboard size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Identity Details</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">General information & IDs</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                        <User size={12} className="text-indigo-500" /> Display Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700/50 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 font-bold dark:text-white transition-all"
                        value={profileName}
                        onChange={e => setProfileName(e.target.value)}
                        placeholder="Your Full Name"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2.5 opacity-60">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Student ID</label>
                        <div className="px-6 py-4 bg-slate-100/50 dark:bg-slate-900/40 rounded-2xl font-bold text-slate-400 text-sm">
                          {profile.email?.split('@')[0] || 'N/A'}
                        </div>
                      </div>
                      <div className="space-y-2.5 opacity-60">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Current Section</label>
                        <div className="px-6 py-4 bg-slate-100/50 dark:bg-slate-900/40 rounded-2xl font-bold text-slate-400 text-sm">
                          Section {profile.section}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 flex gap-4 items-start">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600">
                        <AlertCircle size={20} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Locked Fields</h4>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                          Email, ID, and Section are linked to your institutional identity.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Connectivity */}
                <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600">
                      <Users size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Social Presence</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connect with your students</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                        <Facebook size={12} className="text-blue-600" /> Facebook Profile URL
                      </label>
                      <input
                        type="url"
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700/50 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 font-bold dark:text-white transition-all"
                        value={facebookUrl}
                        onChange={e => setFacebookUrl(e.target.value)}
                        placeholder="https://facebook.com/yourprofile"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                          <MessageCircle size={12} className="text-emerald-500" /> WhatsApp
                        </label>
                        <input
                          type="text"
                          className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700/50 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 font-bold dark:text-white transition-all"
                          value={whatsappNumber}
                          onChange={e => setWhatsappNumber(e.target.value)}
                          placeholder="+8801..."
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                          <Send size={12} className="text-sky-500" /> Telegram
                        </label>
                        <input
                          type="text"
                          className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700/50 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 font-bold dark:text-white transition-all"
                          value={telegramUsername}
                          onChange={e => setTelegramUsername(e.target.value)}
                          placeholder="@username"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Save Bar */}
              <div className="sticky bottom-4 z-[50]">
                <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1 flex items-center gap-3">
                    {isSuccess ? (
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest text-[10px]">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                          <CheckCircle2 size={16} />
                        </div>
                        <span>Settings updated</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                        <Info size={16} />
                        <span>Save profile, socials, and security changes</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleUpdateProfile}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    Save changes
                  </button>
                </div>
              </div>

              {/* Announcement Security (PIN) */}
              <div className="bg-slate-900 dark:bg-black p-10 rounded-2xl border border-slate-800 space-y-10 relative overflow-hidden shadow-2xl">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full -mr-20 -mt-20" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                      <ShieldAlert size={28} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white uppercase tracking-tight">Section Security PIN</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${pinIsActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {pinIsActive ? 'Active Protection Layer' : 'No PIN Set'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 max-w-sm">
                    <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-slate-300 leading-relaxed uppercase tracking-wider">
                      This PIN secures Section {crSection} announcements and groups. Students enter their ID, name, phone + this PIN to unlock.
                    </p>
                  </div>
                </div>

                {pinContextMismatch && (
                  <div className="relative z-10 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[10px] font-bold uppercase tracking-wider">
                    You are viewing Section {section} but your PIN applies to Section {profile?.section}. Switch batch/section on the dashboard, then save PIN.
                  </div>
                )}

                {pinSaveMessage && (
                  <div className="relative z-10 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                    {pinSaveMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                      <Clock size={12} /> Access Control Pin
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        placeholder="0000"
                        className="w-full px-8 py-6 bg-slate-800/40 border-2 border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-mono text-4xl font-black text-white placeholder-slate-700 tracking-[0.5em] transition-all text-center"
                        value={sectionPin}
                        onChange={(e) => setSectionPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      />
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center mt-2">
                        {sectionPin.length}/4 digits {sectionPin.length === 4 ? '✓' : ''}
                      </p>
                      {isFetchingPin && (
                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                          <Loader2 size={24} className="animate-spin text-indigo-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => handleUpdatePin()}
                      disabled={
                        isSavingPin ||
                        isFetchingPin ||
                        pinContextMismatch ||
                        !profile?.batch_id ||
                        !profile?.section ||
                        (sectionPin.length > 0 && sectionPin.length !== 4)
                      }
                      className="w-full py-6 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:scale-[1.01] transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
                    >
                      {isSavingPin ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <>
                          <Save size={20} className="group-hover:rotate-12 transition-transform" />
                          <span>Apply Security Update</span>
                        </>
                      )}
                    </button>
                    <p className="text-[9px] text-center font-black text-slate-600 uppercase tracking-[0.25em]">
                      Exactly 4 digits required · leave empty to disable
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Management (Backup/Restore) */}
              <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/10">
                      <Save size={22} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        System Data
                      </h4>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                        Create a selective backup, or restore chosen categories from a ZIP file.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    <button
                      onClick={() => {
                        setBackupMode('BACKUP');
                        setIsBackupModalOpen(true);
                      }}
                      className="px-7 py-4 bg-slate-900 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-xl"
                    >
                      <Save size={16} /> Backup
                    </button>
                    <button
                      onClick={() => {
                        setBackupMode('RESTORE');
                        setIsBackupModalOpen(true);
                      }}
                      className="px-7 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 font-black rounded-2xl text-[11px] uppercase tracking-widest hover:border-rose-300 dark:hover:border-rose-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Upload size={16} /> Restore
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                        <Save size={16} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Backup</p>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                          Pick categories (courses, records, notices, deadlines, groups) and download a ZIP.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200/60 dark:border-rose-900/30">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                        <AlertCircle size={16} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-widest">Restore warning</p>
                        <p className="text-[11px] font-bold text-rose-700/80 dark:text-rose-200/70 leading-relaxed">
                          Restoring overwrites selected categories. Use only trusted backup files.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Backup/Restore Selection Modal */}
              <AnimatePresence>
                {isBackupModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 lg:p-12">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsBackupModalOpen(false)}
                      className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                    >
                      <div className="p-8 lg:p-10 space-y-8">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${backupMode === 'BACKUP' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                              {backupMode === 'BACKUP' ? <Save size={24} /> : <Upload size={24} />}
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{backupMode === 'BACKUP' ? 'Create Custom Backup' : 'Selective Restore'}</h3>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select entities to {backupMode.toLowerCase()}</p>
                            </div>
                          </div>
                          <button onClick={() => setIsBackupModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={20} />
                          </button>
                        </div>

                        <div className="space-y-3">
                          {Object.entries(backupOptions).map(([key, value]) => (
                            <button
                              key={key}
                              onClick={() => setBackupOptions({ ...backupOptions, [key]: !value })}
                              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${value
                                ? backupMode === 'BACKUP' ? 'bg-indigo-50/50 border-indigo-600/20' : 'bg-emerald-50/50 border-emerald-600/20'
                                : 'bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700/50'
                                }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${value ? backupMode === 'BACKUP' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                  {key === 'courses' && <BookOpen size={18} />}
                                  {key === 'records' && <FileText size={18} />}
                                  {key === 'notices' && <Bell size={18} />}
                                  {key === 'deadlines' && <Flag size={18} />}
                                  {key === 'groups' && <Users size={18} />}
                                </div>
                                <div className="text-left">
                                  <h4 className={`text-[11px] font-black uppercase tracking-widest ${value ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{key}</h4>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Include {key} data</p>
                                </div>
                              </div>
                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${value ? backupMode === 'BACKUP' ? 'border-indigo-600 bg-indigo-600' : 'border-emerald-600 bg-emerald-600' : 'border-slate-200'}`}>
                                {value && <CheckCircle2 size={14} className="text-white" />}
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-col gap-4 pt-4">
                          {backupMode === 'BACKUP' ? (
                            <button
                              onClick={handleBackupSystem}
                              disabled={isBackingUp}
                              className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:scale-[1.01] transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:hover:scale-100"
                            >
                              {isBackingUp ? (
                                <>
                                  <Loader2 size={20} className="animate-spin" /> Preparing backup...
                                </>
                              ) : (
                                <>
                                  <Save size={20} /> Generate & Download Backup
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="space-y-4">
                              <input type="file" accept=".zip" className="hidden" ref={restoreInputRef} onChange={handleRestoreSystem} />
                              <button
                                onClick={() => restoreInputRef.current?.click()}
                                className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 hover:scale-[1.01] transition-all flex items-center justify-center gap-3"
                              >
                                <Upload size={20} /> Choose File & Restore
                              </button>
                              <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                                <AlertCircle size={14} className="text-amber-500" /> This will overwrite selected categories
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'STUDENTS' && (
            <StudentManagementView batchId={batchId} section={section} />
          )}
        </div>

        {/* Universal Search Bar */}
        {['ACADEMIC', 'COURSES', 'NOTICES', 'DEADLINES'].includes(activeTab) && (
          <div className="relative mt-8 mb-6 tour-admin-search">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="w-full pl-14 pr-12 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-slate-900 dark:text-white font-bold placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"

              placeholder={`Search ${activeTab === 'ACADEMIC' ? 'records' : activeTab === 'COURSES' ? 'courses' : activeTab === 'NOTICES' ? 'notices' : 'deadlines'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {activeTab === 'ACADEMIC' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden tour-admin-list">
            <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Recent Records</h3>
              <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-lg uppercase tracking-widest"> {filteredRecords.length} Total </span>
            </div>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} /> Date
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <Sparkles size={12} /> Type
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <BookOpen size={12} /> Course & Title
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Edit2 size={12} /> Actions
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRecords.map(r => {
                    const course = courses.find(c => c.id === r.course_id);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-8 py-5">
                          <div className="font-black text-slate-900 dark:text-white">{r.date}</div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-[9px] font-black rounded-lg text-slate-500 dark:text-slate-400 uppercase">{r.type}</span>
                            {r.sub_section && (
                              <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded uppercase shadow-sm shadow-emerald-500/20">{section}{r.sub_section}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{course?.code}: {r.title}</div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEditRecord(r)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={async () => { if (await dialog.confirm('Are you sure you want to delete this record? This action cannot be undone.', 'Confirm Delete')) onDeleteRecord(r.id); }} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.map(r => {
                const course = courses.find(c => c.id === r.course_id);
                return (
                  <div key={r.id} className="p-5 space-y-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{r.date}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{r.type}</span>
                        </div>
                        <h4 className="font-black text-slate-900 dark:text-white leading-snug">
                          {course?.code} <span className="text-slate-400 font-bold mx-1">/</span> {r.title}
                        </h4>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditRecord(r)} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={async () => { if (await dialog.confirm('Delete this record?', 'Confirm')) onDeleteRecord(r.id); }} className="w-10 h-10 flex items-center justify-center bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-xl">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {r.sub_section && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">
                          <Users size={10} /> Section {section}{r.sub_section}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Courses Table */}
        {activeTab === 'COURSES' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Courses</h3>
              <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-lg uppercase tracking-widest">{filteredCourses.length} Total Courses</span>
            </div>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <LayoutDashboard size={12} /> Code
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <BookOpen size={12} /> Name
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <Users size={12} /> Teacher
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <Sparkles size={12} /> Credits
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Edit2 size={12} /> Actions
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCourses.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-8 py-5">
                        <div className="font-black text-slate-900 dark:text-white">{c.code}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{c.name}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-slate-600 dark:text-slate-400 text-xs font-bold">{c.teacher}</div>
                        {c.teacher2 && <div className="text-slate-400 dark:text-slate-500 text-[10px] mt-0.5 italic">Sec 2: {c.teacher2}</div>}
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-lg uppercase">{c.credit}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditCourse(c)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={async () => { if (await dialog.confirm('Are you sure you want to delete this course? This action cannot be undone.', 'Confirm Delete')) onDeleteCourse?.(c.id); }} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCourses.map(c => (
                <div key={c.id} className="p-6 space-y-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{c.code}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.credit} Credits</span>
                      </div>
                      <h4 className="font-black text-slate-900 dark:text-white text-lg leading-tight">{c.name}</h4>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <User size={12} className="text-slate-400" /> {c.teacher}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleEditCourse(c)} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={async () => { if (await dialog.confirm('Delete this course?', 'Confirm')) onDeleteCourse?.(c.id); }} className="w-10 h-10 flex items-center justify-center bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-xl">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notices Table */}
        {activeTab === 'NOTICES' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Notices</h3>
              <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-lg uppercase tracking-widest">{filteredNotices.length} Total Notices</span>
            </div>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <Bell size={12} /> Title
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <Sparkles size={12} /> Priority
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} /> Expires
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Edit2 size={12} /> Actions
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredNotices.map(n => (
                    <tr key={n.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{n.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{n.content}</div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg uppercase ${n.priority === 'urgent' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' :
                          n.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' :
                            n.priority === 'normal' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                              'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>{n.priority}</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-slate-600 dark:text-slate-400 text-sm">{n.expires_at ? new Date(n.expires_at).toLocaleDateString() : 'No expiry'}</div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditNotice(n)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={async () => { if (await dialog.confirm('Are you sure you want to delete this notice? This action cannot be undone.', 'Confirm Delete')) onDeleteNotice?.(n.id); }} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile View: Cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredNotices.map(n => (
                <div key={n.id} className="p-6 space-y-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-[8px] font-black rounded-lg uppercase tracking-[0.15em] ${n.priority === 'urgent' ? 'bg-rose-500 text-white' :
                          n.priority === 'high' ? 'bg-orange-500 text-white' :
                            n.priority === 'normal' ? 'bg-indigo-500 text-white' :
                              'bg-slate-500 text-white'
                          }`}>
                          {n.priority}
                        </span>
                        {n.expires_at && (
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Clock size={10} /> Exp: {new Date(n.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h4 className="font-black text-slate-900 dark:text-white text-lg leading-tight">{n.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">{n.content}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleEditNotice(n)} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={async () => { if (await dialog.confirm('Delete this notice?', 'Confirm')) onDeleteNotice?.(n.id); }} className="w-10 h-10 flex items-center justify-center bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-xl">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deadlines Table */}
        {activeTab === 'DEADLINES' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Academic Deadlines</h3>
              <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-lg uppercase tracking-widest">{filteredDeadlines.length} Milestones</span>
            </div>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} /> Date
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <Sparkles size={12} /> Type
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <Flag size={12} /> Title & Course
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Edit2 size={12} /> Actions
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDeadlines.map(d => {
                    if (!d) return null;
                    const course = (courses || []).find(c => c.id === d.course_id);
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-8 py-5">
                          <div className="font-black text-slate-900 dark:text-white">{d.date}</div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-[9px] font-black rounded-lg text-slate-500 dark:text-slate-400 uppercase">{d.type}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{d.title}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{course ? `${course.code} - ${course.name}` : 'General Milestone'}</div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEditDeadline(d)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={async () => { if (await dialog.confirm('Are you sure you want to delete this deadline?', 'Confirm Delete')) onDeleteDeadline(d.id); }} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDeadlines.map(d => {
                if (!d) return null;
                const course = (courses || []).find(c => c.id === d.course_id);
                return (
                  <div key={d.id} className="p-6 space-y-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{d.date}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d.type}</span>
                        </div>
                        <h4 className="font-black text-slate-900 dark:text-white text-lg leading-tight">{d.title}</h4>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {course ? `${course.code} - ${course.name}` : 'General Milestone'}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button onClick={() => handleEditDeadline(d)} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={async () => { if (await dialog.confirm('Delete this milestone?', 'Confirm')) onDeleteDeadline(d.id); }} className="w-10 h-10 flex items-center justify-center bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-xl">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'ROUTINE' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-slate-50 dark:bg-slate-800/20 p-6 sm:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <Bot size={18} className="text-indigo-600" /> AI Class Routine Importer
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                    Generate routine data in seconds using artificial intelligence
                  </p>
                </div>

                <div className="bg-slate-100/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">AI Prompt Helper</span>
                    <button
                      onClick={handleCopyPrompt}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-indigo-50 dark:hover:bg-slate-700/80 hover:text-indigo-600 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer animate-pulse"
                    >
                      <Save size={10} />
                      {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-h-24 overflow-y-auto custom-scrollbar bg-white/40 dark:bg-black/10 p-3 rounded-lg border border-slate-200/20 dark:border-slate-800/40 select-all">
                    {aiPrompt}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Paste AI JSON Output
                  </label>
                  <textarea
                    rows={8}
                    placeholder="[&#10;  {&#10;    &quot;day&quot;: &quot;Saturday&quot;,&#10;    &quot;course_code&quot;: &quot;CSE212&quot;,&#10;    &quot;course_name&quot;: &quot;Discrete Mathematics&quot;,&#10;    &quot;teacher&quot;: &quot;RKR&quot;,&#10;    &quot;room&quot;: &quot;KT-518&quot;,&#10;    &quot;start_time&quot;: &quot;11:30&quot;,&#10;    &quot;end_time&quot;: &quot;13:00&quot;&#10;  }&#10;]"
                    value={routineInput}
                    onChange={(e) => setRoutineInput(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 font-mono text-xs dark:text-white transition-colors"
                  />
                </div>

                {routinePreviewError && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl flex items-start gap-3">
                    <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Syntax / Validation Error</p>
                      <p className="text-xs text-rose-700 dark:text-rose-400 font-bold mt-1 leading-normal">{routinePreviewError}</p>
                    </div>
                  </div>
                )}

                {routineClasses.length > 0 && !routinePreviewError && (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex items-start gap-3">
                      <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                      <div>
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Valid JSON Format</p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1 leading-normal">
                          Parsed {routineClasses.length} class schedule items. Ready to import.
                        </p>
                      </div>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900/20">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 border-b border-slate-100 dark:border-slate-800">
                          <tr>
                            <th className="p-2.5 font-black uppercase text-[8px] text-slate-400 tracking-wider">Day</th>
                            <th className="p-2.5 font-black uppercase text-[8px] text-slate-400 tracking-wider">Time</th>
                            <th className="p-2.5 font-black uppercase text-[8px] text-slate-400 tracking-wider">Code</th>
                            <th className="p-2.5 font-black uppercase text-[8px] text-slate-400 tracking-wider">Room/Tchr</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {routineClasses.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                              <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">{item.day.substring(0, 3)}</td>
                              <td className="p-2.5 font-medium text-slate-600 dark:text-slate-400">{item.start_time}-{item.end_time}</td>
                              <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{item.course_code} {item.sub_section ? `(${item.sub_section})` : ''}</td>
                              <td className="p-2.5 font-medium text-slate-600 dark:text-slate-400">{item.room || '-'}/{item.teacher || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      onClick={handleSaveRoutine}
                      disabled={isSavingRoutine}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-500/50 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                    >
                      {isSavingRoutine ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Saving Routine…
                        </>
                      ) : (
                        'Save & Replace Routine'
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
                <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <Clock size={20} className="text-indigo-600" /> Active Schedule
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Currently visible class routine to all students
                    </p>
                  </div>
                  {existingRoutine.length > 0 && (
                    <button
                      onClick={handleDeleteRoutine}
                      disabled={isSavingRoutine}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 active:scale-95 border border-rose-100 dark:border-rose-900/40 cursor-pointer"
                    >
                      <Trash2 size={12} /> Clear All
                    </button>
                  )}
                </div>

                <div className="flex-1 p-6 overflow-y-auto max-h-[600px] custom-scrollbar">
                  {isFetchingRoutine ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                      <Loader2 size={32} className="animate-spin text-indigo-600" />
                      <span className="font-bold text-xs uppercase tracking-widest">Loading Routine…</span>
                    </div>
                  ) : existingRoutine.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center gap-4">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/40 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-800/80">
                        <Clock size={24} className="text-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">No Routine Loaded</h4>
                        <p className="text-xs text-slate-400 font-medium max-w-[280px]">
                          Use the AI Importer on the left to copy-paste the parsed JSON routine to initialize it.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => {
                        const dayClasses = existingRoutine
                          .filter((c) => c.day === day)
                          .sort((a, b) => a.start_time.localeCompare(b.start_time));
                        if (dayClasses.length === 0) return null;
                        return (
                          <div key={day} className="space-y-3">
                            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              {day}
                            </h4>
                            <div className="grid grid-cols-1 gap-2.5">
                              {dayClasses.map((item) => (
                                <div
                                  key={item.id}
                                  className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 rounded-xl hover:scale-[1.01] transition-all flex justify-between items-center"
                                >
                                  <div className="space-y-1">
                                    <h5 className="font-black text-slate-900 dark:text-white text-xs leading-none">
                                      {item.course_name}
                                    </h5>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                      <span>{item.course_code}</span>
                                      {item.sub_section && (
                                        <>
                                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                          <span>Sec {item.sub_section}</span>
                                        </>
                                      )}
                                      {item.teacher && (
                                        <>
                                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                          <span>{item.teacher}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                                      {item.start_time} - {item.end_time}
                                    </div>
                                    {item.room && (
                                      <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">
                                        Room {item.room}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Size Error Modal */}
        {fileError?.show && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div
              onClick={() => setFileError(null)}
              className="absolute inset-0 bg-slate-900/60"
            />
            <div
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
                <ShieldAlert size={40} />
              </div>

              <h3 className="text-xl font-black text-slate-900 dark:text-white text-center uppercase tracking-tight mb-2">File Too Large!</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center text-sm font-medium mb-8">
                The file you selected is <span className="text-rose-500 font-bold">{(fileError.size / (1024 * 1024)).toFixed(1)} MB</span>, which exceeds the <span className="font-bold text-slate-900 dark:text-white">100 MB</span> limit.
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-2xl">
                  <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">Pro Suggestion:</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                    Use a tool like <a href="https://www.ilovepdf.com/compress_pdf" target="_blank" rel="noreferrer" className="underline font-bold">iLovePDF</a> or <a href="https://compressor.io/" target="_blank" rel="noreferrer" className="underline font-bold">Compressor.io</a> to shrink your file while keeping the quality, then try again!
                  </p>
                </div>

                <button
                  onClick={() => setFileError(null)}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl transition-all active:scale-95"
                >
                  GOT IT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;

