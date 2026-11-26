import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronRight, RotateCcw, type LucideIcon } from "lucide-react";
import { HeaderFilterButton } from "@/components/common/HeaderFilterButton";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

export interface HeaderFilterSection {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  fields: ReactNode;
}

export function HeaderFilterPanel({ count, onClear, description, title = "Filtros", sections, action }: {
  count: number;
  onClear: () => void;
  title?: string;
  description: string;
  sections: readonly HeaderFilterSection[];
  action?: ReactNode;
}) {
  const id = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const sectionTitleRef = useRef<HTMLHeadingElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [selected, setSelected] = useState<string | null>(null);
  const active = sections.find(section => section.id === selected);
  const single = sections.length === 1;
  const showNavigation = !single && (isDesktop || !active);
  const showFields = single || !!active;

  useLayoutEffect(() => {
    if (selected) {
      sectionTitleRef.current?.focus();
    } else if (returnFocus.current) {
      navigationRef.current?.ownerDocument.getElementById(`${id}-${returnFocus.current}`)?.focus();
      returnFocus.current = null;
    }
  }, [id, selected]);

  function goBack() {
    if (!active) return;
    returnFocus.current = active.id;
    setSelected(null);
  }

  function onOpenChange(open: boolean) {
    if (open) {
      returnFocus.current = null;
      setSelected(null);
    }
  }

  function onEscapeKeyDown(event: KeyboardEvent) {
    if (active) {
      event.preventDefault();
      goBack();
    }
  }

  const trigger = <HeaderFilterButton count={count} label={title} />;
  const clear = count > 0 && (
    <Button type="button" variant="ghost" size="sm" className="justify-start text-muted-foreground"
      onClick={() => { titleRef.current?.focus(); onClear(); }}>
      <RotateCcw aria-hidden />Limpar filtros
    </Button>
  );
  const navigation = !single && (
    <nav ref={navigationRef} aria-label="Categorias de filtro" hidden={!showNavigation}
      className="min-h-0 overflow-y-auto p-1 lg:w-52 lg:shrink-0">
      {sections.map(({ id: sectionId, label, icon: Icon, count = 0 }) => (
        <Button key={sectionId} id={`${id}-${sectionId}`} type="button" variant="ghost"
          aria-label={label} aria-expanded={active?.id === sectionId} aria-controls={`${id}-${sectionId}-fields`}
          aria-describedby={count > 0 ? `${id}-${sectionId}-count` : undefined}
          onClick={() => {
            if (active?.id === sectionId) goBack();
            else setSelected(sectionId);
          }}
          className="w-full justify-start gap-2.5 px-2.5 font-normal aria-expanded:bg-accent aria-expanded:font-medium max-lg:min-h-11">
          <Icon aria-hidden className="text-muted-foreground" />
          <span className="grow text-left">{label}</span>
          {count > 0 && <span id={`${id}-${sectionId}-count`} className="text-xs tabular-nums text-muted-foreground">
            {count}<span className="sr-only"> {count === 1 ? "selecionado" : "selecionados"}</span>
          </span>}
          <ChevronRight aria-hidden className="text-muted-foreground" />
        </Button>
      ))}
      {action}
    </nav>
  );
  const fields = (
    <div hidden={!showFields} className={cn("min-h-0 overflow-y-auto p-3", isDesktop && "w-64", isDesktop && !single && "border-r")}>
      {sections.map(section => (
        <section key={section.id} id={`${id}-${section.id}-fields`} hidden={!single && active?.id !== section.id}>
          {!single && (
            <div className="mb-2 flex items-center gap-2">
              {!isDesktop && <Button type="button" variant="ghost" size="icon" aria-label="Voltar aos filtros" onClick={goBack}>
                <ArrowLeft aria-hidden />
              </Button>}
              <h3 ref={active?.id === section.id ? sectionTitleRef : undefined} tabIndex={-1} className="text-sm font-medium focus:outline-none">
                {section.label}
              </h3>
            </div>
          )}
          {section.fields}
        </section>
      ))}
    </div>
  );

  if (isDesktop) return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} collisionPadding={8} aria-labelledby={id} onEscapeKeyDown={onEscapeKeyDown}
        className="flex max-h-[var(--radix-popover-content-available-height)] w-auto flex-col p-0 shadow-md motion-reduce:animate-none">
        <h2 id={id} ref={titleRef} tabIndex={-1} className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">{title}</h2>
        <div className="flex min-h-0 flex-row-reverse">{navigation}{fields}</div>
        {clear && <div className="flex justify-end border-t p-1">{clear}</div>}
      </PopoverContent>
    </Popover>
  );

  return (
    <Sheet onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" showClose={false} onEscapeKeyDown={onEscapeKeyDown}
        className="flex max-h-dialog flex-col gap-2 rounded-t-lg pb-4 motion-reduce:animate-none">
        <SheetTitle ref={titleRef} tabIndex={-1} className="text-base">{title}</SheetTitle>
        <SheetDescription className="sr-only">{description}</SheetDescription>
        {navigation}
        {fields}
        <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t pt-3 sm:space-x-0">
          {clear}
          <SheetClose asChild><Button type="button" variant="outline">Fechar</Button></SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
