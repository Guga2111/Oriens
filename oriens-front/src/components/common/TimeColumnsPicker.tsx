import { useState, type KeyboardEvent } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HOURS, MINUTES } from "@/lib/time-of-day";

/** Keeps keys in the picker: it can sit inside a Command, whose root would take Enter and the arrows for its list. */
const keepKeys = (event: KeyboardEvent) => event.stopPropagation();

/** Scrolls a column before its first paint, so it opens with the chosen value in the middle instead of sliding to it. */
const openOnChosen = (column: HTMLDivElement | null) => {
  const chosen = column?.querySelector<HTMLElement>('[data-state="on"]');
  if (column && chosen) column.scrollTop = chosen.offsetTop - (column.clientHeight - chosen.offsetHeight) / 2;
};

function TimeColumn({ label, values, value, onChange }: {
  label: string; values: string[]; value: string; onChange: (value: string) => void;
}) {
  return (
    <ToggleGroup
      ref={openOnChosen} type="single" orientation="vertical" size="sm" aria-label={label}
      value={value} onValueChange={next => { if (next) onChange(next); }}
      className="relative max-h-56 w-12 flex-col justify-start gap-0.5 overflow-y-auto overscroll-contain p-0.5"
    >
      {values.map(item => (
        <ToggleGroupItem key={item} value={item} className="w-full shrink-0 font-normal tabular-nums focus-visible:ring-inset focus-visible:ring-offset-0">
          {item}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/**
 * A clock button that opens hour and minute columns, like the browser's own time picker but drawn with the
 * product's tokens. `value` (`HH:mm`) is where the columns open; the footer hands the chosen time to `onPick`.
 */
export function TimeColumnsPicker({ value, onPick, disabled = false }: {
  value: string; onPick: (time: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(value.slice(0, 2));
  const [minute, setMinute] = useState(value.slice(3, 5));
  const openAt = (next: boolean) => {
    if (next) { setHour(value.slice(0, 2)); setMinute(value.slice(3, 5)); }
    setOpen(next);
  };
  return (
    <Popover open={open} onOpenChange={openAt}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Escolher hora e minuto" disabled={disabled} onKeyDown={keepKeys}
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground [&_svg]:size-3.5">
          <Clock aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={12} className="w-auto p-1" aria-label="Hora e minuto" onKeyDown={keepKeys}
        onOpenAutoFocus={event => {
          // The columns only become tabbable after mount, so focus the chosen hour rather than the first button.
          event.preventDefault();
          const content = event.currentTarget;
          if (content instanceof HTMLElement) content.querySelector<HTMLElement>('[data-state="on"]')?.focus({ preventScroll: true });
        }}>
        <div className="flex gap-1">
          <TimeColumn label="Hora" values={HOURS} value={hour} onChange={setHour} />
          <TimeColumn label="Minuto" values={MINUTES} value={minute} onChange={setMinute} />
        </div>
        <div className="mt-1 border-t pt-1">
          <Button type="button" size="sm" className="w-full tabular-nums" disabled={disabled}
            onClick={() => { setOpen(false); onPick(`${hour}:${minute}`); }}>
            Definir {hour}:{minute}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
