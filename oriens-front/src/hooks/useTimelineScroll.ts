import { useCallback, type RefObject } from 'react';
import { dayIndex, type TimelineWindow } from '@/lib/timeline';

/**
 * Centres a date in a timeline's horizontal scroller. `content` is the grid inside the ScrollArea; its
 * `[data-timeline-label]` cell is the sticky first column, whose width is left out of the day width.
 */
export function useTimelineScroll(content: RefObject<HTMLElement>, period: TimelineWindow) {
  return useCallback((date: string, smooth: boolean) => {
    const node = content.current;
    const viewport = node?.closest<HTMLElement>('[data-radix-scroll-area-viewport]');
    if (!node || !viewport) return;
    const label = node.querySelector<HTMLElement>('[data-timeline-label]')?.offsetWidth ?? 0;
    const day = (node.offsetWidth - label) / period.days;
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    viewport.scrollTo?.({ left: label + (dayIndex(period, date) + 0.5) * day - (viewport.clientWidth + label) / 2,
      behavior: smooth && !reduced ? 'smooth' : 'auto' });
  }, [content, period]);
}
