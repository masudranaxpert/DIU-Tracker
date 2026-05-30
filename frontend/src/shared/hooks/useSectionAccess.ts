import { useEffect, useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { studentService } from '@/shared/services/studentService';
import type { Section } from '@/shared/types/types';

/** PIN-gated section: locked=true until verified; starts locked to avoid content flash. */
export function useSectionAccess(batchId: string, section: Section | string) {
  const { profile } = useAuth();
  const [locked, setLocked] = useState(true);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      setVerifying(true);
      try {
        const isLocked = await studentService.isSectionLocked(batchId, section, profile);
        if (!cancelled) {
          setLocked(isLocked);
          setVerifying(false);
        }
      } catch {
        if (!cancelled) {
          setLocked(true);
          setVerifying(false);
        }
      }
    };

    void check();
    return studentService.subscribeSession(() => {
      void check();
    });
  }, [batchId, section, profile?.id, profile?.batch_id, profile?.section, profile?.is_cr]);

  return { locked, verifying, unlocked: !locked && !verifying };
}
