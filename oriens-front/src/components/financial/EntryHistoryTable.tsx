import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Calendar as CalendarIcon,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EntryDTO, TagDTO } from "@/types/financial";

interface EntryHistoryTableProps {
  entries: EntryDTO[];
  tags: TagDTO[];
  onEdit: (entry: EntryDTO) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
  pagination: {
    page: number;
    totalPages: number;
    totalElements: number;
  };
  onPageChange: (page: number) => void;
  filters: {
    periodFilter: string;
    customStartDate: Date | undefined;
    customEndDate: Date | undefined;
    tagFilter: string;
    searchQuery: string;
  };
  onFilterChange: (
    filters: Partial<EntryHistoryTableProps["filters"]>
  ) => void;
}

const PAGE_SIZE = 20;

function signedAmount(amount: number): string {
  return `${amount < 0 ? "−" : "+"} ${formatCurrency(Math.abs(amount))}`;
}

function amountClass(amount: number): string {
  return amount < 0 ? "text-negative" : "text-positive";
}

function TagLabel({ tag }: { tag: TagDTO | undefined }) {
  if (!tag) return <span className="text-muted-foreground">—</span>;

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      <span className="truncate">{tag.name}</span>
    </span>
  );
}

/**
 * Histórico de entradas (SPEC §11.5): os filtros são independentes do mês
 * selecionado no PageHeader. Valores alinhados à direita, com sinal explícito
 * e tokens --positive/--negative; abaixo de 768 vira lista de duas linhas.
 */
