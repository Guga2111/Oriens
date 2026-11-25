import { ChevronDown, ChevronRight, Diamond } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TimelineBar } from '@/components/projects/timeline/TimelineBar';
import { formatTimelineDate, gridColumn, placeRange, type TimelineGroupData, type TimelineScale, type TimelineWindow } from '@/lib/timeline';
import { cn } from '@/lib/utils';
import type { WorkTask } from '@/types/work';

/** Sticky first column; opaque so the column grid and today line pass under it. */
export const timelineLabelCell = 'sticky left-0 z-10 col-start-1 row-start-1 flex min-w-0 items-center border-r bg-card pr-2';
/** Row rule, one step lighter than the frame. */
const rowRule = 'border-b border-muted';

export function TimelineGroup({ group, grid, scale, period, today, open, onOpenChange, onOpen }: {
  group: TimelineGroupData; grid: string; scale: TimelineScale; period: TimelineWindow; today: string;
  open: boolean; onOpenChange: (open: boolean) => void; onOpen: (task: WorkTask) => void;
}) {
  const { objective, rows, summary } = group;
  const title = objective?.title ?? 'Sem objetivo';
  // Objective counts come from the whole project, not from the window.
  const done = objective ? objective.completedTasks ?? 0 : null;
  const total = objective ? objective.nonCancelledTasks ?? 0 : rows.length;
  const due = objective?.dueDate ? placeRange(period, objective.dueDate, objective.dueDate) : null;
  const dueLate = !!objective && objective.status !== 'CONCLUDED' && objective.status !== 'CANCELLED' && !!objective.dueDate && objective.dueDate < today;
  const name = [title, done === null ? `${total} ${total === 1 ? 'tarefa' : 'tarefas'} no período` : `${done} de ${total} tarefas concluídas`,
    objective?.dueDate && `prazo ${formatTimelineDate(objective.dueDate)}${dueLate ? ', atrasado' : ''}`].filter(Boolean).join(', ');
  const Chevron = open ? ChevronDown : ChevronRight;
  return <Collapsible open={open} onOpenChange={onOpenChange}>
    <div className={cn('relative grid h-11', rowRule, grid)}>
      <div className={timelineLabelCell}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full min-w-0 justify-start px-2" aria-label={name}>
            <Chevron aria-hidden />
            <span className="truncate font-semibold">{title}</span>
            <span className="ml-auto text-xs font-normal tabular-nums text-muted-foreground">{done === null ? total : `${done}/${total}`}</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      {summary && <div aria-hidden style={{ gridColumn: gridColumn(summary) }}
        className={cn('row-start-1 h-2 self-center overflow-hidden rounded-full bg-accent', summary.clippedStart && 'rounded-l-none', summary.clippedEnd && 'rounded-r-none')}>
        {done !== null && total > 0 && <div className="h-full bg-primary" style={{ width: `${(done / total) * 100}%` }} />}
      </div>}
      {due && <Diamond aria-hidden style={{ gridColumn: gridColumn(due) }}
        className={cn('row-start-1 size-4 self-center justify-self-center fill-current', dueLate ? 'text-negative' : 'text-primary')} />}
    </div>
    <CollapsibleContent>
      {rows.map(row => <div key={row.task.id} className={cn('relative grid h-11 sm:h-10', rowRule, grid)}>
        <div className={timelineLabelCell}>
          {/* Mouse shortcut only: the bar is the keyboard and screen-reader target. */}
          <Button variant="ghost" size="sm" tabIndex={-1} aria-hidden className="w-full min-w-0 justify-start pl-8 pr-2 font-normal" onClick={() => onOpen(row.task)}>
            <span className="truncate">{row.task.title}</span>
          </Button>
        </div>
        <TimelineBar row={row} scale={scale} days={period.days} today={today} onOpen={onOpen} />
      </div>)}
    </CollapsibleContent>
  </Collapsible>;
}
