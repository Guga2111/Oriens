import { Link } from 'react-router-dom';
import { Archive, Kanban, ListChecks, Pin, Shapes } from 'lucide-react';
import { HeaderFilterButton } from '@/components/common/HeaderFilterButton';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { activeProjectFilterCount, type ProjectFilters } from '@/lib/project-filters';
import type { WorkProject } from '@/types/work';

type Mode = WorkProject['mode'];

const MODES: { value: Mode; label: string; icon: typeof Kanban }[] = [
  { value: 'DEVELOPMENT', label: 'Desenvolvimento', icon: Kanban },
  { value: 'SIMPLE', label: 'Simples', icon: ListChecks },
];

/** The projects list's filters in a plane.so header menu; a dot on the button marks an active filter. */
export function ProjectFilterMenu({ filters, onChange }: { filters: ProjectFilters; onChange: (filters: ProjectFilters) => void }) {
  const active = activeProjectFilterCount(filters);
  // A narrow screen has no room beside the menu for a submenu, so the types are listed inline there.
  const inline = useIsMobile();
  const toggleMode = (mode: Mode, checked: boolean) =>
    onChange({ ...filters, modes: checked ? [...filters.modes, mode] : filters.modes.filter(m => m !== mode) });
  const modeItems = MODES.map(mode => (
    <DropdownMenuCheckboxItem key={mode.value} checked={filters.modes.includes(mode.value)}
      onCheckedChange={checked => toggleMode(mode.value, checked === true)} onSelect={event => event.preventDefault()}>
      <mode.icon aria-hidden className="text-muted-foreground" />{mode.label}
    </DropdownMenuCheckboxItem>
  ));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <HeaderFilterButton count={active} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {inline ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Tipo</DropdownMenuLabel>
              {modeItems}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger><Shapes aria-hidden className="text-muted-foreground" />Tipo</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">{modeItems}</DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuCheckboxItem checked={filters.favoritesOnly} onCheckedChange={checked => onChange({ ...filters, favoritesOnly: checked === true })}>
          <Pin aria-hidden className="text-muted-foreground" />Somente fixados
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/all-data?tab=projects&archived=1"><Archive aria-hidden className="text-muted-foreground" />Ver arquivados</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
