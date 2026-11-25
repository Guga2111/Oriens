import { useCallback, useEffect, useRef, useState } from "react";
import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinancialLedger } from "@/hooks/useFinancialLedger";
import {
  deleteEntry,
  getAllEntries,
  getAllTags,
} from "@/services/financialService";
import type { EntryDTO, TagDTO } from "@/types/financial";
import { monthRange, type FinancialPeriod } from "@/lib/financialSummary";
import { productDate } from "@/lib/product-time";
import { PeriodOverview } from "@/components/financial/PeriodOverview";
import { EntryHistoryTable } from "@/components/financial/EntryHistoryTable";
import { CreateEntryDialog } from "@/components/financial/CreateEntryDialog";
import { EditEntryDialog } from "@/components/financial/EditEntryDialog";
import { TagManagementDialog } from "@/components/financial/TagManagementDialog";
import { RecurringManagementDialog } from "@/components/financial/RecurringManagementDialog";

interface TableFilters {
  periodFilter: string;
  customStartDate: Date | undefined;
  customEndDate: Date | undefined;
  tagFilter: string;
  searchQuery: string;
}

const INITIAL_FILTERS: TableFilters = {
  periodFilter: "all",
  customStartDate: undefined,
  customEndDate: undefined,
  tagFilter: "all",
  searchQuery: "",
};

const HISTORY_PAGE_SIZE = 20;

type FinancialView = "overview" | "history";

function buildTableParams(page: number, filters: TableFilters) {
  const params: {
    page: number;
    size: number;
    sortBy: string;
    direction: "ASC" | "DESC";
    startDate?: string;
    endDate?: string;
    tagId?: number;
    search?: string;
  } = {
    page,
    size: HISTORY_PAGE_SIZE,
    sortBy: "entryDate",
    direction: "DESC",
  };

  if (filters.periodFilter !== "all") {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined = now;

    switch (filters.periodFilter) {
      case "7days":
        startDate = subDays(now, 7);
        break;
      case "15days":
        startDate = subDays(now, 15);
        break;
      case "30days":
        startDate = subDays(now, 30);
        break;
      case "thisMonth":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "custom":
        if (filters.customStartDate && filters.customEndDate) {
          startDate = filters.customStartDate;
          endDate = filters.customEndDate;
        }
        break;
    }

    if (startDate) params.startDate = format(startDate, "yyyy-MM-dd");
    if (endDate) params.endDate = format(endDate, "yyyy-MM-dd");
  }

  if (filters.tagFilter !== "all") {
    params.tagId = parseInt(filters.tagFilter);
  }

  if (filters.searchQuery) {
    params.search = filters.searchQuery;
  }

  return params;
}

