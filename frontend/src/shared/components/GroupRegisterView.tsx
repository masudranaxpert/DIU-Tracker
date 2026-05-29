import React, { useState, useEffect, useCallback } from 'react';
import { Course, CourseGroup, Section } from '@/shared/types/types';
import { Users, Search, BookOpen, Layers, UserCircle2, Hash, Shield, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/providers/AuthProvider';
import { studentService, StudentSession } from '@/shared/services/studentService';
import { normalizeGroupMembers } from '@/shared/lib/groupUtils';
import { initials, gradientFor } from '@/shared/lib/avatar';
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
        <div className="space-y-6 pb-28">
            {/* Header card */}
            <div className="rounded-[2rem] lg:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <div className="p-5 lg:p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                                <Users size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg lg:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Group List</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                    <Shield size={11} className="text-amber-500" />
                                    Section {section} • PIN protected • {courses.length} Courses
                                </p>
                            </div>
                        </div>

                        <div className="tour-groups-search relative w-full md:w-72">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search name or ID..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-bold outline-none focus:border-indigo-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Course Tabs */}
                    <div className="tour-groups-tabs flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {courses.map(course => {
                            const groupCount = allGroupsData.get(course.id)?.length || 0;
                            const isActive = selectedCourseId === course.id;
                            return (
                                <button
                                    key={course.id}
                                    onClick={() => setSelectedCourseId(course.id)}
                                    className={`flex-shrink-0 px-5 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all ${isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <BookOpen size={14} />
                                        <span>{course.code}</span>
                                        {groupCount > 0 && (
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${isActive ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
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
                        <div className="tour-groups-stats mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 p-3 lg:px-5 lg:py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <div className="flex items-center gap-2">
                                <Layers size={14} className="text-indigo-600" />
                                <span className="text-[9px] lg:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                    {currentGroups.length} Groups
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <UserCircle2 size={14} className="text-emerald-600" />
                                <span className="text-[9px] lg:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                    {totalStudents} Students
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Hash size={14} className="text-purple-600" />
                                <span className="text-[9px] lg:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                    Avg {avgGroupSize} / Group
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            {isVerifying ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verifying Security...</p>
                </div>
            ) : isLocked ? (
                <div className="max-w-xl mx-auto pt-6">
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
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300 mb-4">
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
                    {Array.from(new Set(filteredGroups.map(g => g.sub_section))).sort().map(subSection => {
                        const subGroups = filteredGroups.filter(g => g.sub_section === subSection);
                        const isMySubSection = userSubSection === subSection;
                        const teacher = subSection === '2' && activeCourse?.teacher2 ? activeCourse.teacher2 : activeCourse?.teacher;

                        return (
                            <div key={subSection} className={`rounded-[1.75rem] overflow-hidden border ${isMySubSection
                                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                                }`}>
                                {/* Sub-section Header */}
                                <div className={`px-5 lg:px-6 py-4 border-b ${isMySubSection
                                    ? 'bg-emerald-100/70 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                                    }`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isMySubSection
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
                                                }`}>
                                                <Layers size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                    Sub-Section {section}{subSection}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {subGroups.length} {subGroups.length === 1 ? 'Group' : 'Groups'}
                                                    </p>
                                                    {teacher && (
                                                        <>
                                                            <span className="w-0.5 h-0.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest truncate flex items-center gap-1">
                                                                <GraduationCap size={11} /> {teacher}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {isMySubSection && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-lg shrink-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">My Section</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Groups Grid */}
                                <div className="p-4 lg:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {subGroups.map(group => {
                                        const members = normalizeGroupMembers(group as Record<string, unknown>);
                                        return (
                                            <motion.div
                                                key={group.id}
                                                whileHover={{ y: -4 }}
                                                className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm hover:shadow-lg overflow-hidden flex flex-col"
                                            >
                                                {/* Group Header */}
                                                <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-slate-800 dark:to-slate-800 border-b border-slate-100 dark:border-slate-700">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/20">
                                                            <span className="text-xs font-black">G{group.group_number}</span>
                                                        </div>
                                                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Group {group.group_number}</span>
                                                    </div>
                                                    <span className="px-2.5 py-1 bg-white/70 dark:bg-slate-900/60 rounded-lg text-[9px] font-black text-indigo-600 dark:text-indigo-300 uppercase">
                                                        {members.length}
                                                    </span>
                                                </div>

                                                {/* Members */}
                                                <div className="p-3 space-y-1.5 flex-1">
                                                    {members.length === 0 ? (
                                                        <div className="py-6 text-center">
                                                            <p className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Empty group</p>
                                                        </div>
                                                    ) : (
                                                        members.map((member, idx) => (
                                                            <div key={member.id || `${member.student_id}-${idx}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradientFor(member.student_id || member.name)} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                                                                    <span className="text-[10px] font-black">{initials(member.name)}</span>
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-[12px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                                                                        {member.name || 'Unnamed'}
                                                                    </p>
                                                                    <p className="text-[10px] font-mono font-semibold text-indigo-500 dark:text-indigo-400 tracking-tight mt-0.5">
                                                                        {member.student_id || '—'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default GroupRegisterView;
