import { Link } from 'react-router-dom';
import { Archive } from 'lucide-react';
import { HeaderFilterPanel } from '@/components/common/HeaderFilterPanel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { activeProjectFilterCount, NO_PROJECT_FILTERS, type ProjectFilters } from '@/lib/project-filters';
import type { WorkProject } from '@/types/work';

type Mode = WorkProject['mode'];

const MODES: { value: Mode; label: string }[] = [
  { value: 'DEVELOPMENT', label: 'Desenvolvimento' },
  { value: 'SIMPLE', label: 'Simples' },
];

export function ProjectFilterMenu({ filters, onChange }: { filters: ProjectFilters; onChange: (filters: ProjectFilters) => void }) {
  const toggleMode = (mode: Mode, checked: boolean) =>
    onChange({ ...filters, modes: checked ? [...filters.modes, mode] : filters.modes.filter(current => current !== mode) });
  return (
    <HeaderFilterPanel count={activeProjectFilterCount(filters)} onClear={() => onChange(NO_PROJECT_FILTERS)}
      description="Refine os projetos desta lista.">
      <FieldGroup className="gap-2">
        <FieldSet className="gap-0">
          <FieldLegend variant="label" className="mb-1">Tipo</FieldLegend>
          {MODES.map(mode => (
            <FieldLabel key={mode.value} className="min-h-8 items-center font-normal max-lg:min-h-11">
              <Checkbox checked={filters.modes.includes(mode.value)} onCheckedChange={checked => toggleMode(mode.value, checked === true)} />
              {mode.label}
            </FieldLabel>
          ))}
        </FieldSet>
        <FieldLabel className="min-h-8 items-center font-normal max-lg:min-h-11">
          <Checkbox checked={filters.favoritesOnly} onCheckedChange={checked => onChange({ ...filters, favoritesOnly: checked === true })} />
          Somente fixados
        </FieldLabel>
        <Button asChild variant="ghost" size="sm" className="justify-start">
          <Link to="/all-data?tab=projects&archived=1"><Archive aria-hidden />Ver arquivados</Link>
        </Button>
      </FieldGroup>
    </HeaderFilterPanel>
  );
}
