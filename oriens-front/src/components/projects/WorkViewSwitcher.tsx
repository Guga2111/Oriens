import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
          <Tooltip key={view.value}>
            {/* The tooltip has its own trigger around the item, so each keeps its own data-state; focus on the
                item bubbles to it, so the tooltip still opens from the keyboard. */}
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <ToggleGroupItem value={view.value} aria-label={name(view)}
                  className="size-7 px-0 text-muted-foreground hover:bg-card/60 hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=on]:hover:bg-card data-[state=on]:hover:text-foreground">
                  <view.icon aria-hidden />
                </ToggleGroupItem>
              </span>
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
          <DropdownMenuRadioGroup value={value} onValueChange={next => onChange(next as WorkView)}>
            {WORK_VIEWS.map(view => (
              <DropdownMenuRadioItem key={view.value} value={view.value}>
                <view.icon aria-hidden className="text-muted-foreground" />{view.label}
                {!view.ready && <span className="text-xs text-muted-foreground">em breve</span>}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