export function EntryHistoryTable({
  entries,
  tags,
  onEdit,
  onDelete,
  isLoading = false,
  pagination,
  onPageChange,
  filters,
  onFilterChange,
}: EntryHistoryTableProps) {
  const [deletingEntry, setDeletingEntry] = useState<EntryDTO | null>(null);
  const [searchInput, setSearchInput] = useState(filters.searchQuery);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;
  const totalElements = pagination.totalElements;

  const clearFilters = () => {
    setSearchInput("");
    onFilterChange({
      periodFilter: "all",
      customStartDate: undefined,
      customEndDate: undefined,
      tagFilter: "all",
      searchQuery: "",
    });
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      onFilterChange({ searchQuery: searchInput });
    }
  };

  const hasActiveFilters =
    filters.periodFilter !== "all" ||
    filters.tagFilter !== "all" ||
    filters.searchQuery !== "";

  const activeFilterCount =
    (filters.periodFilter !== "all" ? 1 : 0) +
    (filters.tagFilter !== "all" ? 1 : 0) +
    (filters.searchQuery !== "" ? 1 : 0);

  const getTagById = (tagId: number) => tags.find((tag) => tag.id === tagId);

  const confirmDelete = () => {
    if (!deletingEntry?.id) return;
    const id = deletingEntry.id;
    setDeletingEntry(null);
    onDelete(id);
  };

  const renderActions = (entry: EntryDTO) => {
    const label = entry.description ? `: ${entry.description}` : "";
    return (
      <div className="flex shrink-0 justify-end gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 md:h-8 md:w-8"
          onClick={() => onEdit(entry)}
          aria-label={`Editar entrada${label}`}
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 md:h-8 md:w-8"
          onClick={() => setDeletingEntry(entry)}
          aria-label={`Excluir entrada${label}`}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" aria-hidden />
        </Button>
      </div>
    );
  };

  const firstItem = currentPage * PAGE_SIZE + 1;
  const lastItem = Math.min((currentPage + 1) * PAGE_SIZE, totalElements);

  const filtersPanel = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Select
        value={filters.periodFilter}
        onValueChange={(value) => {
          onFilterChange({ periodFilter: value });
        }}
      >
        <SelectTrigger
          className="w-full sm:w-[180px]"
          aria-label="Filtrar por período"
        >
          <CalendarClock className="mr-2 h-4 w-4" aria-hidden />
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos períodos</SelectItem>
          <SelectItem value="7days">Últimos 7 dias</SelectItem>
          <SelectItem value="15days">Últimos 15 dias</SelectItem>
          <SelectItem value="30days">Últimos 30 dias</SelectItem>
          <SelectItem value="thisMonth">Este mês</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {filters.periodFilter === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" aria-hidden />
              {filters.customStartDate && filters.customEndDate
                ? `${format(filters.customStartDate, "dd/MM/yy")} - ${format(
                    filters.customEndDate,
                    "dd/MM/yy"
                  )}`
                : "Selecione o período"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="space-y-2 p-3">
              <div>
                <p className="mb-2 text-sm font-medium">Data início</p>
                <Calendar
                  mode="single"
                  selected={filters.customStartDate}
                  onSelect={(date) =>
                    onFilterChange({ customStartDate: date })
                  }
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Data fim</p>
                <Calendar
                  mode="single"
                  selected={filters.customEndDate}
                  onSelect={(date) =>
                    onFilterChange({ customEndDate: date })
                  }
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <Select
        value={filters.tagFilter}
        onValueChange={(value) => {
          onFilterChange({ tagFilter: value });
        }}
      >
        <SelectTrigger
          className="w-full sm:w-[180px]"
          aria-label="Filtrar por tag"
        >
          <Tag className="mr-2 h-4 w-4" aria-hidden />
          <SelectValue placeholder="Tags" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as tags</SelectItem>
          {tags.map((tag) => (
            <SelectItem key={tag.id} value={tag.id!.toString()}>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-1 items-center gap-0">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Buscar descrição"
            aria-label="Buscar no histórico"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="rounded-r-none border-r-0 pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onFilterChange({ searchQuery: searchInput })}
          className="h-10 w-10 shrink-0 rounded-l-none border-l"
          aria-label="Buscar"
        >
          <Search className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" aria-hidden />
          Limpar
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Histórico</h2>

            {!isDesktop && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2">
                    <SlidersHorizontal className="h-4 w-4" aria-hidden />
                    Filtros
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="px-1.5">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="max-h-[85dvh] overflow-y-auto"
                >
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                    <SheetDescription>
                      Refine o histórico de entradas.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="px-4 pb-4">{filtersPanel}</div>
                  <SheetFooter className="flex-row justify-end gap-2">
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={clearFilters}>
                        <X className="mr-2 h-4 w-4" aria-hidden />
                        Limpar
                      </Button>
                    )}
                    <SheetClose asChild>
                      <Button>Fechar</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            )}
          </div>

          {isDesktop && <div className="pt-3">{filtersPanel}</div>}
        </CardHeader>

        <CardContent className="p-5 pt-0">
          {isLoading ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              <span className="sr-only">Carregando histórico</span>
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <Empty className="border-0 p-0">
              <EmptyHeader>
                <EmptyTitle className="text-base">
                  {hasActiveFilters
                    ? "Nenhum resultado encontrado"
                    : "Nenhuma entrada"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasActiveFilters
                    ? "Ajuste ou limpe os filtros para ver outras entradas."
                    : "As entradas que você criar aparecerão aqui."}
                </EmptyDescription>
              </EmptyHeader>
              {hasActiveFilters && (
                <EmptyContent>
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[160px]">Tag</TableHead>
                      <TableHead className="w-[140px] text-right">
                        Valor
                      </TableHead>
                      <TableHead className="w-[96px] text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="tabular-nums">
                          {format(parseISO(entry.entryDate), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <span className="line-clamp-2">
                            {entry.description || "Sem descrição"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <TagLabel tag={getTagById(entry.tagId)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "font-medium tabular-nums",
                              amountClass(entry.amount)
                            )}
                          >
                            {signedAmount(entry.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {renderActions(entry)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul
                aria-label="Lista de entradas"
                className="divide-y rounded-lg border md:hidden"
              >
                {entries.map((entry) => {
                  const tag = getTagById(entry.tagId);
                  return (
                    <li key={entry.id} className="flex flex-col gap-1 p-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {entry.description || "Sem descrição"}
                        </span>
                        {tag && (
                          <Badge
                            variant="outline"
                            className="shrink-0 gap-1.5 font-normal"
                          >
                            <span
                              aria-hidden
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {format(parseISO(entry.entryDate), "dd/MM/yyyy")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-medium tabular-nums",
                              amountClass(entry.amount)
                            )}
                          >
                            {signedAmount(entry.amount)}
                          </span>
                          {renderActions(entry)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {firstItem} a {lastItem} de {totalElements}{" "}
                  {totalElements === 1 ? "entrada" : "entradas"}
                </p>
                <Pagination className="mx-0 w-full justify-center sm:w-auto sm:justify-end">
                  <PaginationContent className="flex-wrap justify-center">
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        className="max-md:h-10"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 0}
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="h-4 w-4 sm:mr-1" aria-hidden />
                        <span className="hidden sm:inline">Anterior</span>
                      </Button>
                    </PaginationItem>
                    <PaginationItem>
                      <span className="whitespace-nowrap px-2 text-sm tabular-nums text-muted-foreground">
                        Página {currentPage + 1} de {Math.max(totalPages, 1)}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        className="max-md:h-10"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages - 1}
                        aria-label="Próxima página"
                      >
                        <span className="hidden sm:inline">Próxima</span>
                        <ChevronRight className="h-4 w-4 sm:ml-1" aria-hidden />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deletingEntry !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingEntry(null);
        }}
        title="Excluir entrada?"
        objectName={
          deletingEntry?.description
            ? `"${deletingEntry.description}"`
            : "esta entrada"
        }
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        description={
          <>
            Excluir{" "}
            {deletingEntry?.description ? (
              <strong>"{deletingEntry.description}"</strong>
            ) : (
              "esta entrada"
            )}
            ? Esta ação não pode ser desfeita.
          </>
        }
      />
    </>
  );
}
