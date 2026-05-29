import React, { useState, useEffect, useCallback } from 'react';
import { Course, CourseGroup, Section } from '@/shared/types/types';
import { Users, Search, BookOpen, Layers, Shield, GraduationCap } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { studentService, StudentSession } from '@/shared/services/studentService';
import { normalizeGroupMembers } from '@/shared/lib/groupUtils';
import { initials, avatarClass } from '@/shared/lib/avatar';
import SectionAccessUnlock from './SectionAccessUnlock';

interface Props {
    courses: Course[];
    section: Section;
    batchId: string;
    userSubSection?: string;
}

const SUB_SECTIONS = ['1', '2'] as const;

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

    const noSearchMatch = !!searchQuery && filteredGroups.length === 0;

    return (
        <div className="space-y-5 pb-28">
            {/* Header */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="p-5 lg:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0">
                                <Users size={22} />
                            </div>
                            <div>
                                <h2 className="text-base lg:text-lg font-bold text-slate-900 dark:text-white">Group List</h2>
                                <p className="text-[11px] font-medium text-slate-400 mt-0.5 flex items-center gap-1.5">
                                    <Shield size={11} className="text-slate-400" />
                                    Section {section} • PIN protected
                                </p>
                            </div>
                        </div>

                        <div className="tour-groups-search relative w-full md:w-72">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search name or ID..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[12px] font-medium outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Course Tabs */}
                    <div className="tour-groups-tabs flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {courses.map(course => {
                            const groupCount = allGroupsData.get(course.id)?.length || 0;
                            const isActive = selectedCourseId === course.id;
                            return (
                                <button
                                    key={course.id}
                                    onClick={() => setSelectedCourseId(course.id)}
                                    className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer ${isActive
                                        ? 'bg-indigo-600 text-white'
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

                    {/* Quick stats */}
                    {currentGroups.length > 0 && (
                        <div className="tour-groups-stats mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                <Layers size={14} className="text-slate-400" /> {currentGroups.length} Groups
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                <Users size={14} className="text-slate-400" /> {totalStudents} Students
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            {isVerifying ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-10 h-10 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verifying access…</p>
                </div>
            ) : isLocked ? (
                <div className="max-w-xl mx-auto pt-4">
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
                    <div className="w-10 h-10 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading groups…</p>
                </div>
            ) : noSearchMatch ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-300 mb-3">
                        <Search size={26} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">No matching students</h3>
                    <p className="text-[10px] font-medium text-slate-400 mt-1">Try a different name or ID</p>
                </div>
            ) : (
                <div className="tour-groups-list space-y-5">
                    {SUB_SECTIONS.map(subSection => {
                        const subGroups = filteredGroups
                            .filter(g => g.sub_section === subSection)
                            .sort((a, b) => a.group_number - b.group_number);
                        // While searching, hide sub-sections with no matches.
                        if (searchQuery && subGroups.length === 0) return null;

                        const isMySubSection = userSubSection === subSection;
                        const teacher = subSection === '2' && activeCourse?.teacher2 ? activeCourse.teacher2 : activeCourse?.teacher;

                        return (
                            <div key={subSection} className={`rounded-xl overflow-hidden border ${isMySubSection
                                ? 'border-indigo-300 dark:border-indigo-800'
                                : 'border-slate-200 dark:border-slate-800'
                                } bg-white dark:bg-slate-900`}>
                                {/* Sub-section Header */}
                                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0">
                                                <Layers size={17} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                    Sub-Section {section}{subSection}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <p className="text-[10px] font-medium text-slate-400">
                                                        {subGroups.length} {subGroups.length === 1 ? 'Group' : 'Groups'}
                                                    </p>
                                                    {teacher && (
                                                        <>
                                                            <span className="w-0.5 h-0.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                                                <GraduationCap size={11} /> {teacher}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {isMySubSection && (
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-md shrink-0">
                                                My Section
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Groups Grid */}
                                {subGroups.length === 0 ? (
                                    <div className="py-10 text-center">
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                            No groups for {section}{subSection} yet
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-4 lg:p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                                        {subGroups.map(group => {
                                            const members = normalizeGroupMembers(group as Record<string, unknown>);
                                            return (
                                                <div
                                                    key={group.id}
                                                    className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
                                                >
                                                    {/* Group Header */}
                                                    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="w-7 h-7 bg-indigo-600 text-white rounded-md flex items-center justify-center text-[10px] font-black">
                                                                G{group.group_number}
                                                            </span>
                                                            <span className="text-[13px] font-bold text-slate-900 dark:text-white">Group {group.group_number}</span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                                                            {members.length}
                                                        </span>
                                                    </div>

                                                    {/* Members */}
                                                    <div className="p-2.5 space-y-1 flex-1">
                                                        {members.length === 0 ? (
                                                            <div className="py-5 text-center">
                                                                <p className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Empty group</p>
                                                            </div>
                                                        ) : (
                                                            members.map((member, idx) => (
                                                                <div key={member.id || `${member.student_id}-${idx}`} className="flex items-center gap-2.5 px-2 py-2 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                                    <span className={`w-8 h-8 rounded-md ${avatarClass} flex items-center justify-center text-[10px] font-bold shrink-0`}>
                                                                        {initials(member.name)}
                                                                    </span>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-[12px] font-medium text-slate-900 dark:text-white truncate leading-snug">
                                                                            {member.name || 'Unnamed'}
                                                                        </p>
                                                                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-[10px] font-mono font-normal text-indigo-600 dark:text-indigo-300 leading-normal">
                                                                            {member.student_id || '—'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default GroupRegisterView;
