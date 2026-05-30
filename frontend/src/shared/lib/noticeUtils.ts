import { parseISO } from 'date-fns';
import { Notice } from '@/shared/types/types';

export type NoticePriority = 'low' | 'normal' | 'high' | 'urgent';

const PRIORITY_WEIGHT: Record<NoticePriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

export function sortNoticesByPriority(notices: Notice[]): Notice[] {
  return [...notices].sort((a, b) => {
    const pa = PRIORITY_WEIGHT[(a.priority as NoticePriority) || 'normal'];
    const pb = PRIORITY_WEIGHT[(b.priority as NoticePriority) || 'normal'];
    if (pb !== pa) return pb - pa;
    return parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime();
  });
}
