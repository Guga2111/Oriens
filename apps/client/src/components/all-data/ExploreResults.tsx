import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HeaderActions } from "@/components/common/HeaderActions";
import { HeaderFilterButton } from "@/components/common/HeaderFilterButton";
import { HeaderSearch } from "@/components/common/HeaderSearch";
import { WorkFeedback } from "@/components/common/WorkFeedback";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table } from "@/components/ui/table";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import styles from "./explore-layout.module.css";

export interface ExplorePage {
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
}

interface ExploreResultsProps {
  resources: "tarefas" | "projetos";
  emptyTitle: string;
  emptyDescription: string;
  search: { query: string; submit: (query: string) => void };
  filters: { count: number; clear: () => void; fields: ReactNode };
  pagination: ExplorePage;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  hasRows: boolean;
  feedback?: { error: unknown; retry: () => void };
  children: ReactNode;
}

export function ExploreResults({ resources, emptyTitle, emptyDescription, search, filters, pagination,
  onPageChange, isLoading, hasRows, feedback, children }: ExploreResultsProps) {
  const [draft, setDraft] = useState(search.query);
  const [searchOpen, setSearchOpen] = useState(Boolean(search.query));
  const count = filters.count + Number(Boolean(search.query));
  const clear = () => {
    setDraft("");
    setSearchOpen(false);
    filters.clear();
  };

  return (
    <div className={cn(styles.results, "flex min-w-0 flex-col gap-3")}>
      <HeaderActions>
        <HeaderSearch label={`Buscar ${resources}`} inputLabel="Buscar por título" placeholder="Buscar…"
          value={draft} onChange={setDraft} open={searchOpen} onOpenChange={setSearchOpen}
          onSubmit={() => search.submit(draft)} onClear={() => { if (search.query) search.submit(""); }} />
        <ExploreFilters count={count} onClear={clear}>{filters.fields}</ExploreFilters>
      </HeaderActions>

      {feedback && <WorkFeedback error={feedback.error} message={`Não foi possível atualizar ${resources === "tarefas" ? "as" : "os"} ${resources}.`}
        retry={feedback.retry} retryLabel="Tentar novamente" />}

      {children}
      {isLoading ? <ExploreLoading resources={resources} /> : !hasRows && !feedback && (
        <Empty className="border border-solid">
          <EmptyHeader>
            <EmptyTitle>{count > 0 ? "Nenhum resultado encontrado" : emptyTitle}</EmptyTitle>
            <EmptyDescription>{count > 0 ? "Ajuste ou limpe os filtros para ver mais resultados." : emptyDescription}</EmptyDescription>
          </EmptyHeader>
          {count > 0 && <Button type="button" variant="outline" size="sm" onClick={clear}>Limpar filtros</Button>}
        </Empty>
      )}

      {!isLoading && pagination.totalElements > 0 && <ExplorePagination resources={resources} pagination={pagination} onPageChange={onPageChange} />}
    </div>
  );
}

function ExploreFilters({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const trigger = <HeaderFilterButton count={count} />;
  const clear = count > 0 && <Button type="button" variant="ghost" size="sm" onClick={onClear}>Limpar filtros</Button>;

  if (isDesktop) return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" aria-labelledby="explore-desktop-filters"
        className="flex max-h-[var(--radix-popover-content-available-height)] w-80 flex-col gap-4 overflow-y-auto">
        <h2 id="explore-desktop-filters" className="text-sm font-medium">Filtros</h2>
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
          <SheetDescription className="sr-only">Refine os resultados desta aba.</SheetDescription>
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

export function ExploreTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={cn(styles.table, "overflow-hidden rounded-lg border bg-card")}>
      <Table aria-label={label} className="table-fixed [&_th:not(:last-child)]:border-r [&_td:not(:last-child)]:border-r [&_thead]:bg-muted/50 [&_th]:h-11 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:text-xs [&_td]:px-3 [&_td]:py-1 [&_tbody_tr]:h-11">
        {children}
      </Table>
    </div>
  );
}

export function ExploreList({ label, ordering, children }: { label: string; ordering: ReactNode; children: ReactNode }) {
  return (
    <div className={cn("gap-2", styles.list)}>
      {ordering}
      <ul aria-label={label} className="divide-y rounded-lg border bg-card empty:hidden">{children}</ul>
    </div>
  );
}

function ExploreLoading({ resources }: { resources: string }) {
  return (
    <div role="status" className="divide-y rounded-lg border bg-card">
      <span className="sr-only">Carregando {resources}…</span>
      {[0, 1, 2, 3].map(row => (
        <div key={row} aria-hidden className="flex h-11 items-center justify-between gap-4 px-3">
          <Skeleton className="h-3 w-1/3 motion-reduce:animate-none" />
          <Skeleton className="h-3 w-1/6 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

function ExplorePagination({ resources, pagination, onPageChange }: {
  resources: ExploreResultsProps["resources"];
  pagination: ExplorePage;
  onPageChange: (page: number) => void;
}) {
  const { page, size, totalPages, totalElements } = pagination;
  const first = page * size + 1;
  const last = Math.min((page + 1) * size, totalElements);
  const format = new Intl.NumberFormat("pt-BR");
  const resourceLabel = totalElements === 1 ? resources.slice(0, -1) : resources;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <p role="status" className="text-sm tabular-nums text-muted-foreground">
        {first <= last ? `Mostrando ${format.format(first)} a ${format.format(last)} de ${format.format(totalElements)} ${resourceLabel}`
          : `${format.format(totalElements)} ${resourceLabel}`}
      </p>
      <Pagination aria-label={`Paginação de ${resources}`} className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 0} aria-label="Página anterior">
              <ChevronLeft aria-hidden /><span className="hidden sm:inline">Anterior</span>
            </Button>
          </PaginationItem>
          <PaginationItem>
            <span className="whitespace-nowrap px-1 text-sm tabular-nums text-muted-foreground">Página {page + 1} de {totalPages}</span>
          </PaginationItem>
          <PaginationItem>
            <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1} aria-label="Próxima página">
              <span className="hidden sm:inline">Próxima</span><ChevronRight aria-hidden />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
