import { timelineLabelCell } from '@/components/projects/timeline/TimelineGroup';
import { gridColumn, monthSegments, timelineDays, weekSegments, type TimelineScale, type TimelineWindow } from '@/lib/timeline';
import { cn } from '@/lib/utils';

/** Two-level date header (month above, days or weeks below) plus the "Hoje" tag; 5rem tall in total. Visual only. */
export function TimelineHeader({ period, scale, grid, todayColumn }: {
  period: TimelineWindow; scale: TimelineScale; grid: string; todayColumn: number | null;
}) {
  const days = timelineDays(period);
  return <div aria-hidden className="text-xs text-muted-foreground">
    <div className={cn('relative grid h-7', grid)}>
      <div className={timelineLabelCell} data-timeline-label />
      {/* The month name sticks beside the label column while its month is in view. */}
      {monthSegments(period).map(month => <span key={month.key} style={{ gridColumn: gridColumn(month) }} className="row-start-1 flex min-w-0 items-center">
        <span className="sticky left-timeline-label truncate px-2 font-medium capitalize text-foreground">{month.label}</span>
      </span>)}
    </div>
    <div className={cn('relative grid h-9', grid)}>
      <div className={cn(timelineLabelCell, 'px-3 font-medium text-foreground')}>Tarefas</div>
      {scale === 'month'
        ? weekSegments(period).map(week => <span key={week.key} style={{ gridColumn: gridColumn(week) }}
          className="row-start-1 self-center truncate px-2 tabular-nums">{week.label}</span>)
        : days.map((day, index) => <span key={day.date} style={{ gridColumn: gridColumn({ column: index + 1, span: 1 }) }}
          className={cn('row-start-1 flex flex-col items-center justify-center leading-tight tabular-nums', index + 1 === todayColumn && 'font-semibold text-now')}>
          <span>{day.initial}</span><span>{day.day}</span>
        </span>)}
    </div>
    {/* The frame rule closes the 5rem header inside its height, so the today line still starts right below it. */}
    <div className={cn('relative grid h-4 border-b', grid)}>
      <div className={timelineLabelCell} />
      {todayColumn !== null && <span style={{ gridColumn: gridColumn({ column: todayColumn, span: 1 }) }}
        className="row-start-1 self-center justify-self-center font-semibold text-now">Hoje</span>}
    </div>
  </div>;
}
