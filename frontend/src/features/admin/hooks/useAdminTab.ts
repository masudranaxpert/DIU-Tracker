import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const ADMIN_TABS = [
  'dashboard',
  'cr_management',
  'students',
  'teachers',
  'course_list',
  'question_bank',
  'batches',
  'feedback',
  'rclone',
  'academic_calendar',
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number];

export function useAdminTab() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  const currentTab: AdminTab = ADMIN_TABS.includes(tab as AdminTab)
    ? (tab as AdminTab)
    : 'dashboard';

  useEffect(() => {
    if (!tab || !ADMIN_TABS.includes(tab as AdminTab)) {
      navigate('/admin-panel/dashboard', { replace: true });
    }
  }, [tab, navigate]);

  const setTab = useCallback(
    (next: AdminTab) => navigate(`/admin-panel/${next}`),
    [navigate]
  );

  return { currentTab, setTab };
}
