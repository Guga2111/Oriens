import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  endOfMonth,
  format,
  startOfMonth,
  subDays,
} from "date-fns";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { HeaderActions } from "@/components/common/HeaderActions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useFinancialTags } from "@/hooks/useFinancial";
import { deleteEntry, getAllEntries } from "@/services/financialService";
import type { EntryDTO } from "@/types/financial";
import { entriesRangeFrom } from "@/lib/financial-route";
import { productDate } from "@/lib/product-time";
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

/** A month or category opened from the overview arrives as `?start&end&tag`. */
function filtersFromUrl(params: URLSearchParams): TableFilters {
  const range = entriesRangeFrom(params);
  return {
    ...INITIAL_FILTERS,
    ...(range.start && range.end
      ? { periodFilter: "custom", customStartDate: productDate(range.start), customEndDate: productDate(range.end) }
      : {}),
    ...(range.tagId !== null ? { tagFilter: String(range.tagId) } : {}),
  };
}

/** Histórico de lançamentos; a reorganização dos filtros na barra superior é da #118. */
export default function FinancialEntriesPage() {
  const { userId } = useAuth();
  const tags = useFinancialTags();
  const [params, setParams] = useSearchParams();

  const [tableEntries, setTableEntries] = useState<EntryDTO[]>([]);
  const [tablePagination, setTablePagination] = useState({
    page: 0,
    totalPages: 0,
    totalElements: 0,
  });
  const [isLoadingTable, setIsLoadingTable] = useState(true);
  const [tableFilters, setTableFilters] = useState<TableFilters>(() => filtersFromUrl(params));
  const initialFilters = useRef(tableFilters);

  const [isCreateEntryOpen, setIsCreateEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EntryDTO | null>(null);
  const [isTagManagementOpen, setIsTagManagementOpen] = useState(false);
  const [isRecurringManagementOpen, setIsRecurringManagementOpen] =
    useState(false);

  const tableRequestId = useRef(0);

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
    void loadTableData(0, initialFilters.current);
  }, [userId, loadTableData]);

  /** Keeps the shareable part of the filters (custom range and category) in the URL. */
  const syncUrl = (filters: TableFilters) => {
    const next = new URLSearchParams();
    if (filters.periodFilter === "custom" && filters.customStartDate && filters.customEndDate) {
      next.set("start", format(filters.customStartDate, "yyyy-MM-dd"));
      next.set("end", format(filters.customEndDate, "yyyy-MM-dd"));
    }
    if (filters.tagFilter !== "all") next.set("tag", filters.tagFilter);
    setParams(next, { replace: true });
  };

  const handleDeleteEntry = async (entry: EntryDTO, key: string) => {
    if (!userId) return;
    try {
      await deleteEntry(userId, entry.id!, entry.version!, key);
      toast.success("Entrada excluída", { description: "A entrada foi excluída com sucesso." });
      void loadTableData(tablePagination.page, tableFilters);
    } catch (error) {
      // Refresh evidence, but keep the failed deletion and its original version in the dialog.
      void loadTableData(tablePagination.page, tableFilters);
      throw error;
    }
  };

  // Financial writes invalidate the cached queries in the service; only the table reloads here.
  const handleEntrySuccess = () => {
    void loadTableData(tablePagination.page, tableFilters);
  };

  const handleFilterChange = (updates: Partial<TableFilters>) => {
    const nextFilters = { ...tableFilters, ...updates };
    setTableFilters(nextFilters);
    syncUrl(nextFilters);

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

  return (
    <div className="min-w-0 w-full">
      {/* The breadcrumb names the page, as on Projetos; the h1 stays for screen readers. */}
      <h1 className="sr-only">Lançamentos</h1>
      <HeaderActions>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Gerenciar
              <ChevronDown aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setIsTagManagementOpen(true)}>Tags</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsRecurringManagementOpen(true)}>Recorrências</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" onClick={() => setIsCreateEntryOpen(true)}>
          <Plus aria-hidden />
          <span className="max-md:sr-only">Nova entrada</span>
        </Button>
      </HeaderActions>

      <EntryHistoryTable
        entries={tableEntries}
        tags={tags.data ?? []}
        onEdit={setEditingEntry}
        onDelete={handleDeleteEntry}
        pagination={tablePagination}
        onPageChange={(page) => void loadTableData(page, tableFilters)}
        isLoading={isLoadingTable}
        filters={tableFilters}
        onFilterChange={handleFilterChange}
      />

      <CreateEntryDialog
        open={isCreateEntryOpen}
        onOpenChange={setIsCreateEntryOpen}
        tags={tags.data ?? []}
        onSuccess={handleEntrySuccess}
      />

      <EditEntryDialog
        open={!!editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
        entry={editingEntry}
        tags={tags.data ?? []}
        onSuccess={handleEntrySuccess}
      />

      <TagManagementDialog
        open={isTagManagementOpen}
        onOpenChange={setIsTagManagementOpen}
        userId={userId!}
        onTagsChange={() => void tags.refetch()}
      />

      <RecurringManagementDialog
        open={isRecurringManagementOpen}
        onOpenChange={setIsRecurringManagementOpen}
        userId={userId!}
        tags={tags.data ?? []}
        onEditEntry={setEditingEntry}
        onEntriesChange={handleEntrySuccess}
      />
    </div>
  );
}
