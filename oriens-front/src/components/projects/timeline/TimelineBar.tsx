import { cva } from 'class-variance-authority';
import { AlertTriangle, Check, Diamond } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TASK_STATUS } from '@/lib/labels';
import { isTaskOverdue } from '@/lib/tasks';
import { TITLE_INSIDE_DAYS, formatTimelineDate, gridColumn, type TimelineRow, type TimelineScale } from '@/lib/timeline';
import { cn } from '@/lib/utils';
import type { WorkTask } from '@/types/work';

// The fill shows the task state, never progress (§5.5). Late wins over pending/doing.
const barVariants = cva('row-start-1 h-7 min-w-0 justify-start self-center overflow-hidden px-2 text-xs max-md:min-w-0', {
  variants: {
    tone: {
      pending: 'border border-border bg-secondary text-foreground hover:bg-accent',
      doing: 'bg-primary text-primary-foreground hover:bg-primary/90',
      done: 'bg-muted text-muted-foreground hover:bg-accent',
      late: 'border border-negative bg-secondary text-negative hover:bg-accent',
    },
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
          ? <Button variant={null} size={null} aria-label={name} onClick={() => onOpen(task)} style={{ gridColumn: gridColumn(placement) }}
            className={cn('row-start-1 size-7 justify-self-center self-center p-0 hover:bg-accent max-md:min-w-0',
              tone === 'late' ? 'text-negative' : tone === 'done' ? 'text-muted-foreground' : 'text-primary')}>
            <Diamond aria-hidden className="fill-current" />
          </Button>
          : <Button variant={null} size={null} aria-label={name} onClick={() => onOpen(task)} style={{ gridColumn: gridColumn(placement) }}
            className={barVariants({ tone, clippedStart: placement.clippedStart, clippedEnd: placement.clippedEnd })}>
            {inside && Icon && <Icon aria-hidden />}
            {inside && <span className={cn('truncate', tone === 'done' && 'line-through')}>{task.title}</span>}
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