export default function FinancialPage() {
  const { userId } = useAuth();

  const [period, setPeriod] = useState<FinancialPeriod>(() => {
    const today = productDate();
    return { month: today.getMonth(), year: today.getFullYear() };
  });
  const [view, setView] = useState<FinancialView>("overview");

  const ledger = useFinancialLedger();
  const [tags, setTags] = useState<TagDTO[]>([]);

  const [tableEntries, setTableEntries] = useState<EntryDTO[]>([]);
  const [tablePagination, setTablePagination] = useState({
    page: 0,
    totalPages: 0,
    totalElements: 0,
  });
  const [isLoadingTable, setIsLoadingTable] = useState(true);
  const [tableFilters, setTableFilters] =
    useState<TableFilters>(INITIAL_FILTERS);

  const [isCreateEntryOpen, setIsCreateEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EntryDTO | null>(null);
  const [isTagManagementOpen, setIsTagManagementOpen] = useState(false);
  const [isRecurringManagementOpen, setIsRecurringManagementOpen] =
    useState(false);

  const tableRequestId = useRef(0);
  const loadTags = useCallback(async () => {
    if (!userId) return;
    try {
      setTags(await getAllTags(userId));
    } catch (error) {
      console.error("Falha ao carregar tags financeiras: ", error);
      toast.error("Erro ao carregar tags", {
        description:
          error.response?.data?.message || "Não foi possível carregar as tags.",
      });
    }
  }, [userId]);

  const loadTableData = useCallback(
    async (page: number, filters: TableFilters) => {
      if (!userId) return;

      const requestId = ++tableRequestId.current;
      setIsLoadingTable(true);

      try {
        const response = await getAllEntries(
          userId,
          buildTableParams(page, filters)
        );
        if (requestId !== tableRequestId.current) return;

        setTableEntries(response.content);
        setTablePagination({
          page: response.number,
          totalPages: response.totalPages,
          totalElements: response.totalElements,
        });
      } catch (error) {
        if (requestId !== tableRequestId.current) return;
        console.error("Falha ao carregar histórico financeiro: ", error);
        toast.error("Erro ao carregar histórico", {
          description:
            error.response?.data?.message ||
            "Não foi possível carregar o histórico.",
        });
      } finally {
        if (requestId === tableRequestId.current) {
          setIsLoadingTable(false);
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) return;
    void loadTags();
    void loadTableData(0, INITIAL_FILTERS);
  }, [userId, loadTags, loadTableData]);

  const handlePeriodChange = (direction: "prev" | "next" | "today") => {
    const currentDate = new Date(period.year, period.month, 1);

    let newDate: Date;
    if (direction === "today") {
      newDate = productDate();
    } else if (direction === "prev") {
      newDate = subMonths(currentDate, 1);
    } else {
      newDate = addMonths(currentDate, 1);
    }

    setPeriod({ month: newDate.getMonth(), year: newDate.getFullYear() });
  };

  const handleEditEntry = (entry: EntryDTO) => {
    setEditingEntry(entry);
  };

  const handleDeleteEntry = async (entry: EntryDTO, key: string) => {
    if (!userId) return;
    try {
      await deleteEntry(userId, entry.id!, entry.version!, key);
      toast.success("Entrada excluída", { description: "A entrada foi excluída com sucesso." });
      void loadTableData(tablePagination.page, tableFilters);
    } catch (error) {
      // Refresh evidence, but keep the failed deletion and its original version in the dialog.
      void ledger.refetch();
      void loadTableData(tablePagination.page, tableFilters);
      throw error;
    }
  };

  // Financial writes invalidate the ledger query in the service; only the table reloads here.
  const handleEntrySuccess = () => {
    void loadTableData(tablePagination.page, tableFilters);
  };

  /** Opens the history with the selected month and, when given, one category. */
  const openHistory = (tagId?: number) => {
    const { start, end } = monthRange(period);
    const filters: TableFilters = {
      ...INITIAL_FILTERS,
      periodFilter: "custom",
      customStartDate: productDate(start),
      customEndDate: productDate(end),
      tagFilter: tagId === undefined ? "all" : String(tagId),
    };
    setTableFilters(filters);
    void loadTableData(0, filters);
    setView("history");
  };

  const handleFilterChange = (updates: Partial<TableFilters>) => {
    const nextFilters = { ...tableFilters, ...updates };
    setTableFilters(nextFilters);

    const isUpdatingCustomDate =
      "customStartDate" in updates || "customEndDate" in updates;
    const isClearingCustomDates =
      updates.customStartDate === undefined &&
      updates.customEndDate === undefined;

    if (
      isUpdatingCustomDate &&
      !isClearingCustomDates &&
      !(nextFilters.customStartDate && nextFilters.customEndDate)
    ) {
      return;
    }

    void loadTableData(0, nextFilters);
  };

  const periodDate = new Date(period.year, period.month, 1);
  const monthLabel = format(periodDate, "MMMM yyyy", { locale: ptBR });
  const capitalizedMonthLabel =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <>
      <div className="min-w-0 w-full">
        <div className="flex min-w-0 w-full flex-col gap-6">
          <PageHeader
            title="Financeiro"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Gerenciar
                      <ChevronDown className="ml-2 h-4 w-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => setIsTagManagementOpen(true)}
                    >
                      Tags
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setIsRecurringManagementOpen(true)}
                    >
                      Recorrências
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={() => setIsCreateEntryOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  Nova entrada
                </Button>
              </div>
            }
          />

          <Tabs
            value={view}
            onValueChange={(value) => setView(value as FinancialView)}
            className="flex flex-col gap-6"
          >
            <TabsList variant="line" aria-label="Visões do Financeiro">
              <TabsTrigger value="overview">Visão geral</TabsTrigger>
              <TabsTrigger value="history">Lançamentos</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 md:h-8 md:w-8"
                  aria-label="Mês anterior"
                  onClick={() => handlePeriodChange("prev")}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </Button>
                <span
                  className="min-w-[8.5rem] text-center text-sm font-medium text-foreground"
                  aria-live="polite"
                >
                  {capitalizedMonthLabel}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 md:h-8 md:w-8"
                  aria-label="Próximo mês"
                  onClick={() => handlePeriodChange("next")}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="max-md:h-10"
                  onClick={() => handlePeriodChange("today")}
                >
                  Este mês
                </Button>
              </div>

              <PeriodOverview
                entries={ledger.data}
                tags={tags}
                period={period}
                isLoading={ledger.isPending && ledger.fetchStatus !== "idle"}
                error={ledger.error}
                onRetry={() => void ledger.refetch()}
                onNewEntry={() => setIsCreateEntryOpen(true)}
                onSelectCategory={(tagId) => openHistory(tagId)}
                onViewMonth={() => openHistory()}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <EntryHistoryTable
                entries={tableEntries}
                tags={tags}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
                pagination={tablePagination}
                onPageChange={(page) => void loadTableData(page, tableFilters)}
                isLoading={isLoadingTable}
                filters={tableFilters}
                onFilterChange={handleFilterChange}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CreateEntryDialog
        open={isCreateEntryOpen}
        onOpenChange={setIsCreateEntryOpen}
        tags={tags}
        onSuccess={handleEntrySuccess}
      />

      <EditEntryDialog
        open={!!editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
        entry={editingEntry}
        tags={tags}
        onSuccess={handleEntrySuccess}
      />

      <TagManagementDialog
        open={isTagManagementOpen}
        onOpenChange={setIsTagManagementOpen}
        userId={userId!}
        onTagsChange={() => void loadTags()}
      />

      <RecurringManagementDialog
        open={isRecurringManagementOpen}
        onOpenChange={setIsRecurringManagementOpen}
        userId={userId!}
        tags={tags}
        onEditEntry={handleEditEntry}
        onEntriesChange={handleEntrySuccess}
      />
    </>
  );
}
