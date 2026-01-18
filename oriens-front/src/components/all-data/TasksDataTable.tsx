import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Search, X, Calendar as CalendarIcon } from 'lucide-react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { TaskDTO, Priority, Status, PriorityLabels, StatusLabels, PriorityColors, StatusColors } from '@/types/task';
import { cn } from '@/lib/utils';

export interface TasksFilters {
  status: string;
  priority: string;
  searchQuery: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

interface TasksDataTableProps {
  tasks: TaskDTO[];
  isLoading?: boolean;
  pagination: {
    page: number;
    totalPages: number;
    totalElements: number;
  };
  onPageChange: (page: number) => void;
  filters: TasksFilters;
  onFilterChange: (filters: Partial<TasksFilters>) => void;
}

export function TasksDataTable({
  tasks,
  isLoading = false,
  pagination,
  onPageChange,
  filters,
  onFilterChange,
}: TasksDataTableProps) {
  const [searchInput, setSearchInput] = useState(filters.searchQuery);
  const pageSize = 20;

  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;
  const totalElements = pagination.totalElements;

  const clearFilters = () => {
    setSearchInput('');
    onFilterChange({
      status: 'all',
      priority: 'all',
      searchQuery: '',
      startDate: undefined,
      endDate: undefined,
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
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.searchQuery !== '' ||
    filters.startDate !== undefined ||
    filters.endDate !== undefined;

  const formatTime = (time: string): string => {
    if (!time) return '-';
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Todas as Tarefas</CardTitle>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 flex-wrap">
          {/* Status Filter */}
          <Select
            value={filters.status}
            onValueChange={(value) => onFilterChange({ status: value })}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value={Status.PENDING}>{StatusLabels[Status.PENDING]}</SelectItem>
              <SelectItem value={Status.CONCLUDED}>{StatusLabels[Status.CONCLUDED]}</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select
            value={filters.priority}
            onValueChange={(value) => onFilterChange({ priority: value })}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              <SelectItem value={Priority.LOW}>{PriorityLabels[Priority.LOW]}</SelectItem>
              <SelectItem value={Priority.MEDIUM}>{PriorityLabels[Priority.MEDIUM]}</SelectItem>
              <SelectItem value={Priority.HIGH}>{PriorityLabels[Priority.HIGH]}</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.startDate && filters.endDate
                  ? `${format(filters.startDate, 'dd/MM/yy')} - ${format(filters.endDate, 'dd/MM/yy')}`
                  : 'Filtrar por data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
              <div className="flex flex-col sm:flex-row p-3 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2 text-center">Data Início</p>
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => onFilterChange({ startDate: date })}
                  />
                </div>
                <div className="border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-4">
                  <p className="text-sm font-medium mb-2 text-center">Data Fim</p>
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => onFilterChange({ endDate: date })}
                  />
                </div>
              </div>
              {(filters.startDate || filters.endDate) && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => onFilterChange({ startDate: undefined, endDate: undefined })}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar datas
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Search */}
          <div className="relative flex-1 flex items-center gap-0 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título"
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
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {hasActiveFilters
              ? 'Nenhum resultado encontrado. Ajuste os filtros.'
              : 'Nenhuma tarefa encontrada.'}
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Título</TableHead>
                    <TableHead className="w-[200px]">Descrição</TableHead>
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead className="w-[80px]">Horário</TableHead>
                    <TableHead className="w-[100px]">Prioridade</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        {task.title}
                      </TableCell>
                      <TableCell>
                        <span className="line-clamp-2 text-muted-foreground">
                          {task.description || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? format(parseISO(task.dueDate), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {formatTime(task.startTime)}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(PriorityColors[task.priority], 'border-0')}>
                          {PriorityLabels[task.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(StatusColors[task.status], 'border-0')}>
                          {StatusLabels[task.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {currentPage * pageSize + 1} a{' '}
                  {Math.min((currentPage + 1) * pageSize, totalElements)} de{' '}
                  {totalElements} tarefas
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
  );
}
