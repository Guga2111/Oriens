import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SegmentedControl } from '@/components/common/SegmentedControl';

export interface ViewOption<T extends string> { value: T; label: string; icon: LucideIcon; ready?: boolean }

const name = (view: ViewOption<string>) => view.ready === false ? `${view.label} (em breve)` : view.label;

/**
 * The layouts of a page, as plane.so's header shows them: a strip of icons on wider screens and a single menu on a
 * phone. Views still being built (`ready: false`) can be chosen and say so.
 */
export function ViewSwitcher<T extends string>({ views, value, onChange, label }: {
  views: readonly ViewOption<T>[]; value: T; onChange: (view: T) => void; label: string;
}) {
  const current = views.find(view => view.value === value) ?? views[0];
  return (
    <>
      <SegmentedControl label={label} value={value} onChange={onChange} className="max-md:hidden"
        options={views.map(view => ({ value: view.value, label: name(view), icon: view.icon,
          tooltip: view.ready === false ? `${view.label} · em breve` : view.label }))} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label={`Visão: ${current.label}`}><current.icon aria-hidden /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuRadioGroup value={value} onValueChange={next => onChange(next as T)}>
            {views.map(view => (
              <DropdownMenuRadioItem key={view.value} value={view.value}>
                <view.icon aria-hidden className="text-muted-foreground" />{view.label}
                {view.ready === false && <span className="text-xs text-muted-foreground">em breve</span>}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
