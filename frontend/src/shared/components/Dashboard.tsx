import React from 'react';
import { AcademicRecord, Course, EntryType, Notice, Deadline, Section } from '@/shared/types/types';
import { isToday, isFuture, isBefore, parseISO, startOfToday } from 'date-fns';
import QuickPreviewModal from './QuickPreviewModal';
import NoticeBoard from './NoticeBoard';
import DashboardHero from './dashboard/DashboardHero';
import TodaySchedule from './dashboard/TodaySchedule';
import CourseColumns from './dashboard/CourseColumns';
import DeadlinesPanel from './dashboard/DeadlinesPanel';
import DeadlineDetailModal from './dashboard/DeadlineDetailModal';
import { isLabCourse } from './dashboard/dashboardUtils';

interface Props {
  records: AcademicRecord[];
  courses: Course[];
  notices: Notice[];
  deadlines: Deadline[];
  onAction: (tab: string, subId?: string) => void;
  onDateSelect?: (date: Date | string) => void;
  userProfile?: { sub_section?: string; section: string };
  batchId: string;
  section: string;
}

const Dashboard: React.FC<Props> = ({
  records,
  courses,
  notices,
  deadlines,
  onAction,
  onDateSelect,
  batchId,
  section,
}) => {
  const [selectedRecord, setSelectedRecord] = React.useState<AcademicRecord | null>(null);
  const [selectedDeadline, setSelectedDeadline] = React.useState<Deadline | null>(null);

  const activeNotices = React.useMemo(() => {
    const now = new Date();
    return notices.filter((n) => !n.expires_at || new Date(n.expires_at) > now);
  }, [notices]);

  const todayActivityRecords = React.useMemo(
    () => records.filter((r) => isToday(parseISO(r.date)) && r.type !== EntryType.MATERIAL),
    [records]
  );

  const upcomingDeadlines = React.useMemo(
    () =>
      (deadlines || [])
        .filter((d) => d?.date && (isFuture(parseISO(d.date)) || isToday(parseISO(d.date))))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [deadlines]
  );

  const pastDeadlines = React.useMemo(
    () =>
      (deadlines || [])
        .filter((d) => d?.date && isBefore(parseISO(d.date), startOfToday()))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [deadlines]
  );

  const theoryCourses = courses.filter((c) => !isLabCourse(c.name));
  const labCourses = courses.filter((c) => isLabCourse(c.name));

  return (
    <div className="space-y-6 pb-28">
      <QuickPreviewModal
        record={selectedRecord}
        courseName={courses.find((c) => c.id === selectedRecord?.course_id)?.name}
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onNavigateToRecord={(record) => setSelectedRecord(record)}
        onNavigateToDate={(date) => {
          setSelectedRecord(null);
          onDateSelect?.(date);
        }}
      />

      <DashboardHero section={section} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
        <div className="xl:col-span-8 space-y-6 lg:space-y-8">
          <TodaySchedule
            records={todayActivityRecords}
            courses={courses}
            onOpenRecord={setSelectedRecord}
            onOpenCalendar={() => onAction('calendar')}
          />

          {activeNotices.length > 0 && (
            <div className="tour-notices">
              <NoticeBoard
                notices={activeNotices}
                courses={courses}
                onDateSelect={onDateSelect}
                onAction={onAction}
                batchId={batchId}
                section={section as Section}
              />
            </div>
          )}

          <CourseColumns
            theoryCourses={theoryCourses}
            labCourses={labCourses}
            onSelectCourse={(courseId) => onAction('courses', courseId)}
            onViewGroups={() => onAction('groups')}
          />
        </div>

        <DeadlinesPanel
          upcoming={upcomingDeadlines}
          past={pastDeadlines}
          courses={courses}
          onSelect={setSelectedDeadline}
        />
      </div>

      <DeadlineDetailModal
        deadline={selectedDeadline}
        courses={courses}
        onClose={() => setSelectedDeadline(null)}
      />
    </div>
  );
};

export default Dashboard;
