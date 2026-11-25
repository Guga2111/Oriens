import type { LucideIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Icon-only options show the label in a tooltip and as their accessible name. */
  icon?: LucideIcon;
  tooltip?: string;
}

/**
 * plane.so's segmented switch: a muted track with the chosen option raised on the card. Used for the view of a page
 * (icons) and for the timeline scale (words). 1.5rem items in the 0.125rem track make every track as tall as a small
 * button (`size="sm"`, 1.75rem), so it lines up with the actions beside it.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, label, className }: {
  options: readonly SegmentedOption<T>[]; value: T; onChange: (value: T) => void; label: string; className?: string;
}) {
  return (
    <ToggleGroup type="single" size="sm" value={value} onValueChange={next => { if (next) onChange(next as T); }}
      aria-label={label} className={cn('gap-0.5 rounded-lg bg-muted p-0.5', className)}>
      {options.map(option => {
        const Icon = option.icon;
        if (!Icon) return <ToggleGroupItem key={option.value} value={option.value}
          className={cn(segment, 'h-6 text-xs font-normal')}>{option.label}</ToggleGroupItem>;
        return (
          <Tooltip key={option.value}>
            {/* The tooltip has its own trigger around the item, so each keeps its own data-state; focus on the
                item bubbles to it, so the tooltip still opens from the keyboard. */}
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <ToggleGroupItem value={option.value} aria-label={option.label} className={cn(segment, 'size-6 px-0')}>
                  <Icon aria-hidden />
                </ToggleGroupItem>
              </span>
            </TooltipTrigger>
            <TooltipContent className="px-2 py-1 text-xs">{option.tooltip ?? option.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </ToggleGroup>
  );
}

const segment = 'text-muted-foreground hover:bg-card/60 hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=on]:hover:bg-card data-[state=on]:hover:text-foreground';
