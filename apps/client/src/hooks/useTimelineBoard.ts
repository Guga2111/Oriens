import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProjectBoard } from '@/hooks/useWork';
import { useProductToday } from '@/hooks/useProductToday';
import { parseTimelineAnchor, parseTimelineScale, timelineWindow } from '@/lib/timeline';

/**
 * Board of the timeline window read from `?scale` and `?anchor`. The page and ProjectTimeline share this
 * query key, so the dialog placeholder reuses the timeline data without a second fetch. `projectId` 0 disables it.
 */
export function useTimelineBoard(projectId: number) {
  const today = useProductToday();
  const [params] = useSearchParams();
  const scale = parseTimelineScale(params.get('scale'));
  const anchor = parseTimelineAnchor(params.get('anchor'), today);
  const period = useMemo(() => timelineWindow(scale, anchor), [scale, anchor]);
  const board = useProjectBoard(projectId, { startDate: period.startDate, endDate: period.endDate }, true);
  return { board, today, scale, anchor, period };
}
