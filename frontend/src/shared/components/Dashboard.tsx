import React from 'react';
import { Course, Notice, Deadline, Section } from '@/shared/types/types';
import { isToday, isFuture, isBefore, parseISO, startOfToday } from 'date-fns';
import NoticeBoard from './NoticeBoard';
import DashboardHero from './dashboard/DashboardHero';
import CourseColumns from './dashboard/CourseColumns';
import DeadlinesPanel from './dashboard/DeadlinesPanel';
import DeadlineDetailModal from './dashboard/DeadlineDetailModal';
import { isLabCourse } from './dashboard/dashboardUtils';

interface Props {
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
  courses,
  notices,
  deadlines,
  onAction,
  onDateSelect,
  batchId,
  section,
}) => {
  const [selectedDeadline, setSelectedDeadline] = React.useState<Deadline | null>(null);

  const activeNotices = React.useMemo(() => {
    const now = new Date();
    return notices.filter((n) => !n.expires_at || new Date(n.expires_at) > now);
  }, [notices]);

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
      <DashboardHero section={section} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
        <div className="xl:col-span-8 space-y-6 lg:space-y-8">
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
