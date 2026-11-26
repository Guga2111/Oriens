import { useId, useRef, type ReactNode } from "react";
import { HeaderFilterButton } from "@/components/common/HeaderFilterButton";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/** A page's filter fields behind the header filter button: a popover on desktop, a bottom sheet on narrow screens. */
export function HeaderFilterPanel({ count, onClear, description, title = "Filtros", children }: {
  count: number;
  onClear: () => void;
  title?: string;
  description: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const trigger = <HeaderFilterButton count={count} label={title} />;
  function clearFilters() {
    titleRef.current?.focus();
    onClear();
  }
  const clear = count > 0 && <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>;
  const fields = <div className="-m-1 flex min-h-0 flex-col gap-4 overflow-y-auto p-1">{children}</div>;

  if (isDesktop) return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" collisionPadding={8} aria-labelledby={titleId}
        className="flex max-h-[var(--radix-popover-content-available-height)] w-80 flex-col gap-4">
        <h2 id={titleId} ref={titleRef} tabIndex={-1} className="shrink-0 text-sm font-medium focus-visible:outline-none">{title}</h2>
        {fields}
        {clear && <div className="flex shrink-0 justify-end">{clear}</div>}
      </PopoverContent>
    </Popover>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" showClose={false} className="flex max-h-dialog flex-col">
        <SheetHeader className="text-left">
          <SheetTitle ref={titleRef} tabIndex={-1} className="focus-visible:outline-none">{title}</SheetTitle>
          <SheetDescription className="sr-only">{description}</SheetDescription>
        </SheetHeader>
        {fields}
        <SheetFooter className="shrink-0 flex-row justify-end gap-2 sm:space-x-0">
          {clear}
          <SheetClose asChild><Button type="button" variant="outline">Fechar</Button></SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
