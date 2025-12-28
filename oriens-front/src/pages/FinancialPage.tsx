import { useState, useEffect, useMemo } from 'react';
import { startOfMonth, endOfMonth, format, subMonths, addMonths, parseISO } from 'date-fns';
import { Plus, Settings } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { AppHeader } from '@/components/common/AppHeader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { EntryDTO, TagDTO } from '@/types/financial';
import { getAllEntries, getAllTags, deleteEntry } from '@/services/financialService';

import { FinancialEntrySkeleton } from '@/components/financial/FinancialEntrySkeleton';
import { PeriodOverviewCard } from '@/components/financial/PeriodOverviewCard';
import { TagExpensesChart } from '@/components/financial/TagExpensesChart';
import { DistributionPieChart } from '@/components/financial/DistributionPieChart';
import { EntryHistoryTable } from '@/components/financial/EntryHistoryTable';
import { CreateEntryDialog } from '@/components/financial/CreateEntryDialog';
import { EditEntryDialog } from '@/components/financial/EditEntryDialog';
import { TagManagementDialog } from '@/components/financial/TagManagementDialog';

export default function FinancialPage() {
  const { userId } = useAuth();
  const { toast } = useToast();

  const [period, setPeriod] = useState<{ month: number; year: number }>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  const [chartEntries, setChartEntries] = useState<EntryDTO[]>([]); // Últimos 6 meses para gráficos
  const [tableEntries, setTableEntries] = useState<EntryDTO[]>([]); // Paginado para tabela
  const [tags, setTags] = useState<TagDTO[]>([]);
  const [tablePagination, setTablePagination] = useState({ page: 0, totalPages: 0, totalElements: 0 });
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(true);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  // Cache de páginas para evitar requisições duplicadas
  const [cachedTablePages, setCachedTablePages] = useState<Map<number, EntryDTO[]>>(new Map());

  const [isCreateEntryOpen, setIsCreateEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EntryDTO | null>(null);
  const [isTagManagementOpen, setIsTagManagementOpen] = useState(false);

  const isLoading = isLoadingCharts || isLoadingTable || isLoadingTags;

  useEffect(() => {
    if (userId) {
      loadTags();
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadChartData();
      loadTableData();
    }
  }, [userId]);

  const loadTags = async () => {
    setIsLoadingTags(true);
    try {
      const tagsData = await getAllTags(userId!);
      setTags(tagsData);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar tags',
        description: error.response?.data?.message || 'Não foi possível carregar as tags.',
      });
    } finally {
      setIsLoadingTags(false);
    }
  };

  // Request 1: Buscar últimos 6 meses para gráficos
  const loadChartData = async () => {
    setIsLoadingCharts(true);
    try {
      const sixMonthsAgo = subMonths(new Date(), 6);
      const response = await getAllEntries(userId!, {
        startDate: format(sixMonthsAgo, 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        size: 500,
        sortBy: 'entryDate',
        direction: 'DESC',
      });

      setChartEntries(response.content);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados dos gráficos',
        description: error.response?.data?.message || 'Não foi possível carregar os dados.',
      });
    } finally {
      setIsLoadingCharts(false);
    }
  };

  // Request 2: Buscar dados paginados para tabela (com cache)
  const loadTableData = async (page: number = 0) => {
    // Verificar se a página já está em cache
    if (cachedTablePages.has(page)) {
      setTableEntries(cachedTablePages.get(page)!);
      setTablePagination(prev => ({ ...prev, page }));
      return; // Não faz requisição, usa o cache
    }

    setIsLoadingTable(true);
    try {
      const response = await getAllEntries(userId!, {
        page,
        size: 20,
        sortBy: 'entryDate',
        direction: 'DESC',
      });

      // Salvar no cache
      setCachedTablePages(prev => new Map(prev).set(page, response.content));

      setTableEntries(response.content);
      setTablePagination({
        page: response.number,
        totalPages: response.totalPages,
        totalElements: response.totalElements,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar histórico',
        description: error.response?.data?.message || 'Não foi possível carregar o histórico.',
      });
    } finally {
      setIsLoadingTable(false);
    }
  };

  // Limpar cache quando dados forem modificados
  const clearTableCache = () => {
    setCachedTablePages(new Map());
  };

  const handlePeriodChange = (direction: 'prev' | 'next' | 'today') => {
    const currentDate = new Date(period.year, period.month);

    let newDate: Date;
    if (direction === 'today') {
      newDate = new Date();
    } else if (direction === 'prev') {
      newDate = subMonths(currentDate, 1);
    } else {
      newDate = addMonths(currentDate, 1);
    }

    setPeriod({
      month: newDate.getMonth(),
      year: newDate.getFullYear(),
    });
  };

  const handleEditEntry = (entry: EntryDTO) => {
    setEditingEntry(entry);
  };

  const handleDeleteEntry = async (id: number) => {
    try {
      await deleteEntry(userId!, id);
      toast({
        title: 'Entrada excluída',
        description: 'A entrada foi excluída com sucesso.',
      });
      clearTableCache(); // Limpar cache antes de recarregar
      loadChartData(); // Recarregar dados dos gráficos
      loadTableData(); // Recarregar dados da tabela
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir entrada',
        description: error.response?.data?.message || 'Não foi possível excluir a entrada.',
      });
    }
  };

  const handleEntrySuccess = () => {
    clearTableCache(); // Limpar cache antes de recarregar
    loadChartData(); // Recarregar dados dos gráficos
    loadTableData(); // Recarregar dados da tabela
  };

  const handleTagsChange = () => {
    loadTags();
  };

  // Derivar mês atual dos dados de gráficos (últimos 6 meses)
  const currentPeriodEntries = useMemo(() => {
    return chartEntries.filter(entry => {
      const entryDate = parseISO(entry.entryDate);
      return (
        entryDate.getMonth() === period.month &&
        entryDate.getFullYear() === period.year
      );
    });
  }, [chartEntries, period]);

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-auto p-6">
            <FinancialEntrySkeleton />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Gestão Financeira</h1>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsTagManagementOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Gerenciar Tags
                </Button>
                <Button onClick={() => setIsCreateEntryOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Entrada
                </Button>
              </div>
            </div>

            {/* Period Overview Card */}
            <PeriodOverviewCard
              entries={currentPeriodEntries}
              period={period}
              onPeriodChange={handlePeriodChange}
            />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TagExpensesChart entries={chartEntries} tags={tags} />
              <DistributionPieChart
                entries={currentPeriodEntries}
                tags={tags}
                period={period}
              />
            </div>

            {/* Entry History Table */}
            <EntryHistoryTable
              entries={tableEntries}
              tags={tags}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
              pagination={tablePagination}
              onPageChange={loadTableData}
            />
          </div>
        </main>
      </div>

      {/* Dialogs */}
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
        onTagsChange={handleTagsChange}
      />
    </SidebarProvider>
  );
}