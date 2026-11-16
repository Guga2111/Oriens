import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { addDays, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalysisPanel } from './AnalysisPrimitives';
import { activityCells, calendarWeeks, dateKey, fullDate, intensity, intervalLabel } from '@/lib/statistics';
import { productDate } from '@/lib/product-time';
import { cn } from '@/lib/utils';
import type { ActivityData, HabitsData, Interval } from '@/types/statistics';
import type { UseQueryResult } from '@tanstack/react-query';

const levels = ['0', '1', '2–3', '4–6', '7+'];
export function ActivityCalendar({ period, today, tasks, habits, onWindowChange, onSelect }: {
  period: Interval; today: string; tasks: UseQueryResult<ActivityData, Error>; habits: UseQueryResult<HabitsData, Error>;
  onWindowChange: (end: string) => void; onSelect: (date: string, opener: HTMLElement) => void;
}) {
  const cells = useMemo(() => activityCells(period, today, tasks.data, habits.data), [period, today, tasks.data, habits.data]);
  const byDate = useMemo(() => new Map(cells.map(c => [c.date, c])), [cells]);
  const weeks = useMemo(() => calendarWeeks(period), [period]);
  const [focused, setFocused] = useState(period.endDate), [selected, setSelected] = useState<string | null>(null);
  const [lookupOpen, setLookupOpen] = useState(false), lookupSelection = useRef(false), lookupTrigger = useRef<HTMLButtonElement>(null);
  const scroll = useRef<HTMLDivElement>(null), refs = useRef(new Map<string, HTMLButtonElement>());
  const loading = (!tasks.data && tasks.isPending) || (!habits.data && habits.isPending);
  useEffect(() => { setFocused(period.endDate); if (scroll.current) scroll.current.scrollLeft = scroll.current.scrollWidth; }, [period.endDate, loading]);
  function move(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const shifts: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
    const weekday = (productDate(date).getDay() + 6) % 7;
    const shift = event.key === 'Home' ? -weekday : event.key === 'End' ? 6 - weekday : shifts[event.key];
    if (shift === undefined) return;
    event.preventDefault(); const next = dateKey(addDays(productDate(date), shift));
    if (next >= period.startDate && next <= period.endDate && next <= today) { setFocused(next); refs.current.get(next)?.focus(); }
  }
  const failed = tasks.isError || habits.isError;
  const months = weeks.map((w, i) => {
    const day = w.find(d => d >= period.startDate && d <= period.endDate && (d.slice(8) === '01' || i === 0));
    return day ? format(productDate(day), 'MMM', { locale: ptBR }) : '';
  });
  return <AnalysisPanel title="Calendário de atividade" description={`Janela própria · ${intervalLabel(period)}`} action={<div className="flex gap-1">
    <Popover open={lookupOpen} onOpenChange={next => { if (next) lookupSelection.current = false; setLookupOpen(next); }}><PopoverTrigger asChild><Button ref={lookupTrigger} variant="ghost" size="icon" aria-label="Consultar atividade por data"><CalendarDays data-icon="inline-start" /></Button></PopoverTrigger><PopoverContent align="end" className="w-auto p-0" onCloseAutoFocus={event => { if (lookupSelection.current) event.preventDefault(); }}>
      <Calendar mode="single" required aria-label="Consultar atividade de uma data" locale={ptBR} weekStartsOn={1} today={productDate(today)} defaultMonth={productDate(period.endDate)} selected={productDate(selected ?? period.endDate)} initialFocus
        disabled={[{ before: productDate(period.startDate) }, { after: productDate(period.endDate < today ? period.endDate : today) }]}
        labels={{ labelPrevious: () => 'Mês anterior', labelNext: () => 'Próximo mês', labelDay: date => fullDate(dateKey(date)) }}
        onSelect={day => {
          if (!day) return;
          const date = dateKey(day);
          lookupSelection.current = true; setLookupOpen(false); setSelected(date); setFocused(date);
          onSelect(date, refs.current.get(date) ?? lookupTrigger.current!);
        }} />
    </PopoverContent></Popover>
    <Button variant="ghost" size="icon" aria-label="Recuar janela anual um mês" onClick={() => onWindowChange(dateKey(subMonths(productDate(period.endDate), 1)))}><ChevronLeft data-icon="inline-start" /></Button>
    <Button variant="ghost" size="icon" aria-label="Avançar janela anual um mês" disabled={period.endDate >= today} onClick={() => onWindowChange(dateKey(subMonths(productDate(period.endDate), -1)) > today ? today : dateKey(subMonths(productDate(period.endDate), -1)))}><ChevronRight data-icon="inline-start" /></Button>
  </div>}>
    {failed && <Alert className="mb-3"><AlertDescription>{tasks.data && habits.data ? 'Atualização falhou. Mantendo as últimas contagens válidas.' : tasks.data || habits.data ? 'Uma fonte está indisponível; contagens parciais.' : 'Não foi possível carregar a atividade.'} <Button variant="link" onClick={() => { void tasks.refetch(); void habits.refetch(); }}>Tentar novamente</Button></AlertDescription></Alert>}
    {loading ? <Skeleton className="activity-loading w-full" aria-label="Carregando calendário" /> : <div ref={scroll} className="activity-scroll" tabIndex={-1}>
      <div className="activity-months" aria-hidden>{months.map((month, i) => <span key={i}>{month}</span>)}</div>
      <div role="grid" aria-label="Atividade diária: tarefas concluídas e execuções de hábitos" aria-rowcount={7} aria-colcount={weeks.length} className="activity-grid">
        {Array.from({ length: 7 }, (_, weekday) => <div role="row" key={weekday} className="activity-weekday-row">
          <span role="rowheader" className="activity-weekday">{['Seg', '', 'Qua', '', 'Sex', '', 'Dom'][weekday]}</span>
          {weeks.map((week, column) => {
            const date = week[weekday], cell = byDate.get(date), future = date > today;
            const label = cell ? `${fullDate(date)}. ${cell.tasks === null ? 'Tarefas indisponíveis' : `${cell.tasks} tarefas concluídas`}. ${cell.habits === null ? 'Hábitos indisponíveis' : `${cell.habits} execuções de hábitos`}. ${cell.total} realizações registradas.${cell.partial ? ' Cobertura parcial; ausência de registros não comprova inatividade.' : ''}${date === today ? ' Hoje em andamento.' : ''}` : `${fullDate(date)}. ${future ? 'Dia futuro' : 'Fora da janela'}.`;
            if (!cell || future) return <span key={date} role="gridcell" aria-label={label} aria-disabled="true" className={cn('activity-cell', future ? 'activity-future' : 'invisible')} />;
            return <Tooltip key={date}><TooltipTrigger asChild><button ref={element => { if (element) refs.current.set(date, element); else refs.current.delete(date); }} type="button" role="gridcell" aria-colindex={column + 1} aria-rowindex={weekday + 1} aria-selected={selected === date} aria-label={label} tabIndex={focused === date ? 0 : -1}
              className={cn('activity-cell', `activity-level-${intensity(cell.total)}`, cell.partial && 'activity-unknown', selected === date && 'activity-selected')}
              onFocus={() => setFocused(date)} onKeyDown={event => move(event, date)} onClick={event => { setSelected(date); onSelect(date, event.currentTarget); }} />
            </TooltipTrigger><TooltipContent className="max-w-72"><p>{fullDate(date)}</p><p>{cell.tasks ?? '—'} tarefas · {cell.habits ?? '—'} execuções de hábitos</p><p>{cell.total} realizações{cell.partial ? ' · cobertura parcial' : ''}{date === today ? ' · hoje em andamento' : ''}</p></TooltipContent></Tooltip>;
          })}
        </div>)}
      </div>
    </div>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">1 realização = 1 tarefa concluída ou 1 execução de hábito.</p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground" aria-label="Legenda de intensidade">{levels.map((level, i) => <span key={level} className="flex items-center gap-1"><span className={cn('activity-swatch', `activity-level-${i}`)} aria-hidden />{level}</span>)}<span className="flex items-center gap-1"><span className="activity-swatch activity-unknown" aria-hidden />Sem cobertura</span></div>
    </div>
  </AnalysisPanel>;
}
