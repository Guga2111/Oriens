import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cva } from 'class-variance-authority';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { ObjectiveStatusIcon } from './ObjectiveProperties';
import { useProductToday } from '@/hooks/useProductToday';
import { useTimelineScroll } from '@/hooks/useTimelineScroll';
import { formatLongDate } from '@/lib/date';
import { objectiveStatusLabel } from '@/lib/objectives';
import {
  OBJECTIVE_SCALES, TITLE_INSIDE_DAYS, formatDuration, lowerSegments, objectiveSpan, objectiveWindow, parseObjectiveScale,
  upperSegments, type ObjectiveScale,
} from '@/lib/objective-timeline';
import { dayIndex, gridColumn, placeRange } from '@/lib/timeline';
import { cn } from '@/lib/utils';
import type { WorkObjective } from '@/types/work';

const GRID: Record<ObjectiveScale, string> = {
  week: 'grid-cols-objective-timeline-week', month: 'grid-cols-objective-timeline-month', quarter: 'grid-cols-objective-timeline-quarter',
};

/** Sticky first column; opaque so the column lines and the today band pass under it. */
const sidebarCell = 'sticky left-0 z-10 col-start-1 flex min-w-0 items-center border-r bg-card';

// The fill shows the objective's status, with the text on top in the foreground colour (plane.so's module bars).
const barVariants = cva('row-start-1 h-8 min-w-0 justify-start self-center overflow-clip rounded-sm px-0 font-normal text-foreground max-md:min-h-0 max-md:min-w-0', {
  variants: {
    tone: {
      idle: 'bg-muted-foreground/30 hover:bg-muted-foreground/40',
      started: 'bg-state-started/40 hover:bg-state-started/50',
      done: 'bg-state-completed/30 hover:bg-state-completed/40',
      cancelled: 'bg-state-cancelled/25 hover:bg-state-cancelled/35',
    },
    clippedStart: { true: 'rounded-l-none' },
    clippedEnd: { true: 'rounded-r-none' },
  },
});

const toneOf = (status: WorkObjective['status']) =>
  status === 'ON_DOING' ? 'started' : status === 'CONCLUDED' ? 'done' : status === 'CANCELLED' ? 'cancelled' : 'idle';

/**
 * Objectives over time, one bar per objective from start to end (plane.so's module timeline). The grid covers today
 * and every dated objective; `?scale` picks week, month or quarter. Bars and rows open the objective's details.
 */
