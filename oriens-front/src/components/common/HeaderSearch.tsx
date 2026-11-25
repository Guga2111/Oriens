import { useRef } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HeaderSearchProps {
  label: string;
  inputLabel: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: () => void;
  onClear?: () => void;
}

export function HeaderSearch({ label, inputLabel, placeholder, value, onChange, open, onOpenChange, onSubmit, onClear }: HeaderSearchProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  function clear() {
    onChange("");
    onClear?.();
  }

  return (
    <form role="search" aria-label={label}
      className={cn("relative shrink-0 transition-[width] duration-200 ease-out motion-reduce:transition-none", open ? "w-36 sm:w-56" : "w-10 md:w-8")}
      onSubmit={event => { event.preventDefault(); onSubmit?.(); }}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget) && !value.trim()) onOpenChange(false);
      }}>
      {open ? (
        <>
          {onSubmit ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" variant="ghost" size="icon" aria-label="Buscar"
                  className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground md:size-7">
                  <Search aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Buscar</TooltipContent>
            </Tooltip>
          ) : <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />}
          <Input ref={input} autoFocus type="search" aria-label={inputLabel} placeholder={placeholder}
            className={cn("h-7 pl-9 focus-visible:ring-1 focus-visible:ring-offset-0 [&::-webkit-search-cancel-button]:hidden", value && "pr-10")}
            value={value} onChange={event => onChange(event.target.value)}
            onKeyDown={event => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              clear();
              onOpenChange(false);
              requestAnimationFrame(() => trigger.current?.focus());
            }} />
          {value && <Button type="button" variant="ghost" size="icon" aria-label="Limpar busca"
            className="absolute right-0 top-1/2 -translate-y-1/2 md:size-7" onClick={() => { input.current?.focus(); clear(); }}>
            <X aria-hidden />
          </Button>}
        </>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button ref={trigger} type="button" variant="ghost" size="icon" aria-label={label} onClick={() => onOpenChange(true)}>
              <Search aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      )}
    </form>
  );
}
