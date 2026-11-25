import type { FocusEvent } from 'react';
import { cva } from 'class-variance-authority';
import { AlertTriangle, Check, Diamond } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TASK_STATUS } from '@/lib/labels';
import { isTaskOverdue } from '@/lib/tasks';
import { TITLE_INSIDE_DAYS, formatTimelineDate, gridColumn, type TimelineRow, type TimelineScale } from '@/lib/timeline';
import { cn } from '@/lib/utils';
import type { WorkTask } from '@/types/work';

/** Keyboard focus scrolls a bar clear of the sticky label column instead of under it (WCAG 2.4.11). */
const focusClearOfLabels = 'scroll-ml-timeline-label';
// The browser skips its own focus scroll when the bar is partly visible, even if the label column covers it;
// scrollIntoView honours the scroll margin and does nothing when the bar is already clear.
const revealFocused = (event: FocusEvent<HTMLElement>) => {
  if (event.currentTarget.matches(':focus-visible')) event.currentTarget.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
};

// The fill shows the task state, never progress (§5.5). Late wins over pending/doing.
// secondary, muted and accent share one tone in the light theme, so open bars are outlined on the card
// and done bars filled: the two stay apart, and every hover is a real step.
// overflow-clip (not hidden) keeps the scroller as the sticky title's scroll container.
const barVariants = cva(`row-start-1 min-w-0 justify-start self-center overflow-clip pr-2 text-xs max-md:min-w-0 ${focusClearOfLabels}`, {
  variants: {
    tone: {
      pending: 'border border-muted-foreground bg-card text-foreground hover:bg-muted',
      doing: 'bg-primary text-primary-foreground hover:bg-primary/90',
      done: 'bg-muted text-muted-foreground hover:bg-muted-foreground/15',
      late: 'border border-negative bg-card text-negative hover:bg-muted',
    },
    // A bar too short for its title is drawn thin, so a one-day bar never reads as a checkbox.
    titled: { true: 'h-7', false: 'h-4 max-md:min-h-0' },
    clippedStart: { true: 'rounded-l-none' },
    clippedEnd: { true: 'rounded-r-none' },
  },
});

type Tone = 'pending' | 'doing' | 'done' | 'late';

function toneOf(task: WorkTask, inverted: boolean, today: string): Tone {
  if (task.status === 'CONCLUDED') return 'done';
  if (inverted || isTaskOverdue(task, today)) return 'late';
  return task.status === 'ON_DOING' ? 'doing' : 'pending';
}

function dates(task: WorkTask) {
  return [task.plannedDate ? `planejada ${formatTimelineDate(task.plannedDate)}` : 'sem planejamento',
    task.dueDate ? `prazo ${formatTimelineDate(task.dueDate)}` : 'sem prazo'];
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function TimelineBar({ row, scale, days, today, onOpen }: {
  row: TimelineRow; scale: TimelineScale; days: number; today: string; onOpen: (task: WorkTask) => void;
}) {
  const { task, span, placement } = row;
  const inverted = span.kind === 'inverted';
  const tone = toneOf(task, inverted, today);
  const late = tone === 'late' && isTaskOverdue(task, today);
  const status = TASK_STATUS[task.status].label;
  const name = [task.title, status.toLowerCase(), ...dates(task), late && 'atrasada', inverted && 'planejada para depois do prazo']
    .filter(Boolean).join(', ');
  const milestone = span.kind === 'milestone';
  const inside = !milestone && placement.span >= TITLE_INSIDE_DAYS[scale];
  const afterBar = placement.column + placement.span;
  const Icon = tone === 'done' ? Check : tone === 'late' ? AlertTriangle : null;
  return <>
    <Tooltip>
      <TooltipTrigger asChild>
        {milestone
          ? <Button variant={null} size={null} aria-label={name} onClick={() => onOpen(task)} onFocus={revealFocused} style={{ gridColumn: gridColumn(placement) }}
            className={cn('row-start-1 size-7 justify-self-center self-center p-0 hover:bg-accent max-md:min-w-0', focusClearOfLabels,
              tone === 'late' ? 'text-negative' : tone === 'done' ? 'text-muted-foreground' : 'text-primary')}>
            <Diamond aria-hidden className="fill-current" />
          </Button>
          : <Button variant={null} size={null} aria-label={name} onClick={() => onOpen(task)} onFocus={revealFocused} style={{ gridColumn: gridColumn(placement) }}
            className={barVariants({ tone, titled: inside, clippedStart: placement.clippedStart, clippedEnd: placement.clippedEnd })}>
            {/* Sticks beside the label column, so a bar that starts off-screen still shows its title. */}
            {inside && <span data-timeline-title className="sticky left-timeline-label flex min-w-0 items-center gap-2 pl-2">
              {Icon && <Icon aria-hidden />}
              <span className={cn('truncate', tone === 'done' && 'line-through')}>{task.title}</span>
            </span>}
          </Button>}
      </TooltipTrigger>
      <TooltipContent className="flex flex-col gap-0.5">
        <span className="font-medium">{task.title}</span>
        <span className="text-muted-foreground">{dates(task).map(capitalize).join(' · ')}</span>
        <span>{status}{late ? ' · Atrasada' : ''}</span>
        {inverted && <span className="text-negative">Planejada para depois do prazo</span>}
      </TooltipContent>
    </Tooltip>
    {!inside && afterBar <= days && <span aria-hidden style={{ gridColumn: `${afterBar + 1} / -1` }}
      className={cn('row-start-1 flex min-w-0 items-center gap-1 self-center truncate pl-2 text-xs',
        tone === 'late' ? 'text-negative' : 'text-muted-foreground', tone === 'done' && 'line-through')}>
      {Icon && <Icon aria-hidden className="size-3.5 shrink-0" />}<span className="truncate">{task.title}</span>
    </span>}
  </>;
}