export function ObjectiveTimeline({ objectives, onOpen }: { objectives: WorkObjective[]; onOpen: (id: number) => void }) {
  const today = useProductToday();
  const [params, setParams] = useSearchParams();
  const scale = parseObjectiveScale(params.get('scale'));
  const period = useMemo(() => objectiveWindow(scale, today, objectives), [scale, today, objectives]);
  const frame = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const scrollTo = useTimelineScroll(content, period);
  const [fullscreen, setFullscreen] = useState(false);
  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;
  const grid = GRID[scale];
  const upper = upperSegments(scale, period);
  const lower = lowerSegments(scale, period);
  const todayIndex = dayIndex(period, today);
  const todayColumn = todayIndex >= 0 && todayIndex < period.days ? todayIndex + 1 : null;

  // Centres today on open and on a scale change only; a re-render (opening an objective, a refetch) keeps the user's scroll.
  const centred = useRef('');
  useEffect(() => {
    const key = `${scale}:${today}`;
    if (centred.current === key) return;
    centred.current = key;
    scrollTo(today, false);
  }, [scrollTo, scale, today]);
  useEffect(() => {
    const sync = () => setFullscreen(!!frame.current && document.fullscreenElement === frame.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const setScale = (value: ObjectiveScale) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value === 'week') next.delete('scale'); else next.set('scale', value);
    return next;
  }, { replace: true });
  const toggleFullscreen = () => { if (fullscreen) void document.exitFullscreen(); else void frame.current?.requestFullscreen(); };

  return <section ref={frame} data-fill-page aria-label="Timeline dos objetivos" className={cn('flex min-w-0 flex-col bg-card', fullscreen && 'overflow-y-auto')}>
    <div className="flex flex-wrap items-center justify-end gap-2 border-b px-page py-2 md:px-6">
      <span className="text-2xs tabular-nums text-muted-foreground">{objectives.length === 1 ? '1 objetivo' : `${objectives.length} objetivos`}</span>
      <SegmentedControl label="Escala da timeline" options={OBJECTIVE_SCALES} value={scale} onChange={setScale} />
      <Button variant="outline" size="sm" onClick={() => scrollTo(today, true)}>Hoje</Button>
      {canFullscreen && <Button variant="outline" size="icon" className="size-7" aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'} aria-pressed={fullscreen} onClick={toggleFullscreen}>
        {fullscreen ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
      </Button>}
    </div>
    {todayColumn !== null && <span className="sr-only">Hoje é {formatLongDate(today)}</span>}
    {/* Grows with the page (see [data-fill-page]), so the column lines run to the bottom even with few objectives. */}
    <ScrollArea orientation="horizontal" className="w-full flex-1 [&_[data-radix-scroll-area-viewport]>div]:!flex [&_[data-radix-scroll-area-viewport]>div]:min-h-full [&_[data-radix-scroll-area-viewport]>div]:flex-col">
      <div ref={content} className="relative w-max min-w-full flex-1 pb-2" style={{ '--timeline-days': period.days } as CSSProperties}>
        {/* Column lines: days on the week scale, weeks on the month scale, months on the quarter scale. */}
        <div aria-hidden className={cn('pointer-events-none absolute inset-0 grid', grid)}>
          {lower.map(segment => <div key={segment.key} style={{ gridColumn: gridColumn(segment), gridRow: 1 }} className="border-l border-muted" />)}
          {/* Carries the sticky column to the bottom, so the lines below the last row stay out of it. */}
          <div className={cn(sidebarCell, 'row-start-1')} />
        </div>

        <div aria-hidden className={cn('relative grid h-12 grid-rows-2 border-b text-muted-foreground', grid)}>
          <div data-timeline-label className={cn(sidebarCell, 'row-span-2 justify-between gap-3 px-4 text-sm')}>
            <span>Objetivos</span><span>Duração</span>
          </div>
          {upper.map(segment => <div key={segment.key} style={{ gridColumn: gridColumn(segment) }}
            className="row-start-1 flex min-w-0 items-center justify-between gap-2 px-2">
            {/* The week number comes first in the DOM but sits last, so the sticky label paints over it when they meet. */}
            {segment.aside && <span className="order-last shrink-0 text-2xs">{segment.aside}</span>}
            <span className="sticky left-objective-timeline-sidebar truncate bg-card pr-2 text-sm capitalize text-foreground">{segment.label}</span>
          </div>)}
          {lower.map((segment, index) => {
            const isToday = scale === 'week' && segment.column === todayColumn;
            return <div key={segment.key} style={{ gridColumn: gridColumn(segment) }}
              className={cn('row-start-2 flex min-w-0 items-center gap-1 truncate px-1 text-2xs', segment.aside ? 'justify-between' : 'px-2',
                index > 0 && 'border-l border-muted')}>
              <span className="truncate capitalize">{segment.label}</span>
              {segment.aside && <span className={cn('rounded-sm px-1 tabular-nums text-foreground', isToday && 'bg-now font-semibold text-background')}>{segment.aside}</span>}
            </div>;
          })}
        </div>

        <ul aria-label="Objetivos na timeline">
          {objectives.map(objective => <ObjectiveRow key={objective.id} objective={objective} scale={scale} grid={grid} period={period} onOpen={onOpen} />)}
        </ul>

        {/* Over the rows, so the band still shows on a hovered row; under the sticky column (z-10). */}
        {todayColumn !== null && <div aria-hidden className={cn('pointer-events-none absolute inset-0 grid', grid)}>
          <div data-timeline-today className="bg-now/10" style={{ gridColumn: gridColumn({ column: todayColumn, span: 1 }), gridRow: 1 }} />
        </div>}
      </div>
    </ScrollArea>
  </section>;
}

function ObjectiveRow({ objective, scale, grid, period, onOpen }: {
  objective: WorkObjective; scale: ObjectiveScale; grid: string; period: ReturnType<typeof objectiveWindow>; onOpen: (id: number) => void;
}) {
  const span = objectiveSpan(objective);
  const placement = span && placeRange(period, span.lo, span.hi);
  const inside = !!placement && placement.span >= TITLE_INSIDE_DAYS[scale];
  const afterBar = placement ? placement.column + placement.span : 0;
  return <li className={cn('group/row relative grid h-11 hover:bg-accent/50', grid)}>
    <div className={cn(sidebarCell, 'row-start-1')}>
      {/* The keyboard and screen-reader target of the row; the bar is a mouse shortcut to the same details. */}
      <Button variant={null} size={null} onClick={() => onOpen(objective.id)}
        aria-label={`${objective.title}, ${objectiveStatusLabel(objective.status)}, duração: ${formatDuration(span)}`}
        className="size-full min-w-0 justify-between gap-3 rounded-none px-4 font-normal group-hover/row:bg-accent/50">
        <span className="flex min-w-0 items-center gap-2">
          <ObjectiveStatusIcon status={objective.status} />
          <span className="truncate">{objective.title}</span>
        </span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{formatDuration(span)}</span>
      </Button>
    </div>
    {placement && <Button variant={null} size={null} tabIndex={-1} aria-hidden onClick={() => onOpen(objective.id)} style={{ gridColumn: gridColumn(placement) }}
      className={barVariants({ tone: toneOf(objective.status), clippedStart: placement.clippedStart, clippedEnd: placement.clippedEnd })}>
      {/* Sticks beside the sidebar, so a bar that starts off-screen still shows its title. */}
      {inside && <span className="sticky left-objective-timeline-sidebar truncate px-2.5">{objective.title}</span>}
    </Button>}
    {placement && !inside && afterBar <= period.days && <span aria-hidden style={{ gridColumn: `${afterBar + 1} / -1` }}
      className="row-start-1 self-center truncate pl-2 text-sm text-muted-foreground">{objective.title}</span>}
  </li>;
}
