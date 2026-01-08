import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Pencil, Trash2, Search, Filter, X, Calendar as CalendarIcon, Tag, CalendarClock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { EntryDTO, TagDTO } from '@/types/financial';
import { cn } from '@/lib/utils';

interface EntryHistoryTableProps {
  entries: EntryDTO[];
  tags: TagDTO[];
  onEdit: (entry: EntryDTO) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
  // Server-side pagination (required)
  pagination: {
    page: number;
    totalPages: number;
    totalElements: number;
  };
  onPageChange: (page: number) => void;
  // Server-side filtering (required)
  filters: {
    periodFilter: string;
    customStartDate: Date | undefined;
    customEndDate: Date | undefined;
    tagFilter: string;
    searchQuery: string;
  };
  onFilterChange: (filters: Partial<EntryHistoryTableProps['filters']>) => void;
}

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
  const [deletingEntryId, setDeletingEntryId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState(filters.searchQuery); // Estado local para input
  const pageSize = 20;

  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;
  const totalElements = pagination.totalElements;

  const clearFilters = () => {
    setSearchInput(''); 
    onFilterChange({
      periodFilter: 'all',
      customStartDate: undefined,
      customEndDate: undefined,
      tagFilter: 'all',
      searchQuery: '',
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onFilterChange({ searchQuery: searchInput });
    }
  };

  const handleSearchClick = () => {
    onFilterChange({ searchQuery: searchInput });
  };

  const handlePageChange = (newPage: number) => {
    onPageChange(newPage);
  };

  const hasActiveFilters =
    filters.periodFilter !== 'all' ||
    filters.tagFilter !== 'all' ||
    filters.searchQuery !== '';

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Math.abs(value));
  };

  const getTagById = (tagId: number) => tags.find(tag => tag.id === tagId);

  const handleDeleteClick = (id: number) => {
    setDeletingEntryId(id);
  };

  const confirmDelete = () => {
    if (deletingEntryId) {
      onDelete(deletingEntryId);
      setDeletingEntryId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Histórico de Entradas</CardTitle>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            {/* Period Filter */}
            <Select
              value={filters.periodFilter}
              onValueChange={(value) => {
                onFilterChange({ periodFilter: value });
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <CalendarClock className="h-4 w-4 mr-2" />
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

            {/* Custom Date Range */}
            {filters.periodFilter === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.customStartDate && filters.customEndDate
                      ? `${format(filters.customStartDate, 'dd/MM/yy')} - ${format(filters.customEndDate, 'dd/MM/yy')}`
                      : 'Selecione o período'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3 space-y-2">
                    <div>
                      <p className="text-sm font-medium mb-2">Data Início</p>
                      <Calendar
                        mode="single"
                        selected={filters.customStartDate}
                        onSelect={(date) => onFilterChange({ customStartDate: date })}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Data Fim</p>
                      <Calendar
                        mode="single"
                        selected={filters.customEndDate}
                        onSelect={(date) => onFilterChange({ customEndDate: date })}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Tag Filter */}
            <Select
              value={filters.tagFilter}
              onValueChange={(value) => {
                onFilterChange({ tagFilter: value });
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <Tag className='mr-2 h-4 w-4' />
                <SelectValue placeholder="Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tags</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id!.toString()}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1 flex items-center gap-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-9 rounded-r-none border-r-0"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleSearchClick}
                className="rounded-l-none border-l h-10 w-10 shrink-0"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters
                ? 'Nenhum resultado encontrado. Ajuste os filtros.'
                : 'Nenhuma entrada encontrada.'}
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[150px]">Tags</TableHead>
                      <TableHead className="w-[120px] text-right">Valor</TableHead>
                      <TableHead className="w-[100px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => {
                      const tag = getTagById(entry.tagId);
                      const isExpense = entry.amount < 0;

                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {format(parseISO(entry.entryDate), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <span className="line-clamp-2">
                              {entry.description || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {tag && (
                              <Badge
                                style={{
                                  backgroundColor: tag.color,
                                  color: '#fff',
                                }}
                              >
                                {tag.name}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                'font-medium',
                                isExpense
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-green-600 dark:text-green-400'
                              )}
                            >
                              {isExpense ? '-' : '+'} {formatCurrency(entry.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onEdit(entry)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteClick(entry.id!)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {currentPage * pageSize + 1} a{' '}
                    {Math.min((currentPage + 1) * pageSize, totalElements)} de{' '}
                    {totalElements} entradas
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
                      disabled={currentPage === totalPages - 1}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingEntryId} onOpenChange={() => setDeletingEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta entrada? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
