import { Link } from 'react-router-dom';
import { Archive, Code2, Layers, PanelsTopLeft, Pin } from 'lucide-react';
import { HeaderFilterPanel } from '@/components/common/HeaderFilterPanel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldLabel, FieldSet } from '@/components/ui/field';
import { activeProjectFilterCount, NO_PROJECT_FILTERS, type ProjectFilters } from '@/lib/project-filters';
import type { WorkProject } from '@/types/work';

type Mode = WorkProject['mode'];

const MODES: { value: Mode; label: string; icon: typeof Code2 }[] = [
  { value: 'DEVELOPMENT', label: 'Desenvolvimento', icon: Code2 },
  { value: 'SIMPLE', label: 'Simples', icon: PanelsTopLeft },
];

export function ProjectFilterMenu({ filters, onChange }: { filters: ProjectFilters; onChange: (filters: ProjectFilters) => void }) {
  const toggleMode = (mode: Mode, checked: boolean) =>
    onChange({ ...filters, modes: checked ? [...filters.modes, mode] : filters.modes.filter(current => current !== mode) });
  return (
    <HeaderFilterPanel count={activeProjectFilterCount(filters)} onClear={() => onChange(NO_PROJECT_FILTERS)}
      description="Refine os projetos desta lista."
      action={<Button asChild variant="ghost" className="w-full justify-start gap-2.5 px-2.5 font-normal">
        <Link to="/all-data?tab=projects&archived=1"><Archive aria-hidden className="text-muted-foreground" />Ver arquivados</Link>
      </Button>}
      sections={[
        { id: 'type', icon: Layers, label: 'Tipo', count: filters.modes.length,
          fields: <FieldSet className="gap-0">
            {MODES.map(({ value, label, icon: Icon }) => (
              <FieldLabel key={value} className="min-h-8 items-center font-normal max-lg:min-h-11">
                <Checkbox checked={filters.modes.includes(value)} onCheckedChange={checked => toggleMode(value, checked === true)} />
                <Icon aria-hidden className="size-4 text-muted-foreground" />
                {label}
              </FieldLabel>
            ))}
          </FieldSet> },
        { id: 'pinned', icon: Pin, label: 'Fixados', count: Number(filters.favoritesOnly),
          fields: <FieldLabel className="min-h-8 items-center font-normal max-lg:min-h-11">
            <Checkbox checked={filters.favoritesOnly} onCheckedChange={checked => onChange({ ...filters, favoritesOnly: checked === true })} />
            Somente fixados
          </FieldLabel> },
      ]} />
  );
}
