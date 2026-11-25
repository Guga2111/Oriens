import { isAxiosError } from 'axios';
import { useCreationAttempt } from '@/hooks/useCreationAttempt';
import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Landmark,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RecurrencePatternLabels, type EntryDTO, type TagDTO } from "@/types/financial";

interface EntryHistoryTableProps {
  entries: EntryDTO[];
  tags: TagDTO[];
  onEdit: (entry: EntryDTO) => void;
  onDelete: (entry: EntryDTO, key: string) => Promise<void>;
  isLoading?: boolean;
  pagination: {
    page: number;
    totalPages: number;
    totalElements: number;
  };
  onPageChange: (page: number) => void;
  /** Opens the recurrence management, where automatic occurrences are changed through their origin. */
  onManageRecurrences: () => void;
  /** Opens the portfolio, where entries owned by an investment movement are changed. */
  onManageInvestments: () => void;
  filtered: boolean;
  onClearFilters: () => void;
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

/** Origin or automatic occurrence of a recurrence; an occurrence only changes through its origin. */
function RecurrenceBadge({ entry }: { entry: EntryDTO }) {
  if (entry.parentEntryId) return <Badge variant="outline" className="shrink-0 font-normal">Automática</Badge>;
  if (!entry.isRecurring) return null;
  return (
    <Badge variant="outline" className="shrink-0 gap-1 font-normal">
      <Repeat aria-hidden className="size-3" />
      {entry.recurrencePattern ? RecurrencePatternLabels[entry.recurrencePattern] : "Recorrente"}
      <span className="sr-only">, recorrência</span>
    </Badge>
  );
}

/** Investment movements keep their classification: a transfer is not income or expense. */
function KindBadge({ entry }: { entry: EntryDTO }) {
  if (entry.kind === "INVESTMENT_INCOME") return <Badge variant="outline" className="shrink-0 font-normal">Rendimento</Badge>;
  if (entry.kind !== "INVESTMENT_TRANSFER") return null;
  return (
    <Badge variant="outline" className="shrink-0 font-normal">
      {entry.amount < 0 ? "Aporte" : "Resgate"}
      <span className="sr-only">, transferência</span>
    </Badge>
  );
}

/**
 * Histórico de entradas. Busca e filtros ficam na barra superior da página. Valores alinhados à
 * direita, com sinal explícito e tokens --positive/--negative; abaixo de 768 vira lista de duas linhas.
 */
export function EntryHistoryTable({
  entries,
  tags,
  onEdit,
  onDelete,
  isLoading = false,
  pagination,
  onPageChange,
  onManageRecurrences,
  onManageInvestments,
  filtered,
  onClearFilters,
}: EntryHistoryTableProps) {
  const [deletingEntry, setDeletingEntry] = useState<EntryDTO | null>(null);
  const deletion = useCreationAttempt();
  const [deletionStale, setDeletionStale] = useState(false);

  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;
  const totalElements = pagination.totalElements;

  const getTagById = (tagId: number) => tags.find((tag) => tag.id === tagId);

  const confirmDelete = async () => {
    if (!deletingEntry?.id || deletionStale) return false;
    const command = deletion.prepare(deletingEntry);
    try { await onDelete(command.body, command.key); deletion.reset(); }
    catch (error) {
      deletion.failed(error);
      if (deletingEntry.version === undefined || isAxiosError(error) && [409, 428].includes(error.response?.status ?? 0)) setDeletionStale(true);
      throw error;
    }
  };

  const renderActions = (entry: EntryDTO) => {
    const label = entry.description ? `: ${entry.description}` : "";
    if (entry.investmentId) {
      return (
        <div className="flex shrink-0 justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 md:h-8 md:w-8"
                onClick={onManageInvestments}
                aria-label={`Corrigir em Investimentos${label}`}
              >
                <Landmark className="h-4 w-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Movimento da carteira: corrija ou exclua em Investimentos</TooltipContent>
          </Tooltip>
        </div>
      );
    }
    return (
      <div className="flex shrink-0 justify-end gap-1">
        {entry.parentEntryId ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 md:h-8 md:w-8"
                onClick={onManageRecurrences}
                aria-label={`Editar pela recorrência de origem${label}`}
              >
                <Repeat className="h-4 w-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ocorrência automática: edite a recorrência de origem</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 md:h-8 md:w-8"
            onClick={() => onEdit(entry)}
            aria-label={`Editar entrada${label}`}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
        )}
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

  return (
    <>
      <div className="min-w-0">
        {isLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <span className="sr-only">Carregando histórico</span>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <Empty className="border border-solid">
            <EmptyHeader>
              <EmptyTitle className="text-base">
                {filtered
                  ? "Nenhum resultado encontrado"
                  : "Nenhuma entrada"}
              </EmptyTitle>
              <EmptyDescription>
                {filtered
                  ? "Ajuste ou limpe os filtros para ver outras entradas."
                  : "As entradas que você criar aparecerão aqui."}
              </EmptyDescription>
            </EmptyHeader>
            {filtered && (
              <EmptyContent>
                <Button variant="outline" onClick={onClearFilters}>
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
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="line-clamp-2">
                            {entry.description || "Sem descrição"}
                          </span>
                          <RecurrenceBadge entry={entry} />
                          <KindBadge entry={entry} />
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
                      <RecurrenceBadge entry={entry} />
                          <KindBadge entry={entry} />
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
      </div>

      <ConfirmDialog
        open={deletingEntry !== null}
        onOpenChange={(open) => {
          if (!open) { setDeletingEntry(null); deletion.reset(); setDeletionStale(false); }
        }}
        title="Excluir entrada?"
        objectName={
          deletingEntry?.description
            ? `"${deletingEntry.description}"`
            : "esta entrada"
        }
        confirmDisabled={deletionStale}
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
            {deletionStale && " O lançamento mudou. Cancele e selecione-o novamente na lista atualizada."}
          </>
        }
      />
    </>
  );
}
