import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WORK_VIEWS, type WorkView } from '@/lib/project-tabs';

const name = (view: typeof WORK_VIEWS[number]) => view.ready ? view.label : `${view.label} (em breve)`;

/**
 * The layouts of a project's work items, as plane.so's header shows them: a strip of icons on wider screens and
 * a single menu on a phone. Views still being built can be chosen and say so.
 */
export function WorkViewSwitcher({ value, onChange }: { value: WorkView; onChange: (view: WorkView) => void }) {
  const current = WORK_VIEWS.find(view => view.value === value)!;
  return (
    <>
      <ToggleGroup type="single" size="sm" value={value} onValueChange={next => { if (next) onChange(next as WorkView); }}
        aria-label="Visão dos itens de trabalho" className="gap-0.5 rounded-lg bg-muted p-0.5 max-md:hidden">
        {WORK_VIEWS.map(view => (
          // The tooltip trigger takes over data-state, so the chosen view is styled by aria-checked.
          <Tooltip key={view.value}>
            <TooltipTrigger asChild>
              <ToggleGroupItem value={view.value} aria-label={name(view)}
                className="size-7 px-0 text-muted-foreground hover:bg-card/60 hover:text-foreground data-[state=on]:bg-transparent aria-checked:bg-card aria-checked:text-foreground aria-checked:shadow-sm aria-checked:hover:bg-card aria-checked:hover:text-foreground [&_svg]:size-4">
                <view.icon aria-hidden />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent className="px-2 py-1 text-xs">{view.label}{!view.ready && ' · em breve'}</TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label={`Visão: ${current.label}`}><current.icon aria-hidden /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {WORK_VIEWS.map(view => (
            <DropdownMenuItem key={view.value} role="menuitemradio" aria-checked={view.value === value} onSelect={() => onChange(view.value)}>
              <view.icon aria-hidden className="text-muted-foreground" />{view.label}
              {!view.ready && <span className="text-xs text-muted-foreground">em breve</span>}
              {view.value === value && <Check aria-hidden className="ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
