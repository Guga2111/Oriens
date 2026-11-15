import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useProductToday } from '@/hooks/useProductToday';
import { productDate } from '@/lib/product-time';
import { parseLocalDate } from '@/lib/date';

/** Calendar dates stay yyyy-MM-dd throughout the work API; never convert to UTC. */
export function WorkDatePicker({ id, label, value, onChange, disabled }: {
  id?: string; label: string; value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const date = parseLocalDate(value);
  const today = productDate(useProductToday());
  return <div className="flex min-w-0 items-center gap-1">
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" disabled={disabled} aria-label={`${label}: ${date ? format(date, 'dd/MM/yyyy') : 'Selecionar data'}`} className="min-w-0 flex-1 justify-start font-normal">
          <CalendarDays aria-hidden data-icon="inline-start" />{date ? format(date, 'dd/MM/yyyy') : 'Selecionar data'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar mode="single" selected={date} defaultMonth={date ?? today} today={today} locale={ptBR} initialFocus
          labels={{ labelPrevious: () => 'Mês anterior', labelNext: () => 'Próximo mês' }}
          onSelect={next => { onChange(next ? format(next, 'yyyy-MM-dd') : ''); setOpen(false); }} />
      </PopoverContent>
    </Popover>
    {value && <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`Limpar ${label.toLowerCase()}`} onClick={() => onChange('')}><X aria-hidden /></Button>}
  </div>;
}
