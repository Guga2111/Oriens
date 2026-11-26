import { useState } from 'react';
import { startOfMonth, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { dateKey, fullDate, intervalDays, intervalLabel } from '@/lib/statistics';
import { productDate } from '@/lib/product-time';
import type { Interval } from '@/types/statistics';

export function StatisticsPeriodPicker({ value, today, onChange, mode, onModeChange }: { value: Interval; today: string; onChange: (period: Interval) => void; mode: string; onModeChange: (mode: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>({ from: productDate(value.startDate), to: productDate(value.endDate) });
  const draftPeriod = draft?.from && draft.to ? { startDate: dateKey(draft.from), endDate: dateKey(draft.to) } : null;
  const valid = draftPeriod && intervalDays(draftPeriod).length > 0 && draftPeriod.endDate <= today;
  function preset(next: string) {
    if (next === 'custom') { setDraft({ from: productDate(value.startDate), to: productDate(value.endDate) }); setOpen(true); return; }
    onModeChange(next); onChange({ startDate: dateKey(next === 'month' ? startOfMonth(productDate(today)) : subDays(productDate(today), Number(next) - 1)), endDate: today });
  }
  return <div className="flex flex-wrap items-center gap-2">
    <Select value={mode} onValueChange={preset}><SelectTrigger className="w-40" aria-label="Período de análise"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>
      <SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="month">Este mês</SelectItem><SelectItem value="custom">Personalizado</SelectItem>
    </SelectGroup></SelectContent></Select>
    <Popover open={open} onOpenChange={next => { if (next) setDraft({ from: productDate(value.startDate), to: productDate(value.endDate) }); setOpen(next); }}>
      <PopoverTrigger asChild><Button variant="outline" aria-label={`Escolher intervalo: ${intervalLabel(value)}`}>{value.startDate.slice(8)}/{value.startDate.slice(5, 7)} – {value.endDate.slice(8)}/{value.endDate.slice(5, 7)}</Button></PopoverTrigger>
      <PopoverContent align="end" className="w-auto max-w-[calc(100vw-2rem)] p-2">
        <Calendar mode="range" locale={ptBR} weekStartsOn={1} selected={draft} onSelect={(range, day) => setDraft(draft?.from && draft.to ? { from: day, to: undefined } : range)} defaultMonth={productDate(value.startDate)} disabled={{ after: productDate(today) }} labels={{ labelPrevious: () => 'Mês anterior', labelNext: () => 'Próximo mês', labelDay: date => fullDate(dateKey(date)) }} styles={{ day: { width: 44, height: 44 }, cell: { width: 44, height: 44 }, head_cell: { width: 44 }, nav_button: { width: 44, height: 44 }, caption: { minHeight: 44 } }} initialFocus />
        <p className="px-3 text-xs text-muted-foreground">Escolha início e fim. Até 366 dias.</p>
        <div className="flex items-center justify-end gap-2 p-3"><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={!valid} onClick={() => { if (valid && draftPeriod) { onChange(draftPeriod); onModeChange('custom'); setOpen(false); } }}>Aplicar período</Button></div>
      </PopoverContent>
    </Popover>
  </div>;
}
