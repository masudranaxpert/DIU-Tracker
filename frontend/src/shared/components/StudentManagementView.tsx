import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Search, Trash2, Edit2, Download, Upload,
  FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Phone,
  User, Filter, X, Save, ArrowUpDown, MoreVertical
} from 'lucide-react';
import { adminService } from '@/shared/services/adminService';
import { Student, Section } from '@/shared/types/types';
// xlsx is heavy (~400KB) — load it only when a user actually imports/exports.
let _xlsxModule: typeof import('xlsx') | null = null;
const getXLSX = async () => (_xlsxModule ??= await import('xlsx'));
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useDialogStore } from '@/shared/hooks/useDialog';
import StudentProfilesView from './StudentProfilesView';

interface Props {
  batchId: string;
  section: Section;
}

const StudentManagementView: React.FC<Props> = ({ batchId, section }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Student, direction: 'asc' | 'desc' }>({ key: 'student_id', direction: 'asc' });
  const [activeTab, setActiveTab] = useState<'LIST' | 'FORM'>('LIST');

  const dialog = useDialogStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batchName, setBatchName] = useState<string>(
    (typeof window !== 'undefined' ? window.localStorage.getItem('selectedBatchName') : null) || ''
  );

  const [formData, setFormData] = useState<Partial<Student>>({
    student_id: '',
    name: '',
    phone: '',
    sub_section: '',
  });

  useEffect(() => {
    loadStudents();
  }, [batchId, section]);

  useEffect(() => {
    // Ensure batch name resolves even when localStorage isn't set (deep link / refresh).
    let alive = true;
    (async () => {
      if (batchName?.trim()) return;
      const batches = await adminService.fetchBatches();
      const name = batches.find((b) => b.id === batchId)?.name || '';
      if (!alive) return;
      if (name) {
        setBatchName(name);
        try {
          window.localStorage.setItem('selectedBatchName', name);
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [batchId]);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.fetchSectionStudents(batchId, section);
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id || !formData.name) {
      alert('Student ID and Name are required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingStudent) {
        await adminService.updateSectionStudent(editingStudent.id, {
          ...formData,
          batch_id: batchId,
          section: section,
        });
      } else {
        await adminService.addSectionStudent({
          student_id: formData.student_id!,
          name: formData.name!,
          phone: formData.phone,
          batch_id: batchId,
          section: section,
          sub_section: formData.sub_section,
        });
      }

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      setFormData({ student_id: '', name: '', phone: '', sub_section: '' });
      setEditingStudent(null);
      setActiveTab('LIST');
      loadStudents();
    } catch (error: any) {
      alert('Error saving student: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    const confirm = await dialog.confirm('Are you sure you want to delete this student?', 'Delete Student');
    if (!confirm) return;

    try {
      await adminService.deleteSectionStudent(id);
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (error: any) {
      alert('Error deleting student: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      student_id: student.student_id,
      name: student.name,
      phone: student.phone || '',
      sub_section: student.sub_section || '',
    });
    setActiveTab('FORM');
  };

  const handleSort = (key: keyof Student) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredStudents = students
    .filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone && s.phone.includes(searchQuery))
    )
    .sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleDownloadTemplate = async () => {
    const XLSX = await getXLSX();
    const wsData = [
      ['Student ID', 'Name', 'Phone', 'Sub Section'],
      ['221-15-1234', 'John Doe', '01712345678', '1'],
      ['221-15-1235', 'Jane Doe', '01712345679', '2']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `Student_Import_Template_${section}.xlsx`);
  };

  const handleExportExcel = async () => {
    const XLSX = await getXLSX();
    const wsData = [
      ['Student ID', 'Name', 'Phone', 'Sub Section'],
      ...students.map(s => [s.student_id, s.name, s.phone || '', s.sub_section || ''])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    const fileName = `Students_Section_${section}.xlsx`;

    if (Capacitor.isNativePlatform()) {
      try {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const cacheFile = await Filesystem.writeFile({
          path: fileName,
          data: wbout,
          directory: Directory.Cache
        });

        await Share.share({
          title: 'Export Student List',
          files: [cacheFile.uri]
        });
      } catch (err) {
        console.error('Native export failed:', err);
        XLSX.writeFile(wb, fileName);
      }
    } else {
      XLSX.writeFile(wb, fileName);
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await getXLSX();
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const studentsToUpsert = data.map(row => ({
          student_id: row['Student ID']?.toString() || '',
          name: row['Name']?.toString() || '',
          phone: row['Phone']?.toString() || '',
          sub_section: row['Sub Section']?.toString() || '',
          batch_id: batchId,
          section: section
        })).filter(s => s.student_id && s.name);

        if (studentsToUpsert.length === 0) {
          dialog.alert('No valid student data found in the Excel file.', 'Import Error');
          return;
        }

        setIsSaving(true);
        await adminService.upsertSectionStudents(studentsToUpsert);
        dialog.alert(`Successfully imported ${studentsToUpsert.length} students!`, 'Import Success');
        loadStudents();
      } catch (error) {
        console.error('Import error:', error);
        dialog.alert('Failed to parse Excel file.', 'Import Error');
      } finally {
        setIsSaving(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const surfaceCard =
    'bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800';
  const surfaceRaised =
    'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800';
  const fieldClass =
    'w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500';

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header Section */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl shadow-sm ${surfaceCard}`}>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Student Management
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Section {section} Control Center {batchName ? `• ${batchName}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('LIST')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'LIST'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 dark:hover:bg-slate-700'
              }`}
          >
            Student List
          </button>
          <button
            onClick={() => {
              setActiveTab('FORM');
              setEditingStudent(null);
              setFormData({ student_id: '', name: '', phone: '', sub_section: '' });
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'FORM'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 dark:hover:bg-slate-700'
              }`}
          >
            {editingStudent ? 'Edit Student' : 'Add New'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'FORM' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`rounded-3xl p-6 shadow-xl ${surfaceRaised}`}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                {editingStudent ? 'Edit Student Details' : 'Add New Student'}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200/60 dark:border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  Format
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-200/60 dark:border-emerald-800/40"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveStudent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Student ID</label>
                <input
                  type="text"
                  placeholder="e.g. 221-15-1234"
                  value={formData.student_id}
                  onChange={e => setFormData({ ...formData, student_id: e.target.value })}
                  className={fieldClass}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={fieldClass}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className={fieldClass}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Sub Section (1 or 2)</label>
                <select
                  value={formData.sub_section}
                  onChange={e => setFormData({ ...formData, sub_section: e.target.value })}
                  className={fieldClass}
                >
                  <option value="">None</option>
                  <option value="1">Group 1 (Sub-section 1)</option>
                  <option value="2">Group 2 (Sub-section 2)</option>
                </select>
              </div>

              <div className="md:col-span-2 pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : isSuccess ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Save className="w-6 h-6" />
                  )}
                  {editingStudent ? 'Update Student Record' : 'Save New Student'}
                </button>
              </div>
            </form>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportExcel}
              accept=".xlsx,.xls"
              className="hidden"
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Search and Filters */}
            <div className={`p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 ${surfaceCard}`}>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by ID, Name, or Phone..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-slate-50 dark:focus:bg-slate-800 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <button
                onClick={handleExportExcel}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 font-medium transition-all"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Export Excel
              </button>
            </div>

            {/* Students Table/Grid */}
            <div className={`rounded-2xl overflow-hidden shadow-sm ${surfaceRaised}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse bg-transparent dark:bg-transparent">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('student_id')}>
                        <div className="flex items-center gap-1">
                          Student ID
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">
                          Name
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Group</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/80 bg-transparent">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                          <p className="text-slate-500 dark:text-slate-400">Loading student directory...</p>
                        </td>
                      </tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <Users className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                          <p className="text-slate-600 dark:text-slate-300 font-medium">No students found matching your criteria</p>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => (
                        <tr key={student.id} className="bg-transparent hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                              {student.student_id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                {(student.name || '?').charAt(0)}
                              </div>
                              <span className="text-sm font-medium text-slate-900 dark:text-white">{student.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {student.sub_section ? (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${student.sub_section === '1'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                                }`}>
                                G{student.sub_section}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {student.phone ? (
                              <a href={`tel:${student.phone}`} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors">
                                <Phone className="w-3.5 h-3.5" />
                                {student.phone}
                              </a>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">No phone</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(student)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                title="Edit Student"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                title="Delete Student"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 bg-slate-100/80 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Total Students: {filteredStudents.length}
                </span>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  Section {section} • {batchName || `Batch ${batchId.substring(0, 8)}...`}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentManagementView;
