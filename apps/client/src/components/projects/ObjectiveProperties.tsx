import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, CirclePause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { WorkDatePicker } from '@/components/common/WorkDatePicker';
import { StatusIcon } from '@/components/tasks/StatusIcon';
import { useProductToday } from '@/hooks/useProductToday';
import { parseLocalDate } from '@/lib/date';
import { productDate } from '@/lib/product-time';
import { OBJECTIVE_STATUSES, type ObjectiveStatus } from '@/lib/objectives';
import type { WorkObjective } from '@/types/work';
import { PropertyButton, PropertySelect } from './PropertyControl';

export function ObjectiveStatusIcon({ status }: { status: ObjectiveStatus }) {
  return status === 'PAUSED' ? <CirclePause aria-hidden className="size-4 shrink-0 text-muted-foreground" /> : <StatusIcon status={status} className="size-4" />;
}

export function ObjectiveStatusPicker({ value, onChange, disabled, label = 'Status do objetivo' }: {
  value: ObjectiveStatus; onChange: (value: ObjectiveStatus) => void; disabled?: boolean; label?: string;
}) {
  return <PropertySelect label={label} value={value} disabled={disabled} onChange={onChange}
    options={OBJECTIVE_STATUSES.map(status => ({ ...status, icon: <ObjectiveStatusIcon status={status.value} /> }))} />;
}

function objectivePeriodLabel(start?: string | null, end?: string | null, compact = false) {
  const date = (value: string) => format(parseLocalDate(value)!, compact ? 'dd/MM/yy' : 'dd MMM yyyy', { locale: ptBR });
  if (compact && start && end && start.slice(0, 4) === end.slice(0, 4)) return `${format(parseLocalDate(start)!, 'dd/MM')} – ${date(end)}`;
  if (start && end) return `${date(start)} – ${date(end)}`;
  if (start) return `${compact ? 'Desde' : 'A partir de'} ${date(start)}`;
  if (end) return `Até ${date(end)}`;
  return 'Sem período';
}

export function ObjectivePeriodFields({ id, start, end, onChange, disabled }: {
  id: string; start: string; end: string; onChange: (start: string, end: string) => void; disabled?: boolean;
}) {
  return <FieldGroup className="grid gap-3 sm:grid-cols-2">
    <Field><FieldLabel htmlFor={`${id}-start`}>Data de início</FieldLabel>
      <WorkDatePicker id={`${id}-start`} label="Data de início" value={start} max={end || undefined} disabled={disabled} onChange={next => onChange(next, end)} />
    </Field>
    <Field><FieldLabel htmlFor={`${id}-end`}>Data de término</FieldLabel>
      <WorkDatePicker id={`${id}-end`} label="Data de término" value={end} min={start || undefined} disabled={disabled} onChange={next => onChange(start, next)} />
    </Field>
  </FieldGroup>;
}

export function ObjectivePeriodPicker({ objective, disabled, onSave }: {
  objective: WorkObjective; disabled: boolean; onSave: (startDate: string | null, dueDate: string | null) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(objective.startDate ?? '');
  const [end, setEnd] = useState(objective.dueDate ?? '');
  const today = productDate(useProductToday());
  return <Popover open={open} onOpenChange={next => {
    if (disabled) return;
    if (next) { setStart(objective.startDate ?? ''); setEnd(objective.dueDate ?? ''); }
    setOpen(next);
  }}><PopoverTrigger asChild>
    <PropertyButton disabled={disabled} aria-label={`Período de ${objective.title}: ${objectivePeriodLabel(objective.startDate, objective.dueDate)}`}>
      <CalendarDays aria-hidden data-icon="inline-start" /><span className="hidden sm:inline">{objectivePeriodLabel(objective.startDate, objective.dueDate)}</span><span className="sm:hidden">{objectivePeriodLabel(objective.startDate, objective.dueDate, true)}</span>
    </PropertyButton>
  </PopoverTrigger><PopoverContent align="end" aria-label="Período do objetivo" className="w-auto max-w-full p-3">
    <Calendar mode="range" locale={ptBR} today={today} disabled={disabled} classNames={{ day_today: "font-semibold underline underline-offset-4" }} initialFocus defaultMonth={parseLocalDate(start || end) ?? today}
      selected={{ from: parseLocalDate(start), to: parseLocalDate(end) }}
      labels={{ labelPrevious: () => 'Mês anterior', labelNext: () => 'Próximo mês' }}
      onSelect={range => { setStart(range?.from ? format(range.from, 'yyyy-MM-dd') : ''); setEnd(range?.to ? format(range.to, 'yyyy-MM-dd') : ''); }} />
    <p className="mb-3 text-center text-xs text-muted-foreground" aria-live="polite">{objectivePeriodLabel(start, end)}</p>
    <div className="flex flex-wrap justify-between gap-2">
      <Button type="button" variant="ghost" size="sm" disabled={disabled || (!start && !end)} onClick={() => { setStart(''); setEnd(''); }}>Limpar período</Button>
      <Button type="button" size="sm" disabled={disabled} onClick={async () => { if (await onSave(start || null, end || null)) setOpen(false); }}>Aplicar</Button>
    </div>
  </PopoverContent></Popover>;
}
