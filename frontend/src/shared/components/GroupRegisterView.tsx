import React, { useState, useEffect, useCallback } from 'react';
import { Course, CourseGroup, Section } from '@/shared/types/types';
import { Users, Search, BookOpen, Layers, UserCircle2, Hash, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/providers/AuthProvider';
import { studentService, StudentSession } from '@/shared/services/studentService';
import { normalizeGroupMembers } from '@/shared/lib/groupUtils';
import SectionAccessUnlock from './SectionAccessUnlock';

interface Props {
    courses: Course[];
    section: Section;
    batchId: string;
    userSubSection?: string;
}

const GroupRegisterView: React.FC<Props> = ({ courses, section, batchId, userSubSection }) => {
    const { profile: crProfile } = useAuth();
    const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [allGroupsData, setAllGroupsData] = useState<Map<string, CourseGroup[]>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    // PIN Security Check
    useEffect(() => {
        const checkSecurity = async () => {
            setIsVerifying(true);
            try {
                setIsLocked(await studentService.isSectionLocked(batchId, section, crProfile));
            } catch (e) {
                console.error('Security check failed:', e);
            } finally {
                setIsVerifying(false);
            }
        };
        checkSecurity();
        return studentService.subscribeSession(() => {
            checkSecurity();
        });
    }, [batchId, section, crProfile?.id, crProfile?.batch_id, crProfile?.section]);

    const handleUnlocked = (_session: StudentSession) => {
        setIsLocked(false);
    };

    const loadAllGroups = useCallback(async () => {
        setIsLoading(true);
        try {
            const groupsMap = new Map<string, CourseGroup[]>();
            for (const course of courses) {
                const data = await studentService.fetchGroups(batchId, course.id, section);
                if (data.length > 0) {
                    groupsMap.set(course.id, data);
                }
            }
            setAllGroupsData(groupsMap);
        } finally {
            setIsLoading(false);
        }
    }, [batchId, section, courses]);

    useEffect(() => {
        if (!isVerifying && !isLocked) {
            loadAllGroups();
        }
    }, [section, batchId, isVerifying, isLocked, loadAllGroups]);

    const currentGroups = allGroupsData.get(selectedCourseId) || [];
    const activeCourse = courses.find(c => c.id === selectedCourseId);

    const filteredGroups = currentGroups.filter(group => {
        const members = normalizeGroupMembers(group as Record<string, unknown>);
        return !searchQuery || members.some(m =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.student_id.includes(searchQuery)
        );
    });

    const totalStudents = currentGroups.reduce(
        (acc, g) => acc + normalizeGroupMembers(g as Record<string, unknown>).length,
        0
    );
    const avgGroupSize = currentGroups.length > 0 ? Math.round(totalStudents / currentGroups.length) : 0;

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
            {/* Simple Header */}
            <div className="p-4 lg:p-8 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                            <Users size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Group List</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                <Shield size={10} className="text-amber-500" />
                                Section {section} • PIN protected • {courses.length} Courses
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="tour-groups-search relative w-full md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-bold uppercase outline-none focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>

                {/* Course Tabs */}
                <div className="tour-groups-tabs flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {courses.map(course => {
                        const groupCount = allGroupsData.get(course.id)?.length || 0;
                        const isActive = selectedCourseId === course.id;
                        return (
                            <button
                                key={course.id}
                                onClick={() => setSelectedCourseId(course.id)}
                                className={`flex-shrink-0 px-5 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all ${isActive
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <BookOpen size={14} />
                                    <span>{course.code}</span>
                                    {groupCount > 0 && (
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${isActive ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
                                            }`}>
                                            {groupCount}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Quick Stats Bar */}
                {currentGroups.length > 0 && (
                    <div className="tour-groups-stats mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 p-3 lg:px-4 lg:py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl lg:rounded-2xl">
                        <div className="flex items-center gap-2">
                            <Layers size={14} className="text-indigo-600" />
                            <span className="text-[9px] lg:text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                {currentGroups.length} Groups
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <UserCircle2 size={14} className="text-emerald-600" />
                            <span className="text-[9px] lg:text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                {totalStudents} Students
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Hash size={14} className="text-purple-600" />
                            <span className="text-[9px] lg:text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                Avg {avgGroupSize} per Group
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
                <div className="max-w-6xl mx-auto">
                    {isVerifying ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verifying Security...</p>
                        </div>
                    ) : isLocked ? (
                        <div className="mt-12">
                            <SectionAccessUnlock
                                batchId={batchId}
                                section={section}
                                subSection={userSubSection}
                                description={`Lab group lists for Section ${section} are protected. Enter your details and CR PIN.`}
                                submitLabel="Unlock Groups"
                                onUnlocked={handleUnlocked}
                            />
                        </div>
                    ) : isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading groups...</p>
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300 mb-4">
                                <Users size={32} />
                            </div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                {searchQuery ? 'No matching students found' : 'No groups available'}
                            </h3>
                            <p className="text-[9px] font-medium text-slate-400 mt-1 uppercase">
                                {searchQuery ? 'Try a different search term' : 'Groups will appear here once added'}
                            </p>
                        </div>
                    ) : (
                        <div className="tour-groups-list space-y-6">
                            {/* Group by sub-section */}
                            {Array.from(new Set(filteredGroups.map(g => g.sub_section))).sort().map(subSection => {
                                const subGroups = filteredGroups.filter(g => g.sub_section === subSection);
                                const isMySubSection = userSubSection === subSection;

                                return (
                                    <div key={subSection} className={`rounded-3xl overflow-hidden border-2 ${isMySubSection
                                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10'
                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50'
                                        }`}>
                                        {/* Sub-section Header */}
                                        <div className={`px-6 py-4 border-b ${isMySubSection
                                            ? 'bg-emerald-100 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                                            }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMySubSection
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
                                                        }`}>
                                                        <Layers size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                                                            Sub-Section {section}{subSection}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                                {subGroups.length} {subGroups.length === 1 ? 'Group' : 'Groups'}
                                                            </p>
                                                            {((subSection === '2' && activeCourse?.teacher2) || activeCourse?.teacher) && (
                                                                <>
                                                                    <span className="w-0.5 h-0.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                                    <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">
                                                                        {subSection === '2' && activeCourse?.teacher2 ? activeCourse.teacher2 : activeCourse?.teacher}
                                                                    </p>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isMySubSection && (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-lg">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                        <span className="text-[9px] font-bold uppercase tracking-widest">My Section</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Groups Grid */}
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {subGroups.map(group => {
                                                const members = normalizeGroupMembers(group as Record<string, unknown>);
                                                return (
                                                <motion.div
                                                    key={group.id}
                                                    whileHover={{ y: -4 }}
                                                    className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all shadow-sm hover:shadow-md"
                                                >
                                                    {/* Group Header */}
                                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                                                                <span className="text-xs font-black text-indigo-600">G{group.group_number}</span>
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-900 dark:text-white uppercase">Group {group.group_number}</span>
                                                        </div>
                                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-[8px] font-bold text-slate-500 uppercase">
                                                            {members.length} Members
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {members.map((member) => (
                                                            <div key={member.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                                                        {member.name}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[9px] font-mono font-bold text-slate-400 flex-shrink-0">
                                                                    {member.student_id}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            );})}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}

        </div>
    );
};

export default GroupRegisterView;
