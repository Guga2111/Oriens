import { useId, type ReactNode } from "react";
import { HeaderFilterButton } from "@/components/common/HeaderFilterButton";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/** A page's filter fields behind the header filter button: a popover on desktop, a bottom sheet on narrow screens. */
export function HeaderFilterPanel({ count, onClear, description, children }: {
  count: number;
  onClear: () => void;
  description: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const trigger = <HeaderFilterButton count={count} />;
  const clear = count > 0 && <Button type="button" variant="ghost" size="sm" onClick={onClear}>Limpar filtros</Button>;

  if (isDesktop) return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" aria-labelledby={titleId}
        className="flex max-h-[var(--radix-popover-content-available-height)] w-80 flex-col gap-4 overflow-y-auto">
        <h2 id={titleId} className="text-sm font-medium">Filtros</h2>
        {children}
        {clear && <div className="flex justify-end">{clear}</div>}
      </PopoverContent>
    </Popover>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" showClose={false} className="flex max-h-dialog flex-col overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription className="sr-only">{description}</SheetDescription>
        </SheetHeader>
        {children}
        <SheetFooter className="flex-row justify-end gap-2 sm:space-x-0">
          {clear}
          <SheetClose asChild><Button type="button" variant="outline">Fechar</Button></SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
