import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, Tag, ChevronDown, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { HeaderActions } from "@/components/common/HeaderActions";
import { HeaderFilterPanel } from "@/components/common/HeaderFilterPanel";
import { HeaderSearch } from "@/components/common/HeaderSearch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useFinancialTags } from "@/hooks/useFinancial";
import { productNow } from "@/lib/product-time";
import { deleteEntry, getAllEntries } from "@/services/financialService";
import type { EntryDTO } from "@/types/financial";
import {
  activeEntriesFilterCount,
  entriesDateRange,
  entriesFiltersFrom,
  entriesSearchParams,
  NO_ENTRIES_FILTERS,
  type EntriesFilters,
} from "@/lib/financial-route";
import { EntryCategoryField, EntryPeriodFields } from "@/components/financial/EntryFilterFields";
import { EntryHistoryTable } from "@/components/financial/EntryHistoryTable";
import { CreateEntryDialog } from "@/components/financial/CreateEntryDialog";
import { EditEntryDialog } from "@/components/financial/EditEntryDialog";
import { TagManagementDialog } from "@/components/financial/TagManagementDialog";
import { RecurringManagementDialog } from "@/components/financial/RecurringManagementDialog";

const HISTORY_PAGE_SIZE = 20;

function buildTableParams(page: number, filters: EntriesFilters, today: string) {
  const range = entriesDateRange(filters, today);
  return {
    page,
    size: HISTORY_PAGE_SIZE,
    sortBy: "entryDate",
    direction: "DESC" as const,
    ...(range ? { startDate: range.start, endDate: range.end } : {}),
    ...(filters.tagId !== null ? { tagId: filters.tagId } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  };
}

/** Histórico de lançamentos: busca e filtros na barra superior, sincronizados com a URL. */
export default function FinancialEntriesPage() {
  const { userId } = useAuth();
  const tags = useFinancialTags();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const [tableEntries, setTableEntries] = useState<EntryDTO[]>([]);
  const [tablePagination, setTablePagination] = useState({
    page: 0,
    totalPages: 0,
    totalElements: 0,
  });
  const [isLoadingTable, setIsLoadingTable] = useState(true);
  const [tableFilters, setTableFilters] = useState<EntriesFilters>(() => entriesFiltersFrom(params));
  const initialFilters = useRef(tableFilters);
  const [searchDraft, setSearchDraft] = useState(tableFilters.search);
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(tableFilters.search));

  const [isCreateEntryOpen, setIsCreateEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EntryDTO | null>(null);
  const [isTagManagementOpen, setIsTagManagementOpen] = useState(false);
  const [isRecurringManagementOpen, setIsRecurringManagementOpen] =
    useState(false);

  const tableRequestId = useRef(0);

  const loadTableData = useCallback(
    async (page: number, filters: EntriesFilters) => {
      if (!userId) return;

      const requestId = ++tableRequestId.current;
      setIsLoadingTable(true);

      try {
        const response = await getAllEntries(
          userId,
          buildTableParams(page, filters, productNow().date)
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

  const applyFilters = (nextFilters: EntriesFilters) => {
    setTableFilters(nextFilters);
    setParams(entriesSearchParams(nextFilters), { replace: true });
    void loadTableData(0, nextFilters);
  };

  const handleFilterChange = (updates: Partial<EntriesFilters>) =>
    applyFilters({ ...tableFilters, ...updates });

  const submitSearch = (search: string) => {
    if (search.trim() !== tableFilters.search) handleFilterChange({ search: search.trim() });
  };

  const clearFilters = () => {
    setSearchDraft("");
    setIsSearchOpen(false);
    applyFilters(NO_ENTRIES_FILTERS);
  };

  const activeFilters = activeEntriesFilterCount(tableFilters);

  return (
    <div className="min-w-0 w-full">
      {/* The breadcrumb names the page, as on Projetos; the h1 stays for screen readers. */}
      <h1 className="sr-only">Lançamentos</h1>
      <HeaderActions>
        <HeaderSearch label="Buscar lançamentos" inputLabel="Buscar na descrição" placeholder="Buscar…"
          value={searchDraft} onChange={setSearchDraft} open={isSearchOpen} onOpenChange={setIsSearchOpen}
          onSubmit={() => submitSearch(searchDraft)} onClear={() => submitSearch("")} />
        <HeaderFilterPanel count={activeFilters} onClear={clearFilters}
          description="Refine o histórico por período e categoria."
          sections={[
            { id: "period", icon: CalendarDays, label: "Período", count: Number(tableFilters.period !== "all"),
              fields: <EntryPeriodFields filters={tableFilters} onChange={handleFilterChange} /> },
            { id: "category", icon: Tag, label: "Categoria", count: Number(tableFilters.tagId !== null),
              fields: <EntryCategoryField filters={tableFilters} tags={tags.data ?? []} onChange={handleFilterChange} /> },
          ]} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 aria-hidden className="md:hidden" />
              <span className="max-md:sr-only">Gerenciar</span>
              <ChevronDown aria-hidden className="max-md:hidden" />
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
        onManageRecurrences={() => setIsRecurringManagementOpen(true)}
        onManageInvestments={() => navigate("/financial/investments")}
        pagination={tablePagination}
        onPageChange={(page) => void loadTableData(page, tableFilters)}
        isLoading={isLoadingTable}
        filtered={activeFilters > 0}
        onClearFilters={clearFilters}
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
