import { ListFilter } from 'lucide-react';
import { WorkSelect } from '@/components/common/WorkSelect';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { BoardFilters } from '@/services/projectService';
import type { WorkObjective } from '@/types/work';

export type BoardFilterParam = 'objective' | 'planning' | 'overdue' | 'open';

/** The board's filters behind a header button; a dot on it marks that some are on. Values live in the URL. */
export function BoardFilterMenu({ filters, objectives, onChange, onClear }: {
  filters: BoardFilters; objectives: WorkObjective[];
  onChange: (param: BoardFilterParam, value: string) => void; onClear: () => void;
}) {
  const active = Object.keys(filters).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground"
          aria-label={active ? `Filtros do quadro (${active} ${active === 1 ? 'ativo' : 'ativos'})` : 'Filtros do quadro'}>
          <ListFilter aria-hidden />
          {active > 0 && <span aria-hidden className="absolute right-1 top-1 size-1.5 rounded-full bg-primary" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-72 flex-col gap-3" aria-label="Filtros do quadro">
        <WorkSelect label="Filtrar por objetivo" value={filters.objectiveId ? String(filters.objectiveId) : 'none'} onChange={value => onChange('objective', value)}
          options={[{ value: 'none', label: 'Todos os objetivos' }, ...objectives.map(objective => ({ value: String(objective.id), label: objective.title }))]} />
        <WorkSelect label="Filtrar planejamento" value={filters.planning ?? 'none'} onChange={value => onChange('planning', value)}
          options={[{ value: 'none', label: 'Qualquer planejamento' }, { value: 'today', label: 'Planejadas para hoje' }, { value: 'unscheduled', label: 'Sem planejamento' }]} />
        <Label className="flex min-h-8 items-center gap-2 font-normal leading-5 max-md:min-h-11">
          <Checkbox checked={!!filters.overdue} onCheckedChange={checked => onChange('overdue', checked === true ? '1' : '')} />Prazo ultrapassado
        </Label>
        <Label className="flex min-h-8 items-center gap-2 font-normal leading-5 max-md:min-h-11">
          <Checkbox checked={!!filters.open} onCheckedChange={checked => onChange('open', checked === true ? '1' : '')} />Somente abertas
        </Label>
        {active > 0 && <Button type="button" variant="ghost" size="sm" className="self-start" onClick={onClear}>Limpar filtros</Button>}
      </PopoverContent>
    </Popover>
  );
}
