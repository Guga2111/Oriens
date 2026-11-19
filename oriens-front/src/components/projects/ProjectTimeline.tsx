import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { TimelineGroup } from '@/components/projects/timeline/TimelineGroup';
import { TimelineHeader } from '@/components/projects/timeline/TimelineHeader';
import { useTimelineBoard } from '@/hooks/useTimelineBoard';
import { formatLongDate } from '@/lib/date';
import { TASK_STATUS } from '@/lib/labels';
import {
  TIMELINE_SCALES, dayIndex, gridColumn, layoutTimeline, shiftTimelineAnchor, timelineDays, weekSegments, type TimelineScale,
} from '@/lib/timeline';
import { cn } from '@/lib/utils';
import type { WorkProject, WorkTask } from '@/types/work';

const GRID: Record<TimelineScale, string> = {
  week: 'grid-cols-timeline-week', fortnight: 'grid-cols-timeline-fortnight', month: 'grid-cols-timeline-month',
};

/**
 * Gantt view of a DEVELOPMENT project: the board within a date window, grouped by objective (spec §5).
 * `onAdd` opens the page's own TaskEditor, so the timeline never owns a second editor.
 */
export function ProjectTimeline({ project, onOpen, onAdd }: {
  project: WorkProject; onOpen: (task: WorkTask) => void; onAdd: () => void;
}) {
  const [, setParams] = useSearchParams();
  const { board, today, scale, anchor, period } = useTimelineBoard(project.id);
  const layout = useMemo(() => board.data && layoutTimeline(board.data.tasks, project.objectives ?? [], period), [board.data, project.objectives, period]);
  // Only explicit toggles are kept; otherwise a group is open when it has rows in the window.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const content = useRef<HTMLDivElement>(null);
  const grid = GRID[scale];
  const todayIndex = dayIndex(period, today);
  const todayColumn = todayIndex >= 0 && todayIndex < period.days ? todayIndex + 1 : null;

  const update = (changes: Record<string, string | null>) => setParams(previous => {
    const next = new URLSearchParams(previous);
    Object.entries(changes).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, value));
    return next;
  }, { replace: true });

  const scrollTo = useCallback((date: string, smooth: boolean) => {
    const node = content.current;
    const viewport = node?.closest<HTMLElement>('[data-radix-scroll-area-viewport]');
    if (!node || !viewport) return;
    const label = node.querySelector<HTMLElement>('[data-timeline-label]')?.offsetWidth ?? 0;
    const day = (node.offsetWidth - label) / period.days;
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    viewport.scrollTo?.({ left: label + (dayIndex(period, date) + 0.5) * day - (viewport.clientWidth + label) / 2,
      behavior: smooth && !reduced ? 'smooth' : 'auto' });
  }, [period]);
  const hasLayout = !!layout;
  // Keep the anchor in view whenever the window changes or first renders.
  useEffect(() => { if (hasLayout) scrollTo(anchor, false); }, [hasLayout, anchor, scrollTo]);

  const goToday = () => { update({ anchor: null }); scrollTo(today, true); };
  const days = timelineDays(period);
  const weekStarts = new Set(weekSegments(period).map(week => week.column));
  const outside = board.data ? board.data.total.totalTasks - board.data.visible.totalTasks : 0;
  const empty = layout && layout.groups.every(group => !group.rows.length) && !layout.undated.length;

  return <div className="flex min-w-0 flex-col gap-4">
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup type="single" variant="outline" size="sm" value={scale} aria-label="Escala da timeline"
        onValueChange={value => { if (value) update({ scale: value }); }}>
        {TIMELINE_SCALES.map(option => <ToggleGroupItem key={option.value} value={option.value}>{option.label}</ToggleGroupItem>)}
      </ToggleGroup>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={goToday}>Hoje</Button>
        <Button variant="ghost" size="icon" aria-label="Período anterior" onClick={() => update({ anchor: shiftTimelineAnchor(scale, anchor, -1) })}><ChevronLeft aria-hidden /></Button>
        <Button variant="ghost" size="icon" aria-label="Próximo período" onClick={() => update({ anchor: shiftTimelineAnchor(scale, anchor, 1) })}><ChevronRight aria-hidden /></Button>
      </div>
      {board.isFetching && !board.isPending && <Spinner aria-label="Atualizando a timeline" className="text-muted-foreground" />}
      {!!layout?.cancelled && <span className="ml-auto text-sm text-muted-foreground tabular-nums">
        {layout.cancelled === 1 ? '1 cancelada oculta' : `${layout.cancelled} canceladas ocultas`}</span>}
    </div>

    <WorkFeedback error={board.error} retry={() => void board.refetch()} />
    {board.isPending && <div className="flex flex-col gap-2" aria-label="Carregando timeline">
      <Skeleton className="h-16 w-full" />
      {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}
    </div>}

    {board.data && !board.data.total.totalTasks ? <Empty className="border">
      <EmptyHeader><EmptyTitle>Nenhuma tarefa neste projeto</EmptyTitle>
        <EmptyDescription>As tarefas com planejamento ou prazo aparecem aqui ao longo do tempo.</EmptyDescription></EmptyHeader>
      <EmptyContent><Button onClick={onAdd}><Plus aria-hidden />Nova tarefa</Button></EmptyContent>
    </Empty> : layout && <>
      <section aria-label="Timeline do projeto" className="min-w-0 overflow-hidden rounded-lg border bg-card">
        {/* Outside the horizontal scroller so it wraps to the frame width on phones. */}
        {empty && <div className="flex flex-wrap items-center gap-3 border-b px-3 py-4">
          <p className="text-sm text-muted-foreground">
            Nenhuma tarefa neste período{outside > 0 ? ` · ${outside} fora do período` : ''}</p>
          <Button variant="outline" size="sm" onClick={goToday}>Hoje</Button>
        </div>}
        <ScrollArea orientation="horizontal" className="w-full">
          <div ref={content} className="relative w-max min-w-full pb-2" style={{ '--timeline-days': period.days } as CSSProperties}>
            {/* Column grid: day lines and weekend tone where days are drawn (week, fortnight), week lines only on the month scale. */}
            <div aria-hidden className={cn('pointer-events-none absolute inset-x-0 bottom-2 top-0 grid', grid)}>
              {scale === 'month'
                ? weekSegments(period).map(week => <div key={week.key} style={{ gridColumn: gridColumn(week), gridRow: 1 }}
                  className={cn(week.column > 1 && 'border-l border-border')} />)
                : days.map((day, index) => <div key={day.date} style={{ gridColumn: gridColumn({ column: index + 1, span: 1 }), gridRow: 1 }}
                  className={cn(index > 0 && 'border-l', weekStarts.has(index + 1) ? 'border-border' : 'border-muted', day.weekend && 'bg-background')} />)}
              {/* Starts below the 5rem TimelineHeader so it never crosses the date labels. */}
              {todayColumn !== null && <div data-timeline-today className="mt-20 w-px justify-self-center bg-now" style={{ gridColumn: gridColumn({ column: todayColumn, span: 1 }), gridRow: 1 }} />}
            </div>
            {todayColumn !== null && <span className="sr-only">Hoje é {formatLongDate(today)}</span>}
            <TimelineHeader period={period} scale={scale} grid={grid} todayColumn={todayColumn} />
            {layout.groups.map(group => <TimelineGroup key={group.key} group={group} grid={grid} scale={scale} period={period} today={today}
              open={toggled[group.key] ?? group.rows.length > 0} onOpenChange={open => setToggled(state => ({ ...state, [group.key]: open }))} onOpen={onOpen} />)}
          </div>
        </ScrollArea>
      </section>
      {layout.undated.length > 0 && <section aria-labelledby="timeline-undated" className="flex flex-col gap-2">
        <h3 id="timeline-undated" className="text-sm font-semibold">Sem data <span className="font-normal tabular-nums text-muted-foreground">{layout.undated.length}</span></h3>
        <ul className="flex flex-col">
          {layout.undated.map(task => <li key={task.id}>
            <Button variant="ghost" className="h-auto min-h-10 w-full justify-between gap-3 whitespace-normal text-left font-normal" onClick={() => onOpen(task)}>
              <span className="min-w-0 break-words">{task.title}</span>
              <Badge variant={TASK_STATUS[task.status].badge}>{TASK_STATUS[task.status].label}</Badge>
            </Button>
          </li>)}
        </ul>
      </section>}
    </>}
  </div>;
}
